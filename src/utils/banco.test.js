import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preguntas = JSON.parse(
	readFileSync(new URL("../../public/preguntas-prl.json", import.meta.url)),
);

describe("banco de preguntas", () => {
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
});
