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
  OutlinedInput,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { Add, PersonAdd, Download, Upload } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' && window._env_?.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const UserAllocation = () => {
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);

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

  const handleOpen = (user = null) => {
    setOpen(true);
    if (user) {
      setSelectedUser(user.id);
      setSelectedBrands(user.allocated_brands.map(b => b.brand_id));
    } else {
      setSelectedUser('');
      setSelectedBrands([]);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser('');
    setSelectedBrands([]);
  };

  const handleBulkAllocate = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/users/${selectedUser}/allocate-bulk`, {
        brandIds: selectedBrands
      });
      setSuccess('Allocations updated successfully');
      handleClose();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update allocations');
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

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/export/allocations`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'allocations_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export allocations');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').slice(1); // Skip header
        const allocations = rows
          .map(row => {
            const cols = row.split(',').map(c => c.replace(/"/g, ''));
            if (cols.length < 4) return null;
            return {
              user_id: parseInt(cols[1]),
              brand_id: parseInt(cols[3])
            };
          })
          .filter(a => a && !isNaN(a.user_id) && !isNaN(a.brand_id));

        if (allocations.length === 0) {
          setError('No valid allocations found in file');
          return;
        }

        await axios.post(`${API_BASE_URL}/import/allocations`, { allocations });
        setSuccess(`Successfully imported ${allocations.length} allocations`);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to import allocations. Ensure CSV matches export format.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">User Allocation</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
          >
            Import CSV
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleImport}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpen()}
          >
            Allocate Brands
          </Button>
        </Box>
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
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
                  {user.allocated_brands && user.allocated_brands.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {user.allocated_brands.map((allocation) => (
                        <Chip
                          key={allocation.brand_id}
                          label={allocation.brand_name}
                          size="small"
                          onDelete={() => handleDeallocate(user.id, allocation.brand_id)}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No brands allocated
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => handleOpen(user)}>
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Brand Allocation</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser}
              label="Select User"
              onChange={(e) => setSelectedUser(e.target.value)}
              disabled={!!selectedUser && open} // Don't change user if opened for edit
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Select Brands</InputLabel>
            <Select
              multiple
              value={selectedBrands}
              onChange={(e) => setSelectedBrands(e.target.value)}
              input={<OutlinedInput label="Select Brands" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={brands.find(b => b.id === value)?.brand_name} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {brands.map((brand) => (
                <MenuItem key={brand.id} value={brand.id}>
                  <Checkbox checked={selectedBrands.indexOf(brand.id) > -1} />
                  <ListItemText primary={`${brand.brand_name} (${brand.master_outlet_id})`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleBulkAllocate} variant="contained" disabled={!selectedUser}>
            Save Allocations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserAllocation;