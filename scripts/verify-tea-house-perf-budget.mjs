#!/usr/bin/env node
/**
 * 찻집 렌더 예산 가드 — 2026-08-30 에 실측으로 잡은 두 가지 회귀를 소스에서 막는다.
 *
 * 왜 정적 가드인가: 두 결함 모두 "화면은 멀쩡한데 매 프레임 비용만 든다" 라서 스크린샷·기능 테스트로는
 * 절대 안 잡힌다. 렌더 성능 자체를 CI 에서 재려면 하네스(scripts/measure-app-route-perf.mjs)를 돌려야
 * 하는데 그건 Chromium 실행 + 분 단위라 PR 마다 못 돌린다. 그래서 원인 패턴만 소스에서 고정한다.
 *
 * 규칙 1 — @keyframes 의 transform 에 var() 를 새로 늘리지 않는다.
 *   var() 가 들어가면 컴포지터가 그 애니메이션을 받지 못하고 메인스레드로 내려온다. 찻집의 꽃잎 7장이
 *   그랬고, 전체화면 고정 레이어라 매 프레임 전부를 다시 칠했다.
 *   실측(CPU 6배·Slow4G·3회, 프롤로그): RecalcStyle 1305ms → 839ms.
 *   고치는 법은 "애니메이션을 지우기"가 아니라 변주값을 안쪽 요소의 정적 transform 으로 옮기는 것이다
 *   (.petal / .petalInner 가 그 형태다).
 *   🔴 이미 있는 것들은 원장(config/tea-house-anim-budget.json)에 이름으로 적혀 있다. 그것들은 **아직
 *   측정하지 않았을 뿐** 무죄가 아니다. 원장은 "여기까지가 현재 상태"라는 뜻이고, 늘어나면 실패한다.
 *
 * 규칙 2 — .cdShimmer 애니메이션은 .is-flipped 로 한정.
 *   셔머 span 은 카드 앞면(.cdFlipFront)에만 있고 그 면은 뒤집히기 전까지 backface-visibility:hidden 이다.
 *   선택자를 넓히면 안 보이는 카드 78장이 background-position(합성 불가·페인트 전용)을 매 프레임 움직인다.
 *   실측(CPU 4배·Slow4G·3회, 앨범): 끊긴 프레임 48.8% → 1.7%, 메인스레드 3135ms → 1696ms.
 *
 * 🔴 두 규칙 모두 검사 대상이 0건이면 실패한다 — 탐지기가 죽은 채로 초록불이 되는 것을 막는다.
 *
 * 원장 갱신: node scripts/verify-tea-house-perf-budget.mjs --update
 * 성능 재실측: npm run perf:app-route -- --segments=entry,album --passes=frames --net=slow4g
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEATURE_DIR = path.join(ROOT, "src", "features", "fortune-tea-house");
const LEDGER = path.join(ROOT, "config", "tea-house-anim-budget.json");
const UPDATE = process.argv.includes("--update");

/** 찻집 기능 아래 스타일이 들어갈 수 있는 파일 전부. 목록을 손으로 적지 않는다. */
function collectSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.(css|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** `@keyframes 이름 {` 부터 중괄호 균형이 맞는 곳까지를 한 블록으로 떼어 낸다. */
function collectKeyframeBlocks(text) {
  const blocks = [];
  const opener = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
  let match;
  while ((match = opener.exec(text))) {
    let depth = 1;
    let index = opener.lastIndex;
    while (index < text.length && depth > 0) {
      if (text[index] === "{") depth += 1;
      else if (text[index] === "}") depth -= 1;
      index += 1;
    }
    blocks.push({ name: match[1], body: text.slice(opener.lastIndex, index - 1) });
  }
  return blocks;
}

/** 규칙 하나를 여는 중괄호 앞의 셀렉터를 읽는다. */
function selectorBefore(text, braceIndex) {
  const head = text.slice(0, braceIndex);
  const start = Math.max(head.lastIndexOf("}"), head.lastIndexOf("{"), head.lastIndexOf(";"));
  return head.slice(start + 1).replace(/\s+/g, " ").trim();
}

const files = collectSourceFiles(FEATURE_DIR);
const failures = [];

/* ── 규칙 1 ── */
let keyframeBlocks = 0;
const varTransformKeyframes = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const block of collectKeyframeBlocks(text)) {
    keyframeBlocks += 1;
    const offends = block.body
      .split(";")
      .some((declaration) => /(^|[\s{])transform\s*:/.test(declaration) && declaration.includes("var("));
    if (offends) varTransformKeyframes.set(block.name, path.relative(ROOT, file).split(path.sep).join("/"));
  }
}
if (keyframeBlocks === 0) {
  failures.push(
    `${path.relative(ROOT, FEATURE_DIR)} 아래에서 @keyframes 를 하나도 못 찾았다`
    + " — 탐지기가 죽었다(경로 이동·확장자 변경). 통과시키지 않는다.",
  );
}

const found = [...varTransformKeyframes.keys()].sort();
if (UPDATE) {
  fs.writeFileSync(
    LEDGER,
    `${JSON.stringify(
      {
        note: "찻집 @keyframes 중 transform 에 var() 를 쓰는 것들. 컴포지터가 못 받아 메인스레드에서 돈다. 늘리지 말 것 — scripts/verify-tea-house-perf-budget.mjs",
        updated: new Date().toISOString().slice(0, 10),
        keyframesWithVarTransform: found.map((name) => ({ name, file: varTransformKeyframes.get(name) })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[tea-house-perf-budget] 원장 갱신 — ${found.length}개`);
  process.exit(0);
}

if (!fs.existsSync(LEDGER)) {
  console.error(`[tea-house-perf-budget] 원장이 없다: ${path.relative(ROOT, LEDGER)} — --update 로 만들 것.`);
  process.exit(1);
}
const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const known = (ledger.keyframesWithVarTransform || []).map((entry) => entry.name).sort();

for (const name of found) {
  if (known.includes(name)) continue;
  failures.push(
    `@keyframes ${name} (${varTransformKeyframes.get(name)}) 의 transform 에 var() 가 새로 생겼다`
    + "\n    → 컴포지터가 이 애니메이션을 못 받아 메인스레드로 내려온다."
    + " 변주값은 안쪽 요소의 정적 transform 으로 옮길 것(.petal / .petalInner 가 그 형태다).",
  );
}
for (const name of known) {
  if (found.includes(name)) continue;
  failures.push(
    `@keyframes ${name} 이(가) 원장에 있는데 소스에서 사라졌다 — 고쳤거나 이름이 바뀌었다.`
    + " `node scripts/verify-tea-house-perf-budget.mjs --update` 로 원장을 줄일 것.",
  );
}

/* ── 규칙 2 ── */
let shimmerRules = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const opener = /\.cdShimmer\b[^{;}]*\{/g;
  let match;
  while ((match = opener.exec(text))) {
    const braceIndex = opener.lastIndex - 1;
    const body = text.slice(opener.lastIndex, text.indexOf("}", opener.lastIndex));
    if (!/animation(-name|-duration|-iteration-count)?\s*:/.test(body)) continue;
    shimmerRules += 1;
    const selector = selectorBefore(text, braceIndex);
    if (selector.includes(".is-flipped")) continue;
    failures.push(
      `${path.relative(ROOT, file).split(path.sep).join("/")} · .cdShimmer 애니메이션 규칙이 .is-flipped 로 한정되지 않았다`
      + `\n    ${selector.slice(0, 140)}`
      + "\n    → 뒤집히지 않은 카드 78장이 안 보이는 채로 background-position 을 매 프레임 움직인다.",
    );
  }
}
if (shimmerRules === 0) {
  failures.push(
    "`.cdShimmer` 에 애니메이션을 다는 규칙을 하나도 못 찾았다 — 클래스 이름이 바뀌었거나 규칙이 사라졌다."
    + " 이름이 바뀌었으면 이 가드의 규칙 2도 함께 옮길 것.",
  );
}

if (failures.length > 0) {
  console.error(`[tea-house-perf-budget] 실패 ${failures.length}건\n`);
  for (const failure of failures) console.error(`  - ${failure}\n`);
  process.exit(1);
}

console.log(
  `[tea-house-perf-budget] OK — @keyframes ${keyframeBlocks}개(var transform 원장 ${known.length}개와 일치)`
  + ` · .cdShimmer 애니메이션 규칙 ${shimmerRules}개, 위반 0건`,
);
