import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectToDatabase, closeDatabaseConnection } from './database/index.js';
import bikeModelsRouter from './routes/bike-models.js';
import billsRouter from './routes/bills.js';
import healthRouter from './routes/health.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Connect to database
connectToDatabase()
  .then(() => {
    console.log('Successfully connected to MongoDB database');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    // Continue anyway - health check will report DB issues
  });

// Register routes
app.use('/api/bike-models', bikeModelsRouter);
app.use('/api/bills', billsRouter);
app.use('/health', healthRouter);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'TMR Bill Generator API',
    version: '1.0.0',
    endpoints: [
      { path: '/health', method: 'GET', description: 'Service health information' },
      { path: '/api/bike-models', method: 'GET', description: 'Get all bike models' },
      { path: '/api/bills', method: 'GET', description: 'Get all bills' }
    ]
  });
});

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('HTTP server closed');
    await closeDatabaseConnection();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('HTTP server closed');
    await closeDatabaseConnection();
    process.exit(0);
  });
});

export default app; 