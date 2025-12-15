# Deploy Without R2 Storage

No problem! Your app will work perfectly without R2. Images just won't be uploaded/stored, but voting and all other features will work fine.

## What We Changed:
- ✅ Made R2 optional in the code
- ✅ Image uploads will be skipped gracefully if R2 isn't available
- ✅ All other features (voting, candidates, etc.) work normally

## Continue Deployment:

### Step 1: Set Admin Password (Optional but Recommended)

```bash
cd cloudflare-worker
npx wrangler secret put ADMIN_PASSWORD
```

Enter a password when prompted. This is for admin login.

### Step 2: Deploy the Backend Worker

```bash
npx wrangler deploy
```

**Save the URL** that appears! It will be something like:
`https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`

### Step 3: Deploy the Frontend

From project root:

```bash
cd ..
npx wrangler pages deploy public --project-name=voting-app
```

**Save the Pages URL** that appears!

### Step 4: Connect Worker to Pages

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages" in sidebar
3. Click on your "voting-app" Pages project
4. Go to "Settings" tab
5. Click "Functions" in sidebar
6. Scroll to "Workers integration"
7. Click "Add integration"
8. Select your worker: `voting-app-api`
9. Add route pattern: `/api/*`
10. Save

### Step 5: Update Frontend API Calls

```bash
./update-frontend-for-cloudflare.sh
```

Then redeploy:

```bash
npx wrangler pages deploy public --project-name=voting-app
```

### Step 6: Test!

Visit your Pages URL and test:
- ✅ Admin login
- ✅ Add candidate (without photo - that's fine!)
- ✅ Vote
- ✅ View results

## Adding Images Later (Optional)

If you get a Visa/Mastercard later, you can:
1. Enable R2 in Cloudflare Dashboard
2. Create the bucket: `voting-app-images`
3. Uncomment the R2 section in `wrangler.toml`
4. Redeploy the worker

Images will start working automatically!

## Alternative: Use External Image Hosting

You could also use free image hosting services like:
- imgur.com
- imgbb.com
- Or keep using Firebase Storage (if you have access)

Just paste the image URLs directly when adding candidates!

