import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Box,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' && window._env_?.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    brand_name: '',
    master_outlet_id: '',
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/brands`);
      setBrands(response.data.brands);
      setError('');
    } catch (err) {
      setError('Failed to fetch brands');
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpen = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        brand_name: brand.brand_name,
        master_outlet_id: brand.master_outlet_id,
      });
    } else {
      setEditingBrand(null);
      setFormData({
        brand_name: '',
        master_outlet_id: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBrand(null);
    setFormData({
      brand_name: '',
      master_outlet_id: '',
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingBrand) {
        await axios.put(`${API_BASE_URL}/brands/${editingBrand.id}`, formData);
        setSuccess('Brand updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/brands`, formData);
        setSuccess('Brand created successfully');
      }
      handleClose();
      fetchBrands();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (brandId) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await axios.delete(`${API_BASE_URL}/brands/${brandId}`);
        setSuccess('Brand deleted successfully');
        fetchBrands();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete brand');
      }
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Brand Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Add New Brand
        </Button>
      </Box>

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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Brand Name</TableCell>
              <TableCell>Master Outlet ID</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>{brand.brand_name}</TableCell>
                <TableCell>{brand.master_outlet_id}</TableCell>
                <TableCell>{brand.created_by_username}</TableCell>
                <TableCell>{new Date(brand.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(brand)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(brand.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBrand ? 'Edit Brand' : 'Add New Brand'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Brand Name"
            fullWidth
            variant="outlined"
            value={formData.brand_name}
            onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Master Outlet ID"
            fullWidth
            variant="outlined"
            value={formData.master_outlet_id}
            onChange={(e) => setFormData({ ...formData, master_outlet_id: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingBrand ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BrandManagement;