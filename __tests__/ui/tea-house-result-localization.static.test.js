const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

/**
 * 상담 결과의 결정론 조각(찻잔·타로 카드 정체성·스프레드 위치)을 렌더 직전에 사전 값으로
 * 갈아끼우는 `localizeConsultResult` 의 계약을 고정한다.
 *
 * 🔴 왜 필요한가: 워커의 `mergeLlmResult` 는 이 필드들을 LLM 출력으로 덮지 않고 클라 초안 그대로
 * 고정한다. 그래서 사전 조회가 없으면 **정상 응답에서도** 모든 로케일이 한국어를 본다. 반대로
 * 이 함수가 과하게 덮으면 **한국어 화면이 바뀐다** — 그 두 방향을 함께 잠근다.
 *
 * 한국어 불변식: 사전 값이 소스와 같을 때(=ko) 출력은 입력과 완전히 같아야 한다.
 */

const root = path.resolve(__dirname, "../..");
const sourcePath = path.join(root, "src/features/fortune-tea-house/lib/localizeConsultResult.ts");

/** 이 모듈의 import 는 전부 `import type` 이라 트랜스파일 결과에 런타임 의존이 없다. */
function loadLocalizer() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  });
  const compiled = new Module(sourcePath, null);
  compiled.filename = sourcePath;
  compiled.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  compiled._compile(outputText, sourcePath);
  return compiled.exports;
}

const { localizeConsultResult } = loadLocalizer();

const CUP = {
  id: "lotus-moon",
  name: "달빛 연꽃차",
  topic: "미련과 가능성",
  reading: "달빛 연꽃차는 조용히 마음을 가라앉힙니다.",
  resultPrelude: "달빛 연꽃차는 다음 걸음을 보여줍니다.",
};

const CARD = {
  id: "major_00_fool",
  nameKo: "바보",
  upright: { keywords: ["새 출발", "순수함"], meaning: "정방향 의미" },
  reversed: { keywords: ["성급함", "불안정"], meaning: "역방향 의미" },
};

const POSITIONS = {
  three: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문의 중심 장면" },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 현실적인 기준" },
  ],
};

function buildResult() {
  return {
    consultationMode: "tarot",
    teaCup: { ...CUP },
    tarot: {
      cardId: "major_00_fool",
      number: 0,
      nameKo: "바보",
      nameEn: "The Fool",
      orientation: "upright",
      keywords: ["새 출발", "순수함"],
      meaning: "정방향 의미",
      source: "existing-card-data",
    },
    tarotSpreadCards: [
      {
        cardId: "major_00_fool",
        number: 0,
        nameKo: "바보",
        nameEn: "The Fool",
        orientation: "reversed",
        keywords: ["성급함", "불안정"],
        meaning: "역방향 의미",
        source: "existing-card-data",
        positionId: "advice",
        positionLabel: "조언",
        positionMeaning: "오늘 붙잡을 현실적인 기준",
      },
    ],
  };
}

const koParts = { cups: [CUP], cards: [CARD], positions: POSITIONS };

test("사전 값이 소스와 같으면(=한국어) 결과가 한 글자도 바뀌지 않는다", () => {
  const input = buildResult();
  const output = localizeConsultResult(buildResult(), koParts);
  assert.deepEqual(output, input);
});

test("다른 로케일에서는 찻잔·카드·위치 문구가 사전 값으로 바뀐다", () => {
  const output = localizeConsultResult(buildResult(), {
    cups: [{ ...CUP, name: "Moonlit Lotus", topic: "Regret and possibility", reading: "It settles the heart.", resultPrelude: "It shows the next step." }],
    cards: [{
      ...CARD,
      nameKo: "The Fool",
      upright: { keywords: ["A new start", "Innocence"], meaning: "Upright meaning" },
      reversed: { keywords: ["Haste", "Unsteadiness"], meaning: "Reversed meaning" },
    }],
    positions: {
      three: [
        { positionId: "present", positionLabel: "Now", positionMeaning: "The central scene" },
        { positionId: "advice", positionLabel: "Advice", positionMeaning: "A practical standard" },
      ],
    },
  });

  assert.equal(output.teaCup.name, "Moonlit Lotus");
  assert.equal(output.teaCup.topic, "Regret and possibility");
  assert.equal(output.teaCup.resultPrelude, "It shows the next step.");
  // 정방향 카드는 upright 면을, 역방향 카드는 reversed 면을 따라가야 한다.
  assert.equal(output.tarot.nameKo, "The Fool");
  assert.deepEqual(output.tarot.keywords, ["A new start", "Innocence"]);
  assert.equal(output.tarot.meaning, "Upright meaning");
  assert.deepEqual(output.tarotSpreadCards[0].keywords, ["Haste", "Unsteadiness"]);
  assert.equal(output.tarotSpreadCards[0].meaning, "Reversed meaning");
  assert.equal(output.tarotSpreadCards[0].positionLabel, "Advice");
  assert.equal(output.tarotSpreadCards[0].positionMeaning, "A practical standard");
});

test("사전에 없는 카드·찻잔은 payload 값을 그대로 둔다", () => {
  const input = buildResult();
  input.tarot.cardId = "major_99_unknown";
  input.teaCup.id = "unknown-cup";
  input.tarotSpreadCards[0].cardId = "major_99_unknown";
  const output = localizeConsultResult(input, {
    cups: [{ ...CUP, name: "Moonlit Lotus" }],
    cards: [{ ...CARD, nameKo: "The Fool" }],
    positions: POSITIONS,
  });
  assert.equal(output.tarot.nameKo, "바보");
  assert.equal(output.teaCup.name, "달빛 연꽃차");
  assert.equal(output.tarotSpreadCards[0].nameKo, "바보");
});

test("대표 카드 위치는 호출부가 넘긴 라벨을 쓴다", () => {
  const input = buildResult();
  input.tarotSpreadCards[0].positionId = "representative";
  input.tarotSpreadCards[0].positionLabel = "대표";
  input.tarotSpreadCards[0].positionMeaning = "가장 먼저 떠오른 카드";
  const output = localizeConsultResult(input, {
    ...koParts,
    representativePosition: { positionLabel: "Representative", positionMeaning: "The card that surfaced first" },
  });
  assert.equal(output.tarotSpreadCards[0].positionLabel, "Representative");
  assert.equal(output.tarotSpreadCards[0].positionMeaning, "The card that surfaced first");
});

test("결과에 찻잔·타로가 없어도 터지지 않는다", () => {
  const output = localizeConsultResult({ consultationMode: "saju" }, koParts);
  assert.equal(output.consultationMode, "saju");
});
