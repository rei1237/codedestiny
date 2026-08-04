// CMS 발행본을 VN 정본(JSON)에만 적용한다.
// 플레이어 청크와 텍스트 리더는 뒤이은 story:generate에서 함께 다시 생성된다.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_PATH = resolve(ROOT, "content/novel/episodes.source.json");
const OVERRIDES_PATH = resolve(ROOT, "lib/stories/vn/overrides.generated.json");
const BEAT_MAX_LENGTH = 250;
const FORBIDDEN_IN_BEAT = ["\"", "\\", "</script"];

function toEpisodeSlug(no, index) {
  const raw = String(no || "").trim();
  const match = /^EP\.?\s*(\d+)$/i.exec(raw);
  if (match) return `ep-${String(Number(match[1])).padStart(2, "0")}`;
  if (/prologue/i.test(raw)) return "prologue";
  return `ep-${String(index).padStart(2, "0")}`;
}

function buildReaderIndexMap(beats) {
  return beats.flatMap((beat, rawIndex) => String(beat?.t || "").trim() ? [rawIndex] : []);
}

function isSafeBeatText(text) {
  return typeof text === "string" && Boolean(text.trim()) && text.length <= BEAT_MAX_LENGTH
    && !FORBIDDEN_IN_BEAT.some((token) => text.includes(token));
}

function loadOverrides() {
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
    return raw?.episodes && typeof raw.episodes === "object" ? raw.episodes : {};
  } catch {
    return {};
  }
}

function applyEpisodeOverride(episode, override, slug, report) {
  let changed = false;
  for (const key of ["title", "tag"]) {
    if (typeof override?.[key] === "string" && override[key].trim() && override[key] !== episode[key]) {
      episode[key] = override[key]; report[key === "title" ? "titles" : "tags"] += 1; changed = true;
    }
  }
  if (!override?.beats || typeof override.beats !== "object") return changed;
  const readerToRaw = buildReaderIndexMap(episode.beats);
  for (const [readerIndexRaw, text] of Object.entries(override.beats)) {
    const readerIndex = Number(readerIndexRaw);
    if (!Number.isInteger(readerIndex) || readerIndex < 0 || readerIndex >= readerToRaw.length) {
      report.warnings.push(`${slug}: 비트 인덱스 ${readerIndexRaw}가 범위를 벗어나 건너뜁니다.`); continue;
    }
    if (!isSafeBeatText(text)) {
      report.warnings.push(`${slug}: 비트 ${readerIndexRaw} 텍스트가 안전 규칙(250자·금칙문자)에 걸려 건너뜁니다.`); continue;
    }
    const rawIndex = readerToRaw[readerIndex];
    if (episode.beats[rawIndex].t !== text) { episode.beats[rawIndex].t = text; report.beats += 1; changed = true; }
  }
  return changed;
}

function main() {
  const overrides = loadOverrides();
  const overrideCount = Object.keys(overrides).length;
  if (!overrideCount) { console.log("[vn-overrides] 발행된 라이트 노벨 수정본이 없습니다. 정본을 그대로 둡니다."); return; }
  const source = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
  if (source.schemaVersion !== 1 || !Array.isArray(source.episodes)) throw new Error("지원하지 않는 VN 정본 스키마입니다.");
  const report = { titles: 0, tags: 0, beats: 0, warnings: [] };
  let matchedSlugs = 0;
  const beatCounts = source.episodes.map((episode) => episode.beats.length);
  source.episodes.forEach((episode, index) => {
    const slug = toEpisodeSlug(episode.no, index);
    if (overrides[slug]) { matchedSlugs += 1; applyEpisodeOverride(episode, overrides[slug], slug, report); }
    if (episode.beats.length !== beatCounts[index]) throw new Error(`${slug}: 비트 개수가 바뀌어 적용을 중단합니다.`);
  });
  writeFileSync(SOURCE_PATH, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  for (const warning of report.warnings) console.warn(`[vn-overrides] ${warning}`);
  console.log(`[vn-overrides] 적용 완료 — 발행본 ${overrideCount}화 중 ${matchedSlugs}화 매칭, 제목 ${report.titles} · 부제 ${report.tags} · 대사 ${report.beats}건 반영${report.warnings.length ? ` (건너뜀 ${report.warnings.length}건)` : ""}`);
}

try { main(); } catch (error) {
  console.warn(`[vn-overrides] 적용을 건너뜁니다 (${error?.message || error}). 정본 대본이 그대로 배포됩니다.`);
  process.exit(0);
}
