# GitHub Pages Deployment Guide

## Prerequisites
1. A GitHub account
2. The repository pushed to GitHub
3. GitHub Actions enabled in your repository

## Step 1: Update Homepage URL
The `homepage` field in `frontend/package.json` has been set to a placeholder. Update it with your actual GitHub username:

```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/brand-management-app"
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

## Step 2: Push to GitHub

Initialize and push the repository:

```bash
# Navigate to project root
cd /path/to/brand-management-app

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Brand Management App"

# Add remote repository (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/brand-management-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: Select "Deploy from a branch"
   - Branch: Select `gh-pages` and `/ (root)`
4. Save

The GitHub Actions workflow will automatically:
- Build the frontend when you push to `main` or `master` branch
- Deploy to the `gh-pages` branch
- Make it available at: `https://YOUR_GITHUB_USERNAME.github.io/brand-management-app`

## Step 4: Verify Deployment

After pushing to GitHub:
1. Go to your repository
2. Click **Actions** tab
3. Watch the "Deploy to GitHub Pages" workflow run
4. Once completed successfully, your app will be live at the GitHub Pages URL

## Manual Deployment (Local)

If you want to deploy manually from your machine:

```bash
cd frontend

# Update the homepage in package.json first!

# Install dependencies
npm install

# Deploy
npm run deploy
```

## Important Notes

- The backend API is running on `http://localhost:5000`
- The GitHub Pages deployment is **frontend only**
- For production use, you'll need to deploy the backend separately (e.g., Heroku, Render, AWS)
- Update the `REACT_APP_API_URL` environment variable if deploying to a different backend URL

## Troubleshooting

- **Blank page or 404 errors**: Ensure the `homepage` URL is correctly set
- **API not working**: The backend needs to be deployed separately and CORS configured
- **Routing issues**: The `basename` in `src/index.js` handles GitHub Pages subdirectory routing

