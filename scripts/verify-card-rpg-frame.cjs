const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://127.0.0.1:3485/games/kkulkkul-card-rpg/";
async function measure() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
  });
  try {
    const p = await browser.newPage({
      viewport: { width: 844, height: 390 },
      reducedMotion: "no-preference",
    });
    await p.addInitScript(() => {
      localStorage.setItem(
        "kkulkkul-card-rpg.lobby.v1",
        JSON.stringify({ sound: true }),
      );
      const NativeAudioContext = window.AudioContext;
      window.battleAudioContexts = [];
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) {
          super(...args);
          window.battleAudioContexts.push(this);
        }
      };
    });
    await p
      .context()
      .addCookies([
        { name: "cd_cookie_consent", value: "essential", url: base },
      ]);
    await p.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    const now = () => p.evaluate(() => performance.now());
    const hand = p.locator("button[data-type]");
    await p.goto(base + "#battle");
    const enter = p.getByRole("button", { name: "모카와 임시 지원으로 연습" });
    await enter.waitFor();
    const start = await now();
    await enter.click();
    await hand.first().waitFor();
    const enterMs = Math.round((await now()) - start);
    await p.reload({ waitUntil: "domcontentloaded" });
    await hand.first().waitFor();
    const restoredNavigationMs = Math.round(await now());
    for (let i = 0; i < 3; i++) await hand.nth(i).click();
    await p.evaluate(() => {
      window.frameSample = new Promise((resolve) => {
        const samples = [];
        const first = performance.now();
        let previous;
        function frame(t) {
          if (previous !== undefined) samples.push(t - previous);
          previous = t;
          if (t - first < 2200) requestAnimationFrame(frame);
          else resolve(samples);
        }
        requestAnimationFrame(frame);
      });
    });
    await p.getByRole("button", { name: "3장 확정" }).click();
    const frames = await p.evaluate(() => window.frameSample);
    const sorted = [...frames].sort((a, b) => a - b);
    const result = {
      browser: browser.version(),
      viewport: "844×390",
      environment: "Windows local Next dev, headless Chromium, normal motion",
      enterMs,
      restoredNavigationMs,
      sampleCount: sorted.length,
      meanFrameMs: +(frames.reduce((s, n) => s + n, 0) / frames.length).toFixed(
        2,
      ),
      p95FrameMs: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2),
      maxFrameMs: +sorted.at(-1).toFixed(2),
      observedJsHeapBytes: await p.evaluate(
        () => performance.memory?.usedJSHeapSize ?? null,
      ),
    };
    const audioDuring = await p.evaluate(() =>
      window.battleAudioContexts.map((ctx) => ctx.state),
    );
    if (audioDuring.length !== 1 || audioDuring[0] !== "running")
      throw Error("Expected one active battle audio context: " + audioDuring);
    await p.evaluate(() => {
      location.hash = "home";
    });
    await p.waitForFunction(() =>
      window.battleAudioContexts.every((ctx) => ctx.state === "closed"),
    );
    result.audioContextsDuring = audioDuring;
    result.audioContextsAfterExit = await p.evaluate(() =>
      window.battleAudioContexts.map((ctx) => ctx.state),
    );
    const out = process.env.RPG_CAPTURE_DIR || ".tmp/card-rpg-battle";
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "frame-sample.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(result);
  } finally {
    await browser.close();
  }
}
measure().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
