export const LIFEBOOK_FLOW_STATES = {
  IDLE: "idle",
  INPUT: "input",
  CALCULATING: "calculating",
  READY_TO_GENERATE: "ready_to_generate",
  CHECKING_ACCESS: "checking_access",
  GENERATING_PDF: "generating_pdf",
  SUCCESS: "success",
  ERROR: "error",
};

export function defaultFormInput() {
  return {
    name: "",
    gender: "",
    birth: {
      solarDate: "",
      time: "",
      timezone: "Asia/Seoul",
      locationName: "",
    },
  };
}

export function createInitialSajuLifeBookState() {
  return {
    formInput: defaultFormInput(),
    calculationResult: null,
    canonicalSajuChart: null,
    generatedPdf: null,
    generationStatus: LIFEBOOK_FLOW_STATES.INPUT,
    error: null,
    isGenerating: false,
  };
}

export function createInitialPremiumAccessState(seed = {}) {
  return {
    productId: String(seed.productId || "saju-life-book"),
    isUnlocked: Boolean(seed.isUnlocked),
    pointBalance: Number.isFinite(Number(seed.pointBalance)) ? Number(seed.pointBalance) : null,
    paymentStatus: String(seed.paymentStatus || "idle"),
  };
}

export function shouldShowPaymentUi(statusCode) {
  return Number(statusCode) === 402;
}

export function clearLifeBookStorage(store) {
  if (!store) return [];
  const removed = [];
  const shouldRemove = (key) => /(^lb_v1_)|saju-life-book|lifebook|life-book/i.test(String(key || ""));

  for (let i = store.length - 1; i >= 0; i -= 1) {
    const key = String(store.key(i) || "");
    if (!key || !shouldRemove(key)) continue;
    try {
      store.removeItem(key);
      removed.push(key);
    } catch (e) {
      // ignore storage errors
    }
  }

  return removed;
}

export function resetSajuLifeBookState(currentState, options = {}) {
  const next = createInitialSajuLifeBookState();
  const current = currentState || {};

  if (options.keepFormInput && current.formInput) {
    next.formInput = current.formInput;
  }

  if (options.keepStatus && current.generationStatus) {
    next.generationStatus = current.generationStatus;
  }

  if (options.revokeObjectUrl && current.generatedPdf && typeof current.generatedPdf === "string") {
    try {
      options.revokeObjectUrl(current.generatedPdf);
    } catch (e) {
      // ignore revoke errors
    }
  }

  return next;
}
