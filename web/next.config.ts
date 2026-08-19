import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow images from common avatar/storage domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // Google avatars
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }, // Vercel Blob
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        // Allow same-origin iframe for PDF viewer routes
        source: '/api/pipeline/:runId/pdf',
        headers: [
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/((?!api/pipeline/.*/pdf).*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
