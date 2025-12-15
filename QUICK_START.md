# Quick Start Guide - Cloudflare Deployment

This is a simplified guide to get you up and running quickly.

## Prerequisites

- Node.js installed
- Cloudflare account (free)

## Step 1: Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

## Step 2: Setup Backend (5 minutes)

```bash
cd cloudflare-worker
npm install

# Create database
wrangler d1 create voting-app-db
# Copy the database_id from output and update wrangler.toml

# Setup database
wrangler d1 migrations apply voting-app-db

# Create storage
wrangler r2 bucket create voting-app-images

# Set password (optional)
wrangler secret put ADMIN_PASSWORD

# Deploy
npm run deploy
```

**Save the worker URL** that appears after deployment!

## Step 3: Deploy Frontend (2 minutes)

### Option A: Dashboard (Easiest)
1. Go to https://dash.cloudflare.com > Pages
2. Create project > Upload assets
3. Upload the `public` folder
4. Deploy

### Option B: CLI
```bash
cd ..  # Back to project root
wrangler pages deploy public --project-name=voting-app
```

## Step 4: Connect Worker to Pages (1 minute)

1. Go to Pages > your-project > Settings > Functions
2. Under "Workers integration", add: `voting-app-api`
3. Add route: `/api/*`

## Step 5: Update Frontend (Optional)

If you connected the worker via `/api/*` route, run:

```bash
chmod +x update-frontend-for-cloudflare.sh
./update-frontend-for-cloudflare.sh
```

This updates all API calls to use `/api` prefix.

**OR** if you prefer, update the worker routes to handle root-level paths (already supported in the code).

## Step 6: Test!

Visit your Pages URL and test:
- ✅ Admin login
- ✅ Adding candidates
- ✅ Voting
- ✅ Viewing results

## That's it! 🎉

Your app is now running on Cloudflare's free tier!

## Need the Full Guide?

See `CLOUDFLARE_SETUP.md` for detailed instructions and troubleshooting.

