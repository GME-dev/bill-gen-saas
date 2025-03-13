import { Router } from 'express';
import { getDatabase } from '../utils/database.js';

const router = Router();

// Get all bike models
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const result = await db.query('SELECT id, name as model_name, price FROM bike_models ORDER BY price DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bike models:', error);
        res.status(500).json({ error: 'Failed to fetch bike models' });
    }
});

// Add a new bike model
router.post('/', async (req, res) => {
    try {
        const { name, price } = req.body;
        const db = getDatabase();
        const result = await db.query(
            'INSERT INTO bike_models (name, price) VALUES ($1, $2) RETURNING *',
            [name, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating bike model:', error);
        res.status(500).json({ error: 'Failed to create bike model' });
    }
});

export default router; 