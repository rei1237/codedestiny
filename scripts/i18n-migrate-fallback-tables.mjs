#!/usr/bin/env node
/**
 * `TABLE[lang] || TABLE.ko` 구조를 사전으로 이관한다.
 *
 * 문제: 모듈마다 자체 로케일 테이블을 두고 `TABLE[lang] || TABLE.ko` 로 읽는다.
 * 로케일이 비면 조용히 한국어가 나오는 통로이고, 사전과 별개의 키 체계라
 * 게이트로 관리되지 않는다.
 *
 * 이관 방식: 테이블의 ko 문자열을 `moduleCopy.<모듈>.<키>` 로 사전에 옮기고,
 * 접근자를 window.cdTranslate 조회로 바꾼 뒤 **테이블 상수와 fallback 표현을 함께
 * 지운다**. 상수를 남겨 두면 게이트가 계속 세고, 두 벌의 원문이 갈라진다.
 *
 * 브라우저에서 도는 js/ 만 대상이다. 서버 파일(lib/·app/api/)은 요청 로케일 전달
 * 설계가 선행돼야 해서 건드리지 않는다.
 *
 * 사용법:
 *   node scripts/i18n-migrate-fallback-tables.mjs --probe   대상·추출 결과만 보고
 *   node scripts/i18n-migrate-fallback-tables.mjs           소스 수정 + pending 기록
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { walkSourceFiles, parseJs, walkAst, literalValue, flatten, TABLE_NAME_RE } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const probeOnly = process.argv.includes("--probe");

/** 모듈 파일 → 사전 네임스페이스 조각. 키가 짧고 읽히도록 손으로 정한다. */
const MODULE_SLUG = {
  "js/entertain-engine.js": "entertain",
  "js/tarot-love-experience.js": "tarotLove",
  "js/dream-ledger.js": "dreamLedger",
  "js/animal-totem-experience.js": "animalTotem",
  "js/core/index-inline-runtime.js": "indexRuntime2",
  "js/psycho-dream-analyzer-freuds-study.js": "psychoDream",
  "js/oracle-kcg.js": "kemetOracle",
  "js/iching-engine.js": "iching",
  "js/compat-llm-prompts.js": "compatPrompt",
  "js/fate-scroll-reveal.js": "fateScrollReveal",
  "js/fate-scroll-top.js": "fateScrollTop",
  "js/share-reward.js": "shareReward",
  "js/services/sajuWorkerServiceAdvanced.js": "sajuWorkerAdvanced",
  "js/mobile-interaction-patch.js": "mobilePatch",
};

const FALLBACK_RE = [/\?\?\s*[A-Za-z_$][\w$.]*\.ko\b/, /\|\|\s*[A-Za-z_$][\w$.]*\.ko\b/];

const TARGET_LOCALES = ["en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];

/** 모듈 테이블은 `zh`·`zh_CN` 처럼 제각각이라 사전 로케일 코드로 맞춘다. */
function normalizeLocale(raw) {
  const lower = String(raw).replace("_", "-").toLowerCase();
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant") return "zh-TW";
  return TARGET_LOCALES.find((l) => l.toLowerCase() === lower) || raw;
}

const extracted = {};
const skeleton = {};
const touched = [];

for (const file of walkSourceFiles(rootDir, { extensions: [".js"] })) {
  const rel = relative(rootDir, file).split("\\").join("/");
  const slug = MODULE_SLUG[rel];
  if (!slug) continue;
  const source = readFileSync(file, "utf8");
  if (!FALLBACK_RE.some((re) => re.test(source))) continue;
  const ast = parseJs(source);
  if (!ast) continue;

  const tables = [];
  walkAst(ast, (node) => {
    if (node.type !== "VariableDeclarator" || node.id?.type !== "Identifier") return;
    if (!TABLE_NAME_RE.test(node.id.name) && !/_COPY$/.test(node.id.name)) return;
    const value = literalValue(node.init);
    if (!value?.ko || typeof value.ko !== "object") return;
    tables.push({ name: node.id.name, locales: value });
  });
  if (!tables.length) continue;

  let keys = 0;
  for (const table of tables) {
    const flatByLocale = {};
    for (const [locale, tree] of Object.entries(table.locales)) {
      if (!tree || typeof tree !== "object") continue;
      flatByLocale[normalizeLocale(locale)] = flatten(tree);
    }
    for (const [key, value] of Object.entries(flatByLocale.ko || {})) {
      if (typeof value !== "string" || !value.trim()) continue;
      const fullKey = `moduleCopy.${slug}.${key}`;
      extracted[fullKey] = value;
      // 🔴 이미 있는 번역은 수확한다. 버리고 다시 쓰면 기존 검수 결과가 사라지고
      // 같은 문구가 화면마다 달라진다.
      const harvested = { ko: value };
      for (const locale of TARGET_LOCALES) {
        const existing = flatByLocale[locale]?.[key];
        if (typeof existing === "string" && existing.trim() && !/[가-힣]/.test(existing)) {
          harvested[locale] = existing;
        }
      }
      skeleton[fullKey] = harvested;
      keys += 1;
    }
  }
  touched.push({ file: rel, slug, tables: tables.map((t) => t.name), keys });
}

const chars = Object.values(extracted).join("").match(/[가-힣]/g)?.length || 0;
console.log(`[migrate-fallback] 대상 모듈 ${touched.length}개 / 키 ${Object.keys(extracted).length}개 / 한글 ${chars}자`);
touched.forEach((t) => console.log(`[migrate-fallback]   ${String(t.keys).padStart(4)}  ${t.slug.padEnd(20)} ${t.file}`));

if (probeOnly) {
  console.log("[migrate-fallback] --probe: 파일을 기록하지 않았습니다.");
  process.exit(0);
}

mkdirSync(resolve(rootDir, "i18n", "pending"), { recursive: true });
writeFileSync(
  resolve(rootDir, "i18n", "pending", "moduleCopy.ko.json"),
  `${JSON.stringify(extracted, null, 2)}\n`,
  "utf8",
);

// 기존 번역을 채운 저작 골격. 비어 있는 로케일만 손으로 메우면 된다.
mkdirSync(resolve(rootDir, "i18n", "authored"), { recursive: true });
writeFileSync(
  resolve(rootDir, "i18n", "authored", "_moduleCopy-skeleton.json"),
  `${JSON.stringify(skeleton, null, 2)}\n`,
  "utf8",
);

const gaps = {};
for (const value of Object.values(skeleton)) {
  for (const locale of TARGET_LOCALES) if (!value[locale]) gaps[locale] = (gaps[locale] || 0) + 1;
}
console.log("[migrate-fallback] 기존 번역 수확 후 남은 결손:");
for (const locale of TARGET_LOCALES) console.log(`[migrate-fallback]   ${locale.padEnd(6)} ${gaps[locale] || 0}`);
console.log("[migrate-fallback] i18n/pending/moduleCopy.ko.json + i18n/authored/_moduleCopy-skeleton.json 기록");
