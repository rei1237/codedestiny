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
  assert.match(runtime, /window\.__cdSeoLandingEntryHandoffApplied = \{ action: String\(action\)/);
});

// 2026-11-12 /manse "무료로 만세력 보기"가 아무 변화 없이 멈춘 회귀: 숨은 폼의 #run-btn 을 누르는
// checkPrivacyAndCalculate 대신 입력 화면을 여는 cdOneStepFreeSajuEntry 로 보낸다.
test("SEO 랜딩 생년 폼은 사주 계산을 checkPrivacyAndCalculate 링크로 보내지 않는다", () => {
  const landings = read("lib/seo-landing-pages.js");
  assert.doesNotMatch(landings, /ctaHref: "[^"]*action=checkPrivacyAndCalculate"/);
  const funnel = read("js/core/home-funnel.js");
  assert.match(funnel, /routeAction === 'cdOneStepFreeSajuEntry' \|\| routeAction === 'checkPrivacyAndCalculate'\) revealInput\(\);/);
});

test("랜딩 폼 인계값이 저장 프로필보다 먼저 쓰이고, 성별은 필수다", () => {
  const profile = read("js/destiny-profile.js");
  const entry = profile.slice(profile.indexOf("window.cdOneStepFreeSajuEntry = function"), profile.indexOf("window.cdSajuTabEntry = function"));
  const handoffAt = entry.indexOf("window.__cdSeoLandingEntryHandoffApplied");
  const cachedAt = entry.indexOf("_dpResolveCurrentProfileForSaju('')");
  assert.ok(handoffAt > 0 && cachedAt > handoffAt, "인계 확인이 캐시 프로필 조회보다 먼저여야 한다");
  assert.match(form, /if \(showGender && !form\.gender\) \{/);
  assert.match(form, /genderRequired:/);
});

test("정적 셸과 public 미러의 인계 런타임이 같다", () => {
  assert.equal(publicRuntime, runtime);
});
const ts = require('typescript');
const vm = require('node:vm');

test('ggulggul destination receives this reading input once without rewriting the saved profile', () => {
  const ast = ts.createSourceFile('form.tsx', form, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let submit;
  function find(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'handleSubmit') submit = node; ts.forEachChild(node, find); }
  find(ast);
  assert.ok(submit);
  for (const pathname of ['/ggulggul/', '/ggulggul', '/', '/vedic-ai/']) for (const owner of ['owner','previous-owner']) {
    const entries = new Map(); let destination;
    const ctx = {
      URL, Date, JSON, selectedCard:{current:{owner,profile:{id:'chosen-card'}}}, SEO_LANDING_ENTRY_HANDOFF_KEY: 'cd:seo-landing-entry:v1',
      form: { birthDate: '1990-01-15', birthTime: '13:30', birthTimeUnknown: false, gender: 'female', calendarType: 'solar' },
      showTime: true, showGender: true, showCalendar: true,
      submitHref: pathname + '?action=cdOneStepFreeSajuEntry',
      validateBirthDateWithAge: () => ({ isValid: true }),
      readCurrentDestinyProfile: () => ({ id: 'saved-card' }),
      applyDestinyProfileBirthEdit: (existing, birth) => ({ ...existing, ...birth }),
      readDestinyProfileAccountId: () => 'owner',
      window: { location: { origin: 'https://mock.invalid', assign: href => { destination = href; } }, sessionStorage: { setItem: (key, value) => entries.set(key, value) }, localStorage: { setItem: () => assert.fail('must not change saved profile') } },
    };
    vm.createContext(ctx);
    vm.runInContext(ts.transpileModule(submit.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
    ctx.handleSubmit({ preventDefault() {} });
    const handoff = JSON.parse(entries.get(ctx.SEO_LANDING_ENTRY_HANDOFF_KEY));
    assert.equal(handoff.profile.id, owner==='owner'?'chosen-card':'saved-card');
    assert.equal(handoff.path,pathname);
    assert.equal(handoff.profile.birthDate, '1990-01-15');
    assert.equal(handoff.profile.birthTime, '13:30');
    assert.equal(handoff.action, 'cdOneStepFreeSajuEntry');
    assert.equal(handoff.accountId, 'owner');
    assert.equal(destination, ctx.submitHref);
    assert.ok(!destination.includes('1990'));
  }
});
