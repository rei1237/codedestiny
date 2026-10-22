// 사주 섹션 영구 해금(라이트 사주 풀이·대운) 결제 후 재개 — 셸 핸들러 jsdom 실행 검증.
//
// 배경: 모바일 단건 결제는 PG 가 상위 프레임을 리다이렉트해 tryUnlockFeature·보고서 타일 게이트의
// await 가 문서와 함께 죽는다. 2026-10-22 이전에는 두 자리가 resume 서술자를 싣지 않아, 복귀한
// 사용자는 돈을 내고도 빈 사주 입력 폼과 "결제 완료" 카드만 봤다. 지금은 index.html 의
// _cdRunSajuSectionUnlockResume 이 결제한 카드로 사주를 다시 계산하고 그 본문을 연다.
// 호출부 배선은 scripts/verify-paid-resume-wiring.mjs 가 AST 로 지키고, 여기서는 핸들러를 실제로
// 실행해 계산 요청·해금 마무리·게이트 재호출 0회를 잰다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");

// 상수 선언부터 등록 IIFE 끝까지. 셸 IIFE 안의 블록이라 바깥 함수는 boot 가 전역 스텁으로 채운다.
function handlerBlock() {
  const start = shell.indexOf("var SAJU_SECTION_UNLOCK_RESUME_KIND");
  const register = shell.indexOf("(function _cdRegisterSajuSectionUnlockResume()", start);
  assert.ok(start > 0 && register > start, "index.html 에서 사주 섹션 재개 블록을 찾지 못했다");
  const innerEnd = shell.indexOf("})();", register) + "})();".length;
  const outerEnd = shell.indexOf("})();", innerEnd) + "})();".length;
  return shell.slice(start, outerEnd);
}

function boot(options) {
  const opts = options || {};
  const dom = new JSDOM(`<!doctype html><html><body>${opts.body || ""}</body></html>`, {
    url: "https://code-destiny.com/ggulggul/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  const calls = { run: [], finalize: [], scroll: [], tile: [], gates: 0, registered: {} };
  const unlocked = new Set();
  window.Element.prototype.scrollIntoView = function () {};
  window.__currentProfile = opts.currentProfile || "";
  window._cdBirthScopeCurrentProfileId = () => window.__currentProfile;
  window._cdCheckoutEntry = () => ({ registerPaidResumeHandler: (kind, fn) => { calls.registered[kind] = fn; } });
  window._cdFinalizeUnlockState = (featureKey, payload) => {
    calls.finalize.push({ featureKey, payload });
    if (opts.finalizeUnlocks !== false) unlocked.add(featureKey);
  };
  window.isTileKeyUnlocked = (featureKey) => unlocked.has(featureKey);
  window._cdScrollUnlockedSectionIntoView = (featureKey) => { calls.scroll.push(featureKey); };
  window._cdInvokeUnlockedTileAction = (action, node) => { calls.tile.push({ action, node }); };
  // 결제 게이트들 — 재개 중 하나라도 불리면 결제 선택이 다시 열린다.
  for (const gate of ["tryUnlockFeature", "_cdOpenPaidServiceGate", "_cdRunDirectKrwCheckout", "_cdCoinGatePerUse"]) {
    window[gate] = () => { calls.gates += 1; };
  }
  // 사주 계산은 비동기로 끝난다. 끝나면 게이트·보고서 카드가 그려지고 요약 인자가 새 객체로 바뀐다.
  window.dpRunWithProfile = (profileId) => {
    calls.run.push(profileId);
    window.setTimeout(() => {
      window.__currentProfile = profileId;
      window.document.body.insertAdjacentHTML("beforeend", opts.renderedHtml || '<div id="summaryGate"></div>');
      window.__cdLastSummaryArgs = { p: profileId };
    }, 50);
  };
  window.eval(handlerBlock());
  return { window, calls };
}

const GRANT_PAYLOAD = { ok: true, accessGrant: { ok: true, featureKey: "section_summary" } };
function grantFor(featureKey) {
  return { ok: true, source: "redirect-resume", featureKey, profileId: "p1", requestId: "req_1", merchantUid: "ord_1", payload: GRANT_PAYLOAD };
}

test("라이트 사주 풀이 단건 결제는 재개 서술자를 만들고, 그 kind 의 핸들러가 등록된다", () => {
  const { window, calls } = boot({ currentProfile: "p1" });
  const descriptor = window._cdBuildSajuSectionUnlockResume("section_summary", "");
  assert.equal(descriptor.kind, "saju-section-unlock");
  assert.equal(typeof calls.registered[descriptor.kind], "function");
  // 티켓에 직렬화되는 값이라 원시값만 싣는다(checkout-entry sanitizePaidResumeDescriptor).
  for (const value of Object.values(descriptor.args)) assert.equal(typeof value, "string");
  assert.equal(descriptor.args.profileId, "p1");
  assert.equal(window.SAJU_SECTION_UNLOCK_TITLES.section_summary, "라이트 사주 풀이");
  // 공유 타일 게이트는 사주 섹션 키일 때만, 출생 카드가 있을 때만 서술자를 싣는다.
  assert.equal(window._cdBuildSajuSectionUnlockResume("tarot_premium", ""), null);
  window.__currentProfile = "";
  assert.equal(window._cdBuildSajuSectionUnlockResume("section_summary", ""), null);
});

test("빈 복귀 문서: 결제한 카드로 사주를 다시 계산하고, 새 명식이 뜬 뒤 본문을 열어 그 섹션으로 옮긴다 — 게이트 0회", async () => {
  const { window, calls } = boot({ currentProfile: "p1" });
  const descriptor = window._cdBuildSajuSectionUnlockResume("section_summary", "");
  window.__currentProfile = ""; // 리다이렉트 복귀 문서에는 아직 계산된 사주가 없다.
  const opened = await calls.registered[descriptor.kind](descriptor, grantFor("section_summary"));
  assert.equal(opened, true);
  assert.deepEqual(calls.run, ["p1"]);
  assert.deepEqual(calls.finalize, [{ featureKey: "section_summary", payload: GRANT_PAYLOAD }]);
  assert.deepEqual(calls.scroll, ["section_summary"]);
  assert.equal(calls.gates, 0);
});

test("같은 카드의 결과가 이미 떠 있으면 다시 계산하지 않고 바로 연다", async () => {
  const { window, calls } = boot({ currentProfile: "p1", body: '<div id="summaryGate"></div>' });
  window.__cdLastSummaryArgs = { p: "p1" };
  const descriptor = window._cdBuildSajuSectionUnlockResume("section_summary", "");
  const opened = await calls.registered[descriptor.kind](descriptor, grantFor("section_summary"));
  assert.equal(opened, true);
  assert.deepEqual(calls.run, []);
  assert.equal(calls.finalize.length, 1);
  assert.equal(calls.gates, 0);
});

test("보고서 타일에서 결제했으면 카드가 그려진 뒤 그 타일을 연다", async () => {
  const { window, calls } = boot({
    currentProfile: "p1",
    renderedHtml: '<div id="summaryGate"></div><section class="rpt-v2-block" id="rpt-v2-section-core">'
      + '<button data-action="sajuprompt" data-tile-lock-key="section_summary">열기</button></section>',
  });
  const descriptor = window._cdBuildSajuSectionUnlockResume("section_summary", "", "rpt-v2-section-core", "sajuprompt");
  window.__currentProfile = "";
  const opened = await calls.registered[descriptor.kind](descriptor, grantFor("section_summary"));
  assert.equal(opened, true);
  assert.equal(calls.tile.length, 1);
  assert.equal(calls.tile[0].action, "sajuprompt");
  assert.equal(calls.tile[0].node.getAttribute("data-tile-lock-key"), "section_summary");
  assert.equal(window.sessionStorage.getItem("cd_pa_sajuprompt"), "1");
  assert.equal(calls.gates, 0);
});

test("해금이 확인되지 않으면 false 를 돌려 기존 '결제 완료' 카드로 넘긴다", async () => {
  const { window, calls } = boot({ currentProfile: "p1", finalizeUnlocks: false });
  const descriptor = window._cdBuildSajuSectionUnlockResume("section_summary", "");
  const opened = await calls.registered[descriptor.kind](descriptor, grantFor("section_summary"));
  assert.equal(opened, false);
  assert.deepEqual(calls.scroll, []);
  assert.equal(calls.gates, 0);
});
