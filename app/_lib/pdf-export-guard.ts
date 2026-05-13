"use client";

type RuntimeWindow = Window & {
  __CD_PDF_EXPORT_IN_PROGRESS__?: boolean;
  __CD_PDF_EXPORT_ACTIVE_COUNT__?: number;
  __CD_PDF_FETCH_GUARD_INSTALLED__?: boolean;
};

function dispatchCriticalState() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("cd:critical-operation-state", {
        detail: {
          isPdfExportInProgress: isPdfExportInProgress(),
        },
      }),
    );
  } catch {
    // ignore dispatch errors
  }
}

function syncBusyDataset(active: boolean) {
  if (typeof document === "undefined" || !document.body) return;

  if (active) {
    document.body.dataset.cdVersionGuardBusy = "1";
    return;
  }

  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.__CD_PAYMENT_PROCESSING__ || runtimeWindow.__CD_VERSION_GUARD_BLOCK__) {
    return;
  }
  delete document.body.dataset.cdVersionGuardBusy;
}

function setPdfGuardState(nextCount: number) {
  const runtimeWindow = window as RuntimeWindow;
  const safeCount = Number.isFinite(nextCount) ? Math.max(0, Math.floor(nextCount)) : 0;
  runtimeWindow.__CD_PDF_EXPORT_ACTIVE_COUNT__ = safeCount;
  runtimeWindow.__CD_PDF_EXPORT_IN_PROGRESS__ = safeCount > 0;
  syncBusyDataset(safeCount > 0);
  dispatchCriticalState();
}

function incrementPdfGuardCount() {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeWindow;
  const current = Number(runtimeWindow.__CD_PDF_EXPORT_ACTIVE_COUNT__ || 0);
  setPdfGuardState(current + 1);
}

function decrementPdfGuardCount() {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeWindow;
  const current = Number(runtimeWindow.__CD_PDF_EXPORT_ACTIVE_COUNT__ || 0);
  setPdfGuardState(current - 1);
}

function normalizeUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request) return String(input.url || "");
    return String((input as { url?: unknown })?.url || "");
  } catch {
    return "";
  }
}

function isPdfRelatedRequestUrl(url: string): boolean {
  const value = String(url || "").toLowerCase();
  if (!value) return false;

  return (
    value.includes("/api/premium-report/")
    || value.includes("/api/premium/")
    || value.includes("/api/love-secret")
    || value.includes("/api/saju/lifebook")
  );
}

export function isPdfExportInProgress(): boolean {
  if (typeof window === "undefined") return false;
  const runtimeWindow = window as RuntimeWindow;
  return Boolean(runtimeWindow.__CD_PDF_EXPORT_IN_PROGRESS__);
}

export function beginPdfExportGuard() {
  if (typeof window === "undefined") {
    return () => {};
  }

  incrementPdfGuardCount();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    decrementPdfGuardCount();
  };
}

export async function wrapPdfExportTask<T>(task: () => Promise<T> | T, minHoldMs = 0): Promise<T> {
  const release = beginPdfExportGuard();
  const startedAt = Date.now();

  try {
    return await task();
  } finally {
    const waitMs = Number(minHoldMs || 0);
    const elapsed = Date.now() - startedAt;
    if (waitMs > elapsed) {
      await new Promise((resolve) => setTimeout(resolve, waitMs - elapsed));
    }
    release();
  }
}

export function installPdfExportFetchGuard() {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.__CD_PDF_FETCH_GUARD_INSTALLED__) return;

  const originalFetch = window.fetch.bind(window);
  runtimeWindow.__CD_PDF_FETCH_GUARD_INSTALLED__ = true;

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = normalizeUrl(input);
    if (!isPdfRelatedRequestUrl(url)) {
      return originalFetch(input, init);
    }

    const release = beginPdfExportGuard();
    return originalFetch(input, init).finally(() => {
      release();
    });
  }) as typeof window.fetch;
}
