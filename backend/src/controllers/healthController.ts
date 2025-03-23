import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';

/**
 * Basic health check controller
 * Returns status 200 if server is running
 */
export const basicHealth = (req: Request, res: Response): void => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is running' 
  });
};

/**
 * Detailed health check controller
 * Returns detailed health information about the server and database
 */
export const detailedHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };

    const healthInfo = {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      server: {
        environment: process.env.NODE_ENV,
        hostname: os.hostname(),
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        cpus: os.cpus().length,
        memoryTotal: os.totalmem(),
        memoryFree: os.freemem()
      },
      database: {
        status: dbStatus[dbState] || 'unknown',
        connected: dbState === 1
      }
    };

    res.status(200).json(healthInfo);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: (error as Error).message 
    });
  }
}; 