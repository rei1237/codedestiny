/**
 * @jest-environment node
 */

// 관리자 CMS 는 worker/lib/cms-prompt-defaults.js 의 카탈로그에 있는 프롬프트만 보여 준다.
// 라우트가 cmsPromptText(env, "키", ...) 로 오버라이드를 읽도록 배선해 놓고 카탈로그에 키를
// 넣는 것을 잊으면, 관리자 화면에는 그 프롬프트가 아예 나타나지 않는다 — 배선은 살아 있는데
// 편집할 방법이 없는 상태로 조용히 남는다. 실제로 animal-totem 이 그렇게 빠져 있었다.
//
// 그래서 소스에서 호출 키를 전수 발견해 카탈로그와 대조한다(손으로 쓴 목록을 두지 않는다).
// 🔴 LLM 을 부르지 않는다. 소스 텍스트만 읽는다(과금 0).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { listPromptCatalog } from "../../worker/lib/cms-prompt-defaults.js";

const workerDir = join(process.cwd(), "worker");

function listJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return /\.(js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

// 줄 주석 안의 사용 예시(cms-prompts.js 헤더)까지 세면 실제 배선이 아닌 키를 요구하게 된다.
const stripLineComment = (line) => {
  const at = line.indexOf("//");
  return at >= 0 ? line.slice(0, at) : line;
};

const CALL_WITH_LITERAL_KEY = /\bcmsPromptText\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*(["'])([^"']+)\1/;
const ANY_CALL = /\bcmsPromptText\s*\(/;
const DECLARATION = /\bfunction\s+cmsPromptText\s*\(/;

const calledKeys = new Set();
let callLines = 0;
let literalKeyLines = 0;

for (const file of listJsFiles(workerDir)) {
  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = stripLineComment(rawLine);
    if (DECLARATION.test(line) || !ANY_CALL.test(line)) continue;
    callLines += 1;
    const match = CALL_WITH_LITERAL_KEY.exec(line);
    if (!match) continue;
    literalKeyLines += 1;
    calledKeys.add(match[2]);
  }
}

const catalogKeys = new Set(listPromptCatalog("prompt.system").map((entry) => entry.key));

describe("CMS 프롬프트 카탈로그 커버리지", () => {
  /* 스캐너가 아무것도 못 찾으면 아래 포함 검사는 공집합 ⊆ 무엇이든 참이 되어 통과한다.
     대상이 없을 때 통과하는 검사는 가드가 아니다 — 발견 자체를 먼저 단언한다. */
  test("소스에서 cmsPromptText 호출과 카탈로그를 실제로 발견한다", () => {
    expect(calledKeys.size).toBeGreaterThan(0);
    expect(catalogKeys.size).toBeGreaterThan(0);
  });

  /* 키를 변수나 템플릿 리터럴로 넘기면 이 스캐너가 못 본다 — 그 순간 검사가 조용히 반쪽이 된다.
     그런 호출이 생기면 여기서 먼저 깨지고, 스캐너를 함께 고치게 된다. */
  test("모든 cmsPromptText 호출이 문자열 리터럴 키를 쓴다", () => {
    expect(literalKeyLines).toBe(callLines);
  });

  test("cmsPromptText 로 읽는 모든 키가 카탈로그에 있다", () => {
    const missing = [...calledKeys].filter((key) => !catalogKeys.has(key)).sort();
    // 실패 메시지에 키가 그대로 보이도록 배열로 비교한다.
    expect(missing).toEqual([]);
  });
});
