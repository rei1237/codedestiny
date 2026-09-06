import createBundleAnalyzer from "@next/bundle-analyzer";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// These files are deliberately UMD/CommonJS: the static shell loads them as
// classic scripts while React imports the same implementation.  Next's dev
// SWC refresh transform appends `import.meta.webpackHot` to them, but webpack
// correctly parses their CommonJS wrapper as a non-module and then rejects
// that injected ESM-only syntax.  Keep the shared legacy boundary out of the
// refresh transform; webpack still bundles its plain CommonJS exports.
const LEGACY_SHARED_BROWSER_MODULE = /[\\/]js[\\/]core[\\/](?:checkout-entry|pass-verdict|payment-service)\.js$/;

function isRefreshOrSwcRule(rule) {
  const loaders = Array.isArray(rule?.use) ? rule.use : [rule?.use];
  return loaders.some((loader) => {
    const name = String(loader?.loader || loader || "");
    return name.includes("next-swc-loader") || name.includes("react-refresh");
  });
}

function matchesExclude(exclude, resourcePath) {
  if (typeof exclude === "function") return exclude(resourcePath);
  if (Array.isArray(exclude)) return exclude.some((entry) => matchesExclude(entry, resourcePath));
  return Boolean(exclude?.test?.(resourcePath));
}

function excludeLegacySharedBrowserModules(rule) {
  const previousExclude = rule.exclude;
  rule.exclude = (resourcePath) => LEGACY_SHARED_BROWSER_MODULE.test(resourcePath)
    || matchesExclude(previousExclude, resourcePath);
}

function visitWebpackRules(rules) {
  for (const rule of rules || []) {
    if (isRefreshOrSwcRule(rule)) excludeLegacySharedBrowserModules(rule);
    visitWebpackRules(rule.oneOf);
    visitWebpackRules(rule.rules);
  }
}

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
    // deploymentId(?dpl=) 금지 — 2026-07-07 에 "엣지 404 오염 차단"을 노리고 넣었지만
    // 정확히 반대로 작동했다. 배포마다 모든 에셋 URL 이 새 캐시 키가 되어 전환 순간 전부
    // 콜드 MISS 로 오리진을 때리고, 그때 나온 404 가 max-age=172800(2일)로 캐시되면
    // 그 배포의 HTML 을 받는 모든 사용자가 같은 URL 을 요청해 2일간 청크 로드 실패(백지)를
    // 겪었다(2026-07-22 운명 찻집·네오 전략실 백지 사고, 오리진은 200 인데 ?dpl= 붙은
    // URL 만 404 로 확인). 청크는 이미 콘텐츠 해시로 파일명이 갈리므로 무효화는 그것으로
    // 충분하고, 바뀌지 않은 청크는 따뜻한 200 캐시를 그대로 재사용해 전환 창을 아예 피한다.
    // compress: true 를 2026-08-24 에 제거했다. 이 옵션은 `next start`(Node 서버)의 응답
    // 압축만 켠다. 프로덕션 빌드는 output:"export" 라 서버가 없고, 정적 산출물의 압축은
    // Cloudflare 엣지가 한다. 즉 켜 두는 동안 아무 일도 하지 않으면서 "압축을 우리가 켜 뒀다"고
    // 읽혔다. 되살리려면 먼저 이 레포에 Node 서버가 생겼는지부터 확인할 것.
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
      visitWebpackRules(config.module?.rules);
      if (!dev) {
        // 기본값은 2026-06-29 부터의 동작 그대로 — 프로덕션 빌드는 webpack 영속 캐시를 끈다
        // (그 줄이 들어온 커밋 94acc1538 에 사유가 없어, 산출 바이트가 걸린 릴리스 빌드는 건드리지 않는다).
        // NEXT_WEBPACK_FS_CACHE=1 인 곳(PR CI build 잡 · main 캐시 워머 둘)에서만 켠다.
        // 🔴 캐시 디렉터리를 .next 밖에 두는 이유: build:cf 의 첫 스텝 clean:build 가
        //    .next/cache 와 .next 를 통째로 지운다(scripts/clean-cloudflare-build.mjs).
        //    .next/cache 로 복원하면 빌드가 시작하자마자 삭제돼 캐시가 영영 비워진다.
        config.cache = process.env.NEXT_WEBPACK_FS_CACHE === "1"
          ? {
            type: "filesystem",
            cacheDirectory: resolve(process.cwd(), "build-cache/next-webpack"),
            // 캐시 객체를 통째로 갈아끼우면 Next 가 넣던 buildDependencies 도 사라진다 —
            // 이 파일이 바뀌면 캐시가 무효화되도록 직접 다시 건다.
            buildDependencies: { config: [fileURLToPath(import.meta.url)] },
          }
          : false;
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
