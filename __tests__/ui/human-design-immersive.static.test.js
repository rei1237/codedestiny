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

test("결제 전 첫 화면이 고스트 바디그래프를 그린다", () => {
  const client = read("app/human-design/HumanDesignClient.tsx");

  // 🔴 chart={null} 이어야 한다. 남의 샘플 차트를 채우면 결제 전 화면이 "남의 결과"가 된다.
  assert.ok(client.includes("<BodyGraph chart={null}"));
  assert.ok(client.includes("styles.heroGraph"));
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
