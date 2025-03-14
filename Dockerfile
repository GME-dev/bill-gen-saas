# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Explicitly add multer
RUN npm install multer@1.4.5-lts.1

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production
RUN npm install multer@1.4.5-lts.1

# Copy node_modules from build stage to ensure all dependencies are included
COPY --from=build /build/node_modules /app/node_modules

# Copy the application files
COPY src ./src
COPY assets ./assets
COPY templates ./templates

# Add any optional files if they exist
COPY tsconfig.json* ./
COPY wrangler.toml* ./

# Create necessary directories
RUN mkdir -p assets/certificates assets/fonts data uploads

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev
# DATABASE_URL will be provided by Railway environment variables
ENV TEMPLATES_DIR=./templates
ENV FRONTEND_URL=https://tmr-bill-generator.pages.dev
ENV JWT_SECRET=your-production-secret

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

EXPOSE 8080

# Start command with proper signal handling
CMD ["node", "--require", "./src/preload/db-fix.cjs", "--dns-result-order=ipv4first", "src/index.js"]