// Apply IPv4 fixes directly in the main application file
try {
  // Try to force IPv4 at the application level
  const dnsModule = await import('dns');
  if (typeof dnsModule.setDefaultResultOrder === 'function') {
    dnsModule.setDefaultResultOrder('ipv4first');
    console.log('Forced IPv4 DNS resolution in index.js');
  }
} catch (err) {
  console.error('Failed to force IPv4 in index.js:', err);
}

import app from './app.js'
import { initializeDatabase } from './utils/database.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const port = process.env.PORT || 3000
let server
let dbInitialized = false

console.log('Starting server with environment:', process.env.NODE_ENV);
console.log('CORS origin:', process.env.CORS_ORIGIN);
console.log('Port:', port);

async function startServer() {
  // Always start the server first, so health checks can pass
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

  // Try to initialize database but don't let it crash the startup
  try {
    console.log('Initializing database connection...')
    await initializeDatabase()
    console.log('Database connection established')
    dbInitialized = true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    console.log('Server will continue running - health checks may temporarily fail')
    
    // Retry database connection every 10 seconds
    const retryInterval = setInterval(async () => {
      try {
        console.log('Retrying database connection...')
        await initializeDatabase()
        console.log('Database connection established after retry')
        dbInitialized = true
        clearInterval(retryInterval)
      } catch (error) {
        console.error('Database connection retry failed:', error)
      }
    }, 10000)
  }
}

startServer()