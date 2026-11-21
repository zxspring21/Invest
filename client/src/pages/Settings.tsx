import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will provide access to account settings, security options, and notification preferences.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
