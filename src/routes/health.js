import express from 'express';
import { getDatabase } from '../utils/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        await db.query('SELECT 1'); // Test database connection
        res.json({ status: 'healthy', message: 'Service is running' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'unhealthy', message: error.message });
    }
});

export default router; 