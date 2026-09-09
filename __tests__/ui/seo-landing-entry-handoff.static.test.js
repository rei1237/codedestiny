/**
 * SEO 랜딩 입력 -> 정적 홈 딥링크 인계 계약.
 *
 * 랜딩 폼은 Next 클라이언트 컴포넌트이고 결과 계산기는 정적 셸에 있으므로,
 * 두 런타임 사이에서 입력값을 잃으면 홈만 열리고 분석은 시작되지 않는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const form = read("app/components/SeoLandingBirthForm.tsx");
const runtime = read("js/core/index-inline-runtime.js");
const publicRuntime = read("public/js/core/index-inline-runtime.js");

test("랜딩 폼은 정적 셸 action 딥링크에 입력값을 세션으로 인계한다", () => {
  assert.match(form, /cd:seo-landing-entry:v1/);
  assert.match(form, /target\.searchParams\.get\("action"\)/);
  assert.match(form, /sessionStorage\.setItem\(\s*SEO_LANDING_ENTRY_HANDOFF_KEY/);
  assert.match(form, /profile: card/);
});

test("정적 셸은 action 실행 전에 인계값을 입력 폼에 복원한다", () => {
  assert.match(runtime, /function __cdApplySeoLandingEntryHandoff\(action\)/);
  assert.match(runtime, /__cdApplySeoLandingEntryHandoff\(action\);/);
  assert.match(runtime, /String\(handoff\.action\) !== String\(action\)/);
  assert.match(runtime, /document\.getElementById\('birthDate'\)/);
  assert.match(runtime, /window\.__cdSeoLandingPendingGender = gender/);
  assert.match(runtime, /__cdApplySeoLandingPendingGender\(\);/);
});

test("정적 셸과 public 미러의 인계 런타임이 같다", () => {
  assert.equal(publicRuntime, runtime);
});
