import { Router } from 'itty-router';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// JWT Secret
const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

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

  async createUser(username, hashedPassword, role, email) {
    return this.db
      .prepare(
        'INSERT INTO users (username, password, role, email) VALUES (?1, ?2, ?3, ?4)'
      )
      .bind(username, hashedPassword, role, email)
      .run();
  }

  async getAllUsers() {
    const { results } = await this.db
      .prepare('SELECT id, username, role, email, created_at FROM users')
      .all();
    return results;
  }

  async getAllBrands() {
    const { results } = await this.db
      .prepare('SELECT * FROM brands ORDER BY brand_name')
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

// Login
router.post('/auth/login', async (request, env) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ message: 'Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new D1Helper(env.DB);
    const user = await db.getUserByUsername(username);

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return new Response(
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
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Verify Token
router.get('/auth/verify', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ user: auth.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Get all brands
router.get('/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = new D1Helper(env.DB);
    const brands = await db.getAllBrands();

    return new Response(JSON.stringify({ brands }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Create brand
router.post('/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only admins can create brands
  if (auth.decoded.role !== 'admin') {
    return new Response(
      JSON.stringify({ message: 'Only admins can create brands' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { brand_name, master_outlet_id } = await request.json();

    if (!brand_name || !master_outlet_id) {
      return new Response(
        JSON.stringify({ message: 'Brand name and master outlet ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new D1Helper(env.DB);
    const result = await db.createBrand(
      brand_name,
      master_outlet_id,
      auth.decoded.userId
    );

    return new Response(
      JSON.stringify({
        message: 'Brand created successfully',
        brand: { id: result.meta.last_row_id, brand_name, master_outlet_id },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Get user's brands
router.get('/users/:userId/brands', async (request, env) => {
  const auth = await authenticateToken(request, env);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = request.params.userId;
    const db = new D1Helper(env.DB);
    const brands = await db.getUserBrands(userId);

    return new Response(JSON.stringify({ brands }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Health check
router.get('/health', () => {
  return new Response(
    JSON.stringify({
      status: 'OK',
      message: 'Brand Management API is running',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({ message: 'Route not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Export handler
export default {
  fetch: (request, env, ctx) => {
    // CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Add CORS to all responses
    const response = router.handle(request, env, ctx);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    return response;
  },
};
