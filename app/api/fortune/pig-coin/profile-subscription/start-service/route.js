import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserModel } from "../../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../../_lib/models/PointHistoryModel";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../../../../_lib/flowerAdminToken";

export const runtime = "nodejs";

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
  const jwtPayload = verifyToken(request);
  const adminMode = await isAdminRequest(request, jwtPayload);
  if (!jwtPayload?.userId && !adminMode) {
    return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });
  }

  if (!jwtPayload?.userId) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "membership-content").trim().slice(0, 80);
    const contentTitle = String(body?.contentTitle || "멤버십 전용 콘텐츠").trim().slice(0, 120);
    const legalVersion = String(body?.legalVersion || "2026-04-11").trim().slice(0, 20);
    const now = new Date();

    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(jwtPayload.userId)
      .select("profileSubscription has_started_paid_service first_service_access_date points")
      .lean();

    if (!user) {
      return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const tier = String(user.profileSubscription?.tier || "free");
    if (tier === "free") {
      return NextResponse.json({ ok: false, message: "구독 사용자만 이용할 수 있습니다." }, { status: 403 });
    }

    const alreadyStarted = !!user.has_started_paid_service;
    let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

    if (!alreadyStarted) {
      const updated = await User.findOneAndUpdate(
        { _id: jwtPayload.userId, has_started_paid_service: { $ne: true } },
        {
          $set: {
            has_started_paid_service: true,
            first_service_access_date: now,
          },
        },
        { new: true, projection: { first_service_access_date: 1, points: 1 } },
      ).lean();
      if (updated?.first_service_access_date) {
        startedAt = new Date(updated.first_service_access_date);
      }
    }

    await PointHistory.create({
      userId: jwtPayload.userId,
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

    return NextResponse.json({
      ok: true,
      started: true,
      alreadyStarted,
      hasStartedPaidService: true,
      firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
    });
  } catch (error) {
    console.error("[profile-subscription/start-service] error:", error);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
