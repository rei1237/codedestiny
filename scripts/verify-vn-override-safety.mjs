// 라이트 노벨 CMS 오버라이드가 대본을 훼손하지 않는지 검사한다.
//
// apply-vn-overrides 는 정본 JSON에 fail-soft로 적용하므로(문제가 있으면 반영을 거름) 조용히 지나갈 수 있다.
// 이 스크립트는 그 "조용함"을 소리 나게 만드는 쪽이다 — CI 에서 돌려 무엇이 왜 걸러졌는지 남긴다.
//
// 검사 항목
//   1) 오버라이드 JSON 자체가 읽히는가
//   2) 슬러그가 실제 화와 매칭되는가 (오타 난 슬러그는 영원히 반영 안 됨)
//   3) 비트 인덱스가 범위 안인가
//   4) 텍스트가 상한(scripts/lib/novel-constraints.mjs) 이내이고 금칙문자(" \ </script)가 없는가
//   5) 적용해도 화 수·비트 수가 그대로인가
//   6) 적용 후에도 화별 한글 1,800자 이상인가 (verify-story-text-sync 의 색인 임계값)
//
// 사용: node scripts/verify-vn-override-safety.mjs [--strict]
//   --strict 를 주면 경고도 실패로 취급한다.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildStoryPayload } from "./build-story-text.mjs";
import { BEAT_MAX_LENGTH, FORBIDDEN_IN_BEAT, MIN_KOREAN_PER_EPISODE } from "./lib/novel-constraints.mjs";

const rootDir = process.cwd();
const OVERRIDES_PATH = resolve(rootDir, "lib", "stories", "vn", "overrides.generated.json");


const strict = process.argv.includes("--strict");
const problems = [];
const warnings = [];

function countKorean(text) {
  return (String(text || "").match(/[가-힣]/g) || []).length;
}

function loadOverrides() {
  try {
    const raw = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
    return raw?.episodes && typeof raw.episodes === "object" ? raw.episodes : {};
  } catch (error) {
    problems.push(`오버라이드 파일을 읽을 수 없습니다: ${error?.message || error}`);
    return {};
  }
}

function main() {
  const overrides = loadOverrides();
  const overrideSlugs = Object.keys(overrides);

  if (!overrideSlugs.length) {
    console.log("[vn-override-safety] 발행된 수정본이 없습니다. 검사할 것이 없습니다.");
    return;
  }

  const payload = buildStoryPayload();
  const bySlug = new Map(payload.episodes.map((episode) => [episode.slug, episode]));

  for (const slug of overrideSlugs) {
    const episode = bySlug.get(slug);
    if (!episode) {
      problems.push(`${slug}: 이 슬러그와 맞는 화가 없습니다. 오버라이드가 영원히 반영되지 않습니다.`);
      continue;
    }

    const override = overrides[slug] || {};
    const beatOverrides = override.beats && typeof override.beats === "object" ? override.beats : {};

    // 적용 후 한글 분량을 미리 계산한다 — 짧은 대사로 바꿔 색인 임계값 아래로 떨어지면 배포가 막힌다.
    const projected = episode.beats.map((beat) => beat.t);

    for (const [indexRaw, text] of Object.entries(beatOverrides)) {
      const index = Number(indexRaw);

      if (!Number.isInteger(index) || index < 0 || index >= episode.beats.length) {
        problems.push(`${slug}: 비트 인덱스 ${indexRaw} 가 범위(0~${episode.beats.length - 1})를 벗어납니다.`);
        continue;
      }
      if (typeof text !== "string" || !text.trim()) {
        problems.push(`${slug}: 비트 ${indexRaw} 의 값이 비어 있습니다.`);
        continue;
      }
      if (text.length > BEAT_MAX_LENGTH) {
        problems.push(`${slug}: 비트 ${indexRaw} 가 ${text.length}자로 상한 ${BEAT_MAX_LENGTH}자를 넘습니다.`);
        continue;
      }
      const hit = FORBIDDEN_IN_BEAT.find((token) => text.includes(token));
      if (hit) {
        problems.push(`${slug}: 비트 ${indexRaw} 에 금칙문자(${hit})가 있습니다. 작중 인용은 「 」를 쓰세요.`);
        continue;
      }

      projected[index] = text;
    }

    const projectedKorean = projected.reduce((sum, text) => sum + countKorean(text), 0);
    if (projectedKorean < MIN_KOREAN_PER_EPISODE) {
      problems.push(
        `${slug}: 수정 후 한글 ${projectedKorean.toLocaleString()}자로 색인 임계값 ${MIN_KOREAN_PER_EPISODE.toLocaleString()}자 미만입니다.`,
      );
    }

    if (typeof override.title === "string" && !override.title.trim()) {
      warnings.push(`${slug}: 제목이 공백입니다. 기본 제목이 유지됩니다.`);
    }
  }

  const failed = problems.length > 0 || (strict && warnings.length > 0);

  for (const warning of warnings) console.warn(`[vn-override-safety] 경고 — ${warning}`);
  for (const problem of problems) console.error(`[vn-override-safety] 실패 — ${problem}`);

  if (failed) {
    console.error(`[vn-override-safety] ${problems.length}건의 문제로 검사에 실패했습니다.`);
    process.exit(1);
  }

  console.log(`[vn-override-safety] OK: ${overrideSlugs.length}화 오버라이드가 안전 규칙을 통과했습니다.`);
}

main();
