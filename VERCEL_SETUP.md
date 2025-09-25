# Vercel Setup for tl-recurser.vercel.app

## Project Settings in Vercel Dashboard

Go to: https://vercel.com/dashboard → tl-recurser → Settings → General

### 1. Root Directory
- **Root Directory**: `frontend`
- This tells Vercel to treat the `frontend/` folder as the project root

### 2. Build Settings
- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `bun run build` (auto-detected)
- **Install Command**: `bun install` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

### 3. Environment Variables
Go to: Settings → Environment Variables

Add:
- **Name**: `BACKEND_URL`
- **Value**: `http://64.227.97.134:8000`
- **Environments**: Production, Preview, Development

## Why No vercel.json?

Vercel auto-detects Next.js projects and handles:
- ✅ Framework detection
- ✅ Build commands
- ✅ Package manager detection (bun)
- ✅ Output directory

The only things we need to configure manually:
1. **Root Directory**: Set to `frontend`
2. **Environment Variables**: Add `BACKEND_URL`

## After Configuration

1. Set the root directory to `frontend`
2. Add the `BACKEND_URL` environment variable
3. Redeploy the project
4. The build should work automatically with bun

## Testing

After setup, visit:
- https://tl-recurser.vercel.app/api/health
- https://tl-recurser.vercel.app/playground

Both should work without the "Backend Offline" error.
