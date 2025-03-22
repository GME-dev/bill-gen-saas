import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../database/index.js';

const router = Router();

// Health check endpoint that also verifies database connectivity
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check if database is accessible
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    
    res.status(200).json({
      status: 'healthy',
      message: 'Service is running properly',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Service is running but database connection failed',
      database: 'disconnected',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 