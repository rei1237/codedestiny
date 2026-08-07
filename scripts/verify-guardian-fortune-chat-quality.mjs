import fs from "node:fs/promises";
import assert from "node:assert/strict";

import { generateGuardianFortuneWithMockLLM } from "../worker/lib/guardian-fortune-mock.js";
import {
  assertGuardianFortuneNoSensitiveLeak,
  countGuardianFortuneVisibleTextLength,
} from "../worker/lib/guardian-fortune-result.js";
import { makeGuardianFortuneContext, guardianFortuneLlmInput } from "../__tests__/fixtures/guardian-fortune-llm-fixtures.mjs";
import { GUARDIAN_FORTUNE_RESULT_LENGTH } from "../worker/lib/guardian-fortune-runtime-contract.js";

// 홈 인라인 위젯과 그 전용 브라우저 자산은 제거됐다(정본 화면은 /fortune-chat). 남은 건 서버 계약뿐이다.
const rootFiles = [
  "worker/lib/guardian-fortune-prompt.js",
  "worker/lib/guardian-fortune-fallback.js",
];

function joinedResultText(result) {
  return [
    result.title,
    result.openingLine,
    result.innerState,
    result.coreReading,
    result.topicAdvice,
    result.cautionPattern,
    result.luckyAction,
    result.premiumCta?.reason,
    result.shareText,
  ].filter(Boolean).join("\n");
}

async function read(file) {
  return fs.readFile(file, "utf8");
}

async function main() {
  const [promptSource, fallbackSource] = await Promise.all(rootFiles.map(read));

  assert(promptSource.includes("연이는 꽃돼지 캐릭터와 같은 존재다"), "prompt must unify Yeoni and flower pig");
  assert(promptSource.includes("네오는 연이와 확실히 구분되는 전략가다"), "prompt must distinguish Neo tone");
  assert(!promptSource.match(/fetch\s*\(/), "prompt builder must not call a provider");
  assert(!fallbackSource.match(/fetch\s*\(/), "fallback builder must not call a provider");

  const yeoni = await generateGuardianFortuneWithMockLLM({
    input: { ...guardianFortuneLlmInput, mode: "yeoni", topic: "love", category: "saju" },
    context: makeGuardianFortuneContext({ mode: "yeoni", topic: "love", category: "saju", systems: ["saju"] }),
    scenario: "normal",
  });
  const neo = await generateGuardianFortuneWithMockLLM({
    input: { ...guardianFortuneLlmInput, mode: "neo", topic: "love", category: "saju" },
    context: makeGuardianFortuneContext({ mode: "neo", topic: "love", category: "saju", systems: ["saju"] }),
    scenario: "normal",
  });

  for (const output of [yeoni, neo]) {
    assert.equal(output.usedFallback, false, "normal mock scenario should validate without fallback");
    const length = countGuardianFortuneVisibleTextLength(output.result);
    assert(length >= GUARDIAN_FORTUNE_RESULT_LENGTH.min && length <= GUARDIAN_FORTUNE_RESULT_LENGTH.max, `visible result length out of range: ${length}`);
    assertGuardianFortuneNoSensitiveLeak({ result: output.result, input: guardianFortuneLlmInput });
  }

  const yeoniText = joinedResultText(yeoni.result);
  const neoText = joinedResultText(neo.result);
  assert(yeoniText.includes("연이"), "Yeoni mock result should preserve Yeoni voice");
  assert(neoText.includes("네오"), "Neo mock result should preserve Neo voice");
  assert.notEqual(yeoni.result.openingLine, neo.result.openingLine, "Yeoni and Neo openings must differ");
  assert.notEqual(yeoni.prompt.systemPrompt, neo.prompt.systemPrompt, "Yeoni and Neo system prompts must differ");

  console.log(JSON.stringify({
    ok: true,
    checked: {
      promptTone: true,
      mockProvider: true,
      yeoniLength: countGuardianFortuneVisibleTextLength(yeoni.result),
      neoLength: countGuardianFortuneVisibleTextLength(neo.result),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
