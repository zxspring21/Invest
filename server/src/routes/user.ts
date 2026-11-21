import { Router } from 'express';
import { UserController } from '@/controllers/userController';
import { authenticateToken } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', asyncHandler(userController.updateProfile));
router.post('/profile/avatar', asyncHandler(userController.uploadAvatar));

// Account settings
router.get('/settings', asyncHandler(userController.getSettings));
router.put('/settings', asyncHandler(userController.updateSettings));

// KYC (Know Your Customer) routes
router.get('/kyc/status', asyncHandler(userController.getKYCStatus));
router.post('/kyc/submit', asyncHandler(userController.submitKYC));
router.post('/kyc/documents', asyncHandler(userController.uploadKYCDocuments));

// Notification preferences
router.get('/notifications', asyncHandler(userController.getNotificationPreferences));
router.put('/notifications', asyncHandler(userController.updateNotificationPreferences));

// Security settings
router.get('/security', asyncHandler(userController.getSecuritySettings));
router.post('/security/2fa/enable', asyncHandler(userController.enable2FA));
router.post('/security/2fa/disable', asyncHandler(userController.disable2FA));
router.post('/security/2fa/verify', asyncHandler(userController.verify2FA));

// Account activity
router.get('/activity', asyncHandler(userController.getAccountActivity));
router.get('/sessions', asyncHandler(userController.getActiveSessions));
router.delete('/sessions/:sessionId', asyncHandler(userController.revokeSession));

// Referral system
router.get('/referrals', asyncHandler(userController.getReferrals));
router.get('/referral-code', asyncHandler(userController.getReferralCode));

export default router;
