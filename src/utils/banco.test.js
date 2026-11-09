import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REGLAMENTACIONES } from "./reglamentacion.js";

const leerBanco = (ruta) =>
	JSON.parse(readFileSync(new URL(`../../public${ruta}`, import.meta.url)));

describe.each(Object.values(REGLAMENTACIONES).map((r) => [r.pais, r]))("banco de preguntas de %s", (_, { banco, grupos }) => {
	const preguntas = leerBanco(banco);

	it("tiene ids únicos", () => {
		const ids = preguntas.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("no repite enunciados ignorando mayúsculas y espacios sobrantes", () => {
		const enunciados = preguntas.map(({ pregunta }) =>
			pregunta.trim().replace(/\s+/g, " ").toLocaleLowerCase("es"),
		);
		expect(new Set(enunciados).size).toBe(enunciados.length);
	});

	it("tiene de 2 a 4 opciones únicas por pregunta y una respuesta válida", () => {
		for (const pregunta of preguntas) {
			expect(pregunta.opciones.length).toBeGreaterThanOrEqual(2);
			expect(pregunta.opciones.length).toBeLessThanOrEqual(4);
			expect(
				new Set(
					pregunta.opciones.map((opcion) =>
						opcion.trim().toLocaleLowerCase("es"),
					),
				).size,
			).toBe(pregunta.opciones.length);
			expect(Number.isInteger(pregunta.respuesta)).toBe(true);
			expect(pregunta.respuesta).toBeGreaterThanOrEqual(0);
			expect(pregunta.respuesta).toBeLessThan(pregunta.opciones.length);
		}
	});

	it("tiene una categoría no vacía en cada pregunta", () => {
		for (const pregunta of preguntas) {
			expect(pregunta.categoria.trim()).not.toBe("");
		}
	});

	it("tiene todas sus categorías en algún grupo temático", () => {
		const agrupadas = new Set(grupos.flatMap(({ categorias }) => categorias));
		const sinGrupo = [...new Set(preguntas.map(({ categoria }) => categoria))].filter(
			(categoria) => !agrupadas.has(categoria),
		);
		expect(sinGrupo).toEqual([]);
	});
});

describe("bancos por reglamentación", () => {
	it("no comparten ids ni categorías, para que no se mezclen en una sala", () => {
		const es = leerBanco(REGLAMENTACIONES.es.banco);
		const co = leerBanco(REGLAMENTACIONES.co.banco);
		const idsEs = new Set(es.map(({ id }) => id));
		const categoriasEs = new Set(es.map(({ categoria }) => categoria));
		expect(co.filter(({ id }) => idsEs.has(id))).toEqual([]);
		expect(co.filter(({ categoria }) => categoriasEs.has(categoria))).toEqual([]);
	});
});
