const configuredApiTarget =
  process.env.CODE_DESTINY_API_URL ||
  process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL ||
  '';

const apiTarget = (configuredApiTarget || 'http://localhost:4000').replace(/\/+$/, '');

/** Nested paths only: locale roots are app/{slug}/page.js (static segment beats [adminHash]). */
const LOCALE_PATH_SLUGS = [
  'en-us',
  'ja-jp',
  'zh-cn',
  'hi-in',
  'es-es',
  'fr-fr',
  'de-de',
  'nl-nl',
  'ms-my',
];

const nextConfig = {
  reactStrictMode: true,
  /** lucide / framer: barrel import 시 전체 평가 방지 → 클라이언트 번들 축소 */
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  /** gzip (next start); Pages/Workers may apply their own compression */
  compress: true,
  images: {
    formats:
      process.env.NODE_ENV === 'production'
        ? ['image/avif', 'image/webp']
        : ['image/webp'],
    deviceSizes: [640, 750, 1080],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  // Keep native SwissEph package resolution stable in server runtimes.
  serverExternalPackages: ['swisseph'],
  // Include ephemeris data paths in traced server bundle when native swisseph is used.
  outputFileTracingIncludes: {
    '/*': ['./public/ephe/**/*', './node_modules/swisseph/**/*'],
  },
  async headers() {
    const immutable = 'public, max-age=31536000, immutable';
    return [
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: immutable }] },
      { source: '/fuctionassets/:path*', headers: [{ key: 'Cache-Control', value: immutable }] },
    ];
  },
  async rewrites() {
    /** Legacy shell: URL stays / or /{locale}, content from /static/index.html (no redirect). */
    const legacyHomeRewrites = [
      { source: '/', destination: '/static/index.html' },
      ...LOCALE_PATH_SLUGS.map((slug) => ({
        source: `/${slug}`,
        destination: '/static/index.html',
      })),
    ];
    const localeBeforeFiles = [];
    for (const slug of LOCALE_PATH_SLUGS) {
      localeBeforeFiles.push({ source: `/${slug}/:path+`, destination: '/:path+' });
    }
    return {
      beforeFiles: [...legacyHomeRewrites, ...localeBeforeFiles],
      afterFiles: [
        { source: '/vedic', destination: '/vedic-astrology.html' },
        { source: '/api/auth/:path*', destination: apiTarget + '/api/auth/:path*' },
        { source: '/api/admin/:path*', destination: apiTarget + '/api/admin/:path*' },
        { source: '/api/payments/:path*', destination: apiTarget + '/api/payments/:path*' },
        { source: '/api/fortune/:path*', destination: apiTarget + '/api/fortune/:path*' },
        { source: '/api/kasi/:path*', destination: apiTarget + '/api/kasi/:path*' },
        { source: '/api/health', destination: apiTarget + '/api/health' },
      ],
    };
  },
};

export default nextConfig;
