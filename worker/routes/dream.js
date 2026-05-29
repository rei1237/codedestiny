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

function normalizePsychoIntake(payload) {
  const intake = payload && typeof payload === "object" ? payload : {};
  const emotionalState = String(intake.emotionalState || intake.currentEmotion || "").trim().slice(0, 120);
  const recurringConcern = String(intake.recurringConcern || intake.mainConcern || "").trim().slice(0, 220);
  const recentStressContext = String(intake.recentStressContext || intake.stressContext || "").trim().slice(0, 220);
  const desiredOutcome = String(intake.desiredOutcome || intake.goal || "").trim().slice(0, 220);

  return {
    emotionalState,
    recurringConcern,
    recentStressContext,
    desiredOutcome,
  };
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

function psychoPrompt(dreamText, intake) {
  const intakeBlock = [
    `- 현재 가장 강한 감정: ${intake.emotionalState || "미입력"}`,
    `- 반복되는 고민: ${intake.recurringConcern || "미입력"}`,
    `- 최근 스트레스 맥락: ${intake.recentStressContext || "미입력"}`,
    `- 이번 해몽에서 원하는 도움: ${intake.desiredOutcome || "미입력"}`,
  ].join("\n");

  return [
    "당신은 정신건강 상담 훈련을 받은 프로이트 관점의 꿈 해석 상담가입니다.",
    "반드시 한국어로 답하고, 단정/예언/낙인 없이 공감 기반으로 설명하세요.",
    "진단명 확정, 병리 낙인, 공포 유발 문장을 금지하고 행동 가능한 조언을 제시하세요.",
    "",
    "출력 형식:",
    "## 핵심 상징",
    "## 무의식의 갈등",
    "## 감정 패턴",
    "## 현재 삶과 연결",
    "## 7일 실천 가이드",
    "## 상담 질문 3개",
    "",
    "각 섹션은 3문단 이상 작성하고, 필요시 불릿 목록을 사용하세요.",
    "'7일 실천 가이드'는 하루 1개씩 현실적으로 실행 가능한 항목을 작성하세요.",
    "'상담 질문 3개'는 내담자가 자기 인식을 확장할 수 있는 개방형 질문만 제시하세요.",
    "",
    "[상담 인테이크]",
    intakeBlock,
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
    `꿈의 반복 소재를 보면 "${compact.slice(0, 160)}" 구간에서 가장 강한 상징이 드러납니다. 이 상징은 현재 삶에서 자주 미루는 문제를 우회적으로 보여주는 신호일 가능성이 큽니다.`,
    "상징이 불안하게 느껴졌다면 회피가 아니라 경계 신호로 받아들이는 편이 유리합니다. 지금은 해석보다 기록을 우선해 상징이 어떤 상황에서 재등장하는지 패턴을 모으는 것이 핵심입니다.",
    "특히 사람·장소·시간대가 반복된다면 그 조합이 현재 갈등의 트리거일 수 있습니다. 같은 소재가 다시 나오면 당시 감정 강도를 1~10으로 기록해 변화를 추적해 보세요.",
    "",
    "## 무의식의 갈등",
    "이 꿈은 '원하는 방향'과 '안전하게 머무르려는 본능'의 충돌을 보여줍니다. 의식은 전진을 원하지만 무의식은 실패 비용을 크게 계산하는 상태입니다.",
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
    "",
    "## 상담 질문 3개",
    "- 이 꿈에서 가장 강하게 느껴진 감정은 현실의 어떤 장면과 닮아 있나요?",
    "- 반복해서 피하고 있는 선택이 있다면, 그것이 두렵게 느껴지는 핵심 이유는 무엇인가요?",
    "- 이번 주에 내 마음을 보호하기 위해 반드시 지켜야 할 경계 1가지는 무엇인가요?",
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
    return "따뜻하지만 추진력 있는 코치처럼 말하고, 실행 타이밍과 행동 동선을 분명하게 제시하세요.";
  }
  if (tone === "coaching") {
    return "질문형 코칭 톤으로 말하고, 감정-사실-행동 순서로 현실적인 체크포인트를 제시하세요.";
  }
  return "정서적 안정감을 주는 상담사 톤으로 말하고, 불안을 낮추는 구체 행동을 제시하세요.";
}

function tarotConsultPrompt({ dreamText, cards, tone, summary }) {
  const cardLines = cards.map((card, idx) => {
    const orient = card.orientation === "reversed" ? "역방향" : "정방향";
    const keywords = card.keywords.length ? card.keywords.join(", ") : "키워드 없음";
    return `- ${idx + 1}번 카드: ${card.name} (${orient}) | 키워드: ${keywords}`;
  });

  return [
    "당신은 한국어 전문 꿈-타로 상담사입니다.",
    consultToneGuide(tone),
    "과장된 예언이나 단정은 금지하고, 현실 행동 중심의 조언을 제공합니다.",
    "출력은 반드시 아래 형식 그대로 작성하세요.",
    "",
    "## 카드 핵심 진단",
    "3~4문장",
    "",
    "## 상담사가 보는 현재 감정",
    "3~4문장",
    "",
    "## 지금 바로 할 3가지",
    "- 항목 1",
    "- 항목 2",
    "- 항목 3",
    "",
    "## 관계/일/회복 한 줄 가이드",
    "- 관계: ...",
    "- 일/돈: ...",
    "- 회복: ...",
    "",
    "## 오늘의 확언",
    "한 줄",
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
    "## 카드 핵심 진단",
    `${cardLine || "오늘의 카드"} 조합은 마음속 불안을 피하려는 흐름보다, 지금 마주하고 정리해야 할 과제를 보여줍니다. 꿈 속 장면("${compact}")은 감정 정리가 늦어질수록 피로가 커진다는 신호에 가깝습니다.`,
    "당장 결론을 내리기보다, 오늘 처리 가능한 한 가지를 먼저 끝내는 방식이 현재 운을 안정시키는 핵심입니다.",
    "",
    "## 상담사가 보는 현재 감정",
    "지금 감정의 중심은 두려움 자체보다, 통제력을 잃을 수 있다는 긴장감입니다. 그래서 생각은 많아지는데 행동은 지연되는 패턴이 나타날 수 있습니다.",
    "지금 필요한 것은 완벽한 해답이 아니라, 내 감정을 사실처럼 적어보는 짧은 정리 습관입니다. 감정을 이름 붙이는 순간 불안 강도는 실제로 낮아집니다.",
    "",
    "## 지금 바로 할 3가지",
    "- 오늘 가장 불안했던 장면을 한 문장으로 적고, 감정 점수를 1~10으로 기록하기",
    "- 미루던 일 1개를 15분 단위로 쪼개 바로 시작하기",
    "- 잠들기 전 5분 동안 디지털 자극을 끄고 호흡 정리하기",
    "",
    "## 관계/일/회복 한 줄 가이드",
    "- 관계: 상대를 해석하기보다 내 필요를 한 문장으로 먼저 표현하세요.",
    "- 일/돈: 큰 결정보다 이번 주 리스크를 줄이는 작은 실행을 우선하세요.",
    "- 회복: 회복 루틴은 길이보다 반복이 중요합니다. 5분이라도 매일 유지하세요.",
    "",
    "## 오늘의 확언",
    "나는 오늘의 작은 실행으로 내일의 불안을 줄인다.",
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
  const section = sectionText(markdown, "지금 바로 할 3가지");
  const lines = section
    .split(/\n+/)
    .map((line) => String(line || "").trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return lines.slice(0, 3);
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

  const ai = await callGeminiText(env, prompt, {
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
      markdown = `## 카드 핵심 진단\n${markdown}`;
    }
  } else {
    markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
    formatWarning = true;
  }

  const summary = firstMeaningfulLine(sectionText(markdown, "카드 핵심 진단"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "상담사가 보는 현재 감정"));
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
  return dreamGeminiCaller(env, prompt, {
    keyEnvKeys: ["PSYCHO_ANALYSIS_GEMINI_API_KEY", "DREAM_TAROT_GEMINI_API_KEY"],
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

  const intake = normalizePsychoIntake(body?.intake || body);
  const prompt = psychoPrompt(normalized.text, intake);
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
    llm: {
      used: Boolean(ai.ok),
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? String(ai.model || "gemini") : "fallback/local",
      error: ai.ok ? "" : String(ai.message || ""),
    },
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
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

