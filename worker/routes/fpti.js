import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";

const CHAPTER_MIN = 1400;
const SECTION_MIN = 350;
const CHAPTER_SUMMARY_MIN = 180;
const FPTI_REPORT_TYPE = "fptiPremium";
const FPTI_FEATURE_KEY = "premium-fpti-report";
const FPTI_DEEP_SCHEMA_VERSION = "fpti-deep-v3.0.0";
const PLACEHOLDER_TITLE_PATTERN = /\b(섹션|section|카테고리|category|챕터|chapter)\s*\d+\b/i;
const CHAPTERS = [
  {
    id: "overview",
    title: "FPTI 유형 총론 - 나의 운명 성향 코드",
    categories: [
      "FPTI 코드가 말해주는 기본 기질",
      "대표 십성이 만드는 성격의 중심축",
      "겉모습과 실제 내면의 차이",
      "반복되는 선택 패턴",
      "이 유형이 강해지는 조건",
      "이 유형이 흔들리는 조건",
    ],
  },
  {
    id: "inner",
    title: "내면 성격과 감정 패턴",
    categories: [
      "감정을 받아들이는 기본 방식",
      "무의식적으로 자신을 지키는 방식",
      "가까운 사람 앞에서 드러나는 진짜 모습",
      "혼자 있을 때 회복되는 리듬",
      "감정이 쌓였을 때 나타나는 신호",
      "마음을 안정시키는 현실적 기준",
    ],
  },
  {
    id: "relationship",
    title: "관계와 연애 패턴",
    categories: [
      "사람을 끌어당기는 매력 포인트",
      "좋아하는 사람 앞에서 나타나는 행동",
      "관계에서 반복되는 기대와 실망",
      "연애에서 강점이 되는 십성",
      "관계를 망치기 쉬운 그림자",
      "건강한 관계를 위한 조율 전략",
    ],
  },
  {
    id: "career",
    title: "일과 재능의 사용 방식",
    categories: [
      "타고난 일 처리 방식",
      "성과가 잘 나는 환경",
      "피해야 하는 업무 구조",
      "십성으로 보는 재능 사용법",
      "리더십과 협업 방식",
      "직업적 성장 전략",
    ],
  },
  {
    id: "wealth",
    title: "돈과 현실 감각",
    categories: [
      "돈을 바라보는 기본 태도",
      "소비와 저축의 무의식 패턴",
      "재성 구조로 보는 현실 감각",
      "돈 때문에 흔들리는 지점",
      "안정적인 수익 구조를 만드는 방식",
      "현실 판단력을 높이는 습관",
    ],
  },
  {
    id: "stress",
    title: "스트레스와 그림자 성향",
    categories: [
      "압박을 받을 때 나타나는 반응",
      "과잉 십성이 만드는 문제",
      "부족한 십성이 만드는 불안",
      "인간관계에서 드러나는 방어기제",
      "무너질 때 반복하는 선택",
      "회복을 위한 현실적 처방",
    ],
  },
  {
    id: "growth",
    title: "성장 전략과 실행 로드맵",
    categories: [
      "이 유형의 인생 성장 방향",
      "지금 가장 먼저 고쳐야 할 습관",
      "관계·일·돈의 균형 전략",
      "30일 실행 루틴",
      "90일 변화 로드맵",
      "이 유형에게 필요한 한 문장",
    ],
  },
];

function clean(value) {
  return String(value || "").trim();
}

function stripRomanPrefix(value) {
  return String(value || "")
    .replace(/^\s*[IVXLCDM]+\.\s*/gi, "")
    .replace(/^\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/g, "")
    .trim();
}

function isPlaceholderTitle(value) {
  return PLACEHOLDER_TITLE_PATTERN.test(clean(value));
}

function toIso(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function buildReportSignature(input) {
  const axis = input?.axisScores || {};
  const ev = input?.evidence || {};
  const base = [
    clean(input?.code),
    clean(input?.typeName),
    Number(axis.A || 0),
    Number(axis.M || 0),
    Number(axis.H || 0),
    Number(axis.L || 0),
    Number(axis.F || 0),
    Number(axis.B || 0),
    Number(axis.R || 0),
    Number(axis.V || 0),
    clean(ev.dayMaster),
    clean(ev.monthBranch),
  ].join("|").toLowerCase();

  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fpti-${hash.toString(16).padStart(8, "0")}`;
}

function takeTenGods(input) {
  const list = clampList(input?.evidence?.strongTenGods, 4);
  return {
    primary: list[0] || "정인",
    secondary: list[1] || "정관",
    tertiary: list[2] || "식신",
  };
}

function takeElements(input) {
  return {
    strong: clampList(input?.evidence?.strongElements, 2).join(" · ") || "목 · 화",
    weak: clampList(input?.evidence?.weakElements, 2).join(" · ") || "금 · 수",
  };
}

function chapterTone(chapterId) {
  if (chapterId === "overview") return "성향 지도";
  if (chapterId === "inner") return "감정 운영";
  if (chapterId === "relationship") return "관계 조율";
  if (chapterId === "career") return "일의 구조";
  if (chapterId === "wealth") return "현실 재정";
  if (chapterId === "stress") return "위기 복원";
  return "성장 실행";
}

function chapterDetailFrame(chapterId, categoryTitle, ten, elements, axis) {
  if (chapterId === "overview") {
    return {
      diagnosis: `${categoryTitle}은 성향 코드의 본체를 읽는 핵심 지점입니다. ${ten.primary} 주도 반응과 ${ten.secondary} 보조 반응이 어떤 순서로 작동하는지 파악하면 반복되는 선택 편향의 원인을 정확히 짚을 수 있습니다.`,
      trigger: `강화 트리거는 ${elements.strong} 에너지 구간에서 발생하고, 흔들림 트리거는 ${elements.weak} 피로 구간에서 먼저 나타납니다. 축 점수(${axis})를 함께 보면 강점 과신 구간과 판단 지연 구간을 분리해 읽을 수 있습니다.`,
      execution: `실행 기준은 "강화 조건 1개 + 중단 조건 1개 + 복귀 조건 1개"를 문장으로 고정하는 방식이 가장 안정적입니다. 이 구조를 주간 점검표로 운영하면 운세 해석이 실제 행동 전략으로 전환됩니다.`,
    };
  }
  if (chapterId === "inner") {
    return {
      diagnosis: `${categoryTitle}은 감정 자체보다 감정 이후의 운영 순서를 다루는 항목입니다. ${ten.primary} 반응이 강할수록 기준 회복은 빠르지만, ${ten.tertiary} 표현 축이 과열되면 자기비판이 먼저 올라올 수 있습니다.`,
      trigger: `내면 변동은 ${elements.weak} 구간에서 집중력 저하와 반응 속도 급등으로 먼저 나타나며, ${elements.strong} 구간에서는 회복 탄력이 높게 유지됩니다.`,
      execution: `실행은 "사실 확인 1줄 → 감정 명명 1줄 → 다음 행동 1개" 순서를 매일 고정하세요. 감정 파도를 분석 대상으로 바꾸면 과잉 반응 빈도가 빠르게 감소합니다.`,
    };
  }
  if (chapterId === "relationship") {
    return {
      diagnosis: `${categoryTitle}에서는 끌림보다 조율 메커니즘을 보는 것이 중요합니다. ${ten.primary}는 관계의 중심축을 세우고 ${ten.secondary}는 경계 설정 속도를 결정합니다.`,
      trigger: `관계 리스크는 ${elements.weak} 피로 구간에서 기대치 불일치로 커집니다. 축 점수(${axis})의 편차가 큰 날일수록 말의 강도보다 합의 문장의 명확성이 더 중요합니다.`,
      execution: `실행 기준은 "요청-기한-확인" 3문장으로 대화를 닫는 것입니다. 갈등 후 24시간 내 합의 문장을 남기면 재발 확률을 체감 수준으로 줄일 수 있습니다.`,
    };
  }
  if (chapterId === "career") {
    return {
      diagnosis: `${categoryTitle}은 재능이 아니라 성과 재현성을 점검하는 항목입니다. ${ten.primary}가 착수 속도를, ${ten.secondary}가 마감 완성도를 담당하므로 두 축의 순서를 분리해야 누락이 줄어듭니다.`,
      trigger: `업무 흔들림은 ${elements.weak} 구간에서 우선순위 충돌로 시작됩니다. 축 점수(${axis})를 기준으로 작업 강도를 조정하면 산출물 편차를 줄일 수 있습니다.`,
      execution: `실행은 모든 업무를 "착수 기준/완료 기준/중단 기준" 3요소로 정의하는 방식이 유효합니다. 회의 직후 20분 정리 루틴을 고정하면 성과 누적 속도가 빨라집니다.`,
    };
  }
  if (chapterId === "wealth") {
    return {
      diagnosis: `${categoryTitle}은 재무 성향의 원인을 해석하는 항목입니다. ${ten.primary}는 보수/관리 성향을, ${ten.secondary}는 확장/기회 성향을 강화하므로 두 반응의 균형이 수익 안정성을 좌우합니다.`,
      trigger: `재정 리스크는 ${elements.weak} 구간에서 보상 소비 혹은 과도한 회피로 나타납니다. 축 점수(${axis})와 함께 보면 손실 회피와 기회 포착의 균형 지점을 찾기 쉬워집니다.`,
      execution: `실행 기준은 지출을 생존/성장/만족 3계정으로 분리하고 성장계정 비율을 고정하는 것입니다. 월간 점검에서 비계획 지출 횟수를 수치로 추적하세요.`,
    };
  }
  if (chapterId === "stress") {
    return {
      diagnosis: `${categoryTitle}은 스트레스 반응의 전조를 조기 식별하는 항목입니다. ${ten.primary}가 과열되면 버티기 전략이 강해지고, ${ten.secondary}가 과열되면 통제 강도가 높아질 수 있습니다.`,
      trigger: `${elements.weak} 구간에서는 수면 붕괴-결정 지연-관계 예민도가 연쇄적으로 나타납니다. 축 점수(${axis})를 매일 점검하면 임계점 이전에 속도를 낮출 수 있습니다.`,
      execution: `실행은 "전조 신호 3개"를 수치화해 2개 이상 발생 시 일정 강도를 30% 줄이는 규칙으로 운영하세요. 회복을 의지 문제가 아니라 시스템 문제로 다뤄야 재발이 감소합니다.`,
    };
  }

  return {
    diagnosis: `${categoryTitle}은 성장 방향을 행동 설계로 바꾸는 핵심 항목입니다. ${ten.primary}의 강점 축과 ${ten.secondary}의 보조 축을 함께 쓰되, 과열 시 감속 규칙을 먼저 설계해야 장기 성과가 유지됩니다.`,
    trigger: `성장 정체는 ${elements.weak} 구간에서 복귀 지연으로 발생합니다. 축 점수(${axis})를 기준으로 주간 난이도를 조정하면 실행 지속성이 높아집니다.`,
    execution: `실행은 30일 루틴과 90일 로드맵을 분리해 관리하세요. 하루 핵심 행동 1개, 주간 점검 1회, 월간 리셋 1회를 고정하면 변화가 누적됩니다.`,
  };
}

function buildCategoryBody(input, chapter, categoryTitle, index) {
  const ten = takeTenGods(input);
  const elements = takeElements(input);
  const axisA = Number(input?.axisScores?.A || 50);
  const axisH = Number(input?.axisScores?.H || 50);
  const axisF = Number(input?.axisScores?.F || 50);
  const axisR = Number(input?.axisScores?.R || 50);
  const mood = chapterTone(chapter.id);
  const axisCompact = `A ${axisA} / H ${axisH} / F ${axisF} / R ${axisR}`;
  const frame = chapterDetailFrame(chapter.id, categoryTitle, ten, elements, axisCompact);

  const lines = [
    `${chapter.title}에서 ${categoryTitle}은 ${input.typeName}(${input.code})의 선택 리듬을 가장 구체적으로 보여주는 지점입니다.`,
    `일간 ${input.evidence.dayMaster}과 월지 ${input.evidence.monthBranch}를 기준으로 보면 ${ten.primary}이 중심을 잡고 ${ten.secondary}이 보조하는 흐름이 분명합니다.`,
    `${ten.primary}이 강하게 작동하는 시기에는 자기 기준이 선명해지고, ${ten.tertiary} 축이 열리면 문제를 다루는 말과 실행력이 동시에 살아납니다.`,
    `오행은 ${elements.strong}가 추진력을 만들고 ${elements.weak}가 흔들리는 구간에서 피로 신호를 먼저 보여 주므로, ${mood} 관점의 운영 규칙이 중요합니다.`,
    `축 점수는 에너지 ${axisA}, 판단 ${axisH}, 실행 ${axisF}, 전망 ${axisR}로 읽을 수 있으며, 이 차이를 인지할수록 관계·일·돈 장면에서 선택의 품질이 안정됩니다.`,
    frame.diagnosis,
    frame.trigger,
    frame.execution,
  ];

  const strength = `${ten.primary} 성향이 살아 있을 때 ${categoryTitle} 장면에서 기준 설정 속도와 실행 일관성이 함께 올라갑니다.`;
  const risk = `${ten.secondary} 반응이 과열되면 ${categoryTitle}에서 통제 강도가 높아져 관계 피로와 판단 지연이 동시에 누적될 수 있습니다.`;
  const action = `${index + 1}번째 실천으로 ${categoryTitle}에 대한 기준 문장 1개, 금지 문장 1개, 복귀 문장 1개를 작성하고 주간 점검표에 실제 적용 횟수를 기록하세요.`;

  return {
    id: `${chapter.id}-cat-${index + 1}`,
    title: categoryTitle,
    body: lines.join(" "),
    strength,
    risk,
    action,
    advice: action,
  };
}

function toDeepChapters(input) {
  return CHAPTERS.map((chapter, index) => {
    const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
    const sections = categories.map((categoryTitle, categoryIndex) => buildCategoryBody(input, chapter, categoryTitle, categoryIndex));
    return {
      id: clean(chapter.id || `chapter-${index + 1}`),
      order: index + 1,
      title: chapter.title,
      subtitle: "사주 십성 기반 심층 해석",
      preview: clean(sections[0]?.body || "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" "),
      chapterSummary: `${chapter.title}은 ${input.code} 유형의 ${chapterTone(chapter.id)} 관점을 다루며, 여섯 개 카테고리에서 강점·주의·실행 기준을 분리해 제공합니다.`,
      sections,
      categories: sections,
    };
  });
}

function toDeepPayload(local, reportSignature, persisted = {}, input = {}) {
  const chapters = toDeepChapters(input);
  return {
    reportType: "FPTI_DEEP_REPORT",
    productKey: FPTI_FEATURE_KEY,
    reportSignature,
    reportId: clean(persisted.reportId || `fpti-deep-${reportSignature}`),
    sessionId: clean(persisted.sessionId || reportSignature),
    title: clean(local?.title || "FPTI 프리미엄 심층 리포트"),
    summary: clean(local?.summary || ""),
    source: clean(local?.source || "local") || "local",
    generatedAt: toIso(local?.generatedAt),
    chapters,
    meta: {
      schemaVersion: FPTI_DEEP_SCHEMA_VERSION,
      chapterCount: CHAPTERS.length,
    },
  };
}

function reportNeedsUpgrade(archive) {
  const version = clean(archive?.meta?.schemaVersion);
  return version !== FPTI_DEEP_SCHEMA_VERSION;
}

function isArchivedReportUsable(archive) {
  if (!archive || typeof archive !== "object") {
    return { ok: false, reason: "archive_missing" };
  }

  if (reportNeedsUpgrade(archive)) {
    return { ok: false, reason: "schema_version_mismatch" };
  }

  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  if (chapters.length !== CHAPTERS.length) {
    return { ok: false, reason: "chapter_count_mismatch" };
  }

  for (let i = 0; i < CHAPTERS.length; i += 1) {
    const expectedChapter = CHAPTERS[i];
    const chapter = chapters[i] && typeof chapters[i] === "object" ? chapters[i] : null;
    const chapterTitle = stripRomanPrefix(chapter?.title);
    if (chapterTitle !== expectedChapter.title || isPlaceholderTitle(chapterTitle)) {
      return { ok: false, reason: `chapter_title_mismatch_${i + 1}` };
    }

    const sectionList = Array.isArray(chapter?.sections)
      ? chapter.sections
      : (Array.isArray(chapter?.categories) ? chapter.categories : []);
    if (sectionList.length < expectedChapter.categories.length) {
      return { ok: false, reason: `section_count_mismatch_${i + 1}` };
    }

    for (let j = 0; j < expectedChapter.categories.length; j += 1) {
      const section = sectionList[j] && typeof sectionList[j] === "object" ? sectionList[j] : null;
      const sectionTitle = stripRomanPrefix(section?.title);
      if (sectionTitle !== expectedChapter.categories[j] || isPlaceholderTitle(sectionTitle)) {
        return { ok: false, reason: `section_title_mismatch_${i + 1}_${j + 1}` };
      }
      const body = clean(section?.body || section?.interpretation);
      if (body.length < SECTION_MIN) {
        return { ok: false, reason: `section_body_too_short_${i + 1}_${j + 1}` };
      }
    }

    const chapterSummary = clean(chapter?.chapterSummary);
    if (chapterSummary.length < CHAPTER_SUMMARY_MIN) {
      return { ok: false, reason: `chapter_summary_too_short_${i + 1}` };
    }
  }

  return { ok: true, reason: "ok" };
}

async function createAndArchiveDeepReport(env, userId, reportSignature, input, access = {}) {
  const local = buildLocalReport(input);
  const report = toDeepPayload(local, reportSignature, {}, input);
  await writeArchivedReport(env, userId, reportSignature, report, access || {});
  return report;
}

async function readArchivedReport(env, userId, reportSignature) {
  await connectDb(env);
  const executionKey = `fpti-deep:${reportSignature}`;
  const doc = await ServiceExecutionTransaction.findOne({
    userId,
    executionKey,
    reportType: FPTI_REPORT_TYPE,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  const archive = doc?.metadata?.archive && typeof doc.metadata.archive === "object"
    ? doc.metadata.archive
    : null;
  if (!archive) return null;

  return {
    ...archive,
    reportSignature,
    reportId: clean(archive.reportId || doc?.reportId || `fpti-deep-${reportSignature}`),
    sessionId: clean(archive.sessionId || doc?.sessionId || reportSignature),
    generatedAt: toIso(archive.generatedAt || doc?.createdAt || Date.now()),
  };
}

async function writeArchivedReport(env, userId, reportSignature, payload, access = {}) {
  await connectDb(env);
  const executionKey = `fpti-deep:${reportSignature}`;
  const reportId = clean(payload?.reportId || `fpti-deep-${reportSignature}`);
  const sessionId = clean(payload?.sessionId || reportSignature);
  const now = new Date();
  const update = {
    $set: {
      reportType: FPTI_REPORT_TYPE,
      reportId,
      sessionId,
      featureKey: FPTI_FEATURE_KEY,
      cost: 200,
      sourceTransactionId: clean(access?.matchedTransactionId || access?.entitlementId || ""),
      status: "success",
      premiumStatus: "completed",
      reasonCode: "",
      reasonMessage: "",
      completedAt: now,
      generationCompletedAt: now,
      timeoutAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180),
      nextRetryAt: now,
      metadata: {
        source: "fpti.deep-report",
        archive: payload,
      },
    },
    $setOnInsert: {
      executionKey,
      coinAmount: 200,
      maxRetries: 1,
      retryCount: 0,
      idempotencyKey: executionKey,
      retentionUntil: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180),
    },
  };

  await ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    update,
    { upsert: true, returnDocument: "after" },
  ).lean();
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
  const body = await readJson(request);
  const input = normalizeInput(body);
  const reportSignature = clean(body?.reportSignature || body?.sessionId || body?.reportId || buildReportSignature(input));
  if (!reportSignature) {
    return json({ ok: false, code: "MISSING_REPORT_SIGNATURE", message: "reportSignature가 필요합니다." }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "fptiPremium", {
    reportId: reportSignature,
    sessionId: reportSignature,
  });
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

  if (!input.code) {
    return json({ ok: false, message: "FPTI 코드가 누락되었습니다." }, { status: 400 });
  }

  const archived = await readArchivedReport(env, auth.userId, reportSignature);
  if (archived?.chapters?.length) {
    const archivedQuality = isArchivedReportUsable(archived);
    if (archivedQuality.ok) {
      return json({
        ok: true,
        data: {
          source: archived.source || "archive",
          report: archived,
        },
      });
    }

    const regenerated = await createAndArchiveDeepReport(env, auth.userId, reportSignature, input, access || {});
    return json({
      ok: true,
      data: {
        source: "regenerated",
        reason: archivedQuality.reason,
        report: regenerated,
      },
    });
  }

  const report = await createAndArchiveDeepReport(env, auth.userId, reportSignature, input, access || {});

  return json({
    ok: true,
    data: {
      source: report.source,
      report,
    },
  });
}

async function handleReadDeepReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportSignature = clean(url.searchParams.get("reportSignature") || url.searchParams.get("sessionId") || url.searchParams.get("reportId"));
  if (!reportSignature) {
    return json({ ok: false, code: "MISSING_REPORT_SIGNATURE", message: "reportSignature가 필요합니다." }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "fptiPremium", {
    reportId: reportSignature,
    sessionId: reportSignature,
  });
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

  const archived = await readArchivedReport(env, auth.userId, reportSignature);
  if (!archived) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "저장된 리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const archivedQuality = isArchivedReportUsable(archived);
  if (!archivedQuality.ok) {
    return json({ ok: false, code: "REPORT_NEEDS_REFRESH", message: "리포트 갱신이 필요합니다. POST /api/fpti/deep-report로 재생성해 주세요." }, { status: 409 });
  }

  return json({
    ok: true,
    data: {
      source: archived.source || "archive",
      report: archived,
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

    if (method === "GET" && path === "/deep-report") {
      return handleReadDeepReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fpti", method: request?.method || "" } });
  }
}
