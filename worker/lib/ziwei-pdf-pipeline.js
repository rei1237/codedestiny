import {
  ZIWEI_BODY_PALACE_MEANINGS,
  ZIWEI_PALACE_MEANINGS,
  ZIWEI_PDF_CHAPTERS,
  ZIWEI_RELATIONSHIP_RULES,
  ZIWEI_STAR_STRENGTHS,
} from "./ziwei-pdf-knowledge-base.js";

const PALACE_ORDER = [
  "ming",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
];

const PALACE_KEY_MAP = Object.freeze({
  명궁: "ming",
  형제궁: "siblings",
  부처궁: "spouse",
  배우자궁: "spouse",
  자녀궁: "children",
  재백궁: "wealth",
  질액궁: "health",
  천이궁: "travel",
  노복궁: "friends",
  교우궁: "friends",
  관록궁: "career",
  전택궁: "property",
  복덕궁: "fortune",
  부모궁: "parents",
});

const STRENGTH_BY_SYMBOL = Object.freeze({
  "◎": "묘",
  "○": "왕",
  O: "왕",
  "▲": "리",
  "△": "평",
  "함": "함",
  "×": "함",
  X: "함",
});

const SYMBOL_BY_STRENGTH = Object.freeze({
  묘: "◎",
  왕: "○",
  리: "▲",
  평: "△",
  함: "×",
  미상: null,
});

function asText(value) {
  return String(value == null ? "" : value).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toPlainObject(value) {
  return value && typeof value === "object" ? value : {};
}

function normalizeStrengthSymbol(raw) {
  const token = asText(raw);
  if (!token) return null;
  if (token === "◎") return "◎";
  if (token === "O" || token === "○") return "○";
  if (token === "▲") return "▲";
  if (token === "△") return "△";
  if (token === "함" || token === "X" || token === "×") return "×";
  return null;
}

function normalizeStrengthName(raw) {
  const token = asText(raw);
  if (!token) return null;
  if (["묘", "廟", "묘왕", "묘왕지"].includes(token)) return "묘";
  if (["왕", "旺"].includes(token)) return "왕";
  if (["리", "利", "득", "득지", "리지", "약"].includes(token)) return "리";
  if (["평", "平", "평지"].includes(token)) return "평";
  if (["함", "陷", "함지", "극함", "심한함", "불", "불리"].includes(token)) return "함";
  return null;
}

function pickStrength(rawSymbol, rawStrength) {
  const symbol = normalizeStrengthSymbol(rawSymbol);
  const name = normalizeStrengthName(rawStrength);

  if (name && !symbol) {
    return {
      symbol: SYMBOL_BY_STRENGTH[name] || null,
      name,
      fallbackUsed: true,
    };
  }
  if (!name && symbol) {
    return {
      symbol,
      name: STRENGTH_BY_SYMBOL[symbol] || "미상",
      fallbackUsed: true,
    };
  }
  if (!name && !symbol) {
    return {
      symbol: null,
      name: "미상",
      fallbackUsed: true,
    };
  }
  return {
    symbol,
    name,
    fallbackUsed: false,
  };
}

function inferStarRole(name = "") {
  const token = asText(name);
  if (!token) return "unknown";
  if (["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"].includes(token)) {
    return "main";
  }
  if (["경양", "타라", "지공", "지겁"].includes(token)) return "malefic";
  if (["좌보", "우필", "문창", "문곡", "록존", "녹존"].includes(token)) return "helper";
  return "sub";
}

function strengthMeaning(name) {
  if (name === "미상") {
    return "별의 강약 데이터가 확인되지 않아, 별 자체의 기본 상징과 궁의 의미를 중심으로 해석합니다.";
  }
  const symbol = SYMBOL_BY_STRENGTH[name] || null;
  if (!symbol) return "강약 데이터가 제한적이어서 보수적으로 해석합니다.";
  return ZIWEI_STAR_STRENGTHS[symbol]?.meaning || "강약 데이터가 제한적이어서 보수적으로 해석합니다.";
}

function normalizeStar(star, roleHint = "unknown", fieldPath = "", missingSummary = []) {
  const source = toPlainObject(star);
  const name = asText(source.nameKo || source.name || source.star || source.title);
  if (!name) missingSummary.push(`${fieldPath}.name`);

  const picked = pickStrength(source.symbol, source.strength || source.brightness || source.brightnessKo);

  return {
    name: name || "미상별",
    strengthSymbol: picked.symbol,
    strengthName: picked.name,
    strengthMeaning: strengthMeaning(picked.name),
    role: roleHint !== "unknown" ? roleHint : inferStarRole(name),
    fallbackUsed: Boolean(!name || picked.fallbackUsed),
  };
}

function normalizeSihuaEntry(entry, fieldPath = "", missingSummary = []) {
  const source = toPlainObject(entry);
  const star = asText(source.star || source.name || source.starName);
  const type = asText(source.type || source.kind || source.label);
  if (!star) missingSummary.push(`${fieldPath}.star`);
  if (!type) missingSummary.push(`${fieldPath}.type`);
  return {
    star: star || "미상",
    type: type || "미상",
    meaning: type ? `${type} 작동` : "사화 데이터가 확인되지 않으므로 별의 기본 성질과 궁의 상호작용을 중심으로 해석합니다.",
  };
}

function resolvePalaceKey(rawKey, rawName, index) {
  const key = asText(rawKey);
  if (PALACE_ORDER.includes(key)) return key;
  const byName = PALACE_KEY_MAP[asText(rawName)] || "";
  if (byName) return byName;
  return PALACE_ORDER[index] || "";
}

function normalizePalace(sourcePalace, index, missingSummary) {
  const source = toPlainObject(sourcePalace);
  const key = resolvePalaceKey(source.key || source.palaceKey, source.nameKo || source.name || source.palaceName, index);
  const meaning = ZIWEI_PALACE_MEANINGS[key] || null;

  const branch = asText(source.branch || source.earthlyBranch);
  const missingFields = [];

  if (!branch) missingFields.push("branch");

  const mainSource = asArray(source.mainStars || source.stars);
  const auxSource = asArray(source.subStars || source.auxStars || source.auxiliaryStars || source.minorStars);
  const maleficSource = asArray(source.maleficStars);
  const sihuaSource = asArray(source.sihua || source.transformations || source.fourTransformations);

  if (!mainSource.length) missingFields.push("mainStars");
  if (!sihuaSource.length) missingFields.push("sihua");

  const mainStars = mainSource.map((star, idx) => normalizeStar(star, "main", `palaces.${key}.mainStars[${idx}]`, missingSummary));
  const subStars = auxSource
    .concat(maleficSource)
    .map((star, idx) => normalizeStar(star, idx < auxSource.length ? "sub" : "malefic", `palaces.${key}.subStars[${idx}]`, missingSummary));
  const sihua = sihuaSource.map((entry, idx) => normalizeSihuaEntry(entry, `palaces.${key}.sihua[${idx}]`, missingSummary));

  const oppositePalaceKey = asText(source.oppositePalaceKey);
  const trianglePalaceKeys = asArray(source.triadPalaceKeys || source.trianglePalaceKeys).map(asText).filter(Boolean);

  return {
    key,
    name: meaning?.name || asText(source.nameKo || source.name || source.palaceName) || "미상궁",
    branch: branch || null,
    description: meaning?.expanded || meaning?.meaning || "이 궁의 데이터가 부분적으로 누락되어 기본 궁 의미 중심으로 해석합니다.",
    mainStars,
    subStars,
    sihua,
    oppositePalaceKey: oppositePalaceKey || null,
    trianglePalaceKeys,
    fallbackUsed: missingFields.length > 0,
    missingFields,
  };
}

function palaceArrayFromRaw(rawChart) {
  const chart = toPlainObject(rawChart);
  if (Array.isArray(chart.palaces)) return chart.palaces;

  const palacesObj = toPlainObject(chart.palaces);
  const fromObject = PALACE_ORDER.map((key) => {
    const entry = toPlainObject(palacesObj[key]);
    return {
      ...entry,
      key,
      nameKo: entry.nameKo || ZIWEI_PALACE_MEANINGS[key]?.name || "",
      earthlyBranch: entry.earthlyBranch || entry.branch || "",
      transformations: entry.transformations || entry.fourTransformations || [],
    };
  });

  if (fromObject.some((entry) => Object.keys(entry).length > 1)) return fromObject;

  const sourcePayload = toPlainObject(chart.sourcePayload);
  const rows = asArray(sourcePayload.palaceStarData);
  if (!rows.length) return [];
  return rows.map((row, idx) => ({
    key: resolvePalaceKey("", row?.palace, idx),
    nameKo: asText(row?.palace),
    branch: asText(row?.branch),
    mainStars: asArray(row?.stars),
    auxStars: asArray(row?.auxStars),
    maleficStars: asArray(row?.badStars),
    transformations: [],
  }));
}

function findBodyPalaceKey(rawChart, normalizedPalaces) {
  const chart = toPlainObject(rawChart);
  const chartMeta = toPlainObject(chart.chartMeta);
  const bodyBranch = asText(chartMeta.shenGong || chartMeta.bodyPalace || chartMeta.bodyPalaceKey);
  if (!bodyBranch) return null;

  const found = normalizedPalaces.find((palace) => asText(palace.branch) === bodyBranch);
  return found?.key || null;
}

export function normalizeZiweiChartForPdf(rawChart = {}, userProfile = {}) {
  const missingSummary = [];
  const palacesRaw = palaceArrayFromRaw(rawChart);

  const normalizedPalaces = PALACE_ORDER.map((key, index) => {
    const source = palacesRaw.find((palace) => resolvePalaceKey(palace?.key || palace?.palaceKey, palace?.nameKo || palace?.name || palace?.palaceName || palace?.palace, index) === key) || { key };
    return normalizePalace(source, index, missingSummary);
  });

  const chart = toPlainObject(rawChart);
  const chartMeta = toPlainObject(chart.chartMeta);

  const mingPalaceKey = normalizedPalaces.find((palace) => Boolean(palace.branch && palace.branch === asText(chartMeta.mingGong)))?.key || "ming";
  const bodyPalaceKey = findBodyPalaceKey(rawChart, normalizedPalaces);

  if (!bodyPalaceKey) {
    missingSummary.push("bodyPalace");
  }

  const sourceLevel = missingSummary.length === 0
    ? "engine"
    : (missingSummary.length > 16 ? "fallback-heavy" : "engine-with-fallback");

  return {
    userProfile: {
      name: asText(userProfile.name || chart?.profile?.name) || undefined,
      gender: asText(userProfile.gender || chart?.profile?.gender) || undefined,
      birthDate: asText(userProfile.birthDate || chart?.profile?.birth?.solarDate) || undefined,
      birthTime: asText(userProfile.birthTime || chart?.profile?.birth?.time) || undefined,
      lunarDate: asText(userProfile.lunarDate || chart?.profile?.birth?.lunarDate) || undefined,
    },
    chartMeta: {
      命宮: ZIWEI_PALACE_MEANINGS[mingPalaceKey]?.name || "명궁",
      身宮: bodyPalaceKey ? (ZIWEI_PALACE_MEANINGS[bodyPalaceKey]?.name || bodyPalaceKey) : "미상",
      bodyPalaceKey,
      mingPalaceKey,
      generatedAt: new Date().toISOString(),
      source: sourceLevel,
    },
    palaces: normalizedPalaces,
    missingSummary: Array.from(new Set(missingSummary)),
    knowledgeBase: {
      palaceMeanings: ZIWEI_PALACE_MEANINGS,
      bodyPalaceMeanings: ZIWEI_BODY_PALACE_MEANINGS,
      starStrengths: ZIWEI_STAR_STRENGTHS,
      relationshipRules: ZIWEI_RELATIONSHIP_RULES,
    },
  };
}

export function validateZiweiPdfInput(context) {
  const warnings = [];
  const missingFields = Array.from(new Set(asArray(context?.missingSummary)));

  if (!Array.isArray(context?.palaces) || context.palaces.length !== 12) {
    warnings.push("12궁 데이터가 완전하지 않아 기본 해석 지식 베이스 기반 보완이 포함됩니다.");
  }

  if (!context?.chartMeta?.bodyPalaceKey) {
    warnings.push("신궁 데이터가 명확하지 않아 명궁-관록궁-재백궁-복덕궁 중심의 후천 운 해석으로 보완합니다.");
  }

  if (missingFields.length) {
    warnings.push("일부 세부 명반 데이터가 부족하여 기본 자미두수 해석 지식으로 보완됩니다.");
  }

  return {
    ok: true,
    canGeneratePdf: true,
    warnings,
    missingFields,
  };
}

export function buildZiweiPdfContext({ userProfile = {}, rawChart = {} } = {}) {
  const normalized = normalizeZiweiChartForPdf(rawChart, userProfile);
  const validation = validateZiweiPdfInput(normalized);
  return {
    ...normalized,
    validation,
  };
}

export function buildZiweiGeminiPrompt({ chapter, context }) {
  const chapterSpec = chapter || ZIWEI_PDF_CHAPTERS[0];

  const systemPrompt = [
    "너는 30년차 자미두수 전문가이자, 현대 독자가 이해하기 쉽게 운명의 구조를 서사적으로 풀어내는 프리미엄 운세 리포트 작가다.",
    "너의 임무는 제공된 자미두수 명반 JSON과 knowledgeBase를 바탕으로, 고급 PDF 리포트에 들어갈 장문 해석을 생성하는 것이다.",
    "중요 규칙:",
    "1. 계산은 하지 않는다. 제공된 명반 데이터와 knowledgeBase만 사용한다.",
    "2. 데이터가 부족한 항목은 부족하다고 명시하되, PDF 생성을 멈추지 않는다.",
    "3. palace.branch, mainStars, strength, sihua가 없더라도 해당 궁의 기본 의미와 주변 궁의 흐름을 바탕으로 해석한다.",
    "4. 허위로 별이나 지지를 만들어내지 않는다.",
    "5. 별 강약 기호가 있으면 반드시 그 기호의 의미를 해석에 반영한다.",
    "6. 문체는 신비롭고 고급스럽되, 실제 상담처럼 구체적이어야 한다.",
    "7. 추상적인 말만 반복하지 말고 성격, 연애, 재물, 직업, 인간관계, 삶의 방향으로 연결해 설명한다.",
    "8. 각 챕터는 충분히 길고 깊어야 한다.",
    "9. 독자가 내 명반을 실제로 읽어준다고 느낄 정도로 구체적으로 작성한다.",
    "10. 무조건 JSON 형식으로만 응답한다.",
    "11. 마크다운 코드블록, 표, 파이프(|) 테이블, 불릿/번호 목록, HTML 태그를 출력하지 않는다.",
    "12. chapterTitle/chapterSubtitle는 입력된 챕터 제목/의도를 따르고, 결론형 요약문 남발을 금지한다.",
    "13. 본 리포트는 13챕터 고정 체계이므로 챕터 번호 체계를 임의로 변경하지 않는다.",
  ].join("\n");

  const userPrompt = [
    "다음은 프리미엄 자미두수 PDF 생성을 위한 명반 데이터입니다.",
    "",
    "[사용자 정보]",
    JSON.stringify(context.userProfile || {}, null, 2),
    "",
    "[정규화된 자미두수 명반]",
    JSON.stringify({ chartMeta: context.chartMeta, palaces: context.palaces, missingSummary: context.missingSummary }, null, 2),
    "",
    "[자미두수 기본 해석 Knowledge Base]",
    JSON.stringify(context.knowledgeBase || {}, null, 2),
    "",
    "[작성할 챕터]",
    chapterSpec.title,
    "",
    "[챕터 작성 목표]",
    chapterSpec.goal,
    "",
    "[출력 형식]",
    "반드시 아래 JSON 형식으로만 응답하세요.",
    "{",
    '  "chapterTitle": "string",',
    '  "chapterSubtitle": "string",',
    '  "summary": "string",',
    '  "sections": [',
    '    { "heading": "string", "body": "string" }',
    "  ],",
    '  "practicalAdvice": ["string"],',
    '  "cautions": ["string"],',
    '  "missingDataNotice": "string | null"',
    "}",
    "",
    "[문체 기준]",
    "- 고급스럽고 서사적인 자미두수 문체를 사용하세요.",
    "- 별 강약 기호가 있으면 반드시 해석에 반영하세요.",
    "- 데이터가 없는 경우에는 기본 궁 의미와 knowledgeBase를 활용해 자연스럽게 보완하세요.",
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    prompt: `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`,
  };
}

function stripCodeFence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^```(?:json|JSON)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryParseJson(text) {
  const source = stripCodeFence(text);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (_) {
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const clipped = source.slice(first, last + 1);
      try {
        return JSON.parse(clipped);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

function repairJsonString(text) {
  const source = stripCodeFence(text);
  if (!source) return "";
  const clipped = (() => {
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) return source.slice(first, last + 1);
    return source;
  })();

  return clipped
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "    ");
}

export function parseZiweiGeminiResponse(rawText) {
  const parsed = tryParseJson(rawText);
  if (parsed) return { ok: true, data: parsed, repaired: false };

  const repairedText = repairJsonString(rawText);
  if (!repairedText) return { ok: false, data: null, repaired: false };

  try {
    return { ok: true, data: JSON.parse(repairedText), repaired: true };
  } catch (_) {
    return { ok: false, data: null, repaired: true };
  }
}

export function createFallbackChapter(chapter, context) {
  const spec = chapter || { title: "기본 챕터", goal: "기본 해석" };
  const missing = asArray(context?.missingSummary);
  return {
    chapterTitle: spec.title,
    chapterSubtitle: "기본 해석 기반 보완 챕터",
    summary: "해당 챕터의 세부 명반 데이터 일부가 확인되지 않아, 자미두수 기본 궁 의미와 제공된 명반 정보를 바탕으로 보완 해석을 제공합니다.",
    sections: [
      {
        heading: "기본 운명 구조",
        body: "이 영역은 세부 별 배치가 충분하지 않더라도 자미두수에서 중요한 의미를 갖습니다. 제공된 궁의 기본 의미와 전체 명반 흐름을 중심으로 해석합니다.",
      },
      {
        heading: "후천 보완 전략",
        body: "데이터가 부족할수록 단정형 예측보다 생활 리듬, 의사결정 기준, 관계 경계 설정처럼 실행 가능한 선택 원칙을 먼저 고정하는 것이 유리합니다.",
      },
    ],
    practicalAdvice: [
      "현재 확인 가능한 데이터와 기본 궁 의미를 기준으로 삶의 방향성을 점검하세요.",
      "감정 강도보다 실행 지속성을 우선하는 루틴을 선택하세요.",
    ],
    cautions: [
      "세부 별 강약이나 사화 데이터가 없는 경우 단정적인 길흉 판단은 피하는 것이 좋습니다.",
    ],
    missingDataNotice: missing.length
      ? `이 챕터는 일부 데이터 누락(${missing.slice(0, 5).join(", ")})으로 인해 기본 해석 기반으로 생성되었습니다.`
      : "이 챕터는 일부 데이터 누락으로 인해 기본 해석 기반으로 생성되었습니다.",
  };
}

export function sanitizeZiweiChapterJson(rawChapter, chapterSpec) {
  const chapter = toPlainObject(rawChapter);
  const sections = asArray(chapter.sections)
    .map((row) => ({
      heading: asText(row?.heading) || "핵심 해석",
      body: asText(row?.body),
    }))
    .filter((row) => row.body);

  const practicalAdvice = asArray(chapter.practicalAdvice).map(asText).filter(Boolean);
  const cautions = asArray(chapter.cautions).map(asText).filter(Boolean);

  return {
    chapterTitle: asText(chapter.chapterTitle) || chapterSpec?.title || "자미두수 해석",
    chapterSubtitle: asText(chapter.chapterSubtitle) || "심층 해석",
    summary: asText(chapter.summary) || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    sections,
    practicalAdvice,
    cautions,
    missingDataNotice: asText(chapter.missingDataNotice) || null,
  };
}

function buildStrengthTableMarkdown() {
  const rows = ["| 기호 | 명칭 | 의미 |", "|---|---|---|"];
  ["◎", "○", "▲", "△", "함"].forEach((symbol) => {
    const item = ZIWEI_STAR_STRENGTHS[symbol];
    if (!item) return;
    rows.push(`| ${symbol} | ${item.name}(${item.hanja}) | ${item.meaning} |`);
  });
  return rows.join("\n");
}

function buildPalaceMeaningMarkdown() {
  const rows = ["| 궁 | 한자 | 핵심 |", "|---|---|---|"];
  PALACE_ORDER.forEach((key) => {
    const meaning = ZIWEI_PALACE_MEANINGS[key];
    if (!meaning) return;
    rows.push(`| ${meaning.name} | ${meaning.hanja} | ${meaning.core} |`);
  });
  return rows.join("\n");
}

function buildKnowledgePrelude(context) {
  const bodyPalaceKey = context?.chartMeta?.bodyPalaceKey || "";
  const bodyText = bodyPalaceKey
    ? (ZIWEI_BODY_PALACE_MEANINGS[bodyPalaceKey] || ZIWEI_BODY_PALACE_MEANINGS.general)
    : "신궁 위치가 명확하지 않은 경우의 후천 운명 해석: 명궁-관록궁-재백궁-복덕궁 경향을 종합해 후천 방향성을 해석합니다.";

  return [
    "## 자미두수 기본 해석 가이드",
    "### 별 강약 기호표",
    buildStrengthTableMarkdown(),
    "### 12궁 기본 의미 요약",
    buildPalaceMeaningMarkdown(),
    "### 신궁 설명",
    bodyText,
    "### 삼방사정 설명",
    `- 대궁: ${ZIWEI_RELATIONSHIP_RULES.opposite}`,
    `- 합궁: ${ZIWEI_RELATIONSHIP_RULES.triangle}`,
    `- 삼방사정: ${ZIWEI_RELATIONSHIP_RULES.sanfangsazheng}`,
  ].join("\n\n");
}

export function buildZiweiChapterMarkdown(chapterJson, chapterSpec, context, includePrelude = false) {
  const chapter = sanitizeZiweiChapterJson(chapterJson, chapterSpec);
  const lines = [];

  if (includePrelude) {
    lines.push(buildKnowledgePrelude(context));
  }

  lines.push(`# ${chapter.chapterTitle}`);
  lines.push(`## ${chapter.chapterSubtitle}`);
  lines.push(chapter.summary);

  if (chapter.sections.length) {
    chapter.sections.forEach((section, index) => {
      lines.push(`### ${section.heading || `Section ${index + 1}`}`);
      if (section.body) lines.push(section.body);
    });
  }

  if (chapter.practicalAdvice.length) {
    lines.push("### 실천 조언");
    chapter.practicalAdvice.forEach((item) => lines.push(`- ${item}`));
  }

  if (chapter.cautions.length) {
    lines.push("### 주의점");
    chapter.cautions.forEach((item) => lines.push(`- ${item}`));
  }

  if (chapter.missingDataNotice) {
    lines.push("### 데이터 보완 안내");
    lines.push(`> ${chapter.missingDataNotice}`);
  }

  return lines.filter(Boolean).join("\n\n");
}

export function ensureZiweiChapterMarkdownLength(text, context, minLength = 5200) {
  let output = String(text || "").trim();
  const fallbackChunk = [
    "### 보완 해석 메모",
    "데이터가 일부 누락된 궁은 branch, mainStars, strength, sihua 유무를 분리해 해석의 확실성과 보완 범위를 명시합니다.",
    "명궁-관록궁-재백궁-천이궁의 흐름은 직업/재물/외부활동의 현실 축으로 연결되고, 복덕궁-질액궁은 회복력과 스트레스 관리 축으로 연결됩니다.",
    "허위 계산값을 생성하지 않고, 확인된 명반 데이터와 기본 궁 의미를 결합해 실행 가능한 조언으로 변환하는 것을 원칙으로 합니다.",
    context?.chartMeta?.bodyPalaceKey
      ? `신궁은 ${context.chartMeta.bodyPalaceKey} 축에서 후천 운명의 방향성을 보강합니다.`
      : "신궁 데이터가 없으므로 명궁-관록궁-재백궁-복덕궁 축으로 후천 방향성을 보강합니다.",
  ].join("\n\n");

  let guard = 0;
  while (output.length < minLength && guard < 12) {
    output = `${output}\n\n${fallbackChunk}`;
    guard += 1;
  }
  return output;
}

export { ZIWEI_PDF_CHAPTERS };
