const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertScopedCopyTranslated } = require("../fixtures/scoped-copy-i18n-guard");

/**
 * 운명의 찻집 컴포넌트의 한국어가 12개 로케일 전부에서 번역되는지 정적으로 확인한다.
 *
 * 발견·검사 규칙은 `__tests__/fixtures/scoped-copy-i18n-guard.js` 가 갖는다 — 마스터 인연의
 * 서(`useCodexContentCopy`)와 같은 엔진(`lib/i18n/scopedCopy.ts`)을 쓰므로 가드도 한 벌만 둔다.
 */

const root = path.resolve(__dirname, "../..");
const featureDir = path.join(root, "src/features/fortune-tea-house");
const componentsDir = path.join(featureDir, "components");

test("운명의 찻집 컴포넌트의 한국어가 12개 로케일 사전에 전부 있다", () => {
  assertScopedCopyTranslated({
    root,
    hookName: "useTeaHouseCopy",
    namespace: "fortuneTeaHouse",
    featureDir,
    componentsDir,
  });
});

test("운명의 찻집 컴포넌트는 useT 가 아니라 useTPick 계열을 쓴다", () => {
  // ko.json 이 이 네임스페이스를 갖더라도, useT 는 키가 없을 때 "번역을 준비 중입니다" 를
  // 돌려주므로 한국어 화면을 덮을 수 있다. 이 피처는 useTeaHouseCopy(=useTPick) 한 길만 쓴다.
  const files = fs.readdirSync(componentsDir).filter((name) => name.endsWith(".tsx"));
  for (const file of files) {
    const source = fs.readFileSync(path.join(componentsDir, file), "utf8");
    assert.ok(!/\buseT\(/.test(source), `${file}: useT( 를 쓰고 있다 — useTeaHouseCopy 를 쓸 것`);
  }
});
