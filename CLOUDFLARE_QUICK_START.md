# Cloudflare Pages - Quick Start (5 Minutes)

## TL;DR - Just Follow These Steps

### 1️⃣ Create Cloudflare Account
Go to: https://dash.cloudflare.com/sign-up (free)

### 2️⃣ Connect GitHub
In Cloudflare Dashboard:
- Click **Pages**
- Click **Create a project**
- Select **Connect to Git**
- Choose **GitHub**
- Authorize Cloudflare
- Select: `brand-management-app` repository

### 3️⃣ Configure Build
When asked for build settings, enter:

```
Project name:        brand-management-app
Production branch:   main
Build command:       cd frontend && npm install && npm run build
Build output:        frontend/build
```

### 4️⃣ Deploy!
Click **Save and Deploy**

⏳ Wait 2-3 minutes...

### 5️⃣ Your App is Live! 🎉
Visit: `https://brand-management-app.pages.dev`

Login:
- Username: `admin`
- Password: `admin123`

---

## What Happens Next?

✅ Every time you push to GitHub:
```bash
git push origin main
```

↓

🤖 Cloudflare automatically:
- Builds your app
- Deploys it
- Makes it live

**You don't need to do anything else!**

---

## Need Help?
See `CLOUDFLARE_DEPLOYMENT.md` for detailed instructions
