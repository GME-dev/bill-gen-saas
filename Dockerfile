# Build stage for frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build stage for backend
FROM node:18-alpine as backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy backend files
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=backend-build /app/backend/assets ./backend/assets

# Copy frontend files
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Install production dependencies
WORKDIR /app/backend
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_URL=http://localhost:3000
ENV CERTIFICATES_DIR=/app/backend/assets/certificates
ENV FONTS_DIR=/app/backend/assets/fonts

# Create necessary directories
RUN mkdir -p /app/backend/assets/certificates /app/backend/assets/fonts

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"] 