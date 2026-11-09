// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Normativa from "./Normativa.jsx";

let contenedor;
let root;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	window.localStorage.clear();
	contenedor = document.createElement("div");
	document.body.append(contenedor);
	root = createRoot(contenedor);
});

afterEach(async () => {
	await act(async () => root.unmount());
	contenedor.remove();
	vi.unstubAllGlobals();
});

const pintar = () => act(async () => root.render(<Normativa />));
const pestana = (pais) =>
	[...contenedor.querySelectorAll('[role="tab"]')].find((b) => b.textContent.includes(pais));
const titulos = () => [...contenedor.querySelectorAll("article h4")].map((h) => h.textContent);

function escribir(valor) {
	const entrada = contenedor.querySelector('input[type="search"]');
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
	setter.call(entrada, valor);
	entrada.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Normativa", () => {
	it("empieza en España y permite cambiar a Colombia", async () => {
		await pintar();
		expect(pestana("España").getAttribute("aria-selected")).toBe("true");
		expect(titulos()).toContain("Ley 31/1995");

		await act(async () => pestana("Colombia").click());
		expect(pestana("Colombia").getAttribute("aria-selected")).toBe("true");
		expect(titulos()).toContain("Resolución 1843 de 2025");
		expect(titulos()).not.toContain("Ley 31/1995");
		expect(contenedor.textContent).toContain("Normas derogadas que no debes seguir citando");
	});

	it("recuerda el país elegido", async () => {
		await pintar();
		await act(async () => pestana("Colombia").click());
		await act(async () => root.unmount());
		root = createRoot(contenedor);
		await pintar();
		expect(pestana("Colombia").getAttribute("aria-selected")).toBe("true");
	});

	it("cambia de pestaña con las flechas", async () => {
		await pintar();
		await act(async () =>
			pestana("España").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
		);
		expect(pestana("Colombia").getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(pestana("Colombia"));
	});

	it("filtra por texto y por novedades", async () => {
		await pintar();
		await act(async () => pestana("Colombia").click());
		await act(async () => escribir("alturas"));
		expect(titulos()).toEqual(["Resolución 4272 de 2021"]);

		await act(async () => escribir(""));
		const novedades = [...contenedor.querySelectorAll("button")].find(
			(b) => b.textContent === "Solo novedades",
		);
		await act(async () => novedades.click());
		expect(titulos()).toContain("Decreto 1040 de 2026");
		expect(titulos()).not.toContain("Decreto 1072 de 2015");

		await act(async () => escribir("zzz"));
		expect(contenedor.textContent).toContain("No hay normas que coincidan");
	});
});
