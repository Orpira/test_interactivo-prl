import { mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname } from "node:path";

export const RETARDO_GUARDADO_MS = 250;

// Como JsonFileMatchStore del dominó: escritura atómica (.tmp + rename) con modo 0o600.
export class AlmacenJson {
	#ruta;
	#retardoMs;
	#cola = Promise.resolve();
	#pendiente = null;
	#temporizador = null;
	// Número de escrituras reales a disco; sirve para comprobar el agrupado.
	escrituras = 0;

	constructor(ruta, { retardoMs = RETARDO_GUARDADO_MS } = {}) {
		this.#ruta = ruta;
		this.#retardoMs = retardoMs;
	}

	// Devuelve null si el archivo no existe. Un JSON roto lanza el error al llamador.
	async cargar() {
		let texto;
		try {
			texto = await readFile(this.#ruta, "utf8");
		} catch (error) {
			if (error.code === "ENOENT") return null;
			throw error;
		}
		return JSON.parse(texto);
	}

	// Aparta un archivo ilegible (conservándolo para revisarlo) y devuelve la nueva ruta.
	async apartarCorrupto(ahora = Date.now()) {
		const destino = `${this.#ruta}.corrupto-${ahora}`;
		try {
			await rename(this.#ruta, destino);
		} catch (error) {
			if (error.code === "ENOENT") return null;
			throw error;
		}
		return destino;
	}

	// Serializa en el momento de la llamada (los cambios posteriores no se mezclan) y agrupa:
	// como mucho una escritura cada retardoMs, con el último estado. Se resuelve al escribirse.
	guardar(datos) {
		const texto = JSON.stringify(datos);
		if (!this.#pendiente) this.#pendiente = { texto, esperas: [] };
		else this.#pendiente.texto = texto;
		const promesa = new Promise((resolve, reject) => {
			this.#pendiente.esperas.push({ resolve, reject });
		});
		if (!this.#temporizador) {
			this.#temporizador = setTimeout(() => this.#volcar(), this.#retardoMs);
			this.#temporizador.unref?.();
		}
		return promesa;
	}

	#volcar() {
		clearTimeout(this.#temporizador);
		this.#temporizador = null;
		const pendiente = this.#pendiente;
		this.#pendiente = null;
		if (!pendiente) return;
		// Las escrituras se encadenan: dos guardados nunca se cruzan.
		const escritura = this.#cola.then(() => this.#escribir(pendiente.texto));
		this.#cola = escritura.catch(() => {});
		escritura.then(
			() => pendiente.esperas.forEach(({ resolve }) => resolve()),
			(error) => pendiente.esperas.forEach(({ reject }) => reject(error)),
		);
	}

	async #escribir(texto) {
		const temporal = `${this.#ruta}.tmp`;
		await mkdir(dirname(this.#ruta), { recursive: true });
		const archivo = await open(temporal, "w", 0o600);
		try {
			await archivo.writeFile(texto, "utf8");
			await archivo.sync();
		} finally {
			await archivo.close();
		}
		await rename(temporal, this.#ruta);
		this.escrituras++;
	}

	// Escribe ya lo pendiente y espera a que termine la cola.
	async vaciar() {
		this.#volcar();
		await this.#cola;
	}

	// Para el cierre limpio: guarda antes de salir lo que quedara pendiente.
	async cerrar() {
		await this.vaciar();
	}
}
