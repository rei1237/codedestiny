// 기본 사주 궁합 LLM 생성 흐름(클라이언트) — 요청 본문·결제 증빙·대기 기록·생성 실행을 주입식 순수 로직으로 둔다.
// DOM·window·fetch 를 직접 만지지 않는다: 전송(post/get)·저장소·reader·타이머는 호출부(js/saju-engine.js)가 넘긴다.
// 서버 계약 정본: worker/routes/saju-compat-basic.js · worker/lib/saju-compat-schema.js(normalizeSajuCompatInput).
// 🔴 결제는 호출부의 공유 게이트(_cdCoinGatePerUse)가 먼저 끝낸다. 이 모듈은 결제를 만들지도 환불하지도 않는다.

export const SAJU_COMPAT_GENERATE_PATH = "/api/saju-compat-basic/generate";
/** 결제 뒤 생성이 끝나지 못한 요청을 같은 기기에서 이어 받을 수 있는 시간. 서버 이용권 판정 창(120분)과 맞춘다. */
export const SAJU_COMPAT_PENDING_TTL_MS = 2 * 60 * 60 * 1000;
const PENDING_MAX = 5;
const PILLAR_KEYS = ["y", "m", "d", "h"];
const PARTNER_NAME_MAX = 20;

const text = (value) => String(value == null ? "" : value).trim();

/** 엔진 기둥({y:{g,j},m,d,h})을 서버 요청 형식({pillars:[{gan,ji}×4]})으로. */
export function pillarsToWire(pillars) {
  return { pillars: PILLAR_KEYS.map((key) => ({ gan: text(pillars?.[key]?.g), ji: text(pillars?.[key]?.j) })) };
}

/** 같은 입력인지 판정하는 키 재료. 내 사주(기둥)·상대 입력 폼 값·유형이 모두 같아야 같은 구매로 본다. */
export function sajuCompatInputKey({ selfPillars, name, birth, calType, hour, minute, type }) {
  const self = PILLAR_KEYS.map((key) => `${text(selfPillars?.[key]?.g)}${text(selfPillars?.[key]?.j)}`).join("");
  return [self, name, birth, calType, hour, minute, type].map(text).join("|");
}

// 대기 기록 키에는 상대의 이름·생년월일을 평문으로 남기지 않는다 — 입력 키를 해시해 쓴다(cyrb53).
function hashKey(value) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function newSajuCompatRequestId(now = Date.now, random = Math.random) {
  return `saju-compat:${Number(now()).toString(36)}-${random().toString(36).slice(2, 9)}`;
}

/** 게이트 ok 콜백 (transactionId, payload) 에서 서버가 결제 차감을 찾는 데 쓰는 식별자를 모은다(요가 구루와 같은 계약). */
export function captureSajuCompatEvidence(transactionId, payload, requestId) {
  const src = payload && typeof payload === "object" ? payload : {};
  const grant = src.accessGrant && typeof src.accessGrant === "object" ? src.accessGrant : {};
  const consume = src.consume && typeof src.consume === "object" ? src.consume : {};
  const tx = text(transactionId || src.transactionId || consume.transactionId || grant.transactionId || grant.purchaseId || grant.evidenceId);
  return {
    transactionId: tx,
    purchaseId: text(grant.purchaseId || src.purchaseId || tx),
    sessionId: text(src.sessionId || grant.sessionId),
    requestId: text(requestId),
  };
}

/** 모바일 PortOne 복귀 grant({transactionId, payload, requestId|merchantUid}) 에서 같은 증빙을 복원한다. */
export function sajuCompatEvidenceFromGrant(grant, requestId) {
  if (!grant || typeof grant !== "object") return null;
  const payload = grant.payload && typeof grant.payload === "object" ? grant.payload : {};
  return captureSajuCompatEvidence(grant.transactionId, payload, requestId || grant.requestId || grant.merchantUid);
}

/** 생성 POST 본문. facts 는 엔진이 확정한 값 그대로(서버가 일관성을 다시 검증한다), 서술 필드는 없다. */
export function buildSajuCompatBody({ selfPillars, partnerPillars, compatType, partnerName, compatFacts, pastLifeFacts, requestId, evidence }) {
  const body = {
    compatType: text(compatType) || "love",
    partnerName: Array.from(text(partnerName)).slice(0, PARTNER_NAME_MAX).join(""),
    self: pillarsToWire(selfPillars),
    partner: pillarsToWire(partnerPillars),
    facts: { ...(compatFacts || {}), pastLife: pastLifeFacts },
  };
  const ev = evidence && typeof evidence === "object" ? evidence : {};
  for (const key of ["transactionId", "purchaseId", "sessionId"]) if (text(ev[key])) body[key] = text(ev[key]);
  body.requestId = text(requestId || ev.requestId);
  return JSON.parse(JSON.stringify(body));
}

/**
 * 결제는 끝났지만 생성이 안 끝난 요청의 기기 내 기록(계정별). 새로고침·재진입 때 같은 입력이면 게이트를 다시 타지 않고
 * 같은 요청(requestId·증빙·이어받기 본문)으로 이어 가 이중 결제를 막는다. 저장소가 없거나 쓰기가 막히면 조용히 비활성이다.
 */
export function createSajuCompatPendingStore({ storage, ownerId, now = Date.now } = {}) {
  const storeKey = text(ownerId) && storage ? `cd:sajuCompat:pending:v1:${text(ownerId)}` : "";
  const read = () => {
    if (!storeKey) return {};
    try {
      const parsed = JSON.parse(storage.getItem(storeKey) || "null");
      if (!parsed || typeof parsed !== "object") return {};
      const live = {};
      for (const [key, record] of Object.entries(parsed)) {
        if (record && typeof record === "object" && now() - Number(record.createdAt || 0) < SAJU_COMPAT_PENDING_TTL_MS) live[key] = record;
      }
      return live;
    } catch (_) { return {}; }
  };
  const write = (map) => {
    if (!storeKey) return;
    const newest = Object.entries(map).sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0)).slice(0, PENDING_MAX);
    try { storage.setItem(storeKey, JSON.stringify(Object.fromEntries(newest))); } catch (_) { /* 저장 불가는 기능만 끈다 */ }
  };
  return {
    enabled: Boolean(storeKey),
    get(inputKey) { return read()[hashKey(text(inputKey))] || null; },
    put(inputKey, record) {
      const map = read();
      map[hashKey(text(inputKey))] = { ...record, createdAt: now() };
      write(map);
    },
    update(inputKey, patch) {
      const map = read();
      const id = hashKey(text(inputKey));
      if (!map[id]) return;
      map[id] = { ...map[id], ...patch };
      write(map);
    },
    clear(inputKey) {
      const map = read();
      delete map[hashKey(text(inputKey))];
      write(map);
    },
  };
}

// 실패 분류 — reader(js/core/paid-narrative-reader.js)는 상태 코드를 숨기고 일반 문구만 던지므로, 전송 계층이 본 마지막 응답으로 판정한다.
function classifyFailure(last, resultId) {
  const status = Number(last?.status) || 0;
  const payload = last?.payload && typeof last.payload === "object" ? last.payload : {};
  const out = (code, retryable, clearPending) => ({ ok: false, code, retryable, clearPending, resultId: resultId || text(payload.resultId), status });
  if (status === 403) return out("REVOKED", false, true);
  if ((status === 202 || status === 503) && payload.retryable === false) return out("REVIEW_REQUIRED", false, false);
  if (status === 409) return out("INPUT_MISMATCH", false, true);
  if (status === 404) return out("NOT_FOUND", false, true);
  if (status === 402) return out("PAYMENT_UNCONFIRMED", true, false);
  if (status === 401) return out("AUTH", true, false);
  return out("TRANSPORT", true, false);
}

/** 실패 코드 → 안내 문구 키(i18n). 결제·결과는 서버가 보존하며, 재시도 가능 여부는 호출부가 retryable 로 정한다. */
export function sajuCompatFailureKey(code) {
  if (code === "REVOKED") return "sajuCompat.flow.revoked";
  if (code === "REVIEW_REQUIRED" || code === "INPUT_MISMATCH" || code === "NOT_FOUND") return "sajuCompat.flow.review";
  return "sajuCompat.flow.fallback";
}

/**
 * 생성 실행. reader.run 이 시작 POST → 이어받기 POST(최대 3회)를 한 요청 한 파트씩 돌려 준다.
 * 반환: {ok:true, snapshot, resultId} | {ok:false, code, retryable, clearPending, resultId, status}. 던지지 않는다.
 */
export async function runSajuCompatGeneration({ reader, body, post, get, wait, active = () => true, visible = () => true, persist, onProgress }) {
  let last = null;
  let snapshot = null;
  let resultId = "";
  const track = (send) => async (...args) => {
    try {
      const reply = await send(...args);
      last = reply;
      return reply;
    } catch (error) {
      last = { status: 0, payload: {}, error };
      throw error;
    }
  };
  try {
    const finished = await reader.run(body, {
      active,
      visible,
      wait,
      post: track(post),
      get: track(get),
      persist: (nextBody, id) => {
        resultId = text(id) || resultId;
        if (persist) persist(nextBody, resultId);
      },
      show: (data) => {
        if (data && data.status === "completed") snapshot = data;
        else if (onProgress) onProgress(data || {});
      },
    });
    if (finished && snapshot) return { ok: true, snapshot, resultId: text(snapshot.resultId) || resultId };
    return { ok: false, code: finished ? "EMPTY" : "INTERRUPTED", retryable: true, clearPending: false, resultId, status: Number(last?.status) || 0 };
  } catch (error) {
    return classifyFailure(last, resultId);
  }
}
