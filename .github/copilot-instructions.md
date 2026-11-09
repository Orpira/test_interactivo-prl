# Contexto del proyecto: PRL Master

- App de tests de Prevención de Riesgos Laborales (PRL) en español.
- Frontend: React 19 + Vite 6 + Tailwind CSS 3 (JavaScript, sin TypeScript).
- Servidor de salas en red: Express 5 + Socket.IO 4 en `server.js` (ES modules).
- Bancos de preguntas: `public/preguntas-prl.json` (España) y `public/preguntas-sst-colombia.json` (Colombia, ids desde 1001). La reglamentación elegida se define en `src/utils/reglamentacion.js`. Cada pregunta tiene
  `{ id, categoria, pregunta, opciones: string[], respuesta: number }`,
  donde `respuesta` es el índice de la opción correcta.
- Componentes principales en `src/components/`:
  - `PreviewEditor.jsx` exporta `QuizPRL`: modos individual y multijugador local.
  - `Sala.jsx` y `QuizOnline.jsx`: modo en red.
  - `CategorySelector.jsx`: categorías agrupadas en bloques.
- Todo el texto visible está en español de España.
- Reglas:
  - No cambies el contenido de las preguntas salvo que se pida.
  - Mantén los nombres de variables y funciones en español, como el código actual.
  - Cambios pequeños y revisables; no reformatees archivos enteros.
  - Si añades lógica, añade o actualiza tests con Vitest.
  - Identidad visual propia: verde azulado #0F766E y amarillo #FACC15 sobre fondo #F4F7F6; Space Grotesk para titulares y JetBrains Mono para contadores, temporizador y códigos de sala. No reutilices los colores ni las fuentes del portfolio orpira.es.
  - Mantén contraste AA: amarillo con texto ink; sobre surface usa ink-soft, no ink-muted; para textos de acierto usa ok-ink.
