// POST /api/fortune/pig-coin/earn
// 포춘텔러 피쉬 일일 출석 체크 → 꽃꽃돼지 코인 +5 지급 (1일 1회)
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel.js";

const EARN_AMOUNT = 5;
const FEATURE_KEY = "fortune-fish-daily-checkin";

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

function todayKST() {
  // KST 기준 오늘 날짜 문자열 (YYYY-MM-DD)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
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

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    // 오늘 KST 날짜 범위 계산
    const today = todayKST();
    const dayStart = new Date(today + "T00:00:00+09:00");
    const dayEnd = new Date(today + "T23:59:59+09:00");

    // 오늘 이미 출석 지급 이력이 있는지 확인
    const alreadyEarned = await PointHistory.findOne({
      userId: auth.userId,
      featureKey: FEATURE_KEY,
      kind: "earn",
      createdAt: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    if (alreadyEarned) {
      const user = await User.findById(auth.userId).select("points").lean();
      return json({
        ok: false,
        alreadyCheckedIn: true,
        message: "오늘 이미 출석 체크를 완료했습니다.",
        user: { id: String(auth.userId), points: Number(user?.points || 0) },
      });
    }

    // 포인트 지급
    const updatedUser = await User.findByIdAndUpdate(
      auth.userId,
      { $inc: { points: EARN_AMOUNT } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);
    }

    // 이력 기록
    PointHistory.create({
      userId: auth.userId,
      kind: "earn",
      delta: EARN_AMOUNT,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "포춘텔러 피쉬 일일 출석 보상",
      featureKey: FEATURE_KEY,
      metadata: { source: "fortune.pig-coin.earn" },
    }).catch((histErr) => {
      console.warn("[pig-coin/earn] history write failed", histErr?.message || histErr);
    });

    return json({
      ok: true,
      message: `🪙 ${EARN_AMOUNT} 꽃꽃돼지 코인이 지급되었습니다!`,
      earnAmount: EARN_AMOUNT,
      user: {
        id: String(updatedUser._id),
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (err) {
    console.error("[pig-coin/earn POST]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}
