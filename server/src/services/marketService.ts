import axios from 'axios';
import { StockQuote, StockSearchResult, ChartData, NewsArticle } from '@/types';
import { executeQuery } from '@/utils/database';
import { logger } from '@/utils/logger';
import { externalAPIErrorHandler } from '@/middleware/errorHandler';

export class MarketService {
  private alphaVantageApiKey: string;
  private finnhubApiKey: string;
  private iexCloudApiKey: string;

  constructor() {
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    this.finnhubApiKey = process.env.FINNHUB_API_KEY || '';
    this.iexCloudApiKey = process.env.IEX_CLOUD_API_KEY || '';
  }

  // Search stocks
  async searchStocks(query: string, limit: number = 10): Promise<StockSearchResult[]> {
    try {
      // Try multiple APIs for better coverage
      const results: StockSearchResult[] = [];

      // Use IEX Cloud for search
      if (this.iexCloudApiKey) {
        try {
          const response = await axios.get(
            `https://cloud.iexapis.com/stable/search/${encodeURIComponent(query)}?token=${this.iexCloudApiKey}`
          );
          
          if (response.data && Array.isArray(response.data)) {
            results.push(...response.data.slice(0, limit).map((item: any) => ({
              symbol: item.symbol,
              name: item.securityName,
              exchange: item.exchange,
              type: 'stock',
              region: 'US',
              currency: 'USD',
              matchScore: item.score || 0.8
            })));
          }
        } catch (error) {
          logger.warn('IEX Cloud search failed:', error);
        }
      }

      // Use Alpha Vantage as fallback
      if (results.length === 0 && this.alphaVantageApiKey) {
        try {
          const response = await axios.get(
            `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.alphaVantageApiKey}`
          );
          
          if (response.data && response.data.bestMatches) {
            results.push(...response.data.bestMatches.slice(0, limit).map((item: any) => ({
              symbol: item['1. symbol'],
              name: item['2. name'],
              exchange: item['4. region'],
              type: item['3. type'],
              region: item['4. region'],
              currency: item['8. currency'],
              matchScore: parseFloat(item['9. matchScore']) || 0.5
            })));
          }
        } catch (error) {
          logger.warn('Alpha Vantage search failed:', error);
        }
      }

      // Mock data if no API available
      if (results.length === 0) {
        results.push(...this.getMockSearchResults(query, limit));
      }

      return results.slice(0, limit);
    } catch (error) {
      logger.error('Search stocks error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get stock quote
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // Try IEX Cloud first
      if (this.iexCloudApiKey) {
        try {
          const response = await axios.get(
            `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${this.iexCloudApiKey}`
          );
          
          if (response.data) {
            return this.formatIEXQuote(response.data);
          }
        } catch (error) {
          logger.warn('IEX Cloud quote failed:', error);
        }
      }

      // Try Finnhub as fallback
      if (this.finnhubApiKey) {
        try {
          const response = await axios.get(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubApiKey}`
          );
          
          if (response.data && response.data.c !== 0) {
            return this.formatFinnhubQuote(symbol, response.data);
          }
        } catch (error) {
          logger.warn('Finnhub quote failed:', error);
        }
      }

      // Try Alpha Vantage as last resort
      if (this.alphaVantageApiKey) {
        try {
          const response = await axios.get(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageApiKey}`
          );
          
          if (response.data && response.data['Global Quote']) {
            return this.formatAlphaVantageQuote(response.data['Global Quote']);
          }
        } catch (error) {
          logger.warn('Alpha Vantage quote failed:', error);
        }
      }

      // Return mock data if no API available
      return this.getMockQuote(symbol);
    } catch (error) {
      logger.error('Get quote error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get multiple quotes
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const quotes: StockQuote[] = [];

      // Use IEX Cloud for batch quotes
      if (this.iexCloudApiKey && symbols.length <= 100) {
        try {
          const response = await axios.get(
            `https://cloud.iexapis.com/stable/stock/market/batch?symbols=${symbols.join(',')}&types=quote&token=${this.iexCloudApiKey}`
          );
          
          if (response.data) {
            for (const [symbol, data] of Object.entries(response.data)) {
              if ((data as any).quote) {
                quotes.push(this.formatIEXQuote((data as any).quote));
              }
            }
          }
        } catch (error) {
          logger.warn('IEX Cloud batch quotes failed:', error);
        }
      }

      // Fallback to individual quotes
      if (quotes.length === 0) {
        for (const symbol of symbols) {
          try {
            const quote = await this.getQuote(symbol);
            if (quote) {
              quotes.push(quote);
            }
          } catch (error) {
            logger.warn(`Failed to get quote for ${symbol}:`, error);
          }
        }
      }

      return quotes;
    } catch (error) {
      logger.error('Get multiple quotes error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get chart data
  async getChartData(symbol: string, interval: string, range: string): Promise<ChartData[]> {
    try {
      // Use IEX Cloud for chart data
      if (this.iexCloudApiKey) {
        try {
          const response = await axios.get(
            `https://cloud.iexapis.com/stable/stock/${symbol}/chart/${range}?token=${this.iexCloudApiKey}`
          );
          
          if (response.data && Array.isArray(response.data)) {
            return response.data.map((item: any) => ({
              timestamp: new Date(item.date),
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume
            }));
          }
        } catch (error) {
          logger.warn('IEX Cloud chart data failed:', error);
        }
      }

      // Return mock chart data
      return this.getMockChartData(symbol, interval, range);
    } catch (error) {
      logger.error('Get chart data error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get market news
  async getNews(limit: number = 20, category?: string, sentiment?: string): Promise<NewsArticle[]> {
    try {
      // Get news from database first
      let query = 'SELECT * FROM news_articles WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (sentiment) {
        paramCount++;
        query += ` AND sentiment = $${paramCount}`;
        params.push(sentiment);
      }

      query += ` ORDER BY published_at DESC LIMIT $${paramCount + 1}`;
      params.push(limit);

      const news = await executeQuery<NewsArticle>(query, params);

      if (news.length > 0) {
        return news;
      }

      // Fetch from external API if no news in database
      return this.fetchExternalNews(limit, category, sentiment);
    } catch (error) {
      logger.error('Get news error:', error);
      throw externalAPIErrorHandler(error, 'News API');
    }
  }

  // Get stock-specific news
  async getStockNews(symbol: string, limit: number = 10): Promise<NewsArticle[]> {
    try {
      // Get news from database
      const news = await executeQuery<NewsArticle>(
        'SELECT * FROM news_articles WHERE $1 = ANY(symbols) ORDER BY published_at DESC LIMIT $2',
        [symbol, limit]
      );

      if (news.length > 0) {
        return news;
      }

      // Fetch from external API
      return this.fetchExternalStockNews(symbol, limit);
    } catch (error) {
      logger.error('Get stock news error:', error);
      throw externalAPIErrorHandler(error, 'News API');
    }
  }

  // Get market sectors
  async getSectors(): Promise<any[]> {
    try {
      // Mock sectors data
      return [
        { name: 'Technology', change: 1.2, changePercent: 0.8 },
        { name: 'Healthcare', change: -0.5, changePercent: -0.3 },
        { name: 'Financial', change: 0.8, changePercent: 0.5 },
        { name: 'Consumer Discretionary', change: 0.3, changePercent: 0.2 },
        { name: 'Industrials', change: -0.2, changePercent: -0.1 },
        { name: 'Consumer Staples', change: 0.1, changePercent: 0.1 },
        { name: 'Energy', change: 2.1, changePercent: 1.5 },
        { name: 'Utilities', change: -0.3, changePercent: -0.2 },
        { name: 'Real Estate', change: 0.4, changePercent: 0.3 },
        { name: 'Materials', change: 0.6, changePercent: 0.4 },
        { name: 'Communication Services', change: 0.2, changePercent: 0.1 }
      ];
    } catch (error) {
      logger.error('Get sectors error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get sector stocks
  async getSectorStocks(sector: string, limit: number = 20): Promise<StockQuote[]> {
    try {
      // Mock sector stocks data
      const sectorStocks: { [key: string]: string[] } = {
        'technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'],
        'healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR'],
        'financial': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'AXP'],
        'energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PXD', 'KMI', 'WMB']
      };

      const symbols = sectorStocks[sector.toLowerCase()] || ['AAPL', 'MSFT', 'GOOGL'];
      return this.getMultipleQuotes(symbols.slice(0, limit));
    } catch (error) {
      logger.error('Get sector stocks error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get top gainers
  async getGainers(limit: number = 20): Promise<StockQuote[]> {
    try {
      // Mock gainers data
      const gainerSymbols = ['TSLA', 'NVDA', 'AMD', 'NFLX', 'ZM', 'PTON', 'ROKU', 'SQ'];
      return this.getMultipleQuotes(gainerSymbols.slice(0, limit));
    } catch (error) {
      logger.error('Get gainers error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get top losers
  async getLosers(limit: number = 20): Promise<StockQuote[]> {
    try {
      // Mock losers data
      const loserSymbols = ['GE', 'F', 'T', 'VZ', 'KO', 'PFE', 'WMT', 'PG'];
      return this.getMultipleQuotes(loserSymbols.slice(0, limit));
    } catch (error) {
      logger.error('Get losers error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get most active stocks
  async getMostActive(limit: number = 20): Promise<StockQuote[]> {
    try {
      // Mock most active data
      const activeSymbols = ['AAPL', 'TSLA', 'SPY', 'QQQ', 'MSFT', 'AMZN', 'GOOGL', 'META'];
      return this.getMultipleQuotes(activeSymbols.slice(0, limit));
    } catch (error) {
      logger.error('Get most active error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get trending stocks
  async getTrending(limit: number = 20): Promise<StockQuote[]> {
    try {
      // Mock trending data
      const trendingSymbols = ['GME', 'AMC', 'BB', 'NOK', 'PLTR', 'CRSR', 'CLOV', 'WISH'];
      return this.getMultipleQuotes(trendingSymbols.slice(0, limit));
    } catch (error) {
      logger.error('Get trending error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get market status
  async getMarketStatus(): Promise<any> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      // Simple market hours check (9:30 AM - 4:00 PM EST, Monday-Friday)
      const isMarketOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;

      return {
        isOpen: isMarketOpen,
        nextOpen: this.getNextMarketOpen(),
        nextClose: this.getNextMarketClose(),
        timezone: 'America/New_York'
      };
    } catch (error) {
      logger.error('Get market status error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get earnings calendar
  async getEarningsCalendar(date: string, limit: number = 50): Promise<any[]> {
    try {
      // Mock earnings calendar data
      return [
        {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          reportDate: date,
          fiscalQuarter: 'Q4 2024',
          estimatedEPS: 1.95,
          actualEPS: null,
          surprise: null
        },
        {
          symbol: 'MSFT',
          companyName: 'Microsoft Corporation',
          reportDate: date,
          fiscalQuarter: 'Q4 2024',
          estimatedEPS: 2.75,
          actualEPS: null,
          surprise: null
        }
      ];
    } catch (error) {
      logger.error('Get earnings calendar error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Get economic calendar
  async getEconomicCalendar(date: string, limit: number = 50): Promise<any[]> {
    try {
      // Mock economic calendar data
      return [
        {
          event: 'Non-Farm Payrolls',
          date: date,
          time: '08:30',
          importance: 'High',
          actual: null,
          forecast: '200K',
          previous: '187K'
        },
        {
          event: 'CPI (Consumer Price Index)',
          date: date,
          time: '08:30',
          importance: 'High',
          actual: null,
          forecast: '0.3%',
          previous: '0.2%'
        }
      ];
    } catch (error) {
      logger.error('Get economic calendar error:', error);
      throw externalAPIErrorHandler(error, 'Market Data');
    }
  }

  // Helper methods for formatting data
  private formatIEXQuote(data: any): StockQuote {
    return {
      symbol: data.symbol,
      companyName: data.companyName,
      price: data.latestPrice,
      change: data.change,
      changePercent: data.changePercent * 100,
      volume: data.latestVolume,
      marketCap: data.marketCap,
      pe: data.peRatio,
      eps: data.ttmEPS,
      dividend: data.dividendRate,
      dividendYield: data.dividendYield * 100,
      high52Week: data.week52High,
      low52Week: data.week52Low,
      open: data.open,
      previousClose: data.previousClose,
      timestamp: new Date(data.latestUpdate)
    };
  }

  private formatFinnhubQuote(symbol: string, data: any): StockQuote {
    return {
      symbol: symbol,
      companyName: symbol, // Would need separate API call for company name
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      volume: 0, // Not provided by Finnhub quote endpoint
      marketCap: 0,
      pe: 0,
      eps: 0,
      dividend: 0,
      dividendYield: 0,
      high52Week: data.h,
      low52Week: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: new Date(data.t * 1000)
    };
  }

  private formatAlphaVantageQuote(data: any): StockQuote {
    return {
      symbol: data['01. symbol'],
      companyName: data['01. symbol'], // Would need separate API call
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      volume: parseInt(data['06. volume']),
      marketCap: 0,
      pe: 0,
      eps: 0,
      dividend: 0,
      dividendYield: 0,
      high52Week: 0,
      low52Week: 0,
      open: parseFloat(data['02. open']),
      previousClose: parseFloat(data['08. previous close']),
      timestamp: new Date(data['07. latest trading day'])
    };
  }

  // Mock data methods
  private getMockSearchResults(query: string, limit: number): StockSearchResult[] {
    const mockResults: StockSearchResult[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', region: 'US', currency: 'USD', matchScore: 0.95 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock', region: 'US', currency: 'USD', matchScore: 0.90 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'stock', region: 'US', currency: 'USD', matchScore: 0.85 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'stock', region: 'US', currency: 'USD', matchScore: 0.80 },
      { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'stock', region: 'US', currency: 'USD', matchScore: 0.75 }
    ];

    return mockResults.filter(result => 
      result.symbol.toLowerCase().includes(query.toLowerCase()) ||
      result.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  }

  private getMockQuote(symbol: string): StockQuote {
    const basePrice = 100 + Math.random() * 200;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol,
      companyName: `${symbol} Company Inc.`,
      price: basePrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: basePrice * 1000000000,
      pe: 15 + Math.random() * 20,
      eps: basePrice / (15 + Math.random() * 20),
      dividend: Math.random() * 2,
      dividendYield: Math.random() * 3,
      high52Week: basePrice * 1.2,
      low52Week: basePrice * 0.8,
      open: basePrice + (Math.random() - 0.5) * 5,
      previousClose: basePrice - change,
      timestamp: new Date()
    };
  }

  private getMockChartData(symbol: string, interval: string, range: string): ChartData[] {
    const data: ChartData[] = [];
    const now = new Date();
    const days = range === '1d' ? 1 : range === '5d' ? 5 : range === '1M' ? 30 : 90;
    
    let basePrice = 100 + Math.random() * 200;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const open = basePrice;
      const close = open + (Math.random() - 0.5) * 10;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      const volume = Math.floor(Math.random() * 10000000);
      
      data.push({
        timestamp: date,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume
      });
      
      basePrice = close;
    }
    
    return data;
  }

  private async fetchExternalNews(limit: number, category?: string, sentiment?: string): Promise<NewsArticle[]> {
    // Mock news data
    return [
      {
        id: '1',
        title: 'Market Update: Stocks Rise on Positive Economic Data',
        summary: 'Major indices closed higher today following better-than-expected economic indicators.',
        content: 'Full article content here...',
        author: 'Market Reporter',
        source: 'Financial News',
        url: 'https://example.com/news/1',
        publishedAt: new Date(),
        symbols: ['SPY', 'QQQ'],
        sentiment: 'positive',
        category: 'market',
        tags: ['market', 'economy', 'stocks']
      }
    ];
  }

  private async fetchExternalStockNews(symbol: string, limit: number): Promise<NewsArticle[]> {
    // Mock stock-specific news
    return [
      {
        id: '2',
        title: `${symbol} Reports Strong Quarterly Earnings`,
        summary: `${symbol} exceeded analyst expectations with robust quarterly performance.`,
        content: 'Full article content here...',
        author: 'Company Reporter',
        source: 'Business News',
        url: 'https://example.com/news/2',
        publishedAt: new Date(),
        symbols: [symbol],
        sentiment: 'positive',
        category: 'earnings',
        tags: ['earnings', 'quarterly', symbol.toLowerCase()]
      }
    ];
  }

  private getNextMarketOpen(): Date {
    const now = new Date();
    const nextOpen = new Date(now);
    
    // If it's weekend, set to next Monday
    if (now.getDay() === 0) { // Sunday
      nextOpen.setDate(now.getDate() + 1);
    } else if (now.getDay() === 6) { // Saturday
      nextOpen.setDate(now.getDate() + 2);
    } else if (now.getDay() >= 1 && now.getDay() <= 5) { // Weekday
      if (now.getHours() >= 16) { // After market close
        nextOpen.setDate(now.getDate() + 1);
      }
    }
    
    nextOpen.setHours(9, 30, 0, 0);
    return nextOpen;
  }

  private getNextMarketClose(): Date {
    const now = new Date();
    const nextClose = new Date(now);
    
    if (now.getDay() >= 1 && now.getDay() <= 5) { // Weekday
      if (now.getHours() < 16) { // Before market close
        nextClose.setHours(16, 0, 0, 0);
      } else {
        nextClose.setDate(now.getDate() + 1);
        nextClose.setHours(16, 0, 0, 0);
      }
    } else {
      // Weekend, set to next Monday
      const daysUntilMonday = now.getDay() === 0 ? 1 : 8 - now.getDay();
      nextClose.setDate(now.getDate() + daysUntilMonday);
      nextClose.setHours(16, 0, 0, 0);
    }
    
    return nextClose;
  }
}
