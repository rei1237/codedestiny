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
/**
 * 정본 워크플로 밖에서 배포를 부르는 명령.
 *
 * 🔴 2026-08-20: `wrangler pages deploy`·`npm run deploy:safe`·`npm run deploy:staging` 을 추가했다.
 * 그 전에는 정규식에 없어서, 누구든 아무 워크플로에 `npm run deploy:safe` 를 넣어도 이 가드가
 * 통과했다 — "배포 경로는 하나" 라는 명제가 규약이 아니라 관습이었다는 뜻이다.
 */
const forbiddenWorkerCommands = /(?:wrangler\s+(?:pages\s+)?deploy\b|wrangler\s+versions\s+(?:upload|deploy)\b|npm\s+run\s+deploy:(?:cf:worker|worker|safe|staging|production)\b)/;

/**
 * 정본 워크플로를 `mode=production` 으로 깨울 수 있는 워크플로. 여기 없는 파일이 그렇게 하면
 * 프로덕션이 사람 손을 거치지 않고 나가는 경로가 하나 더 생긴다.
 *
 * 🔴 일일 운세 발행은 그 **유일한 자동화 예외**다. 사용자가 오늘 운세를 읽는 곳은 프로덕션이라
 * 컷오버 뒤에도 이것만은 자동으로 나가야 한다. 구현에서 우연히 흘러나오는 게 아니라 여기에
 * 명시적으로 선언한다.
 */
const productionDispatchAllowlist = new Set([".github/workflows/fortune-daily-publish.yml"]);
const productionDispatchCall = /gh\s+workflow\s+run[^\n]*cloudflare-pages-deploy\.yml/;

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
  assertWorkflowShape(await readRepoFile(canonicalWorkflow));
}

/**
 * 정본 워크플로의 형태 단언. 파일 읽기와 분리해 둔 이유는 self-test 때문이다 —
 * 합성 픽스처는 실제 파일과 닮지 않을 수 있으므로, self-test 는 **진짜 워크플로를 변형해서**
 * 각 단언이 실제로 트립하는지 증명한다.
 */
function assertWorkflowShape(workflow) {
  const triggers = deploymentTriggerBlock(workflow);

  assert(/(^|\r?\n)\s+workflow_dispatch:\s*(?:#.*)?(?:\r?\n|$)/m.test(triggers), `${canonicalWorkflow} must support manual dispatch.`);
  // 🔴 2026-08-20 컷오버로 push 의 **의미가 뒤집혔다.** 여전히 필수지만 이제 스테이징을 뜻한다.
  // 사라지면 머지가 스테이징에도 도달하지 못하고, 그 상태는 "배포가 조용히 안 된다"로만 드러난다.
  // (2026-08-11 에는 이 트리거가 프로덕션의 유일한 경로였다. 지금 프로덕션의 유일한 경로는
  //  workflow_dispatch 이며, 아래에서 그 사실을 별도로 강제한다.)
  assert(/^\s+push:/m.test(triggers), `${canonicalWorkflow} must run on push to main; that merge is the staging trigger.`);
  assert(/^\s+push:[\s\S]*?branches:\s*\[\s*main\s*\]/m.test(triggers), `${canonicalWorkflow} push trigger must be limited to the main branch.`);
  // PR 이벤트에서 배포하면 머지 전 코드가 프로덕션에 나간다. workflow_call 을 열면 아무
  // 워크플로나 릴리스를 부를 수 있게 된다. 둘 다 예외 없이 금지다.
  assert(!/^\s+(pull_request|workflow_call):/m.test(triggers), `${canonicalWorkflow} must not deploy on pull_request or workflow_call.`);
  // 🔴 2026-08-14: schedule 은 조건부 허용으로 바뀌었다(이전에는 전면 금지였다).
  //
  // 금지했던 이유는 "사람이 시작하지 않은 릴리스라 어느 커밋이 왜 나갔는지 모른다" 였는데,
  // 그 사이 정반대 방향의 사고가 더 잦았다 — concurrency 그룹이 대기 런을 취소해 **머지가
  // 배포로 이어지지 않는데 아무 신호도 없는** 경우가 최근 60런 중 8건이었다.
  //
  // 그래서 규칙을 없애는 대신 좁혔다. 스케줄 릴리스는 드리프트 게이트를 통과해야만 도달할 수
  // 있고, 게이트는 "프로덕션이 main HEAD 와 다른가"만 본다. 즉 나가는 커밋은 **항상 main
  // HEAD**이고 이유는 "push 릴리스가 실패했거나 취소됐다" 하나뿐이다. 어느 커밋이 왜 나갔는지
  // 모르는 상태가 아니다.
  //
  // 게이트 없이 schedule 만 남으면 원래 금지하려던 그 상황이 되므로 배선을 함께 강제한다.
  if (/^\s+schedule:/m.test(triggers)) {
    assert(/^\s{2}gate:/m.test(workflow), `${canonicalWorkflow} has a schedule trigger, so it must define the drift gate job.`);
    assert(/--check=drift/.test(workflow), `${canonicalWorkflow} gate must decide with the drift check, not deploy unconditionally.`);
    assert(/needs:\s*gate/.test(workflow), `${canonicalWorkflow} release job must depend on the drift gate.`);
    assert(/if:\s*needs\.gate\.outputs\.proceed\s*==\s*'true'/.test(workflow), `${canonicalWorkflow} release job must only run when the gate says production needs this commit.`);
  }
  assert(workflow.includes("npm run deploy:safe -- --ci --preview-only"), `${canonicalWorkflow} must offer a preview-only run.`);
  // Pages 와 Worker 가 같은 커밋인지 배포 후 런타임에서 대조한다.
  assert(workflow.includes("npm run verify:deployed-sha"), `${canonicalWorkflow} must verify the deployed SHA on both Pages and Worker.`);

  // 🔴 아래 검사들은 전부 **잡 스코프**다.
  //
  // 예전에는 `workflow.includes(...)` 로 파일 전체에서 문자열만 찾았다. 그러면 프로덕션 리터럴이
  // 죽은 잡에 남아 있고 살아 있는 잡이 엉뚱한 워커를 가리켜도 통과한다 — 통과하지만 아무것도
  // 지키지 않는, 가장 나쁜 종류의 가드다. 스테이징 잡이 생기면서 그 구멍이 하중을 받게 됐다.
  const release = jobBody(workflow, "release");
  const staging = jobBody(workflow, "staging");
  assert(release, `${canonicalWorkflow} must define the release job.`);
  assert(staging, `${canonicalWorkflow} must define the staging job.`);

  assert(
    release.includes("CF_WORKER_NAME: ${{ vars.CF_WORKER_NAME || 'code-destiny-web' }}"),
    `${canonicalWorkflow} release job must target the production Worker.`,
  );
  assert(
    /CF_STAGING_WORKER_NAME:\s*\$\{\{\s*vars\.CF_STAGING_WORKER_NAME\s*\|\|\s*'code-destiny-web-staging'\s*\}\}/.test(staging),
    `${canonicalWorkflow} staging job must target the staging Worker.`,
  );
  // 교차오염 — 한쪽 잡이 상대 타깃의 자원을 들고 있으면 안 된다.
  assert(
    !staging.includes("CD_PRODUCTION_ORIGIN"),
    `${canonicalWorkflow} staging job must not carry CD_PRODUCTION_ORIGIN; deploy-safe reads it first and would smoke production.`,
  );
  assert(
    !release.includes("CF_STAGING_WORKER_NAME"),
    `${canonicalWorkflow} release job must not carry staging Worker names.`,
  );

  // 배포 명령도 잡 스코프로 본다. 스테이징이 `deploy:safe -- --ci --yes` 의 변형이면 프로덕션
  // 스텝을 통째로 지워도 아래 검사가 통과한다 — 그래서 어휘적으로 다른 이름을 쓴다.
  assert(release.includes("npm run deploy:safe -- --ci --yes"), `${canonicalWorkflow} release job must use the integrated SHA release command.`);
  assert(staging.includes("npm run deploy:staging -- --ci --yes"), `${canonicalWorkflow} staging job must use the staging release command.`);
  assert(!staging.includes("npm run deploy:safe"), `${canonicalWorkflow} staging job must not invoke the production release command.`);

  // 🔴 프로덕션은 사람이 Run workflow 를 눌렀을 때만 나간다. 모드 문자열만 보면 표현식 오타
  // 하나가 push 를 프로덕션으로 흘려보내고, 그 실패는 조용하다.
  assert(
    /if:\s*env\.RELEASE_MODE\s*==\s*'production'\s*&&\s*github\.event_name\s*==\s*'workflow_dispatch'/.test(release),
    `${canonicalWorkflow} production deploy step must also require the workflow_dispatch event.`,
  );

  // 배포 대상은 "브랜치 팁"이 아니라 그 커밋이다. 하나라도 고정하지 않은 checkout 이 있으면
  // 릴리스 도중 들어온 새 커밋이 나갈 수 있다 — 그래서 존재가 아니라 **개수**를 대조한다.
  const checkouts = (workflow.match(/uses:\s*actions\/checkout@/g) || []).length;
  const pinnedRefs = (workflow.match(/ref:\s*\$\{\{\s*github\.sha\s*\}\}/g) || []).length;
  assert(checkouts > 0, `${canonicalWorkflow} must check out the repository.`);
  assert(
    pinnedRefs === checkouts,
    `${canonicalWorkflow} pins github.sha on ${pinnedRefs} of ${checkouts} checkouts; every deploy job must check out the exact commit.`,
  );
}

/**
 * 워크플로에서 잡 하나의 본문만 잘라낸다.
 * 🔴 개행을 정규화한다 — 이 레포는 `* text=auto` 라 Windows 체크아웃에서 CRLF 로 내려오고,
 *    그러면 경계 탐색이 조용히 빗나가 "잡을 못 찾았다"가 된다.
 */
function jobBody(workflow, jobName) {
  const text = String(workflow).replace(/\r\n/g, "\n");
  const start = text.indexOf(`\n  ${jobName}:\n`);
  if (start === -1) return "";
  const rest = text.slice(start + 1);
  const next = rest.search(/\n {2}[a-z][a-z0-9_-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next);
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
  const dispatchPaths = [];

  for (const file of workflowFiles) {
    const relativePath = `.github/workflows/${file}`;
    if (relativePath === canonicalWorkflow) continue;
    const contents = await readRepoFile(relativePath);
    if (forbiddenWorkerCommands.test(contents)) duplicatePaths.push(relativePath);
    // 두 번째 패스 — 배포 명령을 직접 부르지 않아도 정본 워크플로를 프로덕션 모드로 깨우면
    // 결과는 같다. 허용목록 밖에서 그러는 파일은 실패다.
    if (productionDispatchCall.test(contents) && !productionDispatchAllowlist.has(relativePath)) {
      dispatchPaths.push(relativePath);
    }
  }

  assert(duplicatePaths.length === 0, `Worker deploy commands found outside ${canonicalWorkflow}: ${duplicatePaths.join(", ")}`);
  assert(
    dispatchPaths.length === 0,
    `Workflows outside the allowlist dispatch ${canonicalWorkflow}: ${dispatchPaths.join(", ")}. 프로덕션 자동화 예외는 명시 선언된 것만 허용된다.`,
  );
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
  assert(/^\s+(pull_request|workflow_call):/m.test(deploymentTriggerBlock(prTriggered)), "pull request trigger fixture should be detected");

  // 게이트 없는 스케줄 배포는 여전히 막혀야 한다 — 그게 원래 이 규칙이 지키려던 것이다.
  const scheduleOnly = `on:\n  push:\n    branches: [main]\n  schedule:\n    - cron: "*/20 * * * *"\n  workflow_dispatch:\n\njobs:\n  release:\n    runs-on: ubuntu-latest\n`;
  const scheduleGated = `${scheduleOnly}    needs: gate\n    if: needs.gate.outputs.proceed == 'true'\n  gate:\n    steps:\n      - run: node x.js --check=drift\n`;
  const gateWired = (text) =>
    /^\s{2}gate:/m.test(text) && /--check=drift/.test(text) && /needs:\s*gate/.test(text) && /if:\s*needs\.gate\.outputs\.proceed\s*==\s*'true'/.test(text);
  assert(/^\s+schedule:/m.test(deploymentTriggerBlock(scheduleOnly)), "schedule fixture should be detected");
  assert(!gateWired(scheduleOnly), "a schedule trigger without the drift gate must be rejected");
  assert(gateWired(scheduleGated), "a schedule trigger wired to the drift gate must be accepted");

  assert(runsWranglerDeployDirectly("npx wrangler deploy --config worker/wrangler.toml"), "a raw worker deploy script should be detected");
  assert(runsWranglerDeployDirectly("npx wrangler versions upload --config worker/wrangler.toml"), "a raw versions upload script should be detected");
  assert(runsWranglerDeployDirectly("npx wrangler pages deploy dist --project-name codedestiny"), "a raw pages deploy script should be detected");
  assert(!runsWranglerDeployDirectly("npx wrangler deploy --config worker/wrangler.toml --dry-run"), "--dry-run uploads nothing and must stay allowed");
  assert(!runsWranglerDeployDirectly("node scripts/deploy-safe.mjs --stage=safe"), "the release pipeline must not be flagged");
  assert(!runsWranglerDeployDirectly("node scripts/with-utf8-console.mjs node scripts/deploy-worker.mjs"), "a gated script wrapper must not be flagged");

  runProductionDeployGuardSelfTest();

  console.log("[verify-worker-single-deploy-guard] self-test passed");
}

/**
 * 컷오버로 새로 생긴 단언들이 공허하지 않은지, **진짜 워크플로를 변형해** 증명한다.
 *
 * 🔴 이 절이 없으면 새 단언은 조용히 통과만 한다. 2026-08-20 이전의 워커 이름 검사가 정확히
 *    그 상태였다 — 파일 전체 부분문자열이라 잡이 어긋나도 통과했고, 아무도 몰랐다.
 */
async function runWorkflowShapeMutationTests() {
  const workflow = await readRepoFile(canonicalWorkflow);
  assertWorkflowShape(workflow); // 기준선: 지금 파일은 통과해야 한다.

  const mutations = [
    [
      "프로덕션 배포 스텝에서 이벤트 조건을 지우면 거부",
      (text) => text.replace(
        "if: env.RELEASE_MODE == 'production' && github.event_name == 'workflow_dispatch'",
        "if: env.RELEASE_MODE == 'production'",
      ),
    ],
    [
      // 🔴 들여쓰기 폭으로 잡을 가른다. 문자열 포함 검사로는 gate 잡의 같은 이름 줄(10칸 들여쓰기)에
      //    먼저 걸려 엉뚱한 곳을 변형한다. 잡 레벨 env 는 정확히 6칸이다.
      "스테이징 잡이 프로덕션 오리진을 들고 있으면 거부",
      (text) => text.replace(/\n {6}CD_STAGING_ORIGIN: /, "\n      CD_PRODUCTION_ORIGIN: https://code-destiny.com\n      CD_STAGING_ORIGIN: "),
    ],
    [
      "스테이징 잡이 프로덕션 배포 명령을 쓰면 거부",
      (text) => text.replace("npm run deploy:staging -- --ci --yes", "npm run deploy:safe -- --ci --yes"),
    ],
    [
      // 개행은 CRLF/LF 가 섞여 있으므로 정규식으로 받는다.
      "checkout 하나라도 github.sha 를 고정하지 않으면 거부",
      (text) => text.replace(/ {10}ref: \$\{\{ github\.sha \}\}\r?\n/, ""),
    ],
  ];

  for (const [label, mutate] of mutations) {
    const mutated = mutate(workflow);
    assert(mutated !== workflow, `mutation fixture did not change the workflow: ${label}`);
    let rejected = false;
    try {
      assertWorkflowShape(mutated);
    } catch {
      rejected = true;
    }
    assert(rejected, `assertion is vacuous — ${label}`);
  }

  console.log(`[verify-worker-single-deploy-guard] workflow shape mutations rejected (${mutations.length}).`);
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
    await runWorkflowShapeMutationTests();
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
