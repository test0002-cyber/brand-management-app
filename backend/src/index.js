import { Router } from 'itty-router';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

// CORS Helper: Add CORS headers to response
function addCorsHeaders(response) {
  // Clone the response to avoid consuming the body stream
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers,
  });
}

// Handle preflight requests
router.options('*', () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
});

// Database Helper
class D1Helper {
  constructor(db) {
    this.db = db;
  }

  async getUserByUsername(username) {
    return this.db
      .prepare('SELECT * FROM users WHERE username = ?1')
      .bind(username)
      .first();
  }

  async getUserById(id) {
    return this.db
      .prepare('SELECT id, username, role, email FROM users WHERE id = ?1')
      .bind(id)
      .first();
  }

  async getAllBrands() {
    const { results } = await this.db
      .prepare('SELECT * FROM brands ORDER BY brand_name')
      .all();
    return results;
  }

  async getUserBrands(userId) {
    const { results } = await this.db
      .prepare(
        `SELECT b.* FROM brands b
         JOIN user_allocations ua ON b.id = ua.brand_id
         WHERE ua.user_id = ?1`
      )
      .bind(userId)
      .all();
    return results;
  }

  async createBrand(brandName, masterOutletId, createdBy) {
    return this.db
      .prepare(
        'INSERT INTO brands (brand_name, master_outlet_id, created_by) VALUES (?1, ?2, ?3)'
      )
      .bind(brandName, masterOutletId, createdBy)
      .run();
  }

  async allocateBrandToUser(userId, brandId, allocatedBy) {
    return this.db
      .prepare(
        'INSERT INTO user_allocations (user_id, brand_id, allocated_by) VALUES (?1, ?2, ?3)'
      )
      .bind(userId, brandId, allocatedBy)
      .run();
  }

  async getLoginLogs(startDate, endDate, brandId = null) {
    let query =
      'SELECT * FROM login_logs WHERE login_date BETWEEN ?1 AND ?2';
    const params = [startDate, endDate];

    if (brandId) {
      query += ' AND brand_id = ?3';
      params.push(brandId);
    }

    query += ' ORDER BY login_date DESC';

    const { results } = await this.db
      .prepare(query)
      .bind(...params)
      .all();
    return results;
  }
}

// Auth Middleware
async function authenticateToken(request, env) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = new D1Helper(env.DB);
    const user = await db.getUserById(decoded.userId);

    if (!user) {
      return { error: 'User not found', status: 403 };
    }

    return { user, decoded };
  } catch (error) {
    return { error: 'Invalid token', status: 403 };
  }
}

// Routes
router.post('/auth/login', async (request, env) => {
  try {
    console.log('Login request received');
    console.log('Environment bindings:', Object.keys(env || {}));
    
    const body = await request.json();
    console.log('Request body parsed:', body);
    const { username, password } = body;

    if (!username || !password) {
      const response = new Response(
        JSON.stringify({ message: 'Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }

    if (!env.DB) {
      throw new Error('D1 database binding "DB" is not configured');
    }

    console.log('Attempting to authenticate user:', username);
    const db = new D1Helper(env.DB);
    const user = await db.getUserByUsername(username);
    console.log('Database query result:', user ? `User found: ${user.username}` : 'User not found');

    if (!user) {
      const response = new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }

    // For demo, accept hardcoded passwords
    const validPasswords = {
      admin: 'admin123',
      user1: 'user123',
    };

    const isValidPassword =
      validPasswords[username] === password ||
      (await bcrypt.compare(password, user.password));

    if (!isValidPassword) {
      const response = new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = new Response(
      JSON.stringify({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Login error:', error);
    const response = new Response(
      JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// Verify Token
router.get('/auth/verify', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    const response = new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  }

  const response = new Response(JSON.stringify({ user: auth.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
});

// Get all brands
router.get('/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    const response = new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  }

  try {
    const db = new D1Helper(env.DB);
    const brands = await db.getAllBrands();

    const response = new Response(JSON.stringify({ brands }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  } catch (error) {
    const response = new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// Create brand
router.post('/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    const response = new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  }

  if (auth.decoded.role !== 'admin') {
    const response = new Response(
      JSON.stringify({ message: 'Only admins can create brands' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }

  try {
    const { brand_name, master_outlet_id } = await request.json();

    if (!brand_name || !master_outlet_id) {
      const response = new Response(
        JSON.stringify({ message: 'Brand name and master outlet ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }

    const db = new D1Helper(env.DB);
    const result = await db.createBrand(
      brand_name,
      master_outlet_id,
      auth.decoded.userId
    );

    const response = new Response(
      JSON.stringify({
        message: 'Brand created successfully',
        brand: { id: result.meta.last_row_id, brand_name, master_outlet_id },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  } catch (error) {
    const response = new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// Get user's brands
router.get('/users/:userId/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    const response = new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  }

  try {
    const userId = request.params.userId;
    const db = new D1Helper(env.DB);
    const brands = await db.getUserBrands(userId);

    const response = new Response(JSON.stringify({ brands }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    return addCorsHeaders(response);
  } catch (error) {
    const response = new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// Health check
router.get('/health', async (request, env) => {
  try {
    const db = new D1Helper(env.DB);
    const user = await db.getUserByUsername('admin');
    const response = new Response(
      JSON.stringify({
        status: 'OK',
        message: 'Brand Management API is running',
        database: user ? 'Connected (admin user found)' : 'Connected (admin user NOT found)',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  } catch (error) {
    const response = new Response(
      JSON.stringify({
        status: 'ERROR',
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// Debug endpoint - check environment and database setup
router.get('/debug/env', (request, env) => {
  const response = new Response(
    JSON.stringify({
      bindings: Object.keys(env || {}),
      hasDB: !!env.DB,
      dbType: env.DB ? typeof env.DB : 'undefined',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
  return addCorsHeaders(response);
});

// Setup endpoint - initialize database schema and demo users
router.post('/setup/init-db', async (request, env) => {
  try {
    if (!env.DB) {
      throw new Error('D1 database binding "DB" is not configured');
    }

    // Create users table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create brands table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_name TEXT NOT NULL,
        master_outlet_id TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `).run();

    // Create user_allocations table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        brand_id INTEGER NOT NULL,
        allocated_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (brand_id) REFERENCES brands(id),
        FOREIGN KEY (allocated_by) REFERENCES users(id),
        UNIQUE(user_id, brand_id)
      )
    `).run();

    // Create login_logs table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        actual_client_store_id TEXT NOT NULL,
        store_manager_name TEXT NOT NULL,
        store_manager_number TEXT NOT NULL,
        login_type TEXT NOT NULL CHECK(login_type IN ('parent', 'team member')),
        login_date DATE NOT NULL,
        brand_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brand_id) REFERENCES brands(id)
      )
    `).run();

    // Insert demo users (if they don't already exist)
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
    ).bind('admin', 'admin_hashed_password_here', 'admin', 'admin@brand-management.com').run();

    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
    ).bind('user1', 'user1_hashed_password_here', 'user', 'user1@brand-management.com').run();

    // Verify users were created
    const { results: users } = await env.DB.prepare('SELECT id, username, role FROM users').all();

    const response = new Response(
      JSON.stringify({
        status: 'SUCCESS',
        message: 'Database initialized successfully',
        tables: ['users', 'brands', 'user_allocations', 'login_logs'],
        users: users || [],
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  } catch (error) {
    const response = new Response(
      JSON.stringify({
        status: 'ERROR',
        message: 'Database initialization failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }
});

// 404 handler
router.all('*', () => {
  const response = new Response(JSON.stringify({ message: 'Route not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
});

// Export handler with CORS middleware
export default {
  async fetch(request, env) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const response = await router.handle(request, env);
      return addCorsHeaders(response);
    } catch (error) {
      console.error('Worker error:', error);
      const errorResponse = new Response(
        JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(errorResponse);
    }
  },
};
