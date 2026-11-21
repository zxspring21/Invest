import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, User, LoginRequest, RegisterRequest, JWTPayload } from '@/types';
import { executeQuery, executeTransaction } from '@/utils/database';
import { cacheService } from '@/utils/redis';
import { logger, logAuthEvent } from '@/utils/logger';
import { CustomError } from '@/middleware/errorHandler';

export class AuthController {
  // Register new user
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, username, firstName, lastName, phone, dateOfBirth }: RegisterRequest = req.body;

    try {
      // Check if user already exists
      const existingUsers = await executeQuery<User>(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUsers.length > 0) {
        res.status(409).json({
          success: false,
          message: 'User with this email or username already exists',
          timestamp: new Date()
        });
        return;
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      await executeTransaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, email, username, password_hash, first_name, last_name, phone, date_of_birth, kyc_status, account_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [userId, email, username, passwordHash, firstName, lastName, phone, dateOfBirth, 'pending', 'pending_verification']
        );
      });

      // Generate tokens
      const tokens = await this.generateTokens(userId, email);

      // Log registration event
      logAuthEvent('user_registered', userId, req.ip);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: userId,
            email,
            username,
            firstName,
            lastName,
            kycStatus: 'pending',
            accountStatus: 'pending_verification'
          },
          tokens
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Registration error:', error);
      throw new CustomError('Registration failed', 500);
    }
  }

  // Login user
  async login(req: Request, res: Response): Promise<void> {
    const { email, password, rememberMe }: LoginRequest = req.body;

    try {
      // Find user
      const users = await executeQuery<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (users.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          timestamp: new Date()
        });
        return;
      }

      const user = users[0];

      // Check password
      const isValidPassword = await bcrypt.compare(password, (user as any).password_hash);
      if (!isValidPassword) {
        logAuthEvent('login_failed_invalid_password', user.id, req.ip);
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          timestamp: new Date()
        });
        return;
      }

      // Check account status
      if (user.accountStatus === 'suspended') {
        res.status(403).json({
          success: false,
          message: 'Account is suspended',
          timestamp: new Date()
        });
        return;
      }

      if (user.accountStatus === 'closed') {
        res.status(403).json({
          success: false,
          message: 'Account is closed',
          timestamp: new Date()
        });
        return;
      }

      // Update last login
      await executeQuery(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokens = await this.generateTokens(user.id, email, rememberMe);

      // Remove sensitive data
      delete (user as any).password_hash;

      // Log successful login
      logAuthEvent('login_success', user.id, req.ip);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          tokens
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Login error:', error);
      throw new CustomError('Login failed', 500);
    }
  }

  // Logout user
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        // Add token to blacklist
        const decoded = jwt.decode(token) as JWTPayload;
        if (decoded && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await cacheService.set(`blacklist:${token}`, true, ttl);
          }
        }
      }

      // Log logout event
      if (userId) {
        logAuthEvent('logout', userId, req.ip);
      }

      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Logout error:', error);
      throw new CustomError('Logout failed', 500);
    }
  }

  // Refresh access token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token required',
          timestamp: new Date()
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as JWTPayload;

      // Check if refresh token is blacklisted
      const isBlacklisted = await cacheService.exists(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          timestamp: new Date()
        });
        return;
      }

      // Get user
      const users = await executeQuery<User>(
        'SELECT * FROM users WHERE id = $1 AND account_status = $2',
        [decoded.userId, 'active']
      );

      if (users.length === 0) {
        res.status(401).json({
          success: false,
          message: 'User not found or inactive',
          timestamp: new Date()
        });
        return;
      }

      const user = users[0];

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Blacklist old refresh token
      const oldTokenExp = decoded.exp - Math.floor(Date.now() / 1000);
      if (oldTokenExp > 0) {
        await cacheService.set(`blacklist:${refreshToken}`, true, oldTokenExp);
      }

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          timestamp: new Date()
        });
      } else {
        throw new CustomError('Token refresh failed', 500);
      }
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Check if user exists
      const users = await executeQuery<User>(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date()
      });

      if (users.length > 0) {
        const user = users[0];
        
        // Generate reset token
        const resetToken = uuidv4();
        const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token in cache
        await cacheService.set(`reset:${resetToken}`, user.id, 3600);

        // Log password reset request
        logAuthEvent('password_reset_requested', user.id, req.ip);

        // In a real application, you would send an email here
        logger.info(`Password reset token for ${email}: ${resetToken}`);
      }

    } catch (error) {
      logger.error('Forgot password error:', error);
      throw new CustomError('Password reset request failed', 500);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const userId = await cacheService.get<string>(`reset:${token}`);
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          timestamp: new Date()
        });
        return;
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password
      await executeQuery(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      );

      // Remove reset token
      await cacheService.del(`reset:${token}`);

      // Log password reset
      logAuthEvent('password_reset_completed', userId, req.ip);

      res.json({
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Reset password error:', error);
      throw new CustomError('Password reset failed', 500);
    }
  }

  // Change password
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date()
        });
        return;
      }

      // Get current password hash
      const users = await executeQuery<User>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (users.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date()
        });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, (users[0] as any).password_hash);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          timestamp: new Date()
        });
        return;
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await executeQuery(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      );

      // Log password change
      logAuthEvent('password_changed', userId, req.ip);

      res.json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Change password error:', error);
      throw new CustomError('Password change failed', 500);
    }
  }

  // Verify email
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      // Verify email token
      const userId = await cacheService.get<string>(`email_verify:${token}`);
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
          timestamp: new Date()
        });
        return;
      }

      // Update user email verification status
      await executeQuery(
        'UPDATE users SET account_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', userId]
      );

      // Remove verification token
      await cacheService.del(`email_verify:${token}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Email verification error:', error);
      throw new CustomError('Email verification failed', 500);
    }
  }

  // Resend verification email
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Check if user exists and needs verification
      const users = await executeQuery<User>(
        'SELECT id, email FROM users WHERE email = $1 AND account_status = $2',
        [email, 'pending_verification']
      );

      if (users.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found or already verified',
          timestamp: new Date()
        });
        return;
      }

      const user = users[0];

      // Generate verification token
      const verifyToken = uuidv4();
      await cacheService.set(`email_verify:${verifyToken}`, user.id, 3600);

      // In a real application, you would send an email here
      logger.info(`Email verification token for ${email}: ${verifyToken}`);

      res.json({
        success: true,
        message: 'Verification email sent',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Resend verification error:', error);
      throw new CustomError('Failed to resend verification email', 500);
    }
  }

  // Get user profile
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date()
        });
        return;
      }

      const users = await executeQuery<User>(
        'SELECT id, email, username, first_name, last_name, phone, date_of_birth, address, kyc_status, account_status, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [userId]
      );

      if (users.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date()
        });
        return;
      }

      const user = users[0];

      res.json({
        success: true,
        data: { user },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      throw new CustomError('Failed to get profile', 500);
    }
  }

  // Update user profile
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, phone, dateOfBirth, address } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date()
        });
        return;
      }

      // Update user profile
      await executeQuery(
        `UPDATE users 
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone = COALESCE($3, phone),
             date_of_birth = COALESCE($4, date_of_birth),
             address = COALESCE($5, address),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [firstName, lastName, phone, dateOfBirth, address, userId]
      );

      // Get updated user
      const users = await executeQuery<User>(
        'SELECT id, email, username, first_name, last_name, phone, date_of_birth, address, kyc_status, account_status, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: users[0] },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      throw new CustomError('Failed to update profile', 500);
    }
  }

  // Generate JWT tokens
  private async generateTokens(userId: string, email: string, rememberMe: boolean = false): Promise<{ accessToken: string; refreshToken: string }> {
    const accessTokenExpiry = rememberMe ? '7d' : '24h';
    const refreshTokenExpiry = '30d';

    const accessToken = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }
}
