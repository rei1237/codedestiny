/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

let route;
let utils;

function read(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function makeProfile() {
  return {
    name: "홍길동",
    gender: "male",
    calendarType: "solar",
    year: 1991,
    month: 2,
    day: 20,
    hour: 7,
    minute: 30,
    timeKnown: true,
    birthplace: "대한민국",
    birthIso: "1991-02-20 07:30",
  };
}

function makeSignals() {
  return {
    dayMaster: "갑",
    yearStem: "신",
    monthStem: "경",
    hourStem: "을",
    yearBranch: "미",
    monthBranch: "인",
    dayBranch: "자",
    hourBranch: "사",
    useful: "목",
    support: "화",
    caution: "수",
    dominantElement: "목",
    weakestElement: "수",
    powerLabel: "중화",
    currentDaewun: "경신",
    nextDaewun: "신유",
    currentYearPillar: "을사",
    geokguk: "갑인 구조",
    relationshipFocus: "자 중심 관계 리듬",
    spouseSignal: "배우자 감각은 신뢰를 기준으로 작동합니다.",
    wealthSignal: "수익은 반복 가능한 구조에서 안정됩니다.",
    careerSignal: "전문성 누적이 직업 성과를 키웁니다.",
    talentSignal: "재능은 목 기운과 맞물릴 때 선명해집니다.",
    timing: { current: "경신", next: "신유", year: 2026, yearPillar: "을사" },
    twelveGrowthStages: [
      { pillar: "year", stage: "관대" },
      { pillar: "month", stage: "건록" },
      { pillar: "day", stage: "제왕" },
    ],
    specialStars: ["도화", "화개"],
    weakSignals: ["수 기운 과속", "휴식 부족"],
    topTenGod: "정관",
  };
}

function cloneChapters(chapters) {
  return JSON.parse(JSON.stringify(chapters));
}

beforeAll(async () => {
  route = await import("../../worker/routes/saju-lifebook.js");
  utils = route.__lifeBookTestUtils;
});

describe("saju lifebook soft quality gate pipeline", () => {
  test("13장 78카테고리 구조를 기본 생성한다", () => {
    const chapters = utils.buildLifeBookChapters(makeProfile(), makeSignals());
    const chapterCount = chapters.length;
    const categoryCount = chapters.reduce((acc, chapter) => acc + (Array.isArray(chapter.categories) ? chapter.categories.length : 0), 0);

    expect(chapterCount).toBe(13);
    expect(categoryCount).toBe(78);

    const structure = utils.validateLifeBookStructure(chapters);
    expect(structure.ok).toBe(true);
    expect(structure.blockingErrors).toHaveLength(0);
  });

  test("카테고리가 700자 미만이어도 보정 후 finalize는 완료된다", () => {
    const chapters = cloneChapters(utils.buildLifeBookChapters(makeProfile(), makeSignals()));
    chapters[0].categories[0].finalText = "짧은 문장입니다.";
    chapters[0].categories[0].localSummary = "짧은 문장입니다.";

    const result = utils.finalizeLifeBookManuscript(makeProfile(), makeSignals(), chapters, { maxRounds: 3 });
    const structure = utils.validateLifeBookStructure(result.chapters);

    expect(structure.ok).toBe(true);
    expect(result.chapters).toHaveLength(13);
    expect(result.chapters[0].categories[0].finalText.length).toBeGreaterThanOrEqual(utils.LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS);
  });

  test("practical_action_missing, warm_ending_missing 경고가 있어도 finalize는 중단되지 않는다", () => {
    const chapters = cloneChapters(utils.buildLifeBookChapters(makeProfile(), makeSignals()));
    const flatText = "명식 해석을 중심으로 흐름을 설명합니다. 방향성과 맥락을 정리합니다. 반복 설명만 이어집니다.";
    chapters[1].categories[2].finalText = flatText;
    chapters[1].categories[2].localSummary = flatText;

    const pre = utils.evaluateLifeBookQuality(chapters);
    expect(pre.softWarnings.some((code) => code.includes("practical_action_missing"))).toBe(true);
    expect(pre.softWarnings.some((code) => code.includes("warm_ending_missing"))).toBe(true);

    const result = utils.finalizeLifeBookManuscript(makeProfile(), makeSignals(), chapters, { maxRounds: 3 });
    const structure = utils.validateLifeBookStructure(result.chapters);

    expect(structure.ok).toBe(true);
    expect(result.qualityScore).toBeGreaterThan(0);
  });

  test("repetition_detected가 있어도 구조 정상 시 생성 파이프라인은 유지된다", () => {
    const chapters = cloneChapters(utils.buildLifeBookChapters(makeProfile(), makeSignals()));
    const repeated = "반복 패턴 경고를 의도적으로 만들기 위해 동일한 긴 문단을 여러 카테고리에 그대로 복제합니다. 이 문장은 길이를 충분히 유지하고 같은 표현을 계속 사용하여 반복 탐지기에 명확히 포착되도록 설계합니다.";
    chapters.forEach((chapter) => {
      chapter.categories.forEach((category) => {
        category.finalText = repeated;
        category.localSummary = repeated;
      });
      chapter.finalText = repeated;
      chapter.text = repeated;
    });

    const pre = utils.evaluateLifeBookQuality(chapters);
    expect(Number(pre.repetition?.score || 0)).toBeGreaterThan(0);

    const result = utils.finalizeLifeBookManuscript(makeProfile(), makeSignals(), chapters, { maxRounds: 3 });
    expect(utils.validateLifeBookStructure(result.chapters).ok).toBe(true);
  });

  test("금지어는 본문에서 제거되고 PDF HTML 페이로드를 생성할 수 있다", () => {
    const chapters = cloneChapters(utils.buildLifeBookChapters(makeProfile(), makeSignals()));
    chapters[2].categories[1].finalText = "이 문장은 local engine payload json validation retry fallback 문구를 포함합니다.";
    chapters[2].categories[1].localSummary = chapters[2].categories[1].finalText;

    const finalized = utils.finalizeLifeBookManuscript(makeProfile(), makeSignals(), chapters, { maxRounds: 3 });
    const cleaned = finalized.chapters[2].categories[1].finalText.toLowerCase();

    expect(cleaned.includes("payload")).toBe(false);
    expect(cleaned.includes("json")).toBe(false);
    expect(cleaned.includes("fallback")).toBe(false);

    const html = utils.buildLifeBookDocument({
      profile: makeProfile(),
      signals: makeSignals(),
      chapters: finalized.chapters,
      generatedAt: new Date().toISOString(),
    });
    const payload = utils.buildPdfReadyPayload(makeProfile(), finalized.chapters, {
      pdfHtml: html,
      reportType: "lifeBook",
    });

    expect(typeof payload.html).toBe("string");
    expect(payload.html.length).toBeGreaterThan(1000);
  });

  test("라우트 소스는 FINAL_MANUSCRIPT_INVALID 중단 없이 archive URL과 complete execution 저장 경로를 유지한다", () => {
    const source = read("worker/routes/saju-lifebook.js");
    expect(source.includes("FINAL_MANUSCRIPT_INVALID")).toBe(false);
    expect(source.includes("/api/premium/pdf-archive/${encodeURIComponent(reportId)}")).toBe(true);
    expect(source.includes("await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId")).toBe(true);
    expect(source.includes("LIFEBOOK_STRUCTURE_INVALID")).toBe(true);
    expect(source.includes("LifeBookArchiveSaved")).toBe(true);
  });
});
