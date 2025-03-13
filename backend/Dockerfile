FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start command with absolute path
CMD ["node", "/app/src/index.js"] 