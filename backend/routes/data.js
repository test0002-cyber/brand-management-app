const express = require('express');
const Database = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All data routes require authentication
router.use(authenticateToken);

// Get login data with date filtering and brand allocation
router.get('/login-logs', async (req, res) => {
  try {
    const { start_date, end_date, brand_id } = req.query;

    // Build query based on user role and filters
    let query = `
      SELECT ll.*, b.brand_name
      FROM login_logs ll
      LEFT JOIN brands b ON ll.brand_id = b.id
      WHERE 1=1
    `;
    let params = [];

    // Apply date filters
    if (start_date) {
      query += ' AND ll.login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ll.login_date <= ?';
      params.push(end_date);
    }

    // Apply brand filter
    if (brand_id) {
      query += ' AND ll.brand_id = ?';
      params.push(brand_id);
    }

    // For non-admin users, only show data from allocated brands
    if (req.user.role !== 'admin') {
      query += `
        AND ll.brand_id IN (
          SELECT brand_id FROM user_allocations WHERE user_id = ?
        )
      `;
      params.push(req.user.id);
    }

    query += ' ORDER BY ll.login_date DESC, ll.created_at DESC';

    const loginLogs = await Database.all(query, params);

    // Get summary statistics
    let summaryQuery = `
      SELECT 
        COUNT(*) as total_logins,
        COUNT(DISTINCT ll.store_id) as unique_stores,
        COUNT(DISTINCT ll.store_manager_number) as unique_managers,
        SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
        SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
      FROM login_logs ll
      WHERE 1=1
    `;
    let summaryParams = [];

    // Apply same filters for summary
    if (start_date) {
      summaryQuery += ' AND ll.login_date >= ?';
      summaryParams.push(start_date);
    }
    if (end_date) {
      summaryQuery += ' AND ll.login_date <= ?';
      summaryParams.push(end_date);
    }
    if (brand_id) {
      summaryQuery += ' AND ll.brand_id = ?';
      summaryParams.push(brand_id);
    }

    // Apply brand access restrictions for non-admin users
    if (req.user.role !== 'admin') {
      summaryQuery += `
        AND ll.brand_id IN (
          SELECT brand_id FROM user_allocations WHERE user_id = ?
        )
      `;
      summaryParams.push(req.user.id);
    }

    const summary = await Database.get(summaryQuery, summaryParams);

    res.json({
      loginLogs,
      summary,
      filters: {
        start_date,
        end_date,
        brand_id
      }
    });

  } catch (error) {
    console.error('Error fetching login data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get daily login summary
router.get('/daily-summary', async (req, res) => {
  try {
    const { start_date, end_date, brand_id } = req.query;

    let query = `
      SELECT 
        ll.login_date,
        COUNT(*) as total_logins,
        COUNT(DISTINCT ll.store_id) as unique_stores,
        COUNT(DISTINCT ll.store_manager_number) as unique_managers,
        SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
        SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
      FROM login_logs ll
      WHERE 1=1
    `;
    let params = [];

    // Apply date filters
    if (start_date) {
      query += ' AND ll.login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ll.login_date <= ?';
      params.push(end_date);
    }

    // Apply brand filter
    if (brand_id) {
      query += ' AND ll.brand_id = ?';
      params.push(brand_id);
    }

    // For non-admin users, only show data from allocated brands
    if (req.user.role !== 'admin') {
      query += `
        AND ll.brand_id IN (
          SELECT brand_id FROM user_allocations WHERE user_id = ?
        )
      `;
      params.push(req.user.id);
    }

    query += ' GROUP BY ll.login_date ORDER BY ll.login_date DESC';

    const dailySummary = await Database.all(query, params);

    res.json({
      dailySummary,
      filters: {
        start_date,
        end_date,
        brand_id
      }
    });

  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get brand-wise summary
router.get('/brand-summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        b.id as brand_id,
        b.brand_name,
        b.master_outlet_id,
        COUNT(ll.id) as total_logins,
        COUNT(DISTINCT ll.store_id) as unique_stores,
        COUNT(DISTINCT ll.store_manager_number) as unique_managers,
        SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
        SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
      FROM brands b
      LEFT JOIN login_logs ll ON b.id = ll.brand_id
      WHERE 1=1
    `;
    let params = [];

    // Apply date filters
    if (start_date) {
      query += ' AND ll.login_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ll.login_date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY b.id, b.brand_name ORDER BY total_logins DESC';

    let brandSummary = await Database.all(query, params);

    // For non-admin users, filter to only show allocated brands
    if (req.user.role !== 'admin') {
      brandSummary = await Database.all(`
        SELECT 
          b.id as brand_id,
          b.brand_name,
          b.master_outlet_id,
          COUNT(ll.id) as total_logins,
          COUNT(DISTINCT ll.store_id) as unique_stores,
          COUNT(DISTINCT ll.store_manager_number) as unique_managers,
          SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
          SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
        FROM brands b
        JOIN user_allocations ua ON b.id = ua.brand_id
        LEFT JOIN login_logs ll ON b.id = ll.brand_id
        WHERE ua.user_id = ?
        ${start_date ? 'AND ll.login_date >= ?' : ''}
        ${end_date ? 'AND ll.login_date <= ?' : ''}
        GROUP BY b.id, b.brand_name
        ORDER BY total_logins DESC
      `, params);

      // If dates are provided, adjust params for non-admin query
      if (start_date && end_date) {
        brandSummary = await Database.all(`
          SELECT 
            b.id as brand_id,
            b.brand_name,
            b.master_outlet_id,
            COUNT(ll.id) as total_logins,
            COUNT(DISTINCT ll.store_id) as unique_stores,
            COUNT(DISTINCT ll.store_manager_number) as unique_managers,
            SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
            SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
          FROM brands b
          JOIN user_allocations ua ON b.id = ua.brand_id
          LEFT JOIN login_logs ll ON b.id = ll.brand_id
          WHERE ua.user_id = ? AND ll.login_date >= ? AND ll.login_date <= ?
          GROUP BY b.id, b.brand_name
          ORDER BY total_logins DESC
        `, [req.user.id, start_date, end_date]);
      } else if (start_date) {
        brandSummary = await Database.all(`
          SELECT 
            b.id as brand_id,
            b.brand_name,
            b.master_outlet_id,
            COUNT(ll.id) as total_logins,
            COUNT(DISTINCT ll.store_id) as unique_stores,
            COUNT(DISTINCT ll.store_manager_number) as unique_managers,
            SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
            SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
          FROM brands b
          JOIN user_allocations ua ON b.id = ua.brand_id
          LEFT JOIN login_logs ll ON b.id = ll.brand_id
          WHERE ua.user_id = ? AND ll.login_date >= ?
          GROUP BY b.id, b.brand_name
          ORDER BY total_logins DESC
        `, [req.user.id, start_date]);
      } else if (end_date) {
        brandSummary = await Database.all(`
          SELECT 
            b.id as brand_id,
            b.brand_name,
            b.master_outlet_id,
            COUNT(ll.id) as total_logins,
            COUNT(DISTINCT ll.store_id) as unique_stores,
            COUNT(DISTINCT ll.store_manager_number) as unique_managers,
            SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
            SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
          FROM brands b
          JOIN user_allocations ua ON b.id = ua.brand_id
          LEFT JOIN login_logs ll ON b.id = ll.brand_id
          WHERE ua.user_id = ? AND ll.login_date <= ?
          GROUP BY b.id, b.brand_name
          ORDER BY total_logins DESC
        `, [req.user.id, end_date]);
      } else {
        brandSummary = await Database.all(`
          SELECT 
            b.id as brand_id,
            b.brand_name,
            b.master_outlet_id,
            COUNT(ll.id) as total_logins,
            COUNT(DISTINCT ll.store_id) as unique_stores,
            COUNT(DISTINCT ll.store_manager_number) as unique_managers,
            SUM(CASE WHEN ll.login_type = 'parent' THEN 1 ELSE 0 END) as parent_logins,
            SUM(CASE WHEN ll.login_type = 'team member' THEN 1 ELSE 0 END) as team_member_logins
          FROM brands b
          JOIN user_allocations ua ON b.id = ua.brand_id
          LEFT JOIN login_logs ll ON b.id = ll.brand_id
          WHERE ua.user_id = ?
          GROUP BY b.id, b.brand_name
          ORDER BY total_logins DESC
        `, [req.user.id]);
      }
    }

    res.json({
      brandSummary,
      filters: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Error fetching brand summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;