import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase, BikeModel } from '../database/index.js';

const router = Router();

// GET all bike models
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await connectToDatabase();
    const bikeModels = await db.collection('bikeModels').find().toArray();
    
    // Transform _id to id for frontend compatibility
    const formattedBikeModels = bikeModels.map(model => {
      const { _id, ...rest } = model;
      return { id: _id.toString(), ...rest };
    });
    
    res.status(200).json(formattedBikeModels);
  } catch (error) {
    console.error('Error fetching bike models:', error);
    res.status(500).json({ error: 'Failed to fetch bike models' });
  }
});

// GET a single bike model by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bike model ID' });
    }
    
    const db = await connectToDatabase();
    const bikeModel = await db.collection('bikeModels').findOne({ _id: new ObjectId(id) });
    
    if (!bikeModel) {
      return res.status(404).json({ error: 'Bike model not found' });
    }
    
    const { _id, ...rest } = bikeModel;
    res.status(200).json({ id: _id.toString(), ...rest });
  } catch (error) {
    console.error('Error fetching bike model:', error);
    res.status(500).json({ error: 'Failed to fetch bike model' });
  }
});

// POST a new bike model
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, year, price } = req.body;
    
    // Validate required fields
    if (!name || !year || !price) {
      return res.status(400).json({ error: 'Name, year, and price are required fields' });
    }
    
    // Validate data types
    if (typeof name !== 'string' || typeof year !== 'number' || typeof price !== 'number') {
      return res.status(400).json({ error: 'Invalid data types. Name should be string, year and price should be numbers' });
    }
    
    const newBikeModel: BikeModel = {
      name,
      year,
      price
    };
    
    const db = await connectToDatabase();
    
    // Check if bike model with same name already exists
    const existingModel = await db.collection('bikeModels').findOne({ name });
    if (existingModel) {
      return res.status(409).json({ error: 'A bike model with this name already exists' });
    }
    
    const result = await db.collection('bikeModels').insertOne(newBikeModel);
    
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newBikeModel
    });
  } catch (error) {
    console.error('Error creating bike model:', error);
    res.status(500).json({ error: 'Failed to create bike model' });
  }
});

// PUT (update) a bike model
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, year, price } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bike model ID' });
    }
    
    // Validate required fields
    if (!name || !year || !price) {
      return res.status(400).json({ error: 'Name, year, and price are required fields' });
    }
    
    const updatedBikeModel: BikeModel = {
      name,
      year,
      price
    };
    
    const db = await connectToDatabase();
    
    // Check if bike model exists
    const existingModel = await db.collection('bikeModels').findOne({ _id: new ObjectId(id) });
    if (!existingModel) {
      return res.status(404).json({ error: 'Bike model not found' });
    }
    
    // Check if another bike model with the same name exists (excluding current one)
    const duplicateModel = await db.collection('bikeModels').findOne({ 
      name, 
      _id: { $ne: new ObjectId(id) } 
    });
    
    if (duplicateModel) {
      return res.status(409).json({ error: 'Another bike model with this name already exists' });
    }
    
    await db.collection('bikeModels').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedBikeModel }
    );
    
    res.status(200).json({
      id,
      ...updatedBikeModel
    });
  } catch (error) {
    console.error('Error updating bike model:', error);
    res.status(500).json({ error: 'Failed to update bike model' });
  }
});

// DELETE a bike model
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bike model ID' });
    }
    
    const db = await connectToDatabase();
    
    // Check if bike model exists
    const existingModel = await db.collection('bikeModels').findOne({ _id: new ObjectId(id) });
    if (!existingModel) {
      return res.status(404).json({ error: 'Bike model not found' });
    }
    
    // Check if this bike model is referenced in any bills
    const referencedInBill = await db.collection('bills').findOne({ bikeModel: existingModel.name });
    if (referencedInBill) {
      return res.status(409).json({ error: 'Cannot delete bike model as it is referenced in one or more bills' });
    }
    
    await db.collection('bikeModels').deleteOne({ _id: new ObjectId(id) });
    
    res.status(200).json({ message: 'Bike model deleted successfully' });
  } catch (error) {
    console.error('Error deleting bike model:', error);
    res.status(500).json({ error: 'Failed to delete bike model' });
  }
});

export default router; 