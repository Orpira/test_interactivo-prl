import React from "react";
import { Check } from "lucide-react";
import { ESTILOS_SENAL } from "../utils/estilosSenal.js";

const TRIANGULO = "polygon(50% 0, 100% 100%, 0 100%)";
// Triángulo interior con un borde de ~3 px a 64 px de tamaño.
const TRIANGULO_INTERIOR = "polygon(50% 10.5%, 92.4% 95.3%, 7.6% 95.3%)";

function Triangulo({ estilos, activa, Icono, tamano }) {
	return (
		<>
			{activa && (
				<>
					<span
						className={`absolute ${estilos.fondo}`}
						style={{ inset: -6, clipPath: TRIANGULO }}
					/>
					<span className="absolute bg-bg" style={{ inset: -3, clipPath: TRIANGULO }} />
				</>
			)}
			<span className="absolute inset-0 bg-ink" style={{ clipPath: TRIANGULO }} />
			<span
				className={`absolute inset-0 ${estilos.fondo}`}
				style={{ clipPath: TRIANGULO_INTERIOR }}
			/>
			<span className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: "26%" }}>
				{Icono && (
					<Icono
						size={Math.round(tamano * 0.34)}
						strokeWidth={2}
						className={estilos.on}
					/>
				)}
			</span>
		</>
	);
}

function Redonda({ tipo, estilos, activa, Icono, tamano }) {
	const circulo = tipo === "obligacion" || tipo === "otras";
	const aro = activa ? `ring-[3px] ring-offset-[3px] ring-offset-bg ${estilos.anillo}` : "";
	return (
		<span
			className={`absolute inset-0 flex items-center justify-center ${estilos.fondo} ${aro} ${circulo ? "rounded-full" : ""}`}
			style={circulo ? undefined : { borderRadius: "18%" }}
		>
			{circulo && (
				<span
					className={`absolute inset-[7%] rounded-full border-2 border-current ${estilos.on}`}
				/>
			)}
			{Icono && (
				<Icono
					size={Math.round(tamano * 0.5)}
					strokeWidth={2}
					className={`relative ${estilos.on}`}
				/>
			)}
		</span>
	);
}

export default function Senal({ tipo, icono: Icono, tamano = 64, activa = false }) {
	const estilos = ESTILOS_SENAL[tipo] ?? ESTILOS_SENAL.otras;
	const forma = ESTILOS_SENAL[tipo] ? tipo : "otras";
	const props = { tipo: forma, estilos, activa, Icono, tamano };

	return (
		<span
			aria-hidden="true"
			className="relative inline-block shrink-0"
			style={{ width: tamano, height: tamano }}
		>
			{forma === "advertencia" ? <Triangulo {...props} /> : <Redonda {...props} />}
			{activa && (
				<span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white ring-2 ring-bg">
					<Check size={12} strokeWidth={3} />
				</span>
			)}
		</span>
	);
}
