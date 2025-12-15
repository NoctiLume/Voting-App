# Deploy Your Voting App - Step by Step

Follow these steps in order:

## Step 1: Login to Cloudflare ⚠️ REQUIRED FIRST

```bash
cd cloudflare-worker
npx wrangler login
```

This will open a browser window. Log in with your Cloudflare account (create one at cloudflare.com if needed - it's FREE).

## Step 2: Create Database

```bash
npx wrangler d1 create voting-app-db
```

**IMPORTANT:** Copy the `database_id` that appears in the output!

## Step 3: Update wrangler.toml

Open `cloudflare-worker/wrangler.toml` in a text editor and replace `YOUR_DATABASE_ID_HERE` with the database_id you copied.

## Step 4: Setup Database Schema

```bash
npx wrangler d1 migrations apply voting-app-db
```

## Step 5: Create Storage Bucket

```bash
npx wrangler r2 bucket create voting-app-images
```

## Step 6: Set Admin Password (Optional)

```bash
npx wrangler secret put ADMIN_PASSWORD
```

Enter your admin password when prompted. Or skip this and update the code later.

## Step 7: Deploy the Backend

```bash
npx wrangler deploy
```

**SAVE THE URL** that appears! It will be something like:
`https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`

## Step 8: Deploy the Frontend

From the project root directory:

```bash
cd ..
npx wrangler pages deploy public --project-name=voting-app
```

## Step 9: Connect Worker to Pages

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages" in sidebar
3. Click on your "voting-app" Pages project
4. Go to "Settings" tab
5. Click "Functions" in the sidebar
6. Scroll to "Workers integration"
7. Click "Add integration"
8. Select your worker: `voting-app-api`
9. Add route pattern: `/api/*`
10. Save

## Step 10: Update Frontend API Calls (if using /api prefix)

```bash
./update-frontend-for-cloudflare.sh
```

Then redeploy the frontend:

```bash
npx wrangler pages deploy public --project-name=voting-app
```

## Step 11: Test!

Visit your Pages URL (shown after deployment) and test:
- Admin login
- Add a candidate
- Vote
- View results

## Troubleshooting

- **Can't login?** Make sure you have a Cloudflare account (free is fine)
- **Database errors?** Double-check the database_id in wrangler.toml
- **Can't deploy?** Make sure you're logged in (`npx wrangler login`)

## Need Help?

All the code is ready - just follow these steps! The hard part (writing code) is done. 😊

