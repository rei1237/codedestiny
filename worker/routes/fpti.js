import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";

const CHAPTER_MIN = 2500;
const CHAPTERS = [
  { id: "overview", title: "I. FPTI 유형 총론 - 내 운명 성향의 핵심 구조" },
  { id: "inner", title: "II. 내면 성격과 감정 패턴" },
  { id: "relationship", title: "III. 관계와 연애 패턴" },
  { id: "career", title: "IV. 일과 재능의 사용 방식" },
  { id: "wealth", title: "V. 돈과 현실 감각" },
  { id: "stress", title: "VI. 스트레스와 그림자 성향" },
  { id: "growth", title: "VII. 성장 전략과 실행 로드맵" },
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

function trigrams(text) {
  const normalized = clean(text).replace(/\s+/g, " ");
  const set = new Set();
  if (!normalized) return set;
  if (normalized.length < 3) {
    set.add(normalized);
    return set;
  }
  for (let i = 0; i < normalized.length - 2; i += 1) {
    set.add(normalized.slice(i, i + 3));
  }
  return set;
}

function similarity(a, b) {
  const ga = trigrams(a);
  const gb = trigrams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const t of ga) if (gb.has(t)) inter += 1;
  const union = ga.size + gb.size - inter;
  return union ? inter / union : 0;
}

function dedupeParagraphs(paragraphs) {
  const out = [];
  for (const p of paragraphs.map((v) => clean(v)).filter(Boolean)) {
    if (out.some((x) => similarity(x, p) >= 0.8)) continue;
    out.push(p);
  }
  return out;
}

function axisLine(label, score, high, mid, low) {
  if (score >= 70) return `${label} ${score}점: ${high}`;
  if (score >= 45) return `${label} ${score}점: ${mid}`;
  return `${label} ${score}점: ${low}`;
}

function baseParagraphs(input) {
  const s = {
    energy: Number(input.axisScores.A || 50),
    judgment: Number(input.axisScores.H || 50),
    execution: Number(input.axisScores.F || 50),
    vision: Number(input.axisScores.R || 50),
  };

  return [
    `${input.typeName}(${input.code}) 분석은 사주 기반 성향 축과 행동 패턴을 결합해 구성됩니다. ${axisLine("에너지", s.energy, "외부 상호작용에서 동력이 빠르게 올라갑니다.", "상황에 따라 외부 확장과 내부 정리를 균형 있게 운용합니다.", "내면 정리 시간에서 안정성과 집중력이 강화됩니다.")} ${axisLine("판단", s.judgment, "공감과 정서 맥락을 빠르게 읽어 관계 반응이 민감합니다.", "공감과 구조 판단을 함께 점검해 균형 결정을 선호합니다.", "원칙과 기준 중심의 판단으로 리스크를 줄입니다.")} ${axisLine("실행", s.execution, "초기 탐색과 빠른 시도가 강점입니다.", "탐색과 구조화를 혼합해 완성도를 관리합니다.", "절차 설계와 반복 최적화로 성과를 축적합니다.")} ${axisLine("전망", s.vision, "현실 지표와 일정 관리에서 안정성을 확보합니다.", "현실성과 의미를 동시에 고려합니다.", "장기 의미와 방향성을 먼저 확정하고 구체화합니다.")}`,
    `이 보고서는 입력값의 수치와 규칙 템플릿만으로 생성됩니다. 강점은 성과 전환 전략으로, 약점은 위험 관리 전략으로 해석하며 모든 문단은 반복 가능한 행동 기준을 제공하도록 설계됩니다. 읽는 기준은 단순 성격 규정이 아니라 조건별 대응 프레임입니다. 즉 어떤 상황에서 속도를 높이고, 어떤 상황에서 점검을 늘려야 하는지를 명확히 파악하는 것이 핵심입니다.`,
    `근거 데이터는 일간 ${input.evidence.dayMaster}, 월지 ${input.evidence.monthBranch}, 강한 오행 ${input.evidence.strongElements.join(", ") || "-"}, 약한 오행 ${input.evidence.weakElements.join(", ") || "-"}, 강한 십성 ${input.evidence.strongTenGods.join(", ") || "-"}를 포함합니다. 이 근거는 관계, 커리어, 재정, 스트레스 대응 문단 전반에 동일하게 반영됩니다.`,
  ];
}

function chapterIntro(chapterId, input) {
  if (chapterId === "overview") return `${input.summary} 총론에서는 타입 코드와 축 점수 흐름이 실제 선택 구조로 어떻게 연결되는지 상세하게 해석합니다.`;
  if (chapterId === "inner") return `${input.behaviorSummary} 내면 장면에서 감정 반응, 회복 방식, 안정 리듬의 차이를 단계적으로 설명합니다.`;
  if (chapterId === "relationship") return `${input.relationshipSummary} 관계와 연애에서 끌림 기준, 갈등 반복, 거리 조절 전략을 운영 관점으로 제시합니다.`;
  if (chapterId === "career") return `${input.careerMoneySummary} 일과 재능에서 성과가 나는 환경, 협업 방식, 실행 단위 설계를 다룹니다.`;
  if (chapterId === "wealth") return `${input.careerMoneySummary} 돈과 현실 감각에서 소비, 저축, 투자, 리스크 관리의 균형 원칙을 구조화합니다.`;
  if (chapterId === "stress") return `${input.weaknesses.join(" ")} 스트레스 전조 신호와 그림자 패턴을 조기 식별해 손실을 줄이는 기준을 제시합니다.`;
  return `${input.growthTips.join(" ")} 7일 및 30일 실행 로드맵을 통해 강점 활용과 약점 보완 루틴을 고정합니다.`;
}

function expandChapter(chapter, input) {
  const growthLines = [
    "실천 전략은 거창한 목표보다 반복 가능한 작동 규칙으로 구성해야 유지됩니다.",
    "하루 루틴에서 핵심 행동 1개를 완료하면 자기효능감이 축적되고 다음 행동의 진입 장벽이 낮아집니다.",
    "갈등 장면에서는 사실 확인, 감정 명명, 요청 제안, 재확인의 순서를 고정하면 관계 피로가 크게 줄어듭니다.",
    "재정 장면에서는 지출 통로를 기본 유지, 성장 투자, 실험 비용으로 분리하면 통제감과 유연성을 동시에 확보할 수 있습니다.",
    "피로 누적 구간에서는 속도보다 정확도를 우선해야 장기 손실을 줄일 수 있습니다.",
    "성과가 좋은 시기에도 점검 루틴을 유지해야 급격한 편향과 과신을 예방할 수 있습니다.",
    "자기비판은 관찰 언어로 전환할 때 수정 가능성이 높아집니다. 문제를 성격이 아닌 절차로 기록하세요.",
    "주간 리뷰에서는 잘한 점 2개와 중단할 점 2개를 고정 포맷으로 기록하면 개선 속도가 안정됩니다.",
  ];

  let paragraphs = dedupeParagraphs(chapter.content.split(/\n\n+/));
  let cursor = 0;

  while (paragraphs.join("\n\n").length < CHAPTER_MIN) {
    const line = growthLines[cursor % growthLines.length];
    paragraphs = dedupeParagraphs([
      ...paragraphs,
      `${line} 현재 유형(${input.typeName}, ${input.code})에서는 축 조합과 근거 데이터를 함께 보며 적용할 때 일관성이 높아지고 재발 확률이 낮아집니다.`,
    ]);
    cursor += 1;
    if (cursor > 140) break;
  }

  return {
    ...chapter,
    content: paragraphs.join("\n\n"),
  };
}

function buildLocalReport(input) {
  const title = `${input.typeName} 프리미엄 심층 리포트`;
  const summary = `${input.code} 유형의 축 점수 구조를 기반으로 관계, 일, 돈, 스트레스, 성장 전략을 로컬 규칙으로 심층 분석했습니다.`;
  const shared = baseParagraphs(input);

  const sections = CHAPTERS.map((chapter) => {
    const seed = [
      chapterIntro(chapter.id, input),
      ...shared,
      `실행 가이드: ${input.growthTips.join(" ") || "기록-점검-실행 루틴을 유지하세요."}`,
      `관계 가이드: ${input.loveTips.join(" ") || "표현 빈도와 거리 합의를 유지하세요."}`,
      `커리어 가이드: ${input.careerTips.join(" ") || "우선순위와 완료 기준을 먼저 정의하세요."}`,
      `보완 가이드: ${input.weaknesses.join(" ") || "피로 구간에서 결정 유예 규칙을 적용하세요."}`,
    ];

    return expandChapter(
      {
        id: chapter.id,
        title: chapter.title,
        content: dedupeParagraphs(seed).join("\n\n"),
      },
      input,
    );
  });

  return {
    title,
    summary,
    sections,
    generatedAt: new Date().toISOString(),
    source: "local-rule-engine",
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

  const local = buildLocalReport(input);

  return json({
    ok: true,
    data: {
      source: local.source,
      title: local.title,
      summary: local.summary,
      sections: local.sections,
      generatedAt: local.generatedAt,
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
