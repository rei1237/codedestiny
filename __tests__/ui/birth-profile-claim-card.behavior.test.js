// 프로필 선택 지급 카드 — jsdom 실행 검증.
//
// 출생 기반 전환 전 주문은 생년월일을 몰라 지급이 보류된다(worker/payments/birth-profile-claim.js).
// 로그인 뒤 대기 주문이 있으면 카드가 떠야 하고, 고른 프로필로 claim 이 나가야 하며, 활성 프로필은
// 바뀌지 않아야 한다. 대기 주문이 없으면 아무 것도 띄우지 않는다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const profileJs = fs.readFileSync(path.join(root, "js/destiny-profile.js"), "utf8");

function jsonResponse(body, status) {
  const text = JSON.stringify(body);
  const code = status || 200;
  const res = {
    ok: code >= 200 && code < 300,
    status: code,
    headers: { get: (k) => (String(k).toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  };
  res.clone = () => res;
  return res;
}

function boot({ orders, pathname = "/saju/basic" }) {
  const dom = new JSDOM("<!doctype html><html><body><main></main></body></html>", {
    url: `https://code-destiny.com${pathname}`, pretendToBeVisual: true, runScripts: "outside-only",
  });
  const { window } = dom;
  if (typeof window.Headers === "undefined") window.Headers = Headers;
  if (typeof window.AbortController === "undefined") window.AbortController = AbortController;
  const calls = { list: 0, claims: [], refreshed: 0 };
  window.localStorage.setItem("fortune_auth_token", "test-token");
  window.alert = () => {};
  window.confirm = () => true;
  window._cdSetCoinGateOverlay = () => {};
  window.CodeDestinyUserAccessCache = { refreshUserAccessAfterPayment: () => { calls.refreshed += 1; return Promise.resolve(); } };
  let pending = orders.slice();
  window.fetch = (url, init) => {
    const target = String(url);
    if (/\/api\/payments\/birth-profile-pending$/.test(target)) {
      calls.list += 1;
      return Promise.resolve(jsonResponse({ ok: true, orders: pending }));
    }
    const claim = target.match(/\/api\/payments\/birth-profile-pending\/([^/]+)\/claim$/);
    if (claim) {
      calls.claims.push({ orderId: decodeURIComponent(claim[1]), method: init.method, body: JSON.parse(init.body) });
      pending = pending.filter((order) => order.orderId !== decodeURIComponent(claim[1]));
      return Promise.resolve(jsonResponse({ ok: true, replayed: false }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };
  window.eval(profileJs);
  // 부팅 조회는 비동기라, 그 전에 저장 프로필 목록을 고정한다.
  window.__cdListDestinyProfiles = () => [{ id: "p1", name: "나" }, { id: "p2", name: "엄마" }];
  return { window, calls };
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`시간 안에 일어나지 않았다: ${label}`);
}

test("대기 주문이 있으면 카드가 뜨고, 고른 프로필로 claim 하고 접근 캐시를 갱신한다", async () => {
  const { window, calls } = boot({ orders: [{ orderId: "cd-single-retro-0001", featureKey: "section_summary", productName: "사주 종합풀이", requiresPartner: false }] });
  await waitFor(() => window.document.getElementById("cdDirectResumeCard"), "카드 표시");
  const card = window.document.getElementById("cdDirectResumeCard");
  assert.match(card.textContent, /사주 종합풀이/);
  const buttons = [...card.querySelectorAll("button.cd-direct-resume-open")];
  assert.deepEqual(buttons.map((b) => b.textContent), ["나", "엄마"]);

  buttons[1].click();
  await waitFor(() => calls.claims.length === 1, "claim 요청");
  assert.deepEqual(calls.claims[0], { orderId: "cd-single-retro-0001", method: "POST", body: { profileId: "p2", partnerProfileId: "" } });
  await waitFor(() => calls.refreshed === 1, "접근 캐시 갱신");
  assert.equal(window.document.getElementById("cdDirectResumeCard"), null);
});

test("상대 프로필이 필요한 주문은 두 번 골라 본인 → 상대 순서로 보낸다", async () => {
  const { window, calls } = boot({ orders: [{ orderId: "cdv2compat01", featureKey: "section_compat", productName: "궁합", requiresPartner: true }] });
  await waitFor(() => window.document.getElementById("cdDirectResumeCard"), "카드 표시");
  const buttons = [...window.document.querySelectorAll("#cdDirectResumeCard button.cd-direct-resume-open")];
  buttons[0].click();
  assert.equal(calls.claims.length, 0, "첫 선택만으로 지급하면 안 된다");
  buttons[1].click();
  await waitFor(() => calls.claims.length === 1, "claim 요청");
  assert.deepEqual(calls.claims[0].body, { profileId: "p1", partnerProfileId: "p2" });
});

test("대기 주문이 없거나 /points 면 카드를 띄우지 않는다", async () => {
  const empty = boot({ orders: [] });
  await waitFor(() => empty.calls.list === 1, "목록 조회");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(empty.window.document.getElementById("cdDirectResumeCard"), null);

  const points = boot({ orders: [{ orderId: "x", featureKey: "section_summary", requiresPartner: false }], pathname: "/points/" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(points.calls.list, 0, "/points 는 복귀를 PointsClient 가 맡는다");
});
