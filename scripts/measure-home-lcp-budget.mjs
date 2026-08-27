/**
 * 홈 **LCP 의 예산**을 잰다 — 히어로가 그려지기까지 회선을 건너야 하는 바이트가 얼마인가,
 * 그리고 그 앞의 짐(파서 차단 스크립트·인라인 CSS)을 옮기면 LCP 가 실제로 움직이는가.
 *
 * 왜 따로 필요한가 — `perf:home`(Lighthouse)은 점수만 주고 `perf:interaction`은 부팅 이후만 본다.
 * "LCP 앞에 뭐가 있어서 늦는가"는 둘 다 답하지 못해, 2026-08-28 세션이 스크래치에서 손으로
 * 하네스를 다시 만들어야 했다. 그 하네스를 레포로 들여온 것이 이 파일이다.
 *
 * 🔴 이름이 `perf:*` 인 이유는 `measure-home-interaction.mjs` 와 같다 — `verify:*` 는
 *    verify-guard-wiring 의 배선 의무가 붙고, CI 에 새 게이트를 만들지 않기로 했다.
 *
 * 구조 — 로컬 프록시(127.0.0.1)가 문서만 (필요하면 고쳐서) 내주고 나머지 경로는 전부 대상
 * 오리진으로 통과시킨다. 그래서 페이지는 same-origin 을 유지하고 CDP 스로틀이 워터폴 전체에
 * 걸린다. 상류 응답은 첫 회에 메모리에 캐시해 회차 간 편차를 줄인다.
 * 🔴 `page.route` 로 문서를 fulfill 하는 방식은 쓰지 않는다 — 가로챈 응답에는 네트워크 스로틀이
 *    걸리지 않아 문서만 즉시 도착하고, 그러면 재는 것이 사라진다.
 *
 * 변형(`--variants=`)
 *   A  베이스라인(문서 그대로)
 *   B  히어로 앞 파서 차단 `<script src>` 를 **같은 자리에 인라인**으로 (실행 순서·의미 동일, 요청 0회)
 *   C  히어로 앞 파서 차단 `<script src>` 를 **삭제** (상한 측정 전용 — JS 의미가 깨진다)
 *   D  `<body>` 안 · 히어로 앞의 인라인 `<style>` **전부**를 `</body>` 직전으로 이동
 *   E  같은 블록들을 히어로의 `</header>` 직후로 이동
 *   F  히어로 앞 인라인 `<style>` 중 **첫 화면에서 사용 바이트가 0 인 것만** 골라 `</body>` 앞으로
 *      이동. 대상은 손으로 적지 않고 `page.coverage` 로 그때그때 발견한다(D/E 의 수술적 버전).
 *
 * 🔴 2026-08-28 실측 결론(프로덕션 문서 · 모바일 390x844 · CPU 4x · Slow 4G, 중앙값).
 *    **다시 파지 말 것 — B~E 는 전부 기각됐다.**
 *      A 2,440 / B 2,472(+32) / C 2,384(-56), 각 5회 → 차단 스크립트 8개를 **통째로 지워도**
 *        노이즈 안이다(A 한 변형의 회차 편차만 184ms).
 *      D 3,800(+1,292, CLS 0.403) / E 3,780(+1,272, CLS 0.483), 각 5회 → 히어로 앞 인라인 CSS 를
 *        통째로 뒤로 내리면 히어로가 스타일 없이 먼저 그려져 LCP 후보가 더 큰 이미지로 바뀌고 CLS 가 터진다.
 *      **F 2,216 vs A 2,404(−188ms), 각 9회, CLS 0 유지 · LCP 요소 H1 유지** → 살아 있는 유일한 레버.
 *        9회 중 8회에서 F 가 이겼다(밴드는 겹친다 — 쌍대 비교로 본 값이다).
 *    같은 실측에서 LCP 앞 회선 바이트가 **465KB**(문서 240KB + CSS 97KB + JS 75KB + 그 외 64KB)였고,
 *    1.6Mbps(=200KB/s)에서 그것만으로 **2,327ms** 다. 즉 홈 LCP 는 순서 문제가 아니라 **예산 문제**다.
 *    근거와 남은 선택지: docs/handoff/home-lcp-inp-2026-08-28.md
 *
 * 사용:
 *   npm run perf:lcp-budget                                  # 예산 덤프(1회)
 *   npm run perf:lcp-budget -- --variants=A,C --runs=5       # A/B
 *   npm run perf:lcp-budget -- --variants=A,F --runs=9       # 커버리지 기반 수술 변형
 *   npm run perf:lcp-budget -- --url=https://staging.code-destiny.com
 *
 * 🔴 CLS 는 이 도구로 판정하지 말 것 — 스테이징은 noindex 라 광고 경로가 막혀 0 으로 과소평가된다.
 *    여기의 CLS 는 변형이 렌더를 깨뜨렸는지 보는 **경보등**이지 지표가 아니다.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ORIGIN = String(flag("url", "https://code-destiny.com")).replace(/\/$/, "");
const RUNS = Number(flag("runs", "1"));
const SETTLE = Number(flag("settle", "10000"));
const VARIANTS = String(flag("variants", "A"))
  .split(",")
  .map((v) => v.trim().toUpperCase())
  .filter(Boolean);
const OUT = flag("out", "");

const HERO_MARK = '<h1 class="moon-hero__title';

/** 히어로 앞에서 파서를 세우는 `<script src>` — prefix 로 잡는다(캐시키 `?v=` 가 붙는다). */
const BLOCKING_PREFIXES = [
  "/js/inline/canonical-redirect.js",
  "/js/inline/global-error-guard.js",
  "/js/inline/gesture-arbiter.js",
  "/js/core/pass-verdict.js",
  "/js/core/auth-hint.js",
  "/js/core/payment-service.js",
  "/js/core/app-context.js",
  "/js/shell/s-", // externalize-dist-inline-scripts.mjs 가 뽑아낸 셸 인라인 블록
];

const gzip = (text) => zlib.gzipSync(Buffer.from(text, "utf8"));
const bytes = (text) => Buffer.byteLength(text, "utf8");
const sha1 = (text) => crypto.createHash("sha1").update(text).digest("hex");
const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  if (!s.length) return 0;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// ─────────────────────────────────────────────────────────── 문서 변형
function heroOffset(html) {
  const idx = html.indexOf(HERO_MARK);
  if (idx < 0) throw new Error(`히어로 마커를 못 찾았다: ${HERO_MARK}`);
  return idx;
}

/** 히어로 앞의 파서 차단 `<script src>` 태그들. defer/async 는 파서를 안 세우므로 뺀다. */
function findBlockingScripts(html) {
  const hero = heroOffset(html);
  const re = /<script\b[^>]*>\s*<\/script>/g;
  const hits = [];
  let m;
  while ((m = re.exec(html)) && m.index < hero) {
    const tag = m[0];
    const src = (tag.match(/\ssrc="([^"]*)"/) || [])[1];
    if (!src || /\s(?:defer|async)\b/.test(tag)) continue;
    if (BLOCKING_PREFIXES.some((p) => src.startsWith(p))) {
      hits.push({ start: m.index, end: m.index + tag.length, src });
    }
  }
  return hits;
}

/** `<body>` 안이면서 히어로 앞에 있는 인라인 `<style>` 블록들. */
function findBodyPreHeroStyles(html) {
  const hero = heroOffset(html);
  const body = html.indexOf("<body");
  const re = /<style\b[^>]*>[\s\S]*?<\/style>/g;
  const hits = [];
  let m;
  while ((m = re.exec(html))) {
    if (m.index < body) continue;
    if (m.index >= hero) break;
    hits.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return hits;
}

function cut(html, hits) {
  let out = "";
  let cur = 0;
  for (const h of hits) {
    out += html.slice(cur, h.start);
    cur = h.end;
  }
  return out + html.slice(cur);
}

function spliceScripts(html, replace) {
  const hits = findBlockingScripts(html);
  let out = "";
  let cur = 0;
  hits.forEach((h, i) => {
    out += html.slice(cur, h.start) + replace(i, h);
    cur = h.end;
  });
  return { html: out + html.slice(cur), count: hits.length };
}

async function buildVariants(baseHtml) {
  const built = { A: baseHtml };
  const need = new Set(VARIANTS);

  if (need.has("B") || need.has("C")) {
    const hits = findBlockingScripts(baseHtml);
    if (need.has("C")) {
      const r = spliceScripts(baseHtml, () => "");
      built.C = r.html;
      console.log(`C: 히어로 앞 파서 차단 스크립트 ${r.count}개 삭제`);
    }
    if (need.has("B")) {
      const bodies = [];
      for (const h of hits) {
        const res = await fetch(ORIGIN + h.src);
        if (!res.ok) throw new Error(`스크립트 본문 요청 실패 ${h.src} ${res.status}`);
        bodies.push(await res.text());
      }
      const r = spliceScripts(baseHtml, (i) => `<script>${bodies[i]}\n</script>`);
      built.B = r.html;
      console.log(`B: 히어로 앞 파서 차단 스크립트 ${r.count}개 인라인화`);
    }
  }

  for (const [key, anchor] of [
    ["D", (h) => h.lastIndexOf("</body>")],
    ["E", (h) => {
      const close = h.indexOf("</header>", heroOffset(h));
      return close < 0 ? -1 : close + "</header>".length;
    }],
  ]) {
    if (!need.has(key)) continue;
    const hits = findBodyPreHeroStyles(baseHtml);
    const moved = hits.map((h) => h.text).join("\n");
    const stripped = cut(baseHtml, hits);
    const at = anchor(stripped);
    if (at < 0) throw new Error(`${key}: 삽입 지점을 못 찾았다`);
    built[key] = stripped.slice(0, at) + moved + stripped.slice(at);
    console.log(`${key}: body 안 히어로 앞 인라인 <style> ${hits.length}개(${bytes(moved)}B) 이동`);
  }

  if (need.has("F")) {
    const coverage = await measureInlineCssCoverage();
    const hits = [];
    let matched = 0;
    let unmatched = 0;
    const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
    let m;
    while ((m = re.exec(baseHtml)) && m.index < heroOffset(baseHtml)) {
      const entry = coverage.get(sha1(m[1]));
      if (!entry) { unmatched += 1; continue; }
      matched += 1;
      if (entry.used === 0) hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], total: entry.total });
    }
    const moved = hits.map((h) => h.text).join("\n");
    const stripped = cut(baseHtml, hits);
    const at = stripped.lastIndexOf("</body>");
    if (at < 0) throw new Error("F: </body> 를 못 찾았다");
    built.F = stripped.slice(0, at) + moved + stripped.slice(at);
    console.log(
      `F: 히어로 앞 <style> ${matched}개 중 첫 화면 사용 0B 인 ${hits.length}개(${bytes(moved)}B)를 </body> 앞으로 이동` +
        (unmatched ? ` (커버리지 미매칭 ${unmatched}개는 건드리지 않았다)` : ""),
    );
  }

  for (const v of VARIANTS) {
    if (!built[v]) throw new Error(`알 수 없는 변형: ${v}`);
    const pre = built[v].slice(0, heroOffset(built[v]));
    console.log(`  ${v}: 히어로 앞 raw ${bytes(pre)}B · gzip ${gzip(pre).length}B`);
  }
  return built;
}

/**
 * 첫 화면에서 인라인 `<style>` 이 실제로 몇 바이트나 쓰였는지 잰다.
 *
 * 🔴 CDP `CSS.stopRuleUsageTracking` 은 **쓰인 규칙만** 돌려줘서 전부 100% 로 보인다.
 *    Playwright 의 `page.coverage` 를 써야 시트 원문(text)과 사용 범위를 함께 받는다.
 * 🔴 커버리지의 "미사용" 은 **삭제 가능**이 아니다 — `@font-face`·`@keyframes`,
 *    hover/JS 토글로만 켜지는 규칙이 전부 미사용으로 잡힌다. 뒤로 **미루는** 판단에만 쓸 것.
 * 스로틀 없이(실사용 판정에는 필요 없다) 대상 오리진을 직접 연다.
 */
async function measureInlineCssCoverage() {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.coverage.startCSSCoverage({ resetOnNavigation: false });
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 180000 });
    await page
      .waitForFunction(() => !document.documentElement.classList.contains("cd-boot-gate"), { timeout: 20000 })
      .catch(() => console.log("(부팅 게이트가 20초 안에 안 걷혔다 — 그대로 잰다)"));
    await page.waitForTimeout(3000);
    const entries = await page.coverage.stopCSSCoverage();
    await ctx.close();

    const inline = new Map();
    const files = [];
    for (const e of entries) {
      const used = e.ranges.reduce((a, r) => a + (r.end - r.start), 0);
      const total = (e.text || "").length;
      if (/\.css(\?|$)/.test(e.url || "")) files.push({ name: e.url.replace(ORIGIN, ""), total, used });
      else inline.set(sha1(e.text || ""), { used, total });
    }
    const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "-");
    console.log("\n=== 첫 화면 CSS 사용률 ===");
    for (const f of files.sort((a, b) => b.total - a.total)) {
      console.log(`${String(f.total).padStart(8)}B 중 ${String(f.used).padStart(7)}B ${pct(f.used, f.total).padStart(7)}  ${f.name.slice(0, 55)}`);
    }
    const it = [...inline.values()];
    console.log(
      `인라인 <style> ${it.length}개 합계 ${it.reduce((a, r) => a + r.total, 0)}B 중 ` +
        `${it.reduce((a, r) => a + r.used, 0)}B (${pct(it.reduce((a, r) => a + r.used, 0), it.reduce((a, r) => a + r.total, 0))})\n`,
    );
    return inline;
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────── 프록시
function startProxy(getHtml) {
  const cache = new Map();
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    if (pathname === "/" || pathname === "/index.html") {
      const body = gzip(getHtml());
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-encoding": "gzip",
        "content-length": body.length,
        "cache-control": "no-store",
      });
      res.end(body);
      return;
    }
    const key = `${req.method} ${req.url}`;
    try {
      let entry = cache.get(key);
      if (!entry) {
        const upstream = await fetch(ORIGIN + req.url, { method: req.method, redirect: "follow" });
        const buf = Buffer.from(await upstream.arrayBuffer());
        entry = {
          status: upstream.status,
          type: upstream.headers.get("content-type") || "application/octet-stream",
          gz: zlib.gzipSync(buf),
        };
        if (req.method === "GET") cache.set(key, entry);
      }
      res.writeHead(entry.status, {
        "content-type": entry.type,
        "content-encoding": "gzip",
        "content-length": entry.gz.length,
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      });
      res.end(entry.gz);
    } catch (err) {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`proxy: ${err.message}`);
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ─────────────────────────────────────────────────────────── 측정
async function measure(browser, base) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(() => {
    window.__cdLcpProbe = { lcp: 0, fcp: 0, cls: 0, shifts: 0, lcpEl: "" };
    const m = window.__cdLcpProbe;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        m.lcp = e.startTime;
        m.lcpEl = e.element ? `${e.element.tagName}.${String(e.element.className || "").split(" ")[0]}` : "";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.name === "first-contentful-paint") m.fcp = e.startTime;
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.shifts++; }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto(`${base}/`, { waitUntil: "commit", timeout: 180000 });
  await page.waitForTimeout(SETTLE);

  const out = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const probe = window.__cdLcpProbe;
    const res = performance.getEntriesByType("resource").map((r) => ({
      name: r.name.replace(location.origin, ""),
      type: r.initiatorType,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      xfer: r.transferSize,
      decoded: r.decodedBodySize,
    }));
    return {
      ...probe,
      ttfb: nav.responseStart || 0,
      docEnd: nav.responseEnd || 0,
      dcl: nav.domContentLoadedEventEnd || 0,
      docXfer: nav.transferSize || 0,
      docDecoded: nav.decodedBodySize || 0,
      sheets: document.styleSheets.length,
      styleTags: document.querySelectorAll("style").length,
      res,
    };
  });
  await ctx.close();
  return out;
}

function reportBudget(run) {
  const before = run.res.filter((r) => r.end <= run.lcp);
  const sum = (list, key) => list.reduce((a, r) => a + (r[key] || 0), 0);
  const css = before.filter((r) => /\.css(\?|$)/.test(r.name));
  const js = before.filter((r) => /\.js(\?|$)/.test(r.name));
  const wire = run.docXfer + sum(before, "xfer");
  console.log("\n=== LCP 앞 회선 예산 ===");
  console.log(`문서        ${String(run.docXfer).padStart(8)}B (decoded ${run.docDecoded})`);
  console.log(`CSS ${String(css.length).padStart(2)}개  ${String(sum(css, "xfer")).padStart(8)}B (decoded ${sum(css, "decoded")})`);
  console.log(`JS  ${String(js.length).padStart(2)}개  ${String(sum(js, "xfer")).padStart(8)}B (decoded ${sum(js, "decoded")})`);
  console.log(`그 외       ${String(sum(before, "xfer") - sum(css, "xfer") - sum(js, "xfer")).padStart(8)}B`);
  console.log(`합계        ${String(wire).padStart(8)}B = ${(wire / 1024).toFixed(0)}KB → 1.6Mbps 에서 ${((wire / 1024 / 200) * 1000).toFixed(0)}ms`);
  console.log(`문서 시트 ${run.sheets}개 · 인라인 <style> ${run.styleTags}개`);
  console.log("\n--- LCP 앞에서 끝난 CSS(늦게 끝난 순) ---");
  for (const r of css.sort((a, b) => b.end - a.end).slice(0, 10)) {
    console.log(`${String(r.start).padStart(6)} -> ${String(r.end).padStart(6)} ${String(r.xfer).padStart(7)}B ${r.name.slice(0, 70)}`);
  }
}

// ─────────────────────────────────────────────────────────── 실행
const docRes = await fetch(`${ORIGIN}/`);
if (!docRes.ok) throw new Error(`문서 요청 실패 ${docRes.status}`);
const baseHtml = await docRes.text();
const hero = heroOffset(baseHtml);
console.log(`${ORIGIN}/  문서 raw ${bytes(baseHtml)}B · gzip ${gzip(baseHtml).length}B`);
console.log(`히어로 위치 raw ${bytes(baseHtml.slice(0, hero))}B (${((hero / baseHtml.length) * 100).toFixed(1)}%) · gzip ${gzip(baseHtml.slice(0, hero)).length}B`);

const variants = await buildVariants(baseHtml);
let current = VARIANTS[0];
const server = await startProxy(() => variants[current]);
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`프록시 ${base} → ${ORIGIN}\n`);

const browser = await chromium.launch();
const rows = [];
let firstRun = null;
try {
  for (let i = 0; i < RUNS; i += 1) {
    for (const v of VARIANTS) {
      current = v;
      const r = await measure(browser, base);
      if (!firstRun) firstRun = r;
      rows.push({ label: v, run: i, ...r });
      console.log(
        `${v} run${i}  LCP=${Math.round(r.lcp)}  FCP=${Math.round(r.fcp)}  docEnd=${Math.round(r.docEnd)}` +
          `  DCL=${Math.round(r.dcl)}  CLS=${r.cls.toFixed(3)}(${r.shifts})  el=${r.lcpEl}`,
      );
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (firstRun) reportBudget(firstRun);

console.log(`\n=== 중앙값 (n=${RUNS}) ===`);
for (const v of VARIANTS) {
  const g = rows.filter((r) => r.label === v);
  if (!g.length) continue;
  const lcps = g.map((r) => r.lcp);
  console.log(
    `${v} | LCP ${Math.round(median(lcps))} (${Math.round(Math.min(...lcps))}~${Math.round(Math.max(...lcps))})` +
      ` | FCP ${Math.round(median(g.map((r) => r.fcp)))} | CLS ${median(g.map((r) => r.cls)).toFixed(3)}` +
      ` | docEnd ${Math.round(median(g.map((r) => r.docEnd)))}`,
  );
}

if (VARIANTS.length > 1 && RUNS < 3) {
  console.log("\n🔴 변형 비교인데 --runs 가 3 미만이다. LCP 편차가 ±300ms 라 중앙값이 의미 없다.");
}

if (OUT) {
  fs.writeFileSync(path.resolve(OUT), JSON.stringify(rows, null, 2));
  console.log(`\n원자료: ${OUT}`);
}
