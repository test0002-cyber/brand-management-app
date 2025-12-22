# Testing Guide for Login Issues

## Quick Diagnostic Links

Test these URLs in your browser to diagnose the login issue:

### 1. Check API Health & Database Connection
```
https://brand-management-api.testgithub0002.workers.dev/health
```

**Expected Response (if working):**
```json
{
  "status": "OK",
  "message": "Brand Management API is running",
  "database": "Connected (admin user found)",
  "timestamp": "2025-12-22T..."
}
```

**If you see "admin user NOT found":** The database is connected but has no users. Need to initialize with migrations.

### 2. Check Environment Bindings
```
https://brand-management-api.testgithub0002.workers.dev/debug/env
```

**Expected Response:**
```json
{
  "bindings": ["DB"],
  "hasDB": true,
  "dbType": "object",
  "timestamp": "2025-12-22T..."
}
```

**If hasDB is false:** The D1 database binding is not configured in Cloudflare.

## Testing Login Endpoint

### Using Browser Console
Open the browser DevTools (F12) and run:

```javascript
fetch('https://brand-management-api.testgithub0002.workers.dev/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e))
```

## Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Database not connected** | `/health` shows error or "admin user NOT found" | Check D1 database binding in wrangler.toml; verify database ID is correct |
| **CORS error** | Browser shows "No 'Access-Control-Allow-Origin'" | Already fixed in latest version; clear browser cache and retry |
| **500 error with no message** | Login returns 500 but no error details | Check Cloudflare Worker logs with: `wrangler tail` |
| **Invalid credentials** | Correct password returns 401 | Verify user exists in D1 database; check password hashing |

## Checking Worker Logs

To see real-time logs from your deployed Worker:

```bash
cd /home/shubhamdhyani/Downloads/brand-management-app/backend
npx wrangler tail
```

This will show console.log() output from the Worker, including:
- "Login request received"
- Environment bindings check
- Database query results  
- Any error messages with stack traces

## Database Initialization

If the database is empty, initialize it with:

```bash
cd /home/shubhamdhyani/Downloads/brand-management-app

# Initialize schema
npx wrangler d1 execute brand-management-db --file migrations/0001_init_schema.sql --remote

# Insert demo users
npx wrangler d1 execute brand-management-db --file migrations/0002_insert_demo_users.sql --remote

# Verify users exist
npx wrangler d1 execute brand-management-db --command "SELECT id, username, role FROM users;" --remote
```

## Testing Steps

1. **Check Health First**
   - Visit `/health` endpoint
   - Record the response
   - If database connection fails, stop here and initialize DB

2. **Test Login**
   - Use browser console fetch() above
   - Try both `admin` and `user1` accounts
   - Share the exact error response

3. **Check Logs**
   - Run `wrangler tail` in a separate terminal
   - Retry login while watching logs
   - Copy the console output

4. **Share Results**
   - Health endpoint response
   - Login endpoint response
   - Wrangler tail output
   - Browser Network tab error details

## Pages Frontend URL

Once login works, test the full application:
```
https://brand-management-app.pages.dev
```

Or the custom domain:
```
https://47100f59.brand-management-app.pages.dev
```
