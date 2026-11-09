import { describe, expect, it } from "vitest";
import {
	EQUIVALENCIAS,
	ESTADOS,
	FECHA_REVISION,
	filtrarNormativa,
	normasDe,
	NORMATIVAS,
} from "./normativa.js";
import { normalizar } from "../utils/categorias.js";

const todas = Object.keys(NORMATIVAS).flatMap(normasDe);

describe("datos de normativa", () => {
	it("ofrece España y Colombia", () => {
		expect(Object.keys(NORMATIVAS)).toEqual(["es", "co"]);
	});

	it("cada norma tiene identificador único y campos completos", () => {
		const ids = todas.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const norma of todas) {
			expect(Object.keys(ESTADOS)).toContain(norma.estado);
			expect(norma.norma).toBeTruthy();
			expect(norma.nombre).toBeTruthy();
			expect(norma.resumen.length).toBeGreaterThan(20);
			expect(Array.isArray(norma.claves)).toBe(true);
			expect(norma.anio).toBeLessThanOrEqual(Number(FECHA_REVISION.slice(0, 4)));
		}
	});

	it("las normas derogadas no aparecen como vigentes", () => {
		for (const pais of Object.values(NORMATIVAS)) {
			const vigentes = normasDe(pais.id).map(({ norma }) => norma);
			for (const { norma, sustituidaPor } of pais.derogadas) {
				expect(vigentes).not.toContain(norma);
				expect(vigentes.some((n) => n.startsWith(sustituidaPor))).toBe(true);
			}
		}
	});

	it("Colombia incluye las normas clave del SG-SST y las novedades 2025-2026", () => {
		const nombres = normasDe("co").map(({ norma }) => norma);
		for (const clave of [
			"Decreto 1072 de 2015",
			"Resolución 0312 de 2019",
			"Resolución 1843 de 2025",
			"Resolución 3461 de 2025",
			"Decreto 728 de 2025",
			"Decreto 1040 de 2026",
			"Resolución 4272 de 2021",
		]) {
			expect(nombres).toContain(clave);
		}
	});

	it("las equivalencias tienen los dos países", () => {
		for (const fila of EQUIVALENCIAS) {
			expect(fila.es && fila.co && fila.concepto).toBeTruthy();
		}
	});
});

describe("filtrarNormativa", () => {
	it("busca sin tildes en número, nombre, claves y normas sustituidas", () => {
		const porTexto = (texto) =>
			filtrarNormativa("co", { texto }, normalizar).flatMap(({ normas }) => normas.map(({ id }) => id));
		expect(porTexto("convivencia")).toContain("co-res-3461-2025");
		expect(porTexto("2346")).toEqual(["co-res-1843-2025"]);
		expect(porTexto("psicosocial")).toContain("co-res-2764-2022");
		expect(porTexto("evaluaciones medicas")).toContain("co-res-1843-2025");
	});

	it("con solo novedades oculta las normas vigentes de siempre", () => {
		const normas = filtrarNormativa("co", { soloNovedades: true }, normalizar).flatMap(
			({ normas }) => normas,
		);
		expect(normas.length).toBeGreaterThan(0);
		expect(normas.every(({ estado }) => estado !== "vigente")).toBe(true);
	});

	it("quita los temas que se quedan sin normas", () => {
		const temas = filtrarNormativa("co", { texto: "alturas" }, normalizar);
		expect(temas).toHaveLength(1);
		expect(temas[0].titulo).toMatch(/alto riesgo/);
	});
});
