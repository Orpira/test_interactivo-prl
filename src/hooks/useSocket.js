import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
	const socketRef = useRef(null);
	const [conectado, setConectado] = useState(false);

	useEffect(() => {
		const socket = io({ transports: ["websocket", "polling"] });
		socketRef.current = socket;

		socket.on("connect", () => setConectado(true));
		socket.on("disconnect", () => setConectado(false));

		return () => {
			socket.disconnect();
		};
	}, []);

	return { socket: socketRef.current, conectado };
}
