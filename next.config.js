const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['pdf-parse', 'handlebars'],
  experimental: { serverActions: { bodySizeLimit: '12mb' }, cpus: 2 },
  async redirects() {
    const productOrigin = 'https://motivationsboost.th-analytica.com';
    if (process.env.VERCEL_ENV !== 'production' ||
        process.env.PUBLIC_SITE_LAUNCHED !== 'true' ||
        process.env.NEXT_PUBLIC_SITE_URL !== productOrigin) return [];
    return [{
      source: '/:path*',
      has: [{ type: 'host', value: '[^.]+\\.vercel\\.app' }],
      destination: productOrigin + '/:path*',
      permanent: false,
    }];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ] },
      ...['/api/:path*', '/app/:path*', '/beta/:path*', '/reset-password'].map(source =>
        ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
      ...[['en', 'en'], ['fr', 'fr'], ['it', 'it']].map(([path, language]) =>
        ({ source: '/' + path, headers: [{ key: 'Content-Language', value: language }] })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
