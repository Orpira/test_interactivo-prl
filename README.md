# PRL Master — Tests de Prevención de Riesgos Laborales

Aplicación interactiva para practicar y evaluar conocimientos de Prevención de Riesgos Laborales (PRL), en modo individual, multijugador local o en salas en red.

## Características

- **Banco actualizado:** 170 preguntas en 26 categorías.
- **Opciones aleatorias:** cada intento baraja preguntas y opciones, conservando el índice de la respuesta correcta.
- **Selector temático:** grupos que solo muestran categorías disponibles, búsqueda y selección de todas las categorías del banco.
- **Modos de juego:** individual, multijugador por turnos con el mismo test y salas en red.
- **Corrección en red del lado del servidor:** las respuestas correctas no se envían antes de responder y el ranking se calcula con respuestas validadas.
- **Temporizador opcional:** 15/30/45/60 segundos por pregunta o 5/10/15/20 minutos por test.
- **Interfaz adaptable:** optimizada para móvil y escritorio, con soporte para `prefers-reduced-motion`.

## Stack tecnológico

| Herramienta | Uso |
| --- | --- |
| React 19 | Interfaz y componentes |
| Vite 6 | Desarrollo y compilación |
| Tailwind CSS 3 | Estilos |
| Express 5 | Servicio HTTP del modo en red |
| Socket.IO 4 | Comunicación en tiempo real |
| Vitest | Pruebas unitarias y de integración |

El proyecto usa JavaScript y módulos ES. Se requiere Node.js 20 o superior y npm 9 o superior.
Las comprobaciones de desarrollo se han realizado con Node.js 22. Si usas nvm, selecciona esa versión con `nvm install 22` y `nvm use 22`.

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
├── render.yaml
├── server.js
├── public/
│   └── preguntas-prl.json
└── src/
    ├── App.jsx
    ├── App.test.jsx
    ├── identidad.test.js
    ├── components/
    │   ├── CategorySelector.jsx
    │   ├── Features.jsx
    │   ├── Footer.jsx
    │   ├── Hero.jsx
    │   ├── PreviewEditor.jsx
    │   ├── QuizOnline.jsx
    │   ├── RankingSummary.jsx
    │   └── Sala.jsx
    ├── hooks/useSocket.js
    ├── server/
    │   ├── salas.js
    │   └── salas.test.js
    └── utils/
        ├── banco.test.js
        ├── categorias.js
        ├── categorias.test.js
        ├── quiz.js
        └── quiz.test.js
```

## Instalación y desarrollo

```bash
npm ci
npm run dev
```

Vite abre la aplicación en `http://localhost:5173`. El modo local no necesita el servidor Socket.IO.

### Modo en red local

Inicia el servidor y Vite en terminales separadas:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

El servidor escucha en el puerto `3001`; Vite redirige `/socket.io` al servidor local. Para probar en la misma red, accede desde los dispositivos a la dirección IP del equipo que ejecuta Vite.

## Variables de entorno

Copia `.env.example` a `.env.local` si necesitas configurar el cliente:

| Variable | Uso |
| --- | --- |
| `VITE_SOCKET_URL` | URL del servidor Socket.IO. Vacía o sin definir usa el proxy local de Vite. |
| `ALLOWED_ORIGINS` | En el servidor, orígenes permitidos separados por comas. Por defecto: `http://localhost:5173`. |
| `PORT` | Puerto del servidor. Por defecto: `3001`. |

Los archivos `.env` y `.env.local` están excluidos de Git.

## Despliegue del modo en red

El frontend y el servidor de salas se despliegan por separado. El archivo `render.yaml` prepara el servicio de Node en Render; Vercel continúa publicando el frontend.

1. En Render, crea un **New → Blueprint** y selecciona este repositorio para cargar `render.yaml`.
2. Copia la URL pública del servicio, por ejemplo `https://prl-master-server.onrender.com`.
3. En el proyecto de Vercel de `prl.orpira.es`, añade `VITE_SOCKET_URL` con esa URL y vuelve a desplegar el frontend.
4. Comprueba `https://<servicio>.onrender.com/health`, que debe responder `{"ok":true}`.

El origen permitido de producción está configurado en `render.yaml` como `https://prl.orpira.es`. En el plan gratuito de Render el servicio puede dormirse después de 15 minutos sin actividad y tardar aproximadamente 30–50 segundos en despertar.

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
| `npm run server` | Servidor Socket.IO local |
| `npm start` | Arranque de producción del servidor Socket.IO |

Las pruebas validan el barajado, la unicidad e integridad del banco, los grupos de categorías y el comportamiento del servidor de salas con clientes Socket.IO reales. Las pruebas de interfaz usan jsdom y cubren los tres turnos locales, el reinicio desde el ranking, los temporizadores y los errores de carga.

## Eventos Socket.IO

| Dirección | Evento | Datos / descripción |
| --- | --- | --- |
| Cliente → servidor | `crear-sala` | `{nombre, numPreguntas, categorias, timerConfig}` |
| Cliente → servidor | `unirse-sala` | `{codigo, nombre}` |
| Cliente → servidor | `iniciar-test` | Solo el anfitrión puede iniciar |
| Cliente → servidor | `responder` | `{indice, opcion}`; `opcion: null` indica tiempo agotado |
| Cliente → servidor | `salir-sala` | Retira al jugador al volver a inicio; libera la sala si queda vacía |
| Servidor → cliente | `jugadores-actualizados` | Lista de nombres en la sala |
| Servidor → cliente | `test-iniciado` | Preguntas sin `respuesta` y configuración del temporizador |
| Servidor → cliente | `ranking-actualizado` | Ranking calculado con respuestas del servidor |
| Servidor → cliente | `eres-host` | Notifica la reasignación del anfitrión |

Los eventos `crear-sala`, `unirse-sala`, `iniciar-test`, `responder` y `salir-sala` responden mediante callback con `{ok, ...}`. Al cambiar de sala se abandona la anterior y, si sale el anfitrión, el servidor reasigna ese papel. El ranking identifica a cada jugador por su socket, aunque los nombres coincidan. No existe un evento para enviar una puntuación calculada por el cliente.

## Licencia

ISC
