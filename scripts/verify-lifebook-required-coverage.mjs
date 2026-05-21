import { LIFE_BOOK_CHAPTERS } from "../worker/lib/saju/life-book/chapterConfig.js";
import { validateLifeBookChapter } from "../worker/lib/saju/life-book/validateLifeBookChapter.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toText(value) {
  return String(value == null ? "" : value).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countLiteralOccurrences(source, token) {
  if (!token) return 0;
  const re = new RegExp(escapeRegExp(token), "g");
  const matches = String(source || "").match(re);
  return matches ? matches.length : 0;
}

function buildValidSampleResult(chapterConfig) {
  const requiredCoverage = Array.isArray(chapterConfig?.requiredCoverage)
    ? chapterConfig.requiredCoverage.map((item) => toText(item)).filter(Boolean)
    : [];

  const blocks = [
    `## ${toText(chapterConfig.roman)}. ${toText(chapterConfig.title)}`,
    `${toText(chapterConfig.title)} 챕터는 계산 데이터 기반의 실행 전략으로 구성합니다.`,
    "## 데이터 핵심 해석",
    "년주·월주·일주·시주와 오행, 십성 맥락을 연결해 핵심 패턴을 정리합니다.",
    "## 현실 적용 원칙",
    "관계·직업·재물·건강을 분리해 우선순위를 정하고 실행 순서를 명확히 둡니다.",
    "## 필수 작성 항목 반영",
  ];

  requiredCoverage.forEach((item, index) => {
    blocks.push(`### ${item}`);
    blocks.push(`${item} 항목은 ${index + 1}번 근거로 반영하며, 실제 선택 기준과 행동 지침으로 이어지게 정리합니다.`);
  });

  let seq = 1;
  while (blocks.join("\n\n").length < Math.max(2600, Number(chapterConfig?.minLength || 2500))) {
    blocks.push(`### 실행 확장 ${seq}`);
    blocks.push(`실행 확장 ${seq}에서는 사주 구조와 생활 루틴을 연결해 반복 실수 방지 규칙을 구체화합니다. ${seq}번째 점검 문장은 중복 방지를 위해 고유 번호를 유지합니다.`);
    seq += 1;
  }

  return {
    id: toText(chapterConfig.id),
    roman: toText(chapterConfig.roman),
    title: toText(chapterConfig.title),
    subtitle: toText(chapterConfig.subtitle),
    contentMarkdown: blocks.join("\n\n"),
    summary: `${toText(chapterConfig.title)}의 필수 항목을 모두 반영해 실행 기준을 확정했습니다.`,
    practicalAdvice: [
      "핵심 결정 1개를 먼저 고정하고 주간 단위로 결과를 기록하세요.",
      "사람·일·돈의 우선순위를 동시에 바꾸지 말고 순차적으로 조정하세요.",
      "과부하 신호가 보이면 즉시 회복 루틴을 실행해 손실을 차단하세요.",
    ],
    warnings: [],
  };
}

function pickLikelyUniqueCoverageItem(contentMarkdown, requiredCoverage) {
  let selected = "";
  for (const item of requiredCoverage) {
    const count = countLiteralOccurrences(contentMarkdown, item);
    if (count === 1) {
      selected = item;
      break;
    }
  }
  if (!selected) {
    selected = requiredCoverage.slice().sort((a, b) => b.length - a.length)[0] || "";
  }
  return selected;
}

function removeAllLiteral(source, token) {
  if (!token) return String(source || "");
  return String(source || "").replace(new RegExp(escapeRegExp(token), "g"), "");
}

function findActuallyDetectableMissingCase(validSample, chapter, requiredCoverage) {
  for (const item of requiredCoverage) {
    const candidate = {
      ...validSample,
      contentMarkdown: removeAllLiteral(validSample.contentMarkdown, item),
    };
    const check = validateLifeBookChapter(candidate, chapter, []);
    const hasMissing = Array.isArray(check.errors) && check.errors.includes("CHAPTER_REQUIRED_COVERAGE_MISSING");
    if (!check.ok && hasMissing) {
      return {
        removedItem: item,
        check,
      };
    }
  }
  return null;
}

function run() {
  const chapters = Array.isArray(LIFE_BOOK_CHAPTERS) ? LIFE_BOOK_CHAPTERS : [];
  assert(chapters.length === 13, `[lifebook-required-coverage] expected 13 chapters, got ${chapters.length}`);

  const reportRows = [];

  for (const chapter of chapters) {
    const chapterNo = Number(chapter?.number || 0);
    const chapterId = toText(chapter?.id);
    const requiredCoverage = Array.isArray(chapter?.requiredCoverage)
      ? chapter.requiredCoverage.map((item) => toText(item)).filter(Boolean)
      : [];

    assert(requiredCoverage.length > 0, `[lifebook-required-coverage] chapter ${chapterNo} (${chapterId}) has empty requiredCoverage`);

    const validSample = buildValidSampleResult(chapter);
    const validCheck = validateLifeBookChapter(validSample, chapter, []);
    const hasCoverageMissingInValid = Array.isArray(validCheck.errors)
      && validCheck.errors.includes("CHAPTER_REQUIRED_COVERAGE_MISSING");
    assert(
      Number(validCheck?.quality?.missingRequiredCoverageCount || 0) === 0,
      `[lifebook-required-coverage] chapter ${chapterNo} valid sample missing coverage count: ${validCheck?.quality?.missingRequiredCoverageCount}`,
    );
    assert(
      !hasCoverageMissingInValid,
      `[lifebook-required-coverage] chapter ${chapterNo} valid sample unexpectedly flagged missing coverage: ${JSON.stringify(validCheck.errors || [])}`,
    );

    const preferredItem = pickLikelyUniqueCoverageItem(validSample.contentMarkdown, requiredCoverage);
    const detectable = findActuallyDetectableMissingCase(validSample, chapter, [
      ...(preferredItem ? [preferredItem] : []),
      ...requiredCoverage.filter((item) => item !== preferredItem),
    ]);

    assert(
      detectable,
      `[lifebook-required-coverage] chapter ${chapterNo} missing-coverage detection failed for all required items`,
    );

    const removedItem = detectable.removedItem;
    const invalidCheck = detectable.check;
    const hasMissingError = Array.isArray(invalidCheck.errors) && invalidCheck.errors.includes("CHAPTER_REQUIRED_COVERAGE_MISSING");

    reportRows.push({
      chapter: chapterNo,
      id: chapterId,
      requiredCoverage: requiredCoverage.length,
      removedItem,
      missingDetected: hasMissingError,
    });
  }

  console.log("[lifebook-required-coverage] PASS");
  reportRows.forEach((row) => {
    console.log(
      `  - ch${String(row.chapter).padStart(2, "0")} ${row.id}: required=${row.requiredCoverage}, removed='${row.removedItem}', missingDetected=${row.missingDetected}`,
    );
  });
}

try {
  run();
} catch (error) {
  console.error("[lifebook-required-coverage] FAIL:", error?.message || error);
  process.exitCode = 1;
}
