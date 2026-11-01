import { describe, expect, it } from "vitest";
import { LIMITES_POR_DEFECTO, LimitadorVentana, origenPeticion } from "./limites.js";

describe("LimitadorVentana", () => {
	it("permite hasta el máximo y luego indica cuándo reintentar", () => {
		let ahora = 1_000_000;
		const limitador = new LimitadorVentana({ max: 3, ventanaMs: 60_000 }, () => ahora);
		for (let i = 0; i < 3; i++) expect(limitador.tomar("a").permitido).toBe(true);
		ahora += 20_500;
		expect(limitador.tomar("a")).toEqual({ permitido: false, reintentarEnSegundos: 40 });
	});

	it("abre una ventana nueva al terminar la anterior", () => {
		let ahora = 0;
		const limitador = new LimitadorVentana({ max: 1, ventanaMs: 1000 }, () => ahora);
		expect(limitador.tomar("a").permitido).toBe(true);
		expect(limitador.tomar("a").permitido).toBe(false);
		ahora = 1000;
		expect(limitador.tomar("a").permitido).toBe(true);
	});

	it("cada clave tiene su propio contador", () => {
		const limitador = new LimitadorVentana({ max: 1, ventanaMs: 1000 }, () => 0);
		expect(limitador.tomar("a").permitido).toBe(true);
		expect(limitador.tomar("b").permitido).toBe(true);
		expect(limitador.tomar("a").permitido).toBe(false);
	});

	it("nunca pide esperar menos de un segundo", () => {
		let ahora = 0;
		const limitador = new LimitadorVentana({ max: 1, ventanaMs: 1000 }, () => ahora);
		limitador.tomar("a");
		ahora = 999;
		expect(limitador.tomar("a").reintentarEnSegundos).toBe(1);
	});

	it("los límites por defecto dan margen a una clase entera tras la misma IP", () => {
		const consultasPorMinuto = 30 * 60;
		expect(LIMITES_POR_DEFECTO.global.max).toBeGreaterThan(consultasPorMinuto);
		expect(LIMITES_POR_DEFECTO.sesion.max).toBeGreaterThanOrEqual(120);
		expect(LIMITES_POR_DEFECTO.unirse.max).toBeGreaterThanOrEqual(40);
		expect(LIMITES_POR_DEFECTO.crearSala).toEqual({ max: 30, ventanaMs: 3_600_000 });
	});
});

describe("origenPeticion", () => {
	const peticion = (cabeceras = {}, remota = "10.0.0.9") => ({
		headers: cabeceras,
		socket: { remoteAddress: remota },
	});

	it("sin proxy de confianza ignora las cabeceras reenviadas", () => {
		expect(origenPeticion(peticion({ "x-forwarded-for": "1.2.3.4" }), false)).toBe("10.0.0.9");
	});

	it("con proxy de confianza usa el último salto, que añadió el proxy", () => {
		expect(origenPeticion(peticion({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 1.2.3.4" }), true)).toBe("1.2.3.4");
		expect(origenPeticion(peticion({ "x-forwarded-for": ["6.6.6.6", "1.2.3.4"] }), true)).toBe("1.2.3.4");
	});

	it("recurre a X-Real-IP y después a la dirección del socket", () => {
		expect(origenPeticion(peticion({ "x-real-ip": " 5.5.5.5 " }), true)).toBe("5.5.5.5");
		expect(origenPeticion(peticion({}), true)).toBe("10.0.0.9");
		expect(origenPeticion(peticion({}, null), false)).toBe("desconocido");
	});
});
