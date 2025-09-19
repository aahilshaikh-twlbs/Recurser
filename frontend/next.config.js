/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '64.227.97.134'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://64.227.97.134:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://64.227.97.134:8000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
