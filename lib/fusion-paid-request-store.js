/**
 * 초융합 운세(30,000원)의 **결제 증빙 보관소**.
 *
 * 🔴 2026-09-03 사고: 결제 증빙 id 만 sessionStorage 에 있었고 **그때 보낸 입력은 어디에도
 *    없었다.** 생성이 멈춘 화면에서 사용자가 새로고침하면 폼은 초기값으로 돌아가는데
 *    requestId 는 살아 있으므로, 재시도가 "같은 결제 · 다른 질문"으로 나갔다. 특히
 *    birthPlaceKey 가 비면 birthPlace 가 payload 에서 **조용히 빠져** 출생지 미상 입력이 되고,
 *    그 조합이 곧바로 배달 실패로 이어졌다(사용자가 본 birth_place_overclaim).
 *
 * 그래서 여기서 보관하는 것은 id 가 아니라 **{ requestId, body }** 한 쌍이다. 재시도는 폼을
 * 다시 읽지 않고 이 body 를 그대로 보낸다 — 결제 한 건에 대응하는 질문은 하나뿐이다.
 *
 * 🔴 이 파일은 화면(app/fusion-fortune/FusionFortuneClient.tsx)과 검증기
 *    (scripts/verify-fusion-fortune-retry-payload.mjs)가 **같은 코드**를 쓰라고 분리한 것이다.
 *    .tsx 는 node 가 직접 import 할 수 없어서, 로직이 화면 안에 있으면 가드가 복사본을 재게 된다.
 */

/** 새 보관 키. 값은 JSON `{ requestId, body, savedAt }`. */
export const FUSION_PAID_REQUEST_KEY = "cdFusionPaidRequestV1";
/** 구 보관 키(id 문자열 하나, sessionStorage). 읽을 때 1회 흡수하고 지운다. */
export const FUSION_PAID_REQUEST_LEGACY_KEY = "cdFusionPaidRequestIdV1";
/**
 * 보관 기간. 결제는 소진되기 전까지 유효하지만, 하루가 지나도록 결과를 못 받은 요청은
 * 화면이 아니라 문의로 풀어야 한다 — 그 이상 붙들면 오래된 질문이 새 상담을 덮어쓴다.
 */
export const FUSION_PAID_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

function safeGet(storage, key) {
  try { return storage?.getItem?.(key) || ""; } catch { return ""; }
}

function safeSet(storage, key, value) {
  // 저장에 실패해도(시크릿 창·용량 초과) 이번 화면의 ref 는 그대로 동작한다 —
  // 새로고침 복구만 못 할 뿐이라, 여기서 던지면 멀쩡한 생성까지 죽는다.
  try { storage?.setItem?.(key, value); } catch { /* noop */ }
}

function safeRemove(storage, key) {
  try { storage?.removeItem?.(key); } catch { /* noop */ }
}

function resolveStores(stores) {
  if (stores && (stores.local || stores.session)) return stores;
  if (typeof window === "undefined") return { local: null, session: null };
  try { return { local: window.localStorage, session: window.sessionStorage }; } catch { return { local: null, session: null }; }
}

/** 저장 가능한 순수 객체만 통과시킨다 — 배열·null·원시값은 body 로 취급하지 않는다. */
function normalizeBody(body) {
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}

/**
 * 보관된 결제 요청을 읽는다. 없으면 null.
 *
 * 만료·손상된 기록은 **읽는 김에 지운다**. 남겨 두면 다음 제출이 죽은 id 로 증빙을 찾다가
 * 결제도 생성도 못 하는 상태에 갇힌다.
 */
export function readFusionPaidRequest(options = {}) {
  const { now = Date.now(), ...stores } = options;
  const { local, session } = resolveStores(stores);

  const raw = safeGet(local, FUSION_PAID_REQUEST_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const requestId = typeof parsed?.requestId === "string" ? parsed.requestId : "";
      const savedAt = Number(parsed?.savedAt);
      if (requestId && Number.isFinite(savedAt) && now - savedAt >= 0 && now - savedAt <= FUSION_PAID_REQUEST_TTL_MS) {
        return { requestId, body: normalizeBody(parsed.body), savedAt };
      }
    } catch { /* 손상된 JSON 은 아래에서 지운다 */ }
    safeRemove(local, FUSION_PAID_REQUEST_KEY);
  }

  // 구 키 흡수 — 배포 직전에 결제만 끝낸 사용자를 버리지 않는다. 본문은 없으므로 body 는
  // null 이고, 그 경우 화면은 지금 폼 값으로 보낸다(예전과 같은 동작).
  const legacyId = safeGet(session, FUSION_PAID_REQUEST_LEGACY_KEY);
  if (!legacyId) return null;
  safeRemove(session, FUSION_PAID_REQUEST_LEGACY_KEY);
  const migrated = { requestId: legacyId, body: null, savedAt: now };
  safeSet(local, FUSION_PAID_REQUEST_KEY, JSON.stringify(migrated));
  return migrated;
}

/**
 * 결제 요청을 보관한다. 🔴 첫 스트림 POST **직전**에 부른다 — 요청이 나간 뒤에 저장하면
 * 그 사이에 탭이 닫힌 결제가 통째로 사라진다.
 */
export function writeFusionPaidRequest({ requestId, body } = {}, options = {}) {
  const { now = Date.now(), ...stores } = options;
  const { local } = resolveStores(stores);
  if (!requestId) return null;
  const record = { requestId: String(requestId), body: normalizeBody(body), savedAt: now };
  safeSet(local, FUSION_PAID_REQUEST_KEY, JSON.stringify(record));
  return record;
}

/** 결과를 실제로 받은 뒤에만 부른다. 구 키까지 함께 지워 흡수가 되살아나지 않게 한다. */
export function clearFusionPaidRequest(options = {}) {
  const { local, session } = resolveStores(options);
  safeRemove(local, FUSION_PAID_REQUEST_KEY);
  safeRemove(session, FUSION_PAID_REQUEST_LEGACY_KEY);
}
