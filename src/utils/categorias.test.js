import { describe, expect, it } from "vitest";
import {
	buscar,
	CATEGORIA_ESPECIAL,
	construirGrupos,
	estadoGrupo,
	giroPegatina,
	GRUPOS,
	normalizar,
	obtenerTodasCategorias,
	sorprendeme,
	tamanoPegatina,
	totalPreguntas,
} from "./categorias.js";

const grupos = [
	{ nombre: "Incluidas", senal: "obligacion", icono: "Scale", categorias: ["A"] },
	{ nombre: "Vacías", senal: "otras", icono: "Tag", categorias: ["Sin preguntas"] },
];

function banco(recuentos) {
	return Object.entries(recuentos).flatMap(([categoria, cantidad]) =>
		Array.from({ length: cantidad }, () => ({ categoria })),
	);
}

it("añade al grupo Otras las categorías que no están definidas en grupos", () => {
	const resultado = construirGrupos(
		[{ categoria: "A" }, { categoria: "Nueva" }],
		grupos,
	);

	expect(resultado.map(({ nombre }) => nombre)).toEqual(["Incluidas", "Otras"]);
	expect(resultado[1]).toMatchObject({ senal: "otras", icono: "Tag", total: 1 });
	expect(resultado[1].categorias).toEqual([{ nombre: "Nueva", recuento: 1 }]);
});

it("omite grupos sin categorías que tengan preguntas", () => {
	const resultado = construirGrupos([{ categoria: "A" }], grupos);

	expect(resultado.map(({ nombre }) => nombre)).toEqual(["Incluidas"]);
});

it("incluye el recuento de cada categoría y el total de cada grupo", () => {
	const [grupo] = construirGrupos(banco({ A: 3, B: 2 }), [
		{ nombre: "G", senal: "salvamento", icono: "HeartPulse", categorias: ["A", "B"] },
	]);

	expect(grupo.categorias).toEqual([
		{ nombre: "A", recuento: 3 },
		{ nombre: "B", recuento: 2 },
	]);
	expect(grupo.total).toBe(5);
});

it("el banco real agrupa todas las categorías con señal e icono", () => {
	const nombres = [...new Set(GRUPOS.flatMap(({ categorias }) => categorias))];
	const resultado = construirGrupos(banco(Object.fromEntries(nombres.map((n) => [n, 1]))));

	expect(resultado.flatMap(({ categorias }) => categorias)).toHaveLength(nombres.length);
	expect(resultado.every(({ senal, icono }) => senal && icono)).toBe(true);
	expect(CATEGORIA_ESPECIAL.Incendios).toEqual({ senal: "incendios", icono: "Flame" });
});

it("obtenerTodasCategorias devuelve exactamente las categorías del banco", () => {
	const preguntas = [
		{ categoria: "A" },
		{ categoria: "A" },
		{ categoria: "Nueva" },
	];

	expect(obtenerTodasCategorias(preguntas)).toEqual(["A", "Nueva"]);
});

describe("normalizar", () => {
	it("ignora mayúsculas y tildes", () => {
		expect(normalizar("Señalización")).toBe("senalizacion");
		expect(normalizar("Señalización")).toBe(normalizar("senalizacion"));
	});
});

describe("tamanoPegatina", () => {
	it.each([
		[1, "s"],
		[2, "s"],
		[3, "m"],
		[9, "m"],
		[10, "l"],
		[19, "l"],
	])("%i preguntas dan tamaño %s", (recuento, tamano) => {
		expect(tamanoPegatina(recuento)).toBe(tamano);
	});
});

describe("estadoGrupo", () => {
	it("distingue ninguna, algunas y todas", () => {
		expect(estadoGrupo(["A", "B"], [])).toBe("ninguna");
		expect(estadoGrupo(["A", "B"], ["A", "Otra"])).toBe("algunas");
		expect(estadoGrupo(["A", "B"], ["B", "A"])).toBe("todas");
	});

	it("acepta categorías con recuento", () => {
		expect(estadoGrupo([{ nombre: "A", recuento: 1 }], ["A"])).toBe("todas");
	});
});

describe("totalPreguntas", () => {
	const recuentos = { A: 4, B: 6, C: 10 };

	it("suma solo las seleccionadas", () => {
		expect(totalPreguntas(["A", "C"], recuentos)).toBe(14);
	});

	it("devuelve el total del banco sin selección", () => {
		expect(totalPreguntas([], recuentos)).toBe(20);
	});
});

describe("giroPegatina", () => {
	it("es estable y queda entre -2 y 2 grados", () => {
		for (const nombre of ["Incendios", "Formación", "Ley 31/1995 LPRL", "A"]) {
			const giro = giroPegatina(nombre);
			expect(giro).toBe(giroPegatina(nombre));
			expect(giro).toBeGreaterThanOrEqual(-2);
			expect(giro).toBeLessThanOrEqual(2);
		}
	});
});

describe("buscar", () => {
	const lista = construirGrupos(
		banco({ Señalización: 4, "Equipos de Protección": 12, "Ley 31/1995 LPRL": 5 }),
		[
			{
				nombre: "Protección",
				senal: "obligacion",
				icono: "HardHat",
				categorias: ["Señalización", "Equipos de Protección"],
			},
			{ nombre: "Ley", senal: "obligacion", icono: "Scale", categorias: ["Ley 31/1995 LPRL"] },
		],
	);

	it("encuentra sin tildes ni mayúsculas", () => {
		for (const texto of ["senal", "SEÑAL", "epi", "ley"]) {
			const encontradas = buscar(lista, texto).flatMap(({ categorias }) => categorias);
			expect(encontradas.length, texto).toBeGreaterThan(0);
		}
		expect(buscar(lista, "senal")[0].categorias[0].nombre).toBe("Señalización");
	});

	it("encuentra la sigla EPI por alias, sin posición que resaltar", () => {
		const [categoria] = buscar(lista, "EPI").flatMap(({ categorias }) => categorias);
		expect(categoria).toMatchObject({ nombre: "Equipos de Protección", coincidencia: null });
		expect(buscar(lista, "epo")).toEqual([]);
	});

	it("devuelve la posición de la coincidencia en el nombre original", () => {
		const [categoria] = buscar(lista, "nali").flatMap(({ categorias }) => categorias);
		expect(categoria.nombre.slice(categoria.coincidencia.inicio, categoria.coincidencia.fin))
			.toBe("ñali");
	});

	it("descarta los grupos sin coincidencias y recalcula el total", () => {
		const resultado = buscar(lista, "protec");
		expect(resultado.map(({ nombre }) => nombre)).toEqual(["Protección"]);
		expect(resultado[0].total).toBe(12);
	});

	it("sin texto devuelve los grupos sin cambios", () => {
		expect(buscar(lista, "  ")).toBe(lista);
	});
});

describe("sorprendeme", () => {
	const lista = construirGrupos(banco({ A: 6, B: 5, C: 3, D: 8, E: 1 }), [
		{ nombre: "G1", senal: "obligacion", icono: "Scale", categorias: ["A", "E"] },
		{ nombre: "G2", senal: "advertencia", icono: "Construction", categorias: ["B"] },
		{ nombre: "G3", senal: "salvamento", icono: "HeartPulse", categorias: ["C", "D"] },
	]);
	const sumar = (nombres) =>
		nombres.reduce((suma, nombre) => suma + { A: 6, B: 5, C: 3, D: 8, E: 1 }[nombre], 0);

	it("elige tres categorías de grupos distintos con al menos 10 preguntas", () => {
		for (const fija of [0, 0.3, 0.99]) {
			const elegidas = sorprendeme(lista, () => fija);
			expect(elegidas).toHaveLength(3);
			expect(sumar(elegidas)).toBeGreaterThanOrEqual(10);
			const grupo = (nombre) =>
				lista.find(({ categorias }) => categorias.some((c) => c.nombre === nombre)).nombre;
			expect(new Set(elegidas.map(grupo)).size).toBe(3);
		}
	});

	it("con un aleatorio fijo siempre da el mismo resultado", () => {
		expect(sorprendeme(lista, () => 0)).toEqual(sorprendeme(lista, () => 0));
	});

	it("si no se llega a 10, devuelve las categorías que más suman", () => {
		const pequena = construirGrupos(banco({ A: 2, B: 3, C: 1, D: 1 }), [
			{ nombre: "G1", senal: "obligacion", icono: "Scale", categorias: ["A", "D"] },
			{ nombre: "G2", senal: "advertencia", icono: "Construction", categorias: ["B"] },
			{ nombre: "G3", senal: "salvamento", icono: "HeartPulse", categorias: ["C"] },
		]);
		expect(sorprendeme(pequena, () => 0.5).sort()).toEqual(["A", "B", "C"]);
	});

	it("con menos de tres grupos devuelve las que haya", () => {
		expect(sorprendeme(lista.slice(0, 1), () => 0)).toHaveLength(1);
		expect(sorprendeme([], () => 0)).toEqual([]);
	});
});
