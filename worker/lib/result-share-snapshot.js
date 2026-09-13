/**
 * 정적 셸(index.html) 결과의 공유 스냅샷.
 *
 * 가디언 운세(guardian-fortune-share.js)와 결정적으로 다른 점: 정적 셸 결과는 서버 생성 이력이
 * 없어 서명된 초안 토큰을 만들 수 없다. 즉 **본문을 클라이언트가 올린다**. 이 모듈이 레포에서
 * 유일하게 임의 사용자 텍스트를 받는 공개 쓰기 경로이므로, 방어는 전부 서버 쪽에 있다:
 *   1. feature 화이트리스트 — 무료 결과 2종만. 유료 본문은 여기서 통째로 거부된다.
 *   2. 필드 화이트리스트 + 길이 제한 — 화이트리스트 밖 키는 조용히 버려진다.
 *   3. PII 거부 — 전화·주민·이메일이 섞이면 저장 자체를 하지 않는다.
 *   4. contentHash 유일 인덱스 — 같은 본문은 링크가 하나로 모여 스팸 누적을 막는다.
 * 레이트 리밋은 라우트(worker/routes/fortune.js)가 맡는다.
 */
import { ResultSharedSnapshot } from "./models.js";
import {
  createShareId,
  hasSensitiveText,
  isRecord,
  sanitizeShareText,
  toIso,
} from "./share-snapshot-core.js";

export const RESULT_SHARE_ID_PREFIX = "sr_";
export const RESULT_SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
/** 🔴 무료 결과만. 유료 결과를 추가하려면 "무료 결과만 공유" 결정부터 다시 받아야 한다. */
export const RESULT_SHARE_FEATURES = Object.freeze(["tarot-basic", "saju-basic"]);
export const RESULT_SHARE_MAX_SECTIONS = 6;
export const RESULT_SHARE_TEXT_LIMITS = Object.freeze({
  title: 120,
  summary: 400,
  heading: 80,
  body: 1200,
});

const SHARE_ID_PATTERN = /^sr_[A-Za-z0-9_-]{24,80}$/;
const LOCALE_PATTERN = /^[A-Za-z]{2}(?:-[A-Za-z0-9]{2,8})?$/;
const FEATURE_SET = new Set(RESULT_SHARE_FEATURES);

export function isResultShareEnabled(env = {}) {
  return String(env.ENABLE_RESULT_SHARE || "").toLowerCase() === "true";
}

export const RESULT_SHARE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RESULT_SHARE_RATE_LIMIT_MAX = 10;

/**
 * 🔴 이 엔드포인트의 레이트 리밋에는 끄는 스위치가 없다. 가디언 쪽은 서명 토큰이 1차 방어라
 * 플래그로 껐다 켤 수 있지만, 여기는 레이트 리밋이 **유일한** 유량 방어다. 플래그를 두면
 * 켜는 걸 잊은 순간 무제한 공개 쓰기가 된다.
 */
export function resultShareRateLimitVerdict({ count = 0, resetAt = 0, now = Date.now() } = {}) {
  if (Number(count) <= RESULT_SHARE_RATE_LIMIT_MAX) return null;
  return {
    ok: false,
    status: 429,
    error: "RESULT_SHARE_RATE_LIMITED",
    message: "공유 요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.",
    retryAfterSeconds: Math.max(1, Math.ceil((Number(resetAt) - Number(now)) / 1000)),
  };
}

/** 출처를 못 읽으면 하나의 공용 버킷으로 몰아 fail-closed 로 센다(통과시키지 않는다). */
export function resultShareRateLimitSubject(request) {
  const headers = request?.headers;
  const direct = String(headers?.get?.("CF-Connecting-IP") || "").trim();
  if (direct) return `ip:${direct}`;
  const forwarded = String(headers?.get?.("X-Forwarded-For") || "").split(",")[0].trim();
  if (forwarded) return `ip:${forwarded}`;
  return "ip:unknown";
}

export function isValidResultShareId(shareId) {
  return SHARE_ID_PATTERN.test(String(shareId || ""));
}

export function createResultShareId() {
  return createShareId(RESULT_SHARE_ID_PREFIX);
}

export function isAllowedResultShareFeature(feature) {
  return FEATURE_SET.has(String(feature || ""));
}

/**
 * 클라이언트 본문을 저장 가능한 형태로 깎는다. 조금이라도 규칙을 벗어나면 null 이다 —
 * 부분 저장은 하지 않는다(잘린 결과가 카톡 카드로 나가는 편이 거부보다 나쁘다).
 */
export function projectResultShareInput(input) {
  if (!isRecord(input) || !isAllowedResultShareFeature(input.feature)) return null;
  const title = sanitizeShareText(input.title, RESULT_SHARE_TEXT_LIMITS.title);
  const summary = sanitizeShareText(input.summary, RESULT_SHARE_TEXT_LIMITS.summary);
  if (!title || !summary) return null;

  const sections = [];
  const rawSections = Array.isArray(input.sections) ? input.sections.slice(0, RESULT_SHARE_MAX_SECTIONS) : [];
  for (const section of rawSections) {
    if (!isRecord(section)) continue;
    const heading = sanitizeShareText(section.heading, RESULT_SHARE_TEXT_LIMITS.heading);
    const body = sanitizeShareText(section.body, RESULT_SHARE_TEXT_LIMITS.body);
    if (!heading || !body) continue;
    sections.push({ heading, body });
  }

  const requestedLocale = String(input.locale || "").trim();
  const projected = {
    feature: String(input.feature),
    title,
    summary,
    sections,
    locale: LOCALE_PATTERN.test(requestedLocale) ? requestedLocale : "ko-KR",
  };
  if (hasSensitiveText(JSON.stringify(projected))) return null;
  return projected;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 같은 본문 → 같은 해시 → 같은 공유 링크. projected 의 키 순서가 계약의 일부다. */
export function computeResultShareContentHash(projected) {
  return sha256Hex(JSON.stringify(projected));
}

export function toPublicResultSnapshot(record) {
  if (!record) return null;
  const value = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    shareId: String(value.shareId),
    feature: String(value.feature),
    title: String(value.title),
    summary: String(value.summary),
    sections: Array.isArray(value.sections)
      ? value.sections.map((section) => ({ heading: String(section.heading), body: String(section.body) }))
      : [],
    locale: String(value.locale || "ko-KR"),
    createdAt: toIso(value.createdAt),
    ...(value.expiresAt ? { expiresAt: toIso(value.expiresAt) } : {}),
  };
}

export function buildResultShareUrl({ shareId, requestUrl, env = {} } = {}) {
  const configuredOrigin = String(env.PUBLIC_SITE_URL || env.SITE_URL || "").trim().replace(/\/+$/, "");
  const origin = configuredOrigin || new URL(requestUrl).origin;
  return `${origin}/share/?shareId=${encodeURIComponent(String(shareId))}`;
}

export async function createResultShareSnapshot({ input, requestUrl, env = {}, now = new Date(), model = ResultSharedSnapshot } = {}) {
  if (!model) throw new Error("RESULT_SHARE_STORAGE_UNAVAILABLE");
  const projected = projectResultShareInput(input);
  if (!projected) throw new Error("RESULT_SHARE_RESULT_INVALID");

  const contentHash = await computeResultShareContentHash(projected);
  const nowMs = new Date(now).getTime();
  const reuse = async () => {
    const existing = await model.findOne({ contentHash, status: "active" }).lean();
    const existingExpiry = existing?.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
    if (!existing || existingExpiry <= nowMs) return null;
    return {
      snapshot: toPublicResultSnapshot(existing),
      shareUrl: buildResultShareUrl({ shareId: existing.shareId, requestUrl, env }),
      reused: true,
    };
  };

  const reused = await reuse();
  if (reused) return reused;

  const createdAt = new Date(nowMs);
  const base = { ...projected, contentHash, createdAt, expiresAt: new Date(nowMs + RESULT_SHARE_TTL_MS), status: "active" };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const record = await model.create({ shareId: createResultShareId(), ...base });
      const snapshot = toPublicResultSnapshot(record);
      return { snapshot, shareUrl: buildResultShareUrl({ shareId: snapshot.shareId, requestUrl, env }), reused: false };
    } catch (error) {
      lastError = error;
      if (error?.code !== 11000) throw error;
      // 11000 은 shareId 충돌일 수도, 동시 요청이 같은 본문을 먼저 넣은 것일 수도 있다.
      // 후자면 그 문서를 그대로 돌려준다 — 같은 본문에 링크가 둘 생기는 걸 막는다.
      const raced = await reuse();
      if (raced) return raced;
    }
  }
  throw lastError || new Error("RESULT_SHARE_ID_COLLISION");
}

export async function findPublicResultSnapshot({ shareId, now = new Date(), model = ResultSharedSnapshot } = {}) {
  if (!isValidResultShareId(shareId) || !model) return null;
  const record = await model.findOne({ shareId: String(shareId), status: "active" }).lean();
  if (!record || (record.expiresAt && new Date(record.expiresAt).getTime() <= new Date(now).getTime())) return null;
  return toPublicResultSnapshot(record);
}
