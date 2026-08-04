// VN 정본(content/novel/episodes.source.json)에서 텍스트 리더용 JSON을 만든다.
// 정적 플레이어와 텍스트 리더는 동일 정본의 서로 다른 산출물이다.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildNovelPayload, readerPayload, READER_OUTPUT_PATH, SOURCE_PATH, writeNovelRuntime } from "./build-novel-runtime.mjs";

export const STORY_SOURCE_PATH = SOURCE_PATH;
export const STORY_OUTPUT_PATH = READER_OUTPUT_PATH;

export function buildStoryPayload() {
  return readerPayload(buildNovelPayload());
}

function main() {
  const runtime = buildNovelPayload();
  writeNovelRuntime(runtime);
  const payload = readerPayload(runtime);
  const koreanCount = payload.episodes.reduce(
    (sum, episode) => sum + episode.beats.reduce((inner, beat) => inner + (beat.t.match(/[가-힣]/g) || []).length, 0),
    0,
  );
  console.log(
    `[story-text] ${runtime.episodeCount} episodes, ${runtime.beatCount} beats, ${koreanCount.toLocaleString()} Korean chars -> lib/stories/vn/episodes.generated.json`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
