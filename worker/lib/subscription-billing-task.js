import { connectDb } from "./db.js";
import { Payment, PaymentFailureLog, User } from "./models.js";
import { chargePortOneBilling } from "./portone.js";

const CARD_SUBSCRIPTION_PLANS = {
  standard: { tier: "standard", name: "스탠다드 꿀", wonPrice: 9900, durationDays: 30 },
  premium: { tier: "premium", name: "프리미엄 꿀", wonPrice: 29900, durationDays: 30 },
  vvip: { tier: "vvip", name: "VVIP 꿀단지", wonPrice: 59000, durationDays: 30 },
};

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function resolvePlan(tierRaw) {
  const tier = String(tierRaw || "").trim().toLowerCase();
  return CARD_SUBSCRIPTION_PLANS[tier] || null;
}

function buildRecurringMerchantUid(userId, tier) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 7);
  return `subr_${Date.now()}_${tier}_${userTag}_${randomTag}`;
}

function createFailureMessage(error) {
  return String(error?.message || "Card recurring billing failed.").trim().slice(0, 500);
}

async function markRecurringFailure(user, reason, now) {
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "profileSubscription.tier": "free",
        "profileSubscription.source": "coin",
        "profileSubscription.expiresAt": now,
        "profileSubscription.cancelAtPeriodEnd": true,
        "profileSubscription.cancelRequestedAt": now,
        "profileSubscription.nextBillingAt": null,
        "profileSubscription.lastBillingStatus": "failed",
        "profileSubscription.lastBillingError": reason,
      },
    },
  );
}

export async function runCardSubscriptionBillingTask(env) {
  await connectDb(env);

  const now = new Date();
  const candidates = await User.find({
    "profileSubscription.source": "card",
    "profileSubscription.tier": { $in: ["standard", "premium", "vvip"] },
    "profileSubscription.expiresAt": { $ne: null, $lte: now },
    "profileSubscription.cancelAtPeriodEnd": { $ne: true },
    "profileSubscription.customerUid": { $exists: true, $ne: "" },
  })
    .select("name email profileSubscription")
    .limit(300)
    .lean();

  for (const user of candidates) {
    const tier = String(user?.profileSubscription?.tier || "").toLowerCase();
    const plan = resolvePlan(tier);
    if (!plan) continue;

    const customerUid = String(user?.profileSubscription?.customerUid || "").trim();
    if (!customerUid) continue;

    const merchantUid = buildRecurringMerchantUid(user._id, tier);

    try {
      const billed = await chargePortOneBilling(env, {
        customerUid,
        merchantUid,
        amount: plan.wonPrice,
        name: `${plan.name} 정기결제 갱신`,
        buyerName: String(user?.name || "회원").trim(),
        buyerEmail: String(user?.email || "").trim(),
        customData: {
          userId: String(user._id),
          tier,
          renewal: true,
        },
      });

      const billedStatus = String(billed?.status || "").toLowerCase();
      if (billedStatus !== "paid") {
        throw new Error(`Unexpected recurring billing status: ${billedStatus || "unknown"}`);
      }

      const paidAt = billed?.paid_at ? toDateFromUnixSeconds(billed.paid_at) : now;
      const currentExpiresAt = toValidDate(user?.profileSubscription?.expiresAt) || now;
      const nextExpiresAt = new Date(Math.max(currentExpiresAt.getTime(), paidAt.getTime()) + plan.durationDays * 86400000);

      await User.updateOne(
        { _id: user._id, "profileSubscription.source": "card" },
        {
          $set: {
            "profileSubscription.tier": tier,
            "profileSubscription.startedAt": paidAt,
            "profileSubscription.expiresAt": nextExpiresAt,
            "profileSubscription.nextBillingAt": nextExpiresAt,
            "profileSubscription.lastBillingAt": paidAt,
            "profileSubscription.lastBillingStatus": "success",
            "profileSubscription.lastBillingError": "",
          },
        },
      );

      await Payment.create({
        userId: user._id,
        impUid: String(billed?.imp_uid || "").trim() || undefined,
        merchantUid,
        paymentAmount: plan.wonPrice,
        expectedChargedPoints: 0,
        chargedPoints: 0,
        paymentMethod: String(billed?.pay_method || "card").trim() || "card",
        status: "success",
        paidAt,
        source: "system",
        paymentType: "subscription_recurring",
        subscriptionTier: tier,
        rawPortOne: billed,
      }).catch(() => {});
    } catch (error) {
      const reason = createFailureMessage(error);

      await markRecurringFailure(user, reason, now).catch(() => {});

      await Payment.create({
        userId: user._id,
        merchantUid,
        paymentAmount: plan.wonPrice,
        expectedChargedPoints: 0,
        chargedPoints: 0,
        paymentMethod: "card",
        status: "failed",
        source: "system",
        paymentType: "subscription_recurring",
        subscriptionTier: tier,
        failureCode: "subscription_recurring_failed",
        failureMessage: reason,
        failureStage: "subscription_rebill",
      }).catch(() => {});

      await PaymentFailureLog.create({
        userId: user._id,
        merchantUid,
        source: "system",
        stage: "subscription_rebill",
        code: "subscription_recurring_failed",
        message: reason,
        status: 402,
      }).catch(() => {});
    }
  }
}
