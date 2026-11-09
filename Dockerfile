# API de salas de PRL Master. El servidor solo usa módulos integrados de Node 22: no tiene
# dependencias de ejecución, así que no hay node_modules que instalar ni copiar.
# Si en el futuro se añade una dependencia al servidor, instálala en una etapa de
# construcción con `npm ci --omit=dev` y copia /app/node_modules a esta imagen.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788 PRL_DATA_DIR=/app/data
WORKDIR /app
RUN mkdir -p /app/data && chown node:node /app/data
# package.json solo se necesita por "type": "module".
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src/server ./src/server
COPY --chown=node:node src/utils/quiz.js ./src/utils/quiz.js
COPY --chown=node:node public/preguntas-prl.json ./public/preguntas-prl.json
COPY --chown=node:node public/preguntas-sst-colombia.json ./public/preguntas-sst-colombia.json
USER node
EXPOSE 8788
VOLUME ["/app/data"]
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8788/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
