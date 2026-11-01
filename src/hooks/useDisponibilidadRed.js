import { useEffect, useState } from "react";
import { comprobarSalud } from "../api/salas.js";

// Comprueba GET /health al cargar (máximo 4 s) y, si falla, vuelve a intentarlo cada cierto tiempo.
export default function useDisponibilidadRed({ reintentoMs = 15000 } = {}) {
	const [estado, setEstado] = useState({ disponible: false, comprobada: false });

	useEffect(() => {
		let cancelado = false;
		let temporizador = null;

		async function comprobar() {
			const disponible = await comprobarSalud();
			if (cancelado) return;
			setEstado({ disponible, comprobada: true });
			if (!disponible) temporizador = setTimeout(comprobar, reintentoMs);
		}

		comprobar();
		return () => {
			cancelado = true;
			clearTimeout(temporizador);
		};
	}, [reintentoMs]);

	return estado;
}
