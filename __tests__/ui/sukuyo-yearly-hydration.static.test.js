const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

// 카드는 접힌 채로 그려진다 — 실제 마크업(syRenderSukuyoAnnualMonthlySections)과 같은 계약.
const SECTION_HTML = [
  '<div class="sy-card is-collapsed" data-sy-yearly-fortune-card>',
  '<input data-sy-yearly-input type="number" value="2026">',
  '<button type="button" data-sy-yearly-view aria-expanded="false">보기</button>',
  '<span data-sy-monthly-status>Locked</span>',
  '<div id="syYearlyFortuneContent"></div>',
  "</div>",
].join("");

const UNLOCKED_PAYLOAD = {
  ok: true,
  unlocked: true,
  contentKey: "sukyo_yearly_fortune_unlock:2026",
  unlockScope: { profileId: "P1", targetYear: 2026 },
  result: {
    profileSummary: {},
    yearlyTheme: { title: "Theme", summary: "Summary", keywords: [] },
    calculationBasis: {},
    totalFortune: {}, firstHalf: {}, secondHalf: {},
    loveAndRelationship: {}, workAndBusiness: {}, money: {}, healthAndMind: {},
    noblePersonAndCaution: {}, sukuyoMasterFocus: {}, finalPrescription: {},
    monthlyFlow: [],
  },
};

function bootEngine() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="sukuyoSection">' + SECTION_HTML + "</div></body></html>",
    { runScripts: "outside-only", url: "https://code-destiny.com/" },
  );
  const { window } = dom;
  const previousWindow = global.window;
  const previousDocument = global.document;
  global.window = window;
  global.document = window.document;

  const state = {
    count: 0,
    paths: [],
    respond: null,
    gateCalls: [],
    gateResult: { status: "cancelled" },
    unlockedKeys: new Set(),
    markedKeys: [],
  };
  window.alert = (message) => { throw new Error("Unexpected alert: " + message); };
  window._cdResolveCurrentProfileIdForAccess = () => "P1";
  window.fetchJsonWithAuth = (requestPath) => {
    state.count += 1;
    state.paths.push(requestPath);
    return Promise.resolve(state.respond());
  };
  // 해금 판정은 서버가 아니라 이 로컬 스토어에서 나온다. 연도별 contentKey 단위로 답한다.
  window.CodeDestinyAccessStore = {
    isUnlocked: (key) => state.unlockedKeys.has(key),
    getSnapshot: () => ({ status: "ready" }),
    ensureLoaded: () => Promise.resolve(null),
    markConfirmedUnlocked: (key) => { state.markedKeys.push(key); state.unlockedKeys.add(key); },
  };
  window.isTileKeyUnlocked = (key) => state.unlockedKeys.has(key);
  // 🔴 즉시 resolve 하면 _sySukuyoYearlyUnlockBusy in-flight 가드가 한 틱도 서지 못해
  // "중복 오픈" 을 잡지 못한다(지연 0 하네스 함정). 한 틱 뒤에 답한다.
  window._cdOpenPaidServiceGate = (options) => {
    state.gateCalls.push(options);
    return new Promise((resolve) => setTimeout(() => resolve(state.gateResult), 5));
  };
  state.respond = () => ({ ok: true, status: 200, payload: UNLOCKED_PAYLOAD });

  const source = fs.readFileSync(
    path.join(process.cwd(), "js/saju-engine-tarot-sukuyo-quantum.js"),
    "utf8",
  );
  window.eval(source + "\n;window.__syYearlyApi={bind:syBindSukuyoMonthlyUnlock,hydrate:syHydrateSukuyoYearlyFortune,open:syOpenSukuyoYearlyPanel};");

  return {
    window,
    state,
    api: window.__syYearlyApi,
    view: () => window.document.querySelector("[data-sy-yearly-view]"),
    card: () => window.document.querySelector("[data-sy-yearly-fortune-card]"),
    body: () => window.document.getElementById("syYearlyFortuneContent"),
    cta: () => window.document.querySelector("[data-sy-yearly-unlock]"),
    rerender: () => { window.document.getElementById("sukuyoSection").innerHTML = SECTION_HTML; },
    restore: () => { global.window = previousWindow; global.document = previousDocument; },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

test("binding alone never touches the network or the payment gate", async () => {
  const env = bootEngine();
  try {
    for (let i = 0; i < 5; i += 1) env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    await settle();
    assert.equal(env.state.count, 0);
    assert.equal(env.state.gateCalls.length, 0);
    assert.equal(env.view().textContent, "보기");
  } finally {
    env.restore();
  }
});

test("expanding a locked year shows the unlock CTA with zero server round trips", async () => {
  const env = bootEngine();
  try {
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();

    assert.equal(env.state.count, 0, "a locked year must not be fetched before payment");
    assert.equal(env.state.gateCalls.length, 0, "expanding is not a purchase");
    assert.ok(env.cta(), "the unlock CTA is the only way in");
    assert.equal(env.card().classList.contains("is-collapsed"), false);
    assert.equal(env.view().textContent, "접기");
    assert.equal(env.view().getAttribute("aria-expanded"), "true");
    // 조회를 안 했으니 실패 안내가 나올 자리가 없다.
    assert.equal(env.body().querySelector("[data-sy-yearly-retry]"), null);
    assert.equal(env.body().textContent.includes("붐벼요"), false);
  } finally {
    env.restore();
  }
});

test("the view button collapses again and stays offline", async () => {
  const env = bootEngine();
  try {
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();
    env.view().click();
    await settle();

    assert.equal(env.card().classList.contains("is-collapsed"), true);
    assert.equal(env.view().textContent, "보기");
    assert.equal(env.view().getAttribute("aria-expanded"), "false");
    assert.equal(env.state.count, 0);
  } finally {
    env.restore();
  }
});

test("expanding an unlocked year loads the body exactly once", async () => {
  const env = bootEngine();
  try {
    env.state.unlockedKeys.add("sukyo_yearly_fortune_unlock:2026");
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();

    assert.equal(env.state.count, 1);
    assert.match(env.state.paths[0], /^\/api\/sukuyo\/yearly-fortune\?profileId=P1&year=2026$/);
    assert.equal(env.state.gateCalls.length, 0, "an unlocked year must render, not charge");
    assert.equal(env.cta(), null, "no unlock CTA once the year is open");
  } finally {
    env.restore();
  }
});

test("owning one year does not unlock another", async () => {
  const env = bootEngine();
  try {
    env.state.unlockedKeys.add("sukyo_yearly_fortune_unlock:2026");
    // 연도 무관 featureKey 도 함께 켜진다 — 서버 access-state 가 실제로 둘 다 내려보낸다.
    env.state.unlockedKeys.add("sukyo_yearly_fortune_unlock");
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });

    env.window.document.querySelector("[data-sy-yearly-input]").value = "2027";
    env.view().click();
    await settle();

    assert.equal(env.state.count, 0, "2027 is not paid for, so it must not be fetched");
    assert.ok(env.cta(), "2027 must still offer the unlock CTA");
  } finally {
    env.restore();
  }
});

test("the CTA opens the gate for that year with no pre-check round trip", async () => {
  const env = bootEngine();
  try {
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();

    env.cta().click();
    await settle();

    assert.equal(env.state.paths.filter((p) => p.includes("/unlock")).length, 0);
    assert.equal(env.state.gateCalls.length, 1);
    assert.equal(env.state.gateCalls[0].featureKey, "sukyo_yearly_fortune_unlock");
    assert.equal(env.state.gateCalls[0].contentKey, "sukyo_yearly_fortune_unlock:2026");
    assert.equal(env.state.gateCalls[0].amountKrw, 10000);
    assert.ok(env.cta(), "cancelling leaves the CTA in place");
  } finally {
    env.restore();
  }
});

test("a granted payment verifies, records the unlock locally, then loads the body", async () => {
  const env = bootEngine();
  try {
    env.state.gateResult = { status: "granted", transactionId: "TX1" };
    env.state.respond = () => {
      const last = env.state.paths[env.state.paths.length - 1];
      if (last.includes("verify-payment")) {
        return { ok: true, status: 200, payload: { ok: true, unlocked: true, targetYear: 2026 } };
      }
      return { ok: true, status: 200, payload: UNLOCKED_PAYLOAD };
    };

    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();
    env.cta().click();
    await settle();

    assert.equal(env.state.gateCalls.length, 1);
    assert.equal(env.state.paths.filter((p) => p.includes("verify-payment")).length, 1);
    assert.deepEqual(env.state.markedKeys, ["sukyo_yearly_fortune_unlock:2026"]);
    assert.equal(env.state.paths.filter((p) => p.includes("yearly-fortune?")).length, 1);
    assert.equal(env.cta(), null, "the body replaces the lock panel once unlocked");
  } finally {
    env.restore();
  }
});

test("a failed body load offers a retry and never re-sells an owned year", async () => {
  const env = bootEngine();
  try {
    env.state.unlockedKeys.add("sukyo_yearly_fortune_unlock:2026");
    env.state.respond = () => ({ ok: false, status: 503, payload: { code: "SERVICE_UNAVAILABLE", message: "db" } });

    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.view().click();
    await settle();

    assert.equal(env.state.count, 1);
    assert.ok(env.body().querySelector("[data-sy-yearly-retry]"), "an owner gets a retry");
    assert.equal(env.cta(), null, "an owner must not be shown a 10,000-won unlock button");
  } finally {
    env.restore();
  }
});
