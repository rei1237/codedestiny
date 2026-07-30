// 관리자 CMS 에서 발행한 라이트 노벨 수정본을 VN 원본 HTML 에 적용한다.
//
// 파이프라인상 위치 (CI):
//   fetch-content-overrides  →  [이 스크립트]  →  build-story-text  →  prebuild:cf(verify-story-text-sync)
//
// 원본(public/codedestiny-novel.html)이 authoritative source 이고 episodes.generated.json 은 파생물이므로,
// 오버라이드도 원본에 먼저 먹인 뒤 파생물을 다시 만들어야 둘의 해시 대조 게이트를 통과한다.
//
// 🔴 안전 규칙 (전부 하드 가드)
//   - 비트 개수와 인덱스를 절대 바꾸지 않는다. 독자의 저장된 진행 위치·북마크가 인덱스 기반이다.
//   - 텍스트에 " \ </script 가 들어가면 JSON 리터럴이 깨져 노벨 전체가 백지가 된다 → 해당 비트만 건너뛴다.
//   - 구조적으로 조금이라도 어긋나면 HTML 을 아예 건드리지 않고 원본 그대로 둔다(fail-soft).
//     대본을 훼손하느니 이번 반영을 거르는 편이 낫다.
//
// 사용: node scripts/apply-vn-overrides.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const SOURCE_PATH = resolve(rootDir, "public", "codedestiny-novel.html");
const OVERRIDES_PATH = resolve(rootDir, "lib", "stories", "vn", "overrides.generated.json");

const PUSH_TOKEN = "EPISODES.push(";
const BEAT_MAX_LENGTH = 250;
const FORBIDDEN_IN_BEAT = ["\"", "\\", "</script"];

/** build-story-text.mjs 와 같은 알고리즘. 문자열 이스케이프를 존중하며 짝 괄호를 찾는다. */
function findBalancedEnd(source, openIndex) {
  let depth = 1;
  let cursor = openIndex + 1;
  let quote = null;

  while (cursor < source.length && depth > 0) {
    const ch = source[cursor];
    if (quote) {
      if (ch === "\\") {
        cursor += 2;
        continue;
      }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
    }
    cursor += 1;
  }

  if (depth !== 0) throw new Error(`unbalanced brackets starting at ${openIndex}`);
  return cursor - 1;
}

/** build-story-text.mjs 와 같은 규칙. "EP.07" → "ep-07", "PROLOGUE" → "prologue" */
function toEpisodeSlug(no, index) {
  const raw = String(no || "").trim();
  const match = /^EP\.?\s*(\d+)$/i.exec(raw);
  if (match) return `ep-${String(Number(match[1])).padStart(2, "0")}`;
  if (/prologue/i.test(raw)) return "prologue";
  return `ep-${String(index).padStart(2, "0")}`;
}

/**
 * 리더 비트 인덱스 → 원본 비트 인덱스.
 *
 * build-story-text 가 t 가 빈 비트를 버리기 때문에 두 인덱스가 어긋난다. 관리자 화면은 리더
 * 인덱스로 편집하므로(리더에 보이는 것만 고칠 수 있다) 여기서 같은 규칙으로 되돌려 매핑한다.
 * 이 매핑이 틀어지면 엉뚱한 대사가 바뀌므로 규칙은 build-story-text 와 한 글자도 다르면 안 된다.
 */
function buildReaderIndexMap(beats) {
  const map = [];
  beats.forEach((beat, rawIndex) => {
    if (String(beat?.t || "").trim()) map.push(rawIndex);
  });
  return map;
}

function isSafeBeatText(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  if (text.length > BEAT_MAX_LENGTH) return false;
  return !FORBIDDEN_IN_BEAT.some((token) => text.includes(token));
}

function loadOverrides() {
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
    const episodes = raw?.episodes;
    return episodes && typeof episodes === "object" ? episodes : {};
  } catch (e) {
    // 파일이 없으면 fetch-content-overrides 가 아직 안 돌았거나 오버라이드가 없는 것 — 정상.
    return {};
  }
}

function applyEpisodeOverride(parsed, override, slug, report) {
  let changed = false;

  const title = override?.title;
  if (typeof title === "string" && title.trim() && title !== parsed.title) {
    parsed.title = title;
    changed = true;
    report.titles += 1;
  }

  const tag = override?.tag;
  if (typeof tag === "string" && tag.trim() && tag !== parsed.tag) {
    parsed.tag = tag;
    changed = true;
    report.tags += 1;
  }

  const beatOverrides = override?.beats;
  if (beatOverrides && typeof beatOverrides === "object" && Array.isArray(parsed.beats)) {
    const readerToRaw = buildReaderIndexMap(parsed.beats);

    for (const [readerIndexRaw, text] of Object.entries(beatOverrides)) {
      const readerIndex = Number(readerIndexRaw);
      if (!Number.isInteger(readerIndex) || readerIndex < 0 || readerIndex >= readerToRaw.length) {
        report.warnings.push(`${slug}: 비트 인덱스 ${readerIndexRaw} 가 범위를 벗어나 건너뜁니다.`);
        continue;
      }
      if (!isSafeBeatText(text)) {
        report.warnings.push(`${slug}: 비트 ${readerIndexRaw} 텍스트가 안전 규칙(250자·금칙문자)에 걸려 건너뜁니다.`);
        continue;
      }

      const rawIndex = readerToRaw[readerIndex];
      if (parsed.beats[rawIndex].t === text) continue;
      parsed.beats[rawIndex].t = text;
      changed = true;
      report.beats += 1;
    }
  }

  return changed;
}

function main() {
  const overrides = loadOverrides();
  const overrideCount = Object.keys(overrides).length;
  if (!overrideCount) {
    console.log("[vn-overrides] 발행된 라이트 노벨 수정본이 없습니다. 원본을 그대로 둡니다.");
    return;
  }

  const original = readFileSync(SOURCE_PATH, "utf8");
  const report = { titles: 0, tags: 0, beats: 0, warnings: [] };

  let output = "";
  let cursor = 0;
  let episodeIndex = 0;
  let matchedSlugs = 0;

  for (;;) {
    const hit = original.indexOf(PUSH_TOKEN, cursor);
    if (hit === -1) break;

    const openIndex = hit + PUSH_TOKEN.length - 1;
    const endIndex = findBalancedEnd(original, openIndex);
    const literal = original.slice(openIndex + 1, endIndex);

    const parsed = JSON.parse(literal);
    const slug = toEpisodeSlug(parsed.no, episodeIndex);
    const override = overrides[slug];

    output += original.slice(cursor, openIndex + 1);

    if (override) {
      matchedSlugs += 1;
      const beatCountBefore = Array.isArray(parsed.beats) ? parsed.beats.length : 0;
      const changed = applyEpisodeOverride(parsed, override, slug, report);
      const beatCountAfter = Array.isArray(parsed.beats) ? parsed.beats.length : 0;

      // 비트 개수가 변했다면 매핑이 어딘가 잘못된 것이다. 여기서 멈춰야 한다.
      if (beatCountBefore !== beatCountAfter) {
        throw new Error(`${slug}: 비트 개수가 ${beatCountBefore} → ${beatCountAfter} 로 변했습니다.`);
      }

      output += changed ? JSON.stringify(parsed) : literal;
    } else {
      output += literal;
    }

    cursor = endIndex;
    episodeIndex += 1;
  }

  output += original.slice(cursor);

  if (!episodeIndex) throw new Error("VN 원본에서 에피소드를 찾지 못했습니다.");

  // 적용 결과가 다시 파싱되는지 확인한 뒤에만 파일을 쓴다.
  assertOutputParses(output, episodeIndex);

  writeFileSync(SOURCE_PATH, output, "utf8");

  for (const warning of report.warnings) console.warn(`[vn-overrides] ${warning}`);
  console.log(
    `[vn-overrides] 적용 완료 — 발행본 ${overrideCount}화 중 ${matchedSlugs}화 매칭, `
    + `제목 ${report.titles} · 부제 ${report.tags} · 대사 ${report.beats}건 반영`
    + (report.warnings.length ? ` (건너뜀 ${report.warnings.length}건)` : ""),
  );
}

/** 쓰기 전 최종 방어선 — 화 수가 같고 모든 리터럴이 다시 JSON 으로 파싱되어야 한다. */
function assertOutputParses(html, expectedEpisodes) {
  let cursor = 0;
  let count = 0;

  for (;;) {
    const hit = html.indexOf(PUSH_TOKEN, cursor);
    if (hit === -1) break;
    const openIndex = hit + PUSH_TOKEN.length - 1;
    const endIndex = findBalancedEnd(html, openIndex);
    JSON.parse(html.slice(openIndex + 1, endIndex));
    cursor = endIndex;
    count += 1;
  }

  if (count !== expectedEpisodes) {
    throw new Error(`적용 후 에피소드 수가 달라졌습니다 (${expectedEpisodes} → ${count}).`);
  }
}

try {
  main();
} catch (error) {
  // 대본을 훼손하느니 이번 반영을 거른다. 원본은 위에서 쓰기 전에 검증하므로 이 시점에 손상은 없다.
  console.warn(`[vn-overrides] 적용을 건너뜁니다 (${error?.message || error}). 원본 대본이 그대로 배포됩니다.`);
  process.exit(0);
}
