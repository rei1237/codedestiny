import { geminiLifeBookClient } from "./geminiLifeBookClient.js";
import {
  createLifeBookFallbackChapter,
  parseLifeBookChapterResponse,
  validateLifeBookChapter,
} from "./validateLifeBookChapter.js";

const SYSTEM_INSTRUCTION = [
  "당신은 30년 경력의 명리학자이자 프리미엄 사주 리포트 작가입니다.",
  "당신의 역할은 주어진 사주 계산 데이터만을 근거로, 프리미엄 PDF 리포트에 들어갈 깊이 있는 해석문을 작성하는 것입니다.",
  "",
  "중요 규칙:",
  "- 사주 계산을 새로 하지 마세요.",
  "- 제공된 데이터에 없는 간지, 오행, 대운, 세운을 임의로 만들어내지 마세요.",
  "- 부족한 데이터가 있으면 \"제공된 계산값 기준으로 볼 때\"라고 표현하세요.",
  "- 단정적인 저주, 불안 조장, 질병 진단, 사망 예언, 극단적 표현은 금지합니다.",
  "- 건강 파트는 의학적 진단이 아니라 생활 에너지와 회복 전략으로 작성하세요.",
  "- 사용자를 겁주는 문장보다 현실적인 조언을 중심으로 작성하세요.",
  "- 문체는 고급스럽고 따뜻하며, 깊이 있는 사주 상담 리포트처럼 작성하세요.",
  "- 너무 짧은 일반론을 쓰지 말고, 반드시 사용자의 사주 데이터와 연결해서 설명하세요.",
  "- 각 챕터는 소제목을 포함해 구조적으로 작성하세요.",
  "- 시스템 지침 문장, 규칙 문장, 프롬프트 문장을 본문에 출력하지 마세요.",
  "- 동일 문장이나 단락을 반복해 분량을 채우지 마세요.",
  "- '반복 패턴과 주의점', '실전 행동 전략', '심화 실행 노트', '마무리 정리' 같은 템플릿 제목을 사용하지 마세요.",
  "- 본문에서 **강조 마크다운 표기(**text**)를 남발하지 말고 읽기 쉬운 일반 문장으로 작성하세요.",
].join("\n");

function buildChapterHardRequirements(chapterConfig, lifeBookInputData) {
  const id = String(chapterConfig?.id || "");
  const chapterNo = Number(chapterConfig?.number || 0);
  const profileName = String(lifeBookInputData?.userProfile?.name || "").trim();
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const lines = [
    "- 본문은 제공된 userProfile.name을 그대로 사용하세요(별칭/가명 금지).",
    "- 십성은 tenGods.verifiedStemTenGodMap 및 tenGods.verifiedByOccurrence 값만 기준으로 해석하세요.",
  ];

  if (profileName) {
    lines.push(`- 사용자 이름 표기는 '${profileName}' 그대로 유지하고, 'Test User' 또는 임의 이름으로 바꾸지 마세요.`);
  }

  if (requiredCoverage.length > 0) {
    lines.push("- 아래 [필수 작성 항목]의 각 문구를 소제목(###) 또는 본문 첫 문장으로 반드시 1회 이상 포함하세요.");
    lines.push("- 항목 누락 시 재생성 대상입니다.");
  }

  if (id === "chapter-06-yongshin-heeshin-gishin" || chapterNo === 6) {
    lines.push("- 챕터 6은 용신 판단 근거를 조후용신/억부용신/통관용신 관점으로 비교해 명시하세요.");
  }

  if (id === "chapter-10-health-energy" || chapterNo === 10) {
    lines.push("- 챕터 10은 의학적 진단처럼 단정하지 말고 생활 리듬 조언 중심으로 작성하세요.");
  }

  if (id === "chapter-11-daeun-analysis" || chapterNo === 11) {
    lines.push("- 챕터 11은 현재 대운/다음 대운/초년·청년기 흐름을 분리해 작성하세요.");
  }

  if (id === "chapter-12-seun-monthly-roadmap" || chapterNo === 12) {
    lines.push("- 챕터 12는 분기별 전략과 월별 Go/Hold/Retreat를 반드시 포함하세요.");
  }

  if (id === "chapter-13-master-plan" || chapterNo === 13) {
    lines.push("- 챕터 13은 5개 전략 묶음(핵심 패턴/성공/관계)을 구조적으로 분리해 최종 메시지로 마무리하세요.");
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

function buildChapterPrompt(chapterConfig, lifeBookInputData, previousTexts = []) {
  const safeInputJson = JSON.stringify(lifeBookInputData || {}, null, 2);
  const banList = collectPreviousSentenceBanList(previousTexts, 15);
  const hardRequirements = buildChapterHardRequirements(chapterConfig, lifeBookInputData);
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return [
    SYSTEM_INSTRUCTION,
    "",
    `아래 사용자의 사주 계산 데이터를 근거로 \"${chapterConfig.roman}. ${chapterConfig.title}\" 챕터를 작성하세요.`,
    "",
    "[챕터 목표]",
    chapterConfig.promptGuide,
    "",
    "[작성 규칙]",
    "- 제공된 사주 데이터만 사용하세요.",
    "- 없는 정보를 임의로 만들지 마세요.",
    "- 계산을 새로 하지 마세요.",
    `- 최소 ${chapterConfig.minLength}자 이상 작성하세요.`,
    "- 최소 5개 이상의 소제목을 포함하세요.",
    "- 사용자의 사주 구조와 연결된 구체적인 해석을 작성하세요.",
    "- 마지막에는 \"핵심 요약\"과 \"실전 조언\"을 포함하세요.",
    "- JSON 형식으로만 출력하세요.",
    "- 본문(contentMarkdown) 안에 [필수 작성 항목] 문구를 빠짐없이 포함하세요.",
    ...hardRequirements,
    requiredCoverage.length
      ? `\n[필수 작성 항목]\n${requiredCoverage.map((item) => `- ${item}`).join("\n")}`
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
    "  \"practicalAdvice\": [\"실전 조언 1\", \"실전 조언 2\", \"실전 조언 3\"],",
    "  \"warnings\": [\"주의점 1\", \"주의점 2\"]",
    "}",
    "",
    "[사주 계산 데이터]",
    safeInputJson,
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
        ? buildChapterPrompt(chapterConfig, lifeBookInputData, previousTexts)
        : buildRepairPrompt(chapterConfig, lastRawText, lastValidation.errors);

      const generated = await geminiLifeBookClient(env, prompt, {
        requestId: `${chapterConfig.id}:${Date.now()}:attempt-${attempts}`,
      });

      lastRawText = generated.text;

      const parsed = parseLifeBookChapterResponse(lastRawText, chapterConfig);
      const validation = validateLifeBookChapter(parsed, chapterConfig, previousTexts);
      lastValidation = validation;

      if (validation.ok) {
        return {
          ok: true,
          chapterResult: {
            ...parsed,
            warnings: [
              ...(Array.isArray(parsed.warnings) ? parsed.warnings : []),
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

  if (strictMode) {
    return {
      ok: false,
      code: "LIFEBOOK_CHAPTER_GENERATION_FAILED",
      message: `챕터 생성/검증 실패: ${chapterConfig.id}`,
      attempts,
      validation: lastValidation,
    };
  }

  const fallback = createLifeBookFallbackChapter(
    chapterConfig,
    lifeBookInputData,
    `fallback-used:${chapterConfig.id}:${(lastValidation.errors || []).join("|")}`,
  );

  return {
    ok: true,
    chapterResult: fallback,
    attempts,
    usedFallback: true,
    validation: {
      ok: true,
      errors: [],
      warnings: ["FALLBACK_CHAPTER_APPLIED", ...(lastValidation.errors || [])],
      quality: {
        length: String(fallback.contentMarkdown || "").length,
        minLength: chapterConfig.minLength,
      },
    },
  };
}
