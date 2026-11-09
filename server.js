import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { crearServicio } from "./src/server/servicio.js";

const leerBanco = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), "utf-8"));
// Un banco por reglamentación: España (PRL) y Colombia (SST).
const bancos = {
	es: leerBanco("./public/preguntas-prl.json"),
	co: leerBanco("./public/preguntas-sst-colombia.json"),
};
const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || "0.0.0.0";
const directorioDatos = resolve(process.env.PRL_DATA_DIR || "./.data");
const allowedOrigins = (process.env.PRL_ALLOWED_ORIGINS || "http://localhost:5173")
	.split(",")
	.map((origen) => origen.trim())
	.filter(Boolean);
const trustProxy = process.env.PRL_TRUST_PROXY === "true";

const servicio = await crearServicio({ bancos, directorioDatos, allowedOrigins, trustProxy });

servicio.httpServer.listen(PORT, HOST, () => {
	console.log(`API de salas PRL en http://${HOST}:${PORT} (datos en ${directorioDatos})`);
});

let cerrando = false;
async function cerrar(senal) {
	if (cerrando) return;
	cerrando = true;
	console.log(`Recibido ${senal}: guardando salas y cerrando`);
	try {
		await servicio.cerrar();
	} catch (error) {
		console.error("Error al cerrar:", error);
		process.exitCode = 1;
	}
	process.exit();
}
process.on("SIGTERM", () => cerrar("SIGTERM"));
process.on("SIGINT", () => cerrar("SIGINT"));
