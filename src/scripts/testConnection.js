import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'dns';

// Load environment variables
dotenv.config();

// Force Node.js to prefer IPv4 addresses
dns.setDefaultResultOrder('ipv4first');

async function testConnection() {
  let client = null;
  
  try {
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
    const db = client.db(dbName);
    
    // Test connection
    const result = await db.command({ ping: 1 });
    console.log('MongoDB connection successful:', result);
    
    // Count documents in collections
    const bikeModelsCount = await db.collection('bike_models').countDocuments();
    console.log(`Bike models in database: ${bikeModelsCount}`);
    
    const billsCount = await db.collection('bills').countDocuments();
    console.log(`Bills in database: ${billsCount}`);
    
    const brandingCount = await db.collection('branding').countDocuments();
    console.log(`Branding documents in database: ${brandingCount}`);
    
    // Get and display one bike model
    const sampleBikeModel = await db.collection('bike_models').findOne({});
    console.log('\nSample bike model:');
    console.log(sampleBikeModel);
    
    // Get and display one bill
    const sampleBill = await db.collection('bills').findOne({});
    console.log('\nSample bill:');
    console.log(sampleBill);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing database connection:', error);
  } finally {
    // Close the connection
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
  }
}

// Run the test
testConnection(); 