/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

let lifebook;
let lbState;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadEsmModuleFromFile(absPath) {
  const code = fs.readFileSync(absPath, "utf8");
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    URL,
    Date,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Math,
    RegExp,
  });

  const mod = new vm.SourceTextModule(code, {
    context,
    identifier: absPath,
  });

  await mod.link(async () => {
    throw new Error("Unexpected import in test target module: " + absPath);
  });
  await mod.evaluate();
  return mod.namespace;
}

function makeCanonicalInput(overrides = {}) {
  return {
    canonicalSajuChart: {
      profile: {
        name: "테스터",
        gender: "F",
        birth: {
          solarDate: "1992-06-15",
          time: "12:30",
          timezone: "Asia/Seoul",
          locationName: "서울",
        },
      },
      fourPillars: {
        year: { stem: "壬", branch: "申", ganji: "壬申", stemElement: "수", branchElement: "금" },
        month: { stem: "丙", branch: "午", ganji: "丙午", stemElement: "화", branchElement: "화" },
        day: { stem: "甲", branch: "子", ganji: "甲子", stemElement: "목", branchElement: "수" },
        hour: { stem: "辛", branch: "酉", ganji: "辛酉", stemElement: "금", branchElement: "금" },
      },
      dayMaster: {
        stem: "甲",
        element: "목",
        strength: "중화",
      },
      fiveElements: {
        wood: 2,
        fire: 3,
        earth: 1,
        metal: 2,
        water: 2,
        dominant: "fire",
        weakest: "earth",
      },
      tenGods: {
        distribution: {
          비견: 1,
          식신: 2,
          정관: 1,
          편인: 1,
        },
      },
      usefulGods: {
        yongsin: { element: "목" },
        huisin: { element: "화" },
        gisin: { element: "금" },
      },
      relations: {
        clashes: [{ pair: "子午" }],
      },
      specialStars: [{ name: "천을귀인" }],
      twelveStages: [{ pillar: "day", stage: "제왕" }],
      luckCycles: {
        direction: "forward",
        startAge: 7,
        currentDaewoon: {
          ganji: "庚辰",
          stem: "庚",
          branch: "辰",
        },
        daewoonList: [{ ganji: "庚辰", ageRange: "37~46" }],
      },
      annualLuck: {
        year: 2026,
        ganji: "丙午",
      },
      lifeThemes: {
        career: {},
        wealth: {},
      },
    },
    ...overrides,
  };
}

function makeCanonical(overrides = {}) {
  return lifebook.buildCanonicalSajuChart(makeCanonicalInput(overrides));
}

beforeAll(async () => {
  lifebook = await loadEsmModuleFromFile(path.resolve(__dirname, "../../app/_lib/lifebook/canonical.js"));
  lbState = await loadEsmModuleFromFile(path.resolve(__dirname, "../../app/_lib/lifebook/state.js"));
});

describe("LifeBook Strict Tests (A~N)", () => {
  test("A. 유효한 canonical 사주 데이터는 validation 통과", () => {
    const canonical = makeCanonical();
    const result = lifebook.validateCanonicalSajuChart(canonical);

    expect(result.isValid).toBe(true);
    expect(result.missingFields.length).toBe(0);
  });

  test("B. 4주 중 하나가 비면 validation 실패", () => {
    const canonical = makeCanonical();
    canonical.fourPillars.day.stem = "";

    const result = lifebook.validateCanonicalSajuChart(canonical);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("fourPillars.day");
  });

  test("C. 용신/희신/기신이 비면 validation 실패", () => {
    const canonical = makeCanonical();
    canonical.usefulGods.yongsin.element = "";
    canonical.usefulGods.huisin.element = "";
    canonical.usefulGods.gisin.element = "";

    const result = lifebook.validateCanonicalSajuChart(canonical);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("usefulGods.yongsin.element");
    expect(result.missingFields).toContain("usefulGods.huisin.element");
    expect(result.missingFields).toContain("usefulGods.gisin.element");
  });

  test("D. usefulGods가 없으면 3장(ch3) plan은 비활성화", () => {
    const canonical = makeCanonical();
    canonical.usefulGods.yongsin.element = "";
    canonical.usefulGods.huisin.element = "";
    canonical.usefulGods.gisin.element = "";

    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch3 = plan.find((p) => p.id === 3);

    expect(ch3.enabled).toBe(false);
    expect(ch3.reason).toBe("usefulGods.missing");
  });

  test("E. currentDaewoon이 없으면 4장(ch4) plan은 비활성화", () => {
    const canonical = makeCanonical();
    canonical.luckCycles.currentDaewoon = null;

    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch4 = plan.find((p) => p.id === 4);

    expect(ch4.enabled).toBe(false);
    expect(ch4.reason).toBe("luckCycles.currentDaewoon.missing");
  });

  test("F. annualLuck가 없으면 11장(ch11) plan은 비활성화", () => {
    const canonical = makeCanonical();
    canonical.annualLuck.year = 0;
    canonical.annualLuck.ganji = "";

    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch11 = plan.find((p) => p.id === 11);

    expect(ch11.enabled).toBe(false);
    expect(ch11.reason).toBe("annualLuck.missing");
  });

  test("G. specialStars/twelveStages 모두 없으면 10장은 reduced 모드", () => {
    const canonical = makeCanonical();
    canonical.specialStars = [];
    canonical.twelveStages = [];

    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch10 = plan.find((p) => p.id === 10);

    expect(ch10.enabled).toBe(true);
    expect(ch10.mode).toBe("reduced");
  });

  test("H. 이전 챕터 문장의 핵심 문구가 금지 반복 목록에 포함", () => {
    const canonical = makeCanonical();
    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch1 = plan.find((p) => p.id === 1);

    const prev = [
      "이 문장은 충분히 길어서 금지 반복 목록 후보로 들어갈 수 있어야 합니다 그리고 실제로 25자 이상입니다.",
    ];

    const payload = lifebook.buildChapterPromptPayload(ch1, canonical, prev);
    const hasPrev = payload.forbiddenRepeatedPhrases.some((s) => String(s).includes("금지 반복 목록 후보"));

    expect(hasPrev).toBe(true);
  });

  test("I. 동일한 30자 이상 문장 반복은 탐지", () => {
    const repeated = "원국의 합충형파해를 근거로 같은 행동 패턴을 반복하는 구간을 명확히 구분해야 합니다";
    const text = `${repeated}.\n다른 문장.\n${repeated}.`;

    const hits = lifebook.detectRepeatedLongSentences(text, 30);
    expect(hits.length).toBeGreaterThan(0);
  });

  test("J. 금지 문구 포함 본문은 품질 검증 실패", () => {
    const canonical = makeCanonical();
    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch1 = plan.find((p) => p.id === 1);
    const payload = lifebook.buildChapterPromptPayload(ch1, canonical, []);

    const text = "실행 가이드는 거창할수록 실패합니다.\n원국은 甲子이며 대운은 庚辰입니다.";
    const result = lifebook.validateGeneratedChapterText(text, payload, canonical);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("금지 문구"))).toBe(true);
  });

  test("K. 사주 근거 토큰이 5개 미만이면 품질 검증 실패", () => {
    const canonical = makeCanonical();
    const plan = lifebook.buildLifebookChapterPlan(canonical);
    const ch1 = plan.find((p) => p.id === 1);
    const payload = lifebook.buildChapterPromptPayload(ch1, canonical, []);

    const weakText = "당신은 소중한 사람이며 이번 달은 안정적으로 보냅니다.";
    const result = lifebook.validateGeneratedChapterText(weakText, payload, canonical);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("사주 근거 데이터 부족"))).toBe(true);
  });

  test("L. withSummaryTable은 요약표를 앞에 붙이고 중복 삽입하지 않음", () => {
    const canonical = makeCanonical();
    const body = "## 핵심 결론\n甲子 일주와 庚辰 대운의 상호작용을 설명합니다.";

    const once = lifebook.withSummaryTable(body, canonical);
    const twice = lifebook.withSummaryTable(once, canonical);

    expect(once.startsWith("1. 사용 데이터 요약표")).toBe(true);
    expect(twice).toBe(once);
  });

  test("M. resetSajuLifeBookState는 입력 보존 옵션을 지키고 생성 상태는 초기화", () => {
    const initial = lbState.createInitialSajuLifeBookState();
    initial.formInput = {
      name: "홍길동",
      gender: "M",
      birth: { solarDate: "1990-01-01", time: "11:00", timezone: "Asia/Seoul", locationName: "서울" },
    };
    initial.generationStatus = lbState.LIFEBOOK_FLOW_STATES.GENERATING_PDF;
    initial.isGenerating = true;
    initial.error = "old error";

    const next = lbState.resetSajuLifeBookState(initial, { keepFormInput: true });

    expect(next.formInput.name).toBe("홍길동");
    expect(next.isGenerating).toBe(false);
    expect(next.error).toBe(null);
    expect(next.generationStatus).toBe(lbState.LIFEBOOK_FLOW_STATES.INPUT);
  });

  test("N. 결제 UI는 402에서만 true", () => {
    expect(lbState.shouldShowPaymentUi(402)).toBe(true);
    expect(lbState.shouldShowPaymentUi(401)).toBe(false);
    expect(lbState.shouldShowPaymentUi(422)).toBe(false);
    expect(lbState.shouldShowPaymentUi(500)).toBe(false);
  });
});
