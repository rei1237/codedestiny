const configuredApiTarget =
  process.env.CODE_DESTINY_API_URL ||
  process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL ||
  '';

const apiTarget = (configuredApiTarget || 'http://localhost:4000').replace(/\/+$/, '');

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
    const rewrites = [
      { source: '/vedic', destination: '/vedic-astrology.html' },
      { source: '/api/auth/:path*', destination: apiTarget + '/api/auth/:path*' },
      { source: '/api/admin/:path*', destination: apiTarget + '/api/admin/:path*' },
      { source: '/api/payments/:path*', destination: apiTarget + '/api/payments/:path*' },
      { source: '/api/fortune/:path*', destination: apiTarget + '/api/fortune/:path*' },
      // /api/tarot is handled by Next.js route handlers (app/api/tarot/*) so they work when deployed with the Worker
      { source: '/api/kasi/:path*', destination: apiTarget + '/api/kasi/:path*' },
      { source: '/api/health', destination: apiTarget + '/api/health' },
    ];
    return rewrites;
  },
};

export default nextConfig;
