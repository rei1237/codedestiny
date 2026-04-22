import { NextResponse } from "next/server";
import { verifyJwtFromRequest } from "../../../_lib/adminAccess";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel";
import {
  FLOWER_KNOWN_LOCK_KEYS,
  FLOWER_UNLOCK_COST,
  isUnlockSatisfied,
  resolveUnlockAliasKeys,
} from "../../../../_lib/featureUnlocks";

export const runtime = "nodejs";

function sanitizeFeatureKey(rawFeatureKey) {
  const fallback = "flower-destiny";
  const key = String(rawFeatureKey || "").trim();
  if (!key) return fallback;
  return key.slice(0, 80);
}

function buildUnlockMap(unlockedFeatures) {
  const map = Object.create(null);
  for (let i = 0; i < FLOWER_KNOWN_LOCK_KEYS.length; i += 1) {
    const key = FLOWER_KNOWN_LOCK_KEYS[i];
    map[key] = isUnlockSatisfied(unlockedFeatures, key);
  }
  return map;
}

export async function GET(request) {
  const payload = verifyJwtFromRequest(request);
  if (!payload?.userId) {
    return NextResponse.json(
      {
        ok: false,
        loggedIn: false,
        message: "로그인이 필요합니다.",
        loginUrl: "/login?next=%2Fflower%2Fdestiny",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const requiredKey = sanitizeFeatureKey(url.searchParams.get("featureKey"));
  const includeAll = ["1", "true", "all", "yes"].includes(
    String(url.searchParams.get("all") || "").toLowerCase()
  );

  try {
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(payload.userId)
      .select("points unlockedFeatures")
      .lean();

    if (!user) {
      return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const merged = new Set(
      Array.isArray(user.unlockedFeatures)
        ? user.unlockedFeatures.map((value) => String(value || "").trim()).filter(Boolean)
        : []
    );

    const historyRows = await PointHistory.find({
      userId: payload.userId,
      kind: "deduct",
      featureKey: { $in: FLOWER_KNOWN_LOCK_KEYS },
    })
      .select("featureKey")
      .limit(500)
      .lean();

    for (let i = 0; i < historyRows.length; i += 1) {
      const key = String(historyRows[i]?.featureKey || "").trim();
      if (!key) continue;
      const aliases = resolveUnlockAliasKeys(key);
      for (let j = 0; j < aliases.length; j += 1) merged.add(aliases[j]);
    }

    const normalizedUnlockedFeatures = Array.from(merged);

    if (normalizedUnlockedFeatures.length > 0) {
      await User.findByIdAndUpdate(payload.userId, {
        $addToSet: { unlockedFeatures: { $each: normalizedUnlockedFeatures } },
      }).catch(() => {});
    }

    const unlockMap = buildUnlockMap(normalizedUnlockedFeatures);

    return NextResponse.json({
      ok: true,
      loggedIn: true,
      requiredKey,
      requiredCoins: FLOWER_UNLOCK_COST,
      hasUnlock: isUnlockSatisfied(normalizedUnlockedFeatures, requiredKey),
      unlockMap,
      unlockedFeatures: includeAll
        ? normalizedUnlockedFeatures
        : normalizedUnlockedFeatures.filter((key) => FLOWER_KNOWN_LOCK_KEYS.includes(key)),
      user: {
        id: String(payload.userId),
        points: Number(user.points || 0),
      },
    });
  } catch (error) {
    console.error("[api/flower/unlock/status]", error);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
