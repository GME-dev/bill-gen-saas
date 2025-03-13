import express from 'express';
import { getDatabase, initializeDatabase } from '../utils/database.js';

const router = express.Router();

// Health check status variables
let lastDbConnectionAttempt = 0;
const DB_RETRY_INTERVAL = 10000; // 10 seconds

router.get('/', async (req, res) => {
    const now = Date.now();
    
    // Always return 200 to pass the basic healthcheck
    // This ensures Railway doesn't kill the container during startup
    try {
        // Only try to connect to the database if enough time has passed
        // since the last attempt (to prevent overloading the db)
        if (now - lastDbConnectionAttempt > DB_RETRY_INTERVAL) {
            lastDbConnectionAttempt = now;
            
            let db;
            try {
                // Try to get existing database connection
                db = getDatabase();
            } catch (error) {
                // If database not initialized, try to initialize it
                console.log('Database not initialized, attempting to initialize...');
                db = await initializeDatabase();
            }
            
            if (db) {
                // Test database connection
                await db.query('SELECT 1');
                
                res.status(200).json({
                    status: 'healthy',
                    database: 'connected',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }
        
        // If we reached here, either we're rate limiting db checks or db isn't ready
        res.status(200).json({
            status: 'starting',
            message: 'Service is running, database connection pending',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        // Return 200 status for health checks to prevent container restarts
        res.status(200).json({
            status: 'degraded',
            message: 'Service is running but database connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 