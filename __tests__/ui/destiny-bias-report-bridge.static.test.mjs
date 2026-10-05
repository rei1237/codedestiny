// 최애운명 리포트 브리지 소스 계약: 일련번호·뷰모델에 생일이 실리지 않고, 미성년 치환표가 금지 어휘를 전부 덮는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const bridge = read("app/saju/destiny-bias/engine/chemiReportBridge.ts");
const copyTest = read("__tests__/worker/idol-chemi-copy.test.js");

test("일련번호 해시 입력에 생일이 없다", () => {
  const line = bridge.split("\n").find((row) => row.includes("const serial ="));
  assert.ok(line, "serial 줄이 있어야 한다");
  assert.ok(!/birth|solar/i.test(line), line);
  assert.ok(line.includes("partner.id") && line.includes("referenceDate"));
});

test("뷰모델은 생일·구 해시·카드 SVG 를 비운다", () => {
  for (const literal of ['userBirthDate: ""', 'biasBirthDate: ""', "destinyId: serial", 'cardSvg: ""']) {
    assert.ok(bridge.includes(literal), literal);
  }
});

test("미성년 치환표가 카피 테스트의 금지 어휘를 모두 덮는다", () => {
  const start = copyTest.indexOf("ROMANCE_WORDS = [");
  assert.ok(start >= 0, "ROMANCE_WORDS 를 찾지 못했다");
  const words = [...copyTest.slice(start, copyTest.indexOf("]", start)).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(words.length >= 10);
  for (const word of words) assert.ok(bridge.includes(`["${word}", "`), `치환표에 없음: ${word}`);
  assert.ok(bridge.includes("if (minorMode) vm = mapStrings(vm, toMinorSafeText)"));
});
