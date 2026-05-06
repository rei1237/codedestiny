import createBundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  compress: true,
  productionBrowserSourceMaps: process.env.NEXT_PUBLIC_ENABLE_SOURCEMAPS === "1"
    || process.env.ENABLE_SOURCEMAPS === "1",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  trailingSlash: true,
}

export default withBundleAnalyzer(nextConfig)
