import { Router } from 'express';
import { getDatabase } from '../utils/database.js';

const router = Router();

// Get all bike models with optional filtering
router.get('/', async (req, res) => {
    try {
        const { bill_type } = req.query;
        const db = getDatabase();
        
        let query = 'SELECT id, name as model_name, price, is_ebicycle FROM bike_models';
        
        // Filter out e-bicycles for leasing bills
        if (bill_type === 'leasing') {
            query += ' WHERE is_ebicycle = FALSE';
        }
        
        query += ' ORDER BY price DESC';
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bike models:', error);
        res.status(500).json({ error: 'Failed to fetch bike models' });
    }
});

// Get a specific bike model
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        const result = await db.query(
            'SELECT id, name as model_name, price, is_ebicycle FROM bike_models WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bike model not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching bike model:', error);
        res.status(500).json({ error: 'Failed to fetch bike model' });
    }
});

// Add a new bike model
router.post('/', async (req, res) => {
    try {
        const { name, price, is_ebicycle = false } = req.body;
        const db = getDatabase();
        const result = await db.query(
            'INSERT INTO bike_models (name, price, is_ebicycle) VALUES ($1, $2, $3) RETURNING *',
            [name, price, is_ebicycle]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating bike model:', error);
        res.status(500).json({ error: 'Failed to create bike model' });
    }
});

// Update a bike model
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, is_ebicycle } = req.body;
        const db = getDatabase();
        const result = await db.query(
            'UPDATE bike_models SET name = $1, price = $2, is_ebicycle = $3 WHERE id = $4 RETURNING *',
            [name, price, is_ebicycle, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bike model not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating bike model:', error);
        res.status(500).json({ error: 'Failed to update bike model' });
    }
});

export default router; 