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
  const pathname = url.pathname;

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

      // Insert demo users
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
      ).bind('admin', 'admin_hashed_password_here', 'admin', 'admin@brand-management.com').run();

      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
      ).bind('user1', 'user1_hashed_password_here', 'user', 'user1@brand-management.com').run();

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

  // 404
  const response = new Response(
    JSON.stringify({ message: 'Route not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
  return addCorsHeaders(response);
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
