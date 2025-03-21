import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'dns';

// Load environment variables
dotenv.config();

// Force Node.js to prefer IPv4 addresses
dns.setDefaultResultOrder('ipv4first');

// Connection variables
let client = null;
let db = null;

async function connectToDatabase() {
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
  
  return db;
}

async function closeConnection() {
  if (client) {
    await client.close();
    console.log('Database connection closed');
  }
}

// Bike model data
const bikeModels = [
  {
    name: 'TMR-G18',
    price: 499500.00,
    motor_number_prefix: 'G18',
    chassis_number_prefix: 'G18',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-MNK3',
    price: 475000.00,
    motor_number_prefix: 'MNK3',
    chassis_number_prefix: 'MNK3',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-Q1',
    price: 449500.00,
    motor_number_prefix: 'Q1',
    chassis_number_prefix: 'Q1',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-ZL',
    price: 399500.00,
    motor_number_prefix: 'ZL',
    chassis_number_prefix: 'ZL',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-ZS',
    price: 349500.00,
    motor_number_prefix: 'ZS',
    chassis_number_prefix: 'ZS',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-XGW',
    price: 299500.00,
    motor_number_prefix: 'XGW',
    chassis_number_prefix: 'XGW',
    is_ebicycle: false,
    can_be_leased: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-COLA5',
    price: 249500.00,
    motor_number_prefix: 'COLA5',
    chassis_number_prefix: 'COLA5',
    is_ebicycle: true,
    can_be_leased: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: 'TMR-X01',
    price: 219500.00,
    motor_number_prefix: 'X01',
    chassis_number_prefix: 'X01',
    is_ebicycle: true,
    can_be_leased: false,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Sample bills data
const sampleBills = [
  // Cash bill for regular bike
  {
    bill_type: 'CASH',
    customer_name: 'John Doe',
    customer_nic: '123456789V',
    customer_address: '123 Sample Street, Colombo',
    model_name: 'TMR-G18',
    motor_number: 'G18123456',
    chassis_number: 'G18789012',
    bike_price: 499500.00,
    down_payment: 0,
    rmv_charge: 13000.00,
    is_cpz: false,
    payment_type: 'cash',
    is_advance_payment: false,
    advance_amount: 0,
    bill_date: new Date(),
    total_amount: 512500.00, // Bike price + RMV
    status: 'completed',
    balance_amount: 0,
    created_at: new Date()
  },
  
  // Cash bill for e-bicycle (no RMV)
  {
    bill_type: 'CASH',
    customer_name: 'Alice Johnson',
    customer_nic: '456123789V',
    customer_address: '789 New Road, Galle',
    model_name: 'TMR-COLA5',
    motor_number: 'COLA5-987321',
    chassis_number: 'COLA5-123987',
    bike_price: 249500.00,
    down_payment: 0,
    rmv_charge: 0, // No RMV for e-bicycles
    is_cpz: false,
    payment_type: 'cash',
    is_advance_payment: false,
    advance_amount: 0,
    bill_date: new Date(),
    total_amount: 249500.00, // Just the bike price
    status: 'completed',
    balance_amount: 0,
    created_at: new Date()
  },
  
  // Leasing bill for regular bike
  {
    bill_type: 'LEASING',
    customer_name: 'Jane Smith',
    customer_nic: '987654321V',
    customer_address: '456 Example Road, Kandy',
    model_name: 'TMR-ZL',
    motor_number: 'ZL654321',
    chassis_number: 'ZL987654',
    bike_price: 399500.00,
    down_payment: 150000.00,
    rmv_charge: 13500.00, // CPZ value
    is_cpz: true,
    payment_type: 'leasing',
    is_advance_payment: false,
    advance_amount: 0,
    bill_date: new Date(),
    total_amount: 150000.00, // Just the down payment
    status: 'pending',
    balance_amount: 0, // No balance
    created_at: new Date()
  },
  
  // Cash advance payment for regular bike
  {
    bill_type: 'CASH',
    customer_name: 'Robert Brown',
    customer_nic: '789123456V',
    customer_address: '234 Central Avenue, Negombo',
    model_name: 'TMR-Q1',
    motor_number: 'Q1-567890',
    chassis_number: 'Q1-098765',
    bike_price: 449500.00,
    down_payment: 0,
    rmv_charge: 13000.00,
    is_cpz: false,
    payment_type: 'cash',
    is_advance_payment: true,
    advance_amount: 100000.00,
    bill_date: new Date(),
    total_amount: 462500.00, // Bike price + RMV
    status: 'pending',
    balance_amount: 362500.00, // (Bike price + RMV) - Advance
    created_at: new Date()
  },
  
  // Leasing advance payment for regular bike
  {
    bill_type: 'LEASING',
    customer_name: 'Sarah Wilson',
    customer_nic: '321654987V',
    customer_address: '567 Lake View, Matara',
    model_name: 'TMR-MNK3',
    motor_number: 'MNK3-112233',
    chassis_number: 'MNK3-445566',
    bike_price: 475000.00,
    down_payment: 180000.00,
    rmv_charge: 13500.00, // CPZ value
    is_cpz: true,
    payment_type: 'leasing',
    is_advance_payment: true,
    advance_amount: 50000.00,
    bill_date: new Date(),
    total_amount: 180000.00, // Just the down payment
    status: 'pending',
    balance_amount: 130000.00, // Down payment - Advance
    created_at: new Date()
  }
];

// Default branding settings
const defaultBranding = {
  colors: {
    primary: '#003366',
    secondary: '#FF9900',
    text: '#333333',
    background: '#FFFFFF'
  },
  fonts: {
    primary: {
      regular: 'Roboto-Regular',
      bold: 'Roboto-Bold'
    },
    secondary: {
      regular: 'OpenSans-Regular',
      bold: 'OpenSans-Bold'
    }
  },
  logo: {
    path: null,
    lastUpdated: new Date()
  },
  companyInfo: {
    name: 'Bike World Lanka',
    address: '123 Main Street, Colombo 5, Sri Lanka',
    phone: '+94 11 2345678',
    email: 'info@bikeworldlanka.com',
    website: 'www.bikeworldlanka.com'
  },
  lastUpdated: new Date()
};

async function populateDatabase() {
  try {
    // Connect to the database
    const db = await connectToDatabase();
    
    // Create collections if they don't exist
    console.log('Creating collections...');
    
    // Populate bike_models collection
    console.log('Populating bike_models collection...');
    const bikeModelsCollection = db.collection('bike_models');
    
    // Check if collection is empty
    const bikeModelCount = await bikeModelsCollection.countDocuments();
    if (bikeModelCount === 0) {
      console.log('Inserting bike models...');
      const result = await bikeModelsCollection.insertMany(bikeModels);
      console.log(`${result.insertedCount} bike models inserted.`);
    } else {
      console.log(`Bike models collection already has ${bikeModelCount} documents. Skipping.`);
    }
    
    // Populate bills collection with sample data
    console.log('Populating bills collection...');
    const billsCollection = db.collection('bills');
    
    // Check if collection is empty
    const billCount = await billsCollection.countDocuments();
    if (billCount === 0) {
      console.log('Inserting sample bills...');
      const result = await billsCollection.insertMany(sampleBills);
      console.log(`${result.insertedCount} sample bills inserted.`);
    } else {
      console.log(`Bills collection already has ${billCount} documents. Skipping.`);
    }
    
    // Populate branding collection
    console.log('Setting up branding...');
    const brandingCollection = db.collection('branding');
    
    // Check if branding exists
    const existingBranding = await brandingCollection.findOne({ _id: 'default' });
    if (!existingBranding) {
      console.log('Creating default branding settings...');
      await brandingCollection.insertOne({
        _id: 'default',
        ...defaultBranding
      });
      console.log('Default branding settings created.');
    } else {
      console.log('Branding settings already exist. Skipping.');
    }
    
    console.log('Database population completed successfully.');
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    // Close the connection
    await closeConnection();
  }
}

// Run the population script
populateDatabase(); 