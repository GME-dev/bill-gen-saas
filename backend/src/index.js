import app from './app.js'
import { initializeDatabase } from './utils/database.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const port = process.env.PORT || 3000
let server

async function startServer() {
  try {
    console.log('Initializing database connection...')
    await initializeDatabase()
    console.log('Database connection established')

    server = app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...')
      server.close(() => {
        console.log('Server closed')
        process.exit(0)
      })
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()