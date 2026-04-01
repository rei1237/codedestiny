const configuredApiTarget =
  process.env.CODE_DESTINY_API_URL ||
  process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '';

const defaultApiTarget = process.env.NODE_ENV === 'production'
  ? 'https://code-destiny.com'
  : 'http://localhost:4000';

const apiTarget = (configuredApiTarget || defaultApiTarget).replace(/\/+$/, '');

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
  /** Gzip/Brotli 압축 활성화 (Cloudflare Pages는 자동 처리하므로 빌드 산출물 호환) */
  compress: true,
  /** 프로덕션 소스맵 비활성 → JS 번들 크기 감소 + LCP 개선 */
  productionBrowserSourceMaps: false,
  /** 차세대 이미지 최적화 설정 */
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'code-destiny.com',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    /** Legacy shell: locale roots stay legacy HTML (URL no redirect). Root / now uses App Router home. */
    const legacyHomeRewrites = [
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
