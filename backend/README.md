# TMR Motorcycle Bill Generator API

Backend API for the TMR Motorcycle Bill Generator application.

## Features

- Create, read, update, and delete motorcycle service bills
- Generate PDF invoices
- Mark bills as paid with different payment methods
- MongoDB database for data storage
- Containerized with Docker for easy development and deployment

## Technology Stack

- Node.js with Express
- TypeScript for type safety
- MongoDB for database
- Docker for containerization
- Railway for deployment

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Local Development

1. Clone the repository

```bash
git clone <repository-url>
cd backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration.

4. Start the application with Docker Compose

```bash
docker-compose up
```

This will start both the API and MongoDB services.

5. For development without Docker

```bash
npm run dev
```

Note: You'll need MongoDB running locally or update the connection string in `.env`.

## API Endpoints

| Method | Endpoint           | Description                        |
|--------|--------------------|------------------------------------|
| GET    | /api/health        | Health check                       |
| GET    | /api/bills         | Get all bills                      |
| GET    | /api/bills/:id     | Get bill by ID                     |
| POST   | /api/bills         | Create a new bill                  |
| PUT    | /api/bills/:id     | Update a bill                      |
| DELETE | /api/bills/:id     | Delete a bill                      |
| GET    | /api/bills/:id/pdf | Generate PDF for a bill            |
| PATCH  | /api/bills/:id/pay | Mark a bill as paid                |

## Deployment

This project is configured for deployment on Railway:

1. Create a new project in Railway
2. Connect your GitHub repository
3. Add environment variables from `.env.production`
4. Railway will automatically build and deploy the application

## License

ISC 