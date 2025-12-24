import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

// CORS Helper
function addCorsHeaders(response) {
  if (!response) return response;
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

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  let pathname = url.pathname;

  // Normalize pathname: remove /api prefix if present and remove trailing slash
  if (pathname.startsWith('/api')) {
    pathname = pathname.substring(4);
  }
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }
  if (pathname === '') pathname = '/';

  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Route: GET /ping
  if (method === 'GET' && pathname === '/ping') {
    const response = new Response(
      JSON.stringify({ status: 'pong', timestamp: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    return addCorsHeaders(response);
  }

  // Route: GET /health
  if (method === 'GET' && pathname === '/health') {
    try {
      let dbStatus = 'Unknown';
      if (env && env.DB) {
        try {
          const user = await env.DB
            .prepare('SELECT * FROM users WHERE username = ?1')
            .bind('admin')
            .first();
          dbStatus = user ? 'Connected (admin user found)' : 'Connected (admin user NOT found)';
        } catch (dbError) {
          dbStatus = `Database error: ${dbError.message}`;
        }
      } else {
        dbStatus = 'Database binding not configured';
      }

      const response = new Response(
        JSON.stringify({
          status: 'OK',
          message: 'Brand Management API is running',
          database: dbStatus,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    } catch (error) {
      const response = new Response(
        JSON.stringify({
          status: 'ERROR',
          message: 'Health check failed',
          error: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  }

  // Route: GET /debug/env
  if (method === 'GET' && pathname === '/debug/env') {
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
  }

  // Route: POST /setup/init-db
  if (method === 'POST' && pathname === '/setup/init-db') {
    try {
      if (!env.DB) {
        throw new Error('D1 database binding "DB" is not configured');
      }

      // Create tables
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

      // Insert demo users
      // Passwords are 'admin123' and 'user123' hashed with bcrypt
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
      ).bind('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/Ko.', 'admin', 'admin@brand-management.com').run();

      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
      ).bind('user1', '$2a$10$V4aomeH7BH2awznS4wWK2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUm', 'user', 'user1@brand-management.com').run();

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
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  }

  // Route: POST /auth/login
  if (method === 'POST' && pathname === '/auth/login') {
    try {
      const body = await request.json();
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

      const user = await env.DB
        .prepare('SELECT * FROM users WHERE username = ?1')
        .bind(username)
        .first();

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
        JSON.stringify({
          message: 'Internal server error',
          error: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  }

  // Route: POST /auth/verify
  if (method === 'POST' && pathname === '/auth/verify') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = new Response(
          JSON.stringify({ message: 'No token provided' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
        return addCorsHeaders(response);
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const response = new Response(
        JSON.stringify({
          valid: true,
          user: {
            id: decoded.userId,
            username: decoded.username,
            role: decoded.role,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    } catch (error) {
      const response = new Response(
        JSON.stringify({ valid: false, message: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  }

  // Route: GET /brands
  if (method === 'GET' && pathname === '/brands') {
    try {
      // Verify authentication
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = new Response(
          JSON.stringify({ message: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
        return addCorsHeaders(response);
      }

      const token = authHeader.substring(7);
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        const response = new Response(
          JSON.stringify({ message: 'Invalid token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
        return addCorsHeaders(response);
      }

      if (!env.DB) {
        throw new Error('D1 database binding "DB" is not configured');
      }

      let brands = [];
      try {
        if (decoded.role === 'admin') {
          // Admin sees all brands
          const { results } = await env.DB.prepare(`
            SELECT b.*, u.username as created_by_username 
            FROM brands b
            LEFT JOIN users u ON b.created_by = u.id
            ORDER BY b.brand_name ASC
          `).all();
          brands = results || [];
        } else {
          // User sees only allocated brands
          const { results } = await env.DB.prepare(`
            SELECT b.*, u.username as created_by_username 
            FROM brands b
            JOIN user_allocations ua ON b.id = ua.brand_id
            LEFT JOIN users u ON b.created_by = u.id
            WHERE ua.user_id = ?
            ORDER BY b.brand_name ASC
          `).bind(decoded.userId).all();
          brands = results || [];
        }
      } catch (dbError) {
        console.log('Brands query error:', dbError.message);
      }

      const response = new Response(
        JSON.stringify({ brands }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    } catch (error) {
      const response = new Response(
        JSON.stringify({
          message: 'Internal server error',
          error: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  }

  // Route: POST /brands (Admin only)
  if (method === 'POST' && pathname === '/brands') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const { brand_name, master_outlet_id } = await request.json();
      if (!brand_name || !master_outlet_id) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Brand name and master outlet ID are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
      }

      await env.DB.prepare(
        'INSERT INTO brands (brand_name, master_outlet_id, created_by) VALUES (?, ?, ?)'
      ).bind(brand_name, master_outlet_id, decoded.userId).run();

      return addCorsHeaders(new Response(JSON.stringify({ message: 'Brand created successfully' }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: PUT /brands/:id (Admin only)
  if (method === 'PUT' && pathname.startsWith('/brands/')) {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const brandId = pathname.split('/').pop();
      const { brand_name, master_outlet_id } = await request.json();

      await env.DB.prepare(
        'UPDATE brands SET brand_name = ?, master_outlet_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(brand_name, master_outlet_id, brandId).run();

      return addCorsHeaders(new Response(JSON.stringify({ message: 'Brand updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: DELETE /brands/:id (Admin only)
  if (method === 'DELETE' && pathname.startsWith('/brands/')) {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const brandId = pathname.split('/').pop();

      // Delete allocations first
      await env.DB.prepare('DELETE FROM user_allocations WHERE brand_id = ?').bind(brandId).run();
      // Delete brand
      await env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(brandId).run();

      return addCorsHeaders(new Response(JSON.stringify({ message: 'Brand deleted successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /users (Admin only)
  if (method === 'GET' && pathname === '/users') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const { results: users } = await env.DB.prepare('SELECT id, username, role, email, created_at FROM users WHERE role = "user"').all();

      // Get allocations for each user
      const usersWithAllocations = await Promise.all(users.map(async (u) => {
        const { results: allocations } = await env.DB.prepare(`
          SELECT b.id as brand_id, b.brand_name 
          FROM brands b
          JOIN user_allocations ua ON b.id = ua.brand_id
          WHERE ua.user_id = ?
        `).bind(u.id).all();
        return { ...u, allocated_brands: allocations || [] };
      }));

      return addCorsHeaders(new Response(JSON.stringify({ users: usersWithAllocations }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: POST /users/:userId/allocate/:brandId
  // Match both /api/users/:userId/allocate/:brandId and /users/:userId/allocate/:brandId
  const allocateMatch = pathname.match(/\/users\/(\d+)\/allocate\/(\d+)/);
  if (method === 'POST' && allocateMatch) {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const userId = allocateMatch[1];
      const brandId = allocateMatch[2];

      await env.DB.prepare(
        'INSERT OR IGNORE INTO user_allocations (user_id, brand_id, allocated_by) VALUES (?, ?, ?)'
      ).bind(userId, brandId, decoded.userId).run();

      return addCorsHeaders(new Response(JSON.stringify({ message: 'Brand allocated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: DELETE /users/:userId/allocate/:brandId
  if (method === 'DELETE' && allocateMatch) {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const userId = allocateMatch[1];
      const brandId = allocateMatch[2];

      await env.DB.prepare(
        'DELETE FROM user_allocations WHERE user_id = ? AND brand_id = ?'
      ).bind(userId, brandId).run();

      return addCorsHeaders(new Response(JSON.stringify({ message: 'Allocation removed successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /users/me/allocated-brands
  if (method === 'GET' && pathname === '/users/me/allocated-brands') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const { results: brands } = await env.DB.prepare(`
        SELECT b.* 
        FROM brands b
        JOIN user_allocations ua ON b.id = ua.brand_id
        WHERE ua.user_id = ?
      `).bind(decoded.userId).all();

      return addCorsHeaders(new Response(JSON.stringify({ allocatedBrands: brands || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /data/login-logs
  if (method === 'GET' && pathname === '/data/login-logs') {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const url = new URL(request.url);
      const brandId = url.searchParams.get('brand_id');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let query = `
        SELECT l.*, b.brand_name 
        FROM login_logs l
        LEFT JOIN brands b ON l.brand_id = b.id
        WHERE 1=1
      `;
      let params = [];

      if (decoded.role !== 'admin') {
        query += ' AND l.brand_id IN (SELECT brand_id FROM user_allocations WHERE user_id = ?)';
        params.push(decoded.userId);
      }

      if (brandId) {
        query += ' AND l.brand_id = ?';
        params.push(brandId);
      }

      if (startDate) {
        query += ' AND l.login_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND l.login_date <= ?';
        params.push(endDate);
      }

      const { results: logs } = await env.DB.prepare(query + ' ORDER BY l.login_date DESC LIMIT 500').bind(...params).all();

      // Calculate summary
      const summary = {
        total_logins: logs.length,
        unique_stores: new Set(logs.map(l => l.store_id)).size,
        unique_managers: new Set(logs.map(l => l.store_manager_name)).size,
        parent_logins: logs.filter(l => l.login_type === 'parent').length,
        team_member_logins: logs.filter(l => l.login_type === 'team member').length,
      };

      return addCorsHeaders(new Response(JSON.stringify({ loginLogs: logs || [], summary }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /export/my-data
  if (method === 'GET' && pathname === '/export/my-data') {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const url = new URL(request.url);
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let query = `
        SELECT b.brand_name, b.master_outlet_id, l.* 
        FROM login_logs l
        JOIN brands b ON l.brand_id = b.id
        JOIN user_allocations ua ON l.brand_id = ua.brand_id
        WHERE ua.user_id = ?
      `;
      let params = [decoded.userId];

      if (startDate) {
        query += ' AND l.login_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND l.login_date <= ?';
        params.push(endDate);
      }

      const { results } = await env.DB.prepare(query + ' ORDER BY b.brand_name, l.login_date DESC').bind(...params).all();

      // Convert to CSV
      const headers = ['Brand Name', 'Master Outlet ID', 'Store ID', 'Store Manager', 'Login Type', 'Date'];
      const csvRows = results.map(r => [
        r.brand_name,
        r.master_outlet_id,
        r.store_id,
        r.store_manager_name,
        r.login_type,
        r.login_date
      ].map(v => `"${v}"`).join(','));

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      return addCorsHeaders(new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=my_data.csv'
        }
      }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /export/daily-login/:brandId
  if (method === 'GET' && pathname.startsWith('/export/daily-login/')) {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const brandId = pathname.split('/').pop();
      const url = new URL(request.url);
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      // Check if user has access to this brand
      if (decoded.role !== 'admin') {
        const { results } = await env.DB.prepare('SELECT id FROM user_allocations WHERE user_id = ? AND brand_id = ?').bind(decoded.userId, brandId).all();
        if (!results || results.length === 0) {
          return addCorsHeaders(new Response(JSON.stringify({ message: 'Access denied to this brand' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
        }
      }

      let query = `
        SELECT b.brand_name, b.master_outlet_id, l.* 
        FROM login_logs l
        JOIN brands b ON l.brand_id = b.id
        WHERE l.brand_id = ?
      `;
      let params = [brandId];

      if (startDate) {
        query += ' AND l.login_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND l.login_date <= ?';
        params.push(endDate);
      }

      const { results } = await env.DB.prepare(query + ' ORDER BY l.login_date DESC').bind(...params).all();

      const headers = ['Brand Name', 'Master Outlet ID', 'Store ID', 'Store Manager', 'Login Type', 'Date'];
      const csvRows = results.map(r => [
        r.brand_name,
        r.master_outlet_id,
        r.store_id,
        r.store_manager_name,
        r.login_type,
        r.login_date
      ].map(v => `"${v}"`).join(','));

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      return addCorsHeaders(new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=daily_login_data.csv'
        }
      }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // Route: GET /export/all-brands
  if (method === 'GET' && pathname === '/export/all-brands') {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== 'admin') {
        return addCorsHeaders(new Response(JSON.stringify({ message: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      const { results } = await env.DB.prepare(`
        SELECT b.brand_name, b.master_outlet_id, l.* 
        FROM login_logs l
        JOIN brands b ON l.brand_id = b.id
        ORDER BY b.brand_name, l.login_date DESC
      `).all();

      // Convert to CSV
      const headers = ['Brand Name', 'Master Outlet ID', 'Store ID', 'Store Manager', 'Login Type', 'Date'];
      const csvRows = results.map(r => [
        r.brand_name,
        r.master_outlet_id,
        r.store_id,
        r.store_manager_name,
        r.login_type,
        r.login_date
      ].map(v => `"${v}"`).join(','));

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      return addCorsHeaders(new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=all_brands_data.csv'
        }
      }));
    } catch (error) {
      return addCorsHeaders(new Response(JSON.stringify({ message: 'Internal server error', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
  }

  // 404
  return addCorsHeaders(new Response(JSON.stringify({ message: 'Route not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Worker error:', error);
      const response = new Response(
        JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return addCorsHeaders(response);
    }
  },
};
