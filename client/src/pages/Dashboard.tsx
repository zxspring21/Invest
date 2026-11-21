import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  IconButton,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  News,
  Star,
  Refresh,
  MoreVert,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/contexts/WebSocketContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();

  // Mock data - in real app, this would come from API
  const portfolioData = {
    totalValue: 125430.50,
    dayChange: 1250.75,
    dayChangePercent: 1.01,
    totalReturn: 15430.50,
    totalReturnPercent: 14.02,
  };

  const watchlist = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 2.15, changePercent: 1.24 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.85, change: -1.25, changePercent: -0.33 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, change: 0.89, changePercent: 0.63 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 5.20, changePercent: 2.14 },
  ];

  const recentNews = [
    {
      title: 'Federal Reserve Holds Interest Rates Steady',
      source: 'Reuters',
      time: '2 hours ago',
      sentiment: 'neutral' as const,
    },
    {
      title: 'Apple Reports Strong Q4 Earnings',
      source: 'Bloomberg',
      time: '4 hours ago',
      sentiment: 'positive' as const,
    },
    {
      title: 'Tech Stocks Rally on AI Optimism',
      source: 'CNBC',
      time: '6 hours ago',
      sentiment: 'positive' as const,
    },
  ];

  const topGainers = [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 485.20, change: 15.30, changePercent: 3.26 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', price: 125.40, change: 3.20, changePercent: 2.62 },
    { symbol: 'META', name: 'Meta Platforms', price: 320.15, change: 6.85, changePercent: 2.19 },
  ];

  const topLosers = [
    { symbol: 'GE', name: 'General Electric', price: 105.20, change: -2.15, changePercent: -2.00 },
    { symbol: 'F', name: 'Ford Motor Co.', price: 12.45, change: -0.25, changePercent: -1.97 },
    { symbol: 'T', name: 'AT&T Inc.', price: 15.80, change: -0.30, changePercent: -1.86 },
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.firstName}!
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Market Status:
          </Typography>
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Portfolio Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Portfolio Overview</Typography>
                <IconButton>
                  <Refresh />
                </IconButton>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      ${portfolioData.totalValue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Value
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      {portfolioData.dayChange >= 0 ? (
                        <TrendingUp color="success" />
                      ) : (
                        <TrendingDown color="error" />
                      )}
                      <Typography
                        variant="h6"
                        color={portfolioData.dayChange >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        ${portfolioData.dayChange.toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Today's Change
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      color={portfolioData.totalReturn >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {portfolioData.totalReturnPercent >= 0 ? '+' : ''}
                      {portfolioData.totalReturnPercent.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Return
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      $50,000
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Buying Power
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Market Status
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <AccountBalance />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    Market Open
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Closes in 2h 15m
                  </Typography>
                </Box>
              </Box>
              <Button variant="outlined" fullWidth startIcon={<ShowChart />}>
                View Market Data
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Watchlist */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Watchlist</Typography>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </Box>
              <List>
                {watchlist.map((stock, index) => (
                  <ListItem key={index} divider={index < watchlist.length - 1}>
                    <ListItemIcon>
                      <Star color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" fontWeight="bold">
                            {stock.symbol}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            ${stock.price}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {stock.name}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {stock.change >= 0 ? (
                              <TrendingUp color="success" fontSize="small" />
                            ) : (
                              <TrendingDown color="error" fontSize="small" />
                            )}
                            <Typography
                              variant="body2"
                              color={stock.change >= 0 ? 'success.main' : 'error.main'}
                            >
                              {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Movers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Market Movers
              </Typography>
              
              <Box mb={3}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Top Gainers
                </Typography>
                {topGainers.map((stock, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="bold">
                      {stock.symbol}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        ${stock.price}
                      </Typography>
                      <Chip
                        label={`+${stock.changePercent.toFixed(2)}%`}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  Top Losers
                </Typography>
                {topLosers.map((stock, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="bold">
                      {stock.symbol}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        ${stock.price}
                      </Typography>
                      <Chip
                        label={`${stock.changePercent.toFixed(2)}%`}
                        color="error"
                        size="small"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent News */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent News</Typography>
                <Button variant="outlined" startIcon={<News />}>
                  View All News
                </Button>
              </Box>
              <List>
                {recentNews.map((news, index) => (
                  <ListItem key={index} divider={index < recentNews.length - 1}>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1">
                            {news.title}
                          </Typography>
                          <Chip
                            label={news.sentiment}
                            color={getSentimentColor(news.sentiment)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {news.source}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {news.time}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
