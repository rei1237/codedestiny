import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

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
  ].join("\n");
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

export async function handleDreamRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

