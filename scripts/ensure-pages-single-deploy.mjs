#!/usr/bin/env node
/**
 * Cloudflare Pages 프로젝트의 **Git 자동빌드가 꺼져 있는지** 확인하고,
 * 켜져 있으면 도로 끈다(자가치유). `--check` 를 주면 고치지 않고 보고만 한다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 이 프로젝트는 GitHub Actions 에서 `wrangler pages deploy`(deployment_trigger=ad_hoc)로
 * 배포한다. 그런데 Pages 의 GitHub 연동이 살아 있으면 같은 커밋이나 PR 브랜치를 CF 가
 * 다시 빌드한다(trigger=github:push / github:pull_request).
 *
 * 프로덕션 자동빌드는 GitHub Actions 배포와 겹쳐 커밋당 프로덕션 배포가 2개 생기고,
 * 서로 다른 청크 해시 때문에 `_next/static/*` 404 가 엣지에 2일간 캐시되는 장애로 이어진다.
 *
 * 프리뷰 자동빌드는 PR 체크에는 보이지만, 이 저장소의 검증은 GitHub Actions gate가 담당한다.
 * Cloudflare Pages preview build가 대기/고착되면 PR이 `Building` 상태로 오래 묶이므로,
 * preview도 자동 Git 빌드 대상에서 제외하고 수동/Actions 배포만 단일 경로로 유지한다.
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

function isPreviewAutoDeployEnabled(config) {
  return String(config?.preview_deployment_setting || "all").toLowerCase() !== "none";
}

function describeEnabledGitDeployments(config) {
  const enabled = [];
  if (config?.production_deployments_enabled === true) enabled.push("production");
  if (isPreviewAutoDeployEnabled(config)) enabled.push("preview");
  if (config?.deployments_enabled === true) enabled.push("legacy deployments_enabled");
  return enabled;
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

  const enabledGitDeployments = describeEnabledGitDeployments(config);
  if (enabledGitDeployments.length === 0) {
    console.log("[ensure-pages-single-deploy] OK — Cloudflare Pages Git 자동빌드 꺼져 있음(단일 배포)");
    return;
  }

  const warning =
    `Cloudflare Pages Git 자동빌드가 켜져 있습니다(${enabledGitDeployments.join(", ")}). ` +
    "이 프로젝트는 GitHub Actions 단일 배포 경로를 사용하므로 Pages Git 자동빌드는 끕니다.";

  if (CHECK_ONLY) {
    fail(`${warning} 끄려면: npm run ensure:pages-single-deploy`);
  }

  console.log(`::warning::${warning} 자동으로 끕니다.`);
  try {
    await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`, {
      method: "PATCH",
      // source.config 는 통째로 되돌려 보낸다 — 부분 전송하면 나머지 설정이 날아간다.
      body: JSON.stringify({
        source: {
          ...source,
          config: {
            ...config,
            deployments_enabled: false,
            production_deployments_enabled: false,
            preview_deployment_setting: "none",
          },
        },
      }),
    });
  } catch (error) {
    fail(`Cloudflare Pages Git 자동빌드를 끄지 못했습니다 — ${error.message}. 대시보드에서 수동으로 끄세요(Settings → Builds & deployments → Automatic deployments / Preview deployments).`);
  }

  const after = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  const stillEnabled = describeEnabledGitDeployments(after?.source?.config);
  if (stillEnabled.length > 0) {
    fail(`PATCH 는 성공했는데 설정이 그대로입니다(${stillEnabled.join(", ")}). 대시보드에서 직접 끄세요.`);
  }
  console.log("[ensure-pages-single-deploy] Cloudflare Pages Git 자동빌드를 껐습니다(프로덕션/프리뷰 모두 수동·Actions 배포만 사용).");
}

main().catch((error) => {
  console.error(`::error::ensure-pages-single-deploy 실행 실패: ${error?.stack || error}`);
  process.exit(1);
});
