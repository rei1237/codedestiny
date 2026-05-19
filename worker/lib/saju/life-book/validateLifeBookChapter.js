function toStringSafe(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeAdvice(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toStringSafe(item)).filter(Boolean);
}

function countHeadings(markdown) {
  const source = toStringSafe(markdown);
  if (!source) return 0;
  return source
    .split(/\r?\n/)
    .filter((line) => /^(##|###)\s+/.test(line.trim()))
    .length;
}

function extractJsonBlock(rawText) {
  const source = String(rawText || "");
  const firstBrace = source.indexOf("{");
  if (firstBrace < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;

    if (depth === 0) {
      return source.slice(firstBrace, i + 1);
    }
  }

  return "";
}

function parseSummaryFromMarkdown(source) {
  const lines = String(source || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = toStringSafe(lines[i]);
    if (!line) continue;
    if (/핵심\s*요약/i.test(line)) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const candidate = toStringSafe(lines[j]);
        if (!candidate) continue;
        if (/^(##|###)\s+/.test(candidate)) continue;
        if (/^-\s+/.test(candidate)) return candidate.replace(/^-\s+/, "");
        return candidate;
      }
    }
  }
  return "";
}

function parseAdviceFromMarkdown(source) {
  const lines = String(source || "").split(/\r?\n/);
  const advice = [];
  let adviceMode = false;

  for (const rawLine of lines) {
    const line = toStringSafe(rawLine);
    if (!line) continue;

    if (/실전\s*조언/i.test(line)) {
      adviceMode = true;
      continue;
    }

    if (/^(##|###)\s+/.test(line) && adviceMode) {
      adviceMode = false;
    }

    if (!adviceMode) continue;

    if (/^-\s+/.test(line)) {
      advice.push(line.replace(/^-\s+/, ""));
    }
  }

  return advice;
}

function buildMarkdownFallback(rawText, chapterConfig) {
  const content = toStringSafe(rawText) || "제공된 계산값 기준으로 볼 때 데이터 해석 문장을 안전하게 구성할 수 있는 정보가 제한적입니다.";
  const summary = parseSummaryFromMarkdown(content)
    || "제공된 계산값 기준으로 핵심 구조를 다시 점검하면서 단계적으로 실행하는 것이 가장 안전합니다.";

  const practicalAdvice = parseAdviceFromMarkdown(content);

  return {
    id: chapterConfig.id,
    roman: chapterConfig.roman,
    title: chapterConfig.title,
    subtitle: chapterConfig.subtitle,
    contentMarkdown: content,
    summary,
    practicalAdvice: practicalAdvice.length ? practicalAdvice : [
      "핵심 의사결정은 감정 반응과 현실 조건을 분리해 기록하세요.",
      "반복되는 패턴을 2주 단위로 점검해 실행 루틴을 고정하세요.",
      "무리한 확장보다 손실 방어 기준을 먼저 정한 뒤 확장하세요.",
    ],
    warnings: [],
  };
}

export function parseLifeBookChapterResponse(rawText, chapterConfig) {
  const jsonBlock = extractJsonBlock(rawText);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);
      return {
        id: toStringSafe(parsed.id) || chapterConfig.id,
        roman: toStringSafe(parsed.roman) || chapterConfig.roman,
        title: toStringSafe(parsed.title) || chapterConfig.title,
        subtitle: toStringSafe(parsed.subtitle) || chapterConfig.subtitle,
        contentMarkdown: toStringSafe(parsed.contentMarkdown),
        summary: toStringSafe(parsed.summary),
        practicalAdvice: normalizeAdvice(parsed.practicalAdvice),
        warnings: normalizeAdvice(parsed.warnings),
      };
    } catch {
      // JSON parse failure will fallback to markdown mode below.
    }
  }

  return buildMarkdownFallback(rawText, chapterConfig);
}

const BANNED_PHRASES = [
  /반드시\s*망한다/,
  /죽음\s*또는\s*사망/,
  /치명적\s*질병/,
  /불치병/,
  /절대\s*회복\s*불가/,
  /운명이\s*끝난다/,
  /저주/,
  /파멸/,
];

export function validateLifeBookChapter(chapterResult, chapterConfig) {
  const errors = [];
  const warnings = [];

  const contentMarkdown = toStringSafe(chapterResult?.contentMarkdown);
  const summary = toStringSafe(chapterResult?.summary);
  const practicalAdvice = normalizeAdvice(chapterResult?.practicalAdvice);

  const minLength = Number(chapterConfig?.minLength || 2500);
  const headingCount = countHeadings(contentMarkdown);
  const focusAreas = Array.isArray(chapterConfig?.focusAreas) ? chapterConfig.focusAreas : [];
  const focusHits = focusAreas.filter((keyword) => contentMarkdown.includes(String(keyword)));

  if (!contentMarkdown) errors.push("EMPTY_CONTENT");
  if (contentMarkdown.length < minLength) errors.push("TOO_SHORT");
  if (headingCount < 5) errors.push("NOT_ENOUGH_SUBHEADINGS");
  if (!summary) errors.push("MISSING_SUMMARY");
  if (practicalAdvice.length < 3) errors.push("MISSING_PRACTICAL_ADVICE");
  if (focusAreas.length > 0 && focusHits.length < 2) warnings.push("LOW_FOCUS_AREA_COVERAGE");

  if (BANNED_PHRASES.some((pattern) => pattern.test(contentMarkdown))) {
    errors.push("BANNED_EXPRESSION_FOUND");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    quality: {
      length: contentMarkdown.length,
      minLength,
      headingCount,
      focusHits,
    },
  };
}

export function createLifeBookFallbackChapter(chapterConfig, lifeBookInputData, reason = "") {
  const profileName = toStringSafe(lifeBookInputData?.userProfile?.name) || "사용자";
  const pillars = lifeBookInputData?.sajuChart || {};
  const elements = lifeBookInputData?.fiveElements || {};
  const reasonLine = toStringSafe(reason);

  const sections = [
    `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n제공된 계산값 기준으로 볼 때 ${profileName}님의 핵심 구조는 원국의 기본 축과 일상 의사결정 패턴의 연결을 먼저 점검하는 것이 중요합니다.`,
    `## 데이터 근거 요약\n년주 ${toStringSafe(pillars.yearPillar) || "미제공"}, 월주 ${toStringSafe(pillars.monthPillar) || "미제공"}, 일주 ${toStringSafe(pillars.dayPillar) || "미제공"}, 시주 ${toStringSafe(pillars.hourPillar) || "미제공"}, 일간 ${toStringSafe(pillars.dayMaster) || "미제공"}를 기준으로 해석 우선순위를 정리합니다.`,
    `## 오행 균형 해석\n오행 분포는 목 ${Number(elements.wood || 0)}, 화 ${Number(elements.fire || 0)}, 토 ${Number(elements.earth || 0)}, 금 ${Number(elements.metal || 0)}, 수 ${Number(elements.water || 0)}로 확인되며, 과잉/부족 흐름은 생활 루틴과 선택 환경 조정으로 완화할 수 있습니다.`,
    "## 반복 패턴과 주의점\n반복되는 어려움은 사건 자체보다 반응 습관에서 강화됩니다. 감정 반응이 커지는 시점과 회복이 늦어지는 조건을 분리해서 기록하면 리스크를 줄일 수 있습니다.",
    "## 실전 행동 전략\n실행 기준을 소수로 고정하고, 주간 점검표를 통해 관계·일·재정·건강을 동시에 관리하면 안정성이 높아집니다. 특히 선택이 어려운 순간에는 손실 방어 기준을 먼저 적용하는 것이 안전합니다.",
    "## 마무리 정리\n이 챕터는 제공된 계산 데이터에 근거한 보수적 해석문입니다. 이후 데이터가 보강되면 각 소제목의 해석 깊이를 더 확장할 수 있습니다.",
  ];

  let contentMarkdown = sections.join("\n\n");
  while (contentMarkdown.length < Math.max(2500, Number(chapterConfig?.minLength || 2500))) {
    contentMarkdown += "\n\n### 실행 보강 메모\n오늘의 의사결정을 기록하고, 7일 뒤 같은 기준으로 다시 검토해 반복 패턴을 줄이세요.";
  }

  return {
    id: chapterConfig.id,
    roman: chapterConfig.roman,
    title: chapterConfig.title,
    subtitle: chapterConfig.subtitle,
    contentMarkdown,
    summary: "제공된 계산값 기준으로 핵심 구조를 보수적으로 해석하고, 실행 가능한 행동 기준으로 정리했습니다.",
    practicalAdvice: [
      "주간 점검표로 감정/일정/재정/회복 루틴을 동시에 확인하세요.",
      "중요 의사결정은 즉시 실행보다 손실 방어 기준을 먼저 적용하세요.",
      "반복되는 갈등 상황은 트리거와 반응을 분리해 기록하세요.",
    ],
    warnings: reasonLine ? [reasonLine] : [],
  };
}
