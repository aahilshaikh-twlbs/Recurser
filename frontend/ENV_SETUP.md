# Environment Configuration

## Local Development

Create a `.env.local` file in the frontend directory with:

```
BACKEND_URL=http://localhost:8000
```

## Production Deployment (Vercel)

In your Vercel project settings, add the following environment variable:

```
BACKEND_URL=http://your-backend-server-ip:8000
```

Replace `your-backend-server-ip` with the actual IP address or domain where your backend is hosted.

## Current Issue

The frontend is currently configured to use `http://64.227.97.134:8000` as the default backend URL. 
If your backend is running elsewhere, you need to set the `BACKEND_URL` environment variable accordingly.

### Quick Fix for Local Development

Run the frontend with the environment variable:

```bash
BACKEND_URL=http://localhost:8000 npm run dev
```

Or for production build:

```bash
BACKEND_URL=http://localhost:8000 npm run build && npm start
```
