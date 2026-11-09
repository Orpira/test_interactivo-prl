import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const leer = (ruta) => readFileSync(resolve(raiz, ruta), "utf8");

const dockerfile = leer("Dockerfile");
const compose = leer("compose.yaml");

// Orígenes de los COPY que escriben en la imagen final (no los de otras etapas).
function origenesCopiados() {
	return dockerfile
		.split("\n")
		.filter((linea) => /^COPY\s/.test(linea) && !linea.includes("--from"))
		.flatMap((linea) => {
			const partes = linea.replace(/^COPY\s+/, "").split(/\s+/).filter((p) => !p.startsWith("--"));
			return partes.slice(0, -1);
		})
		.map((origen) => origen.replace(/^\.\//, "").replace(/\/$/, ""));
}

const cubierto = (archivo, origenes) =>
	origenes.some((origen) => archivo === origen || archivo.startsWith(`${origen}/`));

// Recorre los import relativos del servidor (sin las pruebas), como haría Node en la imagen.
function archivosQueImportaElServidor() {
	const pendientes = ["server.js"];
	const vistos = new Set();
	while (pendientes.length > 0) {
		const archivo = pendientes.pop();
		if (vistos.has(archivo)) continue;
		vistos.add(archivo);
		const texto = leer(archivo);
		for (const [, ruta] of texto.matchAll(/(?:from|import)\s+["'](\.{1,2}\/[^"']+)["']/g)) {
			const destino = relative(raiz, resolve(raiz, dirname(archivo), ruta));
			expect(existsSync(resolve(raiz, destino)), `${archivo} importa ${ruta}`).toBe(true);
			pendientes.push(destino);
		}
	}
	return [...vistos];
}

describe("imagen Docker", () => {
	it("copia todos los archivos que el servidor importa", () => {
		const origenes = origenesCopiados();
		const necesarios = archivosQueImportaElServidor();
		expect(necesarios).toEqual(expect.arrayContaining(["server.js", "src/server/servicio.js", "src/server/nucleo.js", "src/utils/quiz.js"]));
		for (const archivo of necesarios) {
			expect(cubierto(archivo, origenes), `${archivo} no se copia en el Dockerfile`).toBe(true);
		}
	});

	it("copia los bancos de preguntas y package.json (por «type»: «module»)", () => {
		const origenes = origenesCopiados();
		for (const banco of ["public/preguntas-prl.json", "public/preguntas-sst-colombia.json"]) {
			expect(cubierto(banco, origenes), `${banco} no se copia en el Dockerfile`).toBe(true);
			expect(leer("server.js")).toContain(banco);
		}
		expect(cubierto("package.json", origenes)).toBe(true);
		expect(JSON.parse(leer("package.json")).type).toBe("module");
	});

	it("el servidor no necesita node_modules: solo usa módulos integrados de Node", () => {
		const importados = [...new Set(["server.js", ...archivosQueImportaElServidor()])].flatMap((archivo) =>
			[...leer(archivo).matchAll(/(?:from|import)\s+["']([^."'][^"']*)["']/g)].map(([, nombre]) => nombre),
		);
		expect(importados.length).toBeGreaterThan(0);
		for (const nombre of importados) expect(nombre, "dependencia externa en el servidor").toMatch(/^node:/);
	});

	it("corre como usuario node, con node 22 alpine y un volumen para los datos", () => {
		expect(dockerfile).toMatch(/^FROM node:22-alpine/m);
		expect(dockerfile).toMatch(/^USER node$/m);
		expect(dockerfile).toContain('VOLUME ["/app/data"]');
		expect(dockerfile).toContain("PRL_DATA_DIR=/app/data");
		expect(dockerfile).toMatch(/chown node:node \/app\/data/);
		expect(dockerfile.indexOf("USER node")).toBeGreaterThan(dockerfile.indexOf("COPY"));
		expect(dockerfile).toMatch(/^CMD \["node", "server\.js"\]$/m);
	});

	it("el puerto 8788 coincide en el servidor, el Dockerfile, el compose y el proxy de Vite", () => {
		expect(leer("server.js")).toContain("|| 8788");
		expect(dockerfile).toContain("PORT=8788");
		expect(dockerfile).toContain("EXPOSE 8788");
		expect(dockerfile).toContain("127.0.0.1:8788/health");
		expect(compose).toMatch(/PORT: 8788/);
		expect(compose).toMatch(/expose:\s*\n\s*- "8788"/);
		expect(compose).toContain("127.0.0.1:8788/health");
		expect(leer("vite.config.js")).toContain("http://localhost:8788");
	});

	it("tiene un HEALTHCHECK a /health", () => {
		expect(dockerfile).toMatch(/^HEALTHCHECK .*\\\n\s+CMD \["node", "-e", "fetch\('http:\/\/127\.0\.0\.1:8788\/health'\)/m);
	});
});

describe("compose.yaml", () => {
	it("no publica puertos y solo expone el 8788 a la red interna", () => {
		expect(compose).not.toMatch(/^\s+ports:/m);
		// Una asignación de puertos sería una entrada de lista como «- "8788:8788"».
		expect(compose).not.toMatch(/^\s*-\s*["']?[\d.]*:?\d+:8788/m);
	});

	it("usa la red externa orpira-network, un volumen propio y reinicio automático", () => {
		expect(compose).toMatch(/networks:\s*\n\s+- orpira-network/);
		expect(compose).toMatch(/orpira-network:\s*\n\s+external: true\s*\n\s+name: orpira-network/);
		expect(compose).toContain("container_name: orpira-prl-api");
		expect(compose).toContain("name: orpira_prl_data");
		expect(compose).toContain("prl_data:/app/data");
		expect(compose).toContain("restart: unless-stopped");
		expect(compose).toContain("init: true");
	});

	it("exige PRL_ALLOWED_ORIGINS y confía en el proxy por defecto", () => {
		expect(compose).toMatch(/PRL_ALLOWED_ORIGINS: \$\{PRL_ALLOWED_ORIGINS:\?[^}]+\}/);
		expect(compose).toMatch(/PRL_TRUST_PROXY: \$\{PRL_TRUST_PROXY:-true\}/);
		expect(compose).not.toMatch(/ALLOWED_ORIGINS: ["']?\*/);
	});

	it(".env.example declara las variables del servidor con el origen de producción", () => {
		const ejemplo = leer(".env.example");
		expect(ejemplo).toMatch(/^PRL_ALLOWED_ORIGINS=https:\/\/prl\.orpira\.es$/m);
		expect(ejemplo).toMatch(/^PRL_TRUST_PROXY=true$/m);
		expect(ejemplo).toMatch(/^VITE_API_URL=$/m);
	});
});

describe(".dockerignore y secretos", () => {
	it("excluye dependencias, datos, secretos y pruebas del contexto", () => {
		const lineas = leer(".dockerignore").split("\n").map((linea) => linea.trim());
		for (const entrada of ["node_modules", "dist", ".data", ".git", ".env", "**/*.test.js"]) {
			expect(lineas, entrada).toContain(entrada);
		}
		expect(lineas).toContain("!.env.example");
	});

	it(".gitignore no versiona los datos ni los .env", () => {
		const lineas = leer(".gitignore").split("\n").map((linea) => linea.trim());
		for (const entrada of [".data/", ".env", ".env.local"]) expect(lineas, entrada).toContain(entrada);
	});

	it("no quedan restos de Render ni de Socket.IO en la configuración de despliegue", () => {
		expect(existsSync(resolve(raiz, "render.yaml"))).toBe(false);
		const paquete = JSON.parse(leer("package.json"));
		const dependencias = Object.keys({ ...paquete.dependencies, ...paquete.devDependencies });
		for (const nombre of ["express", "socket.io", "socket.io-client"]) expect(dependencias).not.toContain(nombre);
	});
});
