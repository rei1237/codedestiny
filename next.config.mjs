import createBundleAnalyzer from "@next/bundle-analyzer";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function firstNonEmpty(values = []) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function runGit(args = []) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function readPackageVersion() {
  try {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.version || "").trim();
  } catch {
    return "";
  }
}

const buildAppVersion = firstNonEmpty([
  process.env.NEXT_PUBLIC_APP_VERSION,
  process.env.APP_VERSION,
  readPackageVersion(),
  "0.0.0",
]);

const buildGitSha = firstNonEmpty([
  process.env.NEXT_PUBLIC_GIT_SHA,
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  runGit(["rev-parse", "HEAD"]),
  "unknown",
]);

const buildTime = firstNonEmpty([
  process.env.NEXT_PUBLIC_BUILD_TIME,
  process.env.BUILD_TIME,
  new Date().toISOString(),
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  compress: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: buildAppVersion,
    NEXT_PUBLIC_GIT_SHA: buildGitSha,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
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
