# Cloudflare Pages Deployment Guide

## Overview
This guide will help you deploy the Brand Management App frontend to Cloudflare Pages.

## What is Cloudflare Pages?
- **Free hosting** for static sites and SPAs
- **Global CDN** - fast access from anywhere
- **Automatic deployments** from GitHub
- **Zero configuration** needed
- **Built-in analytics** and performance monitoring

## Prerequisites
1. Cloudflare account (free - https://dash.cloudflare.com/sign-up)
2. GitHub repository (already created: https://github.com/test0002-cyber/brand-management-app)

## Step-by-Step Deployment

### Step 1: Create/Sign In to Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account or sign in
3. Verify your email

### Step 2: Connect GitHub Repository to Cloudflare
1. In Cloudflare Dashboard, navigate to **Pages**
2. Click **Create a project** or **Pages** in left sidebar
3. Click **Connect to Git**
4. Select **GitHub** as your Git provider
5. Click **Authorize Cloudflare**
6. You'll be redirected to GitHub for authorization
7. Click **Authorize cloudflare**

### Step 3: Select Your Repository
1. After authorization, select your repository: `brand-management-app`
2. Click **Begin setup**

### Step 4: Configure Build Settings
Fill in these settings:

| Field | Value |
|-------|-------|
| **Project name** | brand-management-app |
| **Production branch** | main |
| **Build command** | `cd frontend && npm install && npm run build` |
| **Build output directory** | `frontend/build` |
| **Environment variables** | Leave empty (optional) |

**Note:** Do NOT change the build command. It specifically navigates to the frontend folder.

### Step 5: Deploy
1. Click **Save and Deploy**
2. Cloudflare will start building your project
3. Wait 2-3 minutes for the build to complete
4. You'll see a success message with your site URL

### Step 6: Access Your App
Your app will be available at:
```
https://brand-management-app.pages.dev
```

Or a similar URL assigned by Cloudflare.

**Login Credentials:**
- Username: `admin`
- Password: `admin123`

## Automatic Deployments
After initial setup, **every push to the main branch** will automatically trigger a new deployment:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Cloudflare will automatically:
1. Detect the push
2. Build your frontend
3. Deploy the updated app
4. Make it live in seconds

## View Deployment Logs
1. Go to your Cloudflare Pages project
2. Click **Deployments** tab
3. Click any deployment to view build logs
4. Useful for debugging build errors

## Environment Variables (Optional)
To add environment variables for different environments:

1. Go to your Cloudflare Pages project
2. Settings → **Environment variables**
3. Add variables for production/preview environments

Example:
```
REACT_APP_API_URL = https://api.yourdomain.com
```

## Custom Domain (Optional)
To use a custom domain instead of `.pages.dev`:

1. Go to your Cloudflare Pages project
2. Settings → **Custom domains**
3. Add your domain
4. Follow DNS setup instructions

## Rollback to Previous Version
If you need to revert to a previous deployment:

1. Go to **Deployments** tab
2. Find the previous version you want
3. Click the three dots **...**
4. Select **Rollback to this deployment**

## Troubleshooting

### Build Fails with "npm: not found"
- Cloudflare runs Node.js 18.x by default
- Ensure `package.json` has all dependencies listed
- Check the build logs for specific errors

### App Shows Blank Page
- Check browser console (F12) for errors
- Ensure React Router setup is correct (no GitHub Pages basename)
- Clear browser cache (Ctrl+Shift+Del)

### 404 on Page Refresh
- This is normal for SPAs (Single Page Applications)
- Cloudflare automatically handles this
- If persisting, check if `_redirects` file is needed (usually not required)

### API Calls Not Working
- Backend needs to be deployed separately (Heroku, Render, AWS, etc.)
- Update `REACT_APP_API_URL` in environment variables
- Ensure backend has CORS enabled for your Cloudflare domain

## Backend API Setup
The frontend only handles the UI. To make the app fully functional:

1. **Deploy Backend** to a service like:
   - Heroku (https://www.heroku.com)
   - Render (https://render.com)
   - Railway (https://railway.app)
   - AWS (https://aws.amazon.com)

2. **Update API URL**:
   - Set `REACT_APP_API_URL` environment variable in Cloudflare
   - Example: `https://your-api.herokuapp.com/api`

3. **Enable CORS**:
   - Backend server.js should have:
   ```javascript
   app.use(cors());
   ```

## Monitoring and Analytics
Cloudflare Pages provides:
- Real-time analytics
- Performance metrics
- Error tracking
- Traffic insights

View in your project dashboard under **Analytics & Log** tab.

## Support
- Cloudflare Docs: https://developers.cloudflare.com/pages/
- GitHub Issues: https://github.com/test0002-cyber/brand-management-app/issues

---

**Deployment Status:** Ready to deploy! Follow Step 1 to begin.
