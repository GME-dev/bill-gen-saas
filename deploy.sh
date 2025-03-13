#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Build the application
echo "Building the application..."
docker-compose build

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Start the application
echo "Starting the application..."
docker-compose up -d

# Wait for the application to be healthy
echo "Waiting for the application to be healthy..."
sleep 10

# Check if the application is running
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "Application is running successfully!"
else
  echo "Application failed to start. Check the logs for details."
  docker-compose logs
  exit 1
fi 