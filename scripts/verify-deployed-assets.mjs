#!/usr/bin/env node
/**
 * 배포 직후, 프로덕션 호스트가 실제로 내려주는 HTML 이 참조하는 `_next/static` 자산이
 * 전부 200 인지 확인한다. 하나라도 죽어 있으면 배포 잡을 실패시킨다.
 *
 * ── 왜 필요한가 (2026-07-30 사고) ────────────────────────────────────────────
 * Pages 배포 전환 틈새에, 새 HTML 이 참조하는 자산을 아직 옛 배포를 가리키는 엣지 PoP 가
 * 받으면 404 가 난다. 그 404 응답에는 Cloudflare 가 `Cache-Control: max-age=172800`(2일)을
 * 붙이므로 **오리진에 파일이 멀쩡해도 그 URL 만 이틀간 죽는다**. HTML 은 `no-store` 라
 * 새로고침해도 같은 죽은 URL 을 다시 요청한다 → 사용자 입장에선 영구 장애.
 * 실제로 `styles/globals.css` 산출물(React 전 라우트의 메인 스타일시트) 하나가 이렇게 죽어
 * /points·/me·/login 이 전부 무스타일로 떴다. 롤백해도 내용이 같으면 해시가 같아 안 고쳐진다.
 *
 * 이 검사는 그 상태를 **배포 시점에 즉시 드러내는 것**이 목적이다. 사용자 신고로 발견되기까지
 * 걸린 시간이 곧 장애 시간이었다.
 *
 * ── 판정 ─────────────────────────────────────────────────────────────────
 *  - bare 404 + `?cdcb=` 200  → 엣지에 캐시된 404(오리진은 정상). 퍼지 자격이 있으면 퍼지 후 재확인.
 *  - bare 404 + `?cdcb=` 404  → 진짜 산출물 누락. 빌드/업로드 문제이므로 즉시 실패.
 *
 * ── 퍼지 자격 ────────────────────────────────────────────────────────────
 * `CLOUDFLARE_CACHE_PURGE_TOKEN` + `CLOUDFLARE_ZONE_ID` 가 있으면 죽은 URL 만 골라 퍼지한다.
 * 없으면 퍼지를 건너뛰고 실패로 보고한다(대시보드에서 수동 퍼지 필요).
 * ⚠️ 기존 `CLOUDFLARE_API_TOKEN` 에는 Zone Cache Purge 권한이 없다(실측: Authentication error).
 */

const ORIGIN = (process.env.CD_DEPLOY_VERIFY_ORIGIN || "https://code-destiny.com").replace(/\/+$/, "");
const PURGE_TOKEN = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN || "";
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "";

/**
 * 대표 라우트. 공용 청크(layout·globals.css)는 어느 React 라우트에서든 잡히지만,
 * 라우트 전용 청크까지 보려면 성격이 다른 화면을 섞어야 한다.
 * `/` 는 정적 셸이라 `_next` 를 참조하지 않지만, 셸이 살아있는지 확인하는 의미로 둔다.
 */
const ROUTES = ["/", "/points/", "/me/", "/login/", "/music/", "/stories/"];

const MAX_ROUNDS = 4;
const ROUND_DELAY_MS = 20_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" }, redirect: "follow" });
  return { status: res.status, body: res.ok ? await res.text() : "" };
}

async function statusOf(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    return res.status;
  } catch (error) {
    return `ERR:${error?.message || "unknown"}`;
  }
}

async function collectAssetUrls() {
  const found = new Set();
  const routeFailures = [];
  for (const route of ROUTES) {
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
    for (const match of res.body.matchAll(/\/_next\/static\/[^"'\s>]+?\.(?:css|js)/g)) {
      found.add(match[0]);
    }
  }
  return { assets: [...found].sort(), routeFailures };
}

async function checkAssets(assets) {
  const dead = [];
  for (const path of assets) {
    const status = await statusOf(`${ORIGIN}${path}`);
    if (status !== 200) dead.push({ path, status });
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

async function purge(paths) {
  if (!PURGE_TOKEN || !ZONE_ID) return { attempted: false, ok: false, reason: "퍼지 자격 없음(CLOUDFLARE_CACHE_PURGE_TOKEN/CLOUDFLARE_ZONE_ID 미설정)" };
  const files = paths.map((p) => `${ORIGIN}${p}`);
  // Cloudflare 는 호출당 최대 30 URL 을 받는다.
  for (let i = 0; i < files.length; i += 30) {
    const batch = files.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
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
  console.log(`[verify-deployed-assets] 대상 오리진: ${ORIGIN}`);

  const { assets, routeFailures } = await collectAssetUrls();
  if (routeFailures.length) {
    console.log("[verify-deployed-assets] 라우트 응답 이상:");
    report(routeFailures.map((l) => `  - ${l}`));
  }
  if (!assets.length) {
    console.error("::error::배포된 HTML 에서 _next/static 자산을 하나도 찾지 못했습니다. 라우트 응답을 확인하세요.");
    process.exit(1);
  }
  console.log(`[verify-deployed-assets] 검사 대상 ${assets.length}개`);

  let dead = await checkAssets(assets);

  for (let round = 1; dead.length && round < MAX_ROUNDS; round += 1) {
    const classified = await classify(dead);
    const poisoned = classified.filter((d) => d.edgePoisoned);
    const missing = classified.filter((d) => !d.edgePoisoned);

    if (missing.length) {
      console.error("::error::오리진에도 없는 자산이 있습니다(빌드/업로드 문제):");
      report(missing.map((d) => `  - ${d.path} (bare=${d.status}, bypass=${d.bypassStatus})`));
      process.exit(1);
    }

    console.log(`[verify-deployed-assets] round ${round}: 엣지 캐시 404 ${poisoned.length}건 — ${poisoned.map((d) => d.path).join(", ")}`);
    const purged = await purge(poisoned.map((d) => d.path));
    if (purged.attempted && purged.ok) console.log("[verify-deployed-assets] 해당 URL 캐시 퍼지 완료");
    else console.log(`[verify-deployed-assets] 퍼지 건너뜀 — ${purged.reason}`);

    await sleep(ROUND_DELAY_MS);
    dead = await checkAssets(assets);
  }

  if (!dead.length) {
    console.log("[verify-deployed-assets] OK — 참조된 _next/static 자산 전부 200");
    return;
  }

  const classified = await classify(dead);
  console.error("::error::배포 후에도 죽어 있는 자산이 있습니다. 엣지에 404 가 캐시된 상태로, Cloudflare 대시보드에서 해당 URL 을 Custom Purge 해야 합니다.");
  report(classified.map((d) => `  - ${ORIGIN}${d.path}  bare=${d.status} bypass=${d.bypassStatus} ${d.edgePoisoned ? "(엣지 캐시 오염)" : "(오리진 부재)"}`));
  console.error("::error::재발 방지 권장: Cloudflare Cache Rules 에서 URI Path prefix /_next/static/ 에 대해 'Edge TTL - by status code - 404: Bypass cache' 를 설정하면 이 404 가 애초에 캐시되지 않습니다.");
  process.exit(1);
}

main().catch((error) => {
  console.error(`::error::verify-deployed-assets 실행 실패: ${error?.stack || error}`);
  process.exit(1);
});
