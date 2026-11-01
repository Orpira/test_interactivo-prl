import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AlmacenJson } from "./almacen.js";

let directorio;
let ruta;

beforeEach(async () => {
	directorio = await mkdtemp(join(tmpdir(), "prl-almacen-"));
	ruta = join(directorio, "datos", "salas.json");
});

afterEach(async () => {
	await rm(directorio, { recursive: true, force: true });
});

describe("AlmacenJson", () => {
	it("guarda y carga, creando el directorio si no existe", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		const datos = { version: 1, salas: [{ codigo: "PRL-0001", tildes: "ñ" }] };
		await almacen.guardar(datos);
		expect(await new AlmacenJson(ruta).cargar()).toEqual(datos);
	});

	it("devuelve null si el archivo no existe", async () => {
		expect(await new AlmacenJson(ruta).cargar()).toBeNull();
	});

	it("escribe con modo 0o600 y no deja el archivo temporal", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		await almacen.guardar({ a: 1 });
		const permisos = (await stat(ruta)).mode & 0o777;
		expect(permisos).toBe(0o600);
		expect(await readdir(join(directorio, "datos"))).toEqual(["salas.json"]);
	});

	it("un archivo .tmp a medias no rompe la carga: sigue el archivo anterior", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		await almacen.guardar({ version: 1, estado: "bueno" });
		await writeFile(`${ruta}.tmp`, '{"version":1,"estado":"a me', "utf8");
		expect(await new AlmacenJson(ruta).cargar()).toEqual({ version: 1, estado: "bueno" });
		await almacen.guardar({ version: 1, estado: "nuevo" });
		expect(await new AlmacenJson(ruta).cargar()).toEqual({ version: 1, estado: "nuevo" });
		expect(await readdir(join(directorio, "datos"))).toEqual(["salas.json"]);
	});

	it("dos guardados seguidos dejan el último", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		const primero = almacen.guardar({ n: 1 });
		const segundo = almacen.guardar({ n: 2 });
		await Promise.all([primero, segundo]);
		expect(await new AlmacenJson(ruta).cargar()).toEqual({ n: 2 });
	});

	it("agrupa los guardados: muchas llamadas seguidas hacen una sola escritura", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 30 });
		const promesas = Array.from({ length: 20 }, (_, n) => almacen.guardar({ n }));
		await Promise.all(promesas);
		expect(almacen.escrituras).toBe(1);
		expect(await new AlmacenJson(ruta).cargar()).toEqual({ n: 19 });
		await almacen.guardar({ n: 20 });
		expect(almacen.escrituras).toBe(2);
	});

	it("guarda lo que había al llamar, aunque el objeto cambie después", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		const datos = { lista: [1] };
		const promesa = almacen.guardar(datos);
		datos.lista.push(2);
		await promesa;
		expect(await new AlmacenJson(ruta).cargar()).toEqual({ lista: [1] });
	});

	it("cerrar escribe de inmediato lo pendiente, sin esperar al temporizador", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 60_000 });
		const promesa = almacen.guardar({ pendiente: true });
		await almacen.cerrar();
		await promesa;
		expect(JSON.parse(await readFile(ruta, "utf8"))).toEqual({ pendiente: true });
	});

	it("cerrar sin nada pendiente no falla ni escribe", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		await almacen.cerrar();
		expect(almacen.escrituras).toBe(0);
		expect(await almacen.cargar()).toBeNull();
	});

	it("un archivo corrupto falla al cargar para no sobrescribirlo sin avisar", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		await almacen.guardar({ ok: true });
		await writeFile(ruta, "{roto", "utf8");
		await expect(almacen.cargar()).rejects.toThrow(SyntaxError);
	});

	it("apartarCorrupto conserva el archivo ilegible con otro nombre y deja la ruta libre", async () => {
		const almacen = new AlmacenJson(ruta, { retardoMs: 10 });
		expect(await almacen.apartarCorrupto(1)).toBeNull();
		await almacen.guardar({ ok: true });
		await writeFile(ruta, "{roto", "utf8");
		const destino = await almacen.apartarCorrupto(123);
		expect(destino).toBe(`${ruta}.corrupto-123`);
		expect(await readFile(destino, "utf8")).toBe("{roto");
		expect(await almacen.cargar()).toBeNull();
	});

	it("un fallo de escritura rechaza la promesa y no bloquea los guardados siguientes", async () => {
		await writeFile(join(directorio, "es-un-archivo"), "x");
		const almacen = new AlmacenJson(join(directorio, "es-un-archivo", "salas.json"), { retardoMs: 10 });
		await expect(almacen.guardar({ a: 1 })).rejects.toThrow();
		await expect(almacen.guardar({ a: 2 })).rejects.toThrow();
		await expect(almacen.cerrar()).resolves.toBeUndefined();
	});
});
