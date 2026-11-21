import { Router } from 'express';
import { body, query } from 'express-validator';
import { TradingController } from '@/controllers/tradingController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken, requireKYC, requireActiveAccount } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const tradingController = new TradingController();

// All trading routes require authentication, KYC, and active account
router.use(authenticateToken);
router.use(requireKYC);
router.use(requireActiveAccount);

// Validation rules
const createOrderValidation = [
  body('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .matches(/^[A-Z]{1,5}$/)
    .withMessage('Invalid symbol format'),
  body('side')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be buy or sell'),
  body('type')
    .isIn(['market', 'limit', 'stop', 'stop_limit'])
    .withMessage('Invalid order type'),
  body('quantity')
    .isFloat({ min: 0.000001 })
    .withMessage('Quantity must be a positive number'),
  body('price')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('Price must be a positive number'),
  body('stopPrice')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('Stop price must be a positive number'),
  body('timeInForce')
    .isIn(['day', 'gtc', 'ioc', 'fok'])
    .withMessage('Invalid time in force'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date')
];

const orderQueryValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'])
    .withMessage('Invalid status'),
  query('symbol')
    .optional()
    .matches(/^[A-Z]{1,5}$/)
    .withMessage('Invalid symbol format'),
  query('side')
    .optional()
    .isIn(['buy', 'sell'])
    .withMessage('Invalid side'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Order management routes
router.post('/orders', createOrderValidation, validateRequest, asyncHandler(tradingController.createOrder));
router.get('/orders', orderQueryValidation, validateRequest, asyncHandler(tradingController.getOrders));
router.get('/orders/:orderId', asyncHandler(tradingController.getOrder));
router.put('/orders/:orderId', asyncHandler(tradingController.updateOrder));
router.delete('/orders/:orderId', asyncHandler(tradingController.cancelOrder));

// Order history
router.get('/orders/history', orderQueryValidation, validateRequest, asyncHandler(tradingController.getOrderHistory));

// Transactions
router.get('/transactions', asyncHandler(tradingController.getTransactions));
router.get('/transactions/:transactionId', asyncHandler(tradingController.getTransaction));

// Trading account info
router.get('/account', asyncHandler(tradingController.getTradingAccount));
router.get('/buying-power', asyncHandler(tradingController.getBuyingPower));
router.get('/positions', asyncHandler(tradingController.getPositions));
router.get('/positions/:symbol', asyncHandler(tradingController.getPosition));

// Market data for trading
router.get('/market-data/:symbol', asyncHandler(tradingController.getMarketData));
router.get('/market-data/batch', asyncHandler(tradingController.getBatchMarketData));

// Trading tools
router.get('/screener', asyncHandler(tradingController.getStockScreener));
router.get('/scanner', asyncHandler(tradingController.getMarketScanner));
router.get('/alerts', asyncHandler(tradingController.getTradingAlerts));
router.post('/alerts', asyncHandler(tradingController.createTradingAlert));
router.put('/alerts/:alertId', asyncHandler(tradingController.updateTradingAlert));
router.delete('/alerts/:alertId', asyncHandler(tradingController.deleteTradingAlert));

// Paper trading (for practice)
router.get('/paper/account', asyncHandler(tradingController.getPaperAccount));
router.post('/paper/orders', createOrderValidation, validateRequest, asyncHandler(tradingController.createPaperOrder));
router.get('/paper/orders', orderQueryValidation, validateRequest, asyncHandler(tradingController.getPaperOrders));
router.get('/paper/positions', asyncHandler(tradingController.getPaperPositions));

// Trading statistics
router.get('/stats', asyncHandler(tradingController.getTradingStats));
router.get('/performance', asyncHandler(tradingController.getTradingPerformance));

export default router;
