const express = require('express');
const Database = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await Database.all(`
      SELECT id, username, role, email, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user with allocated brands
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is requesting their own info or if admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await Database.get(
      'SELECT id, username, role, email, created_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get allocated brands
    const allocatedBrands = await Database.all(`
      SELECT b.id, b.brand_name, b.master_outlet_id, ua.created_at as allocated_at
      FROM user_allocations ua
      JOIN brands b ON ua.brand_id = b.id
      WHERE ua.user_id = ?
      ORDER BY ua.created_at DESC
    `, [id]);

    res.json({
      user,
      allocatedBrands
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Allocate brand to user (admin only)
router.post('/:userId/allocate/:brandId', requireAdmin, async (req, res) => {
  try {
    const { userId, brandId } = req.params;

    // Check if user exists
    const user = await Database.get(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if brand exists
    const brand = await Database.get(
      'SELECT id, brand_name FROM brands WHERE id = ?',
      [brandId]
    );

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if allocation already exists
    const existingAllocation = await Database.get(
      'SELECT id FROM user_allocations WHERE user_id = ? AND brand_id = ?',
      [userId, brandId]
    );

    if (existingAllocation) {
      return res.status(409).json({ message: 'Brand already allocated to user' });
    }

    // Create allocation
    const result = await Database.run(
      'INSERT INTO user_allocations (user_id, brand_id, allocated_by) VALUES (?, ?, ?)',
      [userId, brandId, req.user.id]
    );

    const allocation = await Database.get(`
      SELECT ua.*, u.username as user_name, b.brand_name
      FROM user_allocations ua
      JOIN users u ON ua.user_id = u.id
      JOIN brands b ON ua.brand_id = b.id
      WHERE ua.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Brand allocated successfully',
      allocation
    });

  } catch (error) {
    console.error('Error allocating brand:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove brand allocation (admin only)
router.delete('/:userId/allocate/:brandId', requireAdmin, async (req, res) => {
  try {
    const { userId, brandId } = req.params;

    // Check if allocation exists
    const allocation = await Database.get(
      'SELECT id FROM user_allocations WHERE user_id = ? AND brand_id = ?',
      [userId, brandId]
    );

    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Remove allocation
    const result = await Database.run(
      'DELETE FROM user_allocations WHERE user_id = ? AND brand_id = ?',
      [userId, brandId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    res.json({ message: 'Brand allocation removed successfully' });

  } catch (error) {
    console.error('Error removing brand allocation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user allocations (admin only)
router.get('/:id/allocations', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const allocations = await Database.all(`
      SELECT ua.id, ua.created_at as allocated_at, b.id as brand_id, b.brand_name, b.master_outlet_id
      FROM user_allocations ua
      JOIN brands b ON ua.brand_id = b.id
      WHERE ua.user_id = ?
      ORDER BY ua.created_at DESC
    `, [id]);

    res.json({ allocations });

  } catch (error) {
    console.error('Error fetching user allocations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get my allocated brands (for current user)
router.get('/me/allocated-brands', async (req, res) => {
  try {
    const allocatedBrands = await Database.all(`
      SELECT b.id, b.brand_name, b.master_outlet_id, ua.created_at as allocated_at
      FROM user_allocations ua
      JOIN brands b ON ua.brand_id = b.id
      WHERE ua.user_id = ?
      ORDER BY ua.created_at DESC
    `, [req.user.id]);

    res.json({ allocatedBrands });

  } catch (error) {
    console.error('Error fetching allocated brands:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;