FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Debug: Check package.json contents
RUN cat package.json && \
    echo "\nDirectory contents:" && \
    ls -la

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY . .

# Debug: List directory contents after copy
RUN echo "\nDirectory contents after full copy:" && \
    ls -la && \
    echo "\npackage.json contents:" && \
    cat package.json

# Create necessary directories
RUN mkdir -p dist/templates data

# Debug: Check TypeScript installation
RUN echo "\nTypeScript version:" && \
    ./node_modules/.bin/tsc --version

# Build TypeScript code and copy templates
RUN npm run build

# Start a new stage for production
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory
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