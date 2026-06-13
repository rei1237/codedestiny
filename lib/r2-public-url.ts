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
  return buildR2PublicUrl(
    process.env.NEXT_PUBLIC_MUSIC_BASE_URL,
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
