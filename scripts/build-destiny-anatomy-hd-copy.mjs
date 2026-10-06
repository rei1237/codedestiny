#!/usr/bin/env node
// 운명 구조도(정적 셸)가 쓰는 휴먼 디자인 문구를 HD 화면 정본에서 생성한다.
//
// 🔴 HD 해석을 새로 쓰지 않는다. 정본은 app/human-design/_copy/index.ts(TYPE·AUTHORITY·CENTER_COPY)와
//    lib/human-design/display-names.js(STRATEGY·DEFINITION 이름)다. 정적 셸은 TS 를 못 읽으니 classic script 로 옮긴다.
//    --check 는 생성물이 정본과 어긋나면 실패한다(verify:destiny-anatomy 가 부른다).
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "js/core/saju/destiny-anatomy/hd-copy.generated.js");
const LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW"];

async function loadCopy() {
  const result = await build({
    stdin: {
      contents: 'export { TYPE_COPY, AUTHORITY_COPY, CENTER_COPY, STRATEGY_COPY, DEFINITION_COPY } from "./app/human-design/_copy/index.ts";',
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    alias: { "@": root },
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

function bilingual(entry, label) {
  const out = {};
  for (const locale of LOCALES) {
    const text = entry && entry[locale];
    if (typeof text !== "string" || !text.trim()) throw new Error(`${label}: ${locale} 문구가 비어 있다`);
    out[locale] = text;
  }
  return out;
}

function mapEntries(source, pickFields, label) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, pickFields(value, `${label}.${key}`)]));
}

export async function renderHdCopy() {
  const m = await loadCopy();
  const data = {
    type: mapEntries(m.TYPE_COPY, (v, l) => ({ name: bilingual(v.name, `${l}.name`), summary: bilingual(v.summary, `${l}.summary`) }), "TYPE_COPY"),
    authority: mapEntries(m.AUTHORITY_COPY, (v, l) => ({ name: bilingual(v.name, `${l}.name`), summary: bilingual(v.summary, `${l}.summary`) }), "AUTHORITY_COPY"),
    center: mapEntries(m.CENTER_COPY, (v, l) => ({ name: bilingual(v.name, `${l}.name`), role: bilingual(v.role, `${l}.role`) }), "CENTER_COPY"),
    strategy: mapEntries(m.STRATEGY_COPY, (v, l) => bilingual(v, l), "STRATEGY_COPY"),
    definition: mapEntries(m.DEFINITION_COPY, (v, l) => bilingual(v, l), "DEFINITION_COPY"),
  };
  return [
    "/* 자동 생성 — 직접 고치지 말 것. node scripts/build-destiny-anatomy-hd-copy.mjs",
    " * 정본: app/human-design/_copy/index.ts · lib/human-design/display-names.js (verify:destiny-anatomy 가 신선도를 검사한다). */",
    "(function (root) {",
    "  'use strict';",
    `  var HD_COPY = ${JSON.stringify(data, null, 2).replace(/\n/g, "\n  ")};`,
    "  root.DestinyAnatomyHdCopy = HD_COPY;",
    "  if (typeof module !== 'undefined' && module.exports) module.exports = HD_COPY;",
    "})(typeof window === 'undefined' ? globalThis : window);",
    "",
  ].join("\n");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const next = await renderHdCopy();
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(OUT, "utf8").replace(/\r\n/g, "\n"); } catch { current = ""; }
    if (current !== next) {
      console.error("[destiny-anatomy] hd-copy.generated.js 가 HD 정본과 다르다 — node scripts/build-destiny-anatomy-hd-copy.mjs 로 다시 생성할 것");
      process.exit(1);
    }
    console.log("[destiny-anatomy] hd-copy.generated.js 최신");
  } else {
    writeFileSync(OUT, next);
    console.log(`[destiny-anatomy] wrote ${path.relative(root, OUT)}`);
  }
}
