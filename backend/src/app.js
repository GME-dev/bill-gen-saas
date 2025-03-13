import express from 'express'
import cors from 'cors'
import billsRouter from './routes/bills.js'
import brandingRouter from './routes/branding.js'
import bikeModelsRouter from './routes/bike-models.js'
import healthRouter from './routes/health.js'
import { getDatabase } from './utils/database.js'

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))
app.use(express.json())

// Health check endpoint
app.use('/api/health', healthRouter)

// Routes
app.use('/api/bills', billsRouter)
app.use('/api/branding', brandingRouter)
app.use('/api/bike-models', bikeModelsRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

export default app 