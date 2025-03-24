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
RUN NODE_ENV=production npm run build && \
    cp -r src/templates/* dist/templates/ 2>/dev/null || true

# Start a new stage for production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files and templates from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/templates ./dist/templates

# Create default environment file
RUN echo "PORT=8080\n\
NODE_ENV=production\n\
MONGODB_URI=${MONGODB_URI}\n\
CORS_ORIGIN=https://bill-gen-saas.pages.dev" > .env

# Expose port
EXPOSE 8080

# Start the server with ES modules
CMD ["node", "--experimental-specifier-resolution=node", "dist/server.js"] 