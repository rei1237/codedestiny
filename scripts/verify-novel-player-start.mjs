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

function createPlayerDom({ hash = "", failManifest = false } = {}) {
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

await verifyDirectStart();
await verifyMainEntry();
await verifyLoadFailureIsVisible();
await verifyVisualCueBindings();
await verifyBackgroundStability();
console.log("[novel-player-start] OK: direct start, main entry, visible load failure, event visuals, and background stability verified");
