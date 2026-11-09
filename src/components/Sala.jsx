import React, { useState, useEffect, useMemo } from "react";
import { Crown, Globe, Rocket, UserRound, UsersRound } from "lucide-react";
import { crearSala as apiCrearSala, unirseSala as apiUnirseSala } from "../api/salas.js";
import CategorySelector from "./CategorySelector";
import useBancoPreguntas from "../hooks/useBancoPreguntas.js";
import { reglamentacion } from "../utils/reglamentacion.js";
import SelectorReglamentacion from "./SelectorReglamentacion.jsx";

// Sin `vista` muestra elegir, crear y unirse; con la vista de una sala en espera, la sala de espera.
export default function Sala({
	vista = null,
	reconectando = false,
	aviso = "",
	onEntrar,
	onIniciar,
	onSalir,
	onVolverInicio,
	pais = "es",
	onCambiarPais,
}) {
	const [fase, setFase] = useState("elegir"); // "elegir" | "crear" | "unirse"
	const [nombre, setNombre] = useState("");
	const [codigo, setCodigo] = useState("");
	const [numPreguntas, setNumPreguntas] = useState(10);
	const [error, setError] = useState("");
	const [enviando, setEnviando] = useState(false);
	const { preguntas: todasPreguntas, error: errorCarga } = useBancoPreguntas(pais);
	const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
	const [timerTipo, setTimerTipo] = useState("ninguno");
	const [timerSegundos, setTimerSegundos] = useState(30);


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

	async function enviarCrear(e) {
		e.preventDefault();
		if (!nombre.trim() || preguntasFiltradas.length === 0 || enviando) return;
		setError("");
		setEnviando(true);
		try {
			const sala = await apiCrearSala({
				nombre: nombre.trim(),
				numPreguntas,
				banco: pais,
				categorias: categoriasSeleccionadas,
				timerConfig:
					timerTipo !== "ninguno"
						? { activo: true, tipo: timerTipo, segundos: timerSegundos }
						: { activo: false, tipo: null, segundos: null },
			});
			onEntrar({ codigo: sala.codigo, sessionId: sala.sessionId, nombre: nombre.trim() });
		} catch (fallo) {
			setError(fallo.message || "Error al crear sala");
		} finally {
			setEnviando(false);
		}
	}

	async function enviarUnirse(e) {
		e.preventDefault();
		if (!nombre.trim() || !codigo.trim() || enviando) return;
		setError("");
		setEnviando(true);
		try {
			const sala = await apiUnirseSala(codigo.trim().toUpperCase(), nombre.trim());
			onEntrar({ codigo: sala.codigo, sessionId: sala.sessionId, nombre: nombre.trim() });
		} catch (fallo) {
			setError(fallo.message || "No se pudo unir");
		} finally {
			setEnviando(false);
		}
	}

	async function iniciarTest() {
		setError("");
		setEnviando(true);
		try {
			await onIniciar();
		} catch (fallo) {
			setError(fallo.message || "Error al iniciar");
		} finally {
			setEnviando(false);
		}
	}

	// --- PANTALLA: Sala de espera (a partir de la vista del servidor) ---
	if (vista) {
		return (
			<section id="quiz" className="bg-bg p-8 text-center text-ink">
				<h2 className="text-4xl font-display mb-2">
					Sala: <span className="font-mono">{vista.codigo}</span>
				</h2>
				<p className="text-ink-muted mb-2">
					Comparte este código con los participantes
				</p>
				<p className="mb-2 text-sm font-semibold text-ink-soft">
					Reglamentación: {reglamentacion(vista.banco).pais} ({reglamentacion(vista.banco).siglas})
				</p>
				<p className="text-3xl sm:text-5xl font-mono font-bold text-primary tracking-widest mb-4">
					{vista.codigo}
				</p>
				{reconectando && (
					<p role="status" className="mb-4 text-sm text-signal-ink font-semibold">
						Reconectando…
					</p>
				)}
				<div className="max-w-sm mx-auto bg-card border border-line rounded-xl p-4 mb-4">
					<p className="font-semibold mb-2">
						Jugadores en la sala (<span className="font-mono">{vista.jugadores.length}</span>):
					</p>
					<ul className="text-left">
						{vista.jugadores.map((jugador) => (
							<li
								key={jugador.nombre}
								className="py-1 border-b border-line last:border-0 flex items-center gap-2"
							>
								{jugador.anfitrion ? (
									<Crown aria-hidden="true" size={20} strokeWidth={1.75} />
								) : (
									<UserRound aria-hidden="true" size={20} strokeWidth={1.75} />
								)}
								<span className="flex-1">
									{jugador.nombre}
									{jugador.nombre === vista.nombre && " (tú)"}
								</span>
								<span
									aria-hidden="true"
									className={`h-2.5 w-2.5 rounded-full ${
										jugador.conectado ? "bg-ok" : "border-2 border-ink-muted"
									}`}
								/>
								<span className="sr-only">
									{jugador.conectado ? "conectado" : "sin conexión"}
								</span>
							</li>
						))}
					</ul>
				</div>
				{error && <p role="alert" className="mb-4 text-ko text-sm">{error}</p>}
				{vista.soyAnfitrion ? (
					<button
						onClick={iniciarTest}
						disabled={enviando}
						className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-40 inline-flex items-center gap-2"
					>
						Iniciar test ({vista.jugadores.length}{" "}
						{vista.jugadores.length === 1 ? "jugador" : "jugadores"})
						<Rocket aria-hidden="true" size={20} strokeWidth={1.75} />
					</button>
				) : (
					<p className="text-ink-muted italic">
						Esperando a que el anfitrión inicie el test…
					</p>
				)}
				<div>
					<button onClick={onSalir} className="mt-4 text-ink-muted underline text-sm">
						Salir de la sala
					</button>
				</div>
			</section>
		);
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
				{aviso && (
					<p role="status" className="mt-4 text-sm text-signal-ink font-semibold">
						{aviso}
					</p>
				)}
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
				{onCambiarPais && (
					<SelectorReglamentacion
						pais={pais}
						onChange={(nuevo) => {
							setCategoriasSeleccionadas([]);
							onCambiarPais(nuevo);
						}}
						className="mb-6"
					/>
				)}
				<form
					onSubmit={enviarCrear}
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
						grupos={reglamentacion(pais).grupos}
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
						disabled={!nombre.trim() || preguntasFiltradas.length === 0 || enviando}
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
					onSubmit={enviarUnirse}
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
						disabled={!nombre.trim() || !codigo.trim() || enviando}
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

	return null;
}
