const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("사주 내부 진입은 SEO 페이지가 아닌 단일 직행 액션을 사용한다", () => {
  const home = read("index.html");
  const registry = read("js/core/service-registry.js");
  const appHome = read("app/app/AppHomeClient.tsx");
  const homeSections = read("app/components/HomeServiceSections.tsx");
  const famousSaju = read("app/insights/famous-saju/[slug]/page.tsx");
  const profile = read("js/destiny-profile.js");

  assert.match(home, /href="\/?\?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry" data-cd-service-id="saju"/);
  assert.match(registry, /id: "saju"[\s\S]*?href: "\/?\?action=cdOneStepFreeSajuEntry"[\s\S]*?action: "cdOneStepFreeSajuEntry"/);
  assert.match(appHome, /href="\/?\?action=cdOneStepFreeSajuEntry"/);
  assert.match(homeSections, /"\/saju\/basic": "\/?\?action=cdOneStepFreeSajuEntry"/);
  assert.match(famousSaju, /href="\/?\?action=cdOneStepFreeSajuEntry"/);
  assert.match(profile, /readFormData\(\{ allowAnonymous: true \}\)/);
  assert.match(profile, /__cdDirectSajuEntryState\.inFlight/);
});

test("사주 직행 액션은 저장 프로필·입력폼 순서와 중복 실행 방지를 지킨다", () => {
  const profile = read("js/destiny-profile.js");
  const start = profile.indexOf("var __cdDirectSajuEntryState =");
  const end = profile.indexOf("  /**\n   * 모바일 하단 네비 '사주' 탭 진입점.", start);
  assert.ok(start >= 0 && end > start, "사주 직행 액션 소스 경계를 찾지 못했습니다");

  const calls = [];
  const context = {
    window: {},
    _dpResolveCurrentProfileForSaju: () => context.cached,
    _dpHasValidProfileDate: (year, month, day) => [year, month, day].every(Boolean),
    readFormData: () => context.formProfile,
    _injectAndRun: (value, type) => calls.push({ value, type }),
    document: {},
  };
  vm.runInNewContext(profile.slice(start, end), context);

  context.cached = { birth: { year: 1990, month: 1, day: 2 } };
  context.formProfile = { name: "폼 사용자" };
  context.window.cdOneStepFreeSajuEntry();
  context.window.cdOneStepFreeSajuEntry();
  assert.deepEqual(calls, [{ value: context.cached, type: "saju" }]);

  context.window.__cdDirectSajuEntryState.inFlight = false;
  context.cached = null;
  context.window.cdOneStepFreeSajuEntry();
  assert.deepEqual(calls.at(-1), { value: context.formProfile, type: "saju" });

  context.window.__cdDirectSajuEntryState.inFlight = false;
  context.formProfile = null;
  let createCount = 0;
  context.window.dpStartProfileCreate = () => { createCount += 1; };
  context.window.cdOneStepFreeSajuEntry();
  assert.equal(createCount, 1);
});

test("타로와 숙요점은 한 번의 진입에서 모달 초기화를 한 번만 예약한다", () => {
  const runtime = read("js/core/index-inline-runtime.js");

  assert.match(runtime, /var __cdBirthModalDepsLoadPromise = null;/);
  assert.match(runtime, /if \(__cdBirthModalDepsLoadPromise\) return __cdBirthModalDepsLoadPromise;/);
  assert.match(runtime, /var __cdSukuyoModalState = window\.__cdSukuyoModalState/);
  assert.match(runtime, /if \(__cdSukuyoModalState\.open\) return __cdSukuyoModalState\.pending \|\| true;/);
  assert.match(runtime, /var state = window\.__cdTarotModalState/);
  assert.match(runtime, /if \(state\.open\) return state\.pending \|\| true;/);
  assert.match(runtime, /state\.generation === generation/);
});

test("공유 스크립트 로더는 버전 쿼리와 동시 요청을 하나로 합친다", async () => {
  const runtime = read("js/core/index-inline-runtime.js");
  const start = runtime.indexOf("function __cdNormalizeScriptSrc");
  const end = runtime.indexOf("function __cdOpenZiweiPremiumFromCard");
  assert.ok(start >= 0 && end > start, "공유 로더 소스 경계를 찾지 못했습니다");

  const scripts = [];
  const document = {
    baseURI: "https://example.test/",
    querySelectorAll: () => scripts,
    createElement: () => {
      const listeners = {};
      return {
        dataset: {},
        addEventListener(name, callback) { listeners[name] = callback; },
        _fire(name) { if (listeners[name]) listeners[name](); },
      };
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        setImmediate(() => script.onload());
      },
    },
  };
  const context = {
    window: { location: { href: "https://example.test/" } },
    document,
    URL,
    Promise,
    setImmediate,
  };
  vm.runInNewContext(runtime.slice(start, end), context);

  const first = context.window.__cdLoadScriptOnce("/js/core/saju.js?v=one");
  const second = context.window.__cdLoadScriptOnce("/js/core/saju.js?v=two");
  assert.strictEqual(first, second);
  assert.equal(scripts.length, 1);
  await Promise.all([first, second]);
  await context.window.__cdLoadScriptOnce("/js/core/saju.js?v=three");
  assert.equal(scripts.length, 1);
});

test("지연 로더와 uiBindings는 공유 로더를 우선 사용한다", () => {
  const lazyLoader = read("js/cd-lazy-feature-loader.js");
  const bindings = read("js/core/uiBindings.js");

  assert.match(lazyLoader, /window\.__cdLoadScriptOnce\(src\)/);
  assert.match(bindings, /if \(typeof window\.__cdLoadScriptOnce === 'function'\) return window\.__cdLoadScriptOnce\(src\);/);
});
