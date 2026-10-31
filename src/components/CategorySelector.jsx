import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Check,
	ClipboardCheck,
	Construction,
	Flame,
	HardHat,
	HeartPulse,
	ListChecks,
	Scale,
	Search,
	Shuffle,
	Tag,
	TriangleAlert,
	Users,
	X,
} from "lucide-react";
import {
	buscar,
	CATEGORIA_ESPECIAL,
	construirGrupos,
	contarPorCategoria,
	estadoGrupo,
	giroPegatina,
	obtenerTodasCategorias,
	sorprendeme,
	tamanoPegatina,
	totalPreguntas,
} from "../utils/categorias.js";
import { ESTILOS_SENAL } from "../utils/estilosSenal.js";
import Senal from "./Senal.jsx";

const ICONOS = {
	Scale,
	Users,
	HardHat,
	ClipboardCheck,
	TriangleAlert,
	Construction,
	HeartPulse,
	Tag,
	Flame,
};

const TAMANOS_PEGATINA = {
	s: "text-[13px] px-3 py-1.5",
	m: "text-[15px] px-4 py-2",
	l: "text-[17px] px-5 py-2.5 font-semibold",
};

const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;
const textoPreguntas = (n) => plural(n, "pregunta", "preguntas");
const textoTemas = (n) => plural(n, "tema", "temas");

function usePantallaAncha() {
	const consulta = "(min-width: 640px)";
	const [ancha, setAncha] = useState(() =>
		typeof window !== "undefined" && window.matchMedia
			? window.matchMedia(consulta).matches
			: true,
	);
	useEffect(() => {
		if (!window.matchMedia) return undefined;
		const medios = window.matchMedia(consulta);
		const alCambiar = (evento) => setAncha(evento.matches);
		medios.addEventListener("change", alCambiar);
		return () => medios.removeEventListener("change", alCambiar);
	}, []);
	return ancha;
}

function NombreResaltado({ nombre, coincidencia }) {
	if (!coincidencia) return nombre;
	return (
		<>
			{nombre.slice(0, coincidencia.inicio)}
			<mark className="rounded-sm bg-senal-advertencia px-0.5 text-ink">
				{nombre.slice(coincidencia.inicio, coincidencia.fin)}
			</mark>
			{nombre.slice(coincidencia.fin)}
		</>
	);
}

function Pegatina({ categoria, senal, elegida, rebota, onAlternar, onFinRebote }) {
	const { nombre, recuento, coincidencia } = categoria;
	const especial = CATEGORIA_ESPECIAL[nombre];
	const estilos = ESTILOS_SENAL[especial?.senal ?? senal];
	const IconoFuego = especial ? ICONOS[especial.icono] : null;
	const tamano = tamanoPegatina(recuento);

	return (
		<button
			type="button"
			aria-pressed={elegida}
			aria-label={`${nombre}, ${textoPreguntas(recuento)}`}
			onClick={() => onAlternar(nombre)}
			onAnimationEnd={onFinRebote}
			style={{ "--giro": `${giroPegatina(nombre)}deg` }}
			className={`inline-flex items-center gap-2 rounded-full border-2 transition motion-safe:rotate-[var(--giro)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:rotate-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ${estilos.foco} ${estilos.borde} ${TAMANOS_PEGATINA[tamano]} ${
				elegida ? estilos.solido : `bg-white ${estilos.tinta}`
			} ${rebota ? "motion-safe:animate-rebote" : ""}`}
		>
			{elegida && <Check aria-hidden="true" size={16} strokeWidth={2.5} />}
			{IconoFuego && <IconoFuego aria-hidden="true" size={16} strokeWidth={2} />}
			<span>
				<NombreResaltado nombre={nombre} coincidencia={coincidencia} />
			</span>
			<span
				className={`rounded-full px-2 font-mono text-xs ${
					elegida ? "bg-black/15" : estilos.tinte
				}`}
			>
				{recuento}
			</span>
			{recuento <= 2 && <span className="text-[11px] italic">pocas</span>}
		</button>
	);
}

export default function CategorySelector({
	preguntas,
	seleccionadas,
	onChange,
	compacto = false,
}) {
	const [busqueda, setBusqueda] = useState("");
	const [grupoAbierto, setGrupoAbierto] = useState(null);
	const [rebotada, setRebotada] = useState(null);
	const [muesca, setMuesca] = useState(32);
	const [hayMasDerecha, setHayMasDerecha] = useState(false);
	const pantallaAncha = usePantallaAncha();
	const tamanoSenal = compacto ? 48 : pantallaAncha ? 72 : 60;

	const filaRef = useRef(null);
	const panelRef = useRef(null);
	const buscadorRef = useRef(null);
	const botonesGrupo = useRef({});

	const recuentos = useMemo(() => contarPorCategoria(preguntas), [preguntas]);
	const grupos = useMemo(() => construirGrupos(preguntas), [preguntas]);
	const resultados = useMemo(() => buscar(grupos, busqueda), [grupos, busqueda]);
	const buscando = busqueda.trim() !== "";
	const total = totalPreguntas(seleccionadas, recuentos);
	const grupoActual = grupos.find(({ nombre }) => nombre === grupoAbierto) ?? null;

	const alternarCategoria = useCallback(
		(nombre) => {
			const quitar = seleccionadas.includes(nombre);
			onChange(
				quitar ? seleccionadas.filter((c) => c !== nombre) : [...seleccionadas, nombre],
			);
			setRebotada(quitar ? null : nombre);
		},
		[onChange, seleccionadas],
	);

	function alternarGrupo(categorias) {
		const nombres = categorias.map(({ nombre }) => nombre);
		onChange(
			estadoGrupo(categorias, seleccionadas) === "todas"
				? seleccionadas.filter((c) => !nombres.includes(c))
				: [...new Set([...seleccionadas, ...nombres])],
		);
	}

	function elegirEncontradas(nombres) {
		onChange([...new Set([...seleccionadas, ...nombres])]);
	}

	function borrarBusqueda() {
		setBusqueda("");
		buscadorRef.current?.focus();
	}

	function alPulsarTecla(evento) {
		if (evento.key === "Escape" && buscando) {
			evento.stopPropagation();
			borrarBusqueda();
		}
	}

	const medirFila = useCallback(() => {
		const fila = filaRef.current;
		if (fila) setHayMasDerecha(fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 4);
	}, []);

	const colocarMuesca = useCallback(() => {
		const boton = botonesGrupo.current[grupoAbierto];
		const panel = panelRef.current;
		if (!boton || !panel) return;
		const cajaBoton = boton.getBoundingClientRect();
		const cajaPanel = panel.getBoundingClientRect();
		const centro = cajaBoton.left + cajaBoton.width / 2 - cajaPanel.left;
		setMuesca(Math.min(Math.max(centro, 32), Math.max(cajaPanel.width - 32, 32)));
	}, [grupoAbierto]);

	useLayoutEffect(() => {
		colocarMuesca();
		medirFila();
	}, [colocarMuesca, medirFila, tamanoSenal, grupos]);

	useEffect(() => {
		window.addEventListener("resize", colocarMuesca);
		window.addEventListener("resize", medirFila);
		return () => {
			window.removeEventListener("resize", colocarMuesca);
			window.removeEventListener("resize", medirFila);
		};
	}, [colocarMuesca, medirFila]);

	const encontradas = resultados.flatMap((grupo) =>
		grupo.categorias.map((categoria) => ({ categoria, senal: grupo.senal })),
	);
	const todasEncontradasElegidas = encontradas.every(({ categoria }) =>
		seleccionadas.includes(categoria.nombre),
	);
	const proporcion = Math.min(100, (total / Math.max(preguntas.length, 1)) * 100);

	return (
		<div
			onKeyDown={alPulsarTecla}
			className={`w-full ${compacto ? "max-w-lg" : "max-w-4xl"} mx-auto text-center`}
		>
			<h3 className="text-2xl font-display font-bold text-ink">
				¿Qué quieres practicar?
			</h3>
			<p className="mt-1 mb-5 text-sm text-ink-soft">
				Toca una señal para ver sus temas, o empieza con todas.
			</p>

			<div className="mb-6 flex flex-wrap items-center justify-center gap-2">
				<div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
					<Search
						aria-hidden="true"
						size={20}
						strokeWidth={1.75}
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
					/>
					<input
						ref={buscadorRef}
						type="text"
						aria-label="Buscar tema"
						value={busqueda}
						onChange={(evento) => setBusqueda(evento.target.value)}
						placeholder="Buscar tema…"
						className="w-full rounded-lg border border-line bg-card py-2 pl-10 pr-9 text-sm"
					/>
					{buscando && (
						<button
							type="button"
							aria-label="Borrar búsqueda"
							onClick={borrarBusqueda}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:bg-surface"
						>
							<X aria-hidden="true" size={16} strokeWidth={2} />
						</button>
					)}
				</div>
				<button
					type="button"
					onClick={() => onChange(sorprendeme(grupos))}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
				>
					<Shuffle aria-hidden="true" size={20} strokeWidth={1.75} />
					Sorpréndeme
				</button>
				<button
					type="button"
					onClick={() => onChange(obtenerTodasCategorias(preguntas))}
					className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
				>
					<ListChecks aria-hidden="true" size={20} strokeWidth={1.75} />
					Todas
				</button>
			</div>

			{buscando ? (
				<section
					aria-label="Resultados de la búsqueda"
					className="rounded-3xl border border-line bg-card p-5 text-left"
				>
					{encontradas.length === 0 ? (
						<div className="text-center">
							<p aria-live="polite" className="mb-3 text-ink-soft">
								No hay temas con «{busqueda.trim()}»
							</p>
							<button
								type="button"
								onClick={borrarBusqueda}
								className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-surface"
							>
								Borrar búsqueda
							</button>
						</div>
					) : (
						<>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
								<p aria-live="polite" className="text-sm font-semibold text-ink">
									{plural(encontradas.length, "tema encontrado", "temas encontrados")}
								</p>
								<button
									type="button"
									disabled={todasEncontradasElegidas}
									onClick={() =>
										elegirEncontradas(encontradas.map(({ categoria }) => categoria.nombre))
									}
									className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
								>
									Elegir {encontradas.length === 1 ? "el tema" : `los ${encontradas.length}`}
								</button>
							</div>
							<div className="flex flex-wrap gap-2.5">
								{encontradas.map(({ categoria, senal }) => (
									<Pegatina
										key={categoria.nombre}
										categoria={categoria}
										senal={senal}
										elegida={seleccionadas.includes(categoria.nombre)}
										rebota={rebotada === categoria.nombre}
										onAlternar={alternarCategoria}
										onFinRebote={() => setRebotada(null)}
									/>
								))}
							</div>
						</>
					)}
				</section>
			) : (
				<>
					<div className="relative">
						<ul
							ref={filaRef}
							onScroll={medirFila}
							className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-3 [scrollbar-width:none] sm:snap-none sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-5 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
						>
							{grupos.map((grupo) => {
								const elegidas = grupo.categorias.filter(({ nombre }) =>
									seleccionadas.includes(nombre),
								).length;
								const abierto = grupoAbierto === grupo.nombre;
								return (
									<li
										key={grupo.nombre}
										className={`shrink-0 snap-start ${compacto ? "w-36" : "w-36 sm:w-40"}`}
									>
										<button
											type="button"
											ref={(elemento) => {
												botonesGrupo.current[grupo.nombre] = elemento;
											}}
											aria-expanded={abierto}
											aria-label={`${grupo.nombre}, ${textoPreguntas(grupo.total)}, ${
												elegidas === 0
													? "ningún tema seleccionado"
													: `${textoTemas(elegidas)} ${elegidas === 1 ? "seleccionado" : "seleccionados"}`
											}`}
											onClick={() => setGrupoAbierto(abierto ? null : grupo.nombre)}
											className={`group flex w-full flex-col items-center gap-2 rounded-2xl p-1 text-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ${ESTILOS_SENAL[grupo.senal].foco}`}
										>
											<span className="relative transition motion-safe:group-hover:-translate-y-[3px] motion-safe:group-hover:rotate-3">
												<Senal
													tipo={grupo.senal}
													icono={ICONOS[grupo.icono]}
													tamano={tamanoSenal}
													activa={elegidas > 0}
												/>
												{elegidas > 0 && (
													<span
														aria-hidden="true"
														className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 font-mono text-[11px] text-white ring-2 ring-bg"
													>
														{elegidas}
													</span>
												)}
											</span>
											<span
												className={`line-clamp-2 text-xs font-semibold leading-tight text-ink ${
													compacto ? "" : "sm:text-[13px]"
												}`}
											>
												{grupo.nombre}
											</span>
											<span className="font-mono text-xs text-ink-soft">
												{grupo.total} preguntas
											</span>
										</button>
									</li>
								);
							})}
						</ul>
						{hayMasDerecha && (
							<span
								aria-hidden="true"
								className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-bg sm:hidden"
							/>
						)}
					</div>

					{grupoActual && (
						<div
							key={grupoActual.nombre}
							ref={panelRef}
							className="relative mt-4 grid animate-panel grid-rows-[1fr] text-left"
						>
							<span
								aria-hidden="true"
								style={{ left: muesca - 8 }}
								className={`absolute -top-2 h-4 w-4 rotate-45 ${ESTILOS_SENAL[grupoActual.senal].fondoTinte}`}
							/>
							<section
								aria-label={`Temas de ${grupoActual.nombre}`}
								className={`min-h-0 overflow-hidden rounded-3xl ${ESTILOS_SENAL[grupoActual.senal].fondoTinte}`}
							>
								<div className="p-5">
									<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
										<p className={`font-display font-semibold ${ESTILOS_SENAL[grupoActual.senal].tinta}`}>
											{grupoActual.nombre}
										</p>
										<button
											type="button"
											onClick={() => alternarGrupo(grupoActual.categorias)}
											className={`rounded-lg border-2 bg-white px-3 py-1 text-sm font-semibold ${ESTILOS_SENAL[grupoActual.senal].borde} ${ESTILOS_SENAL[grupoActual.senal].tinta} focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ${ESTILOS_SENAL[grupoActual.senal].foco}`}
										>
											{estadoGrupo(grupoActual.categorias, seleccionadas) === "todas"
												? "Quitar el grupo"
												: "Elegir todo el grupo"}
										</button>
									</div>
									<div className="flex flex-wrap gap-2.5">
										{grupoActual.categorias.map((categoria) => (
											<Pegatina
												key={categoria.nombre}
												categoria={categoria}
												senal={grupoActual.senal}
												elegida={seleccionadas.includes(categoria.nombre)}
												rebota={rebotada === categoria.nombre}
												onAlternar={alternarCategoria}
												onFinRebote={() => setRebotada(null)}
											/>
										))}
									</div>
								</div>
							</section>
						</div>
					)}
				</>
			)}

			<div
				className={`mx-auto mt-6 w-fit max-w-full rounded-3xl bg-ink px-5 py-3 text-white shadow-lg ${
					compacto ? "" : "sticky bottom-4 z-10"
				}`}
			>
				<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
					<p aria-live="polite" className="text-sm font-semibold">
						{seleccionadas.length === 0 ? (
							<>Todas las categorías · {textoPreguntas(total)}</>
						) : total < 5 ? (
							<>
								<span className="text-senal-advertencia">
									Solo {textoPreguntas(total)}
								</span>{" "}
								· {textoTemas(seleccionadas.length)}
							</>
						) : (
							<>
								{textoPreguntas(total)} · {textoTemas(seleccionadas.length)}
							</>
						)}
					</p>
					{seleccionadas.length > 0 && (
						<button
							type="button"
							onClick={() => onChange([])}
							className="inline-flex items-center gap-1 rounded-full border border-white/40 px-2.5 py-0.5 text-xs font-semibold hover:bg-white/10 focus-visible:outline-white"
						>
							<X aria-hidden="true" size={14} strokeWidth={2} />
							Limpiar
						</button>
					)}
				</div>
				<div
					role="presentation"
					className="mt-2 h-1.5 w-full min-w-[12rem] overflow-hidden rounded-full bg-white/20"
				>
					<div
						style={{ width: `${proporcion}%` }}
						className="h-full bg-[repeating-linear-gradient(45deg,theme(colors.senal.advertencia.DEFAULT)_0_8px,theme(colors.ink.DEFAULT)_8px_16px)] transition-[width] duration-300"
					/>
				</div>
			</div>
		</div>
	);
}
