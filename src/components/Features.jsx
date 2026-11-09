import React from "react";
import { BookOpenCheck, FolderTree, Trophy, UsersRound } from "lucide-react";
export default function Features() {
	const features = [
		{
			icon: BookOpenCheck,
			title: "Tests interactivos",
			desc: "Preguntas tipo test sobre normativa PRL con respuestas inmediatas",
		},
		{
			icon: BookOpenCheck,
			title: "Contenido práctico",
			desc: "Ley 31/1995 española y documentación del SG-SST colombiano actualizada",
		},
		{
			icon: Trophy,
			title: "Sistema de puntuación",
			desc: "Compite contigo mismo y mejora tu conocimiento progresivamente",
		},
		{
			icon: FolderTree,
			desc: "Evaluación de riesgos, EPIs, señalización, emergencias y más",
			title: "Categorías temáticas",
		},
		{
			icon: UsersRound,
			title: "Juego compartido",
			desc: "Practica a solas, por turnos en el aula o en salas en red",
		},
	];

	return (
		<div className="w-full max-w-7xl mx-auto mt-2">
			<p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft text-center mb-3">
				Una forma activa de aprender
			</p>
			<h2 className="text-3xl md:text-4xl font-display mb-8 text-center">
				¿Qué encontrarás?
			</h2>
			<div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
				{features.map((f, i) => (
					<div
						key={i}
						className="border border-line bg-card p-5 rounded-xl transition motion-safe:hover:-translate-y-1"
					>
						<f.icon
							aria-hidden="true"
							size={20}
							strokeWidth={1.75}
							className="text-primary mb-5"
						/>
						<h3 className="font-semibold text-lg mb-2 text-ink">{f.title}</h3>
						<p className="text-sm leading-6 text-ink-muted">{f.desc}</p>
					</div>
				))}
			</div>
		</div>
	);
}
