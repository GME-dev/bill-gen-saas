import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const { Pool } = pg
let db = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5

export async function initializeDatabase() {
  // Check if we should use mock DB
  if (process.env.USE_MOCK_DB === 'true') {
    console.log('Using mock database as USE_MOCK_DB is set to true')
    usingMockDb = true
    return mockPool
  }

  if (db) {
    console.log('Database already initialized')
    return db
  }

  connectionAttempts++
  console.log(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)

  try {
    // Extract connection details from DATABASE_URL
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Log masked connection string
    const maskedString = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')
    console.log(`Using database connection: ${maskedString}`)

    // Create the connection pool with minimal configuration
    const config = {
      connectionString,
      // For pooled connections, we just need to set ssl to true
      ssl: true,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    }

    console.log('Creating database pool...')
    db = new Pool(config)

    // Add error handler for the pool
    db.on('error', (err) => {
      console.error('Unexpected database pool error:', {
        message: err.message,
        code: err.code,
        detail: err.detail
      })
      if (err.message.includes('connection terminated') || err.message.includes('connection refused')) {
        console.log('Database connection lost, will reconnect on next request')
        db = null
        connectionAttempts = 0
      }
    })

    // Test the connection
    console.log('Testing database connection...')
    const client = await db.connect()
    
    try {
      console.log('Running test query...')
      const result = await client.query('SELECT NOW()')
      console.log('Database connection successful:', result.rows[0])
      
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
          chassis_number_prefix VARCHAR(20),
          is_ebicycle BOOLEAN DEFAULT FALSE
        )
      `)

      // Insert predefined bike models if they don't exist
      const existingModels = await client.query('SELECT COUNT(*) FROM bike_models')
      if (existingModels.rows[0].count === '0') {
        console.log('Inserting predefined bike models...')
        await client.query(`
          INSERT INTO bike_models (model_name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle) VALUES
          ('TMR-G18', 499500.00, 'G18', 'G18', FALSE),
          ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE),
          ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE),
          ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE),
          ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE),
          ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE),
          ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE),
          ('TMR-X01', 219500.00, 'X01', 'X01', TRUE)
        `)
      }
      
      // Check if the is_ebicycle column exists, if not add it
      try {
        const columnCheckResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='bike_models' AND column_name='is_ebicycle'
        `);
        
        if (columnCheckResult.rows.length === 0) {
          console.log('Adding is_ebicycle column to bike_models table...');
          await client.query(`ALTER TABLE bike_models ADD COLUMN is_ebicycle BOOLEAN DEFAULT FALSE`);
          
          // Update COLA5 and X01 to be e-bicycles
          await client.query(`
            UPDATE bike_models 
            SET is_ebicycle = TRUE 
            WHERE model_name LIKE '%COLA%' OR model_name LIKE '%X01%'
          `);
        }
      } catch (error) {
        console.error('Error checking/adding is_ebicycle column:', error);
      }
    } finally {
      client.release()
    }

    return db
  } catch (error) {
    console.error('Error initializing database:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where
    })
    
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`)
      throw error
    } else {
      console.log(`Will retry database connection on next request (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)
      return null
    }
  }
}

// Simple in-memory mock database for fallback
const mockDb = {
  bills: [],
  bike_models: [
    { id: 1, model_name: 'TMR-G18', price: 499500.00, motor_number_prefix: 'G18', chassis_number_prefix: 'G18' },
    { id: 2, model_name: 'TMR-MNK3', price: 475000.00, motor_number_prefix: 'MNK3', chassis_number_prefix: 'MNK3' },
    { id: 3, model_name: 'TMR-Q1', price: 449500.00, motor_number_prefix: 'Q1', chassis_number_prefix: 'Q1' },
    { id: 4, model_name: 'TMR-ZL', price: 399500.00, motor_number_prefix: 'ZL', chassis_number_prefix: 'ZL' },
    { id: 5, model_name: 'TMR-ZS', price: 349500.00, motor_number_prefix: 'ZS', chassis_number_prefix: 'ZS' },
    { id: 6, model_name: 'TMR-XGW', price: 299500.00, motor_number_prefix: 'XGW', chassis_number_prefix: 'XGW' },
    { id: 7, model_name: 'TMR-COLA5', price: 249500.00, motor_number_prefix: 'COLA5', chassis_number_prefix: 'COLA5' },
    { id: 8, model_name: 'TMR-X01', price: 219500.00, motor_number_prefix: 'X01', chassis_number_prefix: 'X01' }
  ]
};

// Mock database client for when real DB is unavailable
const mockClient = {
  query: async (text, params) => {
    console.log('MOCK DB QUERY:', text, params);
    
    // Handle different types of queries
    if (text.includes('SELECT 1') || text.includes('SELECT NOW()')) {
      return { rows: [{ '?column?': 1, now: new Date() }] };
    }
    
    if (text.includes('SELECT * FROM bike_models')) {
      return { rows: mockDb.bike_models };
    }
    
    if (text.includes('SELECT * FROM bills')) {
      return { rows: mockDb.bills };
    }
    
    // For inserts, just log and return success
    if (text.startsWith('INSERT INTO')) {
      console.log('MOCK INSERT:', text, params);
      return { rowCount: 1 };
    }
    
    return { rows: [] };
  },
  release: () => console.log('MOCK: Client released')
};

const mockPool = {
  connect: async () => mockClient,
  query: async (text, params) => mockClient.query(text, params),
  end: async () => console.log('MOCK: Pool ended'),
  on: () => {} // No-op for event handlers
};

// Lets us know if we're using the real DB or mock
let usingMockDb = false;

export function getDatabase() {
  if (usingMockDb) {
    console.log('Using mock database');
    return mockPool;
  }
  
  if (!db) {
    // Try mock mode if real DB is not available
    usingMockDb = true;
    console.log('Real database not initialized, falling back to mock database');
    return mockPool;
  }
  
  return db;
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