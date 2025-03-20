# Local Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

# Environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV CORS_ORIGIN=http://localhost:5173

EXPOSE 3000

CMD ["npm", "run", "dev"]