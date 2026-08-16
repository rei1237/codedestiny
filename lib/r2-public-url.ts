const QUOTE_EDGE_PATTERN = /^["']|["']$/g;

function cleanBaseUrl(baseUrl: string | undefined, envName: string) {
  const cleaned = String(baseUrl || "").trim().replace(QUOTE_EDGE_PATTERN, "").replace(/\/+$/, "");
  if (!cleaned) {
    throw new Error(`${envName} is not configured.`);
  }
  return cleaned;
}

export function encodeR2ObjectKey(objectKey: string) {
  return String(objectKey || "")
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

export function buildR2PublicUrl(baseUrl: string | undefined, objectKey: string, envName = "R2 public base URL") {
  const cleanedBaseUrl = cleanBaseUrl(baseUrl, envName);
  const encodedObjectKey = encodeR2ObjectKey(objectKey);
  if (!encodedObjectKey) {
    throw new Error("R2 object key is required.");
  }
  return `${cleanedBaseUrl}/${encodedObjectKey}`;
}

export function buildMusicPublicUrl(objectKey: string) {
  const defaultMusicBaseUrl = process.env.NEXT_PUBLIC_ASSETS_BASE_URL
    ? `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/music`
    : "https://music.code-destiny.com";
  return buildR2PublicUrl(
    process.env.NEXT_PUBLIC_MUSIC_BASE_URL || defaultMusicBaseUrl,
    objectKey,
    "NEXT_PUBLIC_MUSIC_BASE_URL",
  );
}

export function buildAssetsPublicUrl(objectKey: string) {
  return buildR2PublicUrl(
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL,
    objectKey,
    "NEXT_PUBLIC_ASSETS_BASE_URL",
  );
}

/**
 * Cloudflare Image Resizing 프리픽스를 끼워 표시 크기에 맞는 이미지를 받게 한다.
 *
 * `next.config.mjs` 가 `images.unoptimized: true` 라 Next 의 이미지 최적화가 없다. 원격 자산을
 * 실제로 줄이는 수단은 이 경로 하나뿐이다 (2026-08-16 실측: 네오 술수 커버 327KB webp →
 * 33KB avif, `Accept: image/avif` 기준). 이미 `app/island-consult`·`app/points` 가 쓰는 방식이다.
 *
 * 🔴 `code-destiny.com` 호스트에만 적용한다 — Image Resizing 이 켜져 있지 않은 호스트에 프리픽스를
 *    붙이면 404 가 되고, R2 자산은 `fallbackSrc` 가 비어 있어 곧바로 대체 텍스트로 떨어진다.
 *    로컬 `/public` 경로와 이미 리사이즈된 URL 은 그대로 돌려준다.
 */
export function buildResizedAssetUrl(url: string, options: { width: number; quality?: number }) {
  const source = String(url || "").trim();
  if (!/^https?:\/\//i.test(source) || source.includes("/cdn-cgi/image/")) return source;
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return source;
  }
  if (parsed.hostname !== "code-destiny.com" && !parsed.hostname.endsWith(".code-destiny.com")) return source;
  const width = Math.max(1, Math.round(options.width));
  const quality = options.quality ?? 80;
  return `${parsed.origin}/cdn-cgi/image/width=${width},quality=${quality},format=auto${parsed.pathname}${parsed.search}`;
}

type PublicAssetUrlOptions = {
  baseUrl?: string;
  fallbackPublicPath?: string;
  prefix?: string;
};

function splitPathSuffix(publicPath: string) {
  const hashIndex = publicPath.indexOf("#");
  const queryIndex = publicPath.indexOf("?");
  const suffixIndex = [queryIndex, hashIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  if (suffixIndex === undefined) return { pathname: publicPath, suffix: "" };
  return {
    pathname: publicPath.slice(0, suffixIndex),
    suffix: publicPath.slice(suffixIndex),
  };
}

export function getAssetUrlFromPublicPath(publicPath: string, options: PublicAssetUrlOptions = {}) {
  const sourcePath = String(publicPath || "").trim();
  const fallbackPath = options.fallbackPublicPath || sourcePath;
  if (!sourcePath || !sourcePath.startsWith("/") || sourcePath.startsWith("//")) return fallbackPath;
  if (/^\/(?:api|_next\/static)\//.test(sourcePath)) return fallbackPath;

  const baseUrl = String(options.baseUrl ?? process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "")
    .trim()
    .replace(QUOTE_EDGE_PATTERN, "")
    .replace(/\/+$/, "");

  if (!baseUrl) return fallbackPath;

  const prefix = String(options.prefix ?? "assets").trim().replace(/^\/+|\/+$/g, "");
  const { pathname, suffix } = splitPathSuffix(sourcePath);
  const objectKey = [prefix, pathname.replace(/^\/+/, "")].filter(Boolean).join("/");
  return `${baseUrl}/${encodeR2ObjectKey(objectKey)}${suffix}`;
}
