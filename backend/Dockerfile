FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the backend application
COPY backend/src ./src
COPY backend/assets ./assets

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start command with absolute path
CMD ["node", "/app/src/index.js"] 