# Bill Generation SaaS with Digital Signatures

A modern web application for generating and digitally signing PDF bills with support for custom fonts and certificates.

## Features

- PDF bill generation with custom templates
- Digital signature support with certificate management
- Font subsetting for optimized PDFs
- Certificate revocation checking
- Timestamping service integration
- Modern React frontend
- Secure backend API
- Docker containerization
- CI/CD pipeline with GitHub Actions

## Prerequisites

- Node.js 18 or later
- Docker and Docker Compose
- Git
- A timestamping service account (e.g., DigiCert)
- SSL certificates for production

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bill-gen-saas.git
cd bill-gen-saas
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. Create environment files:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

4. Update the environment variables in the `.env` files with your configuration.

## Development

1. Start the development servers:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

2. Access the application at `http://localhost:3000`

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && npm test
```

## Building for Production

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Build the backend:
```bash
cd backend
npm run build
```

## Deployment

### Using Docker (Recommended)

1. Build and start the containers:
```bash
docker-compose up -d
```

2. Access the application at `http://localhost:3000`

### Manual Deployment

1. Set up a production server with Node.js 18 or later
2. Clone the repository
3. Install dependencies
4. Set up environment variables
5. Build the application
6. Start the server:
```bash
cd backend
npm start
```

## CI/CD Pipeline

The project includes a GitHub Actions workflow that:
1. Runs tests on every push and pull request
2. Builds and pushes Docker images on main branch
3. Deploys to production automatically

### Required Secrets

Set up the following secrets in your GitHub repository:
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token
- `PROD_HOST`: Production server hostname
- `PROD_USERNAME`: Production server username
- `PROD_SSH_KEY`: SSH private key for production server access

## Security Considerations

1. Always use HTTPS in production
2. Keep certificates and private keys secure
3. Regularly update dependencies
4. Monitor certificate expiration
5. Implement rate limiting
6. Use secure headers
7. Validate all user inputs

## Monitoring and Maintenance

1. Monitor application logs:
```bash
docker-compose logs -f
```

2. Check certificate status:
```bash
curl http://localhost:3000/api/certificates/status
```

3. Monitor font cache:
```bash
curl http://localhost:3000/api/fonts/stats
```

## Troubleshooting

1. Check logs for errors:
```bash
docker-compose logs
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Restart services:
```bash
docker-compose restart
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 