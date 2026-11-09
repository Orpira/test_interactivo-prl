import { useEffect, useState } from "react";
import { reglamentacion } from "../utils/reglamentacion.js";

// Carga el banco de preguntas de la reglamentación elegida y lo recarga si cambia.
export default function useBancoPreguntas(pais) {
	const [estado, setEstado] = useState({ pais, preguntas: [], cargando: true, error: "" });

	useEffect(() => {
		const controlador = new AbortController();
		setEstado({ pais, preguntas: [], cargando: true, error: "" });
		fetch(reglamentacion(pais).banco, { signal: controlador.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (!Array.isArray(data) || data.length === 0) {
					throw new Error("El banco de preguntas está vacío o no es válido");
				}
				setEstado({ pais, preguntas: data, cargando: false, error: "" });
			})
			.catch((error) => {
				if (controlador.signal.aborted) return;
				setEstado({
					pais,
					preguntas: [],
					cargando: false,
					error: `No se pudieron cargar las preguntas: ${error.message}`,
				});
			});
		return () => controlador.abort();
	}, [pais]);

	// Mientras llega el banco nuevo no se muestran las preguntas del país anterior.
	return estado.pais === pais ? estado : { pais, preguntas: [], cargando: true, error: "" };
}
