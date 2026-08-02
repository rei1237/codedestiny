const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("연이 마음 별자리는 프로필 이벤트와 로컬 캐시를 먼저 반영한다", () => {
  const source = read("app/yeon-star-hug/YeonStarHugClient.tsx");

  assert.ok(source.includes("readCurrentDestinyProfile"));
  assert.ok(source.includes("event instanceof CustomEvent ? event.detail : undefined"));
  assert.ok(source.includes("readCurrentDestinyProfile(eventProfile, hasYeonProfileBirth)"));
  assert.ok(source.includes("profileSyncVersionRef"));
  assert.ok(source.includes("fetchCurrentDestinyProfile(hasYeonProfileBirth)"));
});

test("연이 결과 영역은 데스크톱에서 입력보다 넓고 본문은 읽기 폭으로 표시한다", () => {
  const source = read("app/yeon-star-hug/YeonStarHugClient.tsx");

  assert.ok(source.includes("max-w-[1440px]"));
  assert.ok(source.includes("lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.8fr)]"));
  assert.ok(source.includes("min-h-[160px]"));
  assert.ok(source.includes("text-[15px] leading-7"));
  assert.ok(source.includes("sm:grid-cols-2"));
  assert.equal(source.includes("bg-clip-text"), false);
});
