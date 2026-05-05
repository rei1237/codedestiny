import { connectDb } from "./db.js";
import { DailyFortuneSubscription } from "./models.js";
import { callGeminiText } from "./gemini.js";
import { sendEmail } from "./resend.js";

const ANIMAL_IDS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const GANJI_LIST = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);

function getBirthAnimalId(birthYear) {
  if (!birthYear || birthYear < 1900) return null;
  const idx = ((birthYear - 4) % 12 + 12) % 12;
  return ANIMAL_IDS[idx];
}

function getJulianDay(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function getTodayPillars() {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  const jd = getJulianDay(y, m, d);
  const dayIdx = (Math.floor(jd + 0.5) + 49) % 60;
  const dayPillar = GANJI_LIST[dayIdx];

  const yearIdx = (y - 4) % 60;
  const yearPillar = GANJI_LIST[yearIdx];

  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    yearPillar,
    dayPillar,
    dayName: ["일", "월", "화", "수", "목", "금", "토"][now.getDay()],
  };
}

export async function sendSingleFortune(env, sub) {
  const pillars = getTodayPillars();
  const birthAnimalId = getBirthAnimalId(sub.birthYear);
  const animalName = birthAnimalId ? {
    rat: "쥐띠", ox: "소띠", tiger: "범띠", rabbit: "토끼띠",
    dragon: "용띠", snake: "뱀띠", horse: "말띠", goat: "양띠",
    monkey: "잔나비띠", rooster: "닭띠", dog: "개띠", pig: "돼지띠"
  }[birthAnimalId] : "운명가";

  const dateLabel = pillars.date;
  
  const prompt = `
당신은 "꽃돼지 연이"라는 이름의 따뜻하고 영리한 사주 상담가입니다.
오늘은 ${pillars.date} (${pillars.dayName}요일)이며, 오늘의 간지는 ${pillars.dayPillar}일, 올해는 ${pillars.yearPillar}년입니다.
구독자(${animalName})님을 위한 오늘의 맞춤 운세를 작성해 주세요.

[분석 조건]
- 구독자의 띠: ${animalName}
- 오늘의 일진(日辰): ${pillars.dayPillar}
- 올해의 세운(歲運): ${pillars.yearPillar}

[작성 가이드라인]
1. 친근하고 다정한 말투(해요체)를 사용하세요.
2. 오늘의 일진(${pillars.dayPillar})과 구독자의 띠(${animalName}) 사이의 합(合), 충(沖), 형(刑) 등을 고려한 핵심 조언을 한 문장으로 먼저 제시하세요.
3. '오늘의 행운 포인트'(색상, 숫자, 방향 중 2개)를 포함하세요.
4. '오늘의 마음가짐' 섹션을 통해 심리적인 위안과 행동 지침을 주세오.
5. 전체 내용을 HTML 태그를 사용해 예쁘게 구성해 주세요. (h2, p, div 등 사용)
   - 이메일 클라이언트 호환성을 위해 인라인 스타일(style="...")을 사용하세요.
   - 글자 크기는 15px~16px, 줄 간격은 1.6 이상으로 읽기 편하게 작성하세요.
6. 마지막에 "당신의 오늘이 어제보다 더 반짝이길 바랄게요. - 꽃돼지 연이 드림" 문구를 포함해 주세요.
`;

  const aiResult = await callGeminiText(env, prompt, {
    modelEnvKeys: ["GEMINI_MODEL"],
  });

  if (!aiResult.ok) {
    throw new Error(aiResult.error || "Gemini generation failed");
  }

  const fortuneHtmlContent = aiResult.text;
  
  const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  </style>
</head>
<body>
  <div style="background-color: #f9fafb; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">🌸</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CODE DESTINY</h1>
        <p style="margin: 5px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${dateLabel} 오늘의 맞춤 운세</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px 25px;">
        ${fortuneHtmlContent}
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://code-destiny.com" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">✨ 내 사주 자세히 분석하기</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          본 메일은 구독 신청을 하신 분들께 발송되는 맞춤 운세 서비스입니다.<br>
          매일 아침 행운의 소식을 전해드립니다.
        </p>
        <div style="margin-top: 15px; font-size: 12px;">
          <a href="https://code-destiny.com/api/subscriptions/daily-fortune/unsubscribe?email=${encodeURIComponent(sub.email)}" style="color: #64748b; text-decoration: underline;">구독 해지 (Unsubscribe)</a>
        </div>
        <p style="margin-top: 20px; font-size: 11px; color: #cbd5e1;">© 2026 CODE DESTINY. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  const emailResult = await sendEmail(env, {
    to: sub.email,
    subject: `[CODE DESTINY] ${dateLabel} 오늘의 맞춤 운세가 도착했습니다.`,
    html: emailHtml,
  });

  if (emailResult.ok) {
    await DailyFortuneSubscription.updateOne(
      { _id: sub._id },
      { $set: { lastSentAt: new Date() } }
    );
    return true;
  } else {
    throw new Error(emailResult.error || "Email sending failed");
  }
}

export async function runDailyFortuneTask(env) {
  console.log("[CRON] Starting Daily Fortune Task...");
  await connectDb(env);

  const subscribers = await DailyFortuneSubscription.find({
    isActive: true,
    subDaily: true,
  }).lean();

  if (subscribers.length === 0) {
    console.log("[CRON] No active subscribers found.");
    return;
  }

  console.log(`[CRON] Found ${subscribers.length} subscribers.`);

  for (const sub of subscribers) {
    try {
      console.log(`[CRON] Processing ${sub.email}...`);
      await sendSingleFortune(env, sub);
      console.log(`[CRON] Successfully processed ${sub.email}`);
    } catch (err) {
      console.error(`[CRON] Error processing subscriber ${sub.email}:`, err);
    }
  }

  console.log("[CRON] Daily Fortune Task completed.");
}
