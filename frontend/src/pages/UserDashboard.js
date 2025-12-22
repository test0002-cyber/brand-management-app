import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Logout } from '@mui/icons-material';
import UserDataView from '../components/UserDataView';
import UserDataExport from '../components/UserDataExport';

const UserDashboard = () => {
  const [currentView, setCurrentView] = useState('data');
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            User Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">
              Welcome, {user?.username}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Logout />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={currentView === 'data' ? 'contained' : 'outlined'}
            onClick={() => setCurrentView('data')}
          >
            View Data
          </Button>
          <Button
            variant={currentView === 'export' ? 'contained' : 'outlined'}
            onClick={() => setCurrentView('export')}
          >
            Export Data
          </Button>
        </Box>
      </Paper>

      {currentView === 'data' && <UserDataView />}
      {currentView === 'export' && <UserDataExport />}
    </Container>
  );
};

export default UserDashboard;