const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

// 🔴 재설계 전 상태가 정확히 이 테스트가 막는 결함이었다 — human-design.module.css 주석에는
//    "전역 헤더·푸터를 붙이지 않는다" 라고 적혀 있었지만 /human-design 은 CHROMELESS_ROUTES 에
//    없어서 GlobalHeader · DisclaimerBanner · SiteFooterHub · MobileBottomNav 가 전부 붙어 있었다.
//    주석은 가드가 아니므로 등록 자체를 검사한다.
test("휴먼 디자인 라우트가 크롬리스로 등록돼 있다", () => {
  const chrome = read("app/components/AppChrome.tsx");
  const chromeless = chrome.slice(
    chrome.indexOf("const CHROMELESS_ROUTES"),
    chrome.indexOf("const FEATURE_NAV_EXTRA_ROUTES"),
  );

  assert.ok(chromeless.includes('"/human-design"'), "CHROMELESS_ROUTES 에 /human-design 이 없다");
  assert.ok(chrome.includes("{!hideChrome && <GlobalHeader />"));
  assert.ok(chrome.includes("{!hideChrome && !isLocaleRoute && <SiteFooterHub />"));
  assert.ok(chrome.includes("{!hideChrome && <DisclaimerBanner />"));
  assert.ok(chrome.includes("!isAppShellRoute && !hideChrome && <MobileBottomNav />"));
});

test("휴먼 디자인은 공용 플로팅 나브도 받지 않는다(자체 상단 컨트롤을 쓴다)", () => {
  const chrome = read("app/components/AppChrome.tsx");
  const selfManaged = chrome.slice(
    chrome.indexOf("const FEATURE_NAV_SELF_MANAGED_ROUTES"),
    chrome.indexOf("const LOCALE_CODES"),
  );

  assert.ok(selfManaged.includes('"/human-design"'), "FEATURE_NAV_SELF_MANAGED_ROUTES 에 /human-design 이 없다");
  assert.ok(chrome.includes("selfManagedNav"));
});

test("화면이 자체 이탈 수단을 갖는다", () => {
  const client = read("app/human-design/HumanDesignClient.tsx");

  // 크롬을 지웠으므로 이 화면 안에 홈으로 나가는 길이 반드시 하나 있어야 한다.
  assert.ok(client.includes('<Link href="/" className={styles.exit}>'));
  assert.ok(client.includes("UI_TEXT.exit"));
});

test("출생 정보 입력 전 첫 화면이 고스트 바디그래프를 그린다", () => {
  const client = read("app/human-design/HumanDesignClient.tsx");

  // 🔴 chart={null} 이어야 한다. 남의 샘플 차트를 채우면 "남의 결과"를 내 결과처럼 보이게 한다.
  //    (2026-09 무료화 전에는 이 화면이 '결제 전' 화면이었다. 이제는 '입력 전' 화면이다.)
  assert.ok(client.includes("<BodyGraph chart={null}"));
  assert.ok(client.includes("styles.heroGraph"));
});

test("차트 화면에 결제가 걸려 있지 않다", () => {
  const client = read("app/human-design/HumanDesignClient.tsx");

  // 🔴 과금 지점은 프리미엄 리포트로 옮겼다. 차트 화면에 결제 게이트를 되살리지 말 것.
  //    호출 형태(괄호 포함)로 본다 — 파일 상단 주석이 두 이름을 "되살리지 말 것" 으로
  //    언급하므로 이름만 찾으면 그 주석이 오탐으로 걸린다.
  assert.ok(!client.includes("ensurePaidAccess("), "차트 화면에 결제 게이트 호출이 살아 있다");
  assert.ok(!client.includes("useCoinGate("), "차트 화면이 결제 훅을 쓴다");
});

test("요구된 10단계 섹션 앵커가 모두 있다", () => {
  const client = read("app/human-design/HumanDesignClient.tsx");
  const anchors = [
    "hd-my-design",
    "hd-type",
    "hd-strategy",
    "hd-authority",
    "hd-profile",
    "hd-centers",
    "hd-channels",
    "hd-gates",
    "hd-planets",
    "hd-reading",
  ];

  for (const anchor of anchors) {
    assert.ok(client.includes(`id="${anchor}"`), `섹션 앵커 ${anchor} 가 없다`);
  }
});

test("상세 시트가 공용 스크롤락을 쓴다(자체 구현 금지)", () => {
  const sheet = read("app/human-design/_components/DetailSheet.tsx");

  assert.ok(sheet.includes('from "@/app/_lib/body-scroll-lock"'));
  assert.ok(sheet.includes("useBodyScrollLock("));
  // 자기 손으로 body.style.overflow 를 만지면 결제 오버레이와 복원값을 서로 덮어쓴다.
  assert.ok(!/body\.style\.overflow/.test(sheet), "DetailSheet 가 body.style.overflow 를 직접 만진다");
});

test("등장 애니메이션이 reduced-motion 에서 최종 상태로 앉는다", () => {
  const css = read("app/human-design/_components/bodygraph.module.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  // 🔴 animation: none 만 두면 stroke-dashoffset: 1 이 남아 채널이 통째로 사라진다.
  assert.ok(reduced.includes("stroke-dashoffset: 0"));
  assert.ok(reduced.includes("stroke-dasharray: none"));
});

// ── 계산 중 대기 화면 ────────────────────────────────────────────────────────

test("대기 화면이 단계 진행 상태를 주장하지 않는다", () => {
  const scene = read("app/human-design/_components/PipelineScene.tsx");
  const railStart = scene.indexOf("const PipelineRail");
  const railEnd = scene.indexOf("export default function PipelineScene");
  assert.ok(railStart > 0 && railEnd > railStart, "PipelineRail 컴포넌트를 찾지 못했다");
  const rail = scene.slice(railStart, railEnd);

  // 🔴 차트는 /api/human-design/chart 를 한 번 부를 뿐이라 지금 몇 번째 단계인지 알 수 없다.
  //    레일이 경과 시간을 만지는 순간 그건 지어낸 진행률이다
  //    (worker/routes/human-design.js 의 요구사항 22 · AnalysisBasisLoading 의 정본 계약).
  assert.ok(!/elapsed/i.test(rail), "레일이 경과 시간을 읽는다 — 시간 기반 점등은 지어낸 진행률이다");
});

test("대기 화면의 8단계와 팔괘가 1:1 로 맞는다", () => {
  const scene = read("app/human-design/_components/PipelineScene.tsx");
  const steps = scene.slice(scene.indexOf("const PIPELINE_STEPS"), scene.indexOf("const WIRE_CHANNELS"));

  // 타입 선언에도 copyKey 가 한 번 나오므로 값이 붙은 형태로만 센다.
  assert.equal((steps.match(/copyKey: "/g) || []).length, 8, "단계가 8개가 아니다");
  const trigrams = steps.match(/trigram: \[[01], [01], [01]\]/g) || [];
  assert.equal(trigrams.length, 8, "팔괘가 8개가 아니다");
  assert.equal(new Set(trigrams).size, 8, "팔괘가 겹친다 — 여덟 괘가 모두 달라야 한다");
});

test("대기 화면의 경과 시간이 aria-live 로 읽히지 않는다", () => {
  const scene = read("app/human-design/_components/PipelineScene.tsx");

  // 🔴 200ms 마다 바뀌는 숫자가 aria-live 영역 안에 그대로 있으면 스크린리더가 초당 5회 읽는다.
  //    (같은 결함을 막는 가드가 __tests__/ui/life-book-ux.static.test.js 에도 있다.)
  assert.ok(
    scene.includes('<p className={styles.elapsed} aria-hidden="true">'),
    "경과 시간에 aria-hidden 이 없다",
  );
});

test("대기 화면 애니메이션이 reduced-motion 에서 최종 상태로 앉는다", () => {
  const css = read("app/human-design/_components/pipeline-scene.module.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.length > 0, "reduced-motion 블록이 없다");

  // 🔴 animation: none 만 두면 scaleY(0) · opacity: 0 이 그대로 남아 채널과 발광이 통째로 사라진다.
  //    끄는 것이 아니라 최종 상태로 앉히는 것이 이 저장소의 규칙이다.
  const settled = (selector, opacity) => new RegExp(
    `${selector} \\{\\s*animation: none;\\s*transform: none;\\s*opacity: ${opacity};`,
  );
  assert.ok(settled("\\.halo", "0\\.7").test(reduced), "halo 가 최종 상태로 앉지 않는다");
  assert.ok(settled("\\.vortex", "0\\.5").test(reduced), "소용돌이가 최종 상태로 앉지 않는다");
  assert.ok(
    /::before \{\s*animation: none;\s*transform: none;\s*opacity: 0\.55;/.test(reduced),
    "채널 펄스가 최종 상태로 앉지 않는다",
  );
});
