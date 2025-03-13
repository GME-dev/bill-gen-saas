FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the backend application files
COPY backend/src ./src
COPY backend/assets ./assets
COPY backend/templates ./templates
COPY backend/tsconfig.json ./
COPY backend/wrangler.toml ./

# Create necessary directories
RUN mkdir -p assets/certificates assets/fonts data uploads

# Environment variables (these will be overridden by Railway environment variables)
ENV PORT=3000
ENV NODE_ENV=production
ENV CORS_ORIGIN=https://tmr-bill-generator.pages.dev
ENV DATABASE_URL=postgres://postgres:p*BQQ44ue-PfE2R@db.onmonxsgkdaurztdhafz.supabase.co:5432/postgres
ENV SUPABASE_SSL_ENABLED=true
ENV TEMPLATES_DIR=./templates
ENV FRONTEND_URL=https://tmr-bill-generator.pages.dev
ENV JWT_SECRET=your-production-secret

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Start command with proper signal handling
CMD ["node", "src/index.js"]