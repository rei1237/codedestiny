import test from "node:test";
import assert from "node:assert/strict";
import { nextCardPageIndex } from "../../app/components/home-card-swipe.mjs";

test("가로 넘김은 출석·실천·기록 순서로 한 장씩 이동한다", () => {
  assert.equal(nextCardPageIndex(0, 3, -70, 5), 1);
  assert.equal(nextCardPageIndex(1, 3, -70, 5), 2);
  assert.equal(nextCardPageIndex(2, 3, 70, 5), 1);
});
test("첫 장과 마지막 장을 넘어가지 않는다", () => {
  assert.equal(nextCardPageIndex(0, 3, 70, 0), 0);
  assert.equal(nextCardPageIndex(2, 3, -70, 0), 2);
});
test("짧은 움직임과 수직 스크롤은 장면을 바꾸지 않는다", () => {
  assert.equal(nextCardPageIndex(1, 3, 54, 0), 1);
  assert.equal(nextCardPageIndex(1, 3, -70, 65), 1);
});
