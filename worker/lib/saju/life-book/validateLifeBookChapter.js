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

const CHAPTER_REQUIRED_KEYWORD_GROUPS = Object.freeze({
  "chapter-10-shadow-pattern": [
    ["약점", "취약"],
    ["극복", "보완"],
    ["원국", "일간", "오행", "십성"],
  ],
  "chapter-11-turning-points": [
    ["원국"],
    ["대운"],
    ["세운"],
  ],
  "chapter-12-life-strategy": [
    ["원국", "일간"],
    ["용신", "희신", "기신"],
    ["대운", "세운"],
  ],
  "chapter-13-final-letter": [
    ["원국", "일간"],
    ["용신", "희신", "기신"],
    ["십성", "대운", "세운"],
  ],
});

function hasKeywordByGroup(text, groups = []) {
  const source = String(text || "");
  return groups.every((group) => {
    return Array.isArray(group) && group.some((keyword) => source.includes(String(keyword)));
  });
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

  const chapterId = String(chapterConfig?.id || "");
  const requiredGroups = CHAPTER_REQUIRED_KEYWORD_GROUPS[chapterId] || [];
  if (requiredGroups.length && !hasKeywordByGroup(contentMarkdown, requiredGroups)) {
    errors.push("CHAPTER_REQUIRED_DATA_MISSING");
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

function buildChapterSpecificSections(chapterConfig, profileName, lifeBookInputData) {
  const pillars = lifeBookInputData?.sajuChart || {};
  const elements = lifeBookInputData?.fiveElements || {};
  const yongshin = lifeBookInputData?.yongshin || {};
  const daeun = Array.isArray(lifeBookInputData?.daeun) ? lifeBookInputData.daeun : [];
  const yearlyFortune = Array.isArray(lifeBookInputData?.yearlyFortune) ? lifeBookInputData.yearlyFortune : [];
  const tenGodLine = formatTenGodEvidence(lifeBookInputData?.tenGods);
  const currentDaeun = daeun[0] || null;
  const currentYear = yearlyFortune[0] || null;

  const common = [
    `## 데이터 근거 정리\n년주 ${toStringSafe(pillars.yearPillar) || "미제공"}, 월주 ${toStringSafe(pillars.monthPillar) || "미제공"}, 일주 ${toStringSafe(pillars.dayPillar) || "미제공"}, 시주 ${toStringSafe(pillars.hourPillar) || "미제공"}, 일간 ${toStringSafe(pillars.dayMaster) || "미제공"}를 기준으로 해석합니다.`,
    `## 오행과 십성 핵심\n오행 분포는 목 ${Number(elements.wood || 0)}, 화 ${Number(elements.fire || 0)}, 토 ${Number(elements.earth || 0)}, 금 ${Number(elements.metal || 0)}, 수 ${Number(elements.water || 0)}이며, 십성 기준표는 ${tenGodLine}입니다.`,
  ];

  if (chapterConfig?.id === "chapter-10-shadow-pattern") {
    return [
      `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n${profileName}님의 약점은 성향 자체보다 특정 상황에서 나타나는 반응 순서에 있습니다. 일간과 월지 기준으로 취약한 조건을 먼저 정의해야 극복 전략이 작동합니다.`,
      ...common,
      "## 취약 지점 분석\n반응이 과열되거나 위축되는 장면을 관계/일/재정으로 나눠 기록하면 약점의 원인을 분리할 수 있습니다. 데이터상 강한 십성과 약한 오행의 충돌 구간을 우선 관리하세요.",
      "## 극복 설계\n극복은 의지 강화보다 환경 재설계가 우선입니다. 일정/관계/지출 결정을 하루 단위가 아니라 주 단위 기준으로 통합하면 재발 빈도를 줄일 수 있습니다.",
      "## 실행 체크포인트\n이번 주 3개 장면을 선정해 트리거-반응-결과를 기록하고, 다음 선택에서 대체 반응 1개를 반드시 실행하세요.",
    ];
  }

  if (chapterConfig?.id === "chapter-11-turning-points") {
    return [
      `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n이 장은 원국의 기본 축과 대운·세운의 변화가 만나는 지점을 읽어 전환점의 의미를 정리합니다.`,
      ...common,
      `## 대운 해석\n현재 대운은 ${currentDaeun ? `${toStringSafe(currentDaeun.pillar) || "미상"} (${toStringSafe(currentDaeun.ageStart) || "?"}~${toStringSafe(currentDaeun.ageEnd) || "?"})` : "미제공"}이며, 원국의 강점/취약점과 결합해 확장 구간과 조정 구간을 분리해야 합니다.`,
      `## 세운 해석\n세운 정보는 ${currentYear ? `${toStringSafe(currentYear.year) || "?"}년 ${toStringSafe(currentYear.pillar) || "미상"}` : "미제공"}이며, 대운 방향과 같은 결일 때는 가속, 반대 결일 때는 속도 조절이 필요합니다.`,
      "## 전환점 의사결정 기준\n기회 구간에서는 선택을 좁히고, 경계 구간에서는 손실 한도를 먼저 고정하세요. 전환기는 확장보다 구조 재정렬의 효율이 높습니다.",
    ];
  }

  if (chapterConfig?.id === "chapter-12-life-strategy") {
    return [
      `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n원국·용신·십성·대운·세운을 통합해 실행 우선순위를 설정합니다.`,
      ...common,
      `## 용신 기반 우선순위\n용신 ${toStringSafe((yongshin.yongshin || []).join(", ")) || "미제공"}, 희신 ${toStringSafe((yongshin.heeshin || []).join(", ")) || "미제공"}, 기신 ${toStringSafe((yongshin.gishin || []).join(", ")) || "미제공"}을 기준으로 환경 선택을 정리합니다.`,
      "## 30일 실행안\n직업/돈/관계/건강 항목별로 실행 과제 1개씩만 고정하고, 완료 여부를 주 단위로 점검하세요.",
      "## 90일 확장안\n30일 결과를 바탕으로 성과가 확인된 항목만 확장하고, 미확인 항목은 유지 또는 축소 전략을 적용하세요.",
    ];
  }

  if (chapterConfig?.id === "chapter-13-final-letter") {
    return [
      `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n최종 장은 감성 문구가 아니라 데이터 근거를 다시 확인해 장기 선택 원칙을 확정하는 단계입니다.`,
      ...common,
      "## 장기 원칙 선언\n일간 강점, 십성 역할, 용신 방향을 기준으로 절대 지킬 원칙 3가지를 문장으로 명시하세요.",
      "## 리스크 경계선\n대운/세운이 충돌하는 시기에는 속도보다 안정성을 우선하고, 손실 허용 범위를 숫자로 고정하세요.",
      "## 최종 실행 서약\n다음 12주 동안 유지할 행동 3개와 중단할 행동 3개를 확정해 일관성을 확보하세요.",
    ];
  }

  return [
    `## ${chapterConfig.roman}. ${chapterConfig.title} 핵심 진단\n${profileName}님의 사주 데이터에서 우선 점검해야 할 구조를 정리합니다.`,
    ...common,
    "## 현실 적용\n핵심 데이터를 실제 일정과 선택 기준으로 연결하면 시행착오를 줄일 수 있습니다.",
    "## 실행 계획\n이번 주 바로 적용할 행동을 1~2개로 좁혀서 실행하세요.",
  ];
}

export function createLifeBookFallbackChapter(chapterConfig, lifeBookInputData, reason = "") {
  const profileName = toStringSafe(lifeBookInputData?.userProfile?.name) || "사용자";
  const reasonLine = toStringSafe(reason);

  const sections = buildChapterSpecificSections(chapterConfig, profileName, lifeBookInputData);
  let contentMarkdown = sections.join("\n\n");
  let depth = 1;
  while (contentMarkdown.length < Math.max(2500, Number(chapterConfig?.minLength || 2500))) {
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
