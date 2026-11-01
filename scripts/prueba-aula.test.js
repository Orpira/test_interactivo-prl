import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { crearServicio } from "../src/server/servicio.js";
import {
	crearAleatorio,
	crearMedidor,
	elegirOpcion,
	ejecutarPrueba,
	formatearResumen,
	leerConfiguracion,
	mediana,
	percentil,
} from "./prueba-aula.mjs";

describe("estadística", () => {
	it("percentil y mediana sobre una lista desordenada", () => {
		const valores = [50, 10, 40, 20, 30, 90, 80, 70, 60, 100];
		expect(mediana(valores)).toBe(50);
		expect(percentil(valores, 95)).toBe(100);
		expect(percentil(valores, 10)).toBe(10);
		expect(percentil([7], 95)).toBe(7);
		expect(percentil([], 95)).toBe(0);
	});

	it("no modifica la lista original", () => {
		const valores = [3, 1, 2];
		percentil(valores, 50);
		expect(valores).toEqual([3, 1, 2]);
	});
});

describe("aleatoriedad con semilla", () => {
	it("la misma semilla da la misma secuencia y otra semilla, otra", () => {
		const a = crearAleatorio(42);
		const b = crearAleatorio(42);
		const c = crearAleatorio(43);
		const secuencia = (f) => Array.from({ length: 5 }, f);
		expect(secuencia(a)).toEqual(secuencia(b));
		expect(secuencia(crearAleatorio(42))).not.toEqual(secuencia(c));
	});

	it("los valores están en [0, 1)", () => {
		const f = crearAleatorio(1);
		for (let i = 0; i < 1000; i++) {
			const valor = f();
			expect(valor).toBeGreaterThanOrEqual(0);
			expect(valor).toBeLessThan(1);
		}
	});

	it("elegirOpcion acierta con la probabilidad pedida y nunca devuelve una opción inexistente", () => {
		const f = crearAleatorio(5);
		const resultados = Array.from({ length: 4000 }, () => elegirOpcion(2, 4, 0.7, f));
		const aciertos = resultados.filter((opcion) => opcion === 2).length / resultados.length;
		expect(aciertos).toBeGreaterThan(0.66);
		expect(aciertos).toBeLessThan(0.74);
		expect(resultados.every((opcion) => opcion >= 0 && opcion < 4)).toBe(true);
		const incorrectas = resultados.filter((opcion) => opcion !== 2);
		expect(new Set(incorrectas)).toEqual(new Set([0, 1, 3]));
	});

	it("con precisión 1 siempre acierta y con una sola opción también", () => {
		const f = crearAleatorio(1);
		expect(Array.from({ length: 50 }, () => elegirOpcion(1, 3, 1, f)).every((o) => o === 1)).toBe(true);
		expect(elegirOpcion(0, 1, 0, f)).toBe(0);
	});
});

describe("configuración", () => {
	it("usa los valores del plan por defecto", () => {
		expect(leerConfiguracion({})).toMatchObject({
			apiUrl: "http://127.0.0.1:8788",
			alumnos: 30,
			preguntas: 10,
			segundos: 30,
			escala: 1,
			corteMs: 20000,
			origen: null,
		});
	});

	it("lee las variables y quita la barra final de la URL", () => {
		const config = leerConfiguracion({ API_URL: "https://api-prl.orpira.es/", ALUMNOS: "12", ESCALA_TIEMPO: "0.5", SEMILLA: "9", ORIGEN: "https://prl.orpira.es" });
		expect(config).toMatchObject({ apiUrl: "https://api-prl.orpira.es", alumnos: 12, escala: 0.5, semilla: 9, origen: "https://prl.orpira.es" });
	});

	it.each([["ALUMNOS", "0"], ["PREGUNTAS", "abc"], ["ESCALA_TIEMPO", "-1"]])("rechaza %s=%s", (nombre, valor) => {
		expect(() => leerConfiguracion({ [nombre]: valor })).toThrow(nombre);
	});
});

describe("medidor y resumen", () => {
	it("cuenta peticiones, códigos y los 429", () => {
		const medidor = crearMedidor();
		medidor.registrar(200, 5);
		medidor.registrar(200, 7);
		medidor.registrar(429, 3);
		medidor.registrar("LIMITE_PETICIONES", 3);
		medidor.registrar("RED", 1);
		expect(medidor.peticiones).toBe(5);
		expect(medidor.limites429).toBe(2);
		expect(Object.fromEntries(medidor.porCodigo)).toEqual({ 200: 2, 429: 1, LIMITE_PETICIONES: 1, RED: 1 });
	});

	it("el resumen muestra duración, peticiones, errores por código, tiempos y el resultado", () => {
		const base = {
			config: { apiUrl: "http://x", alumnos: 30, preguntas: 10, segundos: 30, escala: 1, semilla: 7 },
			sala: "PRL-AAAA",
			duracionMs: 60_000,
			peticiones: 1800,
			porCodigo: { 200: 1799, 201: 1 },
			tiempos: { medianaMs: 3.5, p95Ms: 10.9, maximoMs: 51.3 },
			respuestas: { enviadas: 300, tardias: 0 },
			aciertos: { ranking: 174, enviados: 174 },
			comprobaciones: [{ nombre: "hay 30 alumnos", correcto: true, detalle: "30" }],
		};
		const bien = formatearResumen({ ...base, correcto: true });
		expect(bien).toContain("Duración:       60.0 s");
		expect(bien).toContain("Peticiones:     1800 (1800 por minuto)");
		expect(bien).toContain("200=1799  201=1");
		expect(bien).toContain("mediana 3.5 ms · p95 10.9 ms");
		expect(bien).toContain("✔ hay 30 alumnos (30)");
		expect(bien).toContain("RESULTADO: CORRECTO");
		const mal = formatearResumen({ ...base, comprobaciones: [{ nombre: "x", correcto: false, detalle: "y" }], correcto: false });
		expect(mal).toContain("✘ x (y)");
		expect(mal).toContain("RESULTADO: HAY FALLOS");
	});
});

describe("ejecución real contra el servicio", () => {
	let servicio;
	let directorio;

	afterEach(async () => {
		await servicio?.cerrar();
		if (directorio) await rm(directorio, { recursive: true, force: true });
	});

	it("simula una clase pequeña y todas las comprobaciones salen correctas", async () => {
		const banco = JSON.parse(readFileSync(new URL("../public/preguntas-prl.json", import.meta.url), "utf8"));
		directorio = await mkdtemp(join(tmpdir(), "prl-aula-"));
		servicio = await crearServicio({ preguntas: banco, directorioDatos: directorio, retardoGuardadoMs: 10 });
		await new Promise((resolver) => servicio.httpServer.listen(0, "127.0.0.1", resolver));
		const config = leerConfiguracion({
			API_URL: `http://127.0.0.1:${servicio.httpServer.address().port}`,
			ALUMNOS: "4",
			PREGUNTAS: "2",
			ESCALA_TIEMPO: "0.3",
			SEMILLA: "11",
		});
		const resumen = await ejecutarPrueba(config, { banco, registro: () => {} });
		expect(resumen.comprobaciones.filter((c) => !c.correcto)).toEqual([]);
		expect(resumen.correcto).toBe(true);
		expect(resumen.ranking).toHaveLength(4);
		expect(resumen.respuestas.enviadas).toBe(8);
		expect(resumen.porCodigo[429]).toBeUndefined();
		expect(resumen.aciertos.ranking).toBe(resumen.aciertos.enviados);
	}, 60_000);
});
