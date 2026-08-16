#!/usr/bin/env node
/**
 * 유명인 사주 **별칭 → 정본** 슬러그 맵 생성기.
 *
 * 왜 필요한가 (2026-08-16 실측):
 *   `lib/famous-saju/celebrity-data.ts:376-381` 이 기록하듯, 예전에는 인물 1명이
 *   `slug + nameKo + nameEn + slugText + 수동별칭` 만큼의 URL 을 만들었다 —
 *   **134명 → 303 URL, `/famous-saju` 와 `/insights/famous-saju` 두 트리라 파일 606개.**
 *   별칭 페이지는 본문이 정본과 100% 동일한 사본이었고 전부 noindex 였다.
 *
 *   2026-06-04 `9396dc8ce` 가 정본만 프리렌더하도록 고쳤다. 좋은 변경이었지만 **구 URL 을
 *   회수하지 않았다**:
 *     - `/insights/famous-saju/<별칭>/`  → 404 (169개)
 *     - `/famous-saju/<별칭>/`           → 301 → 그 404 로 (리다이렉트 체인이 죽은 곳으로 간다)
 *   네이버가 보고한 "동일 제목 1.9천 / meta robots 색인 제외 7.4백" 은 606개 사본을 크롤하던
 *   시절의 누적 데이터이고, 위 404 는 지금도 남아 있다.
 *
 * 🔴 손으로 쓴 목록을 만들지 않는다(CLAUDE.md 원칙 10). 정본 `celebrity-data.ts` 에서 전수
 *    파생하고, 파생 결과가 비면 실패한다. 별칭이 정본 슬러그와 충돌해도 실패한다 —
 *    그러면 살아 있는 상세 페이지를 리다이렉트로 덮어쓰게 된다.
 *
 * 출력: public/famous-saju-aliases.json  ({ "<별칭>": "<정본>" })
 * 소비: public/_worker.js (env.ASSETS 로 읽어 301)
 * 검사: scripts/verify-redirects-budget.mjs 가 재생성해 커밋된 파일과 대조한다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const SOURCE = "lib/famous-saju/celebrity-data.ts";
const OUTPUT = "public/famous-saju-aliases.json";

// celebrity-data.ts 의 normalizeCelebrityLookupKey(:248-259) 와 같은 규칙이어야 한다.
// 이 스크립트는 .ts 를 import 할 수 없어(순수 Node ESM) 규칙을 복제하며, 아래
// assertNormalizerMatchesSource() 가 원본과 어긋나면 실패시킨다.
export function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function assertNormalizerMatchesSource(source) {
  const body = source.slice(source.indexOf("export function normalizeCelebrityLookupKey"));
  const expected = ['.normalize("NFKC")', ".toLowerCase()", "[^\\p{Letter}\\p{Number}]+", "/^-+|-+$/g"];
  const missing = expected.filter((token) => !body.slice(0, 600).includes(token));
  if (missing.length > 0) {
    throw new Error(
      `[famous-aliases] ${SOURCE} 의 normalizeCelebrityLookupKey 가 바뀌었다(누락: ${missing.join(", ")}). `
        + "이 스크립트의 normalizeLookupKey 를 같이 고칠 것 — 어긋나면 별칭이 엉뚱한 URL 로 나간다.",
    );
  }
}

export function buildAliasMap(source) {
  assertNormalizerMatchesSource(source);

  const extrasBlock = source.slice(source.indexOf("const extraAliasesBySlug"), source.indexOf("function uniqueText"));
  const extras = {};
  for (const match of extrasBlock.matchAll(/^\s*"?([a-zA-Z0-9-]+)"?:\s*\[([^\]]*)\]/gm)) {
    extras[match[1]] = [...match[2].matchAll(/"([^"]*)"/g)].map((entry) => entry[1]);
  }

  const seedBlock = source.slice(source.indexOf("const rawSeeds"), source.indexOf("const famousSajuOverrides"));
  const seeds = [];
  for (const line of seedBlock.split("\n")) {
    const head = line.match(/^\s*\["([^"]+)",\s*"([^"]+)"/);
    if (!head) continue;
    const quoted = [...line.matchAll(/"([^"]*)"/g)].map((entry) => entry[1]);
    const tail = quoted[quoted.length - 1];
    // 튜플 8번째(nameEn)는 선택이고 라틴 문자만 쓴다. 태그(한국어)와 구분하는 유일한 신호다.
    const nameEn = tail && /^[A-Za-z][A-Za-z .'-]*$/.test(tail) ? tail : undefined;
    seeds.push({ slug: head[1], nameKo: head[2], nameEn });
  }

  if (seeds.length === 0) throw new Error(`[famous-aliases] ${SOURCE} 에서 시드를 하나도 읽지 못했다 — 파서가 깨졌다.`);

  const canonical = new Set(seeds.map((seed) => seed.slug));
  const map = {};
  for (const seed of seeds) {
    const candidates = [seed.nameKo, seed.nameEn, seed.slug.replace(/-/g, " "), ...(extras[seed.slug] || [])];
    for (const candidate of candidates) {
      const key = normalizeLookupKey(candidate);
      if (!key || canonical.has(key)) continue;
      if (map[key] && map[key] !== seed.slug) {
        throw new Error(`[famous-aliases] 별칭 "${key}" 가 ${map[key]} 와 ${seed.slug} 두 인물에 걸린다 — 어느 쪽으로 보낼지 결정할 수 없다.`);
      }
      map[key] = seed.slug;
    }
  }

  if (Object.keys(map).length === 0) {
    throw new Error("[famous-aliases] 별칭이 0개다 — 대상이 없는 생성기는 조용히 통과하면 안 된다.");
  }

  return { seeds: seeds.length, map: Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1))) };
}

export function readSource(dir = rootDir) {
  return readFileSync(resolve(dir, SOURCE), "utf8");
}

export function serialize(map) {
  return `${JSON.stringify(map, null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("generate-famous-saju-aliases.mjs")) {
  const { seeds, map } = buildAliasMap(readSource());
  writeFileSync(resolve(rootDir, OUTPUT), serialize(map), "utf8");
  console.log(`[famous-aliases] 인물 ${seeds}명 → 별칭 ${Object.keys(map).length}개 → ${OUTPUT}`);
}
