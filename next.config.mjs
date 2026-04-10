/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // CF Workers 번들 크기 최적화: 순수 네이티브 애드온만 제외
  // mongoose/bcryptjs/mongodb는 auth 네이티브 라우트에서 직접 사용하므로 번들에 포함
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
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [
        ...existing,
        /^@react-pdf(\/.*)?$/,
        'bcrypt',
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
