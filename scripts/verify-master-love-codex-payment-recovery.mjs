// Actual result component and styles; every API/provider request is a local fixture.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { chromium } from "@playwright/test";
import { MASTER_LOVE_CODEX_CHAPTERS } from "../worker/lib/master-love-codex-prompt.mjs";

const root = process.cwd(), temp = mkdtempSync(path.join(os.tmpdir(), "codex-paid-recovery-"));
const require = createRequire(import.meta.url);
let server, browser;
try {
  await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import Result from './app/master-love-codex/result/MasterLoveCodexResultClient';
    createRoot(document.getElementById('root')).render(<React.StrictMode><Result/></React.StrictMode>);`,
    resolveDir: root, sourcefile: "codex-recovery.tsx", loader: "tsx" },
    absWorkingDir: root, alias: { "@": root }, bundle: true, jsx: "automatic", format: "iife", platform: "browser",
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, outfile: path.join(temp, "app.js") });
  const css = await postcss([tailwindcss({ ...require("../tailwind.config.js"),
    content: ["./src/features/master-love-codex/**/*.{ts,tsx}", "./app/master-love-codex/**/*.{ts,tsx}"] })])
    .process("@tailwind base; @tailwind components; @tailwind utilities;", { from: undefined });
  writeFileSync(path.join(temp, "tailwind.css"), css.css);
  const html = '<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/app.css"><body><div id="root"></div><script src="/app.js"></script></body></html>';
  server = http.createServer((req, res) => {
    const name = new URL(req.url, "http://127.0.0.1").pathname.slice(1);
    if (["app.js", "app.css", "tailwind.css"].includes(name)) {
      res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "text/javascript");
      res.end(readFileSync(path.join(temp, name))); return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
    await context.addInitScript(() => {
      localStorage.setItem("fortune_auth_token", "mock-token");
      localStorage.setItem("fortune_auth_user", JSON.stringify({ id: "mock-codex-owner", _id: "mock-codex-owner" }));
    });
    let failedLoad = true, heldResolve, generates = 0, completed = false;
    const errors = [], forbidden = [];
    const chapters = MASTER_LOVE_CODEX_CHAPTERS.map(spec => ({ ...spec, ok: true,
      body: `## ${spec.title}\n\nmock 구매본의 마지막 문장까지 저장되었습니다.`, chars: 100 }));
    const session = () => ({ ok: true, sessionId: "original-paid-book", status: completed ? "completed" : "generating",
      accessToken: "original-access", accessType: "paid", mode: "solo", chapters: completed ? chapters : [],
      generationProgress: { completed: completed ? 20 : 0, total: 20 }, birthInfo: { name: "검증" } });
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/master-love-codex/session") {
        if (failedLoad) return route.fulfill({ status: 503, json: { ok: false, retryable: true } });
        return route.fulfill({ json: session() });
      }
      if (url.pathname === "/api/master-love-codex/generate") {
        generates++;
        assert.equal(route.request().postDataJSON().sessionId, "original-paid-book");
        await new Promise(resolve => { heldResolve = resolve; });
        completed = true; return route.fulfill({ json: { ...session(), done: true } });
      }
      if (url.pathname.startsWith("/api/payments/")) { forbidden.push(url.pathname); return route.abort(); }
      if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { ok: true, user: { id: "mock-codex-owner", _id: "mock-codex-owner" } } });
      if (url.origin !== origin) return route.abort();
      const asset = path.resolve(root, "public", url.pathname.slice(1));
      if (asset.startsWith(path.join(root, "public") + path.sep) && existsSync(asset)) return route.fulfill({ path: asset });
      return route.continue();
    });
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/master-love-codex/result/?sessionId=original-paid-book");
    await page.getByRole("alert").waitFor({ state: "visible" });
    failedLoad = false;
    await page.getByRole("button", { name: "이어 쓰기 다시 시도" }).click();
    await page.getByRole("progressbar").waitFor({ state: "visible" });
    assert.ok(await page.locator("body").innerText().then(text => text.includes("0 / 20")), "zero-chapter state is visible while LLM is pending");
    assert.equal(await page.getByRole("alert").count(), 0, "successful reload clears initial error");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    while (!heldResolve) await page.waitForTimeout(10);
    heldResolve();
    await page.locator("#master-love-codex-document").waitFor({ state: "visible" });
    await page.getByText("mock 구매본의 마지막 문장까지 저장되었습니다.", { exact: false }).last().waitFor({ state: "attached" });
    await page.reload(); await page.locator("#master-love-codex-document").waitFor({ state: "visible" });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    assert.equal(generates, 1, "same stored book, no generation after completion");
    assert.deepEqual(errors, []); assert.deepEqual(forbidden, []);
    console.log(`PASS ${width}px: initial 503 recovery, visible zero chapters, saved completion, reload; checkout calls 0`);
    await context.close();
  }
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
  rmSync(temp, { recursive: true, force: true });
}
