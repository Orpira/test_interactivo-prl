import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (ruta) => readFileSync(resolve(raiz, ruta), "utf8");

// Lee ancho y alto de la cabecera IHDR de un PNG.
function tamanoPng(ruta) {
	const b = readFileSync(resolve(raiz, ruta));
	return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const manifiesto = JSON.parse(leer("public/manifest.webmanifest"));
const html = leer("index.html");

describe("instalación en pantalla de inicio", () => {
	it("el manifiesto declara nombre, inicio y colores de la identidad", () => {
		expect(manifiesto.short_name).toBe("PRL Master");
		expect(manifiesto.display).toBe("standalone");
		expect(manifiesto.start_url).toBe("/");
		expect(manifiesto.theme_color).toBe("#0F766E");
		expect(manifiesto.background_color).toBe("#F4F7F6");
	});

	it("cada icono del manifiesto existe y tiene el tamaño declarado", () => {
		for (const icono of manifiesto.icons) {
			const ruta = `public${icono.src}`;
			expect(existsSync(resolve(raiz, ruta)), ruta).toBe(true);
			if (icono.type === "image/png") {
				const [ancho, alto] = icono.sizes.split("x").map(Number);
				expect(tamanoPng(ruta), ruta).toEqual([ancho, alto]);
			}
		}
	});

	it("hay iconos de 192 y 512 px y uno maskable", () => {
		const png = manifiesto.icons.filter((i) => i.type === "image/png");
		expect(png.map((i) => i.sizes)).toEqual(
			expect.arrayContaining(["192x192", "512x512"]),
		);
		expect(png.some((i) => i.purpose === "maskable")).toBe(true);
	});

	it("index.html enlaza favicon, apple-touch-icon y manifiesto existentes", () => {
		for (const enlace of [
			"/favicon.svg",
			"/favicon.ico",
			"/apple-touch-icon.png",
			"/manifest.webmanifest",
		]) {
			expect(html).toContain(`href="${enlace}"`);
			expect(statSync(resolve(raiz, `public${enlace}`)).size).toBeGreaterThan(0);
		}
		expect(tamanoPng("public/apple-touch-icon.png")).toEqual([180, 180]);
		expect(html).toContain('name="theme-color" content="#0F766E"');
	});
});
