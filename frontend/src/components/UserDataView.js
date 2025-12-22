import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' && window._env_?.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserDataView = () => {
  const [allocatedBrands, setAllocatedBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllocatedBrands();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBrand, startDate, endDate]);

  const fetchAllocatedBrands = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me/allocated-brands`);
      setAllocatedBrands(response.data.allocatedBrands);
      if (response.data.allocatedBrands.length > 0) {
        setSelectedBrand(''); // Default to "all brands"
      }
    } catch (err) {
      setError('Failed to fetch allocated brands');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', formatDate(startDate));
      }
      if (endDate) {
        params.append('end_date', formatDate(endDate));
      }
      if (selectedBrand) {
        params.append('brand_id', selectedBrand);
      }

      const response = await axios.get(`${API_BASE_URL}/data/login-logs?${params.toString()}`);
      setLoginLogs(response.data.loginLogs);
      setSummary(response.data.summary);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const clearFilters = () => {
    setSelectedBrand('');
    setStartDate(null);
    setEndDate(null);
  };

  if (allocatedBrands.length === 0) {
    return (
      <Alert severity="info">
        No brands have been allocated to you yet. Please contact your administrator.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        My Data View
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Typography variant="body2" gutterBottom>
              Brand
            </Typography>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
              }}
            >
              <option value="">All Allocated Brands</option>
              {allocatedBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.brand_name} ({brand.master_outlet_id})
                </option>
              ))}
            </select>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" gutterBottom>
                Start Date
              </Typography>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select start date"
                isClearable
                customInput={
                  <TextField fullWidth variant="outlined" />
                }
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" gutterBottom>
                End Date
              </Typography>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select end date"
                isClearable
                minDate={startDate}
                customInput={
                  <TextField fullWidth variant="outlined" />
                }
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" gutterBottom>
              &nbsp;
            </Typography>
            <button
              onClick={clearFilters}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Logins
                </Typography>
                <Typography variant="h4">
                  {summary.total_logins}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Stores
                </Typography>
                <Typography variant="h4">
                  {summary.unique_stores}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Managers
                </Typography>
                <Typography variant="h4">
                  {summary.unique_managers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Login Types
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Parent: ${summary.parent_logins}`}
                    size="small"
                    color="primary"
                  />
                  <Chip 
                    label={`Team: ${summary.team_member_logins}`}
                    size="small"
                    color="secondary"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Data Table */}
      <Paper sx={{ width: '100%', overflow: 'auto' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Brand</TableCell>
                <TableCell>Store ID</TableCell>
                <TableCell>Client Store ID</TableCell>
                <TableCell>Manager Name</TableCell>
                <TableCell>Manager Number</TableCell>
                <TableCell>Login Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : loginLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No data found for the selected criteria
                  </TableCell>
                </TableRow>
              ) : (
                loginLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.login_date}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.brand_name || 'N/A'} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{log.store_id}</TableCell>
                    <TableCell>{log.actual_client_store_id}</TableCell>
                    <TableCell>{log.store_manager_name}</TableCell>
                    <TableCell>{log.store_manager_number}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.login_type}
                        size="small"
                        color={log.login_type === 'parent' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default UserDataView;