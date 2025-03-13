FROM node:18-alpine

# Install basic Alpine tools
RUN apk add --no-cache bash

WORKDIR /app/backend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"] 