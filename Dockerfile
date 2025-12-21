# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN corepack enable && pnpm install --frozen-lockfile

# Force rebuild of better-sqlite3 for Alpine Linux
RUN npm rebuild better-sqlite3 --build-from-source

# Copy application code
COPY . .

# Build frontend
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (needed for better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN corepack enable && pnpm install --prod --frozen-lockfile

# Force rebuild of better-sqlite3 for Alpine Linux
RUN npm rebuild better-sqlite3 --build-from-source

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server.js ./

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]