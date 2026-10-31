// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CategorySelector from "./CategorySelector.jsx";

const recuentos = {
	"Ley 31/1995 LPRL": 12,
	"Plan de Prevención": 5,
	Formación: 2,
	"Riesgos Físicos": 11,
	"Equipos de Protección": 17,
	Señalización: 11,
	Incendios: 11,
	Emergencias: 9,
	"Primeros Auxilios": 6,
	"Categoría nueva": 1,
};
const preguntas = Object.entries(recuentos).flatMap(([categoria, cantidad]) =>
	Array.from({ length: cantidad }, () => ({ categoria })),
);
const totalBanco = preguntas.length;

let contenedor;
let root;
let ultimaSeleccion;

function Envoltorio({ inicial = [], compacto = false }) {
	const [seleccionadas, setSeleccionadas] = useState(inicial);
	ultimaSeleccion = seleccionadas;
	return (
		<CategorySelector
			preguntas={preguntas}
			seleccionadas={seleccionadas}
			onChange={setSeleccionadas}
			compacto={compacto}
		/>
	);
}

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	contenedor = document.createElement("div");
	document.body.append(contenedor);
	root = createRoot(contenedor);
});

afterEach(async () => {
	await act(async () => root.unmount());
	contenedor.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const pintar = (props) => act(async () => root.render(<Envoltorio {...props} />));
const boton = (etiqueta) =>
	[...contenedor.querySelectorAll("button")].find(
		(b) => b.getAttribute("aria-label")?.startsWith(etiqueta) || b.textContent.trim() === etiqueta,
	);
const pulsar = (etiqueta) => {
	const encontrado = boton(etiqueta);
	expect(encontrado, `Botón disponible: ${etiqueta}`).toBeDefined();
	return act(async () => encontrado.click());
};
const textoContador = () =>
	[...contenedor.querySelectorAll("p[aria-live]")].at(-1).textContent.replace(/\s+/g, " ").trim();

async function escribir(valor) {
	const entrada = contenedor.querySelector("input");
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(entrada, valor);
		entrada.dispatchEvent(new Event("input", { bubbles: true }));
	});
}

describe("señales y panel", () => {
	it("muestra una señal por grupo con sus preguntas y un nombre accesible", async () => {
		await pintar();
		expect(contenedor.querySelectorAll("ul > li > button[aria-expanded]")).toHaveLength(6);
		expect(boton("Legislación y Normativa, 12 preguntas, ningún tema seleccionado")).toBeDefined();
		expect(boton("Otras, 1 pregunta, ningún tema seleccionado")).toBeDefined();
	});

	it("abre un solo grupo a la vez y lo cierra al tocarlo de nuevo", async () => {
		await pintar();
		expect(contenedor.querySelector("section[aria-label^='Temas de']")).toBeNull();
		await pulsar("Legislación y Normativa");
		expect(boton("Legislación y Normativa").getAttribute("aria-expanded")).toBe("true");
		expect(contenedor.querySelectorAll("section[aria-label^='Temas de']")).toHaveLength(1);
		await pulsar("Organización Preventiva");
		expect(boton("Legislación y Normativa").getAttribute("aria-expanded")).toBe("false");
		expect(contenedor.querySelector("section[aria-label='Temas de Organización Preventiva']")).not.toBeNull();
		await pulsar("Organización Preventiva");
		expect(contenedor.querySelector("section[aria-label^='Temas de']")).toBeNull();
	});

	it("alterna pegatinas con aria-pressed y actualiza señal y contador", async () => {
		await pintar();
		await pulsar("Organización Preventiva");
		await pulsar("Plan de Prevención");
		expect(boton("Plan de Prevención, 5 preguntas").getAttribute("aria-pressed")).toBe("true");
		expect(ultimaSeleccion).toEqual(["Plan de Prevención"]);
		expect(boton("Organización Preventiva").getAttribute("aria-label")).toContain("1 tema seleccionado");
		expect(textoContador()).toBe("5 preguntas · 1 tema");
		await pulsar("Plan de Prevención");
		expect(ultimaSeleccion).toEqual([]);
	});

	it("«Elegir todo el grupo» y «Quitar el grupo» alternan todas sus categorías", async () => {
		await pintar();
		await pulsar("Organización Preventiva");
		await pulsar("Elegir todo el grupo");
		expect(ultimaSeleccion.sort()).toEqual(["Formación", "Plan de Prevención"]);
		expect(boton("Quitar el grupo")).toBeDefined();
		await pulsar("Quitar el grupo");
		expect(ultimaSeleccion).toEqual([]);
	});

	it("marca las categorías de pocas preguntas e Incendios con su icono", async () => {
		await pintar();
		await pulsar("Organización Preventiva");
		expect(boton("Formación, 2 preguntas").textContent).toContain("pocas");
		expect(boton("Plan de Prevención, 5 preguntas").textContent).not.toContain("pocas");
		await pulsar("Emergencias y Primeros Auxilios");
		const incendios = boton("Incendios, 11 preguntas");
		expect(incendios.className).toContain("border-senal-incendios");
		expect(incendios.querySelector("svg")).not.toBeNull();
	});

	it("el giro de cada pegatina es fijo entre renders", async () => {
		await pintar();
		await pulsar("Organización Preventiva");
		const antes = boton("Formación, 2 preguntas").style.getPropertyValue("--giro");
		await pulsar("Formación, 2 preguntas");
		expect(boton("Formación, 2 preguntas").style.getPropertyValue("--giro")).toBe(antes);
		expect(Math.abs(parseInt(antes, 10))).toBeLessThanOrEqual(2);
	});
});

describe("búsqueda", () => {
	it("encuentra sin tildes ni mayúsculas, resalta la coincidencia y oculta señales", async () => {
		await pintar();
		await escribir("SENAL");
		expect(contenedor.querySelector("ul")).toBeNull();
		expect(contenedor.textContent).toContain("1 tema encontrado");
		expect(contenedor.querySelector("mark").textContent).toBe("Señal");
	});

	it("encuentra «epi» y «ley»", async () => {
		await pintar();
		await escribir("epi");
		expect(boton("Equipos de Protección, 17 preguntas")).toBeDefined();
		await escribir("ley");
		expect(boton("Ley 31/1995 LPRL, 12 preguntas")).toBeDefined();
	});

	it("«Elegir los N» selecciona todos los encontrados", async () => {
		await pintar();
		await escribir("riesgos");
		await pulsar("Elegir el tema");
		expect(ultimaSeleccion).toEqual(["Riesgos Físicos"]);
	});

	it("sin resultados ofrece borrar la búsqueda", async () => {
		await pintar();
		await escribir("zzz");
		expect(contenedor.textContent).toContain("No hay temas con «zzz»");
		await act(async () => boton("Borrar búsqueda").click());
		expect(contenedor.querySelector("ul")).not.toBeNull();
	});

	it("Escape borra la búsqueda", async () => {
		await pintar();
		await escribir("ley");
		await act(async () =>
			contenedor.querySelector("input").dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			),
		);
		expect(contenedor.querySelector("input").value).toBe("");
		expect(contenedor.querySelector("ul")).not.toBeNull();
	});
});

describe("acciones y contador", () => {
	it("«Sorpréndeme» elige tres temas de grupos distintos con al menos 10 preguntas", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		await pintar();
		await pulsar("Sorpréndeme");
		expect(ultimaSeleccion).toHaveLength(3);
		expect(ultimaSeleccion.reduce((suma, nombre) => suma + recuentos[nombre], 0)).toBeGreaterThanOrEqual(10);
	});

	it("«Todas» selecciona todas las categorías, incluidas las de «Otras»", async () => {
		await pintar();
		await pulsar("Todas");
		expect(ultimaSeleccion.sort()).toEqual(Object.keys(recuentos).sort());
		expect(textoContador()).toBe(`${totalBanco} preguntas · ${Object.keys(recuentos).length} temas`);
	});

	it("sin selección muestra el total del banco calculado", async () => {
		await pintar();
		expect(textoContador()).toBe(`Todas las categorías · ${totalBanco} preguntas`);
		expect(contenedor.querySelector("[role=presentation] > div").style.width).toBe("100%");
	});

	it("avisa en amarillo cuando la selección suma menos de 5 preguntas y «Limpiar» la vacía", async () => {
		await pintar({ inicial: ["Formación"] });
		expect(textoContador()).toBe("Solo 2 preguntas · 1 tema");
		expect(contenedor.querySelector(".text-senal-advertencia").textContent).toBe("Solo 2 preguntas");
		expect(contenedor.querySelector("[role=presentation] > div").style.width)
			.toBe(`${(2 / totalBanco) * 100}%`);
		await pulsar("Limpiar");
		expect(ultimaSeleccion).toEqual([]);
	});

	it("el modo compacto deja el contador estático", async () => {
		await pintar({ compacto: true });
		expect(contenedor.querySelector("p[aria-live]:last-of-type").closest("div.rounded-3xl").className)
			.not.toContain("sticky");
		await pintar({ compacto: false });
		expect(contenedor.querySelector("div.sticky")).not.toBeNull();
	});
});
