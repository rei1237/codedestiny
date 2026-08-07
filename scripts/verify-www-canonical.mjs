#!/usr/bin/env node
/**
 * www → apex 정규화 **실측** 가드.
 *
 * 2026-07-30, `https://www.code-destiny.com` 이 전 경로 522 였다. www DNS 는 프록시되지만
 * 그 호스트를 받아줄 Cloudflare 서비스가 없어(Pages 커스텀 도메인 미등록 + Worker route 없음)
 * 엣지가 오리진 연결을 시도하고 실패한 것이다. www 로 들어온 방문자에게는 사이트가 통째로
 * 죽어 보였다.
 *
 * 🔴 이 문제는 리포지토리로 고칠 수 없다:
 *   - `middleware.ts` 에 www→apex 리다이렉트가 있지만 `next.config.mjs` 의 `output: "export"`
 *     때문에 프로덕션 산출물에 포함되지 않는다(next dev 전용).
 *   - Pages `_redirects` 는 경로 전용이라 호스트 매칭이 불가능하다.
 *   - `public/_routes.json` 이 `_worker.js` 를 /api/* 등 3개 패턴으로 제한해 페이지 요청에
 *     실행되지 않는다.
 * ⇒ 정본은 **Cloudflare Redirect Rule**(zone code-destiny.com, 룰 이름 `www to apex canonical`,
 *    expression `http.host eq "www.code-destiny.com"`, dynamic
 *    `concat("https://code-destiny.com", http.request.uri)`, 301, preserve-query OFF).
 *
 * 대시보드 설정은 커밋되지 않으므로 누가 룰을 지우면 조용히 522 로 되돌아간다. 이 스크립트가
 * 그 회귀를 잡는 유일한 장치다.
 *
 * 🔴 배포 게이트에 넣지 않는다 — 빌드 산출물이 아니라 인프라 설정을 보는 라이브 네트워크 검사라,
 *    일시적 네트워크 오류가 무관한 배포를 막게 된다. 예전에는 canonical-host-check.yml 이 하루 1회
 *    돌렸지만 2026-08-08 CI 게이트 정리에서 그 워크플로를 없앴다. 지금은 수동 실행 전용이다.
 *
 * 실행:
 *   node scripts/verify-www-canonical.mjs
 *   node scripts/verify-www-canonical.mjs --json
 *   node scripts/verify-www-canonical.mjs --apex code-destiny.com --www www.code-destiny.com
 */

const args = process.argv.slice(2);

function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const apexHost = String(arg("apex", "code-destiny.com")).replace(/^https?:\/\//, "").replace(/\/$/, "");
const wwwHost = String(arg("www", `www.${apexHost}`)).replace(/^https?:\/\//, "").replace(/\/$/, "");
const timeoutMs = Number(arg("timeout", "20000"));
const asJson = args.includes("--json");

const apexOrigin = `https://${apexHost}`;

/** 리다이렉트를 따라가지 않고 첫 응답만 본다 — Location 원문을 그대로 검사해야 한다. */
async function head(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    return { ok: true, status: response.status, location: response.headers.get("location") || "" };
  } catch (error) {
    // 네트워크 실패와 "규칙이 잘못됨"은 원인이 완전히 달라 메시지를 구분한다.
    const reason = error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(error?.message || error);
    return { ok: false, status: 0, location: "", reason };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
}

async function main() {
  // 1) 루트: 301 + apex 로 Location
  const root = await head(`https://${wwwHost}/`);
  if (!root.ok) {
    record("www root reachable", false, `요청 자체가 실패했다: ${root.reason}`);
  } else if (root.status === 522) {
    record(
      "www root redirects",
      false,
      "522 — Redirect Rule 이 없다(또는 지워졌다). www DNS 가 프록시되지만 받아줄 서비스가 없는 상태다. "
        + "Cloudflare → Rules → Redirect Rules 에서 `www to apex canonical` 룰을 확인할 것.",
    );
  } else if (root.status !== 301) {
    record("www root redirects", false, `301 을 기대했는데 ${root.status} 였다 (Location: ${root.location || "없음"})`);
  } else if (root.location !== `${apexOrigin}/`) {
    record("www root redirects", false, `Location 이 ${apexOrigin}/ 이어야 하는데 ${root.location} 였다`);
  } else {
    record("www root redirects", true, `301 → ${root.location}`);
  }

  // 2) 경로 + 쿼리 보존. preserve-query 를 켜둔 채 http.request.uri 를 쓰면 ?a=b?a=b 로 중복되는데,
  //    루트만 검사하면 그 실수를 못 잡는다.
  const deep = await head(`https://${wwwHost}/insights/?a=b`);
  const expectedDeep = `${apexOrigin}/insights/?a=b`;
  if (!deep.ok) {
    record("path+query preserved", false, `요청 자체가 실패했다: ${deep.reason}`);
  } else if (deep.status !== 301) {
    record("path+query preserved", false, `301 을 기대했는데 ${deep.status} 였다`);
  } else if (deep.location !== expectedDeep) {
    const doubled = /\?[^?]*\?/.test(deep.location);
    record(
      "path+query preserved",
      false,
      doubled
        ? `쿼리스트링이 중복됐다(${deep.location}) — Redirect Rule 의 "Preserve query string" 을 끌 것 `
          + "(http.request.uri 에 이미 쿼리가 포함돼 있다)"
        : `Location 이 ${expectedDeep} 이어야 하는데 ${deep.location} 였다`,
    );
  } else {
    record("path+query preserved", true, `301 → ${deep.location}`);
  }

  // 3) apex 회귀 없음 — 룰을 잘못 걸면 apex 가 자기 자신으로 무한 리다이렉트할 수 있다.
  const apex = await head(`${apexOrigin}/`);
  if (!apex.ok) {
    record("apex still serves", false, `요청 자체가 실패했다: ${apex.reason}`);
  } else if (apex.status !== 200) {
    record("apex still serves", false, `200 을 기대했는데 ${apex.status} 였다 (Location: ${apex.location || "없음"})`);
  } else {
    record("apex still serves", true, "200");
  }

  const failed = results.filter((r) => !r.passed);

  if (asJson) {
    console.log(JSON.stringify({ ok: failed.length === 0, apexHost, wwwHost, results }, null, 2));
  } else {
    console.log(`[verify-www-canonical] ${wwwHost} → ${apexOrigin}`);
    for (const r of results) {
      console.log(`  ${r.passed ? "OK  " : "FAIL"} ${r.name} — ${r.detail}`);
    }
    console.log(failed.length === 0 ? "[verify-www-canonical] PASS" : `[verify-www-canonical] FAIL (${failed.length})`);
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("[verify-www-canonical] 예기치 못한 오류:", error);
  process.exit(1);
});
