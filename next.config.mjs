/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // CF Workers 번들 크기 최적화: Node.js 전용 패키지를 서버 번들에서 제외
  serverExternalPackages: [
    '@react-pdf/renderer',
    'mongoose',
    'mongodb',
    'bcrypt',
    'bcryptjs',
    'nodemailer',
    'node-cron',
    'otplib',
    'qrcode',
    'html2canvas',
    'astronomy-engine',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [
        ...existing,
        /^@react-pdf(\/.*)?$/,
        'mongoose',
        'mongodb',
        'bcrypt',
        'bcryptjs',
        'nodemailer',
        'node-cron',
        'otplib',
        'qrcode',
        'html2canvas',
        'astronomy-engine',
      ];
    }
    return config;
  },
};

export default nextConfig;
