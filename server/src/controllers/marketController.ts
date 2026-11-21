import { Request, Response } from 'express';
import { AuthRequest, StockQuote, StockSearchResult, ChartData, NewsArticle } from '@/types';
import { MarketService } from '@/services/marketService';
import { executeQuery } from '@/utils/database';
import { cacheService } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { CustomError } from '@/middleware/errorHandler';

export class MarketController {
  private marketService: MarketService;

  constructor() {
    this.marketService = new MarketService();
  }

  // Search stocks
  async searchStocks(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 10 } = req.query;
      const searchQuery = query as string;

      // Check cache first
      const cacheKey = `search:${searchQuery}:${limit}`;
      const cachedResults = await cacheService.get<StockSearchResult[]>(cacheKey);

      if (cachedResults) {
        res.json({
          success: true,
          data: cachedResults,
          timestamp: new Date()
        });
        return;
      }

      // Search stocks
      const results = await this.marketService.searchStocks(searchQuery, parseInt(limit as string));

      // Cache results for 5 minutes
      await cacheService.set(cacheKey, results, 300);

      res.json({
        success: true,
        data: results,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Search stocks error:', error);
      throw new CustomError('Failed to search stocks', 500);
    }
  }

  // Get stock quote
  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const symbolUpper = symbol.toUpperCase();

      // Check cache first
      const cacheKey = `quote:${symbolUpper}`;
      const cachedQuote = await cacheService.get<StockQuote>(cacheKey);

      if (cachedQuote) {
        res.json({
          success: true,
          data: cachedQuote,
          timestamp: new Date()
        });
        return;
      }

      // Get quote from external API
      const quote = await this.marketService.getQuote(symbolUpper);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Stock not found',
          timestamp: new Date()
        });
        return;
      }

      // Cache quote for 1 minute
      await cacheService.set(cacheKey, quote, 60);

      res.json({
        success: true,
        data: quote,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get quote error:', error);
      throw new CustomError('Failed to get stock quote', 500);
    }
  }

  // Get multiple quotes
  async getMultipleQuotes(req: Request, res: Response): Promise<void> {
    try {
      const { symbols } = req.query;
      const symbolList = (symbols as string).split(',').map(s => s.trim().toUpperCase());

      if (symbolList.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Symbols parameter is required',
          timestamp: new Date()
        });
        return;
      }

      if (symbolList.length > 50) {
        res.status(400).json({
          success: false,
          message: 'Maximum 50 symbols allowed',
          timestamp: new Date()
        });
        return;
      }

      // Get quotes
      const quotes = await this.marketService.getMultipleQuotes(symbolList);

      res.json({
        success: true,
        data: quotes,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get multiple quotes error:', error);
      throw new CustomError('Failed to get quotes', 500);
    }
  }

  // Get chart data
  async getChartData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { interval = '1d', range = '1M' } = req.query;
      const symbolUpper = symbol.toUpperCase();

      // Check cache first
      const cacheKey = `chart:${symbolUpper}:${interval}:${range}`;
      const cachedData = await cacheService.get<ChartData[]>(cacheKey);

      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          timestamp: new Date()
        });
        return;
      }

      // Get chart data
      const chartData = await this.marketService.getChartData(
        symbolUpper,
        interval as string,
        range as string
      );

      // Cache for 5 minutes
      await cacheService.set(cacheKey, chartData, 300);

      res.json({
        success: true,
        data: chartData,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get chart data error:', error);
      throw new CustomError('Failed to get chart data', 500);
    }
  }

  // Get market news
  async getNews(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20, category, sentiment } = req.query;

      // Check cache first
      const cacheKey = `news:${limit}:${category}:${sentiment}`;
      const cachedNews = await cacheService.get<NewsArticle[]>(cacheKey);

      if (cachedNews) {
        res.json({
          success: true,
          data: cachedNews,
          timestamp: new Date()
        });
        return;
      }

      // Get news from database or external API
      const news = await this.marketService.getNews(
        parseInt(limit as string),
        category as string,
        sentiment as string
      );

      // Cache for 10 minutes
      await cacheService.set(cacheKey, news, 600);

      res.json({
        success: true,
        data: news,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get news error:', error);
      throw new CustomError('Failed to get news', 500);
    }
  }

  // Get stock-specific news
  async getStockNews(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { limit = 10 } = req.query;
      const symbolUpper = symbol.toUpperCase();

      // Check cache first
      const cacheKey = `news:${symbolUpper}:${limit}`;
      const cachedNews = await cacheService.get<NewsArticle[]>(cacheKey);

      if (cachedNews) {
        res.json({
          success: true,
          data: cachedNews,
          timestamp: new Date()
        });
        return;
      }

      // Get stock news
      const news = await this.marketService.getStockNews(symbolUpper, parseInt(limit as string));

      // Cache for 15 minutes
      await cacheService.set(cacheKey, news, 900);

      res.json({
        success: true,
        data: news,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get stock news error:', error);
      throw new CustomError('Failed to get stock news', 500);
    }
  }

  // Get market sectors
  async getSectors(req: Request, res: Response): Promise<void> {
    try {
      // Check cache first
      const cacheKey = 'sectors';
      const cachedSectors = await cacheService.get(cacheKey);

      if (cachedSectors) {
        res.json({
          success: true,
          data: cachedSectors,
          timestamp: new Date()
        });
        return;
      }

      // Get sectors
      const sectors = await this.marketService.getSectors();

      // Cache for 1 hour
      await cacheService.set(cacheKey, sectors, 3600);

      res.json({
        success: true,
        data: sectors,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get sectors error:', error);
      throw new CustomError('Failed to get sectors', 500);
    }
  }

  // Get sector stocks
  async getSectorStocks(req: Request, res: Response): Promise<void> {
    try {
      const { sector } = req.params;
      const { limit = 20 } = req.query;

      // Check cache first
      const cacheKey = `sector:${sector}:${limit}`;
      const cachedStocks = await cacheService.get(cacheKey);

      if (cachedStocks) {
        res.json({
          success: true,
          data: cachedStocks,
          timestamp: new Date()
        });
        return;
      }

      // Get sector stocks
      const stocks = await this.marketService.getSectorStocks(sector, parseInt(limit as string));

      // Cache for 30 minutes
      await cacheService.set(cacheKey, stocks, 1800);

      res.json({
        success: true,
        data: stocks,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get sector stocks error:', error);
      throw new CustomError('Failed to get sector stocks', 500);
    }
  }

  // Get top gainers
  async getGainers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      // Check cache first
      const cacheKey = `gainers:${limit}`;
      const cachedGainers = await cacheService.get(cacheKey);

      if (cachedGainers) {
        res.json({
          success: true,
          data: cachedGainers,
          timestamp: new Date()
        });
        return;
      }

      // Get gainers
      const gainers = await this.marketService.getGainers(parseInt(limit as string));

      // Cache for 5 minutes
      await cacheService.set(cacheKey, gainers, 300);

      res.json({
        success: true,
        data: gainers,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get gainers error:', error);
      throw new CustomError('Failed to get gainers', 500);
    }
  }

  // Get top losers
  async getLosers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      // Check cache first
      const cacheKey = `losers:${limit}`;
      const cachedLosers = await cacheService.get(cacheKey);

      if (cachedLosers) {
        res.json({
          success: true,
          data: cachedLosers,
          timestamp: new Date()
        });
        return;
      }

      // Get losers
      const losers = await this.marketService.getLosers(parseInt(limit as string));

      // Cache for 5 minutes
      await cacheService.set(cacheKey, losers, 300);

      res.json({
        success: true,
        data: losers,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get losers error:', error);
      throw new CustomError('Failed to get losers', 500);
    }
  }

  // Get most active stocks
  async getMostActive(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      // Check cache first
      const cacheKey = `most_active:${limit}`;
      const cachedActive = await cacheService.get(cacheKey);

      if (cachedActive) {
        res.json({
          success: true,
          data: cachedActive,
          timestamp: new Date()
        });
        return;
      }

      // Get most active
      const mostActive = await this.marketService.getMostActive(parseInt(limit as string));

      // Cache for 5 minutes
      await cacheService.set(cacheKey, mostActive, 300);

      res.json({
        success: true,
        data: mostActive,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get most active error:', error);
      throw new CustomError('Failed to get most active stocks', 500);
    }
  }

  // Get trending stocks
  async getTrending(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      // Check cache first
      const cacheKey = `trending:${limit}`;
      const cachedTrending = await cacheService.get(cacheKey);

      if (cachedTrending) {
        res.json({
          success: true,
          data: cachedTrending,
          timestamp: new Date()
        });
        return;
      }

      // Get trending
      const trending = await this.marketService.getTrending(parseInt(limit as string));

      // Cache for 10 minutes
      await cacheService.set(cacheKey, trending, 600);

      res.json({
        success: true,
        data: trending,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get trending error:', error);
      throw new CustomError('Failed to get trending stocks', 500);
    }
  }

  // Get market status
  async getMarketStatus(req: Request, res: Response): Promise<void> {
    try {
      // Check cache first
      const cacheKey = 'market_status';
      const cachedStatus = await cacheService.get(cacheKey);

      if (cachedStatus) {
        res.json({
          success: true,
          data: cachedStatus,
          timestamp: new Date()
        });
        return;
      }

      // Get market status
      const status = await this.marketService.getMarketStatus();

      // Cache for 1 minute
      await cacheService.set(cacheKey, status, 60);

      res.json({
        success: true,
        data: status,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get market status error:', error);
      throw new CustomError('Failed to get market status', 500);
    }
  }

  // Get earnings calendar
  async getEarningsCalendar(req: Request, res: Response): Promise<void> {
    try {
      const { date, limit = 50 } = req.query;

      // Check cache first
      const cacheKey = `earnings:${date}:${limit}`;
      const cachedEarnings = await cacheService.get(cacheKey);

      if (cachedEarnings) {
        res.json({
          success: true,
          data: cachedEarnings,
          timestamp: new Date()
        });
        return;
      }

      // Get earnings calendar
      const earnings = await this.marketService.getEarningsCalendar(
        date as string,
        parseInt(limit as string)
      );

      // Cache for 1 hour
      await cacheService.set(cacheKey, earnings, 3600);

      res.json({
        success: true,
        data: earnings,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get earnings calendar error:', error);
      throw new CustomError('Failed to get earnings calendar', 500);
    }
  }

  // Get economic calendar
  async getEconomicCalendar(req: Request, res: Response): Promise<void> {
    try {
      const { date, limit = 50 } = req.query;

      // Check cache first
      const cacheKey = `economic:${date}:${limit}`;
      const cachedEconomic = await cacheService.get(cacheKey);

      if (cachedEconomic) {
        res.json({
          success: true,
          data: cachedEconomic,
          timestamp: new Date()
        });
        return;
      }

      // Get economic calendar
      const economic = await this.marketService.getEconomicCalendar(
        date as string,
        parseInt(limit as string)
      );

      // Cache for 1 hour
      await cacheService.set(cacheKey, economic, 3600);

      res.json({
        success: true,
        data: economic,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get economic calendar error:', error);
      throw new CustomError('Failed to get economic calendar', 500);
    }
  }

  // Get user watchlist
  async getWatchlist(req: AuthRequest, res: Response): Promise<void> {
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

      // Get watchlist from database
      const watchlists = await executeQuery(
        'SELECT * FROM watchlists WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      res.json({
        success: true,
        data: watchlists,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get watchlist error:', error);
      throw new CustomError('Failed to get watchlist', 500);
    }
  }

  // Add to watchlist
  async addToWatchlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { symbol, watchlistName = 'default' } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date()
        });
        return;
      }

      if (!symbol) {
        res.status(400).json({
          success: false,
          message: 'Symbol is required',
          timestamp: new Date()
        });
        return;
      }

      const symbolUpper = symbol.toUpperCase();

      // Check if watchlist exists
      let watchlists = await executeQuery(
        'SELECT * FROM watchlists WHERE user_id = $1 AND name = $2',
        [userId, watchlistName]
      );

      if (watchlists.length === 0) {
        // Create new watchlist
        await executeQuery(
          'INSERT INTO watchlists (user_id, name, symbols) VALUES ($1, $2, $3)',
          [userId, watchlistName, [symbolUpper]]
        );
      } else {
        // Add to existing watchlist
        const existingSymbols = watchlists[0].symbols || [];
        if (!existingSymbols.includes(symbolUpper)) {
          const updatedSymbols = [...existingSymbols, symbolUpper];
          await executeQuery(
            'UPDATE watchlists SET symbols = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND name = $3',
            [updatedSymbols, userId, watchlistName]
          );
        }
      }

      res.json({
        success: true,
        message: 'Symbol added to watchlist',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Add to watchlist error:', error);
      throw new CustomError('Failed to add to watchlist', 500);
    }
  }

  // Remove from watchlist
  async removeFromWatchlist(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { symbol } = req.params;
      const { watchlistName = 'default' } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date()
        });
        return;
      }

      const symbolUpper = symbol.toUpperCase();

      // Get watchlist
      const watchlists = await executeQuery(
        'SELECT * FROM watchlists WHERE user_id = $1 AND name = $2',
        [userId, watchlistName as string]
      );

      if (watchlists.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Watchlist not found',
          timestamp: new Date()
        });
        return;
      }

      // Remove symbol from watchlist
      const existingSymbols = watchlists[0].symbols || [];
      const updatedSymbols = existingSymbols.filter((s: string) => s !== symbolUpper);

      await executeQuery(
        'UPDATE watchlists SET symbols = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND name = $3',
        [updatedSymbols, userId, watchlistName as string]
      );

      res.json({
        success: true,
        message: 'Symbol removed from watchlist',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Remove from watchlist error:', error);
      throw new CustomError('Failed to remove from watchlist', 500);
    }
  }
}
