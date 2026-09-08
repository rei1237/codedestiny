export const FEATURE_SESSION_DRAFT_VERSION = 1;

export type FeatureSessionDraft<T> = {
  version: typeof FEATURE_SESSION_DRAFT_VERSION;
  featureKey: string;
  profileId: string;
  route: string;
  savedAt: number;
  value: T;
};

type DraftScope = {
  featureKey: string;
  profileId?: string | null;
  route: string;
};

function normalizedProfileId(profileId: string | null | undefined) {
  return String(profileId || "anonymous").trim() || "anonymous";
}

function storageKey(scope: DraftScope) {
  return [
    "cd",
    "feature-draft",
    `v${FEATURE_SESSION_DRAFT_VERSION}`,
    encodeURIComponent(scope.featureKey),
    encodeURIComponent(normalizedProfileId(scope.profileId)),
    encodeURIComponent(scope.route),
  ].join(":");
}

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps an in-progress form only for the active tab. Results, payment evidence,
 * and access decisions intentionally never belong in this record.
 */
export function readFeatureSessionDraft<T>(scope: DraftScope): FeatureSessionDraft<T> | null {
  const storage = getSessionStorage();
  if (!storage || !scope.featureKey || !scope.route) return null;

  try {
    const raw = storage.getItem(storageKey(scope));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<FeatureSessionDraft<T>>;
    if (
      draft.version !== FEATURE_SESSION_DRAFT_VERSION
      || draft.featureKey !== scope.featureKey
      || draft.profileId !== normalizedProfileId(scope.profileId)
      || draft.route !== scope.route
      || !Number.isFinite(draft.savedAt)
    ) {
      return null;
    }
    return draft as FeatureSessionDraft<T>;
  } catch {
    return null;
  }
}

export function writeFeatureSessionDraft<T>(scope: DraftScope, value: T) {
  const storage = getSessionStorage();
  if (!storage || !scope.featureKey || !scope.route) return false;

  const draft: FeatureSessionDraft<T> = {
    version: FEATURE_SESSION_DRAFT_VERSION,
    featureKey: scope.featureKey,
    profileId: normalizedProfileId(scope.profileId),
    route: scope.route,
    savedAt: Date.now(),
    value,
  };

  try {
    storage.setItem(storageKey(scope), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearFeatureSessionDraft(scope: DraftScope) {
  const storage = getSessionStorage();
  if (!storage || !scope.featureKey) return false;
  try {
    storage.removeItem(storageKey(scope));
    return true;
  } catch {
    return false;
  }
}
