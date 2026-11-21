import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const News: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        News
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial News
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will display the latest financial news, market updates, and analysis.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default News;
