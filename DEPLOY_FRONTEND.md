# Deploy Frontend to Cloudflare Pages

The easiest way is via the Dashboard:

## Option 1: Via Dashboard (Recommended - 2 minutes)

1. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com
   - Click "Workers & Pages" in the left sidebar

2. **Create Pages Project:**
   - Click "Create application"
   - Click "Pages" tab
   - Click "Upload assets"
   - Project name: `voting-app`
   - Upload the entire `public` folder (drag and drop)
   - Click "Deploy site"

3. **Wait for deployment** (usually takes 1-2 minutes)

4. **Get your Pages URL** - it will be something like:
   `https://voting-app.pages.dev`

---

## Option 2: Via CLI (Alternative)

If you prefer CLI, you need to create the project first, then deploy:

```bash
# Create project (one-time)
npx wrangler pages project create voting-app

# Deploy
npx wrangler pages deploy public --project-name=voting-app --commit-dirty=true
```

---

## After Deployment:

1. **Connect Worker to Pages** (see next step)
2. **Update frontend API calls**
3. **Test your app!**

