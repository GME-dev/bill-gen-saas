# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Debug - show what files are available
RUN echo "Current directory content:" && ls -la

# Create a new package.json with ES module type (all in one line to avoid Docker parsing issues)
RUN echo '{"name":"bill-gen-backend","version":"1.0.0","type":"module","dependencies":{"express":"^4.18.3","cors":"^2.8.5","dotenv":"^16.4.5","mongodb":"^6.15.0","@pdf-lib/fontkit":"^1.1.1","morgan":"^1.10.0","multer":"^1.4.5-lts.1","pdf-lib":"^1.17.1","pizzip":"^3.1.8","docxtemplater":"^3.60.1"}}' > package.json

# Debug - show what was created
RUN echo "Created package.json:" && cat package.json

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

# Use a simple Node.js start command
CMD ["node", "src/index.js"] 