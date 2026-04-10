import React from "react";
export default function RankingSummary({ resultados, onNuevo }) {
	const ranking = [...resultados].sort((a, b) => {
		if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
		return b.aciertos - a.aciertos;
	});

	return (
		<section id="ranking" className="p-6 bg-white">
			<h2 className="text-2xl font-bold mb-4 text-center">🏆 Ranking PRL</h2>
			<p className="text-center text-gray-500 mb-4">
				Resultados de la sesión — {resultados.length} participante
				{resultados.length !== 1 && "s"}
			</p>
			<table className="w-full max-w-xl mx-auto border">
				<thead>
					<tr className="bg-green-100">
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
							className={`border-t ${i === 0 ? "bg-yellow-50 font-bold" : ""}`}
						>
							<td className="p-2 font-bold">
								{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
							</td>
							<td className="p-2">{r.nombre}</td>
							<td className="p-2 text-right">
								{r.aciertos}/{r.total}
							</td>
							<td className="p-2 text-right font-semibold">{r.porcentaje}%</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="text-center mt-6">
				<button
					onClick={onNuevo}
					className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
				>
					Nueva sesión
				</button>
			</div>
		</section>
	);
}
