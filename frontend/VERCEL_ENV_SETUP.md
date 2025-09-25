# Vercel Environment Setup for tl-recurser.vercel.app

## Required Environment Variables

Set these in your Vercel dashboard at: https://vercel.com/dashboard → tl-recurser → Settings → Environment Variables

### 1. Backend URL
- **Variable Name**: `BACKEND_URL`
- **Value**: `http://64.227.97.134:8000`
- **Environment**: Production, Preview, Development

## How to Set Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `tl-recurser` project
3. Click on **Settings** tab
4. Click on **Environment Variables** in the sidebar
5. Add the `BACKEND_URL` variable with value `http://64.227.97.134:8000`
6. Make sure it's enabled for **Production**, **Preview**, and **Development**
7. Click **Save**
8. **Redeploy** your project (go to Deployments tab and click "Redeploy" on the latest deployment)

## API Endpoint Mapping

The frontend proxies all API requests through `/api/*`:

- `https://tl-recurser.vercel.app/api/health` → `http://64.227.97.134:8000/health`
- `https://tl-recurser.vercel.app/api/videos/*` → `http://64.227.97.134:8000/api/videos/*`
- `https://tl-recurser.vercel.app/api/index/*` → `http://64.227.97.134:8000/api/index/*`

## Testing the Setup

After setting the environment variables and redeploying:

1. Visit: https://tl-recurser.vercel.app/api/health
2. You should see a JSON response with backend health status
3. Visit: https://tl-recurser.vercel.app/playground
4. The playground should load videos from the backend index

## Troubleshooting

### Backend Offline Error
If you see "Backend Server Offline" on the frontend:
1. Check that `BACKEND_URL` is set correctly in Vercel
2. Verify the backend is running: `curl http://64.227.97.134:8000/health`
3. Redeploy the frontend after setting environment variables

### No Videos in Index
If the playground shows "No videos found":
1. Check that `BACKEND_URL` is set to `http://64.227.97.134:8000`
2. Verify the backend is accessible from Vercel
3. Check Vercel function logs for any proxy errors

## Current Backend Status
- **Backend IP**: `64.227.97.134:8000`
- **Health Check**: `http://64.227.97.134:8000/health`
- **Status**: ✅ Running and healthy
