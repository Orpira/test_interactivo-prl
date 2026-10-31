import React, { useEffect, useRef, useState } from "react";
import { Timer, Trophy } from "lucide-react";

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
	const [respuestaCorrecta, setRespuestaCorrecta] = useState(null);
	const [aciertos, setAciertos] = useState(0);
	const [respondida, setRespondida] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [errorRespuesta, setErrorRespuesta] = useState("");
	const [esperandoResultado, setEsperandoResultado] = useState(false);
	const [finalizado, setFinalizado] = useState(false);
	const [ranking, setRanking] = useState([]);
	const [terminados, setTerminados] = useState(0);
	const [totalJugadores, setTotalJugadores] = useState(0);
	const [completo, setCompleto] = useState(false);
	const [tiempoRestante, setTiempoRestante] = useState(null);
	const indiceRef = useRef(indice);
	const aciertosRef = useRef(aciertos);
	const respondidaRef = useRef(respondida);
	const finalizadoRef = useRef(finalizado);
	const timeoutAvanceRef = useRef(null);
	const timeoutFinalRef = useRef(null);
	const opcionPendienteRef = useRef(null);
	indiceRef.current = indice;
	aciertosRef.current = aciertos;
	respondidaRef.current = respondida;
	finalizadoRef.current = finalizado;

	function cancelarTimeouts() {
		clearTimeout(timeoutAvanceRef.current);
		clearTimeout(timeoutFinalRef.current);
		timeoutAvanceRef.current = null;
		timeoutFinalRef.current = null;
	}

	function avanzarPregunta() {
		if (indiceRef.current + 1 >= preguntas.length) {
			setFinalizado(true);
			finalizadoRef.current = true;
			return;
		}
		const siguienteIndice = indiceRef.current + 1;
		setIndice(siguienteIndice);
		indiceRef.current = siguienteIndice;
		setSeleccion(null);
		setRespuestaCorrecta(null);
		setRespondida(false);
		respondidaRef.current = false;
		setErrorRespuesta("");
	}

	function programarCierreRanking() {
		clearTimeout(timeoutFinalRef.current);
		timeoutFinalRef.current = setTimeout(() => {
			setFinalizado(true);
			finalizadoRef.current = true;
			timeoutFinalRef.current = null;
		}, 1500);
	}

	useEffect(() => {
		if (!socket) return;
		function onRanking(data) {
			setRanking(data.ranking);
			setTerminados(data.terminados);
			setTotalJugadores(data.totalJugadores);
			setCompleto(data.completo);
			if (data.ranking.some((resultado) => resultado.id === socket.id)) {
				programarCierreRanking();
			}
		}

		socket.on("ranking-actualizado", onRanking);
		return () => socket.off("ranking-actualizado", onRanking);
	}, [socket]);

	useEffect(() => {
		if (
			finalizado ||
			!timerConfig.activo ||
			tiempoRestante === null ||
			tiempoRestante <= 0
		) {
			return;
		}
		const id = setTimeout(() => setTiempoRestante((prev) => prev - 1), 1000);
		return () => clearTimeout(id);
	}, [tiempoRestante, finalizado, timerConfig.activo]);

	useEffect(() => {
		if (finalizado || !timerConfig.activo || timerConfig.tipo !== "pregunta")
			return;
		setTiempoRestante(timerConfig.segundos);
	}, [indice, timerConfig, finalizado]);

	useEffect(() => {
		if (finalizado || !timerConfig.activo || timerConfig.tipo !== "test") return;
		setTiempoRestante(timerConfig.segundos);
	}, [timerConfig, finalizado]);

	function enviarRespuesta(opcion) {
		if (
			respondidaRef.current ||
			finalizadoRef.current ||
			!socket ||
			!preguntas[indiceRef.current]
		) {
			return;
		}
		respondidaRef.current = true;
		opcionPendienteRef.current = opcion;
		setEnviando(true);
		setErrorRespuesta("");
		if (timerConfig.tipo === "pregunta") setTiempoRestante(null);

		socket.timeout(5000).emit(
			"responder",
			{ indice: indiceRef.current, opcion },
			(error, respuesta) => {
				setEnviando(false);
				if (error || !respuesta?.ok) {
					respondidaRef.current = false;
					setErrorRespuesta(
						respuesta?.error || "No se pudo enviar la respuesta. Reinténtalo.",
					);
					return;
				}

				setSeleccion(opcion);
				opcionPendienteRef.current = null;
				setRespuestaCorrecta(respuesta.correcta);
				setRespondida(true);
				setErrorRespuesta("");
				if (respuesta.acierto) {
					setAciertos((prev) => prev + 1);
					aciertosRef.current++;
				}

				if (opcion === null && indiceRef.current + 1 < preguntas.length) {
					timeoutAvanceRef.current = setTimeout(() => {
						timeoutAvanceRef.current = null;
						avanzarPregunta();
					}, 2000);
				} else if (opcion === null) {
					timeoutFinalRef.current = setTimeout(() => {
						timeoutFinalRef.current = null;
						setFinalizado(true);
						finalizadoRef.current = true;
					}, 2000);
				}
			},
		);
	}

	useEffect(() => {
		if (
			tiempoRestante !== 0 ||
			!timerConfig.activo ||
			finalizadoRef.current ||
			respondidaRef.current
		) {
			return;
		}
		if (timerConfig.tipo === "pregunta") {
			enviarRespuesta(null);
		} else if (timerConfig.tipo === "test") {
			setEsperandoResultado(true);
		}
	}, [tiempoRestante, timerConfig]);

	useEffect(() => () => cancelarTimeouts(), []);

	const preguntaActual = preguntas[indice];

	function siguiente() {
		cancelarTimeouts();
		if (indice + 1 < preguntas.length) {
			avanzarPregunta();
		} else {
			cancelarTimeouts();
			setFinalizado(true);
			finalizadoRef.current = true;
		}
	}

	if (finalizado) {
		const miResultado = ranking.find((resultado) => resultado.id === socket.id);
		return (
			<section id="quiz" className="bg-bg px-4 py-10 md:p-12 text-center text-ink">
				<h2 className="text-4xl font-display mb-2 inline-flex items-center gap-3 justify-center">
					{completo ? (
						<>
							<Trophy aria-hidden="true" size={20} strokeWidth={1.75} />
							Ranking final
						</>
					) : (
						"Esperando a los demás…"
					)}
				</h2>
				<p className="text-ink-muted mb-6 font-mono text-sm">
					Sala {codigoSala} — {terminados}/{totalJugadores} han terminado
				</p>

				{miResultado && !completo && (
					<div className="max-w-md mx-auto bg-surface p-4 rounded-xl border border-line mb-4">
						<p className="text-lg">
							Tu resultado:{" "}
							<span className="font-mono font-bold text-ok-ink">
								{miResultado.porcentaje}%
							</span>{" "}
							<span className="font-mono">({miResultado.aciertos}/{miResultado.total})</span>
						</p>
					</div>
				)}

				{ranking.length > 0 && (
					<div className="w-full max-w-xl mx-auto overflow-x-auto border border-line rounded-xl bg-card">
						<table className="w-full">
							<thead>
								<tr className="bg-surface">
									<th className="p-3 text-left">#</th>
									<th className="p-3 text-left">Nombre</th>
									<th className="p-3 text-right">Aciertos</th>
									<th className="p-3 text-right">Puntuación</th>
								</tr>
							</thead>
							<tbody>
								{ranking.map((resultado, posicion) => (
									<tr
										key={resultado.id}
										className={`border-t border-line ${
											resultado.id === socket.id
												? "bg-surface font-bold"
												: ""
										}`}
									>
										<td className="p-3 font-mono font-bold">
											{completo
												? posicion === 0
													? "🥇"
													: posicion === 1
														? "🥈"
														: posicion === 2
															? "🥉"
															: posicion + 1
												: posicion + 1}
										</td>
										<td className="p-3">
											{resultado.nombre}{" "}
											{resultado.id === socket.id && "(tú)"}
										</td>
										<td className="p-3 text-right font-mono">
											{resultado.aciertos}/{resultado.total}
										</td>
										<td className="p-3 text-right font-mono font-semibold">
											{resultado.porcentaje}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{completo && (
					<div className="mt-6">
						<button
							onClick={onVolverInicio}
							className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition"
						>
							Nueva sesión
						</button>
					</div>
				)}
			</section>
		);
	}

	if (!preguntaActual) return null;

	return (
		<section id="quiz" className="bg-bg px-4 py-10 md:p-12 text-ink">
			<h2 className="text-4xl font-display mb-1 text-center">Test de PRL</h2>
			<p className="text-center text-sm text-ink-muted mb-1">
				{nombre} · Sala <span className="font-mono">{codigoSala}</span>
			</p>
			<p className="text-center text-sm text-ink-muted mb-4 font-mono">
				Pregunta {indice + 1} / {preguntas.length} ·{" "}
				<span className="font-semibold text-ok-ink">{aciertos} aciertos</span>
				{timerConfig.activo && tiempoRestante !== null && (
					<>
						{" "}
						·{" "}
						<span
							className={`font-mono font-bold ${
								tiempoRestante <= (timerConfig.tipo === "pregunta" ? 5 : 30)
									? "text-ko"
									: tiempoRestante <=
										  (timerConfig.tipo === "pregunta" ? 10 : 60)
										? "bg-signal text-ink rounded px-1"
										: "text-ink-soft"
							}`}
						>
							<Timer aria-hidden="true" size={20} strokeWidth={1.75} className="inline" />{" "}
							{formatearTiempo(tiempoRestante)}
						</span>
					</>
				)}
			</p>
			{esperandoResultado && (
				<p role="status" className="text-center text-ink-muted mb-4">
					Tiempo agotado. Calculando resultado…
				</p>
			)}
			{respondida && seleccion === null && tiempoRestante === 0 && (
				<p className="text-center text-ko font-semibold mb-2">
					<Timer aria-hidden="true" size={20} strokeWidth={1.75} className="inline" /> ¡Tiempo
					agotado!
				</p>
			)}
			<div className="max-w-2xl mx-auto bg-card p-5 md:p-8 rounded-2xl border border-line shadow-sm">
				<span className="inline-block bg-surface text-ink-soft text-xs font-mono px-2 py-1 rounded mb-3">
					{preguntaActual.categoria}
				</span>
				<p className="font-semibold text-lg mb-4">{preguntaActual.pregunta}</p>
				<div className="grid gap-3">
					{preguntaActual.opciones.map((opcion, indiceOpcion) => {
						let estilo =
							"border p-3 rounded-xl cursor-pointer transition text-left w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
						if (respondida) {
							if (indiceOpcion === respuestaCorrecta) {
								estilo += " bg-ok-bg border-ok text-ok-ink";
							} else if (indiceOpcion === seleccion) {
								estilo += " bg-ko-bg border-ko text-ko-ink";
							} else {
								estilo += " border-line text-ink-muted";
							}
						} else if (indiceOpcion === seleccion) {
							estilo += " border-primary bg-surface";
						} else {
							estilo += " border-line hover:bg-surface";
						}
						return (
							<button
								key={indiceOpcion}
								type="button"
								disabled={respondida || enviando || esperandoResultado}
								className={estilo}
								onClick={() => enviarRespuesta(indiceOpcion)}
							>
								<span className="font-semibold mr-2">
									{String.fromCharCode(65 + indiceOpcion)}.
								</span>
								{opcion}
							</button>
						);
					})}
				</div>
				{errorRespuesta && (
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
						<p role="alert" className="text-ko text-sm">
							{errorRespuesta}
						</p>
						<button
							type="button"
							onClick={() => enviarRespuesta(opcionPendienteRef.current)}
							className="underline text-sm text-ink-soft"
						>
							Reintentar
						</button>
					</div>
				)}
				{respondida && seleccion !== null && (
					<div className="mt-4 text-right">
						<button
							onClick={siguiente}
							className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg font-semibold transition"
						>
							{indice + 1 < preguntas.length
								? "Siguiente →"
								: "Ver resultado"}
						</button>
					</div>
				)}
			</div>
		</section>
	);
}
