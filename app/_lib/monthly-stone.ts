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
