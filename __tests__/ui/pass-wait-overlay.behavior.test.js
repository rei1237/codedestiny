// 꽃돼지 이용권 대기 오버레이 **실행** 검증.
//
// 🔴 왜 정적 단언으로는 부족한가: access-state-bootstrap.static.test.js 는 셸 소스에
// `_cdSetCoinGateOverlay(true, passCheckingText, 'pass')` 가 있는지만 봤다. 그 호출은 실제로는
// _cdPaymentWaitUiBlocked 의 조건 ②("결제수단 선택 모달이 떠 있는 동안 대기 화면 금지")에 걸려
// **한 번도 그려지지 않았는데도** 테스트는 계속 통과했다. 결제창은 이용권 확인이 끝난 뒤에야 닫히므로
// 클릭 시점에는 항상 DOM 에 있고, mode 'pass' 는 TERMINAL 정규식에 없기 때문이다.
//
// 그래서 여기서는 셸의 판정 소스를 **원문 그대로 잘라 실행**하고, 뚫려야 할 것과 막혀야 할 것을
// 모두 확인한다. 조건 하나만 바뀌어도 이 파일이 먼저 깨진다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shellSource = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");

// 매개변수 목록의 중괄호(`options = {}`)를 본문 시작으로 오인하지 않도록 괄호부터 건너뛴다.
function grabFunction(header) {
  const start = shellSource.indexOf(header);
  assert.ok(start >= 0, `not found: ${header}`);
  let paren = 0;
  let i = start;
  for (; i < shellSource.length; i += 1) {
    const c = shellSource[i];
    if (c === "(") paren += 1;
    else if (c === ")") { paren -= 1; if (paren === 0) { i += 1; break; } }
  }
  let depth = 0;
  let seen = false;
  for (; i < shellSource.length; i += 1) {
    const c = shellSource[i];
    if (c === "{") { depth += 1; seen = true; }
    else if (c === "}") { depth -= 1; if (seen && depth === 0) return shellSource.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces: ${header}`);
}

function grabLine(re) {
  const m = shellSource.match(re);
  assert.ok(m, `not found: ${re}`);
  return m[0];
}

function buildOverlayApi() {
  // DOM·타이머를 보는 부분은 결과만 주입한다. 판정 본체(아래 parts)는 셸 원문 그대로다.
  const harness = `
    var __choiceModalOpen = false;
    var __preCheckoutSuppressed = false;
    var __pgWindowActive = false;
    var __overlayCalls = [];
    var _cdPassCheckAllowOwnOverlay = false;
    function _cdPaymentChoiceModalOpen() { return __choiceModalOpen; }
    function _cdPreCheckoutWaitUiSuppressed() { return __preCheckoutSuppressed; }
    function _cdDirectPgWindowSuppressedMode() { return __pgWindowActive; }
    function _cdSetCoinGateOverlay(isOpen, message, mode) {
      if (isOpen && _cdPaymentWaitUiBlocked(mode)) return;
      __overlayCalls.push({ message: message, mode: mode });
    }
  `;
  const parts = [
    grabLine(/var CD_DIRECT_PG_TERMINAL_MODE_RE = .*;/),
    grabLine(/var CD_WAIT_UI_ALLOWED_MODE_RE = .*;/),
    grabFunction("function _cdShowPassCheckWaitOverlay("),
    grabFunction("function _cdPaymentWaitUiBlocked("),
  ];
  // eslint-disable-next-line no-new-func
  return new Function(`
    ${harness}
    ${parts.join("\n")}
    return {
      show: function (m) { return _cdShowPassCheckWaitOverlay(m); },
      raw: function (m, mode) { return _cdSetCoinGateOverlay(true, m, mode); },
      painted: function () { return __overlayCalls.length; },
      last: function () { return __overlayCalls[__overlayCalls.length - 1] || null; },
      set: function (k, v) {
        if (k === 'choiceModal') __choiceModalOpen = v;
        if (k === 'preCheckout') __preCheckoutSuppressed = v;
        if (k === 'pgWindow') __pgWindowActive = v;
      },
    };
  `)();
}

test("결제창이 열린 채 이용권을 눌러도 대기 오버레이가 실제로 그려진다", () => {
  const api = buildOverlayApi();
  api.set("choiceModal", true);
  api.show("이용권을 확인하고 있습니다.");
  assert.equal(api.painted(), 1, "이용권 확인 대기 화면이 그려지지 않았다");
  assert.equal(api.last().mode, "pass");
  assert.equal(api.last().message, "이용권을 확인하고 있습니다.");
});

test("헬퍼를 거치지 않은 오버레이는 결제창 위에서 여전히 막힌다", () => {
  const api = buildOverlayApi();
  api.set("choiceModal", true);
  api.raw("이용권 확인 중", "pass");
  assert.equal(api.painted(), 0, "결제창 위로 임의 대기 화면이 뚫렸다");
});

test("단건 결제(card)는 선택창이 닫힌 뒤(사용자가 이미 고른 뒤)에는 대기 화면을 얻는다", () => {
  // 2026-08-10: 'card'가 허용목록에 추가됐다 — 결제수단을 고르기 전에 새던 과거 사고와 달리,
  // 선택창이 이미 닫힌 뒤(_cdShowDirectPgWaitOverlay 가 실제로 부르는 시점)에는 통과해야 한다.
  const api = buildOverlayApi();
  api.raw("카드 결제 준비", "card");
  assert.equal(api.painted(), 1, "단건 결제 준비 화면이 뜨지 않았다");
  assert.equal(api.last().mode, "card");
});

test("단건 결제(card)도 선택창·PG창이 떠 있는 동안에는 여전히 막힌다", () => {
  // 허용목록(④)이 풀려도 ①②③ 억제는 그대로다 — 선택창을 가리거나 PG창 위에 겹치면 안 된다.
  const api = buildOverlayApi();
  api.set("choiceModal", true);
  api.raw("카드 결제 준비", "card");
  assert.equal(api.painted(), 0, "선택창이 떠 있는 동안 단건 대기 화면이 새어나갔다");

  const api2 = buildOverlayApi();
  api2.set("pgWindow", true);
  api2.raw("카드 결제 준비", "card");
  assert.equal(api2.painted(), 0, "PG 결제창 위로 단건 대기 화면이 겹쳤다");
});

test("PG 결제창이 열려 있는 동안에는 이용권 대기 화면도 막힌다", () => {
  const api = buildOverlayApi();
  api.set("choiceModal", true);
  api.set("pgWindow", true);
  api.show("이용권을 확인하고 있습니다.");
  assert.equal(api.painted(), 0, "PG 결제창을 덮었다");
});

test("결제창이 뜨기 직전 억제 구간에서는 이용권 대기 화면도 막힌다", () => {
  const api = buildOverlayApi();
  api.set("preCheckout", true);
  api.show("이용권을 확인하고 있습니다.");
  assert.equal(api.painted(), 0, "선-결제창 억제 구간이 뚫렸다");
});

test("통과 플래그는 헬퍼 호출이 끝나면 반드시 내려간다", () => {
  const api = buildOverlayApi();
  api.set("choiceModal", true);
  api.show("확인 중");
  api.raw("뒤따라 끼어든 오버레이", "pass");
  assert.equal(api.painted(), 1, "플래그가 남아 이후 오버레이까지 통과시켰다");
});
