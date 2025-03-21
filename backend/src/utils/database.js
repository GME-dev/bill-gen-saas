import pg from 'pg'
import dotenv from 'dotenv'
import dns from 'dns'

// Load environment variables
dotenv.config()

const { Pool } = pg
let db = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5
let initializationPromise = null
let connectionType = 'auto' // 'direct', 'pooler', or 'auto'

// Forced IPv4 resolution for Node.js
// This helps with environments that have IPv6 disabled
try {
  // Check if this setting was already applied
  if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('--dns-result-order=ipv4first')) {
    console.log('Setting DNS resolution preference to IPv4 first')
    dns.setDefaultResultOrder('ipv4first')
  }
} catch (error) {
  console.warn('Failed to set DNS resolution order:', error.message)
}

// Use the direct connection URL if available, otherwise try to modify the pooler URL
function getConnectionUrl(type = connectionType) {
  const originalUrl = process.env.DATABASE_URL

  if (!originalUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // If explicitly using pooler, return the original URL
  if (type === 'pooler') {
    return originalUrl
  }

  // If the URL contains pooler.supabase.com and we want direct or auto connection
  if (originalUrl.includes('pooler.supabase.com') && (type === 'direct' || type === 'auto')) {
    console.log('Detected pooler URL, attempting to use direct connection instead')
    try {
      // Extract the credentials and region from the pooler URL
      const match = originalUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/postgres/)
      if (match) {
        // Extract parts of the URL
        const [_, username, password, host] = match
        
        // Try to extract the region and project reference from the host
        // Example: aws-0-ap-south-1.pooler.supabase.com
        const hostParts = host.split('.')
        if (hostParts.length >= 3) {
          const projectId = process.env.SUPABASE_PROJECT_ID
          
          // Only proceed if we have a project ID
          if (projectId) {
            // Try to guess the direct connection URL format
            const directUrl = `postgres://${username}:${password}@db.${projectId}.supabase.co:5432/postgres?sslmode=prefer`
            
            console.log(`Trying direct connection URL (masked): postgres://****:****@db.${projectId}.supabase.co:5432/postgres?sslmode=prefer`)
            return directUrl
          } else {
            console.log('No SUPABASE_PROJECT_ID provided, using pooler connection')
          }
        }
      }
    } catch (error) {
      console.warn('Error creating direct URL:', error.message)
      console.log('Falling back to original URL')
    }
  }

  // If we can't create a direct URL or if the original URL is not a pooler URL,
  // just return the original URL
  return originalUrl
}

export async function initializeDatabase() {
  // If there's already an initialization in progress, return that promise
  if (initializationPromise) {
    return initializationPromise
  }

  // If database is already initialized, return it
  if (db) {
    console.log('Database already initialized')
    return db
  }

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      connectionAttempts++
      console.log(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)

      // First try with whatever connection type is set
      let connectionString = getConnectionUrl()
      
      // If we're on auto mode and we've tried before, alternate between direct and pooler
      if (connectionType === 'auto' && connectionAttempts > 1) {
        // On even attempts, try direct; on odd, try pooler (after the first attempt)
        const attemptConnectionType = connectionAttempts % 2 === 0 ? 'direct' : 'pooler'
        console.log(`Auto-switching to ${attemptConnectionType} connection for this attempt`)
        connectionString = getConnectionUrl(attemptConnectionType)
      }

      // Log masked connection string
      const maskedString = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')
      console.log(`Using database connection: ${maskedString}`)

      // Configuration with relaxed SSL settings
      const config = {
        connectionString,
        ssl: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined // Skip all hostname checks
        },
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
          initializationPromise = null
        }
      })

      // Test the connection
      console.log('Testing database connection...')
      const client = await db.connect()
      
      try {
        console.log('Running test query...')
        const result = await client.query('SELECT NOW()')
        console.log('Database connection successful:', result.rows[0])
        
        // If we're on auto and succeeded, remember which type worked
        if (connectionType === 'auto') {
          // Check if we're using direct or pooler based on the connectionString
          const successfulType = connectionString.includes('pooler.supabase.com') ? 'pooler' : 'direct'
          console.log(`Auto-detected successful connection type: ${successfulType}`)
          connectionType = successfulType // Remember for next time
        }
        
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
          throw error;
        }

        return db
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error initializing database:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        where: error.where
      })
      
      db = null
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`)
        initializationPromise = null
        throw error
      } else {
        console.log(`Will retry database connection on next request (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 3000))
        initializationPromise = null
        return initializeDatabase()
      }
    }
  })()

  return initializationPromise
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized')
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