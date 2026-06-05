export type ClientAuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
  points?: number;
  monthlyCredits?: number;
  plan?: string;
  hasLocalAuth?: boolean;
  profileSubscription?: {
    tier?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    profileLimit?: number;
    membershipCreditBalance?: number;
    membershipCreditGranted?: number;
    membershipCreditUsed?: number;
  };
};

function copyString(source: Record<string, unknown>, key: keyof ClientAuthUser, target: ClientAuthUser) {
  const value = source[key as string];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      (target as Record<string, unknown>)[key as string] = trimmed;
    }
  }
}

export function sanitizeClientAuthUser(input: unknown): ClientAuthUser | null {
  if (!input || typeof input !== "object") return null;

  const source = input as Record<string, unknown>;
  const safe: ClientAuthUser = {};

  copyString(source, "id", safe);
  copyString(source, "userId", safe);
  copyString(source, "_id", safe);
  copyString(source, "uid", safe);
  copyString(source, "name", safe);
  copyString(source, "email", safe);
  copyString(source, "image", safe);
  copyString(source, "role", safe);
  copyString(source, "plan", safe);

  if (typeof source.hasLocalAuth === "boolean") {
    safe.hasLocalAuth = source.hasLocalAuth;
  }

  const points = Number(source.points);
  if (Number.isFinite(points) && points >= 0) {
    safe.points = points;
  }

  const monthlyCredits = Number(
    source.monthlyCredits
    ?? (source.profileSubscription && typeof source.profileSubscription === "object"
      ? (source.profileSubscription as Record<string, unknown>).membershipCreditBalance
      : NaN),
  );
  if (Number.isFinite(monthlyCredits) && monthlyCredits >= 0) {
    safe.monthlyCredits = monthlyCredits;
  }

  const profileSubscription = source.profileSubscription;
  if (profileSubscription && typeof profileSubscription === "object") {
    const sub = profileSubscription as Record<string, unknown>;
    safe.profileSubscription = {
      tier: typeof sub.tier === "string" ? sub.tier : "free",
      isActive: !!sub.isActive,
      expiresAt: typeof sub.expiresAt === "string" ? sub.expiresAt : null,
      profileLimit: Number.isFinite(Number(sub.profileLimit)) ? Number(sub.profileLimit) : undefined,
      membershipCreditBalance: Number.isFinite(Number(sub.membershipCreditBalance)) ? Number(sub.membershipCreditBalance) : undefined,
      membershipCreditGranted: Number.isFinite(Number(sub.membershipCreditGranted)) ? Number(sub.membershipCreditGranted) : undefined,
      membershipCreditUsed: Number.isFinite(Number(sub.membershipCreditUsed)) ? Number(sub.membershipCreditUsed) : undefined,
    };
  }

  return Object.keys(safe).length ? safe : null;
}

export function persistSanitizedAuthUser(input: unknown): ClientAuthUser | null {
  try {
    const safe = sanitizeClientAuthUser(input);
    if (!safe) {
      localStorage.removeItem("fortune_auth_user");
      return null;
    }
    localStorage.setItem("fortune_auth_user", JSON.stringify(safe));
    return safe;
  } catch (e) {
    return null;
  }
}

export function readSanitizedAuthUser(): ClientAuthUser | null {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const safe = sanitizeClientAuthUser(parsed);
    if (!safe) {
      localStorage.removeItem("fortune_auth_user");
      return null;
    }

    const normalized = JSON.stringify(safe);
    if (normalized !== raw) {
      localStorage.setItem("fortune_auth_user", normalized);
    }

    return safe;
  } catch (e) {
    return null;
  }
}

export function resolveAuthScopeFromUser(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const source = user as Record<string, unknown>;
  const scopeRaw = source.id || source.userId || source._id || source.uid || "";
  return String(scopeRaw).trim().toLowerCase();
}
