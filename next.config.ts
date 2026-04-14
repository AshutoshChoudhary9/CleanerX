/** @type {import('next').NextConfig} */
export default {
  experimental: {
    // Disabling for stability during navigation
    ppr: false,
    inlineCss: false,
    useCache: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};
