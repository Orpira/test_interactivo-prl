import React, { useState, useMemo } from "react";
import {
	Check,
	ChevronDown,
	FolderOpen,
	HardHat,
	Landmark,
	Search,
	Shield,
	Siren,
	Scale,
	TriangleAlert,
	X,
} from "lucide-react";
import {
	construirGrupos,
	GRUPOS,
	obtenerTodasCategorias,
} from "../utils/categorias.js";

const ICONOS_GRUPO = {
	scale: Scale,
	landmark: Landmark,
	search: Search,
	"triangle-alert": TriangleAlert,
	shield: Shield,
	siren: Siren,
	"hard-hat": HardHat,
	"folder-open": FolderOpen,
};

const COLOR_GRUPO = {
	bg: "bg-card",
	border: "border-line",
	header: "bg-surface text-ink-soft",
	badge: "bg-signal text-ink",
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

	const gruposFiltrados = useMemo(() => {
		const term = busqueda.toLowerCase().trim();
		return construirGrupos(preguntas).map((grupo) => ({
			...grupo,
			categorias: grupo.categorias.filter(
				(cat) => !term || cat.toLowerCase().includes(term),
			),
		})).filter((g) => g.categorias.length > 0);
	}, [busqueda, preguntas]);

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
		onChange(obtenerTodasCategorias(preguntas));
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
					<Search
						aria-hidden="true"
						className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
						size={20}
						strokeWidth={1.75}
					/>
					<input
						type="text"
						aria-label="Buscar categoría"
						value={busqueda}
						onChange={(e) => setBusqueda(e.target.value)}
						placeholder="Buscar categoría…"
						className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
					/>
				</div>
				<div className="flex gap-2 justify-center">
					<button
						type="button"
						onClick={seleccionarTodas}
						className="px-3 py-2 text-xs font-medium rounded-lg border border-line text-ink hover:bg-surface transition"
					>
						Todas
					</button>
					<button
						type="button"
						onClick={limpiarTodas}
						className="px-3 py-2 text-xs font-medium rounded-lg border border-line text-ink hover:bg-surface transition"
					>
						Ninguna
					</button>
				</div>
			</div>

			{/* Grid de grupos */}
			<div
				className={`grid gap-3 ${compacto ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} mb-4`}
			>
				{gruposFiltrados.map((grupo) => {
					const originalIdx = GRUPOS.findIndex(
						(g) => g.nombre === grupo.nombre,
					);
					const grupoIdx = originalIdx === -1 ? GRUPOS.length : originalIdx;
					const colores = COLOR_GRUPO;
					const IconoGrupo = ICONOS_GRUPO[grupo.icono];
					const expandido = gruposExpandidos.has(grupoIdx);
					const catsActivas = grupo.categorias.filter((c) =>
						seleccionadas.includes(c),
					);
					const todasActivas = catsActivas.length === grupo.categorias.length;
					const algunaActiva = catsActivas.length > 0;

					return (
						<div
							key={grupo.nombre}
							className={`rounded-xl border ${colores.border} overflow-hidden ${colores.bg}`}
						>
							{/* Cabecera del grupo */}
							<button
								type="button"
								aria-expanded={expandido}
								onClick={() => toggleExpandir(grupoIdx)}
								className={`w-full flex items-center justify-between px-4 py-2.5 ${colores.header} transition`}
							>
								<div className="flex items-center gap-2">
									<IconoGrupo aria-hidden="true" size={20} strokeWidth={1.75} className="shrink-0" />
									<span className="font-semibold text-sm">{grupo.nombre}</span>
								</div>
								<div className="flex items-center gap-2">
									{algunaActiva && (
										<span
											className={`${colores.badge} text-xs font-mono px-2 py-0.5 rounded-full`}
										>
											{catsActivas.length}/{grupo.categorias.length}
										</span>
									)}
									<span
										className={`transition-transform ${expandido ? "rotate-180" : ""}`}
									>
										<ChevronDown aria-hidden="true" size={20} strokeWidth={1.75} />
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
												? "text-ink-muted hover:text-ink"
												: "text-primary hover:text-ink font-medium"
										}`}
									>
										{todasActivas ? (
											<span className="inline-flex items-center gap-1">
												<X aria-hidden="true" size={14} />
												Deseleccionar grupo
											</span>
										) : (
											<span className="inline-flex items-center gap-1">
												<Check aria-hidden="true" size={14} />
												Seleccionar todo el grupo
											</span>
										)}
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
															? "bg-card border border-primary"
															: "hover:bg-surface"
													}`}
												>
													<input
														type="checkbox"
														checked={activa}
														onChange={() => toggleCategoria(cat)}
														className="peer sr-only"
													/>
													<span
														className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
															activa
																? "bg-primary border-primary text-white"
																: "border-line bg-card"
														}`}
													>
														{activa && (
															<Check aria-hidden="true" size={14} />
														)}
													</span>
													<span
														className={`flex-1 text-sm ${activa ? "font-medium text-ink" : "text-ink-soft"}`}
													>
														{cat}
													</span>
													<span className="text-xs text-ink-soft font-mono tabular-nums">
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
				<div className="bg-card border border-line rounded-xl px-4 py-3 flex items-center justify-between">
					<div className="text-sm">
						<span className="font-semibold text-ink font-mono">
							{totalFiltradas}
						</span>{" "}
						<span className="text-ink-muted">
							preguntas en{" "}
							<span className="font-semibold font-mono">{seleccionadas.length}</span>{" "}
							categoría{seleccionadas.length > 1 ? "s" : ""}
						</span>
					</div>
					<button
						type="button"
						onClick={limpiarTodas}
						className="text-xs text-ink-muted hover:text-ko transition underline"
					>
						Limpiar
					</button>
				</div>
			)}
		</div>
	);
}
