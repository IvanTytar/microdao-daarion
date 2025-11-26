import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  
  async rewrites() {
    // In production, API calls go to same origin
    // In dev, proxy to local backend
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    
    if (apiBase && apiBase !== '') {
      return [
        {
          source: '/api/:path*',
          destination: `${apiBase}/api/:path*`,
        },
      ]
    }
    return []
  },
}

export default nextConfig

