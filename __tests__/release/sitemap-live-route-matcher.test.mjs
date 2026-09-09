import assert from "node:assert/strict";
import { test } from "node:test";
import { createLiveRouteMatcher } from "../../scripts/lib/live-route-matcher.mjs";

const isLiveRoute = createLiveRouteMatcher(process.cwd());

test("사이트맵 라우트 matcher는 실제 앱·정적 셸 라우트 계열만 활성으로 판단한다", () => {
  assert.equal(isLiveRoute("/"), true);
  assert.equal(isLiveRoute("/fortune"), true);
  assert.equal(isLiveRoute("/ja/insights"), true);
  assert.equal(isLiveRoute("/this-route-does-not-exist"), false);
});
