import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Lock, Person, Business } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const redirectPath = user.role === 'admin' ? '/admin' : '/user';
      navigate(redirectPath);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        const redirectPath = result.user.role === 'admin' ? '/admin' : '/user';
        navigate(redirectPath);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoUsername, demoPassword) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const result = await login(demoUsername, demoPassword);
      if (result.success) {
        const redirectPath = result.user.role === 'admin' ? '/admin' : '/user';
        navigate(redirectPath);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Header with Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              marginBottom: 3,
              color: 'white',
            }}
          >
            <Business sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Brand Management
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                System
              </Typography>
            </Box>
          </Box>

          {/* Main Login Card */}
          <Paper
            elevation={20}
            sx={{
              padding: 4,
              width: '100%',
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              component="h2"
              variant="h5"
              align="center"
              sx={{
                fontWeight: 600,
                color: '#333',
                marginBottom: 1,
              }}
            >
              Welcome Back
            </Typography>
            <Typography
              variant="body2"
              align="center"
              sx={{
                color: 'text.secondary',
                marginBottom: 3,
              }}
            >
              Sign in to your account to continue
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  color: '#c62828',
                  border: '1px solid #ef5350',
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                      borderWidth: 2,
                    },
                  },
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: '#ccc',
                    boxShadow: 'none',
                  },
                }}
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Demo Accounts */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#333',
                marginBottom: 2,
              }}
            >
              Quick Demo Access
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
              {/* Admin Demo */}
              <Card
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 0.6)',
                    transform: 'translateX(4px)',
                  },
                }}
                onClick={() => handleQuickLogin('admin', 'admin123')}
              >
                <CardContent sx={{ padding: '12px 16px' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: '#333' }}
                      >
                        Admin Account
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                      >
                        admin / admin123
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor: '#667eea',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 1,
                        fontWeight: 600,
                      }}
                    >
                      ADMIN
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* User Demo */}
              <Card
                sx={{
                  backgroundColor: 'rgba(118, 75, 162, 0.1)',
                  border: '1px solid rgba(118, 75, 162, 0.3)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    borderColor: 'rgba(118, 75, 162, 0.6)',
                    transform: 'translateX(4px)',
                  },
                }}
                onClick={() => handleQuickLogin('user1', 'user123')}
              >
                <CardContent sx={{ padding: '12px 16px' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: '#333' }}
                      >
                        User Account
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                      >
                        user1 / user123
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor: '#764ba2',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 1,
                        fontWeight: 600,
                      }}
                    >
                      USER
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Paper>

          {/* Footer */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: 3,
              textAlign: 'center',
            }}
          >
            Brand Management System © 2025
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;