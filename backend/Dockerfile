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

EXPOSE 3000

# Start command
CMD ["node", "src/index.js"] 