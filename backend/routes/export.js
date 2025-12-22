const express = require('express');
const Database = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// All export routes require authentication
router.use(authenticateToken);

// Helper function to generate CSV filename
const generateFilename = (prefix, dateRange) => {
  const timestamp = new Date().toISOString().split('T')[0];
  if (dateRange) {
    return `${prefix}_${dateRange}_${timestamp}.csv`;
  }
  return `${prefix}_${timestamp}.csv`;
};

// Export daily login users (brand-wise)
router.get('/daily-login/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { start_date, end_date } = req.query;

    // Check if user has access to this brand
    if (req.user.role !== 'admin') {
      const accessCheck = await Database.get(`
        SELECT id FROM user_allocations 
        WHERE user_id = ? AND brand_id = ?
      `, [req.user.id, brandId]);

      if (!accessCheck) {
        return res.status(403).json({ message: 'Access denied to this brand' });
      }
    }

    // Get brand details
    const brand = await Database.get(
      'SELECT brand_name FROM brands WHERE id = ?',
      [brandId]
    );

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Build query for login logs
    let query = `
      SELECT 
        store_id,
        actual_client_store_id,
        store_manager_name,
        store_manager_number,
        login_type,
        login_date
      FROM login_logs
      WHERE brand_id = ?
    `;
    let params = [brandId];

    // Apply date filters
    if (start_date) {
      query += ' AND login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND login_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY login_date DESC, created_at DESC';

    const loginLogs = await Database.all(query, params);

    if (loginLogs.length === 0) {
      return res.status(404).json({ message: 'No data found for the specified criteria' });
    }

    // Generate CSV
    const dateRange = start_date && end_date ? `${start_date}_to_${end_date}` : 'all_time';
    const filename = generateFilename(`${brand.brand_name}_daily_login`, dateRange);
    const filePath = path.join(__dirname, '..', 'exports', filename);

    // Ensure exports directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'store_id', title: 'Store ID' },
        { id: 'actual_client_store_id', title: 'Actual Client Store ID' },
        { id: 'store_manager_name', title: 'Store Manager Name' },
        { id: 'store_manager_number', title: 'Store Manager Number' },
        { id: 'login_type', title: 'Login Type' },
        { id: 'login_date', title: 'Login Date' }
      ]
    });

    // Write CSV file
    await csvWriter.writeRecords(loginLogs);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file to response
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after sending (optional)
    fileStream.on('end', async () => {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Error exporting daily login data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export all brands data in bulk
router.get('/all-brands', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Build query based on user role
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT 
          b.brand_name,
          b.master_outlet_id,
          ll.store_id,
          ll.actual_client_store_id,
          ll.store_manager_name,
          ll.store_manager_number,
          ll.login_type,
          ll.login_date
        FROM login_logs ll
        JOIN brands b ON ll.brand_id = b.id
        WHERE 1=1
      `;
      params = [];
    } else {
      query = `
        SELECT 
          b.brand_name,
          b.master_outlet_id,
          ll.store_id,
          ll.actual_client_store_id,
          ll.store_manager_name,
          ll.store_manager_number,
          ll.login_type,
          ll.login_date
        FROM login_logs ll
        JOIN brands b ON ll.brand_id = b.id
        JOIN user_allocations ua ON b.id = ua.brand_id
        WHERE ua.user_id = ?
      `;
      params = [req.user.id];
    }

    // Apply date filters
    if (start_date) {
      query += ' AND ll.login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ll.login_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ll.login_date DESC, b.brand_name, ll.created_at DESC';

    const loginLogs = await Database.all(query, params);

    if (loginLogs.length === 0) {
      return res.status(404).json({ message: 'No data found for the specified criteria' });
    }

    // Generate CSV
    const dateRange = start_date && end_date ? `${start_date}_to_${end_date}` : 'all_time';
    const filename = generateFilename('all_brands_login_data', dateRange);
    const filePath = path.join(__dirname, '..', 'exports', filename);

    // Ensure exports directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'brand_name', title: 'Brand Name' },
        { id: 'master_outlet_id', title: 'Master Outlet ID' },
        { id: 'store_id', title: 'Store ID' },
        { id: 'actual_client_store_id', title: 'Actual Client Store ID' },
        { id: 'store_manager_name', title: 'Store Manager Name' },
        { id: 'store_manager_number', title: 'Store Manager Number' },
        { id: 'login_type', title: 'Login Type' },
        { id: 'login_date', title: 'Login Date' }
      ]
    });

    // Write CSV file
    await csvWriter.writeRecords(loginLogs);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file to response
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after sending
    fileStream.on('end', async () => {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Error exporting all brands data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export user's allocated brands data
router.get('/my-data', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        b.brand_name,
        b.master_outlet_id,
        ll.store_id,
        ll.actual_client_store_id,
        ll.store_manager_name,
        ll.store_manager_number,
        ll.login_type,
        ll.login_date
      FROM login_logs ll
      JOIN brands b ON ll.brand_id = b.id
      JOIN user_allocations ua ON b.id = ua.brand_id
      WHERE ua.user_id = ?
    `;
    let params = [req.user.id];

    // Apply date filters
    if (start_date) {
      query += ' AND ll.login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ll.login_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ll.login_date DESC, b.brand_name, ll.created_at DESC';

    const loginLogs = await Database.all(query, params);

    if (loginLogs.length === 0) {
      return res.status(404).json({ message: 'No data found for the specified criteria' });
    }

    // Generate CSV
    const dateRange = start_date && end_date ? `${start_date}_to_${end_date}` : 'all_time';
    const filename = generateFilename(`${req.user.username}_allocated_data`, dateRange);
    const filePath = path.join(__dirname, '..', 'exports', filename);

    // Ensure exports directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'brand_name', title: 'Brand Name' },
        { id: 'master_outlet_id', title: 'Master Outlet ID' },
        { id: 'store_id', title: 'Store ID' },
        { id: 'actual_client_store_id', title: 'Actual Client Store ID' },
        { id: 'store_manager_name', title: 'Store Manager Name' },
        { id: 'store_manager_number', title: 'Store Manager Number' },
        { id: 'login_type', title: 'Login Type' },
        { id: 'login_date', title: 'Login Date' }
      ]
    });

    // Write CSV file
    await csvWriter.writeRecords(loginLogs);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file to response
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after sending
    fileStream.on('end', async () => {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;