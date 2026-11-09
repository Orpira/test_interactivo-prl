import React, { useState, useCallback } from "react";
import Hero from "./components/Hero";
import QuizPRL from "./components/PreviewEditor";
import RankingSummary from "./components/RankingSummary";
import Footer from "./components/Footer";
import ModoRed from "./components/ModoRed";
import Normativa from "./components/Normativa";
import useDisponibilidadRed from "./hooks/useDisponibilidadRed";
import { leerSesion } from "./api/sesion";
import { guardarReglamentacion, leerReglamentacion, reglamentacion } from "./utils/reglamentacion";

export default function App() {
	const [resultados, setResultados] = useState([]);
	const [mostrarRanking, setMostrarRanking] = useState(false);
	const [sesion, setSesion] = useState(0);
	const [pais, setPais] = useState(leerReglamentacion);

	const cambiarPais = useCallback((nuevo) => {
		setPais(nuevo);
		guardarReglamentacion(nuevo);
	}, []);

	// Si quedó una sala guardada (recarga o móvil bloqueado), se vuelve directamente a ella.
	const [recuperando, setRecuperando] = useState(() => leerSesion() !== null);
	const [modoRed, setModoRed] = useState(recuperando);

	const { disponible, comprobada } = useDisponibilidadRed();

	const agregarResultado = useCallback((resultado) => {
		setResultados((prev) => [...prev, resultado]);
	}, []);

	function iniciarNuevoRanking() {
		setResultados([]);
		setMostrarRanking(false);
		setSesion((prev) => prev + 1);
	}

	const abrirModoRed = useCallback(() => {
		setRecuperando(false);
		setModoRed(true);
	}, []);

	const volverInicio = useCallback(() => {
		setRecuperando(false);
		setModoRed(false);
	}, []);

	return (
		<div>
			<Hero />

			{/* Modo En Red: sala, test y ranking según la vista que da el servidor */}
			{modoRed && (
				<ModoRed
					recuperando={recuperando}
					onVolverInicio={volverInicio}
					pais={pais}
					onCambiarPais={cambiarPais}
				/>
			)}

			{/* Modo local (individual / multijugador local) */}
			{!modoRed && (
				<>
					<QuizPRL
						key={sesion}
						pais={pais}
						onCambiarPais={cambiarPais}
						onResultado={agregarResultado}
						resultados={resultados}
						setMostrarRanking={setMostrarRanking}
						onModoRed={abrirModoRed}
						redDisponible={disponible}
						conexionComprobada={comprobada}
					/>
					{mostrarRanking && (
						<RankingSummary
							resultados={resultados}
							onNuevo={iniciarNuevoRanking}
							siglas={reglamentacion(pais).siglas}
						/>
					)}
				</>
			)}

			<Normativa pais={pais} onCambiarPais={cambiarPais} />

			<Footer />
		</div>
	);
}
