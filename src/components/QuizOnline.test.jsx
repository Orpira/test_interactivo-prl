// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { responder } from "../api/salas.js";
import QuizOnline, {
	AVANCE_AUTOMATICO_MS,
	ESPERAS_REINTENTO_MS,
	generarComandoId,
} from "./QuizOnline.jsx";

vi.mock("../api/salas.js", () => ({ responder: vi.fn() }));

const SESION = { codigo: "PRL-AB12", sessionId: "secreto", nombre: "Ana" };
const preguntas = Array.from({ length: 5 }, (_, i) => ({
	id: i + 1,
	categoria: "Base",
	pregunta: `Pregunta ${i + 1}`,
	opciones: ["Opción A", "Opción B", "Opción C"],
}));

function vista(extra = {}) {
	return {
		codigo: "PRL-AB12",
		estado: "EN_CURSO",
		soyAnfitrion: false,
		nombre: "Ana",
		totalPreguntas: 5,
		timerConfig: { activo: false, tipo: null, segundos: null },
		jugadores: [],
		preguntas,
		progreso: { siguiente: 0, aciertos: 0, terminado: false, respuestas: [] },
		limite: { tipo: null, hasta: null },
		ahoraServidor: Date.now(),
		ranking: [
			{ nombre: "Ana", aciertos: 0, total: 5, porcentaje: 0, terminado: false },
			{ nombre: "Luis", aciertos: 0, total: 5, porcentaje: 0, terminado: false },
		],
		...extra,
	};
}

const progreso = (siguiente, aciertos = 0, extra = {}) => ({
	siguiente,
	aciertos,
	terminado: false,
	respuestas: [],
	...extra,
});

const errorRed = () =>
	Object.assign(new Error("No hay conexión con el servidor"), { code: "SIN_CONEXION", status: 0, reintentable: true });

let contenedor;
let root;
let aplicarVistaEspia;
let recargarEspia;
let salirEspia;
let ahoraServidor;
let reconectandoActual;
let cambiarVista;

function Envoltorio({ inicial }) {
	const [actual, setActual] = useState(inicial);
	// Permite a una prueba cambiar la vista de la misma instancia, como hace la consulta periódica.
	cambiarVista = setActual;
	return (
		<QuizOnline
			vista={actual}
			sesion={SESION}
			ahoraServidor={ahoraServidor}
			aplicarVista={(nueva) => {
				aplicarVistaEspia(nueva);
				setActual(nueva);
			}}
			recargar={recargarEspia}
			reconectando={reconectandoActual}
			onSalir={salirEspia}
		/>
	);
}

const pintar = (inicial = vista()) => act(async () => root.render(<Envoltorio inicial={inicial} />));
const avanzar = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
const botones = () => [...contenedor.querySelectorAll("#quiz button")];
const boton = (texto) => botones().find((b) => b.textContent.trim().includes(texto));
const opcion = (letra) => boton(`${letra}.`);
const texto = () => contenedor.textContent.replace(/\s+/g, " ");
const pulsar = (elemento) => act(async () => elemento.click());

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(1_000_000);
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	responder.mockReset();
	aplicarVistaEspia = vi.fn();
	recargarEspia = vi.fn();
	salirEspia = vi.fn();
	ahoraServidor = () => Date.now();
	reconectandoActual = false;
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

describe("la pregunta y la respuesta", () => {
	it("muestra la pregunta que toca según el progreso del servidor, sin la respuesta", async () => {
		await pintar(vista({ progreso: progreso(2, 2) }));
		expect(texto()).toContain("Pregunta 3 / 5");
		expect(texto()).toContain("2 aciertos");
		expect(texto()).toContain("Pregunta 3");
		expect(opcion("A")).toBeDefined();
		expect(contenedor.innerHTML).not.toContain("respuesta");
	});

	it("envía comandoId, índice y opción, pinta verde y rojo con lo que responde el servidor y actualiza la vista", async () => {
		const siguiente = vista({ progreso: progreso(1, 0) });
		responder.mockResolvedValue({ correcta: 1, acierto: false, fueraDeTiempo: false, vista: siguiente });
		await pintar();
		await pulsar(opcion("C"));
		expect(responder).toHaveBeenCalledTimes(1);
		const [codigo, sesion, comando] = responder.mock.calls[0];
		expect([codigo, sesion]).toEqual(["PRL-AB12", "secreto"]);
		expect(comando).toEqual({ comandoId: expect.any(String), indice: 0, opcion: 2 });
		expect(comando.comandoId.length).toBeGreaterThan(8);
		expect(opcion("B").className).toContain("bg-ok-bg border-ok text-ok-ink");
		expect(opcion("C").className).toContain("bg-ko-bg border-ko text-ko-ink");
		expect(opcion("A").className).toContain("text-ink-muted");
		expect(opcion("A").disabled).toBe(true);
		expect(aplicarVistaEspia).toHaveBeenCalledWith(siguiente);
		expect(texto()).toContain("Pregunta 1 / 5");
	});

	it("una opción acertada sale solo en verde", async () => {
		responder.mockResolvedValue({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) });
		await pintar();
		await pulsar(opcion("A"));
		expect(opcion("A").className).toContain("bg-ok-bg");
		expect(contenedor.querySelector(".bg-ko-bg")).toBeNull();
		expect(texto()).toContain("1 aciertos");
	});

	it("no envía dos veces si se pulsa otra opción mientras espera", async () => {
		let resolver;
		responder.mockImplementation(() => new Promise((resolve) => (resolver = resolve)));
		await pintar();
		await pulsar(opcion("A"));
		expect(opcion("A").className).toContain("border-primary");
		await pulsar(opcion("B"));
		expect(responder).toHaveBeenCalledTimes(1);
		await act(async () => resolver({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) }));
	});

	it("dos toques casi simultáneos, antes de repintar, envían una sola respuesta", async () => {
		responder.mockImplementation(() => new Promise(() => {}));
		await pintar();
		await act(async () => {
			opcion("A").click();
			opcion("B").click();
		});
		expect(responder).toHaveBeenCalledTimes(1);
		expect(responder.mock.calls[0][2].opcion).toBe(0);
	});

	it("«Siguiente →» pasa a la pregunta que indica el servidor y la última lleva a «Ver resultado»", async () => {
		responder.mockResolvedValueOnce({ correcta: 1, acierto: false, fueraDeTiempo: false, vista: vista({ progreso: progreso(1) }) });
		await pintar();
		await pulsar(opcion("A"));
		await pulsar(boton("Siguiente →"));
		expect(texto()).toContain("Pregunta 2 / 5");
		expect(texto()).toContain("Pregunta 2");
		expect(opcion("A").disabled).toBe(false);
	});

	it("tras responder la última pregunta muestra el resultado y después el ranking", async () => {
		const final = vista({
			progreso: progreso(5, 4, { terminado: true }),
			ranking: [{ nombre: "Ana", aciertos: 4, total: 5, porcentaje: 80, terminado: true }],
		});
		responder.mockResolvedValue({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: final });
		await pintar(vista({ progreso: progreso(4, 3) }));
		await pulsar(opcion("A"));
		expect(texto()).toContain("Pregunta 5 / 5");
		await pulsar(boton("Ver resultado"));
		expect(texto()).toContain("Esperando a los demás…");
	});

	it("si la sala termina con esta respuesta aún se ve la pregunta contestada, aunque la vista ya no traiga las preguntas", async () => {
		const { preguntas: _omitidas, ...sinPreguntas } = vista({
			estado: "TERMINADA",
			progreso: progreso(5, 5, { terminado: true }),
			ranking: [{ nombre: "Ana", aciertos: 5, total: 5, porcentaje: 100, terminado: true }],
		});
		responder.mockResolvedValue({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: sinPreguntas });
		await pintar(vista({ progreso: progreso(4, 4) }));
		await pulsar(opcion("A"));
		expect(texto()).toContain("Pregunta 5");
		expect(opcion("A").className).toContain("bg-ok-bg");
		await pulsar(boton("Ver resultado"));
		expect(texto()).toContain("Ranking final");
	});

	it("avisa si la respuesta llegó fuera de tiempo", async () => {
		responder.mockResolvedValue({ correcta: 1, acierto: false, fueraDeTiempo: true, vista: vista({ progreso: progreso(1) }) });
		await pintar();
		await pulsar(opcion("B"));
		expect(texto()).toContain("fuera de tiempo y no cuenta");
	});
});

describe("cortes de red", () => {
	it("reintenta con el mismo comandoId (1 s, 2 s y 4 s) y avisa «Reconectando…»", async () => {
		expect(ESPERAS_REINTENTO_MS).toEqual([1000, 2000, 4000]);
		responder
			.mockRejectedValueOnce(errorRed())
			.mockRejectedValueOnce(errorRed())
			.mockResolvedValue({ correcta: 1, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) });
		await pintar();
		await pulsar(opcion("B"));
		expect(responder).toHaveBeenCalledTimes(1);
		expect(texto()).toContain("Reconectando… reenviando tu respuesta");
		await avanzar(999);
		expect(responder).toHaveBeenCalledTimes(1);
		await avanzar(1);
		expect(responder).toHaveBeenCalledTimes(2);
		await avanzar(1999);
		expect(responder).toHaveBeenCalledTimes(2);
		await avanzar(1);
		expect(responder).toHaveBeenCalledTimes(3);
		const identificadores = responder.mock.calls.map(([, , comando]) => comando.comandoId);
		expect(new Set(identificadores).size).toBe(1);
		expect(opcion("B").className).toContain("bg-ok-bg");
		expect(texto()).not.toContain("Reconectando");
	});

	it("tras agotar los reintentos muestra el aviso y «Reintentar» reenvía el mismo comando", async () => {
		responder.mockRejectedValue(errorRed());
		await pintar();
		await pulsar(opcion("C"));
		await avanzar(1000 + 2000 + 4000);
		expect(responder).toHaveBeenCalledTimes(4);
		expect(contenedor.querySelector('[role="alert"]').textContent).toContain("No se pudo enviar la respuesta");
		expect(opcion("A").disabled).toBe(true);
		expect(texto()).not.toContain("Siguiente");

		responder.mockResolvedValue({ correcta: 2, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) });
		await pulsar(boton("Reintentar"));
		expect(responder).toHaveBeenCalledTimes(5);
		const identificadores = responder.mock.calls.map(([, , comando]) => comando.comandoId);
		expect(new Set(identificadores).size).toBe(1);
		expect(opcion("C").className).toContain("bg-ok-bg");
		expect(contenedor.querySelector('[role="alert"]')).toBeNull();
	});

	it("un 5xx también se reintenta y un 429 respeta retry-after", async () => {
		responder
			.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 503, reintentable: true }))
			.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 429, reintentable: true, reintentarEnSegundos: 8 }))
			.mockResolvedValue({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) });
		await pintar();
		await pulsar(opcion("A"));
		await avanzar(1000);
		expect(responder).toHaveBeenCalledTimes(2);
		await avanzar(7999);
		expect(responder).toHaveBeenCalledTimes(2);
		await avanzar(1);
		expect(responder).toHaveBeenCalledTimes(3);
	});

	it("si el servidor rechaza con 409 no reintenta, avisa y vuelve a consultar sin avanzar", async () => {
		responder.mockRejectedValue(
			Object.assign(new Error("Pregunta fuera de orden"), { code: "FUERA_DE_ORDEN", status: 409, reintentable: false }),
		);
		await pintar();
		await pulsar(opcion("A"));
		expect(responder).toHaveBeenCalledTimes(1);
		expect(contenedor.querySelector('[role="alert"]').textContent).toBe("Pregunta fuera de orden");
		expect(recargarEspia).toHaveBeenCalledTimes(1);
		expect(texto()).not.toContain("Siguiente");
		expect(opcion("A").disabled).toBe(false);
		expect(texto()).toContain("Pregunta 1 / 5");
	});

	it("si el envío falló pero el servidor sí lo procesó, recupera el resultado desde la vista", async () => {
		responder.mockRejectedValue(errorRed());
		await pintar();
		await pulsar(opcion("B"));
		await avanzar(7000);
		expect(contenedor.querySelector('[role="alert"]')).not.toBeNull();
		expect(boton("Reintentar")).toBeDefined();
		expect(texto()).toContain("Pregunta 1 / 5");

		// La consulta periódica trae el progreso: la respuesta sí llegó al servidor.
		await act(async () =>
			cambiarVista(
				vista({
					progreso: progreso(1, 1, { respuestas: [{ indice: 0, opcion: 1, correcta: 1, acierto: true }] }),
				}),
			),
		);
		expect(contenedor.querySelector('[role="alert"]')).toBeNull();
		expect(boton("Reintentar")).toBeUndefined();
		expect(texto()).toContain("Pregunta 1 / 5");
		expect(opcion("B").className).toContain("bg-ok-bg border-ok text-ok-ink");
		expect(boton("Siguiente →")).toBeDefined();
		expect(responder).toHaveBeenCalledTimes(4);
	});

	it("tras un fallo sin respuesta del servidor, «Reintentar» sigue disponible aunque llegue una vista sin cambios", async () => {
		responder.mockRejectedValue(errorRed());
		await pintar();
		await pulsar(opcion("A"));
		await avanzar(7000);
		await act(async () => cambiarVista(vista()));
		expect(boton("Reintentar")).toBeDefined();
	});

	it("muestra «Reconectando…» cuando falla la consulta periódica", async () => {
		reconectandoActual = true;
		await pintar();
		expect(contenedor.querySelector('[role="status"]').textContent).toContain("Reconectando");
	});
});

describe("temporizador del servidor", () => {
	it("cuenta hasta la hora límite con el desfase del reloj del servidor y no envía nada al llegar a cero", async () => {
		const desfase = 5_000;
		ahoraServidor = () => Date.now() + desfase;
		const limite = Date.now() + desfase + 3_000;
		await pintar(vista({ timerConfig: { activo: true, tipo: "pregunta", segundos: 15 }, limite: { tipo: "pregunta", hasta: limite } }));
		expect(texto()).toContain("0:03");
		await avanzar(1000);
		expect(texto()).toContain("0:02");
		await avanzar(2000);
		expect(texto()).toContain("0:00");
		expect(texto()).toContain("¡Tiempo agotado!");
		await avanzar(10_000);
		expect(responder).not.toHaveBeenCalled();
	});

	it("el color del reloj cambia a amarillo y rojo según lo que queda", async () => {
		const hasta = Date.now() + 20_000;
		await pintar(vista({ timerConfig: { activo: true, tipo: "pregunta", segundos: 30 }, limite: { tipo: "pregunta", hasta } }));
		const reloj = () => contenedor.querySelector("span.font-mono.font-bold");
		expect(reloj().className).toContain("text-ink-soft");
		await avanzar(10_000);
		expect(reloj().className).toContain("bg-signal");
		await avanzar(5_000);
		expect(reloj().className).toContain("text-ko");
	});

	it("el tiempo por test sigue visible y avisa al agotarse sin enviar nada", async () => {
		const hasta = Date.now() + 2_000;
		await pintar(vista({ timerConfig: { activo: true, tipo: "test", segundos: 300 }, limite: { tipo: "test", hasta } }));
		expect(texto()).toContain("0:02");
		await avanzar(2000);
		expect(texto()).toContain("Tiempo agotado. Calculando resultado…");
		expect(responder).not.toHaveBeenCalled();
	});

	it("con temporizador por pregunta pasa sola a la siguiente tras la corrección", async () => {
		expect(AVANCE_AUTOMATICO_MS).toBe(2500);
		const hasta = Date.now() + 30_000;
		const conTimer = { timerConfig: { activo: true, tipo: "pregunta", segundos: 30 } };
		responder.mockResolvedValue({
			correcta: 0,
			acierto: true,
			fueraDeTiempo: false,
			vista: vista({ ...conTimer, progreso: progreso(1, 1), limite: { tipo: "pregunta", hasta: Date.now() + 30_000 } }),
		});
		await pintar(vista({ ...conTimer, limite: { tipo: "pregunta", hasta } }));
		await pulsar(opcion("A"));
		expect(texto()).toContain("Pregunta 1 / 5");
		await avanzar(AVANCE_AUTOMATICO_MS - 1);
		expect(texto()).toContain("Pregunta 1 / 5");
		await avanzar(1);
		expect(texto()).toContain("Pregunta 2 / 5");
	});

	it("sin temporizador no avanza solo", async () => {
		responder.mockResolvedValue({ correcta: 0, acierto: true, fueraDeTiempo: false, vista: vista({ progreso: progreso(1, 1) }) });
		await pintar();
		await pulsar(opcion("A"));
		await avanzar(60_000);
		expect(texto()).toContain("Pregunta 1 / 5");
		expect(boton("Siguiente →")).toBeDefined();
	});

	it("si el servidor avanza la pregunta por tiempo, la pantalla pasa a la nueva sin intervención", async () => {
		const conTimer = { timerConfig: { activo: true, tipo: "pregunta", segundos: 15 } };
		await pintar(vista({ ...conTimer, limite: { tipo: "pregunta", hasta: Date.now() + 1_000 } }));
		await avanzar(3_000);
		expect(texto()).toContain("¡Tiempo agotado!");
		expect(texto()).toContain("Pregunta 1 / 5");
		await act(async () =>
			cambiarVista(vista({ ...conTimer, progreso: progreso(1), limite: { tipo: "pregunta", hasta: Date.now() + 15_000 } })),
		);
		expect(texto()).toContain("Pregunta 2 / 5");
		expect(texto()).toContain("Pregunta 2");
		expect(texto()).not.toContain("Tiempo agotado");
		expect(texto()).toContain("0:15");
		expect(responder).not.toHaveBeenCalled();
	});
});

describe("pantalla final", () => {
	const ranking = [
		{ nombre: "Eva", aciertos: 5, total: 5, porcentaje: 100, terminado: true },
		{ nombre: "Ana", aciertos: 3, total: 5, porcentaje: 60, terminado: true },
		{ nombre: "Luis", aciertos: 1, total: 5, porcentaje: 20, terminado: false },
	];

	it("mientras faltan alumnos muestra tu resultado y el ranking en directo sin medallas", async () => {
		await pintar(vista({ progreso: progreso(5, 3, { terminado: true }), ranking }));
		expect(texto()).toContain("Esperando a los demás…");
		expect(texto()).toContain("Sala PRL-AB12 — 2/3 han terminado");
		expect(texto()).toContain("Tu resultado: 60% (3/5)");
		expect(texto()).not.toMatch(/[🥇🥈🥉]/u);
		const filas = [...contenedor.querySelectorAll("tbody tr")];
		expect(filas).toHaveLength(3);
		expect(filas[1].textContent).toContain("Ana (tú)");
		expect(filas[1].className).toContain("font-bold");
		expect(filas[2].textContent).toContain("respondiendo…");
		expect(boton("Nueva sesión")).toBeUndefined();
		await pulsar(boton("Salir de la sala"));
		expect(salirEspia).toHaveBeenCalledTimes(1);
	});

	it("con la sala terminada muestra el ranking final con medallas y «Nueva sesión»", async () => {
		const todos = ranking.map((fila) => ({ ...fila, terminado: true }));
		await pintar(vista({ estado: "TERMINADA", progreso: progreso(5, 3, { terminado: true }), ranking: todos }));
		expect(texto()).toContain("Ranking final");
		expect(texto()).toContain("3/3 han terminado");
		expect(contenedor.querySelector("tbody").textContent).toMatch(/🥇.*Eva.*🥈.*Ana.*🥉.*Luis/su);
		await pulsar(boton("Nueva sesión"));
		expect(salirEspia).toHaveBeenCalledTimes(1);
	});

	it("un alumno cuyo tiempo se agotó ve el final aunque no haya contestado todo", async () => {
		await pintar(vista({ estado: "TERMINADA", progreso: progreso(5, 2, { terminado: true }), ranking: ranking.map((f) => ({ ...f, terminado: true })) }));
		expect(texto()).toContain("Ranking final");
	});
});

describe("generarComandoId", () => {
	it("usa randomUUID cuando existe", () => {
		vi.stubGlobal("crypto", { randomUUID: () => "uuid-de-prueba" });
		expect(generarComandoId()).toBe("uuid-de-prueba");
	});

	it("sin randomUUID (http en red local) genera 32 caracteres hexadecimales distintos cada vez", () => {
		vi.stubGlobal("crypto", {
			getRandomValues: (bytes) => bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256))) || bytes,
		});
		const ids = new Set(Array.from({ length: 50 }, generarComandoId));
		expect(ids.size).toBe(50);
		for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
	});

	it("sin ninguna API criptográfica sigue generando un identificador", () => {
		vi.stubGlobal("crypto", undefined);
		expect(generarComandoId()).toMatch(/^[0-9a-f]{32}$/);
	});
});
