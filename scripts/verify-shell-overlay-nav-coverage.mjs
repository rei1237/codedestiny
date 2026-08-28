#!/usr/bin/env node
/**
 * 정적 셸의 오버레이가 하단 탭바를 확실히 물리는지 검사한다 — **발견형** 가드.
 *
 * ── 왜 필요한가 (2026-08-29 실측) ─────────────────────────────────────────────
 * 하단 탭바(#cdMobileBottomNav)는 부팅 시 document.body 직속으로 옮겨진다
 * (index.html 의 `if (nav.parentNode !== document.body) document.body.appendChild(nav)`).
 * 반면 셸의 모달은 거의 전부 `.wrap`(position:relative; z-index:1; isolation:isolate) 안에
 * 있어서, 모달의 z-index 를 아무리 올려도 탭바를 넘지 못한다. 그래서 이 셸의 유일한 해법은
 * "오버레이가 열리면 body.cd-mobile-nav-hidden 을 붙여 탭바를 물리는 것"이다.
 *
 * 그 장치는 이미 있었는데 **시빌라 모달에서만 안 돌았다.** 판정(overlayOpen)은 멀쩡했고
 * 빠진 것은 **관측(트리거)** 이었다 — #sibylModal 이 overlayIds 에 없어 MutationObserver 가
 * 안 붙었고, `.wrap` 안이라 body 직계 childList 옵저버도 못 봤다.
 *
 *   Playwright 실측(412x823, 2026-08-29):
 *     · 모달을 열고 3.15초를 조용히 기다려도 탭바 display:block, navHidden=false
 *     · 무관한 body 직계 변이를 하나 붙이자 그제서야 display:none 으로 바뀜
 *     · 모달을 닫아도 탭바가 돌아오지 않음(같은 이유로 반대 방향도 안 깨어남)
 *   즉 사용자가 본 "리포트 끝이 탭바에 잘림"은 상시 버그가 아니라 **무관한 DOM 변이에
 *   좌우되는 레이스**였다.
 *
 * ── 무엇을 강제하는가 ────────────────────────────────────────────────────────
 * 이 셸이 스스로 "오버레이"라고 부르는 정의(index.html 의 OVERLAY_SELECTOR)로 요소를
 * **전수 발견**하고, 각 요소가 관측되는 루트 안에 있는지 검사한다. 손으로 쓴 대상 목록을
 * 두지 않는다(CLAUDE.md 원칙 10). 세 상수는 전부 index.html 에서 파싱하며 여기에 다시
 * 옮겨 적지 않는다 — 옮겨 적는 순간 둘이 갈라지고, 갈라진 목록이 바로 이 버그였다.
 *
 * fail-closed 4방향:
 *   ① 관측 루트 안에 없고 면제 선언도 없는 오버레이 → 실패
 *   ② 실제로는 관측되는데 면제 선언이 남아 있는 것   → 실패 (낡은 선언이 쌓이는 것을 막는다)
 *   ③ 발견된 오버레이가 0건                        → 실패 (대상 없는 가드는 가드가 아니다)
 *   ④ 관측 합집합 배선이 사라짐                     → 실패 (아래 assertWiring)
 *
 * 실행: npm run verify:shell-overlay-nav-coverage [--self-test]
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const INDEX = join(root, "index.html");

/**
 * 오버레이가 아니라서 관측 루트로 인정하지 않는 id. 여기 있는 id 를 조상으로 갖는다는 사실은
 * "관측된다"의 근거가 되지 못한다.
 * 🔴 이 표가 있어야 시빌라 회귀를 잡는다 — #sibylModal 은 #resultPage 안에 있는데,
 *    #resultPage 는 지연마운트 원장(targetIds)에 올라 있어 관측은 되지만 **페이지**다.
 *    그 옵저버는 subtree 를 보지 않으므로 안쪽 모달의 클래스 변경을 절대 못 본다.
 */
const NOT_AN_OVERLAY_ROOT = new Map([
  ["resultPage", "사주 결과 '페이지'다(오버레이가 아니다). 지연마운트 대상이라 관측은 되지만 그 옵저버는 subtree 를 보지 않아 안쪽 모달(#sibylModal)의 개폐를 대신 잡아 주지 못한다."],
]);

/**
 * 관측 루트 밖에 있어도 되는 오버레이. **왜 괜찮은지 실측 근거와 함께** 적는다.
 * 🔴 "아마 괜찮을 것"으로 적지 말 것. 근거가 없으면 면제가 아니라 미수정이다.
 */
const EXEMPT = new Map([
  ["#dpListSheet", "dpOpenList 가 <template> 에서 복제해 **body 직계**로 붙이므로 body childList 옵저버가 트리거를 담당한다(Playwright 412x823 실측 2026-08-29: dpOpenList() 후 1.2초 안에 body.cd-mobile-nav-hidden=true, 탭바 display:none). 개폐 때마다 body 직계에서 붙고 떨어지므로 양방향 모두 깨어난다."],
]);

const failures = [];
const notes = [];
function fail(msg) { failures.push(msg); }

const html = readFileSync(INDEX, "utf8");

/* ── index.html 에서 정본 상수를 파싱한다 (여기에 옮겨 적지 않는다) ───────────── */
function readJsArray(name) {
  const at = html.indexOf(`var ${name} = [`);
  if (at < 0) return null;
  const open = html.indexOf("[", at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === "[") depth += 1;
    else if (html[i] === "]") { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  // 주석 줄을 지운 뒤 따옴표 문자열만 거둔다.
  const body = html.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return (body.match(/'([^']+)'|"([^"]+)"/g) || []).map((s) => s.slice(1, -1));
}
function readJsString(name) {
  const m = html.match(new RegExp(`var ${name}\\s*=\\s*'([^']*)'`));
  return m ? m[1] : null;
}

const overlayIds = readJsArray("overlayIds");
const lazyTargetIds = readJsArray("targetIds");
const overlaySelector = readJsString("OVERLAY_SELECTOR");

if (!overlayIds || !overlayIds.length) fail("index.html 에서 하단 네비의 `var overlayIds = [...]` 를 읽지 못했습니다 — 이름이 바뀌었다면 이 가드를 함께 고치세요.");
if (!lazyTargetIds || !lazyTargetIds.length) fail("index.html 에서 지연마운트의 `var targetIds = [...]` 를 읽지 못했습니다 — 이름이 바뀌었다면 이 가드를 함께 고치세요.");
if (!overlaySelector) fail("index.html 에서 `var OVERLAY_SELECTOR = '...'` 를 읽지 못했습니다 — 이름이 바뀌었다면 이 가드를 함께 고치세요.");

/* ── 관측 합집합 배선이 살아 있는지 (④ fail-closed) ─────────────────────────── */
function assertWiring() {
  const checks = [
    [/function observedIds\s*\(\s*\)\s*\{/, "하단 네비 스크립트에 observedIds() 가 없습니다 — overlayIds 와 지연마운트 targetIds 의 합집합을 만드는 함수입니다."],
    [/observedIds\s*\(\s*\)[\s\S]{0,200}?__cdMobileHomeLazyMount/, "observedIds() 가 __cdMobileHomeLazyMount.targets 를 읽지 않습니다 — 지연마운트 오버레이(tsModal·astralModal·tarotSelfEsteemOverlay 등)의 관측이 통째로 죽습니다."],
    [/function bindOverlayObservers\s*\(\s*\)\s*\{[\s\S]{0,200}?observedIds\s*\(\s*\)\s*\.forEach/, "bindOverlayObservers() 가 observedIds() 를 쓰지 않습니다 — overlayIds 만 관측하게 되어 합집합이 죽습니다."],
    [/addEventListener\s*\(\s*'cd:mobile-home-lazy-mounted'/, "'cd:mobile-home-lazy-mounted' 리스너가 없습니다 — 지연마운트가 오버레이를 .wrap 안 자리로 되돌릴 때 관측을 다시 걸 유일한 결정적 시점입니다(포인터 이벤트 없는 딥링크 경로에는 다른 시점이 없습니다)."],
  ];
  for (const [re, msg] of checks) if (!re.test(html)) fail(msg);
}
assertWiring();

if (failures.length) { report(); process.exit(1); }

/* ── 발견: 셸 자신의 OVERLAY_SELECTOR 로 오버레이를 전수 수집한다 ─────────────── */
// jsdom 의 CSS 파서가 이 셸의 인라인 CSS 일부를 못 읽고 "Could not parse CSS stylesheet" 를
// 뿜는다. 우리는 스타일이 아니라 마크업만 보므로 그 잡음만 삼킨다(다른 에러는 그대로 낸다).
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (err) => {
  if (!/Could not parse CSS stylesheet/.test(String(err && err.message))) console.error(err);
});
const dom = new JSDOM(html, { virtualConsole });
const doc = dom.window.document;
const scopes = [doc, ...Array.from(doc.querySelectorAll("template")).map((t) => t.content)];

const selfTest = process.argv.includes("--self-test");
const observedRoots = new Set(
  [...overlayIds, ...lazyTargetIds].filter((id) => !NOT_AN_OVERLAY_ROOT.has(id)),
);
if (selfTest) observedRoots.delete("sibylModal");

const key = (el) => (el.id ? `#${el.id}` : `.${String(el.className || "").trim().split(/\s+/)[0] || el.tagName.toLowerCase()}`);
const trail = (el) => {
  const parts = [];
  for (let n = el; n && n.tagName && parts.length < 7; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + (n.id ? `#${n.id}` : ""));
  return parts.join(" > ");
};

const discovered = [];
for (const scope of scopes) for (const el of scope.querySelectorAll(overlaySelector)) discovered.push(el);

if (!discovered.length) fail(`OVERLAY_SELECTOR 로 발견한 오버레이가 0건입니다 — 셀렉터나 마크업이 바뀌었을 수 있습니다. 대상이 없을 때 통과하는 가드는 가드가 아닙니다.\n  selector: ${overlaySelector}`);

const usedExemptions = new Set();
for (const el of discovered) {
  let anchor = null;
  for (let n = el; n && n.tagName; n = n.parentElement) {
    if (n.id && observedRoots.has(n.id)) { anchor = n.id; break; }
  }
  const k = key(el);
  if (anchor) {
    if (EXEMPT.has(k)) fail(`면제 선언이 낡았습니다: ${k} 는 이제 #${anchor} 안에서 관측됩니다. EXEMPT 에서 지우세요.`);
    notes.push(`  OK   ${k.padEnd(30)} <- 관측 루트 #${anchor}`);
    continue;
  }
  if (EXEMPT.has(k)) { usedExemptions.add(k); notes.push(`  면제 ${k.padEnd(30)} ${EXEMPT.get(k).slice(0, 60)}…`); continue; }
  fail(
    `오버레이 ${k} 가 관측되는 루트 안에 없습니다 — 열려도 하단 탭바가 안 물리고, 닫아도 안 돌아옵니다.\n` +
    `    경로: ${trail(el)}\n` +
    `    고치는 법: 이 오버레이의 **개폐 클래스/속성이 붙는 노드**의 id 를 index.html 의 overlayIds 에 넣으세요\n` +
    `              (지연마운트 대상이면 targetIds 에 있는 것으로 충분합니다). 탭바와 공존해야 하는 시트라면\n` +
    `              scripts/verify-shell-overlay-nav-coverage.mjs 의 EXEMPT 에 **실측 근거와 함께** 등록하세요.`,
  );
}

for (const k of EXEMPT.keys()) {
  if (!usedExemptions.has(k)) fail(`면제 선언 ${k} 가 어떤 오버레이와도 매칭되지 않습니다 — 마크업에서 사라졌다면 EXEMPT 에서도 지우세요.`);
}
for (const id of NOT_AN_OVERLAY_ROOT.keys()) {
  if (!overlayIds.includes(id) && !lazyTargetIds.includes(id)) fail(`NOT_AN_OVERLAY_ROOT 의 ${id} 가 overlayIds/targetIds 어디에도 없습니다 — 낡은 선언입니다.`);
}

function report() {
  console.log("정적 셸 오버레이 ↔ 하단 탭바 관측 커버리지");
  console.log(`  overlayIds ${overlayIds ? overlayIds.length : 0}건 · 지연마운트 targetIds ${lazyTargetIds ? lazyTargetIds.length : 0}건 · 발견된 오버레이 ${discovered ? discovered.length : 0}건`);
  if (notes.length) console.log(notes.join("\n"));
  if (failures.length) {
    console.error(`\n✗ ${failures.length}건 실패\n`);
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  }
}

report();
if (selfTest) {
  const caught = failures.some((f) => f.includes(".sb-panel"));
  console.log(`\n--self-test: sibylModal 을 관측 집합에서 뺐을 때 실패로 잡히는가 -> ${caught ? "YES (가드가 살아 있음)" : "NO (가드가 죽었음)"}`);
  process.exit(caught ? 0 : 1);
}
if (failures.length) process.exit(1);
console.log("\n✓ 모든 오버레이가 관측 루트 안에 있습니다.");
