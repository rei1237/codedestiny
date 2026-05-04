const express = require("express");

const User = require("../models/User");
const PointHistory = require("../models/PointHistory");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;
const VALID_SUB_TIERS = new Set(["standard", "premium", "vvip"]);

const PIG_COIN_PACKAGES = {
  sample: {
    name: "맛보기 한 줌",
    coins: 30,
    bonus: 0,
  },
  luckyMeal: {
    name: "행운의 한 끼",
    coins: 100,
    bonus: 15,
  },
  goldBarn: {
    name: "황금 돼지 곳간",
    coins: 300,
    bonus: 60,
  },
  goldVault: {
    name: "황금 돼지 금고",
    coins: 700,
    bonus: 180,
  },
  emperorReserve: {
    name: "황금 돼지 제왕 보물고",
    coins: 1500,
    bonus: 500,
  },
};

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀", coins: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium: { name: "프리미엄 꿀", coins: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip: { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};

function normalizeSubscriptionTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  return VALID_SUB_TIERS.has(tier) ? tier : null;
}

function getPlanPolicy(tier) {
  const plan = PROFILE_SUB_PLANS[tier] || null;
  if (!plan) {
    return {
      tier: "free",
      freeLimit: 0,
      profileLimit: 1,
      recommendedCoins: 0,
    };
  }

  return {
    tier,
    freeLimit: Number(plan.lowWarnAt || 0),
    profileLimit: Number(plan.profileLimit || 1),
    recommendedCoins: Number(plan.coins || 0),
  };
}

function resolveEffectiveActiveTier(user) {
  const tier = normalizeSubscriptionTier(user?.profileSubscription?.tier);
  if (!tier) return null;

  const expAtRaw = user?.profileSubscription?.expiresAt;
  if (!expAtRaw) return null;

  const expAt = new Date(expAtRaw);
  if (!Number.isFinite(expAt.getTime())) return null;

  return expAt.getTime() > Date.now() ? tier : null;
}

router.use(requireAuth);

router.get("/check", async (req, res) => {
  return res.status(200).json({
    message: "사주 풀이는 현재 무료로 제공됩니다.",
    requiredPoints: 0,
    currentPoints: null,
    isFree: true,
  });
});

router.post("/consume", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("points")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "사주 풀이는 현재 무료라 코인이 차감되지 않습니다.",
      requiredPoints: 0,
      isFree: true,
      user: {
        id: String(req.auth.userId),
        points: Number(user.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/pig-coin/balance", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("points")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "꽃돼지 코인 잔액을 불러왔습니다.",
      user: {
        id: String(req.auth.userId),
        points: Number(user.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/pig-coin/charge-simulate", async (req, res, next) => {
  try {
    if (process.env.PIG_COIN_PAYMENT_API_READY !== "true") {
      return res.status(503).json({
        message: "실제 결제 API 준비 중입니다. 현재는 꽃돼지 코인 충전이 비활성화되어 있습니다.",
        code: "PIG_COIN_CHARGE_DISABLED",
      });
    }

    const packageId = String(req.body?.packageId || "").trim();
    const pkg = PIG_COIN_PACKAGES[packageId];

    if (!pkg) {
      return res.status(400).json({ message: "지원하지 않는 충전 패키지입니다." });
    }

    const delta = Number(pkg.coins || 0) + Number(pkg.bonus || 0);
    if (!Number.isFinite(delta) || delta <= 0) {
      return res.status(400).json({ message: "유효하지 않은 충전 코인 수량입니다." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.auth.userId,
      { $inc: { points: delta } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    await PointHistory.create({
      userId: req.auth.userId,
      kind: "charge",
      delta,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "꽃돼지 코인 충전(결제 API 연동 전 시뮬레이션)",
      featureKey: "pig-coin-charge",
      metadata: {
        source: "fortune.pig-coin.charge-simulate",
        packageId,
        packageName: pkg.name,
        baseCoins: Number(pkg.coins || 0),
        bonusCoins: Number(pkg.bonus || 0),
      },
    });

    return res.status(200).json({
      message: `${delta.toLocaleString("ko-KR")} 코인이 충전되었습니다.`,
      package: {
        id: packageId,
        name: pkg.name,
        coins: Number(pkg.coins || 0),
        bonus: Number(pkg.bonus || 0),
      },
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/pig-coin/consume", async (req, res, next) => {
  try {
    const adminTestTier = req.auth?.role === "admin"
      ? normalizeSubscriptionTier(req.headers["x-admin-subscription-tier"])
      : null;
    const requestedCost = Number(req.body?.cost);
    const cost = Number.isFinite(requestedCost) && requestedCost > 0
      ? Math.floor(requestedCost)
      : PIG_COIN_DEFAULT_UNLOCK_COST;

    if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
      return res.status(400).json({ message: "유효하지 않은 코인 차감 수량입니다." });
    }

    const reason = String(req.body?.reason || "유료 섹션 잠금 해제")
      .trim()
      .slice(0, 120);
    const featureKey = String(req.body?.featureKey || "pig-coin-unlock")
      .trim()
      .slice(0, 60);
    const requestId = String(req.body?.requestId || "")
      .trim()
      .slice(0, 120);
    const forceDeduct = req.body?.forceDeduct === true || String(req.body?.forceDeduct || "").toLowerCase() === "true";

    if (req.auth?.role === "admin") {
      const simulatedPolicy = getPlanPolicy(adminTestTier);
      const user = await User.findById(req.auth.userId)
        .select("points")
        .lean();

      return res.status(200).json({
        message: "관리자 우회가 적용되어 코인이 차감되지 않았습니다.",
        requiredCoins: cost,
        chargedCoins: 0,
        simulatedChargeCoins: 0,
        adminBypass: true,
        adminMode: true,
        simulated: true,
        adminTestTier: adminTestTier || null,
        freeLimit: simulatedPolicy.freeLimit,
        profileLimit: simulatedPolicy.profileLimit,
        recommendedCoins: simulatedPolicy.recommendedCoins,
        freeBySubscription: Boolean(adminTestTier && !forceDeduct && cost <= simulatedPolicy.freeLimit),
        user: {
          id: String(req.auth.userId),
          points: Number(user?.points || 0),
        },
      });
    }

    const user = await User.findById(req.auth.userId)
      .select("points profileSubscription")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const effectiveTier = resolveEffectiveActiveTier(user);
    const policy = getPlanPolicy(effectiveTier);
    const isIncludedBySubscription = Boolean(!forceDeduct && effectiveTier && cost <= policy.freeLimit);

    if (isIncludedBySubscription) {
      return res.status(200).json({
        message: "활성 구독 혜택에 포함되어 코인이 차감되지 않았습니다.",
        requiredCoins: cost,
        chargedCoins: 0,
        freeBySubscription: true,
        subscriptionTier: effectiveTier,
        freeLimit: policy.freeLimit,
        profileLimit: policy.profileLimit,
        recommendedCoins: policy.recommendedCoins,
        user: {
          id: String(req.auth.userId),
          points: Number(user.points || 0),
        },
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.auth.userId,
        points: { $gte: cost },
      },
      {
        $inc: { points: -cost },
      },
      {
        new: true,
        projection: { points: 1 },
      },
    ).lean();

    if (!updatedUser) {
      return res.status(402).json({
        message: "코인이 부족합니다.",
        requiredCoins: cost,
      });
    }

    const history = await PointHistory.create({
      userId: req.auth.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: {
        source: "fortune.pig-coin.consume",
        ...(requestId ? { requestId } : {}),
        subscriptionTierAtConsume: effectiveTier || "free",
      },
    });

    return res.status(200).json({
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
      chargedCoins: cost,
      freeBySubscription: false,
      subscriptionTier: effectiveTier || "free",
      freeLimit: policy.freeLimit,
      profileLimit: policy.profileLimit,
      recommendedCoins: policy.recommendedCoins,
      transactionId: String(history?._id || ""),
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

router.post("/pig-coin/refund", async (req, res, next) => {
  try {
    const requestedCost = Number(req.body?.cost);
    const cost = Number.isFinite(requestedCost) && requestedCost > 0
      ? Math.floor(requestedCost)
      : PIG_COIN_DEFAULT_UNLOCK_COST;

    if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
      return res.status(400).json({ message: "유효하지 않은 코인 환급 수량입니다." });
    }

    const reason = String(req.body?.reason || "프리미엄 생성 실패 자동 환급")
      .trim()
      .slice(0, 120);
    const featureKey = String(req.body?.featureKey || "pig-coin-unlock")
      .trim()
      .slice(0, 60);
    const sourceTransactionId = String(req.body?.sourceTransactionId || "").trim();
    const requestId = String(req.body?.requestId || "").trim().slice(0, 120);
    const recentWindow = new Date(Date.now() - 1000 * 60 * 60 * 48);

    if (requestId) {
      const alreadyByRequest = await PointHistory.findOne({
        userId: req.auth.userId,
        kind: "refund",
        "metadata.requestId": requestId,
      }).lean();

      if (alreadyByRequest) {
        const user = await User.findById(req.auth.userId).select("points").lean();
        return res.status(200).json({
          message: "이미 환급 처리된 요청입니다.",
          alreadyRefunded: true,
          refundTransactionId: String(alreadyByRequest._id || ""),
          user: {
            id: String(req.auth.userId),
            points: Number(user?.points || 0),
          },
        });
      }
    }

    const deductQuery = {
      userId: req.auth.userId,
      kind: "deduct",
      delta: -cost,
      featureKey,
      createdAt: { $gte: recentWindow },
    };

    if (isObjectIdLike(sourceTransactionId)) {
      deductQuery._id = sourceTransactionId;
    }

    const deducted = await PointHistory.findOne(deductQuery)
      .sort({ createdAt: -1 })
      .lean();

    if (!deducted) {
      return res.status(409).json({
        message: "환급 가능한 차감 내역을 찾지 못했습니다.",
        code: "NO_REFUNDABLE_DEDUCTION",
      });
    }

    const alreadyRefunded = await PointHistory.findOne({
      userId: req.auth.userId,
      kind: "refund",
      "metadata.refundForPointHistoryId": String(deducted._id),
    }).lean();

    if (alreadyRefunded) {
      const user = await User.findById(req.auth.userId).select("points").lean();
      return res.status(200).json({
        message: "이미 환급 처리된 차감 건입니다.",
        alreadyRefunded: true,
        refundTransactionId: String(alreadyRefunded._id || ""),
        user: {
          id: String(req.auth.userId),
          points: Number(user?.points || 0),
        },
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.auth.userId,
      { $inc: { points: cost } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const refundHistory = await PointHistory.create({
      userId: req.auth.userId,
      kind: "refund",
      delta: cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: {
        source: "fortune.pig-coin.refund",
        requestId,
        refundForPointHistoryId: String(deducted._id),
        sourceTransactionId: String(deducted._id),
      },
    });

    return res.status(200).json({
      message: `${cost.toLocaleString("ko-KR")} 코인이 환급되었습니다.`,
      refundedCoins: cost,
      sourceTransactionId: String(deducted._id),
      refundTransactionId: String(refundHistory?._id || ""),
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/* GET /api/fortune/pig-coin/profile-subscription/status */
router.get("/pig-coin/profile-subscription/status", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("points profileSubscription has_started_paid_service first_service_access_date")
      .lean();
    if (!user) return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });

    const sub    = user.profileSubscription || {};
    const tier   = sub.tier || "free";
    const expAt  = sub.expiresAt || null;
    const points = Number(user.points || 0);

    const plan = PROFILE_SUB_PLANS[tier];
    const now  = new Date();

    // 만료 여부 확인
    let effectiveTier = "free";
    let effectiveExpAt = expAt ? new Date(expAt) : null;
    let autoRenewed = false;

    if (tier !== "free" && effectiveExpAt) {
      if (effectiveExpAt > now) {
        // 구독 활성
        effectiveTier = tier;
      } else if (plan && points >= plan.coins) {
        // 만료됐지만 코인 충분 → 자동 갱신
        const newExpAt = new Date(Math.max(effectiveExpAt.getTime(), now.getTime()) + plan.durationDays * 24 * 60 * 60 * 1000);
        const updatedUser2 = await User.findOneAndUpdate(
          { _id: req.auth.userId, points: { $gte: plan.coins } },
          {
            $inc: { points: -plan.coins },
            $set: {
              "profileSubscription.expiresAt": newExpAt,
              "profileSubscription.startedAt": now,
            },
          },
          { new: true, projection: { points: 1 } },
        ).lean();
        if (updatedUser2) {
          effectiveTier  = tier;
          effectiveExpAt = newExpAt;
          autoRenewed    = true;
          await PointHistory.create({
            userId:       req.auth.userId,
            kind:         "deduct",
            delta:        -plan.coins,
            balanceAfter: Number(updatedUser2.points || 0),
            reason:       `${plan.name} 구독 자동 갱신`,
            featureKey:   "profile-subscription-auto-renew",
            metadata:     { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
          }).catch(() => {});
        }
      }
    }

    const isActive = effectiveTier !== "free";
    const profileLimit = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
    const lowBalanceWarning = isActive && points <= (PROFILE_SUB_PLANS[effectiveTier]?.lowWarnAt ?? 30);

    const adminTestTier = req.auth?.role === "admin"
      ? normalizeSubscriptionTier(req.headers["x-admin-subscription-tier"])
      : null;

    if (adminTestTier) {
      const simulatedPolicy = getPlanPolicy(adminTestTier);
      return res.status(200).json({
        tier:              adminTestTier,
        isActive:          true,
        expiresAt:         effectiveExpAt ? effectiveExpAt.toISOString() : null,
        profileLimit:      simulatedPolicy.profileLimit,
        points,
        lowBalanceWarning: points <= simulatedPolicy.freeLimit,
        autoRenewed:       false,
        hasStartedPaidService: !!user.has_started_paid_service,
        firstServiceAccessDate: user.first_service_access_date ? new Date(user.first_service_access_date).toISOString() : null,
        adminMode:         true,
        simulated:         true,
        adminTestTier,
        freeLimit:         simulatedPolicy.freeLimit,
        recommendedCoins:  simulatedPolicy.recommendedCoins,
      });
    }

    const policy = getPlanPolicy(isActive ? effectiveTier : null);

    return res.status(200).json({
      tier:              effectiveTier,
      isActive:          !!isActive,
      expiresAt:         effectiveExpAt ? effectiveExpAt.toISOString() : null,
      profileLimit,
      points,
      lowBalanceWarning: !!lowBalanceWarning,
      autoRenewed:       !!autoRenewed,
      hasStartedPaidService: !!user.has_started_paid_service,
      firstServiceAccessDate: user.first_service_access_date ? new Date(user.first_service_access_date).toISOString() : null,
      adminMode:         req.auth?.role === "admin",
      simulated:         false,
      adminTestTier:     null,
      freeLimit:         policy.freeLimit,
      recommendedCoins:  policy.recommendedCoins,
    });
  } catch (error) {
    return next(error);
  }
});

/* POST /api/fortune/pig-coin/profile-subscription/start-service
   body: { action?: string, contentTitle?: string, legalVersion?: string }
   - 멤버십 전용 콘텐츠 열람 전 확인 팝업 [확인] 동의 및 서비스 개시 기록
*/
router.post("/pig-coin/profile-subscription/start-service", async (req, res, next) => {
  try {
    const action = String(req.body?.action || "membership-content")
      .trim()
      .slice(0, 80);
    const contentTitle = String(req.body?.contentTitle || "멤버십 전용 콘텐츠")
      .trim()
      .slice(0, 120);
    const legalVersion = String(req.body?.legalVersion || "2026-04-11")
      .trim()
      .slice(0, 20);

    const now = new Date();
    const user = await User.findById(req.auth.userId)
      .select("profileSubscription has_started_paid_service first_service_access_date points")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const tier = String(user.profileSubscription?.tier || "free");
    if (tier === "free") {
      return res.status(403).json({ message: "구독 사용자만 이용할 수 있습니다." });
    }

    const alreadyStarted = !!user.has_started_paid_service;
    let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

    if (!alreadyStarted) {
      const updated = await User.findOneAndUpdate(
        { _id: req.auth.userId, has_started_paid_service: { $ne: true } },
        {
          $set: {
            has_started_paid_service: true,
            first_service_access_date: now,
          },
        },
        { new: true, projection: { points: 1, first_service_access_date: 1 } },
      ).lean();

      if (updated?.first_service_access_date) {
        startedAt = new Date(updated.first_service_access_date);
      }
    }

    await PointHistory.create({
      userId: req.auth.userId,
      kind: "adjust",
      delta: 0,
      balanceAfter: Number(user.points || 0),
      reason: "멤버십 전용 콘텐츠 열람 동의 및 서비스 개시 기록",
      featureKey: "profile-subscription-service-start",
      metadata: {
        action,
        contentTitle,
        legalVersion,
        acknowledgedAt: now.toISOString(),
      },
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      started: true,
      alreadyStarted,
      hasStartedPaidService: true,
      firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

/* POST /api/fortune/pig-coin/share-reward
   body: { contentId: string }
   — 카카오톡 공유 보상: 하루 3회 한도, 같은 콘텐츠 중복 불가, 10코인 지급
*/
const SHARE_REWARD_AMOUNT      = 10;
const SHARE_REWARD_DAILY_LIMIT = 3;

router.post("/pig-coin/share-reward", async (req, res, next) => {
  try {
    const contentId = String(req.body?.contentId || "default")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 40) || "default";

    // KST 오늘 0시 계산 (UTC+9)
    const now = new Date();
    const kstMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0,
      ) - 9 * 3600 * 1000,
    );

    // 오늘 이미 받은 보상 횟수
    const todayCount = await PointHistory.countDocuments({
      userId: req.auth.userId,
      kind:   "share_reward",
      createdAt: { $gte: kstMidnight },
    });

    if (todayCount >= SHARE_REWARD_DAILY_LIMIT) {
      return res.status(429).json({
        message: "오늘 공유 보상은 모두 받았어요.",
        code: "DAILY_LIMIT_EXCEEDED",
        usedToday: todayCount,
        limitPerDay: SHARE_REWARD_DAILY_LIMIT,
      });
    }

    // 같은 contentId 오늘 이미 보상 받았는지
    const contentDup = await PointHistory.countDocuments({
      userId:              req.auth.userId,
      kind:                "share_reward",
      "metadata.contentId": contentId,
      createdAt:           { $gte: kstMidnight },
    });

    if (contentDup > 0) {
      return res.status(409).json({
        message: "이미 오늘 공유한 콘텐츠예요.",
        code: "CONTENT_ALREADY_REWARDED",
        usedToday: todayCount,
        limitPerDay: SHARE_REWARD_DAILY_LIMIT,
      });
    }

    // 코인 지급
    const updatedUser = await User.findByIdAndUpdate(
      req.auth.userId,
      { $inc: { points: SHARE_REWARD_AMOUNT } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    await PointHistory.create({
      userId:       req.auth.userId,
      kind:         "share_reward",
      delta:        SHARE_REWARD_AMOUNT,
      balanceAfter: Number(updatedUser.points || 0),
      reason:       `카카오톡 공유 보상 — ${contentId}`,
      featureKey:   "share-reward",
      metadata: {
        source:    "fortune.pig-coin.share-reward",
        contentId,
      },
    });

    return res.status(200).json({
      message:      `공유 보상으로 ${SHARE_REWARD_AMOUNT}코인을 드렸어요! 🐷`,
      reward:       SHARE_REWARD_AMOUNT,
      usedToday:    todayCount + 1,
      limitPerDay:  SHARE_REWARD_DAILY_LIMIT,
      user: {
        id:     String(req.auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/* POST /api/fortune/pig-coin/profile-subscription/subscribe
   body: { tier: 'standard' | 'premium' | 'vvip' }
   코인 차감으로 구독 활성화 (30일). 코인 잔액이 충분하면 만료 시 자동 갱신됨.
*/
router.post("/pig-coin/profile-subscription/subscribe", async (req, res, next) => {
  try {
    const reqTier = String(req.body?.tier || "").trim();
    const plan = PROFILE_SUB_PLANS[reqTier];
    if (!plan) {
      return res.status(400).json({ message: "지원하지 않는 구독 플랜입니다." });
    }

    const cost = plan.coins;
    const now  = new Date();

    // 현재 구독 만료일 확인 (갱신 시 남은 기간에서 이어서 연장)
    const existingUser = await User.findById(req.auth.userId)
      .select("points profileSubscription")
      .lean();

    if (!existingUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const prevExpAt = existingUser.profileSubscription?.expiresAt;
    const baseTime  = (prevExpAt && new Date(prevExpAt) > now)
      ? new Date(prevExpAt).getTime()
      : now.getTime();
    const expiresAt = new Date(baseTime + plan.durationDays * 24 * 60 * 60 * 1000);

    const isFirstSub = !existingUser.profileSubscription?.firstSubAt;

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.auth.userId, points: { $gte: cost } },
      {
        $inc: { points: -cost },
        $set: {
          "profileSubscription.tier":       reqTier,
          "profileSubscription.startedAt":  now,
          "profileSubscription.expiresAt":  expiresAt,
          ...(isFirstSub && { "profileSubscription.firstSubAt": now }),
        },
      },
      { new: true, projection: { points: 1, profileSubscription: 1 } },
    ).lean();

    if (!updatedUser) {
      return res.status(402).json({ message: "코인이 부족합니다.", requiredCoins: cost });
    }

    const balanceAfter = Number(updatedUser.points || 0);

    await PointHistory.create({
      userId:       req.auth.userId,
      kind:         "deduct",
      delta:        -cost,
      balanceAfter: balanceAfter,
      reason:       `프로필 ${plan.name} 구독`,
      featureKey:   "profile-subscription",
      metadata:     { tier: reqTier, expiresAt: expiresAt.toISOString() },
    });

    return res.status(200).json({
      message: `${plan.name} 구독이 시작되었습니다. (30일간 유효)`,
      subscription: {
        tier:         reqTier,
        isActive:     true,
        expiresAt:    expiresAt.toISOString(),
        profileLimit: plan.profileLimit,
      },
      user: { points: balanceAfter },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
