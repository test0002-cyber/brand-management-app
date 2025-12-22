const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create brands table
      db.run(`
        CREATE TABLE IF NOT EXISTS brands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand_name TEXT NOT NULL,
          master_outlet_id TEXT NOT NULL,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Create user allocations table (for brand allocation)
      db.run(`
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
      `);

      // Create login logs table (mock data)
      db.run(`
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
      `);

      console.log('✅ Database tables created successfully');
      
      // Insert default users
      insertDefaultUsers();
    });
  });
}

function insertDefaultUsers() {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const userPassword = bcrypt.hashSync('user123', 10);

  db.run(`
    INSERT OR IGNORE INTO users (username, password, role, email) 
    VALUES (?, ?, ?, ?)
  `, ['admin', adminPassword, 'admin', 'admin@company.com']);

  db.run(`
    INSERT OR IGNORE INTO users (username, password, role, email) 
    VALUES (?, ?, ?, ?)
  `, ['user1', userPassword, 'user', 'user1@company.com']);

  console.log('✅ Default users created:');
  console.log('   Admin: username=admin, password=admin123');
  console.log('   User: username=user1, password=user123');
}

function insertMockLoginData() {
  const brands = [
    { id: 1, brand_name: 'Brand A', master_outlet_id: 'OUTLET001' },
    { id: 2, brand_name: 'Brand B', master_outlet_id: 'OUTLET002' }
  ];

  // Insert mock login data for the past 30 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];

    brands.forEach(brand => {
      // Generate random number of logins per day (0-10)
      const loginCount = Math.floor(Math.random() * 11);
      
      for (let j = 0; j < loginCount; j++) {
        const storeId = `STORE${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const actualClientStoreId = `CLIENT${String(Math.floor(Math.random() * 500)).padStart(3, '0')}`;
        const managerNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];
        const managerName = managerNames[Math.floor(Math.random() * managerNames.length)];
        const managerNumber = `+1${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`;
        const loginType = Math.random() > 0.3 ? 'parent' : 'team member';

        db.run(`
          INSERT INTO login_logs 
          (store_id, actual_client_store_id, store_manager_name, store_manager_number, login_type, login_date, brand_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [storeId, actualClientStoreId, managerName, managerNumber, loginType, dateString, brand.id]);
      }
    });
  }

  console.log('✅ Mock login data inserted for past 30 days');
}

function insertMockBrands() {
  db.run(`
    INSERT OR IGNORE INTO brands (brand_name, master_outlet_id, created_by)
    VALUES (?, ?, ?)
  `, ['Brand A', 'OUTLET001', 1]);

  db.run(`
    INSERT OR IGNORE INTO brands (brand_name, master_outlet_id, created_by)
    VALUES (?, ?, ?)
  `, ['Brand B', 'OUTLET002', 1]);

  console.log('✅ Mock brands inserted');
}

// Initialize everything
initializeDatabase()
  .then(() => {
    insertMockBrands();
    insertMockLoginData();
    console.log('🎉 Database initialization completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });