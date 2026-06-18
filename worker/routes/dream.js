import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

let dreamGeminiCaller = callGeminiText;

function normalizeDreamText(payload) {
  const text = String(payload?.dreamText || "").trim();
  if (!text) return { ok: false, message: "꿈 내용을 입력해 주세요." };
  if (text.length < 8) return { ok: false, message: "꿈 내용을 조금 더 자세히 작성해 주세요. (최소 8자)" };
  if (text.length > 6000) return { ok: false, message: "꿈 내용이 너무 깁니다. 6000자 이하로 입력해 주세요." };
  return { ok: true, text };
}

function pickGeminiKeys(env) {
  return [
    env.GEMINIF_API_KEY1,
    env.GEMINIF_API_KEY2,
    env.GEMINIF_API_KEY3,
    env.GEMINIF_API_KEY4,
  ].map((v) => String(v || "").trim()).filter(Boolean);
}

function pickGeminiModels(env) {
  const primary = String(env.PSYCHO_ANALYSIS_GEMINI_MODEL || env.GEMINI_MODEL || "").trim();
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return primary ? [primary, ...defaults.filter((m) => m !== primary)] : defaults;
}

function psychoPrompt(dreamText) {
  return [
    "당신은 프로이트 관점의 꿈 해석 상담가입니다.",
    "반드시 한국어로 답하고, 추상적인 문장 대신 구체적인 행동 조언을 포함하세요.",
    "",
    "출력 형식:",
    "## 핵심 상징",
    "## 무의식의 갈등",
    "## 감정 패턴",
    "## 현재 삶과 연결",
    "## 7일 실천 가이드",
    "",
    "각 섹션은 3문단 이상 작성하고, 필요시 불릿 목록을 사용하세요.",
    "",
    "[꿈 원문]",
    dreamText,
  ].join("\n");
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => String(part?.text || "")).join("\n").trim();
}

function fallbackMarkdown(dreamText) {
  const compact = dreamText.replace(/\s+/g, " ").trim();
  return [
    "## 핵심 상징",
    `꿈의 반복 소재를 보면 "${compact.slice(0, 160)}" 구간에서 가장 강한 상징이 드러납니다. 이 상징은 현재 삶에서 자주 미루는 문제를 우회적으로 비추는 신호일 가능성이 큽니다.`,
    "상징이 불안하게 느껴졌다면 회피가 아니라 경계 신호로 받아들이는 편이 유리합니다. 지금은 해석보다 기록을 우선해 상징이 어떤 상황에서 재등장하는지 패턴을 모으는 것이 핵심입니다.",
    "특히 사람·장소·시간대가 반복된다면 그 조합이 현재 갈등의 트리거일 수 있습니다. 같은 소재가 다시 나오면 당시 감정 강도를 1~10으로 기록해 변화를 추적해 보세요.",
    "",
    "## 무의식의 갈등",
    "이 꿈은 '원하는 방향'과 '안전하게 머무르려는 본능'의 충돌을 비춥니다. 의식은 전진을 원하지만 무의식은 실패 비용을 크게 계산하는 상태입니다.",
    "갈등이 길어질수록 행동은 느려지고 자기비판이 늘어납니다. 이때 중요한 것은 완벽한 결론이 아니라 작은 실험을 통해 불확실성을 줄이는 방식입니다.",
    "오늘 할 수 있는 가장 작은 행동 하나를 정하고, 그 행동 후의 감정 변화를 기록하면 무의식의 저항이 실제보다 과장되었는지 확인할 수 있습니다.",
    "",
    "## 감정 패턴",
    "감정의 핵심은 불안 그 자체보다 '불안을 통제하지 못할 것 같은 두려움'에 가깝습니다. 그래서 꿈에서 장면이 급변하거나 논리가 끊기는 체감이 생깁니다.",
    "이 패턴은 낮 시간의 과부하와 연결되기 쉽습니다. 할 일을 줄이지 않은 상태에서 회복 시간을 생략하면 꿈에서 감정이 폭주하는 형태로 보상됩니다.",
    "잠들기 30분 전 자극(뉴스, 메시지, 업무)을 줄이고, 메모 5줄로 감정을 외부화하면 꿈의 긴장도가 완만해지는 경우가 많습니다.",
    "",
    "## 현재 삶과 연결",
    "현실에서는 관계·일·자기평가 중 하나에서 경계 설정이 흐려졌을 가능성이 큽니다. 꿈은 그 경계 붕괴를 과장된 이미지로 보여줘 우선순위 재정렬을 요구합니다.",
    "이번 주에는 모든 결정을 한 번에 바꾸기보다, 에너지 소모가 큰 한 지점만 선택해 정리하는 전략이 효과적입니다. 선택과 집중이 불안을 낮춥니다.",
    "특히 반복해서 마음을 빼앗는 주제가 있다면 그것이 현재 무의식의 1순위 과제입니다. 회피하지 말고 일정표에 공식적으로 배치해 '관리 가능한 과제'로 바꾸세요.",
    "",
    "## 7일 실천 가이드",
    "- 1일차: 꿈에서 가장 강한 장면 1개를 문장 3줄로 요약",
    "- 2일차: 그 장면과 닮은 현실 상황 1개를 찾고 감정 점수 기록",
    "- 3일차: 회피 중인 행동을 10분짜리 작업으로 쪼개 실행",
    "- 4일차: 불필요한 약속/업무 1개 취소 또는 위임",
    "- 5일차: 잠들기 전 5분 호흡 + 메모 5줄",
    "- 6일차: 한 주간 감정 점수 변화를 비교",
    "- 7일차: 다음 주에 유지할 습관 1개 확정",
  ].join("\n");
}

function normalizeConsultTone(value) {
  const tone = String(value || "comfort").trim().toLowerCase();
  if (tone === "motivation" || tone === "coaching") return tone;
  return "comfort";
}

function normalizeConsultCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const normalized = list
    .slice(0, 3)
    .map((item, idx) => {
      const name = String(item?.name || item?.card_name || `카드 ${idx + 1}`).trim();
      const orientation = String(item?.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
        : [];
      return { name, orientation, keywords };
    })
    .filter((item) => item.name);

  if (!normalized.length) {
    return { ok: false, message: "카드 정보가 필요합니다." };
  }

  return { ok: true, cards: normalized };
}

function consultToneGuide(tone) {
  if (tone === "motivation") {
    return "따뜻하지만 추진력 있는 꿈 상징 해석가처럼 말하고, 꿈이 남긴 에너지를 오늘 움직일 수 있는 작고 선명한 선택으로 내려놓으세요.";
  }
  if (tone === "coaching") {
    return "질문형 리딩 톤으로 말하고, 꿈의 장면, 감정의 잔향, 오늘의 선택을 차례로 짚어 주는 체크포인트를 제시하세요.";
  }
  return "정서적 안정감을 주는 꿈 상징 해석가의 톤으로 말하고, 불안을 키우지 않으면서 마음을 정리하는 작은 회복 행동을 제시하세요.";
}

function tarotConsultPrompt({ dreamText, cards, tone, summary }) {
  const cardLines = cards.map((card, idx) => {
    const orient = card.orientation === "reversed" ? "역방향" : "정방향";
    const keywords = card.keywords.length ? card.keywords.join(", ") : "키워드 없음";
    return `- ${idx + 1}번 카드: ${card.name} (${orient}) | 키워드: ${keywords}`;
  });

  return [
    "당신은 꿈의 잔향을 세 장의 상징 카드로 비추는 한국어 꿈 상징 해석가입니다.",
    consultToneGuide(tone),
    "과장된 예언이나 단정은 금지하고, 꿈의 상징, 깨어난 뒤의 감정, 카드의 방향을 연결해 신비롭지만 현실적인 조언을 남기세요.",
    "각 문단은 꿈을 해부하는 설명문이 아니라, 사용자가 자기 마음을 안전하게 알아차리도록 돕는 리딩 문장으로 작성하세요.",
    "제작 과정과 도구 이름은 장막 뒤에 두고, 꿈의 언어만 남기세요.",
    "출력은 반드시 아래 형식 그대로 작성하세요.",
    "",
    "## 꿈의 문을 여는 카드",
    "3~4문장. 꿈 원문에서 가장 선명한 장면과 세 카드 이름을 자연스럽게 엮어, 이 꿈이 어떤 문을 열었는지 읽으세요.",
    "",
    "## 마음 아래 흐르는 감정",
    "3~4문장. 꿈이 남긴 감정의 잔향과 카드의 정방향/역방향 흐름을 함께 읽고, 불안을 단정하지 말고 감정의 이름을 부드럽게 붙이세요.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈의 장면을 현실에서 안전하게 다루는 작은 행동 1",
    "- 관계나 일에서 바로 확인할 수 있는 작은 행동 1",
    "- 잠들기 전 마음을 봉인하는 회복 행동 1",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대를 단정하기보다 내 감정과 필요를 정리하는 방향으로 쓰세요.",
    "- 일/돈: 큰 결론보다 오늘 줄일 수 있는 부담과 현실적 우선순위를 쓰세요.",
    "- 회복: 수면, 호흡, 기록처럼 오늘 밤 반복 가능한 회복 루틴을 쓰세요.",
    "",
    "## 봉인 문장",
    "한 줄. 꿈의 빛을 오늘의 선택으로 옮기는 신비롭고 단정한 문장으로 마무리하세요.",
    "",
    "[사용자 꿈 원문]",
    dreamText,
    "",
    "[카드 정보]",
    ...cardLines,
    "",
    "[사전 요약 참고]",
    String(summary || "없음"),
  ].join("\n");
}

function fallbackTarotConsultMarkdown({ dreamText, cards }) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const cardLine = cards.map((card) => card.name).join(" · ");
  return [
    "## 꿈의 문을 여는 카드",
    `${cardLine || "오늘의 카드"} 조합은 꿈속 장면("${compact}")이 단순한 잔상이 아니라, 지금 마음이 붙잡고 있는 문을 비추고 있음을 드러냅니다. 이 문은 불안을 키우기 위한 것이 아니라, 아직 이름 붙이지 못한 감정과 필요를 조용히 드러내는 통로에 가깝습니다.`,
    "당장 결론을 내리기보다, 오늘 다룰 수 있는 한 장면만 골라 현실의 작은 행동으로 옮길 때 꿈의 파장이 안정됩니다.",
    "",
    "## 마음 아래 흐르는 감정",
    "지금 감정의 중심에는 두려움 자체보다, 내가 놓치고 싶지 않은 안정과 확인받고 싶은 마음이 함께 흐릅니다. 그래서 생각은 많아지지만, 실제 행동은 늦어지는 패턴이 나타날 수 있습니다.",
    "지금 필요한 것은 완벽한 해답이 아니라, 깨어난 뒤 남은 감정을 사실과 분리해 적어보는 짧은 정리입니다. 감정의 이름을 붙이는 순간 꿈은 막연한 예감이 아니라 나를 돌보는 언어가 됩니다.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈에서 가장 선명했던 장면 하나를 적고, 그때의 감정을 한 단어로 봉인하기",
    "- 관계나 일에서 미뤄 둔 확인 하나를 오늘 가능한 가장 작은 방식으로 정리하기",
    "- 잠들기 전 5분 동안 조명을 낮추고, 오늘의 감정을 세 문장으로 내려놓기",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대의 마음을 단정하기보다, 내가 바라는 안정과 거리감을 먼저 한 문장으로 정리하세요.",
    "- 일/돈: 큰 결정보다 이번 주 부담을 줄이는 작은 실행을 우선하면 흐름이 맑아집니다.",
    "- 회복: 회복 루틴은 길이보다 반복이 중요합니다. 짧은 기록과 호흡만으로도 밤의 파장이 낮아집니다.",
    "",
    "## 봉인 문장",
    "나는 꿈이 남긴 잔향을 오늘의 작고 안전한 선택으로 봉인한다.",
  ].join("\n");
}

function sectionText(markdown, heading) {
  const source = String(markdown || "");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`##\\s*${escaped}\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const found = source.match(pattern);
  return found ? String(found[1] || "").trim() : "";
}

function firstMeaningfulLine(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => String(line || "").replace(/^[-*]\s*/, "").trim())
    .find(Boolean) || "";
}

function extractActionPlan(markdown) {
  const section = sectionText(markdown, "오늘의 작은 선택 3가지");
  const lines = section
    .split(/\n+/)
    .map((line) => String(line || "").trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return lines.slice(0, 3);
}

function cleanPromptText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function uniquePromptItems(items, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = cleanPromptText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeDreamPromptContext(context) {
  return (Array.isArray(context) ? context : [])
    .slice(0, 5)
    .map((entry) => {
      const keyword = cleanPromptText(entry?.keyword || entry?.title || entry?.name);
      const meaning = cleanPromptText(entry?.meaning || entry?.summary || entry?.tip || entry?.text);
      if (!keyword && !meaning) return "";
      return keyword && meaning ? `${keyword}: ${meaning}` : (keyword || meaning);
    })
    .filter(Boolean);
}

function collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext) {
  const localKeywords = Array.isArray(localReading?.keywords) ? localReading.keywords : [];
  const cardKeywords = Array.isArray(localReading?.cards)
    ? localReading.cards.map((card) => card?.keyword || card?.energy_keyword || card?.card_name)
    : [];
  const contextKeywords = normalizeDreamPromptContext(dreamLibraryContext).map((line) => line.split(":")[0]);
  const dreamTokens = cleanPromptText(dreamText)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 5);
  return uniquePromptItems([...localKeywords, ...cardKeywords, ...contextKeywords, ...dreamTokens], 10);
}

function dreamPromptToneLine(tone) {
  if (tone === "motivation") return "문체는 따뜻하지만 힘 있게 흐르고, 사용자가 오늘 바로 붙잡을 수 있는 질문을 남깁니다.";
  if (tone === "coaching") return "문체는 질문을 선명하게 짚는 상담 톤으로 흐르고, 감정과 현실 행동의 경계를 차분히 나눕니다.";
  return "문체는 차분하고 안전하게 흐르며, 불안을 키우는 단정 대신 마음을 정돈하는 문장을 남깁니다.";
}

function buildDreamPromptCards(keywords) {
  return [
    { card_name: "장면 카드", symbol: "🌙", energy_keyword: keywords[0] || "꿈 원문" },
    { card_name: "상징 카드", symbol: "✦", energy_keyword: keywords[1] || "상징 단서" },
    { card_name: "질문 카드", symbol: "🪄", energy_keyword: keywords[2] || "상담 질문" },
  ];
}

function buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext }) {
  const keywordLine = keywords.length ? keywords.slice(0, 8).join(" · ") : "꿈 장면 · 감정 잔향 · 다음 질문";
  const contextLines = normalizeDreamPromptContext(dreamLibraryContext);
  const contextBlock = contextLines.length
    ? contextLines.map((line) => `- ${line}`).join("\n")
    : "- 꿈 원문 안에서 반복되는 장면과 감정의 결을 우선 살핍니다.";

  return [
    "당신은 꿈 상징 해석가입니다.",
    "아래 꿈을 확정 예언으로 몰아가지 말고, 꿈속 장면과 깨어난 뒤의 감정이 어디에 머무는지 전문적인 상담 문장으로 풀어 주세요.",
    dreamPromptToneLine(tone),
    "",
    "[꿈 원문]",
    dreamText,
    "",
    "[핵심 단서]",
    keywordLine,
    "",
    "[상징 참고]",
    contextBlock,
    "",
    "[응답의 그릇]",
    "1. 꿈의 첫빛: 가장 선명한 장면 하나를 고르고, 그 장면이 마음 안에서 어떤 문을 열었는지 드러내 주세요.",
    "2. 감정의 잔향: 깨어난 뒤 남은 감정을 이름 붙이고, 그 감정이 관계·일·회복 중 어디에 기울어 있는지 비춰 주세요.",
    "3. 숨은 상징: 반복되는 존재, 장소, 사물의 상징을 하나의 흐름으로 엮어 주세요.",
    "4. 오늘의 질문: 사용자가 스스로에게 던질 질문 3가지를 부드럽게 남겨 주세요.",
    "5. 작은 의식: 잠들기 전 5분 안에 할 수 있는 기록·호흡·정리 루틴을 제안해 주세요.",
    "6. 봉인 문장: 꿈이 남긴 빛을 오늘의 선택으로 옮기는 한 문장으로 마무리해 주세요.",
    "",
    "[봉인할 경계]",
    "- 죽음, 질병, 임신, 합격, 투자, 이별 여부를 확정하지 마세요.",
    "- 공포를 키우는 경고문이나 운명 단정은 피하세요.",
    "- 제작 과정과 도구 이름은 장막 뒤에 두세요.",
  ].join("\n");
}

function buildDreamPromptRecord({ dreamText, tone, localReading, dreamLibraryContext }) {
  const keywords = collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext);
  const cards = buildDreamPromptCards(keywords);
  const promptText = buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext });
  return {
    id: `dream-prompt-${Date.now()}`,
    kind: "dream_prompt",
    title: "꿈 프롬프트 생성서",
    summary: "꿈의 장면과 감정의 잔향이 AI에게 건넬 질문의 중심으로 모였습니다.",
    stageReadings: {
      scene: "꿈 원문에서 가장 선명한 장면을 먼저 붙잡습니다. 이 장면은 프롬프트의 첫 문을 열고, 상담이 막연한 해몽으로 흩어지지 않도록 중심을 잡습니다.",
      symbol: "반복되는 존재와 감정의 잔향을 함께 묶습니다. 상징은 단독으로 고정되지 않고, 깨어난 뒤 남은 느낌과 함께 프롬프트 안에서 살아납니다.",
      echo: "마지막 장은 AI에게 건넬 질문의 문을 가리킵니다. 관계, 일, 회복 중 어느 문을 열지 정하면 꿈의 언어가 더 또렷하게 흐릅니다.",
    },
    goldenAdvice: "봉인 카드 아래 완성된 프롬프트를 그대로 옮기면, 꿈의 잔향이 상담 가능한 질문으로 열립니다.",
    actionPlan: [
      "꿈 원문을 줄이지 않고 그대로 붙여 넣기",
      "깨어난 뒤 남은 감정을 한 단어로 덧붙이기",
      "관계·일·회복 중 가장 알고 싶은 문 하나 고르기",
    ],
    cards,
    keywords,
    promptText,
    consultingText: promptText,
    usedDreamText: dreamText,
    goldenCardName: "최종 프롬프트",
    goldenCardSymbol: "✶",
    source: "worker/local",
    model: "prompt-maker/local",
    createdAt: new Date().toISOString(),
  };
}

async function handleDreamPromptMaker(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const tone = normalizeConsultTone(body?.tone);
  const record = buildDreamPromptRecord({
    dreamText: normalized.text,
    tone,
    localReading: body?.localReading || {},
    dreamLibraryContext: body?.dreamLibraryContext || [],
  });
  return json({
    ok: true,
    cached: false,
    record,
    message: "ok",
  });
}

async function handleTarotConsult(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const cards = normalizeConsultCards(body?.cards);
  if (!cards.ok) {
    return json({ ok: false, message: cards.message }, { status: 400 });
  }

  const tone = normalizeConsultTone(body?.tone);
  const prompt = tarotConsultPrompt({
    dreamText: normalized.text,
    cards: cards.cards,
    tone,
    summary: String(body?.summary || "").trim(),
  });

  const ai = await dreamGeminiCaller(env, prompt, {
    keyEnvKeys: ["DREAM_TAROT_GEMINI_API_KEY", "PSYCHO_ANALYSIS_GEMINI_API_KEY"],
    modelEnvKeys: ["DREAM_TAROT_GEMINI_MODEL", "PSYCHO_ANALYSIS_GEMINI_MODEL"],
    temperature: 0.84,
    topP: 0.93,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.DREAM_TAROT_GEMINI_TIMEOUT_MS || env.PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS || 45000),
  });

  let markdown = "";
  let formatWarning = false;

  if (ai.ok) {
    markdown = String(ai.text || "").trim();
    formatWarning = !/^##\s+/m.test(markdown);
    if (formatWarning) {
      markdown = `## 꿈의 문을 여는 카드\n${markdown}`;
    }
  } else {
    markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
    formatWarning = true;
  }

  const summary = firstMeaningfulLine(sectionText(markdown, "꿈의 문을 여는 카드"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "마음 아래 흐르는 감정"));
  const actionPlan = extractActionPlan(markdown);

  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `dream-tarot-consult-${Date.now()}`,
      consultingText: markdown,
      summary,
      goldenAdvice,
      actionPlan,
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? ai.model : "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: ai.ok ? "ok" : ai.message,
  });
}

async function callGemini(env, prompt) {
  return callGeminiText(env, prompt, {
    modelEnvKeys: ["PSYCHO_ANALYSIS_GEMINI_MODEL"],
    temperature: 0.88,
    topP: 0.95,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS || 45000),
  });
}

async function handlePsychoAnalysis(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const prompt = psychoPrompt(normalized.text);
  const ai = await callGemini(env, prompt);

  let markdown = "";
  let formatWarning = false;

  if (ai.ok) {
    markdown = String(ai.text || "").trim();
    formatWarning = !/^##\s+/m.test(markdown);
    if (formatWarning) {
      markdown = `## 분석 결과\n${markdown}`;
    }
  } else {
    markdown = fallbackMarkdown(normalized.text);
    formatWarning = true;
  }

  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `psycho-${Date.now()}`,
      markdown,
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? ai.model : "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: ai.ok ? "ok" : ai.message,
  });
}

export function __setDreamGeminiCallerForTest(fn) {
  if (typeof fn === "function") {
    dreamGeminiCaller = fn;
  }
}

export function __resetDreamGeminiCallerForTest() {
  dreamGeminiCaller = callGeminiText;
}

export async function handleDreamRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    if (path === "/prompt-maker") {
      return await handleDreamPromptMaker(request);
    }
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
