import { Agent, get } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { io as clienteIo } from "socket.io-client";
import { crearServidorSalas, generarCodigo } from "./salas.js";
import { prepararTest } from "../utils/quiz.js";

const preguntas = [
	{
		id: 1,
		categoria: "Base",
		pregunta: "Pregunta uno",
		opciones: ["A", "B", "C", "D"],
		respuesta: 0,
	},
	{
		id: 2,
		categoria: "Base",
		pregunta: "Pregunta dos",
		opciones: ["A", "B", "C"],
		respuesta: 1,
	},
];

let servidor;
let clientes;
let url;

function esperarEvento(socket, evento) {
	return new Promise((resolve) => socket.once(evento, resolve));
}

function emitir(socket, evento, datos) {
	return new Promise((resolve) => socket.emit(evento, datos, resolve));
}

// Un Agent propio evita el proxy del entorno (NODE_USE_ENV_PROXY), que solo afecta al agente global.
function pedirJson(direccion) {
	const agent = new Agent();
	return new Promise((resolve, reject) => {
		get(direccion, { agent }, (respuesta) => {
			let cuerpo = "";
			respuesta.on("data", (trozo) => (cuerpo += trozo));
			respuesta.on("end", () => {
				agent.destroy();
				resolve(JSON.parse(cuerpo));
			});
		}).on("error", reject);
	});
}

function conectar() {
	const cliente = clienteIo(url, {
		transports: ["websocket"],
		reconnection: false,
		forceNew: true,
	});
	clientes.push(cliente);
	return new Promise((resolve, reject) => {
		cliente.once("connect", () => resolve(cliente));
		cliente.once("connect_error", reject);
	});
}

async function crearSalaAnfitrion(datos = {}) {
	const anfitrion = await conectar();
	const respuesta = await emitir(anfitrion, "crear-sala", {
		nombre: "  Anfitrión  ",
		numPreguntas: 2,
		categorias: [],
		timerConfig: { activo: false },
		...datos,
	});
	return { anfitrion, respuesta };
}

async function crearSalaConDosJugadores(datos = {}) {
	const { anfitrion, respuesta } = await crearSalaAnfitrion(datos);
	const invitado = await conectar();
	const listaJugadores = esperarEvento(anfitrion, "jugadores-actualizados");
	const unirse = await emitir(invitado, "unirse-sala", {
		codigo: respuesta.codigo,
		nombre: "Invitado",
	});
	expect(unirse.ok).toBe(true);
	expect(await listaJugadores).toEqual(["Anfitrión", "Invitado"]);
	return { anfitrion, invitado, codigo: respuesta.codigo };
}

beforeEach(async () => {
	clientes = [];
	servidor = crearServidorSalas({ preguntas, allowedOrigins: ["http://localhost"] });
	await new Promise((resolve) => servidor.httpServer.listen(0, resolve));
	const { port } = servidor.httpServer.address();
	url = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
	for (const cliente of clientes) cliente.disconnect();
	await servidor.cerrar();
	vi.restoreAllMocks();
});

describe("servidor de salas", () => {
	it("responde en /health y sincroniza los jugadores de una sala", async () => {
		const { anfitrion, respuesta } = await crearSalaAnfitrion();
		expect(respuesta.ok).toBe(true);
		const invitado = await conectar();
		const listaJugadores = esperarEvento(anfitrion, "jugadores-actualizados");

		await emitir(invitado, "unirse-sala", {
			codigo: respuesta.codigo,
			nombre: "Invitado",
		});

		expect(await listaJugadores).toEqual(["Anfitrión", "Invitado"]);
		await expect(pedirJson(`${url}/health`)).resolves.toEqual({ ok: true });
	});

	it("abandona la sala anterior al crear otra y reasigna al anfitrión", async () => {
		const { anfitrion, invitado, codigo } = await crearSalaConDosJugadores();
		const nuevoHost = esperarEvento(invitado, "eres-host");
		const nuevaSala = await emitir(anfitrion, "crear-sala", {
			nombre: "Nueva sesión",
			numPreguntas: 1,
			categorias: [],
			timerConfig: { activo: false },
		});
		await nuevoHost;
		expect(nuevaSala.ok).toBe(true);
		expect(servidor.salas.get(codigo).host).toBe(invitado.id);
		expect(servidor.salas.get(codigo).jugadores.has(anfitrion.id)).toBe(false);
		const rooms = servidor.io.sockets.sockets.get(anfitrion.id).rooms;
		expect(rooms.has(codigo)).toBe(false);
		expect(rooms.has(nuevaSala.codigo)).toBe(true);
	});

	it("sale explícitamente y elimina una sala cuando queda vacía", async () => {
		const { anfitrion, respuesta } = await crearSalaAnfitrion();
		await expect(emitir(anfitrion, "salir-sala", null))
			.resolves.toEqual({ ok: true });
		expect(servidor.salas.has(respuesta.codigo)).toBe(false);
		expect(servidor.io.sockets.sockets.get(anfitrion.id).data.sala).toBeUndefined();
		await expect(emitir(anfitrion, "iniciar-test", null))
			.resolves.toMatchObject({ ok: false });
	});

	it("abandona la sala anterior al unirse a otra, pero no ante un código inválido", async () => {
		const { anfitrion, respuesta } = await crearSalaAnfitrion();
		const destino = await crearSalaAnfitrion();
		await emitir(anfitrion, "unirse-sala", { codigo: "incorrecto", nombre: "Prueba" });
		expect(servidor.salas.get(respuesta.codigo).jugadores.has(anfitrion.id)).toBe(true);
		const entrada = await emitir(anfitrion, "unirse-sala", {
			codigo: destino.respuesta.codigo,
			nombre: "Invitado",
		});
		expect(entrada.ok).toBe(true);
		expect(servidor.salas.has(respuesta.codigo)).toBe(false);
		expect(servidor.salas.get(destino.respuesta.codigo).jugadores.size).toBe(2);
		expect(servidor.io.sockets.sockets.get(anfitrion.id).rooms.has(respuesta.codigo))
			.toBe(false);
	});

	it("valida nombre, cantidad, categoría, temporizador y formato del código", async () => {
		const cliente = await conectar();
		const base = {
			nombre: "Participante",
			numPreguntas: 1,
			categorias: [],
			timerConfig: { activo: false },
		};

		await expect(
			emitir(cliente, "crear-sala", { ...base, nombre: " " }),
		).resolves.toMatchObject({ ok: false });
		await expect(
			emitir(cliente, "crear-sala", { ...base, nombre: "a".repeat(31) }),
		).resolves.toMatchObject({ ok: false });
		await expect(
			emitir(cliente, "crear-sala", { ...base, numPreguntas: 3 }),
		).resolves.toMatchObject({ ok: false });
		await expect(
			emitir(cliente, "crear-sala", { ...base, categorias: ["Desconocida"] }),
		).resolves.toMatchObject({ ok: false });
		await expect(
			emitir(cliente, "crear-sala", {
				...base,
				timerConfig: { activo: true, tipo: "pregunta", segundos: 10 },
			}),
		).resolves.toMatchObject({ ok: false });

		const { respuesta } = await crearSalaAnfitrion();
		await expect(
			emitir(cliente, "unirse-sala", {
				codigo: "PRL-malo",
				nombre: "Invitado",
			}),
		).resolves.toMatchObject({ ok: false });
		expect(respuesta.ok).toBe(true);
	});

	it("no repite códigos y reintenta tras una colisión", () => {
		const primero = generarCodigo(new Map(), () => 0.25);
		const salasExistentes = new Map([[primero, {}]]);
		const aleatorio = vi
			.fn()
			.mockReturnValueOnce(0.25)
			.mockReturnValueOnce(0.75);

		expect(generarCodigo(salasExistentes, aleatorio)).not.toBe(primero);
		expect(aleatorio).toHaveBeenCalledTimes(2);
	});

	it("envía preguntas sin respuesta y calcula el ranking en el servidor", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0.37);
		const { anfitrion, invitado } = await crearSalaConDosJugadores();
		const inicioAnfitrion = esperarEvento(anfitrion, "test-iniciado");
		const inicioInvitado = esperarEvento(invitado, "test-iniciado");
		await emitir(anfitrion, "iniciar-test", null);
		const [testAnfitrion, testInvitado] = await Promise.all([
			inicioAnfitrion,
			inicioInvitado,
		]);
		const respuestasPorId = new Map(
			preguntas.map((pregunta) => [
				pregunta.id,
				prepararTest([pregunta], 1)[0].respuesta,
			]),
		);
		const respuestasEsperadas = testAnfitrion.preguntas.map((pregunta) =>
			respuestasPorId.get(pregunta.id),
		);

		expect(testAnfitrion.preguntas).toEqual(testInvitado.preguntas);
		expect(
			testAnfitrion.preguntas.every(
				(pregunta) => !Object.hasOwn(pregunta, "respuesta"),
			),
		).toBe(true);
		anfitrion.emit("enviar-resultado", {
			aciertos: 2,
			total: 2,
			porcentaje: 100,
		});

		const respuestaCorrecta = await emitir(anfitrion, "responder", {
			indice: 0,
			opcion: respuestasEsperadas[0],
		});
		expect(respuestaCorrecta).toMatchObject({ ok: true, acierto: true });
		const respuestaIncorrecta = await emitir(anfitrion, "responder", {
			indice: 1,
			opcion:
				(respuestasEsperadas[1] + 1) %
				testAnfitrion.preguntas[1].opciones.length,
		});
		expect(respuestaIncorrecta).toMatchObject({ ok: true, acierto: false });

		const rankingFinal = esperarEvento(anfitrion, "ranking-actualizado");
		await emitir(invitado, "responder", { indice: 0, opcion: null });
		await emitir(invitado, "responder", { indice: 1, opcion: null });
		const ranking = await rankingFinal;

		expect(ranking.ranking).toContainEqual(
			expect.objectContaining({
				id: anfitrion.id,
				nombre: "Anfitrión",
				aciertos: 1,
				total: 2,
				porcentaje: 50,
			}),
		);
		expect(
			ranking.ranking.some((resultado) => resultado.porcentaje === 100),
		).toBe(false);
	});

	it("rechaza respuestas adelantadas y repetidas sin revelar la correcta", async () => {
		const { anfitrion } = await crearSalaAnfitrion();
		const inicio = esperarEvento(anfitrion, "test-iniciado");
		await emitir(anfitrion, "iniciar-test", null);
		await inicio;

		const adelantada = await emitir(anfitrion, "responder", {
			indice: 1,
			opcion: 0,
		});

		expect(adelantada.ok).toBe(false);
		expect(adelantada).not.toHaveProperty("correcta");

		await emitir(anfitrion, "responder", { indice: 0, opcion: 0 });
		const repetida = await emitir(anfitrion, "responder", {
			indice: 0,
			opcion: 0,
		});
		expect(repetida.ok).toBe(false);
		expect(repetida).not.toHaveProperty("correcta");

		const opcionInvalida = await emitir(anfitrion, "responder", {
			indice: 1,
			opcion: "0",
		});
		expect(opcionInvalida.ok).toBe(false);
		expect(opcionInvalida).not.toHaveProperty("correcta");
	});

	it("identifica por socket a los jugadores con nombres iguales", async () => {
		const { anfitrion, respuesta } = await crearSalaAnfitrion();
		const invitado = await conectar();
		await emitir(invitado, "unirse-sala", {
			codigo: respuesta.codigo,
			nombre: "Anfitrión",
		});
		const inicio = esperarEvento(anfitrion, "test-iniciado");
		await emitir(anfitrion, "iniciar-test", null);
		await inicio;
		await emitir(anfitrion, "responder", { indice: 0, opcion: null });
		const rankingParcial = esperarEvento(invitado, "ranking-actualizado");
		await emitir(anfitrion, "responder", { indice: 1, opcion: null });
		const parcial = await rankingParcial;
		expect(parcial.ranking).toHaveLength(1);
		expect(parcial.ranking[0].id).toBe(anfitrion.id);
		expect(parcial.completo).toBe(false);
		await emitir(invitado, "responder", { indice: 0, opcion: null });
		const rankingFinal = esperarEvento(anfitrion, "ranking-actualizado");
		await emitir(invitado, "responder", { indice: 1, opcion: null });
		const final = await rankingFinal;
		expect(final.completo).toBe(true);
		expect(new Set(final.ranking.map((jugador) => jugador.id)))
			.toEqual(new Set([anfitrion.id, invitado.id]));
	});

	it("no suma una respuesta correcta recibida fuera de tiempo", async () => {
		let ahora = 1_000_000;
		await servidor.cerrar();
		servidor = crearServidorSalas({
			preguntas,
			allowedOrigins: ["http://localhost"],
			reloj: {
				ahora: () => ahora,
				setTimeout,
				clearTimeout,
				setInterval,
				clearInterval,
			},
		});
		await new Promise((resolve) => servidor.httpServer.listen(0, resolve));
		const { port } = servidor.httpServer.address();
		url = `http://127.0.0.1:${port}`;
		clientes = [];
		const anfitrion = await conectar();
		const sala = await emitir(anfitrion, "crear-sala", {
			nombre: "Anfitrión",
			numPreguntas: 1,
			categorias: [],
			timerConfig: { activo: true, tipo: "pregunta", segundos: 15 },
		});
		const inicio = esperarEvento(anfitrion, "test-iniciado");
		await emitir(anfitrion, "iniciar-test", null);
		await inicio;
		ahora += 18_001;

		const respuesta = await emitir(anfitrion, "responder", {
			indice: 0,
			opcion: 0,
		});
		expect(sala.ok).toBe(true);
		expect(respuesta).toMatchObject({
			ok: true,
			acierto: false,
			fueraDeTiempo: true,
		});
	});

	it("termina a los jugadores pendientes cuando vence el temporizador del test", async () => {
		let ahora = 2_000_000;
		const pendientes = new Map();
		let idTimeout = 0;
		const reloj = {
			ahora: () => ahora,
			setTimeout: (callback, demora) => {
				const id = ++idTimeout;
				pendientes.set(id, { callback, demora });
				return id;
			},
			clearTimeout: (id) => pendientes.delete(id),
			setInterval: () => ({ unref() {} }),
			clearInterval: () => {},
		};
		await servidor.cerrar();
		servidor = crearServidorSalas({
			preguntas,
			allowedOrigins: ["http://localhost"],
			reloj,
		});
		await new Promise((resolve) => servidor.httpServer.listen(0, resolve));
		const { port } = servidor.httpServer.address();
		url = `http://127.0.0.1:${port}`;
		clientes = [];
		const anfitrion = await conectar();
		const salaCreada = await emitir(anfitrion, "crear-sala", {
			nombre: "Anfitrión",
			numPreguntas: 2,
			categorias: [],
			timerConfig: { activo: true, tipo: "test", segundos: 300 },
		});
		const inicio = esperarEvento(anfitrion, "test-iniciado");
		await emitir(anfitrion, "iniciar-test", null);
		await inicio;
		const primeraPregunta = servidor.salas.get(salaCreada.codigo).preguntas[0];
		await emitir(anfitrion, "responder", { indice: 0, opcion: primeraPregunta.respuesta });
		const rankingFinal = esperarEvento(anfitrion, "ranking-actualizado");
		const temporizador = [...pendientes.values()].find(
			({ demora }) => demora === 302_000,
		);
		expect(temporizador).toBeDefined();
		ahora += 302_000;
		temporizador.callback();

		expect(await rankingFinal).toMatchObject({
			completo: true,
			ranking: [{ nombre: "Anfitrión", aciertos: 1, total: 2, porcentaje: 50 }],
		});
		expect(pendientes.size).toBe(0);
	});
});
