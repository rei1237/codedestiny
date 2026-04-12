import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../../../_lib/flowerAdminToken";

export const runtime = "nodejs";

const PIG_COIN_DEFAULT_UNLOCK_COST = 50;
const PIG_COIN_MAX_COST = 50000;
const ADMIN_VIRTUAL_COINS = 9999999;

function verifyToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return null;
  }
}

async function isAdminRequest(request, payload) {
  if (payload?.role === "admin") return true;

  if (payload?.userId) {
    try {
      const User = await getUserModel();
      const user = await User.findById(payload.userId).select("role").lean();
      if (user?.role === "admin") return true;
    } catch {
      // DB 조회 실패 시 아래 토큰 검증으로 폴백
    }
  }

  const adminToken = extractAdminTokenFromRequest(request);
  if (!adminToken) return false;
  return verifyFlowerAdminToken(adminToken);
}

export async function POST(request) {
  const payload = verifyToken(request);
  const adminMode = await isAdminRequest(request, payload);
  if (!payload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = payload?.userId;
  if (!userId && !adminMode) return NextResponse.json({ ok: false }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const requestedCost = Number(body?.cost);
  const cost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 코인 차감 수량입니다." }, { status: 400 });
  }

  const reason = String(body?.reason || "유료 섹션 잠금 해제").trim().slice(0, 120);
  const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);

  if (adminMode) {
    return NextResponse.json({
      ok: true,
      adminBypass: true,
      message: "관리자 모드: 코인이 차감되지 않았습니다.",
      requiredCoins: cost,
      user: { id: userId ? String(userId) : "admin-session", points: ADMIN_VIRTUAL_COINS },
    });
  }

  try {
    const User = await getUserModel();
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: cost } },
      { $inc: { points: -cost } },
      { new: true, projection: { points: 1 } }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ ok: false, message: "코인이 부족합니다.", requiredCoins: cost }, { status: 402 });
    }

    // 히스토리 비동기 기록 (실패해도 응답에 영향 없음)
    getPointHistoryModel().then(PH => PH.create({
      userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: { source: "fortune.pig-coin.consume" },
    })).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
      user: { id: String(userId), points: Number(updatedUser.points || 0) },
    });
  } catch (err) {
    console.error("[pig-coin/consume] error:", err);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(request) {
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  return proxyLegacyApi(request);
}
