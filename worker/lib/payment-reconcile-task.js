// pending 주문 재조정: 우리 DB 가 pending/processing 인 채 멈춘 주문을 PortOne 실제 상태와 대조한다.
//
// 왜 필요한가: 기존 재조정 크론(runWebhookReconcileTask)은 PaymentWebhookEvent 만 본다. 웹훅이 아예
// 도착하지 않은 주문은 어떤 장치도 손대지 않아 영원히 pending 으로 남는다. 2026-07 PortOne 401 장애에서
// 카드 승인이 끝난 주문이 그대로 방치됐고, 사람이 DB 를 직접 열어야 알 수 있었다.
//
// 🔴 정책: 정산(=지급)만 자동으로 한다. 환불은 절대 자동으로 하지 않는다 — 관리자 화면에서만.
// Cloudflare rate-limit 안전: 배치·상한·terminal 종료(무한 루프 금지).
import { connectDb, withMongoRetry } from "./db.js";
import { CONTENT_ENTITLEMENT_STATUSES, Payment } from "./models.js";
import { fetchPortOnePayment } from "./portone.js";
import { revokeSinglePaymentContentAccess } from "./payment-refund.js";

function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// PortOne 에 결제 자체가 등록되지 않은(404) 주문은 "결제창을 열지도 않고 이탈"한 것이다. 충분히
// 오래된 것만 만료 처리해 목록에서 걷어낸다 — 돈과 무관하므로 자동 처리해도 안전하다.
const DEFAULT_EXPIRE_UNKNOWN_AFTER_MS = 24 * 60 * 60 * 1000;
// 같은 주문을 여러 실행이 동시에/연달아 잡지 않도록 하는 재시도 간격.
const RECLAIM_AFTER_MS = 5 * 60 * 1000;

// PortOne 은 없는 결제 ID 에 404 PAYMENT_NOT_FOUND 를 주기도 하고 401 UNAUTHORIZED 를 주기도 한다
// (스토어 네임스페이스 밖 ID). 자격증명이 살아 있는 게 확인된 상태라면 둘 다 "그런 결제 없음"으로 본다.
function isNotFoundLookupError(error) {
  return /PAYMENT_NOT_FOUND|not found|Unauthorized|UNAUTHORIZED/i.test(String(error?.message || ""));
}

async function markPayment(paymentId, set) {
  await Payment.findByIdAndUpdate(paymentId, { $set: { ...set, lastErrorAt: new Date() } }).catch(() => {});
}

/**
 * @returns {Promise<{ok:boolean, scanned:number, settled:number, syncedCancelled:number, syncedFailed:number, expired:number, untouched:number, skipped:number, failed:number, abortedReason?:string}>}
 */
export async function reconcilePendingPayments(env, options = {}) {
  const limit = clampInt(options.limit ?? env?.PAYMENT_RECONCILE_LIMIT, 50, 1, 300);
  const minAgeMs = clampInt(options.minAgeMinutes ?? env?.PAYMENT_RECONCILE_MIN_AGE_MIN, 10, 1, 1440) * 60 * 1000;
  const windowMs = clampInt(options.windowDays ?? env?.PAYMENT_RECONCILE_WINDOW_DAYS, 7, 1, 90) * 24 * 60 * 60 * 1000;
  const maxAttempts = clampInt(options.maxAttempts ?? env?.PAYMENT_RECONCILE_MAX_ATTEMPTS, 10, 1, 50);
  const expireUnknownAfterMs = clampInt(
    options.expireUnknownAfterHours ?? env?.PAYMENT_RECONCILE_EXPIRE_UNKNOWN_HOURS,
    24, 1, 720,
  ) * 60 * 60 * 1000;

  const summary = {
    ok: true, scanned: 0, settled: 0, syncedCancelled: 0, syncedFailed: 0,
    expired: 0, untouched: 0, skipped: 0, claimErrors: 0, failed: 0,
  };

  await connectDb(env);
  const now = Date.now();

  const candidates = await withMongoRetry(env, () => Payment.find({
    status: { $in: ["pending", "processing"] },
    createdAt: { $lte: new Date(now - minAgeMs), $gte: new Date(now - windowMs) },
    $or: [
      { "metadata.reconcile.attempts": { $exists: false } },
      { "metadata.reconcile.attempts": { $lt: maxAttempts } },
    ],
  })
    .select("userId merchantUid impUid status orderState paymentAmount paymentType accessType featureKey pricingSnapshot createdAt metadata")
    // 🔴 최신 주문 우선. 예전에는 오래된 것부터(createdAt:1) 처리했는데, 앞자리를 며칠 지난 '결제창
    // 이탈' 주문들이 차지해 방금 결제된 건이 대기열 맨 뒤로 밀렸다. 한 틱이 상한까지 못 돌면(운영에서
    // 실제로 그랬다) 정작 급한 건은 영영 처리되지 않는다. 지급이 급한 쪽은 방금 결제된 주문이고,
    // 오래된 이탈 건은 시도 상한(maxAttempts)이 알아서 정리한다.
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean());

  summary.scanned = candidates.length;
  const reclaimCutoff = new Date(now - RECLAIM_AFTER_MS);
  // 이번 실행에서 PortOne 조회가 한 번이라도 성공했는가 — 자격증명이 살아 있다는 유일한 양성 증거다.
  let sawSuccessfulLookup = false;
  // "PortOne 에 기록 없음"으로 보이는 주문들. 자격증명 생사가 확인된 뒤에만 만료 처리한다.
  const pendingExpire = [];
  // 같은 사유가 수십 줄 찍히지 않도록 사유별 1회만 로그한다.
  const loggedLookupErrors = new Set();

  for (const candidate of candidates) {
    // 동시 실행/연속 실행이 같은 주문을 중복 처리하지 않도록 클레임한다(runWebhookReconcileTask 와 같은 관용구).
    // 🔴 클레임 '실패'(Mongo 오류)와 '경합'(다른 실행이 이미 잡음)을 구분한다. 예전에는 둘 다 조용히
    // skipped 로 셌는데, Atlas idle 연결 회수로 콜드 isolate 의 첫 쓰기가 자주 타임아웃 나는 이 환경에서는
    // 크론이 거의 아무것도 못 하는데도 요약이 정상처럼 보였다. 재시도는 다음 크론 틱이 한다 —
    // 여기에 새 재시도 계층을 만들지 않는다.
    let claimed = null;
    let claimFailed = false;
    try {
      claimed = await Payment.findOneAndUpdate(
        {
          _id: candidate._id,
          status: candidate.status,
          $or: [
            { "metadata.reconcile.lastAt": { $exists: false } },
            { "metadata.reconcile.lastAt": { $lte: reclaimCutoff } },
          ],
        },
        { $set: { "metadata.reconcile.lastAt": new Date() }, $inc: { "metadata.reconcile.attempts": 1 } },
        { returnDocument: "after" },
      ).lean();
    } catch (error) {
      claimFailed = true;
      console.error("[CRON] payment reconcile claim failed", candidate.merchantUid, error?.message || error);
    }
    if (claimFailed) { summary.claimErrors += 1; continue; }
    if (!claimed) { summary.skipped += 1; continue; }

    const lookupId = candidate.impUid || candidate.merchantUid;
    if (!lookupId) { summary.skipped += 1; continue; }

    let portOnePayment = null;
    try {
      portOnePayment = await fetchPortOnePayment(env, lookupId);
      sawSuccessfulLookup = true;
    } catch (error) {
      // 🔴 401 을 자격증명 신호로 쓰지 않는다. PortOne 은 '없는 결제 ID' 에도 401 UNAUTHORIZED 를
      // 주기 때문에 401 만으로는 "시크릿이 죽었다"와 "그런 주문이 없다"를 원리적으로 구분할 수 없다.
      // 연속 카운트로 추정해 봤지만, 최신 주문부터 처리하면 앞자리가 죄다 미등록 주문이라 그대로
      // 오탐이 났다(실제로 재조정이 매 틱 중단됐다). 그래서 중단 판단 자체를 없앤다 — 조회 실패는
      // 그 주문만 건너뛰고 계속 간다.
      //
      // 대신 '파괴적 조치'(만료 처리)는 자격증명이 살아 있다는 양성 증거가 있을 때만 한다.
      // 시크릿이 정말 죽은 상태에서 만료 처리를 하면 멀쩡한 주문을 전부 실패로 덮어쓴다.
      // 조회 실패 사유를 반드시 남긴다. 예전에는 카운터만 올려서, 프로덕션에서 전건 실패인데도
      // 원인을 알 수 없었다(요약에 실패 건수만 보였다).
      const reason = String(error?.message || error || "").slice(0, 200);
      if (!loggedLookupErrors.has(reason)) {
        loggedLookupErrors.add(reason);
        console.error(`[CRON] payment reconcile lookup failed: ${reason} (예: ${lookupId})`);
      }
      const expirable = isNotFoundLookupError(error)
        && (now - new Date(candidate.createdAt).getTime()) > expireUnknownAfterMs;
      if (expirable) {
        // 아직 성공 조회가 없으면 자격증명 생사를 모른다 — 판단을 루프 끝으로 미룬다.
        pendingExpire.push(candidate._id);
      } else {
        summary.failed += 1;
      }
      continue;
    }

    const status = String(portOnePayment?.status || "").toLowerCase();

    if (status === "paid") {
      // 단건 디지털콘텐츠만 자동 정산한다. 다른 유형은 정산 규칙이 이 태스크에 없으므로 손대지 않고
      // 관리자 화면에서 보이도록 사유만 남긴다(임의 지급 금지).
      const isSinglePurchase = String(candidate.paymentType || "") === "digital_content"
        && String(candidate.accessType || "") === "single_purchase";
      if (!isSinglePurchase) {
        await markPayment(candidate._id, {
          failureCode: "reconcile_manual_review",
          failureMessage: "PortOne reports PAID but this payment type has no automatic settlement path.",
          failureStage: "reconcile_paid_unsupported_type",
        });
        summary.untouched += 1;
        continue;
      }
      try {
        const { settleSinglePaymentForReconcile } = await import("../routes/payments.js");
        const response = await settleSinglePaymentForReconcile(env, {
          paymentId: candidate.merchantUid,
          userId: candidate.userId,
        });
        if (response?.ok) summary.settled += 1;
        else summary.failed += 1;
      } catch (error) {
        console.error("[CRON] payment reconcile settle failed", candidate.merchantUid, error?.message || error);
        summary.failed += 1;
      }
      continue;
    }

    if (status === "cancelled") {
      const revocation = await revokeSinglePaymentContentAccess(candidate, {
        status: CONTENT_ENTITLEMENT_STATUSES.CANCELLED,
        reason: "reconcile_portone_cancelled",
      });
      await markPayment(candidate._id, {
        status: "cancelled",
        orderState: "CANCELLED",
        rawPortOne: portOnePayment,
        "metadata.unlockRevoked": revocation.unlockRevoked === true,
        failureCode: "reconcile_synced_cancelled",
        failureMessage: "PortOne reports CANCELLED. Order state synchronized.",
        failureStage: "reconcile_sync_cancelled",
      });
      summary.syncedCancelled += 1;
      continue;
    }

    if (status === "failed") {
      await markPayment(candidate._id, {
        status: "failed",
        orderState: "FAILED",
        rawPortOne: portOnePayment,
        failureCode: "reconcile_synced_failed",
        failureMessage: "PortOne reports FAILED. Order state synchronized.",
        failureStage: "reconcile_sync_failed",
      });
      summary.syncedFailed += 1;
      continue;
    }

    // ready / 가상계좌 발급대기 등 — 결제창 이탈은 정상 상태다. 손대지 않는다.
    summary.untouched += 1;
  }

  // 미뤄 둔 만료 처리. 자격증명이 살아 있다는 게 이번 실행에서 확인됐을 때만 실행한다.
  // 확인이 안 됐으면 아무것도 덮어쓰지 않고 다음 틱으로 넘긴다 — 시크릿이 죽은 상태에서
  // 만료 처리를 하면 멀쩡한 주문을 전부 실패로 만든다.
  if (pendingExpire.length) {
    if (sawSuccessfulLookup) {
      for (const paymentId of pendingExpire) {
        await markPayment(paymentId, {
          status: "failed",
          orderState: "FAILED",
          failureCode: "portone_order_never_created",
          failureMessage: "PortOne has no record of this payment. Treated as abandoned checkout.",
          failureStage: "reconcile_expire_unknown",
        });
        summary.expired += 1;
      }
    } else {
      summary.deferredExpire = pendingExpire.length;
      summary.credentialSuspect = true;
      console.error(`[CRON] payment reconcile: PortOne 조회가 한 건도 성공하지 않았다 — 자격증명 점검 필요. 만료 처리 ${pendingExpire.length}건을 보류한다.`);
    }
  }

  return summary;
}

// 크론 진입점. 절대 throw 하지 않는다(scheduled 의 다른 태스크를 함께 죽이지 않기 위해).
export async function runPaymentReconcileTask(env, options = {}) {
  const startedAt = Date.now();
  try {
    const result = await reconcilePendingPayments(env, options);
    console.log("[CRON] payment reconcile task completed", JSON.stringify({ ...result, durationMs: Date.now() - startedAt }));
    return result;
  } catch (error) {
    console.error("[CRON] payment reconcile task failed", String(error?.message || error));
    return { ok: false, error: String(error?.message || error) };
  }
}
