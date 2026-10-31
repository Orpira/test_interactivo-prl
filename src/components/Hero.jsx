import React from "react";
import Features from "./Features";
export default function Hero() {
	return (
		<section className="relative flex flex-col items-center bg-bg text-ink px-6 pt-20 pb-16 md:pt-24 md:pb-20 text-center">
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(135deg,theme(colors.signal.DEFAULT)_0_12px,theme(colors.ink.DEFAULT)_12px_24px)]"
			/>
			<p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-ink-muted">
				Aprendizaje práctico · Prevención de riesgos
			</p>
			<h1 className="max-w-5xl text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
				Aprende prevención <span className="bg-signal text-ink px-2 rounded-md">haciendo</span>
			</h1>
			<p className="text-lg md:text-xl mb-9 max-w-2xl text-ink-muted">
				Plataforma interactiva de tests para aprender la normativa PRL española
				de forma clara y práctica. Pon a prueba tus conocimientos pregunta a
				pregunta.
			</p>
			<Features />
			<a
				href="#quiz"
				className="mt-10 bg-primary hover:bg-primary-dark text-white px-7 py-3.5 rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
			>
				Comenzar test
			</a>
			<div className="mt-7 flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-ink-muted">
				<span aria-hidden="true" className="h-px w-8 bg-line" />
				<a
					href="#quiz"
					className="hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
				>
					Test PRL
				</a>
				<span aria-hidden="true" className="h-px w-8 bg-line" />
			</div>
		</section>
	);
}
