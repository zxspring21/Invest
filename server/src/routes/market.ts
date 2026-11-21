import { Router } from 'express';
import { query } from 'express-validator';
import { MarketController } from '@/controllers/marketController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const marketController = new MarketController();

// Validation rules
const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

const symbolValidation = [
  query('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .matches(/^[A-Z]{1,5}$/)
    .withMessage('Invalid symbol format')
];

const chartValidation = [
  query('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .matches(/^[A-Z]{1,5}$/)
    .withMessage('Invalid symbol format'),
  query('interval')
    .optional()
    .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'])
    .withMessage('Invalid interval'),
  query('range')
    .optional()
    .isIn(['1d', '5d', '1M', '3M', '6M', '1y', '2y', '5y', 'max'])
    .withMessage('Invalid range')
];

// Routes
router.get('/search', searchValidation, validateRequest, asyncHandler(marketController.searchStocks));
router.get('/quote/:symbol', symbolValidation, validateRequest, asyncHandler(marketController.getQuote));
router.get('/quotes', asyncHandler(marketController.getMultipleQuotes));
router.get('/chart/:symbol', chartValidation, validateRequest, asyncHandler(marketController.getChartData));
router.get('/news', optionalAuth, asyncHandler(marketController.getNews));
router.get('/news/:symbol', symbolValidation, validateRequest, asyncHandler(marketController.getStockNews));
router.get('/sectors', asyncHandler(marketController.getSectors));
router.get('/sector/:sector', asyncHandler(marketController.getSectorStocks));
router.get('/gainers', asyncHandler(marketController.getGainers));
router.get('/losers', asyncHandler(marketController.getLosers));
router.get('/most-active', asyncHandler(marketController.getMostActive));
router.get('/trending', asyncHandler(marketController.getTrending));
router.get('/market-status', asyncHandler(marketController.getMarketStatus));
router.get('/earnings-calendar', asyncHandler(marketController.getEarningsCalendar));
router.get('/economic-calendar', asyncHandler(marketController.getEconomicCalendar));

// Watchlist routes (require authentication)
router.get('/watchlist', authenticateToken, asyncHandler(marketController.getWatchlist));
router.post('/watchlist', authenticateToken, asyncHandler(marketController.addToWatchlist));
router.delete('/watchlist/:symbol', authenticateToken, asyncHandler(marketController.removeFromWatchlist));

export default router;
