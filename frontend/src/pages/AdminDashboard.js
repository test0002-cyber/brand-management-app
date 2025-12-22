import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Logout } from '@mui/icons-material';
import BrandManagement from '../components/BrandManagement';
import UserAllocation from '../components/UserAllocation';
import DataExport from '../components/DataExport';
import DataView from '../components/DataView';

const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleLogout = () => {
    logout();
  };

  const TabPanel = ({ children, value, index }) => {
    return (
      <div hidden={value !== index}>
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">
              Welcome, {user?.username} (Admin)
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
        
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Brand Management" />
          <Tab label="User Allocation" />
          <Tab label="Data Export" />
          <Tab label="Data View" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <BrandManagement />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <UserAllocation />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <DataExport />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <DataView />
      </TabPanel>
    </Container>
  );
};

export default AdminDashboard;