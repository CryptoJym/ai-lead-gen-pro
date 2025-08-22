/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize for Vercel deployment
  images: {
    domains: ['vercel.app', 'githubusercontent.com'],
    unoptimized: true,
  },
  
  // Enable static exports for visualizations
  async rewrites() {
    return [
      {
        source: '/visualizations/:path*',
        destination: '/docs/:path*',
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/docs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be transpiled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;