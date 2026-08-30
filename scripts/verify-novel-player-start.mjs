import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require("jsdom");
const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC_ROOT = resolve(ROOT, "public");
const PLAYER_PATH = resolve(PUBLIC_ROOT, "codedestiny-novel.html");
const html = await readFile(PLAYER_PATH, "utf8");

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (check()) return;
    await wait(25);
  }
  throw new Error(`timed out: ${label}`);
}

function createPlayerDom({ hash = "", failManifest = false, bookmark = null, appRuntime = false } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(`jsdom: ${error.message}`));
  virtualConsole.on("error", (...args) => errors.push(`console: ${args.join(" ")}`));

  const dom = new JSDOM(html, {
    url: `https://novel.test/codedestiny-novel.html${hash}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      const originalTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay = 0, ...args) => originalTimeout(callback, Math.min(Number(delay) || 0, 20), ...args);
      window.fetch = async (input) => {
        const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
        if (failManifest && url.pathname.endsWith("/data/novel/manifest.json")) return new Response("unavailable", { status: 503 });
        try {
          const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
          return new Response(await readFile(resolve(PUBLIC_ROOT, relativePath)), { status: 200 });
        } catch {
          return new Response("not found", { status: 404 });
        }
      };
      window.Image = class { set src(value) { this._src = value; } get src() { return this._src; } };
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
      window.cancelAnimationFrame = (id) => window.clearTimeout(id);
      if (bookmark) window.localStorage.setItem("cd_novel_bookmark", JSON.stringify({ ...bookmark, at: Date.now() }));
      // 앱 번들(scripts/build-mobile-app.mjs)이 주입하는 브릿지가 세우는 플래그. 정본은 js/core/app-context.js.
      if (appRuntime) window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
    },
  });
  return { dom, errors };
}

async function verifyDirectStart() {
  const { dom, errors } = createPlayerDom({ hash: "#play" });
  try {
    const { document } = dom.window;
    await waitFor(() => document.getElementById("dlgBody")?.textContent.trim().length > 0, "direct player dialogue");
    assert.equal(dom.window.S.started, true, "direct player did not start");
    assert.match(dom.window.curBeat?.id ?? "", /^prologue:/, "direct player did not render a prologue beat");
    assert.equal(document.getElementById("player")?.classList.contains("on"), true, "direct player is not visible");
    assert.equal(dom.window.EPISODES.filter((episode) => Array.isArray(episode.beats)).length, 2, "preload must retain current and next episode only");
    assert.deepEqual(errors, [], "direct player emitted runtime errors");
  } finally {
    dom.window.close();
  }
}

async function verifyMainEntry() {
  const { dom, errors } = createPlayerDom();
  try {
    const { document } = dom.window;
    document.getElementById("enterBtn").click();
    await waitFor(() => document.querySelector("#menu button"), "main menu");
    document.querySelector("#menu button").click();
    await waitFor(() => document.getElementById("dlgBody")?.textContent.trim().length > 0, "main-entry dialogue");
    assert.equal(dom.window.S.started, true, "main-entry player did not start");
    assert.match(dom.window.curBeat?.id ?? "", /^prologue:/, "main-entry player did not render a prologue beat");
    assert.deepEqual(errors, [], "main-entry player emitted runtime errors");
  } finally {
    dom.window.close();
  }
}

async function verifyLoadFailureIsVisible() {
  const { dom } = createPlayerDom({ hash: "#play", failManifest: true });
  try {
    const { document } = dom.window;
    await waitFor(() => document.getElementById("dlgBody")?.textContent.includes("대사를 불러오지 못했어요"), "visible load failure");
    assert.equal(document.getElementById("player")?.classList.contains("on"), true, "load failure left the player hidden");
  } finally {
    dom.window.close();
  }
}

async function verifyVisualCueBindings() {
  const { dom, errors } = createPlayerDom();
  try {
    const { document } = dom.window;
    const visualCues = [
      [36, 20, "memoryVault", "memory-vault-release-v1.webp"],
      [41, 24, "clearMoonWater", "clear-moon-waterway-v1.webp"],
      [43, 8, "cherryMoonPortal", "cherry-moon-portal-promise-v1.webp"],
    ];
    await waitFor(() => dom.window.__NOVEL_READY === true, "novel manifest");
    for (const [episodeIndex, beatIndex, background, asset] of visualCues) {
      await dom.window.hydrateTo(episodeIndex, beatIndex);
      assert.equal(dom.window.S.curBg, background, `${background} was not selected`);
      const visibleAsset = ["bgA", "bgB"].some((id) => document.getElementById(id)?.src.includes(asset));
      assert.equal(visibleAsset, true, `${asset} was not assigned to the background pool`);
    }
    assert.deepEqual(errors, [], "event background binding emitted runtime errors");
  } finally {
    dom.window.close();
  }
}

/* 배경/캐릭터 안정화 회귀 가드(2026-08-28).
   고친 것: ① 점프가 지나온 배경 전환을 전부 다시 재생하던 것 ② 같은 배경인데도 크로스페이드하던 것
   ③ 점프마다 캐릭터 DOM 을 전멸시켰다 다시 만들던 것 ④ 늦게 온 옛 배경 요청이 나중 것을 덮던 것. */
async function verifyBackgroundStability() {
  const { dom, errors } = createPlayerDom();
  try {
    const win = dom.window;
    const { document } = win;
    await waitFor(() => win.__NOVEL_READY === true, "novel manifest");

    const realRestart = win.restartKenburns;
    let swaps = 0;
    const countSwaps = () => {
      swaps = 0;
      win.restartKenburns = (el) => {
        swaps += 1;
        return realRestart(el);
      };
    };
    const stopCounting = () => {
      win.restartKenburns = realRestart;
    };

    // ① EP.23 은 배경이 15번 바뀌는 화다. 그 끝으로 점프해도 배경은 딱 한 번만 갈려야 한다.
    await win.hydrateTo(23, 0);
    countSwaps();
    await win.hydrateTo(23, 199);
    stopCounting();
    assert.equal(swaps, 1, `hydrateTo replayed ${swaps} background swaps (must be 1)`);

    // ② 같은 지점으로 다시 점프 — 배경은 그대로, 캐릭터 DOM 도 그대로.
    const staged = [];
    for (const slot of ["l", "c", "r"]) {
      const el = document.getElementById(`char_${slot}`);
      if (el) staged.push({ slot, el, who: el.dataset.who });
    }
    assert.ok(staged.length > 0, "no character was staged after the jump");
    countSwaps();
    await win.hydrateTo(23, 199);
    stopCounting();
    assert.equal(swaps, 0, "re-jumping to the same beat swapped the background again");
    for (const { slot, el, who } of staged) {
      const now = document.getElementById(`char_${slot}`);
      assert.equal(now, el, `char_${slot} was recreated on re-jump (character flicker)`);
      assert.equal(now.dataset.who, who, `char_${slot} changed occupant on re-jump`);
    }

    // ③ 프롤로그 끝과 EP.01 첫 비트는 같은 배경(river)이다 — 화가 바뀐다고 다시 갈면 안 된다.
    const prologue = await win.ensureEpisodeLoaded(0);
    await win.hydrateTo(0, prologue.beats.length - 1);
    assert.equal(win.S.curBg, "river", "prologue did not end on the river background");
    countSwaps();
    await win.hydrateTo(1, 0);
    stopCounting();
    assert.equal(swaps, 0, "episode boundary with an identical background still crossfaded");

    // ④ 두 요청이 겹치면 나중 것이 이긴다. 로드 전에는 보이는 배경을 건드리지 않는다.
    const beforeKey = win.shownBg().dataset.bgKey;
    win.setBg("room", null);
    win.setBg("campus", null);
    assert.equal(win.shownBg().dataset.bgKey, beforeKey, "the visible background was overwritten before its replacement loaded");
    await waitFor(() => win.shownBg().dataset.bgKey !== beforeKey, "background commit");
    const showing = ["bgA", "bgB"].filter((id) => document.getElementById(id).classList.contains("show"));
    assert.deepEqual(showing.length, 1, `${showing.length} background slots are visible (must be 1)`);
    assert.equal(win.shownBg().dataset.bgKey, "campus", "a stale background request overwrote the newer one");

    assert.deepEqual(errors, [], "background stability checks emitted runtime errors");
  } finally {
    dom.window.close();
  }
}

/* 연이의 모습(사람↔꽃돼지) 연속성 회귀 가드(2026-08-29).
   변신 마커는 8,844비트 중 2개뿐이라 form 은 화 경계를 넘어 유지되는 상태다. 그 복원 규칙이 진입
   경로마다 갈리면 "쭉 읽으면 사람인데 목차로 다시 들어가면 꽃돼지"가 된다 — 실제로 났던 버그다.
   두 경로(enterEpisode / hydrateTo)가 같은 답을 내는지를 지점별로 대조한다. */
async function verifyFormContinuity() {
  // ① 컷 0에 저장된 책갈피로 이어읽기 — 변신 마커를 지나지 않는 진입이라 여기가 무너졌었다.
  {
    const { dom, errors } = createPlayerDom({ bookmark: { ep: 5, bi: 0, episodeId: "ep-05", beatId: "ep-05:1" } });
    try {
      const win = dom.window;
      const { document } = win;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest");
      document.getElementById("enterBtn").click();
      await waitFor(() => document.querySelector("#menu button"), "main menu");
      const resume = document.querySelector("#menu button");
      assert.match(resume.textContent, /이어읽기/, "the bookmark did not produce a resume entry");
      resume.click();
      await waitFor(() => document.getElementById("dlgBody")?.textContent.trim().length > 0, "resumed dialogue");
      assert.equal(win.S.ep, 5, "resume did not land on the bookmarked episode");
      assert.equal(win.S.bi, 0, "this case must resume at cut 0 — the entry that never replays the marker");
      assert.equal(win.S.form, "pig", "resuming inside the pig arc left Yeon in her human form");
      win.setSlot("l", "yeon", "neutral");
      assert.match(document.getElementById("char_l").className, /\bpigsheet\b/, "the staged Yeon sprite is not the pig sheet");
      assert.deepEqual(errors, [], "resume-at-cut-0 emitted runtime errors");
    } finally {
      dom.window.close();
    }
  }

  // ② ⏮ 로 앞 화로 돌아가기 — 그 화는 로드돼 있지 않다(현재+다음 2개만 유지).
  {
    const { dom, errors } = createPlayerDom();
    try {
      const win = dom.window;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest");
      await win.hydrateTo(27, 0);
      assert.equal(win.S.form, "human", "episodes after the EP.26 marker must start human");
      assert.equal(Array.isArray(win.EPISODES[26].beats), false, "EP.26 must be unloaded for this case to mean anything");
      win.chapSkip(-1);
      await waitFor(() => win.curBeat?.id?.startsWith("ep-26:"), "backward chapter skip");
      assert.equal(win.S.ep, 26, "backward chapter skip did not land on EP.26");
      assert.equal(win.S.form, "pig", "backward chapter skip into the pig arc rendered Yeon as a human");
      assert.deepEqual(errors, [], "backward chapter skip emitted runtime errors");
    } finally {
      dom.window.close();
    }
  }

  // ③ 두 진입 경로가 같은 지점에서 같은 모습을 내야 한다. 정본 마커는 ep-01:1(→pig) · ep-26:60(→human).
  {
    const { dom, errors } = createPlayerDom();
    try {
      const win = dom.window;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest");
      const points = [
        [0, 0, "human", "the prologue is before the transformation"],
        [1, 0, "pig", "the EP.01 transformation marker did not take"],
        [12, 0, "pig", "the middle of the pig arc"],
        [26, 58, "pig", "EP.26 is still a pig up to its final marker"],
        [26, 59, "human", "the EP.26 marker back to human did not take"],
        [27, 0, "human", "episodes after EP.26 start human"],
      ];
      for (const [ep, bi, form, why] of points) {
        await win.hydrateTo(ep, bi);
        assert.equal(win.S.form, form, `hydrateTo(${ep},${bi}) — ${why}`);
        await win.ensureEpisodeLoaded(ep);
        win.S.bi = bi;
        win.enterEpisode(ep, false);
        await waitFor(() => win.curBeat?.id === win.EPISODES[ep].beats[bi].id, `enterEpisode(${ep}) at cut ${bi}`);
        assert.equal(win.S.form, form, `enterEpisode(${ep}) at cut ${bi} — ${why}`);
      }
      assert.deepEqual(errors, [], "entry-path parity emitted runtime errors");
    } finally {
      dom.window.close();
    }
  }

  // ④ 설정의 "처음부터" — 프롤로그는 로드돼 있지 않고, 모습도 사람으로 되돌아야 한다.
  {
    const { dom, errors } = createPlayerDom();
    try {
      const win = dom.window;
      const { document } = win;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest");
      await win.hydrateTo(20, 0);
      assert.equal(win.S.form, "pig", "EP.20 is inside the pig arc");
      document.getElementById("setRestart").click();
      await waitFor(() => win.curBeat?.id?.startsWith("prologue:"), "restart from the beginning");
      assert.equal(win.S.form, "human", "restarting from the prologue left Yeon as a pig");
      assert.deepEqual(errors, [], "restart emitted runtime errors");
    } finally {
      dom.window.close();
    }
  }
}
/* 챕터 카드 타이머 회귀 가드(2026-08-29).
   카드 타이머는 두 겹이다 — 1600ms 뒤 카드를 닫고 컷 0을 실행하고, 그 700ms 뒤 hidden 을 건다.
   진입할 때 앞 화의 타이머를 끊지 않으면 ⏭ 연타에서 컷 0(배경·BGM·스테이징)이 두 번 돈다. */
async function verifyChapterCardTimers() {
  const { dom, errors } = createPlayerDom();
  try {
    const win = dom.window;
    const { document } = win;
    await waitFor(() => win.__NOVEL_READY === true, "novel manifest");
    await win.ensureEpisodeLoaded(1);
    await win.ensureEpisodeLoaded(2);
    const realRunBeat = win.runBeat;
    let runs = 0;
    win.runBeat = function (...args) {
      runs += 1;
      return realRunBeat.apply(this, args);
    };
    win.S.bi = 0;
    win.enterEpisode(1, true);
    assert.equal(document.getElementById("chCard").classList.contains("on"), true, "the chapter card did not open");
    win.S.bi = 0;
    win.enterEpisode(2, true); // 카드가 떠 있는 동안 ⏭ — 앞 화의 타이머는 여기서 끊겨야 한다
    await waitFor(() => win.curBeat?.id?.startsWith("ep-02:"), "the newer chapter card ran its first cut");
    await wait(150); // 앞 화의 타이머가 살아 있었다면 이 사이에 컷 0이 한 번 더 돈다
    win.runBeat = realRunBeat;
    assert.equal(runs, 1, `an abandoned chapter card ran cut 0 again (runBeat fired ${runs} times, must be 1)`);
    assert.equal(win.S.ep, 2, "the player did not settle on the newer episode");
    assert.deepEqual(errors, [], "chapter card timers emitted runtime errors");
  } finally {
    dom.window.close();
  }
}
/* 앱 번들 에셋 출처 회귀 가드(2026-08-30).
   앱은 https://localhost 출처라 hostname 만 보면 "로컬"로 판정되고, 그러면 배경·BGM 이 전부
   /codedestinyassets/ 로 향한다. 그 미러는 .gitignore 대상이라 dist 에도 앱 번들에도 없어
   실제로 앱에서 배경과 배경음이 통째로 404 였다. 웹 로컬 개발은 그 미러를 계속 써야 하므로
   두 방향을 함께 못 박는다. */
async function verifyAppRuntimeAssetOrigin() {
  const MIRROR = "/codedestinyassets/";
  const pick = (win) => ({
    bg: win.BG.room,
    bgm: win.TRK.daily,
    war: win.TRK.main,
  });

  // ① 앱 런타임 — 배경·BGM 이 전부 R2 절대 URL 이어야 한다.
  {
    const { dom } = createPlayerDom({ appRuntime: true });
    try {
      const win = dom.window;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest (app runtime)");
      assert.equal(win.PROD, true, "app runtime was not treated as a remote-asset environment");
      for (const [label, url] of Object.entries(pick(win))) {
        assert.equal(url.startsWith("https://"), true, `app runtime resolved ${label} to a bundle path: ${url}`);
        assert.equal(url.includes(MIRROR), false, `app runtime still points ${label} at the local mirror: ${url}`);
      }
    } finally {
      dom.window.close();
    }
  }

  // ② 웹 로컬 개발 — 미러를 그대로 써야 한다(핫링크 403 회피). 앱 수정이 여기까지 번지면 안 된다.
  {
    const { dom } = createPlayerDom();
    try {
      const win = dom.window;
      await waitFor(() => win.__NOVEL_READY === true, "novel manifest (web dev)");
      assert.equal(win.PROD, false, "a non-app, non-production host was treated as remote");
      for (const [label, url] of Object.entries(pick(win))) {
        assert.equal(url.startsWith(MIRROR), true, `local dev lost the asset mirror for ${label}: ${url}`);
      }
    } finally {
      dom.window.close();
    }
  }
}
await verifyDirectStart();
await verifyMainEntry();
await verifyLoadFailureIsVisible();
await verifyVisualCueBindings();
await verifyBackgroundStability();
await verifyFormContinuity();
await verifyChapterCardTimers();
await verifyAppRuntimeAssetOrigin();
console.log("[novel-player-start] OK: direct start, main entry, visible load failure, event visuals, background stability, Yeon form continuity, chapter card timers, and app-runtime asset origin verified");
