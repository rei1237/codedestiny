// js/core/pass-verdict.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

export type PassVerdictTier = "free" | "standard" | "premium" | "vvip" | "family";

export type PassVerdictSnapshot = {
  userId: string;
  state: "active" | "none";
  tier: PassVerdictTier;
  expiresAt: string | null;
  checkedAt: number;
  purchaseVersion: string;
  source: string;
  /**
   * TTL 을 넘겼지만 아직 유효한 스냅샷. 'none' 은 24시간까지, 'active' 는 이용권 만료일까지.
   * 이번 판정은 그대로 쓰고 백그라운드 갱신을 예약하라는 신호다.
   */
  stale?: boolean;
};

export type PassVerdict = {
  snapshot: PassVerdictSnapshot | null;
  stale: boolean;
  tier: PassVerdictTier;
  passLimit: number;
  hasActivePass: boolean;
  /** 스냅샷만으로 '이용권 커버'가 확정 — 낙관 즉시 통과 후보(서버 왕복 0). */
  coversNow: boolean;
  /** 스냅샷만으로 '미보유 또는 한도초과'가 확정 — 결제창 직행(서버 왕복 0). */
  cannotCover: boolean;
};

export type PassCoverage = {
  tier: PassVerdictTier;
  passTier: string;
  hasActivePass: boolean;
  freeLimit: number;
  passLimit: number;
  coinCost: number;
  canUseByPass: boolean;
  stale: boolean;
  source: string;
};

declare const passVerdict: {
  VERSION: number;
  KEY_PREFIX: string;
  NONE_TTL_MS: number;
  ACTIVE_TTL_MS: number;
  NONE_STALE_MAX_MS: number;
  ACTIVE_NO_EXPIRY_MAX_MS: number;
  ACTIVE_STALE_MAX_MS: number;
  normalizeTier(value: unknown): PassVerdictTier;
  passLimitForTier(tier: unknown): number;
  normalizeUserId(userId: unknown): string;
  snapshotKey(userId: unknown): string;
  normalizeDate(value: unknown): string | null;
  readSnapshot(userId: string, options?: { allowStaleNone?: boolean }): PassVerdictSnapshot | null;
  writeSnapshot(userId: string, snapshot: PassVerdictSnapshot): PassVerdictSnapshot | null;
  removeSnapshot(userId: string): void;
  buildSnapshotFromStatus(userId: string, status: unknown, source?: string): PassVerdictSnapshot;
  storeStatus(userId: string, status: unknown, source?: string): PassVerdictSnapshot | null;
  resolveVerdict(snapshot: PassVerdictSnapshot | null, coinCost: number): PassVerdict;
  coverageFromSnapshot(snapshot: PassVerdictSnapshot | null, coinCost: number, sourceLabel?: string): PassCoverage | null;
};

export default passVerdict;
