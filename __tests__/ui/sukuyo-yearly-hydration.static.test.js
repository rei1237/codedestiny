const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const SECTION_HTML = [
  '<div class="sy-card" data-sy-yearly-fortune-card>',
  '<input data-sy-yearly-input type="number" value="2026">',
  '<button type="button" data-sy-yearly-view>View</button>',
  '<span data-sy-monthly-status>Locked</span>',
  '<div id="syYearlyFortuneContent"></div>',
  "</div>",
].join("");

const LOCKED_PAYLOAD = {
  ok: true,
  unlocked: false,
  contentKey: "sukyo_yearly_fortune_unlock:2026",
  unlockScope: { profileId: "P1", targetYear: 2026 },
  preview: {
    yearlyTheme: { title: "Theme", summary: "Summary", keywords: ["relation"] },
    profileSummary: {},
    monthlyPreview: [],
  },
};

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

  const state = { count: 0, paths: [], respond: null, gateCalls: [] };
  window.alert = (message) => { throw new Error("Unexpected alert: " + message); };
  window._cdResolveCurrentProfileIdForAccess = () => "P1";
  window.fetchJsonWithAuth = (requestPath) => {
    state.count += 1;
    state.paths.push(requestPath);
    return Promise.resolve(state.respond());
  };
  // 🔴 즉시 resolve 하면 _sySukuyoYearlyUnlockBusy in-flight 가드가 한 틱도 서지 못해
  // "중복 오픈" 을 잡지 못한다(지연 0 하네스 함정). 한 틱 뒤에 미승인으로 닫는다.
  window._cdOpenPaidServiceGate = (options) => {
    state.gateCalls.push(options);
    return new Promise((resolve) => setTimeout(() => resolve({ status: "cancelled" }), 5));
  };
  state.respond = () => ({ ok: true, status: 200, payload: LOCKED_PAYLOAD });

  const source = fs.readFileSync(
    path.join(process.cwd(), "js/saju-engine-tarot-sukuyo-quantum.js"),
    "utf8",
  );
  window.eval(source + "\n;window.__syYearlyApi={bind:syBindSukuyoMonthlyUnlock,hydrate:syHydrateSukuyoYearlyFortune};");

  return {
    window,
    state,
    api: window.__syYearlyApi,
    rerender: () => { window.document.getElementById("sukuyoSection").innerHTML = SECTION_HTML; },
    restore: () => { global.window = previousWindow; global.document = previousDocument; },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

test("Sukuyo yearly access stays idle until explicit entry and dedupes concurrent reads", async () => {
  const env = bootEngine();
  try {
    const reading = { targetYear: 2026, monthlyFlow: [] };

    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 0);

    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();
    assert.equal(env.state.count, 1);
    assert.match(env.state.paths[0], /^\/api\/sukuyo\/yearly-fortune\?profileId=P1&year=2026$/);

    for (let i = 0; i < 5; i += 1) env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 1);

    env.api.hydrate(env.window._sySukuyoYearlyReading);
    env.api.hydrate(env.window._sySukuyoYearlyReading);
    env.api.hydrate(env.window._sySukuyoYearlyReading);
    await settle();
    assert.equal(env.state.count, 2);
  } finally {
    env.restore();
  }
});

test("rerender and transient failure do not trigger automatic yearly retries", async () => {
  const env = bootEngine();
  try {
    const reading = { targetYear: 2026, monthlyFlow: [] };

    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 0);
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();
    assert.equal(env.state.count, 1);

    env.rerender();
    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 1);
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();
    assert.equal(env.state.count, 2);

    env.state.respond = () => ({ ok: false, status: 503, payload: { code: "SERVICE_UNAVAILABLE", message: "db" } });
    env.rerender();
    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 2);
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();
    assert.equal(env.state.count, 3);
    assert.ok(env.window.document.querySelector("[data-sy-yearly-retry]"));

    for (let i = 0; i < 5; i += 1) {
      env.rerender();
      env.api.bind(reading);
    }
    await settle();
    assert.equal(env.state.count, 3);
  } finally {
    env.restore();
  }
});

test("view opens the coin gate for a locked year without any pre-check round trip", async () => {
  const env = bootEngine();
  try {
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();

    assert.equal(env.state.count, 1, "only the yearly read may go out before the gate");
    assert.equal(env.state.paths.filter((p) => p.includes("/unlock")).length, 0);
    assert.equal(env.state.gateCalls.length, 1, "locked year must reach the shared paid gate");
    assert.equal(env.state.gateCalls[0].featureKey, "sukyo_yearly_fortune_unlock");
    assert.equal(env.state.gateCalls[0].contentKey, "sukyo_yearly_fortune_unlock:2026");
    assert.equal(env.state.gateCalls[0].coinPrice, 100);
    assert.equal(env.state.gateCalls[0].amountKrw, 10000);
    // 결제창을 닫아도 잠금 패널과 CTA 는 살아 있어야 한다(경고창 없이).
    assert.ok(env.window.document.querySelector("[data-sy-yearly-unlock]"));
  } finally {
    env.restore();
  }
});

test("view never opens the gate for an already unlocked year", async () => {
  const env = bootEngine();
  try {
    env.state.respond = () => ({ ok: true, status: 200, payload: UNLOCKED_PAYLOAD });
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();

    assert.equal(env.state.count, 1);
    assert.equal(env.state.gateCalls.length, 0, "an unlocked year must render, not charge");
  } finally {
    env.restore();
  }
});

test("a failed read keeps the gate reachable in one click and never auto-opens it", async () => {
  const env = bootEngine();
  try {
    env.state.respond = () => ({ ok: false, status: 503, payload: { code: "SERVICE_UNAVAILABLE", message: "db" } });
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();

    assert.equal(env.state.gateCalls.length, 0, "unknown lock state must not pop a payment window");
    const cta = env.window.document.querySelector("[data-sy-yearly-unlock]");
    assert.ok(cta, "the unlock CTA must survive a failed read");

    cta.click();
    await settle();
    assert.equal(env.state.count, 1, "the CTA must not add a server round trip before the gate");
    assert.equal(env.state.gateCalls.length, 1);
  } finally {
    env.restore();
  }
});

test("each year gets its own single-flight identity", async () => {
  const env = bootEngine();
  try {
    env.api.bind({ targetYear: 2026, monthlyFlow: [] });
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();

    env.window.document.querySelector("[data-sy-yearly-input]").value = "2027";
    env.window.document.querySelector("[data-sy-yearly-view]").click();
    await settle();

    assert.equal(env.state.gateCalls.length, 2);
    const [first, second] = env.state.gateCalls;
    // featureKey 는 연도와 무관한 상수라, 셸의 단일비행 키가 두 연도를 하나로 합치지 않으려면
    // requestId 와 title(라벨 성분) 이 반드시 달라야 한다.
    assert.notEqual(first.requestId, second.requestId);
    assert.notEqual(first.title, second.title);
    assert.equal(second.contentKey, "sukyo_yearly_fortune_unlock:2027");
  } finally {
    env.restore();
  }
});
