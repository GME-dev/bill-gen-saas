#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

echo "Installing dependencies..."
npm install

echo "Creating dist directory if it doesn't exist..."
mkdir -p dist

echo "Compiling TypeScript..."
npx tsc

echo "Listing dist directory after compilation:"
ls -la dist

echo "Creating templates directory..."
mkdir -p dist/templates

echo "Copying templates if they exist..."
if [ -d "src/templates" ]; then
  cp -r src/templates/* dist/templates/ 2>/dev/null || true
  echo "Templates copied"
else
  echo "No templates directory found to copy"
fi

echo "Final dist directory structure:"
ls -la dist

echo "Build completed" 