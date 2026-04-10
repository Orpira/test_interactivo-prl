import React, { useState, useEffect, useRef } from "react";

function formatearTiempo(segundos) {
	if (segundos === null || segundos === undefined) return "";
	const min = Math.floor(segundos / 60);
	const seg = segundos % 60;
	return `${min}:${seg.toString().padStart(2, "0")}`;
}

export default function QuizOnline({
	socket,
	preguntas,
	nombre,
	codigoSala,
	timerConfig: timerConfigProp,
	onVolverInicio,
}) {
	const timerConfig = timerConfigProp || {
		activo: false,
		tipo: null,
		segundos: null,
	};
	const [indice, setIndice] = useState(0);
	const [seleccion, setSeleccion] = useState(null);
	const [aciertos, setAciertos] = useState(0);
	const [respondida, setRespondida] = useState(false);
	const [finalizado, setFinalizado] = useState(false);
	const [ranking, setRanking] = useState([]);
	const [terminados, setTerminados] = useState(0);
	const [totalJugadores, setTotalJugadores] = useState(0);
	const [completo, setCompleto] = useState(false);
	const [tiempoRestante, setTiempoRestante] = useState(null);

	// Refs para acceso en callbacks del timer
	const indiceRef = useRef(0);
	const aciertosRef = useRef(0);
	const respondidaRef = useRef(false);
	const finalizadoRef = useRef(false);
	indiceRef.current = indice;
	aciertosRef.current = aciertos;
	respondidaRef.current = respondida;
	finalizadoRef.current = finalizado;

	useEffect(() => {
		if (!socket) return;

		function onRanking(data) {
			setRanking(data.ranking);
			setTerminados(data.terminados);
			setTotalJugadores(data.totalJugadores);
			setCompleto(data.completo);
		}

		socket.on("ranking-actualizado", onRanking);
		return () => socket.off("ranking-actualizado", onRanking);
	}, [socket]);

	// --- TIMER EFFECTS ---

	// Cuenta atrás
	useEffect(() => {
		if (
			finalizado ||
			!timerConfig.activo ||
			tiempoRestante === null ||
			tiempoRestante <= 0
		)
			return;
		const id = setTimeout(() => setTiempoRestante((prev) => prev - 1), 1000);
		return () => clearTimeout(id);
	}, [tiempoRestante, finalizado, timerConfig.activo]);

	// Por pregunta: reiniciar timer en cada pregunta nueva
	useEffect(() => {
		if (finalizado || !timerConfig.activo || timerConfig.tipo !== "pregunta")
			return;
		setTiempoRestante(timerConfig.segundos);
	}, [indice, timerConfig, finalizado]);

	// Por test: iniciar timer una sola vez
	useEffect(() => {
		if (!timerConfig.activo || timerConfig.tipo !== "test") return;
		setTiempoRestante(timerConfig.segundos);
	}, [timerConfig]);

	// Timer llega a cero
	useEffect(() => {
		if (tiempoRestante !== 0 || !timerConfig.activo || finalizadoRef.current)
			return;

		if (timerConfig.tipo === "pregunta" && !respondidaRef.current) {
			setRespondida(true);
			const timeout = setTimeout(() => {
				if (indiceRef.current + 1 < preguntas.length) {
					setIndice((prev) => prev + 1);
					setSeleccion(null);
					setRespondida(false);
				} else {
					const porcentaje = Math.round(
						(aciertosRef.current / preguntas.length) * 100,
					);
					setFinalizado(true);
					socket.emit("enviar-resultado", {
						aciertos: aciertosRef.current,
						total: preguntas.length,
						porcentaje,
					});
				}
			}, 2000);
			return () => clearTimeout(timeout);
		}

		if (timerConfig.tipo === "test") {
			const currentAciertos = aciertosRef.current;
			const porcentaje = Math.round((currentAciertos / preguntas.length) * 100);
			setFinalizado(true);
			socket.emit("enviar-resultado", {
				aciertos: currentAciertos,
				total: preguntas.length,
				porcentaje,
			});
		}
	}, [tiempoRestante, timerConfig, preguntas, socket]);

	const preguntaActual = preguntas[indice];

	function seleccionarOpcion(idx) {
		if (respondida) return;
		setSeleccion(idx);
		setRespondida(true);
		if (timerConfig.activo && timerConfig.tipo === "pregunta") {
			setTiempoRestante(null);
		}
		if (idx === preguntaActual.respuesta) {
			setAciertos((prev) => prev + 1);
		}
	}

	function siguiente() {
		if (indice + 1 < preguntas.length) {
			setIndice((prev) => prev + 1);
			setSeleccion(null);
			setRespondida(false);
		} else {
			const totalAciertos =
				aciertos + (seleccion === preguntaActual.respuesta ? 0 : 0);
			const porcentaje = Math.round((aciertos / preguntas.length) * 100);
			setFinalizado(true);
			socket.emit("enviar-resultado", {
				aciertos,
				total: preguntas.length,
				porcentaje,
			});
		}
	}

	// --- PANTALLA: Ranking en vivo ---
	if (finalizado) {
		const miResultado = ranking.find((r) => r.nombre === nombre);
		return (
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-3xl font-bold mb-2">
					{completo ? "🏆 Ranking Final" : "⏳ Esperando a los demás…"}
				</h2>
				<p className="text-gray-500 mb-4">
					Sala {codigoSala} — {terminados}/{totalJugadores} han terminado
				</p>

				{miResultado && !completo && (
					<div className="max-w-md mx-auto bg-white p-4 rounded-xl shadow mb-4">
						<p className="text-lg">
							Tu resultado:{" "}
							<span className="font-bold text-green-700">
								{miResultado.porcentaje}%
							</span>{" "}
							({miResultado.aciertos}/{miResultado.total})
						</p>
					</div>
				)}

				{ranking.length > 0 && (
					<table className="w-full max-w-xl mx-auto border bg-white">
						<thead>
							<tr className="bg-green-100">
								<th className="p-2 text-left">#</th>
								<th className="p-2 text-left">Nombre</th>
								<th className="p-2 text-right">Aciertos</th>
								<th className="p-2 text-right">Puntuación</th>
							</tr>
						</thead>
						<tbody>
							{ranking.map((r, i) => (
								<tr
									key={i}
									className={`border-t ${
										r.nombre === nombre ? "bg-blue-50 font-bold" : ""
									} ${i === 0 && completo ? "bg-yellow-50" : ""}`}
								>
									<td className="p-2 font-bold">
										{completo
											? i === 0
												? "🥇"
												: i === 1
													? "🥈"
													: i === 2
														? "🥉"
														: i + 1
											: i + 1}
									</td>
									<td className="p-2">
										{r.nombre} {r.nombre === nombre && "(tú)"}
									</td>
									<td className="p-2 text-right">
										{r.aciertos}/{r.total}
									</td>
									<td className="p-2 text-right font-semibold">
										{r.porcentaje}%
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}

				{completo && (
					<div className="mt-6">
						<button
							onClick={onVolverInicio}
							className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
						>
							Nueva sesión
						</button>
					</div>
				)}
			</section>
		);
	}

	// --- PANTALLA: Test en curso ---
	return (
		<section id="quiz" className="bg-gray-100 p-6">
			<h2 className="text-2xl font-bold mb-1 text-center">Test de PRL</h2>
			<p className="text-center text-sm text-gray-400 mb-1">
				{nombre} · Sala {codigoSala}
			</p>
			<p className="text-center text-sm text-gray-500 mb-4">
				Pregunta {indice + 1} de {preguntas.length} &middot;{" "}
				<span className="font-semibold text-green-700">
					{aciertos} aciertos
				</span>
				{timerConfig.activo && tiempoRestante !== null && (
					<>
						{" "}
						&middot;{" "}
						<span
							className={`font-mono font-bold ${
								tiempoRestante <= (timerConfig.tipo === "pregunta" ? 5 : 30)
									? "text-red-600 animate-pulse"
									: tiempoRestante <=
										  (timerConfig.tipo === "pregunta" ? 10 : 60)
										? "text-orange-600"
										: "text-gray-700"
							}`}
						>
							⏱️ {formatearTiempo(tiempoRestante)}
						</span>
					</>
				)}
			</p>
			{respondida && seleccion === null && tiempoRestante === 0 && (
				<p className="text-center text-red-600 font-semibold mb-2">
					⏱️ ¡Tiempo agotado!
				</p>
			)}
			<div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
				<span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded mb-3">
					{preguntaActual.categoria}
				</span>
				<p className="font-semibold text-lg mb-4">{preguntaActual.pregunta}</p>
				<div className="grid gap-3">
					{preguntaActual.opciones.map((opcion, idx) => {
						let estilo =
							"border p-3 rounded-lg cursor-pointer transition text-left";
						if (respondida) {
							if (idx === preguntaActual.respuesta) {
								estilo += " bg-green-100 border-green-500 text-green-800";
							} else if (idx === seleccion) {
								estilo += " bg-red-100 border-red-500 text-red-800";
							} else {
								estilo += " opacity-50";
							}
						} else if (idx === seleccion) {
							estilo += " border-blue-500 bg-blue-50";
						} else {
							estilo += " hover:bg-gray-50";
						}
						return (
							<button
								key={idx}
								className={estilo}
								onClick={() => seleccionarOpcion(idx)}
							>
								<span className="font-semibold mr-2">
									{String.fromCharCode(65 + idx)}.
								</span>
								{opcion}
							</button>
						);
					})}
				</div>
				{respondida && (
					<div className="mt-4 text-right">
						<button
							onClick={siguiente}
							className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-800 transition"
						>
							{indice + 1 < preguntas.length ? "Siguiente →" : "Finalizar test"}
						</button>
					</div>
				)}
			</div>
		</section>
	);
}
