import React from "react";
import { Trophy } from "lucide-react";
export default function RankingSummary({ resultados, onNuevo }) {
	const ranking = [...resultados].sort((a, b) => {
		if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
		return b.aciertos - a.aciertos;
	});

	return (
		<section id="ranking" className="p-6 md:p-12 bg-bg text-ink">
			<h2 className="text-4xl font-display mb-4 text-center inline-flex items-center justify-center gap-3 w-full">
				<Trophy aria-hidden="true" size={20} strokeWidth={1.75} />
				Ranking PRL
			</h2>
			<p className="text-center text-ink-muted mb-4">
				Resultados de la sesión — {resultados.length} participante
				{resultados.length !== 1 && "s"}
			</p>
			<div className="w-full max-w-xl mx-auto overflow-x-auto border border-line rounded-xl bg-card">
			<table className="w-full">
				<thead>
					<tr className="bg-surface">
						<th className="p-2 text-left">#</th>
						<th className="p-2 text-left">Nombre</th>
						<th className="p-2 text-right">Aciertos</th>
						<th className="p-2 text-right">Puntuación</th>
					</tr>
				</thead>
				<tbody>
					{ranking.map((r, i) => (
						<tr
							key={i}
							className={`border-t border-line ${i === 0 ? "bg-surface font-bold" : ""}`}
						>
							<td className="p-2 font-mono font-bold">
								{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
							</td>
							<td className="p-2">{r.nombre}</td>
							<td className="p-2 text-right font-mono">
								{r.aciertos}/{r.total}
							</td>
							<td className="p-2 text-right font-mono font-semibold">{r.porcentaje}%</td>
						</tr>
					))}
				</tbody>
			</table>
			</div>
			<div className="text-center mt-6">
				<button
					onClick={onNuevo}
					className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					Nueva sesión
				</button>
			</div>
		</section>
	);
}
