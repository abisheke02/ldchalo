# Build single unified web app
FROM node:20-alpine AS build-web
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY web/ ./
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build-web /app/dist /usr/share/nginx/html
EXPOSE 80 443
