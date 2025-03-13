import express from 'express';
import { getDatabase } from '../utils/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        if (!db) {
          throw new Error('Database not initialized');
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
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
    }
});

export default router; 