import { callGeminiText } from "../lib/gemini.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { toAiLocale } from "../../lib/i18n/ai-locale.js";
import { REASONING_OUTPUT_RULE_LINES } from "../lib/fortune-reasoning-contract.js";
import { runPaidNarrativeDelivery } from "../lib/paid-narrative-delivery.js";
import { NARRATIVE_RESPONSE_SCHEMA, narrativePriorDigest, parseNarrativeResponse } from "../lib/paid-narrative-candidate.js";
import { HttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";

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

function fillRichText(value, fallback, minChars) {
  const text = clean(value);
  if (text.length >= minChars) return text;
  return fallback;
}

export function normalizeOraclePayload(parsed, fallback) {
  const raw = parsed && typeof parsed === "object" ? parsed : {};

  if (!fallback) {
    const minimums = { answer: 220, keyJudgement: 70, energyFlow: 90, risk: 70, timing: 50, actionTip: 45, advice: 40 };
    if (Object.entries(minimums).some(([field, min]) => clean(raw[field]).length < min)) return null;
    return { source: "gemini", ...Object.fromEntries(Object.keys(minimums).map((field) => [field, clean(raw[field])])) };
  }

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

function buildGeomancyPrompt({ question, theme, cause, flow, judge, locale }) {
  const styleGuide = theme === "sultan"
    ? "당신은 중동 사막의 궁정 지오맨시 대가입니다. 품위 있고 단정한 존댓말로, 별·사막·오아시스의 은유를 사용합니다."
    : "당신은 최고의 연금술 지오맨시 달인입니다. 존댓말로, 도가니·정련·원소 변환의 은유를 사용합니다.";

  // 부분 호출용 seed. 신탁 전체 JSON 스키마·필드별 문장 수를 넣으면 모델이 한 부분에 전체를 다시 쓴다.
  // 부분 범위와 출력 형식은 produce 가 붙인다.
  return [
    styleGuide,
    "아래 3형상(원인/흐름/신탁)을 종합해 실전적인 신탁을 이번 호출 범위만큼 작성하세요.",
    "작성 규칙:",
    // 유료 상담 공통 출력 계약(worker/lib/fortune-reasoning-contract.js) — 근거 먼저·사고과정 비노출·경향 표현.
    ...REASONING_OUTPUT_RULE_LINES.map((line) => `- ${line}`),
    "- 아래 카드 데이터에 실제로 있는 3형상(원인/흐름/신탁)의 이름을 그대로 인용해 근거로 삼는다. 카드에 없는 상징은 새로 만들지 않는다.",
    // 출력 언어 지시의 정본은 llm-client의 applyOutputLocale이다.
    ...(toAiLocale(locale) === "ko" ? ["- 한국어만 사용"] : []),
    "질문:",
    question,
    "카드 데이터(JSON):",
    JSON.stringify({ cause, flow, judge }),
  ].join("\n\n");
}

const ORACLE_SECTIONS = [
  ["answer", "질문과 세 형상의 종합 해석"], ["keyJudgement", "핵심 판단의 근거와 반대 조건"],
  ["energyFlow", "원인에서 현재 흐름으로 이어지는 패턴"], ["risk", "주의점과 선택의 대안"],
  ["timing", "7일·21일·40일 실천 계획: 예언이 아닌 점검 시점"],
  ["actionTip", "생활에 적용할 구체적인 행동과 점검 방법"], ["advice", "전체 해석을 연결한 성찰과 마무리"],
];
function oracleInput(body) {
  const question = limitText(body.question, 500);
  if (question.length < 2) throw new HttpError(400, "질문을 2자 이상 입력해 주세요.");
  const judge = body.judge || body.cards?.judge;
  if (!judge || !(judge.korean || judge.english || judge.ko || judge.en || judge.name)) throw new HttpError(422, "신탁 형상을 확인해 주세요.");
  return { question, theme: normalizeTheme(body.theme), locale: toAiLocale(getAmbientAiLocale() || body.locale),
    cause: normalizeCard(body.cause || body.cards?.cause || judge, "원인"),
    flow: normalizeCard(body.flow || body.cards?.flow || judge, "흐름"), judge: normalizeCard(judge, "신탁") };
}

// 앞 시도의 원문이 닫히지 않은 JSON이면 토큰 상한에서 끊긴 것이다. 그 부분의 재시도만 예산 2배(최대 32768)로 산다.
// 기본 예산(11000)은 비용 추정·검증 스크립트가 쓰므로 그대로 둔다.
function clippedRetryOptions(raw, options) {
  if (!raw) return options;
  try { JSON.parse(raw); return options; } catch { return { ...options, maxOutputTokens: Math.max(options.maxOutputTokens, Math.min(32768, options.maxOutputTokens * 2)) }; }
}

// The route and the server resume task share produce and render.
export function geomancyNarrativeAdapter(env) {
  return {
    reportType: "geomancyOracle",
    produce: async (task, state) => {
      const scope = task.id === "answer" ? "" : " 세 형상의 기본 상징 설명은 앞 부분에서 했으니 반복하지 말고 이번 범위로 바로 들어가세요.";
      const timingScope = task.id === "timing" ? "\n7일·21일·40일을 각각 하나의 점검 단계로 쓰세요. 각 단계에는 확인할 현실 자료, 실행할 작은 행동, 중단하거나 수정할 조건을 넣으세요. 형상의 뜻·불의 충동·질문 요약으로 시작하지 말고 '7일 동안'의 행동부터 시작하세요. 세 단계가 끝나면 마무리하며 종합 해석을 다시 쓰지 마세요." : "";
      const prompt = `${state.prompt}\n[이번 호출 범위] ${task.id}: ${task.prompt}${narrativePriorDigest(state, task)}\n이번 부분만 JSON {"body":"본문"}로 출력하세요. 제목·목차·마크다운·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자입니다.${scope} 세 형상의 실제 근거와 적용 조건을 연결하세요. 시간은 실천 점검 시점이며 확정 예언이 아닙니다.${timingScope}`;
      const ai = await callGeminiText(env, prompt, clippedRetryOptions(state.rawResponses?.[task.id], { model: clean(env.GEOMANCY_GEMINI_MODEL), temperature: 0.65,
        timeoutMs: Math.min(45000, Math.max(15000, Number(env.GEOMANCY_PROVIDER_TIMEOUT_MS) || 45000)),
        maxOutputTokens: 11000, thinkingBudget: 0, fallbackToWorkersAI: false, responseMimeType: "application/json", responseSchema: NARRATIVE_RESPONSE_SCHEMA }));
      if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ""} ${ai.model || ""}`)) return null;
      return parseNarrativeResponse(ai.text, state.evidenceHash);
    },
    render: state => ({ ...Object.fromEntries(ORACLE_SECTIONS.map(([id]) => [id, state.parts[id] || ""])),
      source: Object.keys(state.parts).length ? "gemini" : "pending", requestId: state.body.requestId,
      question: state.input.question, theme: state.input.theme, locale: state.locale,
      cards: { cause: state.input.cause, flow: state.input.flow, judge: state.input.judge } }),
  };
}

export async function handleOracleRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/oracle");
    if (path !== "/geomancy" && path !== "/result") return notFound();
    if ((path === "/geomancy" && method !== "POST") || (path === "/result" && method !== "GET")) return methodNotAllowed();
    const body = method === "POST" ? await readJson(request) : {};
    if (method === "POST" && !body.resumeResultId) oracleInput(body);

    // 결제 확인을 Gemini 호출 이전에 서버에서 강제한다 — 클라이언트 우회 직접 호출로
    // 무료 LLM 생성이 되지 않도록. celestial-harmony와 동일한 requirePremiumReportAccess 패턴.
    let auth;
    try {
      auth = await requireAuth(request, env);
    } catch (e) {
      if (Number(e?.status) === 401) {
        return json({ ok: false, code: "UNAUTHORIZED", message: "로그인 후 지오맨시 오라클을 이용해 주세요." }, { status: 401 });
      }
      throw e;
    }
    return await runPaidNarrativeDelivery(request, env, auth, body, {
      ...geomancyNarrativeAdapter(env), featureKey: "geomancy",
      verify: async original => {
        const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "geomancyOracle", {
          ...original, featureKey: "geomancy", reportType: "geomancyOracle",
          premiumAccessToken: clean(request.headers.get("x-premium-access-token") || original.premiumAccessToken || cookieValue(request, "cd_premium_access")) || undefined,
          _accessRoute: "/api/oracle",
        });
        if (!access?.ok) throw new HttpError(Number(access?.status || 402), "결제 확인이 필요합니다.", { code: access?.code || "PAYMENT_REQUIRED" });
      },
      seed: original => {
        const input = oracleInput(original);
        // 5,000원 상품: 7부분 × 1,800자 = 12,600자. 짧아도 완결된 본문은 전달한다.
        return { input, prompt: buildGeomancyPrompt(input),
          tasks: ORACLE_SECTIONS.map(([id, title]) => ({ id, prompt: title, minChars: 1800 })) };
      },
    });
  } catch (error) {
    if (error.code === "RESULT_STORAGE_UNAVAILABLE") return json({ ok: false, retryable: true, reason: error.code, resultId: error.resultId }, { status: 503 });
    return handleRouteError(error, { request, env });
  }
}
