FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Log the directory contents
RUN ls -la

# Install TypeScript globally
RUN npm install -g typescript

# Next, build the application
RUN mkdir -p dist
RUN npx tsc
RUN mkdir -p dist/templates
RUN if [ -d "src/templates" ]; then cp -r src/templates/* dist/templates/ 2>/dev/null || true; fi
RUN ls -la dist

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Log the directory structure
RUN ls -la
RUN ls -la dist || echo "dist directory not found"

# Expose the port the app will run on
EXPOSE 8080

# Start the application
CMD ["node", "-r", "dotenv/config", "dist/server.js"] 