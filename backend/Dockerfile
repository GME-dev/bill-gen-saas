FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the application files
COPY src ./src
COPY assets ./assets

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Create necessary directories
RUN mkdir -p assets/certificates assets/fonts

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Start command with proper signal handling
CMD ["node", "src/index.js"] 