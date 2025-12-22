-- Migration: Create users table for brand management app
-- Created: 2025-12-22

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL,
  master_outlet_id TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

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
);

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
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by);
CREATE INDEX IF NOT EXISTS idx_user_allocations_user_id ON user_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allocations_brand_id ON user_allocations(brand_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_brand_id ON login_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_date ON login_logs(login_date);

-- Insert default users (passwords should be hashed in production)
INSERT OR IGNORE INTO users (username, password, role, email) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/Ko.', 'admin', 'admin@company.com'),
('user1', '$2a$10$V4aomeH7BH2awznS4wWK2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUm', 'user', 'user1@company.com');
