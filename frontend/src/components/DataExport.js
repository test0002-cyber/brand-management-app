import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
} from '@mui/material';
import { Download, DateRange } from '@mui/icons-material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' && window._env_?.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DataExport = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/brands`);
      setBrands(response.data.brands);
    } catch (err) {
      setError('Failed to fetch brands');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const buildExportUrl = (endpoint, brandId = null) => {
    let url = `${API_BASE_URL}/export/${endpoint}`;
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('start_date', formatDate(startDate));
    }
    if (endDate) {
      params.append('end_date', formatDate(endDate));
    }
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  };

  const handleDownload = async (endpoint, filename) => {
    try {
      setLoading(true);
      setError('');
      
      let url;
      if (endpoint === 'daily-login') {
        if (!selectedBrand) {
          setError('Please select a brand for daily login export');
          setLoading(false);
          return;
        }
        url = buildExportUrl(`daily-login/${selectedBrand}`);
      } else {
        url = buildExportUrl(endpoint);
      }

      const response = await axios.get(url, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generate filename based on current date and parameters
      const dateRange = startDate && endDate 
        ? `${formatDate(startDate)}_to_${formatDate(endDate)}` 
        : 'all_time';
      const brandName = selectedBrand ? brands.find(b => b.id == selectedBrand)?.brand_name : 'all_brands';
      const finalFilename = `${brandName}_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', finalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess(`File downloaded: ${finalFilename}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.response?.data?.message || 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const exportDailyLogin = () => {
    handleDownload('daily-login', 'daily_login');
  };

  const exportAllBrands = () => {
    handleDownload('all-brands', 'all_brands');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Data Export
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Date Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Date Filter (Optional)
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Brand (for Daily Login Export)</InputLabel>
              <Select
                value={selectedBrand}
                label="Brand (for Daily Login Export)"
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Brands</em>
                </MenuItem>
                {brands.map((brand) => (
                  <MenuItem key={brand.id} value={brand.id}>
                    {brand.brand_name} ({brand.master_outlet_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
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
          <Grid item xs={12} md={4}>
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
        </Grid>
      </Paper>

      {/* Export Options */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Login Users Export
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Export daily login users for a specific brand with date filtering.
                This will include store details, manager information, and login types.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={exportDailyLogin}
                disabled={loading || !selectedBrand}
                fullWidth
              >
                {loading ? 'Exporting...' : 'Export Daily Login Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Brands Export
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Export all login data across all brands in bulk. This includes
                comprehensive data from all allocated brands.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={exportAllBrands}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Exporting...' : 'Export All Brands Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Files will be downloaded as CSV format. 
          Date filtering is optional - leave dates empty to export all available data.
        </Typography>
      </Box>
    </Box>
  );
};

export default DataExport;