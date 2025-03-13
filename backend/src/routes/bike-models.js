import express from 'express';
import { getDatabase } from '../utils/database.js';

const router = express.Router();

// Get all bike models
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const models = await db.all('SELECT * FROM bike_models ORDER BY price DESC');
        res.json(models);
    } catch (error) {
        console.error('Error fetching bike models:', error);
        res.status(500).json({ error: 'Failed to fetch bike models' });
    }
});

// Add a new bike model
router.post('/', async (req, res) => {
    try {
        const { model_name, price, motor_number_prefix, chassis_number_prefix } = req.body;
        const db = getDatabase();
        
        const result = await db.run(
            `INSERT INTO bike_models (
                model_name, price, motor_number_prefix, chassis_number_prefix
            ) VALUES (?, ?, ?, ?)`,
            [model_name, price, motor_number_prefix, chassis_number_prefix]
        );

        const model = await db.get('SELECT * FROM bike_models WHERE id = ?', [result.lastID]);
        res.status(201).json(model);
    } catch (error) {
        console.error('Error creating bike model:', error);
        res.status(500).json({ error: 'Failed to create bike model' });
    }
});

export default router; 