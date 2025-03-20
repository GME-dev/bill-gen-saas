# Railway Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy only backend files
COPY package*.json ./
RUN npm install

COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGIN=https://bill-gen-saas.pages.dev

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"] 