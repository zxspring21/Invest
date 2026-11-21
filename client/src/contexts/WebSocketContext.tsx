import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { MarketData, WebSocketMessage } from '@/types';
import toast from 'react-hot-toast';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToMarketData: (symbols: string[]) => void;
  unsubscribeFromMarketData: (symbols: string[]) => void;
  subscribeToPortfolio: () => void;
  subscribeToOrders: () => void;
  subscribeToNews: (symbols?: string[]) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendMessage: (room: string, message: string) => void;
  marketData: Map<string, MarketData>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const marketDataRef = useRef<Map<string, MarketData>>(new Map());
  const [isConnected, setIsConnected] = React.useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3002', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Authentication events
    socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
    });

    socket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      toast.error('WebSocket authentication failed');
    });

    // Market data events
    socket.on('market_data', (data: MarketData) => {
      marketDataRef.current.set(data.symbol, data);
    });

    socket.on('subscribed', (data) => {
      console.log('Subscribed to:', data.symbols);
    });

    socket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from:', data.symbols);
    });

    // Portfolio events
    socket.on('portfolio_subscribed', () => {
      console.log('Subscribed to portfolio updates');
    });

    socket.on('portfolio_update', (data) => {
      console.log('Portfolio update:', data);
      // Handle portfolio updates
    });

    // Order events
    socket.on('orders_subscribed', () => {
      console.log('Subscribed to order updates');
    });

    socket.on('order_update', (data) => {
      console.log('Order update:', data);
      toast.success(`Order ${data.status}: ${data.symbol}`);
    });

    // News events
    socket.on('news_subscribed', () => {
      console.log('Subscribed to news updates');
    });

    socket.on('news_update', (data) => {
      console.log('News update:', data);
      // Handle news updates
    });

    // Chat events
    socket.on('joined_room', (data) => {
      console.log('Joined room:', data.room);
    });

    socket.on('left_room', (data) => {
      console.log('Left room:', data.room);
    });

    socket.on('new_message', (data) => {
      console.log('New message:', data);
      // Handle new messages
    });

    // System events
    socket.on('system_message', (data) => {
      console.log('System message:', data);
      toast(data.message, {
        icon: data.type === 'error' ? '❌' : data.type === 'warning' ? '⚠️' : 'ℹ️',
      });
    });

    socket.on('market_alert', (data) => {
      console.log('Market alert:', data);
      toast(`Market Alert: ${data.message}`, {
        icon: '🚨',
        duration: 6000,
      });
    });

    // Ping/Pong for connection health
    socket.on('pong', () => {
      // Connection is healthy
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user, token]);

  // Ping server every 30 seconds to keep connection alive
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const pingInterval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  const subscribeToMarketData = (symbols: string[]): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe_market_data', { symbols });
    }
  };

  const unsubscribeFromMarketData = (symbols: string[]): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe_market_data', { symbols });
    }
  };

  const subscribeToPortfolio = (): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe_portfolio');
    }
  };

  const subscribeToOrders = (): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe_orders');
    }
  };

  const subscribeToNews = (symbols?: string[]): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe_news', { symbols });
    }
  };

  const joinRoom = (room: string): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', { room });
    }
  };

  const leaveRoom = (room: string): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_room', { room });
    }
  };

  const sendMessage = (room: string, message: string): void => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', { room, message });
    }
  };

  const value: WebSocketContextType = {
    socket: socketRef.current,
    isConnected,
    subscribeToMarketData,
    unsubscribeFromMarketData,
    subscribeToPortfolio,
    subscribeToOrders,
    subscribeToNews,
    joinRoom,
    leaveRoom,
    sendMessage,
    marketData: marketDataRef.current,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
