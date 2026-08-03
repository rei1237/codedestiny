const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const runtime = fs.readFileSync(path.join(root, "js/core/index-inline-runtime.js"), "utf8");

test("자미두수 심화 카드는 공통 프리뷰를 거치지 않고 심화 경로로 이동한다", () => {
  assert.match(
    shell,
    /<a class="tarot-tile tarot-tile--ziwei-deep" href="\/ziwei\/chart"[\s\S]*?data-action="navigateToZiweiChart"[\s\S]*?<\/a>/,
  );
  assert.doesNotMatch(
    shell,
    /<button class="tarot-tile tarot-tile--ziwei-deep"[\s\S]*?data-action="navigateToZiweiChart"/,
  );
  assert.match(runtime, /window\.location\.href = '\/ziwei\/chart';/);
  assert.doesNotMatch(runtime, /window\.location\.href = '\/index\.html\?action=openZiweiModal';/);
});
