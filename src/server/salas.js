import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { prepararTest } from "../utils/quiz.js";

const MARGEN_MS = 2000;
const MAX_INACTIVIDAD_MS = 2 * 60 * 60 * 1000;
const INTERVALO_LIMPIEZA_MS = 10 * 60 * 1000;
const DURACIONES_PREGUNTA = new Set([15, 30, 45, 60]);
const DURACIONES_TEST = new Set([300, 600, 900, 1200]);

const temporizadoresNativos = {
	ahora: () => Date.now(),
	setTimeout: (...args) => setTimeout(...args),
	clearTimeout: (id) => clearTimeout(id),
	setInterval: (...args) => setInterval(...args),
	clearInterval: (id) => clearInterval(id),
};

function enviar(callback, resultado) {
	if (typeof callback === "function") callback(resultado);
}

function esObjeto(datos) {
	return datos !== null && typeof datos === "object" && !Array.isArray(datos);
}

function limpiarNombre(nombre) {
	if (typeof nombre !== "string") return null;
	const limpio = nombre.trim();
	return limpio.length >= 1 && limpio.length <= 30 ? limpio : null;
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

function validarTemporizador(timerConfig) {
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
	return {
		activo: true,
		tipo: timerConfig.tipo,
		segundos: timerConfig.segundos,
	};
}

function crearProgresoJugador(nombre) {
	return {
		nombre,
		resultado: null,
		siguiente: 0,
		aciertos: 0,
		respuestas: [],
		inicioPregunta: null,
		terminado: false,
	};
}

export function crearServidorSalas({
	preguntas,
	allowedOrigins = ["http://localhost:5173"],
	reloj = temporizadoresNativos,
}) {
	const app = express();
	const httpServer = createServer(app);
	const io = new Server(httpServer, {
		cors: { origin: allowedOrigins },
	});
	const salas = new Map();
	let cerrado = false;

	app.get("/health", (_req, res) => {
		res.json({ ok: true });
	});

	function cancelarTimeoutSala(sala) {
		if (sala.timeoutTest !== null) {
			reloj.clearTimeout(sala.timeoutTest);
			sala.timeoutTest = null;
		}
	}

	function eliminarSala(codigo, sala) {
		cancelarTimeoutSala(sala);
		salas.delete(codigo);
	}

	function emitirRanking(codigo, sala) {
		const ranking = Array.from(sala.jugadores.entries())
			.filter(([, jugador]) => jugador.resultado !== null)
			.map(([id, jugador]) => ({
				id,
				nombre: jugador.nombre,
				...jugador.resultado,
			}))
			.sort(
				(a, b) =>
					b.porcentaje - a.porcentaje ||
					b.aciertos - a.aciertos ||
					a.nombre.localeCompare(b.nombre),
			);
		const terminados = ranking.length;
		const totalJugadores = sala.jugadores.size;
		const completo = terminados === totalJugadores;

		io.to(codigo).emit("ranking-actualizado", {
			ranking,
			terminados,
			totalJugadores,
			completo,
		});
		if (completo) cancelarTimeoutSala(sala);
	}

	function terminarJugador(sala, jugador) {
		if (jugador.terminado) return;
		jugador.terminado = true;
		jugador.resultado = {
			aciertos: jugador.aciertos,
			total: sala.preguntas.length,
			porcentaje: Math.round(
				(jugador.aciertos / sala.preguntas.length) * 100,
			),
		};
	}

	function terminarTestPorTiempo(codigo, sala) {
		if (salas.get(codigo) !== sala || !sala.iniciado) return;
		for (const jugador of sala.jugadores.values()) {
			terminarJugador(sala, jugador);
		}
		emitirRanking(codigo, sala);
	}

	function actualizarActividad(sala) {
		sala.ultimaActividad = reloj.ahora();
	}

	function salirSala(socket) {
		const codigo = socket.data.sala;
		if (!codigo) return;
		const sala = salas.get(codigo);
		socket.leave(codigo);
		delete socket.data.sala;
		if (!sala) return;
		sala.jugadores.delete(socket.id);
		actualizarActividad(sala);
		if (sala.jugadores.size === 0) {
			eliminarSala(codigo, sala);
			return;
		}
		if (sala.host === socket.id) {
			sala.host = sala.jugadores.keys().next().value;
			io.to(sala.host).emit("eres-host");
		}
		io.to(codigo).emit(
			"jugadores-actualizados",
			Array.from(sala.jugadores.values()).map((jugador) => jugador.nombre),
		);
		if (sala.iniciado) emitirRanking(codigo, sala);
	}

	const intervaloLimpieza = reloj.setInterval(() => {
		const ahora = reloj.ahora();
		for (const [codigo, sala] of salas) {
			if (ahora - sala.ultimaActividad > MAX_INACTIVIDAD_MS) {
				eliminarSala(codigo, sala);
			}
		}
	}, INTERVALO_LIMPIEZA_MS);
	intervaloLimpieza.unref?.();

	io.on("connection", (socket) => {
		socket.on("crear-sala", (datos, callback) => {
			if (!esObjeto(datos)) {
				enviar(callback, { ok: false, error: "Datos de sala no válidos" });
				return;
			}
			const nombre = limpiarNombre(datos.nombre);
			if (!nombre) {
				enviar(callback, {
					ok: false,
					error: "El nombre debe tener entre 1 y 30 caracteres",
				});
				return;
			}
			const categorias = datos.categorias ?? [];
			if (
				!Array.isArray(categorias) ||
				categorias.some(
					(categoria) =>
						typeof categoria !== "string" ||
						!preguntas.some((pregunta) => pregunta.categoria === categoria),
				)
			) {
				enviar(callback, { ok: false, error: "Categorías no válidas" });
				return;
			}
			const preguntasBase =
				categorias.length > 0
					? preguntas.filter((pregunta) =>
							categorias.includes(pregunta.categoria),
						)
					: preguntas;
			if (
				!Number.isInteger(datos.numPreguntas) ||
				datos.numPreguntas < 1 ||
				datos.numPreguntas > preguntasBase.length
			) {
				enviar(callback, { ok: false, error: "Cantidad de preguntas no válida" });
				return;
			}
			const timerConfig = validarTemporizador(datos.timerConfig);
			if (!timerConfig) {
				enviar(callback, { ok: false, error: "Temporizador no válido" });
				return;
			}
			const codigo = generarCodigo(salas);
			if (!codigo) {
				enviar(callback, { ok: false, error: "No se pudo generar un código" });
				return;
			}

			const preguntasSala = prepararTest(preguntasBase, datos.numPreguntas);
			salirSala(socket);
			const sala = {
				host: socket.id,
				preguntas: preguntasSala,
				jugadores: new Map(),
				iniciado: false,
				timerConfig,
				finTest: null,
				timeoutTest: null,
				ultimaActividad: reloj.ahora(),
			};
			sala.jugadores.set(socket.id, crearProgresoJugador(nombre));
			salas.set(codigo, sala);
			socket.join(codigo);
			socket.data.sala = codigo;
			enviar(callback, {
				ok: true,
				codigo,
				totalPreguntas: preguntasSala.length,
			});
		});

		socket.on("unirse-sala", (datos, callback) => {
			if (!esObjeto(datos)) {
				enviar(callback, { ok: false, error: "Datos de sala no válidos" });
				return;
			}
			const codigo =
				typeof datos.codigo === "string" ? datos.codigo.trim() : "";
			const nombre = limpiarNombre(datos.nombre);
			if (!nombre) {
				enviar(callback, {
					ok: false,
					error: "El nombre debe tener entre 1 y 30 caracteres",
				});
				return;
			}
			if (!/^PRL-[A-Z0-9]{4}$/.test(codigo)) {
				enviar(callback, { ok: false, error: "Código no válido" });
				return;
			}
			const sala = salas.get(codigo);
			if (!sala) {
				enviar(callback, { ok: false, error: "Sala no encontrada" });
				return;
			}
			if (sala.iniciado) {
				enviar(callback, { ok: false, error: "El test ya comenzó" });
				return;
			}

			if (socket.data.sala !== codigo) salirSala(socket);
			actualizarActividad(sala);
			sala.jugadores.set(socket.id, crearProgresoJugador(nombre));
			socket.join(codigo);
			socket.data.sala = codigo;
			const listaJugadores = Array.from(sala.jugadores.values()).map(
				(jugador) => jugador.nombre,
			);
			io.to(codigo).emit("jugadores-actualizados", listaJugadores);
			enviar(callback, { ok: true, totalPreguntas: sala.preguntas.length });
		});

		socket.on("iniciar-test", (_datos, callback) => {
			const codigo = socket.data.sala;
			const sala = salas.get(codigo);
			if (!sala) {
				enviar(callback, { ok: false, error: "Sala no encontrada" });
				return;
			}
			if (sala.host !== socket.id) {
				enviar(callback, { ok: false, error: "No eres el anfitrión" });
				return;
			}
			if (sala.iniciado) {
				enviar(callback, { ok: false, error: "El test ya comenzó" });
				return;
			}

			const ahora = reloj.ahora();
			sala.iniciado = true;
			actualizarActividad(sala);
			for (const jugador of sala.jugadores.values()) {
				jugador.siguiente = 0;
				jugador.aciertos = 0;
				jugador.respuestas = [];
				jugador.inicioPregunta = ahora;
				jugador.terminado = false;
				jugador.resultado = null;
			}
			if (sala.timerConfig.activo && sala.timerConfig.tipo === "test") {
				sala.finTest = ahora + sala.timerConfig.segundos * 1000;
				sala.timeoutTest = reloj.setTimeout(
					() => terminarTestPorTiempo(codigo, sala),
					sala.timerConfig.segundos * 1000 + MARGEN_MS,
				);
				sala.timeoutTest.unref?.();
			}

			io.to(codigo).emit("test-iniciado", {
				preguntas: sala.preguntas.map(({ id, categoria, pregunta, opciones }) => ({
					id,
					categoria,
					pregunta,
					opciones,
				})),
				timerConfig: sala.timerConfig,
			});
			enviar(callback, { ok: true });
		});

		socket.on("responder", (datos, callback) => {
			const codigo = socket.data.sala;
			const sala = salas.get(codigo);
			const jugador = sala?.jugadores.get(socket.id);
			if (!sala?.iniciado || !jugador || jugador.terminado) {
				enviar(callback, {
					ok: false,
					error: "No puedes responder en esta sala",
				});
				return;
			}
			const ahora = reloj.ahora();
			if (
				sala.finTest !== null &&
				ahora >= sala.finTest + MARGEN_MS
			) {
				terminarTestPorTiempo(codigo, sala);
				enviar(callback, { ok: false, error: "El tiempo del test ha terminado" });
				return;
			}
			if (
				!esObjeto(datos) ||
				!Number.isInteger(datos.indice) ||
				datos.indice !== jugador.siguiente ||
				datos.indice < 0 ||
				datos.indice >= sala.preguntas.length
			) {
				enviar(callback, { ok: false, error: "Pregunta no válida o fuera de orden" });
				return;
			}
			const pregunta = sala.preguntas[datos.indice];
			if (
				datos.opcion !== null &&
				(!Number.isInteger(datos.opcion) ||
					datos.opcion < 0 ||
					datos.opcion >= pregunta.opciones.length)
			) {
				enviar(callback, { ok: false, error: "Opción no válida" });
				return;
			}

			const fueraDeTiempo =
				sala.timerConfig.activo &&
				sala.timerConfig.tipo === "pregunta" &&
				ahora - jugador.inicioPregunta >
					(sala.timerConfig.segundos * 1000 + MARGEN_MS);
			const acierto =
				!fueraDeTiempo &&
				datos.opcion !== null &&
				datos.opcion === pregunta.respuesta;
			jugador.respuestas.push({
				indice: datos.indice,
				opcion: fueraDeTiempo ? null : datos.opcion,
				acierto,
				fueraDeTiempo,
			});
			if (acierto) jugador.aciertos++;
			jugador.siguiente++;
			actualizarActividad(sala);
			if (jugador.siguiente === sala.preguntas.length) {
				terminarJugador(sala, jugador);
				emitirRanking(codigo, sala);
			} else {
				jugador.inicioPregunta = ahora;
			}

			enviar(callback, {
				ok: true,
				correcta: pregunta.respuesta,
				acierto,
				...(fueraDeTiempo ? { fueraDeTiempo: true } : {}),
			});
		});

		socket.on("salir-sala", (_datos, callback) => {
			salirSala(socket);
			enviar(callback, { ok: true });
		});
		socket.on("disconnect", () => salirSala(socket));
	});

	async function cerrar() {
		if (cerrado) return;
		cerrado = true;
		reloj.clearInterval(intervaloLimpieza);
		for (const sala of salas.values()) cancelarTimeoutSala(sala);
		salas.clear();
		await new Promise((resolve) => io.close(resolve));
	}

	return { httpServer, io, salas, cerrar };
}
