export type PaidAttemptPaymentStatus = "pending" | "paid" | "failed";
export type PaidAttemptGenerationStatus = "idle" | "generating" | "completed" | "failed";

export type PaidAttemptSession = {
  attemptId: string;
  featureKey: string;
  mode?: string;
  route: string;
  paymentStatus: PaidAttemptPaymentStatus;
  generationStatus: PaidAttemptGenerationStatus;
  createdAt: string;
  expiresAt: string;
  lastUpdatedAt: string;
};

type PaidAttemptEventName =
  | "PaidAttempt.Start"
  | "PaidAttempt.PaymentRequested"
  | "PaidAttempt.PaymentSucceeded"
  | "PaidAttempt.CallbackReturned"
  | "PaidAttempt.ProcessingMounted"
  | "PaidAttempt.GenerationStarted"
  | "PaidAttempt.GenerationCompleted"
  | "PaidAttempt.ResultRendered"
  | "PaidAttempt.ReloadPrevented"
  | "PaidAttempt.RedirectBlocked"
  | "PaidAttempt.AuthHydrating"
  | "PaidAttempt.RestoreAttempted"
  | "PaidAttempt.RestoreFailed";

type EventPayload = {
  route?: string;
  featureKey?: string;
  attemptId?: string;
  paymentStatus?: PaidAttemptPaymentStatus;
  generationStatus?: PaidAttemptGenerationStatus;
  reason?: string;
  ts?: string;
};

const ATTEMPT_STORAGE_KEY = "cd:paid-attempt:active:v1";
const ATTEMPT_URL_PARAM = "attemptId";
const DEFAULT_ATTEMPT_TTL_MINUTES = 120;
const PAID_IDLE_GRACE_MS = 120_000;

function nowIso() {
  return new Date().toISOString();
}

function addMinutesToIso(baseIso: string, minutes: number) {
  const base = Date.parse(baseIso);
  const next = Number.isFinite(base)
    ? base + Math.max(1, minutes) * 60_000
    : Date.now() + Math.max(1, minutes) * 60_000;
  return new Date(next).toISOString();
}

function getCurrentRoute() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname || ""}${window.location.search || ""}`;
}

function readStorage(storage: Storage | undefined): string {
  if (!storage) return "";
  try {
    return String(storage.getItem(ATTEMPT_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

function parseAttempt(raw: string): PaidAttemptSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PaidAttemptSession>;
    const attemptId = String(parsed.attemptId || "").trim();
    const featureKey = String(parsed.featureKey || "").trim();
    const paymentStatus = String(parsed.paymentStatus || "pending") as PaidAttemptPaymentStatus;
    const generationStatus = String(parsed.generationStatus || "idle") as PaidAttemptGenerationStatus;
    const createdAt = String(parsed.createdAt || "").trim();
    const expiresAt = String(parsed.expiresAt || "").trim();
    const route = String(parsed.route || "").trim();
    if (!attemptId || !featureKey || !createdAt || !expiresAt) return null;
    return {
      attemptId,
      featureKey,
      mode: String(parsed.mode || "").trim() || undefined,
      route,
      paymentStatus,
      generationStatus,
      createdAt,
      expiresAt,
      lastUpdatedAt: String(parsed.lastUpdatedAt || createdAt),
    };
  } catch {
    return null;
  }
}

function writeAttempt(session: PaidAttemptSession | null) {
  if (typeof window === "undefined") return;
  const value = session ? JSON.stringify(session) : "";
  const stores: Array<Storage | undefined> = [window.sessionStorage, window.localStorage];
  stores.forEach((storage) => {
    if (!storage) return;
    try {
      if (!value) {
        storage.removeItem(ATTEMPT_STORAGE_KEY);
      } else {
        storage.setItem(ATTEMPT_STORAGE_KEY, value);
      }
    } catch {
      // ignore storage errors
    }
  });
}

function isExpired(session: PaidAttemptSession) {
  return Date.parse(session.expiresAt) <= Date.now();
}

function writeAttemptToWindow(session: PaidAttemptSession | null) {
  if (typeof window === "undefined") return;
  const lastUpdated = Date.parse(String(session?.lastUpdatedAt || session?.createdAt || ""));
  const withinGrace = Number.isFinite(lastUpdated)
    ? Date.now() - lastUpdated <= PAID_IDLE_GRACE_MS
    : false;
  const isPaidIdle = Boolean(
    session
    && session.paymentStatus === "paid"
    && session.generationStatus === "idle",
  );
  const active = Boolean(
    session
      && (
        session.paymentStatus === "pending"
        || (session.paymentStatus === "paid" && session.generationStatus === "generating")
        || (isPaidIdle && withinGrace)
      )
      && session.generationStatus !== "completed"
      && session.generationStatus !== "failed",
  );
  const runtimeWindow = window as unknown as Record<string, unknown>;
  runtimeWindow.__CD_PAID_ATTEMPT__ = session;
  runtimeWindow.__CD_PAID_ATTEMPT_ACTIVE__ = active;
}

export function logPaidAttemptEvent(name: PaidAttemptEventName, payload: EventPayload = {}) {
  try {
    const safePayload = {
      route: payload.route || getCurrentRoute(),
      featureKey: payload.featureKey || "",
      attemptId: payload.attemptId || "",
      paymentStatus: payload.paymentStatus,
      generationStatus: payload.generationStatus,
      reason: payload.reason || "",
      ts: payload.ts || nowIso(),
    };
    console.info(name, safePayload);
  } catch {
    // ignore logging errors
  }
}

export function getActivePaidAttemptSession(): PaidAttemptSession | null {
  if (typeof window === "undefined") return null;

  const fromSession = parseAttempt(readStorage(window.sessionStorage));
  const fromLocal = parseAttempt(readStorage(window.localStorage));

  const pickNewest = [fromSession, fromLocal]
    .filter((item): item is PaidAttemptSession => Boolean(item))
    .sort((a, b) => Date.parse(b.lastUpdatedAt || b.createdAt) - Date.parse(a.lastUpdatedAt || a.createdAt))[0] || null;

  if (!pickNewest) {
    writeAttemptToWindow(null);
    return null;
  }

  if (isExpired(pickNewest)) {
    writeAttempt(null);
    writeAttemptToWindow(null);
    return null;
  }

  writeAttemptToWindow(pickNewest);
  return pickNewest;
}

export function getPaidAttemptIdFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const current = new URL(window.location.href);
    return String(current.searchParams.get(ATTEMPT_URL_PARAM) || "").trim();
  } catch {
    return "";
  }
}

function setAttemptIdOnUrl(attemptId: string) {
  if (typeof window === "undefined" || !attemptId) return;
  try {
    const current = new URL(window.location.href);
    if (String(current.searchParams.get(ATTEMPT_URL_PARAM) || "") === attemptId) return;
    current.searchParams.set(ATTEMPT_URL_PARAM, attemptId);
    window.history.replaceState(window.history.state, "", current.toString());
  } catch {
    // ignore URL mutation errors
  }
}

export function restorePaidAttemptFromUrlOrStorage() {
  const active = getActivePaidAttemptSession();
  if (!active) {
    logPaidAttemptEvent("PaidAttempt.RestoreFailed", { reason: "missing_active_attempt" });
    return null;
  }
  logPaidAttemptEvent("PaidAttempt.RestoreAttempted", {
    attemptId: active.attemptId,
    featureKey: active.featureKey,
    paymentStatus: active.paymentStatus,
    generationStatus: active.generationStatus,
  });
  const attemptIdFromUrl = getPaidAttemptIdFromUrl();
  if (!attemptIdFromUrl) {
    setAttemptIdOnUrl(active.attemptId);
  }
  return active;
}

export function beginPaidAttempt(input: {
  featureKey: string;
  mode?: string;
  route?: string;
  ttlMinutes?: number;
}): PaidAttemptSession {
  const createdAt = nowIso();
  const attemptId = `pa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const session: PaidAttemptSession = {
    attemptId,
    featureKey: String(input.featureKey || "").trim() || "unknown_feature",
    mode: String(input.mode || "").trim() || undefined,
    route: String(input.route || getCurrentRoute()),
    paymentStatus: "pending",
    generationStatus: "idle",
    createdAt,
    expiresAt: addMinutesToIso(createdAt, Number(input.ttlMinutes || DEFAULT_ATTEMPT_TTL_MINUTES)),
    lastUpdatedAt: createdAt,
  };
  writeAttempt(session);
  writeAttemptToWindow(session);
  setAttemptIdOnUrl(session.attemptId);
  logPaidAttemptEvent("PaidAttempt.Start", {
    attemptId: session.attemptId,
    featureKey: session.featureKey,
    paymentStatus: session.paymentStatus,
    generationStatus: session.generationStatus,
  });
  return session;
}

export function patchActivePaidAttempt(
  patch: Partial<Pick<PaidAttemptSession, "paymentStatus" | "generationStatus" | "route" | "mode">>,
) {
  const current = getActivePaidAttemptSession();
  if (!current) return null;
  const next: PaidAttemptSession = {
    ...current,
    ...patch,
    route: String(patch.route || current.route || getCurrentRoute()),
    lastUpdatedAt: nowIso(),
  };
  writeAttempt(next);
  writeAttemptToWindow(next);
  setAttemptIdOnUrl(next.attemptId);
  return next;
}

export function markPaidAttemptPaymentRequested() {
  const next = patchActivePaidAttempt({ paymentStatus: "pending" });
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.PaymentRequested", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
  });
}

export function markPaidAttemptPaymentSucceeded() {
  const next = patchActivePaidAttempt({ paymentStatus: "paid" });
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.PaymentSucceeded", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
  });
}

export function markPaidAttemptCallbackReturned() {
  const next = getActivePaidAttemptSession();
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.CallbackReturned", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
  });
}

export function markPaidAttemptGenerationStarted(reason = "") {
  const next = patchActivePaidAttempt({ generationStatus: "generating" });
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.GenerationStarted", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
    reason,
  });
}

export function markPaidAttemptGenerationCompleted() {
  const next = patchActivePaidAttempt({ generationStatus: "completed" });
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.GenerationCompleted", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
  });
}

export function markPaidAttemptResultRendered() {
  const next = getActivePaidAttemptSession();
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.ResultRendered", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
  });
}

export function markPaidAttemptFailed(reason = "") {
  const next = patchActivePaidAttempt({ paymentStatus: "failed", generationStatus: "failed" });
  if (!next) return;
  logPaidAttemptEvent("PaidAttempt.RestoreFailed", {
    attemptId: next.attemptId,
    featureKey: next.featureKey,
    paymentStatus: next.paymentStatus,
    generationStatus: next.generationStatus,
    reason,
  });
}

export function clearPaidAttemptSession() {
  writeAttempt(null);
  writeAttemptToWindow(null);
}

export function isPaidAttemptInProgress() {
  const active = getActivePaidAttemptSession();
  if (!active) return false;
  const lastUpdated = Date.parse(active.lastUpdatedAt || active.createdAt);
  const withinGrace = Number.isFinite(lastUpdated)
    ? Date.now() - lastUpdated <= PAID_IDLE_GRACE_MS
    : false;

  const isPaidIdle = active.paymentStatus === "paid" && active.generationStatus === "idle";
  const inProgress = active.paymentStatus === "pending"
    || (active.paymentStatus === "paid" && active.generationStatus === "generating")
    || (isPaidIdle && withinGrace);
  return inProgress;
}
