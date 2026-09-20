/**
 * 마스터 인연의 서 — 부분 생성 세션의 **복구 계획**. 순수 함수이고 DB·LLM 을 부르지 않는다.
 *
 * 운영 스크립트(scripts/recover-master-love-codex-session.mjs)와 테스트가 같은 함수를 본다 —
 * 계획이 두 벌이 되면 "dry-run 에서 본 것"과 "실제로 쓴 것"이 갈라진다.
 *
 * 🔴 결제·구매 권리는 계획에 들어가지 않는다. paymentId·billingRequestId·passRefund·
 *    billingRefund·accessType 은 이 함수가 읽지도 쓰지도 않는다(PAYMENT_FIELDS 로 고정하고
 *    테스트가 단언한다).
 * 🔴 기대 장 목록은 diagnoseCodexSession 이 세션의 manifest(없으면 구매 당시 모드 표)에서
 *    가져온다. 지금 저장된 장 수로 원래 구성을 역산하지 않는다.
 * 🔴 읽을 수 있던 장을 줄이는 계획은 만들지 않는다(fail-closed → needs-confirmation).
 * 🔴 추가 LLM 호출이 필요한 변경(시도 기록 초기화)은 resetAttempts 를 명시했을 때만 한다.
 * 🔴 metadataOnly 는 LLM 을 한 번도 부르지 않는 변경만 남긴다 — 본문이 있는데 가려진 장을
 *    되살리고 진행 수치를 맞출 뿐, 닫힌 세션을 열어 생성을 재개시키지 않는다. 재생성 승인과
 *    노출 복구 승인이 다를 때 쓴다.
 */

/** 이 복구가 어떤 경로에서도 건드리지 않는 필드. 테스트가 계획 전체를 이 목록으로 검사한다. */
export const PAYMENT_FIELDS = ["paymentId", "billingRequestId", "passRefund", "billingRefund", "accessType"];

/** 락이 살아 있다고 볼 기본 시간. 라우트의 BATCH_LOCK_TTL_MS 를 주입받는다. */
const DEFAULT_LOCK_TTL_MS = 120000;

/**
 * @param {object} doc              세션 문서(lean). 결제 필드는 select 단계에서 빠져 있어도 된다.
 * @param {object} options
 * @param {(doc: object) => object} options.diagnose  서버·크론과 같은 diagnoseCodexSession
 * @param {number} [options.now]
 * @param {boolean} [options.resetAttempts]
 * @param {boolean} [options.metadataOnly]  생성을 재개시키는 변경을 전부 뺀다(LLM 호출 0)
 * @param {number} [options.lockTtlMs]
 * @returns {{set: object|null, unset: object|null, blocked?: string, ...}} 요약 + 갱신 문서
 */
export function planCodexRepair(doc, options = {}) {
  const { diagnose, now = Date.now(), resetAttempts = false, metadataOnly = false, lockTtlMs = DEFAULT_LOCK_TTL_MS } = options;
  if (typeof diagnose !== "function") throw new Error("planCodexRepair requires the shared diagnose function.");

  const diag = diagnose(doc);
  const ordered = diag.expected.map(spec => diag.saved.get(spec.id)).filter(Boolean);
  const currentIds = (doc.chapters || []).map(row => row.id);
  const nextIds = ordered.map(row => row.id);
  const meta = doc.deliveryMeta || {};
  const summary = {
    sessionId: doc.id,
    mode: doc.mode || "solo",
    status: doc.status || "",
    expected: diag.expected.length,
    saved: diag.saved.size,
    exposedBefore: currentIds.length,
    exposedAfter: nextIds.length,
    pending: diag.pending.length,
    exhausted: diag.exhausted.length,
    actions: [],
    regenerationChapters: 0,
    set: null,
    unset: null,
  };

  // 읽을 수 있던 장이 줄어드는 계획은 만들지 않는다 — 옛 계약으로 전달된 책을 지금 하한으로 자르지 않는다.
  if (nextIds.length < currentIds.length) return { ...summary, blocked: "would-reduce-readable" };

  const set = {};
  const unset = {};

  if (nextIds.join(",") !== currentIds.join(",")) {
    set.chapters = ordered;
    set.totalCharCount = ordered.reduce((sum, row) => sum + Number(row.chars || row.body?.length || 0), 0);
    summary.actions.push(`expose ${currentIds.length}→${nextIds.length}`);
  }

  // 살아 있는 웨이브는 건드리지 않는다 — 락이 유효하면 지금 쓰이는 중인 책이다.
  const lockAlive = new Date(doc.generationProgress?.lockedAt || 0).getTime() > now - lockTtlMs;
  const closed = doc.status === "generation_failed" || meta.reviewRequired === true;
  const completedButMissing = doc.status === "completed" && diag.pending.length > 0;
  // 닫히지도 않았는데 멈춰 있는 세션(도는 작업 없음 + 남은 장이 전부 시도 소진)은 시도 기록을
  // 지워 달라고 명시했을 때만 연다 — 말없이 추가 과금 호출을 만들지 않는다.
  const stuckAllExhausted = !lockAlive && diag.pending.length > 0 && diag.actionable.length === 0;
  // metadataOnly: 생성을 재개시키는 갈래를 통째로 닫는다 — 이 모드의 계획은 LLM 호출을 만들지 않는다.
  const wantsReopen = !metadataOnly && (closed || completedButMissing || (resetAttempts && stuckAllExhausted));
  const reopenable = diag.actionable.length > 0 || (resetAttempts && diag.exhausted.length > 0);

  if (wantsReopen && reopenable) {
    if (doc.status !== "generating") { set.status = "generating"; summary.actions.push(`status ${doc.status}→generating`); }
    if (meta.reviewRequired === true) { set["deliveryMeta.reviewRequired"] = false; summary.actions.push("reviewRequired→false"); }
    if (meta.reviewReason) unset["deliveryMeta.reviewReason"] = "";
    if (doc.generationError) set.generationError = null;
    // 죽은 락만 치운다 — 살아 있는 웨이브의 락은 절대 빼앗지 않는다.
    if (!lockAlive && doc.generationProgress?.lockedAt) {
      set["generationProgress.lockedAt"] = null;
      set["generationProgress.lockToken"] = "";
      summary.actions.push("stale lock cleared");
    }
    if (resetAttempts && diag.exhausted.length) {
      for (const spec of diag.exhausted) {
        for (const field of ["attempts", "failures", "errors"]) unset[`deliveryMeta.${field}.${spec.id}`] = "";
      }
      unset["deliveryMeta.exhaustedChapterIds"] = "";
      summary.actions.push(`reset attempts on ${diag.exhausted.length} chapters`);
    }
    summary.regenerationChapters = resetAttempts ? diag.pending.length : diag.actionable.length;
  } else if (!metadataOnly && (wantsReopen || stuckAllExhausted)) {
    // 남은 장이 전부 시도 소진인데 --reset-attempts 가 없다 — 추가 과금 호출을 말없이 만들지 않는다.
    summary.blocked = "exhausted-without-reset";
  }

  if (!Object.keys(set).length && !Object.keys(unset).length) {
    return { ...summary, blocked: summary.blocked || "nothing-to-do" };
  }

  if (Number(doc.generationProgress?.completed || 0) !== ordered.length
    || Number(doc.generationProgress?.total || 0) !== diag.expected.length) {
    set["generationProgress.completed"] = ordered.length;
    set["generationProgress.total"] = diag.expected.length;
  }

  // 되돌릴 수 있게 변경 전 상태를 한 번만 남긴다. 본문은 이 복구가 지우지 않으므로 담지 않는다.
  if (!meta.repairSnapshot) {
    set["deliveryMeta.repairSnapshot"] = {
      at: new Date(now),
      status: doc.status || "",
      chapterIds: currentIds,
      totalCharCount: Number(doc.totalCharCount || 0),
      reviewRequired: meta.reviewRequired ?? null,
      reviewReason: meta.reviewReason || "",
      attempts: meta.attempts || {},
      failures: meta.failures || {},
      errors: meta.errors || {},
      generationProgress: doc.generationProgress || null,
    };
  }
  set["deliveryMeta.codexRepairedAt"] = new Date(now);

  return { ...summary, set, unset: Object.keys(unset).length ? unset : null };
}

/** 계획이 실제로 쓰는 경로. 롤백 근거(before-image)와 테스트가 같은 목록을 본다. */
export function plannedFields(plan) {
  return [...Object.keys(plan?.set || {}), ...Object.keys(plan?.unset || {})];
}
