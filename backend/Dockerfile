# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend/src ./src
COPY backend/.env* ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGIN=https://bill-gen-saas.pages.dev

EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"] 