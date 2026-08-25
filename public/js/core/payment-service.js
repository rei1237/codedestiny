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
  /** 결제 커맨드 단일비행 슬롯의 유효 시간. 셸·dp 의 단건 체크아웃 슬롯(60초)과 같은 값이다. */
  var COMMAND_IN_FLIGHT_TTL_MS = 60000;
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

  /**
   * 서버가 이 featureKey 를 영구 해금으로 선언했는가.
   * 선언 형태는 두 가지뿐이다 — `unlockMap[featureKey] === true`(월정석·이용권·단건 확정 봉투),
   * 또는 `accessGrant.unlockGrant.grantType === "permanent_unlock"`(entitlement 지급 결과).
   * 회당 결제(per_use)는 서버가 둘 다 싣지 않으므로 여기서 false 가 된다.
   */
  function declaresPermanentUnlock(event, featureKey) {
    var key = text(featureKey);
    if (!key) return false;
    if (record(event.unlockMap)[key] === true) return true;
    var grant = record(record(event.accessGrant).unlockGrant);
    return text(grant.grantType) === "permanent_unlock" && text(grant.status).toLowerCase() !== "refunded";
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
      /* 🔴 결제가 성공했다는 사실만으로 해금을 찍지 않는다 — 회당 결제도 accessGrant.ok 는 true 다.
         서버가 이 featureKey 를 **영구 해금으로 선언했을 때만** 낙관 기록을 남긴다(선언 형태는
         unlockMap 또는 accessGrant.unlockGrant). 회당 결제 응답에는 둘 다 없고, 없는 것이 정상이다.
         예전에는 ok:true 만 보고 10분짜리 해금을 찍어, 회당 결제 기능이 결제 직후부터 새로고침
         전까지 결제창 없이 열렸다. */
      if (event.featureKey && declaresPermanentUnlock(event, event.featureKey)
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
    // 🔴 슬롯은 TTL 로 스스로 낫는다. 이 레포의 다른 인플라이트 슬롯은 전부 TTL 을 갖는데
    // (셸·dp 의 _cdJoinPaidServiceSingleFlight 60s, React 결제창 45s) 여기만 없어서, executor 가
    // 한 번 settle 하지 않으면 finally 가 영영 안 돌아 그 commandKey 가 페이지 수명 내내 잠겼다 —
    // 사용자에게는 "다시 눌러도 결제창이 안 뜬다"로 보이고 새 요청조차 나가지 않는다.
    // 상한은 단건 체크아웃 슬롯과 같은 60초다(그 안쪽 fetch 상한이 25초라 정상 경로는 못 닿는다).
    var active = commandInFlight[key];
    if (active && Date.now() - Number(active.startedAt || 0) < COMMAND_IN_FLIGHT_TTL_MS) {
      log("DUPLICATE_CLIENT_COMMAND", { requestId: command.requestId, method: command.method, duplicate: true });
      return active.promise;
    }
    if (active) log("STALE_CLIENT_COMMAND_SLOT_RELEASED", { requestId: command.requestId, method: command.method });

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
      // TTL 만료 뒤 다른 시도가 슬롯을 차지했을 수 있다 — 내 것일 때만 지운다.
      if (commandInFlight[key] && commandInFlight[key].promise === promise) delete commandInFlight[key];
    });
    commandInFlight[key] = { promise: promise, startedAt: Date.now() };
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
