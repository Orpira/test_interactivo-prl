import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		host: true,
		port: 5173,
		proxy: {
			// En local el cliente usa el mismo origen y Vite reenvía la API al servidor de salas.
			"/api": "http://localhost:8788",
			"/health": "http://localhost:8788",
		},
	},
});
