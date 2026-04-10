import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { readFileSync } from "fs";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: { origin: "*" },
});

// Cargar preguntas
const preguntas = JSON.parse(
	readFileSync(
		new URL("./public/preguntas-prl.json", import.meta.url),
		"utf-8",
	),
);

function barajar(arr) {
	const copia = [...arr];
	for (let i = copia.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copia[i], copia[j]] = [copia[j], copia[i]];
	}
	return copia;
}

function generarCodigo() {
	return "PRL-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Estado de salas: { codigo: { host, numPreguntas, preguntas, jugadores: {socketId: {nombre, resultado}}, iniciado, cerrada } }
const salas = new Map();

io.on("connection", (socket) => {
	console.log(`Conectado: ${socket.id}`);

	// Crear sala (profesor/anfitrión)
	socket.on("crear-sala", ({ nombre, numPreguntas, categorias }, cb) => {
		const codigo = generarCodigo();
		const preguntasBase =
			categorias && categorias.length > 0
				? preguntas.filter((p) => categorias.includes(p.categoria))
				: preguntas;
		const preguntasSala = barajar(preguntasBase).slice(
			0,
			Math.min(numPreguntas, preguntasBase.length),
		);
		salas.set(codigo, {
			host: socket.id,
			numPreguntas: preguntasSala.length,
			preguntas: preguntasSala,
			jugadores: new Map(),
			iniciado: false,
			cerrada: false,
		});
		// El host también se une como jugador
		const sala = salas.get(codigo);
		sala.jugadores.set(socket.id, { nombre, resultado: null });
		socket.join(codigo);
		socket.data.sala = codigo;
		cb({ ok: true, codigo, totalPreguntas: preguntasSala.length });
		console.log(`Sala ${codigo} creada por ${nombre}`);
	});

	// Unirse a sala
	socket.on("unirse-sala", ({ codigo, nombre }, cb) => {
		const sala = salas.get(codigo);
		if (!sala) return cb({ ok: false, error: "Sala no encontrada" });
		if (sala.iniciado) return cb({ ok: false, error: "El test ya comenzó" });
		if (sala.cerrada) return cb({ ok: false, error: "La sala está cerrada" });

		sala.jugadores.set(socket.id, { nombre, resultado: null });
		socket.join(codigo);
		socket.data.sala = codigo;

		const listaJugadores = Array.from(sala.jugadores.values()).map(
			(j) => j.nombre,
		);
		io.to(codigo).emit("jugadores-actualizados", listaJugadores);
		cb({ ok: true, totalPreguntas: sala.numPreguntas });
		console.log(
			`${nombre} se unió a ${codigo} (${listaJugadores.length} jugadores)`,
		);
	});

	// Iniciar test (solo el host)
	socket.on("iniciar-test", (_, cb) => {
		const codigo = socket.data.sala;
		const sala = salas.get(codigo);
		if (!sala) return cb?.({ ok: false });
		if (sala.host !== socket.id)
			return cb?.({ ok: false, error: "No eres el anfitrión" });

		sala.iniciado = true;
		// Enviar preguntas a todos los de la sala
		io.to(codigo).emit("test-iniciado", { preguntas: sala.preguntas });
		cb?.({ ok: true });
		console.log(`Test iniciado en sala ${codigo}`);
	});

	// Jugador envía resultado
	socket.on("enviar-resultado", ({ aciertos, total, porcentaje }) => {
		const codigo = socket.data.sala;
		const sala = salas.get(codigo);
		if (!sala) return;

		const jugador = sala.jugadores.get(socket.id);
		if (!jugador) return;

		jugador.resultado = { aciertos, total, porcentaje };

		// Construir ranking actual
		const ranking = Array.from(sala.jugadores.values())
			.filter((j) => j.resultado !== null)
			.map((j) => ({ nombre: j.nombre, ...j.resultado }))
			.sort((a, b) => {
				if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
				return b.aciertos - a.aciertos;
			});

		const totalJugadores = sala.jugadores.size;
		const terminados = ranking.length;

		io.to(codigo).emit("ranking-actualizado", {
			ranking,
			terminados,
			totalJugadores,
			completo: terminados === totalJugadores,
		});

		console.log(
			`Resultado en ${codigo}: ${jugador.nombre} — ${porcentaje}% (${terminados}/${totalJugadores})`,
		);
	});

	// Desconexión
	socket.on("disconnect", () => {
		const codigo = socket.data.sala;
		if (!codigo) return;
		const sala = salas.get(codigo);
		if (!sala) return;

		const jugador = sala.jugadores.get(socket.id);
		sala.jugadores.delete(socket.id);

		if (sala.jugadores.size === 0) {
			salas.delete(codigo);
			console.log(`Sala ${codigo} eliminada (vacía)`);
		} else {
			const listaJugadores = Array.from(sala.jugadores.values()).map(
				(j) => j.nombre,
			);
			io.to(codigo).emit("jugadores-actualizados", listaJugadores);
			// Si era el host, asignar nuevo host
			if (sala.host === socket.id) {
				sala.host = sala.jugadores.keys().next().value;
				io.to(sala.host).emit("eres-host");
			}
			console.log(`${jugador?.nombre ?? socket.id} desconectado de ${codigo}`);
		}
	});
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
	console.log(`🚀 Servidor PRL en http://0.0.0.0:${PORT}`);
});
