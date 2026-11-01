#!/usr/bin/env node
// Prueba de aula: simula una clase entera contra la API de salas (Node 22, sin dependencias).
//
//   API_URL=http://127.0.0.1:8788 node scripts/prueba-aula.mjs
//   API_URL=https://api-prl.orpira.es node scripts/prueba-aula.mjs
//
// Variables opcionales:
//   ALUMNOS=30        número de alumnos que se unen
//   PREGUNTAS=10      preguntas de la sala
//   SEGUNDOS=30       temporizador por pregunta (15, 30, 45 o 60)
//   ESCALA_TIEMPO=1   multiplica todas las esperas del alumno (0.1 = diez veces más rápido)
//   CORTE_MS=20000    duración del corte simulado (se multiplica por ESCALA_TIEMPO)
//   SEMILLA=1234      semilla del generador aleatorio, para repetir una ejecución
//   ORIGEN=https://prl.orpira.es   cabecera Origin a enviar, como haría el navegador

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function mediana(valores) {
	return percentil(valores, 50);
}

export function percentil(valores, p) {
	if (valores.length === 0) return 0;
	const ordenados = [...valores].sort((a, b) => a - b);
	const posicion = Math.min(ordenados.length - 1, Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1));
	return ordenados[posicion];
}

// Generador pseudoaleatorio con semilla (mulberry32) para poder repetir una ejecución.
export function crearAleatorio(semilla) {
	let estado = semilla >>> 0;
	return () => {
		estado = (estado + 0x6d2b79f5) >>> 0;
		let t = estado;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Elige la opción correcta con probabilidad `precision`; si no, una incorrecta.
export function elegirOpcion(correcta, totalOpciones, precision, aleatorio) {
	if (aleatorio() < precision || totalOpciones < 2) return correcta;
	const otras = Array.from({ length: totalOpciones }, (_, i) => i).filter((i) => i !== correcta);
	return otras[Math.floor(aleatorio() * otras.length)];
}

export function leerConfiguracion(entorno = process.env) {
	const numero = (nombre, porDefecto) => {
		const valor = entorno[nombre] === undefined || entorno[nombre] === "" ? porDefecto : Number(entorno[nombre]);
		if (!Number.isFinite(valor) || valor <= 0) throw new Error(`${nombre} debe ser un número positivo`);
		return valor;
	};
	return {
		apiUrl: (entorno.API_URL || "http://127.0.0.1:8788").replace(/\/+$/, ""),
		alumnos: numero("ALUMNOS", 30),
		preguntas: numero("PREGUNTAS", 10),
		segundos: numero("SEGUNDOS", 30),
		escala: numero("ESCALA_TIEMPO", 1),
		corteMs: numero("CORTE_MS", 20_000),
		semilla: numero("SEMILLA", Date.now() % 1_000_000),
		origen: entorno.ORIGEN || null,
	};
}

export function crearMedidor() {
	const medidor = { peticiones: 0, tiempos: [], porCodigo: new Map(), limites429: 0 };
	medidor.registrar = (codigo, ms) => {
		medidor.peticiones++;
		medidor.tiempos.push(ms);
		medidor.porCodigo.set(codigo, (medidor.porCodigo.get(codigo) ?? 0) + 1);
		if (codigo === 429 || codigo === "LIMITE_PETICIONES") medidor.limites429++;
	};
	return medidor;
}

class ErrorApi extends Error {
	constructor(estado, code, mensaje) {
		super(`${estado} ${code}: ${mensaje}`);
		this.estado = estado;
		this.code = code;
	}
}

function crearCliente({ apiUrl, origen }, medidor) {
	return async function api(metodo, ruta, { cuerpo, sesion } = {}) {
		const inicio = performance.now();
		let respuesta;
		try {
			respuesta = await fetch(`${apiUrl}${ruta}`, {
				method: metodo,
				headers: {
					...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
					...(sesion ? { authorization: `Bearer ${sesion}` } : {}),
					...(origen ? { origin: origen } : {}),
				},
				body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
			});
		} catch (error) {
			medidor.registrar("RED", performance.now() - inicio);
			const causa = error.cause?.code ?? error.cause?.message ?? error.message;
			throw new ErrorApi(0, "RED", `no se pudo conectar con ${apiUrl}${ruta} (${causa})`);
		}
		const datos = await respuesta.json().catch(() => null);
		medidor.registrar(respuesta.ok ? respuesta.status : (datos?.code ?? respuesta.status), performance.now() - inicio);
		if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos?.code ?? "ERROR", datos?.mensaje ?? "");
		return datos;
	};
}

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export async function ejecutarPrueba(config, { banco, registro = console.log, ahora = () => performance.now() } = {}) {
	const aleatorio = crearAleatorio(config.semilla);
	const medidor = crearMedidor();
	const api = crearCliente(config, medidor);
	const escalar = (ms) => ms * config.escala;
	const correctas = new Map(banco.map((p) => [p.pregunta, p.opciones[p.respuesta]]));
	const inicio = ahora();

	// 1. El anfitrión (el profesor) crea la sala.
	const sala = await api("POST", "/api/salas", {
		cuerpo: {
			nombre: "Profesor",
			numPreguntas: config.preguntas,
			categorias: [],
			timerConfig: { activo: true, tipo: "pregunta", segundos: config.segundos },
		},
	});
	registro(`Sala ${sala.codigo} creada (${config.preguntas} preguntas, ${config.segundos} s por pregunta).`);

	// 2. Se unen los alumnos, todos desde esta máquina.
	const indicesConCorte = new Set([5, 15, 25].filter((i) => i < config.alumnos));
	const alumnos = [];
	for (let i = 1; i <= config.alumnos; i++) {
		const entrada = await api("POST", `/api/salas/${sala.codigo}/unirse`, { cuerpo: { nombre: `Alumno ${i}` } });
		alumnos.push({
			nombre: `Alumno ${i}`,
			sesion: entrada.sessionId,
			precision: 0.4 + aleatorio() * 0.5,
			corte: indicesConCorte.has(i),
			aciertosEsperados: 0,
			enviadas: 0,
			tardias: 0,
			fallosDeCorreccion: [],
			reenviosVerificados: 0,
			terminado: false,
		});
	}
	registro(`${alumnos.length} alumnos dentro; ${alumnos.filter((a) => a.corte).length} simularán un corte de red.`);

	// 3. Cada alumno consulta la vista cada segundo y responde con un retraso de 2 a 10 s.
	const intervaloMs = escalar(1000);
	let enCurso = false;
	async function jugar(alumno) {
		let ultimoComando = null;
		let cortado = false;
		let pensandoDesde = null;
		let retraso = null;
		let preguntaPensada = -1;
		while (!alumno.terminado) {
			const vista = await api("GET", `/api/salas/${sala.codigo}`, { sesion: alumno.sesion });
			if (vista.estado === "ESPERANDO") {
				await dormir(intervaloMs);
				continue;
			}
			if (vista.progreso.terminado || vista.progreso.siguiente >= vista.totalPreguntas) {
				alumno.terminado = true;
				break;
			}
			const indice = vista.progreso.siguiente;
			if (preguntaPensada !== indice) {
				preguntaPensada = indice;
				pensandoDesde = ahora();
				retraso = escalar(2000 + aleatorio() * 8000);
			}
			if (ahora() - pensandoDesde < retraso) {
				await dormir(intervaloMs);
				continue;
			}

			const pregunta = vista.preguntas[indice];
			const textoCorrecto = correctas.get(pregunta.pregunta);
			const correcta = pregunta.opciones.indexOf(textoCorrecto);
			if (correcta === -1) throw new Error(`La pregunta «${pregunta.pregunta}» no coincide con el banco local`);
			const opcion = elegirOpcion(correcta, pregunta.opciones.length, alumno.precision, aleatorio);
			const comando = { comandoId: `${alumno.nombre}-${indice}-${Math.floor(aleatorio() * 1e9)}`, indice, opcion };
			const resultado = await api("POST", `/api/salas/${sala.codigo}/responder`, { sesion: alumno.sesion, cuerpo: comando }).catch((error) => {
				// Si el servidor ya avanzó la pregunta por tiempo, la respuesta llega tarde: no cuenta.
				if (error.code === "FUERA_DE_ORDEN") return null;
				throw error;
			});
			if (resultado === null) continue;
			alumno.enviadas++;
			const esperadoAcierto = opcion === correcta && !resultado.fueraDeTiempo;
			if (resultado.fueraDeTiempo) alumno.tardias++;
			if (resultado.acierto !== esperadoAcierto || resultado.correcta !== correcta) {
				alumno.fallosDeCorreccion.push({ indice, opcion, correcta, recibido: resultado.acierto });
			}
			if (esperadoAcierto) alumno.aciertosEsperados++;
			ultimoComando = { comando, resultado };

			// 4. Corte de red: deja de consultar y vuelve con la misma sesión y un reenvío del último comando.
			if (alumno.corte && !cortado && alumno.enviadas === 3) {
				cortado = true;
				registro(`${alumno.nombre}: corte de red de ${Math.round(escalar(config.corteMs) / 1000)} s…`);
				await dormir(escalar(config.corteMs));
				const reenvio = await api("POST", `/api/salas/${sala.codigo}/responder`, { sesion: alumno.sesion, cuerpo: ultimoComando.comando });
				if (JSON.stringify({ ...reenvio, vista: 0 }) === JSON.stringify({ ...ultimoComando.resultado, vista: 0 })) alumno.reenviosVerificados++;
				else alumno.fallosDeCorreccion.push({ reenvio: "la respuesta repetida no coincide" });
				registro(`${alumno.nombre}: vuelve con su sesión y reenvía su última respuesta.`);
			}
		}
	}

	const partida = Promise.all(alumnos.map((alumno) => jugar(alumno)));
	await dormir(intervaloMs * 2);
	await api("POST", `/api/salas/${sala.codigo}/iniciar`, { sesion: sala.sessionId });
	enCurso = true;
	registro("El profesor inicia el test y sale de la sala; los alumnos empiezan.");
	await api("POST", `/api/salas/${sala.codigo}/salir`, { sesion: sala.sessionId });
	await partida;

	// 5. Comprobaciones finales con la vista de un alumno.
	const final = await api("GET", `/api/salas/${sala.codigo}`, { sesion: alumnos[0].sesion });
	const duracionMs = ahora() - inicio;
	const aciertosRanking = final.ranking.reduce((suma, fila) => suma + fila.aciertos, 0);
	const aciertosEsperados = alumnos.reduce((suma, a) => suma + a.aciertosEsperados, 0);
	const porNombre = new Map(final.ranking.map((fila) => [fila.nombre, fila]));
	const discrepancias = alumnos.filter((a) => porNombre.get(a.nombre)?.aciertos !== a.aciertosEsperados);
	const comprobaciones = [
		[`hay ${config.alumnos} alumnos en el ranking`, final.ranking.length === config.alumnos, `${final.ranking.length}`],
		["todos han terminado y la sala está TERMINADA", final.estado === "TERMINADA" && final.ranking.every((f) => f.terminado), final.estado],
		["nadie recibió 429", medidor.limites429 === 0, `${medidor.limites429} respuestas 429`],
		["la suma de aciertos coincide con lo enviado", aciertosRanking === aciertosEsperados, `ranking ${aciertosRanking}, enviado ${aciertosEsperados}`],
		["cada alumno tiene sus aciertos exactos", discrepancias.length === 0, discrepancias.map((a) => a.nombre).join(", ") || "todos coinciden"],
		["el servidor corrigió cada respuesta como se esperaba", alumnos.every((a) => a.fallosDeCorreccion.length === 0), `${alumnos.reduce((s, a) => s + a.fallosDeCorreccion.length, 0)} discrepancias`],
		["los reenvíos tras el corte devolvieron lo mismo", alumnos.filter((a) => a.corte).every((a) => a.reenviosVerificados === 1), `${alumnos.reduce((s, a) => s + a.reenviosVerificados, 0)} verificados`],
		["nadie recibió errores de red ni 5xx", ![...medidor.porCodigo.keys()].some((c) => c === "RED" || (typeof c === "number" && c >= 500)), "sin errores"],
	];

	return {
		config,
		sala: sala.codigo,
		duracionMs,
		peticiones: medidor.peticiones,
		porCodigo: Object.fromEntries(medidor.porCodigo),
		tiempos: {
			medianaMs: mediana(medidor.tiempos),
			p95Ms: percentil(medidor.tiempos, 95),
			maximoMs: Math.max(...medidor.tiempos),
		},
		respuestas: { enviadas: alumnos.reduce((s, a) => s + a.enviadas, 0), tardias: alumnos.reduce((s, a) => s + a.tardias, 0) },
		aciertos: { ranking: aciertosRanking, enviados: aciertosEsperados },
		ranking: final.ranking,
		comprobaciones: comprobaciones.map(([nombre, correcto, detalle]) => ({ nombre, correcto, detalle })),
		correcto: comprobaciones.every(([, correcto]) => correcto),
	};
}

export function formatearResumen(r) {
	const segundos = (ms) => (ms / 1000).toFixed(1);
	const lineas = [
		"",
		"══ Resumen de la prueba de aula ══",
		`API:            ${r.config.apiUrl}`,
		`Sala:           ${r.sala} · ${r.config.alumnos} alumnos · ${r.config.preguntas} preguntas · ${r.config.segundos} s por pregunta`,
		`Duración:       ${segundos(r.duracionMs)} s (escala de tiempo ${r.config.escala}, semilla ${r.config.semilla})`,
		`Peticiones:     ${r.peticiones} (${(r.peticiones / (r.duracionMs / 60000)).toFixed(0)} por minuto)`,
		`Respuestas:     ${r.respuestas.enviadas} enviadas, ${r.respuestas.tardias} fuera de tiempo`,
		`Respuestas del servidor por código: ${Object.entries(r.porCodigo).map(([c, n]) => `${c}=${n}`).join("  ")}`,
		`Tiempos:        mediana ${r.tiempos.medianaMs.toFixed(1)} ms · p95 ${r.tiempos.p95Ms.toFixed(1)} ms · máximo ${r.tiempos.maximoMs.toFixed(1)} ms`,
		`Aciertos:       ranking ${r.aciertos.ranking} · enviados ${r.aciertos.enviados}`,
		"",
		"Comprobaciones:",
		...r.comprobaciones.map((c) => `  ${c.correcto ? "✔" : "✘"} ${c.nombre} (${c.detalle})`),
		"",
		r.correcto ? "RESULTADO: CORRECTO" : "RESULTADO: HAY FALLOS",
	];
	return lineas.join("\n");
}

async function principal() {
	const config = leerConfiguracion();
	const banco = JSON.parse(readFileSync(new URL("../public/preguntas-prl.json", import.meta.url), "utf8"));
	try {
		const resumen = await ejecutarPrueba(config, { banco });
		console.log(formatearResumen(resumen));
		process.exitCode = resumen.correcto ? 0 : 1;
	} catch (error) {
		console.error(`\nLa prueba se interrumpió: ${error.message}`);
		process.exitCode = 2;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await principal();
