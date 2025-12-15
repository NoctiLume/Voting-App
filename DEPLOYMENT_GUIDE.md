# Cloudflare Pages + Workers Deployment Guide

This guide will help you deploy your voting app to Cloudflare Pages (frontend) and Cloudflare Workers (backend).

## Architecture

- **Frontend**: Cloudflare Pages (serves static HTML/CSS/JS from `/public` folder)
- **Backend API**: Cloudflare Workers (handles all API routes)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Storage**: Cloudflare R2 (for candidate photos)

## Step-by-Step Deployment

### Part 1: Backend (Cloudflare Workers)

1. **Navigate to the worker directory:**
   ```bash
   cd cloudflare-worker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```
   This will open a browser window for authentication.

4. **Create D1 Database:**
   ```bash
   npx wrangler d1 create voting-app-db
   ```
   Copy the `database_id` from the output.

5. **Update `wrangler.toml`:**
   Open `cloudflare-worker/wrangler.toml` and replace `YOUR_DATABASE_ID_HERE` with the database_id you just copied.

6. **Create database schema:**
   ```bash
   npx wrangler d1 migrations apply voting-app-db
   ```

7. **Create R2 Bucket for images:**
   ```bash
   npx wrangler r2 bucket create voting-app-images
   ```

8. **Set admin password (optional):**
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   ```
   Enter your admin password when prompted. If you skip this, the default password hash will be used.

9. **Deploy the worker:**
   ```bash
   npm run deploy
   ```
   This will give you a URL like: `https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`

10. **Copy the Worker URL** - you'll need it for the frontend configuration.

### Part 2: Frontend (Cloudflare Pages)

#### Option A: Deploy via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > Pages
2. Click "Create a project" > "Connect to Git"
3. Connect your GitHub/GitLab/Bitbucket repository
4. Configure build settings:
   - **Framework preset**: None (or Static)
   - **Build command**: (leave empty - no build needed)
   - **Build output directory**: `public`
   - **Root directory**: (leave as `/`)

5. Click "Save and Deploy"

#### Option B: Deploy via Wrangler CLI

1. **From the project root, deploy to Pages:**
   ```bash
   npx wrangler pages deploy public --project-name=voting-app
   ```

2. This will create a Pages project and deploy your static files.

### Part 3: Connect Frontend to Backend

The frontend needs to know where the backend API is. You have two options:

#### Option 1: Use Workers route in Pages (Recommended)

This allows you to use relative URLs like `/login`, `/submitVote`, etc.

1. In Cloudflare Dashboard, go to your Pages project
2. Go to **Settings** > **Functions**
3. Under **Workers integration**, add your worker: `voting-app-api`
4. Now your frontend can call `/api/*` routes which will be proxied to your worker

But wait - your worker handles routes directly, so we need to update the worker routing or use a different approach.

Actually, the **simplest approach** is to:

1. Update your frontend to use the worker URL directly, OR
2. Use Cloudflare Workers route matching to connect the Pages site to your worker

#### Option 2: Update Frontend to Use Worker URL (Simpler)

We'll create a simple config file that your frontend can use:

1. Create `public/config.js`:
   ```javascript
   window.API_BASE_URL = 'https://voting-app-api.YOUR_SUBDOMAIN.workers.dev';
   ```

2. Include it in your HTML files before other scripts

3. Update all fetch calls to use `window.API_BASE_URL`

Actually, let me create a better solution - we'll use environment variables or a simpler approach.

### Option 3: Use Cloudflare Workers Custom Domain (Best)

1. In your Worker settings, add a custom route:
   - Go to Workers & Pages > voting-app-api > Settings > Triggers
   - Add a route: `yourdomain.com/api/*`
   
2. Update your frontend to use relative URLs: `/api/login`, `/api/submitVote`, etc.

3. In `wrangler.toml`, add routes configuration

Actually, the **easiest** is to deploy everything together using Cloudflare Pages with Functions. Let me create that setup instead.

## Alternative: Everything in Cloudflare Pages Functions

We can put the worker code directly in the Pages Functions directory, which is simpler.

### Updated Setup (Recommended)

1. **Deploy Worker separately** (as done above)

2. **Deploy Frontend to Pages**

3. **Update frontend API calls** to use the worker URL OR set up a proxy

Actually, let me check what's the best practice... The simplest for now is:

1. Deploy worker to: `https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`
2. Update frontend fetch calls to use this URL
3. Or set up a custom domain route

Let me create a helper script to update the frontend.

