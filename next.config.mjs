/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * 301/302 리다이렉트 — GSC 404 오류 처리
   * permanent: true  = 301 (영구 이전, SEO juice 전달)
   * permanent: false = 302 (임시, 추후 app route 생성 예정)
   */
  async redirects() {
    return [
      /* ── 1. 부모 경로 인덱스 없음 → 대표 서비스 301 ── */
      { source: "/saju",      destination: "/saju/basic",        permanent: true },
      { source: "/tarot",     destination: "/tarot/mingri",       permanent: true },
      { source: "/oracle",    destination: "/oracle/hwatu-life",  permanent: true },
      { source: "/ziwei",     destination: "/ziwei/chart",        permanent: true },
      { source: "/astrology", destination: "/astrology/cosmic",   permanent: true },

      /* ── 2. 내부 링크 오타 / 구 slug 수정 301 ── */
      { source: "/oracle/hwatu", destination: "/oracle/hwatu-life", permanent: true },
      // /tadagochi 는 app/tadagochi/route.js 가 직접 서빙 (리다이렉트 불필요)
      { source: "/destiny-egg", destination: "/tadagochi", permanent: true },
      { source: "/tadagochi.html", destination: "/tadagochi", permanent: true },
      { source: "/tamagotchi", destination: "/tadagochi", permanent: true },
      { source: "/tamagotchi.html", destination: "/tadagochi", permanent: true },

      /* ── 3. app route 없는 서비스 → 유사 서비스 임시 302 ── */
      // 동물 관상 (AI 얼굴 분석) → 사주 그림 (가장 유사한 시각 분석 서비스)
      { source: "/animal/physio", destination: "/saju-picture", permanent: false },
      // 나머지 animal/* → 홈
      { source: "/animal/:path*", destination: "/",             permanent: false },
      // 꿈 해몽 → 홈
      { source: "/dream/:path*",  destination: "/",             permanent: false },
      // 운명의 꽃 → 홈
      { source: "/flower/:path*", destination: "/",             permanent: false },

      /* ── 4. 베다 점성술 → 서양 점성술 임시 302 ── */
      { source: "/vedic/:path*",  destination: "/astrology/cosmic", permanent: false },

      /* ── 5. 미완성 oracle 경로 임시 302 ── */
      { source: "/oracle/kemet",  destination: "/oracle/hwatu-life",       permanent: false },
      { source: "/oracle/juyuk",  destination: "/oracle/hwatu-life",       permanent: false },
      { source: "/oracle/sukuyo", destination: "/oracle/sikojen-povailu",  permanent: false },
      { source: "/oracle/rune",   destination: "/oracle/sikojen-povailu",  permanent: false },

      /* ── 6. HTML → App Route canonical 301 ── */
      // oracle/royal-tea 앱 라우트가 새로 생겼으므로 구 HTML URL 이관
      { source: "/royal-tea-oracle.html", destination: "/oracle/royal-tea", permanent: true },
      // /geomancy-oracle (쿼리 없는 깔끔 URL) → 실제 HTML 파일
      { source: "/geomancy-oracle",       destination: "/geomancy-oracle-v4.html", permanent: true },
    ];
  },

  // CF Workers 번들 크기 최적화: serverExternalPackages로 통합 관리
  // (webpack.externals 중복 제거 - @/ path alias 오인 externalize 버그 방지)
  serverExternalPackages: [
    '@react-pdf/renderer',
    'bcrypt',
    'nodemailer',
    'node-cron',
    'otplib',
    'qrcode',
    'html2canvas',
    'astronomy-engine',
    // CF Workers 번들 크기 추가 최적화
    'mongoose',
    'mongodb',
    'framer-motion',
    'd3-array',
    'd3-color',
    'd3-ease',
    'd3-interpolate',
    'd3-path',
    'd3-scale',
    'd3-shape',
    'd3-time',
  ],
  // Next.js 15+: outputFileTracingExcludes는 최상단에 위치
  outputFileTracingExcludes: {
    '*': [
      'node_modules/mongoose/**',
      'node_modules/mongodb/**',
      'node_modules/framer-motion/**',
      'node_modules/recharts/**',
      'node_modules/lucide-react/**',
      'node_modules/d3-array/**',
      'node_modules/d3-color/**',
      'node_modules/d3-ease/**',
      'node_modules/d3-interpolate/**',
      'node_modules/d3-path/**',
      'node_modules/d3-scale/**',
      'node_modules/d3-shape/**',
      'node_modules/d3-time/**',
      'node_modules/html2canvas/**',
      'node_modules/@react-pdf/**',
      'node_modules/bcrypt/**',
      'node_modules/nodemailer/**',
    ],
  },
};

export default nextConfig;
