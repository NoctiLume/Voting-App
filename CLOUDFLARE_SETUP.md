# Complete Cloudflare Pages + Workers Setup Guide

This guide will help you deploy your voting app to Cloudflare, replacing Firebase Hosting and Functions.

## Architecture Overview

- **Frontend**: Cloudflare Pages (serves `/public` folder)
- **Backend API**: Cloudflare Workers (handles all API routes)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Storage**: Cloudflare R2 (for candidate photos)

## Step 1: Setup Cloudflare Account

1. Sign up at [cloudflare.com](https://cloudflare.com) (free account is sufficient)
2. Install Wrangler CLI (Cloudflare's command-line tool):
   ```bash
   npm install -g wrangler
   ```
3. Login to Cloudflare:
   ```bash
   wrangler login
   ```

## Step 2: Setup Backend (Cloudflare Workers)

### 2.1 Navigate to worker directory

```bash
cd cloudflare-worker
npm install
```

### 2.2 Create D1 Database

```bash
wrangler d1 create voting-app-db
```

**Copy the `database_id` from the output** - you'll need it next!

### 2.3 Update wrangler.toml

Open `cloudflare-worker/wrangler.toml` and replace `YOUR_DATABASE_ID_HERE` with the database_id you just copied.

### 2.4 Run Database Migrations

```bash
wrangler d1 migrations apply voting-app-db
```

This creates the `candidates` and `votes` tables.

### 2.5 Create R2 Bucket for Images

```bash
wrangler r2 bucket create voting-app-images
```

### 2.6 Set Admin Password (Optional)

```bash
wrangler secret put ADMIN_PASSWORD
```

Enter your admin password when prompted. If you skip this, update the code to use your preferred authentication method.

### 2.7 Deploy the Worker

```bash
npm run deploy
```

You'll get a URL like: `https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`

**Save this URL** - you'll need it for the frontend!

## Step 3: Setup Frontend (Cloudflare Pages)

### Option A: Deploy via Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Pages**
2. Click **"Create a project"** > **"Upload assets"** (or connect to Git)
3. If uploading:
   - Upload the entire `/public` folder
   - **Project name**: `voting-app` (or your choice)
4. Click **"Deploy site"**

### Option B: Deploy via CLI

From the project root:

```bash
wrangler pages deploy public --project-name=voting-app
```

### 3.1 Connect Worker to Pages

To use your worker API with the same domain:

1. Go to Pages > your project > **Settings** > **Functions**
2. Scroll to **Workers integration**
3. Add your worker name: `voting-app-api`
4. Add route pattern: `/api/*`

This will route `/api/login`, `/api/submitVote`, etc. to your worker.

### 3.2 Update Frontend to Use API Routes

Since you've connected the worker, update your frontend fetch calls:

- Change `/login` → `/api/login`
- Change `/submitVote` → `/api/submitVote`
- Change `/getVotes` → `/api/getVotes`
- etc.

**OR** update the worker to handle routes without `/api` prefix (see Step 4).

## Step 4: Update Worker Routes (Alternative)

If you want to use routes without `/api` prefix (like `/login` instead of `/api/login`):

### Option A: Use Workers Routes (Recommended)

1. Go to Workers & Pages > **voting-app-api** > **Settings** > **Triggers**
2. Add a route: `your-pages-domain.com/*` 
3. Update worker code to handle all routes, not just API routes

### Option B: Update Worker Code

Edit `cloudflare-worker/src/index-d1.js` and update the routing logic to handle routes directly (without `/api` prefix).

## Step 5: Update Frontend for R2 Image URLs

The frontend currently uses Firebase Storage URLs. Update image display to use R2:

1. In `public/pageadmin/calon/calon.js`, line 71, change:
   ```javascript
   previewImage.src = `/__storage/${data.photoPath}`;
   ```
   To:
   ```javascript
   // If using R2 public URL:
   previewImage.src = `https://YOUR_R2_PUBLIC_URL/${data.photoPath}`;
   
   // OR if serving through worker:
   previewImage.src = `/api/images/${data.photoPath}`;
   ```

2. Add an image serving route to your worker if needed.

## Step 6: Configure Environment Variables

In Cloudflare Dashboard:

### For Worker:
- Go to Workers & Pages > **voting-app-api** > **Settings** > **Variables**
- Add:
  - `ADMIN_PASSWORD` (or use secret)

### For Pages:
- Go to Pages > **voting-app** > **Settings** > **Environment Variables**
- Add any frontend config if needed

## Step 7: Test Your Deployment

1. Visit your Pages URL
2. Test admin login
3. Test voting functionality
4. Check vote counts

## Step 8: Migrate Data (Optional)

If you have existing data in Firebase:

1. Export Firestore data
2. Import to D1 (you'll need to write a migration script)
3. Download Firebase Storage images
4. Upload to R2 bucket

Or start fresh - the database will be empty initially.

## Troubleshooting

### CORS Errors
- Make sure CORS headers are set in worker responses (already included in the code)

### Database Errors
- Verify D1 database is created and migrations are applied
- Check database_id in wrangler.toml matches your database

### Image Upload Errors
- Verify R2 bucket is created
- Check bucket name matches `wrangler.toml`
- Verify R2_BUCKET binding is correct

### Authentication Issues
- Check cookie settings (httpOnly, secure, sameSite)
- Verify ADMIN_PASSWORD secret is set correctly

## Cost

**Everything is FREE** on Cloudflare's free tier:
- ✅ Pages: Unlimited bandwidth
- ✅ Workers: 100,000 requests/day
- ✅ D1: 5 million reads/day, 100,000 writes/day
- ✅ R2: 10 GB storage, 1 million Class A operations/month

This is more than enough for your voting app!

## Next Steps

1. Set up custom domain (optional)
2. Enable analytics
3. Set up staging/production environments
4. Add monitoring/alerting

## Need Help?

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)

