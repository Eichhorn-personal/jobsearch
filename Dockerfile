# Stage 1: compile native deps
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev

# Stage 2: runtime only
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY server/ ./
EXPOSE 8080
CMD ["node", "server.js"]
