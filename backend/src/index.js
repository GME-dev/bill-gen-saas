import express from 'express'
import cors from 'cors'
import { initializeDatabase, getDatabase } from './utils/database.js'
import billsRouter from './routes/bills.js'
import bikeModelsRouter from './routes/bike-models.js'

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))
app.use(express.json())

// Health check endpoint that verifies database connection
app.get('/api/health', async (req, res) => {
  try {
    const db = getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Test database connection
    await db.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/bills', billsRouter)
app.use('/api/bike-models', bikeModelsRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

let server;

async function startServer() {
  try {
    console.log('Initializing database connection...');
    await initializeDatabase();
    console.log('Database connection established');

    server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();