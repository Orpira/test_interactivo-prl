import { beforeEach, describe, expect, it } from "vitest";
import {
	ANFITRION_AUSENTE_MS,
	CONECTADO_MS,
	ErrorSala,
	GestorSalas,
	MARGEN_MS,
	RETENCION_TERMINADA_MS,
	generarCodigo,
} from "./nucleo.js";

const preguntas = Array.from({ length: 12 }, (_, i) => ({
	id: i + 1,
	categoria: i < 6 ? "Base" : "Otra",
	pregunta: `Pregunta ${i + 1}`,
	opciones: ["A", "B", "C", "D"],
	respuesta: i % 4,
}));

let reloj;
let gestor;

const ahora = () => reloj;
const avanzar = (ms) => {
	reloj += ms;
};

function crearGestor(extra = {}) {
	return new GestorSalas({ preguntas, ahora, maxJugadores: 40, ...extra });
}

function esperarError(codigo, funcion) {
	try {
		funcion();
	} catch (error) {
		expect(error).toBeInstanceOf(ErrorSala);
		expect(error.code).toBe(codigo);
		return;
	}
	throw new Error(`Se esperaba el error ${codigo}`);
}

function salaConJugadores(extra = {}, nombres = ["Ana", "Luis"]) {
	const { codigo, sessionId: anfitrion } = gestor.crear({
		nombre: nombres[0],
		numPreguntas: 3,
		categorias: [],
		timerConfig: { activo: false },
		...extra,
	});
	const sesiones = [anfitrion];
	for (const nombre of nombres.slice(1)) {
		sesiones.push(gestor.unirse(codigo, { nombre }).sessionId);
	}
	return { codigo, sesiones };
}

// La opción correcta de la pregunta `indice` según el orden real de la sala.
function correcta(codigo, indice) {
	return gestor.salas.get(codigo).preguntas[indice].respuesta;
}

let contador = 0;
const responder = (codigo, sesion, indice, opcion) =>
	gestor.responder(codigo, sesion, { comandoId: `cmd-${contador++}`, indice, opcion });

beforeEach(() => {
	reloj = 1_000_000;
	contador = 0;
	gestor = crearGestor();
});

describe("crear y unirse", () => {
	it("crea la sala con un código único y un sessionId secreto para el anfitrión", () => {
		const { codigo, sessionId } = gestor.crear({
			nombre: "  Ana  ",
			numPreguntas: 5,
			categorias: [],
			timerConfig: { activo: false },
		});
		expect(codigo).toMatch(/^PRL-[A-Z0-9]{4}$/);
		expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
		const vista = gestor.vista(codigo, sessionId);
		expect(vista).toMatchObject({
			estado: "ESPERANDO",
			soyAnfitrion: true,
			nombre: "Ana",
			totalPreguntas: 5,
		});
		expect(vista.jugadores).toEqual([{ nombre: "Ana", anfitrion: true, conectado: true, terminado: false }]);
	});

	it("rechaza datos de sala no válidos", () => {
		const base = { nombre: "Ana", numPreguntas: 3, categorias: [], timerConfig: { activo: false } };
		esperarError("NOMBRE_INVALIDO", () => gestor.crear({ ...base, nombre: "   " }));
		esperarError("NOMBRE_INVALIDO", () => gestor.crear({ ...base, nombre: "x".repeat(31) }));
		esperarError("CATEGORIAS_INVALIDAS", () => gestor.crear({ ...base, categorias: ["No existe"] }));
		esperarError("CANTIDAD_INVALIDA", () => gestor.crear({ ...base, numPreguntas: 0 }));
		esperarError("CANTIDAD_INVALIDA", () => gestor.crear({ ...base, numPreguntas: 7, categorias: ["Base"] }));
		esperarError("TEMPORIZADOR_INVALIDO", () =>
			gestor.crear({ ...base, timerConfig: { activo: true, tipo: "pregunta", segundos: 20 } }),
		);
		esperarError("DATOS_INVALIDOS", () => gestor.crear(null));
	});

	it("la lista de errores de unirse: sala inexistente, código mal formado, nombre inválido y repetido", () => {
		const { codigo } = salaConJugadores();
		esperarError("CODIGO_INVALIDO", () => gestor.unirse("PRL-123", { nombre: "Eva" }));
		esperarError("SALA_NO_ENCONTRADA", () => gestor.unirse("PRL-ZZZZ", { nombre: "Eva" }));
		esperarError("NOMBRE_INVALIDO", () => gestor.unirse(codigo, { nombre: "" }));
		esperarError("NOMBRE_REPETIDO", () => gestor.unirse(codigo, { nombre: "  ANA " }));
	});

	it("SALA_INICIADA una vez comenzado el test", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		esperarError("SALA_INICIADA", () => gestor.unirse(codigo, { nombre: "Tarde" }));
	});

	it("SALA_LLENA al intentar entrar el jugador número 41", () => {
		const { codigo } = salaConJugadores({}, ["Alumno 1"]);
		for (let i = 2; i <= 40; i++) gestor.unirse(codigo, { nombre: `Alumno ${i}` });
		expect(gestor.vista(codigo, [...gestor.salas.get(codigo).jugadores.keys()][0]).jugadores).toHaveLength(40);
		esperarError("SALA_LLENA", () => gestor.unirse(codigo, { nombre: "Alumno 41" }));
	});

	it("generarCodigo no repite un código existente y reintenta tras una colisión", () => {
		const salas = new Map([["PRL-0000", {}]]);
		const valores = [0, 0, 0.5];
		expect(generarCodigo(salas, () => valores.shift())).not.toBe("PRL-0000");
		expect(generarCodigo(new Map([["PRL-0000", {}]]), () => 0)).toBeNull();
	});
});

describe("iniciar", () => {
	it("solo el anfitrión puede iniciar", () => {
		const { codigo, sesiones } = salaConJugadores();
		esperarError("NO_ES_ANFITRION", () => gestor.iniciar(codigo, sesiones[1]));
		gestor.iniciar(codigo, sesiones[0]);
		expect(gestor.vista(codigo, sesiones[1]).estado).toBe("EN_CURSO");
		esperarError("SALA_INICIADA", () => gestor.iniciar(codigo, sesiones[0]));
	});

	it("un anfitrión solo puede iniciar un test individual", () => {
		const { codigo, sesiones } = salaConJugadores({}, ["Solo"]);
		gestor.iniciar(codigo, sesiones[0]);
		expect(gestor.vista(codigo, sesiones[0]).estado).toBe("EN_CURSO");
	});

	it("una sesión de otra sala o inventada no tiene acceso", () => {
		const a = salaConJugadores();
		const b = salaConJugadores({}, ["Eva"]);
		esperarError("SIN_SESION", () => gestor.vista(a.codigo, b.sesiones[0]));
		esperarError("SIN_SESION", () => gestor.vista(a.codigo, "inventada"));
		esperarError("SIN_SESION", () => gestor.iniciar(a.codigo, undefined));
	});
});

describe("vista", () => {
	it("las preguntas nunca llevan respuesta ni hay sessionId de otros jugadores", () => {
		const { codigo, sesiones } = salaConJugadores();
		expect(gestor.vista(codigo, sesiones[0]).preguntas).toBeUndefined();
		gestor.iniciar(codigo, sesiones[0]);
		const vista = gestor.vista(codigo, sesiones[0]);
		expect(vista.preguntas).toHaveLength(3);
		for (const pregunta of vista.preguntas) {
			expect(Object.keys(pregunta).sort()).toEqual(["categoria", "id", "opciones", "pregunta"]);
		}
		const texto = JSON.stringify(vista);
		expect(texto).not.toContain(sesiones[1]);
		expect(texto).not.toContain('"respuesta"');
		expect(vista.progreso.respuestas).toEqual([]);
	});

	it("solo se revela la correcta de las preguntas ya contestadas", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		const resultado = responder(codigo, sesiones[0], 0, null);
		const vista = gestor.vista(codigo, sesiones[0]);
		expect(vista.progreso.respuestas).toEqual([
			{ indice: 0, opcion: null, correcta: resultado.correcta, acierto: false },
		]);
		expect(vista.progreso.siguiente).toBe(1);
	});

	it("marca conectado a quien consultó en los últimos 5 s y registra lastSeen", () => {
		const { codigo, sesiones } = salaConJugadores();
		avanzar(CONECTADO_MS + 1);
		expect(gestor.vista(codigo, sesiones[0]).jugadores.map((j) => j.conectado)).toEqual([true, false]);
		gestor.vista(codigo, sesiones[1]);
		expect(gestor.vista(codigo, sesiones[0]).jugadores.map((j) => j.conectado)).toEqual([true, true]);
	});

	it("informa de la hora del servidor y del límite de cada temporizador", () => {
		const { codigo: porPregunta, sesiones: s1 } = salaConJugadores({
			timerConfig: { activo: true, tipo: "pregunta", segundos: 30 },
		});
		gestor.iniciar(porPregunta, s1[0]);
		expect(gestor.vista(porPregunta, s1[0])).toMatchObject({
			ahoraServidor: reloj,
			limite: { tipo: "pregunta", hasta: reloj + 30_000 },
		});
		const { codigo: porTest, sesiones: s2 } = salaConJugadores({
			timerConfig: { activo: true, tipo: "test", segundos: 300 },
		}, ["Otra"]);
		gestor.iniciar(porTest, s2[0]);
		expect(gestor.vista(porTest, s2[0]).limite).toEqual({ tipo: "test", hasta: reloj + 300_000 });
	});
});

describe("responder", () => {
	it("el orden es obligatorio y un índice adelantado no revela la correcta", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		for (const indice of [1, 2, 99]) {
			try {
				responder(codigo, sesiones[0], indice, 0);
				throw new Error("debía fallar");
			} catch (error) {
				expect(error.code).toBe("FUERA_DE_ORDEN");
				expect(JSON.stringify(error)).not.toContain("correcta");
			}
		}
		esperarError("DATOS_INVALIDOS", () => responder(codigo, sesiones[0], "0", 0));
		esperarError("OPCION_INVALIDA", () => responder(codigo, sesiones[0], 0, 7));
		responder(codigo, sesiones[0], 0, 0);
		esperarError("FUERA_DE_ORDEN", () => responder(codigo, sesiones[0], 0, 0));
	});

	it("no se puede responder antes de iniciar ni después de terminar", () => {
		const { codigo, sesiones } = salaConJugadores({}, ["Solo"]);
		esperarError("TEST_NO_ACTIVO", () => responder(codigo, sesiones[0], 0, 0));
		gestor.iniciar(codigo, sesiones[0]);
		for (let i = 0; i < 3; i++) responder(codigo, sesiones[0], i, correcta(codigo, i));
		esperarError("TEST_NO_ACTIVO", () => responder(codigo, sesiones[0], 3, 0));
	});

	it("suma los aciertos y el ranking final coincide con lo esperado", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		for (let i = 0; i < 3; i++) responder(codigo, sesiones[0], i, correcta(codigo, i));
		responder(codigo, sesiones[1], 0, correcta(codigo, 0));
		responder(codigo, sesiones[1], 1, (correcta(codigo, 1) + 1) % 4);
		responder(codigo, sesiones[1], 2, correcta(codigo, 2));
		const vista = gestor.vista(codigo, sesiones[1]);
		expect(vista.estado).toBe("TERMINADA");
		expect(vista.ranking).toEqual([
			{ nombre: "Ana", aciertos: 3, total: 3, porcentaje: 100, terminado: true },
			{ nombre: "Luis", aciertos: 2, total: 3, porcentaje: 67, terminado: true },
		]);
	});

	it("mismo comandoId repetido devuelve la misma respuesta sin contarla dos veces", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		const comando = { comandoId: "uno", indice: 0, opcion: correcta(codigo, 0) };
		const primera = gestor.responder(codigo, sesiones[0], comando);
		const repetida = gestor.responder(codigo, sesiones[0], { ...comando });
		expect(repetida).toEqual(primera);
		expect(primera.acierto).toBe(true);
		const progreso = gestor.vista(codigo, sesiones[0]).progreso;
		expect(progreso).toMatchObject({ siguiente: 1, aciertos: 1 });
		expect(progreso.respuestas).toHaveLength(1);
	});

	it("mismo comandoId con otra opción es COMANDO_REPETIDO y no cambia nada", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		gestor.responder(codigo, sesiones[0], { comandoId: "uno", indice: 0, opcion: 0 });
		esperarError("COMANDO_REPETIDO", () =>
			gestor.responder(codigo, sesiones[0], { comandoId: "uno", indice: 0, opcion: 1 }),
		);
		expect(gestor.vista(codigo, sesiones[0]).progreso.siguiente).toBe(1);
	});

	it("un comandoId es propio de cada jugador y no admite claves peligrosas", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		gestor.responder(codigo, sesiones[0], { comandoId: "mismo", indice: 0, opcion: 0 });
		expect(() =>
			gestor.responder(codigo, sesiones[1], { comandoId: "mismo", indice: 0, opcion: 1 }),
		).not.toThrow();
		gestor.responder(codigo, sesiones[0], { comandoId: "__proto__", indice: 1, opcion: 0 });
		expect(Object.getPrototypeOf(gestor.salas.get(codigo).jugadores.get(sesiones[0]).comandos)).toBe(Object.prototype);
		esperarError("DATOS_INVALIDOS", () =>
			gestor.responder(codigo, sesiones[0], { comandoId: "", indice: 2, opcion: 0 }),
		);
		esperarError("DATOS_INVALIDOS", () =>
			gestor.responder(codigo, sesiones[0], { indice: 2, opcion: 0 }),
		);
	});
});

describe("temporizadores", () => {
	it("una respuesta tras el límite de la pregunta más 2 s no suma y marca fueraDeTiempo", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "pregunta", segundos: 15 },
		});
		gestor.iniciar(codigo, sesiones[0]);
		avanzar(15_000 + MARGEN_MS);
		const dentro = responder(codigo, sesiones[0], 0, correcta(codigo, 0));
		expect(dentro).toMatchObject({ acierto: true, fueraDeTiempo: false });
		avanzar(15_000 + MARGEN_MS + 1);
		const tarde = responder(codigo, sesiones[0], 1, correcta(codigo, 1));
		expect(tarde).toMatchObject({ acierto: false, fueraDeTiempo: true });
		expect(gestor.vista(codigo, sesiones[0]).progreso.aciertos).toBe(1);
	});

	it("una pregunta vencida en tick() cuenta como fallo y el alumno avanza", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "pregunta", segundos: 15 },
		});
		gestor.iniciar(codigo, sesiones[0]);
		avanzar(15_000 + MARGEN_MS);
		expect(gestor.tick()).toBe(false);
		avanzar(1);
		expect(gestor.tick()).toBe(true);
		const progreso = gestor.vista(codigo, sesiones[0]).progreso;
		expect(progreso.siguiente).toBe(1);
		expect(progreso.aciertos).toBe(0);
		expect(progreso.respuestas[0]).toMatchObject({ indice: 0, opcion: null, acierto: false });
		expect(gestor.vista(codigo, sesiones[0]).limite.hasta).toBe(reloj + 15_000);
	});

	it("si caducan todas las preguntas el alumno termina y la sala se cierra", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "pregunta", segundos: 15 },
		}, ["Solo"]);
		gestor.iniciar(codigo, sesiones[0]);
		for (let i = 0; i < 3; i++) {
			avanzar(15_000 + MARGEN_MS + 1);
			gestor.tick();
		}
		const vista = gestor.vista(codigo, sesiones[0]);
		expect(vista.estado).toBe("TERMINADA");
		expect(vista.progreso).toMatchObject({ terminado: true, siguiente: 3 });
	});

	it("un test vencido termina a todos con sus aciertos y sin revelar las pendientes", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "test", segundos: 300 },
		});
		gestor.iniciar(codigo, sesiones[0]);
		responder(codigo, sesiones[0], 0, correcta(codigo, 0));
		responder(codigo, sesiones[1], 0, (correcta(codigo, 0) + 1) % 4);
		avanzar(300_000 + MARGEN_MS);
		expect(gestor.tick()).toBe(false);
		avanzar(1);
		expect(gestor.tick()).toBe(true);
		const vista = gestor.vista(codigo, sesiones[1]);
		expect(vista.estado).toBe("TERMINADA");
		expect(vista.ranking).toEqual([
			{ nombre: "Ana", aciertos: 1, total: 3, porcentaje: 33, terminado: true },
			{ nombre: "Luis", aciertos: 0, total: 3, porcentaje: 0, terminado: true },
		]);
		expect(vista.progreso.respuestas).toHaveLength(1);
		expect(vista.preguntas).toBeUndefined();
	});

	it("una respuesta que llega con el test vencido termina la sala sin sumar", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "test", segundos: 300 },
		});
		gestor.iniciar(codigo, sesiones[0]);
		avanzar(300_000 + MARGEN_MS + 1);
		const tarde = responder(codigo, sesiones[0], 0, correcta(codigo, 0));
		expect(tarde).toMatchObject({ acierto: false, fueraDeTiempo: true });
		expect(gestor.vista(codigo, sesiones[1]).estado).toBe("TERMINADA");
		expect(gestor.vista(codigo, sesiones[1]).ranking.every((fila) => fila.aciertos === 0)).toBe(true);
	});
});

describe("anfitrión", () => {
	it("traspasa el papel al jugador conectado que entró antes cuando sale", () => {
		const { codigo, sesiones } = salaConJugadores({}, ["Ana", "Luis", "Eva", "Raúl"]);
		avanzar(CONECTADO_MS + 1);
		gestor.vista(codigo, sesiones[2]);
		gestor.vista(codigo, sesiones[3]);
		gestor.salir(codigo, sesiones[0]);
		expect(gestor.vista(codigo, sesiones[1]).soyAnfitrion).toBe(false);
		expect(gestor.vista(codigo, sesiones[2]).soyAnfitrion).toBe(true);
		expect(gestor.vista(codigo, sesiones[2]).jugadores.map((j) => j.nombre)).toEqual(["Luis", "Eva", "Raúl"]);
		expect(gestor.vista(codigo, sesiones[2]).jugadores.filter((j) => j.anfitrion).map((j) => j.nombre)).toEqual(["Eva"]);
		esperarError("SIN_SESION", () => gestor.vista(codigo, sesiones[0]));
	});

	it("cede el papel si no se le ve en 60 s y hay otro jugador conectado", () => {
		const { codigo, sesiones } = salaConJugadores();
		avanzar(ANFITRION_AUSENTE_MS);
		gestor.vista(codigo, sesiones[1]);
		expect(gestor.tick()).toBe(false);
		avanzar(1);
		gestor.vista(codigo, sesiones[1]);
		expect(gestor.tick()).toBe(true);
		expect(gestor.vista(codigo, sesiones[1]).soyAnfitrion).toBe(true);
		expect(gestor.vista(codigo, sesiones[0]).soyAnfitrion).toBe(false);
	});

	it("no cede el papel si nadie más está conectado", () => {
		const { codigo, sesiones } = salaConJugadores();
		avanzar(ANFITRION_AUSENTE_MS * 2);
		expect(gestor.tick()).toBe(false);
		expect(gestor.vista(codigo, sesiones[0]).soyAnfitrion).toBe(true);
	});

	it("la sala desaparece cuando sale el último jugador", () => {
		const { codigo, sesiones } = salaConJugadores({}, ["Solo"]);
		gestor.salir(codigo, sesiones[0]);
		esperarError("SALA_NO_ENCONTRADA", () => gestor.vista(codigo, sesiones[0]));
	});

	it("si quien se va era el único sin terminar, la sala se cierra", () => {
		const { codigo, sesiones } = salaConJugadores();
		gestor.iniciar(codigo, sesiones[0]);
		for (let i = 0; i < 3; i++) responder(codigo, sesiones[0], i, 0);
		gestor.salir(codigo, sesiones[1]);
		expect(gestor.vista(codigo, sesiones[0]).estado).toBe("TERMINADA");
	});
});

describe("limpiar", () => {
	it("elimina las salas inactivas más de 2 h y las terminadas tras su retención", () => {
		const inactiva = salaConJugadores({}, ["Ana"]);
		const terminada = salaConJugadores({}, ["Eva"]);
		gestor.iniciar(terminada.codigo, terminada.sesiones[0]);
		for (let i = 0; i < 3; i++) responder(terminada.codigo, terminada.sesiones[0], i, 0);
		avanzar(RETENCION_TERMINADA_MS + 1);
		expect(gestor.limpiar()).toBe(1);
		esperarError("SALA_NO_ENCONTRADA", () => gestor.vista(terminada.codigo, terminada.sesiones[0]));
		expect(gestor.vista(inactiva.codigo, inactiva.sesiones[0]).estado).toBe("ESPERANDO");
		avanzar(2 * 60 * 60 * 1000);
		expect(gestor.limpiar()).toBe(1);
		expect(gestor.salas.size).toBe(0);
	});
});

describe("aJSON y desdeJSON", () => {
	it("conserva el estado y una respuesta repetida tras restaurar devuelve el mismo resultado", () => {
		const { codigo, sesiones } = salaConJugadores({
			timerConfig: { activo: true, tipo: "test", segundos: 600 },
		});
		gestor.iniciar(codigo, sesiones[0]);
		const comando = { comandoId: "uno", indice: 0, opcion: correcta(codigo, 0) };
		const original = gestor.responder(codigo, sesiones[0], comando);
		const copia = JSON.parse(JSON.stringify(gestor.aJSON()));

		avanzar(1000);
		const restaurado = GestorSalas.desdeJSON(copia, { preguntas, ahora });
		expect(restaurado.responder(codigo, sesiones[0], { ...comando })).toEqual(original);
		const antes = gestor.vista(codigo, sesiones[1]);
		const despues = restaurado.vista(codigo, sesiones[1]);
		expect({ ...despues, ahoraServidor: 0, jugadores: [] }).toEqual({ ...antes, ahoraServidor: 0, jugadores: [] });
		expect(despues.limite.hasta).toBe(antes.limite.hasta);
		esperarError("COMANDO_REPETIDO", () =>
			restaurado.responder(codigo, sesiones[0], { ...comando, opcion: (comando.opcion + 1) % 4 }),
		);
		esperarError("FUERA_DE_ORDEN", () =>
			restaurado.responder(codigo, sesiones[1], { comandoId: "otro", indice: 2, opcion: 0 }),
		);
		expect(restaurado.vista(codigo, sesiones[1]).progreso.siguiente).toBe(0);
	});

	it("tras restaurar nadie parece ausente y el anfitrión no cede el papel", () => {
		const { codigo, sesiones } = salaConJugadores();
		const copia = JSON.parse(JSON.stringify(gestor.aJSON()));
		avanzar(ANFITRION_AUSENTE_MS * 10);
		const restaurado = GestorSalas.desdeJSON(copia, { preguntas, ahora });
		expect(restaurado.tick()).toBe(false);
		expect(restaurado.vista(codigo, sesiones[0]).soyAnfitrion).toBe(true);
		expect(restaurado.vista(codigo, sesiones[0]).jugadores.every((j) => j.conectado)).toBe(true);
	});

	it("rechaza datos con un formato desconocido", () => {
		expect(() => GestorSalas.desdeJSON({ version: 2, salas: [] })).toThrow();
		expect(() => GestorSalas.desdeJSON(null)).toThrow();
	});

	it("marca los cambios para guardar y no marca las simples consultas", () => {
		const { codigo, sesiones } = salaConJugadores();
		expect(gestor.sucio).toBe(true);
		gestor.sucio = false;
		gestor.vista(codigo, sesiones[0]);
		expect(gestor.sucio).toBe(false);
		gestor.iniciar(codigo, sesiones[0]);
		expect(gestor.sucio).toBe(true);
	});
});

describe("bancos por reglamentación", () => {
	const preguntasCo = Array.from({ length: 4 }, (_, i) => ({
		id: 1001 + i,
		categoria: "COPASST y Vigía",
		pregunta: `Pregunta Colombia ${i + 1}`,
		opciones: ["A", "B", "C", "D"],
		respuesta: 0,
	}));
	const base = { nombre: "Ana", numPreguntas: 3, categorias: [], timerConfig: { activo: false } };

	beforeEach(() => {
		gestor = new GestorSalas({ bancos: { es: preguntas, co: preguntasCo }, ahora });
	});

	it("sin banco usa el de España, como antes", () => {
		const { codigo, sessionId } = gestor.crear(base);
		expect(gestor.vista(codigo, sessionId).banco).toBe("es");
		expect(gestor.salas.get(codigo).preguntas.every(({ id }) => id <= 12)).toBe(true);
	});

	it("con banco «co» solo toma preguntas de Colombia", () => {
		const { codigo, sessionId } = gestor.crear({ ...base, banco: "co", numPreguntas: 4 });
		expect(gestor.vista(codigo, sessionId).banco).toBe("co");
		expect(gestor.salas.get(codigo).preguntas.map(({ id }) => id).sort()).toEqual([1001, 1002, 1003, 1004]);
	});

	it("valida el banco y las categorías contra el banco elegido", () => {
		esperarError("BANCO_INVALIDO", () => gestor.crear({ ...base, banco: "mx" }));
		esperarError("BANCO_INVALIDO", () => gestor.crear({ ...base, banco: "toString" }));
		esperarError("BANCO_INVALIDO", () => gestor.crear({ ...base, banco: 7 }));
		esperarError("CATEGORIAS_INVALIDAS", () => gestor.crear({ ...base, banco: "co", categorias: ["Base"] }));
		esperarError("CANTIDAD_INVALIDA", () => gestor.crear({ ...base, banco: "co", numPreguntas: 5 }));
	});

	it("una sala guardada antes de existir los bancos se muestra como de España", () => {
		const { codigo, sessionId } = gestor.crear(base);
		const guardado = gestor.aJSON();
		delete guardado.salas[0].banco;
		const restaurado = GestorSalas.desdeJSON(guardado, { bancos: { es: preguntas, co: preguntasCo }, ahora });
		expect(restaurado.vista(codigo, sessionId).banco).toBe("es");
	});
});
