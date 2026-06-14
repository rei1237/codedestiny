import { connectDb } from "../lib/db.js";
import { DailyFortuneSubscription } from "../lib/models.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { sendSingleFortune } from "../lib/daily-fortune-task.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAJU_SNAPSHOT_MAX_CHARS = 36000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeText(value, maxLength = 80) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeBirthDate(value) {
  const text = normalizeText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeBoundedNumber(value, min, max) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const integer = Math.trunc(number);
  return integer >= min && integer <= max ? integer : null;
}

function sanitizeSnapshotValue(value, depth = 0) {
  if (depth > 6) return null;
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 600);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeSnapshotValue(item, depth + 1)).filter((item) => item != null);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 60)) {
      const safeKey = normalizeText(key, 60);
      if (!safeKey) continue;
      const safeValue = sanitizeSnapshotValue(item, depth + 1);
      if (safeValue != null) out[safeKey] = safeValue;
    }
    return out;
  }
  return null;
}

function normalizeSajuSnapshot(value) {
  const snapshot = sanitizeSnapshotValue(value);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  if (!snapshot.pillars || !snapshot.pillars.d || !snapshot.pillars.d.g || !snapshot.pillars.d.j) return null;
  const encoded = JSON.stringify(snapshot);
  if (encoded.length > SAJU_SNAPSHOT_MAX_CHARS) return null;
  return snapshot;
}

async function handleDailyFortunePost(request, env) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const subDaily = body?.subDaily !== false;
    const subMonthly = false;
    const rawBirthYear = body?.birthYear;
    const birthDate = normalizeBirthDate(body?.birthDate);
    const birthYear = rawBirthYear ? parseInt(rawBirthYear, 10) : (birthDate ? parseInt(birthDate.slice(0, 4), 10) : null);
    const birthHour = normalizeBoundedNumber(body?.birthHour, 0, 23);
    const birthMinute = normalizeBoundedNumber(body?.birthMinute, 0, 59);
    const calendarType = normalizeText(body?.calendarType || "solar", 20) || "solar";
    const timezone = normalizeText(body?.timezone || "Asia/Seoul", 40) || "Asia/Seoul";
    const source = normalizeText(body?.source || "saju-analysis", 40) || "saju-analysis";
    const sajuSnapshot = normalizeSajuSnapshot(body?.sajuSnapshot);

    if (!email || !emailRegex.test(email)) {
      return json({ message: "유효한 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    if (!subDaily) {
      return json({ message: "현재 이메일 구독은 사주 기반 일일 운세만 지원합니다." }, { status: 400 });
    }

    if (!sajuSnapshot) {
      return json({ message: "사주 기반 일일 운세 구독을 위해 먼저 사주 분석을 완료해 주세요." }, { status: 400 });
    }

    const updateFields = {
      subDaily,
      subMonthly,
      isActive: true,
      unsubscribedAt: null,
      lastMailError: "",
      lastMailErrorAt: null,
      birthDate,
      birthHour,
      birthMinute,
      calendarType,
      timezone,
      sajuSnapshot,
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

    let firstMailSent = false;
    let mailErrorCode = "";
    try {
      await sendSingleFortune(env, saved);
      firstMailSent = true;
    } catch (err) {
      console.error("[SUBSCRIPTION] Immediate fortune failed:", err);
      mailErrorCode = normalizeText(err?.message || "first_mail_failed", 120);
      await DailyFortuneSubscription.updateOne(
        { _id: saved._id },
        { $set: { lastMailError: mailErrorCode, lastMailErrorAt: new Date() } }
      );
    }

    return json({
      ok: true,
      firstMailSent,
      mailErrorCode,
      message: firstMailSent
        ? "사주 기반 일일 운세 구독이 등록되었습니다. 첫 번째 운세가 발송되었습니다."
        : "사주 기반 일일 운세 구독이 등록되었습니다. 첫 메일은 발송 대기 상태이며 다음 발송 작업에서 다시 시도됩니다.",
      subscription: {
        email: saved.email,
        subDaily: !!saved.subDaily,
        subMonthly: !!saved.subMonthly,
        isActive: !!saved.isActive,
      },
    }, { status: firstMailSent ? 200 : 202 });
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
      { $set: { isActive: false, subDaily: false, subMonthly: false, unsubscribedAt: new Date() } }
    );

    if (request.method.toUpperCase() === "POST") {
      return new Response("", { status: 200 });
    }

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

  if ((method === "GET" || method === "POST") && path === "/daily-fortune/unsubscribe") {
    return await handleDailyFortuneUnsubscribe(request, env);
  }

  if (["GET", "POST"].includes(method)) return notFound();
  return methodNotAllowed();
}
