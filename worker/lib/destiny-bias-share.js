/**
 * 최애운명(K-POP 케미) 공유 스냅샷.
 *
 * 계약:
 * - 클라이언트는 **입력**(생일·최애 참조)만 보내고 본문은 서버가 lib/idol-chemi 로 재계산한다.
 *   그래서 저장 문서에는 유형·한 줄·최애 표시명만 남고 생일은 어디에도 기록되지 않는다.
 * - 레이트 리밋에는 끄는 스위치가 없다(result-share-snapshot.js 와 같은 이유: 유일한 유량 방어).
 * - referenceDate 는 클라이언트 값을 그대로 믿지 않는다. 서버 KST 날짜 ±1일 안이면 서버값을 쓴다
 *   (미성년 모드를 날짜로 우회하는 것을 막는다).
 * - 이 파일은 workers-og 를 import 하지 않는다(.wasm 이 플레인 node 에서 깨진다). OG HTML 만 만든다.
 */
import { DestinyBiasShare } from "./models.js";
import { createShareId, hasSensitiveText, sanitizeShareText, toIso } from "./share-snapshot-core.js";
import { validateBirthDateWithAge } from "./validation.js";
import {
  CHEMI_TYPE_BY_ID,
  MIN_SELF_CONSENT_AGE,
  PARTNER_ID_PATTERN,
  PARTNER_KINDS,
  runChemi,
} from "../../lib/idol-chemi/index.js";

export const DESTINY_BIAS_SHARE_ID_PREFIX = "dbs_";
export const DESTINY_BIAS_SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const DESTINY_BIAS_SHARE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const DESTINY_BIAS_SHARE_RATE_LIMIT_MAX = 10;
export const DESTINY_BIAS_SHARE_NICKNAME_MAX = 20;
export const DESTINY_BIAS_SHARE_ID_PATTERN = /^dbs_[A-Za-z0-9_-]{24,80}$/;
export const DESTINY_BIAS_SHARE_LANDING_PATH = "/saju/destiny-bias/share/";
export const DESTINY_BIAS_SHARE_PREVIEW_PATH = "/api/destiny-bias/s";
export const DESTINY_BIAS_OG_FALLBACK_PATH = "/images/destiny-bias/og-default-1200x630.png";

const CALENDAR_TYPES = Object.freeze(["solar", "lunar", "lunar_leap"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LINK_LIKE = /https?:\/\/|www\./i;

export class DestinyBiasShareError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "DestinyBiasShareError";
    this.code = code;
    this.status = status;
  }
}

export function isValidDestinyBiasShareId(value) {
  return DESTINY_BIAS_SHARE_ID_PATTERN.test(String(value || ""));
}

export function createDestinyBiasShareId() {
  return createShareId(DESTINY_BIAS_SHARE_ID_PREFIX, 18);
}

export function destinyBiasShareRateLimitVerdict({ count = 0, resetAt = 0, now = Date.now() } = {}) {
  if (Number(count) <= DESTINY_BIAS_SHARE_RATE_LIMIT_MAX) return null;
  return {
    ok: false,
    status: 429,
    error: "DESTINY_BIAS_SHARE_RATE_LIMITED",
    message: "공유 요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.",
    retryAfterSeconds: Math.max(1, Math.ceil((Number(resetAt) - Number(now)) / 1000)),
  };
}

/** 출처를 못 읽으면 공용 버킷으로 몰아 fail-closed 로 센다. */
export function destinyBiasShareRateLimitSubject(request) {
  const headers = request?.headers;
  const direct = String(headers?.get?.("CF-Connecting-IP") || "").trim();
  if (direct) return `ip:${direct}`;
  const forwarded = String(headers?.get?.("X-Forwarded-For") || "").split(",")[0].trim();
  if (forwarded) return `ip:${forwarded}`;
  return "ip:unknown";
}

export function kstDateString(now = new Date()) {
  const kst = new Date(new Date(now).getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

/** 클라이언트 referenceDate 가 서버 KST 날짜 ±1일 안이면 서버값, 아니면 거부. */
export function resolveReferenceDate(clientValue, now = new Date()) {
  const server = kstDateString(now);
  const client = String(clientValue || "").trim();
  if (!client) return server;
  const invalid = () => new DestinyBiasShareError("DESTINY_BIAS_SHARE_REFERENCE_DATE_INVALID", "기준 날짜가 올바르지 않아요.");
  if (!ISO_DATE.test(client)) throw invalid();
  const diffDays = Math.abs((Date.parse(`${client}T00:00:00Z`) - Date.parse(`${server}T00:00:00Z`)) / 86400000);
  if (!Number.isFinite(diffDays) || diffDays > 1) throw invalid();
  return server;
}

function normalizeNickname(input) {
  if (!input?.showNickname) return null;
  const nickname = sanitizeShareText(input.nickname, DESTINY_BIAS_SHARE_NICKNAME_MAX);
  if (!nickname) return null;
  if (hasSensitiveText(nickname) || LINK_LIKE.test(nickname)) {
    throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_NICKNAME_INVALID", "닉네임에 연락처·링크는 넣을 수 없어요.");
  }
  return nickname;
}

/** 입력을 화이트리스트로 좁힌다. 생일은 계산에만 쓰고 projected 밖으로 내보내지 않는다. */
export function normalizeDestinyBiasShareInput(input, now = new Date()) {
  if (!input || typeof input !== "object") {
    throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_INPUT_INVALID", "요청 본문이 올바르지 않아요.");
  }
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const partner = input.partner && typeof input.partner === "object" ? input.partner : {};

  const birthDate = String(user.birthDate || "").trim();
  const birth = validateBirthDateWithAge(birthDate, now);
  if (!birth.isValid) {
    // validateBirthDateWithAge 는 만 14세 미만도 isValid:false 로 돌려준다 — age 가 음수가 아니면 날짜 자체는 유효한 것.
    if (birth.age >= 0 && birth.age < MIN_SELF_CONSENT_AGE) {
      throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_UNDER_AGE", `만 ${MIN_SELF_CONSENT_AGE}세 이상만 이용할 수 있어요.`);
    }
    throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_BIRTH_DATE_INVALID", birth.error || "올바른 생년월일을 입력해주세요.");
  }

  const calendarType = CALENDAR_TYPES.includes(user.calendarType) ? user.calendarType : "solar";
  const kind = String(partner.kind || "").trim();
  const id = String(partner.id || "").trim();
  if (!PARTNER_KINDS.includes(kind) || !PARTNER_ID_PATTERN.test(id) || id.length > 80) {
    throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_PARTNER_INVALID", "최애 정보를 찾을 수 없어요.");
  }

  return {
    user: { birthDate, calendarType, isLeapMonth: calendarType === "lunar_leap" },
    partner: { kind, id },
    nicknameDisplay: normalizeNickname(input),
    referenceDate: resolveReferenceDate(input.referenceDate, now),
  };
}

/** 서버 재계산 → 공개 요약 투영. 반환 객체에 생일·명식은 없다. */
export function projectDestinyBiasShare(normalized) {
  let computed;
  try {
    computed = runChemi({ user: normalized.user, partner: normalized.partner, referenceDate: normalized.referenceDate });
  } catch (error) {
    const code = String(error?.message || "");
    if (code === "IDOL_CHEMI_PARTNER_UNKNOWN") {
      throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_PARTNER_INVALID", "최애 정보를 찾을 수 없어요.");
    }
    if (code === "IDOL_CHEMI_USER_UNDER_CONSENT_AGE") {
      throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_UNDER_AGE", `만 ${MIN_SELF_CONSENT_AGE}세 이상만 이용할 수 있어요.`);
    }
    if (code.startsWith("IDOL_CHEMI_")) {
      throw new DestinyBiasShareError("DESTINY_BIAS_SHARE_INPUT_INVALID", "입력을 다시 확인해 주세요.");
    }
    throw error;
  }
  const { result, copy } = computed;
  const typeMeta = CHEMI_TYPE_BY_ID[result.chemiTypeId];
  return {
    chemiTypeId: result.chemiTypeId,
    chemiTypeNameKo: sanitizeShareText(typeMeta?.nameKo || result.chemiTypeNameKo, 80),
    chemiTypeShortKo: sanitizeShareText(typeMeta?.shortKo || result.chemiTypeShortKo, 40),
    signalStrength: result.signalStrength,
    // 점수·등급도 서버 재계산값만 싣는다(요청 본문에 score 가 있어도 읽지 않는다).
    score: result.score.total,
    grade: sanitizeShareText(result.score.grade, 40),
    gradeTitle: sanitizeShareText(result.score.gradeTitle, 60),
    scoreVersion: String(result.scoreVersion),
    oneLiner: sanitizeShareText(copy.oneLiner, 160),
    partnerKind: result.partner.kind,
    partnerId: result.partner.id,
    partnerName: sanitizeShareText(result.partner.displayName, 60),
    groupId: result.partner.groupId || null,
    groupLabel: sanitizeShareText(result.partner.groupLabel, 60),
    nicknameDisplay: normalized.nicknameDisplay,
    minorMode: Boolean(result.minorMode),
    engineVersion: String(result.engineVersion),
    rosterVersion: String(result.rosterVersion),
    copyVersion: String(copy.copyVersion),
  };
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 같은 (유형·점수·최애·닉네임·버전) → 같은 링크. 생일은 해시 재료에도 넣지 않는다. */
export function computeDestinyBiasShareContentHash(projected) {
  const material = [
    projected.chemiTypeId,
    projected.signalStrength,
    // 점수가 빠지면 유형·최애가 같은 다른 사람의 링크(다른 점수)를 재사용하게 된다.
    projected.score,
    projected.scoreVersion,
    projected.oneLiner,
    projected.partnerKind,
    projected.partnerId,
    projected.nicknameDisplay || "",
    projected.minorMode ? "1" : "0",
    projected.engineVersion,
    projected.rosterVersion,
    projected.copyVersion,
  ].join("|");
  return sha256Hex(`destiny-bias-share:${material}`);
}

export function toPublicDestinyBiasShare(record) {
  if (!record) return null;
  const value = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    shareId: String(value.shareId),
    chemiTypeId: String(value.chemiTypeId),
    chemiTypeNameKo: String(value.chemiTypeNameKo),
    chemiTypeShortKo: String(value.chemiTypeShortKo),
    signalStrength: String(value.signalStrength),
    // 점수 도입 전 문서에는 없다 → null(화면은 점수 줄을 숨긴다).
    score: Number.isFinite(value.score) ? Number(value.score) : null,
    grade: value.grade ? String(value.grade) : null,
    gradeTitle: value.gradeTitle ? String(value.gradeTitle) : null,
    oneLiner: String(value.oneLiner),
    partner: {
      kind: String(value.partnerKind),
      id: String(value.partnerId),
      displayName: String(value.partnerName),
      groupId: value.groupId ? String(value.groupId) : null,
      groupLabel: String(value.groupLabel || ""),
    },
    nicknameDisplay: value.nicknameDisplay ? String(value.nicknameDisplay) : null,
    minorMode: Boolean(value.minorMode),
    engineVersion: String(value.engineVersion),
    rosterVersion: String(value.rosterVersion),
    copyVersion: String(value.copyVersion),
    createdAt: toIso(value.createdAt),
    ...(value.expiresAt ? { expiresAt: toIso(value.expiresAt) } : {}),
  };
}

export function resolveShareOrigin({ requestUrl, env = {} } = {}) {
  const configured = String(env.PUBLIC_SITE_URL || env.SITE_URL || env.SITE_BASE_URL || "").trim().replace(/\/+$/, "");
  return configured || new URL(requestUrl).origin;
}

/** 사람들이 퍼뜨리는 링크 = 크롤러용 미리보기 페이지(사람은 곧바로 정적 랜딩으로 넘어간다). */
export function buildDestinyBiasShareUrl({ shareId, requestUrl, env = {} } = {}) {
  return `${resolveShareOrigin({ requestUrl, env })}${DESTINY_BIAS_SHARE_PREVIEW_PATH}?s=${encodeURIComponent(String(shareId))}`;
}

export async function createDestinyBiasShare({ input, requestUrl, env = {}, now = new Date(), model = DestinyBiasShare } = {}) {
  if (!model) throw new Error("DESTINY_BIAS_SHARE_STORAGE_UNAVAILABLE");
  const normalized = normalizeDestinyBiasShareInput(input, now);
  const projected = projectDestinyBiasShare(normalized);
  const contentHash = await computeDestinyBiasShareContentHash(projected);
  const nowMs = new Date(now).getTime();

  const reuse = async () => {
    const existing = await model.findOne({ contentHash, status: "active" }).lean();
    const expiry = existing?.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
    if (!existing || expiry <= nowMs) return null;
    return {
      snapshot: toPublicDestinyBiasShare(existing),
      shareUrl: buildDestinyBiasShareUrl({ shareId: existing.shareId, requestUrl, env }),
      reused: true,
    };
  };

  const reused = await reuse();
  if (reused) return reused;

  const base = {
    ...projected,
    contentHash,
    createdAt: new Date(nowMs),
    expiresAt: new Date(nowMs + DESTINY_BIAS_SHARE_TTL_MS),
    status: "active",
  };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const record = await model.create({ shareId: createDestinyBiasShareId(), ...base });
      const snapshot = toPublicDestinyBiasShare(record);
      return { snapshot, shareUrl: buildDestinyBiasShareUrl({ shareId: snapshot.shareId, requestUrl, env }), reused: false };
    } catch (error) {
      lastError = error;
      if (error?.code !== 11000) throw error;
      // shareId 충돌 또는 같은 본문의 동시 요청 — 후자면 그 문서를 돌려준다.
      const raced = await reuse();
      if (raced) return raced;
    }
  }
  throw lastError || new Error("DESTINY_BIAS_SHARE_ID_COLLISION");
}

export async function findPublicDestinyBiasShare({ shareId, now = new Date(), model = DestinyBiasShare } = {}) {
  if (!isValidDestinyBiasShareId(shareId) || !model) return null;
  const record = await model.findOne({ shareId: String(shareId), status: "active" }).lean();
  if (!record || (record.expiresAt && new Date(record.expiresAt).getTime() <= new Date(now).getTime())) return null;
  return toPublicDestinyBiasShare(record);
}

/* ---------------- OG 카드 HTML (satori 용 마크업만; 렌더는 destiny-bias-share-og.js) ---------------- */

// 밤 무대 팔레트(app/saju/destiny-bias/destiny-bias.module.css 의 --dbk-* 와 같은 값).
const OG_ACCENT = Object.freeze({
  telepathy: "#c3adff",
  "same-wave": "#9fe3ff",
  "accel-brake": "#ff8fd0",
  "locked-in": "#9fe3ff",
  "quiet-care": "#c3adff",
  "hype-charger": "#ff8fd0",
  "push-pull": "#ff8fd0",
  "cross-learn": "#9fe3ff",
  "slow-burn": "#c3adff",
});
const OG_INK = "#f7f1ff";
const OG_INK_SOFT = "#cfc4ea";
const OG_GOLD = "#ffd98a";
// 디자인을 바꾸면 올린다. og.png 는 immutable 캐시라 주소가 바뀌어야 크롤러가 새 카드를 받는다.
export const DESTINY_BIAS_OG_DESIGN_VERSION = "stage-1";

const HTML_ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

function shareWho(snapshot) {
  return snapshot.nicknameDisplay
    ? `${snapshot.nicknameDisplay} × ${snapshot.partner.displayName}`
    : `나 × ${snapshot.partner.displayName}`;
}

export function buildDestinyBiasOgHtml(snapshot, brandDomain = "code-destiny.com") {
  const accent = OG_ACCENT[snapshot.chemiTypeId] || "#c3adff";
  const group = snapshot.partner.groupLabel ? ` · ${snapshot.partner.groupLabel}` : "";
  const hasScore = Number.isFinite(snapshot.score);
  // 점수가 있으면 오른쪽 점수 기둥만큼 본문 폭을 줄인다.
  const textRight = hasScore ? 400 : 80;
  const scoreBlock = hasScore
    ? `<div style="display:flex;position:absolute;right:80px;top:150px;width:260px;height:300px;flex-direction:column;align-items:center;justify-content:center;border-radius:36px;border:2px solid ${accent};background:rgba(20,10,48,0.72);">
    <div style="display:flex;font-size:26px;letter-spacing:4px;color:${OG_INK_SOFT};">CHEMI</div>
    <div style="display:flex;align-items:flex-end;"><div style="display:flex;font-size:120px;line-height:1;font-weight:700;color:${OG_INK};">${escapeHtml(snapshot.score)}</div><div style="display:flex;font-size:36px;margin:0 0 14px 6px;color:${OG_INK_SOFT};">점</div></div>
    <div style="display:flex;margin-top:14px;font-size:26px;font-weight:700;letter-spacing:2px;color:${OG_GOLD};">${escapeHtml(snapshot.grade || "")}</div>
  </div>`
    : "";
  // satori: 자식이 둘 이상인 요소는 display:flex 필수, 배치는 절대좌표(og-card.js 실측 메모와 동일).
  // 밤 콘서트 무대: 어두운 바탕 + 위에서 떨어지는 두 줄기 조명. 사진·얼굴·로고는 그리지 않는다.
  return `<div style="display:flex;position:relative;width:1200px;height:630px;background:linear-gradient(180deg,#0a0616 0%,#160a30 62%,#2a1650 100%);font-family:'Noto Sans KR';">
  <div style="display:flex;position:absolute;left:-120px;top:-260px;width:760px;height:760px;border-radius:380px;background:radial-gradient(circle,rgba(195,173,255,0.30) 0%,rgba(195,173,255,0) 70%);"></div>
  <div style="display:flex;position:absolute;right:-160px;top:-280px;width:760px;height:760px;border-radius:380px;background:radial-gradient(circle,rgba(255,143,208,0.24) 0%,rgba(255,143,208,0) 70%);"></div>
  <div style="display:flex;position:absolute;left:0;bottom:0;width:1200px;height:10px;background:${accent};"></div>
  <div style="display:flex;position:absolute;left:80px;top:72px;font-size:24px;letter-spacing:4px;color:${accent};font-weight:700;">최애운명 · 케미 카드</div>
  <div style="display:flex;position:absolute;left:80px;right:${textRight}px;top:122px;font-size:30px;color:${OG_INK_SOFT};">${escapeHtml(shareWho(snapshot))}${escapeHtml(group)}</div>
  <div style="display:flex;position:absolute;left:80px;right:${textRight}px;top:196px;font-size:62px;line-height:1.22;color:${OG_INK};font-weight:700;">${escapeHtml(snapshot.chemiTypeNameKo)}</div>
  <div style="display:flex;position:absolute;left:80px;right:${textRight}px;top:380px;font-size:30px;line-height:1.5;color:${OG_INK_SOFT};">${escapeHtml(snapshot.oneLiner)}</div>
  ${scoreBlock}
  <div style="display:flex;position:absolute;left:80px;bottom:52px;font-size:24px;color:${OG_INK};font-weight:700;">꿀꿀 사주</div>
  <div style="display:flex;position:absolute;right:80px;bottom:54px;font-size:22px;color:${OG_INK_SOFT};">${escapeHtml(brandDomain)} · 오락용</div>
</div>`;
}

/* ---------------- 크롤러용 미리보기(바운스) 페이지 ----------------
 * 공유 랜딩은 정적 export 라 og 메타를 공유 id 별로 바꿀 수 없다(모든 링크가 기본 카드로 보인다).
 * 그래서 사람들이 퍼뜨리는 링크는 이 워커 페이지이고, 크롤러는 여기서 결과별 og:image 를 읽고,
 * 사람은 스크립트로 정적 랜딩에 넘어간다. meta refresh 는 쓰지 않는다 — 따라가는 크롤러가
 * 정적 랜딩의 기본 카드를 읽어 버린다.
 */

const FORWARDED_QUERY_KEYS = Object.freeze(["utm_source", "utm_medium", "utm_campaign"]);

export function buildDestinyBiasShareLandingUrl({ shareId, origin, searchParams } = {}) {
  const url = new URL(DESTINY_BIAS_SHARE_LANDING_PATH, origin);
  url.searchParams.set("s", String(shareId));
  for (const key of FORWARDED_QUERY_KEYS) {
    const value = String(searchParams?.get?.(key) || "").slice(0, 60);
    if (/^[\w.-]+$/.test(value)) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function buildDestinyBiasOgImageUrl({ shareId, origin }) {
  return `${origin}/api/destiny-bias/share/${encodeURIComponent(String(shareId))}/og.png?v=${DESTINY_BIAS_OG_DESIGN_VERSION}`;
}

export function buildDestinyBiasSharePreviewHtml({ snapshot, previewUrl, landingUrl, ogImageUrl }) {
  const scoreText = Number.isFinite(snapshot.score) ? ` ${snapshot.score}점` : "";
  const title = `${shareWho(snapshot)} 케미${scoreText} · ${snapshot.chemiTypeShortKo || snapshot.chemiTypeNameKo}`;
  const description = snapshot.oneLiner;
  // 스크립트 문자열 안에서 </script> 로 빠져나가지 못하게 < 를 이스케이프한다.
  const landingJs = JSON.stringify(String(landingUrl)).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">`
    + `<title>${escapeHtml(title)} | 꿀꿀 사주</title>`
    + `<meta property="og:type" content="website"><meta property="og:site_name" content="꿀꿀 사주">`
    + `<meta property="og:url" content="${escapeHtml(previewUrl)}"><meta property="og:title" content="${escapeHtml(title)}">`
    + `<meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(ogImageUrl)}">`
    + `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`
    + `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">`
    + `<meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">`
    + `<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0616;color:#f7f1ff;font:16px/1.6 system-ui,sans-serif}a{color:#ffd98a}</style>`
    + `<script>location.replace(${landingJs});</script></head>`
    + `<body><main><p>${escapeHtml(title)}</p><p><a href="${escapeHtml(landingUrl)}">공유된 케미 카드 보기</a></p></main></body></html>`;
}

export function collectDestinyBiasOgGlyphs(snapshot, brandDomain) {
  const text = buildDestinyBiasOgHtml(snapshot, brandDomain)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, " ");
  return Array.from(new Set(Array.from(text))).join("");
}
