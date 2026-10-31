import React, { useState, useCallback } from "react";
import Hero from "./components/Hero";
import QuizPRL from "./components/PreviewEditor";
import RankingSummary from "./components/RankingSummary";
import Footer from "./components/Footer";
import Sala from "./components/Sala";
import QuizOnline from "./components/QuizOnline";
import useSocket from "./hooks/useSocket";

export default function App() {
	const [resultados, setResultados] = useState([]);
	const [mostrarRanking, setMostrarRanking] = useState(false);
	const [sesion, setSesion] = useState(0);

	// Estado para modo en red
	const [modoRed, setModoRed] = useState(false);
	const [datosOnline, setDatosOnline] = useState(null); // {preguntas, codigoSala, nombre}

	const { socket, conectado, conexionComprobada } = useSocket();

	const agregarResultado = useCallback((resultado) => {
		setResultados((prev) => [...prev, resultado]);
	}, []);

	function iniciarNuevoRanking() {
		setResultados([]);
		setMostrarRanking(false);
		setSesion((prev) => prev + 1);
	}

	const handleTestIniciado = useCallback((datos) => {
		setDatosOnline(datos);
	}, []);

	function volverInicio() {
		socket?.emit("salir-sala", null);
		setModoRed(false);
		setDatosOnline(null);
	}

	return (
		<div>
			<Hero />

			{/* Modo En Red: sala + quiz online */}
			{modoRed && !datosOnline && (
				<Sala
					socket={socket}
					onTestIniciado={handleTestIniciado}
					onVolverInicio={volverInicio}
				/>
			)}
			{modoRed && datosOnline && (
				<QuizOnline
					socket={socket}
					preguntas={datosOnline.preguntas}
					nombre={datosOnline.nombre}
					codigoSala={datosOnline.codigoSala}
					timerConfig={datosOnline.timerConfig}
					onVolverInicio={volverInicio}
				/>
			)}

			{/* Modo local (individual / multijugador local) */}
			{!modoRed && (
				<>
					<QuizPRL
						key={sesion}
						onResultado={agregarResultado}
						resultados={resultados}
						setMostrarRanking={setMostrarRanking}
						onModoRed={() => setModoRed(true)}
						socketConectado={conectado}
						conexionComprobada={conexionComprobada}
					/>
					{mostrarRanking && (
						<RankingSummary
							resultados={resultados}
							onNuevo={iniciarNuevoRanking}
						/>
					)}
				</>
			)}

			<Footer />
		</div>
	);
}
