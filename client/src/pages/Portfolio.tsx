import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Portfolio: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Portfolio
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will display your portfolio holdings, performance analytics, and investment tracking.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Portfolio;
