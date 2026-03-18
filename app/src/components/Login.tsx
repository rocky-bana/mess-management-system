import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Container } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await loginWithGoogle();
    } catch (err) {
      setError('Failed to log in with Google.');
      console.error(err);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h3" color="primary.main" fontWeight="bold" gutterBottom>
          Mess Management
        </Typography>
        <Card sx={{ width: '100%', mt: 3, p: 3, boxShadow: 3, borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Stay on top of your mess schedule and feedback. Please sign in with your Google account to get started.
            </Typography>
            
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 3 }}>
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleLogin}
              fullWidth
              sx={{ py: 1.5, fontSize: '1.1rem', borderRadius: 2 }}
              disableElevation
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
