import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
	const [socket, setSocket] = useState(null);
	const [conectado, setConectado] = useState(false);
	const [conexionComprobada, setConexionComprobada] = useState(false);

	useEffect(() => {
		const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
		const cliente = io(socketUrl, { transports: ["websocket", "polling"] });
		const timeout = setTimeout(() => setConexionComprobada(true), 5000);
		setSocket(cliente);

		cliente.on("connect", () => {
			clearTimeout(timeout);
			setConexionComprobada(true);
			setConectado(true);
		});
		cliente.on("disconnect", () => setConectado(false));

		return () => {
			clearTimeout(timeout);
			cliente.disconnect();
		};
	}, []);

	return { socket, conectado, conexionComprobada };
}
