/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
