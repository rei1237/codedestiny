#!/usr/bin/env node
/**
 * 모듈별 로케일 테이블 감사.
 *
 * 이 코드베이스에는 `const X_TEXT_TRANSLATIONS = { ko: {...}, en: {...} }` 패턴이
 * 널리 쓰인다. 문제는 상당수가 **ko 만 채워져 있다**는 것이다. 소비부는 대개
 * `TABLE[lang] || TABLE.ko` 라 로케일을 바꿔도 한국어가 그대로 나온다.
 * 번역 누락이 조용히 한국어 노출로 이어지는 지점이라 별도로 센다.
 *
 * 출력: 테이블별 보유 로케일 / ko 문자열 수 / 누락 로케일.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import {
  walkSourceFiles, parseJs, walkAst, literalValue, flatten, TABLE_NAME_RE,
} from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
/** 이 테이블들이 지원해야 하는 로케일. 셸 런타임 12개 중 경로가 있는 4개가 최소선이다. */
const REQUIRED = ["ko", "en", "ja", "zh-CN"];

const tables = [];
for (const file of walkSourceFiles(rootDir, { extensions: [".js", ".mjs", ".ts", ".tsx", ".jsx"] })) {
  const source = readFileSync(file, "utf8");
  if (!/_TRANSLATIONS|_BY_LOCALE|_LOCALE_COPY|_COPY\b/.test(source)) continue;
  if (!/[가-힣]/.test(source)) continue;
  const ast = parseJs(source);
  if (!ast) continue;
  const rel = relative(rootDir, file).split("\\").join("/");

  walkAst(ast, (node) => {
    if (node.type !== "VariableDeclarator" || node.id?.type !== "Identifier") return;
    const name = node.id.name;
    if (!TABLE_NAME_RE.test(name) && !/_COPY$/.test(name)) return;
    const value = literalValue(node.init);
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (!value.ko || typeof value.ko !== "object") return;

    const locales = Object.keys(value).filter((k) => /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(k));
    const koStrings = Object.values(flatten(value.ko)).filter((v) => typeof v === "string").length;
    const koChars = Object.values(flatten(value.ko))
      .filter((v) => typeof v === "string")
      .join("").match(/[가-힣]/g)?.length || 0;
    tables.push({
      file: rel,
      table: name,
      locales,
      missing: REQUIRED.filter((l) => !locales.includes(l)),
      koStrings,
      koChars,
    });
  });
}

const koOnly = tables.filter((t) => t.locales.length === 1);
const partial = tables.filter((t) => t.locales.length > 1 && t.missing.length);
const complete = tables.filter((t) => !t.missing.length);

const sum = (list, field) => list.reduce((acc, t) => acc + t[field], 0);

console.log(`[locale-tables] 테이블 총           : ${tables.length}`);
console.log(`[locale-tables]   ko 단일           : ${koOnly.length}  (문자열 ${sum(koOnly, "koStrings")} / 한글 ${sum(koOnly, "koChars")}자)`);
console.log(`[locale-tables]   일부 로케일 누락  : ${partial.length}  (문자열 ${sum(partial, "koStrings")})`);
console.log(`[locale-tables]   ko/en/ja/zh 완비  : ${complete.length}`);
console.log("");
console.log("[locale-tables] ko 단일 테이블 상위 20 (한글 문자 기준):");
koOnly.sort((a, b) => b.koChars - a.koChars).slice(0, 20)
  .forEach((t) => console.log(`[locale-tables]   ${String(t.koChars).padStart(6)}자  ${t.table.padEnd(42)} ${t.file}`));

mkdirSync(resolve(rootDir, "reports"), { recursive: true });
writeFileSync(
  resolve(rootDir, "reports", "i18n-locale-tables.json"),
  `${JSON.stringify({
    totals: {
      tables: tables.length,
      koOnly: koOnly.length,
      koOnlyStrings: sum(koOnly, "koStrings"),
      koOnlyChars: sum(koOnly, "koChars"),
      partial: partial.length,
      complete: complete.length,
    },
    tables: tables.sort((a, b) => b.koChars - a.koChars),
  }, null, 2)}\n`,
  "utf8",
);
console.log("[locale-tables] 기록: reports/i18n-locale-tables.json");
