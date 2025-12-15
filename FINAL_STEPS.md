# Final Steps - Connect Everything

## Step 1: Connect Worker to Pages

1. In Cloudflare Dashboard, go to your **Pages** project: `voting-app`
2. Click **Settings** tab
3. Click **Functions** in the sidebar
4. Scroll to **"Workers integration"** section
5. Click **"Add integration"**
6. Select your worker: `voting-app-api`
7. Add route pattern: `/api/*`
8. Click **Save**

This connects your worker so frontend can call `/api/login`, `/api/submitVote`, etc.

---

## Step 2: Update Frontend API Calls

Run this script to update all API endpoints to use `/api` prefix:

```bash
./update-frontend-for-cloudflare.sh
```

Then redeploy the frontend:

```bash
npx wrangler pages deploy public --project-name=voting-app --commit-dirty=true
```

---

## Step 3: Test Your App!

Visit your Pages URL (something like `https://voting-app.pages.dev`) and test:

1. ✅ Try admin login (you can set password later or it will use default)
2. ✅ Add a candidate (images won't upload without R2, but that's fine!)
3. ✅ Vote as a participant
4. ✅ View vote results

---

## If Something Doesn't Work:

- **Check browser console** (F12) for errors
- **Verify worker is connected** in Pages Settings > Functions
- **Make sure routes use `/api` prefix** (run the update script)

---

## Optional: Set Admin Password

After everything works, you can set the admin password:

```bash
cd cloudflare-worker
npx wrangler secret put ADMIN_PASSWORD
```

Enter your password when prompted.

---

That's it! Your voting app should be fully functional now! 🎉

