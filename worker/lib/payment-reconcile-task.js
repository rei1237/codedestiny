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
import { fetchPortOnePayment, getPortOneAuthRejection } from "./portone.js";
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

function isNotFoundLookupError(error) {
  return /PAYMENT_NOT_FOUND|not found/i.test(String(error?.message || ""));
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
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean());

  summary.scanned = candidates.length;
  const reclaimCutoff = new Date(now - RECLAIM_AFTER_MS);

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
    } catch (error) {
      // 🔴 자격증명이 거절된 상태라면 남은 주문을 전부 오분류할 수 있다 — 즉시 중단한다.
      if (getPortOneAuthRejection()) {
        summary.ok = false;
        summary.abortedReason = "PORTONE_AUTH_REJECTED";
        console.error("[CRON] payment reconcile aborted: PortOne credential rejected");
        break;
      }
      if (isNotFoundLookupError(error) && (now - new Date(candidate.createdAt).getTime()) > expireUnknownAfterMs) {
        // PortOne 에 결제가 없다 = 결제창조차 열지 않은 주문. 오래됐으면 만료 처리한다.
        await markPayment(candidate._id, {
          status: "failed",
          orderState: "FAILED",
          failureCode: "portone_order_never_created",
          failureMessage: "PortOne has no record of this payment. Treated as abandoned checkout.",
          failureStage: "reconcile_expire_unknown",
        });
        summary.expired += 1;
        continue;
      }
      summary.failed += 1;
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
