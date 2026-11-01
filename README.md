# PRL Master — Tests de Prevención de Riesgos Laborales

Aplicación interactiva para practicar y evaluar conocimientos de Prevención de Riesgos Laborales (PRL), en modo individual, multijugador local o en salas en red.

## Características

- **Banco actualizado:** 170 preguntas en 26 categorías.
- **Opciones aleatorias:** cada intento baraja preguntas y opciones, conservando el índice de la respuesta correcta.
- **Selector temático con señales de seguridad:** cada grupo es una señal (obligación, advertencia, salvamento) y sus categorías son pegatinas cuyo tamaño depende del número de preguntas. Incluye búsqueda sin tildes, «Sorpréndeme», «Todas» y un contador flotante que muestra el total calculado a partir del banco.
- **Modos de juego:** individual, multijugador por turnos con el mismo test y salas en red.
- **Modo en red con API HTTP:** sin WebSockets; el cliente consulta la sala cada segundo. Cada alumno tiene una sesión secreta: si bloquea el móvil o recarga la página, vuelve a su pregunta con su progreso.
- **El servidor es la autoridad:** corrige, controla el tiempo y calcula el ranking. Las respuestas correctas no se envían antes de responder y un reenvío por un corte de red no cuenta dos veces.
- **Salas guardadas en disco:** sobreviven a reinicios y despliegues.
- **Temporizador opcional:** 15/30/45/60 segundos por pregunta o 5/10/15/20 minutos por test.
- **Interfaz adaptable:** optimizada para móvil y escritorio, con soporte para `prefers-reduced-motion`.

## Stack tecnológico

| Herramienta | Uso |
| --- | --- |
| React 19 | Interfaz y componentes |
| Vite 6 | Desarrollo y compilación |
| Tailwind CSS 3 | Estilos |
| `node:http` | API HTTP del modo en red (sin dependencias de ejecución) |
| Docker | Contenedor de la API en el VPS |
| Vitest | Pruebas unitarias y de integración |

El proyecto usa JavaScript y módulos ES. Para ejecutar la aplicación y el servidor se requiere Node.js 20 o superior y npm 9 o superior.
Las pruebas (Vitest 5) necesitan Node.js 22.12 o superior. Las comprobaciones de desarrollo se han realizado con Node.js 22. Si usas nvm, selecciona esa versión con `nvm install 22` y `nvm use 22`.

## Identidad visual

PRL Master tiene una identidad propia inspirada en la señalización de seguridad: verde azulado `#0F766E`, amarillo `#FACC15`, fondo frío `#F4F7F6` y tarjetas blancas. El inicio incluye una franja diagonal amarilla y oscura de 6 px.

Las fuentes se sirven desde la propia aplicación: **Space Grotesk** (pesos 600–700) para titulares y **JetBrains Mono** para contadores, temporizador y códigos de sala. El resto del texto usa la fuente del sistema.

La paleta está definida en `tailwind.config.js`. Para conservar contraste AA, el amarillo lleva texto `ink`, las superficies secundarias usan texto `ink-soft` y los estados correcto e incorrecto combinan `ok-bg`/`ok-ink` y `ko-bg`/`ko-ink`. Los controles tienen foco visible de 2 px en verde azulado y se respeta `prefers-reduced-motion`.

## Estructura

```text
.
├── .github/copilot-instructions.md
├── .env.example
├── package.json
├── Dockerfile
├── compose.yaml
├── DEPLOYMENT.md
├── server.js
├── public/
│   └── preguntas-prl.json
└── src/
    ├── App.jsx
    ├── App.test.jsx
    ├── identidad.test.js
    ├── components/
    │   ├── CategorySelector.jsx
    │   ├── CategorySelector.test.jsx
    │   ├── Features.jsx
    │   ├── Footer.jsx
    │   ├── Hero.jsx
    │   ├── PreviewEditor.jsx
    │   ├── QuizOnline.jsx
    │   ├── RankingSummary.jsx
    │   ├── Sala.jsx
    │   ├── Senal.jsx
    │   └── Senal.test.jsx
    ├── api/
    │   ├── salas.js
    │   ├── salas.test.js
    │   ├── sesion.js
    │   └── sesion.test.js
    ├── hooks/
    │   ├── useDisponibilidadRed.js
    │   ├── useDisponibilidadRed.test.jsx
    │   ├── useSalaRemota.js
    │   └── useSalaRemota.test.jsx
    ├── server/
    │   ├── almacen.js
    │   ├── almacen.test.js
    │   ├── despliegue.test.js
    │   ├── http.js
    │   ├── http.test.js
    │   ├── limites.js
    │   ├── limites.test.js
    │   ├── nucleo.js
    │   ├── nucleo.test.js
    │   └── servicio.js
    └── utils/
        ├── banco.test.js
        ├── categorias.js
        ├── categorias.test.js
        ├── estilosSenal.js
        ├── quiz.js
        └── quiz.test.js
```

## Instalación y desarrollo

```bash
npm ci
npm run dev
```

Vite abre la aplicación en `http://localhost:5173`. El modo local no necesita la API de salas.

### Modo en red local

Inicia el servidor y Vite en terminales separadas:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

La API escucha en el puerto `8788` y guarda las salas en `./.data/salas.json`; Vite redirige `/api` y `/health` a ella. Para probar en la misma red, accede desde los dispositivos a la dirección IP del equipo que ejecuta Vite.

## Variables de entorno

Copia `.env.example` a `.env.local` para el cliente y a `.env` en el servidor:

| Variable | Dónde | Uso |
| --- | --- | --- |
| `VITE_API_URL` | Cliente | URL de la API (`https://api-prl.orpira.es` en Vercel). Vacía usa el mismo origen con el proxy de Vite. |
| `PRL_ALLOWED_ORIGINS` | Servidor | Orígenes permitidos, exactos y separados por comas. Por defecto `http://localhost:5173`. Obligatoria en `compose.yaml`. |
| `PRL_TRUST_PROXY` | Servidor | `true` solo detrás de Nginx Proxy Manager: toma la IP real de `X-Forwarded-For`. |
| `PORT` / `HOST` | Servidor | Puerto (`8788`) y dirección de escucha (`0.0.0.0`). |
| `PRL_DATA_DIR` | Servidor | Directorio de `salas.json` (`./.data`; `/app/data` en Docker). |

Los archivos `.env`, `.env.local` y el directorio `.data/` están excluidos de Git.

## Despliegue del modo en red

La web se publica en Vercel y la API corre en un contenedor Docker en el VPS, detrás de Nginx Proxy Manager, en `https://api-prl.orpira.es`. Los pasos (DNS, VPS, Nginx Proxy Manager, Vercel, copias de seguridad y actualización) están en [DEPLOYMENT.md](DEPLOYMENT.md).

## Flujo de uso

### Individual

Selecciona modo, introduce el nombre, elige categorías y cantidad, configura el temporizador opcional y responde el test.

### Multijugador local

El primer jugador configura el test completo. Los demás participantes solo introducen su nombre y responden las mismas preguntas, en el mismo orden y con las mismas opciones.

### En red

El anfitrión crea una sala, comparte el código `PRL-XXXX` y espera a que se unan los participantes. Al iniciar, todos reciben las preguntas sin las respuestas correctas. El servidor valida el orden y las opciones, aplica los límites de tiempo y publica el ranking.

## Banco de preguntas

`public/preguntas-prl.json` contiene **170 preguntas en 26 categorías**. La lista se mantiene sin alterar el contenido de las preguntas, salvo la retirada de duplicados exactos.

### Categorías por grupo

| Grupo | Categorías incluidas |
| --- | --- |
| Legislación y Normativa | Ley 31/1995 LPRL |
| Organización Preventiva | Plan de Prevención, Servicios de Prevención, Comité de Seguridad, Delegados de Prevención, Formación, Cultura Preventiva |
| Evaluación y Vigilancia | Evaluación de Riesgos, Vigilancia de la Salud, Accidente de Trabajo, Enfermedades Profesionales, Riesgos Laborales |
| Tipos de Riesgos | Riesgos Físicos, Riesgos Químicos, Riesgos Biológicos, Riesgos Ergonómicos, Riesgos Psicosociales, Riesgos Eléctricos |
| Protección y Entorno | Equipos de Protección, Señalización, Lugares de Trabajo, Manipulación Manual de Cargas |
| Emergencias y Primeros Auxilios | Emergencias, Incendios, Primeros Auxilios |
| Colectivos y Trabajos Especiales | Trabajos Especiales |

### Preguntas por categoría

| Categoría | Preguntas |
| --- | ---: |
| Accidente de Trabajo | 4 |
| Comité de Seguridad | 3 |
| Cultura Preventiva | 1 |
| Delegados de Prevención | 1 |
| Emergencias | 9 |
| Enfermedades Profesionales | 4 |
| Equipos de Protección | 17 |
| Evaluación de Riesgos | 4 |
| Formación | 2 |
| Incendios | 11 |
| Ley 31/1995 LPRL | 12 |
| Lugares de Trabajo | 3 |
| Manipulación Manual de Cargas | 3 |
| Plan de Prevención | 5 |
| Primeros Auxilios | 6 |
| Riesgos Biológicos | 3 |
| Riesgos Eléctricos | 2 |
| Riesgos Ergonómicos | 10 |
| Riesgos Físicos | 11 |
| Riesgos Laborales | 19 |
| Riesgos Psicosociales | 10 |
| Riesgos Químicos | 10 |
| Servicios de Prevención | 2 |
| Señalización | 11 |
| Trabajos Especiales | 2 |
| Vigilancia de la Salud | 5 |
| **Total** | **170** |

Cada pregunta contiene `id`, `categoria`, `pregunta`, `opciones` y `respuesta`. El valor `respuesta` es el índice de la opción correcta antes de barajar.

## Pruebas y scripts

```bash
npm test
npm run build
npm run preview
```

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Compilación de producción |
| `npm run preview` | Previsualización local de la compilación |
| `npm test` | Ejecuta pruebas unitarias y de integración |
| `npm run test:watch` | Ejecuta Vitest en modo observación |
| `npm run server` | API de salas local (puerto 8788) |
| `npm start` | Arranque de producción de la API de salas |
| `npm run prueba:aula` | Simula una clase de 30 alumnos contra la API (ver más abajo) |

Las pruebas validan el barajado, la unicidad e integridad del banco, los grupos de categorías, el núcleo de salas con reloj controlado, el almacén en disco, la API HTTP real (límites, CORS, 401/409/413/429 y reinicios) y la coherencia del despliegue Docker. Las pruebas de interfaz usan jsdom y cubren los turnos locales, el modo en red, los reintentos con el mismo identificador, el reloj del servidor y la recuperación tras recargar.

## Prueba de aula

`scripts/prueba-aula.mjs` (Node 22, sin dependencias) simula una clase entera: un profesor crea una sala de 10 preguntas con 30 s por pregunta, se unen 30 alumnos desde la misma máquina, cada uno consulta cada segundo y responde con un retraso de 2 a 10 s acertando entre un 40 % y un 90 %, y tres alumnos sufren un corte de 20 s y vuelven con su sesión. Al terminar comprueba que hay 30 alumnos en el ranking, que nadie recibió `429`, que la suma de aciertos coincide con lo enviado y que un reenvío devuelve lo mismo.

```bash
# En local (con "npm run server" en marcha)
npm run prueba:aula

# Contra producción
API_URL=https://api-prl.orpira.es npm run prueba:aula
```

Variables opcionales: `ALUMNOS`, `PREGUNTAS`, `SEGUNDOS`, `ESCALA_TIEMPO` (0.3 = tres veces más rápido; no bajes de 0.3 o superarás el límite por sesión), `CORTE_MS`, `SEMILLA` (repite una ejecución) y `ORIGEN`. Termina con código 0 si todo es correcto, 1 si falla alguna comprobación y 2 si se interrumpe.

## API de salas

Todas las respuestas son JSON con `cache-control: no-store`. Los errores llevan `{ code, mensaje }`.

| Método y ruta | Sesión | Descripción |
| --- | --- | --- |
| `GET /health` | No | `{ "ok": true }` |
| `POST /api/salas` | No | Crea una sala: `{nombre, numPreguntas, categorias, timerConfig}` → `201 {codigo, sessionId}` |
| `POST /api/salas/:codigo/unirse` | No | `{nombre}` → `{codigo, sessionId}` |
| `GET /api/salas/:codigo` | Sí | Vista de la sala para ese alumno |
| `POST /api/salas/:codigo/iniciar` | Sí | Solo el anfitrión |
| `POST /api/salas/:codigo/responder` | Sí | `{comandoId, indice, opcion}`; `opcion: null` = sin contestar → `{correcta, acierto, fueraDeTiempo, vista}` |
| `POST /api/salas/:codigo/salir` | Sí | El alumno abandona la sala |

La sesión se envía como `Authorization: Bearer <sessionId>`. El código de sala solo localiza la sala: nunca da acceso por sí solo.

La vista incluye el estado (`ESPERANDO`, `EN_CURSO` o `TERMINADA`), los jugadores con un indicador de conexión, las preguntas **sin** la respuesta correcta, el progreso del alumno, el límite de tiempo, la hora del servidor y el ranking. Nunca incluye el `sessionId` de otros alumnos ni la respuesta de preguntas aún no contestadas.

### Garantías del servidor

- **Orden obligatorio:** solo se acepta la pregunta que toca; adelantarse o repetir devuelve `409 FUERA_DE_ORDEN` sin revelar la correcta.
- **Idempotencia:** el mismo `comandoId` con el mismo contenido devuelve la respuesta guardada; con otro contenido, `409 COMANDO_REPETIDO`.
- **Tiempo:** los límites son marcas de tiempo y las resuelve el servidor cada 500 ms (con 2 s de margen); el reloj del cliente es solo visual.
- **Anfitrión:** si sale o no se le ve en 60 s, el papel pasa al jugador conectado que entró antes.
- **Límites:** 240 peticiones por minuto por sesión, 30 salas por hora y 120 uniones por minuto por IP, y 6000 por minuto por IP en total.
- **Persistencia:** `salas.json` se escribe de forma atómica con modo `0600`; las salas terminadas se conservan 30 minutos y las inactivas se eliminan a las 2 horas.

## Licencia

ISC
