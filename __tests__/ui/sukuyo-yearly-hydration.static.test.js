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

  const state = { count: 0, paths: [], respond: null };
  window.alert = (message) => { throw new Error("Unexpected alert: " + message); };
  window._cdResolveCurrentProfileIdForAccess = () => "P1";
  window.fetchJsonWithAuth = (requestPath) => {
    state.count += 1;
    state.paths.push(requestPath);
    return Promise.resolve(state.respond());
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
