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

await verifyDirectStart();
await verifyMainEntry();
await verifyLoadFailureIsVisible();
await verifyVisualCueBindings();
console.log("[novel-player-start] OK: direct start, main entry, visible load failure, and event visuals verified");
