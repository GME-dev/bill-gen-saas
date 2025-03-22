# Create necessary directories
New-Item -ItemType Directory -Force -Path "backend/src/routes"
New-Item -ItemType Directory -Force -Path "backend/src/utils"
New-Item -ItemType Directory -Force -Path "backend/src/controllers"
New-Item -ItemType Directory -Force -Path "backend/src/config"
New-Item -ItemType Directory -Force -Path "backend/src/models"
New-Item -ItemType Directory -Force -Path "backend/src/middleware"
New-Item -ItemType Directory -Force -Path "backend/templates"
New-Item -ItemType Directory -Force -Path "backend/tests"

# Move backend files
Move-Item -Path "src/routes/*" -Destination "backend/src/routes/" -Force
Move-Item -Path "src/utils/*" -Destination "backend/src/utils/" -Force
Move-Item -Path "src/controllers/*" -Destination "backend/src/controllers/" -Force
Move-Item -Path "src/config/*" -Destination "backend/src/config/" -Force
Move-Item -Path "src/models/*" -Destination "backend/src/models/" -Force
Move-Item -Path "src/middleware/*" -Destination "backend/src/middleware/" -Force
Move-Item -Path "src/app.js" -Destination "backend/src/" -Force
Move-Item -Path "src/index.js" -Destination "backend/src/" -Force

# Move frontend files
Move-Item -Path "frontend/src/components/*" -Destination "frontend/src/components/" -Force
Move-Item -Path "frontend/src/pages/*" -Destination "frontend/src/pages/" -Force
Move-Item -Path "frontend/src/utils/*" -Destination "frontend/src/utils/" -Force
Move-Item -Path "frontend/src/config/*" -Destination "frontend/src/config/" -Force
Move-Item -Path "frontend/src/assets/*" -Destination "frontend/src/assets/" -Force

# Clean up old directories
Remove-Item -Path "src" -Recurse -Force

Write-Host "Project structure has been reorganized successfully!" 