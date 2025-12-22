import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import { Add, PersonAdd } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserAllocation = () => {
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, brandsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`),
        axios.get(`${API_BASE_URL}/brands`),
      ]);
      setUsers(usersResponse.data.users);
      setBrands(brandsResponse.data.brands);
      setError('');
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setSelectedUser('');
    setSelectedBrand('');
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser('');
    setSelectedBrand('');
  };

  const handleAllocate = async () => {
    if (!selectedUser || !selectedBrand) {
      setError('Please select both user and brand');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/users/${selectedUser}/allocate/${selectedBrand}`);
      setSuccess('Brand allocated successfully');
      handleClose();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate brand');
    }
  };

  const handleDeallocate = async (userId, brandId) => {
    if (window.confirm('Are you sure you want to remove this allocation?')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}/allocate/${brandId}`);
        setSuccess('Allocation removed successfully');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to remove allocation');
      }
    }
  };

  const getUserAllocatedBrands = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/allocations`);
      return response.data.allocations;
    } catch (err) {
      console.error('Error fetching user allocations:', err);
      return [];
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">User Allocation</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleOpen}
        >
          Allocate Brand
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
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Allocated Brands</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                brands={brands}
                onDeallocate={handleDeallocate}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Allocate Brand to User</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser}
              label="Select User"
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Select Brand</InputLabel>
            <Select
              value={selectedBrand}
              label="Select Brand"
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              {brands.map((brand) => (
                <MenuItem key={brand.id} value={brand.id}>
                  {brand.brand_name} ({brand.master_outlet_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAllocate} variant="contained">
            Allocate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// UserRow component to show allocated brands for each user
const UserRow = ({ user, brands, onDeallocate }) => {
  const [allocatedBrands, setAllocatedBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${user.id}/allocations`);
        const data = await response.json();
        setAllocatedBrands(data.allocations || []);
      } catch (err) {
        console.error('Error fetching allocations:', err);
        setAllocatedBrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocations();
  }, [user.id]);

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={5}>Loading...</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{user.username}</TableCell>
      <TableCell>{user.email || 'N/A'}</TableCell>
      <TableCell>
        <Chip 
          label={user.role} 
          color={user.role === 'admin' ? 'primary' : 'default'}
          size="small"
        />
      </TableCell>
      <TableCell>
        {allocatedBrands.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {allocatedBrands.map((allocation) => (
              <Chip
                key={allocation.id}
                label={allocation.brand_name}
                size="small"
                onDelete={() => onDeallocate(user.id, allocation.brand_id)}
                deleteIcon={
                  <span style={{ fontSize: '12px', padding: '2px 4px' }}>×</span>
                }
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No brands allocated
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {allocatedBrands.length > 0 && (
          <Typography variant="caption">
            {allocatedBrands.length} brand(s) allocated
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
};

export default UserAllocation;