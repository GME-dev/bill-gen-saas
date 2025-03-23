# TMR Motorcycle Bill Generator

This is a SaaS application for generating motorcycle service bills for TMR Motorcycle Services.

## Features

- Generate and manage motorcycle service bills
- Track customer information
- Maintain a database of bike models
- Generate PDF invoices
- Track payment status

## Project Structure

The project consists of two main parts:

- **Frontend**: React application (NextJS)
- **Backend**: NodeJS API (Express + MongoDB)

## Development

### Prerequisites

- Node.js v18 or higher
- Docker and Docker Compose
- MongoDB (local or via Docker)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/bill-gen-saas.git
   cd bill-gen-saas
   ```

2. Install dependencies:
   ```
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `backend` directory based on `.env.example`
   - Create a `.env.local` file in the `frontend` directory based on `.env.example`

4. Start the development servers:

   For the backend:
   ```
   cd backend
   docker-compose up -d  # Starts MongoDB
   npm run dev
   ```

   For the frontend:
   ```
   cd frontend
   npm run dev
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## Docker Setup

To run the entire application using Docker:

1. Make sure Docker and Docker Compose are installed and running
2. Run:
   ```
   docker-compose up -d
   ```
3. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## Deployment

The application can be deployed using Docker and the provided GitHub Actions workflows.

### Prerequisites for deployment:

1. Set up the following GitHub secrets:
   - `DOCKER_TOKEN`: Docker Hub access token
   - `SSH_PRIVATE_KEY`: Private key for SSH deployment

2. Set up the following GitHub variables:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DEPLOY_HOST`: The deployment server hostname
   - `DEPLOY_USER`: The deployment server username

The application will be automatically deployed when changes are pushed to the main branch.

## GitHub Workflow

This project uses GitHub Actions for CI/CD. The workflow includes:

1. **Testing**: Runs tests and linting for both frontend and backend
2. **Building**: Builds Docker images for both frontend and backend
3. **Deployment**: Deploys the application to the production server

The workflow is defined in `.github/workflows/ci-cd.yml`.

### Setting up GitHub Actions

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add the required secrets and variables as listed in the Deployment prerequisites

### Manual Deployment

If you need to deploy manually:

1. Build the Docker images:
   ```
   cd backend
   docker build -t yourusername/bill-gen-saas-backend:latest .
   
   cd ../frontend
   docker build -t yourusername/bill-gen-saas-frontend:latest .
   ```

2. Push the images to Docker Hub:
   ```
   docker push yourusername/bill-gen-saas-backend:latest
   docker push yourusername/bill-gen-saas-frontend:latest
   ```

3. SSH into your server and update the containers:
   ```
   cd /opt/bill-gen-saas
   docker compose pull
   docker compose up -d
   ```

## API Documentation

API endpoints are available at `/api` with the following routes:

- `/api/health`: Health check endpoints
- `/api/bills`: Bill management endpoints
- `/api/bike-models`: Bike model management endpoints

## License

This project is licensed under the MIT License. 