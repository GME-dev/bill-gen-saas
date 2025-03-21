import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'dns';

// Load environment variables
dotenv.config();

// Force Node.js to prefer IPv4 addresses
dns.setDefaultResultOrder('ipv4first');
console.log('Forced IPv4 DNS resolution in index.js');

// Connection variables
let client = null;
let db = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

export async function initializeDatabase() {
  if (db) {
    console.log('Database already initialized');
    return db;
  }

  while (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    try {
      connectionAttempts++;
      console.log(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
      
      // Check for MongoDB URI
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      
      // Get database name from environment or use default
      const dbName = process.env.MONGODB_DB_NAME || 'bill-gen';
      
      // Connect to MongoDB
      console.log(`Connecting to MongoDB database: ${dbName}`);
      client = new MongoClient(mongoUri);
      await client.connect();
      
      // Access the database
      db = client.db(dbName);
      
      // Test connection
      const result = await db.command({ ping: 1 });
      console.log('MongoDB connection successful:', result);
      
      // Reset connection attempts on success
      connectionAttempts = 0;
      
      console.log('MongoDB initialization complete');
      return db;
    } catch (error) {
      console.error('Error initializing database:', {
        message: error.message,
        stack: error.stack
      });
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`);
        throw error;
      }
      
      console.log(`Will retry database connection on next request (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
      // If we fail, we'll retry on the next request
      db = null;
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError);
        }
        client = null;
      }
    }
  }
}

export function getDatabase() {
  if (!db) {
    console.log('Database connection attempt failed, will retry');
    console.log('Attempting to initialize database...');
    initializeDatabase().catch(error => {
      console.error('Failed to initialize database on retry:', error);
    });
    return null;
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    console.log('Closing database connection...');
    await client.close();
    client = null;
    db = null;
    connectionAttempts = 0;
    console.log('Database connection closed');
  }
}