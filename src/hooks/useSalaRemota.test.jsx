// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verSala } from "../api/salas.js";
import useSalaRemota, { INTERVALO_OCULTA_MS, INTERVALO_VISIBLE_MS } from "./useSalaRemota.js";

vi.mock("../api/salas.js", () => ({ verSala: vi.fn() }));

let contenedor;
let root;
let ultimo;
let visibilidad;

function Sonda({ codigo, sessionId }) {
	ultimo = useSalaRemota({ codigo, sessionId });
	return null;
}

const vista = (ahoraServidor, extra = {}) => ({ codigo: "PRL-AB12", estado: "ESPERANDO", ahoraServidor, ...extra });
const errorApi = (status, extra = {}) => Object.assign(new Error(`error ${status}`), { status, code: "X", ...extra });
const pintar = (props = { codigo: "PRL-AB12", sessionId: "secreto" }) =>
	act(async () => root.render(<Sonda {...props} />));
const avanzar = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

function cambiarVisibilidad(estado) {
	visibilidad = estado;
	document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(1_000_000);
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	visibilidad = "visible";
	Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidad });
	verSala.mockReset();
	verSala.mockImplementation(async () => vista(Date.now()));
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

describe("consulta periódica", () => {
	it("consulta de inmediato y después cada segundo con la pestaña visible", async () => {
		await pintar();
		expect(verSala).toHaveBeenCalledTimes(1);
		expect(verSala).toHaveBeenCalledWith("PRL-AB12", "secreto", { signal: expect.any(AbortSignal) });
		await avanzar(INTERVALO_VISIBLE_MS - 1);
		expect(verSala).toHaveBeenCalledTimes(1);
		await avanzar(1);
		expect(verSala).toHaveBeenCalledTimes(2);
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(verSala).toHaveBeenCalledTimes(3);
		expect(ultimo.vista.estado).toBe("ESPERANDO");
	});

	it("con la pestaña oculta consulta cada 5 s", async () => {
		visibilidad = "hidden";
		await pintar();
		expect(verSala).toHaveBeenCalledTimes(1);
		await avanzar(INTERVALO_OCULTA_MS - 1);
		expect(verSala).toHaveBeenCalledTimes(1);
		await avanzar(1);
		expect(verSala).toHaveBeenCalledTimes(2);
	});

	it("al volver a estar visible consulta en el momento", async () => {
		visibilidad = "hidden";
		await pintar();
		await avanzar(1000);
		expect(verSala).toHaveBeenCalledTimes(1);
		await act(async () => cambiarVisibilidad("visible"));
		expect(verSala).toHaveBeenCalledTimes(2);
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(verSala).toHaveBeenCalledTimes(3);
	});

	it("al ocultarse no consulta de más", async () => {
		await pintar();
		await act(async () => cambiarVisibilidad("hidden"));
		expect(verSala).toHaveBeenCalledTimes(1);
	});

	it("al desmontar cancela la consulta en curso y deja de consultar", async () => {
		let senal;
		verSala.mockImplementation((_c, _s, { signal }) => {
			senal = signal;
			return new Promise(() => {});
		});
		await pintar();
		expect(senal.aborted).toBe(false);
		await act(async () => root.unmount());
		expect(senal.aborted).toBe(true);
		await avanzar(20_000);
		expect(verSala).toHaveBeenCalledTimes(1);
		root = createRoot(contenedor);
	});

	it("una consulta nueva cancela la anterior que siga pendiente", async () => {
		const senales = [];
		verSala.mockImplementation((_c, _s, { signal }) => {
			senales.push(signal);
			return new Promise(() => {});
		});
		visibilidad = "hidden";
		await pintar();
		await act(async () => cambiarVisibilidad("visible"));
		expect(senales[0].aborted).toBe(true);
		expect(senales[1].aborted).toBe(false);
	});

	it("sin código o sin sessionId no consulta nada", async () => {
		await pintar({ codigo: undefined, sessionId: undefined });
		await avanzar(10_000);
		expect(verSala).not.toHaveBeenCalled();
		expect(ultimo.vista).toBeNull();
	});

	it("al cambiar de sala reinicia la vista y consulta la nueva", async () => {
		await pintar();
		expect(ultimo.vista).not.toBeNull();
		verSala.mockImplementation(() => new Promise(() => {}));
		await pintar({ codigo: "PRL-ZZZZ", sessionId: "otro" });
		expect(ultimo.vista).toBeNull();
		expect(verSala).toHaveBeenLastCalledWith("PRL-ZZZZ", "otro", expect.anything());
	});
});

describe("errores", () => {
	it.each([401, 404])("un %i marca la sesión como inválida y deja de consultar", async (estado) => {
		verSala.mockRejectedValue(errorApi(estado));
		await pintar();
		expect(ultimo.sesionInvalida).toBe(true);
		expect(ultimo.reconectando).toBe(false);
		await avanzar(20_000);
		expect(verSala).toHaveBeenCalledTimes(1);
	});

	it("un corte de red marca reconectando, sigue consultando y se recupera", async () => {
		verSala.mockRejectedValueOnce(errorApi(0, { code: "SIN_CONEXION" }));
		await pintar();
		expect(ultimo.reconectando).toBe(true);
		expect(ultimo.vista).toBeNull();
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(ultimo.reconectando).toBe(false);
		expect(ultimo.vista).not.toBeNull();
	});

	it("conserva la última vista mientras no hay conexión", async () => {
		await pintar();
		verSala.mockRejectedValue(errorApi(0));
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(ultimo.reconectando).toBe(true);
		expect(ultimo.vista.estado).toBe("ESPERANDO");
	});

	it("un 429 respeta el retry-after antes de volver a consultar", async () => {
		verSala.mockRejectedValueOnce(errorApi(429, { reintentarEnSegundos: 10 }));
		await pintar();
		await avanzar(9_999);
		expect(verSala).toHaveBeenCalledTimes(1);
		await avanzar(1);
		expect(verSala).toHaveBeenCalledTimes(2);
	});
});

describe("reloj y respuestas antiguas", () => {
	it("calcula el desfase con el reloj del servidor en cada consulta", async () => {
		verSala.mockImplementation(async () => vista(Date.now() + 30_000));
		await pintar();
		expect(ultimo.ahoraServidor() - Date.now()).toBe(30_000);
		await avanzar(5_000);
		expect(ultimo.ahoraServidor() - Date.now()).toBe(30_000);
		verSala.mockImplementation(async () => vista(Date.now() - 4_000));
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(ultimo.ahoraServidor() - Date.now()).toBe(-4_000);
	});

	it("aplicarVista actualiza la vista de inmediato", async () => {
		await pintar();
		await act(async () => ultimo.aplicarVista(vista(Date.now() + 10, { estado: "EN_CURSO" })));
		expect(ultimo.vista.estado).toBe("EN_CURSO");
	});

	it("una consulta en vuelo no pisa la vista de un envío más reciente", async () => {
		let resolver;
		verSala.mockImplementation(() => new Promise((resolve) => (resolver = resolve)));
		await pintar();
		await act(async () => ultimo.aplicarVista(vista(Date.now(), { estado: "EN_CURSO" })));
		await act(async () => resolver(vista(Date.now(), { estado: "ESPERANDO" })));
		expect(ultimo.vista.estado).toBe("EN_CURSO");
		verSala.mockImplementation(async () => vista(Date.now(), { estado: "TERMINADA" }));
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(ultimo.vista.estado).toBe("TERMINADA");
	});

	it("si el reloj del servidor retrocede, las consultas siguen aplicándose", async () => {
		verSala.mockImplementation(async () => vista(Date.now() + 3_600_000, { estado: "EN_CURSO" }));
		await pintar();
		verSala.mockImplementation(async () => vista(Date.now() - 3_600_000, { estado: "TERMINADA" }));
		await avanzar(INTERVALO_VISIBLE_MS);
		expect(ultimo.vista.estado).toBe("TERMINADA");
		expect(ultimo.ahoraServidor() - Date.now()).toBe(-3_600_000);
	});

	it("recargar fuerza una consulta inmediata", async () => {
		await pintar();
		await act(async () => ultimo.recargar());
		expect(verSala).toHaveBeenCalledTimes(2);
	});
});
