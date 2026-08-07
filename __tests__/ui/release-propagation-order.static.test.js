const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const deploySafe = fs.readFileSync(path.join(root, "scripts/deploy-safe.mjs"), "utf8");

// 🔴 릴리스가 배포마다 무작위로 실패하던 원인의 회귀 가드.
//
// deployPages(production) 직후에는 새 HTML 을 받은 엣지 PoP 가 아직 옛 배포를 가리켜, 그 HTML 이
// 참조하는 `_next/static/chunks/webpack-*.js` 가 404 로 내려온다. 브라우저 스모크는 그 404 를
// console.error 로 잡아 릴리스를 실패시키고, 그러면 워커가 자동 롤백된다 — 코드에는 아무 문제가
// 없는데 배포만 되돌아간다(2026-08-07: 5연속 실패, 매번 프로덕션 스모크에서 동일 증상).
//
// scripts/verify-deployed-assets.mjs 가 정확히 이 구간을 위해 존재하고 5라운드×25초 재시도를
// 갖고 있는데도 **어디에서도 호출되지 않는 죽은 도구**였다. 그래서 순서를 고정한다:
//   Pages 프로덕션 배포 → 자산 전파 대기 → 브라우저 스모크
test("production smoke waits for Pages propagation before it runs", () => {
  // 전파 대기가 존재하고, 실제 검증 스크립트를 부른다.
  assert.match(deploySafe, /function awaitProductionAssets\(base\)/);
  assert.match(deploySafe, /verify-deployed-assets\.mjs/);
  // 검증 대상 오리진을 프로덕션으로 주입한다(기본값에 기대지 않는다).
  assert.match(deploySafe, /CD_DEPLOY_VERIFY_ORIGIN: base/);

  const promoteStart = deploySafe.indexOf("async function promote(");
  assert.ok(promoteStart > 0, "promote() 를 찾지 못했습니다");
  const promoteBody = deploySafe.slice(promoteStart);

  const waitIndex = promoteBody.indexOf("awaitProductionAssets(productionOrigin(value))");
  const smokeIndex = promoteBody.indexOf("await smoke(productionOrigin(value))");
  assert.ok(waitIndex > 0, "promote() 가 전파 대기를 호출하지 않습니다");
  assert.ok(smokeIndex > 0, "promote() 가 프로덕션 스모크를 호출하지 않습니다");
  assert.ok(
    waitIndex < smokeIndex,
    "전파 대기가 프로덕션 스모크보다 먼저 실행되어야 합니다(순서가 뒤집히면 전환 틈새 404 로 릴리스가 되돌아간다)",
  );
});

// 전파 대기는 검사를 무르게 하는 것이 아니다 — 대기 후에도 자산이 죽어 있으면 실패해야 한다.
test("the propagation wait still fails the release when assets stay dead", () => {
  const verifier = fs.readFileSync(path.join(root, "scripts/verify-deployed-assets.mjs"), "utf8");
  assert.match(verifier, /MAX_ROUNDS/);
  assert.match(verifier, /process\.exit\(1\)/);
  // run() 은 종료코드가 0 이 아니면 throw 하므로, 실패가 그대로 릴리스 실패로 이어진다.
  assert.match(deploySafe, /if \(result\.status !== 0\) throw new Error\(label \+ " failed with exit "/);
});
