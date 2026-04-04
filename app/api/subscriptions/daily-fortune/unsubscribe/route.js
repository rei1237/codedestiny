// GET /api/subscriptions/daily-fortune/unsubscribe
// 맞춤 운세 이메일 구독 취소
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDailyFortuneSubscriptionModel } from "../../../../_lib/models/DailyFortuneSubscriptionModel.js";
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

function verifyToken(email, token) {
  const expected = crypto
    .createHmac("sha256", getSubscriptionSecret())
    .update(email)
    .digest("hex");
  const given = String(token || "").trim().toLowerCase();
  if (!expected || !given || expected.length !== given.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch (_) {
    return false;
  }
}

function html(body, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const email = normalizeEmail(url.searchParams.get("email") || "");
    const token = String(url.searchParams.get("token") || "");

    if (!email || !EMAIL_REGEX.test(email) || !verifyToken(email, token)) {
      return html("<h1>유효하지 않은 구독 해지 링크입니다.</h1>", 400);
    }

    const DailyFortuneSubscription = await getDailyFortuneSubscriptionModel();

    await DailyFortuneSubscription.updateOne(
      { email },
      {
        $set: {
          isActive: false,
          subDaily: false,
          subMonthly: false,
          unsubscribedAt: new Date(),
        },
      },
    );

    return html(
      "<h1>구독 해지가 완료되었습니다.</h1><p>앞으로 매일 운세 메일이 발송되지 않습니다.</p>",
    );
  } catch (err) {
    return html("<h1>구독 해지 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</h1>", 500);
  }
}
