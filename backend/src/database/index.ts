import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:password@cluster0.mongodb.net/bill-generator?retryWrites=true&w=majority';
const DB_NAME = process.env.DB_NAME || 'bill-generator';

let db: Db;
let client: MongoClient;

export interface BikeModel {
  id?: string;
  name: string;
  year: number;
  price: number;
}

export interface Bill {
  id?: string;
  customerName: string;
  bikeModel: string;
  date: string;
  amount: number;
  status: string;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    logger.info('Using existing database connection');
    return db;
  }

  try {
    logger.info('Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    logger.info('Successfully connected to MongoDB Atlas!');

    db = client.db(DB_NAME);
    
    // Ensure collections exist with proper indexes
    await setupCollections(db);
    
    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
}

async function setupCollections(database: Db): Promise<void> {
  // Create collections if they don't exist
  const collections = await database.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  // Set up bike models collection
  if (!collectionNames.includes('bikeModels')) {
    await database.createCollection('bikeModels');
    const bikeModelsCollection = database.collection('bikeModels');
    await bikeModelsCollection.createIndex({ name: 1 }, { unique: true });
    
    // Insert sample data if empty
    const count = await bikeModelsCollection.countDocuments();
    if (count === 0) {
      await seedBikeModels(bikeModelsCollection);
    }
  }

  // Set up bills collection
  if (!collectionNames.includes('bills')) {
    await database.createCollection('bills');
    const billsCollection = database.collection('bills');
    await billsCollection.createIndex({ customerName: 1 });
    await billsCollection.createIndex({ date: -1 });
  }
}

async function seedBikeModels(collection: Collection): Promise<void> {
  logger.info('Seeding bike models collection with initial data...');
  
  const sampleBikeModels = [
    { name: 'TMR Sport 125', year: 2024, price: 15000 },
    { name: 'TMR Cruiser 250', year: 2024, price: 18000 },
    { name: 'TMR Racer 300', year: 2024, price: 22000 },
    { name: 'TMR Adventure 500', year: 2024, price: 25000 }
  ];
  
  try {
    await collection.insertMany(sampleBikeModels);
    logger.info('Successfully seeded bike models collection!');
  } catch (error) {
    logger.error('Error seeding bike models:', error);
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    logger.info('Closing database connection...');
    await client.close();
    logger.info('MongoDB connection closed');
  }
}

export { db }; 