import React from "react";
export default function Hero() {
	return (
		<section className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-700 to-emerald-900 text-white p-6 text-center">
			<h1 className="text-4xl md:text-5xl font-bold mb-4">
				Aprende Prevención de Riesgos Laborales
			</h1>
			<p className="text-lg md:text-xl mb-8 max-w-2xl">
				Plataforma interactiva de tests para aprender la normativa PRL española
				de forma didáctica y divertida. Pon a prueba tus conocimientos con
				preguntas tipo test.
			</p>
			<a
				href="#quiz"
				className="bg-white text-green-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
			>
				Comenzar test
			</a>
			<div className="mt-6 flex gap-4 underline">
				<a href="#quiz">Test PRL</a>
				<a href="#ranking">Ranking</a>
				<a href="#contacto">Contacto</a>
			</div>
		</section>
	);
}
