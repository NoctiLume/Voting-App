# Cloudflare Worker Backend for Voting App

This is the Cloudflare Workers backend that replaces Firebase Cloud Functions.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Create D1 Database

```bash
npx wrangler d1 create voting-app-db
```

This will output a database ID. Copy it and update `wrangler.toml` with the database_id.

### 4. Run Database Migrations

```bash
npx wrangler d1 migrations apply voting-app-db
```

### 5. Create R2 Bucket

Go to Cloudflare Dashboard > R2 > Create bucket
Name it: `voting-app-images`

Or use the CLI:
```bash
npx wrangler r2 bucket create voting-app-images
```

### 6. Set Environment Variables (Secrets)

Set the admin password (optional, or use default):
```bash
npx wrangler secret put ADMIN_PASSWORD
```

### 7. Deploy the Worker

```bash
npm run deploy
```

The worker will be available at: `https://voting-app-api.YOUR_SUBDOMAIN.workers.dev`

### 8. Update Frontend

Update your frontend API calls to use the worker URL, or set up Cloudflare Pages with Functions routing (recommended).

## Development

Run locally:
```bash
npm run dev
```

This will start a local development server. You'll need to have the D1 database and R2 bucket created first.

## Architecture

- **Database**: Cloudflare D1 (SQLite at the edge)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Compute**: Cloudflare Workers (edge functions)

## Routes

- `POST /login` - Admin login
- `GET /logout` - Admin logout
- `POST /saveCandidate` - Save candidate (admin only)
- `GET /getCandidate?id=calon1` - Get candidate data
- `POST /uploadPhoto` - Upload candidate photo (admin only)
- `POST /deleteCandidate` - Delete candidate (admin only)
- `POST /submitVote` - Submit a vote
- `GET /getVotes` - Get all vote counts
- `POST /resetVotes` - Reset all votes (admin only)

