import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";

const CHAPTER_MIN = 1400;
const CHAPTERS = [
  { id: "overview", title: "I. FPTI 유형 총론 - 나의 운명 성향 코드" },
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
  if (score >= 70) return `${label}: ${high}`;
  if (score >= 45) return `${label}: ${mid}`;
  return `${label}: ${low}`;
}

function baseParagraphs(input) {
  const s = {
    energy: Number(input.axisScores.A || 50),
    judgment: Number(input.axisScores.H || 50),
    execution: Number(input.axisScores.F || 50),
    vision: Number(input.axisScores.R || 50),
  };

  return [
    `${input.typeName}(${input.code})은 삶의 여러 장면에서 같은 선택 리듬을 반복하는 성향입니다. ${axisLine("에너지 흐름", s.energy, "외부 상호작용에서 동력이 살아나는 편입니다.", "외부 확장과 내부 정리를 균형 있게 운용합니다.", "내면 정리 시간에서 안정성과 집중력이 강화됩니다.")} ${axisLine("판단 성향", s.judgment, "정서와 분위기를 빠르게 읽어 반응합니다.", "공감과 구조를 함께 점검해 결정을 정리합니다.", "원칙과 기준 중심으로 흔들림을 줄입니다.")} ${axisLine("실행 스타일", s.execution, "빠른 착수 후 정교화에 강점이 있습니다.", "탐색과 구조화를 번갈아 운영합니다.", "절차 설계와 반복 최적화로 완성도를 높입니다.")} ${axisLine("전망 방식", s.vision, "현실 지표와 생활 구조를 중시합니다.", "현실성과 의미를 동시에 고려합니다.", "장기 방향을 먼저 확정하고 구체화합니다.")}`,
    `이 리포트는 성향을 설명하는 데서 멈추지 않고, 관계와 일상에서 바로 적용할 수 있는 실전 기준을 함께 제시합니다. 읽을 때는 자신을 평가하기보다 나에게 맞는 리듬을 찾는 관점으로 접근하는 것이 중요합니다.`,
    `핵심은 더 강한 의지를 만드는 것이 아니라 흔들릴 때도 유지되는 작은 기준을 확보하는 일입니다. 같은 성향도 운영 방식에 따라 결과가 완전히 달라질 수 있으므로, 챕터별 실천 포인트를 생활에 맞게 선택해 적용하세요.`,
  ];
}

function chapterIntro(chapterId, input) {
  if (chapterId === "overview") return `${input.summary} 총론에서는 당신이 반복해서 강해지는 조건과 흔들리는 조건을 함께 해석합니다.`;
  if (chapterId === "inner") return `${input.behaviorSummary} 내면 장면에서 감정 반응, 회복 방식, 안정 리듬의 차이를 단계적으로 설명합니다.`;
  if (chapterId === "relationship") return `${input.relationshipSummary} 관계와 연애에서 끌림 기준, 갈등 반복, 거리 조절 전략을 운영 관점으로 제시합니다.`;
  if (chapterId === "career") return `${input.careerMoneySummary} 일과 재능에서 성과가 나는 환경, 협업 방식, 실행 단위 설계를 다룹니다.`;
  if (chapterId === "wealth") return `${input.careerMoneySummary} 돈과 현실 감각에서 소비, 저축, 투자, 리스크 관리의 균형 원칙을 구조화합니다.`;
  if (chapterId === "stress") return `${input.weaknesses.join(" ")} 스트레스 전조 신호와 그림자 패턴을 조기 식별해 손실을 줄이는 기준을 제시합니다.`;
  return `${input.growthTips.join(" ")} 7일 및 30일 실행 로드맵을 통해 강점 활용과 약점 보완 루틴을 고정합니다.`;
}

function chapterSpecificParagraphs(chapterId, input) {
  const axis = `현재 축 점수는 에너지 ${Number(input.axisScores.A || 50)}, 판단 ${Number(input.axisScores.H || 50)}, 실행 ${Number(input.axisScores.F || 50)}, 전망 ${Number(input.axisScores.R || 50)}입니다.`;
  if (chapterId === "overview") {
    return [
      `${axis} 총론에서는 강점 자체보다 강점이 안정적으로 발휘되는 조건을 먼저 정의해야 합니다.`,
      "당신의 선택 품질은 큰 결심보다 작고 반복 가능한 운영 기준에서 빠르게 안정됩니다. 오늘의 기준 문장과 주간 점검 문장을 분리해 기록하면 체감 변화가 빨라집니다.",
      "핵심은 완벽한 정보가 아니라 실행 가능한 정보의 기준입니다. 결정을 미루는 조건과 확정하는 조건을 사전에 분리하면 흔들림이 크게 줄어듭니다.",
    ];
  }
  if (chapterId === "inner") {
    return [
      `${axis} 내면 챕터에서는 감정을 통제하려 하기보다 반응 이후 순서를 고정하는 접근이 유효합니다.`,
      "감정이 큰 날에는 사실 확인-감정 명명-다음 행동 1개 순서를 지키면 과잉 반응을 줄일 수 있습니다. 감정의 존재를 문제로 보지 말고 상태 신호로 다루는 것이 중요합니다.",
      "회복은 이벤트가 아니라 일정입니다. 짧은 정리 루틴을 평일에 고정할수록 집중력 복귀 속도가 빨라집니다.",
    ];
  }
  if (chapterId === "relationship") {
    return [
      `${axis} 관계 챕터에서는 표현 강도보다 표현 빈도의 일관성이 만족도를 더 크게 좌우합니다.`,
      "반복 갈등의 주요 원인은 기대치 비대칭입니다. 추측 대신 합의 문장을 남기는 습관이 오해를 줄이고 신뢰를 지킵니다.",
      "배려와 책임의 경계를 분리하면 관계 피로가 낮아집니다. 도움을 주더라도 결과 책임은 분리해야 장기 친밀감이 유지됩니다.",
    ];
  }
  if (chapterId === "career") {
    return [
      `${axis} 커리어 챕터에서는 착수 기준과 마감 기준을 분리할 때 산출물 품질이 안정됩니다.`,
      "협업 후 정리 시간 블록을 고정하지 않으면 실행 밀도가 급격히 떨어질 수 있습니다. 회의 직후 20~30분 정리 루틴을 기본값으로 두세요.",
      "성과는 재능 자체보다 절차의 재현성에서 커집니다. 문제 정의-우선순위-실행-리뷰 순서를 고정하면 흔들리는 날에도 품질이 유지됩니다.",
    ];
  }
  if (chapterId === "wealth") {
    return [
      `${axis} 재정 챕터에서는 감정 상태와 숫자 판단을 동시에 점검하는 구조가 리스크를 낮춥니다.`,
      "지출을 생활 유지, 성장 투자, 실험 비용으로 분리하면 통제감과 유연성을 함께 확보할 수 있습니다. 중요한 지출은 하루 유예 후 재확인하는 방식이 안전합니다.",
      "기록의 목적은 처벌이 아니라 관찰입니다. 월간 점검에서 감정 소비 패턴을 함께 보면 재정 안정성이 높아집니다.",
    ];
  }
  if (chapterId === "stress") {
    return [
      `${axis} 스트레스 챕터에서는 위기 신호를 조기에 식별하는 규칙이 핵심입니다.`,
      "수면 붕괴, 반응 과열, 결정 지연 같은 신호를 미리 정해 두고 두 개 이상 겹치면 중요 결정을 하루 유예하세요.",
      "회복은 의지 경쟁이 아니라 마찰 관리입니다. 무너진 뒤 복구보다 무너지기 전 속도 조절이 손실을 훨씬 줄입니다.",
    ];
  }
  return [
    `${axis} 성장 챕터에서는 7일 착수 루틴과 30일 유지 구조를 분리 설계하는 접근이 효과적입니다.`,
    "변화의 핵심은 더 많이 하는 것이 아니라 덜 흔들리는 시스템을 만드는 데 있습니다. 하루 핵심 행동 1개와 주간 점검 1회를 고정하세요.",
    "실패한 날의 목표는 분석이 아니라 복귀입니다. 복귀 속도가 빨라질수록 장기 성과가 안정됩니다.",
  ];
}

function expandChapter(chapter, input) {
  const support = chapterSpecificParagraphs(chapter.id, input);
  let paragraphs = dedupeParagraphs(chapter.content.split(/\n\n+/).concat(support));
  let cursor = 0;

  while (paragraphs.join("\n\n").length < CHAPTER_MIN && cursor < 8) {
    paragraphs = dedupeParagraphs([
      ...paragraphs,
      `${chapter.title} 실행 보강 ${cursor + 1}: ${input.typeName}(${input.code})에게는 기록-점검-실행의 순서를 고정하는 방식이 재발 방지에 유효합니다.`,
    ]);
    cursor += 1;
  }

  return {
    ...chapter,
    content: paragraphs.join("\n\n"),
  };
}

function buildLocalReport(input) {
  const title = `${input.typeName} 프리미엄 심층 리포트`;
  const summary = `${input.code} 유형의 관계, 일, 돈, 스트레스, 성장 전략을 실전 중심의 심층 상담문으로 정리했습니다.`;
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
    source: "local",
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
