import React from "react";
export default function Features() {
	const features = [
		{
			title: "📝 Tests interactivos",
			desc: "Preguntas tipo test sobre normativa PRL con respuestas inmediatas",
		},
		{
			title: "📚 Contenido actualizado",
			desc: "Basado en la Ley 31/1995 y normativa vigente española",
		},
		{
			title: "🏆 Sistema de puntuación",
			desc: "Compite contigo mismo y mejora tu conocimiento progresivamente",
		},
		{
			title: "📂 Categorías temáticas",
			desc: "Evaluación de riesgos, EPIs, señalización, emergencias y más",
		},
	];

	return (
		<section className="p-6 bg-white">
			<h2 className="text-2xl font-bold mb-4 text-center">¿Qué encontrarás?</h2>
			<div className="grid md:grid-cols-4 gap-6">
				{features.map((f, i) => (
					<div
						key={i}
						className="border p-4 rounded-xl shadow hover:shadow-lg transition"
					>
						<h3 className="font-semibold text-lg mb-2">{f.title}</h3>
						<p>{f.desc}</p>
					</div>
				))}
			</div>
		</section>
	);
}
