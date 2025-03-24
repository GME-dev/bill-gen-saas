FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p dist/templates data

# Build TypeScript code
RUN NODE_ENV=production npm run build && \
    cp -r src/templates/* dist/templates/ 2>/dev/null || true

# Start a new stage for production
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/templates ./dist/templates

# Create data directory for SQLite
RUN mkdir -p data

# Set default environment variables (these can be overridden by Railway)
ENV PORT=8080 \
    NODE_ENV=production \
    CORS_ORIGIN=https://bill-gen-saas.pages.dev \
    DB_PATH=./data/bills.db \
    MONGODB_DB_NAME=bill-gen \
    TEMPLATES_DIR=./templates

# Expose port
EXPOSE 8080

# Start the server with ES modules
CMD ["node", "--experimental-specifier-resolution=node", "dist/server.js"] 