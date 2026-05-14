import { connectDb } from "../db.js";
import { PointHistory, User } from "../models.js";

const TX = Object.freeze({
  HOLD: "PDF_PURCHASE_HOLD",
  CAPTURE: "PDF_PURCHASE_CAPTURE",
  REFUND: "PDF_PURCHASE_REFUND",
});

function toAmount(value) {
  const amount = Math.floor(Number(value || 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
}

function makeHoldId(idempotencyKey) {
  const seed = String(idempotencyKey || "");
  if (!seed) return `hold_${Date.now()}`;
  const compact = Buffer.from(seed).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  return `hold_${compact || Date.now()}`;
}

async function findTx(userId, idempotencyKey, transactionType) {
  if (!userId || !idempotencyKey || !transactionType) return null;
  return PointHistory.findOne({
    userId,
    "metadata.idempotencyKey": String(idempotencyKey),
    "metadata.pdfTransactionType": String(transactionType),
  }).sort({ createdAt: -1 }).lean();
}

async function appendPointHistory(entry) {
  await PointHistory.create(entry);
}

export function createPremiumPdfPaymentManager({ env, logger = console, enabled = false } = {}) {
  const isEnabled = enabled === true;

  async function hold({ userId, featureKey, amount, idempotencyKey, jobId }) {
    const charged = toAmount(amount);
    if (!isEnabled) {
      return {
        ok: true,
        bypassed: true,
        holdId: makeHoldId(idempotencyKey),
        amount: charged,
      };
    }

    if (!userId) return { ok: false, code: "PDF_V2_HOLD_USER_REQUIRED", message: "userId가 필요합니다." };
    if (!idempotencyKey) return { ok: false, code: "PDF_V2_HOLD_IDEMPOTENCY_REQUIRED", message: "idempotencyKey가 필요합니다." };
    if (charged <= 0) return { ok: false, code: "PDF_V2_HOLD_AMOUNT_INVALID", message: "유효한 코인 금액이 필요합니다." };

    await connectDb(env);

    const captured = await findTx(userId, idempotencyKey, TX.CAPTURE);
    if (captured) {
      return {
        ok: true,
        idempotent: true,
        alreadyCaptured: true,
        holdId: String(captured?.metadata?.holdId || makeHoldId(idempotencyKey)),
      };
    }

    const existingHold = await findTx(userId, idempotencyKey, TX.HOLD);
    if (existingHold) {
      return {
        ok: true,
        idempotent: true,
        holdId: String(existingHold?.metadata?.holdId || makeHoldId(idempotencyKey)),
      };
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        points: { $gte: charged },
        recentConsumeRequestIds: { $ne: String(idempotencyKey) },
      },
      {
        $inc: { points: -charged },
        $push: {
          recentConsumeRequestIds: {
            $each: [String(idempotencyKey)],
            $slice: -200,
          },
        },
      },
      {
        new: true,
        projection: { points: 1, recentConsumeRequestIds: 1 },
      },
    ).lean();

    if (!updatedUser) {
      const user = await User.findById(userId).select("points recentConsumeRequestIds").lean();
      const duplicate = Array.isArray(user?.recentConsumeRequestIds)
        && user.recentConsumeRequestIds.includes(String(idempotencyKey));

      if (duplicate) {
        const duplicatedHold = await findTx(userId, idempotencyKey, TX.HOLD);
        if (duplicatedHold) {
          return {
            ok: true,
            idempotent: true,
            holdId: String(duplicatedHold?.metadata?.holdId || makeHoldId(idempotencyKey)),
          };
        }
      }

      if (Number(user?.points || 0) < charged) {
        return {
          ok: false,
          code: "INSUFFICIENT_COINS",
          message: "코인이 부족하여 PDF 생성을 시작할 수 없습니다.",
        };
      }

      return {
        ok: false,
        code: "PDF_V2_HOLD_CONFLICT",
        message: "코인 hold 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    const holdId = makeHoldId(idempotencyKey);
    await appendPointHistory({
      userId,
      kind: "deduct",
      delta: -charged,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "Premium PDF v2 hold",
      featureKey: String(featureKey || ""),
      metadata: {
        idempotencyKey: String(idempotencyKey),
        pdfTransactionType: TX.HOLD,
        holdId,
        jobId: String(jobId || ""),
        amount: charged,
      },
    });

    return { ok: true, holdId, amount: charged };
  }

  async function capture({ userId, featureKey, amount, idempotencyKey, holdId, jobId }) {
    const charged = toAmount(amount);
    if (!isEnabled) return { ok: true, bypassed: true, holdId: String(holdId || makeHoldId(idempotencyKey)) };

    await connectDb(env);

    const existingCapture = await findTx(userId, idempotencyKey, TX.CAPTURE);
    if (existingCapture) {
      return { ok: true, idempotent: true, holdId: String(existingCapture?.metadata?.holdId || holdId || "") };
    }

    const refunded = await findTx(userId, idempotencyKey, TX.REFUND);
    if (refunded) {
      return { ok: false, code: "PDF_V2_CAPTURE_AFTER_REFUND", message: "이미 환불된 hold는 확정할 수 없습니다." };
    }

    const existingHold = await findTx(userId, idempotencyKey, TX.HOLD);
    if (!existingHold) {
      return { ok: false, code: "PDF_V2_HOLD_NOT_FOUND", message: "확정할 hold가 존재하지 않습니다." };
    }

    const nowUser = await User.findById(userId).select("points").lean();
    await appendPointHistory({
      userId,
      kind: "adjust",
      delta: 0,
      balanceAfter: Number(nowUser?.points || 0),
      reason: "Premium PDF v2 capture",
      featureKey: String(featureKey || ""),
      metadata: {
        idempotencyKey: String(idempotencyKey),
        pdfTransactionType: TX.CAPTURE,
        holdId: String(holdId || existingHold?.metadata?.holdId || ""),
        jobId: String(jobId || ""),
        amount: charged || Math.abs(Number(existingHold?.delta || 0)),
      },
    });

    return { ok: true, holdId: String(holdId || existingHold?.metadata?.holdId || "") };
  }

  async function release({ userId, featureKey, amount, idempotencyKey, holdId, jobId }) {
    const requestedAmount = toAmount(amount);
    if (!isEnabled) return { ok: true, bypassed: true, holdId: String(holdId || makeHoldId(idempotencyKey)) };

    await connectDb(env);

    const existingRefund = await findTx(userId, idempotencyKey, TX.REFUND);
    if (existingRefund) {
      return { ok: true, idempotent: true, holdId: String(existingRefund?.metadata?.holdId || holdId || "") };
    }

    const existingCapture = await findTx(userId, idempotencyKey, TX.CAPTURE);
    if (existingCapture) {
      return {
        ok: true,
        skipped: true,
        reason: "already_captured",
        holdId: String(existingCapture?.metadata?.holdId || holdId || ""),
      };
    }

    const existingHold = await findTx(userId, idempotencyKey, TX.HOLD);
    if (!existingHold) {
      return { ok: true, skipped: true, reason: "hold_not_found", holdId: String(holdId || "") };
    }

    const refundAmount = requestedAmount || Math.abs(Number(existingHold?.delta || 0));
    if (refundAmount <= 0) {
      return { ok: true, skipped: true, reason: "refund_amount_zero", holdId: String(holdId || existingHold?.metadata?.holdId || "") };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: refundAmount } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return { ok: false, code: "PDF_V2_REFUND_USER_NOT_FOUND", message: "환불 대상 사용자를 찾을 수 없습니다." };
    }

    await appendPointHistory({
      userId,
      kind: "refund",
      delta: refundAmount,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "Premium PDF v2 refund",
      featureKey: String(featureKey || ""),
      metadata: {
        idempotencyKey: String(idempotencyKey),
        pdfTransactionType: TX.REFUND,
        holdId: String(holdId || existingHold?.metadata?.holdId || ""),
        jobId: String(jobId || ""),
        amount: refundAmount,
      },
    });

    return { ok: true, refunded: true, amount: refundAmount, holdId: String(holdId || existingHold?.metadata?.holdId || "") };
  }

  return {
    enabled: isEnabled,
    hold,
    capture,
    release,
    transactionTypes: TX,
    logger,
  };
}
