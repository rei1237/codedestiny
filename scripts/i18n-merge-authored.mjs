#!/usr/bin/env node
/**
 * 손으로 쓴 번역을 로케일 사전에 병합한다.
 *
 * 왜 이 모양인가: 11개 로케일 파일을 각각 통째로 쓰면 한 번에 다 끝내야 하고
 * 중간에 멈추면 어디까지 했는지 알 수 없다. 그래서 저작 단위를
 * `i18n/authored/<네임스페이스>-<번호>.json` 으로 쪼개고, 한 파일 안에 **키별로
 * 11개 언어를 나란히** 둔다. 원문 옆에 번역을 놓고 쓰기 때문에 용어 일관성이
 * 유지되고, 청크 단위로 커밋하면 진척이 그대로 남는다.
 *
 * 저작 파일 형식:
 *   { "shellRuntime.s0": { "ko": "…", "en": "…", "ja": "…", … } }
 *
 * 사용법:
 *   node scripts/i18n-merge-authored.mjs                 전체 병합
 *   node scripts/i18n-merge-authored.mjs --namespace ns  해당 네임스페이스만
 *   node scripts/i18n-merge-authored.mjs --core          코어 사전(public/i18n/<lang>.json)으로
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const authoredDir = resolve(rootDir, "i18n", "authored");

const args = process.argv.slice(2);
const toCore = args.includes("--core");
const nsFilter = (() => {
  const i = args.indexOf("--namespace");
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
})();

/** 런타임 로케일 → public/i18n 파일 basename. dictionary.ts 의 DICTIONARY_FILE 과 같은 표다. */
const FILE_BY_LOCALE = {
  ko: "ko", en: "en", ja: "ja", "zh-CN": "zh-cn", "zh-TW": "zh-tw",
  vi: "vi", hi: "hi", es: "es", fr: "fr", de: "de", nl: "nl", ms: "ms",
};
const LOCALES = Object.keys(FILE_BY_LOCALE);

if (!existsSync(authoredDir)) {
  console.error("[merge-authored] i18n/authored 가 없습니다.");
  process.exit(1);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof node[key] !== "object" || node[key] === null || Array.isArray(node[key])) node[key] = {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}

// 저작 파일 수집: <namespace>-<번호>.json
const files = readdirSync(authoredDir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !nsFilter || f.startsWith(`${nsFilter}-`))
  .sort();

if (!files.length) {
  console.error(`[merge-authored] 대상 저작 파일이 없습니다${nsFilter ? ` (namespace=${nsFilter})` : ""}.`);
  process.exit(1);
}

/** namespace → { locale → { key → value } } */
const byNamespace = {};
const problems = [];
let entryCount = 0;

for (const file of files) {
  const namespace = file.replace(/-\d+\.json$/, "");
  const authored = JSON.parse(readFileSync(join(authoredDir, file), "utf8"));
  for (const [key, translations] of Object.entries(authored)) {
    if (key.startsWith("_")) continue;
    entryCount += 1;
    const missing = LOCALES.filter((l) => typeof translations[l] !== "string" || !translations[l].trim());
    if (missing.length) { problems.push(`${file} ${key}: 누락 ${missing.join(",")}`); continue; }
    // 비-ko 로케일에 한글이 남아 있으면 번역이 안 된 것이다
    const leftover = LOCALES.filter((l) => l !== "ko" && /[가-힣]/.test(translations[l]));
    if (leftover.length) { problems.push(`${file} ${key}: 한글 잔존 ${leftover.join(",")}`); continue; }
    byNamespace[namespace] ||= {};
    for (const locale of LOCALES) {
      (byNamespace[namespace][locale] ||= {})[key] = translations[locale];
    }
  }
}

if (problems.length) {
  console.error(`[merge-authored] FAILED: ${problems.length}건`);
  problems.slice(0, 20).forEach((p) => console.error(`- ${p}`));
  process.exit(1);
}

let written = 0;
for (const [namespace, byLocale] of Object.entries(byNamespace)) {
  for (const locale of LOCALES) {
    const base = FILE_BY_LOCALE[locale];
    const target = toCore
      ? join(i18nDir, `${base}.json`)
      : join(join(i18nDir, base), `${namespace}.json`);
    if (!toCore) mkdirSync(join(i18nDir, base), { recursive: true });
    const current = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
    for (const [key, value] of Object.entries(byLocale[locale])) setDeep(current, key, value);
    writeFileSync(target, `${JSON.stringify(current, null, 2)}\n`, "utf8");
    written += 1;
  }
  console.log(`[merge-authored] ${namespace}: ${Object.keys(byLocale.ko).length}키 × ${LOCALES.length}로케일`);
}

console.log(`[merge-authored] 저작 파일 ${files.length}개 / 항목 ${entryCount}개 → 사전 ${written}개 갱신`);
