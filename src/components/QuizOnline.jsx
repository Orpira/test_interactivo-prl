import React, { useCallback, useEffect, useRef, useState } from "react";
import { reglamentacion } from "../utils/reglamentacion.js";
import { Timer, Trophy } from "lucide-react";
import { responder as apiResponder } from "../api/salas.js";

// Un reenvío por un corte de red usa siempre el mismo comandoId: no cuenta dos veces.
export const ESPERAS_REINTENTO_MS = [1000, 2000, 4000];
export const AVANCE_AUTOMATICO_MS = 2500;

function formatearTiempo(segundos) {
	if (segundos === null || segundos === undefined) return "";
	const min = Math.floor(segundos / 60);
	const seg = segundos % 60;
	return `${min}:${seg.toString().padStart(2, "0")}`;
}

// randomUUID solo existe en contextos seguros (https o localhost); en una red local por http no.
export function generarComandoId() {
	const criptografia = globalThis.crypto;
	if (criptografia?.randomUUID) return criptografia.randomUUID();
	const bytes = new Uint8Array(16);
	if (criptografia?.getRandomValues) criptografia.getRandomValues(bytes);
	else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reconstruirRespuesta(vista, indice) {
	const respuesta = vista.progreso.respuestas.find((r) => r.indice === indice);
	if (!respuesta) return null;
	return {
		indice,
		seleccion: respuesta.opcion,
		correcta: respuesta.correcta,
		acierto: respuesta.acierto,
		fueraDeTiempo: false,
	};
}

export default function QuizOnline({
	vista,
	sesion,
	ahoraServidor,
	aplicarVista,
	recargar,
	reconectando = false,
	onSalir,
}) {
	const [mostrando, setMostrando] = useState(null);
	const [opcionPendiente, setOpcionPendiente] = useState(null);
	const [enviando, setEnviando] = useState(false);
	const [reintentando, setReintentando] = useState(false);
	const [errorRespuesta, setErrorRespuesta] = useState("");
	const [, setLatido] = useState(0);
	const enviandoRef = useRef(false);
	const montado = useRef(true);
	const comandoPendiente = useRef(null);
	const preguntasConocidas = useRef([]);

	useEffect(() => {
		montado.current = true;
		return () => {
			montado.current = false;
		};
	}, []);

	if (vista.preguntas) preguntasConocidas.current = vista.preguntas;
	const preguntas = vista.preguntas ?? preguntasConocidas.current;
	const total = vista.totalPreguntas;
	const siguiente = vista.progreso.siguiente;
	const terminadoServidor = vista.progreso.terminado || siguiente >= total;
	const timerConfig = vista.timerConfig;
	const hasta = vista.limite.hasta;

	// El reloj se repinta cada 250 ms; el servidor es quien decide cuándo vence el tiempo.
	useEffect(() => {
		if (hasta === null) return undefined;
		const id = setInterval(() => setLatido((valor) => valor + 1), 250);
		return () => clearInterval(id);
	}, [hasta]);

	// Si un envío falló tras los reintentos pero el servidor sí lo procesó, se recupera su resultado.
	useEffect(() => {
		const pendiente = comandoPendiente.current;
		if (!pendiente || siguiente <= pendiente.indice) return;
		comandoPendiente.current = null;
		setErrorRespuesta("");
		setMostrando(reconstruirRespuesta(vista, pendiente.indice));
	}, [vista, siguiente]);

	const avanzar = useCallback(() => setMostrando(null), []);

	useEffect(() => {
		if (!mostrando || timerConfig.tipo !== "pregunta") return undefined;
		const id = setTimeout(avanzar, AVANCE_AUTOMATICO_MS);
		return () => clearTimeout(id);
	}, [mostrando, timerConfig.tipo, avanzar]);

	async function enviarConReintentos(comando) {
		for (let intento = 0; ; intento++) {
			try {
				return await apiResponder(sesion.codigo, sesion.sessionId, comando);
			} catch (fallo) {
				if (!fallo.reintentable || intento >= ESPERAS_REINTENTO_MS.length) throw fallo;
				if (montado.current) setReintentando(true);
				const espera = fallo.reintentarEnSegundos
					? Math.max(ESPERAS_REINTENTO_MS[intento], fallo.reintentarEnSegundos * 1000)
					: ESPERAS_REINTENTO_MS[intento];
				await esperar(espera);
				if (!montado.current) throw fallo;
			}
		}
	}

	async function enviar(comando) {
		enviandoRef.current = true;
		setEnviando(true);
		setErrorRespuesta("");
		setOpcionPendiente(comando.opcion);
		try {
			const resultado = await enviarConReintentos(comando);
			if (!montado.current) return;
			comandoPendiente.current = null;
			aplicarVista(resultado.vista);
			setMostrando({
				indice: comando.indice,
				seleccion: comando.opcion,
				correcta: resultado.correcta,
				acierto: resultado.acierto,
				fueraDeTiempo: resultado.fueraDeTiempo,
			});
		} catch (fallo) {
			if (!montado.current) return;
			if (fallo.reintentable) {
				// Se conserva el comando: "Reintentar" lo reenvía con el mismo comandoId.
				comandoPendiente.current = comando;
				setErrorRespuesta("No se pudo enviar la respuesta. Reinténtalo.");
			} else {
				comandoPendiente.current = null;
				setErrorRespuesta(fallo.message || "No se pudo enviar la respuesta.");
				recargar();
			}
		} finally {
			enviandoRef.current = false;
			if (montado.current) {
				setEnviando(false);
				setReintentando(false);
				setOpcionPendiente(null);
			}
		}
	}

	function elegirOpcion(opcion) {
		if (mostrando || enviandoRef.current || comandoPendiente.current || terminadoServidor) return;
		enviar({ comandoId: generarComandoId(), indice: siguiente, opcion });
	}

	function reintentar() {
		if (comandoPendiente.current && !enviandoRef.current) enviar(comandoPendiente.current);
	}

	const ranking = vista.ranking;
	const completo = vista.estado === "TERMINADA";

	if (!mostrando && terminadoServidor) {
		const miResultado = ranking.find((fila) => fila.nombre === vista.nombre);
		const terminados = ranking.filter((fila) => fila.terminado).length;
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
					Sala {vista.codigo} — {terminados}/{ranking.length} han terminado
				</p>
				{reconectando && (
					<p role="status" className="mb-4 text-sm text-signal-ink font-semibold">
						Reconectando…
					</p>
				)}

				{miResultado && !completo && (
					<div className="max-w-md mx-auto bg-surface p-4 rounded-xl border border-line mb-4">
						<p className="text-lg">
							Tu resultado:{" "}
							<span className="font-mono font-bold text-ok-ink">
								{miResultado.porcentaje}%
							</span>{" "}
							<span className="font-mono">
								({miResultado.aciertos}/{miResultado.total})
							</span>
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
								{ranking.map((fila, posicion) => (
									<tr
										key={fila.nombre}
										className={`border-t border-line ${
											fila.nombre === vista.nombre ? "bg-surface font-bold" : ""
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
											{fila.nombre} {fila.nombre === vista.nombre && "(tú)"}
											{!fila.terminado && (
												<span className="ml-2 text-xs font-normal text-ink-soft">
													respondiendo…
												</span>
											)}
										</td>
										<td className="p-3 text-right font-mono">
											{fila.aciertos}/{fila.total}
										</td>
										<td className="p-3 text-right font-mono font-semibold">
											{fila.porcentaje}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<div className="mt-6 flex flex-col items-center gap-3">
					{completo && (
						<button
							onClick={onSalir}
							className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition"
						>
							Nueva sesión
						</button>
					)}
					{!completo && (
						<button onClick={onSalir} className="text-ink-muted underline text-sm">
							Salir de la sala
						</button>
					)}
				</div>
			</section>
		);
	}

	const indiceMostrado = mostrando ? mostrando.indice : siguiente;
	const preguntaActual = preguntas[indiceMostrado];
	if (!preguntaActual) {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<p role="status" className="text-lg">
					Cargando la pregunta…
				</p>
			</section>
		);
	}

	const mostrarReloj =
		hasta !== null && (timerConfig.tipo === "test" || (timerConfig.tipo === "pregunta" && !mostrando));
	const restante = mostrarReloj
		? Math.max(0, Math.ceil((hasta - ahoraServidor()) / 1000))
		: null;
	const umbralRojo = timerConfig.tipo === "pregunta" ? 5 : 30;
	const umbralAmarillo = timerConfig.tipo === "pregunta" ? 10 : 60;
	const sinTiempo = restante === 0 && !mostrando;

	return (
		<section id="quiz" className="bg-bg px-4 py-10 md:p-12 text-ink">
			<h2 className="text-4xl font-display mb-1 text-center">
				Test de {reglamentacion(vista.banco).siglas}
			</h2>
			<p className="text-center text-sm text-ink-muted mb-1">
				{vista.nombre} · Sala <span className="font-mono">{vista.codigo}</span>
			</p>
			<p className="text-center text-sm text-ink-muted mb-4 font-mono">
				Pregunta {indiceMostrado + 1} / {total} ·{" "}
				<span className="font-semibold text-ok-ink">{vista.progreso.aciertos} aciertos</span>
				{restante !== null && (
					<>
						{" "}
						·{" "}
						<span
							className={`font-mono font-bold ${
								restante <= umbralRojo
									? "text-ko"
									: restante <= umbralAmarillo
										? "bg-signal text-ink rounded px-1"
										: "text-ink-soft"
							}`}
						>
							<Timer aria-hidden="true" size={20} strokeWidth={1.75} className="inline" />{" "}
							{formatearTiempo(restante)}
						</span>
					</>
				)}
			</p>
			{reconectando && (
				<p role="status" className="text-center text-signal-ink font-semibold mb-2">
					Reconectando…
				</p>
			)}
			{reintentando && (
				<p role="status" className="text-center text-signal-ink font-semibold mb-2">
					Reconectando… reenviando tu respuesta
				</p>
			)}
			{sinTiempo && (
				<p role="status" className="text-center text-ko font-semibold mb-2">
					<Timer aria-hidden="true" size={20} strokeWidth={1.75} className="inline" />{" "}
					{timerConfig.tipo === "test"
						? "Tiempo agotado. Calculando resultado…"
						: "¡Tiempo agotado!"}
				</p>
			)}
			{mostrando?.fueraDeTiempo && (
				<p role="status" className="text-center text-ko font-semibold mb-2">
					Tu respuesta llegó fuera de tiempo y no cuenta.
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
						if (mostrando) {
							if (indiceOpcion === mostrando.correcta) {
								estilo += " bg-ok-bg border-ok text-ok-ink";
							} else if (indiceOpcion === mostrando.seleccion) {
								estilo += " bg-ko-bg border-ko text-ko-ink";
							} else {
								estilo += " border-line text-ink-muted";
							}
						} else if (indiceOpcion === opcionPendiente) {
							estilo += " border-primary bg-surface";
						} else {
							estilo += " border-line hover:bg-surface";
						}
						return (
							<button
								key={indiceOpcion}
								type="button"
								disabled={Boolean(mostrando) || enviando || Boolean(comandoPendiente.current)}
								className={estilo}
								onClick={() => elegirOpcion(indiceOpcion)}
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
						{comandoPendiente.current && (
							<button
								type="button"
								onClick={reintentar}
								className="underline text-sm text-ink-soft"
							>
								Reintentar
							</button>
						)}
					</div>
				)}
				{mostrando && (
					<div className="mt-4 text-right">
						<button
							onClick={avanzar}
							className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg font-semibold transition"
						>
							{mostrando.indice + 1 < total ? "Siguiente →" : "Ver resultado"}
						</button>
					</div>
				)}
			</div>
		</section>
	);
}
