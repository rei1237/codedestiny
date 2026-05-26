import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const SIBYL_MIN_TOTAL_CHARS = 20000;
const SIBYL_MIN_CHAPTER_CHARS = 1900;
const SIBYL_REPORT_MIN_CHAPTER_CHARS = 300;
const SIBYL_CATEGORY_PLAN = [
  { title: "운명 코드 코어 진단", focus: "일간·월지·지배 오행·주도 십성 기반의 성향 엔진" },
  { title: "강점/약점 매트릭스", focus: "실제 환경에서 강점이 약점으로 뒤집히는 트리거 분석" },
  { title: "커리어 적합도 세분화", focus: "조직형·창업형·프리랜스형·전문가형 비교" },
  { title: "돈의 흐름과 수익 구조", focus: "수익 모델, 지출 누수, 리스크 관리, 현금흐름 습관" },
  { title: "인간관계/협업 전략", focus: "갈등 유발 패턴과 협업 최적화 커뮤니케이션" },
  { title: "리스크 시그널 해부", focus: "관성/재성/비겁 과다·부족에 따른 실패 패턴" },
  { title: "연애/파트너십 적용", focus: "관계 선택 기준, 경계선 설정, 장기 파트너십 유지 방식" },
  { title: "12개월 실행 로드맵", focus: "월별 의사결정 가이드와 실행 우선순위" },
  { title: "3년 변곡점 시나리오", focus: "확장기·조정기·재정비기 행동 전략" },
  { title: "Dominator 90일 실전 플랜", focus: "1~7일, 8~30일, 31~60일, 61~90일 단계별 처방" },
];

const SIBYL_REPORT_CHAPTERS = [
  { key: "coreMatrix", title: "CH.01 시빌라 코어 매트릭스", focus: "입력 사주, 일간, 지배 오행, 부족 오행, 주도 십성, 위험·적성 계수, 전체 진단" },
  { key: "riskAnalysis", title: "CH.02 위험 계수 정밀 분석", focus: "위험 계수 산정 이유, 오행 불균형·충형파해·세운 위험 분해" },
  { key: "aptitudeAnalysis", title: "CH.03 적성 계수 정밀 분석", focus: "타고난 적성, 수익화 가능한 능력, 직업 전략, 성장 루틴" },
  { key: "tenGodPattern", title: "CH.04 주도 십성과 행동 패턴", focus: "주도 십성의 성격/관계/일 패턴과 불안정 구간 그림자" },
  { key: "elementBalance", title: "CH.05 오행 밸런스와 에너지 설계", focus: "강한 오행·부족 오행·보완 습관·환경 설계" },
  { key: "yearlyFlow", title: "CH.06 10년 위험 계수 그래프 해설", focus: "연도별 위험/기회 흐름, 확장·수비 타이밍, 10년 로드맵" },
  { key: "relationship", title: "CH.07 관계와 애정 패턴", focus: "끌리는 사람, 충돌 패턴, 연애·결혼 리스크 관리" },
  { key: "moneyCareer", title: "CH.08 재물과 직업 전략", focus: "돈 버는 방식, 손실 패턴, 직업 선택 기준, 장기 커리어" },
  { key: "systemWarning", title: "CH.09 시스템 리스크 가이드", focus: "반복 실패 패턴, 오판 방지 규칙, 현실 행동 지침" },
  { key: "finalMessage", title: "CH.10 최종 실행 가이드", focus: "사주 구조 기반 최종 선언문과 운명 전략 문장" },
];

function clean(value) {
  return String(value || "").trim();
}

const STEM_TO_ELEMENT = Object.freeze({
  갑: "wood",
  을: "wood",
  甲: "wood",
  乙: "wood",
  병: "fire",
  정: "fire",
  丙: "fire",
  丁: "fire",
  무: "earth",
  기: "earth",
  戊: "earth",
  己: "earth",
  경: "metal",
  신: "metal",
  庚: "metal",
  辛: "metal",
  임: "water",
  계: "water",
  壬: "water",
  癸: "water",
});

function inferElementFromStem(stem) {
  const key = clean(stem);
  return STEM_TO_ELEMENT[key] || "";
}

function resolveSibylModeTitle(riskScore) {
  if (riskScore >= 70) return "집중 재정비 모드";
  if (riskScore >= 45) return "위험 제거 모드";
  return "안정 유지 모드";
}

function normalizeLineBreaks(text) {
  return clean(String(text || "").replace(/\r\n?/g, "\n"));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function stableHash(input) {
  const text = clean(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
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
      // try next
    }
  }

  return null;
}

function buildSibylFingerprint(body = {}) {
  const profile = body?.profile || {};
  const b = profile?.birth || {};
  const pillars = body?.pillars || {};
  const seed = [
    clean(profile?.id),
    toNumber(b?.year, ""),
    toNumber(b?.month, ""),
    toNumber(b?.day, ""),
    toNumber(b?.hour, ""),
    toNumber(b?.minute, ""),
    clean(profile?.gender || body?.gender),
    clean(body?.dominantEl),
    clean(body?.dominantTenStar),
    toNumber(body?.aptCoeff, ""),
    toNumber(body?.riskScore, ""),
    JSON.stringify(pillars || {}),
  ].join("|");
  return `sibyl_${stableHash(seed)}`;
}

function normalizeCanonicalSibylData(body = {}) {
  const canonical = body?.canonicalData && typeof body.canonicalData === "object" ? body.canonicalData : {};
  const normalizedProfile = body?.normalizedProfile && typeof body.normalizedProfile === "object"
    ? body.normalizedProfile
    : (canonical?.normalizedProfile && typeof canonical.normalizedProfile === "object" ? canonical.normalizedProfile : {});
  const profile = body?.profile || {};
  const birth = profile?.birth || {};
  const sibylNode = canonical?.sibyl || {};
  const sajuNode = canonical?.saju || {};
  const profileInput = normalizedProfile?.input || {};
  const profileSaju = normalizedProfile?.saju || {};
  const profileScores = normalizedProfile?.scores || {};
  const profileClassification = normalizedProfile?.classification || {};
  const profileBasicSections = normalizedProfile?.basicSections || {};
  const profileReportSeed = normalizedProfile?.reportSeed || {};
  const profileDebug = normalizedProfile?.debug || {};
  const pillars = body?.pillars && typeof body.pillars === "object" ? body.pillars : {};

  const input = {
    birthDate: clean(profileInput?.birthDate)
      || clean(canonical?.input?.birthDate)
      || [toNumber(birth?.year, ""), toNumber(birth?.month, ""), toNumber(birth?.day, "")].filter(Boolean).join("-")
      || "입력값 확인 필요",
    birthTime: clean(profileInput?.birthTime)
      || clean(canonical?.input?.birthTime)
      || (Number.isFinite(Number(birth?.hour)) ? `${String(toNumber(birth?.hour, 0)).padStart(2, "0")}:${String(toNumber(birth?.minute, 0)).padStart(2, "0")}` : "미상"),
    gender: clean(profileInput?.gender || canonical?.input?.gender || profile?.gender || body?.gender || "미상"),
    calendarType: clean(profileInput?.calendarType || canonical?.input?.calendarType || "solar") || "solar",
  };

  const dayMaster = clean(profileSaju?.dayMaster || sajuNode?.dayMaster || pillars?.day?.g || "");
  const inferredDominantElement = inferElementFromStem(dayMaster);
  const dominantElement = clean(profileSaju?.dominantElement || sajuNode?.dominantElement || sibylNode?.dominantElement || body?.dominantEl || inferredDominantElement || "wood");
  const dominantTenGod = clean(profileSaju?.tenGods?.primary || sajuNode?.tenGodSummary?.dominantTenGod || sibylNode?.dominantTenGod || body?.dominantTenStar || "비견");

  const saju = {
    yearPillar: clean(profileSaju?.yearPillar || sajuNode?.yearPillar || ((pillars?.year?.g && pillars?.year?.j) ? `${pillars.year.g}${pillars.year.j}` : "미상")),
    monthPillar: clean(profileSaju?.monthPillar || sajuNode?.monthPillar || ((pillars?.month?.g && pillars?.month?.j) ? `${pillars.month.g}${pillars.month.j}` : "미상")),
    dayPillar: clean(profileSaju?.dayPillar || sajuNode?.dayPillar || ((pillars?.day?.g && pillars?.day?.j) ? `${pillars.day.g}${pillars.day.j}` : "미상")),
    hourPillar: clean(profileSaju?.hourPillar || sajuNode?.hourPillar || ((pillars?.hour?.g && pillars?.hour?.j) ? `${pillars.hour.g}${pillars.hour.j}` : "미상")),
    dayMaster: dayMaster || "미상",
    dominantElement,
    weakElement: clean(profileSaju?.weakElement || sajuNode?.weakElement || "미상"),
    favorableElements: Array.isArray(sajuNode?.favorableElements) ? sajuNode.favorableElements.map(clean).filter(Boolean) : [],
    unfavorableElements: Array.isArray(sajuNode?.unfavorableElements) ? sajuNode.unfavorableElements.map(clean).filter(Boolean) : [],
    tenGodSummary: {
      dominantTenGod,
      supportingTenGods: Array.isArray(sajuNode?.tenGodSummary?.supportingTenGods) ? sajuNode.tenGodSummary.supportingTenGods.map(clean).filter(Boolean) : [],
      lackingTenGods: Array.isArray(sajuNode?.tenGodSummary?.lackingTenGods) ? sajuNode.tenGodSummary.lackingTenGods.map(clean).filter(Boolean) : [],
    },
  };

  const riskScore = clamp(toNumber(profileScores?.riskScore, sibylNode?.riskScore ?? body?.riskScore ?? 35), 5, 100);
  const aptitudeScore = clamp(toNumber(profileScores?.aptitudeScore, sibylNode?.aptitudeScore ?? body?.aptCoeff ?? 420), 80, 999);

  const fallbackPillar = clean(`${pillars?.year?.g || ""}${pillars?.year?.j || ""}`) || saju.yearPillar || "갑자";

  const yearlySource = Array.isArray(normalizedProfile?.yearlyFlow) && normalizedProfile.yearlyFlow.length
    ? normalizedProfile.yearlyFlow
    : (Array.isArray(canonical?.yearlyFlow) && canonical.yearlyFlow.length
      ? canonical.yearlyFlow
      : Array.from({ length: 10 }, (_, index) => ({
          year: new Date().getFullYear() + index,
          pillar: fallbackPillar,
          riskScore: clamp(riskScore + (index % 4) - 1, 5, 100),
          opportunityScore: clamp(100 - riskScore - (index % 3), 5, 100),
        })));

  const yearlyFlow = Array.isArray(yearlySource)
    ? yearlySource.map((item, index) => {
        const risk = clamp(toNumber(item?.riskScore, 35 + index * 2), 5, 100);
        return {
          year: toNumber(item?.year, new Date().getFullYear() + index),
          pillar: clean(item?.pillar || "미상"),
          riskScore: risk,
          opportunityScore: clamp(toNumber(item?.opportunityScore, 100 - risk), 5, 100),
          warning: clean(item?.warning || "리스크 급등 구간에서는 의사결정 유예 규칙을 적용하세요."),
          advice: clean(item?.advice || "고위험 구간은 수비, 저위험 구간은 실행 강화를 권장합니다."),
        };
      })
    : [];

  return {
    input,
    saju,
    scores: {
      riskScore,
      aptitudeScore,
      stabilityScore: clamp(toNumber(profileScores?.stabilityScore, 46), 10, 100),
      relationshipScore: clamp(toNumber(profileScores?.relationshipScore, 52), 10, 100),
      wealthScore: clamp(toNumber(profileScores?.wealthScore, 48), 10, 100),
      careerScore: clamp(toNumber(profileScores?.careerScore, 50), 10, 100),
    },
    classification: {
      mode: clean(profileClassification?.mode || sibylNode?.mode || (riskScore >= 70 ? "dd" : riskScore >= 45 ? "le" : "nle")),
      riskLevel: clean(profileClassification?.riskLevel || (riskScore >= 75 ? "critical" : riskScore >= 55 ? "high" : riskScore >= 30 ? "medium" : "low")),
      title: clean(profileClassification?.title || sibylNode?.modeTitle || resolveSibylModeTitle(riskScore)),
      subtitle: clean(profileClassification?.subtitle || sibylNode?.modeDescription || "현재 운세 구조에 맞춘 실행/수비 비율 조정이 필요합니다."),
      coreMessage: clean(profileClassification?.coreMessage || sibylNode?.coreMessage || "핵심 성향은 명확하며, 리스크 관리 루틴을 먼저 고정하면 성과 변동성이 크게 줄어듭니다."),
      warningMessage: clean(profileClassification?.warningMessage || "고위험 구간은 결정을 지연하고 검증 루프를 짧게 유지하세요."),
      opportunityMessage: clean(profileClassification?.opportunityMessage || "저위험 구간은 핵심 과제를 단일 트랙으로 실행하세요."),
    },
    basicSections: {
      coreMatrix: clean(profileBasicSections?.coreMatrix || "핵심 축을 기준으로 기본 분석을 복구했습니다."),
      riskPattern: clean(profileBasicSections?.riskPattern || "위험 패턴은 보수적 기준으로 보정했습니다."),
      aptitudePattern: clean(profileBasicSections?.aptitudePattern || "적성 패턴은 핵심 지표 중심으로 보정했습니다."),
      relationshipPattern: clean(profileBasicSections?.relationshipPattern || "관계 패턴은 십성 구조를 기준으로 보정했습니다."),
      wealthPattern: clean(profileBasicSections?.wealthPattern || "재물 패턴은 손실 방어 우선으로 보정했습니다."),
      careerPattern: clean(profileBasicSections?.careerPattern || "진로 패턴은 지배 오행 중심으로 보정했습니다."),
      timingAdvice: clean(profileBasicSections?.timingAdvice || "고위험은 수비, 저위험은 실행 강화 리듬을 유지하세요."),
    },
    reportSeed: {
      keywords: Array.isArray(profileReportSeed?.keywords) ? profileReportSeed.keywords.map(clean).filter(Boolean) : [],
      strengths: Array.isArray(profileReportSeed?.strengths) ? profileReportSeed.strengths.map(clean).filter(Boolean) : [],
      weaknesses: Array.isArray(profileReportSeed?.weaknesses) ? profileReportSeed.weaknesses.map(clean).filter(Boolean) : [],
      cautionPeriods: Array.isArray(profileReportSeed?.cautionPeriods) ? profileReportSeed.cautionPeriods.map(clean).filter(Boolean) : [],
      recommendedActions: Array.isArray(profileReportSeed?.recommendedActions) ? profileReportSeed.recommendedActions.map(clean).filter(Boolean) : [],
    },
    sibyl: {
      mode: clean(profileClassification?.mode || sibylNode?.mode || (riskScore >= 70 ? "dd" : riskScore >= 45 ? "le" : "nle")),
      modeTitle: clean(profileClassification?.title || sibylNode?.modeTitle || resolveSibylModeTitle(riskScore)),
      modeDescription: clean(profileClassification?.subtitle || sibylNode?.modeDescription || "현재 운세 구조에 맞춘 실행/수비 비율 조정이 필요합니다."),
      riskScore,
      aptitudeScore,
      dominantTenGod,
      dominantElement,
      warningKeywords: Array.isArray(sibylNode?.warningKeywords) ? sibylNode.warningKeywords.map(clean).filter(Boolean) : [],
      strengthKeywords: Array.isArray(sibylNode?.strengthKeywords) ? sibylNode.strengthKeywords.map(clean).filter(Boolean) : [],
      coreMessage: clean(profileClassification?.coreMessage || sibylNode?.coreMessage || "핵심 성향은 명확하며, 리스크 관리 루틴을 먼저 고정하면 성과 변동성이 크게 줄어듭니다."),
      lifeStrategy: clean(profileBasicSections?.timingAdvice || sibylNode?.lifeStrategy || "고위험 구간에는 결정 지연, 저위험 구간에는 집중 실행으로 리듬을 분리하세요."),
    },
    yearlyFlow,
    monthlyFlow: Array.isArray(normalizedProfile?.monthlyFlow)
      ? normalizedProfile.monthlyFlow.map((item, index) => ({
          month: toNumber(item?.month, index + 1),
          riskScore: clamp(toNumber(item?.riskScore, 40), 5, 100),
          opportunityScore: clamp(toNumber(item?.opportunityScore, 60), 5, 100),
          warning: clean(item?.warning || "월별 경계 신호를 먼저 확인하세요."),
          advice: clean(item?.advice || "핵심 과제를 1개로 집중하세요."),
        }))
      : [],
    debug: {
      source: clean(profileDebug?.source || "worker-normalized"),
      missingFields: Array.isArray(profileDebug?.missingFields) ? profileDebug.missingFields.map(clean).filter(Boolean) : [],
      warnings: Array.isArray(profileDebug?.warnings) ? profileDebug.warnings.map(clean).filter(Boolean) : [],
    },
  };
}

function buildCanonicalChapterText(canonical = {}, chapter = {}, index = 0) {
  const sibyl = canonical?.sibyl || {};
  const saju = canonical?.saju || {};
  const input = canonical?.input || {};
  const yearlyFlow = Array.isArray(canonical?.yearlyFlow) ? canonical.yearlyFlow : [];
  const yearHints = yearlyFlow.slice(0, 4).map((item) => `${item.year}년 위험 ${item.riskScore} / 기회 ${item.opportunityScore}`).join(" · ");

  let text = [
    `${chapter.title}는 단순 요약이 아니라 실제 행동을 결정하는 운영 지침입니다.`,
    `입력값(${input.birthDate} ${input.birthTime}, ${input.gender})을 기준으로 일간 ${saju.dayMaster}, 지배 오행 ${sibyl.dominantElement}, 주도 십성 ${sibyl.dominantTenGod}을 중심축으로 해석합니다.`,
    `현재 위험 계수는 ${sibyl.riskScore}, 적성 계수는 ${sibyl.aptitudeScore}로 산출되었습니다. 이 조합은 강점이 분명하지만 타이밍 관리가 성패를 좌우하는 구조를 뜻합니다.`,
    `핵심 포인트: ${chapter.focus}. 추상적인 운세 문장 대신, 조건-행동-결과 프레임으로 의사결정을 고정해야 재현 가능한 성과를 만들 수 있습니다.`,
    `연간 신호 샘플: ${yearHints || "연도별 리스크-기회 데이터 점검 필요"}. 위험이 치솟는 구간은 방어 중심, 기회가 높은 구간은 실행 집중으로 분리 운용해야 합니다.`,
    "실행 체크리스트: 1) 이번 주 핵심 지표 1개 선정 2) 손실 방지 규칙 2개 문서화 3) 30일 단위 회고 루프 고정. 이 세 단계가 누락되면 점수는 좋아도 실제 성과가 흔들립니다.",
  ].join("\n\n");

  let guard = 0;
  while (text.length < SIBYL_REPORT_MIN_CHAPTER_CHARS && guard < 4) {
    text += `\n\n${deterministicExpansionBlock({
      dominantEl: sibyl.dominantElement,
      dominantTenStar: sibyl.dominantTenGod,
      aptCoeff: sibyl.aptitudeScore,
      riskScore: sibyl.riskScore,
      currentYear: yearlyFlow[0]?.year || new Date().getFullYear(),
    }, chapter, index + guard)}`;
    guard += 1;
  }

  return normalizeLineBreaks(text);
}

function mapToSibylChapters(chapters = [], canonical = {}) {
  const chapterMap = {};
  const chapterList = [];

  for (let i = 0; i < SIBYL_REPORT_CHAPTERS.length; i += 1) {
    const target = SIBYL_REPORT_CHAPTERS[i];
    const aiContent = clean(chapters?.[i]?.content || chapters?.[i]?.text || "");
    const fallback = buildCanonicalChapterText(canonical, target, i);
    let merged = aiContent;

    if (merged.length < SIBYL_REPORT_MIN_CHAPTER_CHARS) {
      merged = normalizeLineBreaks([merged, fallback].filter(Boolean).join("\n\n"));
    }

    if (merged.length < SIBYL_REPORT_MIN_CHAPTER_CHARS) {
      merged = buildCanonicalChapterText(canonical, target, i + 10);
    }

    chapterMap[target.key] = merged;
    chapterList.push({
      key: target.key,
      title: target.title,
      content: merged,
    });
  }

  return { chapterMap, chapterList };
}

export function validateSibylReport(report = {}) {
  const requiredChapters = [
    "coreMatrix",
    "riskAnalysis",
    "aptitudeAnalysis",
    "tenGodPattern",
    "elementBalance",
    "yearlyFlow",
    "relationship",
    "moneyCareer",
    "systemWarning",
    "finalMessage",
  ];

  for (const key of requiredChapters) {
    if (!report[key] || clean(report[key]).length < SIBYL_REPORT_MIN_CHAPTER_CHARS) {
      throw new Error(`Sibyl report chapter missing or too short: ${key}`);
    }
  }

  return true;
}

function deterministicExpansionBlock(body = {}, category = {}, index = 0) {
  const dominantEl = clean(body?.dominantEl) || "water";
  const dominantTenStar = clean(body?.dominantTenStar) || "편재";
  const aptCoeff = toNumber(body?.aptCoeff, 420);
  const riskScore = Math.max(5, Math.min(99, toNumber(body?.riskScore, 35)));
  const currentYear = toNumber(body?.currentYear, new Date().getFullYear());
  const lines = [
    `현재 분석 블록 ${index + 1}: ${category.title}`,
    `주도 십성(${dominantTenStar})과 지배 오행(${dominantEl})의 결합은 의사결정 속도와 품질의 균형이 핵심 과제임을 시사합니다.`,
    `적성 계수 ${aptCoeff} 기준으로 볼 때, 단기 성과보다 재현 가능한 프로세스 구축이 장기 성과를 크게 만듭니다.`,
    `리스크 계수 ${riskScore} 구간에서는 과감함보다 검증 루프를 짧게 돌리는 전략이 손실을 줄입니다.`,
    `실전 가이드: 목표를 "성과 지표 1개 + 행동 규칙 2개"로 단순화하고 ${currentYear}년 기준 월 1회 리뷰를 고정하세요.`,
    "협업 상황에서는 역할 경계와 완료 기준을 문서로 남겨 감정 소모를 줄이고, 재작업 비용을 통제해야 합니다.",
  ];
  return lines.join("\n\n");
}

function buildFallbackChapter(body = {}, category = {}, index = 0, minChars = SIBYL_MIN_CHAPTER_CHARS) {
  let text = [
    `${category.title}는 단일 운세 문장이 아니라 행동 시스템 설계 영역입니다.`,
    deterministicExpansionBlock(body, category, index),
    "실행 체크리스트: 오늘 1개, 이번 주 1개, 이번 달 1개의 우선순위를 정해 즉시 실행 가능한 단위로 쪼개세요.",
    "실패 패턴은 의지 부족이 아니라 구조 부재에서 발생합니다. 구조를 먼저 만들면 성과는 뒤따릅니다.",
  ].join("\n\n");

  let safety = 0;
  while (text.length < minChars && safety < 8) {
    text += `\n\n${deterministicExpansionBlock(body, category, safety + 10)}`;
    safety += 1;
  }
  return normalizeLineBreaks(text);
}

function buildFallbackReport(body = {}) {
  const chapters = SIBYL_CATEGORY_PLAN.map((category, index) => ({
    title: category.title,
    content: buildFallbackChapter(body, category, index),
  }));
  const totalChars = chapters.reduce((sum, chapter) => sum + chapter.content.length, 0);
  return {
    source: "fallback",
    reportId: buildSibylFingerprint(body),
    minTotalChars: SIBYL_MIN_TOTAL_CHARS,
    totalChars,
    chapters,
  };
}

function padReportLength(chapters = [], body = {}, minTotalChars = SIBYL_MIN_TOTAL_CHARS) {
  const output = chapters.map((chapter) => ({ ...chapter }));
  let total = output.reduce((sum, chapter) => sum + clean(chapter?.content).length, 0);
  if (!output.length || total >= minTotalChars) return { chapters: output, totalChars: total };

  let cursor = 0;
  let guard = 0;
  while (total < minTotalChars && guard < 80) {
    const idx = cursor % output.length;
    const chapter = output[idx];
    const expansion = deterministicExpansionBlock(body, { title: chapter.title }, guard + idx + 20);
    chapter.content = `${normalizeLineBreaks(chapter.content)}\n\n${expansion}`;
    total = output.reduce((sum, item) => sum + clean(item?.content).length, 0);
    cursor += 1;
    guard += 1;
  }
  return { chapters: output, totalChars: total };
}

function buildReportPrompt(body = {}, category = {}, chapterIndex = 0, chapterCount = SIBYL_CATEGORY_PLAN.length, minChars = SIBYL_MIN_CHAPTER_CHARS) {
  const profile = body?.profile || {};
  const b = profile?.birth || {};
  const pillars = body?.pillars || {};

  return [
    "당신은 SIBYL SYSTEM의 사주 기반 커리어 분석 마스터입니다.",
    "아래 입력을 바탕으로 SIBYL 도미네이터 리포트의 단일 카테고리 챕터를 작성하세요.",
    `현재 챕터: ${chapterIndex + 1}/${chapterCount} — ${category.title}`,
    `챕터 주제: ${category.focus}`,
    `최소 분량: ${minChars}자 이상`,
    "출력 형식 규칙:",
    "- JSON/마크다운 코드블록 금지",
    "- 한국어 본문만 출력",
    "- 소제목을 포함한 구조적 서술로 작성",
    "- 실행 단계, 체크포인트, 실수 방지 규칙을 구체적으로 제시",
    "- 운세 단정 대신 조건-행동-결과 프레임으로 설명",
    "입력 데이터:",
    JSON.stringify({
      profile: {
        gender: clean(body?.gender || profile?.gender || ""),
        birth: {
          year: toNumber(b?.year, null),
          month: toNumber(b?.month, null),
          day: toNumber(b?.day, null),
          hour: toNumber(b?.hour, null),
          minute: toNumber(b?.minute, null),
        },
      },
      pillars,
      dominantEl: clean(body?.dominantEl),
      dominantTenStar: clean(body?.dominantTenStar),
      aptCoeff: toNumber(body?.aptCoeff, 0),
      riskScore: toNumber(body?.riskScore, 0),
      currentYear: toNumber(body?.currentYear, new Date().getFullYear()),
      natal: body?.natal || null,
      category,
    }),
  ].join("\n\n");
}

function buildExpansionPrompt(category = {}, content = "", minChars = SIBYL_MIN_CHAPTER_CHARS) {
  const text = normalizeLineBreaks(content);
  return [
    "아래 리포트 초안을 더 깊고 구체적으로 확장하세요.",
    `카테고리: ${category.title}`,
    `목표 분량: 최소 ${minChars}자`,
    "요구 사항:",
    "- 사례형 설명 2개 이상",
    "- 실패 패턴과 수정 루틴을 단계별로 제시",
    "- 다음 7일/30일/90일 실행안을 명확히 제시",
    "- 한국어 본문만 출력",
    "초안:",
    text,
  ].join("\n\n");
}

async function callSibylGemini(env, prompt, options = {}) {
  return callGeminiText(env, prompt, {
    keyEnvKeys: ["SIBYL_GEMINI_API_KEY1", "SIBYL_GEMINI_API_KEY2"],
    modelEnvKeys: ["SIBYL_GEMINI_MODEL"],
    temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.74,
    topP: 0.92,
    maxOutputTokens: Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192,
    timeoutMs: Number(options.timeoutMs || env.SIBYL_PROVIDER_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(options.maxAttemptsPerPair || env.SIBYL_PROVIDER_RETRIES || 2),
  });
}

async function generateCategoryChapter(env, body = {}, category = {}, chapterIndex = 0) {
  const prompt = buildReportPrompt(body, category, chapterIndex, SIBYL_CATEGORY_PLAN.length, SIBYL_MIN_CHAPTER_CHARS);
  let usedFallback = false;
  let model = "";

  const ai = await callSibylGemini(env, prompt, {
    maxOutputTokens: Number(env.SIBYL_MAX_OUTPUT_TOKENS || 8192),
  });

  let content = "";
  if (ai.ok && clean(ai.text)) {
    const parsed = parseJsonCandidate(ai.text);
    if (parsed?.content && typeof parsed.content === "string") {
      content = normalizeLineBreaks(parsed.content);
    } else {
      content = normalizeLineBreaks(ai.text);
    }
    model = ai.model || "";
  }

  if (content.length < Math.floor(SIBYL_MIN_CHAPTER_CHARS * 0.8)) {
    const fallback = buildFallbackChapter(body, category, chapterIndex);
    content = fallback;
    usedFallback = true;
  }

  if (content.length < SIBYL_MIN_CHAPTER_CHARS) {
    const expand = await callSibylGemini(env, buildExpansionPrompt(category, content, SIBYL_MIN_CHAPTER_CHARS), {
      maxAttemptsPerPair: 1,
      maxOutputTokens: Number(env.SIBYL_EXPAND_OUTPUT_TOKENS || 6144),
    });

    if (expand.ok && clean(expand.text)) {
      const expandedText = normalizeLineBreaks(expand.text);
      if (expandedText.length >= content.length) {
        content = expandedText;
      } else {
        content = `${content}\n\n${expandedText}`;
      }
    }
  }

  if (content.length < SIBYL_MIN_CHAPTER_CHARS) {
    usedFallback = true;
    const safety = buildFallbackChapter(body, category, chapterIndex, SIBYL_MIN_CHAPTER_CHARS);
    content = content.length > safety.length ? content : safety;
  }

  return {
    title: category.title,
    content: normalizeLineBreaks(content),
    model,
    usedFallback,
  };
}

async function buildRichSibylReport(env = {}, body = {}) {
  const chapters = [];
  const warnings = [];
  const modelCounter = {};

  for (let i = 0; i < SIBYL_CATEGORY_PLAN.length; i += 1) {
    const category = SIBYL_CATEGORY_PLAN[i];
    const chapter = await generateCategoryChapter(env, body, category, i);
    chapters.push({ title: chapter.title, content: chapter.content });
    if (chapter.usedFallback) warnings.push(`${i + 1}챕터(${category.title}) fallback`);
    if (chapter.model) modelCounter[chapter.model] = (modelCounter[chapter.model] || 0) + 1;
  }

  const padded = padReportLength(chapters, body, SIBYL_MIN_TOTAL_CHARS);
  const model = Object.entries(modelCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  return {
    source: warnings.length ? "gemini+fallback" : "gemini",
    reportId: buildSibylFingerprint(body),
    minTotalChars: SIBYL_MIN_TOTAL_CHARS,
    totalChars: padded.totalChars,
    categoryCount: SIBYL_CATEGORY_PLAN.length,
    categories: SIBYL_CATEGORY_PLAN.map((item) => item.title),
    chapters: padded.chapters,
    warnings,
    model,
  };
}

export async function handleSibylRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const path = getRoutePath(request, "/api/sibyl");
    if (path !== "/report") return notFound();

    const auth = await requireAuth(request, env);
    const body = await readJson(request);
    const canonical = normalizeCanonicalSibylData(body);
    const requestId = clean(body?.requestId || body?.paymentContext?.requestId || "").slice(0, 120) || `sibyl_${stableHash(JSON.stringify(body?.pillars || {})).slice(0, 8)}`;
    const featureKey = clean(body?.featureKey || body?.paymentContext?.featureKey || "sibyl-dominator-report");
    const profileValidation = {
      ok: Array.isArray(canonical?.debug?.missingFields) ? canonical.debug.missingFields.length === 0 : true,
      missingFields: Array.isArray(canonical?.debug?.missingFields) ? canonical.debug.missingFields : [],
    };

    let rich;
    let reportStatus = "generated";
    try {
      rich = await buildRichSibylReport(env, body);
    } catch {
      rich = buildFallbackReport(body);
      rich.source = "fallback";
      rich.warnings = ["gemini generation failed"];
      reportStatus = "fallback-generated";
    }

    if (!rich || !Array.isArray(rich.chapters) || !rich.chapters.length) {
      rich = buildFallbackReport(body);
      rich.source = "fallback";
    }

    const mapped = mapToSibylChapters(rich.chapters, canonical);

    try {
      validateSibylReport(mapped.chapterMap);
    } catch {
      const hardFallback = mapToSibylChapters([], canonical);
      validateSibylReport(hardFallback.chapterMap);
      mapped.chapterMap = hardFallback.chapterMap;
      mapped.chapterList = hardFallback.chapterList;
      rich.source = "fallback";
      rich.warnings = (rich.warnings || []).concat(["chapter validation fallback"]);
      reportStatus = "fallback-validated";
    }

    const totalChars = mapped.chapterList.reduce((sum, chapter) => sum + clean(chapter.content).length, 0);
    console.log("[sibyl-report]", {
      requestId,
      featureKey,
      hasUserId: Boolean(auth?.userId),
      unlocked: true,
      profileValidation,
      reportStatus,
      totalChars,
      source: rich?.source || "unknown",
    });
    return json({
      ...rich,
      reportId: buildSibylFingerprint(body),
      chapterMap: mapped.chapterMap,
      chapters: mapped.chapterList,
      canonical,
      categoryCount: SIBYL_REPORT_CHAPTERS.length,
      categories: SIBYL_REPORT_CHAPTERS.map((item) => item.title),
      totalChars,
      minTotalChars: Math.min(SIBYL_MIN_TOTAL_CHARS, Math.max(totalChars, 6000)),
    });
  } catch (error) {
    console.warn("[sibyl-report:error]", {
      requestId: clean(error?.requestId || ""),
      message: clean(error?.message || "sibyl route error"),
      code: clean(error?.code || "SIBYL_ROUTE_ERROR"),
    });
    return handleRouteError(error);
  }
}

export const __sibylReportTestUtils = {
  normalizeCanonicalSibylData,
  mapToSibylChapters,
  validateSibylReport,
};
