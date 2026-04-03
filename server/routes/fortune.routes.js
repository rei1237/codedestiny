const express = require("express");

const User = require("../models/User");
const PointHistory = require("../models/PointHistory");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;

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
    // 관리자는 테스트 목적으로 무제한 잔액을 반환한다 (실제 DB 값은 변경하지 않는다)
    if (req.auth?.role === "admin") {
      return res.status(200).json({
        message: "황금 돼지 코인 잔액을 불러왔습니다.",
        adminUnlocked: true,
        user: {
          id: String(req.auth.userId),
          points: 9_999_999,
        },
      });
    }

    const user = await User.findById(req.auth.userId)
      .select("points")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "황금 돼지 코인 잔액을 불러왔습니다.",
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
        message: "실제 결제 API 준비 중입니다. 현재는 황금 돼지 코인 충전이 비활성화되어 있습니다.",
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
      reason: "황금 돼지 코인 충전(결제 API 연동 전 시뮬레이션)",
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

    // 관리자는 코인을 차감하지 않고 즉시 성공 반환 (테스트 모드)
    if (req.auth?.role === "admin") {
      return res.status(200).json({
        message: `관리자 모드: ${cost.toLocaleString("ko-KR")} 코인 차감 없이 잠금 해제되었습니다.`,
        requiredCoins: cost,
        adminUnlocked: true,
        user: {
          id: String(req.auth.userId),
          points: 9_999_999,
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

    await PointHistory.create({
      userId: req.auth.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: {
        source: "fortune.pig-coin.consume",
      },
    });

    return res.status(200).json({
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/* ─────────────────────────────────────────────────────────────────
   프로필 구독 플랜
   coins:        구독 시 차감 코인 수
   welcomeBonus: 첫 구독 시 추가 지급 보너스 코인 (2안: 시작 패키지)
   profileLimit: 최대 프로필 수 (0 = 무제한)
   lowWarnAt:    이 코인 이하이면 잔액 부족 경고
───────────────────────────────────────────────────────────────── */
const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀",   coins: 115, welcomeBonus: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium:  { name: "프리미엄 꿀",   coins: 360, welcomeBonus: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip:     { name: "VVIP 꿀단지",   coins: 700, welcomeBonus: 700, profileLimit: 0, durationDays: 30, lowWarnAt: 100 },
};

/* GET /api/fortune/pig-coin/profile-subscription/status */
router.get("/pig-coin/profile-subscription/status", async (req, res, next) => {
  try {
    if (req.auth?.role === "admin") {
      return res.status(200).json({
        tier: "premium", isActive: true, expiresAt: null, profileLimit: 0, adminUnlocked: true,
      });
    }

    const user = await User.findById(req.auth.userId)
      .select("points profileSubscription")
      .lean();
    if (!user) return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });

    const sub    = user.profileSubscription || {};
    const tier   = sub.tier || "free";
    const expAt  = sub.expiresAt || null;
    const points = Number(user.points || 0);

    // 구독 유효성: 기간 기반 (2안 핵심 수정 — 코인 잔액 조건 제거)
    const isTimely = tier !== "free" && expAt && new Date(expAt) > new Date();
    const isActive = !!isTimely;

    const plan             = PROFILE_SUB_PLANS[tier];
    const effectiveTier    = isActive ? tier : "free";
    const profileLimit     = isActive ? (plan?.profileLimit ?? 1) : 1;
    // 잔액 부족 사전 경고 (구독 활성 상태에서 일정 코인 이하)
    const lowBalanceWarning = isActive && points <= (plan?.lowWarnAt ?? 30);
    // 첫 구독 보너스 수령 가능 여부
    const welcomeBonusEligible = !sub.firstSubAt;

    return res.status(200).json({
      tier:                effectiveTier,
      isActive:            !!isActive,
      expiresAt:           expAt ? new Date(expAt).toISOString() : null,
      profileLimit,
      points,
      lowBalanceWarning:   !!lowBalanceWarning,
      welcomeBonusEligible: !!welcomeBonusEligible,
    });
  } catch (error) {
    return next(error);
  }
});

/* POST /api/fortune/pig-coin/profile-subscription/subscribe
   body: { tier: 'standard' | 'premium' | 'vvip' }
   2안: 첫 구독 시 welcomeBonus 코인 추가 지급
*/
router.post("/pig-coin/profile-subscription/subscribe", async (req, res, next) => {
  try {
    const reqTier = String(req.body?.tier || "").trim();
    const plan = PROFILE_SUB_PLANS[reqTier];
    if (!plan) {
      return res.status(400).json({ message: "지원하지 않는 구독 플랜입니다." });
    }

    if (req.auth?.role === "admin") {
      return res.status(200).json({
        message: `관리자 모드: ${plan.name} 구독 (코인 차감 없음)`,
        adminUnlocked: true,
        welcomeBonusGranted: false,
        subscription: { tier: reqTier, isActive: true, expiresAt: null, profileLimit: plan.profileLimit },
        user: { points: 9_999_999 },
      });
    }

    const cost    = plan.coins;
    const now     = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // 현재 구독 상태 확인 (첫 구독 보너스 판단용)
    const existingUser = await User.findById(req.auth.userId)
      .select("points profileSubscription")
      .lean();

    if (!existingUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const isFirstSub = !existingUser.profileSubscription?.firstSubAt;
    const bonus = isFirstSub ? Number(plan.welcomeBonus || 0) : 0;
    // 차감 후 보너스를 더하면 순 코인 변화 = bonus - cost
    const netDelta = bonus - cost;

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.auth.userId, points: { $gte: cost } },
      {
        $inc: { points: netDelta },
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

    // 구독료 차감 이력
    await PointHistory.create({
      userId:       req.auth.userId,
      kind:         "deduct",
      delta:        -cost,
      balanceAfter: isFirstSub ? balanceAfter - bonus : balanceAfter,
      reason:       `프로필 ${plan.name} 구독`,
      featureKey:   "profile-subscription",
      metadata:     { tier: reqTier, expiresAt: expiresAt.toISOString() },
    });

    // 첫 구독 시작 보너스 지급 이력
    if (isFirstSub && bonus > 0) {
      await PointHistory.create({
        userId:       req.auth.userId,
        kind:         "charge",
        delta:        bonus,
        balanceAfter: balanceAfter,
        reason:       `${plan.name} 첫 구독 시작 보너스`,
        featureKey:   "profile-subscription-welcome-bonus",
        metadata:     { tier: reqTier, welcomeBonus: bonus },
      });
    }

    const planMsg = isFirstSub && bonus > 0
      ? `${plan.name} 구독이 시작되었습니다! 🎁 첫 구독 보너스 ${bonus.toLocaleString("ko-KR")}코인이 추가 지급되었어요.`
      : `${plan.name} 구독이 시작되었습니다. (30일간 유효)`;

    return res.status(200).json({
      message: planMsg,
      welcomeBonusGranted: isFirstSub && bonus > 0,
      welcomeBonus: bonus,
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
