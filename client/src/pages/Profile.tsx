import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This page will allow you to manage your profile information, account settings, and preferences.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
