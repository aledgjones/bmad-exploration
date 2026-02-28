import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // proxy simple collection endpoints and nested resource paths
      {
        source: '/todos',
        destination: `${backendUrl}/todos`,
      },
      {
        source: '/todos/:path*',
        destination: `${backendUrl}/todos/:path*`,
      },
    ];
  },
};

export default nextConfig;
