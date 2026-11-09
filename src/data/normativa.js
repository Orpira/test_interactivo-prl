// Documentación de referencia de la normativa de seguridad y salud en el trabajo por país.
// Es orientativa: cada ficha resume la norma con palabras propias y enlaza al gestor
// normativo oficial. Revisa `FECHA_REVISION` cada vez que se actualice el contenido.

export const FECHA_REVISION = "2026-11-09";

export const ESTADOS = {
	vigente: "Vigente",
	nueva: "Novedad 2024-2026",
	tramitacion: "En tramitación",
};

export const NORMATIVAS = {
	es: {
		id: "es",
		pais: "España",
		codigo: "ES",
		titulo: "Prevención de Riesgos Laborales (PRL)",
		autoridad:
			"Ministerio de Trabajo y Economía Social, Inspección de Trabajo y Seguridad Social e INSST",
		resumen:
			"La Ley 31/1995 fija el marco general y los reales decretos de 1997 en adelante desarrollan cada riesgo. La gestión se apoya en la evaluación de riesgos, la planificación preventiva y una modalidad de organización preventiva (servicio propio, ajeno, mancomunado o asunción por el empresario).",
		fuenteOficial: {
			nombre: "Código de Prevención de Riesgos Laborales (BOE)",
			url: "https://www.boe.es/biblioteca_juridica/codigos/codigo.php?id=037_Prevencion_de_riesgos_laborales",
		},
		temas: [
			{
				titulo: "Marco general",
				normas: [
					{
						id: "es-ley-31-1995",
						norma: "Ley 31/1995",
						anio: 1995,
						nombre: "Ley de Prevención de Riesgos Laborales",
						estado: "vigente",
						resumen:
							"Define derechos y obligaciones de empresas y personas trabajadoras, los principios de la acción preventiva y la participación a través de delegados de prevención y comités de seguridad y salud.",
						claves: [
							"Comité de Seguridad y Salud desde 50 trabajadores",
							"Delegados de prevención según plantilla (art. 35)",
							"Formación e información a cargo de la empresa y sin coste",
						],
					},
					{
						id: "es-rd-39-1997",
						norma: "RD 39/1997",
						anio: 1997,
						nombre: "Reglamento de los Servicios de Prevención",
						estado: "vigente",
						resumen:
							"Regula la evaluación de riesgos, la planificación de la actividad preventiva y las modalidades de organización de la prevención.",
						claves: [
							"Evaluación inicial y revisión periódica",
							"Niveles de formación básico, intermedio y superior",
						],
					},
					{
						id: "es-anteproyecto-2026",
						norma: "Anteproyecto de reforma de la LPRL",
						anio: 2026,
						nombre: "Modificación de la Ley 31/1995, el Estatuto de los Trabajadores y el RD 39/1997",
						estado: "tramitacion",
						resumen:
							"Aprobado en Consejo de Ministros el 28 de abril de 2026. Incorpora la perspectiva de género y edad, los riesgos psicosociales y los climáticos. Aún debe completar su tramitación parlamentaria, por lo que la Ley 31/1995 sigue en vigor sin esos cambios.",
						claves: ["No es exigible hasta su publicación en el BOE"],
					},
				],
			},
			{
				titulo: "Riesgos y lugares de trabajo",
				normas: [
					{
						id: "es-rd-486-1997",
						norma: "RD 486/1997",
						anio: 1997,
						nombre: "Lugares de trabajo",
						estado: "vigente",
						resumen:
							"Condiciones mínimas de seguridad, orden, limpieza, iluminación y condiciones ambientales.",
						claves: [],
					},
					{
						id: "es-rd-485-1997",
						norma: "RD 485/1997",
						anio: 1997,
						nombre: "Señalización de seguridad y salud",
						estado: "vigente",
						resumen: "Tipos de señales, colores de seguridad y cuándo debe usarse la señalización.",
						claves: [],
					},
					{
						id: "es-rd-487-1997",
						norma: "RD 487/1997",
						anio: 1997,
						nombre: "Manipulación manual de cargas",
						estado: "vigente",
						resumen: "Obligaciones para evitar o reducir los riesgos dorsolumbares al manipular cargas.",
						claves: [],
					},
					{
						id: "es-rd-488-1997",
						norma: "RD 488/1997",
						anio: 1997,
						nombre: "Pantallas de visualización",
						estado: "vigente",
						resumen: "Requisitos del puesto con pantallas, pausas y vigilancia de la salud visual.",
						claves: [],
					},
					{
						id: "es-rd-374-2001",
						norma: "RD 374/2001",
						anio: 2001,
						nombre: "Agentes químicos",
						estado: "vigente",
						resumen: "Evaluación y control de la exposición a agentes químicos peligrosos.",
						claves: [],
					},
					{
						id: "es-rd-614-2001",
						norma: "RD 614/2001",
						anio: 2001,
						nombre: "Riesgo eléctrico",
						estado: "vigente",
						resumen: "Las cinco reglas de oro y los trabajos sin tensión, en tensión y en proximidad.",
						claves: [],
					},
					{
						id: "es-rd-286-2006",
						norma: "RD 286/2006",
						anio: 2006,
						nombre: "Ruido",
						estado: "vigente",
						resumen: "Valores de exposición que dan lugar a una acción (80 y 85 dB(A)) y valor límite (87 dB(A)).",
						claves: [],
					},
				],
			},
			{
				titulo: "Equipos, coordinación y sanciones",
				normas: [
					{
						id: "es-rd-773-1997",
						norma: "RD 773/1997",
						anio: 1997,
						nombre: "Equipos de protección individual",
						estado: "vigente",
						resumen: "Elección, uso y mantenimiento de los EPI como último recurso tras las medidas colectivas.",
						claves: [],
					},
					{
						id: "es-rd-1215-1997",
						norma: "RD 1215/1997",
						anio: 1997,
						nombre: "Equipos de trabajo",
						estado: "vigente",
						resumen: "Requisitos de seguridad de máquinas y equipos puestos a disposición de la plantilla.",
						claves: [],
					},
					{
						id: "es-rd-171-2004",
						norma: "RD 171/2004",
						anio: 2004,
						nombre: "Coordinación de actividades empresariales",
						estado: "vigente",
						resumen: "Intercambio de información y medios de coordinación cuando concurren varias empresas.",
						claves: [],
					},
					{
						id: "es-rd-1627-1997",
						norma: "RD 1627/1997",
						anio: 1997,
						nombre: "Obras de construcción",
						estado: "vigente",
						resumen: "Estudio y plan de seguridad y salud, y coordinador en fase de proyecto y de ejecución.",
						claves: [],
					},
					{
						id: "es-rdl-5-2000",
						norma: "RDL 5/2000 (LISOS)",
						anio: 2000,
						nombre: "Infracciones y sanciones en el orden social",
						estado: "vigente",
						resumen: "Clasifica las infracciones en PRL como leves, graves y muy graves y fija sus sanciones.",
						claves: [],
					},
				],
			},
		],
		derogadas: [],
	},

	co: {
		id: "co",
		pais: "Colombia",
		codigo: "CO",
		titulo: "Seguridad y Salud en el Trabajo (SST)",
		autoridad:
			"Ministerio del Trabajo (inspección, vigilancia y control), Ministerio de Salud y Protección Social y las ARL",
		resumen:
			"Toda empresa, contratante o empleador debe implementar un Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST) basado en el ciclo PHVA (Decreto 1072 de 2015) y cumplir los Estándares Mínimos según su tamaño y clase de riesgo (Resolución 0312 de 2019). Entre 2025 y 2026 cambiaron las evaluaciones médicas, el Comité de Convivencia, la salud mental y la prevención del acoso.",
		fuenteOficial: {
			nombre: "Normatividad del Ministerio del Trabajo",
			url: "https://www.mintrabajo.gov.co/normatividad",
		},
		temas: [
			{
				titulo: "Marco general del Sistema General de Riesgos Laborales",
				normas: [
					{
						id: "co-dec-1072-2015",
						norma: "Decreto 1072 de 2015",
						anio: 2015,
						nombre: "Decreto Único Reglamentario del Sector Trabajo",
						estado: "vigente",
						resumen:
							"Compila la reglamentación laboral. Su Libro 2, Parte 2, Título 4, Capítulo 6 regula el SG-SST: política, objetivos, matriz de peligros, plan anual, indicadores, auditoría y revisión por la alta dirección. Sigue recibiendo capítulos nuevos (salud mental en 2025, acoso en 2026).",
						claves: [
							"Ciclo PHVA: planificar, hacer, verificar, actuar",
							"Conservar los registros del SG-SST al menos 20 años",
							"Revisión anual por la alta dirección",
						],
					},
					{
						id: "co-ley-1562-2012",
						norma: "Ley 1562 de 2012",
						anio: 2012,
						nombre: "Modifica el Sistema General de Riesgos Laborales",
						estado: "vigente",
						resumen:
							"Sustituye «salud ocupacional» por «seguridad y salud en el trabajo», define accidente de trabajo y enfermedad laboral e incluye a contratistas e independientes en el sistema.",
						claves: [
							"Multas de hasta 500 SMMLV por incumplir el SG-SST",
							"Hasta 1.000 SMMLV si el incumplimiento causa la muerte de un trabajador",
						],
					},
					{
						id: "co-dec-1295-1994",
						norma: "Decreto Ley 1295 de 1994",
						anio: 1994,
						nombre: "Organización del Sistema General de Riesgos Laborales",
						estado: "vigente",
						resumen:
							"Crea el sistema, las ARL y las cinco clases de riesgo (I mínimo a V máximo) con las que se calcula la cotización, que asume en su totalidad el empleador.",
						claves: ["Reportar el accidente de trabajo a la ARL y la EPS dentro de los 2 días hábiles siguientes"],
					},
					{
						id: "co-dec-768-2022",
						norma: "Decreto 768 de 2022",
						anio: 2022,
						nombre: "Tabla de clasificación de actividades económicas",
						estado: "vigente",
						resumen: "Actualiza la tabla que asigna a cada actividad económica su clase de riesgo para la afiliación a la ARL.",
						claves: [],
					},
					{
						id: "co-ley-9-1979",
						norma: "Ley 9 de 1979 y Resolución 2400 de 1979",
						anio: 1979,
						nombre: "Código Sanitario y Estatuto de Seguridad Industrial",
						estado: "vigente",
						resumen:
							"Base histórica de las condiciones sanitarias y de seguridad en los lugares de trabajo; muchas exigencias técnicas siguen remitiendo a ellas.",
						claves: [],
					},
				],
			},
			{
				titulo: "Estándares Mínimos, inspección y prestadores",
				normas: [
					{
						id: "co-res-0312-2019",
						norma: "Resolución 0312 de 2019",
						anio: 2019,
						nombre: "Estándares Mínimos del SG-SST",
						estado: "vigente",
						resumen:
							"Fija cuántos estándares debe cumplir cada empresa según su tamaño y clase de riesgo, y quién puede diseñar el sistema. La autoevaluación es anual y da lugar a un plan de mejoramiento.",
						claves: [
							"Hasta 10 trabajadores en riesgo I, II o III: 7 estándares",
							"De 11 a 50 trabajadores en riesgo I, II o III: 21 estándares",
							"Más de 50 trabajadores o riesgo IV y V: 60 estándares",
							"Unidades de producción agropecuaria de hasta 10 trabajadores: 3 estándares",
							"Resultado < 60 % crítico, 60-85 % moderadamente aceptable, > 85 % aceptable",
						],
					},
					{
						id: "co-res-4179-2025",
						norma: "Resolución 4179 de 2025",
						anio: 2025,
						nombre: "Modelo de inspección «Una Inspección con Propósito»",
						estado: "nueva",
						resumen:
							"Refuerza la inspección del Ministerio del Trabajo con visitas sin previo aviso, verificación técnica en campo y enfoque diferencial e interseccional.",
						claves: ["La documentación debe demostrar que los controles se aplican de verdad"],
					},
					{
						id: "co-res-908-2025",
						norma: "Resolución 908 de 2025 (MinSalud)",
						anio: 2025,
						nombre: "Licencias de Seguridad y Salud en el Trabajo",
						estado: "nueva",
						resumen:
							"Nuevo régimen para expedir, renovar y modificar las licencias en SST de personas y empresas prestadoras, con trámite digital. Rige desde el 15 de septiembre de 2025.",
						claves: ["Comprueba que el prestador que contratas tiene la licencia vigente"],
						sustituye: ["Resolución 754 de 2021", "Anexo técnico de la Resolución 1151 de 2022"],
					},
					{
						id: "co-dec-472-2015",
						norma: "Decreto 472 de 2015",
						anio: 2015,
						nombre: "Criterios para graduar las multas",
						estado: "vigente",
						resumen:
							"Establece cómo se gradúan las sanciones por infracciones en riesgos laborales según el tamaño de la empresa y la gravedad, y prevé el cierre por incumplimientos graves.",
						claves: [],
					},
				],
			},
			{
				titulo: "Participación y convivencia",
				normas: [
					{
						id: "co-res-2013-1986",
						norma: "Resolución 2013 de 1986",
						anio: 1986,
						nombre: "COPASST y Vigía de SST",
						estado: "vigente",
						resumen:
							"Regula el Comité Paritario de Seguridad y Salud en el Trabajo, con igual número de representantes del empleador y de los trabajadores. Las empresas de menos de 10 trabajadores designan un Vigía. El periodo es de 2 años (Decreto 1072 de 2015).",
						claves: ["El COPASST se reúne al menos una vez al mes"],
					},
					{
						id: "co-res-3461-2025",
						norma: "Resolución 3461 de 2025",
						anio: 2025,
						nombre: "Comité de Convivencia Laboral",
						estado: "nueva",
						resumen:
							"Nuevo marco del Comité de Convivencia Laboral en entidades públicas y empresas privadas, armonizado con el Convenio 190 de la OIT y la Ley 2466 de 2025. Expedida el 1 de septiembre de 2025.",
						claves: [
							"Periodo de 2 años desde la comunicación de la elección o designación",
							"Reuniones mensuales (antes trimestrales)",
							"Un comité por cada centro de trabajo cuando hay dos o más",
							"La composición no cambia aunque varíe la plantilla durante el periodo",
						],
						sustituye: ["Resolución 652 de 2012", "Resolución 1356 de 2012"],
					},
					{
						id: "co-ley-1010-2006",
						norma: "Ley 1010 de 2006",
						anio: 2006,
						nombre: "Acoso laboral",
						estado: "vigente",
						resumen: "Define y tipifica las modalidades de acoso laboral y los mecanismos para prevenirlo y corregirlo.",
						claves: [],
					},
					{
						id: "co-ley-2365-2024",
						norma: "Ley 2365 de 2024",
						anio: 2024,
						nombre: "Prevención del acoso sexual en el ámbito laboral",
						estado: "nueva",
						resumen: "Obliga a los empleadores a contar con una política de prevención del acoso sexual y medidas de atención.",
						claves: [],
					},
					{
						id: "co-dec-1040-2026",
						norma: "Decreto 1040 de 2026",
						anio: 2026,
						nombre: "Acoso, violencia basada en género y discriminación en el ámbito laboral",
						estado: "nueva",
						resumen:
							"Expedido el 5 de agosto de 2026 y vigente desde su publicación el 6 de agosto, sin periodo de transición. Añade el Capítulo 8 al Título 1 de la Parte 2 del Libro 2 del Decreto 1072 de 2015 y reglamenta la Ley 2466 de 2025.",
						claves: [
							"Política de prevención con contenidos mínimos y declaración de cero tolerancia",
							"Protocolo de prevención, atención y sanción",
							"Capacitación obligatoria y canales de denuncia confidenciales",
							"Prohibidas las represalias contra quien denuncia o testifica",
						],
					},
				],
			},
			{
				titulo: "Salud mental y riesgo psicosocial",
				normas: [
					{
						id: "co-ley-2460-2025",
						norma: "Ley 2460 de 2025",
						anio: 2025,
						nombre: "Reforma de la Ley de Salud Mental (Ley 1616 de 2013)",
						estado: "nueva",
						resumen:
							"Sancionada el 16 de junio de 2025. Obliga a empresas y entidades a promover acciones de prevención y control del riesgo psicosocial con apoyo de la ARL y a garantizar un ambiente libre de acoso.",
						claves: [],
					},
					{
						id: "co-dec-728-2025",
						norma: "Decreto 728 de 2025",
						anio: 2025,
						nombre: "Salud mental y sustancias psicoactivas en el ámbito laboral",
						estado: "nueva",
						resumen:
							"Añade el Capítulo 13 al Título 4 del Decreto 1072 de 2015. Exige integrar en el SG-SST la promoción de la salud mental, la prevención de trastornos mentales y la del consumo de sustancias psicoactivas. Vigente desde el 26 de junio de 2025.",
						claves: [
							"Plan de intervención basado en la evaluación del riesgo psicosocial",
							"Proyecto de prevención del consumo de SPA según la actividad económica",
							"Las ARL asesoran el diseño, ejecución y evaluación",
						],
					},
					{
						id: "co-res-2646-2008",
						norma: "Resolución 2646 de 2008",
						anio: 2008,
						nombre: "Factores de riesgo psicosocial",
						estado: "vigente",
						resumen:
							"Define responsabilidades para identificar, evaluar, prevenir, intervenir y monitorear los factores de riesgo psicosocial y para determinar el origen de patologías por estrés ocupacional.",
						claves: [],
					},
					{
						id: "co-res-2764-2022",
						norma: "Resolución 2764 de 2022",
						anio: 2022,
						nombre: "Batería de riesgo psicosocial",
						estado: "vigente",
						resumen:
							"Adopta como referente obligatorio la Batería de instrumentos de evaluación, la Guía Técnica General y sus protocolos de intervención.",
						claves: [
							"Riesgo alto: evaluación anual",
							"Riesgo medio o bajo: cada dos años",
						],
						sustituye: ["Resolución 2404 de 2019"],
					},
				],
			},
			{
				titulo: "Medicina del trabajo, accidentes y enfermedades",
				normas: [
					{
						id: "co-res-1843-2025",
						norma: "Resolución 1843 de 2025",
						anio: 2025,
						nombre: "Evaluaciones médicas ocupacionales e historia clínica",
						estado: "nueva",
						resumen:
							"Expedida el 29 de abril de 2025 por el Ministerio del Trabajo. Regula las evaluaciones médicas ocupacionales y el contenido y custodia de la historia clínica ocupacional, con alcance a todos los trabajadores y contratistas.",
						claves: [
							"Tipos: preingreso, periódicas, posocupacional, posincapacidad, retorno laboral y seguimiento",
							"El empleador asume el coste y las programa dentro de la jornada",
							"Las realizan médicos especialistas en SST con licencia vigente",
							"Regula las pruebas de alcohol y sustancias psicoactivas",
						],
						sustituye: [
							"Resolución 2346 de 2007",
							"Resolución 1918 de 2009",
							"Resolución 1075 de 1992",
							"Resolución 4050 de 1994",
						],
					},
					{
						id: "co-res-1401-2007",
						norma: "Resolución 1401 de 2007",
						anio: 2007,
						nombre: "Investigación de incidentes y accidentes de trabajo",
						estado: "vigente",
						resumen:
							"Obliga a investigar incidentes y accidentes con un equipo investigador y a definir medidas correctivas.",
						claves: [
							"Investigar en los 15 días siguientes al evento",
							"Los accidentes graves y mortales se remiten a la ARL",
						],
					},
					{
						id: "co-dec-1477-2014",
						norma: "Decreto 1477 de 2014",
						anio: 2014,
						nombre: "Tabla de enfermedades laborales",
						estado: "vigente",
						resumen:
							"Relaciona agentes de riesgo con las enfermedades laborales que pueden causar; modificado por el Decreto 676 de 2020.",
						claves: [],
					},
				],
			},
			{
				titulo: "Tareas de alto riesgo y riesgos específicos",
				normas: [
					{
						id: "co-res-4272-2021",
						norma: "Resolución 4272 de 2021",
						anio: 2021,
						nombre: "Trabajo en alturas",
						estado: "vigente",
						resumen:
							"Requisitos mínimos de seguridad y de formación para el trabajo en alturas. Es trabajo en alturas toda tarea con riesgo de caída de más de 2,0 m respecto al plano inferior más cercano. Rige desde el 8 de agosto de 2022.",
						claves: [
							"Programa de prevención y protección contra caídas",
							"Permiso de trabajo y análisis de riesgo previos",
							"Trabajador autorizado: mínimo 32 horas; reentrenamiento cada 18 meses",
						],
						sustituye: [
							"Resolución 1409 de 2012",
							"Resolución 1903 de 2013",
							"Resolución 3368 de 2014",
							"Resolución 1178 de 2017",
							"Resolución 1248 de 2020",
						],
					},
					{
						id: "co-res-0491-2020",
						norma: "Resolución 0491 de 2020",
						anio: 2020,
						nombre: "Espacios confinados",
						estado: "vigente",
						resumen: "Requisitos para identificar, permitir y vigilar los trabajos en espacios confinados.",
						claves: [],
					},
					{
						id: "co-res-5018-2019",
						norma: "Resolución 5018 de 2019",
						anio: 2019,
						nombre: "Seguridad en procesos eléctricos",
						estado: "vigente",
						resumen: "Lineamientos de SST para el trabajo con riesgo eléctrico y la formación de quienes lo realizan.",
						claves: [],
					},
					{
						id: "co-res-0773-2021",
						norma: "Decreto 1496 de 2018 y Resolución 0773 de 2021",
						anio: 2021,
						nombre: "Sistema Globalmente Armonizado (SGA) de productos químicos",
						estado: "vigente",
						resumen:
							"Adoptan el SGA para clasificar y comunicar los peligros de los productos químicos mediante etiquetas y fichas de datos de seguridad.",
						claves: [],
					},
				],
			},
			{
				titulo: "Jornada y condiciones laborales con impacto en SST",
				normas: [
					{
						id: "co-ley-2466-2025",
						norma: "Ley 2466 de 2025",
						anio: 2025,
						nombre: "Reforma laboral para el trabajo decente y digno",
						estado: "nueva",
						resumen:
							"Sancionada el 25 de junio de 2025. Modifica el Código Sustantivo del Trabajo: refuerza la protección frente a la discriminación y el acoso, la reubicación de trabajadoras gestantes y la afiliación a seguridad social en nuevas modalidades (plataformas, aprendices).",
						claves: [
							"Recargo dominical y festivo creciente hasta el 100 % en 2027",
							"Contrato de aprendizaje con afiliación a seguridad social",
						],
					},
					{
						id: "co-ley-2101-2021",
						norma: "Ley 2101 de 2021",
						anio: 2021,
						nombre: "Reducción de la jornada laboral",
						estado: "vigente",
						resumen:
							"Desde el 15 de julio de 2026 la jornada máxima ordinaria es de 42 horas semanales, sin reducción de salario. Culminó la reducción escalonada desde 48 horas.",
						claves: ["Con 42 horas, el empleador queda exonerado del día de la familia"],
					},
					{
						id: "co-ley-2191-2022",
						norma: "Ley 2191 de 2022",
						anio: 2022,
						nombre: "Desconexión laboral",
						estado: "vigente",
						resumen: "Reconoce el derecho a no ser contactado fuera de la jornada y exige una política interna de desconexión.",
						claves: [],
					},
				],
			},
		],
		// Normas que todavía se citan en matrices legales y que ya no están en vigor.
		derogadas: [
			{ norma: "Resolución 2346 de 2007", sustituidaPor: "Resolución 1843 de 2025" },
			{ norma: "Resolución 1918 de 2009", sustituidaPor: "Resolución 1843 de 2025" },
			{ norma: "Resoluciones 652 y 1356 de 2012", sustituidaPor: "Resolución 3461 de 2025" },
			{ norma: "Resolución 1409 de 2012", sustituidaPor: "Resolución 4272 de 2021" },
			{ norma: "Resolución 1111 de 2017", sustituidaPor: "Resolución 0312 de 2019" },
			{ norma: "Resolución 2404 de 2019", sustituidaPor: "Resolución 2764 de 2022" },
			{ norma: "Resolución 754 de 2021", sustituidaPor: "Resolución 908 de 2025" },
		],
	},
};

// Equivalencias aproximadas para quien conoce un sistema y estudia el otro.
export const EQUIVALENCIAS = [
	{ concepto: "Marco general", es: "Ley 31/1995 (LPRL)", co: "Decreto 1072 de 2015 y Ley 1562 de 2012" },
	{ concepto: "Sistema de gestión", es: "Plan de prevención", co: "SG-SST con ciclo PHVA" },
	{ concepto: "Evaluación de riesgos", es: "Evaluación de riesgos (RD 39/1997)", co: "Matriz de identificación de peligros y valoración de riesgos" },
	{ concepto: "Órgano paritario", es: "Comité de Seguridad y Salud", co: "COPASST (o Vigía con menos de 10 trabajadores)" },
	{ concepto: "Representación de la plantilla", es: "Delegados de prevención", co: "Representantes de los trabajadores en el COPASST" },
	{ concepto: "Acoso", es: "Protocolo frente al acoso", co: "Comité de Convivencia Laboral y Decreto 1040 de 2026" },
	{ concepto: "Aseguradora del riesgo laboral", es: "Mutua colaboradora con la Seguridad Social", co: "Administradora de Riesgos Laborales (ARL)" },
	{ concepto: "Enfermedad derivada del trabajo", es: "Enfermedad profesional", co: "Enfermedad laboral" },
	{ concepto: "Vigilancia de la salud", es: "Reconocimientos médicos (art. 22 LPRL)", co: "Evaluaciones médicas ocupacionales (Res. 1843 de 2025)" },
	{ concepto: "Inspección", es: "Inspección de Trabajo y Seguridad Social", co: "Inspección del Ministerio del Trabajo" },
];

export function normasDe(pais) {
	return NORMATIVAS[pais]?.temas.flatMap(({ normas }) => normas) ?? [];
}

export function filtrarNormativa(pais, { texto = "", soloNovedades = false } = {}, normalizar) {
	const consulta = normalizar(texto.trim());
	const coincide = (norma) =>
		!consulta ||
		[norma.norma, norma.nombre, norma.resumen, ...norma.claves, ...(norma.sustituye ?? [])].some(
			(campo) => normalizar(campo).includes(consulta),
		);
	return (NORMATIVAS[pais]?.temas ?? [])
		.map((tema) => ({
			...tema,
			normas: tema.normas.filter(
				(norma) => (!soloNovedades || norma.estado !== "vigente") && coincide(norma),
			),
		}))
		.filter(({ normas }) => normas.length > 0);
}
