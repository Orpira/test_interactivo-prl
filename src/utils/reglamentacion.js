import { GRUPOS } from "./categorias.js";

// Grupos temáticos del banco colombiano; usan las mismas señales e iconos que el español.
export const GRUPOS_CO = [
	{
		nombre: "Marco legal y SG-SST",
		senal: "obligacion",
		icono: "Scale",
		categorias: [
			"Sistema General de Riesgos Laborales",
			"SG-SST (Decreto 1072)",
			"Estándares Mínimos",
			"Inspección y Sanciones",
		],
	},
	{
		nombre: "Participación y Convivencia",
		senal: "obligacion",
		icono: "Users",
		categorias: ["COPASST y Vigía", "Convivencia y Acoso Laboral"],
	},
	{
		nombre: "Salud y Eventos Laborales",
		senal: "advertencia",
		icono: "ClipboardCheck",
		categorias: [
			"Evaluaciones Médicas Ocupacionales",
			"Accidentes e Incidentes",
			"Enfermedad Laboral",
			"Riesgo Psicosocial y Salud Mental",
		],
	},
	{
		nombre: "Peligros y Tareas Críticas",
		senal: "advertencia",
		icono: "TriangleAlert",
		categorias: [
			"Peligros y Matriz de Riesgos",
			"Trabajo en Alturas",
			"Espacios Confinados y Riesgo Eléctrico",
			"Sustancias Químicas (SGA)",
		],
	},
	{
		nombre: "Emergencias",
		senal: "salvamento",
		icono: "HeartPulse",
		categorias: ["Plan de Emergencias"],
	},
	{
		nombre: "Condiciones de Trabajo",
		senal: "advertencia",
		icono: "Construction",
		categorias: ["Jornada y Reforma Laboral"],
	},
];

export const REGLAMENTACIONES = {
	es: {
		id: "es",
		pais: "España",
		codigo: "ES",
		siglas: "PRL",
		banco: "/preguntas-prl.json",
		grupos: GRUPOS,
	},
	co: {
		id: "co",
		pais: "Colombia",
		codigo: "CO",
		siglas: "SST",
		banco: "/preguntas-sst-colombia.json",
		grupos: GRUPOS_CO,
	},
};

export const PAISES = Object.keys(REGLAMENTACIONES);
const CLAVE = "prl-reglamentacion";

export const reglamentacion = (pais) => REGLAMENTACIONES[pais] ?? REGLAMENTACIONES.es;

export function leerReglamentacion() {
	try {
		const guardada = window.localStorage.getItem(CLAVE);
		return PAISES.includes(guardada) ? guardada : "es";
	} catch {
		return "es";
	}
}

export function guardarReglamentacion(pais) {
	try {
		window.localStorage.setItem(CLAVE, pais);
	} catch {
		// Sin almacenamiento disponible la elección dura solo esta visita.
	}
}
