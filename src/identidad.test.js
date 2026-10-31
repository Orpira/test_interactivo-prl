import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import configuracion from "../tailwind.config.js";

const { colors: colores, fontFamily: fuentes } = configuracion.theme.extend;

function luminancia(hex) {
	const rgb = hex.slice(1).match(/../g).map((canal) => {
		const valor = parseInt(canal, 16) / 255;
		return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
	});
	return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contraste(texto, fondo) {
	const valores = [luminancia(texto), luminancia(fondo)];
	return (Math.max(...valores) + 0.05) / (Math.min(...valores) + 0.05);
}

describe("identidad visual", () => {
	it.each([
		["display", "space-grotesk"],
		["mono", "jetbrains-mono"],
	])("usa la familia autoalojada de %s", (alias, paquete) => {
		const css = readFileSync(
			new URL(`../node_modules/@fontsource-variable/${paquete}/index.css`, import.meta.url),
			"utf8",
		);
		const familia = css.match(/font-family:\s*(['"])([^'"]+)\1/);
		expect(familia).not.toBeNull();
		expect(fuentes[alias][0]).toBe(`"${familia[2]}"`);
	});

	it("mantiene al menos 4,5:1 en las combinaciones de texto utilizadas", () => {
		const parejas = [
			[colores.ink.DEFAULT, colores.bg],
			[colores.ink.DEFAULT, colores.card],
			[colores.ink.soft, colores.surface],
			[colores.ink.muted, colores.bg],
			[colores.ink.muted, colores.card],
			[colores.card, colores.primary.DEFAULT],
			[colores.card, colores.primary.dark],
			[colores.ink.DEFAULT, colores.signal.DEFAULT],
			[colores.signal.ink, colores.bg],
			[colores.signal.ink, colores.card],
			[colores.ok.ink, colores.ok.bg],
			[colores.ok.ink, colores.surface],
			[colores.ko.ink, colores.ko.bg],
			[colores.ko.DEFAULT, colores.bg],
			[colores.ko.DEFAULT, colores.card],
		];
		for (const [texto, fondo] of parejas) {
			expect(contraste(texto, fondo), `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("mantiene un foco con al menos 3:1 sobre los fondos de la interfaz", () => {
		for (const fondo of [colores.bg, colores.card, colores.surface, colores.ink.DEFAULT]) {
			expect(contraste(colores.primary.DEFAULT, fondo), `Foco sobre ${fondo}`)
				.toBeGreaterThanOrEqual(3);
		}
	});
});
