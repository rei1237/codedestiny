// 홈 대표 상담 팝업은 결제 복귀 문서를 덮지 않는다 — js/core/home-funnel.js jsdom 실행 검증.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const script = fs.readFileSync(path.resolve(__dirname, "../../js/core/home-funnel.js"), "utf8");
const ORDER = "ord_return_1";
const CARDS = Array.from({ length: 6 }, (_, i) => `<a data-cd-service-id="s${i}" href="/s${i}/"><h3 class="cd-sig-card__title">상담 ${i}</h3></a>`).join("");
const open = [];

// 복귀 재개가 먼저 돌아 주소를 걷어낸 문서를 재현하려면 before 에서 replaceState 한다.
function boot({ url = "https://code-destiny.com/ggulggul/", storage = {}, before } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="ko"><body><div id="cdHomeFunnel"><div id="cdSigGrid">${CARDS}</div></div></body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  open.push(window);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.performance.getEntriesByType = (type) => (type === "navigation" ? [{ name: url }] : []);
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  if (before) before(window);
  window.eval(script);
  return window;
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 1700));
const popupOpen = (window) => {
  const popup = window.document.getElementById("cdSignatureConsultPopup");
  return !!popup && !popup.hidden;
};
const ticket = (ageMs) => JSON.stringify({ at: Date.now() - ageMs, merchantUid: ORDER, confirmBody: { merchantUid: ORDER } });

test.afterEach(() => { while (open.length) open.pop().close(); });

test("일반 홈 방문은 팝업이 그대로 열린다", async () => {
  const window = boot({ url: "https://code-destiny.com/ggulggul/?utm_source=qa" });
  await settled();
  assert.equal(popupOpen(window), true);
});

test("결제 복귀 쿼리가 있는 문서에서는 열리지 않고, 닫음 기록도 남기지 않는다", async () => {
  const window = boot({ url: `https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=${ORDER}` });
  await settled();
  assert.equal(popupOpen(window), false);
  assert.equal(window.sessionStorage.getItem("cd_signature_consult_session_closed_v1"), null);
  assert.equal(window.localStorage.getItem("cd_signature_consult_hide_until_v1"), null);
});

test("재개가 먼저 쿼리를 걷어내도 문서가 처음 받은 주소로 복귀를 판정한다", async () => {
  const window = boot({
    url: `https://code-destiny.com/ggulggul/?portone_redirect=1&paymentId=${ORDER}`,
    before: (win) => win.history.replaceState(null, "", "/ggulggul/"),
  });
  await settled();
  assert.equal(window.location.search, "");
  assert.equal(popupOpen(window), false);
});

test("재개가 판정 뒤에 티켓을 지워도 이 문서에서는 계속 열리지 않는다", async () => {
  const window = boot({ storage: { cd_direct_payment_resume: ticket(120000) } });
  window.localStorage.removeItem("cd_direct_payment_resume");
  await settled();
  assert.equal(popupOpen(window), false);
});

test("만료된 티켓은 복귀가 아니므로 팝업이 열린다", async () => {
  const window = boot({ storage: { cd_direct_payment_resume: ticket(31 * 60 * 1000) } });
  await settled();
  assert.equal(popupOpen(window), true);
});
