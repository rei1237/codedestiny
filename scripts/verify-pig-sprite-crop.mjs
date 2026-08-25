#!/usr/bin/env node
/**
 * 스프라이트 크롭 가드 — 크롭 수식이 다시 CSS 로 돌아가는 것을 막는다.
 *
 * 왜 필요한가 (2026-08-25 실사고, 네이버 모바일 인앱 브라우저):
 *   .pigSpriteSheet 의 크롭이 `calc(var(--pig-sprite-y) / var(--pig-sprite-height) * -100%)`
 *   처럼 **길이 ÷ 길이** 로 계산돼 있었다. 이건 CSS Values Level 4 문법이라
 *   Chrome 119+ / Safari 17+ / Firefox 116+ 에서만 유효하다.
 *
 *   구형 엔진에서 벌어지는 일이 이 사고의 전부다:
 *     ① 선언에 var() 가 있으니 파싱은 통과한다 → 캐스케이드에서 !important 선언이 승자가 된다.
 *     ② 치환 후 값이 무효 → invalid at computed-value time → left/top/width/height 가 auto 로 간다.
 *     ③ 승자가 이미 !important 라서 next/image 의 fill 이 넣는 인라인 left/top/width/height 는
 *        적용되지 못한다. 살아남는 건 인라인 right:0; bottom:0 뿐.
 *     ④ 1254x1254 시트가 원본 크기로 프레임 우하단에 붙고 overflow:hidden 이 그 구석만 보여준다.
 *        화면에는 돼지 다리 잘린 것 + 그 아래 다른 돼지 머리가 나온다.
 *
 *   화면도 콘솔도 조용하다. 최신 브라우저에서는 완벽하게 보이므로 개발 중에는 절대 안 잡힌다.
 *
 * 무엇을 강제하는가:
 *   ① CSS 에서 **단위 있는 값으로 나누지 않는다.** 나눗셈의 우변은 단위 없는 수여야 하고,
 *      var() 라면 같은 파일에 단위 없는 값으로 선언돼 있어 증명 가능해야 한다.
 *      (참고: pet-saju.html 의 --fx/--fy/--fw 는 단위 없는 수라 같은 모양이어도 안전하다.
 *       그 파일은 이 가드의 검사 범위 밖이지만 규칙 자체는 동일하다.)
 *   ② .pigSpriteFrame 을 쓰는 컴포넌트는 전부 pigSpriteFrameStyle() 로 변수를 만든다.
 *      호출부 하나를 빠뜨리면 그 화면만 CSS 기본값(welcome 프레임)으로 조용히 굳는다.
 *
 * fail-closed: 검사 대상을 하나도 못 찾으면 통과가 아니라 실패다(CLAUDE.md 코딩 원칙 10).
 * 이름 grep 이 아니라 calc( 를 괄호 균형으로 잘라 실제 식을 본다(코딩 원칙 6).
 *
 * 실행: npm run verify:pig-sprite-crop [--self-test]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** CSS 크롭 수식을 담을 수 있는 스타일시트 뿌리. */
const STYLE_ROOTS = ["src", "app", "styles"];

/** .pigSpriteFrame 소비처를 찾을 뿌리. */
const COMPONENT_ROOTS = ["src", "app", "components"];

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".wrangler", "dist", "out", ".claude"]);

const LENGTH_UNITS = "px|rem|em|ex|ch|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cm|mm|in|pt|pc|q|%";
const UNIT_LITERAL = new RegExp(`^-?[0-9.]+(${LENGTH_UNITS})$`, "i");
const PLAIN_NUMBER = /^-?[0-9.]+$/;

function walk(dirAbs, extensions, found = []) {
  let entries;
  try {
    entries = readdirSync(dirAbs);
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(dirAbs, entry);
    let stats;
    try {
      stats = statSync(abs);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walk(abs, extensions, found);
      continue;
    }
    if (extensions.some((ext) => entry.endsWith(ext))) found.push(abs);
  }
  return found;
}

/**
 * 같은 파일에서 커스텀 프로퍼티가 단위를 갖고 선언됐는지 모은다.
 * `--a: 12px` 는 단위 있음, `--b: 12` 는 단위 없음, 그 밖은 둘 다 아님(증명 불가).
 */
function collectVarDeclarations(source) {
  const unitBearing = new Set();
  const unitless = new Set();
  const declaration = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let match;
  while ((match = declaration.exec(source)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    if (UNIT_LITERAL.test(value)) unitBearing.add(name);
    else if (PLAIN_NUMBER.test(value)) unitless.add(name);
  }
  return { unitBearing, unitless };
}

/** calc( 부터 괄호 균형이 맞는 곳까지 잘라낸다. */
function extractCalcExpressions(source) {
  const expressions = [];
  const opener = /calc\(/gi;
  let match;
  while ((match = opener.exec(source)) !== null) {
    let depth = 1;
    let index = match.index + match[0].length;
    while (index < source.length && depth > 0) {
      if (source[index] === "(") depth += 1;
      else if (source[index] === ")") depth -= 1;
      index += 1;
    }
    expressions.push({ index: match.index, text: source.slice(match.index, index).replace(/\s+/g, " ") });
  }
  return expressions;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

/**
 * calc() 안에서 안전을 증명할 수 없는 나눗셈을 찾는다.
 * 반환: { line, expression, reason } 배열.
 */
export function findUnsafeDivisions(source) {
  const problems = [];
  const { unitBearing, unitless } = collectVarDeclarations(source);
  const divisor = /\/\s*(var\(\s*(--[\w-]+)[^)]*\)|-?[0-9.]+[a-z%]*)/gi;

  for (const expression of extractCalcExpressions(source)) {
    let match;
    divisor.lastIndex = 0;
    while ((match = divisor.exec(expression.text)) !== null) {
      const operand = match[1];
      const varName = match[2];
      let reason = null;
      if (varName) {
        if (unitBearing.has(varName)) reason = `${varName} 이 단위를 가진 길이로 선언돼 있습니다`;
        else if (!unitless.has(varName)) reason = `${varName} 이 같은 파일에서 단위 없는 수로 선언돼 있지 않아 안전을 증명할 수 없습니다`;
      } else if (UNIT_LITERAL.test(operand)) {
        reason = `단위 있는 값 ${operand} 으로 나눕니다`;
      }
      if (reason) problems.push({ line: lineOf(source, expression.index), expression: expression.text, reason });
    }
  }
  return problems;
}

function checkStylesheets() {
  const failures = [];
  const files = STYLE_ROOTS.flatMap((dir) => walk(join(root, dir), [".css"]));
  if (files.length === 0) {
    failures.push("스타일시트를 하나도 찾지 못했습니다 — 가드가 아무것도 검사하지 않았습니다.");
    return { failures, scanned: 0 };
  }

  for (const abs of files) {
    const source = readFileSync(abs, "utf8");
    if (!/calc\(/i.test(source)) continue;
    for (const problem of findUnsafeDivisions(source)) {
      failures.push(`${relative(root, abs)}:${problem.line} — ${problem.reason}\n    ${problem.expression}`);
    }
  }
  return { failures, scanned: files.length };
}

function checkPigSpriteConsumers() {
  const failures = [];
  const files = COMPONENT_ROOTS.flatMap((dir) => walk(join(root, dir), [".tsx", ".jsx"]));
  if (files.length === 0) {
    failures.push("컴포넌트를 하나도 찾지 못했습니다 — 가드가 아무것도 검사하지 않았습니다.");
    return { failures, consumers: [] };
  }

  const consumers = [];
  for (const abs of files) {
    const source = readFileSync(abs, "utf8");
    if (!/styles\.pigSpriteFrame/.test(source)) continue;
    consumers.push(relative(root, abs));
    if (!/pigSpriteFrameStyle\s*\(/.test(source)) {
      failures.push(
        `${relative(root, abs)} — .pigSpriteFrame 을 쓰면서 pigSpriteFrameStyle() 을 부르지 않습니다.` +
          "\n    크롭 변수가 비어 그 화면만 CSS 기본값(welcome 프레임)으로 조용히 굳습니다.",
      );
    }
  }
  if (consumers.length === 0) {
    failures.push(".pigSpriteFrame 소비처를 하나도 찾지 못했습니다 — 클래스 이름이 바뀌었다면 이 가드도 함께 고쳐야 합니다.");
  }
  return { failures, consumers };
}

/** 두 단언이 실제로 무언가를 가른다는 것을 합성 입력으로 확인한다(파일을 건드리지 않는다). */
function selfTest() {
  const divisionCases = [
    { name: "길이 var 로 나누면 잡는다", source: ".a { --w: 266px; left: calc(var(--x) / var(--w) * -100%); }", shouldFail: true },
    { name: "단위 리터럴로 나누면 잡는다", source: ".a { width: calc(100% / 3px); }", shouldFail: true },
    { name: "증명 못 하는 var 로 나누면 잡는다", source: ".a { left: calc(var(--x) / var(--unknown) * -100%); }", shouldFail: true },
    { name: "단위 없는 var 로 나누면 통과한다", source: ".a { --w: 266; left: calc(var(--x) / var(--w) * -100%); }", shouldFail: false },
    { name: "상수로 나누면 통과한다", source: ".a { width: calc(100% / 3); }", shouldFail: false },
    { name: "나눗셈이 없으면 통과한다", source: ".a { left: var(--pig-sprite-left); width: var(--pig-sprite-img-width); }", shouldFail: false },
  ];

  const broken = [];
  for (const testCase of divisionCases) {
    const failed = findUnsafeDivisions(testCase.source).length > 0;
    if (failed !== testCase.shouldFail) {
      broken.push(`나눗셈 검출기 · ${testCase.name}: 기대 ${testCase.shouldFail ? "실패" : "통과"} / 실제 ${failed ? "실패" : "통과"}`);
    }
  }

  // 소비처 단언은 정규식 자체를 같은 방식으로 확인한다.
  const consumerCases = [
    { name: "헬퍼를 안 부르면 잡는다", source: `<span className={styles.pigSpriteFrame} style={{}} />`, shouldFail: true },
    { name: "헬퍼를 부르면 통과한다", source: `<span className={styles.pigSpriteFrame} style={pigSpriteFrameStyle(frame)} />`, shouldFail: false },
  ];
  for (const testCase of consumerCases) {
    const isConsumer = /styles\.pigSpriteFrame/.test(testCase.source);
    const failed = isConsumer && !/pigSpriteFrameStyle\s*\(/.test(testCase.source);
    if (failed !== testCase.shouldFail) {
      broken.push(`소비처 단언 · ${testCase.name}: 기대 ${testCase.shouldFail ? "실패" : "통과"} / 실제 ${failed ? "실패" : "통과"}`);
    }
  }

  return broken;
}

function main() {
  if (process.argv.includes("--self-test")) {
    const broken = selfTest();
    if (broken.length > 0) {
      console.error("❌ self-test 실패 — 가드가 무언가를 가르지 못합니다:");
      for (const line of broken) console.error(`  - ${line}`);
      process.exit(1);
    }
    console.log("✅ self-test 통과 — 두 단언 모두 양성/음성 케이스를 가릅니다.");
    return;
  }

  const styles = checkStylesheets();
  const consumers = checkPigSpriteConsumers();
  const failures = [...styles.failures, ...consumers.failures];

  if (failures.length > 0) {
    console.error("❌ 스프라이트 크롭 가드 실패:\n");
    for (const failure of failures) console.error(`  - ${failure}\n`);
    console.error(
      "  → 크롭 비율은 JS 에서 계산해 % 로 넘기세요. 정본:" +
        " src/features/fortune-tea-house/lib/pigSpriteStyle.ts · src/features/fortune-tea-house/components/SpriteCrop.tsx",
    );
    process.exit(1);
  }

  console.log(`✅ 스타일시트 ${styles.scanned}개에 증명 못 할 나눗셈 없음.`);
  console.log(`✅ .pigSpriteFrame 소비처 ${consumers.consumers.length}개 전부 pigSpriteFrameStyle() 사용:`);
  for (const file of consumers.consumers) console.log(`   - ${file}`);
}

main();
