// 접근 상태 스냅샷의 TTL 캐시 **저장소**만 담는다. 스냅샷을 만드는 로직은 ./access-state.js 에 있다.
//
// 🔴 왜 갈라져 있나: 이 파일은 **아무것도 import 하지 않는다.** 무효화 한 줄이 필요한 라우트가
//    ./access-state.js 를 통째로 끌어오면 models.js·content-unlocks.js·profile-limits.js 까지 딸려
//    오고, 그 라우트의 테스트가 models.js 를 부분 모킹하고 있으면 "export 가 없다"로 스위트가 통째로
//    죽는다(2026-08-31 실측: worker/routes/auth.js 에 무효화를 넣자 11개 스위트 109건이 그렇게 죽었다).
//    무효화는 탈퇴·결제·프로필 변경처럼 서로 다른 라우트에서 불려야 하므로, 그 진입점은 의존이 없어야 한다.
//
// entries 는 평범한 데이터라 요청 간 재사용이 합법이다. 예전에는 여기에 in-flight Promise 맵도
// 함께 있었는데, Cloudflare Workers 가 요청 간 Promise continuation 을 금지하므로 제거했다
// (worker/routes/access-state.js 의 주석 참고 — 같은 위법이 auth 에서 503 을 냈다).

export const ACCESS_STATE_TTL_MS = 60000;
export const ACCESS_STATE_STALE_TTL_MS = 30 * 60 * 1000;
const ACCESS_STATE_MAX_ENTRIES = 2500;

const cache = globalThis.__codeDestinyAccessStateCache || (globalThis.__codeDestinyAccessStateCache = {
  entries: new Map(),
  currentProfileByUser: new Map(),
});
if (!cache.currentProfileByUser) cache.currentProfileByUser = new Map();

export function normalizeUserId(userId) {
  return String(userId || "").trim();
}

export function normalizeProfileId(profileId) {
  return String(profileId || "").trim().slice(0, 100);
}

function normalizeIncludes(include = "") {
  const values = Array.isArray(include) ? include : String(include || "").split(",");
  return Array.from(new Set(values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))).sort();
}

function accessStateCacheKey(userId, profileId = "", include = "") {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return "";
  const normalizedProfileId = normalizeProfileId(profileId);
  const base = normalizedProfileId ? `${normalizedUserId}::${normalizedProfileId}` : normalizedUserId;
  const includeKey = normalizeIncludes(include).join(",");
  return includeKey ? `${base}::include=${includeKey}` : base;
}

function prune(now = Date.now()) {
  for (const [key, entry] of cache.entries) {
    if (!entry || entry.staleUntil <= now) cache.entries.delete(key);
  }
  while (cache.entries.size > ACCESS_STATE_MAX_ENTRIES) {
    const oldest = cache.entries.keys().next().value;
    if (!oldest) break;
    cache.entries.delete(oldest);
  }
}

export function readAccessStateCache(userId, { profileId = "", include = "", allowStale = false } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const fallbackProfileId = profileId || cache.currentProfileByUser.get(normalizedUserId) || "";
  const key = accessStateCacheKey(normalizedUserId, fallbackProfileId, include);
  if (!key) return null;
  const entry = cache.entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt > now) return { ...entry.value, source: "cache" };
  if (allowStale && entry.staleUntil > now) return { ...entry.value, source: "stale-cache" };
  if (entry.staleUntil <= now) cache.entries.delete(key);
  return null;
}

export function writeAccessStateCache(userId, value, { profileId = "", include = "" } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProfileId = normalizeProfileId(profileId || value?.currentProfileId || value?.profileId);
  const key = accessStateCacheKey(normalizedUserId, normalizedProfileId, include);
  if (!key || !value) return value;
  const now = Date.now();
  prune(now);
  cache.entries.set(key, {
    value: { ...value, source: "db" },
    expiresAt: now + ACCESS_STATE_TTL_MS,
    staleUntil: now + ACCESS_STATE_STALE_TTL_MS,
  });
  if (normalizedProfileId) cache.currentProfileByUser.set(normalizedUserId, normalizedProfileId);
  return value;
}

export function invalidateAccessStateCacheForUser(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return false;
  let deleted = false;
  for (const key of cache.entries.keys()) {
    if (key === normalizedUserId || key.startsWith(`${normalizedUserId}::`)) {
      deleted = cache.entries.delete(key) || deleted;
    }
  }
  cache.currentProfileByUser.delete(normalizedUserId);
  const legacyUnlockCache = globalThis.__codeDestinyAccessUnlocksCache;
  const legacyPrefix = `${normalizedUserId}::`;
  for (const key of legacyUnlockCache?.entries?.keys?.() || []) {
    if (key.startsWith(legacyPrefix)) legacyUnlockCache.entries.delete(key);
  }
  return deleted;
}

globalThis.__accessStateCache = {
  invalidateForUser: invalidateAccessStateCacheForUser,
};
