import assert from "node:assert/strict";
import { mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const tempDir = await mkdtemp(path.join(tmpdir(), "code-destiny-saju-prompt-"));

async function loadPromptBuilder() {
  await writeFile(path.join(tempDir, "package.json"), JSON.stringify({ type: "module" }));
  await copyFile(path.join(root, "worker/lib/saju-ai-prompt.js"), path.join(tempDir, "saju-ai-prompt.js"));
  await copyFile(path.join(root, "worker/lib/fortune-question-prompt.js"), path.join(tempDir, "fortune-question-prompt.js"));
  await copyFile(path.join(root, "worker/lib/saju-ai-prompt-templates.mjs"), path.join(tempDir, "saju-ai-prompt-templates.mjs"));
  return import(pathToFileURL(path.join(tempDir, "saju-ai-prompt.js")).href);
}

function makeSajuResult(overrides = {}) {
  const pillars = overrides.pillars || {
    y: { g: "甲", j: "子", gE: "목", jE: "수" },
    m: { g: "丙", j: "寅", gE: "화", jE: "목" },
    d: { g: "甲", j: "申", gE: "목", jE: "금" },
    h: { g: "癸", j: "辰", gE: "수", jE: "토" },
  };
  const daewun = Object.hasOwn(overrides, "daewun") ? overrides.daewun : [
    { age: 30, gan: "甲", zhi: "子", score: 88, label: "test daewoon" },
  ];
  return {
    profile: {
      name: "테스트",
      gender: "F",
      birth: { year: 1990, month: 3, day: 18, hour: 7, minute: 20, calType: "solar" },
    },
    snapshot: {
      gender: "F",
      birth: { year: 1990, month: 3, day: 18, hour: 7, minute: 20 },
      elementWeights: { wood: 3, fire: 1, earth: 1, metal: 1, water: 2 },
      analysis: { dayStemElement: "목" },
    },
    pillars,
    natal: {
      counts: { wood: 3, fire: 1, earth: 1, metal: 1, water: 2 },
      dominant: "목",
    },
    johu: { type: "중화 조후", score: 72 },
    power: { isStrong: true, yongshin: ["화", "목"], kijishin: ["금"] },
    jong: { isJong: false, name: "일반격" },
    engineContext: {
      marker: "saju-ai-question-prompt-context-test",
      sourceLayers: ["pillars", "daewun-quantum-flow"],
      quantumMyeongli: {
        dayStem: pillars.d.g,
        monthBranch: pillars.m.j,
        currentAge: 36,
        elementMap: [],
        daewun,
      },
      promptConfig: overrides.promptConfig || undefined,
      renderedFeatureDigests: [],
    },
    annualLuck: overrides.annualLuck,
    monthlyLuck: overrides.monthlyLuck,
    dailyLuck: overrides.dailyLuck,
  };
}

function findOpening(built, sourceBranch, triggerBranch, relationType) {
  return (built.advancedFactors.earthStorageOpenings || []).find((row) => (
    row.sourceBranch === sourceBranch
      && row.triggerBranch === triggerBranch
      && row.relationType === relationType
  ));
}

try {
  const {
    buildSajuAIPromptWithDomain,
    getSajuAICategoryRubric,
    getTenGodFromDayMaster,
    validateSajuMyeongsikTenGodText,
  } = await loadPromptBuilder();
  const { validateSajuAIResultText } = await import(pathToFileURL(path.join(root, "worker/routes/fortune.js")).href);

  const shinMetalCases = [
    ["壬", "상관"],
    ["癸", "식신"],
    ["甲", "정재"],
    ["乙", "편재"],
    ["丙", "정관"],
    ["丁", "편관"],
    ["戊", "정인"],
    ["己", "편인"],
    ["庚", "겁재"],
    ["辛", "비견"],
  ];
  for (const [targetStem, expectedTenGod] of shinMetalCases) {
    assert.equal(
      getTenGodFromDayMaster("辛", targetStem),
      expectedTenGod,
      `辛 day master should read ${targetStem} as ${expectedTenGod}`,
    );
  }

  const shinBuilt = buildSajuAIPromptWithDomain({
    question: "나의 일과 돈, 관계 흐름을 명식 전체로 자세히 알려주세요.",
    domain: "life_direction",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "壬", j: "申", gE: "수", jE: "금" },
        m: { g: "癸", j: "酉", gE: "수", jE: "금" },
        d: { g: "辛", j: "丑", gE: "금", jE: "토" },
        h: { g: "甲", j: "辰", gE: "목", jE: "토" },
      },
      daewun: [{ age: 30, gan: "壬", zhi: "子", score: 76, label: "test Shin-Ren daewoon" }],
    }),
  });
  assert.equal(shinBuilt.promptVersion, "saju-myeongsik-ai-v3", "Saju AI consultation prompt version should be v3");
  const renRow = shinBuilt.factSnapshot.fixedTenGodTable.find((row) => row.stem === "壬");
  const guiRow = shinBuilt.factSnapshot.fixedTenGodTable.find((row) => row.stem === "癸");
  assert.equal(renRow?.tenGod, "상관", "辛 day master fact snapshot should fix 壬 as 상관");
  assert.equal(guiRow?.tenGod, "식신", "辛 day master fact snapshot should fix 癸 as 식신");
  assert.ok(shinBuilt.factCard.includes("壬(임):상관"), "fact card should expose 壬 as 상관");
  assert.ok(shinBuilt.factCard.includes("癸(계):식신"), "fact card should expose 癸 as 식신");
  assert.ok(shinBuilt.prompt.includes("[명식 사실 카드]"), "prompt should include the fact card");
  assert.ok(shinBuilt.prompt.includes("[카테고리별 상담 품질 기준]"), "prompt should include category quality rubric");
  assert.equal(shinBuilt.categoryRubric?.domain, "life_direction", "built prompt should expose the selected category rubric");
  assert.ok(shinBuilt.prompt.includes("신금(辛) 일간에게 임수(壬)는 식신이 아니라 상관"), "prompt should pin the Shin-Ren correction");
  assert.equal(
    validateSajuMyeongsikTenGodText("임수는 상관으로 작동합니다.", shinBuilt.factSnapshot).ok,
    true,
    "validation should pass the correct Shin-Ren ten-god",
  );
  assert.equal(
    validateSajuMyeongsikTenGodText("임수는 식신으로 작동합니다.", shinBuilt.factSnapshot).ok,
    false,
    "validation should reject the wrong Shin-Ren ten-god",
  );

  const baseBuilt = buildSajuAIPromptWithDomain({
    question: "올해 직업과 재물 흐름에서 무엇을 우선해야 하나요?",
    domain: "career",
    sajuResult: makeSajuResult(),
  });
  const conciseCompleteCareerResult = [
    "1. 질문에 대한 핵심 답변",
    "지금 질문은 직업과 진로를 한꺼번에 정리하라는 흐름으로 보입니다. 일하는 방식은 혼자 밀어붙이기보다 역할을 분명히 나눌 때 안정됩니다.",
    "2. 이 명식의 중심 성향",
    "이 명식은 중심을 세운 뒤 성장 전략을 잡아야 힘이 납니다.",
    "3. 십성 구조 해석",
    "관성, 식상, 인성, 재성은 각각 책임, 표현, 학습, 현실 성과로 이어집니다.",
    "4. 오행 균형 해석",
    "오행 균형은 일의 속도와 회복 리듬을 함께 조절하라고 가리킵니다.",
    "5. 현재 고민과 명식의 연결",
    "이직과 전환 타이밍을 묻는 이유는 조직 안의 역할과 독립 가능성을 동시에 보고 싶기 때문입니다.",
    "6. 일/돈/관계/연애/건강 리듬",
    "일과 돈은 먼저 안정시키고, 관계와 건강은 무리한 확장보다 루틴을 세우는 편이 좋습니다.",
    "7. 조심해야 할 패턴",
    "성장 욕심이 앞서 준비 없이 움직이면 흐름이 흩어질 수 있습니다.",
    "8. 살리는 전략",
    "조직 안에서는 책임 범위를 분명히 하고, 독립은 작은 수익 모델부터 시험하세요.",
    "9. 30일 실천 가이드",
    "첫째, 업무 기록을 정리하세요. 둘째, 커리어 선택지를 세 개로 줄이세요. 셋째, 다음 전환을 위한 준비 항목을 적으세요.",
    "10. 마지막 한마디",
    "당신의 진로는 급히 증명할수록 흐려지기보다, 중심을 세우고 꾸준히 다듬을 때 더 선명하게 열립니다.",
  ].join("\n\n");
  const completeValidation = validateSajuAIResultText(conciseCompleteCareerResult, baseBuilt.factSnapshot, {
    domain: "career",
    categoryRubric: baseBuilt.categoryRubric,
  });
  assert.equal(completeValidation.ok, true, "short complete result should pass quality validation without a fixed length floor");
  const incompleteValidation = validateSajuAIResultText(`${conciseCompleteCareerResult}\n\n그리고`, baseBuilt.factSnapshot, {
    domain: "career",
    categoryRubric: baseBuilt.categoryRubric,
  });
  assert.equal(incompleteValidation.ok, false, "cut-off result should fail validation");
  assert.equal(incompleteValidation.incomplete, true, "cut-off result should be marked incomplete");
  const categoryRubricCases = [
    ["career", "직업 적합도"],
    ["money", "수입 구조"],
    ["love", "끌림의 방식"],
    ["litigation", "문서/증거 정리"],
    ["relationship", "소통 방식"],
    ["health", "생활 리듬"],
    ["life_direction", "삶의 방향"],
  ];
  for (const [domain, marker] of categoryRubricCases) {
    const rubric = getSajuAICategoryRubric(domain);
    const built = buildSajuAIPromptWithDomain({
      question: `${rubric.label} 상담 품질 기준이 명식에 맞게 들어가는지 확인해 주세요.`,
      domain,
      sajuResult: makeSajuResult(),
    });
    assert.equal(built.categoryRubric?.domain, domain, `${domain} rubric should be returned`);
    assert.ok(built.prompt.includes("[카테고리별 상담 품질 기준]"), `${domain} prompt should include the rubric header`);
    assert.ok(built.prompt.includes(marker), `${domain} prompt should include its required topic marker`);
  }
  const baseFactors = baseBuilt.advancedFactors;
  assert.ok(Array.isArray(baseFactors.hiddenStems), "advancedFactors.hiddenStems should be an array");
  assert.ok(baseFactors.hiddenStems.length >= 8, "canonical JSON should include hidden stems from four branches");
  assert.ok(baseFactors.hiddenStems.every((row) => row.tenGodFromDayMaster), "each hidden stem should include ten-god from day master");

  const tougan = baseFactors.hiddenStemExposures.find((row) => row.hiddenStem === "甲");
  assert.ok(tougan?.exposedInNatalHeavenlyStem, "same hidden stem in natal heavenly stem should be tougan");
  assert.ok(baseBuilt.prompt.includes("원국 천간에 투간된 지장간"));
  assert.ok(baseBuilt.prompt.includes("甲"));

  assert.ok(tougan?.exposedByLuckStem, "same hidden stem in daewoon stem should be tuchul");
  assert.ok(baseBuilt.prompt.includes("대운/세운/월운/일운에서 투출되는 지장간"));

  const doChungBuilt = buildSajuAIPromptWithDomain({
    question: "이번 대운에 이동과 관계 변화가 강하게 나타날까요?",
    domain: "relationship",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "子", gE: "목", jE: "수" },
        m: { g: "丙", j: "子", gE: "화", jE: "수" },
        d: { g: "甲", j: "寅", gE: "목", jE: "목" },
        h: { g: "癸", j: "辰", gE: "수", jE: "토" },
      },
      daewun: [{ age: 30, gan: "甲", zhi: "子", score: 90, label: "test do-chung daewoon" }],
    }),
  });
  assert.equal(doChungBuilt.advancedFactors.doChung.exists, true, "three repeated branches should trigger do-chung");
  assert.equal(doChungBuilt.advancedFactors.doChung.repeatedBranch, "子", "repeated branch should be Zi");
  assert.equal(doChungBuilt.advancedFactors.doChung.inducedOppositeBranch, "午", "induced opposite branch should be Wu");
  assert.ok(doChungBuilt.prompt.includes("도충 존재 여부: 있음"));

  const noDoChungBuilt = buildSajuAIPromptWithDomain({
    question: "올해 건강과 일상 리듬에서 조심할 점은 무엇인가요?",
    domain: "health",
    sajuResult: makeSajuResult({
      daewun: [{ age: 30, gan: "丁", zhi: "未", score: 74, label: "test clean daewoon" }],
    }),
  });
  assert.equal(noDoChungBuilt.advancedFactors.doChung.exists, false, "less than three repeated branches should not trigger do-chung");
  assert.ok(noDoChungBuilt.prompt.includes("도충 존재 여부: 없음"));

  const chenXuBuilt = buildSajuAIPromptWithDomain({
    question: "이번 세운에 직장과 재물 문제가 밖으로 드러날까요?",
    domain: "career",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "子", gE: "목", jE: "수" },
        m: { g: "丙", j: "辰", gE: "화", jE: "토" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "寅", gE: "수", jE: "목" },
      },
      daewun: [],
      annualLuck: [{ scope: "sewoon", gan: "庚", zhi: "戌", label: "test sewoon Xu" }],
    }),
  });
  const chenXuOpening = findOpening(chenXuBuilt, "辰", "戌", "충");
  assert.ok(chenXuOpening, "Chen-Xu clash should trigger earth storage opening");
  assert.equal(chenXuOpening.openingStrength, "veryStrong", "Chen-Xu clash opening should be very strong");
  assert.deepEqual(chenXuOpening.openedHiddenStems.map((row) => row.stem), ["戊", "乙", "癸"], "Chen opening should open Chen hidden stems");

  const chouWeiBuilt = buildSajuAIPromptWithDomain({
    question: "대운에서 돈과 계약 문제가 열릴까요?",
    domain: "money",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "丑", gE: "목", jE: "토" },
        m: { g: "丙", j: "寅", gE: "화", jE: "목" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "子", gE: "수", jE: "수" },
      },
      daewun: [{ age: 30, gan: "丁", zhi: "未", score: 80, label: "test daewoon Wei" }],
      annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
    }),
  });
  const chouWeiOpening = findOpening(chouWeiBuilt, "丑", "未", "충");
  assert.ok(chouWeiOpening, "Chou-Wei clash should trigger earth storage opening");
  assert.equal(chouWeiOpening.openingStrength, "veryStrong", "Chou-Wei clash opening should be very strong");
  assert.deepEqual(chouWeiOpening.openedHiddenStems.map((row) => row.stem), ["己", "癸", "辛"], "Chou opening should open Chou hidden stems");

  const punishmentBuilt = buildSajuAIPromptWithDomain({
    question: "조직 안에서 묵은 압력이 드러날까요?",
    domain: "career",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "丑", gE: "목", jE: "토" },
        m: { g: "丙", j: "寅", gE: "화", jE: "목" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "戌", gE: "수", jE: "토" },
      },
      daewun: [],
      annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
    }),
  });
  const punishmentOpening = findOpening(punishmentBuilt, "丑", "戌", "형");
  assert.ok(punishmentOpening, "Chou-Xu punishment should trigger earth storage opening");
  assert.equal(punishmentOpening.openingStrength, "strong", "punishment opening should be strong by default");

  const breakBuilt = buildSajuAIPromptWithDomain({
    question: "묶인 자산과 가족 문제가 흔들릴까요?",
    domain: "money",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "辰", gE: "목", jE: "토" },
        m: { g: "丙", j: "寅", gE: "화", jE: "목" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "子", gE: "수", jE: "수" },
      },
      daewun: [],
      annualLuck: [{ scope: "sewoon", gan: "己", zhi: "丑", label: "test break Chou" }],
    }),
  });
  assert.equal(findOpening(breakBuilt, "辰", "丑", "파")?.openingStrength, "medium", "break opening should be medium");

  const harmBuilt = buildSajuAIPromptWithDomain({
    question: "건강과 심리 부담이 은근히 드러날까요?",
    domain: "health",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "辰", gE: "목", jE: "토" },
        m: { g: "丙", j: "寅", gE: "화", jE: "목" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "子", gE: "수", jE: "수" },
      },
      daewun: [],
      annualLuck: [{ scope: "sewoon", gan: "乙", zhi: "卯", label: "test harm Myo" }],
    }),
  });
  assert.equal(findOpening(harmBuilt, "辰", "卯", "해")?.openingStrength, "weak", "harm opening should be weak");

  const noOpeningBuilt = buildSajuAIPromptWithDomain({
    question: "건강과 일상 리듬에서 조심할 점은 무엇인가요?",
    domain: "health",
    sajuResult: makeSajuResult({
      daewun: [{ age: 30, gan: "丁", zhi: "子", score: 74, label: "neutral daewoon Zi" }],
      annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
    }),
  });
  assert.equal(noOpeningBuilt.advancedFactors.earthStorageOpenings.length, 0, "earth storage branch without clash/punishment/break/harm should not open");
  assert.ok(noOpeningBuilt.prompt.includes("개고 존재 여부: 없음"));

  const disabledOpeningBuilt = buildSajuAIPromptWithDomain({
    question: "세운에서 토 지지 충이 열리나요?",
    domain: "career",
    sajuResult: makeSajuResult({
      pillars: {
        y: { g: "甲", j: "辰", gE: "목", jE: "토" },
        m: { g: "丙", j: "寅", gE: "화", jE: "목" },
        d: { g: "甲", j: "申", gE: "목", jE: "금" },
        h: { g: "癸", j: "子", gE: "수", jE: "수" },
      },
      daewun: [],
      annualLuck: [{ scope: "sewoon", gan: "庚", zhi: "戌", label: "test sewoon Xu" }],
      promptConfig: { earthStorageOpening: { enabled: false } },
    }),
  });
  assert.equal(disabledOpeningBuilt.advancedFactors.earthStorageOpenings.length, 0, "admin OFF setting should suppress earth storage openings");

  const mainBuilt = buildSajuAIPromptWithDomain({
    question: "커리어 전환을 언제 준비해야 하나요?",
    domain: "career",
    sajuResult: makeSajuResult(),
  });
  const adminBuilt = buildSajuAIPromptWithDomain({
    question: "커리어 전환을 언제 준비해야 하나요?",
    domain: "career",
    sajuResult: makeSajuResult(),
  });
  assert.deepEqual(adminBuilt.advancedFactors, mainBuilt.advancedFactors, "main and admin preview should share identical advanced factors through the common builder");
  assert.deepEqual(adminBuilt.advancedFactors.earthStorageOpenings, mainBuilt.advancedFactors.earthStorageOpenings, "main and admin preview should share identical earth storage openings");

  console.log("saju-ai-prompt advanced factor tests passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
