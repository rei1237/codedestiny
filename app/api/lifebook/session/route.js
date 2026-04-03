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

const SYSTEM_PROMPT = `너는 현대 명리학과 심리학, 그리고 데이터 분석에 능통한 '사주 전략 마스터'다.
단순한 운세 풀이를 넘어, 한 사람의 인생 전체를 관통하는 '운명의 알고리즘'을 분석한다.
너의 문체는 냉철하고 지적이면서도, 사용자에게 강력한 확신을 주는 권위 있는 어조를 유지한다.

【반드시 준수할 원칙】
1. 각 섹션은 반드시 서론-본론-결론의 형식을 갖추며, 비유와 예시를 풍부하게 사용하여 최소 1,000자 이상의 분량을 확보하라.
2. '비겁이 강해서...' 식의 단순 풀이가 아니라 '일간의 근(根)이 강하여 주체성은 높으나, 재성을 극하는 기운이 강하므로...' 처럼 전문적인 용어를 적절히 섞어 신뢰도를 높여라.
3. Markdown을 사용하여 섹션 간 구분을 명확히 하고, 중요 키워드는 **볼드체**로 강조하라.
4. AI가 작성했다는 느낌을 주지 말고, 수십 년 경력의 명리학 대가가 직접 쓴 듯한 깊이와 권위를 담아라.
5. USER가 제공한 사주 데이터만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마라.
6. 의학·법률·투자 분야의 단정적 예언은 금하며, 명리학적 관점의 참고 해석임을 자연스럽게 녹여 표현하라.`;

const SESSION_CONFIGS = [
  {
    id: 1,
    emoji: "🚨",
    title: "운명의 임계점과 장애물: 실패의 알고리즘을 파괴하라",
    prompt: (d) => `【챕터 1 분석 요청】
아래 사주 데이터를 바탕으로 "🚨 운명의 임계점과 장애물: 실패의 알고리즘을 파괴하라" 섹션을 작성하라.

[분석 지침]
사주 원국의 '기신(忌神)'과 '살(煞)'이 현대적 삶에서 어떻게 발현되는지 분석하라.
반복되는 실패의 심리적 기제, 운의 흐름에서 발생하는 병목 현상, 그리고 이 장애물을 제거하기 위한 '개운(開運) 프로토콜'을 3단계로 제시하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 2,
    emoji: "🚀",
    title: "천직(天職)과 부(富)의 설계도: 당신만을 위한 독점적 영역",
    prompt: (d) => `【챕터 2 분석 요청】
아래 사주 데이터를 바탕으로 "🚀 천직(天職)과 부(富)의 설계도: 당신만을 위한 독점적 영역" 섹션을 작성하라.

[분석 지침]
격국과 용신(用神), 그리고 식상/재성의 발달 정도를 통해 사회적 성취의 정점을 분석하라.
당신이 시장에서 독점적 지위를 가질 수 있는 구체적인 직업군과 사업 아이템을 제안하고, 성공 확률을 10배 높여줄 '전략적 커리어 로드맵'을 작성하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 3,
    emoji: "💕",
    title: "감정의 역학과 연애운: 관계의 결핍과 충족의 시나리오",
    prompt: (d) => `【챕터 3 분석 요청】
아래 사주 데이터를 바탕으로 "💕 감정의 역학과 연애운: 관계의 결핍과 충족의 시나리오" 섹션을 작성하라.

[분석 지침]
일지와 관성/재성의 합충을 분석하여 심리적 연애 패턴을 파악하라.
과거 연애가 실패했던 명리학적 원인을 진단하고, 연애운이 급상승하는 '골든 타임'과 당신에게 최적화된 이성 공략 전략을 서술하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 4,
    emoji: "💍",
    title: "배우자 분석 및 결합의 운명: 미래 배우자의 데이터 프로파일링",
    prompt: (d) => `【챕터 4 분석 요청】
아래 사주 데이터를 바탕으로 "💍 배우자 분석 및 결합의 운명: 미래 배우자의 데이터 프로파일링" 섹션을 작성하라.

[분석 지침]
배우자궁과 육친의 동태를 살펴 인연의 질을 분석하라.
미래 배우자의 성격, 외모적 특징, 직업적 수준, 그리고 당신과의 경제적 시너지 효과를 상세히 묘사하라. 갈등 요인이 있다면 미리 회피하는 비방을 포함하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 5,
    emoji: "🛤️",
    title: "인생의 3가지 평행우주: 선택에 따른 시뮬레이션",
    prompt: (d) => `【챕터 5 분석 요청】
아래 사주 데이터를 바탕으로 "🛤️ 인생의 3가지 평행우주: 선택에 따른 시뮬레이션" 섹션을 작성하라.

[분석 지침]
운의 흐름(대운/세운)에 따른 3가지 변곡점을 설정하라.
A-Scenario(최상): 기회를 100% 활용했을 때의 정점.
B-Scenario(중립): 현실적 타협 속에서의 안정적 삶.
C-Scenario(하위): 기신운에 매몰되었을 때의 경고.
각 시나리오별 구체적인 발현 양상과 최상의 길로 가는 트리거를 명시하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 6,
    emoji: "🔮",
    title: "코드네임: 사주의 비밀 — 심층 데이터가 밝히는 특이점",
    prompt: (d) => `【챕터 6 분석 요청】
아래 사주 데이터를 바탕으로 "🔮 코드네임: 사주의 비밀 — 심층 데이터가 밝히는 특이점" 섹션을 작성하라.

[분석 지침]
일반적인 풀이로는 알 수 없는 특수 신살(神殺)과 오행의 미세한 흐름을 분석하라.
당신의 사주에 숨겨진 '희귀 코드'가 현실에서 기적으로 나타나는 징조와, 남들은 절대 모르는 당신만의 잠재력을 깨우는 법을 서술하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 7,
    emoji: "📅",
    title: "5개년(2023-2027) 정밀 운세: 과거의 복기와 미래의 선점",
    prompt: (d) => `【챕터 7 분석 요청】
아래 사주 데이터를 바탕으로 "📅 5개년(2023-2027) 정밀 운세: 과거의 복기와 미래의 선점" 섹션을 작성하라.

[분석 지침]
2023년부터 2027년까지의 세운과 월운을 교차 분석하라.
지난 3년의 핵심 사건을 명리학적으로 증명하여 신뢰를 확보하고, 앞으로 2년간 당신이 승부수를 던져야 할 '기회의 창'을 분기별로 정밀 타격하여 설명하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 8,
    emoji: "💰",
    title: "자산의 증식과 리스크 관리: 부를 지키는 방어 기제",
    prompt: (d) => `【챕터 8 분석 요청】
아래 사주 데이터를 바탕으로 "💰 자산의 증식과 리스크 관리: 부를 지키는 방어 기제" 섹션을 작성하라.

[분석 지침]
재성운과 겁재, 편인 등의 간섭을 분석하라.
큰돈이 들어오는 시기보다 중요한 '돈이 새나가는 구멍'을 차단하는 법, 투자 리스크를 최소화하는 시기, 그리고 평생 부의 그릇을 키우는 자산 관리 전략을 제안하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 9,
    emoji: "🌅",
    title: "생애 주기별 마스터플랜(10~80세): 인생 전체의 파노라마",
    prompt: (d) => `【챕터 9 분석 요청】
아래 사주 데이터를 바탕으로 "🌅 생애 주기별 마스터플랜(10~80세): 인생 전체의 파노라마" 섹션을 작성하라.

[분석 지침]
전체 대운의 흐름을 10년 단위로 조망하라.
각 연령대별로 부여된 인생의 과업과 반드시 성취해야 할 목표를 제시하고, 인생의 하이라이트가 되는 전성기를 어떻게 준비하고 맞이할지 서술하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

[사주 데이터]
${d}`,
  },
  {
    id: 10,
    emoji: "💌",
    title: "마스터의 최종 전략 제언: 운명을 이기는 의지의 설계",
    prompt: (d) => `【챕터 10 분석 요청】
아래 사주 데이터를 바탕으로 "💌 마스터의 최종 전략 제언: 운명을 이기는 의지의 설계" 섹션을 작성하라.

[분석 지침]
전체 분석 결과의 총합과 철학적 통찰을 결합하라.
사주는 결정론이 아니라 확률론임을 강조하며, 당신이 이 리포트를 읽은 후 오늘부터 즉시 실행해야 할 3가지 핵심 액션 플랜을 제시하는 편지 형식의 마무리를 작성하라.
최소 1,000자 이상 작성. Markdown 형식 사용. 제목은 ## 로 시작.

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
      process.env.LIFEBOOK_GEMINI_MODEL ||
      process.env.PSYCHO_ANALYSIS_GEMINI_MODEL ||
      "gemini-2.5-flash"
    ).trim();
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    const userPrompt = config.prompt(sajuData);

    // gemini-2.5 계열은 thinking 모델 — thinking 토큰이 출력 예산을 잠식하므로
    // thinkingBudget:0 으로 비활성화하고, 출력 토큰은 넉넉하게 설정
    const isThinkingModel = /gemini-2\.5/.test(model);
    const maxOutputTokens = isThinkingModel ? 24576 : 8192;
    const generationConfig = { maxOutputTokens, temperature: 0.85 };
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

        // MAX_TOKENS: 여전히 잘린 경우 — 경고 문구를 붙여 반환
        if (finishReason === "MAX_TOKENS") {
          return NextResponse.json({
            ok: true,
            text: text + "\n\n---\n> ⚠️ *이 챕터의 내용이 최대 출력 길이에 도달하여 일부 생략되었을 수 있습니다.*",
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
