import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ErrorApi,
	comprobarSalud,
	crearSala,
	iniciarSala,
	responder,
	salirSala,
	unirseSala,
	verSala,
} from "./salas.js";

function respuestaJson(estado, datos, cabeceras = {}) {
	return new Response(JSON.stringify(datos), {
		status: estado,
		headers: { "content-type": "application/json", ...cabeceras },
	});
}

let fetchSimulado;

beforeEach(() => {
	fetchSimulado = vi.fn();
	vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

const ultima = () => {
	const [url, opciones] = fetchSimulado.mock.calls.at(-1);
	return { url, ...opciones, cabeceras: opciones.headers };
};

describe("rutas y cabeceras", () => {
	it("sin VITE_API_URL usa el mismo origen", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(201, { codigo: "PRL-AAAA", sessionId: "s" }));
		await crearSala({ nombre: "Ana" });
		expect(ultima()).toMatchObject({ url: "/api/salas", method: "POST" });
		expect(JSON.parse(ultima().body)).toEqual({ nombre: "Ana" });
		expect(ultima().cabeceras["content-type"]).toBe("application/json");
		expect(ultima().cabeceras.authorization).toBeUndefined();
	});

	it("con VITE_API_URL antepone la base y quita la barra final", async () => {
		vi.stubEnv("VITE_API_URL", "https://api-prl.orpira.es/");
		fetchSimulado.mockResolvedValue(respuestaJson(200, {}));
		await unirseSala("PRL-AB12", "Luis");
		expect(ultima().url).toBe("https://api-prl.orpira.es/api/salas/PRL-AB12/unirse");
		expect(JSON.parse(ultima().body)).toEqual({ nombre: "Luis" });
	});

	it("las rutas con sesión envían el Bearer y usan el método correcto", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(200, { ok: true }));
		await verSala("PRL-AB12", "secreto");
		expect(ultima()).toMatchObject({ url: "/api/salas/PRL-AB12", method: "GET" });
		expect(ultima().cabeceras.authorization).toBe("Bearer secreto");
		expect(ultima().body).toBeUndefined();
		await iniciarSala("PRL-AB12", "secreto");
		expect(ultima()).toMatchObject({ url: "/api/salas/PRL-AB12/iniciar", method: "POST" });
		await responder("PRL-AB12", "secreto", { comandoId: "c", indice: 0, opcion: 1 });
		expect(ultima().url).toBe("/api/salas/PRL-AB12/responder");
		expect(JSON.parse(ultima().body)).toEqual({ comandoId: "c", indice: 0, opcion: 1 });
		await salirSala("PRL-AB12", "secreto");
		expect(ultima().url).toBe("/api/salas/PRL-AB12/salir");
	});

	it("codifica el código en la URL", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(200, {}));
		await verSala("a/b?c", "s");
		expect(ultima().url).toBe("/api/salas/a%2Fb%3Fc");
	});

	it("pasa la señal de cancelación a fetch", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(200, {}));
		const controlador = new AbortController();
		await verSala("PRL-AB12", "s", { signal: controlador.signal });
		expect(ultima().signal).toBe(controlador.signal);
	});
});

describe("errores", () => {
	it("convierte una respuesta de error en ErrorApi con código, estado y mensaje", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(409, { code: "NOMBRE_REPETIDO", mensaje: "Ya hay alguien con ese nombre" }));
		const error = await unirseSala("PRL-AB12", "Ana").catch((fallo) => fallo);
		expect(error).toBeInstanceOf(ErrorApi);
		expect(error).toMatchObject({ code: "NOMBRE_REPETIDO", status: 409, message: "Ya hay alguien con ese nombre", reintentable: false });
	});

	it("lee retry-after en un 429 y lo marca como reintentable", async () => {
		fetchSimulado.mockResolvedValue(respuestaJson(429, { code: "LIMITE_PETICIONES", mensaje: "Demasiadas peticiones" }, { "retry-after": "12" }));
		const error = await verSala("PRL-AB12", "s").catch((fallo) => fallo);
		expect(error).toMatchObject({ status: 429, reintentarEnSegundos: 12, reintentable: true });
	});

	it("un corte de red es SIN_CONEXION, estado 0 y reintentable", async () => {
		fetchSimulado.mockRejectedValue(new TypeError("Failed to fetch"));
		const error = await responder("PRL-AB12", "s", {}).catch((fallo) => fallo);
		expect(error).toMatchObject({ code: "SIN_CONEXION", status: 0, reintentable: true });
	});

	it("un fallo del servidor (5xx) es reintentable y el 4xx no", () => {
		expect(new ErrorApi("x", { status: 500 }).reintentable).toBe(true);
		expect(new ErrorApi("x", { status: 503 }).reintentable).toBe(true);
		expect(new ErrorApi("x", { status: 401 }).reintentable).toBe(false);
		expect(new ErrorApi("x", { status: 404 }).reintentable).toBe(false);
	});

	it("una respuesta de error sin JSON usa un mensaje por defecto", async () => {
		fetchSimulado.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
		const error = await verSala("PRL-AB12", "s").catch((fallo) => fallo);
		expect(error).toMatchObject({ status: 502, code: "ERROR", message: "Error 502 del servidor" });
	});

	it("una cancelación se propaga tal cual, sin convertirla en error de conexión", async () => {
		fetchSimulado.mockRejectedValue(new DOMException("cancelado", "AbortError"));
		const error = await verSala("PRL-AB12", "s").catch((fallo) => fallo);
		expect(error.name).toBe("AbortError");
		expect(error).not.toBeInstanceOf(ErrorApi);
	});
});

describe("comprobarSalud", () => {
	it("es true si /health responde 200 y consulta la base configurada", async () => {
		vi.stubEnv("VITE_API_URL", "https://api-prl.orpira.es");
		fetchSimulado.mockResolvedValue(respuestaJson(200, { ok: true }));
		expect(await comprobarSalud()).toBe(true);
		expect(ultima().url).toBe("https://api-prl.orpira.es/health");
	});

	it("es false si responde un error o no hay red", async () => {
		fetchSimulado.mockResolvedValueOnce(respuestaJson(503, {}));
		expect(await comprobarSalud()).toBe(false);
		fetchSimulado.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		expect(await comprobarSalud()).toBe(false);
	});

	it("es false si no contesta en 4 s", async () => {
		vi.useFakeTimers();
		fetchSimulado.mockImplementation(
			(_url, { signal }) =>
				new Promise((_resolver, rechazar) => {
					signal.addEventListener("abort", () => rechazar(new DOMException("cancelado", "AbortError")));
				}),
		);
		const resultado = comprobarSalud();
		await vi.advanceTimersByTimeAsync(3999);
		let terminado = false;
		resultado.then(() => (terminado = true));
		await vi.advanceTimersByTimeAsync(0);
		expect(terminado).toBe(false);
		await vi.advanceTimersByTimeAsync(2);
		expect(await resultado).toBe(false);
	});
});
