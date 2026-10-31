export const GRUPOS = [
	{
		nombre: "Legislación y Normativa",
		icono: "scale",
		color: "blue",
		categorias: [
			"Ley 31/1995 LPRL",
			"Responsabilidades y Sanciones",
			"Subcontratación",
		],
	},
	{
		nombre: "Organización Preventiva",
		icono: "landmark",
		color: "indigo",
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
		icono: "search",
		color: "amber",
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
		icono: "triangle-alert",
		color: "red",
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
		icono: "shield",
		color: "green",
		categorias: [
			"Equipos de Protección",
			"Señalización",
			"Lugares de Trabajo",
			"Manipulación Manual de Cargas",
		],
	},
	{
		nombre: "Emergencias y Primeros Auxilios",
		icono: "siren",
		color: "orange",
		categorias: ["Emergencias", "Incendios", "Primeros Auxilios"],
	},
	{
		nombre: "Colectivos y Trabajos Especiales",
		icono: "hard-hat",
		color: "purple",
		categorias: [
			"Trabajadoras Embarazadas",
			"Trabajos Especiales",
			"Construcción",
			"Trabajo a Turnos",
		],
	},
];

export function construirGrupos(preguntas, grupos = GRUPOS) {
	const categoriasExistentes = new Set(preguntas.map(({ categoria }) => categoria));
	const categoriasAgrupadas = new Set(grupos.flatMap(({ categorias }) => categorias));
	const gruposDisponibles = grupos
		.map((grupo) => ({
			...grupo,
			categorias: grupo.categorias.filter((categoria) =>
				categoriasExistentes.has(categoria),
			),
		}))
		.filter((grupo) => grupo.categorias.length > 0);
	const otras = [...categoriasExistentes].filter(
		(categoria) => !categoriasAgrupadas.has(categoria),
	);

	if (otras.length > 0) {
		gruposDisponibles.push({
			nombre: "Otras",
			icono: "folder-open",
			color: "gray",
			categorias: otras,
		});
	}

	return gruposDisponibles;
}

export function obtenerTodasCategorias(preguntas) {
	return [...new Set(preguntas.map(({ categoria }) => categoria))];
}
