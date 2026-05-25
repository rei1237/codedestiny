import { geminiLifeBookClient } from "./geminiLifeBookClient.js";
import {
  parseLifeBookChapterResponse,
  validateLifeBookChapter,
} from "./validateLifeBookChapter.js";

const SYSTEM_INSTRUCTION = [
  "너는 30년차 명리학자이자 프리미엄 사주 PDF 전문 작가다.",
  "역할 기준: 최고의 사주 전문가처럼 데이터 근거를 명확히 연결하고, 챕터별로 결론과 실행전략을 분리해 집필한다.",
  "사용자의 사주 데이터와 프로필을 근거로 깊이 있고 구체적인 상담문을 작성한다.",
  "",
  "중요 규칙:",
  "- 제공된 데이터에서 확인 가능한 내용만 확정적으로 말한다.",
  "- 사주 계산을 새로 하지 않는다.",
  "- 없는 데이터를 사실처럼 만들지 않는다.",
  "- 본문에는 JSON, 계산표, 내부 데이터명, 디버그 정보, payload, API 응답 원문을 절대 출력하지 않는다.",
  "- 운명론적 단정보다 현실적인 선택 전략으로 연결한다.",
  "- 각 챕터는 지정된 세부 카테고리를 모두 소제목으로 포함한다.",
  "- 챕터 결론은 반드시 데이터 근거, 리스크, 실행 우선순위를 함께 제시한다.",
  "- 이전 챕터의 핵심 문장과 조언을 반복하지 않는다.",
].join("\n");

const LIFEBOOK_FORBIDDEN_OUTPUT_PHRASES = [
  "자동 복구 생성",
  "Chapter 1",
  "데이터가 부족합니다",
  "품질 검증 실패",
  "API 실패",
];

function toStringSafe(value) {
  return String(value == null ? "" : value).trim();
}

function toStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? fallback : [];
  return value.map((item) => toStringSafe(item)).filter(Boolean);
}

function splitMarkdownSections(markdown) {
  const text = String(markdown || "").replace(/\r/g, "").trim();
  if (!text) return [];

  const lines = text.split("\n");
  const sections = [];
  let currentTitle = "";
  let currentBody = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (!currentTitle && !body) return;
    sections.push({
      title: currentTitle || "핵심 해설",
      body,
    });
  };

  for (const rawLine of lines) {
    const line = String(rawLine || "");
    const heading = line.match(/^###\s+(.+)$/) || line.match(/^##\s+(.+)$/) || line.match(/^#\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = toStringSafe(heading[1]);
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }

  flush();
  return sections
    .map((section) => ({
      title: toStringSafe(section.title),
      body: toStringSafe(section.body),
    }))
    .filter((section) => section.title || section.body);
}

function normalizeSubChapterRows(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const row = item && typeof item === "object" ? item : {};
      return {
        subId: toStringSafe(row.subId) || `sub-${index + 1}`,
        subTitle: toStringSafe(row.subTitle || row.title),
        analysisText: toStringSafe(row.analysisText || row.body),
        strategicGuidance: toStringSafe(row.strategicGuidance || row.guidance),
      };
    })
    .filter((row) => row.subTitle || row.analysisText || row.strategicGuidance);
}

function buildLifeBookSubChapters(chapterConfig, parsedChapter, sections, practicalAdvice = [], warnings = []) {
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toStringSafe(item)).filter(Boolean)
    : (Array.isArray(chapterConfig?.sections)
      ? chapterConfig.sections.map((item) => toStringSafe(item)).filter(Boolean)
      : []);
  const sectionRows = Array.isArray(sections) ? sections : [];
  const guidancePool = practicalAdvice.length
    ? practicalAdvice
    : [
      ...toStringArray(parsedChapter?.warnings, []),
      ...toStringArray(warnings, []),
    ];
  const titles = requiredCoverage.length
    ? requiredCoverage
    : sectionRows.map((section) => toStringSafe(section?.title)).filter(Boolean);

  return titles.map((title, index) => {
    const matchingSection = sectionRows[index] || sectionRows.find((section) => toStringSafe(section?.title) === title) || {};
    const fallbackGuidance = guidancePool[index] || guidancePool[guidancePool.length - 1] || "핵심 기준을 먼저 고정하고 실행 강도를 주간 단위로 점검하세요.";
    return {
      subId: `${toStringSafe(chapterConfig?.id) || "chapter"}-sub-${String(index + 1).padStart(2, "0")}`,
      subTitle: title || `세부 카테고리 ${index + 1}`,
      analysisText: toStringSafe(matchingSection?.body),
      strategicGuidance: fallbackGuidance,
    };
  });
}

function renderExpandedChapterMarkdown(chapterTitle, chapterSubtitle, subChapters = [], summary = "") {
  const lines = [
    `## ${chapterTitle}`,
    chapterSubtitle ? `> ${chapterSubtitle}` : "",
    summary,
  ].filter(Boolean);

  subChapters.forEach((row) => {
    const subTitle = toStringSafe(row?.subTitle);
    const analysis = toStringSafe(row?.analysisText);
    const guidance = toStringSafe(row?.strategicGuidance);
    if (subTitle) lines.push("", `### ${subTitle}`);
    if (analysis) lines.push(analysis);
    if (guidance) lines.push("", `실행 가이드: ${guidance}`);
  });

  return lines.join("\n").trim();
}

function buildExpandedChapterJson(chapterConfig, parsedChapter, lifeBookInputData, overrideSubChapters = null) {
  const chapterCore = lifeBookInputData?.lifeBookContext?.chapterCore || {};
  const sections = splitMarkdownSections(parsedChapter?.contentMarkdown || "");
  const keyInsights = toStringArray(parsedChapter?.keyInsights, [])
    .concat(toStringArray(parsedChapter?.warnings, []))
    .slice(0, 5);
  const practicalAdvice = toStringArray(parsedChapter?.practicalAdvice, []);
  const warnings = toStringArray(parsedChapter?.warnings, []);
  const summary = toStringSafe(parsedChapter?.summary);
  const subChapters = Array.isArray(overrideSubChapters)
    ? normalizeSubChapterRows(overrideSubChapters)
    : buildLifeBookSubChapters(chapterConfig, parsedChapter, sections, practicalAdvice, warnings);
  const normalizedSections = sections.length > 0
    ? sections
    : subChapters.map((row) => ({
      title: row.subTitle,
      body: [row.analysisText, row.strategicGuidance ? `실행 가이드: ${row.strategicGuidance}` : ""].filter(Boolean).join("\n\n"),
    }));

  return {
    id: toStringSafe(parsedChapter?.id) || toStringSafe(chapterConfig?.id),
    roman: toStringSafe(parsedChapter?.roman) || toStringSafe(chapterConfig?.roman),
    title: toStringSafe(parsedChapter?.title) || toStringSafe(chapterConfig?.title),
    subtitle: toStringSafe(parsedChapter?.subtitle) || toStringSafe(chapterConfig?.subtitle),
    summary,
    sections: normalizedSections,
    keyInsights,
    practicalAdvice,
    cautions: warnings,
    chapterId: toStringSafe(parsedChapter?.chapterId) || toStringSafe(chapterConfig?.id),
    chapterTitle: toStringSafe(parsedChapter?.chapterTitle) || toStringSafe(parsedChapter?.title) || toStringSafe(chapterConfig?.title),
    metaData: {
      keyTheme: keyInsights.slice(0, 2).join(" / ") || toStringSafe(chapterConfig?.subtitle) || toStringSafe(chapterConfig?.title),
      dayMaster: toStringSafe(chapterCore?.dayMaster),
      monthPillar: toStringSafe(chapterCore?.monthPillar),
      season: toStringSafe(chapterCore?.season),
    },
    subChapters,
    engineSummaryJson: {
      coreVibe: summary || toStringSafe(chapterConfig?.subtitle) || toStringSafe(chapterConfig?.title),
      actionPriority: {
        immediate: practicalAdvice[0] || "핵심 과제 1개와 보조 과제 2개만 남기고 실행 우선순위를 다시 고정하세요.",
        stop: warnings[0] || practicalAdvice[1] || "기준 없이 일정을 늘리거나 감정 반응으로 결정을 바꾸는 패턴을 멈추세요.",
        review: practicalAdvice[2] || "7일 뒤 실행률과 피로도를 같이 점검해 과부하 구간을 조정하세요.",
      },
    },
    evidence: {
      dayMaster: toStringSafe(chapterCore?.dayMaster),
      monthPillar: toStringSafe(chapterCore?.monthPillar),
      season: toStringSafe(chapterCore?.season),
      yongshin: toStringArray(chapterCore?.yongshin, []),
      daewoonCount: Number(chapterCore?.daewoonCount || 0),
      yearlyCount: Number(chapterCore?.yearlyCount || 0),
      relationshipHints: toStringArray(chapterCore?.relationshipHints, []),
      careerHints: toStringArray(chapterCore?.careerHints, []),
      healthHints: toStringArray(chapterCore?.healthHints, []),
    },
  };
}

export function buildLifeBookChapterJsonBlueprint(chapterConfig, lifeBookInputData = {}) {
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toStringSafe(item)).filter(Boolean)
    : (Array.isArray(chapterConfig?.sections)
      ? chapterConfig.sections.map((item) => toStringSafe(item)).filter(Boolean)
      : []);
  const subChapters = requiredCoverage.map((title, index) => ({
    subId: `${toStringSafe(chapterConfig?.id) || "chapter"}-sub-${String(index + 1).padStart(2, "0")}`,
    subTitle: title,
    analysisText: "",
    strategicGuidance: `이 섹션에서는 ${title} 관점의 실행 기준과 리스크 컷오프를 정리합니다.`,
  }));
  return buildExpandedChapterJson(chapterConfig, {
    id: chapterConfig?.id,
    roman: chapterConfig?.roman,
    title: chapterConfig?.title,
    subtitle: chapterConfig?.subtitle,
    summary: `${toStringSafe(chapterConfig?.title)} 챕터의 핵심 기준과 실행 포인트를 정리하는 설계도입니다.`,
    practicalAdvice: subChapters.map((row) => row.strategicGuidance),
  }, lifeBookInputData, subChapters);
}

function buildChapterJsonPayload(chapterConfig, parsedChapter, lifeBookInputData) {
  return buildExpandedChapterJson(chapterConfig, parsedChapter, lifeBookInputData);
}

function buildChapterHardRequirements(chapterConfig, lifeBookInputData) {
  const profileName = String(lifeBookInputData?.userProfile?.name || "").trim();
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const lines = [
    "- 본문은 자연스러운 상담문으로만 작성하고 내부 구조 설명 문장을 쓰지 마세요.",
    "- 확인 가능한 사주 구조를 중심으로 해석하고 과장된 예언을 피하세요.",
  ];

  if (profileName) {
    lines.push(`- 사용자 이름 표기는 '${profileName}' 그대로 유지하고 임의 이름으로 바꾸지 마세요.`);
  }

  if (requiredCoverage.length > 0) {
    lines.push("- 아래 [필수 작성 항목]의 각 항목을 정확한 소제목(###)으로 반드시 포함하세요.");
    lines.push("- 항목 누락 시 재생성 대상입니다.");
  }

  lines.push("- 각 소제목 본문은 최소 500자 이상으로 작성하세요.");
  lines.push("- 챕터 전체는 최소 2500자 이상으로 작성하세요.");
  lines.push(`- 다음 문구는 본문에 절대 포함하지 마세요: ${LIFEBOOK_FORBIDDEN_OUTPUT_PHRASES.join(", ")}`);

  return lines;
}

function extractLongSentences(text, minLength = 30) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

function collectPreviousSentenceBanList(previousTexts = [], limit = 15) {
  const freq = new Map();
  (previousTexts || []).forEach((txt) => {
    extractLongSentences(txt, 30).forEach((line) => {
      const count = freq.get(line) || 0;
      freq.set(line, count + 1);
    });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([line]) => line);
}

function buildChapterPrompt(chapterConfig, lifeBookInputData, previousTexts = [], chapterMemories = []) {
  const safeContextJson = JSON.stringify(lifeBookInputData?.lifeBookContext || lifeBookInputData || {}, null, 2);
  const banList = collectPreviousSentenceBanList(previousTexts, 15);
  const hardRequirements = buildChapterHardRequirements(chapterConfig, lifeBookInputData);
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const targetChars = Number(chapterConfig?.targetChars || 3000);
  const minChars = Number(chapterConfig?.minLength || Math.floor(targetChars * 0.85));
  const previousChapterSummaries = (Array.isArray(chapterMemories) ? chapterMemories : [])
    .map((memo) => {
      const title = String(memo?.title || "").trim();
      const summary = String(memo?.summary || "").trim();
      const themes = Array.isArray(memo?.usedThemes) ? memo.usedThemes.filter(Boolean).join(", ") : "";
      const advice = Array.isArray(memo?.usedAdvice) ? memo.usedAdvice.filter(Boolean).join(" | ") : "";
      return [title ? `- ${title}` : "", summary ? `  요약: ${summary}` : "", themes ? `  사용 주제: ${themes}` : "", advice ? `  사용 조언: ${advice}` : ""].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");

  return [
    SYSTEM_INSTRUCTION,
    "",
    `다음 LifeBookContext를 바탕으로 \"${chapterConfig.roman}. ${chapterConfig.title}\" 챕터를 작성하라.`,
    "",
    "[조건]",
    `- 목표 글자 수: ${targetChars}자 내외`,
    `- 최소 글자 수: ${minChars}자 이상`,
    "- 반드시 아래 세부 카테고리를 모두 포함한다.",
    "- 각 세부 카테고리는 ### 소제목을 붙인다.",
    "- 이전 챕터에서 다룬 핵심 표현을 반복하지 않는다.",
    "- 각 소제목 본문은 최소 500자 이상으로 작성한다.",
    "- 데이터가 부족한 항목은 단정하지 말고 해석 가능한 범위에서 작성한다.",
    "- 최종 문체는 프리미엄 상담 리포트 문체로 한다.",
    `- 금지 문구: ${LIFEBOOK_FORBIDDEN_OUTPUT_PHRASES.join(", ")}`,
    "",
    "[작성 규칙]",
    "- JSON 형식으로만 출력한다.",
    "- chapterJson에는 확장 스키마를 함께 포함한다: chapterId, chapterTitle, metaData, subChapters, engineSummaryJson.",
    "- chapterJson.sections 각 항목은 title/body를 포함한다.",
    "- chapterJson.keyInsights는 데이터 기반 핵심 통찰 3개 이상으로 작성한다.",
    "- chapterJson.practicalAdvice는 즉시 실행 가능한 행동 문장 3개 이상으로 작성한다.",
    "- 마지막에는 핵심 요약과 실전 조언을 포함한다.",
    ...hardRequirements,
    requiredCoverage.length
      ? `\n[필수 작성 항목]\n${requiredCoverage.map((item) => `- ${item}`).join("\n")}`
      : "",
    previousChapterSummaries
      ? `\n[이전 챕터 요약]\n${previousChapterSummaries}`
      : "",
    banList.length
      ? `\n[이전 챕터와 중복되어 사용할 수 없는 금지 문장 목록]\n문장 반복을 피하기 위해 다음 리스트에 있는 문장이나 이와 유사한 핵심 서술 방식은 이번 챕터 본문에 절대 출력하지 마세요:\n${JSON.stringify(banList, null, 2)}`
      : "",
    "",
    "[출력 JSON 형식]",
    "{",
    `  \"id\": \"${chapterConfig.id}\",`,
    `  \"roman\": \"${chapterConfig.roman}\",`,
    `  \"title\": \"${chapterConfig.title}\",`,
    `  \"subtitle\": \"${chapterConfig.subtitle}\",`,
    "  \"contentMarkdown\": \"본문 markdown\",",
    "  \"summary\": \"챕터 핵심 요약\",",
    "  \"keyInsights\": [\"핵심 통찰 1\", \"핵심 통찰 2\", \"핵심 통찰 3\"],",
    "  \"practicalAdvice\": [\"실전 조언 1\", \"실전 조언 2\", \"실전 조언 3\"],",
    "  \"warnings\": [\"주의점 1\", \"주의점 2\"],",
    "  \"chapterJson\": {",
    `    \"chapterId\": \"${chapterConfig.id}\",`,
    `    \"chapterTitle\": \"${chapterConfig.title}\",`,
    "    \"metaData\": { \"keyTheme\": \"챕터 핵심 테마\" },",
    "    \"subChapters\": [{ \"subId\": \"sub-01\", \"subTitle\": \"세부 카테고리\", \"analysisText\": \"심층 분석\", \"strategicGuidance\": \"실행 지침\" }],",
    "    \"engineSummaryJson\": { \"coreVibe\": \"챕터 한 줄 요약\", \"actionPriority\": { \"immediate\": \"즉시 행동\", \"stop\": \"중단할 패턴\", \"review\": \"점검 지표\" } },",
    "    \"summary\": \"챕터 핵심 요약\",",
    "    \"sections\": [{ \"title\": \"소제목\", \"body\": \"핵심 본문\" }],",
    "    \"keyInsights\": [\"핵심 통찰 1\", \"핵심 통찰 2\", \"핵심 통찰 3\"],",
    "    \"practicalAdvice\": [\"실전 조언 1\", \"실전 조언 2\", \"실전 조언 3\"],",
    "    \"cautions\": [\"주의점 1\", \"주의점 2\"]",
    "  }",
    "}",
    "",
    "[내부 참고 데이터: LifeBookContext]",
    safeContextJson,
  ].join("\n");
}

function buildRepairPrompt(chapterConfig, previousOutput, validationErrors) {
  const errors = Array.isArray(validationErrors) ? validationErrors.join(", ") : "UNKNOWN_VALIDATION_ERROR";
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  return [
    SYSTEM_INSTRUCTION,
    "",
    `이전 출력이 품질 기준을 통과하지 못했습니다. 다음 오류를 수정해 JSON만 다시 출력하세요: ${errors}`,
    "",
    "[필수 조건 재강조]",
    `- 챕터 id는 ${chapterConfig.id}로 유지`,
    `- 챕터 roman은 ${chapterConfig.roman}로 유지`,
    "- contentMarkdown은 최소 5개 이상의 소제목 포함",
    `- contentMarkdown은 최소 ${chapterConfig.minLength}자 이상`,
    "- summary, practicalAdvice(최소 3개) 반드시 포함",
    "- 필수 작성 항목은 누락 없이 모두 포함",
    "- 중복 문단, 중복 문장이나 이전 챕터 해석의 단순 반복은 반드시 제거",
    "- 각 소제목 본문은 최소 500자 이상으로 다시 작성",
    "- 금지 템플릿 문구(반복 패턴과 주의점/실전 행동 전략/심화 실행 노트/마무리 정리) 사용 금지",
    `- 다음 금지 문구를 절대 출력하지 마세요: ${LIFEBOOK_FORBIDDEN_OUTPUT_PHRASES.join(", ")}`,
    "- 본문에서 과도한 **강조 표기** 제거",
    requiredCoverage.length
      ? `\n[필수 작성 항목 재확인]\n${requiredCoverage.map((item) => `- ${item}`).join("\n")}`
      : "",
    "",
    "[이전 출력]",
    String(previousOutput || "").slice(0, 12000),
  ].join("\n");
}

function toKoreanLikeLength(text) {
  return String(text || "")
    .replace(/\s+/g, "")
    .length;
}

function buildLifeBookFallbackChapter(chapterConfig, lifeBookInputData, previousTexts = []) {
  const core = lifeBookInputData?.lifeBookContext?.chapterCore || {};
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toStringSafe(item)).filter(Boolean)
    : [];
  const headings = requiredCoverage.length ? requiredCoverage : [
    "핵심 해석",
    "현실 전략",
    "리스크 관리",
    "실행 계획",
  ];

  const previousSignals = (Array.isArray(previousTexts) ? previousTexts : [])
    .map((row) => toStringSafe(row).replace(/\s+/g, " ").slice(0, 200))
    .filter(Boolean)
    .slice(-3);

  const factLines = [
    `- 일간: ${toStringSafe(core?.dayMaster) || "미상"}`,
    `- 월주: ${toStringSafe(core?.monthPillar) || "미상"}`,
    `- 계절 흐름: ${toStringSafe(core?.season) || "미상"}`,
    `- 용신: ${toStringArray(core?.yongshin, ["정보 점검 필요"]).join(", ")}`,
    `- 관계 단서: ${toStringArray(core?.relationshipHints, ["관계 경계선 명확화"]).join(", ")}`,
    `- 커리어 단서: ${toStringArray(core?.careerHints, ["핵심 과제 우선순위 재정렬"]).join(", ")}`,
    `- 건강 단서: ${toStringArray(core?.healthHints, ["집중과 회복 루틴 균형"]).join(", ")}`,
  ];

  const blocks = [
    `## ${toStringSafe(chapterConfig?.roman)}. ${toStringSafe(chapterConfig?.title)}`,
    toStringSafe(chapterConfig?.subtitle) ? `> ${toStringSafe(chapterConfig?.subtitle)}` : "",
    "아래 해석은 검증된 사주 컨텍스트를 바탕으로 현재 선택의 품질을 높이기 위한 실행형 상담 가이드입니다.",
    "",
    "### 데이터 기준점",
    factLines.join("\n"),
  ].filter(Boolean);

  headings.forEach((heading, index) => {
    const focus = factLines[index % factLines.length] || "- 핵심 기준: 실행 우선순위";
    const reinforce = factLines[(index + 2) % factLines.length] || "- 보강 기준: 리스크 선관리";
    const strategyLens = ["일", "돈", "관계", "건강", "학습", "회복", "의사결정"][index % 7];
    const timingLens = ["단기 4주", "중기 3개월", "반기", "연간", "대운 전환기"][index % 5];
    blocks.push(
      "",
      `### ${heading}`,
      `${heading}에서는 ${focus.replace(/^-\s*/, "")} 항목을 우선 판단 기준으로 두고, 실행-점검-보정 순환을 유지하는 것이 핵심입니다.`,
      `이번 구간에서 가장 중요한 것은 ${reinforce.replace(/^-\s*/, "")}을 실제 일정에 반영해 감정 반응이 아닌 기준 중심 결정을 유지하는 것입니다.`,
      `분석 렌즈는 ${strategyLens} 영역이며, 판단 주기는 ${timingLens} 기준으로 고정해 변동성에 흔들리지 않는 운영 패턴을 만드는 데 초점을 둡니다.`,
      `실행 포인트 ${index + 1}: 우선 과제를 2개 이하로 정하고 각 과제의 완료 조건을 계량 지표와 문장 지표로 분리해 기록하세요.`,
      `리스크 관리 ${index + 1}: 일정 과밀, 감정적 반응, 기준 없는 확장 신호가 동시에 나타나면 즉시 일정 강도를 낮추고 핵심 기준으로 복귀하세요.`,
    );

    let sectionDepth = 1;
    while (toKoreanLikeLength(blocks.join("\n")) < Math.max(2500, (index + 1) * 600) && sectionDepth <= 2) {
      blocks.push(
        `심화 포인트 ${index + 1}-${sectionDepth}: ${focus.replace(/^-\s*/, "")}과 ${reinforce.replace(/^-\s*/, "")}의 균형을 주 ${sectionDepth + 1}회 점검하며, 변경 사유는 단일 문장 규칙으로 기록해 누적 편향을 줄이세요.`,
      );
      sectionDepth += 1;
    }
  });

  if (previousSignals.length) {
    blocks.push(
      "",
      "### 연속성 점검",
      "이전 챕터의 핵심 결론을 반복하지 않되, 이미 합의한 기준을 다음 단계 실행 계획에 연결해야 흐름이 끊기지 않습니다.",
      `점검 메모: ${previousSignals.join(" | ")}`,
      "실행 문장: 이번 챕터의 우선 행동 3가지를 달력에 고정하고, 완료 근거를 같은 형식으로 남겨 다음 챕터 의사결정 기준으로 연결하세요.",
    );
  }

  let contentMarkdown = blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const minLength = Math.max(2200, Number(chapterConfig?.minLength || 2500));
  let turn = 1;
  while (toKoreanLikeLength(contentMarkdown) < minLength && turn <= 8) {
    const signal = factLines[turn % factLines.length] || "- 기준: 실행 점검";
    contentMarkdown += `\n\n### 실행 심화 ${turn}\n${signal.replace(/^-\s*/, "")}을 중심으로 이번 주 실행 결과를 수치와 문장으로 동시에 기록하고, 다음 주 계획은 변경 폭을 20% 이내로 조정하세요.\n핵심 질문 ${turn}: 지금의 선택이 90일 뒤에도 유지 가능한가, 리스크 징후를 선제적으로 감지했는가, 관계와 성과를 함께 관리하고 있는가.`;
    turn += 1;
  }

  const chapterResult = {
    id: toStringSafe(chapterConfig?.id),
    roman: toStringSafe(chapterConfig?.roman),
    title: toStringSafe(chapterConfig?.title),
    subtitle: toStringSafe(chapterConfig?.subtitle),
    contentMarkdown,
    summary: `${toStringSafe(chapterConfig?.title)} 챕터의 실행 기준과 우선순위를 재정렬해 성과와 리스크를 함께 관리하는 전략을 제시합니다.`,
    keyInsights: [
      "핵심 기준을 먼저 고정하고 행동을 배치해야 변동성이 줄어듭니다.",
      "관계·재정·에너지 지표를 같은 주기로 점검할 때 누수가 줄어듭니다.",
      "실행-점검-보정 루틴을 문장화하면 선택 품질이 안정됩니다.",
    ],
    practicalAdvice: [
      "이번 주 핵심 목표 1개, 보조 목표 2개만 남기고 나머지는 보류하세요.",
      "주간 리뷰에서 완료/보류/중단 사유를 한 줄씩 기록하세요.",
      "관계 피로 신호가 보이면 즉시 일정 강도를 20% 낮추고 회복 루틴을 우선 적용하세요.",
    ],
    warnings: [
      "속도 과열은 판단 오차를 키우므로 기준 없이 일정을 늘리지 마세요.",
      "단기 성과만 추적하면 장기 리스크가 누적될 수 있습니다.",
    ],
  };

  chapterResult.chapterJson = buildChapterJsonPayload(chapterConfig, chapterResult, lifeBookInputData);
  return chapterResult;
}

export async function generateLifeBookChapter(params = {}) {
  const env = params.env || {};
  const chapterConfig = params.chapterConfig;
  const lifeBookInputData = params.lifeBookInputData || {};
  const strictMode = params.strictMode === true;
  const maxRetries = Math.max(0, Math.min(2, Number(params.maxRetries ?? 2)));
  const previousTexts = Array.isArray(params.previousTexts) ? params.previousTexts : [];
  const chapterMemories = Array.isArray(params.chapterMemories) ? params.chapterMemories : [];
  const forceLocal = params.forceLocal === true;

  if (!chapterConfig || typeof chapterConfig !== "object") {
    return {
      ok: false,
      code: "LIFEBOOK_CHAPTER_CONFIG_INVALID",
      message: "챕터 설정이 유효하지 않습니다.",
    };
  }

  if (forceLocal) {
    const fallbackChapter = buildLifeBookFallbackChapter(chapterConfig, lifeBookInputData, previousTexts);
    const fallbackValidation = validateLifeBookChapter(fallbackChapter, chapterConfig, previousTexts);
    if (!fallbackValidation.ok) {
      return {
        ok: false,
        code: "LIFEBOOK_CHAPTER_LOCAL_FALLBACK_QUALITY_FAILED",
        message: `챕터 품질 검증 실패: ${chapterConfig.id}`,
        attempts: 0,
        usedFallback: true,
        validation: fallbackValidation,
      };
    }
    return {
      ok: true,
      chapterResult: {
        ...fallbackChapter,
        warnings: [
          ...(Array.isArray(fallbackChapter.warnings) ? fallbackChapter.warnings : []),
          ...(Array.isArray(fallbackValidation.warnings) ? fallbackValidation.warnings : []),
        ].filter(Boolean),
      },
      attempts: 0,
      usedFallback: true,
      validation: fallbackValidation,
    };
  }

  let attempts = 0;
  let lastRawText = "";
  let lastValidation = { ok: false, errors: ["NOT_GENERATED"], warnings: [] };

  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const prompt = attempts === 1
        ? buildChapterPrompt(chapterConfig, lifeBookInputData, previousTexts, chapterMemories)
        : buildRepairPrompt(chapterConfig, lastRawText, lastValidation.errors);

      const generated = await geminiLifeBookClient(env, prompt, {
        requestId: `${chapterConfig.id}:${Date.now()}:attempt-${attempts}`,
      });

      lastRawText = generated.text;

      const parsed = parseLifeBookChapterResponse(lastRawText, chapterConfig);
      const validation = validateLifeBookChapter(parsed, chapterConfig, previousTexts);
      lastValidation = validation;

      if (validation.ok) {
        const normalizedChapter = {
          ...parsed,
          chapterJson: (
            parsed?.chapterJson
            && typeof parsed.chapterJson === "object"
            && !Array.isArray(parsed.chapterJson)
          )
            ? parsed.chapterJson
            : buildChapterJsonPayload(chapterConfig, parsed, lifeBookInputData),
        };

        return {
          ok: true,
          chapterResult: {
            ...normalizedChapter,
            warnings: [
              ...(Array.isArray(normalizedChapter.warnings) ? normalizedChapter.warnings : []),
              ...(Array.isArray(validation.warnings) ? validation.warnings : []),
            ].filter(Boolean),
          },
          attempts,
          usedFallback: false,
          validation,
        };
      }
    } catch (error) {
      lastValidation = {
        ok: false,
        errors: [String(error?.code || "GEMINI_ERROR"), String(error?.message || "UNKNOWN_ERROR")],
        warnings: [],
      };
      lastRawText = String(error?.message || "");
    }
  }

  const fallbackChapter = buildLifeBookFallbackChapter(chapterConfig, lifeBookInputData, previousTexts);
  const fallbackValidation = validateLifeBookChapter(fallbackChapter, chapterConfig, previousTexts);
  if (fallbackValidation.ok) {
    return {
      ok: true,
      chapterResult: {
        ...fallbackChapter,
        warnings: [
          ...(Array.isArray(fallbackChapter.warnings) ? fallbackChapter.warnings : []),
          ...(Array.isArray(fallbackValidation.warnings) ? fallbackValidation.warnings : []),
        ].filter(Boolean),
      },
      attempts,
      usedFallback: true,
      validation: fallbackValidation,
    };
  }

  return {
    ok: false,
    code: "LIFEBOOK_CHAPTER_QUALITY_FAILED",
    message: `챕터 품질 검증 실패: ${chapterConfig.id}`,
    attempts,
    usedFallback: false,
    validation: lastValidation,
  };
}
