/**
 * 결제창 단일 인스턴스 회귀 가드 (jsdom 실행 + 미러 정합성).
 *
 * 사고 내용: 자미두수 궁성 맞춤 AI 상담에서 결제가 간헐적으로 실패하고, 실패 후 다시 누르면
 * "디자인은 거의 같은데 이용권 관련 UI 가 다른" 결제창이 떴다. 원인은 결제창을 그리는 런타임 3종
 * (정적 셸 · React · 독립 정적)이 서로의 상태를 못 보는 구조였다.
 *
 * 고정하는 성질:
 *   ① 결제창을 연속으로 열어도 DOM 에 남는 결제창 노드는 항상 1개다.
 *   ② 앞 결제창이 남긴 고아 노드(셸의 12초 handoff hold, React 의 6초 hold)는 다음 결제창이 열릴 때
 *      스윕된다 — 그게 "아래 깔린 다른 결제창"의 정체였다.
 *   ③ 어느 렌더러가 그려질지는 로드 순서가 아니라 우선순위(canonical-shell > react > standalone)로
 *      정해지고, 거부는 조용히 넘어가지 않는다.
 *   ④ 셸의 유료기능 인플라이트 락은 TTL 로 자기치유한다. 이게 없으면 토큰이 한 번 새는 순간 그
 *      featureKey 는 영영 already_checking 으로 취소되고, 화면에는 결제창 없이 실패 문구만 남는다.
 *   ⑤ 숙요 유료 5종의 유일한 게이트 진입점이 인플라이트 가드와 결정론적 requestId 를 갖는다.
 *   ⑥ js/ ↔ public/js/ 사본과 정적 셸 6벌이 갈라지지 않는다.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// 실제 독립 정적 페이지와 같은 순서. payment-service 가 맨 앞이 아니면 결제 경계가 통째로 폴백으로
// 새고, 그러면 이 가드가 경계를 한 번도 실행하지 않은 채 통과한다(verify-checkout-pass-card 와 동일).
const RUNTIME_FILES = [
  "js/core/payment-service.js",
  "js/core/pass-verdict.js",
  "js/core/checkout-entry.js",
  "js/destiny-profile.js",
];

const SHELL_MIRRORS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const MIRRORED_RUNTIMES = [
  ["js/core/checkout-entry.js", "public/js/core/checkout-entry.js"],
  ["js/core/payment-service.js", "public/js/core/payment-service.js"],
  ["js/destiny-profile.js", "public/js/destiny-profile.js"],
  ["js/saju-engine.js", "public/js/saju-engine.js"],
  ["js/saju-engine-tarot-sukuyo-quantum.js", "public/js/saju-engine-tarot-sukuyo-quantum.js"],
  ["pet-saju.html", "public/pet-saju.html"],
];

const failures = [];
function check(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(`${label} — ${error.message}`);
    console.log(`  ✗ ${label} — ${error.message}`);
  }
}

function bootRuntime() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션 경고는 관심사가 아니다 */ });
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://code-destiny.com/celestial-harmony.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.fetch = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "" });
  for (const file of RUNTIME_FILES) window.eval(read(file));
  assert.equal(typeof window._cdChooseServicePaymentMode, "function", "독립 정적 결제창 렌더러가 설치되어야 한다");
  return window;
}

function openChoice(window, options = {}) {
  return window._cdChooseServicePaymentMode(Object.assign({
    title: "심층 사주 리포트",
    featureKey: "saju-deep",
    coinPrice: 50,
    amountKrw: 5000,
    membershipCreditCost: 500,
  }, options));
}

const choiceModalCount = (window) =>
  window.document.querySelectorAll(window.__cdCheckoutEntry.CHOICE_MODAL_SELECTOR).length;

const clickCard = (window, mode) =>
  window.document.querySelector(`[data-mode="${mode}"]`)?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

// ── ① 연속으로 열어도 결제창 노드는 1개 ────────────────────────────────────
console.log("\n[1] 결제창을 연속으로 열어도 DOM 에 남는 결제창은 1개인가");
{
  const window = bootRuntime();
  const first = openChoice(window);
  const second = openChoice(window);
  check("두 번 열어도 결제창 노드는 1개", () => assert.equal(choiceModalCount(window), 1));
  check("고정 id 가 중복되지 않는다", () => {
    assert.equal(window.document.querySelectorAll("#cdStandalonePaymentChoice").length, 1);
  });
  clickCard(window, "cancel");
  await Promise.all([first, second]);
  check("닫으면 결제창 노드가 남지 않는다", () => assert.equal(choiceModalCount(window), 0));
}

// ── ② 고아 노드(handoff hold 잔류)는 다음 결제창이 걷어간다 ─────────────────
console.log("\n[2] 앞 결제창이 남긴 고아 노드를 다음 결제창이 걷어내는가");
{
  const window = bootRuntime();
  // 셸의 _cdHoldHandoffChoiceModal(12초)·React 의 dropModal(6초)이 남기는 상태를 그대로 재현한다.
  const orphan = window.document.createElement("div");
  orphan.className = "cd-direct-payment-modal is-open";
  window.document.body.appendChild(orphan);
  const reactOrphan = window.document.createElement("div");
  reactOrphan.setAttribute("data-cd-react-payment-choice", "1");
  window.document.body.appendChild(reactOrphan);
  check("사전 조건: 고아 결제창 2개", () => assert.equal(choiceModalCount(window), 2));

  const choice = openChoice(window);
  check("새 결제창이 열리면 고아는 전부 사라진다", () => assert.equal(choiceModalCount(window), 1));
  check("남은 하나는 새로 연 결제창", () => {
    assert.ok(window.document.getElementById("cdStandalonePaymentChoice"));
    assert.equal(orphan.parentNode, null);
    assert.equal(reactOrphan.parentNode, null);
  });
  clickCard(window, "cancel");
  await choice;
}

// ── ③ 공용 락은 TTL 로 자기치유한다 ────────────────────────────────────────
console.log("\n[3] 공용 결제창 락이 TTL 로 자기치유하는가");
{
  const window = bootRuntime();
  const api = window.__cdCheckoutEntry;
  const held = api.acquirePaymentChoiceLock("standalone");
  const node = window.document.createElement("div");
  node.className = "cd-direct-payment-modal";
  window.document.body.appendChild(node);
  api.attachPaymentChoiceNode(held, node);

  check("이미 열려 있으면 두 번째 획득은 거부된다", () => {
    assert.equal(api.acquirePaymentChoiceLock("react"), null);
  });
  check("해제하면 다시 획득된다", () => {
    assert.equal(api.releasePaymentChoiceLock(held), true);
    const next = api.acquirePaymentChoiceLock("react");
    assert.ok(next);
    api.releasePaymentChoiceLock(next);
  });
  check("TTL 을 넘긴 락은 스스로 비워진다", () => {
    const stale = api.acquirePaymentChoiceLock("standalone");
    api.attachPaymentChoiceNode(stale, node);
    stale.startedAt -= api.CHOICE_LOCK_TTL_MS + 1000;
    assert.ok(api.acquirePaymentChoiceLock("react"), "만료된 락이 후속 획득을 막고 있다");
  });
}

// ── ④ 렌더러 우선순위: 로드 순서가 아니라 등급으로 정해진다 ─────────────────
console.log("\n[4] 결제창 렌더러가 로드 순서가 아니라 우선순위로 정해지는가");
{
  const window = bootRuntime();
  const service = window.CodeDestinyPaymentService;
  const shellRenderer = () => Promise.resolve("cancel");
  const standaloneRenderer = () => Promise.resolve("cancel");

  check("getPaymentWindowOwner 가 노출된다", () => {
    assert.equal(typeof service.getPaymentWindowOwner, "function");
  });
  check("독립 정적이 먼저 잡아도 셸이 인수한다", () => {
    assert.equal(service.registerPaymentWindow(standaloneRenderer, "standalone"), true);
    assert.equal(service.registerPaymentWindow(shellRenderer, "canonical-shell"), true);
    assert.equal(service.getPaymentWindowOwner(), "canonical-shell");
  });
  check("셸이 잡은 뒤의 독립 정적 등록은 거부된다", () => {
    assert.equal(service.registerPaymentWindow(standaloneRenderer, "standalone"), false);
    assert.equal(service.getPaymentWindowOwner(), "canonical-shell");
  });
  check("거부·인수 모두 로그를 남긴다(사후 판별 가능)", () => {
    const source = read("js/core/payment-service.js");
    assert.match(source, /PAYMENT_WINDOW_OWNER_REJECTED/);
    assert.match(source, /PAYMENT_WINDOW_OWNER_REPLACED/);
  });
}

// ── ⑤ 셸의 유료기능 인플라이트 락 TTL(6벌 동일) ────────────────────────────
console.log("\n[5] 정적 셸 6벌이 유료기능 인플라이트 락을 자기치유시키는가");
for (const shell of SHELL_MIRRORS) {
  const source = read(shell);
  check(`${shell}: TTL 자가치유 헬퍼가 있다`, () => {
    assert.match(source, /function _cdLivePaidFeatureInFlight\(key\)/);
    assert.match(source, /CD_PAID_FEATURE_INFLIGHT_TTL_MS/);
  });
  check(`${shell}: 소비자 4곳이 모두 헬퍼를 거친다`, () => {
    // 이 4곳이 맵을 직접 읽으면 stale 항목이 그대로 '이미 확인 중'으로 읽혀 자기치유가 무력해진다.
    for (const consumer of [
      "var current = _cdLivePaidFeatureInFlight(key);",
      "var unlockExisting = _cdLivePaidFeatureInFlight(unlockGateFeature);",
      "var existingPaidGate = _cdLivePaidFeatureInFlight(paidGateFeatureKey);",
      "var _tileLockExisting = _cdLivePaidFeatureInFlight(_tileLockGateFeature);",
    ]) {
      assert.ok(source.includes(consumer), `헬퍼를 거치지 않는 소비자: ${consumer}`);
    }
    // 맵을 변수로 꺼내 읽는 구문은 헬퍼 본문 하나뿐이어야 한다(새 우회로 차단).
    const bindingReads = source.match(/=\s*_cdPaidFeatureInFlight\[/g) || [];
    assert.equal(bindingReads.length, 1, `맵 직접 바인딩 ${bindingReads.length}곳 — 헬퍼 우회로가 생겼다`);
  });
  check(`${shell}: 결제창 스윕과 공용 락 연결이 있다`, () => {
    assert.match(source, /_cdSweepOrphanChoiceModals\(modal\);/);
    assert.match(source, /_cdPublishChoiceModalToSharedLock\(modal\);/);
    assert.match(source, /_cdPublishChoiceModalToSharedLock\(null\);/);
  });
}

// ── ⑥ 숙요 유료 5종 게이트 가드 ────────────────────────────────────────────
console.log("\n[6] 숙요 유료 5종 게이트가 중복 호출을 막는가");
{
  const source = read("js/saju-engine-tarot-sukuyo-quantum.js");
  check("인플라이트 맵과 TTL 이 있다", () => {
    assert.match(source, /_sySukuyoPaidGateInFlight/);
    assert.match(source, /SY_SUKUYO_PAID_GATE_TTL_MS/);
  });
  check("requestId 가 결정론적이다(랜덤 금지)", () => {
    assert.match(source, /requestId: 'sukuyo-paid:' \+ inFlightKey/);
    const gateBody = source.slice(source.indexOf("function syOpenPaidSukuyoFeature"), source.indexOf("function syRequirePaidSukuyoFeature"));
    assert.ok(!/Math\.random\(\)/.test(gateBody), "게이트 requestId 에 Math.random 이 남아 있다");
  });
  check("진행 중이면 게이트를 다시 열지 않는다", () => {
    assert.match(source, /if \(startedAt && \(Date\.now\(\) - startedAt\) < SY_SUKUYO_PAID_GATE_TTL_MS\) return true;/);
  });
}

// ── ⑦ 미러 정합성 ──────────────────────────────────────────────────────────
console.log("\n[7] js/ ↔ public/ 사본이 갈라지지 않았는가");
for (const [source, mirror] of MIRRORED_RUNTIMES) {
  check(`${mirror} 가 ${source} 와 동일`, () => {
    assert.equal(read(mirror), read(source), "사본이 갈라졌다 — 한쪽만 고쳤다");
  });
}

if (failures.length) {
  console.error(`\n[verify-payment-choice-single-instance] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-payment-choice-single-instance] PASS");
