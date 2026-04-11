import { NextResponse } from "next/server";

// Gemini API 키 목록 (순서대로 시도)
function pickGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

// 간지(干支) 계산 유틸
const GAN = ["갑","을","병","정","무","기","경","신","임","계"];
const JI  = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const JI_EN = ["rat","ox","tiger","rabbit","dragon","snake","horse","sheep","monkey","rooster","dog","pig"];
const GAN_ELEMENT = ["wood","wood","fire","fire","earth","earth","metal","metal","water","water"];
const JI_ELEMENT  = ["water","earth","wood","wood","earth","fire","fire","earth","metal","metal","earth","water"];

function todayGanji() {
  // 기준일: 2000-01-01 은 경진일 (간 6=경, 지 4=진)
  const base = new Date(2000, 0, 1);
  const now  = new Date();
  const diff = Math.floor((now - base) / 86400000);
  const ganIdx = ((diff % 10) + 10) % 10;
  const jiIdx  = ((diff % 12) + 12) % 12;
  return { gan: GAN[ganIdx], ji: JI[jiIdx], ganEl: GAN_ELEMENT[ganIdx], jiEl: JI_ELEMENT[jiIdx], jiAnimal: JI_EN[jiIdx] };
}

function birthYearZodiac(year) {
  const idx = ((year - 4) % 12 + 12) % 12;
  return { zodiac: JI_EN[idx], ji: JI[idx], element: JI_ELEMENT[idx] };
}

// 오늘의 운세 점수 계산 (생년 띠 + 오늘 일진)
function calcFortuneScore(birthYear, element) {
  const today = todayGanji();
  const birth = birthYearZodiac(birthYear);

  const HARMONY = { rat:["ox","dragon","monkey"], ox:["rat","snake","rooster"], tiger:["horse","dog"], rabbit:["sheep","pig"], dragon:["rat","monkey","rooster"], snake:["ox","rooster"], horse:["tiger","dog"], sheep:["rabbit","pig"], monkey:["rat","dragon"], rooster:["ox","dragon","snake"], dog:["tiger","horse"], pig:["rabbit","sheep"] };
  const CLASH   = { rat:"horse", horse:"rat", ox:"sheep", sheep:"ox", tiger:"monkey", monkey:"tiger", rabbit:"rooster", rooster:"rabbit", dragon:"dog", dog:"dragon", snake:"pig", pig:"snake" };

  const ELEMENT_CYCLE = { wood:["water","wood"], fire:["wood","fire"], earth:["fire","earth"], metal:["earth","metal"], water:["metal","water"] };

  let score = 50;
  // 띠 합 (합이면 +20)
  if (HARMONY[birth.zodiac]?.includes(today.jiAnimal)) score += 20;
  // 띠 충 (충이면 -20)
  if (CLASH[birth.zodiac] === today.jiAnimal) score -= 20;
  // 오행 상생 (오늘 일진 천간 오행이 내 오행을 생해주면 +15)
  if (ELEMENT_CYCLE[today.ganEl]?.includes(element)) score += 15;
  // 오행 상생 (내 오행 == 오늘 오행이면 +10)
  if (element === today.ganEl || element === today.jiEl) score += 10;
  // 상극 (오늘 오행이 내 오행을 극하면 -15)
  const CLAW = { wood:"metal", fire:"water", earth:"wood", metal:"fire", water:"earth" };
  if (CLAW[element] === today.ganEl) score -= 15;

  return Math.max(5, Math.min(100, score));
}

// 카테고리별 운세 맥락
const FORTUNE_CONTEXTS = {
  love:   "연애·이성·감정",
  money:  "재물·금전·투자",
  work:   "직업·커리어·학업",
  health: "건강·체력·정신",
  general:"종합 운세",
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { birthYear, element, zodiac, petName, question, category, usedToday } = body;

    // 하루 5회 제한 (클라이언트 신뢰 기반; 서버에선 추가 확인 불가 없음 — localStorage 사용)
    if (typeof usedToday === "number" && usedToday >= 5) {
      return NextResponse.json({ error: "오늘 운세 질문 횟수(5회)를 모두 사용했어요! 내일 다시 만나요 🌙" }, { status: 429 });
    }

    if (!birthYear || !element || !question) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const score = calcFortuneScore(Number(birthYear), element);
    const today = todayGanji();
    const cat   = FORTUNE_CONTEXTS[category] || FORTUNE_CONTEXTS.general;
    const fortune = score >= 75 ? "대길" : score >= 55 ? "길" : score >= 40 ? "평" : score >= 25 ? "소흉" : "흉";
    const zName = zodiac || birthYearZodiac(Number(birthYear)).zodiac;
    const ELEMENT_KR = { wood:"목(木)", fire:"화(火)", earth:"토(土)", metal:"금(金)", water:"수(水)" };

    const systemPrompt = `너는 '${petName || "운세다마"}' 라는 귀여운 운세 다마고치야. 사용자의 수호 동물이자 점쟁이 친구야.
스타일: 친근하고 귀엽게 말하되 점쟁이처럼 신비로운 느낌도 줘. 이모지 2~3개 포함. 답변은 3~5문장으로 간결하게.
사주 정보: ${zName}띠, 오행 ${ELEMENT_KR[element] || element}, 오늘 운세점수 ${score}점(${fortune}), 오늘 일진: ${today.gan}${today.ji}일.
카테고리: ${cat}
사용자 질문에 위 사주 정보를 바탕으로 구체적인 운세 조언을 한국어로 답해줘.`;

    const keys = pickGeminiKeys();
    if (!keys.length) {
      // API 키 없을 때 간단 로컬 답변
      const fallbacks = {
        love:   [`오늘 ${fortune} 운세야! ${score >= 50 ? "새로운 인연이 올 수 있어 ✨" : "조용히 내 마음을 돌보는 날이야 💙"}`, `${zName}띠는 오늘 ${today.gan}${today.ji}일과 ${score >= 60 ? "잘 어울려! 고백해도 좋아 💕" : "조금 어긋나. 서두르지 않는 게 좋아 🌸"}`],
        money:  [`오늘 재물운은 ${score}점! ${score >= 60 ? "작은 투자나 저축을 시작해봐 💰" : "큰 지출은 잠깐 미뤄봐 🌙"}`],
        work:   [`오늘 직업운 ${score}점! ${score >= 60 ? "집중력이 좋은 날이야. 중요한 업무를 처리해 📚" : "꼼꼼히 확인하고 실수를 줄여봐 💡"}`],
        health: [`오늘 건강운 ${score}점! ${score >= 60 ? "활동적으로 움직이면 좋아 🏃" : "무리하지 말고 충분히 쉬어 💤"}`],
        general:[`오늘 종합운세 ${score}점 (${fortune})! ${score >= 60 ? "적극적으로 행동하면 좋은 결과가 있어 🌟" : "신중하게 행동하면 무사히 넘어갈 수 있어 🍀"}`],
      };
      const arr = fallbacks[category] || fallbacks.general;
      return NextResponse.json({ answer: arr[Math.floor(Math.random() * arr.length)], score, fortune, today: `${today.gan}${today.ji}` });
    }

    const model = "gemini-2.0-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let lastErr = null;
    for (const key of keys) {
      try {
        const res = await fetch(`${endpoint}?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt + "\n\n질문: " + question }] }
            ],
            generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            ],
          }),
        });
        if (!res.ok) { lastErr = await res.text(); continue; }
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (!text) { lastErr = "empty response"; continue; }
        return NextResponse.json({ answer: text, score, fortune, today: `${today.gan}${today.ji}` });
      } catch (e) { lastErr = e.message; }
    }

    return NextResponse.json({ error: lastErr || "Gemini 연결 실패", score, fortune, today: `${today.gan}${today.ji}` }, { status: 502 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
