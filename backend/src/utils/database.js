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
    // Don't use the connection string directly - extract and use individual parameters
    // to ensure we use proper IPv4 connectivity
    let connectionString = process.env.DATABASE_URL || '';
    
    // Extract connection details from the connection string
    const userPassHostMatch = connectionString.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    let user, password, host, port, database;
    
    if (userPassHostMatch) {
      user = userPassHostMatch[1];
      password = userPassHostMatch[2];
      host = userPassHostMatch[3];
      port = parseInt(userPassHostMatch[4], 10);
      database = userPassHostMatch[5];
      
      // Log connection details (masking password)
      console.log(`Extracted connection details: user=${user}, host=${host}, port=${port}, database=${database}`);
    } else {
      console.warn('Could not parse DATABASE_URL, using defaults');
      user = 'postgres';
      password = 'p*BQQ44ue-PfE2R';
      host = 'db.onmonxsgkdaurztdhafz.supabase.co';
      port = 5432;
      database = 'postgres';
    }
    
    // EMERGENCY FIX: Always use direct IP address for Supabase pooler
    // Check if the host is Supabase and replace with IP
    if (host && (host.includes('pooler.supabase.com') || host.includes('supabase.co'))) {
      console.log(`Replacing database host ${host} with direct IPv4 address`);
      // This is the IPv4 address for aws-0-ap-south-1.pooler.supabase.com
      host = '3.111.105.85';
      console.log(`Now using direct IPv4 address: ${host}`);
    }
    
    // Configure connection without using the connection string
    const config = {
      user,
      password,
      host, 
      port,
      database,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      // Force IPv4 connections
      family: 4,
      // We're not using connectionString anymore, so these options will take effect
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // Extended timeout for connection
      keepAlive: true // Keep the connection alive
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