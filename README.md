# PRL App — Tests de Prevención de Riesgos Laborales

Plataforma web interactiva para la formación y evaluación en **Prevención de Riesgos Laborales (PRL)**. Diseñada para docentes y formadores que necesitan una herramienta ágil para evaluar conocimientos en aula, de forma individual o grupal.

---

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Ejecución](#ejecución)
- [Flujo de uso](#flujo-de-uso)
- [Banco de preguntas](#banco-de-preguntas)
- [Futuras funcionalidades](#futuras-funcionalidades)
- [Scripts disponibles](#scripts-disponibles)
- [Arquitectura de comunicación en red](#arquitectura-de-comunicación-en-red)
- [Licencia](#licencia)

---

## Características

### Tres modos de juego

| Modo                      | Descripción                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| **👤 Individual**         | Un solo usuario realiza el test a su ritmo                                 |
| **👥 Multijugador local** | Varios participantes se turnan en el mismo dispositivo                     |
| **🌐 En Red**             | Múltiples dispositivos conectados en tiempo real mediante salas con código |

### Funcionalidades principales

- **100 preguntas** distribuidas en **32 categorías temáticas** de PRL
- **Selección de categorías por grupos**: 32 categorías organizadas en **7 grupos temáticos** (Legislación, Organización Preventiva, Evaluación y Vigilancia, Tipos de Riesgos, Protección y Entorno, Emergencias, Colectivos Especiales) con búsqueda, selección grupal y conteo de preguntas
- **Cantidad configurable**: elegir cuántas preguntas responder (5, 10, 15, 20 o todas las disponibles)
- **Aleatorización**: las preguntas se barajan en cada intento (Fisher-Yates shuffle)
- **Distribución equilibrada**: las respuestas correctas están balanceadas 25/25/25/25 entre A, B, C y D
- **Retroalimentación inmediata**: se indica la respuesta correcta tras cada selección
- **Sistema de ranking**: clasificación con medallas (🥇🥈🥉) ordenada por porcentaje de aciertos
- **Modo aula en red**: creación de salas con código (PRL-XXXX), ranking en tiempo real conforme los participantes terminan
- **Temporizador opcional**: el usuario elige jugar sin límite de tiempo, con temporizador por pregunta (15/30/45/60s) o por test completo (5/10/15/20 min). Si se agota el tiempo por pregunta, se muestra la respuesta correcta y se avanza automáticamente. Si se agota el tiempo total, el test se finaliza con la puntuación acumulada
- **Reconexión automática**: WebSocket con fallback a polling y reconexión transparente

---

## Stack tecnológico

### Frontend

| Herramienta                              | Versión   | Uso                                                  |
| ---------------------------------------- | --------- | ---------------------------------------------------- |
| [React](https://react.dev/)              | 19.1      | Biblioteca de UI, componentes funcionales con hooks  |
| [Vite](https://vite.dev/)                | 6.3       | Bundler y servidor de desarrollo con HMR             |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 / 4.1 | Framework de utilidades CSS para estilos responsivos |
| [PostCSS](https://postcss.org/)          | —         | Procesamiento CSS (autoprefixer + Tailwind)          |

### Backend (modo en red)

| Herramienta                            | Versión | Uso                                                   |
| -------------------------------------- | ------- | ----------------------------------------------------- |
| [Express](https://expressjs.com/)      | 5.2     | Servidor HTTP para Socket.IO                          |
| [Socket.IO](https://socket.io/)        | 4.8     | Comunicación bidireccional en tiempo real (WebSocket) |
| [Socket.IO Client](https://socket.io/) | 4.8     | Cliente WebSocket para el frontend                    |

### Lenguaje

- **JavaScript (ES Modules)** — tanto en frontend como en backend (`"type": "module"`)

---

## Estructura del proyecto

```
eduapp-home/
├── index.html                  # Punto de entrada HTML
├── package.json                # Dependencias y scripts
├── vite.config.js              # Configuración de Vite (proxy WebSocket)
├── tailwind.config.js          # Configuración de Tailwind CSS
├── postcss.config.js           # PostCSS plugins
├── postcss.config.cjs          # PostCSS plugins (CommonJS)
├── server.js                   # Servidor Express + Socket.IO (modo en red)
├── public/
│   ├── preguntas-prl.json      # Banco principal de 100 preguntas PRL
│   ├── preguntas-prl-100.json  # Banco ampliado (100 preguntas)
│   └── preguntas-prl-15.json   # Banco reducido (15 preguntas, demos)
└── src/
    ├── main.jsx                # Punto de entrada React
    ├── index.css               # Estilos globales (Tailwind directives)
    ├── App.jsx                 # Componente raíz (orquesta modos local y red)
    ├── hooks/
    │   └── useSocket.js        # Hook para conexión Socket.IO
    └── components/
        ├── Hero.jsx            # Sección hero con branding PRL
        ├── Features.jsx        # Tarjetas de características
        ├── CategorySelector.jsx# Selector visual de categorías por grupos
        ├── PreviewEditor.jsx   # Quiz local (individual + multijugador turnos)
        ├── Sala.jsx            # Gestión de salas en red (crear/unirse)
        ├── QuizOnline.jsx      # Quiz en red con ranking en tiempo real
        ├── RankingSummary.jsx  # Tabla de ranking para modo local
        ├── ContactForm.jsx     # Formulario de contacto
        └── Footer.jsx          # Pie de página
```

---

## Requisitos previos

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Instalación

```bash
git clone <url-del-repositorio>
cd eduapp-home
npm install
```

---

## Ejecución

### Solo modo local (sin servidor de red)

```bash
npm run dev
```

Acceder a `http://localhost:5173`. Los modos Individual y Multijugador funcionan sin servidor backend.

### Con modo en red (Socket.IO)

**Opción 1 — Comando combinado:**

```bash
npm run dev:full
```

**Opción 2 — Dos terminales separadas:**

```bash
# Terminal 1: servidor Socket.IO
npm run server

# Terminal 2: servidor Vite
npm run dev
```

- Frontend: `http://localhost:5173`
- Servidor Socket.IO: `http://localhost:3001`
- Vite redirige automáticamente las peticiones `/socket.io` al puerto 3001 mediante proxy

### Acceso en red local (aula)

Para que los alumnos accedan desde sus dispositivos:

```bash
npm run dev:full
```

Los participantes se conectan a `http://<IP-del-profesor>:5173` desde sus navegadores.

---

## Flujo de uso

### Modo Individual

```
Seleccionar modo → Introducir nombre → Elegir categorías (opcional)
→ Elegir cantidad de preguntas → Configurar temporizador (opcional)
→ Responder test → Ver resultado → Ver ranking
```

### Modo Multijugador Local

```
Seleccionar modo → Definir nº de jugadores → Jugador 1: nombre → categorías
→ cantidad → temporizador (opcional) → test → resultado
→ Jugador 2: nombre → test → ... → Ranking final
```

### Modo En Red

**Anfitrión (docente):**

```
En Red → Crear sala → Nombre + nº preguntas + categorías + temporizador (opcional)
→ Compartir código → Esperar jugadores → Iniciar test → Ver ranking en tiempo real
```

**Participantes (alumnos):**

```
En Red → Unirse a sala → Nombre + código → Esperar inicio
→ Responder test (con temporizador si el anfitrión lo configuró) → Ver ranking en tiempo real
```

---

## Banco de preguntas

El archivo principal `public/preguntas-prl.json` contiene **100 preguntas** en **32 categorías**. Además se incluyen variantes: `preguntas-prl-100.json` (banco ampliado) y `preguntas-prl-15.json` (banco reducido para demos).

### Categorías organizadas en 7 grupos

| Grupo                            | Emoji | Categorías incluidas                                                                                                     |
| -------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| Legislación y Normativa          | ⚖️    | Ley 31/1995 LPRL, Responsabilidades y Sanciones, Subcontratación                                                         |
| Organización Preventiva          | 🏛️    | Plan de Prevención, Servicios de Prevención, Comité de Seguridad, Delegados, Coordinación, Formación, Cultura Preventiva |
| Evaluación y Vigilancia          | 🔍    | Evaluación de Riesgos, Vigilancia de la Salud, Accidente de Trabajo, Enfermedades Profesionales, Riesgos Laborales       |
| Tipos de Riesgos                 | ⚠️    | Físicos, Químicos, Biológicos, Ergonómicos, Psicosociales, Eléctricos                                                    |
| Protección y Entorno             | 🛡️    | Equipos de Protección, Señalización, Lugares de Trabajo, Manipulación Manual de Cargas                                   |
| Emergencias y Primeros Auxilios  | 🚨    | Emergencias, Incendios, Primeros Auxilios                                                                                |
| Colectivos y Trabajos Especiales | 👷    | Trabajadoras Embarazadas, Trabajos Especiales, Construcción, Trabajo a Turnos                                            |

### Distribución de preguntas por categoría

| Categoría                     | Preguntas |
| ----------------------------- | --------- |
| Ley 31/1995 LPRL              | 8         |
| Evaluación de Riesgos         | 5         |
| Equipos de Protección         | 5         |
| Señalización                  | 5         |
| Primeros Auxilios             | 5         |
| Accidente de Trabajo          | 4         |
| Delegados de Prevención       | 4         |
| Incendios                     | 4         |
| Lugares de Trabajo            | 4         |
| Riesgos Ergonómicos           | 4         |
| Trabajos Especiales           | 4         |
| Comité de Seguridad           | 3         |
| Emergencias                   | 3         |
| Formación                     | 3         |
| Plan de Prevención            | 3         |
| Responsabilidades y Sanciones | 3         |
| Riesgos Físicos               | 3         |
| Riesgos Psicosociales         | 3         |
| Riesgos Químicos              | 3         |
| Servicios de Prevención       | 3         |
| Vigilancia de la Salud        | 3         |
| Construcción                  | 2         |
| Coordinación de Actividades   | 2         |
| Enfermedades Profesionales    | 2         |
| Manipulación Manual de Cargas | 2         |
| Riesgos Biológicos            | 2         |
| Riesgos Eléctricos            | 2         |
| Trabajadoras Embarazadas      | 2         |
| Cultura Preventiva            | 1         |
| Riesgos Laborales             | 1         |
| Subcontratación               | 1         |
| Trabajo a Turnos              | 1         |

### Formato de cada pregunta

```json
{
	"id": 1,
	"categoria": "Ley 31/1995 LPRL",
	"pregunta": "¿Cuál es el objetivo principal de la Ley 31/1995?",
	"opciones": [
		"Promover la seguridad y salud de los trabajadores",
		"Regular los contratos laborales",
		"Establecer el salario mínimo",
		"Definir las vacaciones anuales"
	],
	"respuesta": 0
}
```

- `respuesta`: índice (0-3) de la opción correcta
- Distribución de respuestas correctas: **25% por cada opción** (A, B, C, D)

---

## Futuras funcionalidades

### Corto plazo

- 📊 **Panel de administración** para que el docente suba, edite y elimine preguntas desde la interfaz
- 📄 **Exportación de resultados** en PDF y CSV con detalle por alumno
- 🔢 **Ampliación del banco de preguntas** a 500+

### Medio plazo

- 🔐 **Autenticación de usuarios** (docente / alumno) con roles diferenciados
- 💾 **Persistencia de datos** con base de datos (SQLite, PostgreSQL o MongoDB) para historial de sesiones y progreso
- 📈 **Estadísticas por alumno**: evolución temporal, categorías débiles, tasa de acierto
- 🏅 **Certificado generable** en PDF al superar un umbral (ej. ≥70%)

### Largo plazo

- 🐳 **Despliegue con Docker** para instalación en un solo comando
- ☁️ **Versión SaaS** con hosting incluido y modelo de suscripción
- 📱 **PWA** (Progressive Web App) para uso offline y acceso desde móvil como app nativa
- 🌍 **Soporte multiidioma** (castellano, catalán, euskera, gallego, inglés)
- 🤖 **Generación de preguntas con IA** a partir de documentos normativos

---

## Scripts disponibles

| Script     | Comando            | Descripción                                        |
| ---------- | ------------------ | -------------------------------------------------- |
| `dev`      | `npm run dev`      | Inicia servidor Vite (solo frontend)               |
| `server`   | `npm run server`   | Inicia servidor Express + Socket.IO en puerto 3001 |
| `dev:full` | `npm run dev:full` | Inicia ambos servidores simultáneamente            |

---

## Arquitectura de comunicación en red

### Eventos WebSocket

| Evento (cliente → servidor) | Datos                                             | Descripción                          |
| --------------------------- | ------------------------------------------------- | ------------------------------------ |
| `crear-sala`                | `{nombre, numPreguntas, categorias, timerConfig}` | Crea sala con código PRL-XXXX        |
| `unirse-sala`               | `{codigo, nombre}`                                | Unirse a sala existente              |
| `iniciar-test`              | —                                                 | Solo host: inicia el test para todos |
| `enviar-resultado`          | `{aciertos, total, porcentaje}`                   | Envía resultado al terminar          |

| Evento (servidor → cliente) | Datos                                             | Descripción                        |
| --------------------------- | ------------------------------------------------- | ---------------------------------- |
| `jugadores-actualizados`    | `[nombres]`                                       | Lista de jugadores en la sala      |
| `test-iniciado`             | `{preguntas, timerConfig}`                        | Preguntas barajadas para todos     |
| `eres-host`                 | —                                                 | Notifica al creador de la sala     |
| `ranking-actualizado`       | `{ranking, terminados, totalJugadores, completo}` | Ranking en vivo mientras finalizan |

---

## Licencia

ISC
