// 바닐라 셸(js/*.js) 안에 있는 해설 표를 관리자 CMS 가 읽을 수 있는 JSON 으로 추출한다.
//
// 왜 필요한가: 숙요 27수 해설·자미두수 기본 명반 해설은 1MB 가 넘는 브라우저 전용 스크립트에
// `var X = { ... }` 전역으로 들어 있다. React 관리자 화면은 이걸 import 할 수 없어서,
// 편집기에 "지금 코드에 들어 있는 값"을 보여줄 방법이 없었다.
//
// 원본이 authoritative source 이고 이 산출물은 파생물이다(라이트 노벨 파이프라인과 같은 관계).
// 추출은 정규식 스크래핑이 아니라 괄호 균형으로 잘라 vm 에서 평가한다 — 객체 리터럴이
// 홑따옴표·비인용 키를 쓰는 순수 JS 라 JSON.parse 가 통하지 않기 때문이다.
//
// 사용: node scripts/build-shell-cms-defaults.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";

const rootDir = process.cwd();
const OUTPUT_PATH = resolve(rootDir, "lib", "cms", "shell-defaults.generated.json");

const SOURCES = [
  {
    file: "js/saju-engine-tarot-sukuyo-quantum.js",
    tables: [{ variable: "SY_MANSION_PROFILE_OVERRIDES", ns: "sukuyo-mansion", key: "mansion" }],
  },
  {
    file: "js/saju-engine.js",
    tables: [
      { variable: "ZW_STAR_CORE_PROFILE", ns: "ziwei-basic", key: "star" },
      { variable: "ZW_GUNG_DEF", ns: "ziwei-basic", key: "palace-def" },
      { variable: "ZW_GUNG_BRIEF", ns: "ziwei-basic", key: "palace-brief" },
    ],
  },
];

/** 문자열 이스케이프를 존중하며 여는 중괄호와 짝이 맞는 위치를 찾는다. */
function findBalancedEnd(source, openIndex) {
  let depth = 1;
  let cursor = openIndex + 1;
  let quote = null;

  while (cursor < source.length && depth > 0) {
    const ch = source[cursor];
    if (quote) {
      if (ch === "\\") { cursor += 2; continue; }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{" || ch === "[") {
      depth += 1;
    } else if (ch === "}" || ch === "]") {
      depth -= 1;
    }
    cursor += 1;
  }

  if (depth !== 0) throw new Error(`unbalanced braces from ${openIndex}`);
  return cursor - 1;
}

function extractTable(source, variable) {
  const marker = new RegExp(`(?:^|\\n)\\s*(?:var|const|let)\\s+${variable}\\s*=\\s*\\{`);
  const match = marker.exec(source);
  if (!match) throw new Error(`${variable} 선언을 찾지 못했습니다.`);

  const openIndex = source.indexOf("{", match.index);
  const endIndex = findBalancedEnd(source, openIndex);
  const literal = source.slice(openIndex, endIndex + 1);

  // 우리 소스의 순수 데이터 리터럴만 평가한다. 전역 없는 컨텍스트라 부수효과가 생길 수 없다.
  return runInNewContext(`(${literal})`, Object.create(null), { timeout: 5000 });
}

/** 편집기 형식(`{ 키: { 필드: 문장 } }`)으로 정규화. 값이 한 줄이면 { text } 로 승격한다. */
function toEditableTable(raw) {
  const table = {};

  for (const [recordKey, row] of Object.entries(raw || {})) {
    if (typeof row === "string") {
      if (row.trim()) table[recordKey] = { text: row };
      continue;
    }
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;

    const cleaned = {};
    for (const [field, value] of Object.entries(row)) {
      if (typeof value === "string" && value.trim()) cleaned[field] = value;
    }
    if (Object.keys(cleaned).length) table[recordKey] = cleaned;
  }

  return table;
}

function main() {
  const output = {};
  const summary = [];

  for (const source of SOURCES) {
    const text = readFileSync(resolve(rootDir, source.file), "utf8");
    for (const { variable, ns, key } of source.tables) {
      const table = toEditableTable(extractTable(text, variable));
      if (!output[ns]) output[ns] = {};
      output[ns][key] = table;
      summary.push(`${ns}/${key}=${Object.keys(table).length}`);
    }
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({ version: 1, tables: output }, null, 2)}\n`, "utf8");
  console.log(`[shell-cms-defaults] ${summary.join(", ")} -> lib/cms/shell-defaults.generated.json`);
}

main();
