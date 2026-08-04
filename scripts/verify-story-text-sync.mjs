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

console.log(`[story-text-sync] OK: ${expected.episodeCount} episodes · ${expected.beatCount.toLocaleString("ko-KR")} beats in sync (hash ${expected.sourceHash.slice(0, 16)})`);
