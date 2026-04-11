import { NextResponse } from "next/server";

// Gemini API 키 목록 (순서대로 시도)
function pickGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINIF_API_KEY5,
    process.env.GEMINIF_API_KEY6,
    process.env.GEMINIF_API_KEY7,
    process.env.GEMINIF_API_KEY8,
    process.env.GEMINIF_API_KEY9,
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

    // 로컬 폴백 생성기 (API 키 없거나 API 실패 시 사용)
    function buildLocalAnswer(cat, score, fortune, petName, zName, today) {
      const good = score >= 60;
      const great = score >= 75;
      const bad = score < 40;
      const name = petName || "운세다마";
      const tables = {
        love: great
          ? [`${name}가 느끼기엔 오늘 ${today}일 기운이 ${zName}띠에게 딱 맞아! 💕 좋아하는 사람에게 먼저 연락해봐 — 좋은 반응이 올 가능성이 높아 ✨ 오늘은 솔직한 마음이 통하는 날이야 🌸`, `${zName}띠 오늘 연애운 ${score}점 (${fortune})! 상대방도 너를 생각하고 있을지 몰라 💓 먼저 다가가는 게 행운의 열쇠야 🔑`]
          : good
          ? [`${today}일 기운이 ${zName}띠 연애운을 살짝 도와주고 있어 💙 너무 서두르지 말고 자연스럽게 표현해봐 🌙 오늘은 내 마음에 솔직해지는 연습도 좋아 🌸`, `오늘 인연운 ${score}점! 새 만남보다는 기존 관계를 다지는 게 더 좋을 것 같아 ☁️ 진심을 담은 작은 행동 하나가 큰 울림을 줄 수 있어 💫`]
          : [`오늘 ${fortune} 날이라 연애는 조금 신중하게 가는 게 좋아 💧 ${today}일 기운이 ${zName}띠와 약간 어긋나거든 🌙 너무 앞서 나가지 말고 상대방의 반응을 지켜봐 🍃`, `오늘 연애운 ${score}점 — 감정이 요동칠 수 있어 🌊 오해가 생기기 쉬우니 말 한마디도 부드럽게 해봐 🌸`],
        money: great
          ? [`${zName}띠 오늘 재물운 ${score}점 (${fortune})!! ${today}일이 너에게 금전 흐름을 열어주고 있어 💰 작은 지출도 좋은 인연이 되는 날 — 단, 과한 도박은 피해 🎰❌`, `오늘은 재물 씨앗 심기 좋은 날이야 🌱 소액 저축을 시작하거나 오래 미뤘던 금전 정리를 해봐 ✨ ${fortune} 기운이 뒤를 받쳐줄게 💫`]
          : good
          ? [`오늘 재물운 ${score}점! 큰 투자보다는 꼼꼼한 재정 점검이 더 어울리는 날이야 📋 ${today}일 기운이 ${zName}띠에게 안정을 권하고 있어 💙`, `소득보다 지출을 줄이는 날로 활용해봐 💡 오늘 절약한 만큼 곧 다른 형태로 돌아올 거야 🌸`]
          : [`오늘 재물운 ${score}점 (${fortune}) — 큰 지출이나 새 투자는 잠깐 미뤄봐 🌂 ${today}일 기운이 ${zName}띠 금전운과 살짝 맞서고 있거든 💧 오늘은 현금 흐름을 지키는 것만으로 충분해 🍃`, `지갑 가볍게 다니는 날! 충동 구매를 피하면 다음 좋은 운이 더 빨리 와 🌙`],
        work: great
          ? [`${today}일 기운이 ${zName}띠 직업운을 강하게 밀어주고 있어 🚀 지금이 중요한 제안 / 발표 / 면접 타이밍이야 ✨ 자신감 200%로 나가봐 — 결과가 좋을 거야 🌟`, `오늘 직업·학업운 ${score}점 (${fortune})!! 집중력이 평소보다 두 배 높아지는 날이야 📚 오래 미뤄둔 과제를 지금 처리해 🎯`]
          : good
          ? [`오늘 직업운 ${score}점! ${zName}띠에게 꾸준함이 빛나는 날이야 💡 화려한 성과보다 기초를 탄탄히 다지는 작업이 더 어울려 📋`, `동료와의 협력이 좋은 날이야 🤝 혼자 끙끙 앓지 말고 도움을 요청해봐 — 의외로 잘 풀릴 거야 🌸`]
          : [`오늘 직업운 ${score}점 — 실수하기 쉬운 날이야 🌊 한 번 더 확인하는 습관이 큰 실수를 막아줄 거야 🔍 ${today}일 기운이 ${zName}띠에게 차분함을 요청하고 있어 🍃`, `오늘은 새 프로젝트 시작보다는 기존 업무를 마무리하는 게 더 좋을 것 같아 ✅`],
        health: great
          ? [`오늘 건강운 ${score}점 (${fortune})!! ${today}일 기운이 ${zName}띠의 체력을 가득 채워주고 있어 💪 오늘 운동을 시작하거나 건강 루틴을 만들기엔 최고의 날이야 🏃`, `몸도 마음도 활기찬 날! 새로운 식단이나 건강 습관을 시도해봐 🥗 지금 시작하면 오래 지속될 거야 🌟`]
          : good
          ? [`오늘 건강운 ${score}점! 가볍게 몸을 움직여주면 더 좋아질 거야 🚶 스트레칭이나 짧은 산책부터 시작해봐 🌸`, `${today}일 ${zName}띠 컨디션 괜찮은 날 ✨ 규칙적인 식사와 충분한 수면이 건강운을 지켜줄 거야 🌙`]
          : [`오늘 건강운 ${score}점 (${fortune}) — 무리하지 않는 게 최선이야 💧 피로가 쌓이기 쉬운 날이니 충분히 쉬어줘 😴 ${today}일 기운이 ${zName}띠에게 휴식을 권하고 있거든 🍃`, `오늘은 과식이나 야식을 피하고 따뜻한 물 한 잔으로 몸을 달래봐 🍵`],
        general: great
          ? [`${today}일 ${zName}띠 오늘 대길 운세! 종합운 ${score}점이야 🌟 뭘 해도 잘 풀리는 하루니까 원하는 걸 적극적으로 시도해봐 ✨ 내가 옆에서 행운을 보내줄게 💫`, `오늘 최고의 기운이 함께야 🎊 중요한 결정이나 새로운 시작에 딱 좋은 날 — 자신감을 갖고 나아가봐 🚀`]
          : good
          ? [`오늘 종합운 ${score}점 (${fortune})! ${today}일 기운이 ${zName}띠를 잘 받쳐주고 있어 🌸 꾸준히 노력한 것들이 조금씩 결실 맺기 시작하는 날이야 💙`, `긍정적인 마음가짐이 오늘의 행운을 끌어당겨 ✨ 감사하는 마음으로 하루를 보내봐 — 더 좋은 일이 생길 거야 🍀`]
          : [`오늘 종합운 ${score}점 (${fortune}) — 신중하게 행동하는 날이야 🌂 ${today}일 기운이 ${zName}띠와 약간 엇갈리고 있어 💧 하지만 조심하면 무탈하게 넘어갈 수 있어 🍃`, `오늘은 새로운 시도보다 기존 것을 잘 유지하는 게 더 현명해 🌙 내가 항상 응원하고 있을게 💕`],
      };
      const arr = tables[cat] || tables.general;
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const keys = pickGeminiKeys();
    if (!keys.length) {
      return NextResponse.json({
        answer: buildLocalAnswer(category, score, fortune, petName, zName, `${today.gan}${today.ji}`),
        score, fortune, today: `${today.gan}${today.ji}`
      });
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

    return NextResponse.json({
      answer: buildLocalAnswer(category, score, fortune, petName, zName, `${today.gan}${today.ji}`),
      score, fortune, today: `${today.gan}${today.ji}`
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
