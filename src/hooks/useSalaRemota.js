import { useCallback, useEffect, useRef, useState } from "react";
import { verSala } from "../api/salas.js";

export const INTERVALO_VISIBLE_MS = 1000;
export const INTERVALO_OCULTA_MS = 5000;

// Consulta la vista de la sala cada segundo con la pestaña visible y cada 5 s si no lo está,
// como OnlineApp del dominó. Sin WebSockets: la sesión secreta basta para volver a la sala.
export default function useSalaRemota({ codigo, sessionId }) {
	const [vista, setVista] = useState(null);
	const [error, setError] = useState(null);
	const [sesionInvalida, setSesionInvalida] = useState(false);
	const desfase = useRef(0);
	const consultarRef = useRef(() => {});
	// Cuenta las vistas aplicadas desde fuera (la respuesta de un envío). Si llega una mientras una
	// consulta sigue en vuelo, esa consulta es más antigua y se descarta. No se usa la hora del
	// servidor para ordenar: puede retroceder (NTP, cambio de máquina) y congelaría la pantalla.
	const versionExterna = useRef(0);

	const mostrar = useCallback((nueva) => {
		desfase.current = nueva.ahoraServidor - Date.now();
		setVista(nueva);
		setError(null);
	}, []);

	const aplicarVista = useCallback(
		(nueva) => {
			versionExterna.current++;
			mostrar(nueva);
		},
		[mostrar],
	);

	const ahoraServidor = useCallback(() => Date.now() + desfase.current, []);

	useEffect(() => {
		setVista(null);
		setError(null);
		setSesionInvalida(false);
		versionExterna.current = 0;
		if (!codigo || !sessionId) return undefined;

		let cancelado = false;
		let temporizador = null;
		let controlador = null;

		async function consultar() {
			clearTimeout(temporizador);
			controlador?.abort();
			const actual = new AbortController();
			controlador = actual;
			let espera =
				document.visibilityState === "visible" ? INTERVALO_VISIBLE_MS : INTERVALO_OCULTA_MS;
			const versionAlEmpezar = versionExterna.current;
			try {
				const nueva = await verSala(codigo, sessionId, { signal: actual.signal });
				if (cancelado || actual.signal.aborted) return;
				if (versionExterna.current === versionAlEmpezar) mostrar(nueva);
			} catch (fallo) {
				if (cancelado || actual.signal.aborted) return;
				setError(fallo);
				if (fallo.status === 401 || fallo.status === 404) {
					setSesionInvalida(true);
					return;
				}
				if (fallo.reintentarEnSegundos) {
					espera = Math.max(espera, fallo.reintentarEnSegundos * 1000);
				}
			}
			temporizador = setTimeout(consultar, espera);
		}

		function alCambiarVisibilidad() {
			if (document.visibilityState === "visible") consultar();
		}

		consultarRef.current = consultar;
		document.addEventListener("visibilitychange", alCambiarVisibilidad);
		consultar();
		return () => {
			cancelado = true;
			clearTimeout(temporizador);
			controlador?.abort();
			document.removeEventListener("visibilitychange", alCambiarVisibilidad);
		};
	}, [codigo, sessionId, mostrar]);

	const recargar = useCallback(() => consultarRef.current(), []);

	return {
		vista,
		error,
		sesionInvalida,
		reconectando: error !== null && !sesionInvalida,
		aplicarVista,
		recargar,
		ahoraServidor,
	};
}
