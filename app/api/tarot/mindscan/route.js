import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

const SLOT_RULES = [
  "상대방의 심리 상태와 최근의 고민",
  "겉으로 드러내는 행동과 실제 속마음의 차이",
  "상대방의 눈에 비친 당신의 모습",
  "주변 지인들에게 당신을 어떻게 말하고 다니는지",
  "상대방이 숨기고 있는 진짜 의도와 최종 진심",
];

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant",
  "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice",
  "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon",
  "The Sun", "Judgement", "The World",
];

const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const RANKS = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];

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
  const configured = String(process.env.MINDSCAN_GEMINI_MODEL || process.env.LIFEBOOK_GEMINI_MODEL || "gemini-2.5-flash")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  return Array.from(new Set([...configured, ...defaults]));
}

function cardNameFromId(cardId) {
  const id = Number(cardId);
  if (!Number.isFinite(id)) return "Unknown Card";
  const normalized = ((id % 78) + 78) % 78;
  if (normalized < 22) return MAJOR_ARCANA[normalized];
  const minor = normalized - 22;
  const suit = SUITS[Math.floor(minor / 14)] || SUITS[0];
  const rank = RANKS[minor % 14] || RANKS[0];
  return `${rank} of ${suit}`;
}

function ensureLongText(text, slotRule, mainCardName, subCardName) {
  let t = String(text || "").trim();
  if (t.length >= 500) return t;

  const booster = `\n\n지금 이 구역에서 특히 중요하게 보이는 흐름은 상대의 무의식이 ${mainCardName}의 상징을 통해 조심스럽게 드러나고, 보조 흐름인 ${subCardName}가 그 감정의 방향을 현실 행동으로 옮기려 한다는 점입니다. 이는 단순 호감/비호감의 문제가 아니라, 관계에서 상처받을 가능성을 미리 계산하는 방어 심리와도 깊게 연결되어 있습니다. 따라서 당신이 지금 당장 확인하고 싶은 답을 재촉하기보다, 상대가 스스로 안전하다고 느끼는 대화의 리듬을 만들어 주는 것이 핵심입니다. ${slotRule}라는 관점에서 보면 상대는 아직 마음을 완전히 숨기려는 것이 아니라, 말했을 때 관계가 틀어질 수 있다는 두려움을 먼저 관리하고 있습니다. 당신의 입장에서는 답답할 수 있지만, 이 간극은 감정의 부재가 아니라 감정의 과잉에서 오는 신중함일 가능성이 높습니다.`;

  while (t.length < 500) t += booster;
  return t;
}

function buildLocalSection(slot, rule, pair) {
  const mainCardName = cardNameFromId(pair.mainCardId);
  const subCardName = cardNameFromId(pair.subCardId);

  const base = `이 구역은 ${rule}을 읽는 핵심 축입니다. 메인 카드 ${mainCardName}는 상대의 중심 정서를, 보조 카드 ${subCardName}는 그 정서가 표면으로 올라오거나 억눌리는 방식을 보여 줍니다. 지금 상대의 내면은 단순한 감정 기복이 아니라, 관계의 안정성과 자기 보호 본능이 동시에 작동하는 복합 상태에 가깝습니다. 겉으로는 단정하고 이성적인 태도를 보일 수 있지만, 무의식 층에서는 당신과의 연결을 잃고 싶지 않다는 긴장감이 반복적으로 올라옵니다. 특히 최근에는 사소한 사건 하나를 크게 해석하며 스스로의 마음을 점검하는 경향이 강해졌고, 그래서 행동은 느려져도 감정 자체는 오히려 더 진해지는 모습이 관찰됩니다.\n\n두 사람 사이 에너지 흐름을 보면, 당신 쪽에서 먼저 온기와 명확성을 주었을 때 상대의 경계가 빠르게 완화되는 패턴이 있습니다. 반대로 확인을 재촉하거나 결론을 서두르면 상대는 다시 침묵과 거리두기로 회귀합니다. 이는 애정이 약해서가 아니라, 관계를 잘못 다뤘을 때 잃을 것을 크게 상상하는 불안이 작동하기 때문입니다. 따라서 지금의 해법은 상대의 속도를 존중하면서도, 당신의 마음을 부드럽고 분명한 언어로 반복 전달하는 것입니다. 그렇게 하면 상대는 자신이 안전하다고 느끼는 순간, 지금보다 훨씬 솔직하고 깊은 방식으로 진심을 표현할 가능성이 높습니다.`;

  return {
    slot,
    title: rule,
    mainCardName,
    subCardName,
    content: ensureLongText(base, rule, mainCardName, subCardName),
  };
}

function ensureEssayText(text) {
  let t = String(text || "").trim();
  const tail = "\n\n결국 사랑의 진실은 누가 먼저 정답을 맞추느냐가 아니라, 누가 먼저 상대의 두려움을 이해하고 품어 주느냐에서 드러납니다. 당신의 다정함이 흔들리지 않는다면, 지금의 정체는 멈춤이 아니라 관계의 결을 더 깊게 다듬는 시간으로 바뀔 것입니다.";
  while (t.length < 900) t += tail;
  return t;
}

function buildMasterAdviceEssay(sections) {
  const themes = sections
    .map((s) => `${s.slot}번 구역의 핵심은 ${s.title}`)
    .join(", ");

  const essay = `당신의 이번 스프레드는 한 사람의 감정이 얼마나 복합적으로 움직이는지, 그리고 관계가 단순한 호감의 직선이 아니라 서로의 상처와 기대가 교차하는 곡선임을 보여 줍니다. ${themes}라는 흐름은 결국 하나의 결론으로 수렴합니다. 상대의 마음은 닫혀 있기보다, 다치지 않기 위해 천천히 열리고 있다는 사실입니다.\n\n지금 당신이 느끼는 답답함은 틀린 감정이 아닙니다. 오히려 사랑을 진지하게 대하고 있다는 증거에 가깝습니다. 다만 이 시기에는 상대의 속도를 무시한 확답 요구보다, 감정을 안전하게 꺼낼 수 있는 환경을 먼저 만드는 태도가 더 큰 힘을 냅니다. 짧지만 분명한 다정함, 감정의 원인을 단정하지 않는 질문, 그리고 상대의 침묵을 거절로 오해하지 않는 인내가 필요합니다.\n\n당신이 해야 할 일은 스스로를 낮추는 것이 아니라, 관계를 성급한 결론으로 몰아붙이지 않는 성숙한 리더십을 발휘하는 것입니다. 그렇게 균형을 잡아 주면 상대는 방어를 풀고, 지금보다 훨씬 솔직한 언어로 마음을 건네게 됩니다.`;

  return ensureEssayText(essay);
}

function buildLocalReading(pairs) {
  const sections = pairs.slice(0, 5).map((pair, idx) => buildLocalSection(idx + 1, SLOT_RULES[idx], pair));
  return {
    source: "local",
    persona: "대한민국 최고의 타로 마스터",
    intro:
      "당신의 카드를 천천히 맞춰 보니, 상대의 마음은 단순한 호불호가 아니라 애정과 두려움이 교차하는 섬세한 결로 움직이고 있습니다. 지금부터 각 구역별로 무의식, 심리 갈등, 그리고 두 사람 사이의 에너지 흐름을 깊이 있게 짚어드릴게요.",
    sections,
    masterAdvice: buildMasterAdviceEssay(sections),
    closing:
      "당신은 이미 충분히 잘하고 있습니다. 지금 필요한 것은 정답을 서두르는 용기가 아니라, 관계가 안전해질 시간을 함께 견디는 성숙함입니다. 마음이 불안해질수록 짧고 따뜻한 확인, 그리고 상대의 속도를 존중하는 대화 리듬을 기억하세요. 그 태도가 결국 상대의 최종 진심을 현실로 끌어냅니다.",
  };
}

function buildGeminiPrompt(pairs) {
  const lines = pairs.slice(0, 5).map((p, i) => {
    const main = cardNameFromId(p.mainCardId);
    const sub = cardNameFromId(p.subCardId);
    return `${i + 1}번 구역 | 규칙: ${SLOT_RULES[i]} | 메인: ${main} | 보조: ${sub}`;
  });

  return [
    "너는 '대한민국 최고의 타로 마스터' 페르소나로 상담한다.",
    "문체는 다정하지만 권위 있고, 공감적 메시지를 반드시 포함한다.",
    "절대 키워드 나열형으로 쓰지 말고, 심리 해석형 서술문으로 작성한다.",
    "각 구역(section) content는 반드시 500자 이상 한국어로 작성한다.",
    "masterAdvice는 반드시 수필처럼 유려한 한국어 문체로 900자 이상 작성한다.",
    "각 구역에서 상대의 무의식, 현재 심리 갈등, 두 사람 사이의 보이지 않는 에너지 흐름을 반드시 다룬다.",
    "반드시 아래 슬롯 규칙을 정확히 적용한다:",
    "1번: 상대방의 심리 상태와 최근의 고민",
    "2번: 겉으로 드러내는 행동과 실제 속마음의 차이",
    "3번: 상대방의 눈에 비친 당신의 모습",
    "4번: 주변 지인들에게 당신을 어떻게 말하고 다니는지",
    "5번: 상대방이 숨기고 있는 진짜 의도와 최종 진심",
    "반드시 JSON만 반환한다. 코드펜스 금지.",
    "JSON 스키마:",
    '{"persona":"대한민국 최고의 타로 마스터","intro":"string","sections":[{"slot":1,"title":"string","mainCardName":"string","subCardName":"string","content":"500자 이상"}],"masterAdvice":"900자 이상 수필체","closing":"string"}',
    "입력 카드:",
    ...lines,
  ].join("\n");
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

function normalizeGeminiResult(parsed, pairs, localBase) {
  const sectionsRaw = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const sections = pairs.slice(0, 5).map((pair, idx) => {
    const slot = idx + 1;
    const found = sectionsRaw.find((s) => Number(s?.slot) === slot) || {};
    const ruleTitle = SLOT_RULES[idx];
    const mainCardName = String(found?.mainCardName || cardNameFromId(pair.mainCardId));
    const subCardName = String(found?.subCardName || cardNameFromId(pair.subCardId));
    const localSection = localBase.sections[idx];
    const content = ensureLongText(String(found?.content || localSection?.content || ""), ruleTitle, mainCardName, subCardName);

    return {
      slot,
      title: String(found?.title || ruleTitle),
      mainCardName,
      subCardName,
      content,
    };
  });

  return {
    source: "gemini",
    persona: "대한민국 최고의 타로 마스터",
    intro: String(parsed?.intro || localBase.intro),
    sections,
    masterAdvice: ensureEssayText(String(parsed?.masterAdvice || localBase.masterAdvice || "")),
    closing: String(parsed?.closing || localBase.closing),
  };
}

async function requestGemini(prompt) {
  const keys = pickGeminiKeys();
  if (keys.length === 0) {
    throw new Error("NO_GEMINI_KEY");
  }

  const models = pickModels();
  let lastError = "";

  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: /gemini-2\.5-pro/i.test(model) ? 65536 : 16384,
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
      if (!response.ok) {
        lastError = String(payload?.error?.message || `Gemini 요청 실패 (${response.status})`);
        continue;
      }
      const text = parseTextFromGemini(payload);
      if (text) return text;
      lastError = "Gemini 응답 텍스트가 비어 있습니다.";
    }
  }

  throw new Error(lastError || "Gemini 요청 실패");
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pairs = Array.isArray(body?.pairs) ? body.pairs : [];

    if (pairs.length < 5) {
      return NextResponse.json({ error: "카드 5쌍(메인+보조) 데이터가 필요합니다." }, { status: 400 });
    }

    const localBase = buildLocalReading(pairs);
    const prompt = buildGeminiPrompt(pairs);

    try {
      const geminiText = await requestGemini(prompt);
      const parsed = extractJson(geminiText);
      if (!parsed || typeof parsed !== "object") {
        return NextResponse.json(localBase, { status: 200 });
      }
      const result = normalizeGeminiResult(parsed, pairs, localBase);
      return NextResponse.json(result, { status: 200 });
    } catch {
      return NextResponse.json(localBase, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "mindscan reading failed" },
      { status: 500 }
    );
  }
}
