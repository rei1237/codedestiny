import { connectDb } from "./db.js";
import { DailyFortuneSubscription } from "./models.js";
import { callGeminiText } from "./gemini.js";
import { sendEmail } from "./resend.js";

const ANIMAL_IDS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

function getBirthAnimalId(birthYear) {
  if (!birthYear || birthYear < 1900) return null;
  const idx = ((birthYear - 4) % 12 + 12) % 12;
  return ANIMAL_IDS[idx];
}

async function fetchDailyFortuneData(env) {
  try {
    const baseUrl = env.SITE_BASE_URL || "https://code-destiny.com";
    const kst = new Date(Date.now() + 9 * 3600 * 1000);
    const dateStr = kst.toISOString().slice(0, 10);
    const url = `${baseUrl}/fortune/data/daily-${dateStr}.json`;
    
    console.log(`[TASK] Fetching fortune data from: ${url}`);
    const resp = await fetch(url);
    if (resp.ok) {
      return await resp.json();
    }
    console.warn(`[TASK] Failed to fetch today's fortune JSON (${dateStr}), status: ${resp.status}`);
  } catch (err) {
    console.error("[TASK] Error fetching fortune JSON:", err);
  }
  return null;
}

export async function sendSingleFortune(env, sub) {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const dateLabel = kst.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const fortuneData = await fetchDailyFortuneData(env);
  const animalId = sub.birthYear ? getBirthAnimalId(sub.birthYear) : null;
  const animalData = (fortuneData && animalId) ? fortuneData.animals[animalId] : null;
  const calendar = fortuneData ? fortuneData.calendar : null;

  let contextInfo = "";
  if (calendar) {
    contextInfo += `\n오늘의 일진: ${calendar.ilchin} (${calendar.wolgeon} ${calendar.year_ganji})`;
    contextInfo += `\n음력 날짜: ${calendar.lunar_date}`;
  }
  if (animalData) {
    contextInfo += `\n구독자 띠(${animalId}) 오늘의 핵심 키워드: ${animalData.keyword.kr}`;
    contextInfo += `\n오늘의 점수: 종합 ${animalData.score.overall}, 금전 ${animalData.score.money}, 애정 ${animalData.score.love}, 건강 ${animalData.score.health}, 직업 ${animalData.score.work}`;
    contextInfo += `\n기초 분석: ${animalData.sections.overall.kr}`;
    contextInfo += `\n사주 인사이트: ${animalData.saju_insight || ""}`;
  }

  const prompt = `
당신은 '꽃돼지 연이'라는 페르소나를 가진 대한민국 최고의 사주 명리학자이자 따뜻한 마음을 가진 행운 가이드입니다. 
구독자에게 보낼 '${dateLabel}'의 '오늘의 맞춤 일일 운세'를 작성해 주세요.

구독자 정보:
- 출생 연도: ${sub.birthYear || "정보 없음"} ${animalId ? `(${animalId}띠)` : ""}

제공된 정확한 사주 데이터:${contextInfo || "\n(데이터 없음 - 일반적인 사주 원리로 작성해 주세요)"}

작성 지침:
1. 제공된 사주 데이터(일진, 키워드, 점수 등)를 바탕으로 내용을 구성하되, 인공지능이 쓴 느낌이 나지 않도록 훨씬 더 다정하고 구체적인 문장으로 다듬어 주세요.
2. '꽃돼지 연이' 특유의 희망차고 고급스러운 톤앤매너를 유지하세요.
3. 출력 형식은 반드시 HTML 태그를 사용한 이메일 본문 조각으로 작성하세요. (인라인 스타일 필수)
4. 섹션 구성:
   - <div style="margin-bottom: 20px; font-size: 1.1rem; color: #1e1b4b; line-height: 1.7;">(오늘의 총평 - 따뜻한 인사와 함께 시작)</div>
   - 각 운세 항목(금전, 애정, 건강, 직업)을 아이콘과 함께 세련되게 배치해 주세요.
   - <strong>✨ 연이의 조언:</strong> (오늘 가장 주의하거나 챙겨야 할 한 가지 포인트)

주의사항:
- 전체 길이는 600~800자 내외로 풍성하게 작성하세요.
- HTML 스타일은 인라인 스타일로 작성하며, 배경색이나 테두리 등을 활용해 '프리미엄 리포트' 느낌을 주어야 합니다.
- 마지막에 "당신의 오늘이 어제보다 더 반짝이길 바랄게요. - 꽃돼지 연이 드림" 문구를 포함해 주세요.
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
