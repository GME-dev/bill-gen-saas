# Build stage for frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

# Add antd and other required dependencies
RUN npm install antd @ant-design/icons react-router-dom @supabase/supabase-js

COPY frontend/ ./
RUN npm run build

# Build stage for the final image
FROM node:18-alpine

WORKDIR /app

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Copy backend files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

COPY backend/ ./

# Copy database migrations
COPY supabase_migration.sql ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]