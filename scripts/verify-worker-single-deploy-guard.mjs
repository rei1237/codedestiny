#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runProductionDeployGuardSelfTest } from "./lib/production-deploy-guard.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalWorkflow = ".github/workflows/cloudflare-pages-deploy.yml";
/**
 * 브랜치 룰셋이 필수로 요구하는 체크 이름. pr-ci.yml 의 잡 이름과 **글자 그대로** 같아야 한다.
 *
 * 🔴 이 네 잡은 티어와 무관하게 **항상 실행**된다. 티어에 따라 건너뛰는 것은 잡이 아니라 그
 * 안의 스텝이다. 잡 자체를 if 로 막으면 룰셋이 보고를 못 받아 머지가 영영 막히기 때문이다.
 */
const REQUIRED_CHECK_NAMES = ["Risk tier", "Typecheck and lint", "Build Pages and Worker", "Critical checks"];
const forbiddenWorkerCommands = /(?:wrangler\s+deploy\b|wrangler\s+versions\s+upload|npm\s+run\s+deploy:cf:worker|npm\s+run\s+deploy:worker)/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deploymentTriggerBlock(workflow) {
  const match = workflow.match(/^on:\s*(?:\r?\n|$)/m);
  assert(match, `${canonicalWorkflow} must define a top-level on block.`);
  const rest = workflow.slice(match.index + match[0].length);
  const nextTopLevelKey = rest.search(/\r?\n[^\s#][^\r\n]*:/);
  return nextTopLevelKey === -1 ? rest : rest.slice(0, nextTopLevelKey);
}

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function verifyCanonicalWorkflow() {
  const workflow = await readRepoFile(canonicalWorkflow);
  const triggers = deploymentTriggerBlock(workflow);

  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?(?:\r?\n|$)/m.test(triggers), `${canonicalWorkflow} must support manual dispatch.`);
  // 🔴 2026-08-11: 배포 경로가 로컬 승격에서 PR 기반 CI/CD 로 바뀌었다. 이제 프로덕션은
  // "main 에 머지된 커밋"에서만 나가야 하므로 push 트리거는 필수다. 이 트리거가 사라지면
  // 머지해도 아무것도 배포되지 않고, 그 상태는 "배포가 조용히 안 된다"로만 드러난다.
  assert(/^\s+push:/m.test(triggers), `${canonicalWorkflow} must deploy on push to main; that merge is the only production trigger.`);
  assert(/^\s+push:[\s\S]*?branches:\s*\[\s*main\s*\]/m.test(triggers), `${canonicalWorkflow} push trigger must be limited to the main branch.`);
  // PR 이벤트에서 배포하면 머지 전 코드가 프로덕션에 나간다. 스케줄 배포는 사람이 시작하지
  // 않은 릴리스라 어느 커밋이 왜 나갔는지 아무도 모른다.
  assert(!/^\s+(pull_request|schedule|workflow_call):/m.test(triggers), `${canonicalWorkflow} must not deploy on pull_request, schedule, or workflow_call.`);
  assert(workflow.includes("CF_WORKER_NAME: ${{ vars.CF_WORKER_NAME || 'code-destiny-web' }}"), `${canonicalWorkflow} must target the configured Worker.`);
  assert(workflow.includes("npm run deploy:safe -- --ci --preview-only"), `${canonicalWorkflow} must offer a preview-only run.`);
  assert(workflow.includes("npm run deploy:safe -- --ci --yes"), `${canonicalWorkflow} must use the integrated SHA release command.`);
  // 배포 대상은 "브랜치 팁"이 아니라 머지된 그 커밋이다. checkout 이 ref 를 고정하지 않으면
  // 릴리스 도중 main 에 새 커밋이 들어왔을 때 다른 코드가 나간다.
  assert(/ref:\s*\$\{\{\s*github\.sha\s*\}\}/.test(workflow), `${canonicalWorkflow} must check out the exact github.sha.`);
  // Pages 와 Worker 가 같은 커밋인지 배포 후 런타임에서 대조한다.
  assert(workflow.includes("npm run verify:deployed-sha"), `${canonicalWorkflow} must verify the deployed SHA on both Pages and Worker.`);
}

/**
 * PR 관문이 살아 있는지. 이 워크플로가 사라지면 브랜치 룰셋의 필수 체크가 영원히 대기 상태가
 * 되거나(머지 불가), 룰셋도 함께 지워져 무검증 머지가 프로덕션까지 그대로 흘러간다.
 */
async function verifyPullRequestGate() {
  const prWorkflow = ".github/workflows/pr-ci.yml";
  const workflow = await readRepoFile(prWorkflow).catch(() => {
    throw new Error(`${prWorkflow} is missing; PR CI is the required gate before main.`);
  });
  const triggers = deploymentTriggerBlock(workflow);
  assert(/^\s+pull_request:/m.test(triggers), `${prWorkflow} must run on pull_request.`);
  assert(!/^\s+push:/m.test(triggers), `${prWorkflow} must not run on push; the same commit would be checked twice.`);
  for (const command of ["npm run typecheck", "npm run lint", "npm test", "npm run build:cf", "npm run build:worker"]) {
    assert(workflow.includes(command), `${prWorkflow} must run ${command}.`);
  }

  // 🔴 검사 강도는 변경 경로로 갈린다. 판정을 여기서 다시 쓰지 않고 정본 한 곳을 부른다.
  assert(
    workflow.includes("scripts/resolve-ci-tier.mjs"),
    `${prWorkflow} must resolve its tier with scripts/resolve-ci-tier.mjs, not an inline path list.`,
  );
  // 무거운 스텝은 티어 출력으로만 걸러야 한다. 이 표식이 사라지면 전부 항상 돌거나(느려짐)
  // 전부 안 돌게(무방비) 된다.
  assert(
    workflow.includes("needs.classify.outputs.runs_critical == 'true'"),
    `${prWorkflow} must gate the critical steps on the resolved tier.`,
  );
  assert(
    workflow.includes("needs.classify.outputs.runs_build == 'true'"),
    `${prWorkflow} must gate the build steps on the resolved tier.`,
  );

  // 🔴 잡 이름은 브랜치 룰셋의 필수 체크 이름이다. 바꾸면 룰셋이 영영 오지 않는 체크를
  // 기다리며 모든 PR 의 머지를 막는다. 이름을 바꿀 때는 룰셋도 함께 고쳐야 한다.
  for (const jobName of REQUIRED_CHECK_NAMES) {
    assert(workflow.includes(`name: ${jobName}`), `${prWorkflow} must keep the required check job named "${jobName}" (branch ruleset depends on it).`);
  }
}

async function verifyPackageAndDeployScript() {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const deployCommand = String(packageJson.scripts?.["deploy:safe"] || "");
  assert(deployCommand.includes("scripts/deploy-safe.mjs"), "deploy:safe must call scripts/deploy-safe.mjs.");
}

/**
 * 프로덕션에 쓰는 모든 경로가 **두 겹의 게이트**를 통과하는지.
 *
 * CI 에 배포 명령이 하나뿐이어도, 개발자가 로컬에서 `npm run deploy:cf:worker` 를 치면 워킹트리가
 * 그대로 프로덕션으로 나간다 — PR 도 CI 도 지문 대조도 스모크도 자동 롤백도 없이. 그게
 * "검증 안 된 코드가 프로덕션에 쌓이는" 실제 경로였으므로, 여기서 세 가지를 고정한다.
 *   1. package.json 스크립트가 wrangler 배포 명령을 직접 담지 않는다(전부 게이트된 .mjs 경유).
 *   2. 그 .mjs 들이 production-deploy-guard 를 계속 부른다(바깥 겹: CI 밖에서는 못 쓴다).
 *   3. 로컬 실행 경로가 --emergency 게이트를 계속 들고 있다(안쪽 겹: 비상구를 열었더라도
 *      지금 이 명령으로 프로덕션을 밀 작정인지 한 번 더 받는다).
 *
 * 겹이 둘인 이유는 막는 대상이 다르기 때문이다. 바깥은 "여기서 배포하면 안 된다"를 막고,
 * 안쪽은 "비상구를 연 김에 무심코 눌렀다"를 막는다. 한쪽만 남기면 나머지 사고가 다시 열린다.
 */
const guardedDeployScripts = ["scripts/deploy-safe.mjs", "scripts/deploy-worker.mjs", "scripts/deploy-pages.mjs"];
// deploy-safe 는 제외한다 — 그쪽은 자체 승격 확인 절차를 갖고 있어 --emergency 를 요구하지 않는다.
const gatedDeployScripts = ["scripts/deploy-worker.mjs", "scripts/deploy-pages.mjs"];

function runsWranglerDeployDirectly(command) {
  const text = String(command || "");
  // --dry-run 은 번들만 만들고 아무것도 올리지 않는다(build:worker 가 그것으로 크기를 잰다).
  if (/--dry-run\b/.test(text)) return false;
  return /wrangler\s+(?:pages\s+)?deploy\b|wrangler\s+versions\s+(?:upload|deploy)\b/.test(text);
}

async function verifyLocalDeployPathsAreGated() {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const ungated = Object.entries(packageJson.scripts || {})
    .filter(([, command]) => runsWranglerDeployDirectly(command))
    .map(([name]) => name);
  assert(
    ungated.length === 0,
    `package.json scripts must not call wrangler deploy/versions directly; route them through a gated script: ${ungated.join(", ")}`,
  );

  await readRepoFile("scripts/lib/production-deploy-guard.mjs").catch(() => {
    throw new Error("scripts/lib/production-deploy-guard.mjs is missing; local production deploys would be unguarded.");
  });

  // 바깥 겹 — CI 밖에서는 프로덕션에 쓰지 못한다.
  for (const file of guardedDeployScripts) {
    const contents = await readRepoFile(file);
    assert(
      contents.includes("assertProductionDeployIsCi"),
      `${file} must call assertProductionDeployIsCi so production deploys stay CI-only.`,
    );
  }

  // 안쪽 겹 — 비상구로 그 경계를 뚫고 들어온 로컬 실행에도 별도 확인을 요구한다.
  // 비상구를 여는 것과 지금 이 명령으로 프로덕션을 밀 작정인 것은 다른 결정이라 따로 받는다.
  for (const file of gatedDeployScripts) {
    const contents = await readRepoFile(file);
    assert(
      contents.includes('process.argv.includes("--emergency")'),
      `${file} must keep its --emergency gate so manual production deploys stay blocked by default.`,
    );
  }
}

async function verifyNoOtherWorkflowDeploys() {
  const workflowDir = path.join(repoRoot, ".github/workflows");
  const workflowFiles = (await readdir(workflowDir)).filter((file) => /\.(yml|yaml)$/i.test(file));
  const duplicatePaths = [];

  for (const file of workflowFiles) {
    const relativePath = `.github/workflows/${file}`;
    if (relativePath === canonicalWorkflow) continue;
    const contents = await readRepoFile(relativePath);
    if (forbiddenWorkerCommands.test(contents)) duplicatePaths.push(relativePath);
  }

  assert(duplicatePaths.length === 0, `Worker deploy commands found outside ${canonicalWorkflow}: ${duplicatePaths.join(", ")}`);
}

function runSelfTest() {
  const release = `on:\n  push:\n    branches: [main]\n  workflow_dispatch:\n    inputs:\n      mode:\n        type: choice\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const dispatchOnly = `on:\n  workflow_dispatch:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const pushAnyBranch = `on:\n  push:\n    branches: [main, develop]\n  workflow_dispatch:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;
  const prTriggered = `on:\n  pull_request:\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n`;

  const releaseTriggers = deploymentTriggerBlock(release);
  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?(?:\r?\n|$)/m.test(releaseTriggers), "release fixture must keep manual dispatch");
  assert(/^\s+push:/m.test(releaseTriggers), "release fixture must be push-triggered");
  assert(/^\s+push:[\s\S]*?branches:\s*\[\s*main\s*\]/m.test(releaseTriggers), "release fixture must limit push to main");
  assert(!/^\s+push:/m.test(deploymentTriggerBlock(dispatchOnly)), "dispatch-only fixture must be detected as missing the push trigger");
  assert(!/^\s+push:[\s\S]*?branches:\s*\[\s*main\s*\]/m.test(deploymentTriggerBlock(pushAnyBranch)), "a multi-branch push trigger must not satisfy the main-only rule");
  assert(/^\s+(pull_request|schedule|workflow_call):/m.test(deploymentTriggerBlock(prTriggered)), "pull request trigger fixture should be detected");

  assert(runsWranglerDeployDirectly("npx wrangler deploy --config worker/wrangler.toml"), "a raw worker deploy script should be detected");
  assert(runsWranglerDeployDirectly("npx wrangler versions upload --config worker/wrangler.toml"), "a raw versions upload script should be detected");
  assert(runsWranglerDeployDirectly("npx wrangler pages deploy dist --project-name codedestiny"), "a raw pages deploy script should be detected");
  assert(!runsWranglerDeployDirectly("npx wrangler deploy --config worker/wrangler.toml --dry-run"), "--dry-run uploads nothing and must stay allowed");
  assert(!runsWranglerDeployDirectly("node scripts/deploy-safe.mjs --stage=safe"), "the release pipeline must not be flagged");
  assert(!runsWranglerDeployDirectly("node scripts/with-utf8-console.mjs node scripts/deploy-worker.mjs"), "a gated script wrapper must not be flagged");

  runProductionDeployGuardSelfTest();

  console.log("[verify-worker-single-deploy-guard] self-test passed");
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyNoExternalWorkerBuildCheck() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  assert(eventPath && token && repository, "External Worker check guard requires GITHUB_EVENT_PATH, GITHUB_TOKEN, and GITHUB_REPOSITORY.");

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const shas = [...new Set([
    event.pull_request?.head?.sha,
    process.env.GITHUB_SHA,
  ].filter(Boolean))];
  assert(shas.length > 0, "External Worker check guard could not resolve a commit SHA.");

  const apiBase = `https://api.github.com/repos/${repository}`;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const found = [];
    for (const sha of shas) {
      const [checks, statuses] = await Promise.all([
        fetchJson(`${apiBase}/commits/${sha}/check-runs?per_page=100`, token),
        fetchJson(`${apiBase}/commits/${sha}/status`, token),
      ]);
      for (const check of checks.check_runs || []) {
        if (/^Workers Builds\s*:/i.test(String(check.name || ""))) found.push(`${check.name} (${sha.slice(0, 7)})`);
      }
      for (const status of statuses.statuses || []) {
        if (/^Workers Builds\s*:/i.test(String(status.context || ""))) found.push(`${status.context} (${sha.slice(0, 7)})`);
      }
    }
    if (found.length > 0) {
      throw new Error(`Cloudflare Workers Builds is still creating an external Worker check: ${[...new Set(found)].join(", ")}. Disconnect the Worker Git integration before merging.`);
    }
    if (attempt < 5) await sleep(5000);
  }

  console.log("[verify-worker-single-deploy-guard] PASS: no external Workers Builds check was found.");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  await verifyCanonicalWorkflow();
  await verifyPullRequestGate();
  await verifyPackageAndDeployScript();
  await verifyNoOtherWorkflowDeploys();
  await verifyLocalDeployPathsAreGated();
  console.log(`[verify-worker-single-deploy-guard] PASS: ${canonicalWorkflow} is the only repository Worker deploy path, and local production deploys stay CI-gated.`);

  // 예전에는 pull_request 이벤트에서만 돌았다. PR 을 폐기한 뒤 그 조건은 영원히 거짓이 되어
  // Cloudflare Worker Git 연동이 켜져도 아무도 몰랐을 것이다. 이제 push 에서도 확인한다.
  if (process.env.GITHUB_ACTIONS === "true" && ["pull_request", "push"].includes(String(process.env.GITHUB_EVENT_NAME))) {
    await verifyNoExternalWorkerBuildCheck();
  } else {
    console.log("[verify-worker-single-deploy-guard] external check lookup skipped outside CI push/pull_request events.");
  }
}

main().catch((error) => {
  console.error(`[verify-worker-single-deploy-guard] FAIL: ${error.message}`);
  process.exitCode = 1;
});
