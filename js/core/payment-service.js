/**
 * Shared browser payment boundary for React, the static shell, and standalone pages.
 *
 * Classic script: globalThis.CodeDestinyPaymentService
 * CommonJS/webpack: module.exports
 */
(function (factory) {
  var api = factory(typeof globalThis !== "undefined" ? globalThis : null);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.CodeDestinyPaymentService = api;
})(function (global) {
  "use strict";

  var VERSION = 1;
  var METHODS = Object.freeze({
    MEMBERSHIP_PASS: "MEMBERSHIP_PASS",
    MONTHLY: "MONTHLY",
    DIRECT_KRW: "DIRECT_KRW",
  });
  var commandInFlight = Object.create(null);
  var backgroundVerification = Object.create(null);
  var snapshotSyncInFlight = Object.create(null);
  var appliedSuccessEvents = Object.create(null);
  var paymentWindowRenderer = null;
  var paymentWindowOwner = "";
  var snapshotSynchronizer = null;

  function text(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function normalizeMethod(value) {
    var normalized = text(value).toUpperCase();
    if (normalized === "MEMBERSHIP" || normalized === "PASS") return METHODS.MEMBERSHIP_PASS;
    if (normalized === "MONTHLY_CREDIT" || normalized === "MEMBERSHIP_CREDIT" || normalized === "MOONLIGHT_STONE") return METHODS.MONTHLY;
    if (normalized === "SINGLE" || normalized === "SINGLE_PURCHASE" || normalized === "DIRECT") return METHODS.DIRECT_KRW;
    return normalized;
  }

  function commandKey(input) {
    var command = input || {};
    return [
      normalizeMethod(command.method || command.paymentMode),
      text(command.requestId),
      text(command.productId),
      text(command.featureKey),
      text(command.profileId),
    ].join("|");
  }

  function log(stage, detail) {
    try {
      if (global && global.console && typeof global.console.info === "function") {
        global.console.info("[payment-service]", Object.assign({ stage: stage }, detail || {}));
      }
    } catch (_) {}
  }

  function dispatch(name, detail) {
    try {
      if (global && typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
        global.dispatchEvent(new global.CustomEvent(name, { detail: detail }));
      }
    } catch (_) {}
  }

  function normalizeSuccessEvent(payload) {
    var source = record(payload);
    var requestId = text(source.requestId);
    var operationId = text(source.operationId || source.transactionId || source.paymentId || requestId);
    if (!requestId || !operationId) {
      var error = new Error("PaymentSuccessEvent requires operationId and requestId.");
      error.code = "INVALID_PAYMENT_SUCCESS_EVENT";
      throw error;
    }
    return {
      operationId: operationId,
      requestId: requestId,
      productId: text(source.productId),
      featureKey: text(source.featureKey),
      profileId: text(source.profileId),
      method: normalizeMethod(source.method || source.paymentMethod || source.paymentMode),
      accessGrant: record(source.accessGrant),
      unlockMap: record(source.unlockMap),
      monthlyBalance: Number.isFinite(Number(source.monthlyBalance)) ? Number(source.monthlyBalance) : null,
      snapshotPatch: record(source.snapshotPatch),
      completedAt: text(source.completedAt) || new Date().toISOString(),
    };
  }

  function reducePaymentSuccess(payload) {
    var event = normalizeSuccessEvent(payload);
    var successKey = event.operationId + "|" + event.requestId;
    if (appliedSuccessEvents[successKey]) return appliedSuccessEvents[successKey];
    var accessStore = global && global.CodeDestinyAccessStore;
    var unlockPayload = Object.assign({}, event.snapshotPatch, {
      accessGrant: event.accessGrant,
      unlockMap: event.unlockMap,
    });
    try {
      if (accessStore && typeof accessStore.applyPaymentPayload === "function") {
        accessStore.applyPaymentPayload(unlockPayload, { profileId: event.profileId });
      }
      if (event.featureKey && event.accessGrant && event.accessGrant.ok === true
        && accessStore && typeof accessStore.markOptimisticallyUnlocked === "function") {
        accessStore.markOptimisticallyUnlocked(event.featureKey, event.profileId, { source: "PaymentSuccessEvent" });
      }
    } catch (_) {}

    var balanceDetail = {
      source: "payment-success-event",
      requestId: event.requestId,
      profileId: event.profileId,
      unlockMap: event.unlockMap,
      payload: unlockPayload,
    };
    if (event.monthlyBalance !== null) {
      balanceDetail.monthlyStoneBalance = event.monthlyBalance;
      balanceDetail.membershipCreditBalance = event.monthlyBalance;
      balanceDetail.monthlyCredits = event.monthlyBalance;
    }
    dispatch("cd:billing-balance-updated", balanceDetail);
    dispatch("PaymentSuccessEvent", event);
    dispatch("cd:payment-success", event);
    appliedSuccessEvents[successKey] = event;
    var appliedKeys = Object.keys(appliedSuccessEvents);
    if (appliedKeys.length > 100) delete appliedSuccessEvents[appliedKeys[0]];
    var snapshotUser = event.snapshotPatch && event.snapshotPatch.user;
    var syncKey = snapshotUser && (snapshotUser.id || snapshotUser._id)
      ? snapshotUser.id || snapshotUser._id
      : event.profileId || "account";
    scheduleSnapshotSync(syncKey, event);
    return event;
  }

  function idle(callback) {
    if (global && typeof global.requestIdleCallback === "function") {
      global.requestIdleCallback(callback, { timeout: 3000 });
      return;
    }
    if (global && typeof global.setTimeout === "function") global.setTimeout(callback, 0);
  }

  function scheduleSnapshotSync(userKey, event) {
    var key = text(userKey) || "account";
    if (snapshotSyncInFlight[key]) return snapshotSyncInFlight[key];
    var task = new Promise(function (resolve) {
      idle(resolve);
    }).then(function () {
      if (typeof snapshotSynchronizer === "function") return snapshotSynchronizer(event);
      var store = global && global.CodeDestinyAccessStore;
      if (store && typeof store.revalidate === "function") {
        return store.revalidate({ profileId: event.profileId, reason: "payment-success-background-sync" });
      }
      return null;
    }).catch(function (error) {
      log("BACKGROUND_SYNC_FAILED", { requestId: event.requestId, code: text(error && error.code) });
      return null;
    }).finally(function () {
      delete snapshotSyncInFlight[key];
    });
    snapshotSyncInFlight[key] = task;
    return task;
  }

  function registerSnapshotSynchronizer(synchronizer) {
    snapshotSynchronizer = typeof synchronizer === "function" ? synchronizer : null;
  }

  function runBackgroundVerification(input, verifier) {
    var key = commandKey(input);
    if (!key || typeof verifier !== "function") return null;
    if (backgroundVerification[key]) return backgroundVerification[key];
    var task = Promise.resolve().then(function () {
      return verifier(Object.assign({}, input, { requestId: text(input && input.requestId) }));
    }).catch(function (error) {
      log("OPTIMISTIC_VERIFY_FAILED", { requestId: text(input && input.requestId), code: text(error && error.code) });
      return null;
    }).finally(function () {
      delete backgroundVerification[key];
    });
    backgroundVerification[key] = task;
    return task;
  }

  function executePayment(input, executor) {
    var command = Object.assign({}, input || {}, { method: normalizeMethod(input && (input.method || input.paymentMode)) });
    var key = commandKey(command);
    if (!command.requestId || !command.method) {
      return Promise.reject(Object.assign(new Error("Payment command requires method and requestId."), { code: "INVALID_PAYMENT_COMMAND" }));
    }
    if (commandInFlight[key]) {
      log("DUPLICATE_CLIENT_COMMAND", { requestId: command.requestId, method: command.method, duplicate: true });
      return commandInFlight[key];
    }

    if (command.method === METHODS.MEMBERSHIP_PASS && command.snapshotCovered === true) {
      var optimisticEvent = reducePaymentSuccess({
        operationId: text(command.operationId) || "snapshot:" + command.requestId,
        requestId: command.requestId,
        productId: command.productId,
        featureKey: command.featureKey,
        profileId: command.profileId,
        method: command.method,
        accessGrant: Object.assign({ ok: true, accessType: "membership_pass", optimistic: true }, record(command.accessGrant)),
        unlockMap: command.featureKey ? (function () { var map = {}; map[command.featureKey] = true; return map; })() : {},
        monthlyBalance: command.monthlyBalance,
        snapshotPatch: record(command.snapshotPatch),
      });
      runBackgroundVerification(command, command.backgroundVerify);
      return Promise.resolve({ ok: true, optimistic: true, paymentSuccessEvent: optimisticEvent });
    }

    if (typeof executor !== "function") {
      return Promise.reject(Object.assign(new Error("Payment command executor is unavailable."), { code: "PAYMENT_EXECUTOR_UNAVAILABLE" }));
    }
    var promise = Promise.resolve().then(function () {
      return executor(command);
    }).then(function (result) {
      if (result && result.paymentSuccessEvent) reducePaymentSuccess(result.paymentSuccessEvent);
      return result;
    }).finally(function () {
      delete commandInFlight[key];
    });
    commandInFlight[key] = promise;
    return promise;
  }

  // 🔴 어느 결제창이 그려질지를 "먼저 등록한 쪽이 이김"(= 스크립트 로드 순서)으로 정하면 안 된다.
  // 같은 페이지에서 시도 1과 시도 2가 서로 다른 렌더러를 그리는 사고가 여기서 났다(디자인은 거의 같은데
  // 이용권 관련 UI 가 다른 결제창). 정본은 셸 인라인이므로 셸 > React > 독립 정적 순으로 고정하고,
  // 낮은 우선순위의 등록은 거부하되 **조용히 넘어가지 않고 남긴다** — 예전에는 false 만 돌려줘서
  // 어느 렌더러가 그렸는지 사후에 알아낼 방법이 없었다.
  var PAYMENT_WINDOW_OWNER_RANK = { "canonical-shell": 3, react: 2, standalone: 1 };

  function paymentWindowRank(owner) {
    var rank = PAYMENT_WINDOW_OWNER_RANK[text(owner)];
    return typeof rank === "number" ? rank : 0;
  }

  function registerPaymentWindow(renderer, owner) {
    if (typeof renderer !== "function") return false;
    var nextOwner = text(owner) || "anonymous";
    if (paymentWindowRenderer && paymentWindowOwner && paymentWindowOwner !== nextOwner
      && paymentWindowRank(nextOwner) < paymentWindowRank(paymentWindowOwner)) {
      log("PAYMENT_WINDOW_OWNER_REJECTED", { current: paymentWindowOwner, next: nextOwner });
      return false;
    }
    if (paymentWindowOwner && paymentWindowOwner !== nextOwner) {
      log("PAYMENT_WINDOW_OWNER_REPLACED", { previous: paymentWindowOwner, next: nextOwner });
    }
    paymentWindowRenderer = renderer;
    paymentWindowOwner = nextOwner;
    return true;
  }

  function getPaymentWindowOwner() {
    return paymentWindowOwner;
  }

  function openPaymentWindow(options) {
    if (typeof paymentWindowRenderer !== "function") {
      return Promise.reject(Object.assign(new Error("Payment window renderer is unavailable."), { code: "PAYMENT_WINDOW_UNAVAILABLE" }));
    }
    return Promise.resolve(paymentWindowRenderer(options || {}));
  }

  return {
    VERSION: VERSION,
    METHODS: METHODS,
    normalizeMethod: normalizeMethod,
    commandKey: commandKey,
    executePayment: executePayment,
    reducePaymentSuccess: reducePaymentSuccess,
    registerPaymentWindow: registerPaymentWindow,
    getPaymentWindowOwner: getPaymentWindowOwner,
    openPaymentWindow: openPaymentWindow,
    registerSnapshotSynchronizer: registerSnapshotSynchronizer,
    scheduleSnapshotSync: scheduleSnapshotSync,
  };
});
