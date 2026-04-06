// POST /api/fortune/pig-coin/consume
// 꽃꽃돼지 코인 차감 — 유료 기능 이용 시 호출
// public/index.html _cdRunPerUseCoinGate() / tryUnlockFeature() 에서 호출
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";

const MAX_COST = 100_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function extractToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();

  const cookieHeader = request.headers.get("cookie") || "";
  const chunks = cookieHeader.split(";").map((v) => v.trim());
  for (const chunk of chunks) {
    const [k, ...rest] = chunk.split("=");
    if (k.trim() === "fortune_auth_token") {
      try { return decodeURIComponent(rest.join("=")); } catch { return rest.join("="); }
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const token = extractToken(request);
    if (!token) return json({ message: "로그인이 필요합니다." }, 401);

    let auth;
    try {
      auth = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      return json({ message: "유효하지 않거나 만료된 토큰입니다." }, 401);
    }

    if (!auth?.userId) return json({ message: "유효하지 않은 토큰입니다." }, 401);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    const cost = Math.floor(Number(body?.cost));
    if (!Number.isFinite(cost) || cost < 1 || cost > MAX_COST) {
      return json({ message: `코인 차감 수량은 1~${MAX_COST.toLocaleString("ko-KR")} 범위여야 합니다.` }, 400);
    }

    const reason = String(body?.reason || "유료 섹션 잠금 해제").trim().slice(0, 120);
    const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    // 관리자 역할이면 코인 차감 없이 즉시 성공 반환
    if (auth.role === "admin") {
      const adminUser = await User.findById(auth.userId).select("points").lean();
      return json({
        ok: true,
        message: "관리자 모드: 코인 차감 없이 실행",
        user: {
          id: String(auth.userId),
          points: Number(adminUser?.points || 0),
        },
      });
    }

    // 일반 사용자: 잔액이 충분한 경우에만 원자적으로 차감
    const updatedUser = await User.findOneAndUpdate(
      { _id: auth.userId, points: { $gte: cost } },
      { $inc: { points: -cost } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return json({ message: "코인이 부족합니다.", requiredCoins: cost }, 402);
    }

    // 포인트 이력 기록 (실패해도 차감은 이미 성공 처리)
    PointHistory.create({
      userId: auth.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: { source: "fortune.pig-coin.consume" },
    }).catch((histErr) => {
      console.warn("[pig-coin/consume] history write failed", histErr?.message || histErr);
    });

    return json({
      ok: true,
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
      user: {
        id: String(auth.userId),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (err) {
    console.error("[pig-coin/consume POST]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}
