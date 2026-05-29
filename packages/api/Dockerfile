FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy source and migrations
COPY src/ ./src/
COPY migrations/ ./migrations/

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ping || exit 1

CMD ["node", "src/index.js"]
