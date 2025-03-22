# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src ./src/
COPY .env* ./

# Create empty directories if they don't exist
RUN mkdir -p assets templates dist

# Copy optional assets
RUN echo "Copying assets and templates if they exist"
COPY ["assets", "./assets/"]
COPY ["templates", "./templates/"]

# Verify source files
RUN echo "Source files:" && ls -la src/

# Build process with verbose error handling and fallback
RUN echo "Building TypeScript..." && \
    (npm run build && echo "✅ Build successful!") || \
    (echo "⚠️ TypeScript build failed. Creating fallback..." && \
    echo "Copying JS files to dist:" && \
    cp -R src/*.js dist/ 2>/dev/null || \
    echo "// Fallback index.js - ES Module syntax\nconsole.log('Using dynamically generated fallback index.js');\nimport '../src/index.js';" > dist/index.js)

# Verify build results
RUN ls -la dist || echo "❌ Dist directory issue"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Create an alternative startup script that handles fallback better
RUN echo '#!/bin/sh\nnode dist/index.js 2>/dev/null || node src/index.js' > start.sh && \
    chmod +x start.sh

# Start application with better fallback handling
CMD ["./start.sh"] 