const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const deploySafe = fs.readFileSync(path.join(root, "scripts/deploy-safe.mjs"), "utf8");
const verifier = fs.readFileSync(path.join(root, "scripts/verify-deployed-assets.mjs"), "utf8");
const smoke = fs.readFileSync(path.join(root, "scripts/deploy-smoke.mjs"), "utf8");

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
  const aliasIndex = body.indexOf("awaitProductionAssets(value, targetOrigin(value))");
  const smokeIndex = body.indexOf("await postDeployHealth(value, workerPromoted)");
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
  const end = deploySafe.indexOf("function targetOrigin(");
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

// 🔴 워커 승격 여부는 preview 가 기록한 상태로 판단한다. promote() 에서 다시 계산하면 안 된다.
//
// needsWorker 는 변경 파일 집합에서 나오는데 그 집합은 origin/main 기준이라, preview 이후 push
// 만으로도 줄어든다. 2026-08-08 에 실제로 그렇게 나갔다 — preview 는 워커 버전을 올려 뒀는데
// 승격 시점에는 변경 집합이 2개(테스트 파일·version.json)로 줄어 needsWorker=false 가 됐고,
// 워커 승격과 Pages/Worker 패리티 검사가 **둘 다** 조용히 생략됐다. 프로덕션은 Pages 12a969bca +
// Worker 4583e3bb4fff 로 어긋난 채 "health check passed" 를 찍었고, 보안 수정은 라이브가 아니었다.
test("worker promotion is decided by the recorded preview, not recomputed at promote time", () => {
  const body = promoteBody();

  assert.match(body, /const shouldPromoteWorker = Boolean\(state\.worker\?\.versionId\)/);
  assert.match(body, /if \(shouldPromoteWorker\) \{/);

  // 롤백 대상(옛 워커 버전)도 같은 판단을 써야 한다. 다르면 되돌릴 대상이 비어 버린다.
  assert.match(body, /const oldWorker = shouldPromoteWorker \? await workerActive\(value\.cf\) : null/);

  // promote() 안에서 needsWorker 를 다시 읽지 않는다.
  assert.doesNotMatch(body, /value\.needsWorker/);

  // 패리티 검사도 "실제로 승격했는가" 로 걸어야 한다. 변경 집합으로 걸면 함께 생략된다.
  const healthStart = deploySafe.indexOf("async function postDeployHealth(");
  const healthEnd = deploySafe.indexOf("async function checkStage(");
  const healthBody = deploySafe.slice(healthStart, healthEnd);
  assert.match(healthBody, /async function postDeployHealth\(value, workerPromoted\)/);
  assert.match(healthBody, /if \(workerPromoted\) run\("Pages\/Worker commit parity"/);
  assert.doesNotMatch(healthBody, /value\.needsWorker/);
  assert.match(body, /await postDeployHealth\(value, workerPromoted\)/);
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
  assert.match(
    verifier,
    /const missing = classified\.filter\(\(d\) => !d\.edgePoisoned && !provenInBuild\(d\.path\) && !staleChildren\.has\(d\.path\)\)/,
  );

  // 🔴 두 번째 완화(2026-08-24) — 모듈 그래프에서 찾은 자식이 빌드에 없으면 그건 부모가 옛
  //    세대라는 뜻이라 실패가 아니라 부모 퍼지로 처리한다. 그 완화가 **딱 그 집합에만** 걸리는지
  //    고정한다. 넓어지면 진짜 자산 부재가 조용히 경고로 내려앉는다.
  assert.match(verifier, /const staleChildren = new Set\(staleParents\.map\(\(s\) => s\.child\)\)/);
  assert.match(verifier, /function staleParentTargets\(dead, moduleParents\) \{/);
  // 불변 배포본(artifact)에는 세대가 섞일 수 없으므로 완화가 없어야 한다.
  const staleFn = verifier.slice(verifier.indexOf("function staleParentTargets("));
  assert.match(staleFn.slice(0, staleFn.indexOf("\n}")), /if \(MODE === "artifact"\) return \[\];/);
  // 완화 대상은 부모가 있는 자식뿐이고, 빌드에 있는 것은 종전 경로(전파 지연)로 간다.
  assert.match(staleFn.slice(0, staleFn.indexOf("\n}")), /if \(existsInBuild\(item\.path\)\) continue;/);

  // artifact 모드는 불변 URL 이라 세대 게이트를 걸지 않는다(걸면 진짜 결함을 놓친다).
  assert.match(verifier, /EXPECTED_DIR && MODE === "alias"/);
});

// 🔴 콘솔 에러 판정은 자원 URL 을 포함해서 한다.
//
// Chromium 의 "Failed to load resource: the server responded with a status of NNN ()" 본문에는
// 자원 URL 이 없다 — URL 은 location().url 에만 실린다. 본문만 보고 판정하던 동안 호스트별
// 예외(폰트 CDN·프리뷰 CORS)는 상태코드 오류에 한 번도 걸리지 않았고, 실패 로그에도 URL 이 없어
// 무엇이 죽었는지 짚을 수 없었다. #807 릴리스가 정확히 그 형태로 530 두 건에 자동 롤백됐다.
test("browser console errors are judged and reported with the resource URL", () => {
  const start = smoke.indexOf('page.on("console"');
  const end = smoke.indexOf('page.on("requestfailed"');
  assert.ok(start > 0 && end > start, "console 핸들러 범위를 찾지 못했습니다");
  const handler = smoke.slice(start, end);

  // 판정에 쓰는 문자열에 URL 이 들어가야 한다.
  assert.ok(
    handler.includes('const detail = message.text() + " " + (message.location()?.url || "");'),
    "console 판정이 location().url 을 포함하지 않습니다",
  );
  // 보고에도 같은 문자열을 쓴다 — 로그에 URL 이 없으면 사후 추적이 불가능하다.
  assert.ok(
    handler.includes('browserErrors.push("console.error: " + detail)'),
    "console 에러 보고가 URL 없는 본문만 남깁니다",
  );
  // 본문만 보는 판정이 하나라도 남으면 예외는 다시 죽는다.
  assert.ok(!handler.includes("test(message.text())"), "본문만 보는 정규식 판정이 남아 있습니다");
  assert.ok(!handler.includes("Noise(message.text())"), "본문만 보는 소음 판정이 남아 있습니다");
  // 소음으로 넘긴 것도 로그에 남긴다(예외가 조용히 넓어지는 것을 막는다).
  assert.ok(handler.includes("ignoredConsoleErrors.push(detail)"), "넘긴 콘솔 에러를 모으지 않습니다");
  assert.ok(smoke.includes("[deploy-smoke] ignored console error: "), "넘긴 콘솔 에러를 출력하지 않습니다");
});

// 🔴 승격 전 관문이 자산 누락을 못 보던 구멍의 회귀 가드 (2026-08-24).
//
// 이 자리는 `isPagesPreview` 이기만 하면 **모든 404 콘솔 에러를** 무시했다 — 호스트도 경로도
// 보지 않았다. 그래서 프리뷰 스모크는 같은 출처의 앱 자산이 통째로 빠져도 PASS 를 냈고,
// 결함은 승격 뒤 커스텀 도메인 스모크에서야 드러나 릴리스가 통째로 자동 롤백됐다
// (run 32683154849: /js/services/destiny-flower-engine.js 404 → Pages·Worker 롤백).
//
// 판정을 소스에서 그대로 꺼내 **실행**한다. 문자열 매칭만 하면 규칙이 다시 넓어져도 통과한다.
function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start > 0, `${signature} 를 찾지 못했습니다`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${signature} 의 중괄호 균형을 찾지 못했습니다`);
}

function loadIgnorablePreview404(isPagesPreview, smokeHost) {
  const body = extractFunctionSource(smoke, "function isIgnorablePreview404(value) {");
  // 본문에 백틱이 있으므로 템플릿 리터럴로 감싸지 않는다.
  return new Function("isPagesPreview", "smokeHost", body + "; return isIgnorablePreview404;")(
    isPagesPreview,
    smokeHost,
  );
}

test("the preview smoke only forgives 404s that cannot be app defects", () => {
  const previewHost = "2a5f1e46.codedestiny-staging.pages.dev";
  const ignorable = loadIgnorablePreview404(true, previewHost);
  const line = (url) => `Failed to load resource: the server responded with a status of 404 () ${url}`;

  // 진짜 결함 — 승격 전에 잡아야 한다. 이 한 줄이 이 가드의 존재 이유다.
  assert.equal(
    ignorable(line(`https://${previewHost}/js/services/destiny-flower-engine.js?v=20260625-df-i18n`)),
    false,
    "같은 출처의 앱 자산 404 를 여전히 무시합니다",
  );
  assert.equal(ignorable(line(`https://${previewHost}/styles/core-ui.css?v=build-abc`)), false, "같은 출처 CSS 404 를 무시합니다");
  assert.equal(ignorable(line(`https://${previewHost}/icons/neo.webp`)), false, "같은 출처 이미지 404 를 무시합니다");

  // 프리뷰에서 404 가 정상인 셋.
  assert.equal(ignorable(line(`https://${previewHost}/cdn-cgi/rum?`)), true, "Cloudflare RUM 404 를 실패로 봅니다");
  assert.equal(ignorable(line(`https://${previewHost}/api/health`)), true, "정적 전용 프리뷰의 /api 404 를 실패로 봅니다");
  assert.equal(ignorable(line("https://assets.code-destiny.com/fonts/serif-kr/0fa5719f7323.woff2")), true, "교차 출처 404 를 실패로 봅니다");

  // 출처를 모르면 무시하지 않는다(fail-closed).
  assert.equal(ignorable("Failed to load resource: the server responded with a status of 404 ()"), false, "URL 없는 404 를 무시합니다");
  // 404 가 아닌 것은 이 판정기의 소관이 아니다.
  assert.equal(ignorable(line(`https://${previewHost}/x.js`).replace("404", "500")), false, "404 가 아닌 것을 무시합니다");

  // 커스텀 도메인(프리뷰가 아님)에서는 어떤 404 도 넘기지 않는다.
  const live = loadIgnorablePreview404(false, "staging.code-destiny.com");
  assert.equal(live(line("https://staging.code-destiny.com/cdn-cgi/rum?")), false, "라이브에서 404 를 무시합니다");
  assert.equal(live(line("https://assets.code-destiny.com/x.woff2")), false, "라이브에서 교차 출처 404 를 무시합니다");

  // 판정기가 실제로 배선돼 있어야 한다 — 함수만 있고 안 부르면 아무것도 지키지 않는다.
  const noise = extractFunctionSource(smoke, "function isExpectedConsoleNoise(value) {");
  assert.ok(noise.includes("isIgnorablePreview404(value)"), "isExpectedConsoleNoise 가 새 404 판정기를 부르지 않습니다");

  // 옛 무제한 규칙이 남아 있으면 위 판정기는 무의미하다.
  const corsNoise = extractFunctionSource(smoke, "function isExpectedPreviewCorsNoise(value) {");
  const pagesNoise = extractFunctionSource(smoke, "function isExpectedPagesPreviewNoise(value) {");
  assert.ok(!/status of 404/.test(corsNoise), "isExpectedPreviewCorsNoise 에 무제한 404 규칙이 남아 있습니다");
  assert.ok(!/status of 404/.test(pagesNoise), "isExpectedPagesPreviewNoise 에 무제한 404 규칙이 남아 있습니다");
});
