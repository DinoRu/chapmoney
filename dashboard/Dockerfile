# Étape 1 : Build frontend (React, Vue, etc.)
FROM node:24-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Serveur de fichiers statiques via nginx
FROM nginx:alpine

# Copier le build dans nginx
COPY --from=build /app/build /usr/share/nginx/html

# ❌ Pas de nginx.conf custom ici
# ✅ nginx-proxy gère SSL et proxy

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
