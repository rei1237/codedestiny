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
  ],
};

export default nextConfig;
