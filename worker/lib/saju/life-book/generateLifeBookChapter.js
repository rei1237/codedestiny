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

function buildChapterJsonPayload(chapterConfig, parsedChapter, lifeBookInputData) {
  const chapterCore = lifeBookInputData?.lifeBookContext?.chapterCore || {};
  const sections = splitMarkdownSections(parsedChapter?.contentMarkdown || "");
  const keyInsights = toStringArray(parsedChapter?.keyInsights, [])
    .concat(toStringArray(parsedChapter?.warnings, []))
    .slice(0, 5);
  const practicalAdvice = toStringArray(parsedChapter?.practicalAdvice, []);
  const summary = toStringSafe(parsedChapter?.summary);

  return {
    id: toStringSafe(parsedChapter?.id) || toStringSafe(chapterConfig?.id),
    roman: toStringSafe(parsedChapter?.roman) || toStringSafe(chapterConfig?.roman),
    title: toStringSafe(parsedChapter?.title) || toStringSafe(chapterConfig?.title),
    subtitle: toStringSafe(parsedChapter?.subtitle) || toStringSafe(chapterConfig?.subtitle),
    summary,
    sections,
    keyInsights,
    practicalAdvice,
    cautions: toStringArray(parsedChapter?.warnings, []),
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
    "- 데이터가 부족한 항목은 단정하지 말고 해석 가능한 범위에서 작성한다.",
    "- 최종 문체는 프리미엄 상담 리포트 문체로 한다.",
    "",
    "[작성 규칙]",
    "- JSON 형식으로만 출력한다.",
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
    "- 금지 템플릿 문구(반복 패턴과 주의점/실전 행동 전략/심화 실행 노트/마무리 정리) 사용 금지",
    "- 본문에서 과도한 **강조 표기** 제거",
    requiredCoverage.length
      ? `\n[필수 작성 항목 재확인]\n${requiredCoverage.map((item) => `- ${item}`).join("\n")}`
      : "",
    "",
    "[이전 출력]",
    String(previousOutput || "").slice(0, 12000),
  ].join("\n");
}

export async function generateLifeBookChapter(params = {}) {
  const env = params.env || {};
  const chapterConfig = params.chapterConfig;
  const lifeBookInputData = params.lifeBookInputData || {};
  const strictMode = params.strictMode === true;
  const maxRetries = Math.max(0, Math.min(2, Number(params.maxRetries ?? 2)));
  const previousTexts = Array.isArray(params.previousTexts) ? params.previousTexts : [];
  const chapterMemories = Array.isArray(params.chapterMemories) ? params.chapterMemories : [];

  if (!chapterConfig || typeof chapterConfig !== "object") {
    return {
      ok: false,
      code: "LIFEBOOK_CHAPTER_CONFIG_INVALID",
      message: "챕터 설정이 유효하지 않습니다.",
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

  return {
    ok: false,
    code: "LIFEBOOK_CHAPTER_QUALITY_FAILED",
    message: `챕터 품질 검증 실패: ${chapterConfig.id}`,
    attempts,
    usedFallback: false,
    validation: lastValidation,
  };
}
