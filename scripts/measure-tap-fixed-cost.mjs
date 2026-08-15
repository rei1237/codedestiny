/**
 * 탭 **1회의 고정 비용**을 호출 횟수로 잰다.
 *
 * 왜 ms 가 아니라 횟수인가 —
 * 필드 INP 최악이 `#inputPage > header.logo-area`(2,672ms)인데 **그 영역에는 붙은 핸들러가 없다.**
 * 즉 비용의 상당 부분이 "무엇을 눌렀든 무조건 도는 일"이다. 그런데 그 일의 크기를 ms 로 재면
 * perf:interaction 의 노이즈 밴드(회차 간 수십~수백 ms)에 묻혀 판정이 안 된다. 이 레포에는
 * 실제로 **노이즈에 묻혀 "범인이 아니다"라고 결론냈다가 뒤집힌 사고**가 있다
 * (docs/handoff/mobile-home-perf.md §3-1).
 *
 * 호출 횟수는 결정적이다. 96회가 3회가 되면 그건 노이즈가 아니다.
 * 그래서 이 도구가 **1차 판정 기준**이고, perf:interaction 의 ms 는 2차 확인이다.
 *
 * 무엇을 세는가 — 탭 경로에서 실제로 비싼 DOM API 만 센다:
 *   closest / matches            선택자 엔진 (RULES 32개 순회가 여기 잡힌다)
 *   querySelectorAll             문서 전수 순회
 *   elementFromPoint / elementsFromPoint   히트테스트 (+ 강제 레이아웃)
 *   getBoundingClientRect        강제 레이아웃
 *   getComputedStyle             강제 스타일 recalc
 *   localStorage / sessionStorage getItem·setItem   동기 I/O
 *   JSON.parse / JSON.stringify
 *
 * 🔴 계측은 **원본에 위임**하는 순수 카운팅 래퍼다. 인자·반환·this 를 그대로 넘기므로
 *    측정 대상의 동작이 바뀌지 않는다. 그래도 래퍼 자체가 약간 느리므로 **ms 는 읽지 않는다.**
 * 🔴 이름이 `perf:*` 인 이유: `verify:*` 는 verify-guard-wiring 의 배선 의무가 붙는데
 *    사용자 지시로 CI 에 새 게이트를 만들지 않기로 했다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:tap-cost -- --runs=10 --label=base
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";
import { closeOverlays, reachMindscanTile, scrollIntoView } from "./lib/perf-home-reach.mjs";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : root;
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/**
 * 탭할 자리.
 *
 * `header`  핸들러가 **없는** 영역. 여기서 나오는 숫자가 곧 "모든 탭이 무조건 내는 고정 비용"이다.
 *           필드 최악(2,672ms)의 정체를 재는 자리이므로 이 도구의 주 지표다.
 * `collection` 컬렉션 헤더. 🔴 **여기 숫자는 줄면 안 된다** — 좌표 폴백의 구제 경로가
 *           살아 있는지 보는 대조군이다. 헤더만 줄고 여기가 그대로면 성공,
 *           여기까지 줄면 구제 경로를 죽인 것이다.
 * `tile`    타일. 최근 이용 기록(localStorage)과 카드 분류가 잡힌다.
 *
 * 🔴 클릭이 아니라 **터치**로 쏜다(CDP Input.dispatchTouchEvent). 모바일 위임자는
 *    touchstart/touchend 경로가 본선이고 click 은 곁가지라, 마우스로 쏘면 재려던 것을 못 잰다.
 */
const SPOTS = [
  { key: "header", name: "헤더(핸들러 없음)", selector: "#inputPage > header.logo-area" },
  /* 🔴 이 헤더는 y≈9,574 로 폴드 한참 아래다. 스크롤 없이 좌표를 쏘면 뷰포트(844px) 밖이라
     **헤더가 아니라 빈 곳을 때린다** — 그런데도 document 전역 리스너가 도느라 숫자가 그럴듯하게
     나와서 대조군 노릇을 하는 것처럼 보였다. 반드시 화면 안으로 가져온 뒤에 잰다. */
  {
    key: "collection",
    name: "컬렉션 헤더(대조군)",
    selector: ".tarot-collection__header",
    setup: (page) => scrollIntoView(page, ".tarot-collection__header"),
  },

  /* 🔴 이 타일은 settle 만으로는 DOM 에 **없다**(실측: settle 직후 `.tarot-tile` 0개).
     오버레이 → 타로 탭 → 열린 컬렉션 스크롤을 거쳐야 마운트된다.
     그래서 이 자리는 **맨 마지막**에 잰다 — setup 이 화면 상태를 크게 바꾸므로
     앞 두 자리를 오염시키면 안 된다. */
  {
    key: "tile",
    name: "타로 타일(mindscan)",
    selector: "a.tarot-tile--mindscan",
    setup: reachMindscanTile,
    teardown: closeOverlays,
  },
];

const COUNTER_KEYS = [
  "closest",
  "matches",
  "querySelectorAll",
  "elementFromPoint",
  "elementsFromPoint",
  "getBoundingClientRect",
  "getComputedStyle",
  "storage.getItem",
  "storage.setItem",
  "JSON.parse",
  "JSON.stringify",
];

const args = parseArgs(process.argv.slice(2));
const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[perf:tap-cost] target ${targetUrl}`);
console.log(`[perf:tap-cost] runs ${args.runs} · CPU ${args.cpu}x · label ${args.label}`);

const runs = [];
try {
  for (let i = 0; i < args.runs; i += 1) {
    process.stdout.write(`[perf:tap-cost] run ${i + 1}/${args.runs} ... `);
    const result = await measureOnce(targetUrl);
    runs.push(result);
    const header = result.header ? sum(result.header) : 0;
    console.log(`헤더 탭 총 호출 ${header}회`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

report();

/* ───────────────────────────── 측정 ───────────────────────────── */

/**
 * 계측기. 🔴 페이지 안에서 도는 코드다 — 바깥 스코프를 참조하지 않는다.
 * 설치는 탭 **직전**에 한다. 부팅 중에 걸면 부팅 비용까지 세게 되고, 그건 이 도구가 재려는 것이 아니다.
 */
function installCounters() {
  const counts = Object.create(null);
  const bump = (key) => {
    counts[key] = (counts[key] || 0) + 1;
  };
  const restores = [];

  const wrapProto = (proto, method, key) => {
    if (!proto || typeof proto[method] !== "function") return;
    const original = proto[method];
    proto[method] = function (...rest) {
      bump(key);
      return original.apply(this, rest);
    };
    restores.push(() => {
      proto[method] = original;
    });
  };
  const wrapObj = (obj, method, key) => {
    if (!obj || typeof obj[method] !== "function") return;
    const original = obj[method];
    obj[method] = function (...rest) {
      bump(key);
      return original.apply(this, rest);
    };
    restores.push(() => {
      obj[method] = original;
    });
  };

  wrapProto(Element.prototype, "closest", "closest");
  wrapProto(Element.prototype, "matches", "matches");
  wrapProto(Element.prototype, "getBoundingClientRect", "getBoundingClientRect");
  wrapProto(Document.prototype, "querySelectorAll", "querySelectorAll");
  wrapProto(Element.prototype, "querySelectorAll", "querySelectorAll");
  wrapProto(Document.prototype, "elementFromPoint", "elementFromPoint");
  wrapProto(Document.prototype, "elementsFromPoint", "elementsFromPoint");
  wrapObj(window, "getComputedStyle", "getComputedStyle");
  wrapObj(JSON, "parse", "JSON.parse");
  wrapObj(JSON, "stringify", "JSON.stringify");
  for (const store of [window.localStorage, window.sessionStorage]) {
    wrapObj(store, "getItem", "storage.getItem");
    wrapObj(store, "setItem", "storage.setItem");
  }

  window.__cdTapCost = {
    counts,
    reset() {
      for (const key of Object.keys(counts)) delete counts[key];
    },
    stop() {
      // 🔴 반드시 되돌린다. 래퍼를 남기면 다음 탭 측정이 앞선 래퍼 위에 또 쌓여 값이 부풀어 오른다.
      while (restores.length) restores.pop()();
    },
  };
}

async function measureOnce(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });

    await page.goto(url, { waitUntil: "load", timeout: 90000 });
    // 부팅이 끝난 뒤의 **고정 비용**만 잰다. 부팅 중 비용은 perf:interaction 의 '부팅 중 탭'이 본다.
    await page.waitForTimeout(args.settle);

    /**
     * 🔴 타일 탭은 `window.location.href` 로 페이지를 떠난다. 그대로 두면 카운터를 읽기 전에
     * 문서가 날아가 측정이 실패한다. `window.location` 을 덮어쓰지 않는다 — 셸이 그 경로를
     * 스스로 쓰므로 덮으면 재려던 동작이 바뀐다. 대신 문서 요청만 네트워크 계층에서 취소한다.
     * 🔴 **부팅이 끝난 뒤에** 켠다. goto 전에 켜면 첫 문서까지 인터셉터를 거쳐 부팅이 달라진다.
     */
    await cdp.send("Fetch.enable", {
      patterns: [{ urlPattern: "*", requestStage: "Request", resourceType: "Document" }],
    });
    cdp.on("Fetch.requestPaused", (event) => {
      cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" }).catch(() => {});
    });
    const baselineUrl = page.url();

    const out = {};
    for (const spot of SPOTS) {
      if (typeof spot.setup === "function") {
        try {
          await spot.setup(page);
        } catch (error) {
          console.warn(`\n  [${spot.name}] setup 실패: ${String(error.message || error).split("\n")[0]}`);
          out[spot.key] = null;
          continue;
        }
      }
      const box = await page
        .locator(spot.selector)
        .first()
        .boundingBox({ timeout: 2000 })
        .catch(() => null);
      if (!box) {
        out[spot.key] = null;
        if (typeof spot.teardown === "function") await spot.teardown(page).catch(() => {});
        continue;
      }
      const x = box.x + Math.min(40, box.width / 2);
      const y = box.y + Math.min(20, box.height / 2);

      await page.evaluate(installCounters);
      await page.evaluate(() => window.__cdTapCost.reset());

      // 🔴 진짜 터치 시퀀스. 위임자의 본선은 touchstart→touchend 이고, 합성 click 까지 와야
      //    한 제스처가 끝난다. 셋 중 하나라도 빠뜨리면 재려던 경로의 일부만 세게 된다.
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      await page.waitForTimeout(30);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(args.after);

      // 🔴 통과가 아니라 실패로 죽인다 — 이동을 못 막았으면 이 뒤의 값은 다른 문서의 것이다.
      if (page.url() !== baselineUrl) {
        throw new Error(`[${spot.name}] 이동을 막지 못했다(now=${page.url()}). 측정을 중단한다.`);
      }
      const counts = await page.evaluate(() => Object.assign({}, window.__cdTapCost.counts));
      await page.evaluate(() => window.__cdTapCost.stop());
      out[spot.key] = counts;

      // 탭이 무언가를 열었을 수 있다 — 다음 자리를 깨끗한 화면에서 재기 위해 되돌린다.
      if (typeof spot.teardown === "function") await spot.teardown(page).catch(() => {});
      else {
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(250);
      }
    }

    await context.close();
    return out;
  } finally {
    await browser.close();
  }
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function sum(counts) {
  return Object.values(counts || {}).reduce((total, value) => total + value, 0);
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function band(values) {
  return values.length ? `${Math.min(...values)}–${Math.max(...values)}` : "-";
}

function report() {
  const lines = [];
  lines.push(
    `# perf:tap-cost — ${args.label}`,
    "",
    `- URL: ${targetUrl}`,
    `- Runs: ${args.runs} · CPU ${args.cpu}x`,
    "",
    "탭 **1회**에 실행된 DOM API 호출 횟수(중앙값 [min–max]). 🔴 ms 가 아니라 횟수가 판정 기준이다.",
    "",
  );

  let measured = 0;
  const missing = [];
  for (const spot of SPOTS) {
    const samples = runs.map((r) => r[spot.key]).filter(Boolean);
    if (samples.length === 0) {
      lines.push(`## ${spot.name}`, "", `(요소 없음 — \`${spot.selector}\`)`, "");
      missing.push(`${spot.name}: 요소 없음 (\`${spot.selector}\`)`);
      continue;
    }
    measured += 1;
    lines.push(`## ${spot.name}`, "", "| API | 중앙값 | min–max |", "|---|---:|---|");
    for (const key of COUNTER_KEYS) {
      const values = samples.map((s) => s[key] || 0);
      if (median(values) === 0 && Math.max(...values) === 0) continue;
      lines.push(`| \`${key}\` | **${median(values)}** | ${band(values)} |`);
    }
    const totals = samples.map((s) => sum(s));
    lines.push(`| **합계** | **${median(totals)}** | ${band(totals)} |`, "");
  }

  lines.push(
    "## 읽는 법",
    "",
    "- `헤더(핸들러 없음)` 이 이 도구의 주 지표다. 여기 숫자가 곧 **무엇을 눌렀든 무조건 내는 비용**이다.",
    "- 🔴 `컬렉션 헤더(대조군)` 는 **줄면 안 된다.** 좌표 폴백의 구제 경로가 살아 있는지 보는 자리다.",
    "  헤더만 줄고 대조군이 그대로여야 성공이고, 대조군까지 줄었으면 기능을 죽인 것이다.",
    "- ms 는 읽지 않는다. 계측 래퍼 자체가 느리므로 이 런의 시간은 의미가 없다.",
    "",
  );

  const text = lines.join("\n");
  console.log("\n" + text);

  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `tap-cost-${args.label}.md`), text, "utf8");
  fs.writeFileSync(
    path.join(outDir, `tap-cost-${args.label}.json`),
    JSON.stringify({ label: args.label, url: targetUrl, runs }, null, 2),
    "utf8",
  );
  console.log(`\n[perf:tap-cost] wrote ${path.join(outDir, `tap-cost-${args.label}.md`)}`);

  // 🔴 재는 게 없으면 통과가 아니라 실패다. 특히 대조군이 사라지면 회귀를 못 잡는다.
  if (missing.length) {
    console.error(`\n[perf:tap-cost] 실패 — 못 잰 자리 ${missing.length}개:`);
    for (const item of missing) console.error(`  · ${item}`);
    process.exit(1);
  }
  if (measured === 0) process.exit(1);
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    runs: Math.max(1, parseInt(get("runs", "5"), 10)),
    cpu: Math.max(1, parseInt(get("cpu", "4"), 10)),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    after: Math.max(50, parseInt(get("after", "400"), 10)),
    label: get("label", "run"),
    url: get("url", ""),
    out: get("out", ""),
  };
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(staticRoot, urlPath);
    if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const fallback = path.join(filePath, "index.html");
      if (fs.existsSync(fallback)) filePath = fallback;
      else {
        res.writeHead(404).end();
        return;
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    const type =
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".woff2": "font/woff2",
        ".ico": "image/x-icon",
      }[ext] || "application/octet-stream";

    const acceptsBrotli = String(req.headers["accept-encoding"] || "").includes("br");
    if (acceptsBrotli && COMPRESSIBLE.has(ext)) {
      let encoded = encodedCache.get(filePath);
      if (!encoded) {
        encoded = zlib.brotliCompressSync(fs.readFileSync(filePath));
        encodedCache.set(filePath, encoded);
      }
      res.writeHead(200, { "content-type": type, "content-encoding": "br", "cache-control": "no-store" });
      res.end(encoded);
      return;
    }
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(fs.readFileSync(filePath));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}
