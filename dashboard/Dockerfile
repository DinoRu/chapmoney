# Étape de construction
FROM node:24-slim AS build


WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV NODE_OPTIONS="--max_old_space_size=2048"

RUN npm run build


# Étape de production
FROM nginx:latest

COPY --from=build /app/build /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]