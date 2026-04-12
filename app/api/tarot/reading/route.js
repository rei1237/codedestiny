import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";

export const runtime = "nodejs";

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

function pickModels() {
  const configured = String(
    process.env.TAROT_GEMINI_MODEL ||
      process.env.MINDSCAN_GEMINI_MODEL ||
      process.env.LIFEBOOK_GEMINI_MODEL ||
      "gemini-2.5-flash"
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  return Array.from(new Set([...configured, ...defaults]));
}

function parseTextFromGemini(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const c of candidates) {
    for (const part of c?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const unfenced = raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function safeCardName(card, idx) {
  const name = String(card?.nameKr || card?.name || card?.cardId || "").trim();
  return name || `카드 ${idx + 1}`;
}

function buildPrompt(body) {
  const category = String(body?.category || "general");
  const spreadType = String(body?.spreadType || "one_card");
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const cardLines = cards
    .map((c, i) => {
      const pos = String(c?.position || `position_${i + 1}`);
      const ori = String(c?.orientation || "upright");
      return `${i + 1}. ${safeCardName(c, i)} | 위치:${pos} | 방향:${ori}`;
    })
    .join("\n");

  return [
    "너는 한국어 타로 리딩 마스터다.",
    "질문자가 이해하기 쉽게 실전 조언 중심으로 작성해라.",
    "반드시 JSON만 반환하고 코드펜스는 금지한다.",
    "JSON 스키마:",
    '{"overall":"문단","card_flow":"문단","relationship_or_context":"문단","action_plan":"문단","timing":"문단","warning_and_tip":"문단"}',
    "각 필드는 최소 3문장 이상, 전체는 충분히 풍부하게 작성하라.",
    "주제 카테고리와 스프레드 문맥을 반영하라.",
    "---",
    `category: ${category}`,
    `spreadType: ${spreadType}`,
    "cards:",
    cardLines || "(카드 정보 없음)",
  ].join("\n");
}

function buildLocalReading(body) {
  const category = String(body?.category || "general");
  const spreadType = String(body?.spreadType || "one_card");
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const cardsText = cards
    .map((c, i) => `- ${safeCardName(c, i)} (${String(c?.orientation || "upright")})`)
    .join("\n");

  return {
    overall:
      `이번 리딩은 ${category} 주제를 중심으로 ${spreadType} 배열의 흐름을 읽습니다. 표면적으로는 변화가 느리게 보이지만, 내부적으로는 이미 방향 전환이 시작된 상태입니다. 성급한 결론보다 현재 신호를 정리해 다음 행동을 정확히 선택하는 것이 핵심입니다.`,
    card_flow:
      `${cardsText || "- 카드 정보가 제한되어 상징 흐름 중심으로 읽었습니다."}\n각 카드는 독립된 의미보다 연결된 서사로 해석해야 정확도가 올라갑니다. 초반 카드는 현재 심리와 현실 조건, 중반 카드는 갈등의 원인, 후반 카드는 전환 포인트를 보여주는 경향이 강합니다.`,
    relationship_or_context:
      "상대나 주변 환경의 반응은 즉시 명확해지기보다, 당신의 태도 변화에 따라 단계적으로 달라질 가능성이 큽니다. 확인을 재촉하기보다 신뢰를 누적하는 접근이 유리합니다. 대화에서는 단정형 표현보다 사실 기반 질문형 표현을 사용하면 오해를 줄일 수 있습니다.",
    action_plan:
      "1) 오늘 안에 우선순위 1개를 실행하고 결과를 기록하세요. 2) 감정 반응과 사실 데이터를 분리해 의사결정하세요. 3) 관계 이슈라면 48시간 내 짧고 명확한 확인 대화를 시도하세요. 실행을 작게 쪼개면 흐름 회복 속도가 빨라집니다.",
    timing:
      "단기적으로는 1~2주 내 체감 변화 신호가 들어오고, 중기적으로는 4~6주 구간에서 방향성이 더 선명해질 가능성이 있습니다. 중요한 결정은 감정이 과열된 당일보다는 하루 텀을 두고 확정하는 편이 안정적입니다. 타이밍을 기다리는 동안 준비도를 높이면 결과 품질이 올라갑니다.",
    warning_and_tip:
      "불안할수록 과해석과 단정이 늘어나는 패턴을 주의하세요. 리딩은 예언이 아니라 선택 품질을 높이는 도구입니다. 건강, 법률, 투자 관련 결론은 반드시 해당 분야 전문가 판단과 함께 검증하세요.",
  };
}

async function requestGemini(prompt) {
  const keys = pickGeminiKeys();
  if (!keys.length) return null;

  const models = pickModels();
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.82,
        maxOutputTokens: /gemini-2\.5-pro/i.test(model) ? 32768 : 8192,
      },
    };

    for (const key of keys) {
      const url = `${endpoint}?key=${encodeURIComponent(key)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) continue;
      const text = parseTextFromGemini(payload);
      if (text) return text;
    }
  }

  return null;
}

function normalizeGeminiReading(parsed, localBase) {
  if (!parsed || typeof parsed !== "object") return localBase;
  return {
    overall: String(parsed?.overall || localBase.overall),
    card_flow: String(parsed?.card_flow || localBase.card_flow),
    relationship_or_context: String(parsed?.relationship_or_context || localBase.relationship_or_context),
    action_plan: String(parsed?.action_plan || localBase.action_plan),
    timing: String(parsed?.timing || localBase.timing),
    warning_and_tip: String(parsed?.warning_and_tip || localBase.warning_and_tip),
  };
}

export async function POST(request) {
  const fallbackClone = request.clone();
  let upstreamResponse = null;

  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) return upstreamResponse;
  } catch {
    // fallback path below
  }

  const body = await fallbackClone.json().catch(() => ({}));
  const localBase = buildLocalReading(body);

  try {
    const prompt = buildPrompt(body);
    const geminiText = await requestGemini(prompt);
    if (geminiText) {
      const parsed = extractJson(geminiText);
      const reading = normalizeGeminiReading(parsed, localBase);
      return NextResponse.json(
        {
          ok: true,
          reading,
          source: "gemini-fallback",
          upstreamStatus: upstreamResponse?.status || null,
        },
        { status: 200 }
      );
    }
  } catch {
    // local fallback below
  }

  return NextResponse.json(
    {
      ok: true,
      reading: localBase,
      source: "local-fallback",
      upstreamStatus: upstreamResponse?.status || null,
    },
    { status: 200 }
  );
}
