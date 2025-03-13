import express from 'express'
import cors from 'cors'
import { initializeDatabase } from './utils/database.js'
import billsRouter from './routes/bills.js'
import bikeModelsRouter from './routes/bike-models.js'
import healthRouter from './routes/health.js'

// CRITICAL FIX: Force IPv4 for Supabase connection
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler.supabase.com')) {
  console.log('Detected Supabase connection, converting to direct IPv4 address')
  const ipv4Address = '3.111.105.85' // IPv4 address for aws-0-ap-south-1.pooler.supabase.com
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/,
    `postgresql://$1:$2@${ipv4Address}:$4/$5`
  )
  console.log('Database URL converted to use direct IPv4 address. Hostname replaced with IP.')
}

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))
app.use(express.json())

// Routes
app.use('/api/bills', billsRouter)
app.use('/api/bike-models', bikeModelsRouter)
app.use('/api/health', healthRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

async function startServer() {
  try {
    await initializeDatabase()
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()