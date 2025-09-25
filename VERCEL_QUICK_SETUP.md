# Quick Vercel Setup for tl-recurser.vercel.app

## ✅ Backend Status
- **Backend URL**: `http://64.227.97.134:8000`
- **Status**: ✅ Healthy and running
- **Videos Available**: 6 videos in index `68d0f9f2e23608ddb86fba7a`

## 🔧 Required Vercel Configuration

### 1. Set Environment Variable
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `tl-recurser` project
3. Go to **Settings** → **Environment Variables**
4. Add: `BACKEND_URL` = `http://64.227.97.134:8000`
5. Make sure it's enabled for **Production**, **Preview**, and **Development**
6. Click **Save**

### 2. Redeploy
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete

## 🧪 Test the Connection

After redeploying, test these URLs:

1. **Health Check**: `https://tl-recurser.vercel.app/api/health`
   - Should return: `{"status":"healthy",...}`

2. **Videos API**: `https://tl-recurser.vercel.app/api/index/68d0f9f2e23608ddb86fba7a/videos`
   - Should return: `{"success":true,"data":{"video_count":6,...}}`

3. **Playground**: `https://tl-recurser.vercel.app/playground`
   - Should show 6 videos instead of "No videos available"

## 🐛 If Still Not Working

Check Vercel function logs:
1. Go to **Functions** tab in Vercel dashboard
2. Look for any error logs
3. The logs should show: `Environment: NODE_ENV=production` and `Backend URL: http://64.227.97.134:8000`

## 📋 Current Status
- ✅ Backend running and healthy
- ✅ 6 videos available in index
- ✅ API proxy configured correctly
- ⏳ Waiting for Vercel environment variable setup
