export const MUSIC_PREVIEW_LIMIT_SECONDS = 40;
export const MUSIC_TRACK_UNLOCK_PRICE_KRW = 300;
export const MUSIC_TRACK_UNLOCK_COIN_COST = 3;
export const MUSIC_TRACK_FEATURE_PREFIX = "music-track-";

export const MUSIC_FREE_FULL_AUDIO_SOURCE_KEYS = Object.freeze([
  "DEST1NOVA/달빛 운명여행 main title.mp3",
  "DEST1NOVA/Code Destiny.mp3",
  "DEST1NOVA/Moonlight Daydream.mp3",
  "DEST1NOVA/I am your fate.mp3",
  "DEST1NOVA/운명은 위대하다.mp3",
]);

const MUSIC_FREE_FULL_AUDIO_SOURCE_KEY_SET = new Set(MUSIC_FREE_FULL_AUDIO_SOURCE_KEYS);
const MUSIC_ALLOWED_AUDIO_SOURCE_PREFIXES = Object.freeze([
  "DEST1NOVA/",
  "DestinyCafe/",
  "DestinyWar/",
  "lunabloom/",
  "neosong/",
  "neosongmini1/",
  "yeonisong/",
  "yeonisongmini1/",
]);

export function normalizeMusicAudioSourceKey(value) {
  const raw = String(value || "").trim().replace(/^\/+|\/+$/g, "");
  if (!raw) return "";

  try {
    return decodeURI(raw).replace(/^\/+|\/+$/g, "");
  } catch {
    return raw;
  }
}

export function isValidMusicAudioSourceKey(value) {
  const key = normalizeMusicAudioSourceKey(value);
  return Boolean(
    key
    && key.length <= 260
    && MUSIC_ALLOWED_AUDIO_SOURCE_PREFIXES.some((prefix) => key.startsWith(prefix))
    && key.endsWith(".mp3")
    && !key.includes("\0")
    && !key.split("/").some((segment) => !segment || segment === "." || segment === ".."),
  );
}

function hashMusicAudioSourceKey(value) {
  const key = normalizeMusicAudioSourceKey(value);
  let hash = 0x811c9dc5;

  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildMusicTrackFeatureKey(audioSourceKey) {
  const normalizedKey = normalizeMusicAudioSourceKey(audioSourceKey);
  if (!isValidMusicAudioSourceKey(normalizedKey)) return "";
  return `${MUSIC_TRACK_FEATURE_PREFIX}${hashMusicAudioSourceKey(normalizedKey)}`;
}

export function isMusicTrackFeatureKey(featureKey) {
  return new RegExp(`^${MUSIC_TRACK_FEATURE_PREFIX}[0-9a-z]+$`).test(String(featureKey || "").trim());
}

export function isFreeFullMusicTrack(audioSourceKey) {
  return MUSIC_FREE_FULL_AUDIO_SOURCE_KEY_SET.has(normalizeMusicAudioSourceKey(audioSourceKey));
}

export function getMusicTrackAccessPolicy(audioSourceKey) {
  const normalizedKey = normalizeMusicAudioSourceKey(audioSourceKey);
  const isFreeFull = isFreeFullMusicTrack(normalizedKey);

  return Object.freeze({
    audioSourceKey: normalizedKey,
    accessTier: isFreeFull ? "free_full" : "locked_preview",
    hasFreeFullAccess: isFreeFull,
    previewLimitSeconds: isFreeFull ? undefined : MUSIC_PREVIEW_LIMIT_SECONDS,
    purchaseFeatureKey: isFreeFull ? undefined : buildMusicTrackFeatureKey(normalizedKey),
    priceKRW: isFreeFull ? undefined : MUSIC_TRACK_UNLOCK_PRICE_KRW,
    coinCost: isFreeFull ? undefined : MUSIC_TRACK_UNLOCK_COIN_COST,
  });
}

export function resolveMusicTrackUnlockPricing(featureKey) {
  if (!isMusicTrackFeatureKey(featureKey)) return null;

  return Object.freeze({
    featureKey: String(featureKey || "").trim(),
    cost: MUSIC_TRACK_UNLOCK_COIN_COST,
    amountKRW: MUSIC_TRACK_UNLOCK_PRICE_KRW,
    reason: "Code Destiny music full track unlock",
  });
}
