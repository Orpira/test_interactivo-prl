export const CLAVE_SESION = "prl-sala";

// sessionStorage puede no estar disponible (modo privado, políticas del navegador).
function almacenamiento() {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

export function guardarSesion({ codigo, sessionId, nombre }) {
	try {
		almacenamiento()?.setItem(CLAVE_SESION, JSON.stringify({ codigo, sessionId, nombre }));
	} catch {
		// Sin almacenamiento no se podrá recuperar la sala al recargar, pero se puede jugar.
	}
}

export function leerSesion() {
	try {
		const texto = almacenamiento()?.getItem(CLAVE_SESION);
		if (!texto) return null;
		const sesion = JSON.parse(texto);
		const valida =
			sesion &&
			typeof sesion.codigo === "string" &&
			typeof sesion.sessionId === "string" &&
			typeof sesion.nombre === "string";
		return valida ? sesion : null;
	} catch {
		return null;
	}
}

export function borrarSesion() {
	try {
		almacenamiento()?.removeItem(CLAVE_SESION);
	} catch {
		// Nada que borrar.
	}
}
