import React from "react";
export default function ContactForm() {
	return (
		<section id="contacto" className="bg-gray-100 p-6">
			<h2 className="text-2xl font-bold mb-4 text-center">Contacto</h2>
			<p className="text-center text-gray-500 mb-4">
				¿Tienes preguntas que aportar o sugerencias? Escríbenos.
			</p>
			<form className="max-w-xl mx-auto grid gap-4">
				<input
					className="p-2 border rounded"
					type="text"
					placeholder="Nombre"
				/>
				<input
					className="p-2 border rounded"
					type="email"
					placeholder="Correo electrónico"
				/>
				<textarea
					className="p-2 border rounded"
					rows="4"
					placeholder="Mensaje o sugerencia sobre PRL"
				></textarea>
				<button
					type="submit"
					className="bg-green-700 text-white py-2 rounded hover:bg-green-800 transition"
				>
					Enviar
				</button>
			</form>
		</section>
	);
}
