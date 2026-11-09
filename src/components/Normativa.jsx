import React, { useId, useMemo, useState } from "react";
import { BookOpen, ExternalLink, Search, X } from "lucide-react";
import {
	EQUIVALENCIAS,
	ESTADOS,
	FECHA_REVISION,
	filtrarNormativa,
	NORMATIVAS,
} from "../data/normativa.js";
import { normalizar } from "../utils/categorias.js";

import { PAISES } from "../utils/reglamentacion.js";

const ESTILO_ESTADO = {
	vigente: "bg-surface text-ink-soft",
	nueva: "bg-signal text-ink",
	tramitacion: "bg-senal-obligacion-tint text-senal-obligacion-ink",
};

function fechaLegible(iso) {
	const [anio, mes, dia] = iso.split("-").map(Number);
	return new Date(anio, mes - 1, dia).toLocaleDateString("es-ES", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function FichaNorma({ norma }) {
	return (
		<article className="rounded-xl border border-line bg-card p-5">
			<div className="mb-2 flex flex-wrap items-center gap-2">
				<h4 className="font-display text-lg font-bold text-ink">{norma.norma}</h4>
				<span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${ESTILO_ESTADO[norma.estado]}`}>
					{ESTADOS[norma.estado]}
				</span>
			</div>
			<p className="mb-2 font-semibold text-ink-soft">{norma.nombre}</p>
			<p className="text-sm leading-6 text-ink-muted">{norma.resumen}</p>
			{norma.claves.length > 0 && (
				<ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
					{norma.claves.map((clave) => (
						<li key={clave}>{clave}</li>
					))}
				</ul>
			)}
			{norma.sustituye?.length > 0 && (
				<p className="mt-3 text-sm text-ink-soft">
					<span className="font-semibold">Sustituye a:</span> {norma.sustituye.join(", ")}
				</p>
			)}
		</article>
	);
}

// El país lo comparte toda la app: elegirlo aquí cambia también el banco de preguntas.
export default function Normativa({ pais, onCambiarPais }) {
	const [texto, setTexto] = useState("");
	const [soloNovedades, setSoloNovedades] = useState(false);
	const idBusqueda = useId();
	const idPanel = useId();

	const datos = NORMATIVAS[pais];
	const temas = useMemo(
		() => filtrarNormativa(pais, { texto, soloNovedades }, normalizar),
		[pais, texto, soloNovedades],
	);
	const totalVisibles = temas.reduce((suma, { normas }) => suma + normas.length, 0);

	const elegirPais = onCambiarPais;

	function alPulsarTeclaPestana(evento) {
		if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
		const siguiente = PAISES[(PAISES.indexOf(pais) + 1) % PAISES.length];
		elegirPais(siguiente);
		evento.currentTarget.parentElement.querySelector(`[data-pais="${siguiente}"]`)?.focus();
	}

	return (
		<section id="normativa" className="bg-bg px-6 py-16 text-ink">
			<div className="mx-auto max-w-5xl">
				<p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
					Documentación de referencia
				</p>
				<h2 className="mb-3 text-center font-display text-3xl font-bold md:text-4xl">
					Normativa por país
				</h2>
				<p className="mx-auto mb-8 max-w-2xl text-center text-ink-muted">
					Elige con qué reglamentación quieres trabajar. Cada ficha resume la norma y lo que
					cambió en los últimos años.
				</p>

				<div role="tablist" aria-label="Reglamentación" className="mx-auto mb-8 flex w-fit gap-2 rounded-xl border border-line bg-card p-1.5">
					{PAISES.map((codigo) => {
						const activa = codigo === pais;
						return (
							<button
								key={codigo}
								type="button"
								role="tab"
								data-pais={codigo}
								aria-selected={activa}
								aria-controls={idPanel}
								tabIndex={activa ? 0 : -1}
								onClick={() => elegirPais(codigo)}
								onKeyDown={alPulsarTeclaPestana}
								className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
									activa ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
								}`}
							>
								<span className="font-mono text-xs">{NORMATIVAS[codigo].codigo}</span>
								{NORMATIVAS[codigo].pais}
							</button>
						);
					})}
				</div>

				<div id={idPanel} role="tabpanel" aria-label={`Normativa de ${datos.pais}`}>
					<div className="mb-6 rounded-xl border border-line bg-card p-5">
						<h3 className="mb-1 font-display text-xl font-bold">{datos.titulo}</h3>
						<p className="mb-3 text-sm text-ink-soft">
							<span className="font-semibold">Autoridad:</span> {datos.autoridad}
						</p>
						<p className="text-sm leading-6 text-ink-muted">{datos.resumen}</p>
					</div>

					<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
						<label htmlFor={idBusqueda} className="sr-only">
							Buscar norma
						</label>
						<div className="relative flex-1">
							<Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
							<input
								id={idBusqueda}
								type="search"
								value={texto}
								onChange={(evento) => setTexto(evento.target.value)}
								placeholder="Buscar: alturas, convivencia, 1843…"
								className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
							/>
							{texto && (
								<button
									type="button"
									aria-label="Borrar búsqueda"
									onClick={() => setTexto("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
								>
									<X aria-hidden="true" size={16} />
								</button>
							)}
						</div>
						<button
							type="button"
							aria-pressed={soloNovedades}
							onClick={() => setSoloNovedades((valor) => !valor)}
							className={`rounded-lg border-2 px-4 py-2.5 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
								soloNovedades ? "border-signal bg-signal text-ink" : "border-line bg-card text-ink-soft"
							}`}
						>
							Solo novedades
						</button>
					</div>

					<p aria-live="polite" className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-muted">
						{totalVisibles} {totalVisibles === 1 ? "norma" : "normas"}
					</p>

					{temas.length === 0 && (
						<p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-ink-muted">
							No hay normas que coincidan con la búsqueda.
						</p>
					)}

					{temas.map((tema) => (
						<div key={tema.titulo} className="mb-8">
							<h3 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
								<BookOpen aria-hidden="true" size={20} className="text-primary" />
								{tema.titulo}
							</h3>
							<div className="grid gap-4 md:grid-cols-2">
								{tema.normas.map((norma) => (
									<FichaNorma key={norma.id} norma={norma} />
								))}
							</div>
						</div>
					))}

					{datos.derogadas.length > 0 && !texto && !soloNovedades && (
						<div className="mb-8 rounded-xl border border-ko/30 bg-ko-bg p-5">
							<h3 className="mb-3 font-display text-lg font-bold text-ko-ink">
								Normas derogadas que no debes seguir citando
							</h3>
							<ul className="space-y-1 text-sm text-ko-ink">
								{datos.derogadas.map(({ norma, sustituidaPor }) => (
									<li key={norma}>
										<span className="line-through">{norma}</span> → {sustituidaPor}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<details className="mb-8 rounded-xl border border-line bg-card p-5">
					<summary className="cursor-pointer font-display text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
						Equivalencias entre España y Colombia
					</summary>
					<div className="mt-4 overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-line text-ink-soft">
									<th scope="col" className="py-2 pr-4">Concepto</th>
									<th scope="col" className="py-2 pr-4">España</th>
									<th scope="col" className="py-2">Colombia</th>
								</tr>
							</thead>
							<tbody>
								{EQUIVALENCIAS.map(({ concepto, es, co }) => (
									<tr key={concepto} className="border-b border-line/60 align-top">
										<th scope="row" className="py-2 pr-4 font-semibold">{concepto}</th>
										<td className="py-2 pr-4 text-ink-muted">{es}</td>
										<td className="py-2 text-ink-muted">{co}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</details>

				<p className="text-center text-sm text-ink-muted">
					Contenido orientativo revisado el {fechaLegible(FECHA_REVISION)}. No sustituye al
					texto oficial:{" "}
					<a
						href={datos.fuenteOficial.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
					>
						{datos.fuenteOficial.nombre}
						<ExternalLink aria-hidden="true" size={14} />
					</a>
				</p>
			</div>
		</section>
	);
}
