// 정본과 정적 플레이어 청크/텍스트 리더 산출물이 한 번에 동기화됐는지 검사한다.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildNovelPayload, MANIFEST_PATH, READER_OUTPUT_PATH, SOURCE_PATH, readerPayload } from "./build-novel-runtime.mjs";

function fail(message) {
  console.error(`[story-text-sync] ${message}`);
  process.exit(1);
}

for (const path of [SOURCE_PATH, MANIFEST_PATH, READER_OUTPUT_PATH]) {
  if (!existsSync(path)) fail(`missing generated source or output: ${path}`);
}

const expected = buildNovelPayload();
let manifest;
let reader;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  reader = JSON.parse(readFileSync(READER_OUTPUT_PATH, "utf8"));
} catch (error) {
  fail(`generated json is not parseable: ${error.message}`);
}

for (const [label, output] of [["manifest", manifest], ["reader", reader]]) {
  if (output.sourceHash !== expected.sourceHash) fail(`${label} is stale — run: npm run story:generate`);
  if (!Array.isArray(output.episodes) || output.episodes.length !== expected.episodeCount) {
    fail(`${label} episode count mismatch (expected ${expected.episodeCount}, found ${output.episodes?.length})`);
  }
}

for (const meta of manifest.episodes) {
  const chunkPath = resolve(dirname(MANIFEST_PATH), "episodes", `${meta.id}.json`);
  if (!existsSync(chunkPath)) fail(`missing episode chunk: ${meta.path}`);
  const chunk = JSON.parse(readFileSync(chunkPath, "utf8"));
  if (chunk.sourceHash !== expected.sourceHash || chunk.id !== meta.id || chunk.beats.length !== meta.beatCount) {
    fail(`invalid episode chunk: ${meta.path}`);
  }
  if (chunk.beats.some((beat) => beat.scene && !beat.a11y?.description)) fail(`accessibility description missing in ${meta.id}`);
}

const expectedReader = readerPayload(expected);
if (JSON.stringify(reader) !== JSON.stringify(expectedReader)) fail("text reader output does not match canonical source");

const thin = expected.episodes.filter(
  (episode) => episode.beats.reduce((sum, beat) => sum + (beat.t.match(/[가-힣]/g) || []).length, 0) < 1800,
);
if (thin.length > 0) fail(`episodes below the 1800-char indexable threshold: ${thin.map((episode) => episode.id).join(", ")}`);

/* 🔴 텍스트 리더 화면에서 사람이 손으로 관리하는 세 곳(아크 경계 · 로그라인 · 화수 표기)은
   어긋나도 화면이 조용하다 — 아크가 덮지 않는 화는 허브에서 통째로 사라지고, 로그라인이
   빠지면 빈 줄이 되고, "44화"는 그냥 틀린 숫자로 남는다. lib/stories/vn/index.ts 는 .ts 라
   node 가 import 할 수 없으므로(이 레포에는 TS 프리셋이 없다) 텍스트로 읽어 단언한다.
   선언을 못 찾으면 통과가 아니라 실패다. */
const ROOT = resolve(import.meta.dirname, "..");
const vnIndex = readFileSync(resolve(ROOT, "lib/stories/vn/index.ts"), "utf8");

const arcBlock = vnIndex.match(/export const STORY_ARCS: StoryArc\[\] = \[([\s\S]*?)\n\];/);
if (!arcBlock) fail("STORY_ARCS 선언을 lib/stories/vn/index.ts 에서 찾지 못했습니다.");
const arcRanges = [...arcBlock[1].matchAll(/from:\s*(\d+),\s*to:\s*(\d+),/g)].map((m) => [Number(m[1]), Number(m[2])]);
if (arcRanges.length === 0) fail("STORY_ARCS 에서 from/to 범위를 하나도 읽지 못했습니다.");
const arcCovered = new Set();
for (const [from, to] of arcRanges) {
  for (let index = from; index <= to; index += 1) {
    if (arcCovered.has(index)) fail(`STORY_ARCS 의 아크 범위가 겹칩니다: 화 인덱스 ${index}`);
    arcCovered.add(index);
  }
}
const uncovered = expected.episodes.map((_, index) => index).filter((index) => !arcCovered.has(index));
if (uncovered.length > 0) fail(`STORY_ARCS 가 덮지 않는 화가 있습니다(허브에서 안 보입니다): ${uncovered.join(", ")}`);
const overshoot = [...arcCovered].filter((index) => index >= expected.episodeCount);
if (overshoot.length > 0) fail(`STORY_ARCS 가 없는 화를 가리킵니다: ${overshoot.join(", ")}`);

const loglineBlock = vnIndex.match(/export const STORY_LOGLINES: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!loglineBlock) fail("STORY_LOGLINES 선언을 lib/stories/vn/index.ts 에서 찾지 못했습니다.");
const loglineKeys = new Set([...loglineBlock[1].matchAll(/^\s*"?([a-z0-9-]+)"?:\s*"/gm)].map((m) => m[1]));
const missingLoglines = expected.episodes.filter((episode) => !loglineKeys.has(episode.id)).map((episode) => episode.id);
if (missingLoglines.length > 0) fail(`STORY_LOGLINES 에 로그라인이 없는 화: ${missingLoglines.join(", ")}`);
const strayLoglines = [...loglineKeys].filter((key) => !expected.episodes.some((episode) => episode.id === key));
if (strayLoglines.length > 0) fail(`STORY_LOGLINES 에 정본에 없는 화의 로그라인이 남아 있습니다: ${strayLoglines.join(", ")}`);

const storiesHub = readFileSync(resolve(ROOT, "app/stories/page.tsx"), "utf8");
const claimedCounts = [...storiesHub.matchAll(/(\d+)화/g)].map((m) => Number(m[1]));
if (claimedCounts.length === 0) fail("app/stories/page.tsx 에서 화수 표기를 찾지 못했습니다.");
const wrongCounts = [...new Set(claimedCounts.filter((count) => count !== expected.episodeCount))];
if (wrongCounts.length > 0) fail(`app/stories/page.tsx 의 화수 표기가 정본(${expected.episodeCount}화)과 다릅니다: ${wrongCounts.join("화, ")}화`);

console.log(`[story-text-sync] OK: ${expected.episodeCount} episodes · ${expected.beatCount.toLocaleString("ko-KR")} beats in sync (hash ${expected.sourceHash.slice(0, 16)})`);
