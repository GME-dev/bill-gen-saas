import pg from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testConnection() {
  console.log('Starting database connection test...')
  
  const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      sslmode: 'require'
    }
  }
  
  console.log('Using config:', {
    ...config,
    connectionString: config.connectionString.replace(/:[^:@]+@/, ':****@') // Hide password in logs
  })

  const pool = new pg.Pool(config)

  try {
    console.log('Attempting to connect...')
    const client = await pool.connect()
    
    try {
      console.log('Connected! Testing query...')
      const result = await client.query('SELECT NOW()')
      console.log('Query successful:', result.rows[0])
      
      console.log('Testing bike_models table...')
      const models = await client.query('SELECT * FROM bike_models')
      console.log('Bike models found:', models.rows.length)
      if (models.rows.length > 0) {
        console.log('First model:', models.rows[0])
      }
    } finally {
      client.release()
      console.log('Client released')
    }
  } catch (err) {
    console.error('Connection error:', err)
    process.exit(1)
  } finally {
    await pool.end()
    console.log('Pool ended')
  }
}

testConnection() 