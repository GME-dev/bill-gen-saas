import pg from 'pg'
const { Pool } = pg

let db = null

export async function initializeDatabase() {
  if (db) {
    console.log('Database already initialized')
    return db
  }

  try {
    db = new Pool({
      connectionString: 'postgresql://postgres:p*BQQ44ue-PfE2R@db.onmonxsgkdaurztdhafz.supabase.co:5432/postgres',
      ssl: {
        rejectUnauthorized: false
      }
    })

    // Test the connection
    await db.query('SELECT NOW()')
    console.log('Database connected successfully')

    // Create tables if they don't exist
    await db.query(`
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

    await db.query(`
      CREATE TABLE IF NOT EXISTS bike_models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        price DECIMAL(10,2) NOT NULL
      )
    `)

    // Insert predefined bike models if they don't exist
    const predefinedModels = [
      ['TMR-G18', 499500],
      ['TMR-MNK3', 475000],
      ['TMR-Q1', 449500],
      ['TMR-ZL', 399500],
      ['TMR-ZS', 349500],
      ['TMR-XGW', 299500],
      ['TMR-COLA5', 249500],
      ['TMR-X01', 219500]
    ]

    for (const [name, price] of predefinedModels) {
      await db.query(`
        INSERT INTO bike_models (name, price)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET price = $2`,
        [name, price]
      )
    }

    console.log('Database tables and predefined data initialized successfully')
    return db
  } catch (error) {
    console.error('Database initialization error:', error)
    throw new Error(`Failed to initialize database: ${error.message}`)
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Please ensure initializeDatabase() is called first.')
  }
  return db
}