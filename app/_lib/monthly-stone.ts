export function normalizeMonthlyStoneBalance(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return Math.floor(numberValue);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function resolveMonthlyStoneBalance(...sources: unknown[]): number | null {
  for (const source of sources) {
    const record = asRecord(source);
    if (!record) {
      const direct = normalizeMonthlyStoneBalance(source);
      if (direct !== null) return direct;
      continue;
    }

    const data = asRecord(record.data);
    const consume = asRecord(record.consume);
    const membership = asRecord(record.membership);
    const user = asRecord(record.user);
    const profileSubscription = asRecord(record.profileSubscription) || asRecord(user?.profileSubscription);
    const paymentOptions = asRecord(record.paymentOptions);

    const candidates = [
      record.monthlyStoneBalance,
      data?.monthlyStoneBalance,
      consume?.monthlyStoneBalance,
      membership?.monthlyStoneBalance,
      user?.monthlyStoneBalance,
      profileSubscription?.monthlyStoneBalance,
      consume?.remainingMembershipCredit,
      record.remainingMembershipCredit,
      data?.remainingMembershipCredit,
      record.monthlyCredits,
      data?.monthlyCredits,
      consume?.monthlyCredits,
      membership?.monthlyCredits,
      user?.monthlyCredits,
      profileSubscription?.monthlyCredits,
      record.monthlyBalance,
      data?.monthlyBalance,
      paymentOptions?.monthlyBalance,
      membership?.monthlyBalance,
      profileSubscription?.monthlyBalance,
      record.membershipCreditBalance,
      data?.membershipCreditBalance,
      consume?.membershipCreditBalance,
      membership?.membershipCreditBalance,
      user?.membershipCreditBalance,
      profileSubscription?.membershipCreditBalance,
    ];

    for (const candidate of candidates) {
      const resolved = normalizeMonthlyStoneBalance(candidate);
      if (resolved !== null) return resolved;
    }
  }

  return null;
}

export function assignMonthlyStoneBalance(target: Record<string, unknown>, balance: unknown) {
  const monthlyStoneBalance = normalizeMonthlyStoneBalance(balance);
  if (monthlyStoneBalance === null) return null;
  target.monthlyStoneBalance = monthlyStoneBalance;
  return monthlyStoneBalance;
}

function asIsoString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? value : null;
}

// 서버가 내려준 "가장 이른 소멸 예정일"(monthlyStoneExpiresAt, ISO 문자열)을 여러 응답 형태에서 추출.
export function resolveMonthlyStoneExpiresAt(...sources: unknown[]): string | null {
  for (const source of sources) {
    const record = asRecord(source);
    if (!record) continue;
    const data = asRecord(record.data);
    const membership = asRecord(record.membership);
    const user = asRecord(record.user);
    const profileSubscription = asRecord(record.profileSubscription) || asRecord(user?.profileSubscription);
    const candidates = [
      record.monthlyStoneExpiresAt,
      data?.monthlyStoneExpiresAt,
      membership?.monthlyStoneExpiresAt,
      profileSubscription?.monthlyStoneExpiresAt,
      user?.monthlyStoneExpiresAt,
    ];
    for (const candidate of candidates) {
      const iso = asIsoString(candidate);
      if (iso) return iso;
    }
  }
  return null;
}

// 소멸까지 남은 시간 요약(가장 이른 소멸 기준). 만료됐거나 값 없으면 null(표시 안 함).
export function formatMonthlyStoneExpiry(expiresAt: unknown, nowMs?: number): string | null {
  const iso = asIsoString(expiresAt);
  if (!iso) return null;
  const now = Number.isFinite(nowMs) ? (nowMs as number) : Date.now();
  const diff = Date.parse(iso) - now;
  if (diff <= 0) return null;
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  const days = Math.floor(diff / DAY);
  if (days >= 1) return `소멸까지 약 ${days}일 남음`;
  const hours = Math.floor(diff / HOUR);
  if (hours >= 1) return `소멸까지 약 ${hours}시간 남음`;
  return "곧 소멸돼요";
}
