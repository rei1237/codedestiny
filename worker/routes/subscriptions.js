import { connectDb } from "../lib/db.js";
import { DailyFortuneSubscription } from "../lib/models.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { sendSingleFortune } from "../lib/daily-fortune-task.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function handleDailyFortunePost(request, env) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const subDaily = body?.subDaily !== false;
    const subMonthly = body?.subMonthly === true;
    const rawBirthYear = body?.birthYear;
    const birthYear = rawBirthYear ? parseInt(rawBirthYear, 10) : null;
    const source = body?.source || "saju-analysis";

    if (!email || !emailRegex.test(email)) {
      return json({ message: "유효한 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    if (!subDaily && !subMonthly) {
      return json({ message: "일일 운세 또는 월별 운세 중 하나 이상을 선택해 주세요." }, { status: 400 });
    }

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
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    ).lean();

    // Trigger the first fortune immediately
    try {
      await sendSingleFortune(env, saved);
    } catch (err) {
      console.error("[SUBSCRIPTION] Immediate fortune failed:", err);
      // We don't fail the subscription if the first mail fails, 
      // but we log it.
    }

    return json({
      ok: true,
      message: "매일 운세 이메일 구독이 등록되었습니다. 첫 번째 운세가 발송되었습니다!",
      subscription: {
        email: saved.email,
        subDaily: !!saved.subDaily,
        subMonthly: !!saved.subMonthly,
        isActive: !!saved.isActive,
      },
    });
  } catch (error) {
    console.error("[SUBSCRIPTION] POST error:", error);
    return json({ message: "구독 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}

async function handleDailyFortuneUnsubscribe(request, env) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));

  if (!email) {
    return json({ message: "이메일 주소가 누락되었습니다." }, { status: 400 });
  }

  try {
    await DailyFortuneSubscription.updateOne(
      { email },
      { $set: { isActive: false, unsubscribedAt: new Date() } }
    );

    return new Response(
      `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>구독 해지 완료 - CODE DESTINY</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1e1b4b; }
          .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          p { color: #64748b; margin-bottom: 30px; line-height: 1.5; }
          .btn { display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px; margin-bottom: 20px;">👋</div>
          <h1>구독이 해지되었습니다</h1>
          <p>${email} 주소로 발송되던 매일 운세 레터 구독이 정상적으로 해지되었습니다. 그동안 이용해 주셔서 감사합니다.</p>
          <a href="https://code-destiny.com" class="btn">홈페이지로 돌아가기</a>
        </div>
      </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      }
    );
  } catch (error) {
    console.error("[SUBSCRIPTION] Unsubscribe error:", error);
    return json({ message: "구독 해지 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function handleSubscriptionRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/subscriptions");
  await connectDb(env);

  if (method === "POST" && path === "/daily-fortune") {
    return await handleDailyFortunePost(request, env);
  }

  if (method === "GET" && path === "/daily-fortune/unsubscribe") {
    return await handleDailyFortuneUnsubscribe(request, env);
  }

  if (["GET", "POST"].includes(method)) return notFound();
  return methodNotAllowed();
}

