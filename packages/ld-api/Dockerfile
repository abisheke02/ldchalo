FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 3000

# Use node directly — no nodemon, no dev overhead
CMD ["node", "src/index.js"]
