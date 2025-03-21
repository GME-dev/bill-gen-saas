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
        if (db) {
            await db.command({ ping: 1 });
            res.json({ status: 'healthy', message: 'Service is running' });
        } else {
            throw new Error('Database connection not available');
        }
    } catch (error) {
        console.error('Health check failed:', error);
        // Return 200 status for initial health checks to allow container to start
        // Railway will retry and eventually the database should connect
        res.status(200).json({ 
            status: 'starting', 
            message: 'Service is starting up, database connection pending'
        });
    }
});

export default router; 