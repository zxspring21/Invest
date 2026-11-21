import { Router } from 'express';
import { query } from 'express-validator';
import { PortfolioController } from '@/controllers/portfolioController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken, requireKYC, requireActiveAccount } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const portfolioController = new PortfolioController();

// All portfolio routes require authentication, KYC, and active account
router.use(authenticateToken);
router.use(requireKYC);
router.use(requireActiveAccount);

// Validation rules
const portfolioQueryValidation = [
  query('period')
    .optional()
    .isIn(['1d', '1w', '1M', '3M', '6M', '1y', '2y', '5y', 'all'])
    .withMessage('Invalid period'),
  query('includeCash')
    .optional()
    .isBoolean()
    .withMessage('includeCash must be boolean')
];

// Portfolio overview
router.get('/overview', portfolioQueryValidation, validateRequest, asyncHandler(portfolioController.getPortfolioOverview));
router.get('/summary', asyncHandler(portfolioController.getPortfolioSummary));

// Positions
router.get('/positions', asyncHandler(portfolioController.getPositions));
router.get('/positions/:symbol', asyncHandler(portfolioController.getPosition));
router.get('/positions/performance', asyncHandler(portfolioController.getPositionsPerformance));

// Portfolio performance and analytics
router.get('/performance', portfolioQueryValidation, validateRequest, asyncHandler(portfolioController.getPerformance));
router.get('/analytics', asyncHandler(portfolioController.getAnalytics));
router.get('/allocation', asyncHandler(portfolioController.getAllocation));
router.get('/diversification', asyncHandler(portfolioController.getDiversification));

// Portfolio history
router.get('/history', portfolioQueryValidation, validateRequest, asyncHandler(portfolioController.getPortfolioHistory));
router.get('/transactions', asyncHandler(portfolioController.getPortfolioTransactions));

// Cash and buying power
router.get('/cash', asyncHandler(portfolioController.getCashBalance));
router.get('/buying-power', asyncHandler(portfolioController.getBuyingPower));

// Portfolio goals and targets
router.get('/goals', asyncHandler(portfolioController.getPortfolioGoals));
router.post('/goals', asyncHandler(portfolioController.createPortfolioGoal));
router.put('/goals/:goalId', asyncHandler(portfolioController.updatePortfolioGoal));
router.delete('/goals/:goalId', asyncHandler(portfolioController.deletePortfolioGoal));

// Portfolio rebalancing
router.get('/rebalance', asyncHandler(portfolioController.getRebalanceSuggestions));
router.post('/rebalance', asyncHandler(portfolioController.executeRebalance));

// Tax information
router.get('/tax', asyncHandler(portfolioController.getTaxInformation));
router.get('/tax/lot', asyncHandler(portfolioController.getTaxLots));
router.get('/tax/realized', asyncHandler(portfolioController.getRealizedGains));

// Portfolio reports
router.get('/reports', asyncHandler(portfolioController.getPortfolioReports));
router.post('/reports/generate', asyncHandler(portfolioController.generatePortfolioReport));

// Portfolio comparison
router.get('/compare', asyncHandler(portfolioController.comparePortfolios));
router.get('/benchmark', asyncHandler(portfolioController.getBenchmarkComparison));

export default router;
