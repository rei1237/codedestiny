// 월정석(membership credit) 지급분별 lot 회계 유틸.
//
// 월정석은 지급받은 날로부터 30일간만 유효하며, 그 기간 내 미사용분은 소멸한다.
// 각 지급분(lot)은 자기 지급일 + 30일에 개별 만료하고, 차감은 FIFO(오래된 지급분 먼저)로 이뤄진다.
//
// lot 형태: { lotId, amount, remaining, grantedAt: Date, expiresAt: Date }
//  - lotId: 지급 멱등키(원장 sourceId와 동일) — 동일 lotId 재지급 방지
//  - amount: 최초 지급량, remaining: 미사용 잔량
//
// 이 모듈은 순수 함수만 노출한다(mongoose 등 의존성 없음). now/ttlMs를 주입할 수 있어 테스트가 쉽다.
// lot 배열이 신뢰 원천이고, 스칼라 membershipCreditBalance는 "미만료 lot.remaining 합계"의 파생 캐시다.

export const MONTHLY_CREDIT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일 고정 (코드베이스 관행과 통일)

function toMs(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function resolveNowMs(now) {
  const ms = toMs(now);
  return Number.isFinite(ms) ? ms : Date.now();
}

// 단일 lot을 안전한 형태로 정규화. 유효하지 않으면 null.
export function normalizeLot(lot) {
  if (!lot || typeof lot !== "object") return null;
  const amount = clampInt(lot.amount, 0, Number.MAX_SAFE_INTEGER);
  if (amount <= 0) return null;
  const hasRemaining = lot.remaining !== undefined && lot.remaining !== null;
  const remaining = hasRemaining ? clampInt(lot.remaining, 0, amount) : amount;
  const grantedMs = toMs(lot.grantedAt);
  const grantedAt = Number.isFinite(grantedMs) ? new Date(grantedMs) : null;
  const expiresMs = toMs(lot.expiresAt);
  const expiresAt = Number.isFinite(expiresMs)
    ? new Date(expiresMs)
    : (grantedAt ? new Date(grantedAt.getTime() + MONTHLY_CREDIT_TTL_MS) : null);
  return {
    lotId: String(lot.lotId || "").trim(),
    amount,
    remaining,
    grantedAt,
    expiresAt,
  };
}

// FIFO 정렬(지급일 오름차순 → 만료일 → lotId).
function compareLotsFifo(a, b) {
  const ga = a.grantedAt ? a.grantedAt.getTime() : 0;
  const gb = b.grantedAt ? b.grantedAt.getTime() : 0;
  if (ga !== gb) return ga - gb;
  const ea = a.expiresAt ? a.expiresAt.getTime() : 0;
  const eb = b.expiresAt ? b.expiresAt.getTime() : 0;
  if (ea !== eb) return ea - eb;
  return String(a.lotId).localeCompare(String(b.lotId));
}

// lot 배열을 활성/만료로 분류하고 잔액을 합산한다.
//  - activeLots: 미만료 & remaining>0 (FIFO 정렬)
//  - expiredLots: 만료 & remaining>0 (소멸 원장 기록 대상)
//  - remaining<=0 lot은 버린다.
export function normalizeLots(lots, now) {
  const nowAt = resolveNowMs(now);
  const normalized = (Array.isArray(lots) ? lots : [])
    .map(normalizeLot)
    .filter(Boolean)
    .sort(compareLotsFifo);
  const activeLots = [];
  const expiredLots = [];
  let activeBalance = 0;
  let expiredBalance = 0;
  for (const lot of normalized) {
    if (lot.remaining <= 0) continue;
    const expiresMs = lot.expiresAt ? lot.expiresAt.getTime() : NaN;
    const isExpired = Number.isFinite(expiresMs) && expiresMs <= nowAt;
    if (isExpired) {
      expiredLots.push(lot);
      expiredBalance += lot.remaining;
    } else {
      activeLots.push(lot);
      activeBalance += lot.remaining;
    }
  }
  return { activeLots, expiredLots, activeBalance, expiredBalance };
}

// 현재 유효한(미만료) 월정석 잔액 합계.
export function sumActiveBalance(lots, now) {
  return normalizeLots(lots, now).activeBalance;
}

// 저장할 lot 배열: 활성 lot + (아직 소멸 원장에 기록 안 된) 만료 lot을 보존한다.
// 만료 lot의 물리적 제거·원장 기록은 크론 스윕이 담당하므로, 일반 mutation은 만료 lot을 남겨둔다.
function mergeForStorage(activeLots, expiredLots) {
  return [...activeLots, ...expiredLots].map((lot) => ({
    lotId: lot.lotId,
    amount: lot.amount,
    remaining: lot.remaining,
    grantedAt: lot.grantedAt,
    expiresAt: lot.expiresAt,
  }));
}

// 신규 지급분(lot)을 추가한다. 동일 lotId가 이미 있으면 멱등적으로 무시.
// 반환: { lots(저장용 배열), balance(미만료 합계), added, lot(추가된 lot|null) }
export function applyGrantLot(existingLots, { lotId, amount, grantedAt, ttlMs, now } = {}) {
  const { activeLots, expiredLots, activeBalance } = normalizeLots(existingLots, now);
  const grantAmount = clampInt(amount, 0, Number.MAX_SAFE_INTEGER);
  const id = String(lotId || "").trim();

  if (grantAmount <= 0) {
    return { lots: mergeForStorage(activeLots, expiredLots), balance: activeBalance, added: false, lot: null };
  }
  // 멱등: 동일 lotId가 활성/만료 어디든 있으면 재지급하지 않는다.
  if (id && [...activeLots, ...expiredLots].some((lot) => lot.lotId === id)) {
    return { lots: mergeForStorage(activeLots, expiredLots), balance: activeBalance, added: false, lot: null };
  }

  const grantedMs = toMs(grantedAt);
  const grantedDate = Number.isFinite(grantedMs) ? new Date(grantedMs) : new Date(resolveNowMs(now));
  const ttl = Number.isFinite(Number(ttlMs)) && Number(ttlMs) > 0 ? Number(ttlMs) : MONTHLY_CREDIT_TTL_MS;
  const newLot = {
    lotId: id,
    amount: grantAmount,
    remaining: grantAmount,
    grantedAt: grantedDate,
    expiresAt: new Date(grantedDate.getTime() + ttl),
  };
  const merged = mergeForStorage([...activeLots, newLot], expiredLots);
  return { lots: merged, balance: activeBalance + grantAmount, added: true, lot: newLot };
}

// 미만료 lot에서 required만큼 FIFO 차감한다. 유효 잔액이 부족하면 ok:false(차감 안 함).
// 반환: { ok, lots(저장용), balance(차감 후 미만료 합계), allocation, deducted, shortfall }
export function deductLotsFIFO(existingLots, required, now) {
  const need = clampInt(required, 0, Number.MAX_SAFE_INTEGER);
  const { activeLots, expiredLots, activeBalance } = normalizeLots(existingLots, now);

  if (need <= 0) {
    return { ok: true, lots: mergeForStorage(activeLots, expiredLots), balance: activeBalance, allocation: [], deducted: 0, shortfall: 0 };
  }
  if (activeBalance < need) {
    return { ok: false, lots: mergeForStorage(activeLots, expiredLots), balance: activeBalance, allocation: [], deducted: 0, shortfall: need - activeBalance };
  }

  let remainingNeed = need;
  const allocation = [];
  const nextActive = [];
  for (const lot of activeLots) {
    if (remainingNeed <= 0) {
      nextActive.push(lot);
      continue;
    }
    const take = Math.min(lot.remaining, remainingNeed);
    if (take <= 0) {
      nextActive.push(lot);
      continue;
    }
    allocation.push({ lotId: lot.lotId, taken: take });
    remainingNeed -= take;
    const left = lot.remaining - take;
    if (left > 0) nextActive.push({ ...lot, remaining: left });
    // left === 0 → 소진된 lot은 버린다.
  }
  const balance = nextActive.reduce((sum, lot) => sum + lot.remaining, 0);
  return {
    ok: true,
    lots: mergeForStorage(nextActive, expiredLots),
    balance,
    allocation,
    deducted: need - remainingNeed,
    shortfall: 0,
  };
}

// 지연 백필: lot이 비어 있는데 스칼라 잔액이 남아 있는(마이그레이션 이전) 유저를 위해
// 롤아웃 시점 기준 신규 30일 창의 단일 lot을 합성한다. lot이 이미 있으면 그대로 반환.
// 반환: { lots, balance, backfilled }
export function ensureLotsForBalance(profileSubscription = {}, now) {
  const existing = Array.isArray(profileSubscription.membershipCreditLots)
    ? profileSubscription.membershipCreditLots
    : [];
  if (existing.length > 0) {
    const { activeLots, expiredLots, activeBalance } = normalizeLots(existing, now);
    return { lots: mergeForStorage(activeLots, expiredLots), balance: activeBalance, backfilled: false };
  }
  const scalarBalance = clampInt(profileSubscription.membershipCreditBalance, 0, Number.MAX_SAFE_INTEGER);
  if (scalarBalance <= 0) {
    return { lots: [], balance: 0, backfilled: false };
  }
  const nowAt = resolveNowMs(now);
  const result = applyGrantLot([], {
    lotId: `backfill:${nowAt}`,
    amount: scalarBalance,
    grantedAt: new Date(nowAt),
    now: nowAt,
  });
  return { lots: result.lots, balance: result.balance, backfilled: true };
}

// 가장 임박한 미만료 lot의 만료일(ISO 문자열) — 프론트 "소멸 예정일" 표시용. 없으면 null.
export function resolveNextExpiry(lots, now) {
  const { activeLots } = normalizeLots(lots, now);
  let earliest = null;
  for (const lot of activeLots) {
    if (!lot.expiresAt) continue;
    if (!earliest || lot.expiresAt.getTime() < earliest.getTime()) earliest = lot.expiresAt;
  }
  return earliest ? earliest.toISOString() : null;
}
