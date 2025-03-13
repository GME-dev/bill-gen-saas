import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const { Pool } = pg
let db = null

export async function initializeDatabase() {
  if (db) {
    console.log('Database already initialized')
    return db
  }

  console.log('Initializing database...')

  try {
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 5000 // How long to wait for a connection
    }

    db = new Pool(config)

    // Test the connection
    const client = await db.connect()
    try {
      await client.query('SELECT NOW()')
      console.log('Database connected successfully')

      // Create tables if they don't exist
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
    throw new Error('Failed to initialize database: ' + error.message)
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
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