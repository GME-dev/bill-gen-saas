import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const { Pool } = pg
let db = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5

export async function initializeDatabase() {
  if (db) {
    console.log('Database already initialized')
    return db
  }

  connectionAttempts++
  console.log(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)
  
  // Log database connection string (masked for security)
  const connString = process.env.DATABASE_URL || ''
  if (connString) {
    const maskedString = connString.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')
    console.log(`Using database connection: ${maskedString}`)
  } else {
    console.error('DATABASE_URL environment variable is not set!')
  }

  try {
    // Parse the connection string to force IPv4
    let connectionString = process.env.DATABASE_URL;
    
    // Extract host from connection string if it contains one
    const hostMatch = connectionString.match(/postgres:\/\/[^:]+:[^@]+@([^:]+):/);
    const host = hostMatch ? hostMatch[1] : null;
    
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      // Force IPv4 by setting these options
      host: host || 'db.onmonxsgkdaurztdhafz.supabase.co', // Extracted from connection string
      family: 4, // Force IPv4
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000 // Extended timeout for connection
    }

    db = new Pool(config)

    // Add error handler for the pool
    db.on('error', (err) => {
      console.error('Unexpected database pool error:', err)
      // If we lose connection, null out db so we can try to reconnect
      if (err.message.includes('connection terminated') || err.message.includes('connection refused')) {
        console.log('Database connection lost, will reconnect on next request')
        db = null
        connectionAttempts = 0
      }
    })

    // Test the connection
    const client = await db.connect()
    try {
      console.log('Connected to database, running test query...')
      await client.query('SELECT NOW()')
      console.log('Database connected successfully')
      
      // Reset connection attempts on success
      connectionAttempts = 0

      // Create tables if they don't exist
      console.log('Creating tables if needed...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS bills (
          id SERIAL PRIMARY KEY,
          bill_type VARCHAR(10) NOT NULL,
          customer_name VARCHAR(100) NOT NULL,
          customer_nic VARCHAR(20) NOT NULL,
          customer_address TEXT NOT NULL,
          model_name VARCHAR(100) NOT NULL,
          motor_number VARCHAR(50) NOT NULL,
          chassis_number VARCHAR(50) NOT NULL,
          bike_price DECIMAL(10,2) NOT NULL,
          down_payment DECIMAL(10,2),
          total_amount DECIMAL(10,2) NOT NULL,
          bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS bike_models (
          id SERIAL PRIMARY KEY,
          model_name VARCHAR(100) NOT NULL UNIQUE,
          price DECIMAL(10,2) NOT NULL,
          motor_number_prefix VARCHAR(20),
          chassis_number_prefix VARCHAR(20)
        )
      `)

      // Insert predefined bike models if they don't exist
      const existingModels = await client.query('SELECT COUNT(*) FROM bike_models')
      if (existingModels.rows[0].count === '0') {
        console.log('Inserting predefined bike models...')
        await client.query(`
          INSERT INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix) VALUES
          ('TMR-G18', 499500.00, 'G18', 'G18'),
          ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3'),
          ('TMR-Q1', 449500.00, 'Q1', 'Q1'),
          ('TMR-ZL', 399500.00, 'ZL', 'ZL'),
          ('TMR-ZS', 349500.00, 'ZS', 'ZS'),
          ('TMR-XGW', 299500.00, 'XGW', 'XGW'),
          ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5'),
          ('TMR-X01', 219500.00, 'X01', 'X01')
        `)
        console.log('Predefined bike models inserted')
      }
    } finally {
      client.release()
    }

    return db
  } catch (error) {
    console.error('Error initializing database:', error)
    
    // If we've tried too many times, rethrow the error
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`)
      throw new Error('Failed to initialize database: ' + error.message)
    } else {
      // Return null but don't throw, so health check can still pass
      console.log(`Will retry database connection on next request (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)
      return null
    }
  }
}

export function getDatabase() {
  if (!db) {
    // Don't throw here, so health check can still pass
    return null
  }
  return db
}

// Handle cleanup on application shutdown
process.on('SIGINT', async () => {
  if (db) {
    await db.end()
    console.log('Database pool has ended')
  }
  process.exit(0)
})

export default {
  initializeDatabase,
  getDatabase
}