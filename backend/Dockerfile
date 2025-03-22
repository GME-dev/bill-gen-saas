# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install necessary utilities
RUN apk add --no-cache bash

# Install TypeScript and other dev dependencies
RUN npm install -g typescript ts-node

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create necessary directories
RUN mkdir -p assets templates

# Copy source code and config files first for better debugging
COPY src/ ./src/
COPY tsconfig.json ./
COPY .env* ./

# Debug: Show TypeScript version and config
RUN echo "TypeScript version:" && tsc --version && echo "TSConfig:" && cat tsconfig.json

# Debug: Show source files
RUN echo "Source files:" && ls -la src/

# Manually run TypeScript compiler with full output
RUN echo "Running TypeScript compiler..." && \
    tsc --listFiles && \
    tsc --diagnostics || echo "TypeScript compilation had issues, but continuing..."

# Copy assets and templates
COPY assets/ ./assets/ || true
COPY templates/ ./templates/ || true

# More verbose build process with debugging
RUN echo "Running npm build script..." && \
    npm run build || echo "Build script had issues, continuing with fallback"

# Debug: Check if dist directory and compiled files exist
RUN ls -la && \
    if [ -d "dist" ]; then \
        echo "Dist directory exists:" && ls -la dist/; \
    else \
        echo "Dist directory DOES NOT EXIST - creating it" && \
        mkdir -p dist && \
        echo "Copying JS files to dist as fallback" && \
        cp -R src/*.js dist/ || true; \
    fi

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev

EXPOSE 8080

# Add health check for route that doesn't require database
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use built JavaScript files, with fallback
CMD ["bash", "-c", "node dist/index.js || node src/index.js"] 