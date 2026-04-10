import React, { useState, useMemo } from "react";

const GRUPOS = [
	{
		nombre: "Legislación y Normativa",
		icono: "⚖️",
		color: "blue",
		categorias: [
			"Ley 31/1995 LPRL",
			"Responsabilidades y Sanciones",
			"Subcontratación",
		],
	},
	{
		nombre: "Organización Preventiva",
		icono: "🏛️",
		color: "indigo",
		categorias: [
			"Plan de Prevención",
			"Servicios de Prevención",
			"Comité de Seguridad",
			"Delegados de Prevención",
			"Coordinación de Actividades",
			"Formación",
			"Cultura Preventiva",
		],
	},
	{
		nombre: "Evaluación y Vigilancia",
		icono: "🔍",
		color: "amber",
		categorias: [
			"Evaluación de Riesgos",
			"Vigilancia de la Salud",
			"Accidente de Trabajo",
			"Enfermedades Profesionales",
			"Riesgos Laborales",
		],
	},
	{
		nombre: "Tipos de Riesgos",
		icono: "⚠️",
		color: "red",
		categorias: [
			"Riesgos Físicos",
			"Riesgos Químicos",
			"Riesgos Biológicos",
			"Riesgos Ergonómicos",
			"Riesgos Psicosociales",
			"Riesgos Eléctricos",
		],
	},
	{
		nombre: "Protección y Entorno",
		icono: "🛡️",
		color: "green",
		categorias: [
			"Equipos de Protección",
			"Señalización",
			"Lugares de Trabajo",
			"Manipulación Manual de Cargas",
		],
	},
	{
		nombre: "Emergencias y Primeros Auxilios",
		icono: "🚨",
		color: "orange",
		categorias: ["Emergencias", "Incendios", "Primeros Auxilios"],
	},
	{
		nombre: "Colectivos y Trabajos Especiales",
		icono: "👷",
		color: "purple",
		categorias: [
			"Trabajadoras Embarazadas",
			"Trabajos Especiales",
			"Construcción",
			"Trabajo a Turnos",
		],
	},
];

const COLOR_MAP = {
	blue: {
		bg: "bg-blue-50",
		border: "border-blue-200",
		header: "bg-blue-100 text-blue-800",
		badge: "bg-blue-600",
		check: "text-blue-600",
	},
	indigo: {
		bg: "bg-indigo-50",
		border: "border-indigo-200",
		header: "bg-indigo-100 text-indigo-800",
		badge: "bg-indigo-600",
		check: "text-indigo-600",
	},
	amber: {
		bg: "bg-amber-50",
		border: "border-amber-200",
		header: "bg-amber-100 text-amber-800",
		badge: "bg-amber-600",
		check: "text-amber-600",
	},
	red: {
		bg: "bg-red-50",
		border: "border-red-200",
		header: "bg-red-100 text-red-800",
		badge: "bg-red-600",
		check: "text-red-600",
	},
	green: {
		bg: "bg-green-50",
		border: "border-green-200",
		header: "bg-green-100 text-green-800",
		badge: "bg-green-600",
		check: "text-green-600",
	},
	orange: {
		bg: "bg-orange-50",
		border: "border-orange-200",
		header: "bg-orange-100 text-orange-800",
		badge: "bg-orange-600",
		check: "text-orange-600",
	},
	purple: {
		bg: "bg-purple-50",
		border: "border-purple-200",
		header: "bg-purple-100 text-purple-800",
		badge: "bg-purple-600",
		check: "text-purple-600",
	},
};

export default function CategorySelector({
	preguntas,
	seleccionadas,
	onChange,
	compacto = false,
}) {
	const [busqueda, setBusqueda] = useState("");
	const [gruposExpandidos, setGruposExpandidos] = useState(
		new Set(GRUPOS.map((_, i) => i)),
	);

	const conteoCategoria = useMemo(() => {
		const map = {};
		preguntas.forEach((p) => {
			map[p.categoria] = (map[p.categoria] || 0) + 1;
		});
		return map;
	}, [preguntas]);

	const categoriasExistentes = useMemo(
		() => new Set(preguntas.map((p) => p.categoria)),
		[preguntas],
	);

	const gruposFiltrados = useMemo(() => {
		const term = busqueda.toLowerCase().trim();
		return GRUPOS.map((grupo) => ({
			...grupo,
			categorias: grupo.categorias.filter(
				(cat) =>
					categoriasExistentes.has(cat) &&
					(!term || cat.toLowerCase().includes(term)),
			),
		})).filter((g) => g.categorias.length > 0);
	}, [busqueda, categoriasExistentes]);

	function toggleCategoria(cat) {
		const next = seleccionadas.includes(cat)
			? seleccionadas.filter((c) => c !== cat)
			: [...seleccionadas, cat];
		onChange(next);
	}

	function toggleGrupo(cats) {
		const todasActivas = cats.every((c) => seleccionadas.includes(c));
		const next = todasActivas
			? seleccionadas.filter((c) => !cats.includes(c))
			: [...new Set([...seleccionadas, ...cats])];
		onChange(next);
	}

	function toggleExpandir(idx) {
		setGruposExpandidos((prev) => {
			const next = new Set(prev);
			next.has(idx) ? next.delete(idx) : next.add(idx);
			return next;
		});
	}

	function seleccionarTodas() {
		const todas = GRUPOS.flatMap((g) => g.categorias).filter((c) =>
			categoriasExistentes.has(c),
		);
		onChange(todas);
	}

	function limpiarTodas() {
		onChange([]);
	}

	const totalFiltradas = seleccionadas.reduce(
		(sum, cat) => sum + (conteoCategoria[cat] || 0),
		0,
	);

	return (
		<div className={`w-full ${compacto ? "max-w-lg" : "max-w-3xl"} mx-auto`}>
			{/* Barra de búsqueda y acciones rápidas */}
			<div className="flex flex-col sm:flex-row gap-2 mb-4">
				<div className="relative flex-1">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
						🔎
					</span>
					<input
						type="text"
						value={busqueda}
						onChange={(e) => setBusqueda(e.target.value)}
						placeholder="Buscar categoría…"
						className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
					/>
				</div>
				<div className="flex gap-2 justify-center">
					<button
						type="button"
						onClick={seleccionarTodas}
						className="px-3 py-2 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition"
					>
						Todas
					</button>
					<button
						type="button"
						onClick={limpiarTodas}
						className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
					>
						Ninguna
					</button>
				</div>
			</div>

			{/* Grid de grupos */}
			<div
				className={`grid gap-3 ${compacto ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} mb-4`}
			>
				{gruposFiltrados.map((grupo, gIdx) => {
					const originalIdx = GRUPOS.findIndex(
						(g) => g.nombre === grupo.nombre,
					);
					const colors = COLOR_MAP[grupo.color];
					const expandido = gruposExpandidos.has(originalIdx);
					const catsActivas = grupo.categorias.filter((c) =>
						seleccionadas.includes(c),
					);
					const todasActivas = catsActivas.length === grupo.categorias.length;
					const algunaActiva = catsActivas.length > 0;

					return (
						<div
							key={grupo.nombre}
							className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm transition hover:shadow-md ${colors.bg}`}
						>
							{/* Cabecera del grupo */}
							<button
								type="button"
								onClick={() => toggleExpandir(originalIdx)}
								className={`w-full flex items-center justify-between px-4 py-2.5 ${colors.header} transition`}
							>
								<div className="flex items-center gap-2">
									<span className="text-lg">{grupo.icono}</span>
									<span className="font-semibold text-sm">{grupo.nombre}</span>
								</div>
								<div className="flex items-center gap-2">
									{algunaActiva && (
										<span
											className={`${colors.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}
										>
											{catsActivas.length}/{grupo.categorias.length}
										</span>
									)}
									<span
										className={`text-xs transition-transform ${expandido ? "rotate-180" : ""}`}
									>
										▼
									</span>
								</div>
							</button>

							{/* Contenido expandible */}
							{expandido && (
								<div className="px-3 py-2">
									{/* Seleccionar todo el grupo */}
									<button
										type="button"
										onClick={() => toggleGrupo(grupo.categorias)}
										className={`w-full text-left text-xs mb-2 px-2 py-1 rounded transition ${
											todasActivas
												? "text-gray-500 hover:text-gray-700"
												: "text-green-700 hover:text-green-800 font-medium"
										}`}
									>
										{todasActivas
											? "✕ Deseleccionar grupo"
											: "✓ Seleccionar todo el grupo"}
									</button>

									<div className="space-y-1">
										{grupo.categorias.map((cat) => {
											const activa = seleccionadas.includes(cat);
											const count = conteoCategoria[cat] || 0;
											return (
												<label
													key={cat}
													className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
														activa
															? "bg-white shadow-sm border border-green-200"
															: "hover:bg-white/60"
													}`}
												>
													<input
														type="checkbox"
														checked={activa}
														onChange={() => toggleCategoria(cat)}
														className="sr-only"
													/>
													<span
														className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
															activa
																? "bg-green-600 border-green-600"
																: "border-gray-300 bg-white"
														}`}
													>
														{activa && (
															<svg
																className="w-3 h-3 text-white"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
																strokeWidth={3}
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M5 13l4 4L19 7"
																/>
															</svg>
														)}
													</span>
													<span
														className={`flex-1 text-sm ${activa ? "font-medium text-gray-900" : "text-gray-700"}`}
													>
														{cat}
													</span>
													<span className="text-xs text-gray-400 tabular-nums">
														{count}
													</span>
												</label>
											);
										})}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Resumen sticky */}
			{seleccionadas.length > 0 && (
				<div className="bg-white border border-green-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
					<div className="text-sm">
						<span className="font-semibold text-green-700">
							{totalFiltradas}
						</span>{" "}
						<span className="text-gray-600">
							preguntas en{" "}
							<span className="font-semibold">{seleccionadas.length}</span>{" "}
							categoría{seleccionadas.length > 1 ? "s" : ""}
						</span>
					</div>
					<button
						type="button"
						onClick={limpiarTodas}
						className="text-xs text-gray-500 hover:text-red-600 transition underline"
					>
						Limpiar
					</button>
				</div>
			)}
		</div>
	);
}
