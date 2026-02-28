import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/todos',
        destination: `${backendUrl}/todos`,
      },
    ];
  },
};

export default nextConfig;
