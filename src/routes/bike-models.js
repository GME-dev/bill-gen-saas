import { Router } from 'express';
import { getDatabase } from '../utils/database.js';

const router = Router();

// Get all bike models
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        if (!db) {
            return res.status(503).json({ error: 'Database connection not available' });
        }
        
        const collection = db.collection('bike_models');
        const models = await collection.find({}).sort({ price: -1 }).toArray();
        
        // Transform to match the expected format
        const transformedModels = models.map(model => ({
            id: model._id,
            model_name: model.name,
            price: model.price,
            is_ebicycle: model.is_ebicycle,
            can_be_leased: model.can_be_leased
        }));
        
        res.json(transformedModels);
    } catch (error) {
        console.error('Error fetching bike models:', error);
        res.status(500).json({ error: 'Failed to fetch bike models' });
    }
});

// Add a new bike model
router.post('/', async (req, res) => {
    try {
        const { name, price, is_ebicycle = false, can_be_leased = true } = req.body;
        const db = getDatabase();
        if (!db) {
            return res.status(503).json({ error: 'Database connection not available' });
        }
        
        const collection = db.collection('bike_models');
        const newModel = {
            name,
            price,
            is_ebicycle,
            can_be_leased,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const result = await collection.insertOne(newModel);
        newModel._id = result.insertedId;
        
        res.status(201).json({
            id: newModel._id,
            model_name: newModel.name,
            price: newModel.price,
            is_ebicycle: newModel.is_ebicycle,
            can_be_leased: newModel.can_be_leased
        });
    } catch (error) {
        console.error('Error creating bike model:', error);
        res.status(500).json({ error: 'Failed to create bike model' });
    }
});

export default router; 