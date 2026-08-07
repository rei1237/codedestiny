const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const deploySafe = fs.readFileSync(path.join(root, "scripts/deploy-safe.mjs"), "utf8");
const verifier = fs.readFileSync(path.join(root, "scripts/verify-deployed-assets.mjs"), "utf8");

function promoteBody() {
  const start = deploySafe.indexOf("async function promote(");
  const end = deploySafe.indexOf("async function productionStage(");
  assert.ok(start > 0 && end > start, "promote() 범위를 찾지 못했습니다");
  return deploySafe.slice(start, end);
}

// 🔴 릴리스가 배포마다 무작위로 실패하던 원인의 회귀 가드.
//
// 프로덕션 별칭(code-destiny.com)은 배포 전환 중에 **두 세대를 동시에 서빙한다.** HTML 은 새
// 배포본에서, 자산은 옛 배포본에서 오는 요청이 섞이면 빌드 간 해시가 바뀐 청크만 404 로 내려온다.
// 그 404 를 실패로 처리하던 것이 2026-08-07~08 릴리스가 15회 중 11회 실패한 이유였다
// (`wrangler pages deploy` 는 매번 `Uploaded 0 files (3279 already uploaded)` 로 전부 업로드됨을 보고했다).
//
// 그래서 판정 지점을 **결정적인 곳**으로 옮긴다: 배포 고유 URL 은 하나의 불변 배포본만 서빙하므로
// 거기서의 404 만이 진짜 산출물 문제다. 순서는 다음으로 고정한다:
//   Pages 프로덕션 배포 → 배포본 완전성(artifact) → 별칭 전환 확인(alias) → 브라우저 스모크
test("promote verifies the immutable deployment before it looks at the production alias", () => {
  assert.match(deploySafe, /function verifyDeployedArtifact\(value, deploymentUrl\)/);
  assert.match(deploySafe, /function awaitProductionAssets\(value, base\)/);
  assert.match(deploySafe, /verify-deployed-assets\.mjs/);

  // 두 호출이 서로 다른 오리진·모드를 주입한다(기본값에 기대지 않는다).
  assert.match(deploySafe, /CD_DEPLOY_VERIFY_ORIGIN: deploymentUrl/);
  assert.match(deploySafe, /CD_DEPLOY_ASSETS_MODE: "artifact"/);
  assert.match(deploySafe, /CD_DEPLOY_VERIFY_ORIGIN: base/);
  assert.match(deploySafe, /CD_DEPLOY_ASSETS_MODE: "alias"/);
  // 세대 판별의 유일한 근거 — 방금 배포한 로컬 빌드를 넘긴다.
  assert.match(deploySafe, /CD_DEPLOY_EXPECTED_DIR: path\.join\(root, value\.cf\.pages\.outputDir\)/);

  const body = promoteBody();
  const artifactIndex = body.indexOf("verifyDeployedArtifact(value, pages.url)");
  const aliasIndex = body.indexOf("awaitProductionAssets(value, productionOrigin(value))");
  const smokeIndex = body.indexOf("await postDeployHealth(value)");
  assert.ok(artifactIndex > 0, "promote() 가 배포본 완전성 검사를 호출하지 않습니다");
  assert.ok(aliasIndex > 0, "promote() 가 별칭 전환 확인을 호출하지 않습니다");
  assert.ok(smokeIndex > 0, "promote() 가 프로덕션 스모크를 호출하지 않습니다");
  assert.ok(artifactIndex < aliasIndex, "배포본 완전성 검사가 별칭 확인보다 먼저여야 합니다");
  assert.ok(aliasIndex < smokeIndex, "별칭 확인이 프로덕션 스모크보다 먼저여야 합니다");
});

// 🔴 별칭 전환 지연으로 릴리스를 되돌리지 않는다.
//
// 롤백은 프로덕션 배포본을 또 한 번 바꾸는 행위라 **전환 구간을 하나 더 만든다.** 그래서 다음
// 릴리스가 같은 이유로 실패한다 — 실제로 어떤 실행의 Pages 롤백 대상이 직전 실패 실행이 만든
// 배포본이었다. 엣지 캐시 404 도 롤백으로는 안 풀린다(내용이 같으면 해시가 같아 같은 URL 이다).
test("a lagging production alias never triggers a rollback", () => {
  const start = deploySafe.indexOf("function awaitProductionAssets(");
  const end = deploySafe.indexOf("function productionOrigin(");
  assert.ok(start > 0 && end > start, "awaitProductionAssets() 범위를 찾지 못했습니다");
  const waitBody = deploySafe.slice(start, end);

  // 실패를 삼키고 로그만 남긴다. rethrow 하면 promote() 의 catch 가 돌아 롤백이 시작된다.
  assert.match(waitBody, /catch \(error\)/);
  assert.doesNotMatch(waitBody, /throw /);

  // 배포본 완전성 검사는 반대로 던져야 한다(진짜 산출물 문제는 롤백이 옳다).
  const artifactStart = deploySafe.indexOf("function verifyDeployedArtifact(");
  const artifactEnd = deploySafe.indexOf("function awaitProductionAssets(");
  assert.doesNotMatch(deploySafe.slice(artifactStart, artifactEnd), /catch \(/);

  // postDeployHealth 가 자산 검사를 다시 돌리면 그 실패가 그대로 롤백을 부른다.
  const healthStart = deploySafe.indexOf("async function postDeployHealth(");
  const healthEnd = deploySafe.indexOf("async function checkStage(");
  assert.doesNotMatch(deploySafe.slice(healthStart, healthEnd), /verify-deployed-assets\.mjs/);
});

// 🔴 릴리스가 실패하면 Pages 와 Worker 는 **함께** 되돌아가야 한다.
//
// 예전에는 Worker 만 자동 롤백하고 Pages 는 롤백 대상 ID 만 출력했다. 그래서 실패한 릴리스마다
// 프로덕션이 '새 클라이언트 + 옛 워커' 로 어긋난 채 남았고, 실패가 반복되며 어긋남이 누적됐다.
test("a failed release rolls back Pages together with the Worker", () => {
  const body = promoteBody();

  // Pages 승격 여부를 추적하고, 실패 경로에서 실제로 롤백을 호출한다.
  assert.match(body, /pagesPromoted = true;/);
  assert.match(body, /await rollbackPagesDeployment\(value\.cf\.project, oldPages\.id\)/);

  // 롤백 순서는 승격의 역순(Pages → Worker)이어야 한다.
  const pagesRollbackIndex = body.indexOf("await rollbackPagesDeployment(");
  const workerRollbackIndex = body.indexOf('capture("automatic Worker rollback"');
  assert.ok(pagesRollbackIndex > 0, "Pages 자동 롤백이 없습니다");
  assert.ok(workerRollbackIndex > 0, "Worker 자동 롤백이 없습니다");
  assert.ok(
    pagesRollbackIndex < workerRollbackIndex,
    "Pages 를 Worker 보다 먼저 되돌려야 합니다('새 클라이언트 + 옛 워커' 구간을 만들지 않기 위해)",
  );

  // 한쪽만 되돌아간 상태는 조용히 지나가면 안 된다.
  assert.match(body, /세대 불일치/);

  // 수동 안내로 되돌아가지 않았는지 고정한다(예전 동작).
  assert.doesNotMatch(
    body,
    /Pages rollback target=" \+ oldPages\.id \+ "; run deploy:rollback -- --yes after confirmation\./,
  );
});

// 🔴 무르게 한 것은 "전환 지연" 하나뿐이다. 나머지 두 가지는 여전히 실패한다.
test("the verifier still fails on a real missing asset and on edge-cached 404s", () => {
  assert.match(verifier, /MAX_ROUNDS/);
  assert.match(verifier, /process\.exit\(1\)/);
  // run() 은 종료코드가 0 이 아니면 throw 하므로, artifact 검사의 실패가 그대로 릴리스 실패로 이어진다.
  assert.match(deploySafe, /if \(result\.status !== 0\) throw new Error\(label \+ " failed with exit "/);

  // 엣지 캐시 오염(bypass=200)과 배포본 부재는 함께 exit 1 로 간다.
  assert.match(verifier, /if \(poisoned\.length \|\| missing\.length\) process\.exit\(1\)/);

  // 🔴 "전파 지연" 으로 봐주는 조건은 로컬 빌드에 파일이 실제로 있다고 증명될 때뿐이다.
  // 기준 빌드가 없으면 증명할 수 없으므로 종전대로 실패해야 한다.
  assert.match(verifier, /const provenInBuild = \(item\) => Boolean\(EXPECTED_DIR\) && existsInBuild\(item\)/);
  assert.match(verifier, /const missing = classified\.filter\(\(d\) => !d\.edgePoisoned && !provenInBuild\(d\.path\)\)/);

  // artifact 모드는 불변 URL 이라 세대 게이트를 걸지 않는다(걸면 진짜 결함을 놓친다).
  assert.match(verifier, /EXPECTED_DIR && MODE === "alias"/);
});
