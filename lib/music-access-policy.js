export const MUSIC_PREVIEW_LIMIT_SECONDS = 40;
export const MUSIC_TRACK_UNLOCK_PRICE_KRW = 300;
export const MUSIC_TRACK_UNLOCK_COIN_COST = 3;
export const MUSIC_TRACK_FEATURE_PREFIX = "music-track-";

// 다운로드 결제 게이트 단일 스위치.
// true면 전곡 재생은 무료(free_full)로 열어두되 MP3 다운로드는 기존 UNLOCK(300원/3코인) 구매를 요구한다.
// false면 재생·다운로드 모두 무료(2026-07 전곡 무료 정책)로 복귀한다 — 되돌리기 1줄.
export const MUSIC_DOWNLOAD_REQUIRES_PURCHASE = true;

// 서버가 미결제 사용자에게 흘려보내는 미리듣기 최대 바이트.
// 40초 × 320kbps(≈40KB/s) + MP3 헤더/프레임 여유(64KB). 곡 전체 유출을 막는 방어선.
export const MUSIC_PREVIEW_MAX_BYTES = Math.ceil((MUSIC_PREVIEW_LIMIT_SECONDS * 320 * 1000) / 8) + 64 * 1024;

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
  "Meditation/",
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
  // 전곡 무료 재생 정책: 유효한 모든 음악 트랙을 free_full(전곡 재생)로 연다.
  const isFreeFull = isValidMusicAudioSourceKey(normalizedKey) || isFreeFullMusicTrack(normalizedKey);
  // 재생은 무료지만 다운로드는 스위치가 켜져 있으면 실제 구매(UNLOCK)를 요구한다.
  // 이 경우 free_full 트랙에도 구매용 featureKey/가격을 노출한다(재생 필드와 분리).
  const downloadRequiresPurchase = isFreeFull && MUSIC_DOWNLOAD_REQUIRES_PURCHASE;
  const exposePurchase = !isFreeFull || downloadRequiresPurchase;

  return Object.freeze({
    audioSourceKey: normalizedKey,
    accessTier: isFreeFull ? "free_full" : "locked_preview",
    hasFreeFullAccess: isFreeFull,
    downloadRequiresPurchase,
    previewLimitSeconds: isFreeFull ? undefined : MUSIC_PREVIEW_LIMIT_SECONDS,
    purchaseFeatureKey: exposePurchase ? buildMusicTrackFeatureKey(normalizedKey) : undefined,
    priceKRW: exposePurchase ? MUSIC_TRACK_UNLOCK_PRICE_KRW : undefined,
    coinCost: exposePurchase ? MUSIC_TRACK_UNLOCK_COIN_COST : undefined,
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
