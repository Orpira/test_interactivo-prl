import React from "react";
export default function Footer() {
	return (
		<footer className="bg-ink text-bg p-6 text-center text-sm">
			<p className="mb-2">
				© 2026 PRL App — Plataforma de aprendizaje de Prevención de Riesgos
				Laborales
			</p>
			<p className="text-bg/70">
				Desarrollado con React + Vite + Tailwind ·{" "}
				<a
					href="https://orpira.es"
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
				>
					Hecho por OrPiRa
				</a>
			</p>
		</footer>
	);
}
