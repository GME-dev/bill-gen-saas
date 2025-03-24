FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/server.js"] 