const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../utils/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get user from database
    const user = await Database.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register (for creating new users - admin only)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user', email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or user' });
    }

    // Check if user already exists
    const existingUser = await Database.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await Database.run(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, email]
    );

    const newUser = await Database.get(
      'SELECT id, username, role, email FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data
    const user = await Database.get(
      'SELECT id, username, role, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ message: 'Invalid token' });
  }
});

module.exports = router;