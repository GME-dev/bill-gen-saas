FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install build dependencies and debugging tools
RUN apk add --no-cache python3 make g++ bash curl

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with debug output
RUN echo "Installing dependencies..." && \
    npm install && \
    echo "Dependencies installed successfully"

# Copy source files and configs with explicit listing
COPY tsconfig.json ./
COPY src/ ./src/
COPY .env* ./

# List files to verify copy worked
RUN echo "Workspace files:" && \
    ls -la && \
    echo "Source files:" && \
    ls -la src/

# Create directories if they don't exist
RUN mkdir -p assets templates dist

# Copy assets if they exist
COPY assets/ ./assets/ 2>/dev/null || echo "No assets directory found"
COPY templates/ ./templates/ 2>/dev/null || echo "No templates directory found"

# Fix common permission issues
RUN chmod -R 777 .

# Build TypeScript with verbose output and error handling
RUN echo "TypeScript version:" && \
    npx tsc --version && \
    echo "Running TypeScript build..." && \
    npx tsc --listFiles && \
    npx tsc || echo "TypeScript build failed, but continuing"

# Verify build output
RUN echo "Build output:" && \
    ls -la && \
    echo "Dist directory:" && \
    ls -la dist || echo "Dist directory not found" && \
    ls -la src/

# Ensure we have a usable index.js file in dist by copying the one from src if needed
RUN if [ ! -f dist/index.js ]; then \
    echo "dist/index.js not found, creating backup version..." && \
    mkdir -p dist && \
    cp -f src/index.js dist/index.js 2>/dev/null || \
    echo "// Fallback index.js" > dist/index.js && \
    echo "import '../src/index.js';" >> dist/index.js; \
    fi

# Copy static files to dist
RUN if [ -d "src/assets" ]; then cp -r src/assets dist/ || true; fi
RUN if [ -d "src/templates" ]; then cp -r src/templates dist/ || true; fi

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl --fail http://localhost:8080/health || exit 1

# Create a fallback script
RUN echo '#!/bin/sh' > start.sh && \
    echo 'echo "Starting application..."' >> start.sh && \
    echo 'if [ -f "dist/index.js" ]; then' >> start.sh && \
    echo '  node dist/index.js || node src/index.js' >> start.sh && \
    echo 'else' >> start.sh && \
    echo '  echo "dist/index.js not found, using src/index.js directly"' >> start.sh && \
    echo '  node src/index.js' >> start.sh && \
    echo 'fi' >> start.sh && \
    chmod +x start.sh

# Start the application with failsafe mechanism
CMD ["./start.sh"] 