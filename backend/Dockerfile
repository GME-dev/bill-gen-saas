# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Debug - show what files are available
RUN echo "Current directory content:" && ls -la

# Copy package files - use specific paths to ensure we get the right package.json
COPY package.json ./
COPY package-lock.json ./

# Debug - show what was copied
RUN echo "After copy package.json:" && ls -la

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY .env* ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://bill-gen-saas.pages.dev

EXPOSE 8080

# Show what scripts are available
RUN echo "Available NPM scripts:" && npm run

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use a specific start command for our app
CMD ["node", "src/index.js"] 