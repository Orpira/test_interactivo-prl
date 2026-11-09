import { join } from "node:path";
import { AlmacenJson } from "./almacen.js";
import { crearServidorHttp, guardarSiCambio } from "./http.js";
import { GestorSalas } from "./nucleo.js";

const INTERVALO_TICK_MS = 500;
const INTERVALO_LIMPIEZA_MS = 10 * 60 * 1000;

// Une el gestor, el almacén en disco y el servidor HTTP. No llama a listen().
export async function crearServicio({
	preguntas,
	bancos = { es: preguntas },
	directorioDatos,
	allowedOrigins = ["http://localhost:5173"],
	trustProxy = false,
	limites,
	ahora = Date.now,
	retardoGuardadoMs,
	avisar = console.warn,
}) {
	const almacen = new AlmacenJson(join(directorioDatos, "salas.json"), {
		retardoMs: retardoGuardadoMs,
	});
	let gestor;
	try {
		const guardado = await almacen.cargar();
		gestor = guardado
			? GestorSalas.desdeJSON(guardado, { bancos, ahora })
			: new GestorSalas({ bancos, ahora });
	} catch (error) {
		// Un archivo ilegible no se sobrescribe en silencio: se aparta para poder revisarlo.
		avisar("No se pudieron restaurar las salas; se empieza vacío:", error.message);
		await almacen.apartarCorrupto?.();
		gestor = new GestorSalas({ bancos, ahora });
	}

	const httpServer = crearServidorHttp({ gestor, almacen, allowedOrigins, trustProxy, limites, ahora });

	const intervaloTick = setInterval(() => {
		gestor.tick();
		guardarSiCambio(gestor, almacen);
	}, INTERVALO_TICK_MS);
	const intervaloLimpieza = setInterval(() => {
		gestor.limpiar();
		guardarSiCambio(gestor, almacen);
	}, INTERVALO_LIMPIEZA_MS);
	intervaloTick.unref();
	intervaloLimpieza.unref();

	let cerrado = false;
	async function cerrar() {
		if (cerrado) return;
		cerrado = true;
		clearInterval(intervaloTick);
		clearInterval(intervaloLimpieza);
		await new Promise((resolve) => {
			httpServer.close(resolve);
			httpServer.closeAllConnections?.();
		});
		guardarSiCambio(gestor, almacen);
		await almacen.cerrar();
	}

	return { httpServer, gestor, almacen, cerrar };
}
