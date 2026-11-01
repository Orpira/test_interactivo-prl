// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLAVE_SESION, borrarSesion, guardarSesion, leerSesion } from "./sesion.js";

const sesion = { codigo: "PRL-AB12", sessionId: "11111111-2222-3333-4444-555555555555", nombre: "Ana" };

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("sesión guardada", () => {
	it("guarda y lee la sesión con la clave prl-sala", () => {
		expect(CLAVE_SESION).toBe("prl-sala");
		expect(leerSesion()).toBeNull();
		guardarSesion(sesion);
		expect(JSON.parse(window.sessionStorage.getItem("prl-sala"))).toEqual(sesion);
		expect(leerSesion()).toEqual(sesion);
	});

	it("solo guarda los tres campos", () => {
		guardarSesion({ ...sesion, extra: "no" });
		expect(Object.keys(JSON.parse(window.sessionStorage.getItem("prl-sala")))).toEqual(["codigo", "sessionId", "nombre"]);
	});

	it("borrarSesion elimina la clave", () => {
		guardarSesion(sesion);
		borrarSesion();
		expect(window.sessionStorage.getItem("prl-sala")).toBeNull();
		expect(leerSesion()).toBeNull();
	});

	it.each([
		["JSON roto", "{no"],
		["no es un objeto", "42"],
		["falta el sessionId", JSON.stringify({ codigo: "PRL-AB12", nombre: "Ana" })],
		["tipos incorrectos", JSON.stringify({ codigo: 1, sessionId: 2, nombre: 3 })],
		["null", "null"],
	])("un valor inválido (%s) se ignora", (_caso, texto) => {
		window.sessionStorage.setItem("prl-sala", texto);
		expect(leerSesion()).toBeNull();
	});

	it("si sessionStorage no está disponible no lanza errores", () => {
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
			throw new DOMException("bloqueado", "SecurityError");
		});
		expect(() => guardarSesion(sesion)).not.toThrow();
		expect(leerSesion()).toBeNull();
		expect(() => borrarSesion()).not.toThrow();
	});

	it("si escribir falla (cuota llena) no lanza errores", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("cuota", "QuotaExceededError");
		});
		expect(() => guardarSesion(sesion)).not.toThrow();
	});
});
