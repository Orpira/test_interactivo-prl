# Despliegue de PRL Master

La web estática se publica en Vercel (`https://prl.orpira.es`) y la API de salas corre en un
contenedor Docker en el mismo VPS que el dominó, detrás de Nginx Proxy Manager, en
`https://api-prl.orpira.es`. Esta guía no contiene IPs ni secretos.

## Arquitectura

- **Web:** React + Vite en Vercel. El cliente llama a la API con `VITE_API_URL`.
- **API:** Node 22 con `node:http`, sin dependencias de ejecución. Un solo contenedor
  `orpira-prl-api` en la red Docker externa `orpira-network`, **sin publicar puertos**.
- **Sin WebSockets:** el cliente consulta la sala cada segundo (cada 5 s con la pestaña
  oculta). Nginx Proxy Manager no necesita «Websockets Support».
- **Estado en disco:** `salas.json` en el volumen `orpira_prl_data` (`/app/data`). Las salas
  y las sesiones de los alumnos sobreviven a reinicios y despliegues.
- **Una sola réplica:** los límites de peticiones y las salas viven en un único proceso.

## Variables de entorno de la API

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `PRL_ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes que pueden llamar a la API, separados por comas y exactos. **Obligatoria en compose.** |
| `PRL_TRUST_PROXY` | `true` en compose | Toma la IP real del último salto de `X-Forwarded-For`. Solo con Nginx Proxy Manager delante. |
| `PORT` | `8788` | Puerto interno. |
| `HOST` | `0.0.0.0` | Dirección de escucha. |
| `PRL_DATA_DIR` | `./.data` (`/app/data` en Docker) | Directorio de `salas.json`. |
| `PRL_IMAGE_TAG` | `1.0.0` | Etiqueta de la imagen en compose. |

## Límites de peticiones

Cada ventana es fija de un minuto salvo indicación. Una clase entera sale por la misma IP del
centro, por eso el límite principal es **por sesión** y no por IP.

| Límite | Máximo | Ventana |
| --- | --- | --- |
| Por sesión (cada alumno) | 240 | 1 minuto |
| Crear sala, por IP | 30 | 1 hora |
| Unirse, por IP | 120 | 1 minuto |
| Global, por IP (protección) | 6000 | 1 minuto |

30 alumnos consultando cada segundo son unas 1.800 peticiones por minuto desde una IP.
Tamaño máximo del cuerpo: 16 KB. Al superar un límite, la API responde `429` con `retry-after`.

## Pasos manuales

### 1. DNS

Crea un registro `A` llamado `api-prl` que apunte a **la misma IP que `api-domino`**.
TTL 300 al principio. Mantén el proxy/CDN desactivado durante la primera validación y no
pidas el certificado hasta que todos los resolutores devuelvan la IP correcta.

### 2. VPS

Antes de copiar nada, inspecciona sin cambiar:

```bash
docker network inspect orpira-network
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

Copia el proyecto a `/opt/prl-master-v1` y crea el `.env` solo en el VPS:

```bash
cd /opt/prl-master-v1
cp .env.example .env
chmod 600 .env
# Deja PRL_ALLOWED_ORIGINS=https://prl.orpira.es y PRL_TRUST_PROXY=true
sudo docker compose config
sudo docker compose up -d --build
sudo docker compose ps
sudo docker inspect --format '{{json .State.Health}}' orpira-prl-api
```

No uses `docker compose down` sobre otros proyectos y no publiques el puerto `8788`.

### 3. Nginx Proxy Manager

Crea un **Proxy Host**:

```text
Domain Names: api-prl.orpira.es
Scheme: http
Forward Hostname / IP: orpira-prl-api
Forward Port: 8788
Cache Assets: off
Block Common Exploits: on
Websockets Support: off
```

En SSL: certificado nuevo de Let's Encrypt, **Force SSL** y **HTTP/2** activados.

### 4. Comprobar

```bash
curl --fail --silent --show-error https://api-prl.orpira.es/health
# {"ok":true}

# Un origen permitido recibe 204 con las cabeceras CORS:
curl -i -X OPTIONS https://api-prl.orpira.es/api/salas \
  -H 'Origin: https://prl.orpira.es' -H 'Access-Control-Request-Method: POST'

# Cualquier otro origen recibe 403:
curl -i https://api-prl.orpira.es/health -H 'Origin: https://sitio-ajeno.example'
```

### 5. Vercel

En el proyecto de `prl.orpira.es` añade la variable `VITE_API_URL=https://api-prl.orpira.es`
(sin barra final) y vuelve a desplegar. Hasta entonces el botón «En Red» muestra
«No disponible ahora».

## Copias de seguridad

Antes de cada actualización guarda el volumen:

```bash
sudo install -d -m 700 /opt/backups/orpira-prl
docker run --rm -v orpira_prl_data:/datos:ro -v /opt/backups/orpira-prl:/copia alpine \
  tar czf /copia/orpira_prl_data-$(date +%Y%m%d-%H%M%S).tar.gz -C /datos .
```

`salas.json` contiene los `sessionId` de los alumnos y las respuestas correctas: se escribe
con modo `0600`; trata la copia como un dato sensible.

## Actualizar y volver atrás

```bash
cd /opt/prl-master-v1
# 1. Copia de seguridad (arriba). 2. Actualiza el código. 3.
sudo docker compose up -d --build
sudo docker compose ps
```

Al recrear el contenedor, la API recibe `SIGTERM`, guarda las salas en curso y las restaura
al arrancar: los alumnos siguen en su pregunta. Para volver atrás, restaura el código
anterior y repite `up -d --build`; si hace falta, extrae la copia del volumen.

## Problemas frecuentes

- **El contenedor no arranca:** falta `PRL_ALLOWED_ORIGINS` en `.env`; compose lo exige.
- **403 en el navegador:** el origen exacto (esquema y dominio, sin barra final) no está en
  `PRL_ALLOWED_ORIGINS`.
- **429 en toda la clase:** `PRL_TRUST_PROXY` no está en `true` y todas las peticiones parecen
  venir de la IP de Nginx Proxy Manager.
- **`salas.json` ilegible:** al arrancar se aparta como `salas.json.corrupto-<hora>` y la API
  empieza vacía; revísalo antes de borrarlo.
