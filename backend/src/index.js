import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import billRoutes from './routes/bills.js'
import { initializeDatabase } from './utils/database.js'
import rateLimit from 'express-rate-limit'
import certificatesRouter from './routes/certificates.js'
import pdfGeneratorRouter from './routes/pdfGenerator.js'
import fontManagerRouter from './routes/fontManager.js'
import healthRouter from './routes/health.js'
import bikeModelsRouter from './routes/bike-models.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Routes
app.use('/api/bills', billRoutes)
app.use('/api/certificates', certificatesRouter)
app.use('/api/pdf', pdfGeneratorRouter)
app.use('/api/fonts', fontManagerRouter)
app.use('/api/health', healthRouter)
app.use('/api/bike-models', bikeModelsRouter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
}) 