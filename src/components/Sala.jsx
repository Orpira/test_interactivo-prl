import React, { useState, useEffect, useMemo } from "react";
import { Crown, Globe, Rocket, UserRound, UsersRound } from "lucide-react";
import CategorySelector from "./CategorySelector";

export default function Sala({ socket, onTestIniciado, onVolverInicio }) {
	const [fase, setFase] = useState("elegir"); // "elegir" | "crear" | "unirse" | "esperando"
	const [nombre, setNombre] = useState("");
	const [codigo, setCodigo] = useState("");
	const [codigoSala, setCodigoSala] = useState("");
	const [numPreguntas, setNumPreguntas] = useState(10);
	const [jugadores, setJugadores] = useState([]);
	const [esHost, setEsHost] = useState(false);
	const [error, setError] = useState("");
	const [todasPreguntas, setTodasPreguntas] = useState([]);
	const [errorCarga, setErrorCarga] = useState("");
	const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
	const [timerTipo, setTimerTipo] = useState("ninguno");
	const [timerSegundos, setTimerSegundos] = useState(30);

	// Cargar preguntas para extraer categorías
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
			})
			.catch((error) => {
				if (controlador.signal.aborted) return;
				setErrorCarga(`No se pudieron cargar las preguntas: ${error.message}`);
			});
		return () => controlador.abort();
	}, []);

	const preguntasFiltradas = useMemo(
		() =>
			categoriasSeleccionadas.length > 0
				? todasPreguntas.filter((p) =>
						categoriasSeleccionadas.includes(p.categoria),
					)
				: todasPreguntas,
		[todasPreguntas, categoriasSeleccionadas],
	);
	const opcionesCantidad = useMemo(() => {
		const opciones = [5, 10, 15, 20].filter(
			(cantidad) => cantidad <= preguntasFiltradas.length,
		);
		if (
			preguntasFiltradas.length > 0 &&
			!opciones.includes(preguntasFiltradas.length)
		) {
			opciones.push(preguntasFiltradas.length);
		}
		return opciones;
	}, [preguntasFiltradas]);

	useEffect(() => {
		if (
			opcionesCantidad.length > 0 &&
			!opcionesCantidad.includes(numPreguntas)
		) {
			setNumPreguntas(opcionesCantidad[0]);
		}
	}, [numPreguntas, opcionesCantidad]);

	useEffect(() => {
		if (!socket) return;

		function onJugadoresActualizados(lista) {
			setJugadores(lista);
		}

		function onTestInicio({ preguntas, timerConfig }) {
			onTestIniciado({
				preguntas,
				codigoSala,
				nombre: nombre.trim(),
				timerConfig,
			});
		}

		function onEresHost() {
			setEsHost(true);
		}

		socket.on("jugadores-actualizados", onJugadoresActualizados);
		socket.on("test-iniciado", onTestInicio);
		socket.on("eres-host", onEresHost);

		return () => {
			socket.off("jugadores-actualizados", onJugadoresActualizados);
			socket.off("test-iniciado", onTestInicio);
			socket.off("eres-host", onEresHost);
		};
	}, [socket, codigoSala, nombre, onTestIniciado]);

	function crearSala(e) {
		e.preventDefault();
		if (!nombre.trim() || preguntasFiltradas.length === 0) return;
		setError("");
		socket.emit(
			"crear-sala",
			{
				nombre: nombre.trim(),
				numPreguntas,
				categorias: categoriasSeleccionadas,
				timerConfig:
					timerTipo !== "ninguno"
						? { activo: true, tipo: timerTipo, segundos: timerSegundos }
						: { activo: false, tipo: null, segundos: null },
			},
			(res) => {
				if (res.ok) {
					setCodigoSala(res.codigo);
					setEsHost(true);
					setJugadores([nombre.trim()]);
					setFase("esperando");
				} else {
					setError(res.error || "Error al crear sala");
				}
			},
		);
	}

	function unirseSala(e) {
		e.preventDefault();
		if (!nombre.trim() || !codigo.trim()) return;
		setError("");
		socket.emit(
			"unirse-sala",
			{ codigo: codigo.trim().toUpperCase(), nombre: nombre.trim() },
			(res) => {
				if (res.ok) {
					setCodigoSala(codigo.trim().toUpperCase());
					setEsHost(false);
					setFase("esperando");
				} else {
					setError(res.error || "No se pudo unir");
				}
			},
		);
	}

	function iniciarTest() {
		socket.emit("iniciar-test", null, (res) => {
			if (!res.ok) setError(res.error || "Error al iniciar");
		});
	}

	// --- PANTALLA: Elegir crear o unirse ---
	if (fase === "elegir") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2 inline-flex items-center gap-3 justify-center w-full">
					<Globe aria-hidden="true" size={20} strokeWidth={1.75} />
					Modo En Red
				</h2>
				<p className="text-ink-muted mb-6">
					Juega con otros participantes conectados desde sus dispositivos
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					<button
						onClick={() => setFase("crear")}
						disabled={todasPreguntas.length === 0}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-xl font-semibold transition text-lg flex flex-col items-center gap-2 disabled:opacity-40"
					>
						<UsersRound aria-hidden="true" size={20} strokeWidth={1.75} />
						Crear sala
					</button>
					<button
						onClick={() => setFase("unirse")}
						className="bg-card text-ink border border-line px-6 py-4 rounded-xl font-semibold hover:bg-surface hover:border-primary transition text-lg flex flex-col items-center gap-2"
					>
						<Globe aria-hidden="true" size={20} strokeWidth={1.75} />
						Unirse a sala
					</button>
				</div>
				{errorCarga && (
					<p role="alert" className="mt-4 text-ko text-sm">
						{errorCarga}. Recarga la página para volver a intentarlo.
					</p>
				)}
				<button
					onClick={onVolverInicio}
					className="mt-4 text-ink-muted underline text-sm"
				>
					← Volver
				</button>
			</section>
		);
	}

	// --- PANTALLA: Crear sala ---
	if (fase === "crear") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">Crear sala</h2>
				<form
					onSubmit={crearSala}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						aria-label="Tu nombre"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border border-line rounded-lg text-center text-lg bg-card"
						maxLength={30}
						autoFocus
					/>
					<label htmlFor="numPreguntas" className="text-sm text-ink-muted text-left">
						Número de preguntas:
					</label>
					<select
						id="numPreguntas"
						value={numPreguntas}
						onChange={(e) => setNumPreguntas(Number(e.target.value))}
						className="p-3 border border-line rounded-lg text-center text-lg bg-card"
					>
						{opcionesCantidad.map((n) => (
							<option key={n} value={n}>
								{n} preguntas
							</option>
						))}
					</select>
					<p className="text-sm text-ink-muted text-left mt-2">
						Categorías (opcional):
					</p>
					<CategorySelector
						preguntas={todasPreguntas}
						seleccionadas={categoriasSeleccionadas}
						onChange={setCategoriasSeleccionadas}
						compacto
					/>
					<label htmlFor="timerTipo" className="text-sm text-ink-muted text-left mt-2">
						Temporizador (opcional):
					</label>
					<select
						id="timerTipo"
						value={timerTipo}
						onChange={(e) => {
							setTimerTipo(e.target.value);
							if (e.target.value === "pregunta") setTimerSegundos(30);
							if (e.target.value === "test") setTimerSegundos(600);
						}}
						className="p-3 border border-line rounded-lg text-center text-lg bg-card"
					>
						<option value="ninguno">Sin temporizador</option>
						<option value="pregunta">Por pregunta</option>
						<option value="test">Por test completo</option>
					</select>
					{timerTipo === "pregunta" && (
						<select
							aria-label="Segundos por pregunta"
							value={timerSegundos}
							onChange={(e) => setTimerSegundos(Number(e.target.value))}
							className="p-3 border border-line rounded-lg text-center text-lg bg-card font-mono"
						>
							{[15, 30, 45, 60].map((s) => (
								<option key={s} value={s}>
									{s} segundos por pregunta
								</option>
							))}
						</select>
					)}
					{timerTipo === "test" && (
						<select
							aria-label="Duración del test"
							value={timerSegundos}
							onChange={(e) => setTimerSegundos(Number(e.target.value))}
							className="p-3 border border-line rounded-lg text-center text-lg bg-card font-mono"
						>
							{[300, 600, 900, 1200].map((s) => (
								<option key={s} value={s}>
									{s / 60} minutos
								</option>
							))}
						</select>
					)}
					{error && <p role="alert" className="text-ko text-sm">{error}</p>}
					<button
						type="submit"
						disabled={!nombre.trim() || preguntasFiltradas.length === 0}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40"
					>
						Crear sala
					</button>
					<button
						type="button"
						onClick={() => {
							setFase("elegir");
							setError("");
						}}
						className="text-ink-muted underline text-sm"
					>
						← Volver
					</button>
				</form>
			</section>
		);
	}

	// --- PANTALLA: Unirse a sala ---
	if (fase === "unirse") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">Unirse a sala</h2>
				<form
					onSubmit={unirseSala}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						aria-label="Tu nombre"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border border-line rounded-lg text-center text-lg bg-card"
						maxLength={30}
						autoFocus
					/>
					<input
						type="text"
						aria-label="Código de sala"
						value={codigo}
						onChange={(e) => setCodigo(e.target.value.toUpperCase())}
						placeholder="Código de sala (ej: PRL-A1B2)"
						className="p-3 border border-line rounded-lg text-center text-lg font-mono tracking-widest bg-card"
						maxLength={10}
					/>
					{error && <p role="alert" className="text-ko text-sm">{error}</p>}
					<button
						type="submit"
						disabled={!nombre.trim() || !codigo.trim()}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40"
					>
						Unirse
					</button>
					<button
						type="button"
						onClick={() => {
							setFase("elegir");
							setError("");
						}}
						className="text-ink-muted underline text-sm"
					>
						← Volver
					</button>
				</form>
			</section>
		);
	}

	// --- PANTALLA: Esperando jugadores ---
	if (fase === "esperando") {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">Sala: <span className="font-mono">{codigoSala}</span></h2>
				<p className="text-ink-muted mb-2">
					Comparte este código con los participantes
				</p>
				<p className="text-3xl sm:text-5xl font-mono font-bold text-primary tracking-widest mb-4">
					{codigoSala}
				</p>
				<div className="max-w-sm mx-auto bg-card border border-line rounded-xl p-4 mb-4">
					<p className="font-semibold mb-2">
						Jugadores conectados (<span className="font-mono">{jugadores.length}</span>):
					</p>
					<ul className="text-left">
						{jugadores.map((j, i) => (
							<li key={i} className="py-1 border-b border-line last:border-0 flex items-center gap-2">
								{i === 0 ? (
									<Crown aria-hidden="true" size={20} strokeWidth={1.75} />
								) : (
									<UserRound aria-hidden="true" size={20} strokeWidth={1.75} />
								)}
								{j}
							</li>
						))}
					</ul>
				</div>
				{error && <p role="alert" className="mb-4 text-ko text-sm">{error}</p>}
				{esHost ? (
					<button
						onClick={iniciarTest}
						disabled={jugadores.length < 2}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40 inline-flex items-center gap-2"
					>
						{jugadores.length < 2
							? "Esperando más jugadores…"
							: `Iniciar test (${jugadores.length} jugadores)`}
						<Rocket aria-hidden="true" size={20} strokeWidth={1.75} />
					</button>
				) : (
					<p className="text-ink-muted italic">
						Esperando a que el anfitrión inicie el test…
					</p>
				)}
			</section>
		);
	}

	return null;
}
