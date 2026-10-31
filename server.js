import { readFileSync } from "node:fs";
import { crearServidorSalas } from "./src/server/salas.js";

const preguntas = JSON.parse(
	readFileSync(new URL("./public/preguntas-prl.json", import.meta.url), "utf-8"),
);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);
const { httpServer } = crearServidorSalas({ preguntas, allowedOrigins });
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, "0.0.0.0", () => {
	console.log(`Servidor PRL en http://0.0.0.0:${PORT}`);
});
