import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { AppError } from '@/types';

// Custom error class
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle different types of errors
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
  }

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message,
    }),
    timestamp: new Date(),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Validation error handler
export const validationErrorHandler = (errors: any[]) => {
  const formattedErrors = errors.map(error => ({
    field: error.path,
    message: error.message,
    value: error.value,
  }));

  return new CustomError('Validation failed', 400, true);
};

// Database error handler
export const databaseErrorHandler = (error: any) => {
  if (error.code === '23505') { // Unique constraint violation
    return new CustomError('Duplicate entry', 409);
  } else if (error.code === '23503') { // Foreign key constraint violation
    return new CustomError('Referenced record not found', 400);
  } else if (error.code === '23502') { // Not null constraint violation
    return new CustomError('Required field missing', 400);
  } else {
    return new CustomError('Database error', 500);
  }
};

// External API error handler
export const externalAPIErrorHandler = (error: any, service: string) => {
  logger.error(`External API error from ${service}:`, error);
  
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.response.statusText;
    
    if (status === 401) {
      return new CustomError(`Authentication failed with ${service}`, 401);
    } else if (status === 403) {
      return new CustomError(`Access forbidden for ${service}`, 403);
    } else if (status === 404) {
      return new CustomError(`Resource not found in ${service}`, 404);
    } else if (status === 429) {
      return new CustomError(`Rate limit exceeded for ${service}`, 429);
    } else if (status >= 500) {
      return new CustomError(`${service} service unavailable`, 503);
    } else {
      return new CustomError(`${service} error: ${message}`, status);
    }
  } else if (error.request) {
    return new CustomError(`Network error connecting to ${service}`, 503);
  } else {
    return new CustomError(`Unexpected error with ${service}`, 500);
  }
};

// Trading error handler
export const tradingErrorHandler = (error: any) => {
  if (error.message.includes('insufficient funds')) {
    return new CustomError('Insufficient funds for this trade', 400);
  } else if (error.message.includes('market closed')) {
    return new CustomError('Market is currently closed', 400);
  } else if (error.message.includes('invalid symbol')) {
    return new CustomError('Invalid stock symbol', 400);
  } else if (error.message.includes('order not found')) {
    return new CustomError('Order not found', 404);
  } else if (error.message.includes('order already filled')) {
    return new CustomError('Order has already been filled', 400);
  } else {
    return new CustomError('Trading error occurred', 500);
  }
};

// Rate limit error handler
export const rateLimitErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: req.get('Retry-After'),
    timestamp: new Date(),
  });
};
