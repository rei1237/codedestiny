import { connectDb } from "../lib/db.js";
import { User, PointHistory } from "../lib/models.js";
import { requireAuth } from "../lib/auth.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;
const FORCE_PAID_TEST_ACCOUNT_EMAILS = new Set([
  "test1234@example.com",
]);

const PIG_COIN_PACKAGES = {
  sample: { name: "Sample Pack", coins: 30, bonus: 0 },
  luckyMeal: { name: "Lucky Meal", coins: 100, bonus: 15 },
  goldBarn: { name: "Gold Barn", coins: 300, bonus: 60 },
  goldVault: { name: "Gold Vault", coins: 700, bonus: 180 },
  emperorReserve: { name: "Emperor Reserve", coins: 1500, bonus: 500 },
};

const PROFILE_SUB_PLANS = {
  standard: { name: "Standard", coins: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium: { name: "Premium", coins: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip: { name: "VVIP", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};

const SHARE_REWARD_AMOUNT = 10;
const SHARE_REWARD_DAILY_LIMIT = 3;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

function getFlowerAdminSecret(env) {
  return String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

function extractAdminTokenFromRequest(request) {
  const xat = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(xat)) return xat;

  const auth = String(request.headers.get("authorization") || "");
  if (auth.startsWith("Bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookieHeader = String(request.headers.get("cookie") || "");
  const flowerMatch = cookieHeader.match(/(?:^|;\s*)flower_admin_token=([^;]+)/);
  if (flowerMatch) {
    try {
      const decoded = decodeURIComponent(flowerMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(flowerMatch[1])) return flowerMatch[1];
    }
  }

  const legacyMatch = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (legacyMatch) {
    try {
      const decoded = decodeURIComponent(legacyMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(legacyMatch[1])) return legacyMatch[1];
    }
  }

  return "";
}

function _b64uToJson(payloadB64) {
  const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const withPad = base64 + "=".repeat(padLen);
  return JSON.parse(atob(withPad));
}

async function hmacSha256Hex(data, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyFlowerAdminToken(token, env) {
  try {
    if (!FLOWER_ADMIN_TOKEN_RE.test(String(token || ""))) return false;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;

    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expected = await hmacSha256Hex(payloadB64, getFlowerAdminSecret(env));
    if (!expected || expected.length !== sig.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const payload = _b64uToJson(payloadB64);
    const exp = Number(payload?.exp || 0);
    const now = Math.floor(Date.now() / 1000);
    return payload?.v === 1 && Number.isFinite(exp) && now <= exp;
  } catch (_) {
    return false;
  }
}

async function resolvePigCoinConsumeAuth(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    auth = null;
  }

  const adminToken = extractAdminTokenFromRequest(request);
  const adminMode = adminToken ? await verifyFlowerAdminToken(adminToken, env) : false;

  if (!auth && !adminMode) {
    throw createHttpError(401, "Authentication is required.");
  }

  return { auth, adminMode };
}

function userPayload(auth, points) {
  return {
    id: String(auth.userId),
    points: Number(points || 0),
  };
}

async function handleCheck() {
  return json({
    message: "Fortune reading is currently free.",
    requiredPoints: 0,
    currentPoints: null,
    isFree: true,
  });
}

async function handleConsume(auth) {
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  return json({
    message: "Fortune reading is currently free. No coins were deducted.",
    requiredPoints: 0,
    isFree: true,
    user: userPayload(auth, user.points),
  });
}

async function handleBalance(auth) {
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  return json({
    message: "Coin balance loaded.",
    user: userPayload(auth, user.points),
  });
}

async function handleChargeSimulate(request, env, auth) {
  if (String(env.PIG_COIN_PAYMENT_API_READY || "") !== "true") {
    return json({
      message: "Coin charge simulation is disabled because the payment API is not ready.",
      code: "PIG_COIN_CHARGE_DISABLED",
    }, { status: 503 });
  }

  const body = await readJson(request);
  const packageId = String(body?.packageId || "").trim();
  const pkg = PIG_COIN_PACKAGES[packageId];
  if (!pkg) return json({ message: "Unsupported charge package." }, { status: 400 });

  const delta = Number(pkg.coins || 0) + Number(pkg.bonus || 0);
  if (!Number.isFinite(delta) || delta <= 0) {
    return json({ message: "Invalid charge amount." }, { status: 400 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: delta } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "charge",
    delta,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "Coin charge simulation",
    featureKey: "pig-coin-charge",
    metadata: {
      source: "fortune.pig-coin.charge-simulate",
      packageId,
      packageName: pkg.name,
      baseCoins: Number(pkg.coins || 0),
      bonusCoins: Number(pkg.bonus || 0),
    },
  });

  return json({
    message: `${delta.toLocaleString("ko-KR")} coins charged.`,
    package: {
      id: packageId,
      name: pkg.name,
      coins: Number(pkg.coins || 0),
      bonus: Number(pkg.bonus || 0),
    },
    user: userPayload(auth, updatedUser.points),
  });
}

async function handlePigCoinConsume(request, auth, options = {}) {
  const adminMode = Boolean(options?.adminMode);
  const body = await readJson(request);
  const requestedCost = Number(body?.cost);
  const cost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid coin deduction amount." }, { status: 400 });
  }

  const reason = String(body?.reason || "Paid feature unlock").trim().slice(0, 120);
  const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  const authEmail = String(auth?.email || "").trim().toLowerCase();
  const forcePaidMode = Boolean(authEmail && FORCE_PAID_TEST_ACCOUNT_EMAILS.has(authEmail));

  if (adminMode && !forcePaidMode) {
    let currentPoints = null;
    if (auth?.userId) {
      const user = await User.findById(auth.userId).select("points").lean();
      if (user) currentPoints = Number(user.points || 0);
    }

    return json({
      message: "Admin bypass enabled. No coins were deducted.",
      requiredCoins: cost,
      adminBypass: true,
      user: auth?.userId
        ? userPayload(auth, currentPoints == null ? 0 : currentPoints)
        : { id: "admin", points: null },
    });
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: auth.userId, points: { $gte: cost } },
    { $inc: { points: -cost } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    return json({
      message: "Not enough coins.",
      requiredCoins: cost,
    }, { status: 402 });
  }

  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -cost,
    balanceAfter: Number(updatedUser.points || 0),
    reason,
    featureKey,
    metadata: { source: "fortune.pig-coin.consume" },
  });

  return json({
    message: `${cost.toLocaleString("ko-KR")} coins deducted.`,
    requiredCoins: cost,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscriptionStatus(auth) {
  const user = await User.findById(auth.userId)
    .select("points profileSubscription has_started_paid_service first_service_access_date")
    .lean();

  if (!user) return json({ message: "User not found." }, { status: 404 });

  const sub = user.profileSubscription || {};
  const tier = sub.tier || "free";
  const expAt = sub.expiresAt || null;
  let points = Number(user.points || 0);
  const plan = PROFILE_SUB_PLANS[tier];
  const now = new Date();

  let effectiveTier = "free";
  let effectiveExpAt = expAt ? new Date(expAt) : null;
  let autoRenewed = false;

  if (tier !== "free" && effectiveExpAt) {
    if (effectiveExpAt > now) {
      effectiveTier = tier;
    } else if (plan && points >= plan.coins) {
      const newExpAt = new Date(Math.max(effectiveExpAt.getTime(), now.getTime()) + plan.durationDays * 86400000);
      const updatedUser = await User.findOneAndUpdate(
        { _id: auth.userId, points: { $gte: plan.coins } },
        {
          $inc: { points: -plan.coins },
          $set: {
            "profileSubscription.expiresAt": newExpAt,
            "profileSubscription.startedAt": now,
          },
        },
        { new: true, projection: { points: 1 } },
      ).lean();

      if (updatedUser) {
        points = Number(updatedUser.points || 0);
        effectiveTier = tier;
        effectiveExpAt = newExpAt;
        autoRenewed = true;
        await PointHistory.create({
          userId: auth.userId,
          kind: "deduct",
          delta: -plan.coins,
          balanceAfter: points,
          reason: `${plan.name} subscription auto-renewal`,
          featureKey: "profile-subscription-auto-renew",
          metadata: { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
        }).catch(() => {});
      }
    }
  }

  const isActive = effectiveTier !== "free";
  const profileLimit = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
  const lowBalanceWarning = isActive && points <= (PROFILE_SUB_PLANS[effectiveTier]?.lowWarnAt ?? 30);

  return json({
    tier: effectiveTier,
    isActive: Boolean(isActive),
    expiresAt: effectiveExpAt ? effectiveExpAt.toISOString() : null,
    profileLimit,
    points,
    lowBalanceWarning: Boolean(lowBalanceWarning),
    autoRenewed: Boolean(autoRenewed),
    hasStartedPaidService: Boolean(user.has_started_paid_service),
    firstServiceAccessDate: user.first_service_access_date ? new Date(user.first_service_access_date).toISOString() : null,
  });
}

async function handleStartService(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "membership-content").trim().slice(0, 80);
  const contentTitle = String(body?.contentTitle || "Membership content").trim().slice(0, 120);
  const legalVersion = String(body?.legalVersion || "2026-04-11").trim().slice(0, 20);
  const now = new Date();

  const user = await User.findById(auth.userId)
    .select("profileSubscription has_started_paid_service first_service_access_date points")
    .lean();

  if (!user) return json({ message: "User not found." }, { status: 404 });

  const tier = String(user.profileSubscription?.tier || "free");
  if (tier === "free") {
    return json({ message: "Only subscribed users can access this service." }, { status: 403 });
  }

  const alreadyStarted = Boolean(user.has_started_paid_service);
  let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

  if (!alreadyStarted) {
    const updated = await User.findOneAndUpdate(
      { _id: auth.userId, has_started_paid_service: { $ne: true } },
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
    userId: auth.userId,
    kind: "adjust",
    delta: 0,
    balanceAfter: Number(user.points || 0),
    reason: "Membership content access acknowledged",
    featureKey: "profile-subscription-service-start",
    metadata: {
      action,
      contentTitle,
      legalVersion,
      acknowledgedAt: now.toISOString(),
    },
  }).catch(() => {});

  return json({
    ok: true,
    started: true,
    alreadyStarted,
    hasStartedPaidService: true,
    firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
  });
}

async function handleShareReward(request, auth) {
  const body = await readJson(request);
  const contentId = String(body?.contentId || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "default";

  const now = new Date();
  const kstMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - 9 * 3600 * 1000,
  );

  const todayCount = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    createdAt: { $gte: kstMidnight },
  });

  if (todayCount >= SHARE_REWARD_DAILY_LIMIT) {
    return json({
      message: "Daily share reward limit reached.",
      code: "DAILY_LIMIT_EXCEEDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 429 });
  }

  const contentDup = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    "metadata.contentId": contentId,
    createdAt: { $gte: kstMidnight },
  });

  if (contentDup > 0) {
    return json({
      message: "This content was already rewarded today.",
      code: "CONTENT_ALREADY_REWARDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 409 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: SHARE_REWARD_AMOUNT } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "share_reward",
    delta: SHARE_REWARD_AMOUNT,
    balanceAfter: Number(updatedUser.points || 0),
    reason: `Share reward for ${contentId}`,
    featureKey: "share-reward",
    metadata: {
      source: "fortune.pig-coin.share-reward",
      contentId,
    },
  });

  return json({
    message: `${SHARE_REWARD_AMOUNT} coins awarded for sharing.`,
    reward: SHARE_REWARD_AMOUNT,
    usedToday: todayCount + 1,
    limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscribe(request, auth) {
  const body = await readJson(request);
  const reqTier = String(body?.tier || "").trim();
  const plan = PROFILE_SUB_PLANS[reqTier];
  if (!plan) return json({ message: "Unsupported subscription plan." }, { status: 400 });

  const cost = plan.coins;
  const now = new Date();
  const existingUser = await User.findById(auth.userId)
    .select("points profileSubscription")
    .lean();

  if (!existingUser) return json({ message: "User not found." }, { status: 404 });

  const prevExpAt = existingUser.profileSubscription?.expiresAt;
  const baseTime = (prevExpAt && new Date(prevExpAt) > now)
    ? new Date(prevExpAt).getTime()
    : now.getTime();
  const expiresAt = new Date(baseTime + plan.durationDays * 86400000);
  const isFirstSub = !existingUser.profileSubscription?.firstSubAt;

  const updatedUser = await User.findOneAndUpdate(
    { _id: auth.userId, points: { $gte: cost } },
    {
      $inc: { points: -cost },
      $set: {
        "profileSubscription.tier": reqTier,
        "profileSubscription.startedAt": now,
        "profileSubscription.expiresAt": expiresAt,
        ...(isFirstSub && { "profileSubscription.firstSubAt": now }),
      },
    },
    { new: true, projection: { points: 1, profileSubscription: 1 } },
  ).lean();

  if (!updatedUser) {
    return json({ message: "Not enough coins.", requiredCoins: cost }, { status: 402 });
  }

  const balanceAfter = Number(updatedUser.points || 0);
  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -cost,
    balanceAfter,
    reason: `${plan.name} subscription`,
    featureKey: "profile-subscription",
    metadata: { tier: reqTier, expiresAt: expiresAt.toISOString() },
  });

  return json({
    message: `${plan.name} subscription started for 30 days.`,
    subscription: {
      tier: reqTier,
      isActive: true,
      expiresAt: expiresAt.toISOString(),
      profileLimit: plan.profileLimit,
    },
    user: { points: balanceAfter },
  });
}

export async function handleFortuneRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/fortune");
    await connectDb(env);

    if (method === "POST" && path === "/pig-coin/consume") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      return await handlePigCoinConsume(request, authCtx.auth, { adminMode: authCtx.adminMode });
    }

    const auth = await requireAuth(request, env);

    if (method === "GET" && path === "/check") return await handleCheck();
    if (method === "POST" && path === "/consume") return await handleConsume(auth);
    if (method === "GET" && path === "/pig-coin/balance") return await handleBalance(auth);
    if (method === "POST" && path === "/pig-coin/charge-simulate") return await handleChargeSimulate(request, env, auth);
    if (method === "GET" && path === "/pig-coin/profile-subscription/status") return await handleSubscriptionStatus(auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/start-service") return await handleStartService(request, auth);
    if (method === "POST" && path === "/pig-coin/share-reward") return await handleShareReward(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/subscribe") return await handleSubscribe(request, auth);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error);
  }
}
