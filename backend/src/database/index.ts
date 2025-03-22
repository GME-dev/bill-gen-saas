import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Connection variables
let client: MongoClient | null = null;
let db: Db | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

export const setupDatabase = async (): Promise<Db | null> => {
  if (db) {
    logger.info('Database already initialized');
    return db;
  }

  while (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    try {
      connectionAttempts++;
      logger.info(`Initializing database... (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
      
      // Check for MongoDB URI
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      
      // Get database name from environment or use default
      const dbName = process.env.MONGODB_DB_NAME || 'bill-gen';
      
      // Connect to MongoDB
      logger.info(`Connecting to MongoDB database: ${dbName}`);
      client = new MongoClient(mongoUri);
      await client.connect();
      
      // Access the database
      db = client.db(dbName);
      
      // Test connection
      const result = await db.command({ ping: 1 });
      logger.info('MongoDB connection successful:', result);
      
      // Reset connection attempts on success
      connectionAttempts = 0;
      
      logger.info('MongoDB initialization complete');
      return db;
    } catch (error) {
      logger.error('Error initializing database:', error);
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        logger.error(`Failed to connect to database after ${MAX_CONNECTION_ATTEMPTS} attempts`);
        throw error;
      }
      
      logger.info(`Will retry database connection on next request (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
      // If we fail, we'll retry on the next request
      db = null;
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing client:', closeError);
        }
        client = null;
      }
    }
  }
  
  return null;
};

export function getDatabase(): Db | null {
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    logger.info('Closing database connection...');
    await client.close();
    client = null;
    db = null;
    connectionAttempts = 0;
    logger.info('Database connection closed');
  }
} 