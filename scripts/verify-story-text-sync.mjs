// lib/stories/vn/episodes.generated.json 이 public/codedestiny-novel.html 과 어긋나지 않았는지 검사.
//
// VN HTML 이 authoritative source 이고 JSON 은 파생물이다. 원본만 고치고 재생성을 잊으면
// 텍스트 리더가 옛 이야기를 계속 보여 주게 되므로, prebuild 에서 막는다.
// 어긋나면: node scripts/build-story-text.mjs 후 커밋.
import { existsSync, readFileSync } from "node:fs";
import { buildStoryPayload, STORY_OUTPUT_PATH, STORY_SOURCE_PATH } from "./build-story-text.mjs";

function fail(message) {
  console.error(`[story-text-sync] ${message}`);
  process.exit(1);
}

if (!existsSync(STORY_SOURCE_PATH)) fail(`missing source: ${STORY_SOURCE_PATH}`);
if (!existsSync(STORY_OUTPUT_PATH)) {
  fail("missing lib/stories/vn/episodes.generated.json — run: node scripts/build-story-text.mjs");
}

const expected = buildStoryPayload(readFileSync(STORY_SOURCE_PATH, "utf8"));

let actual;
try {
  actual = JSON.parse(readFileSync(STORY_OUTPUT_PATH, "utf8"));
} catch (error) {
  fail(`generated json is not parseable: ${error.message}`);
}

if (actual.sourceHash !== expected.sourceHash) {
  fail(
    `source changed but generated json was not rebuilt (expected ${expected.sourceHash}, found ${actual.sourceHash}) — run: node scripts/build-story-text.mjs`,
  );
}

if (!Array.isArray(actual.episodes) || actual.episodes.length !== expected.episodes.length) {
  fail(`episode count mismatch (expected ${expected.episodes.length}, found ${actual.episodes?.length})`);
}

const thin = expected.episodes.filter(
  (episode) => episode.beats.reduce((sum, beat) => sum + (beat.t.match(/[가-힣]/g) || []).length, 0) < 1800,
);
if (thin.length > 0) {
  // 각 화가 색인 대상이므로 게이트 임계(1,800자) 미만이면 배포가 막힌다. 미리 잡는다.
  fail(`episodes below the 1800-char indexable threshold: ${thin.map((episode) => episode.slug).join(", ")}`);
}

console.log(
  `[story-text-sync] OK: ${expected.episodes.length} episodes in sync (hash ${expected.sourceHash})`,
);
