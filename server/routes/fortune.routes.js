const express = require("express");

const User = require("../models/User");
const PointHistory = require("../models/PointHistory");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;
const VALID_SUB_TIERS = new Set(["standard", "premium", "vvip"]);

const COIN_GATE_PER_USE_REASON_COSTS = Object.freeze({
  "애니멀 토템 리딩": 30,
  "인생의 책 생성 (13챕터)": 490,
  "시빌라 도미네이터 리포트": 100,
  "점성술 셜럭 시나스트리 궁합": 50,
  "점성술 직접 입력 시나스트리 궁합": 50,
  "자미두수 궁합 분석": 50,
  "사주 궁합 분석": 50,
  "숙요점 유명인 궁합": 50,
  "숙요점 궁합 분석": 50,
});

const FEATURE_KEY_REASON_COSTS = Object.freeze({
  "yoga-guru-per-use": Object.freeze({
    "openYogaGuru 30분 코스": 30,
    "openYogaGuru 60분 코스": 50,
  }),
});

const FEATURE_KEY_PRICE_TABLE = Object.freeze({
  "tarot-year-fortune": { cost: 100, amountKRW: 10000, reason: "십이지신 천운 타로" },
  "tarot-love-relationship": { cost: 50, reason: "우리는 무슨 사이? 타로 리딩" },
  "tarot-reunion-reading": { cost: 50, reason: "재회운 타로 리딩" },
  "tarot-mindscan": { cost: 50, reason: "마인드 스캔 타로 리딩" },
  "tarot-celestial-harmony": { cost: 100, reason: "셀레스티얼 하모니 타로 리딩" },
  "tarot-crystal-soul-reading": { cost: 50, reason: "크리스탈 소울 타로 리딩" },
  "tarot-ijik": { cost: 50, reason: "이직 타로 리딩" },
  "fortune-fish-gacha": { cost: 5, reason: "포춘텔러 피쉬 행운 가챠" },
  "royal-tea-oracle": { cost: 50, reason: "영국 홍차점 리딩" },
  "yoga-guru-per-use": { cost: 30, reason: "요가 구루 30분 코스" },
  "vedic-compatibility-per-use": { cost: 50, reason: "베다점 궁합 분석" },
  openJuyukModal: { cost: 30, reason: "주역 거북점 리딩" },
  openKemetModal: { cost: 30, reason: "이집트 신탁 리딩" },
  openGeomancyOracle: { cost: 50, reason: "지오맨시 오라클 리딩" },
  loveSimulation: { cost: 100, reason: "LOVE CODE 사주 연애 시뮬레이션" },
  turtleIChing: { cost: 30, reason: "주역 거북점 리딩" },
  egyptOracle: { cost: 30, reason: "이집트 신탁 리딩" },
  geomancy: { cost: 50, reason: "지오맨시 오라클 리딩" },
  stonehengeRunes: { cost: 50, reason: "스톤헨지 룬 리딩" },
  premiumTarot: { cost: 100, reason: "프리미엄 타로 리딩" },
  "palm-reading-general": { cost: 50, reason: "손금 전체운 분석" },
  "palm-reading-love": { cost: 30, reason: "손금 연애운 분석" },
  "palm-reading-wealth": { cost: 30, reason: "손금 재물운 분석" },
  "palm-reading-career": { cost: 30, reason: "손금 직업운 분석" },
  "palm-reading-personality": { cost: 30, reason: "손금 성격 분석" },
  "palm-reading-relationship": { cost: 30, reason: "손금 관계 패턴 분석" },
  "premium-love-secret-solo": { cost: 300, reason: "사주 프리미엄 연애운 리포트 생성" },
  "premium-love-secret-couple": { cost: 500, reason: "사주 프리미엄 궁합 리포트 생성" },
  "saju_ai_prompt_generator": { cost: 100, reason: "사주 AI 질문 프롬프트 생성" },
  "ziwei_ai_prompt_generator": { cost: 100, reason: "자미두수 AI 질문 프롬프트 생성" },
  "sukuyo_ai_prompt_generator": { cost: 100, reason: "숙요점 AI 질문 프롬프트 생성" },
  "astrology_ai_prompt_generator": { cost: 100, reason: "점성술 AI 질문 프롬프트 생성" },
  "vedic_ai_prompt_generator": { cost: 100, reason: "베다 점성술 AI 질문 프롬프트 생성" },
  "premium-sukuyo-compat-extra": { cost: 300, reason: "숙요점 궁합 확장 분석 추가" },
  "premium-veda-compatibility-addon": { cost: 300, reason: "프리미엄 베다점 궁합 확장 분석 추가" },
});

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

const PIG_COIN_UNLOCK_PRODUCTS = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "대운 섹션 해금" },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "요약 섹션 해금" },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "궁합 섹션 해금" },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "운명의 꽃 아틀리에 전체 해금" },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "올림푸스 신탁 해금" },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "사주 풀패키지 해금" },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 50, reason: "RPG 캐릭터 해금" },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 100, reason: "여행 운세 해금" },
  "unlock.health_report": { featureKey: "healthReport", cost: 100, reason: "건강 리포트 해금" },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 200, reason: "사주 일기 해금" },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 100, reason: "시크릿 하우스 해금" },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "프리미엄 점술팩 해금" },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 500, reason: "자미두수 프리미엄 해금" },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "점성술 프리미엄 해금" },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "숙요점 프리미엄 해금" },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "베다 프리미엄 해금" },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "작명 프리미엄 해금" },
});

function resolveUnlockProductSpec(productId) {
  const id = String(productId || "").trim().toLowerCase();
  if (!id) return null;
  return PIG_COIN_UNLOCK_PRODUCTS[id] || null;
}

const UNLOCK_PRODUCT_BY_FEATURE_KEY = Object.freeze(
  Object.values(PIG_COIN_UNLOCK_PRODUCTS).reduce((acc, spec) => {
    const key = String(spec?.featureKey || "").trim();
    if (key && !acc[key]) acc[key] = spec;
    return acc;
  }, Object.create(null)),
);

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isProductionRuntime() {
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(process.env.APP_ENV || process.env.DEPLOY_ENV || process.env.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function isDynamicCostFallbackEnabled() {
  return !isProductionRuntime() && isTruthyFlag(process.env.ALLOW_DYNAMIC_PIG_COIN_COST_FALLBACK);
}

function listServerPricedFeatureKeys() {
  const keys = new Set([
    "coin-gate-per-use",
    ...Object.keys(FEATURE_KEY_PRICE_TABLE),
    ...Object.keys(UNLOCK_PRODUCT_BY_FEATURE_KEY),
  ]);
  return Array.from(keys).sort();
}

function resolveFeatureReasonCost(featureKey, reason) {
  const key = String(featureKey || "").trim();
  const reasonText = String(reason || "").trim();
  if (!key || !reasonText) return null;

  const table = FEATURE_KEY_REASON_COSTS[key] || null;
  if (!table) return null;

  const matched = Number(table[reasonText]);
  if (!Number.isFinite(matched) || matched <= 0) return null;
  return matched;
}

function resolveServerCoinPricing({ productSpec, requestedCost, featureKey, reason }) {
  if (productSpec) {
    return {
      ok: true,
      cost: Number(productSpec.cost),
      reason: String(productSpec.reason || reason || "유료 기능 잠금 해제"),
      pricingSource: "product-id",
    };
  }

  const key = String(featureKey || "").trim();
  const reasonText = String(reason || "").trim();
  const requestCost = Number(requestedCost);

  if (key === "coin-gate-per-use") {
    const serverCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(serverCost) && serverCost > 0) {
      return {
        ok: true,
        cost: serverCost,
        reason: reasonText,
        pricingSource: "coin-gate-reason",
      };
    }

    if (isDynamicCostFallbackEnabled() && Number.isFinite(requestCost) && requestCost > 0) {
      return {
        ok: true,
        cost: requestCost,
        reason: reasonText || "Coin gate per-use",
        pricingSource: "dynamic-fallback",
      };
    }

    return {
      ok: false,
      status: 403,
      code: "SERVER_PRICE_REQUIRED",
      message: "coin-gate-per-use 기능의 서버 가격표가 누락되었습니다.",
    };
  }

  const reasonCost = resolveFeatureReasonCost(key, reasonText);
  if (Number.isFinite(reasonCost) && reasonCost > 0) {
    return {
      ok: true,
      cost: reasonCost,
      reason: reasonText,
      pricingSource: "feature-reason",
    };
  }

  const featurePrice = FEATURE_KEY_PRICE_TABLE[key] || null;
  if (featurePrice) {
    return {
      ok: true,
      cost: Number(featurePrice.cost),
      reason: String(featurePrice.reason || reasonText || "유료 기능 잠금 해제"),
      pricingSource: "feature-key",
    };
  }

  const unlockSpec = UNLOCK_PRODUCT_BY_FEATURE_KEY[key] || null;
  if (unlockSpec) {
    return {
      ok: true,
      cost: Number(unlockSpec.cost),
      reason: String(unlockSpec.reason || reasonText || "유료 기능 잠금 해제"),
      pricingSource: "unlock-feature",
    };
  }

  if (isDynamicCostFallbackEnabled() && Number.isFinite(requestCost) && requestCost > 0) {
    return {
      ok: true,
      cost: requestCost,
      reason: reasonText || "유료 기능 잠금 해제",
      pricingSource: "dynamic-fallback",
    };
  }

  return {
    ok: false,
    status: 400,
    code: "UNKNOWN_FEATURE_KEY",
    message: "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    availableFeatureKeys: listServerPricedFeatureKeys(),
  };
}

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀", coins: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium: { name: "프리미엄 꿀", coins: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip: { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};
const PERSISTENT_UNLOCK_ALIAS_MAP = Object.freeze({
  "olympus-profile-fc": ["olympus-fc"],
  "olympus-fc": ["olympus-profile-fc"],
  "flower-fc": ["flower-destiny", "flower-astro", "flower-ziwei", "flower-sukuyo"],
  "flower-destiny": ["flower-fc"],
  "flower-astro": ["flower-fc"],
  "flower-ziwei": ["flower-fc"],
  "flower-sukuyo": ["flower-fc"],
  allPaidSaju: ["rpgCharacter", "travelDestiny", "healthReport", "sajuDiary", "secretHouseEpisodes"],
});
const PERSISTENT_UNLOCK_KEY_SET = new Set([
  "flower-fc",
  "flower-destiny",
  "flower-astro",
  "flower-ziwei",
  "flower-sukuyo",
  "olympus-fc",
  "olympus-profile-fc",
  "section_daewun",
  "section_summary",
  "section_compat",
  "allPaidSaju",
  "rpgCharacter",
  "travelDestiny",
  "healthReport",
  "sajuDiary",
  "secretHouseEpisodes",
  "premiumDivinationPack",
  "premium-ziwei",
  "premium-astrology",
  "premium-sukuyo",
  "premium-veda",
  "premium-naming",
  "premium-sibyl-dominator",
]);

function isPersistentUnlockFeatureKey(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return false;
  if (base === "pig-coin-unlock" || base === "coin-gate-per-use") return false;
  if (PERSISTENT_UNLOCK_KEY_SET.has(base)) return true;
  if (base.startsWith("section_")) return true;
  if (base.startsWith("flower-") || base.startsWith("olympus-")) return true;
  return false;
}

function resolvePersistentUnlockAliasKeys(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return [];
  const map = Object.create(null);
  map[base] = true;
  const aliases = PERSISTENT_UNLOCK_ALIAS_MAP[base] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    map[aliases[i]] = true;
  }
  return Object.keys(map);
}

function resolvePersistentUnlockKeys(rawKey) {
  if (!isPersistentUnlockFeatureKey(rawKey)) return [];
  const aliases = resolvePersistentUnlockAliasKeys(rawKey);
  const map = Object.create(null);
  for (let i = 0; i < aliases.length; i += 1) {
    if (isPersistentUnlockFeatureKey(aliases[i])) map[aliases[i]] = true;
  }
  return Object.keys(map);
}

function normalizePersistentUnlockKeys(values) {
  if (!Array.isArray(values)) return [];
  const map = Object.create(null);
  for (let i = 0; i < values.length; i += 1) {
    const aliases = resolvePersistentUnlockKeys(values[i]);
    for (let j = 0; j < aliases.length; j += 1) {
      map[aliases[j]] = true;
    }
  }
  return Object.keys(map);
}

function toUnlockMap(unlockedFeatures) {
  const map = Object.create(null);
  const keys = normalizePersistentUnlockKeys(unlockedFeatures);
  for (let i = 0; i < keys.length; i += 1) {
    map[keys[i]] = true;
  }
  return map;
}

function normalizeStringArray(values, maxLength = 200) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] || "").trim();
    if (!value) continue;
    out.push(value);
    if (out.length >= maxLength) break;
  }
  return out;
}

function isRepairableConsumeArrayShapeError(error) {
  const message = String(error?.message || "");
  if (!message) return false;
  const hasArrayOp = /\$push|\$addToSet|must be an array|non-array field/i.test(message);
  if (!hasArrayOp) return false;
  return /recentConsumeRequestIds|unlockedFeatures/i.test(message);
}

async function resolvePersistedUnlockFeatures(userId, currentUnlocks) {
  const fromUser = normalizePersistentUnlockKeys(currentUnlocks);
  if (fromUser.length || !userId) return fromUser;

  const historyKeys = await PointHistory.distinct("featureKey", {
    userId,
    kind: "deduct",
    featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
  });
  const inferred = normalizePersistentUnlockKeys(historyKeys);
  if (inferred.length) {
    await User.updateOne(
      { _id: userId },
      { $addToSet: { unlockedFeatures: { $each: inferred } } },
    ).catch(() => {});
  }
  return inferred;
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

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
      .select("points unlockedFeatures")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const unlockedFeatures = await resolvePersistedUnlockFeatures(req.auth.userId, user.unlockedFeatures);

    return res.status(200).json({
      message: "꽃돼지 코인 잔액을 불러왔습니다.",
      user: {
        id: String(req.auth.userId),
        points: Number(user.points || 0),
        unlockedFeatures,
      },
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/pig-coin/charge-simulate", async (req, res, next) => {
  try {
    return res.status(410).json({
      message: "기존 코인 충전은 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 이용해 주세요.",
      code: "POINT_CHARGE_DISABLED",
      legacyCoinDisabled: true,
    });

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

async function handlePigCoinConsumeRoute(req, res, next) {
  try {
    const adminTestTier = req.auth?.role === "admin"
      ? normalizeSubscriptionTier(req.headers["x-admin-subscription-tier"])
      : null;
    const productId = String(req.body?.productId || "").trim().toLowerCase();
    const productSpec = productId ? resolveUnlockProductSpec(productId) : null;
    if (productId && !productSpec) {
      return res.status(400).json({
        message: "지원하지 않는 해금 상품입니다.",
        code: "INVALID_PRODUCT",
        productId,
      });
    }

    const featureKey = String(productSpec?.featureKey || req.body?.featureKey || "pig-coin-unlock")
      .trim()
      .slice(0, 60);
    const requestReason = String(productSpec?.reason || req.body?.reason || "유료 섹션 잠금 해제")
      .trim()
      .slice(0, 120);
    const requestedCost = Number(productSpec ? productSpec.cost : req.body?.cost);
    const pricing = resolveServerCoinPricing({
      productSpec,
      requestedCost,
      featureKey,
      reason: requestReason,
    });

    if (!pricing.ok) {
      if (pricing.code === "UNKNOWN_FEATURE_KEY") {
        try {
          console.error("[fortune][pricing][unknown-feature]", JSON.stringify({
            featureKey,
            requestReason,
            productId: productId || null,
            route: "/api/fortune/pig-coin/consume",
          }));
        } catch (e) {
          console.error("[fortune][pricing][unknown-feature]", { featureKey, requestReason, productId: productId || null });
        }
      }

      const payload = {
        message: pricing.message || "서버 가격 검증에 실패했습니다.",
        code: pricing.code || "SERVER_PRICE_REQUIRED",
        productId: productId || null,
        featureKey,
      };

      if (!isProductionRuntime() && pricing.code === "UNKNOWN_FEATURE_KEY") {
        payload.availableFeatureKeys = Array.isArray(pricing.availableFeatureKeys) ? pricing.availableFeatureKeys : [];
        payload.requestReason = requestReason;
      }

      return res.status(Number(pricing.status || 403)).json(payload);
    }

    const cost = Number.isFinite(Number(pricing.cost)) && Number(pricing.cost) > 0
      ? Math.floor(Number(pricing.cost))
      : PIG_COIN_DEFAULT_UNLOCK_COST;

    if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
      return res.status(400).json({ message: "유효하지 않은 코인 차감 수량입니다.", code: "INVALID_REQUEST" });
    }

    const reason = String(pricing.reason || requestReason || "유료 섹션 잠금 해제")
      .trim()
      .slice(0, 120);
    const legacyAccessUser = await User.findById(req.auth.userId)
      .select("profileSubscription unlockedFeatures")
      .lean();
    if (!legacyAccessUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다.", code: "USER_NOT_FOUND" });
    }
    const legacyUnlocks = await resolvePersistedUnlockFeatures(req.auth.userId, legacyAccessUser.unlockedFeatures);
    const effectiveLegacyTier = resolveEffectiveActiveTier(legacyAccessUser);
    const legacyPassCovers = Boolean(
      effectiveLegacyTier
      && cost <= Number(getPlanPolicy(effectiveLegacyTier).freeLimit || 0)
      && !isPersistentUnlockFeatureKey(featureKey),
    );
    if (legacyUnlocks.includes(featureKey) || legacyPassCovers) {
      return res.status(200).json({
        ok: true,
        code: legacyUnlocks.includes(featureKey) ? "ALREADY_UNLOCKED" : "SUBSCRIPTION_INCLUDED",
        featureKey,
        accessType: legacyUnlocks.includes(featureKey) ? "existing_entitlement" : "membership_pass",
        paymentMode: legacyUnlocks.includes(featureKey) ? "NONE" : "MEMBERSHIP_PASS",
        legacyReadOnly: true,
        unlockedFeatures: legacyUnlocks,
        unlockMap: toUnlockMap(legacyUnlocks),
      });
    }
    return res.status(402).json({
      ok: false,
      message: "기존 코인 결제는 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 선택해 주세요.",
      code: "PAYMENT_REQUIRED",
      status: "payment_required",
      reason: "LEGACY_COIN_DISABLED",
      legacyCoinDisabled: true,
      blockedPaymentMode: "COIN",
      featureKey,
      paymentOptions: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"],
      pricing: {
        featureKey,
        reason,
        coinPrice: cost,
        membershipCreditCost: Math.max(0, cost * 10),
        krwEquivalent: cost * 100,
      },
    });

    const unlockKeysToPersist = resolvePersistentUnlockKeys(featureKey);
    const requestId = String(req.body?.requestId || "")
      .trim()
      .slice(0, 120);
    const forceDeductRaw = productSpec ? productSpec.forceDeduct : req.body?.forceDeduct;
    const forceDeduct = forceDeductRaw === true || String(forceDeductRaw || "").toLowerCase() === "true";
    const forceDeductApplied = Boolean(forceDeduct && unlockKeysToPersist.length > 0);

    if (req.auth?.role === "admin") {
      const simulatedPolicy = getPlanPolicy(adminTestTier);
      const user = await User.findById(req.auth.userId)
        .select("points unlockedFeatures")
        .lean();
      const unlockedFeatures = await resolvePersistedUnlockFeatures(req.auth.userId, user?.unlockedFeatures);

      return res.status(200).json({
        message: "관리자 우회가 적용되어 코인이 차감되지 않았습니다.",
        code: "ADMIN_BYPASS",
        productId: productId || null,
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
        freeBySubscription: Boolean(adminTestTier && !forceDeductApplied && cost <= simulatedPolicy.freeLimit),
        forceDeductApplied,
        user: {
          id: String(req.auth.userId),
          points: Number(user?.points || 0),
          unlockedFeatures,
        },
        unlockedFeatures,
        unlockMap: toUnlockMap(unlockedFeatures),
      });
    }

    const user = await User.findById(req.auth.userId)
      .select("points profileSubscription unlockedFeatures recentConsumeRequestIds")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다.", code: "USER_NOT_FOUND" });
    }

    // 이용권은 자동갱신(auto-renewal)이 없다 — 만료되면 사용자가 직접 재결제한다.
    // 레거시 코인 잔액으로 갱신을 청구하던 헬퍼를 지우고 활성 여부만 판정한다.
    const runtimeUser = user;
    const effectiveTier = resolveEffectiveActiveTier(user);
    const policy = getPlanPolicy(effectiveTier);
    const isIncludedBySubscription = Boolean(!forceDeductApplied && effectiveTier && cost <= policy.freeLimit);

    if (isIncludedBySubscription) {
      return res.status(200).json({
        message: `${PROFILE_SUB_PLANS[effectiveTier]?.name || "구독"}을 이용 중이시므로 코인이 차감되지 않습니다. 우주의 별빛이 고객님의 운명을 환히 비추고 있습니다.`,
        code: "SUBSCRIPTION_INCLUDED",
        productId: productId || null,
        requiredCoins: cost,
        chargedCoins: 0,
        freeBySubscription: true,
        forceDeductApplied,
        subscriptionTier: effectiveTier,
        freeLimit: policy.freeLimit,
        profileLimit: policy.profileLimit,
        recommendedCoins: policy.recommendedCoins,
        autoRenewed: false,
        user: {
          id: String(req.auth.userId),
          points: Number(runtimeUser.points || 0),
          unlockedFeatures: normalizePersistentUnlockKeys(runtimeUser.unlockedFeatures),
        },
        unlockedFeatures: normalizePersistentUnlockKeys(runtimeUser.unlockedFeatures),
        unlockMap: toUnlockMap(runtimeUser.unlockedFeatures),
      });
    }

    const updatePayload = {
      $inc: { points: -cost },
    };
    if (requestId) {
      updatePayload.$push = {
        recentConsumeRequestIds: {
          $each: [requestId],
          $slice: -200,
        },
      };
    }
    if (unlockKeysToPersist.length) {
      updatePayload.$addToSet = { unlockedFeatures: { $each: unlockKeysToPersist } };
    }

    const consumeFilter = {
      _id: req.auth.userId,
      points: { $gte: cost },
      ...(requestId ? { recentConsumeRequestIds: { $ne: requestId } } : {}),
    };
    const consumeOptions = {
      new: true,
      projection: { points: 1, unlockedFeatures: 1 },
    };

    let updatedUser = null;
    try {
      updatedUser = await User.findOneAndUpdate(
        consumeFilter,
        updatePayload,
        consumeOptions,
      ).lean();
    } catch (error) {
      if (!isRepairableConsumeArrayShapeError(error)) throw error;

      const repairSet = {};
      if (requestId) {
        repairSet.recentConsumeRequestIds = normalizeStringArray(runtimeUser?.recentConsumeRequestIds, 200);
      }
      if (unlockKeysToPersist.length) {
        repairSet.unlockedFeatures = normalizeStringArray(runtimeUser?.unlockedFeatures, 500);
      }
      if (Object.keys(repairSet).length) {
        await User.updateOne({ _id: req.auth.userId }, { $set: repairSet });
      }

      updatedUser = await User.findOneAndUpdate(
        consumeFilter,
        updatePayload,
        consumeOptions,
      ).lean();
    }

    if (!updatedUser) {
      if (requestId) {
        const replayUser = await User.findById(req.auth.userId)
          .select("points unlockedFeatures recentConsumeRequestIds")
          .lean();
        const replayIds = Array.isArray(replayUser?.recentConsumeRequestIds)
          ? replayUser.recentConsumeRequestIds.map((v) => String(v))
          : [];
        if (replayIds.includes(requestId)) {
          const replayUnlocks = normalizePersistentUnlockKeys(replayUser?.unlockedFeatures || []);
          return res.status(200).json({
            message: "이미 처리된 요청입니다.",
            code: "IDEMPOTENT_REPLAY",
            alreadyProcessed: true,
            productId: productId || null,
            requiredCoins: cost,
            chargedCoins: 0,
            freeBySubscription: false,
            forceDeductApplied,
            subscriptionTier: effectiveTier || "free",
            freeLimit: policy.freeLimit,
            profileLimit: policy.profileLimit,
            recommendedCoins: policy.recommendedCoins,
            user: {
              id: String(req.auth.userId),
              points: Number(replayUser?.points || 0),
              unlockedFeatures: replayUnlocks,
            },
            unlockedFeatures: replayUnlocks,
            unlockMap: toUnlockMap(replayUnlocks),
          });
        }
      }
      return res.status(402).json({
        message: "코인이 부족합니다.",
        requiredCoins: cost,
        code: "INSUFFICIENT_BALANCE",
        productId: productId || null,
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

    const unlockedFeatures = normalizePersistentUnlockKeys(
      (updatedUser && updatedUser.unlockedFeatures) || unlockKeysToPersist,
    );

    return res.status(200).json({
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      code: "OK",
      productId: productId || null,
      requiredCoins: cost,
      chargedCoins: cost,
      freeBySubscription: false,
      forceDeductApplied,
      subscriptionTier: effectiveTier || "free",
      freeLimit: policy.freeLimit,
      profileLimit: policy.profileLimit,
      recommendedCoins: policy.recommendedCoins,
      transactionId: String(history?._id || ""),
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser.points || 0),
        unlockedFeatures,
      },
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  } catch (error) {
    return next(error);
  }
}

router.post("/pig-coin/consume", handlePigCoinConsumeRoute);

router.post("/pig-coin/unlock", async (req, res, next) => {
  try {
    const productId = String(req.body?.productId || "").trim().toLowerCase();
    if (!productId) {
      return res.status(400).json({ message: "productId가 필요합니다.", code: "INVALID_PRODUCT" });
    }

    if (!resolveUnlockProductSpec(productId)) {
      return res.status(400).json({ message: "지원하지 않는 해금 상품입니다.", code: "INVALID_PRODUCT", productId });
    }

    req.body = {
      productId,
      requestId: String(req.body?.requestId || "").trim().slice(0, 120),
    };
    return handlePigCoinConsumeRoute(req, res, next);
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
      .select("profileSubscription has_started_paid_service first_service_access_date")
      .lean();
    if (!user) return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });

    const sub    = user.profileSubscription || {};
    const tier   = sub.tier || "free";
    const source = String(sub.source || "coin").toLowerCase();
    const expAt  = toValidDate(sub.expiresAt);
    const cancelAtPeriodEnd = !!sub.cancelAtPeriodEnd;
    const cancelRequestedAt = toValidDate(sub.cancelRequestedAt);
    // 이용권은 자동갱신(auto-renewal)이 없다 — 만료되면 사용자가 직접 재결제한다.
    // 레거시 코인 잔액으로 갱신을 청구하던 분기는 제거했다. points 는 응답 형태 유지를 위해서만 남는다.
    const points = null;
    // 자동갱신 경로가 없으므로 항상 false 다. 응답 필드는 계약 유지를 위해 그대로 내보낸다.
    const autoRenewed = false;

    const now  = new Date();

    // 만료 여부 확인
    let effectiveTier = "free";
    const effectiveExpAt = expAt;

    if (tier !== "free" && effectiveExpAt && effectiveExpAt > now) {
      // 구독 활성
      effectiveTier = tier;
    }

    const isActive = effectiveTier !== "free";
    const profileLimit = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
    const lowBalanceWarning = false;

    const adminTestTier = req.auth?.role === "admin"
      ? normalizeSubscriptionTier(req.headers["x-admin-subscription-tier"])
      : null;

    if (adminTestTier) {
      const simulatedPolicy = getPlanPolicy(adminTestTier);
      return res.status(200).json({
        tier:              adminTestTier,
        isActive:          true,
        expiresAt:         toIsoOrNull(effectiveExpAt),
        profileLimit:      simulatedPolicy.profileLimit,
        points,
        lowBalanceWarning: false,
        autoRenewed:       false,
        cancelAtPeriodEnd: false,
        cancelRequestedAt: null,
        hasStartedPaidService: !!user.has_started_paid_service,
        firstServiceAccessDate: toIsoOrNull(user.first_service_access_date),
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
      source:            effectiveTier === "free" ? "coin" : source,
      isActive:          !!isActive,
      expiresAt:         toIsoOrNull(effectiveExpAt),
      profileLimit,
      points,
      lowBalanceWarning: !!lowBalanceWarning,
      autoRenewed:       !!autoRenewed,
      cancelAtPeriodEnd: !!cancelAtPeriodEnd,
      cancelRequestedAt: toIsoOrNull(cancelRequestedAt),
      hasStartedPaidService: !!user.has_started_paid_service,
      firstServiceAccessDate: toIsoOrNull(user.first_service_access_date),
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
    return res.status(410).json({
      message: "기존 코인 공유 보상은 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 이용해 주세요.",
      code: "POINT_REWARD_DISABLED",
      legacyCoinDisabled: true,
    });

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
    return res.status(410).json({
      message: "이용권/월정석 구매는 PG 결제 또는 허용된 월정석 정책으로만 진행할 수 있습니다.",
      code: "LEGACY_COIN_SUBSCRIPTION_DISABLED",
    });
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

    const existingTier = String(existingUser?.profileSubscription?.tier || "free");
    const existingSource = String(existingUser?.profileSubscription?.source || "coin").toLowerCase();
    const existingExpAt = existingUser?.profileSubscription?.expiresAt
      ? new Date(existingUser.profileSubscription.expiresAt)
      : null;
    if (existingSource === "card" && existingTier !== "free" && existingExpAt && existingExpAt > now) {
      return res.status(409).json({
        message: "카드 정기결제가 활성화되어 있어 코인 구독을 동시에 신청할 수 없습니다.",
        code: "SUBSCRIPTION_CONFLICT",
      });
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
          "profileSubscription.source":     "coin",
          "profileSubscription.startedAt":  now,
          "profileSubscription.expiresAt":  expiresAt,
          "profileSubscription.cancelAtPeriodEnd": false,
          "profileSubscription.cancelRequestedAt": null,
          "profileSubscription.customerUid": "",
          "profileSubscription.paymentMethod": "",
          "profileSubscription.nextBillingAt": null,
          "profileSubscription.lastBillingStatus": "idle",
          "profileSubscription.lastBillingError": "",
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
        cancelAtPeriodEnd: false,
        cancelRequestedAt: null,
      },
      user: { points: balanceAfter },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/pig-coin/profile-subscription/cancel", async (req, res, next) => {
  try {
    const resume = req.body?.resume === true || String(req.body?.resume || "").toLowerCase() === "true";
    const now = new Date();

    const existingUser = await User.findById(req.auth.userId)
      .select("profileSubscription")
      .lean();

    if (!existingUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const sub = existingUser.profileSubscription || {};
    const tier = String(sub.tier || "free");
    const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
    const isActive = tier !== "free" && !!expiresAt && expiresAt > now;

    if (!isActive) {
      return res.status(400).json({ message: "해지 가능한 활성 구독이 없습니다." });
    }

    await User.updateOne(
      { _id: req.auth.userId },
      {
        $set: {
          "profileSubscription.cancelAtPeriodEnd": !resume,
          "profileSubscription.cancelRequestedAt": resume ? null : now,
        },
      },
    );

    const plan = PROFILE_SUB_PLANS[tier];

    return res.status(200).json({
      message: resume
        ? "구독 해지가 취소되어 자동 갱신이 다시 활성화되었습니다."
        : "구독 해지가 예약되었습니다. 만료일까지는 모든 혜택을 그대로 이용할 수 있습니다.",
      subscription: {
        tier,
        isActive: true,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        profileLimit: plan?.profileLimit ?? 1,
        cancelAtPeriodEnd: !resume,
        cancelRequestedAt: resume ? null : now.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
