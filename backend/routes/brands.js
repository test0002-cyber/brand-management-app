const express = require('express');
const Database = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All brand routes require authentication
router.use(authenticateToken);

// Get all brands (admin sees all, users see only allocated brands)
router.get('/', async (req, res) => {
  try {
    let brands;

    if (req.user.role === 'admin') {
      // Admin can see all brands
      brands = await Database.all(`
        SELECT b.*, u.username as created_by_username
        FROM brands b
        JOIN users u ON b.created_by = u.id
        ORDER BY b.created_at DESC
      `);
    } else {
      // Users can only see brands allocated to them
      brands = await Database.all(`
        SELECT b.*, u.username as created_by_username
        FROM brands b
        JOIN user_allocations ua ON b.id = ua.brand_id
        JOIN users u ON b.created_by = u.id
        WHERE ua.user_id = ?
        ORDER BY b.created_at DESC
      `, [req.user.id]);
    }

    res.json({ brands });

  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new brand (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { brand_name, master_outlet_id } = req.body;

    if (!brand_name || !master_outlet_id) {
      return res.status(400).json({ 
        message: 'Brand name and master outlet ID are required' 
      });
    }

    // Check if brand already exists
    const existingBrand = await Database.get(
      'SELECT id FROM brands WHERE brand_name = ?',
      [brand_name]
    );

    if (existingBrand) {
      return res.status(409).json({ message: 'Brand name already exists' });
    }

    // Create brand
    const result = await Database.run(
      'INSERT INTO brands (brand_name, master_outlet_id, created_by) VALUES (?, ?, ?)',
      [brand_name, master_outlet_id, req.user.id]
    );

    const newBrand = await Database.get(`
      SELECT b.*, u.username as created_by_username
      FROM brands b
      JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Brand created successfully',
      brand: newBrand
    });

  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update brand (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand_name, master_outlet_id } = req.body;

    if (!brand_name || !master_outlet_id) {
      return res.status(400).json({ 
        message: 'Brand name and master outlet ID are required' 
      });
    }

    // Check if brand exists
    const brand = await Database.get(
      'SELECT id FROM brands WHERE id = ?',
      [id]
    );

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if new brand name already exists (excluding current brand)
    const existingBrand = await Database.get(
      'SELECT id FROM brands WHERE brand_name = ? AND id != ?',
      [brand_name, id]
    );

    if (existingBrand) {
      return res.status(409).json({ message: 'Brand name already exists' });
    }

    // Update brand
    await Database.run(
      'UPDATE brands SET brand_name = ?, master_outlet_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [brand_name, master_outlet_id, id]
    );

    const updatedBrand = await Database.get(`
      SELECT b.*, u.username as created_by_username
      FROM brands b
      JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    res.json({
      message: 'Brand updated successfully',
      brand: updatedBrand
    });

  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete brand (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if brand exists
    const brand = await Database.get(
      'SELECT id FROM brands WHERE id = ?',
      [id]
    );

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Delete brand allocations first
    await Database.run(
      'DELETE FROM user_allocations WHERE brand_id = ?',
      [id]
    );

    // Delete brand
    const result = await Database.run(
      'DELETE FROM brands WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.json({ message: 'Brand deleted successfully' });

  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get brand details with allocation info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get brand details
    const brand = await Database.get(`
      SELECT b.*, u.username as created_by_username
      FROM brands b
      JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Get allocated users (admin only)
    let allocatedUsers = [];
    if (req.user.role === 'admin') {
      allocatedUsers = await Database.all(`
        SELECT u.id, u.username, u.email, ua.created_at as allocated_at
        FROM user_allocations ua
        JOIN users u ON ua.user_id = u.id
        WHERE ua.brand_id = ?
        ORDER BY ua.created_at DESC
      `, [id]);
    }

    res.json({
      brand,
      allocatedUsers
    });

  } catch (error) {
    console.error('Error fetching brand details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;