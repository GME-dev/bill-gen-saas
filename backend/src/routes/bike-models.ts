import { Router } from 'express';
import { 
  getAllBikeModels, 
  getBikeModelById,
  createBikeModel,
  updateBikeModel,
  deleteBikeModel
} from '../controllers/bikeModelController.js';

const router = Router();

/**
 * @route   GET /api/bike-models
 * @desc    Get all bike models
 * @access  Public
 */
router.get('/', getAllBikeModels);

/**
 * @route   GET /api/bike-models/:id
 * @desc    Get bike model by ID
 * @access  Public
 */
router.get('/:id', getBikeModelById);

/**
 * @route   POST /api/bike-models
 * @desc    Create a new bike model
 * @access  Private
 */
router.post('/', createBikeModel);

/**
 * @route   PUT /api/bike-models/:id
 * @desc    Update a bike model
 * @access  Private
 */
router.put('/:id', updateBikeModel);

/**
 * @route   DELETE /api/bike-models/:id
 * @desc    Delete a bike model
 * @access  Private
 */
router.delete('/:id', deleteBikeModel);

export default router; 