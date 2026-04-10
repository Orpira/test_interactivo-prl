import React, { useState, useCallback } from "react";
import Hero from "./components/Hero";
import Features from "./components/Features";
import QuizPRL from "./components/PreviewEditor";
import RankingSummary from "./components/RankingSummary";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";
import Sala from "./components/Sala";
import QuizOnline from "./components/QuizOnline";
import useSocket from "./hooks/useSocket";

export default function App() {
	const [resultados, setResultados] = useState([]);
	const [mostrarRanking, setMostrarRanking] = useState(false);
	const [mostrarContacto, setMostrarContacto] = useState(false);

	// Estado para modo en red
	const [modoRed, setModoRed] = useState(false);
	const [datosOnline, setDatosOnline] = useState(null); // {preguntas, codigoSala, nombre}

	const { socket, conectado } = useSocket();

	function agregarResultado(resultado) {
		setResultados((prev) => [...prev, resultado]);
	}

	function iniciarNuevoRanking() {
		setResultados([]);
		setMostrarRanking(false);
	}

	const handleTestIniciado = useCallback((datos) => {
		setDatosOnline(datos);
	}, []);

	function volverInicio() {
		setModoRed(false);
		setDatosOnline(null);
	}

	return (
		<div>
			<Hero onContacto={() => setMostrarContacto(true)} />
			<Features />

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
						onResultado={agregarResultado}
						resultados={resultados}
						mostrarRanking={mostrarRanking}
						setMostrarRanking={setMostrarRanking}
						onModoRed={() => setModoRed(true)}
						socketConectado={conectado}
					/>
					{mostrarRanking && (
						<RankingSummary
							resultados={resultados}
							onNuevo={iniciarNuevoRanking}
						/>
					)}
				</>
			)}

			{mostrarContacto && (
				<ContactForm onClose={() => setMostrarContacto(false)} />
			)}
			<Footer />
		</div>
	);
}
