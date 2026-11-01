// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { comprobarSalud } from "../api/salas.js";
import useDisponibilidadRed from "./useDisponibilidadRed.js";

vi.mock("../api/salas.js", () => ({ comprobarSalud: vi.fn() }));

let contenedor;
let root;
let ultimo;

function Sonda() {
	ultimo = useDisponibilidadRed({ reintentoMs: 15000 });
	return null;
}

const avanzar = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

beforeEach(async () => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	comprobarSalud.mockReset();
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

it("empieza sin comprobar y pasa a disponible si /health responde", async () => {
	let resolver;
	comprobarSalud.mockReturnValue(new Promise((resolve) => (resolver = resolve)));
	await act(async () => root.render(<Sonda />));
	expect(ultimo).toEqual({ disponible: false, comprobada: false });
	await act(async () => resolver(true));
	expect(ultimo).toEqual({ disponible: true, comprobada: true });
	await avanzar(60_000);
	expect(comprobarSalud).toHaveBeenCalledTimes(1);
});

it("si falla queda comprobada y no disponible, y reintenta hasta lograrlo", async () => {
	comprobarSalud.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
	await act(async () => root.render(<Sonda />));
	expect(ultimo).toEqual({ disponible: false, comprobada: true });
	await avanzar(14_999);
	expect(comprobarSalud).toHaveBeenCalledTimes(1);
	await avanzar(1);
	expect(comprobarSalud).toHaveBeenCalledTimes(2);
	expect(ultimo.disponible).toBe(false);
	await avanzar(15_000);
	expect(ultimo).toEqual({ disponible: true, comprobada: true });
});

it("al desmontar deja de reintentar", async () => {
	comprobarSalud.mockResolvedValue(false);
	await act(async () => root.render(<Sonda />));
	await act(async () => root.unmount());
	await avanzar(60_000);
	expect(comprobarSalud).toHaveBeenCalledTimes(1);
	root = createRoot(contenedor);
});
