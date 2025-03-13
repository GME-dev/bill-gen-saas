FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Explicitly install multer package in addition to package.json dependencies
RUN npm install --production
RUN npm install multer@1.4.5-lts.1

# Copy the application files
COPY src ./src
COPY assets ./assets
COPY templates ./templates

# Add any optional files if they exist
COPY tsconfig.json* ./
COPY wrangler.toml* ./

# Create necessary directories
RUN mkdir -p assets/certificates assets/fonts data uploads

# Environment variables
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