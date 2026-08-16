/**
 * 홈 셸의 Lighthouse 를 같은 조건으로 반복 측정한다.
 *
 * 왜 필요한가 — 성능 작업의 전/후를 비교하려면 같은 조건이어야 하는데, 프로덕션 URL 은
 * 네트워크·CDN·엣지 캐시가 매번 달라 그 조건을 만들 수 없다. 그래서 **이미 빌드된 dist/ 를
 * 로컬에서 서빙하고** 그 위에서 잰다. 빌드는 이 스크립트가 하지 않는다(npm run build:cf 를 먼저).
 *
 * 재사용한 것:
 *   - findChrome() / 정적 서버 / getFreePort() 는 scripts/verify-mobile-cdp-smoke.mjs 와 같은 방식
 *   - lighthouse@13 · chrome-launcher 는 이미 devDependency 트리에 있다
 *
 * 결과는 저장소가 아니라 --out 디렉터리(기본: OS temp)에 쓴다. 측정 산출물은 커밋 대상이 아니다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:home -- --runs=3 --preset=both --label=baseline
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html"))
  ? path.join(root, "dist")
  : root;

// 실행마다 동일하게 적용한다. 여기서 갈리면 회차 간 비교가 무의미해진다.
const CHROME_FLAGS = [
  "--headless=new",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--no-first-run",
  "--no-default-browser-check",
  "--metrics-recording-only",
  "--mute-audio",
];

// 🔴 서버가 최상위 await 로 먼저 뜨므로, 서버가 쓰는 const 는 반드시 그 앞에 선언한다(TDZ).
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const args = parseArgs(process.argv.slice(2));

const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[perf:home] serving ${path.relative(root, staticRoot) || "."} on :${port}`);
console.log(`[perf:home] target ${targetUrl}`);
console.log(`[perf:home] presets ${args.presets.join(", ")} · runs ${args.runs} · label ${args.label}`);

const results = {};

// 🔴 측정 루프보다 **앞에서** 만든다 — 회차마다 전체 LHR 을 여기에 떨구기 때문이다(아래 참고).
const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
fs.mkdirSync(outDir, { recursive: true });

try {
  for (const preset of args.presets) {
    const runs = [];
    for (let i = 0; i < args.runs; i += 1) {
      process.stdout.write(`[perf:home] ${preset} run ${i + 1}/${args.runs} ... `);
      const lhr = await runOnce(targetUrl, preset);
      /* 🔴 전체 LHR 을 남긴다. 이 스크립트의 요약본은 필요한 감사만 뽑는데, 정작
         **어떤 감사 id 가 살아 있는지**를 요약본으로는 알 수 없다. 실제로 render-blocking-resources
         와 dom-size 가 LH13 에서 사라진 것을 여러 라운드 동안 못 봤다(빈 값이 그냥 빈 값으로 보였다).
         원본이 있으면 그런 착오를 사후에라도 잡을 수 있다. fullPageScreenshot 은 flags 에서 껐다. */
      fs.writeFileSync(path.join(outDir, `lhr-${args.label}-${preset}-${i + 1}.json`), JSON.stringify(lhr), "utf8");
      const metrics = extractMetrics(lhr);
      runs.push({
        metrics,
        observed: extractObserved(lhr),
        longTasks: extractLongTasks(lhr),
        bootup: extractBootup(lhr),
        breakdown: extractBreakdown(lhr),
        dom: extractDom(lhr),
        unusedCss: extractUnusedCss(lhr),
        renderBlocking: extractRenderBlocking(lhr),
        diagnostics: extractDiagnostics(lhr),
        lcpElement: extractLcpElement(lhr),
        lcpPhases: extractLcpPhases(lhr),
        forcedReflow: extractForcedReflow(lhr),
        imageRequests: extractImageRequests(lhr),
        oversizedImages: extractOversizedImages(lhr),
      });
      console.log(`score ${metrics.performance} · TBT ${Math.round(metrics.tbt)}ms`);
    }
    results[preset] = summarize(runs);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const jsonPath = path.join(outDir, `perf-${args.label}.json`);
const mdPath = path.join(outDir, `perf-${args.label}.md`);
fs.writeFileSync(jsonPath, JSON.stringify({ label: args.label, url: targetUrl, runs: args.runs, results }, null, 2), "utf8");
fs.writeFileSync(mdPath, renderMarkdown(), "utf8");

printTables();
console.log(`\n[perf:home] wrote ${jsonPath}`);
console.log(`[perf:home] wrote ${mdPath}`);

/* ───────────────────────────── lighthouse ───────────────────────────── */

async function runOnce(url, preset) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: CHROME_FLAGS,
    chromePath: process.env.CHROME_PATH || undefined,
    // 회차마다 새 프로필. 이전 회차의 캐시·저장소가 다음 회차에 새지 않게 한다.
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "cd-lh-")),
  });
  try {
    const flags = {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance"],
      // 전체 LHR 을 회차마다 저장하므로(측정 루프 참고) base64 스크린샷을 빼 용량을 억제한다.
      // 스크린샷은 측정이 전부 끝난 뒤에 찍히므로 수치에는 영향이 없다.
      disableFullPageScreenshot: true,
    };
    // 데스크탑은 lighthouse 가 제공하는 정본 config 를 그대로 쓴다(스로틀링·화면 에뮬레이션 포함).
    // 모바일은 기본 config 가 곧 모바일이라 넘기지 않는다.
    const runnerResult = await lighthouse(url, flags, preset === "desktop" ? desktopConfig : undefined);
    if (!runnerResult || !runnerResult.lhr) throw new Error("lighthouse returned no result");
    return runnerResult.lhr;
  } finally {
    await chrome.kill();
  }
}

function numeric(lhr, id) {
  const audit = lhr.audits && lhr.audits[id];
  return audit && typeof audit.numericValue === "number" ? audit.numericValue : NaN;
}

/**
 * 🔴 감사 id 를 후보 목록으로 찾고, **하나도 없으면 실패한다.**
 *
 * 왜 fail-closed 인가 — 이 스크립트는 예전에 `render-blocking-resources` 와 `dom-size` 를
 * 읽고 있었는데 둘 다 Lighthouse 13 에서 삭제됐다(각각 `render-blocking-insight`,
 * `dom-size-insight` 가 대체). 없는 id 를 읽으면 `undefined?.details?.items || []` 가
 * **조용히 빈 값**을 내놓았고, 그 빈 값이 "렌더 블로킹 리소스가 0개"라는 잘못된 결론의
 * 근거로 쓰였다(2026-08-17 정정). 측정 도구가 못 재는 것을 못 잰다고 말하지 않으면
 * 그 구멍은 반드시 결론으로 샌다 — CLAUDE.md 코딩 원칙 10.
 */
function auditOrFail(lhr, ids, label) {
  for (const id of ids) {
    const audit = lhr.audits && lhr.audits[id];
    if (audit) return audit;
  }
  const have = Object.keys(lhr.audits || {}).filter((k) => k.includes(ids[0].split("-")[0]));
  throw new Error(
    `[perf:home] ${label}: 감사 id 를 못 찾았다 — 시도한 것: ${ids.join(", ")}\n` +
      `  Lighthouse ${lhr.lighthouseVersion} 에서 이름이 또 바뀐 것으로 보인다. 비슷한 id: ${have.join(", ") || "(없음)"}\n` +
      `  🔴 빈 값으로 넘기지 않는다 — 예전에 그렇게 해서 "렌더 블로킹 0개"라는 틀린 결론이 나왔다.`
  );
}

/**
 * 🔴 점수에 쓰이는 FCP/LCP/SI 는 **실측이 아니라 Lantern 시뮬레이션 값**이다.
 * throttlingMethod 기본값이 `simulate` 라 측정 중에는 네트워크·CPU 스로틀이 실제로 걸리지 않고
 * (core/lib/emulation.js), 관측된 의존 그래프를 mobileSlow4G(150ms RTT·1.6Mbps·CPU×4) 조건에서
 * 사후 재계산한다. 실측 예(PSI, 2026-08-14): FCP 시뮬 6,452ms vs **관측 2,468ms**,
 * LCP 시뮬 11,101ms vs **관측 2,468ms**.
 *
 * 두 값을 나란히 봐야 하는 이유: 시뮬레이션 값은 "느린 4G 에서 어떨까"이고 관측값은
 * "이 기계에서 실제로 언제 그려졌나"다. 최적화가 둘 중 어느 쪽을 움직였는지 구분하지 못하면
 * 개선을 오판한다.
 */
function extractObserved(lhr) {
  const it = lhr.audits?.metrics?.details?.items?.[0] || {};
  return {
    fcp: it.observedFirstContentfulPaint ?? null,
    lcp: it.observedLargestContentfulPaint ?? null,
    speedIndex: it.observedSpeedIndex ?? null,
    firstPaint: it.observedFirstPaint ?? null,
    domContentLoaded: it.observedDomContentLoaded ?? null,
    load: it.observedLoad ?? null,
    throttlingMethod: lhr.configSettings?.throttlingMethod ?? "(미기록)",
  };
}

/** diagnostics: 문서 전송량·요청 수·RTT. FCP 의 선행 구간이 문서 전송이라 이게 필요하다. */
function extractDiagnostics(lhr) {
  const it = lhr.audits?.diagnostics?.details?.items?.[0] || {};
  return {
    numRequests: it.numRequests ?? null,
    numScripts: it.numScripts ?? null,
    numStylesheets: it.numStylesheets ?? null,
    mainDocumentTransferSize: it.mainDocumentTransferSize ?? null,
    totalByteWeight: it.totalByteWeight ?? null,
    maxRtt: it.maxRtt ?? null,
    maxServerLatency: it.maxServerLatency ?? null,
    totalTaskTime: it.totalTaskTime ?? null,
  };
}

function extractMetrics(lhr) {
  return {
    performance: Math.round((lhr.categories.performance.score || 0) * 100),
    fcp: numeric(lhr, "first-contentful-paint"),
    lcp: numeric(lhr, "largest-contentful-paint"),
    tbt: numeric(lhr, "total-blocking-time"),
    cls: numeric(lhr, "cumulative-layout-shift"),
    speedIndex: numeric(lhr, "speed-index"),
  };
}

/** long-tasks 감사: 50ms 넘는 메인스레드 작업을 시작 시각·길이와 함께 준다. */
function extractLongTasks(lhr) {
  const items = lhr.audits?.["long-tasks"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(unattributed)",
    duration: item.duration || 0,
    startTime: item.startTime || 0,
  }));
}

/** bootup-time 감사: 스크립트별 평가/파싱 CPU 시간. 어느 파일이 비싼지는 이쪽이 정확하다. */
function extractBootup(lhr) {
  const items = lhr.audits?.["bootup-time"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(unattributed)",
    total: item.total || 0,
    scripting: item.scripting || 0,
    parse: item.scriptParseCompile || 0,
  }));
}

/**
 * 🔴 이 감사가 이 스크립트의 존재 이유다.
 * 메인스레드 시간이 Script Evaluation 에 있는지 Style & Layout 에 있는지가
 * 처방을 완전히 갈라놓는다 — 전자면 코드를 덜 실행해야 하고, 후자면 CSS 규칙 수와
 * DOM 크기를 줄여야 한다. 이걸 모르고 고치면 앞서 두 번 그랬듯 헛수고가 된다.
 */
function extractBreakdown(lhr) {
  const items = lhr.audits?.["mainthread-work-breakdown"]?.details?.items || [];
  const out = {};
  for (const item of items) out[item.groupLabel || item.group] = item.duration || 0;
  return out;
}

function extractDom(lhr) {
  // LH13 에서 `dom-size` → `dom-size-insight`. 항목 중 `statistic` 이 있는 것만 통계이고
  // 나머지는 최악 노드(`node`)라 건너뛴다.
  const items = auditOrFail(lhr, ["dom-size-insight", "dom-size"], "DOM 크기").details?.items || [];
  const out = {};
  for (const item of items) {
    const label = item.statistic || "";
    if (!label) continue;
    out[label] = Number(item.value?.value ?? item.value ?? 0);
  }
  return out;
}

function extractUnusedCss(lhr) {
  const items = lhr.audits?.["unused-css-rules"]?.details?.items || [];
  return items.map((item) => ({
    url: item.url || "(inline)",
    total: item.totalBytes || 0,
    wasted: item.wastedBytes || 0,
  }));
}

/**
 * 🔴 FCP 처방을 고르는 정본 감사다. LH13 에서 `render-blocking-resources` 가 삭제되고
 * `render-blocking-insight` 가 대체했다(core/audits/insights/render-blocking-insight.js 의
 * `replacesAudits`). 이걸 모르고 옛 id 를 읽는 동안 이 필드는 **항상 빈 배열**이었다.
 *
 * `savingsFcp`(= `metricSavings.FCP`)가 핵심이다 — **렌더 블로킹 노드를 전부 뺀 그래프로
 * 재시뮬레이션한 차이**, 즉 "이걸 다 없애면 FCP 가 얼마 빨라지나"의 정답이다.
 * 🔴 항목별 `wasted`(= `wastedMs`)는 **그 리소스의 다운로드 시간이지 한계 절감이 아니다.**
 *    12개가 병렬로 받아지므로 하나만 빼면 나머지가 그대로 경로를 잡아 순변화가 0에 가깝다
 *    (2026-08-16 실측: 1위 cosmic-main.css 2,120ms 만 제거 → FCP 변화 +1ms).
 *    합계가 아니라 `savingsFcp` 를 목표로 삼을 것.
 */
function extractRenderBlocking(lhr) {
  const audit = auditOrFail(lhr, ["render-blocking-insight", "render-blocking-resources"], "렌더 블로킹");
  const items = audit.details?.items || [];
  return {
    savingsFcp: audit.metricSavings?.FCP ?? null,
    savingsLcp: audit.metricSavings?.LCP ?? null,
    items: items.map((item) => ({
      url: item.url || "",
      total: item.totalBytes || 0,
      wasted: item.wastedMs || 0,
    })),
  };
}

/**
 * LCP 는 점수의 25% 인데 지금까지 이 스크립트는 **누가 LCP 인지**를 말해 주지 않았다.
 * 히어로 섬 이미지인지·로고인지·부트 베일인지에 따라 처방이 완전히 갈린다.
 *
 * 🔴 감사 id 는 LH 13 에서 갈렸다 — `largest-contentful-paint-element` 가 사라지고
 *    인사이트 감사가 대신한다(그 안의 `type:"node"` 항목이 요소다). 셋을 순서대로 훑는다.
 *    `lcp-discovery-insight` 는 **LCP 가 이미지일 때만** 값이 있으므로(checklist 가 없으면
 *    감사 자체가 빈다) 텍스트 LCP 면 `lcp-breakdown-insight` 만 답을 준다.
 *    한쪽만 보면 조용히 빈 값이 나온다 — 실제로 그랬다.
 */
function extractLcpElement(lhr) {
  for (const id of ["largest-contentful-paint-element", "lcp-discovery-insight", "lcp-breakdown-insight"]) {
    const items = lhr.audits?.[id]?.details?.items || [];
    for (const item of items) {
      // 🔴 `items` 가 항상 배열은 아니다 — 체크리스트 항목은 이름을 키로 가진 **객체**라
      //    `.map` 이 없다. 데스크탑 프리셋이 여기서 죽었다(모바일은 이 모양을 안 만든다).
      const subItems = Array.isArray(item.items) ? item.items : [];
      const node = item.type === "node" ? item : item.node || subItems.map((sub) => sub.node).find(Boolean);
      if (!node?.selector && !node?.snippet) continue;
      const rect = node.boundingRect;
      return {
        selector: node.selector || "",
        snippet: node.snippet || "",
        label: node.nodeLabel || "",
        rendered: rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "",
      };
    }
  }
  return null;
}

/**
 * Style & Layout 이 메인스레드의 3분의 2를 먹는데, breakdown 은 "얼마나"까지만 말한다.
 * 강제 동기 레이아웃(JS 가 기하 정보를 읽어 레이아웃을 앞당기는 것)은 그중 **어디서**
 * 오는지를 소스 위치로 짚어 주는 유일한 감사다. 🔴 여기 이름이 뜬다고 범인 확정이 아니다 —
 * 핸드오프 §3 의 하단 내비 사례처럼 ablation 으로 확인한 뒤에 고칠 것.
 */
function extractForcedReflow(lhr) {
  const tables = lhr.audits?.["forced-reflow-insight"]?.details?.items || [];
  const out = [];
  for (const table of tables) {
    for (const row of Array.isArray(table.items) ? table.items : []) {
      const source = row.source || {};
      const where = source.url ? `${source.url}:${source.line ?? 0}:${source.column ?? 0}` : source.value || "(unattributed)";
      out.push({ url: where, ms: row.reflowTime || 0 });
    }
  }
  return out;
}

/**
 * LCP 를 TTFB / 자원 로드 지연 / 로드 시간 / 렌더 지연으로 쪼갠다.
 * 어느 칸이 큰지에 따라 처방이 갈린다 — 네트워크를 고칠지 메인스레드를 고칠지.
 */
function extractLcpPhases(lhr) {
  const items = lhr.audits?.["lcp-breakdown-insight"]?.details?.items || [];
  const out = {};
  for (const item of items) {
    for (const row of Array.isArray(item.items) ? item.items : []) {
      if (row.label && typeof row.duration === "number") out[String(row.label)] = row.duration;
    }
  }
  return out;
}

/**
 * 홈 이미지는 거의 전부 loading="lazy" 라 **마크업에 있다고 실제로 받는 것이 아니다.**
 * 어떤 이미지가 정말 다운로드되고 몇 바이트인지 모르면 리사이즈 대상을 고를 근거가 없다.
 */
function extractImageRequests(lhr) {
  const items = lhr.audits?.["network-requests"]?.details?.items || [];
  return items
    .filter((item) => (item.resourceType || "") === "Image")
    .map((item) => ({
      url: item.url || "",
      transfer: item.transferSize || 0,
      resource: item.resourceSize || 0,
    }));
}

/**
 * 표시 크기 대비 과대 이미지 — 리사이즈 폭을 정하는 근거.
 * 🔴 LH 13 이 `uses-responsive-images` 를 `image-delivery-insight` 로 흡수했다(replacesAudits).
 *    하위 항목의 reason 이 "왜 낭비인지"(포맷/크기)를 말해 주므로 함께 가져온다.
 */
function extractOversizedImages(lhr) {
  for (const id of ["uses-responsive-images", "image-delivery-insight"]) {
    const items = lhr.audits?.[id]?.details?.items || [];
    if (!items.length) continue;
    return items.map((item) => ({
      url: item.url || "",
      total: item.totalBytes || 0,
      wasted: item.wastedBytes || 0,
      reasons: (Array.isArray(item.subItems?.items) ? item.subItems.items : []).map((sub) => sub.reason).filter(Boolean),
    }));
  }
  return [];
}

/* ───────────────────────────── aggregate ───────────────────────────── */

function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function summarize(runs) {
  const keys = ["performance", "fcp", "lcp", "tbt", "cls", "speedIndex"];
  const metrics = {};
  for (const key of keys) {
    const values = runs.map((run) => run.metrics[key]);
    metrics[key] = { median: median(values), min: Math.min(...values), max: Math.max(...values) };
  }
  // 회차마다 태스크 경계가 흔들리므로, URL 단위로 합산한 뒤 회차 중앙값을 쓴다.
  const breakdown = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.breakdown || {})))) {
    breakdown[key] = median(runs.map((run) => run.breakdown?.[key] || 0));
  }
  const dom = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.dom || {})))) {
    dom[key] = median(runs.map((run) => run.dom?.[key] || 0));
  }
  const observed = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.observed || {})))) {
    const values = runs.map((run) => run.observed?.[key]);
    // throttlingMethod 는 문자열이라 중앙값을 못 낸다 — 그대로 들고 간다.
    observed[key] = typeof values[0] === "number" ? median(values) : values[0];
  }
  const diagnostics = {};
  for (const key of new Set(runs.flatMap((run) => Object.keys(run.diagnostics || {})))) {
    const values = runs.map((run) => run.diagnostics?.[key]).filter((v) => typeof v === "number");
    diagnostics[key] = values.length ? median(values) : null;
  }
  return {
    metrics,
    observed,
    diagnostics,
    breakdown,
    dom,
    longTasks: rankByUrl(runs, (run) => run.longTasks, "duration"),
    bootup: rankByUrl(runs, (run) => run.bootup, "total"),
    unusedCss: rankByUrl(runs, (run) => run.unusedCss, "wasted"),
    renderBlocking: {
      // 🔴 목표로 삼을 값은 항목별 wasted 합계가 아니라 이 savingsFcp 다(extractRenderBlocking 주석 참고).
      savingsFcp: median(runs.map((run) => run.renderBlocking?.savingsFcp ?? NaN)),
      savingsLcp: median(runs.map((run) => run.renderBlocking?.savingsLcp ?? NaN)),
      items: rankByUrl(runs, (run) => run.renderBlocking?.items || [], "wasted"),
    },
    forcedReflow: rankByUrl(runs, (run) => run.forcedReflow, "ms"),
    lcpElements: rankLcpElements(runs),
    lcpPhases: Object.fromEntries(
      [...new Set(runs.flatMap((run) => Object.keys(run.lcpPhases || {})))]
        .map((key) => [key, median(runs.map((run) => run.lcpPhases?.[key] ?? NaN))]),
    ),
    imageRequests: rankBytesByUrl(runs, (run) => run.imageRequests, "transfer", 30),
    oversizedImages: withReasons(runs, rankBytesByUrl(runs, (run) => run.oversizedImages, "wasted", 15)),
    rawRuns: runs.map((run) => run.metrics),
  };
}

/** 회차마다 LCP 요소가 갈릴 수 있다. 빈도와 함께 전부 보여 준다(빈도순). */
function rankLcpElements(runs) {
  const seen = new Map();
  for (const run of runs) {
    const el = run.lcpElement;
    if (!el) continue;
    const key = el.selector || el.snippet;
    const hit = seen.get(key) || { ...el, count: 0 };
    hit.count += 1;
    seen.set(key, hit);
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

/** 바이트 순위는 회차 중앙값이지만, "왜 낭비인지"는 회차마다 같으므로 합쳐서 붙인다. */
function withReasons(runs, ranked) {
  const byUrl = new Map();
  for (const run of runs) {
    for (const item of run.oversizedImages) {
      const hit = byUrl.get(item.url) || new Set();
      for (const reason of item.reasons || []) hit.add(reason);
      byUrl.set(item.url, hit);
    }
  }
  return ranked.map((row) => ({ ...row, reasons: [...(byUrl.get(row.url) || [])] }));
}

/** rankByUrl 의 바이트판. 시간이 아니라 바이트로 줄을 세운다. */
function rankBytesByUrl(runs, pick, field, limit) {
  const perRun = runs.map((run) => {
    const totals = new Map();
    for (const item of pick(run)) totals.set(item.url, (totals.get(item.url) || 0) + (item[field] || 0));
    return totals;
  });
  const urls = new Set();
  for (const totals of perRun) for (const url of totals.keys()) urls.add(url);
  return [...urls]
    .map((url) => ({ url, bytes: median(perRun.map((totals) => totals.get(url) || 0)) }))
    .filter((row) => row.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
}

function rankByUrl(runs, pick, field) {
  const perRun = runs.map((run) => {
    const totals = new Map();
    for (const item of pick(run)) {
      totals.set(item.url, (totals.get(item.url) || 0) + (item[field] || 0));
    }
    return totals;
  });
  const urls = new Set();
  for (const totals of perRun) for (const url of totals.keys()) urls.add(url);
  return [...urls]
    .map((url) => ({
      url,
      ms: median(perRun.map((totals) => totals.get(url) || 0)),
      bytes: localBytes(url),
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 10);
}

/**
 * dist/js/shell/s-<hash>.js 는 이름만으로는 어느 블록인지 알 수 없다.
 * 크기를 함께 찍어 두면 셸 소스의 블록(640KB/258KB 등)과 대조할 수 있다.
 */
function localBytes(url) {
  try {
    const pathname = new URL(url, "http://127.0.0.1").pathname;
    const filePath = path.join(staticRoot, decodeURIComponent(pathname));
    if (!filePath.startsWith(staticRoot)) return 0;
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/* ───────────────────────────── output ───────────────────────────── */

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function kb(bytes) {
  return bytes > 0 ? `${Math.round(bytes / 1024)}KB` : "";
}

function printTables() {
  for (const preset of Object.keys(results)) {
    const { metrics, longTasks, bootup } = results[preset];
    console.log(`\n── ${preset} (median of ${args.runs}) ──`);
    console.log(`  Performance   ${fmt(metrics.performance.median)}   (${fmt(metrics.performance.min)}–${fmt(metrics.performance.max)})`);
    console.log(`  FCP           ${fmt(metrics.fcp.median)} ms`);
    console.log(`  LCP           ${fmt(metrics.lcp.median)} ms`);
    console.log(`  TBT           ${fmt(metrics.tbt.median)} ms   (${fmt(metrics.tbt.min)}–${fmt(metrics.tbt.max)})`);
    console.log(`  CLS           ${fmt(metrics.cls.median, 3)}`);
    console.log(`  Speed Index   ${fmt(metrics.speedIndex.median)} ms`);

    // 🔴 위 값은 Lantern 시뮬레이션이다. 실제로 언제 그려졌는지는 아래가 답한다.
    const { observed, diagnostics, renderBlocking } = results[preset];
    console.log(`\n  관측값 vs 시뮬레이션 (throttlingMethod=${observed.throttlingMethod}):`);
    console.log(`    FCP  관측 ${fmt(observed.fcp)} ms  ↔  시뮬 ${fmt(metrics.fcp.median)} ms`);
    console.log(`    LCP  관측 ${fmt(observed.lcp)} ms  ↔  시뮬 ${fmt(metrics.lcp.median)} ms`);
    console.log(`    SI   관측 ${fmt(observed.speedIndex)} ms  ↔  시뮬 ${fmt(metrics.speedIndex.median)} ms`);
    console.log(`    DOMContentLoaded ${fmt(observed.domContentLoaded)} ms · load ${fmt(observed.load)} ms`);

    console.log(`\n  렌더 블로킹 — 전부 없앴을 때의 FCP 절감: ${fmt(renderBlocking.savingsFcp)} ms`);
    console.log(`    (항목별 아래 수치는 다운로드 시간이지 한계 절감이 아니다 — 하나만 빼면 나머지가 경로를 잡는다)`);
    for (const row of renderBlocking.items.slice(0, 12)) {
      console.log(`    ${fmt(row.ms).padStart(6)} ms  ${kb(row.bytes).padStart(7)}  ${row.url}`);
    }

    console.log(`\n  문서/요청: HTML 전송 ${kb(diagnostics.mainDocumentTransferSize)} · 요청 ${fmt(diagnostics.numRequests)}개 · 시트 ${fmt(diagnostics.numStylesheets)}개 · 총 ${kb(diagnostics.totalByteWeight)}`);

    const { breakdown, dom, unusedCss } = results[preset];
    console.log(`\n  Main-thread work breakdown (median):`);
    for (const [label, ms] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${fmt(ms).padStart(7)} ms  ${label}`);
    }
    if (Object.keys(dom).length) {
      console.log(`  DOM: ${Object.entries(dom).map(([k, v]) => `${k}=${fmt(v)}`).join(" · ")}`);
    }
    console.log(`\n  Top unused CSS (wasted bytes):`);
    for (const row of unusedCss.slice(0, 5)) {
      console.log(`    ${kb(row.ms).padStart(8)} wasted  ${row.url}`);
    }

    console.log(`\n  Top long tasks (>50ms):`);
    for (const row of longTasks.slice(0, 5)) {
      console.log(`    ${fmt(row.ms).padStart(6)} ms  ${kb(row.bytes).padStart(7)}  ${row.url}`);
    }
    console.log(`\n  Top script CPU (bootup-time):`);
    for (const row of bootup.slice(0, 5)) {
      console.log(`    ${fmt(row.ms).padStart(6)} ms  ${kb(row.bytes).padStart(7)}  ${row.url}`);
    }

    const { lcpElements, lcpPhases, imageRequests, oversizedImages, forcedReflow } = results[preset];
    if (forcedReflow.length) {
      console.log(`\n  Forced synchronous layout (median ms per source):`);
      for (const row of forcedReflow.slice(0, 8)) {
        console.log(`    ${fmt(row.ms, 1).padStart(8)} ms  ${row.url}`);
      }
    }
    if (Object.keys(lcpPhases).length) {
      console.log(`\n  LCP breakdown (median):`);
      for (const [label, ms] of Object.entries(lcpPhases).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${fmt(ms).padStart(7)} ms  ${label}`);
      }
    }
    console.log(`\n  LCP element:`);
    if (!lcpElements.length) console.log(`    (lighthouse reported none)`);
    for (const row of lcpElements) {
      console.log(`    ${row.count}/${args.runs} runs  ${row.selector || row.label}${row.rendered ? `  (rendered ${row.rendered})` : ""}`);
      if (row.snippet) console.log(`             ${row.snippet.slice(0, 160)}`);
    }

    const imageTotal = imageRequests.reduce((sum, row) => sum + row.bytes, 0);
    console.log(`\n  Images actually downloaded — ${imageRequests.length} files, ${kb(imageTotal)} transferred:`);
    for (const row of imageRequests.slice(0, 12)) {
      console.log(`    ${kb(row.bytes).padStart(8)}  ${shortUrl(row.url)}`);
    }
    if (oversizedImages.length) {
      console.log(`\n  Image delivery savings available:`);
      for (const row of oversizedImages.slice(0, 8)) {
        console.log(`    ${kb(row.bytes).padStart(8)} wasted  ${shortUrl(row.url)}`);
        for (const reason of row.reasons) console.log(`               ↳ ${reason}`);
      }
    }
  }
}

/** 프로덕션 절대 URL 은 길어서 표를 망친다. 경로만 남긴다. */
function shortUrl(url) {
  try {
    return decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  } catch {
    return url;
  }
}

function renderMarkdown() {
  const lines = [`# perf:home — ${args.label}`, "", `- URL: ${targetUrl}`, `- Runs: ${args.runs}`, ""];
  for (const preset of Object.keys(results)) {
    const { metrics, longTasks, bootup } = results[preset];
    lines.push(`## ${preset}`, "", "| Metric | Median | Min | Max |", "|---|---:|---:|---:|");
    for (const [key, label] of [["performance", "Performance"], ["fcp", "FCP (ms)"], ["lcp", "LCP (ms)"], ["tbt", "TBT (ms)"], ["cls", "CLS"], ["speedIndex", "Speed Index (ms)"]]) {
      const digits = key === "cls" ? 3 : 0;
      const m = metrics[key];
      lines.push(`| ${label} | ${fmt(m.median, digits)} | ${fmt(m.min, digits)} | ${fmt(m.max, digits)} |`);
    }
    // 🔴 위 표는 Lantern 시뮬레이션 값이다. 관측값을 나란히 남긴다 — 둘을 섞어 읽으면 오판한다.
    const { observed, diagnostics, renderBlocking } = results[preset];
    lines.push("", `### 관측값 vs 시뮬레이션 (throttlingMethod=\`${observed.throttlingMethod}\`)`, "",
      "| 지표 | 관측 | 시뮬레이션(점수 근거) |", "|---|---:|---:|",
      `| FCP | ${fmt(observed.fcp)} ms | ${fmt(metrics.fcp.median)} ms |`,
      `| LCP | ${fmt(observed.lcp)} ms | ${fmt(metrics.lcp.median)} ms |`,
      `| Speed Index | ${fmt(observed.speedIndex)} ms | ${fmt(metrics.speedIndex.median)} ms |`,
      `| DOMContentLoaded | ${fmt(observed.domContentLoaded)} ms | — |`,
      `| load | ${fmt(observed.load)} ms | — |`);

    lines.push("", "### 렌더 블로킹", "",
      `**전부 없앴을 때의 FCP 절감: ${fmt(renderBlocking.savingsFcp)} ms** (\`render-blocking-insight.metricSavings.FCP\`)`, "",
      "🔴 아래 항목별 ms 는 **다운로드 시간이지 한계 절감이 아니다.** 병렬로 받아지므로 하나만 빼면 나머지가 경로를 잡는다.", "",
      "| ms | size | url |", "|---:|---:|---|");
    for (const row of renderBlocking.items) lines.push(`| ${fmt(row.ms)} | ${kb(row.bytes)} | \`${row.url}\` |`);

    lines.push("", "### 문서 / 요청", "", "| 항목 | 값 |", "|---|---:|",
      `| HTML 전송 크기 | ${kb(diagnostics.mainDocumentTransferSize)} |`,
      `| 요청 수 | ${fmt(diagnostics.numRequests)} |`,
      `| 스타일시트 수 | ${fmt(diagnostics.numStylesheets)} |`,
      `| 스크립트 수 | ${fmt(diagnostics.numScripts)} |`,
      `| 총 바이트 | ${kb(diagnostics.totalByteWeight)} |`,
      `| maxRtt | ${fmt(diagnostics.maxRtt, 1)} ms |`,
      `| maxServerLatency | ${fmt(diagnostics.maxServerLatency)} ms |`);

    lines.push("", "### Top long tasks", "", "| ms | size | url |", "|---:|---:|---|");
    for (const row of longTasks) lines.push(`| ${fmt(row.ms)} | ${kb(row.bytes)} | \`${row.url}\` |`);
    lines.push("", "### Top script CPU (bootup-time)", "", "| ms | size | url |", "|---:|---:|---|");
    for (const row of bootup) lines.push(`| ${fmt(row.ms)} | ${kb(row.bytes)} | \`${row.url}\` |`);

    const { lcpElements, lcpPhases, imageRequests, oversizedImages, forcedReflow } = results[preset];
    lines.push("", "### Forced synchronous layout", "", "| ms | source |", "|---:|---|");
    for (const row of forcedReflow) lines.push(`| ${fmt(row.ms, 1)} | \`${row.url}\` |`);
    lines.push("", "### LCP breakdown", "", "| subpart | ms |", "|---|---:|");
    for (const [label, ms] of Object.entries(lcpPhases).sort((a, b) => b[1] - a[1])) lines.push(`| ${label} | ${fmt(ms)} |`);
    lines.push("", "### LCP element", "", "| runs | rendered | selector | snippet |", "|---:|---|---|---|");
    for (const row of lcpElements) {
      lines.push(`| ${row.count}/${args.runs} | ${row.rendered || "-"} | \`${row.selector || row.label}\` | \`${(row.snippet || "").slice(0, 160)}\` |`);
    }
    lines.push("", "### Images actually downloaded", "", "| transferred | url |", "|---:|---|");
    for (const row of imageRequests) lines.push(`| ${kb(row.bytes)} | \`${shortUrl(row.url)}\` |`);
    lines.push("", "### Image delivery savings", "", "| wasted | url | why |", "|---:|---|---|");
    for (const row of oversizedImages) lines.push(`| ${kb(row.bytes)} | \`${shortUrl(row.url)}\` | ${row.reasons.join("; ") || "-"} |`);
    lines.push("");
  }
  return lines.join("\n");
}

/* ───────────────────────────── plumbing ───────────────────────────── */

function parseArgs(argv) {
  const get = (name) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : "";
  };
  const runs = Math.min(10, Math.max(1, Number(get("runs")) || 3));
  const presetRaw = (get("preset") || "both").toLowerCase();
  if (!["mobile", "desktop", "both"].includes(presetRaw)) {
    throw new Error(`--preset must be mobile|desktop|both (got ${presetRaw})`);
  }
  return {
    runs,
    presets: presetRaw === "both" ? ["mobile", "desktop"] : [presetRaw],
    url: get("url"),
    out: get("out"),
    label: (get("label") || "head").replace(/[^a-zA-Z0-9._-]/g, "-"),
  };
}

/**
 * 🔴 압축은 옵션이 아니라 필수다.
 *
 * 압축 없이 서빙하면 Lighthouse 의 시뮬레이션 스로틀링에서 2.6MB 셸의 전송이 지배해
 * FCP 가 14초까지 밀리고, 그러면 **JS 실행이 대부분 FCP 이전에 끝나 TBT 에 안 잡힌다**
 * (실측: 압축 없음 → 모바일 TBT 432ms, 프로덕션 → 3,010ms. 같은 코드다).
 * 프로덕션 Cloudflare 는 brotli 로 내려주므로, 그 체제를 재현해야 측정이 의미를 가진다.
 */
function encodeFor(filePath, buffer, acceptEncoding) {
  if (!COMPRESSIBLE.has(path.extname(filePath).toLowerCase())) return null;
  const accepts = String(acceptEncoding || "");
  const encoding = /\bbr\b/.test(accepts) ? "br" : /\bgzip\b/.test(accepts) ? "gzip" : null;
  if (!encoding) return null;

  const key = `${encoding}:${filePath}`;
  let body = encodedCache.get(key);
  if (!body) {
    // 품질은 전송 크기가 프로덕션과 비슷해지는 선에서 가장 빠른 값으로 고른다.
    body = encoding === "br"
      ? zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })
      : zlib.gzipSync(buffer, { level: 6 });
    encodedCache.set(key, body);
  }
  return { encoding, body };
}

function startStaticServer() {
  const instance = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rawPath = decodeURIComponent(url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname);
    const filePath = path.normalize(path.join(staticRoot, rawPath));
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      const headers = { "content-type": contentType(filePath), "cache-control": "no-store" };
      const encoded = encodeFor(filePath, buffer, req.headers["accept-encoding"]);
      if (encoded) {
        headers["content-encoding"] = encoded.encoding;
        headers["vary"] = "Accept-Encoding";
      }
      res.writeHead(200, headers);
      res.end(encoded ? encoded.body : buffer);
    });
  });
  return new Promise((resolve, reject) => {
    instance.on("error", reject);
    instance.listen(0, "127.0.0.1", () => resolve(instance));
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  }[ext] || "application/octet-stream";
}
