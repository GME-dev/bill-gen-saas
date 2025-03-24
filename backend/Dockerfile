FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy source code and templates
COPY . .

# Create templates directory if it doesn't exist
RUN mkdir -p dist/templates

# Build TypeScript code and copy templates
RUN npm run build && \
    cp -r src/templates/* dist/templates/ 2>/dev/null || true

# Start a new stage for production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files and templates from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/templates ./dist/templates

# Copy environment file if it exists
COPY .env.production .env

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/server.js"] 