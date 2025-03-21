# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files - adapt to work whether in root or backend dir
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code - adapt to work whether in root or backend dir
COPY src ./src
COPY .env* ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CORS_ORIGIN=https://bill-gen-saas.pages.dev

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["npm", "start"] 