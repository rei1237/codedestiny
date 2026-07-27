#!/usr/bin/env node
/**
 * 컴포넌트 로케일 테이블의 커버리지 게이트.
 *
 * `TABLE[locale] || TABLE.ko` 로 읽는 카피 테이블이 지원 로케일을 다 갖췄는지 본다.
 * 빠진 로케일이 있으면 그 언어 사용자에게 **한국어가 그대로 나간다**. 결제·포인트·
 * 로그인처럼 실수가 비싼 화면에 이 패턴이 몰려 있어서 따로 센다.
 *
 * 왜 사전으로 옮기지 않고 표를 채우는가: 이 표들은 React 클라이언트 컴포넌트가
 * **동기적으로** 읽는다. 사전(useT)은 비동기 로드라 첫 렌더가 빈다 — 결제 화면에서
 * 그건 번역 누락보다 나쁜 회귀다. 표를 12개 로케일로 채우면 조회가 빌 수 없고,
 * 그때 `|| TABLE.ko` 를 지워도 안전하다.
 *
 * 사용법:
 *   node scripts/verify-locale-table-coverage.mjs            검사(기준선 대비)
 *   node scripts/verify-locale-table-coverage.mjs --update   기준선 갱신(감소분만)
 *   node scripts/verify-locale-table-coverage.mjs --list     결손 테이블 전체 출력
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "@babel/parser";
import { walkSourceFiles, walkAst, flatten } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const baselinePath = resolve(rootDir, "i18n", "locale-table-baseline.json");
const shouldUpdate = process.argv.includes("--update");
const showList = process.argv.includes("--list");

const REQUIRED = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];
const FALLBACK_RE = [/\?\?\s*[A-Za-z_$][\w$.]*\.ko\b/g, /\|\|\s*[A-Za-z_$][\w$.]*\.ko\b/g];

/** AST 노드를 순수 값으로. TS 래핑(as const 등)은 벗겨서 본다. */
function literal(node) {
  if (!node) return undefined;
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") return literal(node.expression);
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0].value.cooked;
  if (node.type === "ArrayExpression") {
    const items = node.elements.map(literal);
    return items.some((v) => v === undefined) ? undefined : items;
  }
  if (node.type === "ObjectExpression") {
    const out = {};
    for (const prop of node.properties) {
      if (prop.type !== "ObjectProperty" || prop.computed) continue;
      const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
      const value = literal(prop.value);
      if (value !== undefined) out[String(key)] = value;
    }
    return out;
  }
  return undefined;
}

const gaps = [];
/** 로케일 키는 있으나 값이 영어 복제인 경우. 한국어 누출은 아니지만 미번역이다. */
const englishPlaceholders = [];
let tableCount = 0;

for (const file of walkSourceFiles(rootDir, { extensions: [".ts", ".tsx", ".jsx", ".js", ".mjs"] })) {
  const rel = relative(rootDir, file).split("\\").join("/");
  if (rel.startsWith("scripts/")) continue;
  const source = readFileSync(file, "utf8");
  if (!FALLBACK_RE.some((re) => { re.lastIndex = 0; return re.test(source); })) continue;

  let ast;
  try {
    ast = parse(source, {
      sourceType: "unambiguous",
      errorRecovery: true,
      plugins: [/\.tsx?$/.test(rel) ? "typescript" : "flow", "jsx"],
    });
  } catch { continue; }

  // 이 파일에서 실제로 `|| X.ko` 로 쓰이는 테이블 이름만 본다
  const names = new Set();
  for (const re of FALLBACK_RE) {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) names.add(m[0].replace(/^(\?\?|\|\|)\s*/, "").replace(/\.ko$/, ""));
  }

  walkAst(ast.program, (node) => {
    if (node.type !== "VariableDeclarator" || node.id?.type !== "Identifier") return;
    if (!names.has(node.id.name)) return;
    const value = literal(node.init);
    if (!value || typeof value !== "object" || !value.ko) return;
    tableCount += 1;
    const table = node.id.name;

    // 🔴 선언 뒤에 명령형으로 채우는 경우가 있다.
    //   POINTS_PAGE_COPY["zh-CN"] = { ...POINTS_PAGE_COPY.en, … }
    //   for (const l of [...]) POINTS_PAGE_COPY[l] = POINTS_PAGE_COPY.en
    // 선언만 보면 "로케일 없음" 으로 오판한다. 실제로는 값이 들어가 있고,
    // 문제는 그 값이 **영어 복제**라는 것 — 한국어 누출과는 성격이 다르다.
    const filledDirect = new Set(
      [...source.matchAll(new RegExp(`${table}\\[\\s*["']([\\w-]+)["']\\s*\\]\\s*=`, "g"))].map((m) => m[1]),
    );
    const englishCloneLocales = new Set();
    for (const m of source.matchAll(new RegExp(`for\\s*\\([^)]*of\\s*(\\[[^\\]]+\\])[^)]*\\)[\\s\\S]{0,120}?${table}\\[[\\w]+\\]\\s*=\\s*${table}\\.en`, "g"))) {
      for (const loc of m[1].matchAll(/["']([\w-]+)["']/g)) englishCloneLocales.add(loc[1]);
    }
    // `TABLE["x"] = { ...TABLE.en, …}` 도 사실상 영어 기반이지만 개별 덮어쓰기가 있으므로
    // 완전한 영어 복제로는 세지 않는다.

    const have = new Set([
      ...Object.keys(value).filter((k) => /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(k)),
      ...filledDirect,
      ...englishCloneLocales,
    ]);
    const missing = REQUIRED.filter((l) => !have.has(l));
    const koStrings = Object.values(flatten(value.ko)).filter((v) => typeof v === "string");
    const englishOnly = REQUIRED.filter((l) => englishCloneLocales.has(l));

    if (englishOnly.length) {
      englishPlaceholders.push({ file: rel, table, locales: englishOnly, keys: koStrings.length });
    }
    if (!missing.length) return;
    gaps.push({
      file: rel,
      table,
      missing,
      keys: koStrings.length,
      pending: koStrings.length * missing.length,
    });
  });
}

gaps.sort((a, b) => b.pending - a.pending);
const totalPending = gaps.reduce((sum, g) => sum + g.pending, 0);

console.log(`[locale-table] fallback 테이블 ${tableCount}개 중 결손 ${gaps.length}개`);
console.log(`[locale-table] 🔴 한국어 누출 위험(로케일 부재) 번역 ${totalPending}건`);
if (englishPlaceholders.length) {
  const enPending = englishPlaceholders.reduce((s, p) => s + p.keys * p.locales.length, 0);
  console.log(`[locale-table] ⚠️  영어 자리표시자(= TABLE.en) ${englishPlaceholders.length}개 테이블 / ${enPending}건`);
  console.log("[locale-table]    한국어가 아니라 영어가 나간다 — 누출은 아니지만 미번역이다.");
  englishPlaceholders.forEach((p) =>
    console.log(`[locale-table]      ${p.table.slice(0, 32).padEnd(34)} ${p.locales.join(",")}  (${p.file})`));
}
(showList ? gaps : gaps.slice(0, 12)).forEach((g) => {
  console.log(`[locale-table]   ${String(g.pending).padStart(5)}  ${g.table.slice(0, 36).padEnd(38)} ${g.file}`);
});

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;
if (baseline) {
  const delta = totalPending - baseline.totalPending;
  console.log(`[locale-table] 기준선 ${baseline.totalPending}${delta > 0 ? ` 🔴 +${delta}` : delta < 0 ? ` ✅ ${delta}` : ""}`);
  if (delta > 0) {
    console.error("[locale-table] FAILED — 로케일 결손이 늘었습니다.");
    console.error("새 카피 테이블은 12개 로케일을 모두 채우세요. 빠진 로케일은 사용자에게 한국어로 나갑니다.");
    process.exit(1);
  }
}

if (shouldUpdate) {
  mkdirSync(resolve(rootDir, "i18n"), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify({ totalPending, tables: gaps.length }, null, 2)}\n`, "utf8");
  console.log("[locale-table] 기준선 갱신");
}

console.log("[locale-table] OK");
