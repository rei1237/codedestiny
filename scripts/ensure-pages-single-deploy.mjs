#!/usr/bin/env node
/**
 * Cloudflare Pages 프로젝트의 **프로덕션 Git 자동빌드가 꺼져 있는지** 확인하고,
 * 켜져 있으면 도로 끈다(자가치유). `--check` 를 주면 고치지 않고 보고만 한다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 이 프로젝트는 GitHub Actions 에서 `wrangler pages deploy`(deployment_trigger=ad_hoc)로
 * 배포한다. 그런데 Pages 의 GitHub 연동이 살아 있어, `production_deployments_enabled` 가
 * 켜지면 같은 커밋을 CF 가 **한 번 더** 빌드한다(trigger=github:push).
 * 두 빌드는 청크 파일명 해시가 서로 달라, 존이 두 파일셋 사이를 오가는 동안
 * 빌드 A 의 HTML 이 빌드 B 의 파일셋을 만나 `_next/static/*` 가 404 가 된다.
 * 그 404 에는 `Cache-Control: max-age=172800`(2일)이 붙어 엣지에 박히고, HTML 은 no-store 라
 * 새로고침해도 같은 죽은 URL 을 다시 요청한다 → 백지/무스타일 장애가 이틀간 지속된다.
 * (2026-07-06 껐는데 2026-07-22 스스로 true 로 돌아와 재발한 이력이 있다. 그래서 매 배포마다 본다.)
 *
 * 프리뷰 빌드(`deployments_enabled`)는 PR 체크에 쓰이므로 건드리지 않는다 —
 * 프로덕션 자동빌드만 끈다.
 *
 * ⚠️ PATCH 시 `source.config` 는 통째로 다시 보내야 한다(부분 전송하면 나머지 설정이 날아간다).
 */

const CHECK_ONLY = process.argv.includes("--check");
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const PROJECT = process.env.CF_PAGES_PROJECT_NAME || "codedestiny";

const API = "https://api.cloudflare.com/client/v4";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function cf(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success) {
    const detail = (json?.errors || []).map((e) => e.message).join(", ") || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json.result;
}

async function main() {
  if (!TOKEN || !ACCOUNT_ID) {
    // 로컬에서 토큰 없이 돌 수 있으므로 조용히 통과시킨다 — CI 에는 항상 있다.
    console.log("[ensure-pages-single-deploy] CLOUDFLARE_API_TOKEN/ACCOUNT_ID 없음 — 건너뜀");
    return;
  }

  let project;
  try {
    project = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  } catch (error) {
    // 배포 자체를 막을 만한 사안은 아니다(권한 축소 등). 눈에 띄게 남기고 통과.
    console.log(`::warning::[ensure-pages-single-deploy] 프로젝트 조회 실패 — ${error.message}`);
    return;
  }

  const source = project?.source;
  const config = source?.config;
  if (!config) {
    console.log("[ensure-pages-single-deploy] Git 연동 없음 — 이중 배포 위험 없음");
    return;
  }

  if (config.production_deployments_enabled !== true) {
    console.log("[ensure-pages-single-deploy] OK — 프로덕션 Git 자동빌드 꺼져 있음(단일 배포)");
    return;
  }

  const warning =
    "Cloudflare Pages 의 프로덕션 Git 자동빌드가 켜져 있습니다. " +
    "GitHub Actions 배포와 겹쳐 커밋당 프로덕션 배포가 2개 생기고, 서로 다른 청크 해시 때문에 " +
    "_next/static 404 가 엣지에 2일간 캐시되는 장애로 이어집니다.";

  if (CHECK_ONLY) {
    fail(`${warning} 끄려면: npm run ensure:pages-single-deploy`);
  }

  console.log(`::warning::${warning} 자동으로 끕니다.`);
  try {
    await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`, {
      method: "PATCH",
      // source.config 는 통째로 되돌려 보낸다 — 부분 전송하면 나머지 설정이 날아간다.
      body: JSON.stringify({ source: { ...source, config: { ...config, production_deployments_enabled: false } } }),
    });
  } catch (error) {
    fail(`프로덕션 Git 자동빌드를 끄지 못했습니다 — ${error.message}. 대시보드에서 수동으로 끄세요(Settings → Builds & deployments → Production branch → Automatic deployments).`);
  }

  const after = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  if (after?.source?.config?.production_deployments_enabled === true) {
    fail("PATCH 는 성공했는데 설정이 그대로입니다. 대시보드에서 직접 끄세요.");
  }
  console.log("[ensure-pages-single-deploy] 프로덕션 Git 자동빌드를 껐습니다(프리뷰 빌드는 유지).");
}

main().catch((error) => {
  console.error(`::error::ensure-pages-single-deploy 실행 실패: ${error?.stack || error}`);
  process.exit(1);
});
