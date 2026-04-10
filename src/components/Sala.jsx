import React, { useState, useEffect } from "react";
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
	const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
	const [timerTipo, setTimerTipo] = useState("ninguno");
	const [timerSegundos, setTimerSegundos] = useState(30);

	// Cargar preguntas para extraer categorías
	useEffect(() => {
		fetch("/preguntas-prl.json")
			.then((res) => res.json())
			.then((data) => setTodasPreguntas(data))
			.catch(() => {});
	}, []);

	const categoriasDisponibles = [
		...new Set(todasPreguntas.map((p) => p.categoria)),
	].sort();

	function toggleCategoria(cat) {
		setCategoriasSeleccionadas((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		);
	}

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
		if (!nombre.trim()) return;
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">🌐 Modo En Red</h2>
				<p className="text-gray-500 mb-6">
					Juega con otros participantes conectados desde sus dispositivos
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					<button
						onClick={() => setFase("crear")}
						className="bg-green-700 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-800 transition text-lg flex flex-col items-center gap-1"
					>
						<span className="text-3xl">🏫</span>
						Crear sala
					</button>
					<button
						onClick={() => setFase("unirse")}
						className="bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-800 transition text-lg flex flex-col items-center gap-1"
					>
						<span className="text-3xl">🔗</span>
						Unirse a sala
					</button>
				</div>
				<button
					onClick={onVolverInicio}
					className="mt-4 text-gray-500 underline text-sm"
				>
					← Volver
				</button>
			</section>
		);
	}

	// --- PANTALLA: Crear sala ---
	if (fase === "crear") {
		return (
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">Crear sala</h2>
				<form
					onSubmit={crearSala}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border rounded-lg text-center text-lg"
						maxLength={30}
						autoFocus
					/>
					<label className="text-sm text-gray-600 text-left">
						Número de preguntas:
					</label>
					<select
						value={numPreguntas}
						onChange={(e) => setNumPreguntas(Number(e.target.value))}
						className="p-3 border rounded-lg text-center text-lg"
					>
						{[5, 10, 15, 20].map((n) => (
							<option key={n} value={n}>
								{n} preguntas
							</option>
						))}
					</select>
					<label className="text-sm text-gray-600 text-left mt-2">
						Categorías (opcional):
					</label>
					<CategorySelector
						preguntas={todasPreguntas}
						seleccionadas={categoriasSeleccionadas}
						onChange={setCategoriasSeleccionadas}
						compacto
					/>
					<label className="text-sm text-gray-600 text-left mt-2">
						Temporizador (opcional):
					</label>
					<select
						value={timerTipo}
						onChange={(e) => {
							setTimerTipo(e.target.value);
							if (e.target.value === "pregunta") setTimerSegundos(30);
							if (e.target.value === "test") setTimerSegundos(600);
						}}
						className="p-3 border rounded-lg text-center text-lg"
					>
						<option value="ninguno">Sin temporizador</option>
						<option value="pregunta">Por pregunta</option>
						<option value="test">Por test completo</option>
					</select>
					{timerTipo === "pregunta" && (
						<select
							value={timerSegundos}
							onChange={(e) => setTimerSegundos(Number(e.target.value))}
							className="p-3 border rounded-lg text-center text-lg"
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
							value={timerSegundos}
							onChange={(e) => setTimerSegundos(Number(e.target.value))}
							className="p-3 border rounded-lg text-center text-lg"
						>
							{[300, 600, 900, 1200].map((s) => (
								<option key={s} value={s}>
									{s / 60} minutos
								</option>
							))}
						</select>
					)}
					{error && <p className="text-red-600 text-sm">{error}</p>}
					<button
						type="submit"
						disabled={!nombre.trim()}
						className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40"
					>
						Crear sala
					</button>
					<button
						type="button"
						onClick={() => {
							setFase("elegir");
							setError("");
						}}
						className="text-gray-500 underline text-sm"
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">Unirse a sala</h2>
				<form
					onSubmit={unirseSala}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border rounded-lg text-center text-lg"
						maxLength={30}
						autoFocus
					/>
					<input
						type="text"
						value={codigo}
						onChange={(e) => setCodigo(e.target.value.toUpperCase())}
						placeholder="Código de sala (ej: PRL-A1B2)"
						className="p-3 border rounded-lg text-center text-lg font-mono tracking-widest"
						maxLength={10}
					/>
					{error && <p className="text-red-600 text-sm">{error}</p>}
					<button
						type="submit"
						disabled={!nombre.trim() || !codigo.trim()}
						className="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition disabled:opacity-40"
					>
						Unirse
					</button>
					<button
						type="button"
						onClick={() => {
							setFase("elegir");
							setError("");
						}}
						className="text-gray-500 underline text-sm"
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">Sala: {codigoSala}</h2>
				<p className="text-gray-500 mb-2">
					Comparte este código con los participantes
				</p>
				<p className="text-5xl font-mono font-bold text-green-700 tracking-widest mb-4">
					{codigoSala}
				</p>
				<div className="max-w-sm mx-auto bg-white rounded-xl p-4 shadow mb-4">
					<p className="font-semibold mb-2">
						Jugadores conectados ({jugadores.length}):
					</p>
					<ul className="text-left">
						{jugadores.map((j, i) => (
							<li key={i} className="py-1 border-b last:border-0">
								{i === 0 ? "👑" : "👤"} {j}
							</li>
						))}
					</ul>
				</div>
				{esHost ? (
					<button
						onClick={iniciarTest}
						disabled={jugadores.length < 2}
						className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40"
					>
						{jugadores.length < 2
							? "Esperando más jugadores…"
							: `🚀 Iniciar test (${jugadores.length} jugadores)`}
					</button>
				) : (
					<p className="text-gray-500 italic">
						Esperando a que el anfitrión inicie el test…
					</p>
				)}
			</section>
		);
	}

	return null;
}
