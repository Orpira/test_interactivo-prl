export function barajar(arr) {
	const copia = [...arr];
	for (let i = copia.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copia[i], copia[j]] = [copia[j], copia[i]];
	}
	return copia;
}

export function barajarOpciones(pregunta) {
	const indices = barajar(pregunta.opciones.map((_, indice) => indice));
	return {
		...pregunta,
		opciones: indices.map((indice) => pregunta.opciones[indice]),
		respuesta: indices.indexOf(pregunta.respuesta),
	};
}

export function prepararTest(preguntas, cantidad) {
	return barajar(preguntas)
		.slice(0, cantidad)
		.map(barajarOpciones);
}
