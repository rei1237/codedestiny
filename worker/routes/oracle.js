import { callGeminiText } from "../lib/gemini.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

function clean(value) {
  return String(value || "").trim();
}

function limitText(value, max = 600) {
  return clean(value).slice(0, max);
}

function normalizeTheme(value) {
  const theme = clean(value).toLowerCase();
  return theme === "sultan" ? "sultan" : "alchemist";
}

function cardName(card) {
  return clean(card?.korean) || clean(card?.english) || "미지정 형상";
}

function normalizeCard(raw, fallbackRole) {
  const card = raw && typeof raw === "object" ? raw : {};
  return {
    role: clean(card.role) || fallbackRole,
    english: limitText(card.english || card.en, 80),
    korean: limitText(card.korean || card.ko || card.name, 80),
    symbol: limitText(card.symbol || card.sigil, 20),
    element: limitText(card.element || card.elem, 40),
    meaning: limitText(card.meaning || card.message, 2000),
    advice: limitText(card.advice || card.action, 1200),
  };
}

function parseJsonCandidate(text) {
  const source = clean(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(clean(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function buildFallbackOracle({ question, theme, cause, flow, judge }) {
  const isAlchemist = theme === "alchemist";
  const tone = isAlchemist
    ? "연금 도가니의 불꽃"
    : "사막의 별빛과 바람";

  const causeName = cardName(cause);
  const flowName = cardName(flow);
  const judgeName = cardName(judge);

  const causeMeaning = clean(cause.meaning) || "질문의 뿌리에 오래된 감정과 미해결 선택이 누적되어 있습니다.";
  const flowMeaning = clean(flow.meaning) || "현재는 선택의 에너지가 빠르게 재배열되는 변곡 구간입니다.";
  const judgeMeaning = clean(judge.meaning) || "최종적으로는 불필요한 집착을 정리하고 핵심 우선순위를 붙드는 것이 정답입니다.";

  const answer = [
    `${tone} 위에서 읽은 결과, 질문의 핵심은 '${causeName} → ${flowName} → ${judgeName}'로 이어지는 변환의 연쇄에 있습니다.`,
    `${causeName}는 지금의 고민이 우연히 생긴 것이 아니라, 과거의 선택 패턴과 감정 누적에서 비롯되었음을 보여줍니다. ${causeMeaning}`,
    `${flowName}는 바로 지금 작동 중인 힘을 드러냅니다. ${flowMeaning}`,
    `그리고 재판관인 ${judgeName}는 결론을 명확히 고정합니다. ${judgeMeaning}`,
    "즉, 지금 필요한 것은 더 많은 정보 수집보다 실행 우선순위 재정렬이며, 작은 행동을 연속으로 누적해 흐름을 고정하는 것입니다.",
  ].join(" ");

  const keyJudgement = `${judgeName}의 판결은 '핵심 하나를 선택하고, 나머지는 과감히 정리하라'입니다. 복잡함을 줄일수록 운세의 상승 구간이 빨리 열립니다.`;
  const energyFlow = `${causeName}가 만든 배경 압력 위에 ${flowName}의 움직임이 겹치며 에너지가 요동치는 구조입니다. 이때 ${judgeName}의 방향성에 맞춰 일정·관계·자원 배치를 단순화하면 운의 낭비를 크게 줄일 수 있습니다.`;
  const risk = "감정이 흔들리는 순간 즉흥적으로 결정을 확정하거나, 반대로 완벽한 타이밍만 기다리며 실행을 미루는 패턴이 가장 큰 리스크입니다. 기준 없는 확장보다 한 가지 축을 끝까지 밀어붙이세요.";
  const timing = "앞으로 7일은 정리와 기준 수립, 21일은 실행 루틴 고정, 40일은 첫 성과 확인 구간으로 읽힙니다. 초반 3일 안에 첫 액션을 시작하면 흐름이 훨씬 안정적으로 올라갑니다.";
  const actionTip = clean(judge.advice)
    || `${judgeName}의 조언: 오늘 안에 한 가지 결정을 문장으로 확정하고, 24시간 내 실행 가능한 첫 단계(10~20분 분량)를 즉시 완료하십시오.`;

  return {
    source: "fallback",
    answer,
    keyJudgement,
    energyFlow,
    risk,
    timing,
    actionTip,
    advice: actionTip,
  };
}

function fillRichText(value, fallback, minChars) {
  const text = clean(value);
  if (text.length >= minChars) return text;
  return fallback;
}

function normalizeOraclePayload(parsed, fallback) {
  const raw = parsed && typeof parsed === "object" ? parsed : {};

  return {
    source: parsed ? "gemini" : "fallback",
    answer: fillRichText(raw.answer, fallback.answer, 220),
    keyJudgement: fillRichText(raw.keyJudgement, fallback.keyJudgement, 70),
    energyFlow: fillRichText(raw.energyFlow, fallback.energyFlow, 90),
    risk: fillRichText(raw.risk, fallback.risk, 70),
    timing: fillRichText(raw.timing, fallback.timing, 50),
    actionTip: fillRichText(raw.actionTip, fallback.actionTip, 45),
    advice: fillRichText(raw.advice, fallback.advice || fallback.actionTip, 40),
  };
}

function buildGeomancyPrompt({ question, theme, cause, flow, judge }) {
  const styleGuide = theme === "sultan"
    ? "당신은 중동 사막의 궁정 지오맨시 대가입니다. 품위 있고 단정한 존댓말로, 별·사막·오아시스의 은유를 사용합니다."
    : "당신은 최고의 연금술 지오맨시 달인입니다. 존댓말로, 도가니·정련·원소 변환의 은유를 사용합니다.";

  return [
    styleGuide,
    "아래 3형상(원인/흐름/신탁)을 반드시 종합해, 매우 풍부하고 실전적인 최종 신탁을 작성하세요.",
    "반드시 JSON 하나만 출력하세요. 마크다운/코드블록 금지.",
    "JSON 스키마:",
    '{"answer":"","keyJudgement":"","energyFlow":"","risk":"","timing":"","actionTip":"","advice":""}',
    "작성 규칙:",
    "- answer: 최소 5~7문장, 원인->흐름->신탁의 인과를 명확히 연결",
    "- keyJudgement: 핵심 결론 2~3문장",
    "- energyFlow: 현재 에너지 구조와 방향성 3~4문장",
    "- risk: 주의할 함정 2~3문장",
    "- timing: 7일/21일/40일의 시간축 조언",
    "- actionTip: 오늘 바로 실행할 행동 2~3개를 문장으로 제시",
    "- advice: 현자의 한 줄 경구(1~2문장)",
    "- 한국어만 사용",
    "질문:",
    question,
    "카드 데이터(JSON):",
    JSON.stringify({ cause, flow, judge }),
  ].join("\n\n");
}

async function buildGeomancyOracle(env, payload) {
  const fallback = buildFallbackOracle(payload);
  const prompt = buildGeomancyPrompt(payload);

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["GEOMANCY_GEMINI_MODEL"],
    temperature: 0.83,
    topP: 0.92,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.GEOMANCY_PROVIDER_TIMEOUT_MS || 45000),
    maxAttemptsPerPair: 2,
  });

  if (!ai.ok) {
    return {
      ok: true,
      ...fallback,
      message: ai.message || "Gemini 응답 실패로 기본 지오맨시 해석을 반환했습니다.",
    };
  }

  const parsed = parseJsonCandidate(ai.text);
  const normalized = normalizeOraclePayload(parsed, fallback);
  return {
    ok: true,
    ...normalized,
    model: ai.model || "",
  };
}

export async function handleOracleRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const path = getRoutePath(request, "/api/oracle");
    if (path !== "/geomancy") return notFound();

    const body = await readJson(request);
    const question = limitText(body?.question, 500);
    if (question.length < 2) {
      return json({ ok: false, message: "질문을 2자 이상 입력해 주세요." }, { status: 400 });
    }

    const theme = normalizeTheme(body?.theme);
    const judgeRaw = body?.judge || body?.cards?.judge || null;
    const causeRaw = body?.cause || body?.cards?.cause || judgeRaw;
    const flowRaw = body?.flow || body?.cards?.flow || judgeRaw;

    const payload = {
      question,
      theme,
      cause: normalizeCard(causeRaw, "원인"),
      flow: normalizeCard(flowRaw, "흐름"),
      judge: normalizeCard(judgeRaw, "신탁"),
    };

    const result = await buildGeomancyOracle(env, payload);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
