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

// ── 타로 카드 의미 DB (로컬 폴백용) ──────────────────────────────────────────
const MAJOR_ARCANA_MEANINGS = {
  "The Fool":           { energy: "새로운 시작·순수함", inner: "두근거리지만 표현 방법을 못 찾은 순수한 상태", style: "설레지만 조심스러운" },
  "The Magician":       { energy: "의지·집중·능력", inner: "좋은 인상을 주려 최선을 다하지만 내면에서 자기 검열 작동", style: "인상 관리 중" },
  "The High Priestess": { energy: "직관·비밀·내면", inner: "많은 감정을 담아두고 있지만 쉽게 드러내지 않음", style: "신비로운 거리두기" },
  "The Empress":        { energy: "풍요·돌봄·감수성", inner: "상대를 감싸고 싶지만 먼저 다가가는 것이 두려움", style: "따뜻하지만 의존 경계" },
  "The Emperor":        { energy: "권위·안정·통제", inner: "관계의 주도권을 갖고 싶지만 감정 표현에 서툼", style: "강인해 보이지만 내심 불안" },
  "The Hierophant":     { energy: "전통·신뢰·약속", inner: "관계를 진지하게 보며 확실한 약속을 원함", style: "진중하고 공식적" },
  "The Lovers":         { energy: "선택·유대·감정", inner: "당신에게 강한 감정이 있지만 선택 앞에서 흔들림", style: "감정적·결정 어려움" },
  "The Chariot":        { energy: "의지·전진·결단", inner: "목표를 향해 돌진하지만 감정은 뒤에 숨겨둠", style: "행동적·감정 억제" },
  "Strength":           { energy: "용기·인내·내적 힘", inner: "상처받을까 두렵지만 관계를 포기하고 싶지 않음", style: "조용하지만 강한 의지" },
  "The Hermit":         { energy: "성찰·고독·지혜", inner: "혼자 감정을 정리하는 중. 아직 외부 표현 준비 안 됨", style: "내향적·신중" },
  "Wheel of Fortune":   { energy: "변화·흐름·운명", inner: "상황이 바뀔 것을 기대하며 관망 중", style: "기회를 보는 현실주의" },
  "Justice":            { energy: "균형·책임·진실", inner: "관계의 공정함을 따지며 손해 보지 않으려 함", style: "이성적·판단 우선" },
  "The Hanged Man":     { energy: "희생·기다림·관점 전환", inner: "당장 행동하기 어렵지만 스스로 결론을 유예 중", style: "수동적이지만 내면 깊음" },
  "Death":              { energy: "전환·끝·변화", inner: "낡은 감정의 정리와 새 관계로의 이행 기로에 섬", style: "단호하지만 이별이 두려움" },
  "Temperance":         { energy: "조화·절제·통합", inner: "감정과 이성 사이에서 균형을 찾으려 노력 중", style: "온건하고 신중" },
  "The Devil":          { energy: "집착·욕망·속박", inner: "끊고 싶지만 끊기 어려운 감정적 집착이 있음", style: "강한 끌림·자기 통제 어려움" },
  "The Tower":          { energy: "충격·붕괴·각성", inner: "예상치 못한 감정 변화로 혼란스러운 상태", style: "불안정·감정 폭발 위험" },
  "The Star":           { energy: "희망·치유·기대", inner: "당신에게 좋은 감정을 품고 있으며 회복 중", style: "긍정적·기대 가득" },
  "The Moon":           { energy: "환상·불안·잠재의식", inner: "감정이 불명확하고 자신도 자기 마음을 잘 모르는 상태", style: "혼란스럽고 감정 기복 있음" },
  "The Sun":            { energy: "기쁨·활력·성공", inner: "당신을 생각하면 즐겁고 자연스럽게 밝아짐", style: "솔직하고 에너지 넘침" },
  "Judgement":          { energy: "부활·결단·평가", inner: "관계를 재평가하며 새로운 결정을 내리려는 내면 준비 중", style: "결단력 있음·자기 성찰 중" },
  "The World":          { energy: "완성·성취·통합", inner: "감정이 성숙하게 완결되어 있으며 다음 단계 준비됨", style: "여유롭고 자신감 있음" },
};

const SUIT_MEANINGS = {
  Wands:     { energy: "열정·의지·창의", inner: "에너지 넘치지만 충동적 표출 자제 중", style: "행동 지향적이나 감정 표현 어색" },
  Cups:      { energy: "감정·직관·관계", inner: "깊은 감정의 흐름, 상처받을까 조심스러움", style: "감정 풍부하지만 표현 조심" },
  Swords:    { energy: "이성·분석·갈등", inner: "관계를 머릿속으로 분석하며 결론 못 내림", style: "이성적·감정 직접 표현 불편" },
  Pentacles: { energy: "안정·현실·신뢰", inner: "실질적 신뢰 확인 원함, 천천히 확실하게", style: "현실적·확인 후 행동" },
};

function getCardMeaning(cardId) {
  const id = Number(cardId);
  if (!Number.isFinite(id)) return { energy: "신비로운 에너지", inner: "내면 깊은 감정", style: "복합적" };
  const norm = ((id % 78) + 78) % 78;
  if (norm < 22) {
    const name = MAJOR_ARCANA[norm];
    return MAJOR_ARCANA_MEANINGS[name] || { energy: "대 아르카나 에너지", inner: "심층 심리", style: "강렬한" };
  }
  const minor = norm - 22;
  const suit = SUITS[Math.floor(minor / 14)] || "Cups";
  return SUIT_MEANINGS[suit] || { energy: "소 아르카나 에너지", inner: "일상적 감정", style: "현실적" };
}

// ── LOCAL SECTION BUILDER ─────────────────────────────────────────────────────
function buildLocalSection(slot, rule, pair) {
  const mainCardName = cardNameFromId(pair.mainCardId);
  const subCardName = cardNameFromId(pair.subCardId);

  const mainM = getCardMeaning(pair.mainCardId);
  const subM = getCardMeaning(pair.subCardId);
  const base = `이 구역은 "${rule}"을 읽는 핵심 축입니다. 메인 카드 ${mainCardName}(${mainM.energy})는 상대의 현재 지배적 에너지를 담고 있으며, 보조 카드 ${subCardName}(${subM.energy})는 그 에너지가 실제 행동과 감정 표현 방식으로 어떻게 변환되는지를 보여 줍니다.\n\n지금 상대의 내면 상태는 "${mainM.inner}"에 가깝습니다. 겉으로는 ${mainM.style} 모습을 보이지만, 무의식 층에서는 당신과의 연결을 잃고 싶지 않다는 긴장감이 반복적으로 올라옵니다. 보조 흐름인 ${subCardName}의 에너지(${subM.energy})는 이 감정이 현실에서 어떻게 표출되는지를 조율하는 역할을 합니다. 즉 상대는 "${subM.inner}"라는 방어 패턴을 통해 감정을 관리하며, 표면적으로는 ${subM.style} 태도를 취합니다.\n\n두 사람 사이 에너지 흐름을 보면, 당신 쪽에서 먼저 온기와 명확성을 주었을 때 상대의 경계가 빠르게 완화되는 패턴이 있습니다. 반대로 확인을 재촉하거나 결론을 서두르면 상대는 다시 침묵과 거리두기로 회귀합니다. 이는 애정이 약해서가 아니라, 관계를 잘못 다뤘을 때 잃을 것을 크게 상상하는 불안이 작동하기 때문입니다. 따라서 지금의 해법은 ${mainCardName}가 상징하는 에너지의 밝은 면을 이끌어 내면서, 상대가 자신의 속도로 감정을 꺼낼 수 있는 환경을 만들어 주는 것입니다.`;

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
