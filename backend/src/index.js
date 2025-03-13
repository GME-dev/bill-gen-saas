import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { initializeDatabase } from './utils/database.js'
import billsRouter from './routes/bills.js'
import bikeModelsRouter from './routes/bike-models.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/bills', billsRouter)
app.use('/api/bike-models', bikeModelsRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...')
    await initializeDatabase()
    console.log('Database initialized successfully')
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()