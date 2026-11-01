import { createServer } from "node:http";
import { ErrorSala } from "./nucleo.js";
import { LIMITES_POR_DEFECTO, LimitadorVentana, origenPeticion } from "./limites.js";

export const MAX_CUERPO_BYTES = 16 * 1024;

const ESTADOS = {
	DATOS_INVALIDOS: 400,
	NOMBRE_INVALIDO: 400,
	CATEGORIAS_INVALIDAS: 400,
	CANTIDAD_INVALIDA: 400,
	TEMPORIZADOR_INVALIDO: 400,
	CODIGO_INVALIDO: 400,
	OPCION_INVALIDA: 400,
	JSON_INVALIDO: 400,
	SIN_SESION: 401,
	NO_ES_ANFITRION: 403,
	ORIGEN_NO_PERMITIDO: 403,
	SALA_NO_ENCONTRADA: 404,
	NO_ENCONTRADO: 404,
	METODO_NO_PERMITIDO: 405,
	SALA_INICIADA: 409,
	SALA_LLENA: 409,
	NOMBRE_REPETIDO: 409,
	COMANDO_REPETIDO: 409,
	FUERA_DE_ORDEN: 409,
	TEST_NO_ACTIVO: 409,
	CUERPO_DEMASIADO_GRANDE: 413,
	LIMITE_PETICIONES: 429,
	CODIGO_NO_DISPONIBLE: 503,
	ERROR_INTERNO: 500,
};

const MENSAJES_HTTP = {
	JSON_INVALIDO: "El cuerpo no es un JSON válido",
	ORIGEN_NO_PERMITIDO: "Origen no permitido",
	NO_ENCONTRADO: "Ruta no encontrada",
	METODO_NO_PERMITIDO: "Método no permitido",
	CUERPO_DEMASIADO_GRANDE: "El cuerpo es demasiado grande",
	LIMITE_PETICIONES: "Demasiadas peticiones; espera un momento",
	ERROR_INTERNO: "Error interno",
};

class ErrorHttp extends ErrorSala {}

function enviarJson(respuesta, estado, valor, cabeceras = {}) {
	respuesta.writeHead(estado, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"x-content-type-options": "nosniff",
		...cabeceras,
	});
	respuesta.end(JSON.stringify(valor));
}

function leerCuerpo(peticion, maximo = MAX_CUERPO_BYTES) {
	return new Promise((resolve, reject) => {
		const declarado = Number(peticion.headers["content-length"]);
		let excedido = Number.isFinite(declarado) && declarado > maximo;
		const trozos = [];
		let tamano = 0;
		// Se sigue consumiendo el cuerpo sin guardarlo: cortarlo de golpe destruiría la conexión
		// antes de que el cliente reciba el 413.
		if (excedido) reject(new ErrorHttp("CUERPO_DEMASIADO_GRANDE", MENSAJES_HTTP.CUERPO_DEMASIADO_GRANDE));
		peticion.on("data", (trozo) => {
			if (excedido) return;
			tamano += trozo.length;
			if (tamano > maximo) {
				excedido = true;
				trozos.length = 0;
				reject(new ErrorHttp("CUERPO_DEMASIADO_GRANDE", MENSAJES_HTTP.CUERPO_DEMASIADO_GRANDE));
				return;
			}
			trozos.push(trozo);
		});
		peticion.on("end", () => {
			if (excedido) return;
			const texto = Buffer.concat(trozos).toString("utf8").trim();
			if (!texto) return resolve({});
			try {
				resolve(JSON.parse(texto));
			} catch {
				reject(new ErrorHttp("JSON_INVALIDO", MENSAJES_HTTP.JSON_INVALIDO));
			}
		});
		peticion.on("error", reject);
	});
}

function sesionDe(peticion) {
	const valor = peticion.headers.authorization;
	if (typeof valor !== "string" || !valor.startsWith("Bearer ")) return null;
	return valor.slice(7).trim() || null;
}

// Cada cambio de estado pide al almacén que guarde. El almacén agrupa las escrituras.
export function guardarSiCambio(gestor, almacen, alFallar = console.error) {
	if (!gestor.sucio) return;
	gestor.sucio = false;
	almacen?.guardar(gestor.aJSON()).catch((error) => alFallar("Error al guardar las salas:", error));
}

export function crearServidorHttp({
	gestor,
	almacen = null,
	allowedOrigins = ["http://localhost:5173"],
	trustProxy = false,
	limites = {},
	ahora = Date.now,
}) {
	const origenes = new Set(allowedOrigins);
	const config = {
		sesion: { ...LIMITES_POR_DEFECTO.sesion, ...limites.sesion },
		crearSala: { ...LIMITES_POR_DEFECTO.crearSala, ...limites.crearSala },
		unirse: { ...LIMITES_POR_DEFECTO.unirse, ...limites.unirse },
		global: { ...LIMITES_POR_DEFECTO.global, ...limites.global },
	};
	const limitadores = Object.fromEntries(
		Object.entries(config).map(([nombre, limite]) => [nombre, new LimitadorVentana(limite, ahora)]),
	);

	const servidor = createServer(async (peticion, respuesta) => {
		const origen = peticion.headers.origin;
		const cabecerasCors =
			origen && origenes.has(origen)
				? {
						"access-control-allow-origin": origen,
						"access-control-allow-methods": "GET, POST, OPTIONS",
						"access-control-allow-headers": "authorization, content-type",
						"access-control-expose-headers": "retry-after",
						"access-control-max-age": "600",
						vary: "Origin",
					}
				: {};
		const enviar = (estado, valor, extra = {}) =>
			enviarJson(respuesta, estado, valor, { ...cabecerasCors, ...extra });
		const fallo = (codigo, mensaje = MENSAJES_HTTP[codigo], extra = {}) =>
			enviar(ESTADOS[codigo] ?? 400, { code: codigo, mensaje }, extra);
		const limitar = (nombre, clave) => {
			const decision = limitadores[nombre].tomar(clave);
			if (decision.permitido) return false;
			fallo("LIMITE_PETICIONES", MENSAJES_HTTP.LIMITE_PETICIONES, {
				"retry-after": String(decision.reintentarEnSegundos),
			});
			return true;
		};

		try {
			if (origen && !origenes.has(origen)) return fallo("ORIGEN_NO_PERMITIDO");
			if (peticion.method === "OPTIONS") {
				respuesta.writeHead(204, cabecerasCors).end();
				return;
			}
			const ruta = (peticion.url ?? "").split("?")[0];
			if (peticion.method === "GET" && ruta === "/health") return enviar(200, { ok: true });

			const origenIp = origenPeticion(peticion, trustProxy);
			if (limitar("global", origenIp)) return;

			if (ruta === "/api/salas") {
				if (peticion.method !== "POST") return fallo("METODO_NO_PERMITIDO");
				if (limitar("crearSala", origenIp)) return;
				const resultado = gestor.crear(await leerCuerpo(peticion));
				return enviar(201, resultado);
			}

			const coincidencia = ruta.match(/^\/api\/salas\/([A-Za-z0-9-]+)(?:\/(unirse|iniciar|responder|salir))?$/);
			if (!coincidencia) return fallo("NO_ENCONTRADO");
			const [, codigo, accion] = coincidencia;

			if (accion === "unirse") {
				if (peticion.method !== "POST") return fallo("METODO_NO_PERMITIDO");
				if (limitar("unirse", origenIp)) return;
				return enviar(200, gestor.unirse(codigo, await leerCuerpo(peticion)));
			}

			const esperado = accion ? "POST" : "GET";
			if (peticion.method !== esperado) return fallo("METODO_NO_PERMITIDO");
			// El código solo localiza la sala: sin sesión válida no se da acceso a nada.
			const sesion = sesionDe(peticion);
			if (!sesion) return fallo("SIN_SESION", "Falta la sesión");
			if (limitar("sesion", sesion)) return;

			if (!accion) return enviar(200, gestor.vista(codigo, sesion));
			if (accion === "iniciar") {
				gestor.iniciar(codigo, sesion);
				return enviar(200, gestor.vista(codigo, sesion));
			}
			if (accion === "responder") {
				const resultado = gestor.responder(codigo, sesion, await leerCuerpo(peticion));
				return enviar(200, { ...resultado, vista: gestor.vista(codigo, sesion) });
			}
			gestor.salir(codigo, sesion);
			return enviar(200, { ok: true });
		} catch (error) {
			if (error instanceof ErrorSala) {
				if (error.code === "CUERPO_DEMASIADO_GRANDE") {
					respuesta.once("finish", () => peticion.destroy());
					return fallo(error.code, error.message, { connection: "close" });
				}
				return fallo(error.code, error.message);
			}
			console.error("Error interno del servidor de salas:", error);
			return fallo("ERROR_INTERNO", MENSAJES_HTTP.ERROR_INTERNO);
		} finally {
			guardarSiCambio(gestor, almacen);
		}
	});
	// Detrás de un proxy, un tiempo de espera mayor que el suyo evita cortes de conexión reutilizada.
	servidor.keepAliveTimeout = 65_000;
	servidor.headersTimeout = 66_000;
	servidor.requestTimeout = 15_000;
	return servidor;
}
