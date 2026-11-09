import React from "react";
import { PAISES, REGLAMENTACIONES } from "../utils/reglamentacion.js";

// Control segmentado para elegir con qué reglamentación se juega.
export default function SelectorReglamentacion({ pais, onChange, className = "" }) {
	return (
		<fieldset className={`mx-auto w-fit ${className}`}>
			<legend className="mb-2 w-full text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
				Reglamentación
			</legend>
			<div className="flex gap-2 rounded-xl border border-line bg-card p-1.5">
				{PAISES.map((codigo) => {
					const { pais: nombre, codigo: siglaPais, siglas } = REGLAMENTACIONES[codigo];
					const elegida = codigo === pais;
					return (
						<label
							key={codigo}
							className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
								elegida ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
							}`}
						>
							<input
								type="radio"
								name="reglamentacion"
								value={codigo}
								checked={elegida}
								onChange={() => onChange(codigo)}
								className="sr-only"
							/>
							<span className="font-mono text-xs">{siglaPais}</span>
							{nombre}
							<span className={`text-xs font-normal ${elegida ? "text-white" : "text-ink-muted"}`}>
								{siglas}
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
