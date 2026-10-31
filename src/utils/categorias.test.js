import { describe, expect, it } from "vitest";
import { construirGrupos, obtenerTodasCategorias } from "./categorias.js";

const grupos = [
	{ nombre: "Incluidas", color: "blue", categorias: ["A"] },
	{ nombre: "Vacías", color: "gray", categorias: ["Sin preguntas"] },
];

it("añade al grupo Otras las categorías que no están definidas en grupos", () => {
	const resultado = construirGrupos(
		[{ categoria: "A" }, { categoria: "Nueva" }],
		grupos,
	);

	expect(resultado.map(({ nombre }) => nombre)).toEqual(["Incluidas", "Otras"]);
	expect(resultado[1].categorias).toEqual(["Nueva"]);
});

it("omite grupos sin categorías que tengan preguntas", () => {
	const resultado = construirGrupos([{ categoria: "A" }], grupos);

	expect(resultado.map(({ nombre }) => nombre)).toEqual(["Incluidas"]);
});

it("obtenerTodasCategorias devuelve exactamente las categorías del banco", () => {
	const preguntas = [
		{ categoria: "A" },
		{ categoria: "A" },
		{ categoria: "Nueva" },
	];

	expect(obtenerTodasCategorias(preguntas)).toEqual(["A", "Nueva"]);
});
