# Cloudflare D1 Database Setup Guide

## What is Cloudflare D1?
- **Serverless SQL Database** - SQLite powered by Cloudflare
- **Globally Distributed** - Fast access from anywhere
- **Built-in Replication** - Data backed up across regions
- **Free Tier** - Includes free usage limits
- **Easy Integration** - Works seamlessly with Cloudflare Pages/Workers

## Step-by-Step Setup

### Step 1: Install Wrangler CLI (if not already installed)
```bash
npm install -g wrangler
```

### Step 2: Create D1 Database
```bash
wrangler d1 create brand-management-db
```

This will output your Database ID. Copy it.

### Step 3: Update wrangler.toml
Replace `YOUR_DATABASE_ID` in `wrangler.toml` with the actual Database ID from Step 2:
```toml
[[d1_databases]]
binding = "DB"
database_name = "brand-management-db"
database_id = "your-actual-database-id-here"
```

### Step 4: Run Database Migrations
```bash
wrangler d1 execute brand-management-db --file migrations/0001_init_schema.sql
```

This will:
- Create `users` table
- Create `brands` table
- Create `user_allocations` table
- Create `login_logs` table
- Insert default admin and user accounts
- Create performance indexes

### Step 5: Verify Database
```bash
wrangler d1 info brand-management-db
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT ('admin' or 'user'),
  email TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Brands Table
```sql
CREATE TABLE brands (
  id INTEGER PRIMARY KEY,
  brand_name TEXT NOT NULL,
  master_outlet_id TEXT NOT NULL,
  created_by INTEGER (foreign key to users),
  created_at DATETIME,
  updated_at DATETIME
);
```

### User Allocations Table
```sql
CREATE TABLE user_allocations (
  id INTEGER PRIMARY KEY,
  user_id INTEGER (foreign key to users),
  brand_id INTEGER (foreign key to brands),
  allocated_by INTEGER (foreign key to users),
  created_at DATETIME
);
```

### Login Logs Table
```sql
CREATE TABLE login_logs (
  id INTEGER PRIMARY KEY,
  store_id TEXT NOT NULL,
  actual_client_store_id TEXT NOT NULL,
  store_manager_name TEXT NOT NULL,
  store_manager_number TEXT NOT NULL,
  login_type TEXT ('parent' or 'team member'),
  login_date DATE NOT NULL,
  brand_id INTEGER (foreign key to brands),
  created_at DATETIME
);
```

## Default Users

After running migrations, two demo accounts are created:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 (hashed) | admin |
| user1 | user123 (hashed) | user |

## Query Examples

### Select all users
```sql
SELECT * FROM users;
```

### Get user by username
```sql
SELECT * FROM users WHERE username = 'admin';
```

### Get all brands created by a user
```sql
SELECT * FROM brands WHERE created_by = 1;
```

### Get all users allocated to a brand
```sql
SELECT u.* FROM users u
JOIN user_allocations ua ON u.id = ua.user_id
WHERE ua.brand_id = 1;
```

## Backup and Restore

### Backup Database
```bash
wrangler d1 export brand-management-db > backup.sql
```

### Restore from Backup
```bash
wrangler d1 execute brand-management-db --file backup.sql
```

## Production Considerations

1. **Password Hashing**: Ensure passwords are bcrypt hashed (use backend)
2. **Environment Variables**: Keep database IDs in environment variables
3. **Replication**: D1 automatically replicates data globally
4. **Backup**: Regular backups recommended for production
5. **Rate Limiting**: D1 has usage limits - check Cloudflare docs

## Troubleshooting

### Database Not Found
```bash
wrangler d1 list
```
Check if database exists, create if needed.

### Migration Failed
```bash
# Check migration syntax
wrangler d1 execute brand-management-db --file migrations/0001_init_schema.sql --dry-run
```

### Connection Issues
- Ensure `binding = "DB"` matches in wrangler.toml
- Check database_id is correct
- Verify Wrangler version is up to date

## Next Steps

1. Update backend API to use D1 instead of SQLite
2. Create Worker functions for API endpoints
3. Deploy backend to Cloudflare Workers
4. Configure CORS for frontend-backend communication

## Resources
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Example Projects](https://developers.cloudflare.com/d1/examples/)
