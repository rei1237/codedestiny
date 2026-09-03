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
  completeness?: string;
  authority?: string;
  /**
   * TTL 을 넘겼지만 아직 유효한 스냅샷. 'none' 은 24시간까지, 'active' 는 이용권 만료일까지.
   * 이번 판정은 그대로 쓰고 백그라운드 갱신을 예약하라는 신호다.
   */
  stale?: boolean;
  /** 월 누적 한도 잔여(coin). null 이면 "모름" — resolveVerdict 는 월 한도 검사를 건너뛴다. */
  monthlySpendRemainingCoin?: number | null;
  /** monthlySpendRemainingCoin 을 마지막으로 반영한 시각. 판정에는 쓰지 않는다(신선도 상한 없음). */
  monthlyCheckedAt?: number | null;
};

export type PassVerdictDeniedReason = "" | "subscription_snapshot_none" | "snapshot_pass_limit_exceeded" | "monthly_pass_limit_exceeded";

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
  /** cannotCover 일 때의 사유. monthly_pass_limit_exceeded 면 이용권은 있으므로 상점으로 보내지 않는다. */
  reason: PassVerdictDeniedReason;
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
  deniedReason: PassVerdictDeniedReason;
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
  REASON_MONTHLY_LIMIT: "monthly_pass_limit_exceeded";
  REASON_PASS_LIMIT: "snapshot_pass_limit_exceeded";
  REASON_NONE: "subscription_snapshot_none";
  normalizeTier(value: unknown): PassVerdictTier;
  passLimitForTier(tier: unknown): number;
  monthlyLimitForTier(tier: unknown): number;
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
  /** coin-gate 응답(200/402)의 monthlySpendRemaining 을 활성 스냅샷에만 반영한다(더 작은 값 우선). */
  storeMonthlyQuotaFromPayload(userId: string, payload: unknown): PassVerdictSnapshot | null;
  /** coin-gate 402 의 decisionReason 이 MONTHLY_PASS_LIMIT_EXCEEDED 인지 — 이용권은 있으므로 상점으로 보내지 않는다. */
  isMonthlyLimitPayload(payload: unknown): boolean;
};

export default passVerdict;
