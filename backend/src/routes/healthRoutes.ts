import { Router } from 'express';
import { basicHealth, detailedHealth } from '../controllers/healthController.js';

const router = Router();

/**
 * Basic health check route
 * @route GET /api/health
 * @access Public
 */
router.get('/', basicHealth);

/**
 * Detailed health check route - protected in production
 * @route GET /api/health/details
 * @access Private in production, Public in development
 */
router.get('/details', detailedHealth);

export default router; 