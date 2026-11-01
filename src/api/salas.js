// URL base de la API: vacía en local (mismo origen, con el proxy de Vite) y
// https://api-prl.orpira.es en producción.
function urlBase() {
	return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export class ErrorApi extends Error {
	constructor(mensaje, { code = "ERROR", status = 0, reintentarEnSegundos = null } = {}) {
		super(mensaje);
		this.name = "ErrorApi";
		this.code = code;
		this.status = status;
		this.reintentarEnSegundos = reintentarEnSegundos;
	}

	// Un corte de red o un fallo temporal del servidor se pueden reintentar con el mismo comando.
	get reintentable() {
		return this.status === 0 || this.status === 429 || this.status >= 500;
	}
}

async function llamar(metodo, ruta, { cuerpo, sesion, signal } = {}) {
	let respuesta;
	try {
		respuesta = await fetch(`${urlBase()}${ruta}`, {
			method: metodo,
			headers: {
				...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
				...(sesion ? { authorization: `Bearer ${sesion}` } : {}),
			},
			body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
			signal,
		});
	} catch (error) {
		if (error?.name === "AbortError") throw error;
		throw new ErrorApi("No hay conexión con el servidor", { code: "SIN_CONEXION" });
	}
	let datos = null;
	try {
		datos = await respuesta.json();
	} catch {
		datos = null;
	}
	if (!respuesta.ok) {
		throw new ErrorApi(datos?.mensaje || `Error ${respuesta.status} del servidor`, {
			code: datos?.code ?? "ERROR",
			status: respuesta.status,
			reintentarEnSegundos: Number(respuesta.headers.get("retry-after")) || null,
		});
	}
	return datos;
}

const ruta = (codigo) => `/api/salas/${encodeURIComponent(codigo)}`;

export const crearSala = (datos) => llamar("POST", "/api/salas", { cuerpo: datos });

export const unirseSala = (codigo, nombre) =>
	llamar("POST", `${ruta(codigo)}/unirse`, { cuerpo: { nombre } });

export const verSala = (codigo, sesion, { signal } = {}) =>
	llamar("GET", ruta(codigo), { sesion, signal });

export const iniciarSala = (codigo, sesion) =>
	llamar("POST", `${ruta(codigo)}/iniciar`, { sesion });

export const responder = (codigo, sesion, comando, { signal } = {}) =>
	llamar("POST", `${ruta(codigo)}/responder`, { cuerpo: comando, sesion, signal });

export const salirSala = (codigo, sesion) =>
	llamar("POST", `${ruta(codigo)}/salir`, { sesion });

// GET /health con un tiempo máximo; cualquier fallo cuenta como no disponible.
export async function comprobarSalud({ tiempoMaximoMs = 4000 } = {}) {
	const controlador = new AbortController();
	const temporizador = setTimeout(() => controlador.abort(), tiempoMaximoMs);
	try {
		const respuesta = await fetch(`${urlBase()}/health`, { signal: controlador.signal });
		return respuesta.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(temporizador);
	}
}
