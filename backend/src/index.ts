import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './utils/database.js';
import billsRouter from './routes/bills.js';
import bikeModelsRouter from './routes/bike-models.js';
import healthRouter from './routes/health.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Initialize database connection
initializeDatabase()
  .then(() => {
    console.log('Database connection initialized');
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Routes
app.use('/api/bills', billsRouter);
app.use('/api/bike-models', bikeModelsRouter);
app.use('/health', healthRouter);

// Add direct PDF routes
app.get('/api/bills/:id/pdf', (req, res) => {
  billsRouter.handle(req, res);
});

app.get('/api/bills/preview/pdf', (req, res) => {
  billsRouter.handle(req, res);
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 