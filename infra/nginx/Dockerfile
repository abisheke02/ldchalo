FROM node:20-alpine AS build-ld-web
WORKDIR /app
COPY apps/ld-exam-web/package.json apps/ld-exam-web/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY apps/ld-exam-web/ ./
RUN npm run build

FROM node:20-alpine AS build-erp-web
WORKDIR /app
COPY apps/school-erp-web/package.json ./
RUN npm install --omit=dev
COPY apps/school-erp-web/ ./
RUN npm run build 2>/dev/null || mkdir -p dist

FROM nginx:1.25-alpine
# LD exam portal (default)
COPY --from=build-ld-web  /app/dist /usr/share/nginx/html
# School ERP portal (/erp/)
COPY --from=build-erp-web /app/dist /usr/share/nginx/erp
# Nginx config is bind-mounted at runtime via docker-compose volumes
EXPOSE 80 443
