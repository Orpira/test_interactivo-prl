import { randomUUID } from "node:crypto";
import { prepararTest } from "../utils/quiz.js";

export const MARGEN_MS = 2000;
export const MAX_JUGADORES = 40;
export const CONECTADO_MS = 5000;
export const ANFITRION_AUSENTE_MS = 60 * 1000;
export const MAX_INACTIVIDAD_MS = 2 * 60 * 60 * 1000;
// Una sala terminada se conserva un rato para que los alumnos puedan ver el ranking final.
export const RETENCION_TERMINADA_MS = 30 * 60 * 1000;
const DURACIONES_PREGUNTA = new Set([15, 30, 45, 60]);
const DURACIONES_TEST = new Set([300, 600, 900, 1200]);
const FORMATO_CODIGO = /^PRL-[A-Z0-9]{4}$/;

const MENSAJES = {
	DATOS_INVALIDOS: "Datos no válidos",
	NOMBRE_INVALIDO: "El nombre debe tener entre 1 y 30 caracteres",
	BANCO_INVALIDO: "Reglamentación no válida",
	CATEGORIAS_INVALIDAS: "Categorías no válidas",
	CANTIDAD_INVALIDA: "Cantidad de preguntas no válida",
	TEMPORIZADOR_INVALIDO: "Temporizador no válido",
	CODIGO_INVALIDO: "Código no válido",
	CODIGO_NO_DISPONIBLE: "No se pudo generar un código",
	OPCION_INVALIDA: "Opción no válida",
	SIN_SESION: "Sesión no válida",
	SALA_NO_ENCONTRADA: "Sala no encontrada",
	SALA_INICIADA: "El test ya comenzó",
	SALA_LLENA: "La sala está llena",
	NOMBRE_REPETIDO: "Ya hay alguien con ese nombre en la sala",
	NO_ES_ANFITRION: "No eres el anfitrión",
	COMANDO_REPETIDO: "El identificador de la respuesta ya se usó con otro contenido",
	FUERA_DE_ORDEN: "Pregunta fuera de orden",
	TEST_NO_ACTIVO: "No puedes responder en este momento",
};

export class ErrorSala extends Error {
	constructor(code, mensaje = MENSAJES[code] ?? code) {
		super(mensaje);
		this.name = "ErrorSala";
		this.code = code;
	}
}

function esObjeto(datos) {
	return datos !== null && typeof datos === "object" && !Array.isArray(datos);
}

function limpiarNombre(nombre) {
	if (typeof nombre !== "string") return null;
	const limpio = nombre.trim();
	return limpio.length >= 1 && limpio.length <= 30 ? limpio : null;
}

function claveNombre(nombre) {
	return nombre.trim().toLowerCase();
}

export function normalizarCodigo(codigo) {
	if (typeof codigo !== "string") throw new ErrorSala("CODIGO_INVALIDO");
	const normalizado = codigo.trim().toUpperCase();
	if (!FORMATO_CODIGO.test(normalizado)) throw new ErrorSala("CODIGO_INVALIDO");
	return normalizado;
}

export function generarCodigo(salas, aleatorio = Math.random) {
	for (let intento = 0; intento < 10; intento++) {
		const codigo = `PRL-${Math.floor(aleatorio() * 36 ** 4)
			.toString(36)
			.padStart(4, "0")
			.toUpperCase()}`;
		if (!salas.has(codigo)) return codigo;
	}
	return null;
}

export function validarTemporizador(timerConfig) {
	if (timerConfig == null || timerConfig.activo === false) {
		return { activo: false, tipo: null, segundos: null };
	}
	if (
		typeof timerConfig !== "object" ||
		timerConfig.activo !== true ||
		(timerConfig.tipo !== "pregunta" && timerConfig.tipo !== "test") ||
		!Number.isInteger(timerConfig.segundos)
	) {
		return null;
	}
	const duraciones =
		timerConfig.tipo === "pregunta" ? DURACIONES_PREGUNTA : DURACIONES_TEST;
	if (!duraciones.has(timerConfig.segundos)) return null;
	return { activo: true, tipo: timerConfig.tipo, segundos: timerConfig.segundos };
}

function nuevoJugador(nombre, ahora) {
	return {
		sessionId: randomUUID(),
		nombre,
		siguiente: 0,
		aciertos: 0,
		respuestas: [],
		inicioPregunta: null,
		terminado: false,
		ultimaVez: ahora,
		comandos: {},
	};
}

const porcentaje = (aciertos, total) =>
	total > 0 ? Math.round((aciertos / total) * 100) : 0;

export class GestorSalas {
	constructor({
		preguntas = [],
		// Un banco por reglamentación ({ es: [...], co: [...] }); `preguntas` equivale a { es }.
		bancos = { es: preguntas },
		ahora = Date.now,
		aleatorio = Math.random,
		maxJugadores = MAX_JUGADORES,
	} = {}) {
		this.bancos = bancos;
		this.ahora = ahora;
		this.aleatorio = aleatorio;
		this.maxJugadores = maxJugadores;
		this.salas = new Map();
		// Se activa con cada cambio que debe persistirse; lo consume quien guarda en disco.
		this.sucio = false;
	}

	#cambio() {
		this.sucio = true;
	}

	#sala(codigo) {
		const sala = this.salas.get(normalizarCodigo(codigo));
		if (!sala) throw new ErrorSala("SALA_NO_ENCONTRADA");
		return sala;
	}

	#jugador(sala, sessionId) {
		const jugador =
			typeof sessionId === "string" ? sala.jugadores.get(sessionId) : undefined;
		if (!jugador) throw new ErrorSala("SIN_SESION");
		jugador.ultimaVez = this.ahora();
		return jugador;
	}

	#total(sala) {
		return sala.preguntas.length;
	}

	#terminarJugador(sala, jugador) {
		jugador.terminado = true;
		jugador.siguiente = this.#total(sala);
		jugador.inicioPregunta = null;
	}

	// Las preguntas sin responder cuentan como falladas, sin revelar su respuesta correcta.
	#terminarPendientes(sala) {
		for (const jugador of sala.jugadores.values()) {
			if (!jugador.terminado) this.#terminarJugador(sala, jugador);
		}
		sala.estado = "TERMINADA";
	}

	#cerrarSiTodosTerminaron(sala) {
		if (
			sala.estado === "EN_CURSO" &&
			[...sala.jugadores.values()].every((jugador) => jugador.terminado)
		) {
			sala.estado = "TERMINADA";
		}
	}

	#limiteTestVencido(sala, ahora) {
		return sala.limiteTest !== null && ahora > sala.limiteTest + MARGEN_MS;
	}

	#limitePregunta(sala, jugador) {
		return sala.timerConfig.activo && sala.timerConfig.tipo === "pregunta"
			? jugador.inicioPregunta + sala.timerConfig.segundos * 1000
			: null;
	}

	#conectado(jugador, ahora) {
		return ahora - jugador.ultimaVez <= CONECTADO_MS;
	}

	// El nuevo anfitrión es el jugador conectado que entró antes; si nadie lo está, el primero.
	#traspasarAnfitrion(sala, excluido = null) {
		const ahora = this.ahora();
		const candidatos = [...sala.jugadores.values()].filter(
			(jugador) => jugador.sessionId !== excluido,
		);
		const siguiente =
			candidatos.find((jugador) => this.#conectado(jugador, ahora)) ?? candidatos[0];
		if (siguiente) sala.anfitrion = siguiente.sessionId;
	}

	crear(datos) {
		if (!esObjeto(datos)) throw new ErrorSala("DATOS_INVALIDOS");
		const nombre = limpiarNombre(datos.nombre);
		if (!nombre) throw new ErrorSala("NOMBRE_INVALIDO");
		const banco = datos.banco ?? "es";
		if (typeof banco !== "string" || !Object.hasOwn(this.bancos, banco)) {
			throw new ErrorSala("BANCO_INVALIDO");
		}
		const preguntasBanco = this.bancos[banco];
		const categorias = datos.categorias ?? [];
		if (
			!Array.isArray(categorias) ||
			categorias.some(
				(categoria) =>
					typeof categoria !== "string" ||
					!preguntasBanco.some((pregunta) => pregunta.categoria === categoria),
			)
		) {
			throw new ErrorSala("CATEGORIAS_INVALIDAS");
		}
		const preguntasBase =
			categorias.length > 0
				? preguntasBanco.filter((pregunta) => categorias.includes(pregunta.categoria))
				: preguntasBanco;
		if (
			!Number.isInteger(datos.numPreguntas) ||
			datos.numPreguntas < 1 ||
			datos.numPreguntas > preguntasBase.length
		) {
			throw new ErrorSala("CANTIDAD_INVALIDA");
		}
		const timerConfig = validarTemporizador(datos.timerConfig);
		if (!timerConfig) throw new ErrorSala("TEMPORIZADOR_INVALIDO");
		const codigo = generarCodigo(this.salas, this.aleatorio);
		if (!codigo) throw new ErrorSala("CODIGO_NO_DISPONIBLE");

		const ahora = this.ahora();
		const anfitrion = nuevoJugador(nombre, ahora);
		this.salas.set(codigo, {
			codigo,
			estado: "ESPERANDO",
			banco,
			anfitrion: anfitrion.sessionId,
			preguntas: prepararTest(preguntasBase, datos.numPreguntas),
			timerConfig,
			jugadores: new Map([[anfitrion.sessionId, anfitrion]]),
			creadaEn: ahora,
			iniciadaEn: null,
			limiteTest: null,
			ultimaActividad: ahora,
		});
		this.#cambio();
		return { codigo, sessionId: anfitrion.sessionId };
	}

	unirse(codigo, datos) {
		const sala = this.#sala(codigo);
		if (sala.estado !== "ESPERANDO") throw new ErrorSala("SALA_INICIADA");
		if (sala.jugadores.size >= this.maxJugadores) throw new ErrorSala("SALA_LLENA");
		const nombre = limpiarNombre(esObjeto(datos) ? datos.nombre : undefined);
		if (!nombre) throw new ErrorSala("NOMBRE_INVALIDO");
		const clave = claveNombre(nombre);
		for (const jugador of sala.jugadores.values()) {
			if (claveNombre(jugador.nombre) === clave) throw new ErrorSala("NOMBRE_REPETIDO");
		}

		const ahora = this.ahora();
		const jugador = nuevoJugador(nombre, ahora);
		sala.jugadores.set(jugador.sessionId, jugador);
		sala.ultimaActividad = ahora;
		this.#cambio();
		return { codigo: sala.codigo, sessionId: jugador.sessionId };
	}

	iniciar(codigo, sessionId) {
		const sala = this.#sala(codigo);
		this.#jugador(sala, sessionId);
		if (sala.anfitrion !== sessionId) throw new ErrorSala("NO_ES_ANFITRION");
		if (sala.estado !== "ESPERANDO") throw new ErrorSala("SALA_INICIADA");

		const ahora = this.ahora();
		sala.estado = "EN_CURSO";
		sala.iniciadaEn = ahora;
		sala.ultimaActividad = ahora;
		if (sala.timerConfig.activo && sala.timerConfig.tipo === "test") {
			sala.limiteTest = ahora + sala.timerConfig.segundos * 1000;
		}
		for (const jugador of sala.jugadores.values()) {
			jugador.inicioPregunta = ahora;
		}
		this.#cambio();
	}

	responder(codigo, sessionId, datos) {
		const sala = this.#sala(codigo);
		const jugador = this.#jugador(sala, sessionId);
		if (
			!esObjeto(datos) ||
			typeof datos.comandoId !== "string" ||
			datos.comandoId.length < 1 ||
			datos.comandoId.length > 64
		) {
			throw new ErrorSala("DATOS_INVALIDOS");
		}
		const huella = JSON.stringify({ indice: datos.indice, opcion: datos.opcion });
		// El prefijo evita claves peligrosas como "__proto__" en el objeto de comandos.
		const claveComando = `c:${datos.comandoId}`;
		const previo = Object.hasOwn(jugador.comandos, claveComando)
			? jugador.comandos[claveComando]
			: null;
		// Un reenvío tras un corte de red devuelve lo guardado aunque el estado haya cambiado.
		if (previo) {
			if (previo.huella !== huella) throw new ErrorSala("COMANDO_REPETIDO");
			return { ...previo.resultado };
		}

		if (sala.estado !== "EN_CURSO" || jugador.terminado) {
			throw new ErrorSala("TEST_NO_ACTIVO");
		}
		if (!Number.isInteger(datos.indice)) throw new ErrorSala("DATOS_INVALIDOS");
		if (datos.indice !== jugador.siguiente) throw new ErrorSala("FUERA_DE_ORDEN");
		const pregunta = sala.preguntas[datos.indice];
		if (
			datos.opcion !== null &&
			(!Number.isInteger(datos.opcion) ||
				datos.opcion < 0 ||
				datos.opcion >= pregunta.opciones.length)
		) {
			throw new ErrorSala("OPCION_INVALIDA");
		}

		const ahora = this.ahora();
		const testVencido = this.#limiteTestVencido(sala, ahora);
		const limite = this.#limitePregunta(sala, jugador);
		const fueraDeTiempo =
			testVencido || (limite !== null && ahora > limite + MARGEN_MS);
		const acierto =
			!fueraDeTiempo && datos.opcion !== null && datos.opcion === pregunta.respuesta;
		const resultado = {
			correcta: pregunta.respuesta,
			acierto,
			fueraDeTiempo,
		};

		jugador.respuestas.push({
			indice: datos.indice,
			opcion: fueraDeTiempo ? null : datos.opcion,
			correcta: pregunta.respuesta,
			acierto,
		});
		if (acierto) jugador.aciertos++;
		jugador.siguiente++;
		jugador.comandos[claveComando] = { huella, resultado };
		sala.ultimaActividad = ahora;

		if (testVencido) {
			this.#terminarPendientes(sala);
		} else if (jugador.siguiente >= this.#total(sala)) {
			this.#terminarJugador(sala, jugador);
			this.#cerrarSiTodosTerminaron(sala);
		} else {
			jugador.inicioPregunta = ahora;
		}
		this.#cambio();
		return { ...resultado };
	}

	vista(codigo, sessionId) {
		const sala = this.#sala(codigo);
		const jugador = this.#jugador(sala, sessionId);
		const ahora = this.ahora();
		const total = this.#total(sala);
		const enCurso = sala.estado === "EN_CURSO";
		let limite = { tipo: null, hasta: null };
		if (enCurso && sala.timerConfig.activo && !jugador.terminado) {
			limite =
				sala.timerConfig.tipo === "test"
					? { tipo: "test", hasta: sala.limiteTest }
					: { tipo: "pregunta", hasta: this.#limitePregunta(sala, jugador) };
		}

		const ranking =
			sala.estado === "ESPERANDO"
				? []
				: [...sala.jugadores.values()]
						.map((otro) => ({
							nombre: otro.nombre,
							aciertos: otro.aciertos,
							total,
							porcentaje: porcentaje(otro.aciertos, total),
							terminado: otro.terminado,
						}))
						.sort(
							(a, b) =>
								b.porcentaje - a.porcentaje ||
								b.aciertos - a.aciertos ||
								a.nombre.localeCompare(b.nombre),
						);

		const vista = {
			codigo: sala.codigo,
			estado: sala.estado,
			// Las salas guardadas antes de existir los bancos eran todas de España.
			banco: sala.banco ?? "es",
			soyAnfitrion: sala.anfitrion === jugador.sessionId,
			nombre: jugador.nombre,
			totalPreguntas: total,
			timerConfig: { ...sala.timerConfig },
			jugadores: [...sala.jugadores.values()].map((otro) => ({
				nombre: otro.nombre,
				anfitrion: otro.sessionId === sala.anfitrion,
				conectado: this.#conectado(otro, ahora),
				terminado: otro.terminado,
			})),
			progreso: {
				siguiente: jugador.siguiente,
				aciertos: jugador.aciertos,
				terminado: jugador.terminado,
				respuestas: jugador.respuestas.map((respuesta) => ({ ...respuesta })),
			},
			limite,
			ahoraServidor: ahora,
			ranking,
		};
		if (enCurso) {
			vista.preguntas = sala.preguntas.map(({ id, categoria, pregunta, opciones }) => ({
				id,
				categoria,
				pregunta,
				opciones: [...opciones],
			}));
		}
		return vista;
	}

	salir(codigo, sessionId) {
		const sala = this.#sala(codigo);
		this.#jugador(sala, sessionId);
		if (sala.anfitrion === sessionId) this.#traspasarAnfitrion(sala, sessionId);
		sala.jugadores.delete(sessionId);
		sala.ultimaActividad = this.ahora();
		if (sala.jugadores.size === 0) {
			this.salas.delete(sala.codigo);
		} else {
			this.#cerrarSiTodosTerminaron(sala);
		}
		this.#cambio();
	}

	// Lo llama el servidor cada 500 ms. Devuelve true si cambió algo que haya que guardar.
	tick() {
		const ahora = this.ahora();
		let cambio = false;
		for (const sala of this.salas.values()) {
			if (sala.estado === "EN_CURSO") {
				if (this.#limiteTestVencido(sala, ahora)) {
					this.#terminarPendientes(sala);
					cambio = true;
					continue;
				}
				for (const jugador of sala.jugadores.values()) {
					const limite = this.#limitePregunta(sala, jugador);
					if (jugador.terminado || limite === null || ahora <= limite + MARGEN_MS) continue;
					const pregunta = sala.preguntas[jugador.siguiente];
					jugador.respuestas.push({
						indice: jugador.siguiente,
						opcion: null,
						correcta: pregunta.respuesta,
						acierto: false,
					});
					jugador.siguiente++;
					if (jugador.siguiente >= this.#total(sala)) {
						this.#terminarJugador(sala, jugador);
					} else {
						jugador.inicioPregunta = ahora;
					}
					cambio = true;
				}
				this.#cerrarSiTodosTerminaron(sala);
			}
			if (sala.estado !== "TERMINADA") {
				const anfitrion = sala.jugadores.get(sala.anfitrion);
				if (anfitrion && ahora - anfitrion.ultimaVez > ANFITRION_AUSENTE_MS) {
					const antes = sala.anfitrion;
					const candidato = [...sala.jugadores.values()].find(
						(jugador) =>
							jugador.sessionId !== antes && this.#conectado(jugador, ahora),
					);
					if (candidato) {
						sala.anfitrion = candidato.sessionId;
						cambio = true;
					}
				}
			}
		}
		if (cambio) this.#cambio();
		return cambio;
	}

	limpiar() {
		const ahora = this.ahora();
		let eliminadas = 0;
		for (const [codigo, sala] of this.salas) {
			const maximo =
				sala.estado === "TERMINADA" ? RETENCION_TERMINADA_MS : MAX_INACTIVIDAD_MS;
			if (ahora - sala.ultimaActividad > maximo) {
				this.salas.delete(codigo);
				eliminadas++;
			}
		}
		if (eliminadas > 0) this.#cambio();
		return eliminadas;
	}

	aJSON() {
		return {
			version: 1,
			salas: [...this.salas.values()].map((sala) => ({
				...sala,
				jugadores: [...sala.jugadores.values()],
			})),
		};
	}

	static desdeJSON(datos, opciones = {}) {
		if (!esObjeto(datos) || datos.version !== 1 || !Array.isArray(datos.salas)) {
			throw new Error("Datos de salas no válidos");
		}
		const gestor = new GestorSalas(opciones);
		const ahora = gestor.ahora();
		for (const guardada of structuredClone(datos.salas)) {
			// Tras un reinicio nadie ha consultado aún: evita que el anfitrión parezca ausente.
			const jugadores = guardada.jugadores.map((jugador) => [
				jugador.sessionId,
				{ ...jugador, ultimaVez: ahora },
			]);
			gestor.salas.set(guardada.codigo, {
				...guardada,
				jugadores: new Map(jugadores),
			});
		}
		return gestor;
	}
}
