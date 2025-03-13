import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            storage: 'available'
        }
    });
});

export default router; 