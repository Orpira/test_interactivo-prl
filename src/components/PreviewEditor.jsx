import React, { useState, useEffect, useRef } from "react";
import CategorySelector from "./CategorySelector";
import {
	Globe,
	Timer,
	Trophy,
	UserRound,
	UsersRound,
} from "lucide-react";
import { prepararTest } from "../utils/quiz.js";

function formatearTiempo(segundos) {
	if (segundos === null || segundos === undefined) return "";
	const min = Math.floor(segundos / 60);
	const seg = segundos % 60;
	return `${min}:${seg.toString().padStart(2, "0")}`;
}

export default function QuizPRL({
	onResultado,
	resultados,
	setMostrarRanking,
	onModoRed,
	redDisponible,
	conexionComprobada,
}) {
	const [todasPreguntas, setTodasPreguntas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [errorCarga, setErrorCarga] = useState("");

	// Fase de configuración
	const [modo, setModo] = useState(null); // "individual" | "multijugador"
	const [totalJugadores, setTotalJugadores] = useState(2);
	const [jugadorActualIdx, setJugadorActualIdx] = useState(0);
	const [nombreUsuario, setNombreUsuario] = useState("");
	const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);

	// Fase de test
	const [preguntas, setPreguntas] = useState([]);
	const [indice, setIndice] = useState(0);
	const [seleccion, setSeleccion] = useState(null);
	const [aciertos, setAciertos] = useState(0);
	const [respondida, setRespondida] = useState(false);
	const [finalizado, setFinalizado] = useState(false);

	// Timer
	const [timerConfig, setTimerConfig] = useState({
		activo: false,
		tipo: null,
		segundos: null,
	});
	const [tiempoRestante, setTiempoRestante] = useState(null);
	const timeoutProgresoRef = useRef(null);

	// Refs para acceso en callbacks del timer
	const indiceRef = useRef(0);
	const aciertosRef = useRef(0);
	const respondidaRef = useRef(false);
	indiceRef.current = indice;
	aciertosRef.current = aciertos;
	respondidaRef.current = respondida;

	function cancelarProgresoPendiente() {
		if (timeoutProgresoRef.current !== null) {
			clearTimeout(timeoutProgresoRef.current);
			timeoutProgresoRef.current = null;
		}
	}

	function reiniciarTurno() {
		cancelarProgresoPendiente();
		setIndice(0);
		indiceRef.current = 0;
		setSeleccion(null);
		setAciertos(0);
		aciertosRef.current = 0;
		setRespondida(false);
		respondidaRef.current = false;
		setFinalizado(false);
		setTiempoRestante(null);
	}

	useEffect(() => () => cancelarProgresoPendiente(), []);

	// Fases: "modo" → "config" → "nombre" → "categorias" → "cantidad" → "timer" → "test" → "resultado"
	const [fase, setFase] = useState("modo");

	// Preguntas filtradas por categorías seleccionadas
	const preguntasFiltradas =
		categoriasSeleccionadas.length > 0
			? todasPreguntas.filter((p) =>
					categoriasSeleccionadas.includes(p.categoria),
				)
			: todasPreguntas;

	useEffect(() => {
		const controlador = new AbortController();
		fetch("/preguntas-prl.json", { signal: controlador.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (!Array.isArray(data) || data.length === 0) {
					throw new Error("El banco de preguntas está vacío o no es válido");
				}
				setTodasPreguntas(data);
				setCargando(false);
			})
			.catch((error) => {
				if (controlador.signal.aborted) return;
				setErrorCarga(`No se pudieron cargar las preguntas: ${error.message}`);
				setCargando(false);
			});
		return () => controlador.abort();
	}, []);

	const opcionesCantidad = [5, 10, 15, 20].filter(
		(n) => n <= preguntasFiltradas.length,
	);
	if (
		preguntasFiltradas.length > 0 &&
		!opcionesCantidad.includes(preguntasFiltradas.length)
	) {
		opcionesCantidad.push(preguntasFiltradas.length);
	}

	// --- TIMER EFFECTS ---

	// Cuenta atrás
	useEffect(() => {
		if (
			fase !== "test" ||
			!timerConfig.activo ||
			tiempoRestante === null ||
			tiempoRestante <= 0
		)
			return;
		const id = setTimeout(() => setTiempoRestante((prev) => prev - 1), 1000);
		return () => clearTimeout(id);
	}, [tiempoRestante, fase, timerConfig.activo]);

	// Por pregunta: reiniciar timer en cada pregunta nueva
	useEffect(() => {
		if (
			fase !== "test" ||
			!timerConfig.activo ||
			timerConfig.tipo !== "pregunta"
		)
			return;
		setTiempoRestante(timerConfig.segundos);
	}, [indice, fase, timerConfig]);

	// Por test: iniciar timer una sola vez
	useEffect(() => {
		if (fase !== "test" || !timerConfig.activo || timerConfig.tipo !== "test")
			return;
		setTiempoRestante(timerConfig.segundos);
	}, [fase, timerConfig]);

	// Timer llega a cero
	useEffect(() => {
		if (tiempoRestante !== 0 || !timerConfig.activo || fase !== "test") return;

		if (timerConfig.tipo === "pregunta" && !respondidaRef.current) {
			setRespondida(true);
			respondidaRef.current = true;
			timeoutProgresoRef.current = setTimeout(() => {
				timeoutProgresoRef.current = null;
				if (indiceRef.current + 1 < preguntas.length) {
					setIndice((prev) => prev + 1);
					indiceRef.current += 1;
					setSeleccion(null);
					setRespondida(false);
					respondidaRef.current = false;
				} else {
					const porcentaje = Math.round(
						(aciertosRef.current / preguntas.length) * 100,
					);
					setFinalizado(true);
					onResultado({
						nombre: nombreUsuario.trim(),
						aciertos: aciertosRef.current,
						total: preguntas.length,
						porcentaje,
					});
					setFase("resultado");
				}
			}, 2000);
			return cancelarProgresoPendiente;
		}

		if (timerConfig.tipo === "test") {
			const currentAciertos = aciertosRef.current;
			const porcentaje = Math.round((currentAciertos / preguntas.length) * 100);
			setFinalizado(true);
			onResultado({
				nombre: nombreUsuario.trim(),
				aciertos: currentAciertos,
				total: preguntas.length,
				porcentaje,
			});
			setFase("resultado");
		}
	}, [
		tiempoRestante,
		timerConfig,
		fase,
		preguntas,
		onResultado,
		nombreUsuario,
	]);

	function seleccionarModo(m) {
		setModo(m);
		setFase(m === "individual" ? "nombre" : "config");
	}

	function confirmarConfigMultijugador(e) {
		e.preventDefault();
		if (totalJugadores < 2) return;
		setFase("nombre");
	}

	function confirmarNombre(e) {
		e.preventDefault();
		if (!nombreUsuario.trim()) return;
		if (modo === "multijugador" && jugadorActualIdx > 0) {
			reiniciarTurno();
			setFase("test");
			return;
		}
		setFase("categorias");
	}

	function confirmarCategorias() {
		setFase("cantidad");
	}

	function confirmarCantidad(num) {
		const seleccionadas = prepararTest(preguntasFiltradas, num);
		setPreguntas(seleccionadas);
		setFase("timer");
	}

	function iniciarTestConTimer(config) {
		reiniciarTurno();
		setTimerConfig(config);
		setFase("test");
	}

	function seleccionarOpcion(idx) {
		if (respondida) return;
		setSeleccion(idx);
		setRespondida(true);
		respondidaRef.current = true;
		if (timerConfig.activo && timerConfig.tipo === "pregunta") {
			setTiempoRestante(null);
		}
		if (idx === preguntas[indice].respuesta) {
			setAciertos((prev) => prev + 1);
			aciertosRef.current += 1;
		}
	}

	function siguiente() {
		if (indice + 1 < preguntas.length) {
			setIndice((prev) => prev + 1);
			indiceRef.current += 1;
			setSeleccion(null);
			setRespondida(false);
			respondidaRef.current = false;
		} else {
			setFinalizado(true);
			onResultado({
				nombre: nombreUsuario.trim(),
				aciertos,
				total: preguntas.length,
				porcentaje: Math.round((aciertos / preguntas.length) * 100),
			});
			setFase("resultado");
		}
	}

	function siguienteJugador() {
		const nextIdx = jugadorActualIdx + 1;
		if (modo === "multijugador" && nextIdx < totalJugadores) {
			reiniciarTurno();
			setJugadorActualIdx(nextIdx);
			setNombreUsuario("");
			setFase("nombre");
		} else {
			setMostrarRanking(true);
			setFase("ranking-visible");
		}
	}

	function reiniciarTodo() {
		setModo(null);
		setTotalJugadores(2);
		setJugadorActualIdx(0);
		setNombreUsuario("");
		setCategoriasSeleccionadas([]);
		setPreguntas([]);
		setIndice(0);
		setSeleccion(null);
		setAciertos(0);
		setRespondida(false);
		setFinalizado(false);
		indiceRef.current = 0;
		aciertosRef.current = 0;
		respondidaRef.current = false;
		cancelarProgresoPendiente();
		setTimerConfig({ activo: false, tipo: null, segundos: null });
		setTiempoRestante(null);
		setFase("modo");
	}

	// --- RENDERS ---

	if (cargando) {
		return (
			<section id="quiz" className="bg-bg p-6 text-center text-ink">
				<p className="text-lg">Cargando preguntas…</p>
			</section>
		);
	}

	if (todasPreguntas.length === 0) {
		return (
			<section id="quiz" className="bg-bg p-6 text-center text-ink">
				<p role="alert" className="text-lg text-ko">
					{errorCarga || "No hay preguntas disponibles."} Recarga la página para
					volver a intentarlo.
				</p>
			</section>
		);
	}

	// Fase: Elegir modo
	if (fase === "modo") {
		return (
			<section id="quiz" className="bg-bg px-6 py-16 text-center text-ink">
				<p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted mb-3">
					PRL Master
				</p>
				<h2 className="text-4xl font-display mb-2">Elige cómo jugar</h2>
				<p className="text-ink-muted mb-8">Selecciona la modalidad</p>
				<div className="flex flex-wrap justify-center gap-4">
					<button
						onClick={() => seleccionarModo("individual")}
						className="min-w-40 border border-line bg-card text-ink px-6 py-5 rounded-xl font-semibold hover:bg-surface hover:border-primary transition text-lg flex flex-col items-center gap-2"
					>
						<UserRound aria-hidden="true" size={20} strokeWidth={1.75} />
						Individual
					</button>
					<button
						onClick={() => seleccionarModo("multijugador")}
						className="min-w-40 border border-line bg-card text-ink px-6 py-5 rounded-xl font-semibold hover:bg-surface hover:border-primary transition text-lg flex flex-col items-center gap-2"
					>
						<UsersRound aria-hidden="true" size={20} strokeWidth={1.75} />
						Multijugador
					</button>
					<button
						onClick={onModoRed}
						disabled={!redDisponible}
						className="min-w-40 border border-line bg-card text-ink px-6 py-5 rounded-xl font-semibold hover:bg-surface hover:border-primary transition text-lg flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Globe aria-hidden="true" size={20} strokeWidth={1.75} />
						En Red
						{!redDisponible && (
							<span className="text-xs font-normal text-ink-muted">
								{conexionComprobada ? "No disponible ahora" : "Conectando…"}
							</span>
						)}
					</button>
				</div>
			</section>
		);
	}

	// Fase: Configurar cantidad de jugadores (solo multijugador)
	if (fase === "config" && modo === "multijugador") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">Modo Multijugador</h2>
				<p className="text-ink-muted mb-6">
					¿Cuántos participantes realizarán el test?
				</p>
				<form
					onSubmit={confirmarConfigMultijugador}
					className="max-w-xs mx-auto flex flex-col gap-4"
				>
					<input
						type="number"
						aria-label="Número de participantes"
						min="2"
						max="20"
						value={totalJugadores}
						onChange={(e) =>
							setTotalJugadores(
								Math.max(2, Math.min(20, parseInt(e.target.value) || 2)),
							)
						}
						className="p-3 border border-line rounded-lg text-center text-xl font-mono font-bold bg-card"
					/>
					<button
						type="submit"
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition"
					>
						Continuar
					</button>
					<button
						type="button"
						onClick={reiniciarTodo}
						className="text-ink-muted underline text-sm"
					>
						← Volver
					</button>
				</form>
			</section>
		);
	}

	// Fase: Pedir nombre
	if (fase === "nombre") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">
					{modo === "multijugador"
						? `Jugador ${jugadorActualIdx + 1} de ${totalJugadores}`
						: "Test de PRL"}
				</h2>
				<p className="text-ink-muted mb-6">Introduce tu nombre para comenzar</p>
				{modo === "multijugador" && jugadorActualIdx > 0 && (
					<p className="max-w-sm mx-auto mb-6 rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft">
						Mismo test que el jugador 1: {preguntas.length} preguntas
						{timerConfig.activo && (
							<>
								{" "}
								· Temporizador de{" "}
								{timerConfig.tipo === "pregunta"
									? `${timerConfig.segundos} s por pregunta`
									: `${timerConfig.segundos / 60} min por test`}
							</>
						)}
					</p>
				)}
				<form
					onSubmit={confirmarNombre}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						aria-label="Tu nombre"
						value={nombreUsuario}
						onChange={(e) => setNombreUsuario(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border border-line rounded-lg text-center text-lg bg-card"
						maxLength={30}
						autoFocus
					/>
					<button
						type="submit"
						disabled={!nombreUsuario.trim()}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40"
					>
						Continuar
					</button>
					<button
						type="button"
						onClick={reiniciarTodo}
						className="text-ink-muted underline text-sm"
					>
						← Volver al inicio
					</button>
				</form>
			</section>
		);
	}

	// Fase: Elegir categorías (opcional)
	if (fase === "categorias") {
		return (
			<section id="quiz" className="bg-bg p-8 text-ink">
				<div className="text-center mb-6">
					<h2 className="text-4xl font-display mb-1">
						Hola, {nombreUsuario.trim()}
					</h2>
					<p className="text-ink-muted">
						Selecciona categorías temáticas o continúa con todas
					</p>
				</div>

				<CategorySelector
					preguntas={todasPreguntas}
					seleccionadas={categoriasSeleccionadas}
					onChange={setCategoriasSeleccionadas}
				/>

				<div className="flex flex-col items-center gap-3 mt-6">
					<button
						onClick={confirmarCategorias}
						disabled={
							categoriasSeleccionadas.length > 0 &&
							preguntasFiltradas.length === 0
						}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40"
					>
						{categoriasSeleccionadas.length === 0
							? "Continuar con todas las categorías"
							: "Continuar →"}
					</button>
					<button
						onClick={() => setFase("nombre")}
						className="text-ink-muted underline text-sm"
					>
						← Volver
					</button>
				</div>
			</section>
		);
	}

	// Fase: Elegir cantidad de preguntas
	if (fase === "cantidad") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">
					Hola, {nombreUsuario.trim()}
				</h2>
				<p className="text-ink-muted mb-6">
					Hay {preguntasFiltradas.length} preguntas disponibles
					{categoriasSeleccionadas.length > 0 &&
						` en ${categoriasSeleccionadas.length} categoría${categoriasSeleccionadas.length > 1 ? "s" : ""}`}
					. ¿Cuántas quieres responder?
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					{opcionesCantidad.map((n) => (
						<button
							key={n}
							onClick={() => confirmarCantidad(n)}
							className="bg-card border border-line text-ink px-6 py-3 rounded-lg font-semibold hover:bg-surface transition text-lg"
						>
							{n === todasPreguntas.length ? `Todas (${n})` : `${n} preguntas`}
						</button>
					))}
				</div>
				<button
					onClick={() => setFase("categorias")}
					className="mt-4 text-ink-muted underline text-sm"
				>
					← Volver
				</button>
			</section>
		);
	}

	// Fase: Configurar temporizador (opcional)
	if (fase === "timer") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2 inline-flex items-center gap-3 justify-center">
					<Timer aria-hidden="true" size={20} strokeWidth={1.75} />
					Temporizador
				</h2>
				<p className="text-ink-muted mb-6">
					¿Quieres jugar con límite de tiempo? Es opcional.
				</p>
				<div className="max-w-md mx-auto flex flex-col gap-6">
					<button
						onClick={() =>
							iniciarTestConTimer({ activo: false, tipo: null, segundos: null })
						}
						className="bg-card border border-line text-ink px-6 py-3 rounded-lg font-semibold hover:bg-surface transition text-lg"
					>
						Sin temporizador
					</button>

					<div>
						<p className="text-sm text-ink-muted mb-3 font-semibold">
							Por pregunta:
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							{[15, 30, 45, 60].map((s) => (
								<button
									key={s}
									onClick={() =>
										iniciarTestConTimer({
											activo: true,
											tipo: "pregunta",
											segundos: s,
										})
									}
									className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition"
								>
									{s}s
								</button>
							))}
						</div>
					</div>

					<div>
						<p className="text-sm text-ink-muted mb-3 font-semibold">
							Por test completo:
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							{[5, 10, 15, 20].map((m) => (
								<button
									key={m}
									onClick={() =>
										iniciarTestConTimer({
											activo: true,
											tipo: "test",
											segundos: m * 60,
										})
									}
									className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition"
								>
									{m} min
								</button>
							))}
						</div>
					</div>

					<button
						onClick={() => setFase("cantidad")}
						className="text-ink-muted underline text-sm"
					>
						← Volver
					</button>
				</div>
			</section>
		);
	}

	// Fase: Test en curso
	if (fase === "test" && !finalizado) {
		const preguntaActual = preguntas[indice];
		return (
			<section id="quiz" className="bg-bg px-4 py-10 md:p-12 text-ink">
				<h2 className="text-4xl font-display mb-1 text-center">Test de PRL</h2>
				<p className="text-center text-sm text-ink-muted mb-1">
					{nombreUsuario.trim()}
					{modo === "multijugador" &&
						` · Jugador ${jugadorActualIdx + 1}/${totalJugadores}`}
				</p>
				<p className="text-center text-sm text-ink-muted mb-4 font-mono">
					Pregunta {indice + 1} / {preguntas.length} &middot;{" "}
					<span className="font-semibold text-ok-ink">
						{aciertos} aciertos
					</span>
					{timerConfig.activo && tiempoRestante !== null && (
						<>
							{" "}
							&middot;{" "}
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
					<p className="font-semibold text-lg mb-4">
						{preguntaActual.pregunta}
					</p>
					<div className="grid gap-3">
						{preguntaActual.opciones.map((opcion, idx) => {
							let estilo =
								"border p-3 rounded-xl cursor-pointer transition text-left w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
							if (respondida) {
								if (idx === preguntaActual.respuesta) {
									estilo += " bg-ok-bg border-ok text-ok-ink";
								} else if (idx === seleccion) {
									estilo += " bg-ko-bg border-ko text-ko-ink";
								} else {
									estilo += " border-line text-ink-muted";
								}
							} else if (idx === seleccion) {
								estilo += " border-primary bg-surface";
							} else {
								estilo += " border-line hover:bg-surface";
							}
							return (
								<button
									key={idx}
									type="button"
									disabled={respondida}
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

	// Fase: Resultado individual
	if (fase === "resultado") {
		const ultimo = resultados[resultados.length - 1];
		const esUltimoJugador =
			modo === "individual" || jugadorActualIdx + 1 >= totalJugadores;
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-4">
					¡Test finalizado, {nombreUsuario.trim()}!
				</h2>
				<div className="max-w-md mx-auto bg-card p-6 rounded-xl border border-line">
					<p className="text-6xl font-mono font-bold mb-2 text-ok-ink">
						{ultimo?.porcentaje ?? 0}%
					</p>
					<p className="text-lg mb-4">
						Has acertado{" "}
						<span className="font-bold font-mono">{ultimo?.aciertos ?? 0}</span> de{" "}
						<span className="font-bold font-mono">{ultimo?.total ?? 0}</span> preguntas
					</p>
					{(ultimo?.porcentaje ?? 0) >= 70 ? (
						<p className="text-ok-ink font-semibold mb-4">
							¡Buen trabajo! Dominas la materia.
						</p>
					) : (
						<p className="text-signal-ink font-semibold mb-4">
							Sigue estudiando, ¡tú puedes mejorar!
						</p>
					)}
					{modo === "multijugador" && !esUltimoJugador ? (
						<button
							onClick={siguienteJugador}
							className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition"
						>
							Siguiente jugador →
						</button>
					) : (
						<div className="flex flex-col gap-3">
							<button
								onClick={siguienteJugador}
								className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition inline-flex items-center justify-center gap-2"
							>
								<Trophy aria-hidden="true" size={20} strokeWidth={1.75} />
								Ver Ranking
							</button>
							<button
								onClick={reiniciarTodo}
								className="text-ink-muted underline text-sm"
							>
								Nuevo test
							</button>
						</div>
					)}
				</div>
			</section>
		);
	}

	// Fase: Ranking visible — el quiz se oculta
	if (fase === "ranking-visible") {
		return null;
	}

	return null;
}
