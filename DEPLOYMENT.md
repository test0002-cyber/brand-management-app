# Cloudflare Deployment Guide

This guide walks you through deploying the Brand Management Application to Cloudflare (Pages + Worker + D1 Database).

## Architecture

- **Frontend**: React app hosted on Cloudflare Pages (`frontend/build`)
- **Backend**: Cloudflare Worker deployed from `backend/wrangler.toml`
- **Database**: Cloudflare D1 (SQLite) bound to the Worker via `DB` binding
- **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`) for automated deployment

## Prerequisites

Before deploying, you will need:

1. **Cloudflare Account** — sign up at https://dash.cloudflare.com if you don't have one
2. **GitHub Account** — with the repository cloned/forked
3. **Git** — installed locally for pushing changes

## Step-by-Step Setup

### Step 1: Create a Cloudflare Pages Project

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to **Pages** (left sidebar)
3. Click **Create a project**
4. Choose **Connect to Git** and authorize GitHub
5. Select the `brand-management-app` repository
6. Configure the build settings:
   - **Framework preset**: None (or Other)
   - **Build command**: `npm install --prefix frontend && npm run build --prefix frontend`
   - **Build output directory**: `frontend/build`
   - **Root directory**: leave blank (or `/` if required)
7. Click **Save and Deploy**
8. Note the **Pages project name** (visible in the URL, e.g., `brand-management-app` or similar)

**Output**: You now have a Pages project. If the deploy fails initially (no GitHub secrets yet), that's expected; it will retry when you add secrets and push.

### Step 2: Create a Cloudflare D1 Database

1. In Cloudflare Dashboard, navigate to **Workers & Pages** → **D1**
2. Click **Create database**
3. Name it: `brand-management-db` (or your preferred name)
4. Click **Create**
5. Once created, open the database and navigate to the **Details** tab
6. **Copy the Database ID** (long alphanumeric string like `5006f1b8-8bcd-4780-8e20-3644d4727f6a`)
7. Verify it matches the `database_id` in `backend/wrangler.toml`; if not, update it

**Important**: Do NOT initialize the schema via the UI yet; we'll do it via the CLI or workflow in the next steps.

### Step 3: Initialize D1 Database Schema Locally

Before deploying the Worker, initialize the D1 database schema. You can do this locally using Wrangler:

```bash
# Install Wrangler globally (if not already installed)
npm install -g wrangler

# Ensure you're logged in to Cloudflare
wrangler login

# Navigate to the backend directory
cd backend

# Execute the migration SQL file against your D1 database
npx wrangler d1 execute --binding DB --file ../migrations/0001_init_schema.sql
```

This command:
- Reads the SQL from `migrations/0001_init_schema.sql`
- Executes it against your D1 database
- Creates the required tables: `users`, `brands`, `user_allocations`, `login_logs`

**Verification**: Log into Cloudflare Dashboard → D1 → select your database → **Query** tab and run:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```
You should see: `users`, `brands`, `user_allocations`, `login_logs`.

### Step 4: Create a Cloudflare API Token

To allow GitHub Actions to deploy on your behalf, create an API token with the necessary permissions:

1. In Cloudflare Dashboard, click your **Profile** (bottom-left)
2. Navigate to **API Tokens**
3. Click **Create Token**
4. Choose a template or use **Create Custom Token** with:
   - **Permissions**:
     - Account → Workers Scripts → Edit
     - Account → Workers Scripts → Publish
     - Account → Pages → Deploy
     - Account → D1 → Edit (if you want to allow D1 access)
   - **Account Resources**: Select your account
   - **TTL**: 1 year or custom as needed
5. Click **Continue to summary** → **Create Token**
6. **Copy the token** (long string starting with `v1.`)
7. **Store it securely** — do NOT share it in chat or in version control

### Step 5: Add GitHub Repository Secrets

1. Open your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

| Secret Name | Value |
| --- | --- |
| `CF_API_TOKEN` | (Paste the Cloudflare API token from Step 4) |
| `CF_ACCOUNT_ID` | (Your Cloudflare Account ID, found in Cloudflare Dashboard bottom-left near Profile) |
| `CF_PAGES_PROJECT_NAME` | (Pages project name from Step 1, e.g., `brand-management-app`) |
| `D1_DATABASE_ID` | (Database ID from Step 2) |
| `CF_PAGES_URL` | (Optional) Your Pages site URL once deployed, e.g., `https://brand-management-app.pages.dev` |
| `CF_WORKER_URL` | (Optional) Your Worker URL, e.g., `https://brand-management-api.testgithub0002.workers.dev` |

**Note**: Do NOT include backticks, quotes, or extra spaces in secret values.

### Step 6: Trigger the GitHub Actions Deployment

Once secrets are added, the workflow will run automatically on the next push to `main`. To trigger it manually:

1. Go to your GitHub repository
2. Navigate to **Actions**
3. Select the **Build and Deploy to Cloudflare** workflow
4. Click **Run workflow** → **Run workflow**

The workflow will:
- Checkout the code
- Install Node.js dependencies
- Build the frontend
- Deploy `frontend/build` to Cloudflare Pages
- Publish the backend Worker
- Run optional smoke tests (if `CF_PAGES_URL` and `CF_WORKER_URL` are set)

**Monitor the run**: Click the workflow run and watch the logs. If any step fails, check the error message and retry after fixing the issue.

### Step 7: Verify the Deployment

Once the workflow completes successfully:

#### Pages Site
1. Open your Pages site (usually `https://<project-name>.pages.dev`)
2. You should see the login page
3. Open DevTools (F12) → **Network** tab
4. Attempt to log in with credentials (admin/admin123)
5. Check that the `/auth/login` request goes to your Worker URL (not localhost)

#### Backend Worker
1. Open your Worker URL (e.g., `https://brand-management-api.testgithub0002.workers.dev`)
2. You should see a Worker response (might be 404 or a status page)
3. Check Worker logs in Cloudflare Dashboard → **Workers & Pages** → your Worker → **Logs**

#### D1 Database
1. In Cloudflare Dashboard → **D1** → select your database
2. Navigate to **Query** and run:
   ```sql
   SELECT COUNT(*) as user_count FROM users;
   ```
3. Verify the schema is initialized

## Troubleshooting

### Issue: `Pages Action` deployment fails

**Error**: `Failed to find project with name ...`
- **Fix**: Verify `CF_PAGES_PROJECT_NAME` matches the Pages project name in the Cloudflare Dashboard

**Error**: `Invalid API token`
- **Fix**: Regenerate the API token in Cloudflare Dashboard and update the GitHub secret `CF_API_TOKEN`

### Issue: `Wrangler publish` fails

**Error**: `Workers script not found`
- **Fix**: Ensure `backend/wrangler.toml` contains `main = "src/index.js"` and the file exists

**Error**: `D1 binding not found`
- **Fix**: Verify the `database_id` in `backend/wrangler.toml` matches the D1 database ID from Cloudflare Dashboard

### Issue: D1 schema is not initialized

- **Fix**: Run the local initialization command (Step 3) or manually execute the SQL in the Cloudflare Dashboard D1 Query tab

### Issue: Frontend shows "Network Error" on login

- **Solution**: Check the Worker URL in DevTools Network tab:
  - If it's `http://localhost:5000`, the frontend `env.js` did not load properly
  - Verify `frontend/public/env.js` is present in the Pages site
  - Hard-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)

## Environment Configuration

### Frontend Runtime Configuration

The frontend includes a runtime override file `frontend/public/env.js` that sets the API base URL at runtime. This allows you to change the API endpoint without rebuilding the app.

To update the API URL after deployment:
1. Edit `frontend/public/env.js` in the repository
2. Change the value:
   ```javascript
   window._env_.REACT_APP_API_URL = 'https://your-new-worker-url/api';
   ```
3. Commit and push to `main` (GitHub Actions will redeploy)

Or, if you have Pages Admin access, edit the file directly in the Pages build artifacts (though this is not recommended for production).

### Backend Environment Variables

To add environment variables to the Worker:
1. In Cloudflare Dashboard, navigate to **Workers & Pages** → your Worker → **Settings** → **Environment variables** (or **Secrets**)
2. Add key-value pairs
3. Click **Save and deploy**

Alternatively, use `wrangler secret` CLI:
```bash
cd backend
wrangler secret put SECRET_KEY --env production
```

## Next Steps

1. Visit your Pages site and test the application
2. Log in with the demo credentials (admin/admin123)
3. Create brands, allocate users, and export data to verify functionality
4. Monitor Worker logs in the Cloudflare Dashboard for any errors
5. Check D1 database queries in the Dashboard to verify data is being stored

## Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Secrets Docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support

If you encounter issues:
1. Check the GitHub Actions logs in your repository
2. Review the Cloudflare Dashboard logs for Pages and Workers
3. Verify all GitHub secrets are set correctly
4. Ensure the D1 database schema is initialized
5. Confirm your API token has the correct permissions

