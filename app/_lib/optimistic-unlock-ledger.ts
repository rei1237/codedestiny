"use client";

/**
 * 잠금 해제 공용 원장.
 *
 * 정적 셸(index.html)이 결제 성공 시 기록하는 localStorage 원장과 **같은 키·같은 스키마**를 읽고 쓴다.
 * 셸에서 산 해금이 React 페이지에서 즉시 보이고, 그 반대도 성립하게 하는 것이 목적이다.
 * 서버 스냅샷(/api/billing/balance)이 진실 원천이라는 사실은 그대로다 — 원장은 결제 성공과
 * 서버 반영 사이의 공백에서만 "해금됨" 쪽으로 기울인다.
 *
 * 스키마(셸 정본: index.html `_cdRecordVerifiedUnlockGrant`):
 *   { "<featureKey>::<profileId>": { featureKey, profileId, requestId, mode?, ts } }
 * mode === "optimistic" 인 엔트리는 짧게(10분), 서버 확정 엔트리는 길게(72시간) 유효하다.
 */

const STORAGE_KEY = "cd_verified_unlock_grants_v1";
const LEGACY_VERIFIED_TTL_MS = 72 * 60 * 60 * 1000;
const OPTIMISTIC_TTL_MS = 10 * 60 * 1000;

type GrantEntry = {
  featureKey?: string;
  profileId?: string;
  requestId?: string;
  mode?: string;
  grantType?: string;
  status?: string;
  ts?: number;
};

function readGrantMap(): Record<string, GrantEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const next: Record<string, GrantEntry> = {};
    for (const mapKey of Object.keys(parsed)) {
      const entry = parsed[mapKey] as GrantEntry;
      if (!entry || typeof entry !== "object") continue;
      const ttl = entry.mode === "optimistic" ? OPTIMISTIC_TTL_MS : LEGACY_VERIFIED_TTL_MS;
      if (entry.mode !== "confirmed" && now - Number(entry.ts || 0) > ttl) continue;
      next[mapKey] = entry;
    }
    return next;
  } catch {
    return {};
  }
}

/** 아직 유효한 원장 엔트리의 featureKey 목록. */
export function readLedgerUnlockKeys(): string[] {
  const map = readGrantMap();
  const keys: string[] = [];
  for (const mapKey of Object.keys(map)) {
    const featureKey = String(map[mapKey]?.featureKey || "").trim();
    if (featureKey && !keys.includes(featureKey)) keys.push(featureKey);
  }
  return keys;
}

export function hasLedgerUnlock(featureKey: string): boolean {
  const key = String(featureKey || "").trim();
  if (!key) return false;
  return readLedgerUnlockKeys().includes(key);
}

/**
 * 결제 성공 직후 호출한다. 이미 서버 확정 엔트리가 있으면 TTL을 줄이지 않기 위해 건드리지 않는다.
 * 프로필 스코프는 비워 둔다 — 셸은 `<key>::` 형태를 프로필 무관 해금으로 읽는다.
 */
export function recordOptimisticUnlock(featureKey: string): void {
  const key = String(featureKey || "").trim();
  if (!key || typeof window === "undefined") return;
  try {
    const map = readGrantMap();
    const existing = map[`${key}::`];
    if (!existing || existing.mode === "optimistic") {
      map[`${key}::`] = { featureKey: key, profileId: "", requestId: "", mode: "optimistic", ts: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    /* localStorage 불가 환경에서는 서버 스냅샷만으로 동작한다 */
  }
  try {
    window.dispatchEvent(new CustomEvent("cd:unlocks-changed"));
  } catch {
    /* noop */
  }
}

/** 서버가 해금을 확정했을 때 호출한다. 낙관 엔트리를 확정 엔트리로 승격해 다음 방문에서도 즉시 열린다. */
export function recordVerifiedUnlock(featureKey: string, grant?: Record<string, unknown>): void {
  const key = String(featureKey || "").trim();
  if (!key || typeof window === "undefined") return;
  try {
    const map = readGrantMap();
    const existing = map[`${key}::`];
    const confirmed = String(grant?.grantType || "").toLowerCase() === "permanent_unlock"
      && String(grant?.status || "").toLowerCase() === "active";
    if (existing && existing.mode === "confirmed") return;
    map[`${key}::`] = {
      featureKey: key,
      profileId: String(grant?.profileId || ""),
      requestId: String(grant?.id || ""),
      mode: confirmed ? "confirmed" : "legacy_verified",
      grantType: confirmed ? "permanent_unlock" : "",
      status: confirmed ? "active" : "",
      ts: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
  try {
    const store = (window as Window & {
      CodeDestinyAccessStore?: { markConfirmedUnlocked?: (key: string, profileId?: string, metadata?: Record<string, unknown>) => boolean };
    }).CodeDestinyAccessStore;
    if (String(grant?.grantType || "").toLowerCase() === "permanent_unlock") {
      store?.markConfirmedUnlocked?.(key, String(grant?.profileId || ""), grant);
    }
  } catch {
    /* compatibility storage remains available */
  }
}

function collectPermanentGrants(source: unknown, out: Record<string, Record<string, unknown>>): void {
  if (!source || typeof source !== "object") return;
  const record = source as Record<string, unknown>;
  const accessGrant = record.accessGrant as Record<string, unknown> | undefined;
  const candidates = [record.unlockGrant, accessGrant?.unlockGrant];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const grant = candidate as Record<string, unknown>;
    const featureKey = String(grant.featureKey || "").trim();
    if (featureKey && String(grant.grantType || "").toLowerCase() === "permanent_unlock"
      && String(grant.status || "").toLowerCase() === "active") out[featureKey] = grant;
  }
}

function collectPayloadUnlockKeys(source: unknown, out: string[]): void {
  if (!source || typeof source !== "object") return;
  const record = source as Record<string, unknown>;
  const lists = [record.unlockedFeatures, (record.user as Record<string, unknown> | undefined)?.unlockedFeatures];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const key = String(value || "").trim();
      // 서버가 코인 차감 표식으로 쓰는 합성 키라 해금 대상이 아니다(셸 _cdApplyUnlocksFromPaymentPayload 와 동일 규칙).
      if (key && key !== "pig-coin-unlock" && !out.includes(key)) out.push(key);
    }
  }
  const unlockMap = record.unlockMap;
  if (unlockMap && typeof unlockMap === "object") {
    for (const [key, value] of Object.entries(unlockMap as Record<string, unknown>)) {
      const trimmed = String(key || "").trim();
      if (value === true && trimmed && trimmed !== "pig-coin-unlock" && !out.includes(trimmed)) out.push(trimmed);
    }
  }
}

/**
 * 결제 응답이 스스로 "해금됨"이라고 선언한 키만 원장에 확정 기록한다.
 * 요청한 featureKey 를 무조건 기록하지 않는 이유는, 같은 경로로 회당 결제(per-use)도 지나가기 때문이다 —
 * 회당 결제를 영구 해금으로 남기면 다음 이용이 공짜가 되어 버린다.
 */
export function recordUnlocksFromPaymentPayload(payload: unknown): string[] {
  if (!payload || typeof payload === "string") return [];
  const keys: string[] = [];
  const permanentGrants: Record<string, Record<string, unknown>> = {};
  collectPermanentGrants(payload, permanentGrants);
  collectPermanentGrants((payload as Record<string, unknown>).data, permanentGrants);
  collectPayloadUnlockKeys(payload, keys);
  collectPayloadUnlockKeys((payload as Record<string, unknown>).data, keys);
  collectPayloadUnlockKeys((payload as Record<string, unknown>).consume, keys);
  const data = (payload as Record<string, unknown>).data;
  if (data && typeof data === "object") collectPayloadUnlockKeys((data as Record<string, unknown>).consume, keys);
  for (const key of Object.keys(permanentGrants)) {
    if (!keys.includes(key)) keys.push(key);
  }
  if (!keys.length) return [];
  for (const key of keys) recordVerifiedUnlock(key, permanentGrants[key]);
  try {
    window.dispatchEvent(new CustomEvent("cd:unlocks-changed"));
  } catch {
    /* noop */
  }
  return keys;
}
