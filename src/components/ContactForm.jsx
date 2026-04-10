import React from "react";
export default function ContactForm({ onClose }) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6 relative"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={onClose}
					className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
					aria-label="Cerrar"
				>
					&times;
				</button>
				<h2 className="text-2xl font-bold mb-4 text-center">Contacto</h2>
				<p className="text-center text-gray-500 mb-4">
					¿Tienes preguntas que aportar o sugerencias? Escríbenos.
				</p>
				<form className="grid gap-4">
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
			</div>
		</div>
	);
}
