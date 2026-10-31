// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Scale } from "lucide-react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Senal from "./Senal.jsx";

let contenedor;
let root;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	contenedor = document.createElement("div");
	document.body.append(contenedor);
	root = createRoot(contenedor);
});

afterEach(async () => {
	await act(async () => root.unmount());
	contenedor.remove();
	vi.unstubAllGlobals();
});

async function pintar(props) {
	await act(async () => root.render(<Senal icono={Scale} {...props} />));
	return contenedor.firstElementChild;
}

it("es decorativa y respeta el tamaño pedido", async () => {
	const senal = await pintar({ tipo: "obligacion", tamano: 48 });
	expect(senal.getAttribute("aria-hidden")).toBe("true");
	expect(senal.style.width).toBe("48px");
	expect(senal.querySelector("svg")).not.toBeNull();
});

it.each([
	["obligacion", "rounded-full"],
	["otras", "rounded-full"],
])("%s es un círculo con aro interior", async (tipo, clase) => {
	const senal = await pintar({ tipo });
	expect(senal.querySelector(`.${clase}.bg-senal-${tipo}`)).not.toBeNull();
	expect(senal.querySelector(".border-2.border-current")).not.toBeNull();
});

it.each(["salvamento", "incendios"])("%s es un cuadrado redondeado", async (tipo) => {
	const senal = await pintar({ tipo });
	const forma = senal.querySelector(`.bg-senal-${tipo}`);
	expect(forma.style.borderRadius).toBe("18%");
	expect(forma.classList.contains("rounded-full")).toBe(false);
});

it("advertencia es un triángulo con borde oscuro", async () => {
	const senal = await pintar({ tipo: "advertencia" });
	const capas = [...senal.querySelectorAll("span[style*='clip-path']")];
	expect(capas.length).toBeGreaterThanOrEqual(2);
	expect(capas.some((capa) => capa.classList.contains("bg-ink"))).toBe(true);
	expect(capas.some((capa) => capa.classList.contains("bg-senal-advertencia"))).toBe(true);
});

it("activa añade el aro exterior y la insignia con Check", async () => {
	const inactiva = await pintar({ tipo: "obligacion" });
	expect(inactiva.querySelectorAll("svg")).toHaveLength(1);
	const activa = await pintar({ tipo: "obligacion", activa: true });
	expect(activa.querySelector(".ring-senal-obligacion.ring-offset-bg")).not.toBeNull();
	expect(activa.querySelectorAll("svg")).toHaveLength(2);
});

it("un tipo desconocido cae en el estilo de «otras»", async () => {
	const senal = await pintar({ tipo: "inventado" });
	expect(senal.querySelector(".bg-senal-otras")).not.toBeNull();
});
