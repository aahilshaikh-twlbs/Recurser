/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '64.227.97.134', 'deuqpmn4rs7j5.cloudfront.net'],
  },
  async rewrites() {
    // In production (Vercel), use relative paths that will be handled by API routes
    // In development, proxy to the backend
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Don't rewrite in production - let API routes handle it
      return []
    }
    
    // Development only - proxy to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
