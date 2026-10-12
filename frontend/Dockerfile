# ---- Étape 1 : build du site ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# /api/v1 = même domaine (nginx ci-dessous relaie vers le backend).
# Pour une API sur un autre domaine : --build-arg VITE_API_URL=https://api.exemple.com/api/v1
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Étape 2 : nginx sert le site et relaie /api vers le backend ----------------------------
FROM nginx:1.27-alpine
ENV BACKEND_URL=http://backend:4000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
