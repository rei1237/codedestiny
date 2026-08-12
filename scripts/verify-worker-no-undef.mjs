/**
 * worker/ 미선언 식별자 가드
 *
 * 배경:
 *   `npm run lint`(= next lint)는 app/pages/components/lib/src 만 훑고 worker/ 는 보지 않는다.
 *   .eslintrc.json 도 next/* 만 extend 해서 no-undef 가 프로젝트 전역에서 꺼져 있고,
 *   worker/ 는 순수 JS 라 tsc 도 검사하지 않는다. 그 결과 오타 하나가 배포까지 그대로 갔다:
 *   sukuyo.js 의 SUKUYO_YEARLY_FORTUNE_SERVICE_KEY(선언은 SUKYO_…)가 1년운 3개 라우트를
 *   결제 게이트 이전에 전부 죽였고, billing.js 는 isTransactionUnsupported 를 import 하지 않아
 *   코인 차감 트랜잭션 실패 시 보상 폴백 대신 ReferenceError 를 던졌다.
 *
 * 검사 방법:
 *   ESLint 를 no-undef 단일 룰로 worker/**\/*.js 에 돌린다. 실행 ~4초.
 *   호출자가 없는 데드코드의 기지 위반은 KNOWN_DEAD_CODE 로 통과시킨다 — 데드코드를 지우는 것은
 *   이 가드의 일이 아니고(무관한 코드 삭제 금지), 통과 못 하는 가드는 곧 꺼지기 때문이다.
 *   새 위반은 그대로 실패한다.
 *
 * 실행: npm run verify:worker-no-undef
 */

import { ESLint } from "eslint";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { BUILD_ARTIFACT_DIRS } from "./lib/source-scan-ignore.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// 호출자가 없어 런타임에 닿지 않는 기지 위반. 새로 추가하려면 "왜 안 고치고 통과시키는지"를 함께 적는다.
const KNOWN_DEAD_CODE = [
  // buildVedicChapterCounselingBody 클러스터는 호출자가 0이다(상수 선언은 22b01d701 에서 제거됨).
  { file: "worker/lib/vedic-premium-generator.js", name: "VEDIC_CATEGORY_COUNSELING_PROFILES" },
  { file: "worker/lib/vedic-premium-generator.js", name: "VEDIC_CHAPTER_COUNSELING_STYLES" },
  // 로컬 resolvePigCoinConsumeAuth 는 호출자가 없다(실사용은 fortune-access-guard.js 의 별칭 import).
  { file: "worker/routes/fortune.js", name: "isAdminPigCoinBypassEnabled" },
];

function isKnownDeadCode(file, message) {
  return KNOWN_DEAD_CODE.some((entry) => entry.file === file && message.message.includes(`'${entry.name}'`));
}

const eslint = new ESLint({
  cwd: root,
  useEslintrc: false,
  overrideConfig: {
    parserOptions: { ecmaVersion: 2023, sourceType: "module" },
    env: { es2022: true },
    // Cloudflare Workers 런타임 전역. Node 전용 API(fs/net 등)는 worker/ 에서 금지라 넣지 않는다 —
    // 그런 식별자가 나오면 이 가드가 실패하는 것이 맞다.
    globals: Object.fromEntries([
      "console", "globalThis", "crypto", "fetch", "Request", "Response", "Headers", "FormData", "Blob",
      "URL", "URLSearchParams", "AbortController", "AbortSignal", "TextEncoder", "TextDecoder",
      "ReadableStream", "WritableStream", "TransformStream", "atob", "btoa", "caches", "queueMicrotask",
      "setTimeout", "clearTimeout", "setInterval", "clearInterval", "structuredClone", "performance",
      "WebSocketPair", "process", "Buffer", "Intl", "WebAssembly",
    ].map((name) => [name, "readonly"])),
    rules: { "no-undef": "error" },
    // 레포에 .eslintignore 가 없어서, 산출물이 worker/ 안에 떨어지면 13 MiB 번들을 그대로
    // lint 한다(번들에는 window·document 가 인라인돼 있어 no-undef 가 수백 건 터진다).
    ignorePatterns: BUILD_ARTIFACT_DIRS.map((dir) => `**/${dir}/**`),
  },
});

const results = await eslint.lintFiles(["worker/**/*.js"]);
const violations = [];
for (const result of results) {
  const file = relative(root, result.filePath).replace(/\\/g, "/");
  for (const message of result.messages) {
    if (message.ruleId !== "no-undef") continue;
    if (isKnownDeadCode(file, message)) continue;
    violations.push(`${file}:${message.line}:${message.column} ${message.message}`);
  }
}

if (violations.length) {
  console.error("[verify-worker-no-undef] 미선언 식별자를 발견했습니다:");
  for (const violation of violations) console.error(`  - ${violation}`);
  console.error("\n선언·import 를 고치세요. 호출자가 없는 데드코드라면 KNOWN_DEAD_CODE 에 사유와 함께 추가합니다.");
  process.exit(1);
}

console.log(`[verify-worker-no-undef] OK — ${results.length}개 파일에서 미선언 식별자 없음 (기지 데드코드 ${KNOWN_DEAD_CODE.length}건 제외).`);
