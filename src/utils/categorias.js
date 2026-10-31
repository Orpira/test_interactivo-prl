export const GRUPOS = [
	{
		nombre: "Legislación y Normativa",
		senal: "obligacion",
		icono: "Scale",
		categorias: [
			"Ley 31/1995 LPRL",
			"Responsabilidades y Sanciones",
			"Subcontratación",
		],
	},
	{
		nombre: "Organización Preventiva",
		senal: "obligacion",
		icono: "Users",
		categorias: [
			"Plan de Prevención",
			"Servicios de Prevención",
			"Comité de Seguridad",
			"Delegados de Prevención",
			"Coordinación de Actividades",
			"Formación",
			"Cultura Preventiva",
		],
	},
	{
		nombre: "Evaluación y Vigilancia",
		senal: "advertencia",
		icono: "ClipboardCheck",
		categorias: [
			"Evaluación de Riesgos",
			"Vigilancia de la Salud",
			"Accidente de Trabajo",
			"Enfermedades Profesionales",
			"Riesgos Laborales",
		],
	},
	{
		nombre: "Tipos de Riesgos",
		senal: "advertencia",
		icono: "TriangleAlert",
		categorias: [
			"Riesgos Físicos",
			"Riesgos Químicos",
			"Riesgos Biológicos",
			"Riesgos Ergonómicos",
			"Riesgos Psicosociales",
			"Riesgos Eléctricos",
		],
	},
	{
		nombre: "Protección y Entorno",
		senal: "obligacion",
		icono: "HardHat",
		categorias: [
			"Equipos de Protección",
			"Señalización",
			"Lugares de Trabajo",
			"Manipulación Manual de Cargas",
		],
	},
	{
		nombre: "Emergencias y Primeros Auxilios",
		senal: "salvamento",
		icono: "HeartPulse",
		categorias: ["Emergencias", "Incendios", "Primeros Auxilios"],
	},
	{
		nombre: "Colectivos y Trabajos Especiales",
		senal: "advertencia",
		icono: "Construction",
		categorias: [
			"Trabajadoras Embarazadas",
			"Trabajos Especiales",
			"Construcción",
			"Trabajo a Turnos",
		],
	},
];

export const CATEGORIA_ESPECIAL = {
	Incendios: { senal: "incendios", icono: "Flame" },
};

export function normalizar(texto) {
	return String(texto)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

export function contarPorCategoria(preguntas) {
	const recuentos = {};
	for (const { categoria } of preguntas) {
		recuentos[categoria] = (recuentos[categoria] || 0) + 1;
	}
	return recuentos;
}

export function construirGrupos(preguntas, grupos = GRUPOS) {
	const recuentos = contarPorCategoria(preguntas);
	const categoriasAgrupadas = new Set(grupos.flatMap(({ categorias }) => categorias));
	const conRecuento = (nombres) =>
		nombres
			.filter((nombre) => recuentos[nombre] > 0)
			.map((nombre) => ({ nombre, recuento: recuentos[nombre] }));
	const resultado = grupos.map(({ categorias, ...grupo }) => ({
		...grupo,
		categorias: conRecuento(categorias),
	}));
	const sinGrupo = Object.keys(recuentos).filter(
		(nombre) => !categoriasAgrupadas.has(nombre),
	);

	resultado.push({
		nombre: "Otras",
		senal: "otras",
		icono: "Tag",
		categorias: conRecuento(sinGrupo),
	});

	return resultado
		.filter((grupo) => grupo.categorias.length > 0)
		.map((grupo) => ({
			...grupo,
			total: grupo.categorias.reduce((suma, { recuento }) => suma + recuento, 0),
		}));
}

export function obtenerTodasCategorias(preguntas) {
	return [...new Set(preguntas.map(({ categoria }) => categoria))];
}

export function tamanoPegatina(recuento) {
	if (recuento >= 10) return "l";
	if (recuento >= 3) return "m";
	return "s";
}

const nombreCategoria = (categoria) =>
	typeof categoria === "string" ? categoria : categoria.nombre;

export function estadoGrupo(categoriasDelGrupo, seleccionadas) {
	const elegidas = categoriasDelGrupo.filter((categoria) =>
		seleccionadas.includes(nombreCategoria(categoria)),
	).length;
	if (elegidas === 0) return "ninguna";
	return elegidas === categoriasDelGrupo.length ? "todas" : "algunas";
}

export function totalPreguntas(seleccionadas, recuentos) {
	const nombres = seleccionadas.length > 0 ? seleccionadas : Object.keys(recuentos);
	return nombres.reduce((suma, nombre) => suma + (recuentos[nombre] || 0), 0);
}

// Giro fijo entre -2 y 2 grados a partir del nombre, para que no cambie en cada render.
export function giroPegatina(nombre) {
	let hash = 0;
	for (const caracter of nombre) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
	return (hash % 5) - 2;
}

function posicionCoincidencia(nombre, consulta) {
	let normalizado = "";
	const origen = [];
	[...nombre].forEach((caracter, indice) => {
		for (const parte of normalizar(caracter)) {
			normalizado += parte;
			origen.push(indice);
		}
	});
	const inicio = normalizado.indexOf(consulta);
	if (inicio === -1) return null;
	return { inicio: origen[inicio], fin: origen[inicio + consulta.length - 1] + 1 };
}

// Siglas habituales que no aparecen en el nombre de la categoría.
export const ALIAS_BUSQUEDA = {
	"Equipos de Protección": ["epi", "epis"],
};

export function buscar(grupos, texto) {
	const consulta = normalizar(texto.trim());
	if (!consulta) return grupos;
	return grupos
		.map((grupo) => {
			const categorias = grupo.categorias.flatMap((categoria) => {
				const coincidencia = posicionCoincidencia(categoria.nombre, consulta);
				const porAlias = (ALIAS_BUSQUEDA[categoria.nombre] || []).some((alias) =>
					alias.startsWith(consulta),
				);
				return coincidencia || porAlias
					? [{ ...categoria, coincidencia: coincidencia ?? null }]
					: [];
			});
			return {
				...grupo,
				categorias,
				total: categorias.reduce((suma, { recuento }) => suma + recuento, 0),
			};
		})
		.filter((grupo) => grupo.categorias.length > 0);
}

const MINIMO_SORPRESA = 10;
const CATEGORIAS_SORPRESA = 3;

export function sorprendeme(grupos, aleatorio = Math.random) {
	const conCategorias = grupos.filter((grupo) => grupo.categorias.length > 0);
	const mayorDe = (grupo) =>
		grupo.categorias.reduce((mejor, categoria) =>
			categoria.recuento > mejor.recuento ? categoria : mejor,
		);
	const elegirAlAzar = (lista) => lista[Math.floor(aleatorio() * lista.length)];
	const masGrandes = [...conCategorias]
		.map(mayorDe)
		.sort((a, b) => b.recuento - a.recuento)
		.slice(0, CATEGORIAS_SORPRESA);
	const mejorSuma = masGrandes.reduce((suma, { recuento }) => suma + recuento, 0);

	if (mejorSuma >= MINIMO_SORPRESA) {
		for (let intento = 0; intento < 100; intento++) {
			const disponibles = [...conCategorias];
			const elegidas = [];
			while (elegidas.length < CATEGORIAS_SORPRESA && disponibles.length > 0) {
				const [grupo] = disponibles.splice(Math.floor(aleatorio() * disponibles.length), 1);
				elegidas.push(elegirAlAzar(grupo.categorias));
			}
			const suma = elegidas.reduce((total, { recuento }) => total + recuento, 0);
			if (suma >= MINIMO_SORPRESA) return elegidas.map(({ nombre }) => nombre);
		}
	}

	return masGrandes.map(({ nombre }) => nombre);
}
