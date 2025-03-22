/**
 * MongoDB Migration Script
 * 
 * This script helps migrate data from SQL databases to MongoDB.
 * It's intended for use if you have existing data in a SQL database that needs
 * to be transferred to MongoDB Atlas.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connection variables for MongoDB
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'bill-gen';

/**
 * Default bike models data to insert if collection is empty
 */
const defaultBikeModels = [
  {
    name: 'TMR-G18',
    price: 499500,
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-COLA5',
    price: 599000,
    is_ebicycle: true,
    can_be_leased: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-X01',
    price: 699000,
    is_ebicycle: true,
    can_be_leased: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-G20',
    price: 549500,
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

/**
 * Main migration function
 */
async function migrateToMongoDB() {
  console.log('Starting migration to MongoDB...');
  
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Create collections if they don't exist
    console.log('Setting up collections...');
    
    // Bike models collection setup
    const bikeModelsCollection = db.collection('bike_models');
    const bikeModelsCount = await bikeModelsCollection.countDocuments();
    
    if (bikeModelsCount === 0) {
      console.log('Inserting default bike models...');
      await bikeModelsCollection.insertMany(defaultBikeModels);
      console.log(`Inserted ${defaultBikeModels.length} bike models`);
    } else {
      console.log(`Found ${bikeModelsCount} existing bike models, skipping insertion`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateToMongoDB().catch(console.error);
