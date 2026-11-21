import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Trading: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trading
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Trading Platform
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will provide trading functionality including order placement, portfolio management, and trading tools.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Trading;
