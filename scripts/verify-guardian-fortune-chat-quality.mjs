import fs from "node:fs/promises";
import assert from "node:assert/strict";

import { generateGuardianFortuneWithMockLLM } from "../worker/lib/guardian-fortune-mock.js";
import {
  assertGuardianFortuneNoSensitiveLeak,
  countGuardianFortuneVisibleTextLength,
} from "../worker/lib/guardian-fortune-result.js";
import { makeGuardianFortuneContext, guardianFortuneLlmInput } from "../__tests__/fixtures/guardian-fortune-llm-fixtures.mjs";

const rootFiles = [
  "index.html",
  "js/guardian-fortune-home.js",
  "js/guardian-fortune-mock.js",
  "styles/guardian-fortune.css",
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
  const [html, home, mock, css, promptSource, fallbackSource] = await Promise.all(rootFiles.map(read));

  assert(!html.includes("매일 초기화되지"), "stale daily-reset warning must not be visible");
  assert(!home.includes("매일 초기화되지"), "stale daily-reset warning must not be scripted");
  assert(!mock.includes("매일 초기화되지"), "stale daily-reset warning must not be in mock data");
  assert(!html.includes("꽃돼지 연이의 행운 상담소"), "Yeoni should not be split into a separate flower-pig counselor label");
  assert(!mock.includes("꽃돼지 연이의 행운 상담소"), "mock copy should use unified Yeoni label");
  assert(css.includes("guardian-fortune__chat-timeline"), "chat timeline luxe styling must exist");
  assert(css.includes("guardian-fortune__composer"), "composer styling must exist");

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
    assert(length >= 800 && length <= 1500, `visible result length out of range: ${length}`);
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
      copy: true,
      css: true,
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
