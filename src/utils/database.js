import pg from 'pg'
import dotenv from 'dotenv'
import { lookup } from 'dns'

// Force Node.js to prefer IPv4 addresses
lookup('pooler.supabase.com', { family: 4 }, () => {});

// Load environment variables
dotenv.config()

// Set environment variable to force IPv4
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first'

const { Pool } = pg
let db = null
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5

export async function initializeDatabase() {
  if (process.env.USE_MOCK_DB === 'true') {
    console.log('Using mock database as USE_MOCK_DB is set to true')
    return
  }

  if (db) {
    console.log('Database already initialized')
    return
  }

  while (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    try {
      connectionAttempts++
      console.log(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`)
      
      // Get the database connection string
      const connectionString = process.env.DATABASE_URL
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set')
      }
      
      // Mask sensitive information for logging
      const maskedString = connectionString.replace(/:[^:@]+@/, ':****@')
      console.log(`Using database connection: ${maskedString}`)
      
      // Create the connection pool
      db = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      })
      
      // Test the connection
      const client = await db.connect()
      try {
        // Create ENUM type for bill types
        await client.query(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type') THEN
              CREATE TYPE bill_type AS ENUM ('CASH', 'LEASE', 'ADVANCE_CASH', 'ADVANCE_LEASE');
            END IF;
          END $$;
        `)
        
        // Create or update bike_models table
        await client.query(`
          CREATE TABLE IF NOT EXISTS bike_models (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            price DECIMAL(10,2) NOT NULL,
            motor_number_prefix TEXT,
            chassis_number_prefix TEXT,
            is_ebicycle BOOLEAN DEFAULT FALSE,
            can_be_leased BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `)
        
        // Create or update bills table
        await client.query(`
          CREATE TABLE IF NOT EXISTS bills (
            id SERIAL PRIMARY KEY,
            bill_type bill_type NOT NULL,
            customer_name TEXT NOT NULL,
            customer_nic TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            model_name TEXT NOT NULL,
            motor_number TEXT NOT NULL,
            chassis_number TEXT NOT NULL,
            bike_price DECIMAL(10,2) NOT NULL,
            down_payment DECIMAL(10,2),
            advance_amount DECIMAL(10,2),
            bill_date DATE NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            balance_amount DECIMAL(10,2),
            status TEXT DEFAULT 'pending',
            original_bill_id INTEGER REFERENCES bills(id),
            converted_bill_id INTEGER REFERENCES bills(id),
            estimated_delivery_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (model_name) REFERENCES bike_models(name)
          );
        `)
        
        // Add rmv_charge column if it doesn't exist
        await client.query(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'bills' AND column_name = 'rmv_charge'
            ) THEN
              ALTER TABLE bills 
              ADD COLUMN rmv_charge DECIMAL(10,2) NOT NULL DEFAULT 0;
            END IF;
          END $$;
        `)
        
        // Create validation functions and triggers
        await client.query(`
          -- Function to validate lease bills
          CREATE OR REPLACE FUNCTION validate_lease_bill()
          RETURNS TRIGGER AS $$
          DECLARE
            can_lease BOOLEAN;
          BEGIN
            IF NEW.bill_type IN ('LEASE', 'ADVANCE_LEASE') THEN
              SELECT can_be_leased INTO can_lease
              FROM bike_models
              WHERE name = NEW.model_name;
              
              IF NOT can_lease THEN
                RAISE EXCEPTION 'Cannot create lease bill for model % as it cannot be leased', NEW.model_name;
              END IF;
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          -- Function to validate RMV charges
          CREATE OR REPLACE FUNCTION validate_rmv_charge()
          RETURNS TRIGGER AS $$
          DECLARE
            is_ebike BOOLEAN;
          BEGIN
            SELECT is_ebicycle INTO is_ebike
            FROM bike_models
            WHERE name = NEW.model_name;
            
            IF is_ebike AND NEW.rmv_charge != 0 THEN
              RAISE EXCEPTION 'E-bicycles should not have RMV charges';
            ELSIF NOT is_ebike THEN
              IF NEW.bill_type IN ('CASH', 'ADVANCE_CASH') AND NEW.rmv_charge != 13000 THEN
                RAISE EXCEPTION 'Cash bills should have RMV charge of Rs. 13,000';
              ELSIF NEW.bill_type IN ('LEASE', 'ADVANCE_LEASE') AND NEW.rmv_charge != 13500 THEN
                RAISE EXCEPTION 'Lease bills should have RMV charge of Rs. 13,500';
              END IF;
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          -- Function to validate balance amounts
          CREATE OR REPLACE FUNCTION validate_balance()
          RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.bill_type = 'CASH' AND NEW.balance_amount != NEW.total_amount - COALESCE(NEW.advance_amount, 0) THEN
              RAISE EXCEPTION 'Invalid balance amount for cash bill';
            ELSIF NEW.bill_type = 'LEASE' AND NEW.balance_amount != NEW.down_payment - COALESCE(NEW.advance_amount, 0) THEN
              RAISE EXCEPTION 'Invalid balance amount for lease bill';
            ELSIF NEW.bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') AND NEW.balance_amount IS NULL THEN
              RAISE EXCEPTION 'Balance amount is required for advance bills';
            ELSIF NEW.bill_type IN ('CASH', 'LEASE') AND NEW.advance_amount IS NOT NULL THEN
              RAISE EXCEPTION 'Regular bills should not have advance amounts';
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          -- Drop existing triggers if they exist
          DROP TRIGGER IF EXISTS validate_lease_bill_trigger ON bills;
          DROP TRIGGER IF EXISTS validate_rmv_charge_trigger ON bills;
          DROP TRIGGER IF EXISTS validate_balance_trigger ON bills;

          -- Create triggers
          CREATE TRIGGER validate_lease_bill_trigger
            BEFORE INSERT OR UPDATE ON bills
            FOR EACH ROW
            EXECUTE FUNCTION validate_lease_bill();

          CREATE TRIGGER validate_rmv_charge_trigger
            BEFORE INSERT OR UPDATE ON bills
            FOR EACH ROW
            EXECUTE FUNCTION validate_rmv_charge();

          CREATE TRIGGER validate_balance_trigger
            BEFORE INSERT OR UPDATE ON bills
            FOR EACH ROW
            EXECUTE FUNCTION validate_balance();
        `)
        
        // Create indexes
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bills_customer_nic ON bills(customer_nic);
          CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
          CREATE INDEX IF NOT EXISTS idx_bills_bill_date ON bills(bill_date);
          CREATE INDEX IF NOT EXISTS idx_bills_bill_type ON bills(bill_type);
        `)
        
        // Create bill_summary view
        await client.query(`
          CREATE OR REPLACE VIEW bill_summary AS
          SELECT 
            b.*,
            CASE 
              WHEN b.bill_type = 'CASH' THEN b.bike_price + b.rmv_charge
              WHEN b.bill_type = 'LEASE' THEN b.down_payment
              WHEN b.bill_type = 'ADVANCE_CASH' THEN b.bike_price + b.rmv_charge
              WHEN b.bill_type = 'ADVANCE_LEASE' THEN b.down_payment
            END as payable_amount,
            CASE 
              WHEN b.bill_type = 'ADVANCE_CASH' THEN b.advance_amount
              WHEN b.bill_type = 'ADVANCE_LEASE' THEN b.advance_amount
              ELSE NULL
            END as paid_advance,
            bm.is_ebicycle,
            bm.can_be_leased
          FROM bills b
          JOIN bike_models bm ON b.model_name = bm.name;
        `)
        
        // Insert predefined bike models if they don't exist
        await client.query(`
          INSERT INTO bike_models (name, price, motor_number_prefix, chassis_number_prefix, is_ebicycle, can_be_leased)
          VALUES 
            ('TMR-G18', 499500.00, 'G18', 'G18', FALSE, TRUE),
            ('TMR-MNK3', 475000.00, 'MNK3', 'MNK3', FALSE, TRUE),
            ('TMR-Q1', 449500.00, 'Q1', 'Q1', FALSE, TRUE),
            ('TMR-ZL', 399500.00, 'ZL', 'ZL', FALSE, TRUE),
            ('TMR-ZS', 349500.00, 'ZS', 'ZS', FALSE, TRUE),
            ('TMR-XGW', 299500.00, 'XGW', 'XGW', FALSE, TRUE),
            ('TMR-COLA5', 249500.00, 'COLA5', 'COLA5', TRUE, FALSE),
            ('TMR-X01', 219500.00, 'X01', 'X01', TRUE, FALSE)
          ON CONFLICT (name) 
          DO UPDATE SET 
            price = EXCLUDED.price,
            motor_number_prefix = EXCLUDED.motor_number_prefix,
            chassis_number_prefix = EXCLUDED.chassis_number_prefix,
            is_ebicycle = EXCLUDED.is_ebicycle,
            can_be_leased = EXCLUDED.can_be_leased;
        `)
        
        console.log('Database initialization completed successfully')
        break
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error initializing database:', error)
      if (connectionAttempts === MAX_CONNECTION_ATTEMPTS) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 5000))
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