// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearSala, iniciarSala, salirSala, unirseSala, verSala } from "../api/salas.js";
import { CLAVE_SESION, leerSesion } from "../api/sesion.js";
import ModoRed from "./ModoRed.jsx";

vi.mock("../api/salas.js", () => ({
	crearSala: vi.fn(),
	unirseSala: vi.fn(),
	verSala: vi.fn(),
	iniciarSala: vi.fn(),
	responder: vi.fn(),
	salirSala: vi.fn(),
}));

const SESION = { codigo: "PRL-AB12", sessionId: "secreto-123", nombre: "Ana" };
const banco = Array.from({ length: 12 }, (_, i) => ({
	id: i + 1,
	categoria: i < 6 ? "Base" : "Otra",
	pregunta: `Banco ${i + 1}`,
	opciones: ["A", "B"],
	respuesta: 0,
}));
const preguntas = Array.from({ length: 5 }, (_, i) => ({
	id: i + 1,
	categoria: "Base",
	pregunta: `Pregunta ${i + 1}`,
	opciones: ["Opción A", "Opción B", "Opción C"],
}));

function vista(extra = {}) {
	return {
		codigo: "PRL-AB12",
		estado: "ESPERANDO",
		soyAnfitrion: true,
		nombre: "Ana",
		totalPreguntas: 5,
		timerConfig: { activo: false, tipo: null, segundos: null },
		jugadores: [{ nombre: "Ana", anfitrion: true, conectado: true, terminado: false }],
		progreso: { siguiente: 0, aciertos: 0, terminado: false, respuestas: [] },
		limite: { tipo: null, hasta: null },
		ahoraServidor: Date.now(),
		ranking: [],
		...extra,
	};
}

const enCurso = (extra = {}) => vista({ estado: "EN_CURSO", preguntas, ...extra });
const errorApi = (status, code, mensaje) => Object.assign(new Error(mensaje), { status, code, reintentable: status === 0 || status >= 500 });

let contenedor;
let root;
let alVolver;

const pintar = (props = {}) =>
	act(async () => root.render(<ModoRed onVolverInicio={alVolver} {...props} />));
const avanzar = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
const botones = () => [...contenedor.querySelectorAll("#quiz button")];
const boton = (texto) => botones().find((b) => b.textContent.trim().includes(texto));
const pulsar = (elemento) => act(async () => elemento.click());
const texto = () => contenedor.textContent.replace(/\s+/g, " ");

async function escribir(selector, valor) {
	const campo = contenedor.querySelector(selector);
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(campo, valor);
		campo.dispatchEvent(new Event("input", { bubbles: true }));
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(1_000_000);
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => banco }));
	window.sessionStorage.clear();
	for (const funcion of [crearSala, unirseSala, verSala, iniciarSala, salirSala]) funcion.mockReset();
	verSala.mockResolvedValue(vista());
	salirSala.mockResolvedValue({ ok: true });
	alVolver = vi.fn();
	contenedor = document.createElement("div");
	document.body.append(contenedor);
	root = createRoot(contenedor);
});

afterEach(async () => {
	await act(async () => root.unmount());
	contenedor.remove();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("entrar en una sala", () => {
	it("sin sesión guardada muestra crear o unirse y no consulta nada", async () => {
		await pintar();
		expect(texto()).toContain("Modo En Red");
		expect(boton("Crear sala")).toBeDefined();
		expect(boton("Unirse a sala")).toBeDefined();
		await avanzar(5000);
		expect(verSala).not.toHaveBeenCalled();
		await pulsar(boton("← Volver"));
		expect(alVolver).toHaveBeenCalledTimes(1);
	});

	it("unirse envía el código en mayúsculas, guarda la sesión y pasa a la sala de espera", async () => {
		unirseSala.mockResolvedValue({ codigo: "PRL-AB12", sessionId: "secreto-123" });
		verSala.mockResolvedValue(vista({ soyAnfitrion: false, nombre: "Luis", jugadores: [
			{ nombre: "Ana", anfitrion: true, conectado: true, terminado: false },
			{ nombre: "Luis", anfitrion: false, conectado: true, terminado: false },
		] }));
		await pintar();
		await pulsar(boton("Unirse a sala"));
		await escribir('input[aria-label="Tu nombre"]', "  Luis ");
		await escribir('input[aria-label="Código de sala"]', "prl-ab12");
		await act(async () => contenedor.querySelector("form").requestSubmit());
		expect(unirseSala).toHaveBeenCalledWith("PRL-AB12", "Luis");
		expect(window.sessionStorage.getItem(CLAVE_SESION)).toBe(
			JSON.stringify({ codigo: "PRL-AB12", sessionId: "secreto-123", nombre: "Luis" }),
		);
		expect(verSala).toHaveBeenCalledWith("PRL-AB12", "secreto-123", expect.anything());
		expect(texto()).toContain("Sala: PRL-AB12");
		expect(texto()).toContain("Esperando a que el anfitrión inicie el test…");
		expect(boton("Iniciar test")).toBeUndefined();
	});

	it("un error de la API se muestra y no guarda ninguna sesión", async () => {
		unirseSala.mockRejectedValue(errorApi(409, "NOMBRE_REPETIDO", "Ya hay alguien con ese nombre en la sala"));
		await pintar();
		await pulsar(boton("Unirse a sala"));
		await escribir('input[aria-label="Tu nombre"]', "Ana");
		await escribir('input[aria-label="Código de sala"]', "PRL-AB12");
		await act(async () => contenedor.querySelector("form").requestSubmit());
		expect(contenedor.querySelector('[role="alert"]').textContent).toBe("Ya hay alguien con ese nombre en la sala");
		expect(leerSesion()).toBeNull();
		expect(verSala).not.toHaveBeenCalled();
		expect(boton("Unirse").disabled).toBe(false);
	});

	it("crear sala envía la configuración, guarda la sesión y muestra el código", async () => {
		crearSala.mockResolvedValue({ codigo: "PRL-AB12", sessionId: "secreto-123" });
		await pintar();
		await pulsar(boton("Crear sala"));
		await escribir('input[aria-label="Tu nombre"]', "Ana");
		await act(async () => contenedor.querySelector("form").requestSubmit());
		expect(crearSala).toHaveBeenCalledWith({
			nombre: "Ana",
			numPreguntas: 10,
			banco: "es",
			categorias: [],
			timerConfig: { activo: false, tipo: null, segundos: null },
		});
		expect(leerSesion()).toEqual(SESION);
		expect(texto()).toContain("Sala: PRL-AB12");
		expect(contenedor.querySelector("p.font-mono.font-bold").textContent).toBe("PRL-AB12");
	});

	it("el temporizador y las categorías elegidas viajan en la petición", async () => {
		crearSala.mockResolvedValue({ codigo: "PRL-AB12", sessionId: "secreto-123" });
		await pintar();
		await pulsar(boton("Crear sala"));
		await escribir('input[aria-label="Tu nombre"]', "Ana");
		await act(async () => {
			const tipo = contenedor.querySelector("#timerTipo");
			Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(tipo, "pregunta");
			tipo.dispatchEvent(new Event("change", { bubbles: true }));
		});
		await pulsar(boton("Todas"));
		await act(async () => contenedor.querySelector("form").requestSubmit());
		const peticion = crearSala.mock.calls[0][0];
		expect(peticion.timerConfig).toEqual({ activo: true, tipo: "pregunta", segundos: 30 });
		expect(peticion.categorias.sort()).toEqual(["Base", "Otra"]);
	});
});

describe("sala de espera", () => {
	beforeEach(() => window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(SESION)));

	it("muestra el punto de conexión de cada jugador y marca al anfitrión y a ti", async () => {
		verSala.mockResolvedValue(vista({ jugadores: [
			{ nombre: "Ana", anfitrion: true, conectado: true, terminado: false },
			{ nombre: "Luis", anfitrion: false, conectado: false, terminado: false },
		] }));
		await pintar();
		const filas = [...contenedor.querySelectorAll("li")];
		expect(filas).toHaveLength(2);
		expect(filas[0].textContent).toContain("Ana (tú)");
		expect(filas[0].querySelector(".bg-ok")).not.toBeNull();
		expect(filas[0].querySelector(".sr-only").textContent).toBe("conectado");
		expect(filas[1].querySelector(".bg-ok")).toBeNull();
		expect(filas[1].querySelector(".border-ink-muted")).not.toBeNull();
		expect(filas[1].querySelector(".sr-only").textContent).toBe("sin conexión");
		expect(texto()).toContain("Jugadores en la sala (2)");
	});

	it("el anfitrión inicia con un solo jugador y pasa al test sin esperar a la siguiente consulta", async () => {
		iniciarSala.mockResolvedValue(enCurso({ ahoraServidor: Date.now() + 10 }));
		await pintar();
		expect(boton("Iniciar test (1 jugador)").disabled).toBe(false);
		await pulsar(boton("Iniciar test"));
		expect(iniciarSala).toHaveBeenCalledWith("PRL-AB12", "secreto-123");
		expect(texto()).toContain("Pregunta 1 / 5");
		expect(texto()).toContain("Pregunta 1");
	});

	it("si iniciar falla muestra el error y deja volver a intentarlo", async () => {
		iniciarSala.mockRejectedValue(errorApi(403, "NO_ES_ANFITRION", "No eres el anfitrión"));
		await pintar();
		await pulsar(boton("Iniciar test"));
		expect(contenedor.querySelector('[role="alert"]').textContent).toBe("No eres el anfitrión");
		expect(boton("Iniciar test").disabled).toBe(false);
	});

	it("quien no es anfitrión pasa solo al test cuando el servidor lo inicia", async () => {
		verSala.mockResolvedValue(vista({ soyAnfitrion: false }));
		await pintar();
		expect(texto()).toContain("Esperando a que el anfitrión inicie el test…");
		verSala.mockResolvedValue(enCurso({ soyAnfitrion: false, ahoraServidor: Date.now() + 1000 }));
		await avanzar(1000);
		expect(texto()).toContain("Pregunta 1 / 5");
		expect(texto()).not.toContain("Esperando a que el anfitrión");
	});

	it("avisa «Reconectando…» si se pierde la conexión y conserva la sala en pantalla", async () => {
		await pintar();
		verSala.mockRejectedValue(errorApi(0, "SIN_CONEXION", "No hay conexión con el servidor"));
		await avanzar(1000);
		expect(contenedor.querySelector('[role="status"]').textContent).toContain("Reconectando");
		expect(texto()).toContain("Sala: PRL-AB12");
	});

	it("salir de la sala avisa al servidor, borra la sesión y vuelve a elegir", async () => {
		await pintar();
		await pulsar(boton("Salir de la sala"));
		expect(salirSala).toHaveBeenCalledWith("PRL-AB12", "secreto-123");
		expect(leerSesion()).toBeNull();
		expect(texto()).toContain("Modo En Red");
		expect(boton("Crear sala")).toBeDefined();
		const consultas = verSala.mock.calls.length;
		await avanzar(5000);
		expect(verSala).toHaveBeenCalledTimes(consultas);
	});

	it("salir funciona aunque el servidor no responda", async () => {
		salirSala.mockRejectedValue(errorApi(0, "SIN_CONEXION", "x"));
		await pintar();
		await pulsar(boton("Salir de la sala"));
		expect(leerSesion()).toBeNull();
		expect(texto()).toContain("Modo En Red");
	});
});

describe("recuperar la sala al recargar", () => {
	beforeEach(() => window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(SESION)));

	it("vuelve directamente a la misma pregunta con sus aciertos", async () => {
		let resolver;
		verSala.mockReturnValue(new Promise((resolve) => (resolver = resolve)));
		await pintar({ recuperando: true });
		expect(texto()).toContain("Recuperando tu sala…");
		expect(verSala).toHaveBeenCalledWith("PRL-AB12", "secreto-123", expect.anything());
		await act(async () =>
			resolver(enCurso({ progreso: { siguiente: 2, aciertos: 2, terminado: false, respuestas: [] } })),
		);
		expect(texto()).toContain("Pregunta 3 / 5");
		expect(texto()).toContain("2 aciertos");
		expect(texto()).toContain("Pregunta 3");
		expect(texto()).not.toContain("Pregunta 1 /");
	});

	it("si el test ya terminó vuelve al ranking", async () => {
		verSala.mockResolvedValue(enCurso({ estado: "TERMINADA", progreso: { siguiente: 5, aciertos: 4, terminado: true, respuestas: [] }, preguntas: undefined,
			ranking: [{ nombre: "Ana", aciertos: 4, total: 5, porcentaje: 80, terminado: true }] }));
		await pintar({ recuperando: true });
		expect(texto()).toContain("Ranking final");
	});

	it("con la sala caducada (404) borra la sesión y, al recuperar, vuelve al inicio", async () => {
		verSala.mockRejectedValue(errorApi(404, "SALA_NO_ENCONTRADA", "Sala no encontrada"));
		await pintar({ recuperando: true });
		expect(leerSesion()).toBeNull();
		expect(alVolver).toHaveBeenCalledTimes(1);
		await avanzar(10_000);
		expect(verSala).toHaveBeenCalledTimes(1);
	});

	it("con la sesión inválida (401) al abrir el modo a mano muestra un aviso y deja elegir", async () => {
		verSala.mockRejectedValue(errorApi(401, "SIN_SESION", "Sesión no válida"));
		await pintar({ recuperando: false });
		expect(leerSesion()).toBeNull();
		expect(alVolver).not.toHaveBeenCalled();
		expect(contenedor.querySelector('[role="status"]').textContent).toContain("La sala ya no existe o tu sesión caducó");
		expect(boton("Crear sala")).toBeDefined();
	});

	it("sin conexión muestra que reintenta y deja salir sin perder el aviso al servidor", async () => {
		verSala.mockRejectedValue(errorApi(0, "SIN_CONEXION", "No hay conexión con el servidor"));
		await pintar({ recuperando: true });
		expect(texto()).toContain("No hay conexión con el servidor. Reintentando…");
		await pulsar(boton("Salir de la sala"));
		expect(salirSala).toHaveBeenCalledWith("PRL-AB12", "secreto-123");
		expect(leerSesion()).toBeNull();
		expect(alVolver).toHaveBeenCalledTimes(1);
	});

	it("se recupera cuando vuelve la conexión", async () => {
		verSala.mockRejectedValueOnce(errorApi(0, "SIN_CONEXION", "x")).mockResolvedValue(enCurso());
		await pintar({ recuperando: true });
		expect(texto()).toContain("Reintentando");
		await avanzar(1000);
		expect(texto()).toContain("Pregunta 1 / 5");
	});
});
