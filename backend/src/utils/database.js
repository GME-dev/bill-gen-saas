import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

let db = null

export async function initializeDatabase() {
  if (db) {
    try {
      // Test the connection
      await db.get('SELECT 1')
      return db
    } catch (error) {
      console.log('Database connection lost, reconnecting...')
      db = null
    }
  }

  try {
    // Create data directory if it doesn't exist
    const dataDir = join(projectRoot, 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const dbPath = join(dataDir, 'bills.db')
    console.log('Database path:', dbPath)

    // Ensure the database file exists
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '')
    }

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON')
    await db.run('PRAGMA journal_mode = WAL')

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_type TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_nic TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        model_name TEXT NOT NULL,
        motor_number TEXT NOT NULL,
        chassis_number TEXT NOT NULL,
        bike_price REAL NOT NULL,
        down_payment REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS bike_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
        motor_number_prefix TEXT,
        chassis_number_prefix TEXT
      );

      -- Insert predefined bike models
      INSERT OR IGNORE INTO bike_models (model_name, price) VALUES
        ('TMR-G18', 499500),
        ('TMR-MNK3', 475000),
        ('TMR-Q1', 449500),
        ('TMR-ZL', 399500),
        ('TMR-ZS', 349500),
        ('TMR-XGW', 299500),
        ('TMR-COLA5', 249500),
        ('TMR-X01', 219500);

      -- Remove unused tables
      DROP TABLE IF EXISTS bill_items;
      DROP TABLE IF EXISTS products;
    `)

    // Test the connection
    await db.get('SELECT 1')
    console.log('Database initialized successfully')
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