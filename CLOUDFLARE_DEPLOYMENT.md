# Complete Cloudflare Deployment Guide

## Architecture Overview

This project uses:
- **Frontend**: React hosted on Cloudflare Pages
- **Backend**: Cloudflare Workers (Serverless Functions)
- **Database**: Cloudflare D1 (SQLite)

## Prerequisites

1. Cloudflare Account (free at https://dash.cloudflare.com)
2. Node.js 18+ installed
3. Git installed

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

Login to your Cloudflare account:
```bash
wrangler login
```

## Step 2: Create D1 Database

```bash
wrangler d1 create brand-management-db
```

Copy the `database_id` from the output.

## Step 3: Update Configuration

Edit `wrangler.toml` and replace `YOUR_DATABASE_ID` with the actual ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "brand-management-db"
database_id = "your-actual-id-here"
```

## Step 4: Initialize Database

```bash
wrangler d1 execute brand-management-db --file migrations/0001_init_schema.sql
```

This creates all tables and inserts demo users.

## Step 5: Deploy Backend (Workers)

```bash
cd /path/to/brand-management-app
wrangler deploy
```

This deploys your Cloudflare Worker API.

Save the worker URL (e.g., `https://brand-management-app.your-subdomain.workers.dev`)

## Step 6: Update Frontend API URL

Edit `frontend/.env`:

```env
REACT_APP_API_URL=https://brand-management-app.your-subdomain.workers.dev/api
```

## Step 7: Deploy Frontend (Pages)

Already configured in `wrangler.toml`. Your Cloudflare Pages project will:
1. Build the React app
2. Deploy to Cloudflare Pages
3. Serve from `https://brand-management-app.pages.dev`

The deployment happens automatically when you push to GitHub.

## Verify Deployment

### Check Backend Health
```bash
curl https://brand-management-app.your-subdomain.workers.dev/api/health
```

Should return:
```json
{
  "status": "OK",
  "message": "Brand Management API is running",
  "timestamp": "2025-12-22T..."
}
```

### Test Login
```bash
curl -X POST https://brand-management-app.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Access Frontend
Visit: `https://brand-management-app.pages.dev`

Login with:
- Username: `admin`
- Password: `admin123`

## Local Development

### Run Frontend Locally
```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000`

### Run Backend Locally (with D1)
```bash
cd /path/to/brand-management-app
wrangler dev
```

Runs on `http://localhost:8787`

Frontend `.env` is already configured to use this for development.

## Database Management

### View Database Info
```bash
wrangler d1 info brand-management-db
```

### Query Database
```bash
wrangler d1 execute brand-management-db --interactive
```

### Backup Database
```bash
wrangler d1 export brand-management-db > backup.sql
```

### Restore from Backup
```bash
wrangler d1 execute brand-management-db --file backup.sql
```

## Environment Variables

### Frontend
- `REACT_APP_API_URL` - Backend API endpoint

### Backend (set in wrangler.toml)
- Database binding: `DB` (automatically provided)

Add more variables in Cloudflare Dashboard if needed.

## Troubleshooting

### "Database not found"
```bash
wrangler d1 list
wrangler d1 create brand-management-db
```

### "Invalid database_id"
Check that database_id in `wrangler.toml` matches the output from `wrangler d1 list`

### API returning 404
- Ensure backend is deployed: `wrangler deploy`
- Check worker URL in `frontend/.env`
- CORS should be enabled automatically

### Frontend shows blank page
- Check browser console for errors (F12)
- Verify `REACT_APP_API_URL` is correct
- Clear cache and refresh

### Login not working
1. Test API endpoint manually with curl
2. Check D1 database has users table: `wrangler d1 execute brand-management-db --interactive`
3. Verify passwords in users table

## Production Checklist

- [ ] Database ID set correctly in `wrangler.toml`
- [ ] Database initialized with migrations
- [ ] Backend deployed with `wrangler deploy`
- [ ] Frontend `REACT_APP_API_URL` updated
- [ ] CORS headers configured (already done)
- [ ] JWT_SECRET changed from default (critical!)
- [ ] Environment variables set in Cloudflare Dashboard
- [ ] Database backups configured
- [ ] Custom domain configured (optional)

## Custom Domain Setup

1. Go to Cloudflare Dashboard
2. Select your Pages project
3. Settings → Custom Domains
4. Add your domain
5. Update DNS records as shown

## Performance & Scaling

Cloudflare automatically:
- Caches static assets globally
- Scales Workers based on demand
- Replicates D1 database across regions
- Provides DDoS protection

## Security

- Workers run in Cloudflare's secure environment
- D1 data encrypted at rest
- JWT authentication with 24h expiry
- CORS validation for API calls

## Cost

- **D1**: Free tier includes good usage limits
- **Workers**: Free tier includes 100,000 requests/day
- **Pages**: Unlimited bandwidth for static sites

No credit card needed for free tier!

## Support

- Cloudflare Docs: https://developers.cloudflare.com/
- Workers: https://developers.cloudflare.com/workers/
- D1: https://developers.cloudflare.com/d1/
- Pages: https://developers.cloudflare.com/pages/

---

**Status**: Ready to deploy! Follow steps 1-7 above.
