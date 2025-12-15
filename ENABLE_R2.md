# Enable R2 Storage - Quick Guide

R2 needs to be enabled once in your Cloudflare account. Here's how:

## Steps:

1. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com
   - Make sure you're logged in

2. **Navigate to R2:**
   - In the left sidebar, click **"R2"** (under "Storage")
   - If you don't see it, go to: https://dash.cloudflare.com/?to=/:account/r2

3. **Enable R2:**
   - Click the button to enable R2 (usually says "Enable R2" or "Get Started")
   - Accept any terms if prompted
   - This is FREE and doesn't require a paid plan

4. **Create Bucket (via Dashboard):**
   - Click "Create bucket"
   - Name it: `voting-app-images`
   - Choose a location (any is fine, "Auto" is recommended)
   - Click "Create bucket"

5. **Done!** Now come back and we'll continue deployment.

---

## Alternative: Create bucket via CLI after enabling

After enabling R2 in the dashboard, you can create the bucket with:
```bash
npx wrangler r2 bucket create voting-app-images
```

But the dashboard method is easier! 😊

