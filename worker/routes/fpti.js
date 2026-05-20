import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";

const CHAPTER_TITLES = [
  "1. 기본 성향 구조",
  "2. 감정 패턴과 내면 심리",
  "3. 인간관계 스타일",
  "4. 연애 흐름과 사랑 방식",
  "5. 재물 감각과 돈 흐름",
  "6. 커리어 적성 및 직업 방향",
  "7. 인생 후반 흐름과 전환 포인트",
  "8. 지금 꼭 보완해야 할 약점",
  "9. 가장 강한 재능과 잠재력",
  "10. 현실 실행을 위한 30일 성장 루틴",
];

function clean(value) {
  return String(value || "").trim();
}

function clampList(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item)).filter(Boolean).slice(0, limit);
}

function pickText(input, fallback = "-") {
  const value = clean(input);
  return value || fallback;
}

function normalizeInput(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const result = src.result && typeof src.result === "object" ? src.result : src;
  const axis = result?.axis && typeof result.axis === "object" ? result.axis : {};
  const axisMeanings = result?.axisMeanings && typeof result.axisMeanings === "object" ? result.axisMeanings : {};
  const axisScores = result?.axisScores && typeof result.axisScores === "object" ? result.axisScores : {};

  return {
    code: pickText(result.code),
    typeName: pickText(result.typeName, "FPTI 타입"),
    oneLiner: pickText(result.oneLiner),
    summary: pickText(result.summary),
    axis: {
      energy: pickText(axis.energy),
      judgment: pickText(axis.judgment),
      execution: pickText(axis.execution),
      vision: pickText(axis.vision),
    },
    axisMeanings: {
      energy: pickText(axisMeanings.energy),
      judgment: pickText(axisMeanings.judgment),
      execution: pickText(axisMeanings.execution),
      vision: pickText(axisMeanings.vision),
    },
    axisScores: {
      A: Number(axisScores.A || 0),
      M: Number(axisScores.M || 0),
      H: Number(axisScores.H || 0),
      L: Number(axisScores.L || 0),
      F: Number(axisScores.F || 0),
      B: Number(axisScores.B || 0),
      R: Number(axisScores.R || 0),
      V: Number(axisScores.V || 0),
    },
    elementSummary: pickText(result.elementSummary),
    behaviorSummary: pickText(result.behaviorSummary),
    relationshipSummary: pickText(result.relationshipSummary),
    strategySummary: pickText(result.strategySummary),
    loveSummary: pickText(result.loveSummary),
    careerMoneySummary: pickText(result.careerMoneySummary),
    strengths: clampList(result.strengths, 5),
    weaknesses: clampList(result.weaknesses, 5),
    growthTips: clampList(result.growthTips, 8),
    careerTips: clampList(result.careerTips, 6),
    loveTips: clampList(result.loveTips, 6),
    evidence: {
      dayMaster: pickText(result?.evidence?.dayMaster),
      monthBranch: pickText(result?.evidence?.monthBranch),
      strongElements: clampList(result?.evidence?.strongElements, 3),
      weakElements: clampList(result?.evidence?.weakElements, 3),
      strongTenGods: clampList(result?.evidence?.strongTenGods, 3),
    },
  };
}

function buildPrompt(input) {
  return [
    "당신은 사주 명리학과 성향 분석을 결합하는 프리미엄 컨설턴트입니다.",
    "반드시 한국어로 작성하고, 운세 단정/공포 조장은 금지하며 실천형 조언을 제공합니다.",
    "반드시 아래 10개 챕터를 순서대로 작성하세요.",
    "각 챕터는 제목 1개 + 본문 2문단 이상으로 작성하고, 본문은 감성(공감) + 구체(행동) + 실행(루틴) 균형을 지킵니다.",
    "형식은 정확히 아래를 따르세요:",
    "## 1. 기본 성향 구조",
    "## 2. 감정 패턴과 내면 심리",
    "## 3. 인간관계 스타일",
    "## 4. 연애 흐름과 사랑 방식",
    "## 5. 재물 감각과 돈 흐름",
    "## 6. 커리어 적성 및 직업 방향",
    "## 7. 인생 후반 흐름과 전환 포인트",
    "## 8. 지금 꼭 보완해야 할 약점",
    "## 9. 가장 강한 재능과 잠재력",
    "## 10. 현실 실행을 위한 30일 성장 루틴",
    "30일 성장 루틴 챕터에는 주차별(1~4주차) 행동 계획을 반드시 포함하세요.",
    "가능하면 입력 데이터의 수치/근거(축 점수, 오행 강약, 강한 십성)를 문장에 자연스럽게 녹이세요.",
    "",
    "[FPTI 입력 데이터]",
    `코드: ${input.code}`,
    `타입명: ${input.typeName}`,
    `한줄: ${input.oneLiner}`,
    `요약: ${input.summary}`,
    `축 코드: 에너지 ${input.axis.energy}, 판단 ${input.axis.judgment}, 실행 ${input.axis.execution}, 전망 ${input.axis.vision}`,
    `축 의미: ${input.axisMeanings.energy} / ${input.axisMeanings.judgment} / ${input.axisMeanings.execution} / ${input.axisMeanings.vision}`,
    `축 점수: A ${input.axisScores.A}, M ${input.axisScores.M}, H ${input.axisScores.H}, L ${input.axisScores.L}, F ${input.axisScores.F}, B ${input.axisScores.B}, R ${input.axisScores.R}, V ${input.axisScores.V}`,
    `오행 요약: ${input.elementSummary}`,
    `행동 요약: ${input.behaviorSummary}`,
    `관계 요약: ${input.relationshipSummary}`,
    `전략 요약: ${input.strategySummary}`,
    `연애 요약: ${input.loveSummary}`,
    `재능/일/돈 요약: ${input.careerMoneySummary}`,
    `강점: ${input.strengths.join(" | ") || "없음"}`,
    `약점: ${input.weaknesses.join(" | ") || "없음"}`,
    `성장 팁: ${input.growthTips.join(" | ") || "없음"}`,
    `커리어 팁: ${input.careerTips.join(" | ") || "없음"}`,
    `연애 팁: ${input.loveTips.join(" | ") || "없음"}`,
    `일간: ${input.evidence.dayMaster}`,
    `월지: ${input.evidence.monthBranch}`,
    `강한 오행: ${input.evidence.strongElements.join(", ") || "없음"}`,
    `약한 오행: ${input.evidence.weakElements.join(", ") || "없음"}`,
    `강한 십성: ${input.evidence.strongTenGods.join(", ") || "없음"}`,
  ].join("\n");
}

function splitSections(markdown) {
  const text = clean(markdown);
  if (!text) return [];

  const chunks = text.split(/\n(?=##\s*\d+\.)/g);
  const parsed = chunks
    .map((chunk) => {
      const match = chunk.match(/^##\s*(\d+\.\s*.+?)\n([\s\S]*)$/);
      if (!match) return null;
      return {
        title: clean(match[1]),
        content: clean(match[2]),
      };
    })
    .filter(Boolean)
    .filter((item) => item.title && item.content);

  if (!parsed.length) return [];

  return CHAPTER_TITLES.map((title) => {
    const found = parsed.find((item) => item.title.startsWith(title.split(".")[0] + ".") || item.title.includes(title.slice(3)));
    return found || null;
  }).filter(Boolean);
}

function fallbackReport(input) {
  const sections = [
    {
      title: CHAPTER_TITLES[0],
      content: `${input.typeName}(${input.code})은 ${input.oneLiner} 특성이 핵심입니다. ${input.summary}\n\n축 구성은 ${input.axis.energy}-${input.axis.judgment}-${input.axis.execution}-${input.axis.vision}으로, 에너지 운용과 의사결정 패턴이 뚜렷하게 드러납니다.`,
    },
    {
      title: CHAPTER_TITLES[1],
      content: `감정 패턴은 ${input.relationshipSummary} 흐름이 강합니다. 스트레스 상황에서는 ${input.weaknesses[0] || "판단 편향"}이 먼저 나타나기 쉽습니다.\n\n감정이 과열될 때는 기록-정리-행동 순서를 지키면 회복 속도가 빨라집니다.`,
    },
    {
      title: CHAPTER_TITLES[2],
      content: `인간관계에서는 ${input.axisMeanings.judgment} 성향이 중심이 됩니다. 상대와의 템포 차이를 인식하면 불필요한 오해를 줄일 수 있습니다.\n\n대화 시 사실-감정-요청의 3단 구조를 사용하면 관계 만족도가 높아집니다.`,
    },
    {
      title: CHAPTER_TITLES[3],
      content: `${input.loveSummary}\n\n연애에서는 상대의 감정 리듬을 존중하고, 표현 빈도와 거리감을 사전에 합의하는 것이 핵심입니다.`,
    },
    {
      title: CHAPTER_TITLES[4],
      content: `재물 흐름은 ${input.careerMoneySummary} 패턴을 보입니다. 충동 지출보다 기준 예산을 먼저 설정하면 안정성이 올라갑니다.\n\n주간 단위로 고정비/성장비/실험비를 나누어 관리하면 리스크를 줄일 수 있습니다.`,
    },
    {
      title: CHAPTER_TITLES[5],
      content: `커리어에서는 강한 십성(${input.evidence.strongTenGods.join(", ") || "-"})을 핵심 역할로 연결할 때 성과가 커집니다.\n\n지금 단계에서는 한 번에 많은 목표보다 1개 핵심 과제를 깊게 완수하는 전략이 유리합니다.`,
    },
    {
      title: CHAPTER_TITLES[6],
      content: `인생 후반 흐름은 내적 안정성과 역할 전환 능력이 중요해집니다. 강한 오행(${input.evidence.strongElements.join(", ") || "-"})을 장기 자산으로 축적하세요.\n\n변곡점에서는 관계와 일의 우선순위를 재정렬하는 선택이 필요합니다.`,
    },
    {
      title: CHAPTER_TITLES[7],
      content: `현재 보완 과제는 ${input.weaknesses.join(" ")}입니다. 약한 오행(${input.evidence.weakElements.join(", ") || "-"})을 생활 습관으로 보완하면 균형이 빨리 회복됩니다.\n\n특히 피로 누적 구간에서는 결정 속도를 늦추고 확인 단계를 늘리세요.`,
    },
    {
      title: CHAPTER_TITLES[8],
      content: `가장 강한 재능은 ${input.strengths[0] || "핵심 상황에서의 집중력"}입니다. 이를 프로젝트 설계, 관계 조율, 문제 해결에 적극 활용하세요.\n\n재능은 반복 루틴으로 체화될 때 실질적인 성과로 전환됩니다.`,
    },
    {
      title: CHAPTER_TITLES[9],
      content:
        "1주차: 감정/에너지 변동 기록표 작성, 과열 트리거 2개 식별\n"
        + "2주차: 핵심 과제 1개 완수, 결과를 수치로 기록\n"
        + "3주차: 관계 대화 템플릿(사실-감정-요청) 적용\n"
        + "4주차: 유지 루틴 2개/중단 루틴 2개 확정 후 다음 달 계획 수립",
    },
  ];

  return {
    title: `${input.typeName} 프리미엄 심층 리포트`,
    summary: `${input.code} 유형의 4축 구조를 기반으로 연애/일/돈/관계를 10개 챕터로 분석했습니다.`,
    sections,
  };
}

async function handleDeepReport(request, env) {
  const auth = await requireAuth(request, env);
  const access = await requirePremiumReportAccess(env, auth.userId, "fptiPremium", {});
  if (!access?.ok) {
    return json(
      {
        ok: false,
        message: access?.message || "FPTI 프리미엄 리포트 결제가 필요합니다.",
        code: access?.code || "PAYMENT_REQUIRED",
      },
      { status: Number(access?.status || 402) },
    );
  }

  const body = await readJson(request);
  const input = normalizeInput(body);

  if (!input.code) {
    return json({ ok: false, message: "FPTI 코드가 누락되었습니다." }, { status: 400 });
  }

  const prompt = buildPrompt(input);
  const ai = await callGeminiText(env, prompt, {
    keyEnvKeys: ["FPTI_GEMINI_API_KEY1", "FPTI_GEMINI_API_KEY2", "PREMIUM_GEMINI_API_KEY1", "PREMIUM_GEMINI_API_KEY2"],
    modelEnvKeys: ["FPTI_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.8,
    topP: 0.92,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.FPTI_DEEP_REPORT_TIMEOUT_MS || 65000),
    totalTimeoutMs: Number(env.FPTI_DEEP_REPORT_TOTAL_TIMEOUT_MS || 90000),
    maxAttemptsPerPair: Number(env.FPTI_DEEP_REPORT_RETRIES || 2),
  });

  const geminiText = ai.ok ? clean(ai.text) : "";
  const parsedSections = splitSections(geminiText);
  const fallback = fallbackReport(input);
  const sections = parsedSections.length === CHAPTER_TITLES.length ? parsedSections : fallback.sections;

  return json({
    ok: true,
    data: {
      source: parsedSections.length === CHAPTER_TITLES.length ? "gemini" : "fallback",
      model: ai.ok ? ai.model : null,
      title: fallback.title,
      summary: fallback.summary,
      sections,
      generatedAt: new Date().toISOString(),
      warning: ai.ok ? undefined : ai.message || "Gemini unavailable. Fallback deep report generated.",
    },
  });
}

export async function handleFptiRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/fpti");

    if (method === "POST" && path === "/deep-report") {
      return handleDeepReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fpti", method: request?.method || "" } });
  }
}
