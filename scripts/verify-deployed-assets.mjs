#!/usr/bin/env node
/**
 * 배포된 HTML 이 참조하는 자산이 전부 200 인지 확인한다.
 *
 * ── 왜 두 모드인가 (2026-08-08 개편) ────────────────────────────────────────
 * 원래는 프로덕션 호스트 하나만 봤다. 그런데 프로덕션 별칭(code-destiny.com)은 배포 전환 중에
 * **두 세대를 동시에 서빙한다** — HTML 은 새 배포본에서, 자산은 옛 배포본에서 오는 요청이 섞인다.
 * 그러면 빌드 간 해시가 바뀐 파일(webpack 런타임·app/layout·css·변경된 라우트 청크)만 404 로
 * 내려오고, 해시가 그대로인 나머지는 양쪽 세대에 다 있어 200 이다.
 *
 * 2026-08-07 릴리스 실패의 정체가 이것이었다:
 *   - `wrangler pages deploy` 는 `Uploaded 0 files (3279 already uploaded)` 로 **전부 업로드됨**을 보고
 *   - 그런데도 5건이 `bare=404 bypass=404` (쿼리스트링은 캐시 키를 바꾸므로 이건 오리진 응답이다)
 *   - 실패 건수가 라운드마다 5→3→4→6→5 로 요동하고 매니페스트가 매 라운드 바뀜
 * 즉 "산출물 부재"가 아니라 "세대 혼입"이었는데, 옛 코드에는 둘을 가를 근거가 없었다
 * (이 파일은 `fs` 를 아예 쓰지 않아 방금 배포한 로컬 빌드를 한 번도 보지 않았다).
 * 그 오진이 자동 롤백을 불렀고, 롤백은 **또 한 번의 전환 구간**을 만들어 다음 릴리스를 같은 이유로
 * 실패시켰다(실측: 어떤 실행의 롤백 대상이 직전 실패 실행이 만든 배포본이었다).
 *
 *   `artifact` 모드 — ORIGIN 이 **배포 고유 URL**(`<hash>.<project>.pages.dev`). 이 URL 은 하나의
 *     불변 배포본만 서빙하므로 세대 혼입이 원천적으로 없다. 여기서 404 면 진짜 산출물/업로드
 *     문제이고, 재시도해도 달라지지 않으므로 즉시 실패한다. **이게 진짜 빌드 검증 지점이다.**
 *
 *   `alias` 모드 — ORIGIN 이 프로덕션 별칭. 전환이 끝났는지 보는 것이 목적이다.
 *     `CD_DEPLOY_EXPECTED_DIR`(방금 배포한 로컬 빌드)이 주어지면 세대를 판별할 수 있다:
 *       · HTML 이 참조하는 자산 중 로컬 빌드에 **없는** 것이 있다 → 아직 옛 세대의 HTML → 판정 보류
 *       · 로컬 빌드에 **있는데** 404 → 전환 미완. 예산 소진 뒤에는 경고로 남기고 통과시킨다
 *         (파일 실재는 artifact 모드가 이미 증명했고, 롤백은 전환 구간을 하나 더 만들 뿐이다)
 *
 * ── 엣지 캐시 오염은 여전히 하드 실패다 ─────────────────────────────────────
 * `bare=404` + `?cdcb=` 200 → 오리진은 멀쩡한데 엣지에 404 가 캐시된 상태. Cloudflare 가 404 에
 * `max-age=172800`(2일)을 붙이므로 **스스로 풀리지 않는다**. HTML 은 `no-store` 라 새로고침해도
 * 같은 죽은 URL 을 다시 부른다(2026-07-30: `globals.css` 하나가 이렇게 죽어 /points·/me·/login 이
 * 무스타일로 떴다). 롤백으로도 안 고쳐진다 — 내용이 같으면 해시가 같아 같은 URL 을 가리킨다.
 * 그래서 이건 감지·퍼지 대상이지 롤백 대상이 아니다.
 *
 * ── 퍼지 자격 ────────────────────────────────────────────────────────────
 * `CLOUDFLARE_CACHE_PURGE_TOKEN` + `CLOUDFLARE_ZONE_ID` 가 있으면 죽은 URL 만 골라 퍼지한다.
 * 없으면 퍼지를 건너뛰고 실패로 보고한다(대시보드에서 수동 퍼지 필요).
 * ⚠️ 기존 `CLOUDFLARE_API_TOKEN` 에는 Zone Cache Purge 권한이 없다(실측: Authentication error).
 */

import fs from "node:fs";
import path from "node:path";

const ORIGIN = (process.env.CD_DEPLOY_VERIFY_ORIGIN || "https://code-destiny.com").replace(/\/+$/, "");
const MODE = String(process.env.CD_DEPLOY_ASSETS_MODE || "alias").trim().toLowerCase() === "artifact" ? "artifact" : "alias";
const EXPECTED_DIR = String(process.env.CD_DEPLOY_EXPECTED_DIR || "").trim()
  ? path.resolve(String(process.env.CD_DEPLOY_EXPECTED_DIR).trim())
  : "";
// 이름은 둘 다 받는다. `.env*` 는 수정 금지 파일이라 사람이 넣어 둔 이름을 코드가 맞춘다.
const PURGE_TOKEN = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN || process.env.CLOUDFLARE_PURGE_TOKEN || "";
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "";
const CF_READ_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "";

/**
 * 대표 라우트. 공용 청크(layout·globals.css)는 어느 React 라우트에서든 잡히지만,
 * 라우트 전용 청크까지 보려면 성격이 다른 화면을 섞어야 한다.
 * `/` 는 정적 셸이라 `_next` 를 참조하지 않지만, 셸이 살아있는지 확인하는 의미로 둔다.
 */
// `/me` 는 2026-08-08 에 정적 셸로 이관되며 빌드에서 사라졌다(bd54e99eb). 오리진이 옛 HTML 을
// 한동안 200 으로 계속 내려주는 바람에, 여기 남아 있는 동안 릴리스마다 그 옛 세대의 청크가
// "죽은 자산" 으로 보고됐다. 목록에서 빼되, 같은 일이 또 생겨도 routeExistsInBuild 가 막는다.
//
// 🔴 여기 없는 라우트는 이 파일의 전파 대기(재시도+퍼지)를 하나도 못 받는다. scripts/deploy-smoke.mjs
// 가 브라우저로 방문하는 라우트는 재시도 없이 console.error 를 그대로 실패로 본다 — 그래서 여기
// 목록에 없던 `/saju/basic/` 의 셸 청크(`/js/shell/s-*.js`)가 전환 구간에 일시 404 나자 스모크가
// 즉시 릴리스를 실패시키고 자동 롤백을 불렀다(2026-08-21, PR #920 릴리스 5a92e99, 커밋 자체는
// `scripts/verify-karma-destiny-ai-flow.mjs` 한 줄만 바꿔 무관했다). deploy-smoke 라우트는 전부
// 여기서도 검사해 같은 전파 지연을 롤백 전에 흡수한다.
const ROUTES = [
  "/",
  "/points/",
  "/login/",
  "/music/",
  "/stories/",
  "/saju/basic/",
  "/fortune-tea-house/",
  "/app/",
  "/app/store/",
  "/lock-screen-fortune/",
];

// artifact 모드는 불변 URL 이라 즉시 일관적이다 — 재시도는 순수 네트워크 흔들림 대비 1회뿐.
// alias 모드는 전환을 기다리는 것이 일이므로 예산을 넉넉히 준다(8×20초 ≈ 160초).
const MAX_ROUNDS = MODE === "artifact" ? 1 : 8;
const ROUND_DELAY_MS = MODE === "artifact" ? 8_000 : 20_000;
const REQUEST_TIMEOUT_MS = 15_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 방금 배포한 로컬 빌드에 이 URL 경로가 존재하는가. 세대 판별의 유일한 근거다. */
function existsInBuild(urlPath) {
  if (!EXPECTED_DIR) return true;
  const segments = String(urlPath).split("?")[0].split("/").filter(Boolean);
  if (!segments.length) return false;
  return fs.existsSync(path.join(EXPECTED_DIR, ...segments));
}

/**
 * 이 라우트가 방금 배포한 빌드에 존재하는가.
 *
 * 🔴 없는 라우트를 검사 대상에 남겨 두면 안 된다. `/me` 는 2026-08-08 에 정적 셸로 이관되며
 * 빌드에서 사라졌는데, 오리진은 한동안 옛 HTML 을 200 으로 계속 내려줬다(실측: `Age: 5256`,
 * `?cdcb=` 우회는 404). 검증기가 그 200 을 믿고 옛 세대의 청크를 검사해 `app/me/page-*` 를
 * "죽은 자산"으로 보고했고, 그게 릴리스 실패 목록에 그대로 올라갔다.
 */
function routeExistsInBuild(route) {
  if (!EXPECTED_DIR) return true;
  const segments = String(route).split("/").filter(Boolean);
  return fs.existsSync(path.join(EXPECTED_DIR, ...segments, "index.html"));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "cache-control": "no-cache" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    try {
      await res.body?.cancel();
    } catch {
      // Best effort: release the socket before the next route check.
    }
    return { status: res.status, body: "" };
  }
  return { status: res.status, body: await res.text() };
}

async function statusOf(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    try {
      await res.body?.cancel();
    } catch {
      // Best effort: these checks only need the status code.
    }
    return res.status;
  } catch (error) {
    return `ERR:${error?.message || "unknown"}`;
  }
}

function extractAssets(html) {
  const found = new Set();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\s>]+?\.(?:css|js)/g)) {
    found.add(match[0]);
  }
  // 정적 셸(`/`)이 참조하는 자산은 `_next/static` 이 아니라 `/js`·`/styles`·`/css` 에 있다.
  // 같은 엣지 캐시 404 사고가 나도 위 정규식으로는 하나도 잡히지 않아 그동안 무방비였다.
  // 지연 로더가 쓰는 data-cd-noncritical-* 속성도 결국 같은 URL 을 요청하므로 함께 본다.
  for (const match of html.matchAll(
  // 🔴 이 저장소의 셸 자산은 전부 `?v=` 를 달고 나간다. 정규식이 `?` 앞에서 끊기던 동안
  //    이 검증기는 **실제로 요청되는 URL 을 하나도 보지 않았다** — 검사도 재시도도 퍼지도
  //    그 URL 을 비껴갔다(2026-08-24 실측: index.html 의 /js·/styles 참조 31/31 이 ?v= 부착).
    /(?:\ssrc|\shref|data-cd-noncritical-src|data-cd-noncritical-style-src)=["'](\/(?:js|styles|css)\/[^"'\s>]+?\.(?:js|css)(?:\?[^"'\s>]*)?)/g,
  )) {
    found.add(match[1]);
  }
  return [...found];
}

/** 모듈 그래프를 몇 단계까지 따라갈지. app.js → bootstrapDestinyFlower.js → destiny-flower-art.js 가 3단이다. */
const MODULE_GRAPH_DEPTH = 4;

/** JS 본문에서 지역 import 지정자를 뽑는다. scripts/verify-js-module-graph.mjs 와 같은 규칙이다. */
function extractModuleSpecifiers(source) {
  const out = new Set();
  const patterns = [
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s+[^;()]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bexport\s+[^;]*?\bfrom\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of String(source || "").matchAll(pattern)) {
      const value = match[1];
      if (value.startsWith(".") || value.startsWith("/")) out.add(value);
    }
  }
  return [...out];
}

/** `/js/app.js?v=x` 안의 `./core/init.js?v=y` 를 `/js/core/init.js?v=y` 로 편다. */
function resolveModuleUrl(fromPath, specifier) {
  try {
    const base = new URL(fromPath, "https://cd.invalid");
    const resolved = new URL(specifier, base);
    if (resolved.origin !== base.origin) return null;
    return resolved.pathname + resolved.search;
  } catch {
    return null;
  }
}

/**
 * HTML 이 참조한 JS 에서 시작해 모듈 그래프를 따라 내려간다.
 *
 * 🔴 2026-08-24 에 릴리스를 죽인 파일(`/js/services/destiny-flower-engine.js`)은 **HTML 에 없다.**
 * `js/app.js` 가 동적 import 로 부르는 모듈 안에서만 보인다. HTML 속성만 훑던 동안 이 검증기의
 * 재시도(8회×20초)와 퍼지는 그 파일에 원리적으로 닿을 수 없었고, 탐지 수단은 브라우저 스모크뿐이었다
 * — 그런데 스모크는 재시도도 퍼지도 하지 않고 곧장 자동 롤백을 부른다.
 *
 * 반환: 새로 찾은 자산 → 그것을 참조한 부모 자산. 부모가 엣지에 굳은 옛 세대일 때
 * **퍼지해야 하는 것은 자식이 아니라 부모**라서 출처를 남긴다.
 */
async function expandModuleGraph(found) {
  const parents = new Map();
  let frontier = [...found].filter((item) => /\.m?js(?:\?|$)/.test(item) && item.startsWith("/js/"));
  for (let depth = 0; depth < MODULE_GRAPH_DEPTH && frontier.length; depth += 1) {
    const next = [];
    for (const item of frontier) {
      let body;
      try {
        body = (await fetchText(`${ORIGIN}${item}`)).body;
      } catch {
        continue; // 못 받아오는 것은 checkAssets 가 상태코드로 이미 판정한다.
      }
      for (const specifier of extractModuleSpecifiers(body)) {
        const resolved = resolveModuleUrl(item, specifier);
        if (!resolved || found.has(resolved)) continue;
        found.add(resolved);
        parents.set(resolved, item);
        if (/\.m?js(?:\?|$)/.test(resolved)) next.push(resolved);
      }
    }
    frontier = next;
  }
  return parents;
}

/**
 * 모듈 그래프에서 찾은 자식이 죽었는데 빌드에도 없다면, 그것은 **부모가 옛 세대**라는 뜻이다
 * (자식은 이미 지워진 파일이다). 고쳐야 하는 URL 은 자식이 아니라 부모이므로 퍼지 대상을 갈아끼운다.
 * artifact 모드는 불변 배포본이라 세대가 섞일 수 없으므로 이 완화를 적용하지 않는다 —
 * 거기서의 404 는 빌드가 정말로 없는 파일을 참조한다는 뜻이고, 그건 실패가 맞다.
 */
function staleParentTargets(dead, moduleParents) {
  if (MODE === "artifact") return [];
  const out = [];
  for (const item of dead || []) {
    const parent = moduleParents?.get(item.path);
    if (!parent) continue;
    if (existsInBuild(item.path)) continue;
    out.push({ child: item.path, parent, status: item.status });
  }
  return out;
}

async function collectAssetUrls() {
  const found = new Set();
  const routeFailures = [];
  const skippedRoutes = [];
  const staleRoutes = [];
  for (const route of ROUTES) {
    // 빌드에 없는 라우트는 아예 묻지 않는다. 오리진이 옛 HTML 을 200 으로 주더라도 속지 않는다.
    if (!routeExistsInBuild(route)) {
      skippedRoutes.push(route);
      continue;
    }
    const url = `${ORIGIN}${route}`;
    let res;
    try {
      res = await fetchText(url);
    } catch (error) {
      routeFailures.push(`${route} → 요청 실패(${error?.message || "unknown"})`);
      continue;
    }
    if (res.status !== 200) {
      routeFailures.push(`${route} → HTTP ${res.status}`);
      continue;
    }
    const routeAssets = extractAssets(res.body);
    // 🔴 세대 판별은 **라우트 단위**로 한다. 전환 중에는 라우트마다 다른 세대가 나오므로,
    // 하나가 옛 세대라고 전체 검사를 미루면 영영 판정하지 못한다. 옛 세대 라우트의 자산만
    // 검사 대상에서 빼고, 나머지는 지금 바로 확인한다.
    if (EXPECTED_DIR && MODE === "alias" && routeAssets.some((item) => !existsInBuild(item))) {
      staleRoutes.push(route);
      continue;
    }
    for (const item of routeAssets) found.add(item);
  }
  const moduleParents = await expandModuleGraph(found);
  return { assets: [...found].sort(), moduleParents, routeFailures, skippedRoutes, staleRoutes };
}

async function checkAssets(assets) {
  const dead = [];
  for (const item of assets) {
    const status = await statusOf(`${ORIGIN}${item}`);
    if (status !== 200) dead.push({ path: item, status });
  }
  return dead;
}

/** 엣지 캐시 오염인지(오리진은 정상) 구분한다. */
async function classify(dead) {
  const out = [];
  for (const item of dead) {
    const bypass = await statusOf(`${ORIGIN}${item.path}?cdcb=${Date.now()}`);
    out.push({ ...item, bypassStatus: bypass, edgePoisoned: bypass === 200 });
  }
  return out;
}

/**
 * zone id 는 비밀값이 아니라 오리진 호스트에서 유도되는 식별자다. 그런데 그것 하나가 비어 있다는
 * 이유로 퍼지가 통째로 죽는 일이 실제로 있었다(토큰은 넣었는데 zone id 를 안 넣어서). 저장 위치가
 * `.env*`(수정 금지 파일)뿐이라 사람이 넣어 주기를 기다릴 이유가 없으므로, 없으면 API 로 찾는다.
 */
let resolvedZoneId = null;
async function zoneId() {
  if (ZONE_ID) return ZONE_ID;
  if (resolvedZoneId !== null) return resolvedZoneId;
  resolvedZoneId = "";
  let host = "";
  try {
    host = new URL(ORIGIN).hostname.replace(/^www\./, "");
  } catch {
    return resolvedZoneId;
  }
  // 배포 고유 URL(*.pages.dev)에는 zone 이 없다. 조회할 이유가 없다.
  if (!host || host.endsWith(".pages.dev") || host.endsWith(".workers.dev")) return resolvedZoneId;
  const token = CF_READ_TOKEN || PURGE_TOKEN;
  if (!token) return resolvedZoneId;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(host)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.success) resolvedZoneId = json.result?.[0]?.id || "";
  } catch {
    // 조회 실패는 퍼지 미수행으로만 이어진다. 검사 자체를 죽이지 않는다.
  }
  return resolvedZoneId;
}

async function purge(paths) {
  const zone = await zoneId();
  if (!PURGE_TOKEN || !zone) {
    const missing = [
      PURGE_TOKEN ? "" : "CLOUDFLARE_CACHE_PURGE_TOKEN(또는 CLOUDFLARE_PURGE_TOKEN)",
      zone ? "" : "CLOUDFLARE_ZONE_ID(자동 조회도 실패)",
    ].filter(Boolean).join(" + ");
    return { attempted: false, ok: false, reason: `퍼지 자격 없음 — ${missing}` };
  }
  const files = paths.map((p) => `${ORIGIN}${p}`);
  // Cloudflare 는 호출당 최대 30 URL 을 받는다.
  for (let i = 0; i < files.length; i += 30) {
    const batch = files.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PURGE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: batch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json?.success) {
      return { attempted: true, ok: false, reason: (json?.errors || []).map((e) => e.message).join(", ") || `HTTP ${res.status}` };
    }
  }
  return { attempted: true, ok: true };
}

function report(lines) {
  for (const line of lines) console.log(line);
}

async function main() {
  console.log(`[verify-deployed-assets] mode=${MODE} 대상 오리진: ${ORIGIN}`);
  if (EXPECTED_DIR) console.log(`[verify-deployed-assets] 기준 빌드: ${EXPECTED_DIR}`);
  else if (MODE === "alias") console.log("[verify-deployed-assets] 기준 빌드 미지정 — 세대 판별 없이 검사합니다(CD_DEPLOY_EXPECTED_DIR).");

  function describe(snap) {
    if (snap.routeFailures.length) {
      console.log("[verify-deployed-assets] 라우트 응답 이상:");
      report(snap.routeFailures.map((l) => `  - ${l}`));
    }
    if (snap.skippedRoutes.length) {
      console.log(`[verify-deployed-assets] 빌드에 없는 라우트 건너뜀: ${snap.skippedRoutes.join(", ")}`);
    }
    if (snap.staleRoutes.length) {
      console.log(`[verify-deployed-assets] 아직 옛 세대의 HTML 을 주는 라우트: ${snap.staleRoutes.join(", ")}`);
    }
  }

  let snapshot = await collectAssetUrls();
  describe(snapshot);
  if (!snapshot.assets.length && !snapshot.staleRoutes.length) {
    console.error("::error::배포된 HTML 에서 참조 자산(_next/static · 셸 /js·/styles·/css)을 하나도 찾지 못했습니다. 라우트 응답을 확인하세요.");
    process.exit(1);
  }
  console.log(`[verify-deployed-assets] 검사 대상 ${snapshot.assets.length}개`);

  let dead = await checkAssets(snapshot.assets);

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    if (!dead.length && !snapshot.staleRoutes.length) break;
    if (!dead.length) {
      // 검사한 자산은 전부 살아 있는데 아직 옛 세대를 주는 라우트가 남았다 — 전환이 진행 중이다.
      console.log(`[verify-deployed-assets] round ${round}/${MAX_ROUNDS}: 자산은 전부 200, 전환 대기 라우트 ${snapshot.staleRoutes.length}건`);
    } else {
      const classified = await classify(dead);
      const poisoned = classified.filter((d) => d.edgePoisoned);
      const unresolved = classified.filter((d) => !d.edgePoisoned);

      console.log(
        `[verify-deployed-assets] round ${round}/${MAX_ROUNDS}: 실패 ${classified.length}건`
          + ` (엣지 캐시 404 ${poisoned.length} / 미전파·부재 ${unresolved.length})`,
      );
      report(classified.map((d) => `  - ${d.path} bare=${d.status} bypass=${d.bypassStatus}`));

      // artifact 모드는 불변 URL 이다. 여기서 404 면 파일이 그 배포본에 없는 것이고
      // 기다린다고 생기지 않는다 — 바로 최종 판정으로 간다.
      if (MODE === "artifact") {
        dead = classified;
        break;
      }

      // 엣지 오염분만 퍼지로 즉시 풀 수 있다. 미전파분은 기다리는 것 말고 할 수 있는 게 없다.
      // 🔴 모듈 그래프에서 찾은 죽은 자식은 **부모**를 퍼지해야 풀린다 — 자식은 이미 지워진 파일이라
      //    그 URL 을 아무리 퍼지해도 404 그대로다. 롤백으로도 안 풀린다(deploy-safe.mjs:840-843).
      const roundStaleParents = staleParentTargets(classified, snapshot.moduleParents);
      if (roundStaleParents.length) {
        report(roundStaleParents.map((s) => `  - ${s.child} 는 빌드에 없습니다 — 부모 ${s.parent} 가 옛 세대입니다`));
      }
      const purgeTargets = [...new Set([...poisoned.map((d) => d.path), ...roundStaleParents.map((s) => s.parent)])];
      if (purgeTargets.length) {
        const purged = await purge(purgeTargets);
        if (purged.attempted && purged.ok) console.log(`[verify-deployed-assets] 캐시 퍼지 완료 (${purgeTargets.length}건)`);
        else console.log(`[verify-deployed-assets] 퍼지 건너뜀 — ${purged.reason}`);
      }
    }

    if (round === MAX_ROUNDS) break;
    await sleep(ROUND_DELAY_MS);

    const refreshed = await collectAssetUrls();
    describe(refreshed);
    if (refreshed.assets.join("\n") !== snapshot.assets.join("\n")) {
      console.log(
        `[verify-deployed-assets] refreshed asset manifest during deploy cutover: ${snapshot.assets.length} -> ${refreshed.assets.length}`,
      );
    }
    snapshot = refreshed;
    dead = await checkAssets(snapshot.assets);
  }

  if (!dead.length) {
    if (snapshot.staleRoutes.length) {
      // 자산은 전부 살아 있는데 별칭이 아직 옛 세대의 HTML 을 주는 라우트가 남았다.
      // 자산 부재가 아니므로 실패시키지 않는다 — 롤백은 전환 구간을 하나 더 만들 뿐이다.
      console.log(`::warning::${MAX_ROUNDS}라운드 뒤에도 전환되지 않은 라우트가 있습니다: ${snapshot.staleRoutes.join(", ")} (자산 부재는 아닙니다)`);
      return;
    }
    console.log("[verify-deployed-assets] OK — 참조된 자산 전부 200(_next/static + 셸 /js·/styles·/css)");
    return;
  }

  const classified = await classify(dead);
  const poisoned = classified.filter((d) => d.edgePoisoned);
  // 🔴 "전파 지연" 으로 봐주는 것은 **방금 배포한 빌드에 그 파일이 실제로 있다고 증명될 때뿐**이다.
  // 기준 빌드가 없으면(수동 실행 등) 증명할 방법이 없으므로 종전대로 실패로 본다.
  const provenInBuild = (item) => Boolean(EXPECTED_DIR) && existsInBuild(item);
  // 🔴 부모가 옛 세대라서 보이는 자식은 빌드/업로드 문제가 아니다. 롤백해도 안 풀리고
  //    고칠 방법은 부모 퍼지뿐이라, 실패가 아니라 경고 + 퍼지로 처리한다.
  const staleParents = staleParentTargets(classified, snapshot.moduleParents);
  const staleChildren = new Set(staleParents.map((s) => s.child));
  const missing = classified.filter((d) => !d.edgePoisoned && !provenInBuild(d.path) && !staleChildren.has(d.path));
  const lagging = classified.filter((d) => !d.edgePoisoned && provenInBuild(d.path) && !staleChildren.has(d.path));

  report(classified.map((d) => {
    const tag = d.edgePoisoned
      ? "(엣지 캐시 오염 — 퍼지 필요)"
      : staleChildren.has(d.path) ? "(옛 세대 모듈이 참조 — 부모 퍼지 필요)"
      : provenInBuild(d.path) ? "(빌드에는 있음 — 전파 미완)" : "(오리진 부재 — 빌드/업로드 문제)";
    return `  - ${ORIGIN}${d.path}  bare=${d.status} bypass=${d.bypassStatus} ${tag}`;
  }));

  if (poisoned.length) {
    console.error(`::error::엣지에 404 가 캐시된 자산 ${poisoned.length}건 — 스스로 풀리지 않습니다(2일 TTL).`);
    console.error("::error::Cloudflare 대시보드에서 해당 URL 을 Custom Purge 하면 즉시 풀립니다.");
    // 🔴 'Bypass cache' 가 아니라 'No store' 다. Bypass cache 는 캐시 적격성 설정이라 200 까지
    // 캐시에서 빼 버린다. 여기서 원하는 건 404 만 저장 안 되게 하는 상태코드별 Edge TTL 이다.
    console.error("::error::근본 차단: Cache Rules 에서 URI Path prefix /_next/static/ 에 'Edge TTL → status code 404 → No store' 를 설정하세요 (API: edge_ttl.status_code_ttl [{status_code:404, value:-1}] — -1=no-store, 0=no-cache, 양수는 그 초만큼 404 를 캐시).");
  }
  if (missing.length) {
    console.error(`::error::배포본에 존재하지 않는 자산 ${missing.length}건 — 빌드/업로드 문제입니다.`);
  }

  if (staleParents.length) {
    console.error(`::warning::옛 세대 모듈 ${staleParents.length}건 — 엣지에 굳은 부모가 이미 지워진 자식을 참조합니다.`);
    report(staleParents.map((s) => `  - ${ORIGIN}${s.parent} → ${s.child} (${s.status})`));
    const purged = await purge(staleParents.map((s) => s.parent));
    console.error(
      purged.attempted && purged.ok
        ? "::warning::부모 URL 캐시를 퍼지했습니다. 다음 요청부터 새 모듈이 내려갑니다."
        : `::warning::퍼지 건너뜀 — ${purged.reason}. Cloudflare 대시보드에서 위 부모 URL 을 Custom Purge 하세요.`,
    );
  }

  if (poisoned.length || missing.length) process.exit(1);

  // 남은 건 "빌드에는 있는데 별칭이 아직 옛 배포본으로 응답하는" 것뿐이다. 롤백은 전환 구간을
  // 하나 더 만들 뿐 이 상태를 고치지 못하므로 실패시키지 않는다(artifact 모드가 실재를 증명했다).
  console.log(`::warning::전파 대기 ${MAX_ROUNDS}라운드 뒤에도 ${lagging.length}건이 별칭에서 404 입니다. 빌드에는 존재하므로 전환 지연으로 판단합니다.`);
}

main().catch((error) => {
  console.error(`::error::verify-deployed-assets 실행 실패: ${error?.stack || error}`);
  process.exit(1);
});
