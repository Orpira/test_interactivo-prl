// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import Sala from "./components/Sala.jsx";
import { salirSala, verSala } from "./api/salas.js";
import { CLAVE_SESION } from "./api/sesion.js";

vi.mock("./hooks/useDisponibilidadRed.js", () => ({
	default: () => ({ disponible: false, comprobada: true }),
}));
vi.mock("./api/salas.js", async (importarOriginal) => ({
	...(await importarOriginal()),
	verSala: vi.fn(),
	salirSala: vi.fn().mockResolvedValue({ ok: true }),
}));

const preguntas = Array.from({ length: 10 }, (_, indice) => ({
	id: indice + 1,
	categoria: "Base",
	pregunta: `Pregunta de prueba ${indice + 1}`,
	opciones: ["Correcta", "Incorrecta", "Otra"],
	respuesta: 0,
}));

let contenedor;
let root;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
		ok: true,
		json: async () => preguntas,
	}));
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

async function pulsar(texto) {
	const boton = [...contenedor.querySelectorAll("button")]
		.find((elemento) => elemento.textContent.trim() === texto);
	expect(boton, `Botón disponible: ${texto}`).toBeDefined();
	await act(async () => boton.click());
}

async function escribir(selector, valor) {
	const input = contenedor.querySelector(selector);
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
			.set.call(input, valor);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
}

async function configurarMultijugador(temporizador = "Sin temporizador") {
	await act(async () => root.render(<App />));
	await pulsar("Multijugador");
	await escribir("input[type=number]", "3");
	await pulsar("Continuar");
	await escribir("input[type=text]", "Jugador 1");
	await pulsar("Continuar");
	await pulsar("Continuar con todas las categorías");
	await pulsar("5 preguntas");
	await pulsar(temporizador);
}

async function responder(cantidad = 5) {
	for (let indice = 0; indice < cantidad; indice++) {
		await act(async () => {
			contenedor.querySelector("#quiz .grid button").click();
		});
		await pulsar(indice === 4 ? "Ver resultado" : "Siguiente →");
	}
}

describe("modo en red al recargar", () => {
	const vistaEspera = {
		codigo: "PRL-AB12",
		estado: "ESPERANDO",
		soyAnfitrion: false,
		nombre: "Luis",
		totalPreguntas: 5,
		timerConfig: { activo: false, tipo: null, segundos: null },
		jugadores: [{ nombre: "Ana", anfitrion: true, conectado: true, terminado: false }],
		progreso: { siguiente: 0, aciertos: 0, terminado: false, respuestas: [] },
		limite: { tipo: null, hasta: null },
		ahoraServidor: Date.now(),
		ranking: [],
	};

	beforeEach(() => {
		window.sessionStorage.clear();
		verSala.mockReset();
		salirSala.mockClear();
	});

	it("sin sala guardada arranca en el modo local", async () => {
		await act(async () => root.render(<App />));
		expect(contenedor.textContent).toContain("Elige cómo jugar");
		expect(verSala).not.toHaveBeenCalled();
	});

	it("con una sala guardada abre el modo en red y vuelve a ella sin pulsar nada", async () => {
		window.sessionStorage.setItem(
			CLAVE_SESION,
			JSON.stringify({ codigo: "PRL-AB12", sessionId: "secreto", nombre: "Luis" }),
		);
		verSala.mockResolvedValue(vistaEspera);
		await act(async () => root.render(<App />));
		expect(verSala).toHaveBeenCalledWith("PRL-AB12", "secreto", expect.anything());
		expect(contenedor.textContent).toContain("Sala: PRL-AB12");
		expect(contenedor.textContent).not.toContain("Elige cómo jugar");
	});

	it("si la sala guardada ya no existe, vuelve al modo local y limpia la sesión", async () => {
		window.sessionStorage.setItem(
			CLAVE_SESION,
			JSON.stringify({ codigo: "PRL-AB12", sessionId: "secreto", nombre: "Luis" }),
		);
		verSala.mockRejectedValue(Object.assign(new Error("Sala no encontrada"), { status: 404, code: "SALA_NO_ENCONTRADA" }));
		await act(async () => root.render(<App />));
		expect(window.sessionStorage.getItem(CLAVE_SESION)).toBeNull();
		expect(contenedor.textContent).toContain("Elige cómo jugar");
	});

	it("salir de la sala desde la espera vuelve al selector del modo en red", async () => {
		window.sessionStorage.setItem(
			CLAVE_SESION,
			JSON.stringify({ codigo: "PRL-AB12", sessionId: "secreto", nombre: "Luis" }),
		);
		verSala.mockResolvedValue(vistaEspera);
		await act(async () => root.render(<App />));
		await pulsar("Salir de la sala");
		expect(salirSala).toHaveBeenCalledWith("PRL-AB12", "secreto");
		expect(window.sessionStorage.getItem(CLAVE_SESION)).toBeNull();
		expect(contenedor.textContent).toContain("Modo En Red");
	});
});

describe("bienvenida", () => {
	it("incluye las cinco características dentro de la pantalla de bienvenida", async () => {
		await act(async () => root.render(<App />));
		const bienvenida = contenedor.querySelector("section");
		expect(bienvenida.querySelector("h1").textContent).toContain("Aprende prevención");
		expect(bienvenida.querySelector("h2").textContent).toBe("¿Qué encontrarás?");
		expect([...bienvenida.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
			"Tests interactivos",
			"Contenido práctico",
			"Sistema de puntuación",
			"Categorías temáticas",
			"Juego compartido",
		]);
		const comenzar = [...bienvenida.querySelectorAll("a")].find((a) => a.textContent === "Comenzar test");
		expect(bienvenida.querySelector("h2").compareDocumentPosition(comenzar)
			& Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});

describe("flujo local", () => {
	it("comparte el test entre tres jugadores y reinicia desde Nueva sesión", async () => {
		await configurarMultijugador();
		const tests = [];
		for (let jugador = 1; jugador <= 3; jugador++) {
			const test = [];
			for (let indice = 0; indice < 5; indice++) {
				test.push(contenedor.querySelector("#quiz .max-w-2xl").textContent);
				await act(async () => {
					contenedor.querySelector("#quiz .grid button").click();
				});
				await pulsar(indice === 4 ? "Ver resultado" : "Siguiente →");
			}
			tests.push(test);
			if (jugador < 3) {
				await pulsar("Siguiente jugador →");
				await escribir("input[type=text]", `Jugador ${jugador + 1}`);
				expect(contenedor.textContent).toContain("Mismo test que el jugador 1: 5 preguntas");
				await pulsar("Continuar");
			}
		}
		expect(tests[1]).toEqual(tests[0]);
		expect(tests[2]).toEqual(tests[0]);
		await pulsar("Ver Ranking");
		expect(contenedor.querySelectorAll("tbody tr")).toHaveLength(3);
		await pulsar("Nueva sesión");
		expect(contenedor.textContent).toContain("Elige cómo jugar");
		expect(contenedor.querySelector("table")).toBeNull();
	});

	it("reinicia pregunta, aciertos y tiempo tras agotar la última pregunta", async () => {
		vi.useFakeTimers();
		await configurarMultijugador("15s");
		await responder(4);
		for (let segundo = 0; segundo < 17; segundo++) {
			await act(async () => vi.advanceTimersByTime(1000));
		}
		await pulsar("Siguiente jugador →");
		await escribir("input[type=text]", "Jugador 2");
		await pulsar("Continuar");
		expect(contenedor.textContent).toContain("Pregunta 1 / 5");
		expect(contenedor.textContent).toContain("0 aciertos");
		expect(contenedor.textContent).toContain("0:15");
		await act(async () => vi.advanceTimersByTime(2000));
		expect(contenedor.textContent).toContain("Pregunta 1 / 5");
		expect(contenedor.textContent).toContain("0:14");
	});

	it("usa un único color de borde al corregir cada opción", async () => {
		await configurarMultijugador();
		const incorrecta = [...contenedor.querySelectorAll("#quiz .grid button")]
			.find((boton) => boton.textContent.trim().endsWith("Incorrecta"));
		expect(incorrecta).toBeDefined();
		await act(async () => incorrecta.click());
		for (const estado of ["ok", "ko"]) {
			const boton = contenedor.querySelector(`#quiz .border-${estado}`);
			expect(boton).not.toBeNull();
			expect(boton.classList.contains(`bg-${estado}-bg`)).toBe(true);
			expect(boton.classList.contains(`text-${estado}-ink`)).toBe(true);
			const bordes = ["border-line", "border-primary", "border-ok", "border-ko"]
				.filter((clase) => boton.classList.contains(clase));
			expect(bordes).toHaveLength(1);
		}
	});

	it("el modo individual entra directamente en nombre y completa diez preguntas", async () => {
		await act(async () => root.render(<App />));
		await pulsar("Individual");
		expect(contenedor.querySelector("input[type=number]")).toBeNull();
		await escribir("input[type=text]", "Individual");
		await pulsar("Continuar");
		await pulsar("Continuar con todas las categorías");
		await pulsar("Todas (10)");
		await pulsar("Sin temporizador");
		for (let indice = 0; indice < 10; indice++) {
			await act(async () => {
				contenedor.querySelector("#quiz .grid button").click();
			});
			await pulsar(indice === 9 ? "Ver resultado" : "Siguiente →");
		}
		expect(contenedor.textContent).toContain("Test finalizado, Individual");
		expect(contenedor.textContent).toContain("de 10 preguntas");
	});

	it("muestra los errores HTTP del banco", async () => {
		fetch.mockResolvedValue({ ok: false, status: 503 });
		await act(async () => root.render(<App />));
		expect(contenedor.querySelector('[role="alert"]').textContent).toContain("HTTP 503");
	});
});

it("Sala avisa del fallo de carga e impide crear sin preguntas", async () => {
	fetch.mockRejectedValue(new Error("Sin conexión"));
	await act(async () => root.render(
		<Sala onEntrar={vi.fn()} onVolverInicio={vi.fn()} />,
	));
	expect(contenedor.querySelector('[role="alert"]').textContent).toContain("Sin conexión");
	expect([...contenedor.querySelectorAll("button")]
		.find((boton) => boton.textContent.trim() === "Crear sala").disabled).toBe(true);
});
