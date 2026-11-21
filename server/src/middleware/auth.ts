import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload, User } from '@/types';
import { executeQuery } from '@/utils/database';
import { logger } from '@/utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Verify JWT token
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        timestamp: new Date()
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Get user from database
    const users = await executeQuery<User>(
      'SELECT * FROM users WHERE id = $1 AND account_status = $2',
      [decoded.userId, 'active']
    );

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid token or user not found',
        timestamp: new Date()
      });
      return;
    }

    const user = users[0];
    
    // Remove sensitive data
    delete (user as any).password_hash;
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: new Date()
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        timestamp: new Date()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        timestamp: new Date()
      });
    }
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    const users = await executeQuery<User>(
      'SELECT * FROM users WHERE id = $1 AND account_status = $2',
      [decoded.userId, 'active']
    );

    if (users.length > 0) {
      const user = users[0];
      delete (user as any).password_hash;
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Check if user has required role/permission
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date()
      });
      return;
    }

    // For now, we'll implement basic permission checking
    // In a real application, you'd have a more sophisticated permission system
    const userPermissions = getUserPermissions(req.user);
    
    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        timestamp: new Date()
      });
      return;
    }

    next();
  };
};

// Check if user's KYC is verified
export const requireKYC = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date()
    });
    return;
  }

  if (req.user.kycStatus !== 'verified') {
    res.status(403).json({
      success: false,
      message: 'KYC verification required for this action',
      timestamp: new Date()
    });
    return;
  }

  next();
};

// Check if account is active
export const requireActiveAccount = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      timestamp: new Date()
    });
    return;
  }

  if (req.user.accountStatus !== 'active') {
    res.status(403).json({
      success: false,
      message: 'Account is not active',
      timestamp: new Date()
    });
    return;
  }

  next();
};

// Helper function to get user permissions
function getUserPermissions(user: User): string[] {
  const permissions = ['read:profile', 'update:profile'];
  
  if (user.kycStatus === 'verified') {
    permissions.push('trade:stocks', 'trade:options', 'withdraw:funds');
  }
  
  if (user.accountStatus === 'active') {
    permissions.push('access:platform');
  }
  
  return permissions;
}

// Rate limiting for authentication endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically be handled by express-rate-limit middleware
  // but we can add custom logic here if needed
  next();
};

// Log authentication events
export const logAuthEvent = (event: string, userId?: string, ip?: string) => {
  logger.info({
    message: `Auth Event: ${event}`,
    userId,
    ip,
    timestamp: new Date().toISOString(),
  });
};
