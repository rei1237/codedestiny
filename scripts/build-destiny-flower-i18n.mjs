#!/usr/bin/env node
/**
 * 운명의 꽃 서버 번역 사전 생성기.
 *
 *   node scripts/build-destiny-flower-i18n.mjs [--check]
 *
 * 매칭은 워커에서만 돈다(2026-08-24). 엔진이 내는 꽃 이름·꽃말·근거 문장은 워커가 번역해야
 * 하는데 워커에는 `public/i18n/*.json` 이 없다. 그래서 각 로케일 사전의 `fortune.destinyFlower`
 * 하위 트리(UI 문구 `ui` 는 브라우저가 직접 읽으므로 뺀다)를 ESM 모듈로 묶어 워커에 싣는다.
 *
 * 산출물: worker/lib/destiny-flower-i18n.generated.js
 * --check: 다시 생성해 바이트 비교한다. `npm run i18n:check` 가 돌린다 —
 * 사전을 고치고 이 스크립트를 안 돌리면 서버만 옛 문구를 내는 일을 막는다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "worker/lib/destiny-flower-i18n.generated.js");
/** 로케일 코드 → public/i18n 파일 basename. ko 는 엔진의 한국어 원문이 곧 사전이라 싣지 않는다. */
const FILE_BY_LANG = {
  en: "en", ja: "ja", "zh-CN": "zh-cn", "zh-TW": "zh-tw", vi: "vi", hi: "hi",
  es: "es", fr: "fr", de: "de", nl: "nl", ms: "ms",
};

function build() {
  const dictionaries = {};
  for (const [lang, file] of Object.entries(FILE_BY_LANG)) {
    const dict = JSON.parse(readFileSync(join(ROOT, "public/i18n", `${file}.json`), "utf8"));
    const subtree = dict?.fortune?.destinyFlower;
    if (!subtree || typeof subtree !== "object") throw new Error(`[build-destiny-flower-i18n] ${file}.json 에 fortune.destinyFlower 가 없다`);
    const { ui: _ui, ...serverSide } = subtree;
    dictionaries[lang] = serverSide;
  }
  return [
    "// 🔴 생성 파일 — 손으로 고치지 말 것.",
    "// 생성: node scripts/build-destiny-flower-i18n.mjs (원본: public/i18n/*.json 의 fortune.destinyFlower, ui 제외)",
    "// 검사: npm run i18n:check (다시 생성해 바이트 비교한다)",
    `export const DESTINY_FLOWER_SERVER_DICTIONARIES = Object.freeze(${JSON.stringify(dictionaries)});`,
    "",
  ].join("\n");
}

const next = build();
if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch (_) { /* 없으면 낡은 것으로 본다 */ }
  if (current !== next) {
    console.error("[build-destiny-flower-i18n] 서버 사전이 낡았다. node scripts/build-destiny-flower-i18n.mjs 를 돌릴 것.");
    process.exit(1);
  }
  console.log("[build-destiny-flower-i18n] 최신");
} else {
  writeFileSync(OUT, next);
  console.log(`[build-destiny-flower-i18n] 생성 완료 — ${Object.keys(FILE_BY_LANG).length}개 로케일, ${(Buffer.byteLength(next) / 1024).toFixed(0)}KB`);
}
