import React, { useCallback, useEffect, useState } from "react";
import { iniciarSala, salirSala } from "../api/salas.js";
import { borrarSesion, guardarSesion, leerSesion } from "../api/sesion.js";
import useSalaRemota from "../hooks/useSalaRemota.js";
import QuizOnline from "./QuizOnline.jsx";
import Sala from "./Sala.jsx";

// `recuperando` indica que el modo en red se abrió solo, al encontrar una sesión guardada.
export default function ModoRed({ onVolverInicio, recuperando = false }) {
	const [sesion, setSesion] = useState(() => leerSesion());
	const [aviso, setAviso] = useState("");
	const { vista, sesionInvalida, reconectando, aplicarVista, recargar, ahoraServidor } =
		useSalaRemota({ codigo: sesion?.codigo, sessionId: sesion?.sessionId });

	useEffect(() => {
		if (!sesionInvalida) return;
		borrarSesion();
		setSesion(null);
		if (recuperando) onVolverInicio();
		else setAviso("La sala ya no existe o tu sesión caducó. Crea una nueva o únete de nuevo.");
	}, [sesionInvalida, recuperando, onVolverInicio]);

	const entrar = useCallback((nueva) => {
		guardarSesion(nueva);
		setAviso("");
		setSesion(nueva);
	}, []);

	const salir = useCallback(() => {
		const actual = sesion;
		borrarSesion();
		setSesion(null);
		// Salir avisa al servidor, pero no depende de que responda.
		if (actual) salirSala(actual.codigo, actual.sessionId).catch(() => {});
	}, [sesion]);

	const volverInicio = useCallback(() => {
		salir();
		onVolverInicio();
	}, [salir, onVolverInicio]);

	async function iniciar() {
		aplicarVista(await iniciarSala(sesion.codigo, sesion.sessionId));
	}

	if (!sesion) {
		return <Sala aviso={aviso} onEntrar={entrar} onVolverInicio={onVolverInicio} />;
	}

	if (!vista) {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<p role="status" className="text-lg">
					{reconectando
						? "No hay conexión con el servidor. Reintentando…"
						: "Recuperando tu sala…"}
				</p>
				<button onClick={volverInicio} className="mt-4 text-ink-muted underline text-sm">
					Salir de la sala
				</button>
			</section>
		);
	}

	if (vista.estado === "ESPERANDO") {
		return (
			<Sala
				vista={vista}
				reconectando={reconectando}
				onIniciar={iniciar}
				onSalir={salir}
				onVolverInicio={volverInicio}
			/>
		);
	}

	return (
		<QuizOnline
			vista={vista}
			sesion={sesion}
			ahoraServidor={ahoraServidor}
			aplicarVista={aplicarVista}
			recargar={recargar}
			reconectando={reconectando}
			onSalir={salir}
		/>
	);
}
