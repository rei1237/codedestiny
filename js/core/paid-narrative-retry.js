/**
 * 서술형 유료 상담 10종의 "다시 시도 우선" 패널 정본(2026-11-22 C2-UI).
 *
 * 서버(worker/routes/paid-narrative-retry.js)는 생성이 한도에 걸린 서술형 실행을 바로 환불하지 않고
 * 202 { retryable:false, reviewRequired:true, resultId } 로 보류한다. 이 모듈은 그 보류 건에
 *   1) "무료로 다시 시도": POST /api/paid-narrative/retry { resultId } → 응답의 resumeBody 로 제품 라우트를 다시 부른다.
 *      저장된 장은 서버가 그대로 두고 빠진 장만 다시 쓴다.
 *   2) "다시 시도 대신 환불 요청": POST /api/paid-narrative/refund-request { resultId }.
 *      409 RESULT_READY 이면 이미 완성된 결과이므로 결과를 연다(환불하지 않는다).
 * 를 붙인다. 결제·코인 게이트·/points 로 보내지 않고 기한(일수)·날짜를 약속하지 않는다.
 *
 * 로딩 방식(정적 셸·React 공유, js/core/pass-verdict.js 와 같은 관행):
 *   - 브라우저 classic script: `globalThis.CDPaidNarrativeRetry`
 *   - webpack/Node(require): `module.exports` (package.json type=commonjs), 타입은 paid-narrative-retry.d.ts
 * 문구는 ko·en·ja·zh-CN·zh-TW 다섯이고 나머지는 영어로 폴백한다(app/components/ExpertRetryPanel.tsx 와 같은 관행).
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.CDPaidNarrativeRetry = api;
})(function () {
  "use strict";

  var RETRY_PATH = "/api/paid-narrative/retry";
  var REFUND_PATH = "/api/paid-narrative/refund-request";

  var EN = {
    title: "Your reading paused before it was finished",
    offer: "We couldn't finish part of your reading. We'll keep the parts already saved and write only the missing ones. No extra charge or deduction.",
    retryLabel: "Try again free · no extra charge",
    retryStarted: "Writing the missing parts again. There is no extra charge or deduction.",
    retryFailed: "We couldn't start the retry. Please tap again in a moment.",
    retryClosed: "A free retry is no longer available for this reading. You can request a refund below.",
    busyMessage: "Still processing. Please tap again in a moment.",
    refundRequestLabel: "Request a refund instead",
    refundRequested: "We received your refund request. Your pass or payment will be returned once it is processed.",
    refunded: "Your pass or payment has been returned.",
    refundRequestFailed: "We couldn't send your refund request. Please tap again in a moment.",
    opening: "Your reading is complete. Opening it now.",
    busy: "Processing",
  };

  var COPY = {
    ko: {
      title: "상담 작성이 잠시 멈췄어요",
      offer: "상담 일부를 완성하지 못했어요. 이미 저장된 부분은 그대로 두고 빠진 부분만 다시 써 드려요. 추가 결제·차감 없음.",
      retryLabel: "무료로 다시 시도 · 추가 결제·차감 없음",
      retryStarted: "빠진 부분을 다시 쓰고 있어요. 추가 결제·차감은 없어요.",
      retryFailed: "다시 시도를 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
      retryClosed: "이 상담은 무료 다시 시도를 더 할 수 없어요. 아래에서 환불을 요청해 주세요.",
      busyMessage: "아직 처리 중이에요. 잠시 뒤 다시 눌러 주세요.",
      refundRequestLabel: "다시 시도 대신 환불 요청",
      refundRequested: "환불 요청을 받았어요. 처리가 끝나면 이용권과 결제가 되돌아가요.",
      refunded: "이용권과 결제를 되돌려 드렸어요.",
      refundRequestFailed: "환불 요청을 전하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
      opening: "상담이 완성돼 있어요. 결과를 열게요.",
      busy: "처리 중",
    },
    en: EN,
    ja: {
      title: "鑑定の作成が一時的に止まりました",
      offer: "鑑定の一部を完成できませんでした。保存済みの部分はそのままに、足りない部分だけを書き直します。追加の支払い・差し引きなし。",
      retryLabel: "無料でもう一度試す · 追加料金なし",
      retryStarted: "足りない部分を書き直しています。追加の支払い・差し引きはありません。",
      retryFailed: "再試行を開始できませんでした。少ししてからもう一度押してください。",
      retryClosed: "この鑑定は無料の再試行ができなくなりました。下から返金を申請してください。",
      busyMessage: "まだ処理中です。少ししてからもう一度押してください。",
      refundRequestLabel: "再試行の代わりに返金を申請",
      refundRequested: "返金申請を受け付けました。処理が終わると利用券とお支払いが戻ります。",
      refunded: "利用券とお支払いをお戻ししました。",
      refundRequestFailed: "返金申請を送れませんでした。少ししてからもう一度押してください。",
      opening: "鑑定は完成しています。結果を開きます。",
      busy: "処理中",
    },
    "zh-CN": {
      title: "解读撰写暂时中断了",
      offer: "解读有一部分未能完成。已保存的部分会保留，只重写缺少的部分。不额外收费或扣除。",
      retryLabel: "免费重试 · 不额外收费",
      retryStarted: "正在重写缺少的部分。不会额外收费或扣除。",
      retryFailed: "未能开始重试。请稍后再点一次。",
      retryClosed: "这份解读已无法免费重试。请在下方申请退款。",
      busyMessage: "仍在处理中。请稍后再点一次。",
      refundRequestLabel: "改为申请退款",
      refundRequested: "已收到退款申请。处理完成后，使用券和付款将退回。",
      refunded: "使用券和付款已退回。",
      refundRequestFailed: "未能发送退款申请。请稍后再点一次。",
      opening: "解读已完成，正在打开结果。",
      busy: "处理中",
    },
    "zh-TW": {
      title: "解讀撰寫暫時中斷了",
      offer: "解讀有一部分未能完成。已儲存的部分會保留，只重寫缺少的部分。不額外收費或扣除。",
      retryLabel: "免費重試 · 不額外收費",
      retryStarted: "正在重寫缺少的部分。不會額外收費或扣除。",
      retryFailed: "未能開始重試。請稍後再點一次。",
      retryClosed: "這份解讀已無法免費重試。請在下方申請退款。",
      busyMessage: "仍在處理中。請稍後再點一次。",
      refundRequestLabel: "改為申請退款",
      refundRequested: "已收到退款申請。處理完成後，使用券和付款將退回。",
      refunded: "使用券和付款已退回。",
      refundRequestFailed: "未能送出退款申請。請稍後再點一次。",
      opening: "解讀已完成，正在開啟結果。",
      busy: "處理中",
    },
  };

  function copyFor(locale) {
    var key = String(locale || "").trim();
    if (COPY[key]) return COPY[key];
    var lower = key.toLowerCase();
    if (lower === "zh-hant" || lower === "zh-hk" || lower === "zh-mo") return COPY["zh-TW"];
    if (lower.indexOf("zh") === 0) return COPY["zh-CN"];
    var base = lower.split("-")[0];
    return COPY[base] || EN;
  }

  /** 제품 라우트 응답에서 다시 시도 보류를 읽는다. 진행 중·완성·환불 건은 null. */
  function holdOf(data, fallbackId) {
    var body = data && typeof data === "object" ? data : {};
    if (body.retryable !== false || body.reviewRequired !== true || body.saved === true) return null;
    var resultId = String(body.resultId || fallbackId || "");
    return resultId ? { resultId: resultId } : null;
  }

  function resumeOf(payload, resultId) {
    var body = payload && payload.resumeBody && typeof payload.resumeBody === "object" ? payload.resumeBody : null;
    return body && body.resumeResultId ? body : { resumeResultId: resultId };
  }

  /** POST /retry 응답 → 화면 동작. resume 이면 resumeBody 로 제품 라우트를 다시 부른다. */
  function retryOutcome(status, payload, resultId) {
    var p = payload || {};
    var reason = String(p.reason || "");
    if (status === 200 && p.ok !== false) return { kind: "resume", resumeBody: resumeOf(p, resultId) };
    if (status === 409 && reason === "STILL_GENERATING") return { kind: "resume", resumeBody: resumeOf(p, resultId) };
    if (status === 409 && (reason === "RETRY_WINDOW_CLOSED" || reason === "RETRY_LIMIT_REACHED")) return { kind: "retry-closed" };
    if (status === 409 && reason === "REFUND_IN_PROGRESS") return { kind: "refund-requested" };
    if (status === 409 && reason === "BUSY") return { kind: "busy" };
    if (status === 409 && reason === "NOT_RETRYABLE") {
      return p.status === "refunded" || p.status === "cancelled" ? { kind: "refunded" } : { kind: "resume", resumeBody: resumeOf(p, resultId) };
    }
    return { kind: "failed" };
  }

  /** POST /refund-request 응답 → 화면 동작. 이미 완성된 결과(RESULT_READY)는 환불하지 않고 연다. */
  function refundOutcome(status, payload, resultId) {
    var p = payload || {};
    var reason = String(p.reason || "");
    if (status === 200 && p.refundStatus === "refunded") return { kind: "refunded" };
    if (status === 202) return { kind: "refund-requested" };
    if (status === 409 && reason === "RESULT_READY") return { kind: "ready", resumeBody: resumeOf(p, resultId) };
    if (status === 409 && reason === "NOT_REFUNDABLE") {
      return p.status === "refunded" || p.status === "cancelled" ? { kind: "refunded" } : { kind: "ready", resumeBody: resumeOf(p, resultId) };
    }
    if (status === 409 && reason === "BUSY") return { kind: "busy" };
    return { kind: "failed" };
  }

  function readToken() {
    try { return String(globalThis.localStorage && globalThis.localStorage.getItem("fortune_auth_token") || "").trim(); } catch (_) { return ""; }
  }

  // 결과 id 만 보낸다. 결제·코인 게이트를 다시 타지 않는다.
  async function postResult(path, resultId, options) {
    var opts = options || {};
    if (typeof opts.request === "function") return opts.request(path, { resultId: resultId });
    var headers = { "Content-Type": "application/json" };
    var token = readToken();
    if (token) headers.Authorization = "Bearer " + token;
    var response = await fetch(String(opts.apiBase || "") + path, { method: "POST", credentials: "include", headers: headers, body: JSON.stringify({ resultId: resultId }) });
    var payload = await response.json().catch(function () { return {}; });
    return { status: response.status, payload: payload };
  }

  async function retry(resultId, options) {
    try {
      var reply = await postResult(RETRY_PATH, resultId, options);
      return retryOutcome(reply.status, reply.payload, resultId);
    } catch (_) { return { kind: "failed" }; }
  }

  async function refundRequest(resultId, options) {
    try {
      var reply = await postResult(REFUND_PATH, resultId, options);
      return refundOutcome(reply.status, reply.payload, resultId);
    } catch (_) { return { kind: "failed" }; }
  }

  /** 결과마다 버튼·안내의 다음 상태. React 패널과 정적 셸 패널이 같은 표를 쓴다. */
  function nextView(outcome, action, copy) {
    switch (outcome.kind) {
      case "resume": return { message: copy.retryStarted, closed: false, retryHidden: false, resume: outcome.resumeBody };
      case "ready": return { message: copy.opening, closed: true, retryHidden: true, resume: outcome.resumeBody };
      case "retry-closed": return { message: copy.retryClosed, closed: false, retryHidden: true };
      case "refund-requested": return { message: copy.refundRequested, closed: true, retryHidden: true };
      case "refunded": return { message: copy.refunded, closed: true, retryHidden: true };
      case "busy": return { message: copy.busyMessage, closed: false, retryHidden: false };
      default: return { message: action === "refund" ? copy.refundRequestFailed : copy.retryFailed, closed: false, retryHidden: false };
    }
  }

  /**
   * 정적 셸용 패널. host 안에 하나만 둔다(다시 부르면 교체). 미완성 결과는 이 패널이 보여 주지 않는다.
   * options: { resultId, locale, apiBase?, request?, onResume(resumeBody), className?, primaryClass?, secondaryClass? }
   */
  function mount(host, options) {
    var opts = options || {};
    if (!host || !opts.resultId || typeof document === "undefined") return null;
    var previous = host.querySelector("[data-paid-narrative-retry]");
    if (previous) previous.remove();
    var copy = copyFor(opts.locale || (document.documentElement && document.documentElement.lang) || "ko");
    var panel = document.createElement("div");
    panel.setAttribute("data-paid-narrative-retry", "");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", copy.title);
    if (opts.className) panel.className = opts.className;
    panel.style.cssText = "display:grid;gap:12px;margin:16px 0;padding:16px;border:1px solid currentColor;border-radius:16px;text-align:left;";
    var title = document.createElement("h3"); title.textContent = copy.title; title.style.margin = "0";
    var offer = document.createElement("p"); offer.setAttribute("role", "alert"); offer.textContent = copy.offer; offer.style.margin = "0";
    var status = document.createElement("p"); status.setAttribute("role", "status"); status.style.margin = "0";
    var retryButton = document.createElement("button"); retryButton.type = "button"; retryButton.textContent = copy.retryLabel;
    var refundButton = document.createElement("button"); refundButton.type = "button"; refundButton.textContent = copy.refundRequestLabel;
    if (opts.primaryClass) retryButton.className = opts.primaryClass;
    if (opts.secondaryClass) refundButton.className = opts.secondaryClass;
    [retryButton, refundButton].forEach(function (button) { button.style.minHeight = "48px"; button.style.width = "100%"; button.style.whiteSpace = "normal"; });
    panel.appendChild(title); panel.appendChild(offer); panel.appendChild(status); panel.appendChild(retryButton); panel.appendChild(refundButton);
    host.appendChild(panel);

    var busy = false;
    function apply(view) {
      status.textContent = view.message || "";
      if (view.retryHidden) retryButton.remove();
      if (view.closed) { offer.remove(); refundButton.remove(); retryButton.remove(); }
      if (view.resume && typeof opts.onResume === "function") opts.onResume(view.resume);
    }
    function run(action, label, button) {
      if (busy) return;
      busy = true; retryButton.disabled = true; refundButton.disabled = true; button.textContent = copy.busy;
      var request = action === "refund" ? refundRequest(opts.resultId, opts) : retry(opts.resultId, opts);
      request.then(function (outcome) {
        busy = false; retryButton.disabled = false; refundButton.disabled = false; button.textContent = label;
        apply(nextView(outcome, action, copy));
      });
    }
    retryButton.onclick = function () { run("retry", copy.retryLabel, retryButton); };
    refundButton.onclick = function () { run("refund", copy.refundRequestLabel, refundButton); };
    return panel;
  }

  return {
    RETRY_PATH: RETRY_PATH,
    REFUND_PATH: REFUND_PATH,
    COPY: COPY,
    copyFor: copyFor,
    holdOf: holdOf,
    retryOutcome: retryOutcome,
    refundOutcome: refundOutcome,
    nextView: nextView,
    retry: retry,
    refundRequest: refundRequest,
    mount: mount,
  };
});
