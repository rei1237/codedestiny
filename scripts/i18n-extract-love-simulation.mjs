#!/usr/bin/env node
/**
 * 러브 시뮬레이션의 **콘텐츠 본문**(장면·캐릭터 서사)을 소스에서 뽑아
 * `i18n/pending/loveSimulationScenes.ko.json` 으로 쓴다.
 *
 * 왜 별도 스크립트인가: `i18n-extract-ko.mjs` 는 "코드가 요구하는데 사전에 없는 고아 키"를
 * 찾는 도구다. 여기는 반대로 **아직 배선조차 안 된** 소스 상수를 미리 사전 자리에 앉히는
 * 일이라 입력이 다르다.
 *
 * 🔴 키 경로는 배선이 만들 경로와 **글자까지 같아야** 한다. 그래서
 * `__tests__/fixtures/scoped-copy-i18n-guard.js` 의 `collectKoPaths` 와 같은 규칙으로 걷는다 —
 * 객체는 속성 이름, 배열은 인덱스, `skipKeys` 에 걸린 이름은 하위까지 통째로 제외.
 * 어긋나면 번역이 사전에 있는데 화면은 한국어인 상태가 되고, 그건 아무 가드도 안 잡는다.
 * (배선 PR 에서 "추출 키 집합 == 가드가 발견한 배선 경로 집합" 을 단언하는 가드를 함께 넣는다.)
 *
 * 🔴 사전 네임스페이스가 코어가 아니라 `loveSimulationScenes` 인 이유: 코어
 * `public/i18n/<lang>.json` 은 이미 788KB 이고 모든 페이지가 받는다. 14만 자를 얹으면
 * 러브 시뮬레이션과 무관한 화면까지 느려진다. `shellRuntime` 이 같은 이유로 분리돼 있다.
 *
 * 사용법: node scripts/i18n-extract-love-simulation.mjs [--print]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { createRequire } from "node:module";

const rootDir = process.cwd();
const require = createRequire(join(rootDir, "package.json"));
const ts = require("typescript");

const featureDir = resolve(rootDir, "app", "saju", "love-simulation");
const pendingDir = resolve(rootDir, "i18n", "pending");
const OUT_NAMESPACE = "loveSimulationScenes";

/**
 * 뽑을 대상. **이 표가 정본**이고, 배선 PR 은 여기 적힌 상수를 같은 scope 이름으로 배선해야 한다.
 *
 * `skipKeys` 는 문자열이지만 문구가 아닌 필드다 — 사주 계산 결과와 대조하는 조회 키이거나
 * 장면 흐름 판별자라, 사전이 덮으면 매칭이 어긋나거나 흐름이 죽는다.
 * `pick` 은 상수 안에서 그 하위만 걷고 경로에서는 뺀다(로케일 표의 ko 블록용).
 */
const TARGETS = [
  {
    scope: "scenes",
    file: "_data/loveCodeMvp.ts",
    name: "LOVE_SCENE_DEFINITIONS",
    skipKeys: ["id", "characterId", "titleKey", "effects"],
  },
  {
    scope: "sceneTitles",
    file: "_data/loveCodeMvp.ts",
    name: "LOVE_SCENE_TITLE_TRANSLATIONS",
    pick: ["ko"],
    skipKeys: [],
  },
  {
    scope: "stories",
    file: "_data/loveCharacterStories.ts",
    name: "LOVE_CHARACTER_STORIES",
    skipKeys: [],
  },
  {
    scope: "storiesFallback",
    file: "_data/loveCharacterStories.ts",
    name: "FALLBACK_LOVE_CHARACTER_STORY",
    skipKeys: [],
  },
];

/** `as const` · 괄호를 벗겨 실제 리터럴을 꺼낸다. */
function unwrapLiteral(node) {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)))
  ) {
    current = current.expression;
  }
  return current;
}

function findLiteral(sourceFile, name) {
  let literal = null;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      const initializer = unwrapLiteral(node.initializer);
      if (ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer)) literal = initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literal;
}

/** 리터럴 안에서 이름 경로를 따라 내려간다(`pick` 용). */
function descend(sourceFile, literal, path) {
  let node = literal;
  for (const segment of path) {
    if (!ts.isObjectLiteralExpression(node)) return null;
    const property = node.properties.find(
      (p) => ts.isPropertyAssignment(p) && p.name.getText(sourceFile).replace(/^["']|["']$/g, "") === segment,
    );
    if (!property) return null;
    node = unwrapLiteral(property.initializer);
  }
  return node;
}

/** 🔴 가드의 collectKoPaths 와 같은 규칙. 고치면 양쪽을 함께 고쳐야 한다. */
function collectLeaves(sourceFile, literal, skip) {
  const out = [];
  const walk = (node, prefix) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText(sourceFile).replace(/^["']|["']$/g, "");
        if (skip.has(name)) continue;
        walk(unwrapLiteral(property.initializer), prefix ? `${prefix}.${name}` : name);
      }
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) =>
        walk(unwrapLiteral(element), prefix ? `${prefix}.${index}` : String(index)),
      );
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push([prefix, node.text]);
  };
  walk(literal, "");
  return out;
}

const pending = {};
const perScope = [];
let asciiOnly = 0;

for (const target of TARGETS) {
  const full = join(featureDir, target.file);
  if (!existsSync(full)) {
    console.error(`[extract-love-sim] 파일이 없습니다: ${target.file}`);
    process.exit(1);
  }
  const text = readFileSync(full, "utf8");
  const sourceFile = ts.createSourceFile(basename(full), text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let literal = findLiteral(sourceFile, target.name);
  if (!literal) {
    console.error(`[extract-love-sim] ${target.file} 에서 ${target.name} 리터럴을 못 찾았습니다.`);
    process.exit(1);
  }
  if (target.pick?.length) {
    literal = descend(sourceFile, literal, target.pick);
    if (!literal) {
      console.error(`[extract-love-sim] ${target.name} 안에서 ${target.pick.join(".")} 를 못 찾았습니다.`);
      process.exit(1);
    }
  }

  const leaves = collectLeaves(sourceFile, literal, new Set(target.skipKeys));
  // 🔴 fail-closed: 대상이 0개면 파서가 형식을 못 따라간 것이다. 조용히 넘어가면 그 scope 가
  //    통째로 번역에서 빠지고, 배선 시점에야 발견된다.
  if (!leaves.length) {
    console.error(`[extract-love-sim] ${target.name} 에서 문자열을 하나도 못 읽었습니다 — skipKeys 또는 파서 문제.`);
    process.exit(1);
  }

  let hangul = 0;
  for (const [leaf, value] of leaves) {
    pending[`loveSimulation.${target.scope}.${leaf}`] = value;
    if (/[가-힣]/.test(value)) hangul += (value.match(/[가-힣]/g) || []).length;
    else asciiOnly += 1;
  }
  perScope.push({ scope: target.scope, keys: leaves.length, hangul });
}

if (process.argv.includes("--print")) {
  console.log(JSON.stringify(pending, null, 2).slice(0, 4000));
  process.exit(0);
}

mkdirSync(pendingDir, { recursive: true });
const outPath = join(pendingDir, `${OUT_NAMESPACE}.ko.json`);
writeFileSync(outPath, `${JSON.stringify(pending, null, 2)}\n`, "utf8");

for (const s of perScope) {
  console.log(`[extract-love-sim] ${s.scope.padEnd(16)} ${String(s.keys).padStart(5)}키  한글 ${s.hangul}자`);
}
console.log(`[extract-love-sim] 한글 없는 값 ${asciiOnly}개(브랜드·식별자 — 번역기가 그대로 통과시킨다)`);
console.log(`[extract-love-sim] → ${outPath} (${Object.keys(pending).length}키)`);
