function toStringSafe(value) {
  return String(value == null ? "" : value).trim();
}

function sanitizeReadableText(value) {
  return toStringSafe(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeAdvice(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeReadableText(item)).filter(Boolean);
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
  const content = sanitizeReadableText(rawText) || "제공된 계산값 기준으로 데이터 해석 문장을 안전하게 구성할 수 있는 정보가 제한적입니다.";
  const summary = parseSummaryFromMarkdown(content)
    || "제공된 계산값 기준으로 핵심 구조를 점검하고 단계적으로 실행하는 접근이 가장 안전합니다.";

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
    parseFallbackUsed: true,
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
        title: sanitizeReadableText(parsed.title) || chapterConfig.title,
        subtitle: sanitizeReadableText(parsed.subtitle) || chapterConfig.subtitle,
        contentMarkdown: toStringSafe(parsed.contentMarkdown)
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/__([^_]+)__/g, "$1"),
        summary: sanitizeReadableText(parsed.summary),
        practicalAdvice: normalizeAdvice(parsed.practicalAdvice),
        warnings: normalizeAdvice(parsed.warnings),
        parseFallbackUsed: false,
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
  /데이터가\s*일부\s*누락된\s*궁은\s*branch,\s*mainStars,\s*strength,\s*sihua/i,
  /reportPayload\(=calculatedData\)|chapterJsonPacks/i,
  /\[SYSTEM\]|\[USER\]|중요\s*규칙\s*:/i,
  /실행\s*보강\s*메모/i,
  /##\s*반복\s*패턴과\s*주의점/i,
  /##\s*실전\s*행동\s*전략/i,
  /###\s*심화\s*실행\s*노트\s*\d*/i,
  /##\s*마무리\s*정리/i,
];

function normalizeLooseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\t\n\r]/g, "")
    .replace(/[\-—–·,.:;!?()\[\]{}'"`/\\]/g, "")
    .trim();
}

function hasLoosePhrase(sourceText, phrase) {
  const source = normalizeLooseText(sourceText);
  const target = normalizeLooseText(phrase);
  if (!target) return true;
  if (target.length <= 1) return true;
  return source.includes(target);
}

function findMissingRequiredCoverage(contentMarkdown, chapterConfig) {
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toStringSafe(item)).filter(Boolean)
    : [];
  if (!requiredCoverage.length) return [];
  return requiredCoverage.filter((item) => !hasLoosePhrase(contentMarkdown, item));
}

function extractLongSentences(text, minLength = 30) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

function normalizeParagraphFingerprint(text) {
  return String(text || "")
    .replace(/[#>*`\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectRepeatedLongSentences(text, minLength = 30) {
  const source = String(text || "");
  const chunks = source
    .split(/[\n\.\!\?。！？]/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
  const seen = new Set();
  const duplicates = [];
  for (const c of chunks) {
    const fp = normalizeParagraphFingerprint(c);
    if (!fp) continue;
    if (seen.has(fp)) duplicates.push(c);
    seen.add(fp);
  }
  return duplicates;
}

function detectCrossChapterRepeatedSentences(candidateText, previousTexts, minLength = 30) {
  const previousSet = new Set();
  (previousTexts || []).forEach((txt) => {
    extractLongSentences(txt, minLength).forEach((line) => previousSet.add(line));
  });
  const repeated = [];
  extractLongSentences(candidateText, minLength).forEach((line) => {
    if (previousSet.has(line) && !repeated.includes(line)) repeated.push(line);
  });
  return repeated;
}

export function validateLifeBookChapter(chapterResult, chapterConfig, previousTexts = []) {
  const errors = [];
  const warnings = [];

  const contentMarkdown = toStringSafe(chapterResult?.contentMarkdown);
  const summary = toStringSafe(chapterResult?.summary);
  const practicalAdvice = normalizeAdvice(chapterResult?.practicalAdvice);
  const parseFallbackUsed = chapterResult?.parseFallbackUsed === true;

  const minLength = Number(chapterConfig?.minLength || 2500);
  const headingCount = countHeadings(contentMarkdown);
  const focusAreas = Array.isArray(chapterConfig?.focusAreas) ? chapterConfig.focusAreas : [];
  const focusHits = focusAreas.filter((keyword) => contentMarkdown.includes(String(keyword)));

  if (!contentMarkdown) errors.push("EMPTY_CONTENT");
  if (contentMarkdown.length < minLength) errors.push("TOO_SHORT");
  if (headingCount < 5) errors.push("NOT_ENOUGH_SUBHEADINGS");
  if (!summary) errors.push("MISSING_SUMMARY");
  if (practicalAdvice.length < 3) errors.push("MISSING_PRACTICAL_ADVICE");
  if (parseFallbackUsed) errors.push("PARSE_FALLBACK_USED");
  if (focusAreas.length > 0 && focusHits.length < 2) warnings.push("LOW_FOCUS_AREA_COVERAGE");

  const missingRequiredCoverage = findMissingRequiredCoverage(contentMarkdown, chapterConfig);
  if (missingRequiredCoverage.length > 0) {
    errors.push("CHAPTER_REQUIRED_COVERAGE_MISSING");
  }

  if (BANNED_PHRASES.some((pattern) => pattern.test(contentMarkdown))) {
    errors.push("BANNED_EXPRESSION_FOUND");
  }

  // 중복 문장 검사 추가
  const repeatedInside = detectRepeatedLongSentences(contentMarkdown, 30);
  const repeatedAcross = detectCrossChapterRepeatedSentences(contentMarkdown, previousTexts, 30);

  if (repeatedInside.length > 0) {
    errors.push("REPEATED_SENTENCES_INSIDE_CHAPTER");
  }
  if (repeatedAcross.length > 0) {
    errors.push("REPEATED_SENTENCES_ACROSS_CHAPTERS");
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
      missingRequiredCoverageCount: missingRequiredCoverage.length,
      missingRequiredCoveragePreview: missingRequiredCoverage.slice(0, 10),
      repeatedInsideCount: repeatedInside.length,
      repeatedAcrossCount: repeatedAcross.length,
    },
  };
}

function formatTenGodEvidence(tenGods) {
  const map = tenGods && typeof tenGods === "object" ? tenGods.verifiedStemTenGodMap : null;
  if (!map || typeof map !== "object") return "미제공";
  const rows = Object.entries(map)
    .filter(([stem, god]) => toStringSafe(stem) && toStringSafe(god))
    .map(([stem, god]) => `${stem}:${god}`);
  return rows.length ? rows.join(", ") : "미제공";
}

function buildCoverageSectionBody(item, profileName, lifeBookInputData) {
  const chart = lifeBookInputData?.sajuChart || {};
  const elements = lifeBookInputData?.fiveElements || {};
  const yongshin = lifeBookInputData?.yongshin || {};
  const currentDaeun = Array.isArray(lifeBookInputData?.daeun) ? lifeBookInputData.daeun[0] : null;
  const currentYear = Array.isArray(lifeBookInputData?.yearlyFortune) ? lifeBookInputData.yearlyFortune[0] : null;

  const contextTokens = [
    `일간 ${toStringSafe(chart.dayMaster) || "미제공"}`,
    `월주 ${toStringSafe(chart.monthPillar) || "미제공"}`,
    `오행 분포(목${Number(elements.wood || 0)}/화${Number(elements.fire || 0)}/토${Number(elements.earth || 0)}/금${Number(elements.metal || 0)}/수${Number(elements.water || 0)})`,
    `용신 ${toStringSafe((yongshin.yongshin || []).join(", ")) || "미제공"}`,
    `현재 대운 ${currentDaeun ? toStringSafe(currentDaeun.pillar) || "미상" : "미제공"}`,
    `올해 세운 ${currentYear ? `${toStringSafe(currentYear.year) || "?"}년 ${toStringSafe(currentYear.pillar) || "미상"}` : "미제공"}`,
  ];

  return `${profileName}님의 ${contextTokens.join(" · ")}을(를) 근거로 ${item}을 상담형으로 구체화합니다. 이 항목은 해석에 그치지 않고 현실 선택 기준까지 연결해 실행 가능하게 정리합니다.`;
}

function buildChapterSpecificSections(chapterConfig, profileName, lifeBookInputData) {
  const pillars = lifeBookInputData?.sajuChart || {};
  const elements = lifeBookInputData?.fiveElements || {};
  const tenGodLine = formatTenGodEvidence(lifeBookInputData?.tenGods);
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toStringSafe(item)).filter(Boolean)
    : [];

  const common = [
    `## 핵심 진단\n${profileName}님의 사주에서 년주 ${toStringSafe(pillars.yearPillar) || "미제공"}, 월주 ${toStringSafe(pillars.monthPillar) || "미제공"}, 일주 ${toStringSafe(pillars.dayPillar) || "미제공"}, 일간 ${toStringSafe(pillars.dayMaster) || "미제공"}을 중심으로 해석합니다.`,
    `## 에너지 요약\n오행은 목 ${Number(elements.wood || 0)}, 화 ${Number(elements.fire || 0)}, 토 ${Number(elements.earth || 0)}, 금 ${Number(elements.metal || 0)}, 수 ${Number(elements.water || 0)}의 균형으로 나타나며, 십성 흐름은 ${tenGodLine}을 기준으로 읽을 수 있습니다.`,
  ];

  const sections = [
    `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n${profileName}님의 사주 데이터에서 우선 점검해야 할 구조를 정리합니다.`,
    ...common,
  ];

  if (requiredCoverage.length > 0) {
    requiredCoverage.forEach((item) => {
      sections.push(`### ${item}\n${buildCoverageSectionBody(item, profileName, lifeBookInputData)}`);
    });
  } else {
    sections.push("## 현실 적용\n핵심 데이터를 실제 일정과 선택 기준으로 연결하면 시행착오를 줄일 수 있습니다.");
    sections.push("## 실행 계획\n이번 주 바로 적용할 행동을 1~2개로 좁혀서 실행하세요.");
  }

  return sections;
}

export function createLifeBookFallbackChapter(chapterConfig, lifeBookInputData, reason = "") {
  const profileName = toStringSafe(lifeBookInputData?.userProfile?.name) || "사용자";
  const reasonLine = toStringSafe(reason);

  const sections = buildChapterSpecificSections(chapterConfig, profileName, lifeBookInputData);
  let contentMarkdown = sections.join("\n\n");
  let depth = 1;
  const desiredChars = Math.max(
    2500,
    Number(chapterConfig?.targetChars || 0),
    Number(chapterConfig?.minLength || 2500),
  );
  while (contentMarkdown.length < desiredChars) {
    contentMarkdown += `\n\n### 데이터 확장 기록 ${depth}\n`;
    contentMarkdown += "해당 구간은 누락될 수 있는 근거를 보완하기 위한 기록입니다. 실제 적용에서는 일정, 관계, 지출, 회복 순서로 우선순위를 재정렬하세요.\n\n";
    contentMarkdown += "실행 문장: 이번 주 핵심 결정 1건을 선택하고, 결과를 7일 후 같은 기준으로 재평가해 수정안을 반영하세요.";
    depth += 1;
  }

  return {
    id: chapterConfig.id,
    roman: chapterConfig.roman,
    title: chapterConfig.title,
    subtitle: chapterConfig.subtitle,
    contentMarkdown,
    summary: "제공된 사주 계산 데이터 기준으로 핵심 구조를 재정리하고, 바로 실행 가능한 선택 기준으로 마무리했습니다.",
    practicalAdvice: [
      "이번 주 핵심 목표를 1개만 정하고, 완료 기준을 먼저 숫자로 정의하세요.",
      "의사결정 전 손실 허용 범위를 설정한 뒤 실행 여부를 판단하세요.",
      "7일 단위 회고에서 실패 원인보다 다음 수정 행동 1개를 확정하세요.",
    ],
    warnings: reasonLine ? [reasonLine] : [],
  };
}
