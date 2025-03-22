# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install TypeScript and other dev dependencies
RUN npm install -g typescript ts-node

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY src ./src
COPY tsconfig.json ./
COPY .env* ./

# Build TypeScript code
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use built JavaScript files
CMD ["node", "dist/index.js"] 