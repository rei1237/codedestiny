#!/usr/bin/env node
/**
 * 모듈 로케일 테이블 접근자를 사전 조회로 배선한다.
 *
 * 문제: 이 코드베이스에는
 *     function _xText(key) { return X_TEXT_TRANSLATIONS.ko[key] || "Translation pending"; }
 * 형태의 접근자가 90곳 있다. 한국어 원문을 테이블로 뽑아 두기만 했지 **사전을 전혀
 * 조회하지 않아서**, 사용자가 어떤 언어를 골라도 이 구간은 한국어로 렌더된다.
 * 키는 이미 "sibyl.title.001" 처럼 정규화돼 있어 사전에 그대로 넣을 수 있다.
 *
 * 이 스크립트는 접근자 본문만 바꿔 window.cdTranslate 를 먼저 보게 한다.
 * ko 는 cdTranslate 가 fallback(=테이블의 한국어 원문)을 돌려주므로 동작이 불변이고,
 * 나머지 로케일은 사전 번역이 나온다. window 가 없는 실행 맥락(서버·워커)에서는
 * 예전과 똑같이 테이블의 한국어를 쓴다.
 *
 * 대상은 브라우저에서 도는 js/ 만. 서버 파일은 요청 로케일을 알아야 해서 별건이다.
 *
 * 사용법:
 *   node scripts/i18n-wire-table-accessors.mjs --probe
 *   node scripts/i18n-wire-table-accessors.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { walkSourceFiles } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const probeOnly = process.argv.includes("--probe");

/** `function NAME(key) { return TABLE.ko[key] || "..."; }` */
const ACCESSOR_RE =
  /function\s+([A-Za-z_$][\w$]*)\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+([A-Z_][A-Z0-9_]*)\.ko\[\2\]\s*\|\|\s*(['"])([^'"]*)\4\s*;?\s*\}/g;

function rewrite(name, param, table, quote, fallbackText) {
  return [
    `function ${name}(${param}) {`,
    `  var ko = ${table}.ko[${param}] || ${quote}${quote};`,
    `  try {`,
    `    if (typeof window !== ${quote}undefined${quote} && window && typeof window.cdTranslate === ${quote}function${quote}) {`,
    `      return window.cdTranslate(${param}, {}, ko);`,
    `    }`,
    `  } catch (_) {}`,
    `  return ko || ${quote}${fallbackText}${quote};`,
    `}`,
  ].join("\n");
}

const touched = [];
for (const file of walkSourceFiles(rootDir, { extensions: [".js"] })) {
  const rel = relative(rootDir, file).split("\\").join("/");
  if (!rel.startsWith("js/")) continue;
  const source = readFileSync(file, "utf8");
  ACCESSOR_RE.lastIndex = 0;
  if (!ACCESSOR_RE.test(source)) continue;

  ACCESSOR_RE.lastIndex = 0;
  const names = [];
  const next = source.replace(ACCESSOR_RE, (_match, name, param, table, quote, fallbackText) => {
    names.push(name);
    return rewrite(name, param, table, quote, fallbackText);
  });
  touched.push({ file: rel, accessors: names });
  if (!probeOnly) writeFileSync(file, next, "utf8");
}

console.log(`[wire-accessors] 배선 대상 파일: ${touched.length}`);
touched.forEach((t) => console.log(`[wire-accessors]   ${t.file}  →  ${t.accessors.join(", ")}`));
if (probeOnly) console.log("[wire-accessors] --probe: 파일을 수정하지 않았습니다.");
