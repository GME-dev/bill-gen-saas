import { Express } from 'express';
import { billRoutes } from './bill.routes';
import { productRoutes } from './product.routes';

export const setupRoutes = (app: Express): void => {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/bills', billRoutes);
  app.use('/api/products', productRoutes);

  // Error handling middleware
  app.use((err: Error, req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });
}; 