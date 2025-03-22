# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend/src ./src
COPY backend/templates ./templates

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy built files from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/templates ./templates

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]