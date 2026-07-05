import createBundleAnalyzer from "@next/bundle-analyzer";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
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

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isLocalApiBase(rawValue) {
  const baseUrl = normalizeBaseUrl(rawValue);
  if (!baseUrl) return false;
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(baseUrl);
  }
}

function resolveDevelopmentApiBase() {
  return firstNonEmpty([
    normalizeBaseUrl(process.env.NEXT_PUBLIC_AUTH_API_BASE_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
    normalizeBaseUrl(process.env.API_WORKER_ORIGIN),
    normalizeBaseUrl(process.env.AUTH_API_BASE_URL),
    normalizeBaseUrl(process.env.AUTH_API_BASE),
    normalizeBaseUrl(process.env.CODE_DESTINY_API_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL),
    normalizeBaseUrl(process.env.AUTH_URL),
    "http://localhost:4000",
  ]);
}

function resolvePublicApiBase() {
  const apiBase = firstNonEmpty([
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_AUTH_API_BASE_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  ]);
  if (apiBase && !isLocalApiBase(apiBase)) return apiBase;
  if (process.env.NODE_ENV === "production") return "https://code-destiny.com";
  return "";
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

const buildPublicApiBase = resolvePublicApiBase();
process.env.NEXT_PUBLIC_EFFECTIVE_API_BASE_URL = buildPublicApiBase;
const buildRuntimeTarget = firstNonEmpty([
  process.env.NEXT_PUBLIC_RUNTIME_TARGET,
  process.env.RUNTIME_TARGET,
  "web",
]);

const buildTime = firstNonEmpty([
  process.env.NEXT_PUBLIC_BUILD_TIME,
  process.env.BUILD_TIME,
  new Date().toISOString(),
]);

/** @type {import('next').NextConfig} */
function createNextConfig(phase) {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const isProductionBuild = !isDevelopmentServer && process.env.NODE_ENV === "production";

  const config = {
    output: isProductionBuild ? "export" : undefined,
    compress: true,
    env: {
      NEXT_PUBLIC_APP_VERSION: buildAppVersion,
      NEXT_PUBLIC_GIT_SHA: buildGitSha,
      NEXT_PUBLIC_BUILD_TIME: buildTime,
      NEXT_PUBLIC_EFFECTIVE_API_BASE_URL: buildPublicApiBase,
      NEXT_PUBLIC_RUNTIME_TARGET: buildRuntimeTarget,
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
      cpus: 1,
      optimizePackageImports: ['lucide-react', 'framer-motion'],
    },
    trailingSlash: true,
    webpack(config, { dev }) {
      if (!dev) {
        config.cache = false;
      }
      return config;
    },
  };

  if (isDevelopmentServer) {
    config.rewrites = async () => {
      const apiBase = resolveDevelopmentApiBase();
      return [
        {
          source: "/api/:path*",
          destination: `${apiBase}/api/:path*`,
        },
      ];
    };
  }

  return withBundleAnalyzer(config);
}

export default createNextConfig;
