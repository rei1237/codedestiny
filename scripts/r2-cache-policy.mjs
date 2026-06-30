export const R2_CACHE_CONTROLS = Object.freeze({
  immutable: "public, max-age=31536000, immutable",
  staticSwr: "public, max-age=86400, stale-while-revalidate=604800",
  mediaSwr: "public, max-age=2592000, stale-while-revalidate=604800",
  publicJson: "public, max-age=86400, stale-while-revalidate=604800",
});

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".m4a", "audio/mp4"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".otf", "font/otf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const FONT_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const AUDIO_EXTENSIONS = new Set([".m4a", ".mp3", ".ogg", ".wav"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);
const PUBLIC_JSON_EXTENSIONS = new Set([".json"]);
const PRIVATE_KEY_PATTERN = /(^|\/)(admin|auth|billing|download|entitlement|entitlements|full|original|paid|payment|payments|pdf|private|profile|profiles|protected|purchase|purchases|refund|report|reports|signed|subscription|subscriptions|unlock|user|users)(\/|$)/i;
const VERSIONED_KEY_PATTERN = /(^|[\/._-])(?:v|ver|version)?20\d{6,8}($|[\/._-])|(^|[\/._-])[a-f0-9]{10,}($|[\/._-])/i;

export function normalizeR2ObjectKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return decodeURIComponent(url.pathname.replace(/^\/+/, "")).replace(/\\/g, "/");
  } catch {
    return raw.replace(/^\/+/, "").replace(/\\/g, "/");
  }
}

export function extensionOfR2ObjectKey(key) {
  const path = normalizeR2ObjectKey(key).split("?")[0].split("#")[0];
  const file = path.split("/").pop() || "";
  const dot = file.lastIndexOf(".");
  return dot >= 0 ? file.slice(dot).toLowerCase() : "";
}

export function inferR2ContentType(key) {
  return CONTENT_TYPES.get(extensionOfR2ObjectKey(key)) || "application/octet-stream";
}

export function isPossiblyPrivateR2Key(key) {
  return PRIVATE_KEY_PATTERN.test(normalizeR2ObjectKey(key));
}

export function isVersionedR2Key(key) {
  return VERSIONED_KEY_PATTERN.test(normalizeR2ObjectKey(key));
}

export function resolveR2CachePolicy(key, options = {}) {
  const normalizedKey = normalizeR2ObjectKey(key);
  const extension = extensionOfR2ObjectKey(normalizedKey);
  if (!normalizedKey || !extension) return null;
  if (!options.includePrivate && isPossiblyPrivateR2Key(normalizedKey)) return null;

  const contentType = inferR2ContentType(normalizedKey);

  if (FONT_EXTENSIONS.has(extension)) {
    return {
      key: normalizedKey,
      contentType,
      cacheControl: R2_CACHE_CONTROLS.immutable,
      reason: "public-font",
    };
  }

  if (AUDIO_EXTENSIONS.has(extension) || VIDEO_EXTENSIONS.has(extension)) {
    return {
      key: normalizedKey,
      contentType,
      cacheControl: R2_CACHE_CONTROLS.mediaSwr,
      reason: "public-media",
    };
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    const immutable = isVersionedR2Key(normalizedKey);
    return {
      key: normalizedKey,
      contentType,
      cacheControl: immutable ? R2_CACHE_CONTROLS.immutable : R2_CACHE_CONTROLS.staticSwr,
      reason: immutable ? "versioned-image" : "fixed-name-image",
    };
  }

  if (PUBLIC_JSON_EXTENSIONS.has(extension)) {
    return {
      key: normalizedKey,
      contentType,
      cacheControl: R2_CACHE_CONTROLS.publicJson,
      reason: "public-json",
    };
  }

  return null;
}

export function shouldUpdateR2Metadata(current = {}, policy, options = {}) {
  if (!policy) return false;
  if (options.force) return true;

  const currentCacheControl = String(current.cacheControl || "").trim();
  const currentContentType = String(current.contentType || "").split(";")[0].trim().toLowerCase();
  const targetContentType = String(policy.contentType || "").split(";")[0].trim().toLowerCase();

  if (/\bno-store\b|\bprivate\b/i.test(currentCacheControl)) return false;
  if (!currentCacheControl) return true;
  if (policy.reason === "public-font" && (!/max-age=31536000/i.test(currentCacheControl) || !/immutable/i.test(currentCacheControl))) return true;
  if (!currentContentType || currentContentType === "application/octet-stream") return true;
  if (targetContentType && currentContentType !== targetContentType) return true;

  return false;
}
