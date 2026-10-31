import { describe, expect, it } from "vitest";
import { barajarOpciones, prepararTest } from "./quiz.js";

describe("barajarOpciones", () => {
	const pregunta = {
		id: 1,
		pregunta: "¿Cuál es la respuesta correcta?",
		opciones: ["A", "B", "C", "D"],
		respuesta: 2,
	};

	it("conserva el texto de la respuesta correcta", () => {
		const resultado = barajarOpciones(pregunta);

		expect(resultado.opciones[resultado.respuesta]).toBe(
			pregunta.opciones[pregunta.respuesta],
		);
	});

	it("no modifica la pregunta original", () => {
		const original = structuredClone(pregunta);

		barajarOpciones(pregunta);

		expect(pregunta).toEqual(original);
	});

	it("baraja preguntas con tres opciones", () => {
		const preguntaTresOpciones = {
			...pregunta,
			opciones: ["A", "B", "C"],
			respuesta: 1,
		};
		const resultado = barajarOpciones(preguntaTresOpciones);

		expect(resultado.opciones).toHaveLength(3);
		expect(resultado.opciones[resultado.respuesta]).toBe("B");
	});

	it("distribuye la respuesta correcta de forma equilibrada", () => {
		const apariciones = [0, 0, 0, 0];

		for (let intento = 0; intento < 4000; intento++) {
			apariciones[barajarOpciones(pregunta).respuesta]++;
		}

		for (const aparicion of apariciones) {
			expect(aparicion / 4000).toBeGreaterThanOrEqual(0.2);
			expect(aparicion / 4000).toBeLessThanOrEqual(0.3);
		}
	});
});

it("prepararTest devuelve la cantidad pedida sin repetir ids", () => {
	const preguntas = Array.from({ length: 10 }, (_, indice) => ({
		id: indice + 1,
		opciones: ["A", "B", "C"],
		respuesta: 0,
	}));

	const resultado = prepararTest(preguntas, 5);

	expect(resultado).toHaveLength(5);
	expect(new Set(resultado.map(({ id }) => id)).size).toBe(5);
});
