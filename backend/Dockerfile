FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Create empty directories that might be referenced
RUN mkdir -p assets templates dist

# Copy assets and templates if they exist (fixed syntax)
COPY ["assets/", "./assets/"] 2>/dev/null || true
COPY ["templates/", "./templates/"] 2>/dev/null || true

# Build TypeScript code with full output
RUN echo "Building TypeScript..." && \
    npx tsc --project tsconfig.json && \
    echo "TypeScript build complete"

# Copy any static files needed at runtime
RUN if [ -d "src/assets" ]; then cp -r src/assets dist/; fi
RUN if [ -d "src/templates" ]; then cp -r src/templates dist/; fi

# Create a clean production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/assets/ ./assets/
COPY --from=builder /app/templates/ ./templates/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/index.js"] 