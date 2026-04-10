import React, { useState, useEffect } from "react";

function barajar(arr) {
	const copia = [...arr];
	for (let i = copia.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copia[i], copia[j]] = [copia[j], copia[i]];
	}
	return copia;
}

export default function QuizPRL({
	onResultado,
	resultados,
	mostrarRanking,
	setMostrarRanking,
	onModoRed,
	socketConectado,
}) {
	const [todasPreguntas, setTodasPreguntas] = useState([]);
	const [cargando, setCargando] = useState(true);

	// Fase de configuración
	const [modo, setModo] = useState(null); // "individual" | "multijugador"
	const [totalJugadores, setTotalJugadores] = useState(2);
	const [jugadorActualIdx, setJugadorActualIdx] = useState(0);
	const [nombreUsuario, setNombreUsuario] = useState("");
	const [cantidadPreguntas, setCantidadPreguntas] = useState(null);
	const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);

	// Fase de test
	const [preguntas, setPreguntas] = useState([]);
	const [indice, setIndice] = useState(0);
	const [seleccion, setSeleccion] = useState(null);
	const [aciertos, setAciertos] = useState(0);
	const [respondida, setRespondida] = useState(false);
	const [finalizado, setFinalizado] = useState(false);
	const [iniciado, setIniciado] = useState(false);

	// Fases: "modo" → "config" → "nombre" → "categorias" → "cantidad" → "test" → "resultado"
	const [fase, setFase] = useState("modo");

	// Categorías disponibles (extraídas del JSON)
	const categoriasDisponibles = [
		...new Set(todasPreguntas.map((p) => p.categoria)),
	].sort();

	// Preguntas filtradas por categorías seleccionadas
	const preguntasFiltradas =
		categoriasSeleccionadas.length > 0
			? todasPreguntas.filter((p) =>
					categoriasSeleccionadas.includes(p.categoria),
				)
			: todasPreguntas;

	useEffect(() => {
		fetch("/preguntas-prl.json")
			.then((res) => res.json())
			.then((data) => {
				setTodasPreguntas(data);
				setCargando(false);
			})
			.catch(() => setCargando(false));
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

	function seleccionarModo(m) {
		setModo(m);
		setFase("config");
	}

	function confirmarConfigMultijugador(e) {
		e.preventDefault();
		if (totalJugadores < 2) return;
		setFase("nombre");
	}

	function confirmarNombre(e) {
		e.preventDefault();
		if (!nombreUsuario.trim()) return;
		setFase("categorias");
	}

	function toggleCategoria(cat) {
		setCategoriasSeleccionadas((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		);
	}

	function confirmarCategorias() {
		setFase("cantidad");
	}

	function iniciarTest(num) {
		const seleccionadas = barajar(preguntasFiltradas).slice(0, num);
		setPreguntas(seleccionadas);
		setCantidadPreguntas(num);
		setIndice(0);
		setSeleccion(null);
		setAciertos(0);
		setRespondida(false);
		setFinalizado(false);
		setIniciado(true);
		setFase("test");
	}

	function seleccionarOpcion(idx) {
		if (respondida) return;
		setSeleccion(idx);
		setRespondida(true);
		if (idx === preguntas[indice].respuesta) {
			setAciertos((prev) => prev + 1);
		}
	}

	function siguiente() {
		if (indice + 1 < preguntas.length) {
			setIndice((prev) => prev + 1);
			setSeleccion(null);
			setRespondida(false);
		} else {
			setFinalizado(true);
			const porcentaje = Math.round(
				((aciertos + (seleccion === preguntas[indice].respuesta ? 0 : 0)) /
					preguntas.length) *
					100,
			);
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
		setCantidadPreguntas(null);
		setCategoriasSeleccionadas([]);
		setPreguntas([]);
		setIndice(0);
		setSeleccion(null);
		setAciertos(0);
		setRespondida(false);
		setFinalizado(false);
		setIniciado(false);
		setFase("modo");
	}

	// --- RENDERS ---

	if (cargando) {
		return (
			<section id="quiz" className="bg-gray-100 p-6 text-center">
				<p className="text-lg">Cargando preguntas…</p>
			</section>
		);
	}

	if (todasPreguntas.length === 0) {
		return (
			<section id="quiz" className="bg-gray-100 p-6 text-center">
				<p className="text-lg text-red-600">
					No se pudieron cargar las preguntas.
				</p>
			</section>
		);
	}

	// Fase: Elegir modo
	if (fase === "modo") {
		return (
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">Test de PRL</h2>
				<p className="text-gray-500 mb-6">Selecciona la modalidad</p>
				<div className="flex flex-wrap justify-center gap-4">
					<button
						onClick={() => seleccionarModo("individual")}
						className="bg-green-700 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-800 transition text-lg flex flex-col items-center gap-1"
					>
						<span className="text-3xl">👤</span>
						Individual
					</button>
					<button
						onClick={() => seleccionarModo("multijugador")}
						className="bg-indigo-700 text-white px-6 py-4 rounded-xl font-semibold hover:bg-indigo-800 transition text-lg flex flex-col items-center gap-1"
					>
						<span className="text-3xl">👥</span>
						Multijugador
					</button>
					<button
						onClick={onModoRed}
						disabled={!socketConectado}
						className="bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-800 transition text-lg flex flex-col items-center gap-1 disabled:opacity-40"
					>
						<span className="text-3xl">🌐</span>
						En Red
						{!socketConectado && (
							<span className="text-xs font-normal">(sin conexión)</span>
						)}
					</button>
				</div>
			</section>
		);
	}

	// Fase: Configurar cantidad de jugadores (solo multijugador)
	if (fase === "config" && modo === "multijugador") {
		return (
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">Modo Multijugador</h2>
				<p className="text-gray-500 mb-6">
					¿Cuántos participantes realizarán el test?
				</p>
				<form
					onSubmit={confirmarConfigMultijugador}
					className="max-w-xs mx-auto flex flex-col gap-4"
				>
					<input
						type="number"
						min="2"
						max="20"
						value={totalJugadores}
						onChange={(e) =>
							setTotalJugadores(
								Math.max(2, Math.min(20, parseInt(e.target.value) || 2)),
							)
						}
						className="p-3 border rounded-lg text-center text-xl font-bold"
					/>
					<button
						type="submit"
						className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-800 transition"
					>
						Continuar
					</button>
					<button
						type="button"
						onClick={reiniciarTodo}
						className="text-gray-500 underline text-sm"
					>
						← Volver
					</button>
				</form>
			</section>
		);
	}

	// Fase: Configurar → pedir nombre (individual salta config)
	if (fase === "config" && modo === "individual") {
		setFase("nombre");
		return null;
	}

	// Fase: Pedir nombre
	if (fase === "nombre") {
		return (
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">
					{modo === "multijugador"
						? `Jugador ${jugadorActualIdx + 1} de ${totalJugadores}`
						: "Test de PRL"}
				</h2>
				<p className="text-gray-500 mb-6">Introduce tu nombre para comenzar</p>
				<form
					onSubmit={confirmarNombre}
					className="max-w-sm mx-auto flex flex-col gap-4"
				>
					<input
						type="text"
						value={nombreUsuario}
						onChange={(e) => setNombreUsuario(e.target.value)}
						placeholder="Tu nombre"
						className="p-3 border rounded-lg text-center text-lg"
						maxLength={30}
						autoFocus
					/>
					<button
						type="submit"
						disabled={!nombreUsuario.trim()}
						className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40"
					>
						Continuar
					</button>
					<button
						type="button"
						onClick={reiniciarTodo}
						className="text-gray-500 underline text-sm"
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">
					Hola, {nombreUsuario.trim()} 👋
				</h2>
				<p className="text-gray-500 mb-2">
					¿Quieres filtrar por categorías temáticas?
				</p>
				<p className="text-gray-400 text-sm mb-4">
					Selecciona las que desees o continúa sin filtrar para usar todas
				</p>
				<div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-2 mb-6">
					{categoriasDisponibles.map((cat) => {
						const activa = categoriasSeleccionadas.includes(cat);
						const count = todasPreguntas.filter(
							(p) => p.categoria === cat,
						).length;
						return (
							<button
								key={cat}
								onClick={() => toggleCategoria(cat)}
								className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
									activa
										? "bg-green-700 text-white border-green-700"
										: "bg-white text-gray-700 border-gray-300 hover:border-green-500"
								}`}
							>
								{cat} ({count})
							</button>
						);
					})}
				</div>
				{categoriasSeleccionadas.length > 0 && (
					<p className="text-green-700 font-semibold mb-4">
						{preguntasFiltradas.length} preguntas en{" "}
						{categoriasSeleccionadas.length} categoría
						{categoriasSeleccionadas.length > 1 ? "s" : ""}
					</p>
				)}
				<div className="flex flex-col items-center gap-3">
					<button
						onClick={confirmarCategorias}
						disabled={
							categoriasSeleccionadas.length > 0 &&
							preguntasFiltradas.length === 0
						}
						className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40"
					>
						{categoriasSeleccionadas.length === 0
							? "Continuar con todas las categorías"
							: "Continuar →"}
					</button>
					{categoriasSeleccionadas.length > 0 && (
						<button
							onClick={() => setCategoriasSeleccionadas([])}
							className="text-gray-500 underline text-sm"
						>
							Limpiar selección
						</button>
					)}
					<button
						onClick={() => setFase("nombre")}
						className="text-gray-500 underline text-sm"
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-2xl font-bold mb-2">
					Hola, {nombreUsuario.trim()} 👋
				</h2>
				<p className="text-gray-500 mb-6">
					Hay {preguntasFiltradas.length} preguntas disponibles
					{categoriasSeleccionadas.length > 0 &&
						` en ${categoriasSeleccionadas.length} categoría${categoriasSeleccionadas.length > 1 ? "s" : ""}`}
					. ¿Cuántas quieres responder?
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					{opcionesCantidad.map((n) => (
						<button
							key={n}
							onClick={() => iniciarTest(n)}
							className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition text-lg"
						>
							{n === todasPreguntas.length ? `Todas (${n})` : `${n} preguntas`}
						</button>
					))}
				</div>
			</section>
		);
	}

	// Fase: Test en curso
	if (fase === "test" && !finalizado) {
		const preguntaActual = preguntas[indice];
		return (
			<section id="quiz" className="bg-gray-100 p-6">
				<h2 className="text-2xl font-bold mb-1 text-center">Test de PRL</h2>
				<p className="text-center text-sm text-gray-400 mb-1">
					{nombreUsuario.trim()}
					{modo === "multijugador" &&
						` · Jugador ${jugadorActualIdx + 1}/${totalJugadores}`}
				</p>
				<p className="text-center text-sm text-gray-500 mb-4">
					Pregunta {indice + 1} de {preguntas.length} &middot;{" "}
					<span className="font-semibold text-green-700">
						{aciertos} aciertos
					</span>
				</p>
				<div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
					<span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded mb-3">
						{preguntaActual.categoria}
					</span>
					<p className="font-semibold text-lg mb-4">
						{preguntaActual.pregunta}
					</p>
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
			<section id="quiz" className="bg-gray-100 p-8 text-center">
				<h2 className="text-3xl font-bold mb-4">
					¡Test finalizado, {nombreUsuario.trim()}!
				</h2>
				<div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg">
					<p className="text-5xl font-bold mb-2 text-green-700">
						{ultimo?.porcentaje ?? 0}%
					</p>
					<p className="text-lg mb-4">
						Has acertado{" "}
						<span className="font-bold">{ultimo?.aciertos ?? 0}</span> de{" "}
						<span className="font-bold">{ultimo?.total ?? 0}</span> preguntas
					</p>
					{(ultimo?.porcentaje ?? 0) >= 70 ? (
						<p className="text-green-600 font-semibold mb-4">
							¡Buen trabajo! Dominas la materia.
						</p>
					) : (
						<p className="text-orange-600 font-semibold mb-4">
							Sigue estudiando, ¡tú puedes mejorar!
						</p>
					)}
					{modo === "multijugador" && !esUltimoJugador ? (
						<button
							onClick={siguienteJugador}
							className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-800 transition"
						>
							Siguiente jugador →
						</button>
					) : (
						<div className="flex flex-col gap-3">
							<button
								onClick={siguienteJugador}
								className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-800 transition"
							>
								🏆 Ver Ranking
							</button>
							<button
								onClick={reiniciarTodo}
								className="text-gray-500 underline text-sm"
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
