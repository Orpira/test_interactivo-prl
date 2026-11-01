import { request as peticionHttp } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_CUERPO_BYTES } from "./http.js";
import { crearServicio } from "./servicio.js";

const ORIGEN = "http://localhost:5173";
const preguntas = Array.from({ length: 30 }, (_, i) => ({
	id: i + 1,
	categoria: i < 15 ? "Base" : "Otra",
	pregunta: `Pregunta ${i + 1}`,
	opciones: ["A", "B", "C", "D"],
	respuesta: i % 4,
}));

let servicios;
let directorios;
let reloj;

beforeEach(() => {
	servicios = [];
	directorios = [];
	reloj = 1_000_000;
});

afterEach(async () => {
	for (const servicio of servicios) await servicio.cerrar();
	for (const directorio of directorios) await rm(directorio, { recursive: true, force: true });
});

async function directorioTemporal() {
	const directorio = await mkdtemp(join(tmpdir(), "prl-http-"));
	directorios.push(directorio);
	return directorio;
}

async function arrancar(opciones = {}) {
	const servicio = await crearServicio({
		preguntas,
		directorioDatos: opciones.directorioDatos ?? (await directorioTemporal()),
		allowedOrigins: [ORIGEN],
		retardoGuardadoMs: 10,
		avisar: () => {},
		...opciones,
	});
	servicios.push(servicio);
	await new Promise((resolve) => servicio.httpServer.listen(0, "127.0.0.1", resolve));
	servicio.url = `http://127.0.0.1:${servicio.httpServer.address().port}`;
	return servicio;
}

async function api(servicio, metodo, ruta, { cuerpo, sesion, cabeceras = {} } = {}) {
	const respuesta = await fetch(`${servicio.url}${ruta}`, {
		method: metodo,
		headers: {
			...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
			...(sesion ? { authorization: `Bearer ${sesion}` } : {}),
			...cabeceras,
		},
		body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
	});
	const texto = await respuesta.text();
	return { estado: respuesta.status, cabeceras: respuesta.headers, datos: texto ? JSON.parse(texto) : null };
}

const datosSala = (extra = {}) => ({
	nombre: "Ana",
	numPreguntas: 3,
	categorias: [],
	timerConfig: { activo: false },
	...extra,
});

async function salaConAlumnos(servicio, nombres) {
	const { datos: creada } = await api(servicio, "POST", "/api/salas", {
		cuerpo: datosSala({ nombre: nombres[0] }),
	});
	const sesiones = [creada.sessionId];
	for (const nombre of nombres.slice(1)) {
		const { datos } = await api(servicio, "POST", `/api/salas/${creada.codigo}/unirse`, {
			cuerpo: { nombre },
		});
		sesiones.push(datos.sessionId);
	}
	return { codigo: creada.codigo, sesiones };
}

describe("recorrido completo", () => {
	it("crea, une a dos alumnos, inicia, responde y termina con el ranking", async () => {
		const servicio = await arrancar();
		const salud = await api(servicio, "GET", "/health");
		expect(salud).toMatchObject({ estado: 200, datos: { ok: true } });
		expect(salud.cabeceras.get("cache-control")).toBe("no-store");

		const { estado, datos: creada } = await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() });
		expect(estado).toBe(201);
		expect(creada).toEqual({ codigo: expect.stringMatching(/^PRL-[A-Z0-9]{4}$/), sessionId: expect.any(String) });
		const { codigo } = creada;

		const unido = await api(servicio, "POST", `/api/salas/${codigo}/unirse`, { cuerpo: { nombre: "Luis" } });
		expect(unido.estado).toBe(200);
		const luis = unido.datos.sessionId;

		const espera = await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: luis });
		expect(espera.datos).toMatchObject({ estado: "ESPERANDO", soyAnfitrion: false, nombre: "Luis" });
		expect(espera.datos.jugadores.map((j) => j.nombre)).toEqual(["Ana", "Luis"]);

		expect((await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: luis })).estado).toBe(403);
		const iniciada = await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: creada.sessionId });
		expect(iniciada.estado).toBe(200);
		expect(iniciada.datos.estado).toBe("EN_CURSO");
		expect(JSON.stringify(iniciada.datos)).not.toContain('"respuesta"');

		const correctaReal = (indice) => servicio.gestor.salas.get(codigo).preguntas[indice].respuesta;
		for (let i = 0; i < 3; i++) {
			const ana = await api(servicio, "POST", `/api/salas/${codigo}/responder`, {
				sesion: creada.sessionId,
				cuerpo: { comandoId: `ana-${i}`, indice: i, opcion: correctaReal(i) },
			});
			expect(ana.estado).toBe(200);
			expect(ana.datos).toMatchObject({ correcta: correctaReal(i), acierto: true, fueraDeTiempo: false });
			expect(ana.datos.vista.progreso.aciertos).toBe(i + 1);
		}
		for (let i = 0; i < 3; i++) {
			await api(servicio, "POST", `/api/salas/${codigo}/responder`, {
				sesion: luis,
				cuerpo: { comandoId: `luis-${i}`, indice: i, opcion: (correctaReal(i) + 1) % 4 },
			});
		}
		const final = await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: luis });
		expect(final.datos.estado).toBe("TERMINADA");
		expect(final.datos.ranking).toEqual([
			{ nombre: "Ana", aciertos: 3, total: 3, porcentaje: 100, terminado: true },
			{ nombre: "Luis", aciertos: 0, total: 3, porcentaje: 0, terminado: true },
		]);

		expect((await api(servicio, "POST", `/api/salas/${codigo}/salir`, { sesion: luis })).datos).toEqual({ ok: true });
		expect((await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: luis })).estado).toBe(401);
	});

	it("un reenvío con el mismo comandoId no cuenta dos veces", async () => {
		const servicio = await arrancar();
		const { codigo, sesiones } = await salaConAlumnos(servicio, ["Ana"]);
		await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: sesiones[0] });
		const opcion = servicio.gestor.salas.get(codigo).preguntas[0].respuesta;
		const cuerpo = { comandoId: "reintento", indice: 0, opcion };
		const primera = await api(servicio, "POST", `/api/salas/${codigo}/responder`, { sesion: sesiones[0], cuerpo });
		const repetida = await api(servicio, "POST", `/api/salas/${codigo}/responder`, { sesion: sesiones[0], cuerpo });
		expect(repetida.estado).toBe(200);
		expect({ ...repetida.datos, vista: null }).toEqual({ ...primera.datos, vista: null });
		expect(repetida.datos.vista.progreso).toMatchObject({ siguiente: 1, aciertos: 1 });
		const otroContenido = await api(servicio, "POST", `/api/salas/${codigo}/responder`, {
			sesion: sesiones[0],
			cuerpo: { ...cuerpo, opcion: (opcion + 1) % 4 },
		});
		expect(otroContenido).toMatchObject({ estado: 409, datos: { code: "COMANDO_REPETIDO" } });
	});

	it("los errores de las reglas llevan su código y estado", async () => {
		const servicio = await arrancar();
		const { codigo, sesiones } = await salaConAlumnos(servicio, ["Ana", "Luis"]);
		const casos = [
			["POST", "/api/salas", { cuerpo: datosSala({ nombre: "" }) }, 400, "NOMBRE_INVALIDO"],
			["POST", `/api/salas/${codigo}/unirse`, { cuerpo: { nombre: "ana" } }, 409, "NOMBRE_REPETIDO"],
			["POST", "/api/salas/PRL-ZZZZ/unirse", { cuerpo: { nombre: "Eva" } }, 404, "SALA_NO_ENCONTRADA"],
			["POST", "/api/salas/PRL-12/unirse", { cuerpo: { nombre: "Eva" } }, 400, "CODIGO_INVALIDO"],
			["GET", "/api/salas/PRL-ZZZZ", { sesion: sesiones[0] }, 404, "SALA_NO_ENCONTRADA"],
			["POST", `/api/salas/${codigo}/responder`, { sesion: sesiones[0], cuerpo: { comandoId: "x", indice: 0, opcion: 0 } }, 409, "TEST_NO_ACTIVO"],
		];
		for (const [metodo, ruta, opciones, estado, code] of casos) {
			const respuesta = await api(servicio, metodo, ruta, opciones);
			expect([respuesta.estado, respuesta.datos.code], `${metodo} ${ruta}`).toEqual([estado, code]);
			expect(typeof respuesta.datos.mensaje).toBe("string");
		}
		await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: sesiones[0] });
		expect((await api(servicio, "POST", `/api/salas/${codigo}/unirse`, { cuerpo: { nombre: "Tarde" } })).datos.code).toBe("SALA_INICIADA");
		const adelantada = await api(servicio, "POST", `/api/salas/${codigo}/responder`, {
			sesion: sesiones[0],
			cuerpo: { comandoId: "y", indice: 2, opcion: 0 },
		});
		expect(adelantada).toMatchObject({ estado: 409, datos: { code: "FUERA_DE_ORDEN" } });
		expect(JSON.stringify(adelantada.datos)).not.toContain("correcta");
	});

	it("rutas y métodos desconocidos devuelven 404 y 405", async () => {
		const servicio = await arrancar();
		expect((await api(servicio, "GET", "/api/otra")).estado).toBe(404);
		expect((await api(servicio, "GET", "/api/salas")).estado).toBe(405);
		expect((await api(servicio, "POST", "/api/salas/PRL-AAAA", { cuerpo: {} })).estado).toBe(405);
		expect((await api(servicio, "GET", "/api/salas/PRL-AAAA/iniciar")).estado).toBe(405);
	});
});

describe("sesión y seguridad", () => {
	it("401 sin Authorization y con la sesión de otra sala; el código solo no da acceso", async () => {
		const servicio = await arrancar();
		const a = await salaConAlumnos(servicio, ["Ana", "Luis"]);
		const b = await salaConAlumnos(servicio, ["Eva"]);
		for (const [metodo, accion] of [["GET", ""], ["POST", "/iniciar"], ["POST", "/responder"], ["POST", "/salir"]]) {
			const sinSesion = await api(servicio, metodo, `/api/salas/${a.codigo}${accion}`, { cuerpo: metodo === "POST" ? {} : undefined });
			expect([sinSesion.estado, sinSesion.datos.code], `${metodo}${accion} sin sesión`).toEqual([401, "SIN_SESION"]);
			const ajena = await api(servicio, metodo, `/api/salas/${a.codigo}${accion}`, { sesion: b.sesiones[0], cuerpo: metodo === "POST" ? {} : undefined });
			expect([ajena.estado, ajena.datos.code], `${metodo}${accion} sesión ajena`).toEqual([401, "SIN_SESION"]);
		}
		const esquema = await api(servicio, "GET", `/api/salas/${a.codigo}`, { cabeceras: { authorization: `Basic ${a.sesiones[0]}` } });
		expect(esquema.estado).toBe(401);
	});

	it("la vista de un alumno no contiene el sessionId de los demás", async () => {
		const servicio = await arrancar();
		const { codigo, sesiones } = await salaConAlumnos(servicio, ["Ana", "Luis"]);
		await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: sesiones[0] });
		const vista = await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: sesiones[1] });
		const texto = JSON.stringify(vista.datos);
		expect(texto).not.toContain(sesiones[0]);
		expect(texto).not.toContain(sesiones[1]);
	});

	it("CORS: 403 con un Origin no permitido y 204 en OPTIONS con uno permitido", async () => {
		const servicio = await arrancar();
		const ajeno = await api(servicio, "GET", "/health", { cabeceras: { origin: "https://sitio-ajeno.example" } });
		expect(ajeno).toMatchObject({ estado: 403, datos: { code: "ORIGEN_NO_PERMITIDO" } });
		expect(ajeno.cabeceras.get("access-control-allow-origin")).toBeNull();
		const ajenoOpciones = await api(servicio, "OPTIONS", "/api/salas", { cabeceras: { origin: "https://sitio-ajeno.example" } });
		expect(ajenoOpciones.estado).toBe(403);
		const permitido = await fetch(`${servicio.url}/api/salas`, {
			method: "OPTIONS",
			headers: { origin: ORIGEN, "access-control-request-method": "POST" },
		});
		expect(permitido.status).toBe(204);
		expect(permitido.headers.get("access-control-allow-origin")).toBe(ORIGEN);
		expect(permitido.headers.get("access-control-allow-headers")).toContain("authorization");
		expect(permitido.headers.get("vary")).toBe("Origin");
		const respuesta = await api(servicio, "GET", "/health", { cabeceras: { origin: ORIGEN } });
		expect(respuesta.cabeceras.get("access-control-allow-origin")).toBe(ORIGEN);
		for (const [nombre, valor] of respuesta.cabeceras) {
			if (nombre === "access-control-allow-origin") expect(valor).not.toBe("*");
		}
	});

	it("una petición sin Origin (healthchecks, curl) se acepta", async () => {
		const servicio = await arrancar();
		expect((await api(servicio, "GET", "/health")).estado).toBe(200);
	});

	it("JSON roto → 400 y cuerpo de más de 16 KB → 413", async () => {
		const servicio = await arrancar();
		const roto = await fetch(`${servicio.url}/api/salas`, { method: "POST", headers: { "content-type": "application/json" }, body: "{no es json" });
		expect(roto.status).toBe(400);
		expect((await roto.json()).code).toBe("JSON_INVALIDO");
		const grande = await api(servicio, "POST", "/api/salas", { cuerpo: { nombre: "x".repeat(MAX_CUERPO_BYTES) } });
		expect(grande).toMatchObject({ estado: 413, datos: { code: "CUERPO_DEMASIADO_GRANDE" } });
		const justo = await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() });
		expect(justo.estado).toBe(201);
	});

	it("un cuerpo enviado por trozos que supera 16 KB también recibe 413", async () => {
		const servicio = await arrancar();
		const url = new URL(servicio.url);
		const resultado = await new Promise((resolve, reject) => {
			const peticion = peticionHttp(
				{ host: url.hostname, port: url.port, path: "/api/salas", method: "POST", headers: { "content-type": "application/json", "transfer-encoding": "chunked" } },
				(respuesta) => {
					let texto = "";
					respuesta.on("data", (trozo) => (texto += trozo));
					respuesta.on("end", () => resolve({ estado: respuesta.statusCode, datos: JSON.parse(texto) }));
				},
			);
			peticion.on("error", reject);
			for (let i = 0; i < 4; i++) peticion.write(`"${"x".repeat(6000)}"`);
			peticion.end();
		});
		expect(resultado).toMatchObject({ estado: 413, datos: { code: "CUERPO_DEMASIADO_GRANDE" } });
	});
});

describe("límites de peticiones", () => {
	it("30 alumnos que se unen y consultan cada segundo desde la misma IP no reciben 429", async () => {
		const servicio = await arrancar();
		const nombres = Array.from({ length: 30 }, (_, i) => `Alumno ${i + 1}`);
		const { codigo, sesiones } = await salaConAlumnos(servicio, nombres);
		expect(sesiones).toHaveLength(30);
		await api(servicio, "POST", `/api/salas/${codigo}/iniciar`, { sesion: sesiones[0] });
		// Un minuto de consultas de toda la clase: 30 × 60 = 1.800 peticiones.
		const estados = new Map();
		await Promise.all(
			sesiones.map(async (sesion) => {
				for (let i = 0; i < 60; i++) {
					const { estado } = await api(servicio, "GET", `/api/salas/${codigo}`, { sesion });
					estados.set(estado, (estados.get(estado) ?? 0) + 1);
				}
			}),
		);
		expect([...estados.keys()]).toEqual([200]);
		expect(estados.get(200)).toBe(1800);
	}, 60_000);

	it("crear 31 salas en una hora desde la misma IP → la 31.ª recibe 429 con retry-after", async () => {
		const servicio = await arrancar({ ahora: () => reloj });
		for (let i = 0; i < 30; i++) {
			expect((await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() })).estado, `sala ${i + 1}`).toBe(201);
		}
		const bloqueada = await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() });
		expect(bloqueada).toMatchObject({ estado: 429, datos: { code: "LIMITE_PETICIONES" } });
		const espera = Number(bloqueada.cabeceras.get("retry-after"));
		expect(espera).toBeGreaterThan(0);
		expect(espera).toBeLessThanOrEqual(3600);
		reloj += 3600 * 1000;
		expect((await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() })).estado).toBe(201);
	});

	it("el límite por sesión no afecta a otros alumnos de la misma IP", async () => {
		const servicio = await arrancar({ ahora: () => reloj, limites: { sesion: { max: 5, ventanaMs: 60_000 } } });
		const { codigo, sesiones } = await salaConAlumnos(servicio, ["Ana", "Luis"]);
		for (let i = 0; i < 5; i++) {
			expect((await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: sesiones[0] })).estado).toBe(200);
		}
		const limitada = await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: sesiones[0] });
		expect(limitada.estado).toBe(429);
		expect(Number(limitada.cabeceras.get("retry-after"))).toBeGreaterThan(0);
		expect((await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: sesiones[1] })).estado).toBe(200);
		reloj += 60_000;
		expect((await api(servicio, "GET", `/api/salas/${codigo}`, { sesion: sesiones[0] })).estado).toBe(200);
	});

	it("unirse tiene su propio límite por IP y el global protege el resto", async () => {
		const servicio = await arrancar({ ahora: () => reloj, limites: { unirse: { max: 3, ventanaMs: 60_000 }, global: { max: 12, ventanaMs: 60_000 } } });
		const { datos: { codigo } } = await api(servicio, "POST", "/api/salas", { cuerpo: datosSala() });
		for (let i = 0; i < 3; i++) {
			expect((await api(servicio, "POST", `/api/salas/${codigo}/unirse`, { cuerpo: { nombre: `A${i}` } })).estado).toBe(200);
		}
		expect((await api(servicio, "POST", `/api/salas/${codigo}/unirse`, { cuerpo: { nombre: "A9" } })).estado).toBe(429);
		let global = 0;
		for (let i = 0; i < 12; i++) global = (await api(servicio, "GET", "/api/otra")).estado;
		expect(global).toBe(429);
		expect((await api(servicio, "GET", "/health")).estado).toBe(200);
	});

	it("la IP solo se toma de X-Forwarded-For con trustProxy y usa el último salto", async () => {
		const sinProxy = await arrancar({ ahora: () => reloj, limites: { crearSala: { max: 1, ventanaMs: 3_600_000 } } });
		expect((await api(sinProxy, "POST", "/api/salas", { cuerpo: datosSala(), cabeceras: { "x-forwarded-for": "1.1.1.1" } })).estado).toBe(201);
		expect((await api(sinProxy, "POST", "/api/salas", { cuerpo: datosSala(), cabeceras: { "x-forwarded-for": "2.2.2.2" } })).estado).toBe(429);

		const conProxy = await arrancar({ ahora: () => reloj, trustProxy: true, limites: { crearSala: { max: 1, ventanaMs: 3_600_000 } } });
		const desde = (ip, falsa = "9.9.9.9") => api(conProxy, "POST", "/api/salas", { cuerpo: datosSala(), cabeceras: { "x-forwarded-for": `${falsa}, ${ip}` } });
		expect((await desde("10.0.0.1")).estado).toBe(201);
		expect((await desde("10.0.0.2")).estado).toBe(201);
		expect((await desde("10.0.0.1", "8.8.8.8")).estado).toBe(429);
	});
});

describe("persistencia", () => {
	it("reiniciar el servidor con el mismo directorio conserva la sala y el progreso", async () => {
		const directorioDatos = await directorioTemporal();
		const primero = await arrancar({ directorioDatos, ahora: () => reloj });
		const { codigo, sesiones } = await salaConAlumnos(primero, ["Ana", "Luis"]);
		await api(primero, "POST", `/api/salas/${codigo}/iniciar`, { sesion: sesiones[0] });
		const correcta = primero.gestor.salas.get(codigo).preguntas[0].respuesta;
		const cuerpo = { comandoId: "antes-del-reinicio", indice: 0, opcion: correcta };
		const original = await api(primero, "POST", `/api/salas/${codigo}/responder`, { sesion: sesiones[0], cuerpo });
		const vistaAntes = await api(primero, "GET", `/api/salas/${codigo}`, { sesion: sesiones[0] });
		await primero.cerrar();

		reloj += 120_000;
		const segundo = await arrancar({ directorioDatos, ahora: () => reloj });
		const vistaDespues = await api(segundo, "GET", `/api/salas/${codigo}`, { sesion: sesiones[0] });
		expect(vistaDespues.estado).toBe(200);
		expect(vistaDespues.datos.progreso).toEqual(vistaAntes.datos.progreso);
		expect(vistaDespues.datos).toMatchObject({ estado: "EN_CURSO", soyAnfitrion: true, nombre: "Ana" });
		expect(vistaDespues.datos.ranking).toEqual(vistaAntes.datos.ranking);
		const repetida = await api(segundo, "POST", `/api/salas/${codigo}/responder`, { sesion: sesiones[0], cuerpo });
		expect({ ...repetida.datos, vista: null }).toEqual({ ...original.datos, vista: null });
		expect((await api(segundo, "GET", `/api/salas/${codigo}`, { sesion: sesiones[1] })).datos.nombre).toBe("Luis");
		const continuar = await api(segundo, "POST", `/api/salas/${codigo}/responder`, {
			sesion: sesiones[0],
			cuerpo: { comandoId: "despues", indice: 1, opcion: 0 },
		});
		expect(continuar.estado).toBe(200);
	});

	it("los cambios llegan a disco sin esperar al cierre", async () => {
		const directorioDatos = await directorioTemporal();
		const servicio = await arrancar({ directorioDatos });
		const { codigo } = await salaConAlumnos(servicio, ["Ana"]);
		await servicio.almacen.vaciar();
		const guardado = await servicio.almacen.cargar();
		expect(guardado.salas.map((sala) => sala.codigo)).toEqual([codigo]);
	});

	it("un archivo de datos ilegible se aparta y el servidor arranca vacío", async () => {
		const directorioDatos = await directorioTemporal();
		const { writeFile, readdir } = await import("node:fs/promises");
		await writeFile(join(directorioDatos, "salas.json"), "{roto", "utf8");
		const avisos = [];
		const servicio = await arrancar({ directorioDatos, avisar: (...partes) => avisos.push(partes.join(" ")) });
		expect(servicio.gestor.salas.size).toBe(0);
		expect(avisos[0]).toContain("No se pudieron restaurar las salas");
		expect((await readdir(directorioDatos)).some((nombre) => nombre.startsWith("salas.json.corrupto-"))).toBe(true);
	});

	it("el tick del servicio avanza las preguntas vencidas y lo guarda en disco", async () => {
		const directorioDatos = await directorioTemporal();
		const servicio = await arrancar({ directorioDatos, ahora: () => reloj });
		const { datos: creada } = await api(servicio, "POST", "/api/salas", {
			cuerpo: datosSala({ timerConfig: { activo: true, tipo: "pregunta", segundos: 15 } }),
		});
		await api(servicio, "POST", `/api/salas/${creada.codigo}/iniciar`, { sesion: creada.sessionId });
		const ruta = `/api/salas/${creada.codigo}`;
		expect((await api(servicio, "GET", ruta, { sesion: creada.sessionId })).datos.progreso.siguiente).toBe(0);

		reloj += 20_000;
		// El servicio llama a tick() cada 500 ms con el reloj real; se espera a verlo avanzar.
		let siguiente = 0;
		for (let i = 0; i < 30 && siguiente === 0; i++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			siguiente = (await api(servicio, "GET", ruta, { sesion: creada.sessionId })).datos.progreso.siguiente;
		}
		expect(siguiente).toBe(1);
		await servicio.almacen.vaciar();
		const guardado = await servicio.almacen.cargar();
		const jugador = guardado.salas[0].jugadores[0];
		expect(jugador.siguiente).toBe(1);
		expect(jugador.respuestas[0]).toMatchObject({ indice: 0, opcion: null, acierto: false });
	});
});
