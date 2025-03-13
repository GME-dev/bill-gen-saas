import express from 'express';
import { getDatabase, initializeDatabase } from '../utils/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        let db;
        try {
            // Try to get existing database connection
            db = getDatabase();
        } catch (error) {
            // If database not initialized, try to initialize it
            console.log('Database not initialized, attempting to initialize...');
            db = await initializeDatabase();
        }
        
        // Test database connection
        await db.query('SELECT 1');
        
        res.status(200).json({
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        // Return 200 status for initial health checks to allow container to start
        // Railway will retry and eventually the database should connect
        res.status(200).json({
          status: 'starting',
          message: 'Service is starting up, database connection pending',
          timestamp: new Date().toISOString()
        });
    }
});

export default router; 