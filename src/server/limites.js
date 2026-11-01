// Ventana fija en memoria, como FixedWindowLimiter del dominó: basta para una sola instancia
// y se reinicia con el proceso.
export const LIMITES_POR_DEFECTO = Object.freeze({
	// Por sesión (Bearer): un alumno consultando cada segundo usa unas 60 por minuto.
	sesion: Object.freeze({ max: 240, ventanaMs: 60_000 }),
	crearSala: Object.freeze({ max: 30, ventanaMs: 60 * 60_000 }),
	// Una clase entera entra a la vez desde la misma IP del centro.
	unirse: Object.freeze({ max: 120, ventanaMs: 60_000 }),
	// Solo como protección: 30 alumnos consultando cada segundo son unas 1.800 por minuto.
	global: Object.freeze({ max: 6000, ventanaMs: 60_000 }),
});

export class LimitadorVentana {
	#limite;
	#ahora;
	#ventanas = new Map();

	constructor(limite, ahora = Date.now) {
		this.#limite = limite;
		this.#ahora = ahora;
	}

	// Cuenta la petición y dice si cabe en la ventana actual.
	tomar(clave) {
		const ventana = this.#actual(clave);
		if (ventana.cuenta >= this.#limite.max) {
			const restante = ventana.inicio + this.#limite.ventanaMs - this.#ahora();
			return { permitido: false, reintentarEnSegundos: Math.max(1, Math.ceil(restante / 1000)) };
		}
		ventana.cuenta++;
		return { permitido: true, reintentarEnSegundos: 0 };
	}

	#actual(clave) {
		const ahora = this.#ahora();
		let ventana = this.#ventanas.get(clave);
		if (!ventana || ahora - ventana.inicio >= this.#limite.ventanaMs) {
			this.#limpiar(ahora);
			ventana = { inicio: ahora, cuenta: 0 };
			this.#ventanas.set(clave, ventana);
		}
		return ventana;
	}

	#limpiar(ahora) {
		if (this.#ventanas.size < 10_000) return;
		for (const [clave, ventana] of this.#ventanas) {
			if (ahora - ventana.inicio >= this.#limite.ventanaMs) this.#ventanas.delete(clave);
		}
	}
}

// Con un proxy propio delante (Nginx Proxy Manager), el último salto de X-Forwarded-For
// lo añade ese proxy y no puede falsearlo el cliente. Sin proxy se ignora esa cabecera.
export function origenPeticion(request, trustProxy) {
	if (trustProxy) {
		const reenviado = request.headers["x-forwarded-for"];
		const valor = Array.isArray(reenviado) ? reenviado.join(",") : reenviado;
		const ultimo = valor
			?.split(",")
			.map((entrada) => entrada.trim())
			.filter(Boolean)
			.at(-1);
		if (ultimo) return ultimo;
		const real = request.headers["x-real-ip"];
		if (typeof real === "string" && real.trim()) return real.trim();
	}
	return request.socket.remoteAddress ?? "desconocido";
}
