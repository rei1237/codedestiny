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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  async rewrites() {
    const localeBeforeFiles = [];
    for (const slug of LOCALE_PATH_SLUGS) {
      localeBeforeFiles.push({ source: `/${slug}/:path+`, destination: '/:path+' });
    }
    return {
      beforeFiles: localeBeforeFiles,
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
