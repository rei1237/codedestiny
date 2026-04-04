import { NextResponse } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function parseText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const c of candidates) {
    for (const p of (c?.content?.parts || [])) {
      if (typeof p?.text === "string" && p.text.trim()) return p.text.trim();
    }
  }
  return "";
}

function getFinishReason(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  return candidates[0]?.finishReason || "";
}

const SYSTEM_PROMPT = `너는 세계 최고의 사주 명리학자이자 심리학자다.
현재 분석 중인 [연애 비책: 운명의 설계도]는 단순한 운세 풀이가 아니라,
사용자의 사주팔자 전체를 분석하여 '한 권의 책' 분량의 개인 맞춤형 연애 전략을 제공하는 킬러 콘텐츠다.

【반드시 준수할 원칙】
1. 각 섹션은 반드시 서론-본론-결론의 형식을 갖추며, 풍부한 비유와 예시를 들어 최소 1,200자 이상의 분량을 확보하라.
2. 단순히 '식신이 강해서...' 식의 풀이가 아니라 '일간의 섬세한 감수성이 관계에서 어떻게 발현되며, 상대방은 이를 어떻게 받아들이는가'처럼 심리학적 깊이를 더하라.
3. Markdown을 사용하여 섹션을 명확히 구분하고 중요 키워드는 **볼드체**로 강조하라.
4. 수십 년 경력의 명리학 대가가 직접 쓴 연애 전략서처럼 깊이 있고 권위 있는 어조를 유지하라.
5. 사용자가 제공한 사주 데이터만을 근거로 해석하며, 데이터에 없는 사실을 지어내지 마라.
6. 의학·법률 분야의 단정적 예언은 금하며, 명리학적 관점의 참고 해석임을 자연스럽게 녹여라.
7. 한국어로 작성하라.`;

const SESSION_CONFIGS = [
  {
    id: 1,
    emoji: "🔑",
    title: "본연의 연애 자아: 나도 몰랐던 사랑의 본능",
    prompt: (d) => `【연애 비책 챕터 1 분석 요청】
아래 사주 데이터를 바탕으로 "🔑 본연의 연애 자아: 나도 몰랐던 사랑의 본능" 섹션을 작성하라.

[분석 지침]
- 일간(日干)별 연애 본능과 무의식적 욕구를 심층 분석하라
- 십성(十星) 비중으로 연애 주도권(식상다자, 재다자, 관다자 등)을 해석하라
- 연애 시 나타나는 MBTI적 사주 해석(사주-MBTI 매칭)을 서술하라
- 연애 자존감의 근원과 상처받는 포인트를 분석하라
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 2,
    emoji: "💘",
    title: "치명적 매력과 페로몬: 이성을 끌어당기는 나의 무기",
    prompt: (d) => `【연애 비책 챕터 2 분석 요청】
아래 사주 데이터를 바탕으로 "💘 치명적 매력과 페로몬: 이성을 끌어당기는 나의 무기" 섹션을 작성하라.

[분석 지침]
- 도화살(년지/일지/시지별 차이), 홍염살, 화개살의 현대적 해석
- 12운성(포태법)으로 본 이성에게 풍기는 첫인상과 아우라 분석
- 나만의 '플러팅' 강점과 약점을 구체적으로 서술
- 이성을 끌어당기는 개운(開運) 스타일링(색상, 장신구, 분위기) 제안
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 3,
    emoji: "🔮",
    title: "운명의 상대방 리포트: 나를 완성시킬 그/그녀의 사주",
    prompt: (d) => `【연애 비책 챕터 3 분석 요청】
아래 사주 데이터를 바탕으로 "🔮 운명의 상대방 리포트: 나를 완성시킬 그/그녀의 사주" 섹션을 작성하라.

[분석 지침]
- 내 사주에서 갈구하는 오행(용신/희신)을 가진 이성의 특징과 매력 포인트
- 배우자궁(일지) 분석을 통한 미래 배우자의 성격, 외모, 직업 상세 묘사
- 나를 보완하는 최상의 합(천간합, 지지합)을 가진 이성의 특징
- 절대 피해야 할 '빌런' 사주 특징(원진살, 귀문관살, 상충 등)
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 4,
    emoji: "⚔️",
    title: "실전 연애 전략: 사랑을 이기는 병법서",
    prompt: (d) => `【연애 비책 챕터 4 분석 요청】
아래 사주 데이터를 바탕으로 "⚔️ 실전 연애 전략: 사랑을 이기는 병법서" 섹션을 작성하라.

[분석 지침]
- 식상(Expression) 활용법: 마음을 효과적으로 전달하는 대화법
- 재성·관성의 조절: 밀당의 기술과 최적 타이밍
- 상대방의 마음을 여는 '공략 키워드' 10가지
- 카카오톡/DM 등 SNS 소통 시 주의사항과 성공 비법
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 5,
    emoji: "📅",
    title: "시기별 연애 운의 흐름: 운명이 허락하는 그날",
    prompt: (d) => `【연애 비책 챕터 5 분석 요청】
아래 사주 데이터를 바탕으로 "📅 시기별 연애 운의 흐름: 운명이 허락하는 그날" 섹션을 작성하라.

[분석 지침]
- 10년 대운(大運)의 연애/결혼운 흐름 분석
- 올해와 내년의 월별 연애 성공 확률 변화(1월~12월 상세 서술)
- 새로운 인연이 나타나는 '운명의 계절' 예측
- 재회운과 이별수의 정밀 시기 분석
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 6,
    emoji: "🌑",
    title: "연애의 어두운 면: 내 안의 그림자와 화해하라",
    prompt: (d) => `【연애 비책 챕터 6 분석 요청】
아래 사주 데이터를 바탕으로 "🌑 연애의 어두운 면: 내 안의 그림자와 화해하라" 섹션을 작성하라.

[분석 지침]
- 가스라이팅, 집착, 폭력성 등 내 사주에 잠재된 연애 리스크 분석
- '나쁜 남자/여자'에게 끌리는 사주적 이유와 해결책
- 권태기를 극복하는 사주 오행별 솔루션
- 과거 연애 패턴 반복을 끊어내는 업보(Karma) 해소 비책
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 7,
    emoji: "🔥",
    title: "섹슈얼리티와 육체적 궁합: 깊은 밤의 언어",
    prompt: (d) => `【연애 비책 챕터 7 분석 요청】
아래 사주 데이터를 바탕으로 "🔥 섹슈얼리티와 육체적 궁합: 깊은 밤의 언어" 섹션을 작성하라.

[분석 지침]
- 사주 내 수(水)기와 화(火)기의 조화로 본 성적 에너지 분석
- 밤의 궁합에서 내가 추구하는 스타일과 만족 포인트
- 상대방을 감동시키는 나의 '숨겨진 감각' 발굴
- 품격 있고 감각적인 표현으로 서술하라
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 8,
    emoji: "📲",
    title: "현대적 상황별 비책: 디지털 시대의 연애 전략",
    prompt: (d) => `【연애 비책 챕터 8 분석 요청】
아래 사주 데이터를 바탕으로 "📲 현대적 상황별 비책: 디지털 시대의 연애 전략" 섹션을 작성하라.

[분석 지침]
- 소개팅 앱에서 성공률 높이는 프로필 설정법 (사주 기반)
- 사내 연애, 장거리 연애, 비밀 연애의 성패 분석
- 썸에서 연인으로 넘어가는 결정적인 '한 방' 제안
- 카카오톡/SNS 답장 타이밍, 어투, 이모티콘 전략
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 9,
    emoji: "💍",
    title: "결혼과 정착: 운명의 동반자와 백년가약",
    prompt: (d) => `【연애 비책 챕터 9 분석 요청】
아래 사주 데이터를 바탕으로 "💍 결혼과 정착: 운명의 동반자와 백년가약" 섹션을 작성하라.

[분석 지침]
- 결혼하기 가장 좋은 최적의 나이와 시기 분석
- 고부 갈등, 장서 갈등 가능성과 미리 방어하는 법
- 자녀운과 연계된 가정의 행복도 전망
- 재혼운과 이혼 리스크 분석
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 10,
    emoji: "🌿",
    title: "맞춤형 개운 처방전: 사랑을 부르는 일상의 의식",
    prompt: (d) => `【연애 비책 챕터 10 분석 요청】
아래 사주 데이터를 바탕으로 "🌿 맞춤형 개운 처방전: 사랑을 부르는 일상의 의식" 섹션을 작성하라.

[분석 지침]
- 연애운을 높이는 침대 방향, 거실 인테리어 (풍수 지리)
- 나를 돋보이게 하는 향수, 보석, 음식 추천
- 마음의 평화와 매력을 얻기 위한 명상법과 확언 문구
- 오늘부터 즉시 실행할 3가지 핵심 연애 개운 액션 플랜
최소 1,200자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
];

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = Number(body?.sessionId || 0);
    const sajuData = String(body?.sajuData || "").trim();

    if (sessionId < 1 || sessionId > 10) {
      return NextResponse.json(
        { ok: false, message: "sessionId는 1~10 사이여야 합니다." },
        { status: 400 }
      );
    }

    if (!sajuData) {
      return NextResponse.json(
        { ok: false, message: "sajuData가 필요합니다." },
        { status: 400 }
      );
    }

    const keys = pickGeminiKeys();
    if (!keys.length) {
      return NextResponse.json(
        { ok: false, message: "서버 Gemini 키 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const config = SESSION_CONFIGS[sessionId - 1];
    const model = String(
      process.env.LOVESECRET_GEMINI_MODEL ||
      process.env.LIFEBOOK_GEMINI_MODEL ||
      process.env.PSYCHO_ANALYSIS_GEMINI_MODEL ||
      "gemini-2.5-flash"
    ).trim();

    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    const userPrompt = config.prompt(sajuData);

    const isThinkingModel = /gemini-2\.5/.test(model);
    const maxOutputTokens = isThinkingModel ? 24576 : 8192;
    const generationConfig = { maxOutputTokens, temperature: 0.88 };
    if (isThinkingModel) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    let lastError = null;
    for (const key of keys) {
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = new Error(
            payload?.error?.message || `Gemini 요청 실패 (${response.status})`
          );
          continue;
        }

        const text = parseText(payload);
        const finishReason = getFinishReason(payload);

        if (!text) {
          lastError = new Error("모델 응답이 비어 있습니다.");
          continue;
        }

        if (finishReason === "MAX_TOKENS") {
          return NextResponse.json({
            ok: true,
            text:
              text +
              "\n\n---\n> ⚠️ *이 챕터의 내용이 최대 출력 길이에 도달하여 일부 생략되었을 수 있습니다.*",
            sessionId,
            title: config.title,
            emoji: config.emoji,
            model,
            truncated: true,
          });
        }

        return NextResponse.json({
          ok: true,
          text,
          sessionId,
          title: config.title,
          emoji: config.emoji,
          model,
        });
      } catch (e) {
        lastError = e;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        message: String(lastError?.message || "챕터 생성에 실패했습니다."),
      },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: String(e?.message || "요청 처리에 실패했습니다.") },
      { status: 500 }
    );
  }
}
