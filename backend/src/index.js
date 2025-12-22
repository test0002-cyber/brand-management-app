import { Router } from 'itty-router';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

// CORS Helper: Add CORS headers to response
function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
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
    const { username, password } = await request.json();

    if (!username || !password) {
      const response = new Response(
        JSON.stringify({ message: 'Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }

    const db = new D1Helper(env.DB);
    const user = await db.getUserByUsername(username);

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
    const response = new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
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
router.get('/health', () => {
  const response = new Response(
    JSON.stringify({
      status: 'OK',
      message: 'Brand Management API is running',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
  return addCorsHeaders(response);
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

    const response = await router.handle(request, env);
    return addCorsHeaders(response);
  },
};
