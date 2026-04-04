// POST /api/subscriptions/daily-fortune
// 맞춤 운세 이메일 구독 등록 (메인 화면 & 사주 분석 화면 공용)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDailyFortuneSubscriptionModel } from "../../../_lib/models/DailyFortuneSubscriptionModel.js";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getSubscriptionSecret() {
  return (
    process.env.SUBSCRIPTION_LINK_SECRET ||
    process.env.JWT_SECRET ||
    "dev-subscription-secret"
  );
}

function buildUnsubscribeUrl(email) {
  const normalized = normalizeEmail(email);
  const token = crypto
    .createHmac("sha256", getSubscriptionSecret())
    .update(normalized)
    .digest("hex");

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.AUTH_FRONTEND_BASE_URL ||
    process.env.SITE_BASE_URL ||
    "https://code-destiny.com";

  return `${base.replace(/\/$/, "")}/api/subscriptions/daily-fortune/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`;
}

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json({ message: "요청 본문 JSON 형식이 올바르지 않습니다." }, 400);
    }

    const email = normalizeEmail(body?.email);
    const subDaily = body?.subDaily !== false;
    const subMonthly = body?.subMonthly === true;
    const rawBirthYear = body?.birthYear;
    const birthYear = rawBirthYear ? parseInt(rawBirthYear, 10) : null;
    const source = String(body?.source || "saju-analysis").slice(0, 40);

    if (!email || !EMAIL_REGEX.test(email)) {
      return json({ message: "유효한 이메일 주소를 입력해 주세요." }, 400);
    }

    if (!subDaily && !subMonthly) {
      return json({ message: "일일 운세 또는 월별 운세 중 하나 이상을 선택해 주세요." }, 400);
    }

    const DailyFortuneSubscription = await getDailyFortuneSubscriptionModel();

    const updateFields = {
      subDaily,
      subMonthly,
      isActive: true,
      unsubscribedAt: null,
      source,
    };
    if (birthYear && birthYear >= 1900 && birthYear <= 2100) {
      updateFields.birthYear = birthYear;
    }

    const saved = await DailyFortuneSubscription.findOneAndUpdate(
      { email },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return json({
      message: "매일 운세 이메일 구독이 등록되었습니다.",
      unsubscribeUrl: buildUnsubscribeUrl(saved.email),
      subscription: {
        id: String(saved._id),
        email: saved.email,
        subDaily: !!saved.subDaily,
        subMonthly: !!saved.subMonthly,
        isActive: !!saved.isActive,
      },
    });
  } catch (err) {
    const msg = err?.message || "서버 오류가 발생했습니다.";
    const isDbErr =
      msg.includes("timed out") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("MongoNetwork") ||
      msg.includes("MongoServerSelection");
    if (isDbErr) {
      return json({ message: "서버가 시작되고 있습니다. 잠시 후 다시 시도해 주세요." }, 503);
    }
    return json({ message: "구독 처리 중 오류가 발생했습니다." }, 500);
  }
}
