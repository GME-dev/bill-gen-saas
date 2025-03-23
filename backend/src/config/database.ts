import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// MongoDB connection options
const options: mongoose.ConnectOptions = {
  autoIndex: process.env.NODE_ENV !== 'production', // Don't build indexes in production
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

/**
 * Connect to MongoDB database
 */
export const connectToDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tmr-bill-generator';

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);

    // Log connection events in development
    if (process.env.NODE_ENV !== 'production') {
      mongoose.connection.on('connected', () => {
        logger.info(`MongoDB connected to ${mongoUri}`);
      });

      mongoose.connection.on('error', (err: Error) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      // If the Node process ends, close the Mongoose connection
      process.on('SIGINT', async () => {
        await closeDatabaseConnection();
        process.exit(0);
      });
    } else {
      logger.info('MongoDB connected');
    }
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${(error as Error).message}`);
    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

/**
 * Close the database connection
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${(error as Error).message}`);
  }
}; 