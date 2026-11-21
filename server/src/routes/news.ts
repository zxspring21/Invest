import { Router } from 'express';
import { query } from 'express-validator';
import { NewsController } from '@/controllers/newsController';
import { validateRequest } from '@/middleware/validateRequest';
import { optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const newsController = new NewsController();

// Validation rules
const newsQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('category')
    .optional()
    .isIn(['market', 'earnings', 'ipo', 'mergers', 'dividends', 'analyst', 'economic'])
    .withMessage('Invalid category'),
  query('sentiment')
    .optional()
    .isIn(['positive', 'negative', 'neutral'])
    .withMessage('Invalid sentiment'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

const symbolValidation = [
  query('symbol')
    .notEmpty()
    .withMessage('Symbol is required')
    .matches(/^[A-Z]{1,5}$/)
    .withMessage('Invalid symbol format')
];

// General news routes (no authentication required)
router.get('/', newsQueryValidation, validateRequest, asyncHandler(newsController.getNews));
router.get('/featured', asyncHandler(newsController.getFeaturedNews));
router.get('/trending', asyncHandler(newsController.getTrendingNews));
router.get('/categories', asyncHandler(newsController.getNewsCategories));

// Symbol-specific news
router.get('/symbol/:symbol', symbolValidation, validateRequest, asyncHandler(newsController.getStockNews));

// News by category
router.get('/category/:category', newsQueryValidation, validateRequest, asyncHandler(newsController.getNewsByCategory));

// News search
router.get('/search', asyncHandler(newsController.searchNews));

// News article details
router.get('/article/:articleId', asyncHandler(newsController.getArticle));

// User-specific news (requires authentication)
router.use(optionalAuth);

// Personalized news feed
router.get('/feed', newsQueryValidation, validateRequest, asyncHandler(newsController.getPersonalizedFeed));

// News preferences
router.get('/preferences', asyncHandler(newsController.getNewsPreferences));
router.put('/preferences', asyncHandler(newsController.updateNewsPreferences));

// News bookmarks
router.get('/bookmarks', asyncHandler(newsController.getBookmarkedNews));
router.post('/bookmarks/:articleId', asyncHandler(newsController.bookmarkArticle));
router.delete('/bookmarks/:articleId', asyncHandler(newsController.unbookmarkArticle));

// News alerts
router.get('/alerts', asyncHandler(newsController.getNewsAlerts));
router.post('/alerts', asyncHandler(newsController.createNewsAlert));
router.put('/alerts/:alertId', asyncHandler(newsController.updateNewsAlert));
router.delete('/alerts/:alertId', asyncHandler(newsController.deleteNewsAlert));

// News history
router.get('/history', asyncHandler(newsController.getNewsHistory));

export default router;
