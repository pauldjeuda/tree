# ---- Étape 1 : compilation TypeScript -------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Étape 2 : image d'exécution (sans outils de développement) ----------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/app/uploads
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Dossier des photos : créé avant le volume pour que celui-ci hérite des bons droits
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Applique les migrations en attente, puis démarre l'API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
