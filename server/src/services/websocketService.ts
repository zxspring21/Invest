import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SocketRequest, WebSocketMessage, User, MarketData } from '@/types';
import { executeQuery } from '@/utils/database';
import { cacheService } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { MarketService } from './marketService';

export class WebSocketService {
  private io: SocketIOServer;
  private marketService: MarketService;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private subscribedSymbols: Map<string, Set<string>> = new Map(); // symbol -> Set of socketIds
  private marketDataInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.marketService = new MarketService();
    this.setupEventHandlers();
    this.startMarketDataBroadcast();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: SocketRequest) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET!) as any;
          const users = await executeQuery<User>(
            'SELECT * FROM users WHERE id = $1 AND account_status = $2',
            [decoded.userId, 'active']
          );

          if (users.length > 0) {
            const user = users[0];
            delete (user as any).password_hash;
            
            socket.userId = user.id;
            socket.user = user;

            // Add to connected users
            if (!this.connectedUsers.has(user.id)) {
              this.connectedUsers.set(user.id, new Set());
            }
            this.connectedUsers.get(user.id)!.add(socket.id);

            socket.emit('authenticated', { user });
            logger.info(`User ${user.email} authenticated via WebSocket`);
          } else {
            socket.emit('auth_error', { message: 'Invalid token' });
          }
        } catch (error) {
          logger.error('WebSocket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle market data subscription
      socket.on('subscribe_market_data', (data: { symbols: string[] }) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        data.symbols.forEach(symbol => {
          const symbolUpper = symbol.toUpperCase();
          
          if (!this.subscribedSymbols.has(symbolUpper)) {
            this.subscribedSymbols.set(symbolUpper, new Set());
          }
          this.subscribedSymbols.get(symbolUpper)!.add(socket.id);
        });

        socket.emit('subscribed', { symbols: data.symbols });
        logger.info(`User ${socket.userId} subscribed to: ${data.symbols.join(', ')}`);
      });

      // Handle market data unsubscription
      socket.on('unsubscribe_market_data', (data: { symbols: string[] }) => {
        data.symbols.forEach(symbol => {
          const symbolUpper = symbol.toUpperCase();
          const subscribers = this.subscribedSymbols.get(symbolUpper);
          
          if (subscribers) {
            subscribers.delete(socket.id);
            if (subscribers.size === 0) {
              this.subscribedSymbols.delete(symbolUpper);
            }
          }
        });

        socket.emit('unsubscribed', { symbols: data.symbols });
        logger.info(`User ${socket.userId} unsubscribed from: ${data.symbols.join(', ')}`);
      });

      // Handle portfolio updates subscription
      socket.on('subscribe_portfolio', () => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(`portfolio:${socket.userId}`);
        socket.emit('portfolio_subscribed');
        logger.info(`User ${socket.userId} subscribed to portfolio updates`);
      });

      // Handle order updates subscription
      socket.on('subscribe_orders', () => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        socket.join(`orders:${socket.userId}`);
        socket.emit('orders_subscribed');
        logger.info(`User ${socket.userId} subscribed to order updates`);
      });

      // Handle news subscription
      socket.on('subscribe_news', (data: { symbols?: string[] }) => {
        if (data.symbols) {
          data.symbols.forEach(symbol => {
            socket.join(`news:${symbol.toUpperCase()}`);
          });
        } else {
          socket.join('news:general');
        }
        
        socket.emit('news_subscribed');
        logger.info(`User ${socket.userId} subscribed to news updates`);
      });

      // Handle chat messages (for community features)
      socket.on('send_message', async (data: { room: string; message: string }) => {
        if (!socket.userId || !socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const messageData = {
          id: Date.now().toString(),
          userId: socket.userId,
          username: socket.user.username,
          message: data.message,
          timestamp: new Date(),
          room: data.room
        };

        // Broadcast to room
        socket.to(data.room).emit('new_message', messageData);
        
        // Store in cache for history
        await cacheService.lpush(`chat:${data.room}`, messageData);
        
        logger.info(`User ${socket.userId} sent message to room ${data.room}`);
      });

      // Handle join chat room
      socket.on('join_room', (data: { room: string }) => {
        socket.join(data.room);
        socket.emit('joined_room', { room: data.room });
        logger.info(`User ${socket.userId} joined room ${data.room}`);
      });

      // Handle leave chat room
      socket.on('leave_room', (data: { room: string }) => {
        socket.leave(data.room);
        socket.emit('left_room', { room: data.room });
        logger.info(`User ${socket.userId} left room ${data.room}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleDisconnect(socket: SocketRequest): void {
    logger.info(`WebSocket client disconnected: ${socket.id}`);

    if (socket.userId) {
      // Remove from connected users
      const userSockets = this.connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(socket.userId);
        }
      }

      // Remove from all symbol subscriptions
      this.subscribedSymbols.forEach((subscribers, symbol) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.subscribedSymbols.delete(symbol);
        }
      });

      logger.info(`User ${socket.userId} disconnected from WebSocket`);
    }
  }

  private startMarketDataBroadcast(): void {
    // Broadcast market data every 1 second
    this.marketDataInterval = setInterval(async () => {
      try {
        await this.broadcastMarketData();
      } catch (error) {
        logger.error('Error broadcasting market data:', error);
      }
    }, 1000);
  }

  private async broadcastMarketData(): Promise<void> {
    if (this.subscribedSymbols.size === 0) {
      return;
    }

    const symbols = Array.from(this.subscribedSymbols.keys());
    const quotes = await this.marketService.getMultipleQuotes(symbols);

    quotes.forEach(quote => {
      const subscribers = this.subscribedSymbols.get(quote.symbol);
      if (subscribers && subscribers.size > 0) {
        const marketData: MarketData = {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          timestamp: quote.timestamp
        };

        // Send to all subscribers
        subscribers.forEach(socketId => {
          this.io.to(socketId).emit('market_data', marketData);
        });
      }
    });
  }

  // Public methods for broadcasting events
  public broadcastPortfolioUpdate(userId: string, portfolioData: any): void {
    this.io.to(`portfolio:${userId}`).emit('portfolio_update', portfolioData);
  }

  public broadcastOrderUpdate(userId: string, orderData: any): void {
    this.io.to(`orders:${userId}`).emit('order_update', orderData);
  }

  public broadcastNewsUpdate(newsData: any, symbols?: string[]): void {
    if (symbols) {
      symbols.forEach(symbol => {
        this.io.to(`news:${symbol.toUpperCase()}`).emit('news_update', newsData);
      });
    } else {
      this.io.to('news:general').emit('news_update', newsData);
    }
  }

  public broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system_message', {
      message,
      type,
      timestamp: new Date()
    });
  }

  public broadcastMarketAlert(alertData: any): void {
    this.io.emit('market_alert', alertData);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getSubscribedSymbolsCount(): number {
    return this.subscribedSymbols.size;
  }

  public stop(): void {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
      this.marketDataInterval = null;
    }
  }
}

// Export setup function
export function setupWebSocketHandlers(io: SocketIOServer): WebSocketService {
  return new WebSocketService(io);
}
