import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Alert,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserDataExport = () => {
  const [allocatedBrands, setAllocatedBrands] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAllocatedBrands();
  }, []);

  const fetchAllocatedBrands = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me/allocated-brands`);
      setAllocatedBrands(response.data.allocatedBrands);
    } catch (err) {
      setError('Failed to fetch allocated brands');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `${API_BASE_URL}/export/my-data`;
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('start_date', formatDate(startDate));
      }
      if (endDate) {
        params.append('end_date', formatDate(endDate));
      }
      
      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const response = await axios.get(finalUrl, {
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
      const finalFilename = `my_allocated_data_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      
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

  const clearDates = () => {
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
        Export My Data
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

      {/* Allocated Brands Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Allocated Brands
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          You have access to data from the following brands:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {allocatedBrands.map((brand) => (
            <Box
              key={brand.id}
              sx={{
                backgroundColor: '#f5f5f5',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {brand.brand_name} ({brand.master_outlet_id})
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Export Options */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Your Data
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Download your allocated brands' login data as a CSV file. 
            You can filter by date range to export specific periods.
          </Typography>

          {/* Date Filter */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Date Filter (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
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
                    <TextField variant="outlined" />
                  }
                />
              </Box>
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
                    <TextField variant="outlined" />
                  }
                />
              </Box>
              <Button onClick={clearDates} variant="outlined">
                Clear Dates
              </Button>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={loading}
            size="large"
          >
            {loading ? 'Exporting...' : 'Download My Data'}
          </Button>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> 
              {' '}Leave date fields empty to export all available data for your allocated brands.
              Files will be downloaded in CSV format.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserDataExport;