import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Custom error class for API errors
 */
export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler for the application
 */
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack || '');
  }

  // Set status code
  const statusCode = err.statusCode || 500;

  // MongoDB duplicate key error
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate key error',
      error: err.message
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      error: err.message
    });
  }

  // Send response
  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
}; 