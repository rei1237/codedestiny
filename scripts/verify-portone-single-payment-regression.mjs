import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const paymentsRouteSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const portoneSource = readFileSync(resolve(root, "worker/lib/portone.js"), "utf8");
const modelsSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
const paymentServiceSource = readFileSync(resolve(root, "js/core/payment-service.js"), "utf8");
const pointsPageSourcePath = existsSync(resolve(root, "app/points/PointsClient.tsx"))
  ? "app/points/PointsClient.tsx"
  : "app/points/page.tsx";
const pointsPageSource = readFileSync(resolve(root, pointsPageSourcePath), "utf8");
const pagesHeadersSource = readFileSync(resolve(root, "public/_headers"), "utf8");
const clientPaymentSource = `${indexSource}\n${destinyProfileSource}`;
const portoneAliasGroups = [
  ["PORTONE_API_SECRET", "PORTONE_API_Secret", "PORTONE_API_SECRET_KEY", "PORTONE_V2_API_SECRET", "PORTONE_API_SECRET_V2", "PORTONE_SECRET"],
  ["PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_CHANNEL", "PORTONE_CHANNELKEY", "PORTONE_V2_CHANNEL_KEY"],
  ["PORTONE_STORE_ID", "PORTONE_Store", "PORTONE_STORE", "PORTONE_STOREID", "PORTONE_V2_STORE_ID"],
  ["PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_WEBHOOK", "PORTONE_WEBHOOK_SECRET_KEY", "PORTONE_WEBHOOK_TOKEN", "PORTONE_webhook_Secret", "PORTONE_V2_WEBHOOK_SECRET"],
  ["PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL", "PORTONE_webhookurl", "PORTONE_WEBHOOKURL"],
  ["MID", "INICISMID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
  ["INIsignkey", "INISIGNKEY", "INI_SIGNKEY", "INICIS_SIGNKEY", "INICIS_WEB_SIGNKEY"],
  ["INIAPIKEY", "INI_API_KEY", "INICIS_API_KEY"],
  ["INIAPI_IV", "INI_API_IV", "INICIS_API_IV"],
];
const localPortOneEnv = buildLocalPortOneEnv();

const paymentsMod = await import("../worker/routes/payments.js");
const portoneMod = await import("../worker/lib/portone.js");
const modelsMod = await import("../worker/lib/models.js");

const {
  handleSinglePaymentStart,
  handleSinglePaymentComplete,
  handleWebhook,
  signStandardWebhookPayload,
} = paymentsMod.__paymentsTestUtils;

const {
  ContentEntitlement,
  Payment,
  PaymentWebhookEvent,
  ProfileCard,
  User,
} = modelsMod;

const AUTH = { userId: "64f0a1b2c3d4e5f678901234", role: "user" };
function makeNonCredentialFixture(label, length) {
  const seed = "fixture-only-" + label + "-not-real-";
  return seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
}

const ENV = {
  PORTONE_API_SECRET: makeNonCredentialFixture("portone-api", 40),
  PORTONE_WEBHOOK_SECRET: makeNonCredentialFixture("portone-webhook", 34),
  PORTONE_CHANNEL_KEY: makeNonCredentialFixture("portone-channel", 16),
  PORTONE_STORE_ID: makeNonCredentialFixture("portone-store", 14),
  MID: makeNonCredentialFixture("inicis-mid", 10),
  INIsignkey: makeNonCredentialFixture("inicis-sign", 38),
  INIAPIKEY: makeNonCredentialFixture("inicis-api", 40),
  INIAPI_IV: makeNonCredentialFixture("inicis-iv", 39),
  SITE_BASE_URL: "https://code-destiny.test",
};
const ENV_CORE = {
  PORTONE_API_SECRET: ENV.PORTONE_API_SECRET,
  PORTONE_CHANNEL_KEY: ENV.PORTONE_CHANNEL_KEY,
  PORTONE_STORE_ID: ENV.PORTONE_STORE_ID,
  SITE_BASE_URL: ENV.SITE_BASE_URL,
};

const originals = {
  fetch: globalThis.fetch,
  contentFindOne: ContentEntitlement.findOne,
  contentFindOneAndUpdate: ContentEntitlement.findOneAndUpdate,
  contentUpdateMany: ContentEntitlement.updateMany,
  paymentCreate: Payment.create,
  paymentFindOne: Payment.findOne,
  paymentFindOneAndUpdate: Payment.findOneAndUpdate,
  paymentFindById: Payment.findById,
  paymentFindByIdAndUpdate: Payment.findByIdAndUpdate,
  paymentWebhookCreate: PaymentWebhookEvent.create,
  paymentWebhookFindOne: PaymentWebhookEvent.findOne,
  paymentWebhookFindOneAndUpdate: PaymentWebhookEvent.findOneAndUpdate,
  paymentWebhookFindByIdAndUpdate: PaymentWebhookEvent.findByIdAndUpdate,
  profileFindOne: ProfileCard.findOne,
  userFindById: User.findById,
  userUpdateOne: User.updateOne,
};

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    session() { return this; },
    lean: async () => value,
    catch: async () => value,
  };
}

function assertContains(source, marker, label = marker) {
  assert.ok(source.includes(marker), `${label}: missing marker`);
}

function assertNotContains(source, marker, label = marker) {
  assert.ok(!source.includes(marker), `${label}: forbidden marker present`);
}

// 🔴 PG 결제창 미노출 회귀 가드 (2026-07)
// PR #104 가 requestPayment 요청에 windowType 을 새로 넣고 redirectUrl 을 서버 생성값 우선으로
// 바꾼 뒤, 단건결제 클릭 시 PG 결제창이 아예 뜨지 않는 회귀가 발생했다. windowType 은 이 레포에서
// 그 두 곳에만 있었고, 정상 동작하는 결제 경로(lib/payment/portone.ts, /points 이용권 결제)는
// windowType 을 보내지 않으며 redirectUrl 을 클라이언트에서 페이지 origin 기준으로 만든다.
// 두 클라이언트(정적 셸 / destiny-profile)를 정상 경로와 같은 형태로 고정한다.
function runPortOneRequestShapeTests() {
  for (const [label, source] of [["index.html", indexSource], ["js/destiny-profile.js", destinyProfileSource]]) {
    // 코드 형태(속성 대입 / 실제 참조)로만 판정한다 — 설명 주석의 단어까지 잡으면 오탐이 된다.
    assertNotContains(source, "windowType:", `${label}: PortOne requestPayment must not send windowType (PR #104 PG-window regression)`);
    assertNotContains(source, "order.redirectUrl ||", `${label}: redirectUrl must be built from the page URL, not the server order`);
    assertContains(source, "new URL(window.location.href)", `${label}: redirectUrl is derived from the current page URL`);
    assertContains(source, "requestData.noticeUrls = [config.noticeUrl]", `${label}: noticeUrls stays in parity with lib/payment/portone.ts`);
  }
  // 정상 동작하는 참조 구현도 함께 고정한다 — 이쪽이 바뀌면 위 동등성 근거가 사라진다.
  const portoneClientSource = readFileSync(resolve(root, "lib/payment/portone.ts"), "utf8");
  assertNotContains(portoneClientSource, "windowType", "lib/payment/portone.ts must stay the windowType-free reference shape");
}

// 🔴 PG 결제창 언어 · 해외카드 노출 가드 (2026-08-20 신설 → 2026-08-28 보류 → 2026-08-31 개방)
//
// locale 을 안 보내면 PortOne 이 한국어 결제창을 연다 — UI·문구를 전부 번역해 놓고도
// 사용자가 마지막 화면에서 한국어를 만난다. 요청을 만드는 곳이 네 군데라(정적 셸 ·
// 독립 정적 · React 단건 · /points 이용권) 한 곳만 빠져도 그 경로만 조용히 한국어로 열린다.
//
// 🔴 쓸 수 있는 값은 우리가 아니라 PG 가 정한다. KG이니시스는 **PC 결제창에서
//    KO_KR·EN_US·ZH_CN, 모바일 결제창에서 KO_KR·EN_US** 만 지원한다.
//    🔴 인용 가능한 정본이 2026-08-31 에 바뀌었다 — 렌더된 공개 문서에서 이 표가 사라진 뒤
//    한동안 mdx 원본뿐이었으나, npm 배포 아티팩트가 같은 사실을 **버전 고정 가능한 형태로**
//    담고 있다: `@portone/browser-sdk@0.1.9` 의 `dist/v2/entity/Locale.d.ts` 가 ZH_CN 에만
//    "KG이니시스 (PC)" 한정자를 달아 둔다. 문서 사이트는 리라이트되지만 배포된 버전은 안 바뀐다.
//
// 🔴 **집합을 3값으로 넓혔다고 '아무 데서나 ZH_CN'이 된 것이 아니다.**
//    모바일에 지원 밖 locale 을 보냈을 때의 동작은 여전히 미문서이고, 같은 문서가 밝히는 가장
//    가까운 사례(모바일 빌링키 발급)는 "해당 파라미터를 지원하지 않고 항상 한국어로 노출됩니다"
//    다. 즉 모바일에 ZH_CN 을 무조건 보내면 지금(영어)보다 **나빠진다.** 그래서 정본은
//    isDesktopPgWindow() 가 참일 때만 ZH_CN 을 낸다 — 그 판정은 5개 조건의 논리곱이고
//    미상은 전부 false 다(거짓 음성 = EN_US = 오늘과 동일 = 회귀 0).
//
// 🔴 **정적 검사만 보고 행위 매트릭스를 걷어내지 말 것.** 집합이 3값이 된 순간 정적 검사만으로는
//    "ZH_CN 을 무조건 반환해도 통과"가 된다. 지금 단언해야 하는 명제는 "모바일에서는 ZH_CN 이
//    절대 나올 수 없다"이고 이건 리터럴 집합으로 표현 불가능한 **행위 명제**다. 둘 다 필요하다 —
//    정적 전수 추출은 매트릭스에 없는 네 번째 값(예: return "JA_JP")의 등장을 잡고,
//    행위 매트릭스는 판정 함수가 죽거나 뒤집히는 것을 잡는다. 🔴 핵심 양성 그룹을 지우지 말 것 —
//    그게 없으면 기능이 통째로 죽어도 음성 테스트가 공허하게 전부 통과한다.
//
// 🔴 해외카드 노출 옵션(`global_visa3d=Y`)은 이니시스 **모바일 결제창 전용**이고
//    bypass.inicis_v2.P_RESERVED 밖에는 실을 자리가 없다. 2026-08-31 이전까지 이 레포는
//    bypass 를 한 번도 보내지 않았다 — 해외카드 특약이 승인돼도 모바일 결제창에 해외카드 탭이
//    안 뜰 수 있었다는 뜻이다. 🔴 다른 PG 채널(카카오페이 등)에 inicis_v2 키를 실었을 때의 동작은
//    미문서이고 거절이라면 결제창이 아예 안 뜬다 — 셸·독립은 channelKeyName 으로 게이팅한다.
//
// 🔴 스테이징 실결제창 육안(승인 없이 취소)은 아직 **미검증**이다. 우리 데스크톱 판정이
//    포트원의 PC 판정의 부분집합이라는 것과, 특약 승인 전 global_visa3d 의 실제 반응이 그 대상이다.
//    관찰하면 날짜·기기·결과를 여기와 checkout-entry.js 머리주석에 남긴다.
const PG_WINDOW_LOCALES = new Set(["KO_KR", "EN_US", "ZH_CN"]);
const PG_WINDOW_MOBILE_LOCALES = new Set(["KO_KR", "EN_US"]);
const INICIS_BYPASS_OPTION = "global_visa3d=Y";

/** 정본 IIFE 를 node 에서 그대로 부른다(UMD — verify-payment-choice-parity.mjs 와 같은 방식). */
const checkoutEntryModule = createRequire(import.meta.url)(resolve(root, "js/core/checkout-entry.js"));

/** runtimeWindow() 가 호출 시점마다 window 를 lazy 하게 읽으므로 픽스처를 갈아 끼울 수 있다. */
function withFixtureWindow(fixture, run) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const prev = globalThis.window;
  globalThis.window = fixture;
  try {
    return run();
  } finally {
    if (had) globalThis.window = prev;
    else delete globalThis.window;
  }
}

function makeFixtureWindow({ lang, ua, maxTouchPoints = 0, coarse = false, navigator: hasNavigator = true, matchMedia: hasMatchMedia = true }) {
  const win = {};
  if (lang !== undefined) win.cdGetCurrentLanguage = () => lang;
  if (hasNavigator) win.navigator = { userAgent: ua, maxTouchPoints };
  if (hasMatchMedia) win.matchMedia = (query) => ({ matches: /pointer:\s*coarse/.test(String(query)) ? coarse : false });
  return win;
}

// 실기기 UA. 🔴 안드로이드 태블릿은 Mobile 토큰이 없고, iPadOS 데스크톱 모드는 UA 에
// iPad 조차 없다(Macintosh 로 위장) — 그 둘이 이 판정의 실제 난관이라 반드시 남겨 둔다.
const UA = {
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  ipadSafari: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  kakaoInApp: "Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36;KAKAOTALK 10.4.0",
  naverInApp: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.9.2)",
  samsungInternet: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
};

const NON_ZH_CN_LANGS = ["ko", "en", "ja", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];

function runPgWindowLocaleTests() {
  // ① 네 경로 전부가 locale 을 실어야 한다. 위임 함수 이름까지 고정해 사본 구현을 막는다.
  const portoneClientSource = readFileSync(resolve(root, "lib/payment/portone.ts"), "utf8");
  const pointsClientSource = readFileSync(resolve(root, "app/points/PointsClient.tsx"), "utf8");
  const CALLERS = [
    ["index.html", indexSource, "locale: _cdPgWindowLocale()"],
    ["js/destiny-profile.js", destinyProfileSource, "locale: _dpPgWindowLocale()"],
    ["lib/payment/portone.ts", portoneClientSource, "locale: checkoutEntry.pgWindowLocale()"],
    ["app/points/PointsClient.tsx", pointsClientSource, "locale: checkoutEntry.pgWindowLocale()"],
  ];
  for (const [label, source, marker] of CALLERS) {
    assertContains(
      source,
      marker,
      `${label}: PortOne requestPayment 이 locale 을 실어야 한다 — 빠지면 그 경로만 한국어 결제창으로 열린다`,
    );
  }

  // 🔴 bypass 도 같은 네 경로 전부에 실려야 한다. 한 곳만 빠지면 그 경로의 모바일 결제창에만
  //    해외카드 탭이 안 뜬다 — 화면상 아무 오류도 없어 발견이 가장 늦는 종류의 결함이다.
  const BYPASS_CALLERS = [
    ["index.html", indexSource, "if (_cdBypass) requestData.bypass = _cdBypass;"],
    ["js/destiny-profile.js", destinyProfileSource, "if (_dpBypass) requestData.bypass = _dpBypass;"],
    ["lib/payment/portone.ts", portoneClientSource, "requestData.bypass = checkoutEntry.portoneBypass();"],
    // 이용권 경로는 사용자가 수단을 고르므로 채널 게이팅을 거쳐 붙인다(아래 ⑥ 이 그 표현식을 고정한다).
    ["app/points/PointsClient.tsx", pointsClientSource, "if (passBypass) requestData.bypass = passBypass;"],
  ];
  for (const [label, source, marker] of BYPASS_CALLERS) {
    assertContains(
      source,
      marker,
      `${label}: requestPayment 이 이니시스 bypass 를 실어야 한다 — 빠지면 그 경로의 모바일 결제창에 해외카드가 안 뜬다`,
    );
  }

  // ② 위임 래퍼는 모듈 미부착 시 종전 동작으로 물러나야 한다(결제 임계경로 — 던지면 결제창이 안 뜬다).
  //    locale 의 종전 동작은 한국어 결제창이고, bypass 의 종전 동작은 '보내지 않음' 이라 null 이다.
  for (const [label, source, fnName] of [
    ["index.html", indexSource, "_cdPgWindowLocale"],
    ["js/destiny-profile.js", destinyProfileSource, "_dpPgWindowLocale"],
  ]) {
    const body = sliceFunctionBody(source, `function ${fnName}(`);
    assert.ok(
      /return 'KO_KR';/.test(body) && /catch \(/.test(body),
      `${label}: ${fnName} 은 모듈 미부착·예외에서 'KO_KR' 로 물러나야 한다`,
    );
  }
  for (const [label, source, fnName] of [
    ["index.html", indexSource, "_cdPortoneBypass"],
    ["js/destiny-profile.js", destinyProfileSource, "_dpPortoneBypass"],
  ]) {
    const body = sliceFunctionBody(source, `function ${fnName}(`);
    assert.ok(
      /return null;/.test(body) && /catch \(/.test(body),
      `${label}: ${fnName} 은 모듈 미부착·예외에서 null 로 물러나야 한다 — 손으로 지어낸 bypass 를 PG 로 보내지 않는다`,
    );
  }

  // ③ 정본이 PG 지원 밖 값을 낼 수 없어야 한다. 문자열 리터럴을 전수로 본다.
  const entrySource = readFileSync(resolve(root, "js/core/checkout-entry.js"), "utf8");
  const entryBody = sliceFunctionBody(entrySource, "function pgWindowLocale(");
  const emitted = [...entryBody.matchAll(/return \"([A-Z_]+)\"/g)].map((m) => m[1]);
  assert.ok(emitted.length >= 3, "js/core/checkout-entry.js: pgWindowLocale 이 값을 돌려주지 않는다 — 추출이 깨졌다");
  for (const value of emitted) {
    assert.ok(
      PG_WINDOW_LOCALES.has(value),
      `js/core/checkout-entry.js: pgWindowLocale 이 ${value} 를 냅니다 — KG이니시스 결제창이 받는 값은 `
        + `${[...PG_WINDOW_LOCALES].join(" · ")} 뿐이고, 그중 모바일이 받는 것은 `
        + `${[...PG_WINDOW_MOBILE_LOCALES].join(" · ")} 뿐입니다.`,
    );
  }
  // 🔴 제2 방출자 금지 — ZH_CN 리터럴이 pgWindowLocale 본문 밖에 있으면 데스크톱 게이트를
  //    거치지 않는 경로가 생긴 것이다(주석에는 따옴표 없이 적는다).
  const zhLiteralCount = (entrySource.match(/\"ZH_CN\"/g) || []).length;
  assert.equal(
    zhLiteralCount,
    1,
    `js/core/checkout-entry.js: "ZH_CN" 리터럴이 ${zhLiteralCount}개입니다 — pgWindowLocale 안의 한 곳뿐이어야 합니다.`,
  );
  assert.ok(entryBody.includes("isDesktopPgWindow()"), "pgWindowLocale 이 데스크톱 판정을 거치지 않습니다 — 모바일에 ZH_CN 이 나갑니다.");

  // ④ 🔴 행위 매트릭스. 정적 집합으로는 표현할 수 없는 명제를 여기서 단언한다.
  const cases = [];
  const desktopBase = { maxTouchPoints: 0, coarse: false };
  // 핵심 음성 — 모바일·인앱·태블릿에서는 ZH_CN 이 절대 나오지 않는다.
  for (const [name, fixture] of [
    ["iPhone Safari", { ua: UA.iphone, coarse: true }],
    ["Android 폰 Chrome", { ua: UA.androidPhone, coarse: true }],
    ["Android 태블릿(Mobile 토큰 없음)", { ua: UA.androidTablet, coarse: true }],
    ["iPad Safari", { ua: UA.ipadSafari, coarse: true }],
    ["iPad 데스크톱 모드(Macintosh 위장)", { ua: UA.macSafari, maxTouchPoints: 5, coarse: false }],
    ["카카오톡 인앱", { ua: UA.kakaoInApp, coarse: true }],
    ["네이버 인앱", { ua: UA.naverInApp, coarse: true }],
    ["삼성 인터넷", { ua: UA.samsungInternet, coarse: true }],
  ]) {
    cases.push({ group: "핵심 음성", name, fixture: { lang: "zh-CN", ...desktopBase, ...fixture }, expect: (v) => v !== "ZH_CN", want: "ZH_CN 이 아님" });
  }
  // 🔴 핵심 양성 — 이게 없으면 기능이 통째로 죽어도 위 음성 8건이 공허하게 통과한다.
  for (const [name, fixture] of [
    ["Windows Chrome", { ua: UA.windowsChrome }],
    ["macOS Safari", { ua: UA.macSafari }],
    ["Windows 터치 노트북(pointer:fine)", { ua: UA.windowsChrome, maxTouchPoints: 10 }],
  ]) {
    cases.push({ group: "핵심 양성", name, fixture: { lang: "zh-CN", ...desktopBase, ...fixture }, expect: (v) => v === "ZH_CN", want: "ZH_CN" });
  }
  // 미상 — 판정 재료가 없으면 데스크톱이라 부르지 않는다.
  for (const [name, fixture] of [
    ["navigator 없음", { ua: UA.windowsChrome, navigator: false }],
    ["matchMedia 없음", { ua: UA.windowsChrome, matchMedia: false }],
    ["UA 빈 문자열", { ua: "" }],
  ]) {
    cases.push({ group: "미상", name, fixture: { lang: "zh-CN", ...desktopBase, ...fixture }, expect: (v) => v !== "ZH_CN", want: "ZH_CN 이 아님" });
  }
  // 불변 — zh-CN 이 아닌 11개 언어는 기기와 무관하게 출력이 고정이다. 🔴 zh-TW 는 데스크톱에서도 EN_US.
  for (const lang of NON_ZH_CN_LANGS) {
    const want = lang === "ko" ? "KO_KR" : "EN_US";
    cases.push({ group: "불변(데스크톱)", name: lang, fixture: { lang, ua: UA.windowsChrome, ...desktopBase }, expect: (v) => v === want, want });
    cases.push({ group: "불변(모바일)", name: lang, fixture: { lang, ua: UA.iphone, maxTouchPoints: 5, coarse: true }, expect: (v) => v === want, want });
  }

  assert.ok(
    cases.length >= 24,
    `행위 매트릭스가 ${cases.length}건뿐입니다 — 표를 비워 통과시키지 마세요(최소 24건).`,
  );
  const groups = new Set(cases.map((c) => c.group));
  for (const required of ["핵심 음성", "핵심 양성", "미상", "불변(데스크톱)", "불변(모바일)"]) {
    assert.ok(groups.has(required), `행위 매트릭스에서 '${required}' 그룹이 사라졌습니다 — 지우지 마세요.`);
  }

  for (const testCase of cases) {
    const actual = withFixtureWindow(
      makeFixtureWindow(testCase.fixture),
      () => checkoutEntryModule.pgWindowLocale(),
    );
    assert.ok(
      testCase.expect(actual),
      `[${testCase.group}] ${testCase.name}: pgWindowLocale() 이 ${actual} 를 냈습니다(기대: ${testCase.want}).`
        + ` 모바일 결제창은 ${[...PG_WINDOW_MOBILE_LOCALES].join(" · ")} 만 지원하며, 지원 밖 값을 보내면`
        + ` 한국어로 열릴 수 있습니다(모바일 빌링키 발급의 문서화된 동작).`,
    );
    // 어떤 픽스처에서도 지원 밖 값이 나가서는 안 된다.
    assert.ok(PG_WINDOW_LOCALES.has(actual), `[${testCase.group}] ${testCase.name}: 지원 밖 값 ${actual} 가 나왔습니다.`);
    if (actual === "ZH_CN") {
      assert.equal(
        withFixtureWindow(makeFixtureWindow(testCase.fixture), () => checkoutEntryModule.isDesktopPgWindow()),
        true,
        `[${testCase.group}] ${testCase.name}: 데스크톱이 아닌데 ZH_CN 이 나왔습니다.`,
      );
    }
  }

  // ⑤ bypass 행위. 🔴 deepEqual 이 아니라 includes 로 본다 — 옵션 추가를 막지 않기 위해서다.
  const bypass = checkoutEntryModule.portoneBypass();
  assert.ok(bypass && typeof bypass === "object", "portoneBypass() 가 객체를 돌려주지 않습니다.");
  const reserved = bypass.inicis_v2 && bypass.inicis_v2.P_RESERVED;
  assert.ok(Array.isArray(reserved), "portoneBypass().inicis_v2.P_RESERVED 는 배열이어야 합니다 — 이니시스가 그 자리에 KEY=VALUE 목록을 받습니다.");
  assert.ok(
    reserved.includes(INICIS_BYPASS_OPTION),
    `P_RESERVED 에 ${INICIS_BYPASS_OPTION} 가 없습니다 — 해외카드 특약이 승인돼도 모바일 결제창에 해외카드 탭이 안 뜹니다.`,
  );
  for (const option of reserved) {
    assert.ok(
      /^[A-Za-z0-9_]+=[^=]*$/.test(String(option)),
      `P_RESERVED 원소 ${JSON.stringify(option)} 가 KEY=VALUE 꼴이 아닙니다.`,
    );
  }

  // ⑥ 🔴 채널 격리. 셸·독립·이용권 상점은 사용자가 다른 PG 를 고를 수 있고, 그 채널에
  //    inicis_v2 키를 실었을 때의 동작은 미문서다 — 거절이라면 결제창이 아예 안 뜬다.
  //    방어가 조용히 사라지는 것을 막기 위해 '같은 표현식 안'을 고정한다.
  //    🔴 lib/payment/portone.ts 는 여기 없다 — 그 경로는 수단 선택이 없어 항상 이니시스 채널이다.
  for (const [label, source, marker] of [
    ["index.html", indexSource, "directPayFields.channelKeyName ? null : _cdPortoneBypass()"],
    ["js/destiny-profile.js", destinyProfileSource, "directPayFields.channelKeyName ? null : _dpPortoneBypass()"],
    ["app/points/PointsClient.tsx", pointsClientSource, "directPayFields.channelKeyName ? null : checkoutEntry.portoneBypass()"],
  ]) {
    assertContains(
      source,
      marker,
      `${label}: 이니시스 bypass 는 이니시스 채널일 때만 붙어야 한다 — 비-이니시스 채널의 동작은 미문서이고 최악은 결제창 미노출이다`,
    );
  }
}

/** `function name(` 부터 중괄호 균형으로 본문을 잘라낸다. 이름 grep 으로 판단하지 않기 위해서다. */
function sliceFunctionBody(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${marker} 를 찾지 못했습니다`);
  let depth = 0;
  let started = false;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "{") { depth += 1; started = true; }
    else if (source[i] === "}") { depth -= 1; if (started && depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`${marker}: 중괄호 균형이 맞지 않습니다`);
}

// 🔴 SDK 로더 영구 행 회귀 가드 (2026-08-01)
// script 의 load/error 는 한 번만 발화한다. 로더가 **이미 끝난** 태그를 물려받아 리스너만 붙이면
// 영영 resolve 도 reject 도 하지 않고, await 뒤의 requestPayment 에 도달하지 못해 PG 결제창이
// 아예 안 뜬다(예외가 아니라서 콘솔에도 흔적이 없다). 실측: 12초 무반응 + CDN 재요청 0회.
// 방아쇠는 로더가 두 벌이었던 것 — 예열 함수가 자기 <script> 를 따로 주입하고 promise 는 남기지
// 않아, 그 태그가 실패하면 본 로더가 죽은 태그를 상속했다. 셸·dp 양쪽에 같은 규율을 고정한다.
function runPortOneSdkLoaderResilienceTests() {
  for (const [label, source, loaderName] of [
    ["index.html", indexSource, "_cdLoadPortOneV2Sdk"],
    ["js/destiny-profile.js", destinyProfileSource, "_dpLoadPortOneV2Sdk"],
  ]) {
    const loader = stripComments(sliceFunction(source, `function ${loaderName}(`, `${label} ${loaderName}`));
    // ① 상한이 있어야 이미 발화가 끝난 태그를 물려받아도 빠져나온다.
    assert.ok(
      /setTimeout\(/.test(loader),
      `${label}: ${loaderName} must bound the wait — a settled <script> never fires load/error again`,
    );
    // ② 실패한 태그를 걷어내야 다음 시도가 실제로 새 요청을 낸다(제거 없이는 재시도가 무의미).
    assert.ok(
      /removeChild\(|\.remove\(\)/.test(loader),
      `${label}: ${loaderName} must drop the dead <script> so a retry actually re-requests the SDK`,
    );
    // ③ 이중 해결 방지.
    assert.ok(
      /settled/.test(loader),
      `${label}: ${loaderName} must guard against double settle`,
    );
  }
  // ④ 셸의 예열은 자기 <script> 를 따로 붙이지 않고 공용 로더 하나를 거친다.
  const warm = stripComments(sliceFunction(indexSource, "function _cdWarmPortOneV2Sdk(", "index.html _cdWarmPortOneV2Sdk"));
  assert.ok(
    !/createElement\('script'\)/.test(warm),
    "index.html: _cdWarmPortOneV2Sdk must not inject its own <script> — it orphaned a tag the loader then inherited",
  );
  assert.ok(
    /_cdPortOneV2SdkPromise\(\)/.test(warm),
    "index.html: _cdWarmPortOneV2Sdk must warm through the shared loader promise",
  );
  // ⑤ 공용 promise 는 실패 시 캐시에서 버려야 재시도가 같은 실패를 재사용하지 않는다.
  const shared = stripComments(sliceFunction(indexSource, "function _cdPortOneV2SdkPromise(", "index.html _cdPortOneV2SdkPromise"));
  assert.ok(
    /__cdPortOneV2PreloadPromise = null/.test(shared),
    "index.html: _cdPortOneV2SdkPromise must evict a rejected promise from the cache",
  );
}

// 🔴 "React·독립 정적에서 단건결제 클릭 시 PG창이 안 뜬다" 회귀 가드 (2026-08-10)
// 정적 셸(index.html)은 되는데 React·독립 정적 페이지(둘 다 js/destiny-profile.js 를 결제 런타임으로
// 공유한다)만 안 되는 신고의 근본 원인 3가지를 고정한다:
//   ① destiny-profile.js 의 _cdRunDirectKrwCheckout 은 PortOne SDK 로드 실패 시 재시도가 없었다
//      (셸은 1회 재시도). 네트워크 히컵 한 번에 React·독립 정적 사용자만 결제가 즉시 중단됐다.
//   ② React 자체 결제수단 선택 모달(openReactPaymentChoiceModalInner)은 셸의 _cdOpenPaidServiceGate
//      가 선택창을 열기 직전에 거는 SDK 예열을 타지 않아, SDK 다운로드가 클릭 시점에 콜드 스타트됐다.
//   ③ billing-client.ts 의 loadPaidServiceRuntimeGate 가 destiny-profile.js(~400KB) 스크립트 로드를
//      1200ms 하드 타임아웃으로 기다렸다 — 첫 로드·모바일에서 정상 진행 중인 로드도 실패로 오판해
//      결제 게이트를 재시도 없이 영구 unavailable 로 확정시켰다(PG창이 아예 안 뜨는 채로 표면화).
function runReactSdkPreloadAndRetryTests() {
  const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");

  // ① 셸과 destiny-profile.js 양쪽 다 같은 자리(SDK 프리로드 await)에서 1회 재시도해야 한다.
  for (const [label, source, fnMarker] of [
    ["index.html", indexSource, "async function _cdRunDirectKrwCheckout(options) {"],
    ["js/destiny-profile.js", destinyProfileSource, "window._cdRunDirectKrwCheckout = async function(options) {"],
  ]) {
    const fnBody = stripComments(sliceFunction(source, fnMarker, `${label} direct checkout`));
    // 🔴 인자는 허용한다 — 2026-08-16 부터 재시도는 **남은 예산**을 받는다. 두 시도가 각자 8초 상한을
    // 따로 걸면 최악 16초가 클릭→결제창 구간에 얹혔다. 고정하는 계약은 "재시도가 1회 있다"이지
    // "인자가 없다"가 아니다. 재시도 자체가 사라지면 여기서 다시 걸린다.
    assert.ok(
      /catch\s*\([^)]*\)\s*\{\s*await\s+_(?:cd|dp)PortOneV2SdkPromise\([^;]*\);/.test(fnBody),
      `${label}: direct checkout must retry the PortOne SDK load once on failure (no silent hard-fail on a single network hiccup)`,
    );
  }

  // ② React 선택 모달은 destiny-profile.js 가 노출하는 예열 트리거를, 모달이 열리는 시점에 불러야
  // 한다(셸의 _cdOpenPaidServiceGate 와 같은 타이밍). 트리거 자체도 노출돼 있어야 React 가 부를 수 있다.
  assertContains(destinyProfileSource, "window.__cdPreloadPortOneV2Sdk = window.__cdPreloadPortOneV2Sdk || _dpPreloadPortOneV2Sdk;", "destiny-profile.js must expose the SDK preload trigger for React (구현을 세 벌 두지 않는다 — __cdShowPassCheckWaitOverlay 와 동일 관례)");
  const choiceModalBody = sliceFunction(billingClientSource, "async function openReactPaymentChoiceModalInner(options: Record<string, unknown>): Promise<PaymentChoiceMode> {", "React payment choice modal");
  assertContains(choiceModalBody, "__cdPreloadPortOneV2Sdk", "React choice modal must trigger the SDK preload when it opens (parity with the shell's pre-choice warm-up)");

  // ③ 런타임 게이트 스크립트 로더는 destiny-profile.js 급(~400KB) 자산에 맞는 예산을 쓰고, 실패는
  // SDK 프리로드 캐시와 같은 자기치유 패턴(캐시 evict)을 따라야 한다.
  const loaderBody = sliceFunction(billingClientSource, "export function loadPaidServiceRuntimeGate(): Promise<PaidServiceRuntimeGate | null> {", "React runtime gate loader");
  assertNotContains(loaderBody, "setTimeout(finish, 1200)", "runtime gate loader must not use a 1200ms hard cutoff for a ~400KB script (this regressed the React/standalone PG-window bug)");
  assert.ok(/setTimeout\(finish,\s*8000\)/.test(loaderBody), "runtime gate loader timeout should match the PortOne SDK loader's 8s budget instead of an arbitrary short cutoff");
  assert.ok(/paidServiceRuntimePromise\s*=\s*null/.test(loaderBody), "runtime gate loader must evict a failed attempt from its cache (self-heal), mirroring the SDK preload cache eviction");
}

// 🔴 "단건결제를 눌렀는데 PG창 앞에 또 다른 화면이 뜬다" 회귀 가드 (2026-07)
// 세 증상이 각각 다른 원인이었다: ① 셸 캐시 새니타이저가 결제용 휴대폰 번호를 화이트리스트에서
// 빠뜨려 이미 입력한 번호를 매번 다시 물었다(그리고 dp 가 저장한 번호까지 덮어 지웠다) ② 이용권
// 선검사가 '미커버'로 끝난 직후 readyToPay/loadingProducts 게이트 상태를 emit 해 '선택 대기 /
// 결제 상품 보기' 패널이 결제수단 모달·번호 입력창을 덮었다 ③ 단건을 고른 뒤 PG창이 열리기 전에
// paymentPreparing 대기 오버레이를 띄웠고, access_check.single("단건으로 카드 결제를 준비 중이에요")
// 카피가 접근 확인 단계에 물려 있었다.
function runInstantPgWindowTests() {
  // ① 🔴 정책 정정(2026-08-11): 결제용 번호를 fortune_auth_user 로컬스토리지에 평문 캐시하던
  // 관행을 PII 노출 경로로 보고 폐지했다(셸·dp·React 새니타이저 세 곳 모두, 아래 carry-forward
  // 되살림 로직 포함). 이 캐시가 없어도 결제창이 막히지 않는 이유: GET /api/me/payment-phone 이
  // 항상 1차 소스이고(_cdGetPaymentPhoneStatus), 그게 실패했을 때만(checked!==true) 재입력
  // 모달로 폴백한다 — 아래 read-side 단언들은 그대로 유지한다. 알려진 트레이드오프: 서버 조회가
  // 일시적으로 실패하는 드문 경우 재입력 모달이 다시 뜰 수 있다(의도된 동작, 회귀 아님).
  const sanitizerIndex = indexSource.indexOf("function __cdSanitizeAuthUserCache(");
  assert.ok(sanitizerIndex >= 0, "shell auth-user cache sanitizer must exist");
  const sanitizerBody = indexSource.slice(sanitizerIndex, sanitizerIndex + 4000);
  assertNotContains(sanitizerBody, "if (user.phoneNumber) safe.phoneNumber = String(user.phoneNumber);", "shell auth-user cache must not write phoneNumber to localStorage (PII policy 2026-08-11)");
  assertNotContains(sanitizerBody, "if (user.phone) safe.phone = String(user.phone);", "shell auth-user cache must not write phone to localStorage (PII policy 2026-08-11)");
  assertContains(indexSource, "window._cdReadLocalPaymentPhoneNumber = _cdReadLocalPaymentPhoneNumber;", "shell must expose the local payment-phone reader for the dp path");

  // ① dp 는 조회 실패를 '번호 없음'으로 단정하지 않는다.
  // 2026-08-10: 로컬 우선 단축(캐시에 있으면 서버에 안 묻던 동작)은 제거했다 — 로컬 캐시 phoneNumber는
  // 결제 UX 프리필일 뿐 인증/결제 검증의 source of truth가 아니다(개인정보 취급 방침, C1). 서버 값이
  // 진실의 원천이고, 로컬 값은 서버 조회가 실패했을 때만(checked!==true) 폴백으로 쓴다.
  assertContains(destinyProfileSource, "function _dpReadLocalPaymentPhoneNumber()", "dp local payment-phone reader");
  // 대입문 형태가 아니라 조회 호출 자체를 마커로 쓴다 — serverConfirmedNoPhone 단축이 붙으면서
  // `var current = await …` 가 삼항으로 바뀌었지만, 지켜야 할 성질(서버 조회가 로컬 폴백보다 앞)은 같다.
  assertBefore(destinyProfileSource, "await _dpGetPaymentPhoneStatus();", "var fallbackPhone = _dpReadLocalPaymentPhoneNumber();", "dp must confirm with the server before falling back to the cached phone");
  assertContains(destinyProfileSource, "var fallbackPhone = _dpReadLocalPaymentPhoneNumber();", "dp must fall back to the cached phone when the lookup fails (503 must not mean 'no phone')");
  // ① 번호 입력창은 대기 오버레이·게이트 패널을 내린 뒤에 뜬다(가려져서 입력 불가였던 회귀).
  assertContains(destinyProfileSource, "function _dpCloseBlockingLayersBeforePhonePrompt()", "dp must close blocking layers before the phone prompt");
  assertBefore(destinyProfileSource, "_dpCloseBlockingLayersBeforePhonePrompt();", "window._cdPromptDirectCheckoutPhoneNumber()", "dp must close blocking layers before opening the phone prompt");
  assertBefore(indexSource, "if (typeof _cdClosePaidFeatureGate === 'function') _cdClosePaidFeatureGate(); } catch (_) {}", "var overlay = document.createElement('div');", "shell phone prompt must close the gate before rendering its input");

  // ①-b 🔴 정책 정정(2026-08-11): React 새니타이저도 셸·dp 와 대칭으로 phoneNumber/phone 을
  // 더 이상 캐시에 쓰지 않는다(위 PII 정책과 동일 사유). readSanitizedAuthUser 는 계속 서버
  // 조회 실패 시의 최후 폴백으로만 쓰이며, 캐시에 값이 없으면 자연히 다음 폴백 단계로 넘어간다.
  const authStorageSource = readFileSync(resolve(root, "app/_lib/auth-storage.ts"), "utf8");
  assertNotContains(authStorageSource, 'copyString(source, "phoneNumber", safe);', "React auth-user cache must not write phoneNumber to localStorage (PII policy 2026-08-11)");
  assertNotContains(authStorageSource, 'copyString(source, "phone", safe);', "React auth-user cache must not write phone to localStorage (PII policy 2026-08-11)");

  // 조회 실패(401/503/쿨다운)를 '번호 없음'으로 세탁하지 않는다 — 확정 미보유일 때만 입력창을 띄운다.
  assertContains(indexSource, "savedState.checked = true;", "shell payment-phone lookup must mark a definitive answer");
  assertContains(indexSource, "if (current && current.checked !== true) {", "shell must not treat a failed payment-phone lookup as 'no phone'");
  assertContains(destinyProfileSource, "state.checked = true;", "dp payment-phone lookup must mark a definitive answer");
  assertContains(destinyProfileSource, "if (current && current.checked !== true) {", "dp must not treat a failed payment-phone lookup as 'no phone'");

  // 🔴 정책 정정(2026-08-11): degraded 응답에서 이전 캐시의 phoneNumber 를 되살리던 carry-forward
  // 로직도 함께 제거했다 — 되살릴 "이전 캐시값" 자체가 더 이상 존재하지 않는다(위 PII 정책).
  assertNotContains(indexSource, "if (!safe.phoneNumber && previousUser && previousUser.phoneNumber) safe.phoneNumber = String(previousUser.phoneNumber);", "shell auth-cache write must not carry a cached phone forward (PII policy 2026-08-11 retired this cache)");

  // 이용권(구독) 주문 응답도 저장된 번호를 실어 보낸다 → 결제 직전 번호 조회 왕복 자체가 사라진다.
  // await 인 이유는 저장된 번호가 암호화 봉투일 수 있어 복호화가 필요하기 때문이다(worker/lib/pii-crypto.js).
  assertContains(paymentsRouteSource, "const orderCustomer = await buildSinglePaymentCustomer(currentUser, auth.userId, env);", "membership-pass order must carry the saved customer phone");
  assertContains(destinyProfileSource, "orderCustomer.phoneNumber,", "dp must read the server-supplied order.customer phone");

  // ②-b 🔴 "이미 저장된 번호가 있으면 결제 때 다시 묻지 않는다"를 성질로 고정한다.
  // 성립 조건은 두 가지뿐이다: ⓐ 주문 응답의 order.customer.phoneNumber 를 **가장 먼저** 본다
  // ⓑ payment-phone 조회/입력 모달은 그게 비었을 때(if (!customerPhone))에만 돈다.
  // 후보 배열 맨 앞에서 orderCustomer 가 빠지거나 ensure 가 조건 밖으로 나오면, 번호를 가진
  // 사용자에게도 매 결제마다 왕복 1회 + 입력창이 붙는다(2026-08 이전의 실제 증상).
  // 🔴 호출 형태가 아니라 **함수 이름**으로 찾는다. 예전에는 `…PaymentPhoneNumber();` 를 리터럴로
  // 박아 뒀는데, 인자 하나(serverConfirmedNoPhone)를 넘기는 순간 마커가 통째로 안 맞아 가드가
  // "폴백이 사라졌다"고 오탐했다. 여기서 지키려는 성질은 인자 유무가 아니라 호출 위치다.
  for (const [label, source, ensureCall] of [
    ["shell", indexSource, /await _cdEnsureDirectCheckoutPaymentPhoneNumber\(/],
    ["dp", destinyProfileSource, /await _dpEnsurePaymentPhoneNumber\(/],
  ]) {
    const resolverIndex = source.indexOf("customerPhone = ");
    assert.ok(resolverIndex >= 0, `${label} must resolve a customer phone before requesting payment`);
    const firstCandidate = source.slice(resolverIndex, source.indexOf("]", resolverIndex));
    assert.ok(
      /customerPhone = [^;]*?orderCustomer\.phoneNumber/s.test(firstCandidate),
      `${label} must read order.customer.phoneNumber before any other phone source`,
    );
    const ensureIndex = source.search(ensureCall);
    assert.ok(ensureIndex > 0, `${label} must keep its payment-phone fallback: ${ensureCall}`);
    // 폴백 호출 앞 400자 안에 "번호가 없을 때만" 가드가 있어야 한다(설명 주석이 사이에 들어간다).
    assert.ok(
      /if \(!customerPhone\)/.test(source.slice(Math.max(0, ensureIndex - 400), ensureIndex)),
      `${label} must only look up / prompt for a phone when the order carried none`,
    );
  }
  // ②-c 🔴 GET 을 건너뛰는 단축(serverConfirmedNoPhone)의 **근거**를 고정한다.
  // 이 플래그는 "서버가 이 사용자의 User 문서를 실제로 읽었다"는 증거에서만 나와야 한다 —
  // 그 증거가 order.customer.email 이다(buildLegacyPrepareCustomer 만 채우고, 못 읽으면 prepare 가
  // 통째로 실패한다). true 로 굳히거나 "customer 객체가 있으면"으로 느슨하게 바꾸면, customer 를
  // 안 싣는 응답에서도 조회를 건너뛰어 **번호가 있는 사용자에게 입력창이 뜬다**.
  // 셸·dp 는 이름 있는 옵션으로, points 는 4번째 위치 인자로 넘긴다 — 넘기는 **식**을 각각 고정한다.
  for (const [label, source, evidence] of [
    ["shell", indexSource, /serverConfirmedNoPhone:\s*Boolean\(orderCustomer && orderCustomer\.email\)/],
    ["dp", destinyProfileSource, /serverConfirmedNoPhone:\s*Boolean\(orderCustomer && orderCustomer\.email\)/],
    [
      "points",
      readFileSync(resolve(root, "app/points/PointsClient.tsx"), "utf8"),
      /ensurePaymentPhoneNumber\(apiBase, authUser, null, Boolean\(order\.customer\?\.email\)\)/,
    ],
  ]) {
    assert.ok(
      evidence.test(source),
      `${label} must derive the payment-phone lookup shortcut from the order customer email, not a constant`,
    );
    assert.ok(
      !/serverConfirmedNoPhone:\s*true/.test(source),
      `${label} must not hard-code the payment-phone lookup shortcut to true`,
    );
  }

  // React 상점 경로도 같은 순서다 — prepare 응답 번호를 먼저 쓰고, 없을 때만 ensure 로 내려간다.
  assertContains(
    readFileSync(resolve(root, "app/points/PointsClient.tsx"), "utf8"),
    'normalizePaymentPhoneNumber(order.customer?.phoneNumber || "")',
    "points checkout must prefer the phone the prepare response already carried",
  );

  // ③ 🔴 규칙 정정(2026-07): 예전 규칙은 "클릭~PG창 사이 오버레이 0"이었다. 그 구간이 완전히 비어
  // 무반응으로 보이자 사용자가 규칙을 뒤집었다 — 이제 그 구간은 **꽃돼지 'card' 오버레이 하나로만**
  // 채운다(다른 문구가 끼어드는 것은 계속 금지). 억제 창은 유지하되 우리 호출만 통과시킨다.
  // 선택 시점의 paymentPreparing emit 은 계속 없는 상태로 둔다 — 구간 오버레이의 주인은 체크아웃 함수다.
  assertNotContains(indexSource, "updateSharedPaidGate('paymentPreparing'", "the choice-time paymentPreparing emit stays removed (the gap overlay is owned by the checkout function)");
  assertContains(indexSource, "function _cdBeginDirectPgWindowSuppression()", "direct-PG wait-UI suppression window");
  assertContains(indexSource, "function _cdEndDirectPgWindowSuppression()", "direct-PG wait-UI suppression release");
  // 이 조건은 _cdSetCoinGateOverlay 본문에서 공용 판정 _cdPaymentWaitUiBlocked 안으로 옮겨졌다
  // (React 가 셸 렌더러를 갈아치울 때 본문 안 검사가 통째로 우회되던 문제 때문). 판정 내용은 동일하다.
  assertContains(indexSource, "if (_cdDirectPgWindowSuppressedMode(mode)) return true;", "overlay must honour the direct-PG suppression window");
  assertContains(indexSource, "if (_cdDirectPgWindowSuppressedStatus(status)) return;", "paid-feature gate must honour the direct-PG suppression window");
  assertBefore(indexSource, "_cdBeginDirectPgWindowSuppression();", "_cdEndDirectPgWindowSuppression();", "suppression must begin before it is released");
  // 🔴 규칙 정정(2026-07-31): 예전 규칙은 "PG 호출 직전에 억제를 푼다"였다. 그러면 결제창이 떠 있는
  // 동안 억제가 꺼져 있어, 어떤 소스든 대기 오버레이를 켜면 그대로 결제창을 덮었다(실제 증상).
  // 이제 PG 호출 직전에 상한을 **다시 장전**하고(준비 구간용 45초로는 카드 인증 시간을 못 덮는다),
  // requestPayment 가 반환된 뒤 finally 에서 푼다.
  assertContains(indexSource, "function _cdExtendDirectPgWindowSuppression()", "direct-PG suppression must be re-armed for the PG window itself");
  assertBefore(indexSource, "_cdExtendDirectPgWindowSuppression();", "rsp = await window.PortOne.requestPayment(requestData);", "suppression must be re-armed before the PG window renders");
  assertBefore(indexSource, "rsp = await window.PortOne.requestPayment(requestData);", "      _cdEndDirectPgWindowSuppression();\n    }", "suppression must be released only after the PG window closes");

  // ③ 접근 확인 단계에 단건/카드 카피를 붙이지 않는다.
  assertNotContains(indexSource, "_cdLoadingMessage('access_check', 'single')", "access-check copy must not claim a card checkout is being prepared");

  // ② 미커버 확정 후에는 게이트 상태를 emit 하지 않고, 결제수단 모달 직전에는 게이트를 닫는다.
  const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
  assertNotContains(billingClientSource, 'status: "readyToPay"', "uncovered pass check must not open the paid-feature gate panel before the payment choice");
  assertNotContains(billingClientSource, 'status: "loadingProducts"', "uncovered pass check must not raise a second wait screen before the payment choice");
  assertContains(billingClientSource, 'emitPaidFeatureGate("close", {', "gate must be closed before the payment-choice modal opens");
  assertBefore(billingClientSource, 'emitPaidFeatureGate("close", {', "const runtimePaymentResult = await runPaidServiceRuntimePayment(input, {", "gate close must precede the runtime payment (choice modal) step");
  // 커버된 경우(무료 통과)의 피드백은 반드시 남아 있어야 한다.
  assertContains(billingClientSource, 'const eligibilityStatus: PaidFeatureGateRuntimeStatus = "hasEntitlement";', "covered pass check must still report hasEntitlement");
}

// 🔴 "PG 결제창이 느리게 뜬다" 회귀 가드 (2026-07, 2026-07 재작성)
//
// 예전 설계는 유료 클릭 시점에 서버로 이용권을 선검사했고(coin-gate 왕복 + 6초 예산 + 재시도 2회),
// 스냅샷이 '미커버'를 확답할 때만 그 대기를 건너뛰었다. 스냅샷 none TTL 이 60초라 진입 1분 뒤의
// 클릭은 대부분 다시 차단형 왕복을 탔고, 그게 곧 결제창이 늦게 뜨는 원인이었다.
//
// 지금은 **진입 경로에 서버 왕복이 아예 없다**. 스냅샷이 커버/미커버를 확답하면 그대로 쓰고,
// 확답하지 못하면 기다리지 않고 결제창을 연다(snapshotVerdictOnly). 이용권 확인은 결제창의
// '이용권으로 구매' 카드가 수행하며 단건 선택은 PortOne 경로를 그대로 따른다.
function runInstantPgLatencyTests() {
  // ① 스냅샷 즉답 판정은 _cdCoverageFromSubscriptionSnapshot 하나만 근거로 쓴다.
  //    (pending 결제까지 받아주는 _cdBuildFastMembershipCoverage 는 판정 근거로 부적합하다.)
  const fastPathIndex = indexSource.indexOf("if (item.allowSnapshotFastPath === true && !isBackgroundPassRecord");
  assert.ok(fastPathIndex >= 0, "snapshot fast-path verdict block");
  const verdictBody = indexSource.slice(fastPathIndex, fastPathIndex + 1800);
  assertContains(verdictBody, "_cdCoverageFromSubscriptionSnapshot(coinCost", "verdict must rely on the server-populated subscription snapshot");
  // 호출만 금지한다 — 블록 안 주석이 이 이름을 '쓰면 안 되는 근거'로 언급하고 있어 이름 자체는 남는다.
  assertNotContains(verdictBody, "_cdBuildFastMembershipCoverage(", "verdict must not use the pending-tolerant fast coverage builder");
  // ①-b 만료된 '미보유' 스냅샷도 판정에 쓴다(stale-while-revalidate). 이게 빠지면 이용권이 없는
  // 사용자가 60초마다 차단형 서버 왕복으로 되돌아가고, 그게 정확히 이 가드가 막으려던 지연이다.
  assertContains(verdictBody, "allowStaleNone: true", "verdict must accept a stale 'none' snapshot (SWR) instead of blocking on the server");
  // ①-c 커버 확답이면 낙관 통과(서버 기록은 백그라운드). 이 분기가 이용권 보유자의 무료 즉시 실행이다.
  // featureKey 를 함께 넘긴다 — 월 한도 402 가 왔을 때 백그라운드 기록 함수가 그 기능의 낙관 잠금해제를
  // 되돌려야 하기 때문이다(PR B, 2026-09-03). item 에 featureKey 가 없는 호출부가 있어 해석값을 덧붙인다.
  assertContains(verdictBody, "_cdRecordMembershipPassInBackground(Object.assign({}, item, { featureKey: featureKey || item.featureKey }), coinCost, requestId);", "covered snapshot must grant optimistically and record in the background");
  assertContains(indexSource, "return status === 'payment_required' || status === 'already_unlocked' || status === 'pass_applied';", "pass-applied snapshot prechecks must be cached during the short precheck window");
  assertContains(indexSource, "if (cachedStatus === 'pass_applied') return false;", "cached pass-applied prechecks must not be force-refreshed into intermittent 503 failures");

  // ② 진입 경로에는 서버 왕복이 없다 — 스냅샷 fast-path 를 켠 **모든** 진입점이 snapshotVerdictOnly 도 켠다.
  //    🔴 예전에는 파일 전체에서 "snapshotVerdictOnly: true," 개수가 2 이상인지만 셌다. 정본 진입점 2곳
  //    (_cdOpenPaidServiceGate, _cdResolvePassBeforePaymentChoice)만 통과하면 나머지가 플래그를 빠뜨려도
  //    통과했고, 실제로 레거시 진입점 3곳(유료 섹션 해제·메인 타일 per-use·타일 잠금)이 빠져 있어
  //    첫 방문·새 기기·스냅샷 만료 상태의 유료 클릭이 전부 coin-gate 왕복을 강제했다(2026-08-10 발견).
  //    개수가 아니라 지점별로 센다.
  assertContains(indexSource, "snapshotVerdictOnly: true", "entry pass check must be snapshot-only");
  const snapshotFastPathOffsets = [];
  for (
    let cursor = indexSource.indexOf("allowSnapshotFastPath: true");
    cursor >= 0;
    cursor = indexSource.indexOf("allowSnapshotFastPath: true", cursor + 1)
  ) {
    snapshotFastPathOffsets.push(cursor);
  }
  assert.ok(
    snapshotFastPathOffsets.length >= 5,
    `expected at least 5 snapshot fast-path entry points, found ${snapshotFastPathOffsets.length}`,
  );
  for (const offset of snapshotFastPathOffsets) {
    // 옵션 객체는 리터럴 하나이고 snapshotVerdictOnly 는 항상 allowSnapshotFastPath 뒤에 온다.
    // 앞쪽을 보지 않으므로 인접한 다른 호출부의 플래그를 잘못 집어오지 않는다.
    const optionTail = indexSource.slice(offset, offset + 700);
    assert.ok(
      optionTail.includes("snapshotVerdictOnly: true"),
      `every snapshot fast-path entry point must also opt into snapshotVerdictOnly (offset ${offset})`,
    );
  }
  assertContains(
    indexSource,
    "if (item.snapshotVerdictOnly === true && !isBackgroundPassRecord) {",
    "indeterminate snapshot must open the checkout instead of asking the server",
  );
  // ③ 이용권 확인에는 꽃돼지 대기 UI를 보이되, 단건 결제 대기 화면으로 바뀌어서는 안 된다.
  assertContains(indexSource, "suppressWaitUi: false", "entry gate must show the pass-checking wait screen");
  assertContains(indexSource, "if (opts.suppressWaitUi !== true) {", "paid-feature gate must honour suppressWaitUi");
  assertContains(indexSource, "_cdBeginPaidFeatureInFlight(paidGateAction, featureKey, {", "duplicate-click guard must stay in place");
  assertContains(indexSource, "var allowDirectCheckoutAccessBypass = opts.allowServerAccessBypass === true && opts.forceDirectPayment !== true;", "direct single-payment checkout must reject access bypass by default");
  assertContains(indexSource, "if (!order.merchantUid && allowDirectCheckoutAccessBypass && _cdIsCheckoutAccessBypass", "direct single-payment checkout must not complete from a pass snapshot without a PG order");
  // ④ 되살아나면 안 되는 것: 선검사 예산·느림 안내·재시도. 전부 서버 왕복이 있을 때만 의미가 있었다.
  assertNotContains(indexSource, "CD_PASS_FIRST_BUDGET_MS", "entry pass check must not reintroduce a server-round-trip budget");
  assertNotContains(indexSource, "CD_PASS_SLOW_NOTE", "entry pass check must not reintroduce the slow-server notice");

  // ② 예열은 진입 1회로 끝나지 않는다(유휴 + 의도).
  assertContains(indexSource, "var _cdWarmSubscriptionSnapshotIfMissing = function(reason) {", "snapshot warm-up helper");
  assertContains(indexSource, "_cdWarmSubscriptionSnapshotIfMissing('idle')", "snapshot must be re-warmed on idle");
  assertContains(indexSource, "_cdWarmSubscriptionSnapshotIfMissing('intent')", "snapshot must be re-warmed on pointer intent");
  // 중첩 금지: 예열은 기존 3중 억제를 갖춘 함수를 그대로 부른다(새 쿨다운/새 dedup 금지).
  const warmIndex = indexSource.indexOf("var _cdWarmSubscriptionSnapshotIfMissing = function(reason) {");
  // 헬퍼 본문만 잘라서 본다. 넉넉히 슬라이스하면 뒤따르는 requestIdleCallback 폴백(setTimeout)까지
  // 잡혀 오탐이 난다 — 그 setTimeout 은 쿨다운이 아니라 유휴 스케줄링 폴백이다.
  const warmBody = indexSource.slice(warmIndex, indexSource.indexOf("\n    };", warmIndex));
  assertContains(warmBody, "_cdRefreshSubscriptionSnapshotFromServer({ force: false, reason: reason })", "warm-up must reuse the deduped refresh helper");
  assertContains(warmBody, "_cdReadSubscriptionSnapshot()", "warm-up must skip when a snapshot is already cached");
  assertNotContains(warmBody, "setTimeout", "warm-up must not add its own cooldown timer on top of the existing three suppressors");

  // ③ dp 경로도 PG창 앞에 '단건 결제를 진행 중입니다' 오버레이를 띄우지 않는다.
  assertNotContains(destinyProfileSource, "' 단건 결제를 진행 중입니다.', 'card'", "dp must not raise a wait overlay right before the PG window opens");
}

// 🔴 "단건결제 클릭 후 아무 UI가 없다 / 결제창과 오버레이가 겹친다" 회귀 가드 (2026-07)
// 규칙이 두 번 뒤집혔으므로 현재 규칙을 명시적으로 고정한다:
//   ⓐ 클릭~PG창 구간은 **꽃돼지 'card' 오버레이 하나**로 채운다(빈 화면 금지).
//   ⓑ 결제수단 선택 모달이 떠 있는 동안에는 진행 오버레이를 띄우지 않는다(겹침 금지).
//   ⓒ 그 오버레이는 PG창 렌더 **직전**에 내린다(PG창 가림 금지).
//   ⓓ 모달 안에 스피너·단계 문구·진행 핸들을 다시 넣지 않는다(볼품없다는 지적으로 폐기된 접근).
function runDirectPgOverlayTests() {
  const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");

  // ⓐ 구간을 채우는 오버레이 배선
  assertContains(indexSource, "function _cdShowDirectPgWaitOverlay()", "shell gap overlay helper");
  assertContains(indexSource, "function _cdHideDirectPgWaitOverlay()", "shell gap overlay release helper");
  assertContains(indexSource, "_cdSetCoinGateOverlay(true, '', 'card')", "gap overlay must use the canonical mode 'card' copy");
  assertContains(indexSource, "_cdShowDirectPgWaitOverlay();", "shell must fill the click→PG gap with the overlay");
  // 억제 창을 우회하는 통로는 이 헬퍼 하나뿐이어야 한다.
  assertContains(indexSource, "if (_cdDirectPgAllowOwnOverlay) return false;", "only the gap overlay helper may bypass the suppression window");
  // dp(독립 정적 페이지·App Router React 경로)도 같은 구간을 채운다.
  assertContains(destinyProfileSource, "_dpSetPaymentPending(true, '', 'card');", "dp must fill the click→PG gap with the overlay");
  assertContains(destinyProfileSource, "_dpSetStandalonePaymentOverlay(!!show, text, mode);", "dp standalone overlay must receive the mode (otherwise it shows the pass-check copy)");

  // ⓑ 결제창과 동시 노출 금지
  assertContains(indexSource, "function _cdPaymentChoiceModalOpen()", "payment-choice-modal probe");
  assertContains(indexSource, "document.querySelector('.cd-direct-payment-modal')", "probe must detect any of the three renderers' modal");
  // 이 조건도 공용 판정 _cdPaymentWaitUiBlocked 안으로 옮겨졌다(React 가 셸 렌더러를 갈아치우면
  // 본문 안 검사가 우회되기 때문). 셸·dp·React 세 렌더러가 이제 같은 함수를 본다.
  assertContains(
    indexSource,
    "if (_cdPaymentChoiceModalOpen() && !CD_DIRECT_PG_TERMINAL_MODE_RE.test(String(mode || ''))) return true;",
    "no progress overlay may be shown while the payment-choice modal is open",
  );

  // ⓒ 🔴 규칙 정정(2026-07-31): 예전 규칙은 "PG창 직전에 내린다"였다. 그런데 requestPayment 를 부른
  // 뒤 PG SDK 가 결제창을 그릴 때까지 1~3초가 그대로 **빈 화면**이 되어 "결제창이 안 뜬다"로 보였고,
  // 타이밍이 어긋나면 반대로 결제창을 덮었다. 이제 이 오버레이만 PG 결제창(body 직속
  // #imp-iframe-wrapper, z-index:99999 — Playwright 실측) **아래**(99998)에 깔아 결제창이 뜨는
  // 순간 자연히 덮이게 하고, 내리는 것은 requestPayment 가 끝난 뒤 한 번만 한다.
  assertContains(indexSource, "overlay.style.zIndex = copy.mode === 'card' ? '99998' : '2147483647';", "the gap overlay must sit *below* the PG window instead of being timed against it");
  assertBefore(indexSource, "rsp = await window.PortOne.requestPayment(requestData);", "      _cdHideDirectPgWaitOverlay();", "gap overlay must be released only after the PG window closes");
  assertContains(indexSource, "Promise.resolve(_cdRunDirectKrwCheckoutCore(opts)).catch(function(_cdDirectCheckoutError) {", "gap overlay must be cleared when the checkout fails");

  // ⓔ PG 결제창을 덮는 body 직속 fixed UI(쿠키 배너·테마 스위치)를 결제창이 열려 있는 동안 물린다.
  // 실측: 결제창 하단에서 elementsFromPoint 가 .cd-cookie-consent__actions 를 맨 앞으로 돌려줬다.
  assertContains(indexSource, "body.cd-direct-pg-open #cdCookieConsent,", "cookie banner must be suppressed while the PG window is open");
  assertContains(indexSource, "body:has(> #imp-iframe-wrapper) #cdCookieConsent,", "renderer-agnostic net: PG window presence must suppress the cookie banner");
  assertContains(indexSource, "body.cd-direct-pg-open .theme-switch-wrapper,", "theme switch (inline z-index !important) must be suppressed while the PG window is open");
  assertContains(indexSource, "document.body.classList.toggle('cd-direct-pg-open', !!isOpen);", "the suppression window must mirror itself onto body for the CSS above");

  // ⓓ 폐기된 '모달 제자리 진행 표시'가 다시 들어오지 않게 막는다
  for (const [label, source] of [["index.html", indexSource], ["app/_lib/billing-client.ts", billingClientSource], ["js/destiny-profile.js", destinyProfileSource]]) {
    assertNotContains(source, "__cdPaymentChoiceProgress", `${label}: the in-modal progress handle approach was dropped (unattractive) — do not reintroduce`);
    assertNotContains(source, "cdDirectPaymentSpin", `${label}: the in-modal option spinner was dropped — do not reintroduce`);
  }
}

// 🔴 "결제창 앞 대기 화면"과 "725KB 꽃돼지가 PG창을 막는다" 회귀 가드 (2026-07)
// ① 그 화면의 진짜 유입구는 React resolvePaymentWaitOverlay 의 access_check.single + mode:"payment"
//    였다(셸 오버레이로 중계됨). 셸 카피만 세 번 고치고 이 분기를 놓쳐 계속 되살아났다.
// ② 오버레이 꽃돼지가 외부 호스트 725KB PNG 였고 CSS 가 [aria-hidden="false"] 로 게이트돼 있어,
//    단건결제 클릭 직후 처음 요청이 나가며 checkout/PortOne SDK 와 대역폭을 다퉜다 →
//    "네트워크 오류 + PG창 미노출". 같은 그림의 로컬 WebP(78KB, 동일 오리진) + 유휴 예열로 바꿨다.
function runPreCheckoutWaitUiAndArtWeightTests() {
  const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");

  const paymentLoadingSource = readFileSync(resolve(root, "app/components/common/PaymentLoading.tsx"), "utf8");
  const paymentContextSource = readFileSync(resolve(root, "app/components/PaymentProcessingContext.tsx"), "utf8");
  const pigVisualSource = readFileSync(resolve(root, "app/components/common/PaymentPigVisual.tsx"), "utf8");

  // ① 접근 확인 단계에서 단건/카드 카피에 도달할 수 없다 — 셸과 React 양쪽.
  assertNotContains(billingClientSource, 'formatLoadingMessage("access_check", "single")', "React access-check copy must not claim a card checkout is being prepared");
  assertContains(indexSource, "if (paymentType === 'single') paymentType = 'pass';", "shell access-check copy must not fall to the card variant");
  assertNotContains(indexSource, "_cdLoadingMessage('access_check', 'single')", "shell must not render the card access-check copy");
  // 🔴 위 리터럴 핀은 **변수 인자 호출을 못 잡는다** — 실제로 checkingEntitlement 분기가
  // formatLoadingMessage("access_check", paymentType) 로 같은 카피를 계속 만들어냈다(#136 이후 잔존).
  // 그래서 구조로 단언한다: React 도 셸과 같은 single→pass 교정을 갖고 있어야 한다.
  assertContains(billingClientSource, 'if (paymentType === "single") paymentType = "pass";', "React access-check branch must coerce single→pass like the shell");
  // 기본값(variant 'payment' · resolvePaymentLoadingType)이 single 로 되돌아가면 mode 가 확정되지 않은
  // 모든 오버레이가 다시 "단건으로 카드 결제를 준비 중이에요" 를 렌더한다.
  assertContains(paymentLoadingSource, 'if (variant === "payment") return { stage: "access_check", paymentType: "pass" };', "React payment variant must not default to the card copy");
  assertContains(paymentContextSource, 'if (variant === "payment") return "pass";', "React payment variant must not default to the single payment type");

  // ② 구간 전면 차단 — 셸이 판정 정본을 세우고, dp·React 가 같은 하나를 본다(구현 세 벌 금지).
  assertContains(indexSource, "function _cdBeginPreCheckoutWaitUiSuppression()", "pre-checkout wait-UI suppression window");
  assertContains(indexSource, "function _cdEndPreCheckoutWaitUiSuppression()", "pre-checkout suppression release");
  // 🔴 판정 정본은 함수 하나로 묶여 export 되어야 한다. 예전에는 세 조건이 _cdSetCoinGateOverlay 본문
  // 안에만 있었고, React Provider 가 그 함수를 자기 렌더러로 갈아치우는 탓에 셋 다 우회돼
  // 결제창 위에 대기 오버레이가 겹쳤다.
  assertContains(indexSource, "function _cdPaymentWaitUiBlocked(mode) {", "wait-UI block verdict must live in one shared function");
  // 2026-08-10: 사용자가 실제로 단건을 고른 뒤(선택창이 닫힌 뒤)에는 같은 진행 화면을 보여주도록
  // 정책이 바뀌었다 — ①②③(고르기 전·선택창 노출 중·PG창 노출 중) 억제는 그대로이므로 정책 변경이
  // 안전하다는 건 pass-wait-overlay.behavior.test.js 가 실행 기반으로 확인한다.
  assertContains(indexSource, "var CD_WAIT_UI_ALLOWED_MODE_RE = /^(pass|monthly|card|", "pass, monthly, and card wait UI must be allowed");
  assertContains(indexSource, "window.__cdPaymentWaitUiBlocked = _cdPaymentWaitUiBlocked;", "block verdict must be shared with dp/React");
  assertContains(indexSource, "if (isOpen && _cdPaymentWaitUiBlocked(mode)) return;", "shell overlay must honour the shared block verdict");
  assertContains(destinyProfileSource, "window.__cdPaymentWaitUiBlocked(mode)) return;", "dp overlay must honour the shared block verdict");
  assertContains(billingClientSource, "runtimeWindow.__cdPaymentWaitUiBlocked?.(overlayMode)) return;", "React bridge must honour the shared block verdict");
  assertContains(paymentContextSource, "if (isPaymentWaitUiBlocked(nextMode)) return;", "React renderer must honour the block verdict it hijacked away from the shell");
  // 차단은 '새로 여는 것'만 막는다 — 이미 열려 있던 오버레이는 결제창이 붙을 때 닫아야 한다.
  // (useCoinGate 가 선검사 때 켠 오버레이가 외곽 finally 까지 살아 결제창 위에 겹쳐 보였다.)
  assert.ok(
    /emitPaymentLoadingState\(false\);\s*\r?\n\s*document\.body\.appendChild\(modal\);/.test(billingClientSource),
    "React choice modal must close the open wait overlay as it mounts",
  );
  // 결제창을 여는 함수 진입에서 세우고, 실제로 붙으면 해제한다.
  assertBefore(indexSource, "_cdBeginPreCheckoutWaitUiSuppression();", "_cdEndPreCheckoutWaitUiSuppression();", "suppression must begin before it is released");
  // 해제는 결제창이 DOM에 붙은 뒤여야 한다. 순서를 리터럴로 고정한다.
  assert.ok(
    /document\.body\.appendChild\(modal\);[\s\S]{0,600}?_cdEndPreCheckoutWaitUiSuppression\(\);/.test(indexSource),
    "suppression must be released only after the choice modal is mounted",
  );
  assert.ok(
    !/_cdEndPreCheckoutWaitUiSuppression\(\);[\s\S]{0,600}?_cdStartDirectCheckoutPrefetch\(/.test(indexSource),
    "order prefetch must never run inside the unguarded gap after suppression is released",
  );

  // ③ 결제 마스코트 자산 경량화: 무거운 외부 PNG 가 CSS 배경으로 남아 있지 않다(img onerror 폴백만 허용).
  // 정본은 메인 서비스 로고이고, head 의 rel=preload fetchpriority=high 덕분에 클릭 시점엔 워엄 캐시다.
  const paymentArt = "/icons/app-logo-512.webp";
  const heavyPig = "https://assets.code-destiny.com/DestinyCafe/nobackground/%EA%BD%83%EB%8F%BC%EC%A7%803-Photoroom.png";
  assertNotContains(indexSource, `background-image: url("${heavyPig}")`, "payment overlay art must not load the 725KB PNG");
  assertNotContains(indexSource, `background-image:url("${heavyPig}")`, "paid-gate sprite must not load the 725KB PNG");
  assertContains(indexSource, `background-image: url("${paymentArt}")`, "payment overlay art must use the preloaded same-origin logo");
  assertContains(indexSource, `background-image:url("${paymentArt}")`, "paid-gate sprite must use the preloaded same-origin logo");
  assertContains(indexSource, '<link rel="preload" as="image" href="/icons/app-logo-512.webp"', "payment art must stay preloaded so the click path costs no network");
  // 🔴 React 쪽에도 같은 규칙이 필요하다 — #136 이 셸 3곳만 고쳐서 React 는 742KB 외부 PNG 를
  // 계속 받고 있었고, 이 누락을 잡아낼 가드가 아예 없었다.
  assertNotContains(pigVisualSource, "nobackground", "React payment art must not point at the heavy R2 cut-out PNG");
  assertNotContains(pigVisualSource, "assets.code-destiny.com", "React payment art must be same-origin");
  assertContains(pigVisualSource, `const PAYMENT_PIG_PUBLIC_PATH = "${paymentArt}";`, "React payment art must use the same preloaded logo as the shell");
  // 클릭 임계경로에서 빼기 위한 예열이 있어야 한다.
  assertContains(indexSource, "var _cdWarmPaymentOverlayArt = function() {", "overlay art must be warmed off the click path");
  assertContains(indexSource, "_cdWarmPaymentOverlayArt();", "overlay art warm-up must be scheduled");
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: order mismatch`);
}

function readPaymentId(payload) {
  return String(payload?.order?.paymentId || payload?.order?.merchantUid || payload?.payment?.merchantUid || "").trim();
}

function parseEnvText(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value.replace(/\\n/g, "\n");
  }
  return parsed;
}

function buildLocalPortOneEnv() {
  const env = {};
  for (const fileName of [".env.local", ".env.cloudflare.local", ".env"]) {
    const filePath = resolve(root, fileName);
    if (!existsSync(filePath)) continue;
    const parsed = parseEnvText(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (env[key]) continue;
      env[key] = value;
    }
  }
  for (const group of portoneAliasGroups) {
    const primary = group[0];
    if (env[primary]) continue;
    for (const key of group.slice(1)) {
      const value = String(env[key] || "").trim();
      if (!value) continue;
      env[primary] = value;
      break;
    }
  }
  return env;
}

function withoutConsoleError(callback) {
  const original = console.error;
  console.error = () => {};
  try {
    return callback();
  } finally {
    console.error = original;
  }
}

function makePayment(overrides = {}) {
  return {
    _id: "pay_1",
    userId: AUTH.userId,
    merchantUid: "cd-single-test-1710000000000-abcd1234",
    impUid: "",
    idempotencyKey: "",
    paymentAmount: 5000,
    expectedChargedPoints: 50,
    chargedPoints: 0,
    featureKey: "section_summary",
    productId: "code-destiny",
    coinPrice: 50,
    membershipCreditCost: 50,
    accessType: "single_purchase",
    pricingSnapshot: {
      profileId: "profile-a",
      selectedProfileId: "profile-a",
      serviceId: "code-destiny",
      contentId: "section_summary",
      contentType: "saju",
      amountKRW: 5000,
    },
    paymentMethod: "CARD",
    status: "pending",
    orderState: "PENDING",
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
    ...overrides,
  };
}

function makePortOnePayment(overrides = {}) {
  return {
    paymentId: "cd-single-test-1710000000000-abcd1234",
    id: "cd-single-test-1710000000000-abcd1234",
    status: "PAID",
    storeId: ENV.PORTONE_STORE_ID,
    amount: { total: 5000, paid: 5000, currency: "KRW" },
    currency: "KRW",
    paidAt: "2026-06-04T00:00:00.000Z",
    method: { type: "CARD" },
    ...overrides,
  };
}

let state;

function resetState() {
  state = {
    createdPayments: [],
    entitlementByKey: new Map(),
    preUnlocked: false,
    userFeaturePulls: [],
    payment: makePayment(),
    portonePayment: makePortOnePayment(),
  };

  ProfileCard.findOne = () => query({ _id: "profile_doc_1", profileId: "profile-a" });
  User.findById = () => query({
    _id: AUTH.userId,
    name: "Tester",
    email: "tester@example.com",
    phoneNumber: "01012345678",
  });
  User.updateOne = async (_criteria = {}, update = {}) => {
    if (update.$pull) state.userFeaturePulls.push(update.$pull);
    return { acknowledged: true, modifiedCount: 1 };
  };
  ContentEntitlement.findOne = (criteria = {}) => {
    if (state.preUnlocked) return query({ _id: "entitlement_existing", ...criteria, unlockedAt: new Date() });
    const key = [
      criteria.userId,
      criteria.profileId,
      criteria.serviceKey,
      criteria.contentKey,
      criteria.scope,
    ].join("|");
    return query(state.entitlementByKey.get(key) || null);
  };
  ContentEntitlement.findOneAndUpdate = (criteria = {}, update = {}) => {
    const key = [
      criteria.userId,
      criteria.profileId,
      criteria.serviceKey,
      criteria.contentKey,
      criteria.scope,
    ].join("|");
    const existing = state.entitlementByKey.get(key);
    const doc = existing || {
      _id: `entitlement_${state.entitlementByKey.size + 1}`,
      ...criteria,
      ...(update.$setOnInsert || {}),
    };
    Object.assign(doc, update.$set || {});
    state.entitlementByKey.set(key, doc);
    return query(doc);
  };
  ContentEntitlement.updateMany = async (_criteria = {}, update = {}) => {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const doc of state.entitlementByKey.values()) {
      const userMatches = !_criteria.userId || String(doc.userId) === String(_criteria.userId);
      const statusMatches = !_criteria.status || String(doc.status) === String(_criteria.status);
      const sourceMatches = !_criteria.source || String(doc.source) === String(_criteria.source);
      const clauseMatches = !Array.isArray(_criteria.$or) || _criteria.$or.some((clause) => {
        if (clause.paymentId?.$in?.includes(doc.paymentId)) return true;
        if (clause.orderId?.$in?.includes(doc.orderId)) return true;
        if (clause.serviceKey && clause.serviceKey !== doc.serviceKey) return false;
        if (clause.profileId && clause.profileId !== doc.profileId) return false;
        if (clause.contentKey?.$in) return clause.contentKey.$in.includes(doc.contentKey);
        return false;
      });
      if (!userMatches || !statusMatches || !sourceMatches || !clauseMatches) continue;
      matchedCount += 1;
      Object.assign(doc, update.$set || {});
      modifiedCount += 1;
    }
    return { acknowledged: true, matchedCount, modifiedCount };
  };
  Payment.create = async (doc) => {
    const created = { _id: `pay_created_${state.createdPayments.length + 1}`, ...doc };
    state.createdPayments.push(created);
    state.payment = { ...state.payment, ...created };
    return created;
  };
  Payment.findOne = (criteria = {}) => {
    if (criteria.merchantUid && criteria.merchantUid !== state.payment.merchantUid) return query(null);
    if (criteria.idempotencyKey) return query(null);
    if (criteria.status?.$in && !criteria.status.$in.includes(state.payment.status)) return query(null);
    return query(state.payment);
  };
  Payment.findById = () => query(state.payment);
  Payment.findOneAndUpdate = (_criteria, update = {}, options = {}) => {
    if (Array.isArray(_criteria?.status?.$nin) && _criteria.status.$nin.includes(state.payment.status)) {
      return query(null);
    }
    /* 🔴 upsert($setOnInsert) 경로는 Payment.create 와 **같은 부기**를 해야 한다. /single/start 가
       read-then-create 레이스를 없애며 create → upsert 로 바뀌었는데(worker/routes/payments.js
       handleSinglePaymentStart, 2026-08-15), 목이 $setOnInsert 를 무시하면 state.createdPayments 가
       비어 아래 "주문이 생성됐다" 단언들이 아무것도 검증하지 않는다(가짜 초록불).
       includeResultMetadata:true 는 드라이버 그대로 {value, lastErrorObject} 를 돌려주고,
       호출부는 lastErrorObject.updatedExisting 으로 신규/기존을 가른다. */
    if (options.upsert && update.$setOnInsert) {
      const key = String(_criteria?.idempotencyKey || "");
      const existing = key
        ? state.createdPayments.find((doc) => String(doc.idempotencyKey || "") === key) || null
        : null;
      let doc = existing;
      if (!doc) {
        doc = { _id: `pay_created_${state.createdPayments.length + 1}`, ..._criteria, ...update.$setOnInsert };
        state.createdPayments.push(doc);
        state.payment = { ...state.payment, ...doc };
      }
      if (!options.includeResultMetadata) return Promise.resolve(doc);
      return Promise.resolve({ value: doc, lastErrorObject: { updatedExisting: Boolean(existing) } });
    }
    state.payment = {
      ...state.payment,
      ...(update.$set || {}),
    };
    if (update.$inc?.confirmAttempts) {
      state.payment.confirmAttempts = Number(state.payment.confirmAttempts || 0) + Number(update.$inc.confirmAttempts || 0);
    }
    return query(state.payment);
  };
  Payment.findByIdAndUpdate = (_id, update = {}) => {
    state.payment = {
      ...state.payment,
      ...(update.$set || {}),
    };
    if (update.$inc?.confirmAttempts) {
      state.payment.confirmAttempts = Number(state.payment.confirmAttempts || 0) + Number(update.$inc.confirmAttempts || 0);
    }
    return query(state.payment);
  };
  const webhookEvents = new Map();
  PaymentWebhookEvent.create = async (doc) => {
    const key = `${doc.provider}:${doc.eventId}`;
    if (webhookEvents.has(key)) {
      const error = new Error("duplicate webhook event");
      error.code = 11000;
      throw error;
    }
    const created = { _id: `webhook_${webhookEvents.size + 1}`, ...doc };
    webhookEvents.set(key, created);
    return created;
  };
  PaymentWebhookEvent.findOne = (criteria = {}) => {
    const key = `${criteria.provider}:${criteria.eventId}`;
    return query(webhookEvents.get(key) || null);
  };
  PaymentWebhookEvent.findOneAndUpdate = (criteria = {}, update = {}) => {
    const key = `${criteria.provider}:${criteria.eventId}`;
    const existing = webhookEvents.get(key);
    if (!existing || (criteria.status && existing.status !== criteria.status)) return query(null);
    Object.assign(existing, update.$set || {});
    if (update.$inc?.attempts) existing.attempts = Number(existing.attempts || 0) + Number(update.$inc.attempts || 0);
    return query(existing);
  };
  PaymentWebhookEvent.findByIdAndUpdate = (id, update = {}) => {
    for (const event of webhookEvents.values()) {
      if (event._id !== id) continue;
      Object.assign(event, update.$set || {});
      return query(event);
    }
    return query(null);
  };
  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes(`/payments/${encodeURIComponent(state.payment.merchantUid)}`), "PortOne lookup URL should include paymentId");
    return new Response(JSON.stringify({ payment: state.portonePayment }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function restoreMocks() {
  globalThis.fetch = originals.fetch;
  ContentEntitlement.findOne = originals.contentFindOne;
  ContentEntitlement.findOneAndUpdate = originals.contentFindOneAndUpdate;
  ContentEntitlement.updateMany = originals.contentUpdateMany;
  Payment.create = originals.paymentCreate;
  Payment.findOne = originals.paymentFindOne;
  Payment.findOneAndUpdate = originals.paymentFindOneAndUpdate;
  Payment.findById = originals.paymentFindById;
  Payment.findByIdAndUpdate = originals.paymentFindByIdAndUpdate;
  PaymentWebhookEvent.create = originals.paymentWebhookCreate;
  PaymentWebhookEvent.findOne = originals.paymentWebhookFindOne;
  PaymentWebhookEvent.findOneAndUpdate = originals.paymentWebhookFindOneAndUpdate;
  PaymentWebhookEvent.findByIdAndUpdate = originals.paymentWebhookFindByIdAndUpdate;
  ProfileCard.findOne = originals.profileFindOne;
  User.findById = originals.userFindById;
  User.updateOne = originals.userUpdateOne;
}

async function jsonResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload };
}

function startRequest(body) {
  return new Request("https://code-destiny.test/api/payments/single/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function completeRequest(paymentId) {
  return new Request("https://code-destiny.test/api/payments/single/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });
}

async function signedWebhookRequest(body) {
  const rawBody = JSON.stringify(body);
  const webhookId = `msg_${Math.random().toString(36).slice(2)}`;
  const timestamp = "1710000000";
  const signature = await signStandardWebhookPayload(ENV.PORTONE_WEBHOOK_SECRET, webhookId, timestamp, rawBody);
  return new Request("https://code-destiny.test/api/payments/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    body: rawBody,
  });
}

async function runServerTests() {
  const missingConfig = withoutConsoleError(() => portoneMod.getPortOnePublicConfig({}));
  assert.equal(missingConfig.configured, false, "env missing should fail safely");
  assert.equal("portoneApiSecret" in missingConfig, false, "public config should not expose API secret key");
  if (localPortOneEnv.PORTONE_API_SECRET || localPortOneEnv.PORTONE_CHANNEL_KEY || localPortOneEnv.PORTONE_STORE_ID) {
    const localConfig = portoneMod.getPortOnePublicConfig(localPortOneEnv);
    assert.equal(localConfig.configured, true, ".env.local PortOne core env should configure payments");
    assert.equal(localConfig.serverVerificationConfigured, true, ".env.local PortOne API secret should configure server verification");
    assert.equal(localConfig.storeId, localPortOneEnv.PORTONE_STORE_ID, ".env.local PortOne store id should be reflected");
    assert.equal(localConfig.channelKey, localPortOneEnv.PORTONE_CHANNEL_KEY, ".env.local PortOne channel key should be reflected");
  }
  const fullConfig = portoneMod.getPortOnePublicConfig(ENV);
  assert.equal(fullConfig.configured, true, "PortOne core env should configure payments");
  assert.equal(fullConfig.inicisConfigured, true, "Inicis MID/signkey/API key/IV should be reported when present");
  assert.equal(fullConfig.webhookSecretConfigured, true, "webhook secret should be reported when present");
  assert.equal(JSON.stringify(fullConfig).includes(ENV.INIAPIKEY), false, "public config should not expose Inicis API key");
  const coreConfig = portoneMod.getPortOnePublicConfig(ENV_CORE);
  assert.equal(coreConfig.configured, true, "PortOne API secret/store/channel should be enough to open checkout");
  assert.equal(coreConfig.inicisConfigured, false, "missing Inicis API key should not block checkout config");
  assert.equal(coreConfig.webhookSecretConfigured, false, "missing webhook secret should not block checkout config");
  assert.equal(coreConfig.noticeUrl, "", "missing webhook secret should not expose per-payment notice URL");
  assert.equal(coreConfig.missing.length, 0, "core config should not report required env missing");
  assert.ok(coreConfig.missingOptional.includes("PORTONE_WEBHOOK_SECRET"), "webhook secret should be optional diagnostics");
  assert.ok(coreConfig.missingOptional.includes("INIAPIKEY"), "Inicis API key should be optional diagnostics");
  assert.equal(portoneMod.getPortOnePublicConfig({ ...ENV, INIAPIKEY: "" }).configured, true, "missing Inicis API key should not block checkout config");
  const aliasConfig = portoneMod.getPortOnePublicConfig({
    portone_api_secret_key: ENV.PORTONE_API_SECRET,
    "portone-channelkey": ENV.PORTONE_CHANNEL_KEY,
    portone_storeid: ENV.PORTONE_STORE_ID,
  });
  assert.equal(aliasConfig.configured, true, "normalized PortOne env aliases should configure payments");

  resetState();
  state.preUnlocked = true;
  let response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    productName: "Code Destiny 운세",
    coinPrice: 50,
  }), ENV, AUTH);
  let result = await jsonResponse(response);
  assert.equal(result.status, 200, "already unlocked start should succeed");
  assert.equal(result.payload.alreadyUnlocked, true, "already unlocked should be reported");
  assert.equal(readPaymentId(result.payload), "", "already unlocked should not create paymentId");
  assert.equal(state.createdPayments.length, 0, "already unlocked should not create order");

  resetState();
  response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    productName: "Code Destiny 운세",
    coinPrice: 50,
    amount: 1,
  }), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 201, "single start should create order");
  assert.equal(result.payload.order.totalAmount, 5000, "50 coins should become 5000 KRW");
  assert.equal(state.createdPayments[0].paymentAmount, 5000, "server amount should ignore client amount");
  assert.equal(JSON.stringify(result.payload).includes(ENV.PORTONE_API_SECRET), false, "client response should not include API secret");
  assert.equal(JSON.stringify(result.payload).includes(ENV.INIsignkey), false, "client response should not include Inicis signkey");

  /* 🔴 2026-08-15 회귀 재현 — /single/start 의 read-then-create 레이스.
     종전에는 findOne(읽기)과 Payment.create(쓰기) 사이가 비어 동시 클릭 두 건이 모두 create 했고,
     진 쪽이 E11000 → 라우터 catch-all 의 `{"message":"Duplicate payment key."}` 409(code 없음)로
     죽었다. 형제 handlePrepare 에는 복구가 있었고 여기만 없었다(비대칭이 결함). */
  const raceBody = {
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    productName: "Code Destiny 운세",
    coinPrice: 50,
    idempotencyKey: "single-race-key",
  };

  // ① 같은 멱등키 재요청은 새 주문을 만들지 않고 같은 merchantUid 를 돌려준다(upsert 멱등).
  resetState();
  response = await handleSinglePaymentStart(startRequest(raceBody), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 201, "first keyed start should create order");
  assert.equal(state.createdPayments.length, 1, "first keyed start should insert exactly one order");
  const firstKeyedPaymentId = readPaymentId(result.payload);
  response = await handleSinglePaymentStart(startRequest(raceBody), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "repeat keyed start should be idempotent, not 201");
  assert.equal(result.payload.idempotent, true, "repeat keyed start should report idempotent");
  assert.equal(state.createdPayments.length, 1, "repeat keyed start must not insert a second order");
  assert.equal(readPaymentId(result.payload), firstKeyedPaymentId, "repeat keyed start should reuse the same merchantUid");

  // ② 패자가 받는 E11000 은 409 가 아니라 **승자 문서**의 멱등 응답이어야 한다.
  //    🔴 응답 paymentId 가 승자의 merchantUid 여야 한다 — 여기 uid 는 랜덤이라, 진 쪽 uid 를
  //    돌려주면 사용자가 존재하지 않는 주문으로 PG 창을 연다.
  resetState();
  const winnerOrder = {
    ...makePayment(),
    _id: "pay_created_winner",
    merchantUid: "cd-single-winner-1710000000000-abcd1234",
    idempotencyKey: "single-race-key",
  };
  state.createdPayments.push(winnerOrder);
  Payment.findOneAndUpdate = () => {
    const error = new Error("E11000 duplicate key error");
    error.code = 11000;
    throw error;
  };
  /* 🔴 복구 조회만 가로챈다. Payment.findOne 을 통째로 덮으면 hasExistingSinglePaymentUnlock
     (worker/routes/payments.js)의 "이미 해금됨" 조회까지 승자 문서를 받아 핸들러가 결제창 대신
     alreadyUnlocked 200 을 돌려주고, 그러면 이 테스트는 정작 보려던 경로를 안 밟는다.
     복구 조회만 top-level $or 를 쓰고 status 필터가 없다 — 그것으로 가른다. */
  const originalFindOne = Payment.findOne;
  Payment.findOne = (criteria = {}) => (criteria?.$or && !criteria?.status
    ? query(winnerOrder)
    : originalFindOne(criteria));
  response = await handleSinglePaymentStart(startRequest(raceBody), ENV, AUTH);
  result = await jsonResponse(response);
  assert.notEqual(result.status, 409, "E11000 loser must not surface as 409 Duplicate payment key");
  assert.equal(result.status, 200, "E11000 loser should receive the winner's idempotent response");
  assert.equal(result.payload.idempotent, true, "E11000 loser should report idempotent");
  assert.equal(readPaymentId(result.payload), winnerOrder.merchantUid, "E11000 loser must return the winner's merchantUid");
  assert.equal(state.createdPayments.length, 1, "E11000 loser must not create a second order");

  resetState();
  response = await handleSinglePaymentStart(startRequest({
    profileId: "profile-a",
    contentId: "section_summary",
    contentType: "saju",
    coinPrice: 999,
  }), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "tampered coinPrice should be rejected");
  assert.equal(result.payload.code, "CLIENT_COIN_PRICE_MISMATCH");

  resetState();
  state.portonePayment = makePortOnePayment({ status: "READY" });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 202, "non-PAID status should stay pending");
  assert.equal(state.entitlementByKey.size, 0, "non-PAID status should not unlock");

  resetState();
  state.portonePayment = makePortOnePayment({ amount: { total: 4900, paid: 4900, currency: "KRW" } });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "amount mismatch should fail");
  assert.equal(result.payload.code, "AMOUNT_MISMATCH");
  assert.equal(state.payment.orderState, "VERIFY_FAILED");
  assert.equal(state.entitlementByKey.size, 0, "amount mismatch should not unlock");

  resetState();
  state.portonePayment = makePortOnePayment({ storeId: "wrong_store" });
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 400, "storeId mismatch should fail");
  assert.equal(result.payload.code, "STORE_ID_MISMATCH");
  assert.equal(state.payment.orderState, "VERIFY_FAILED");
  assert.equal(state.entitlementByKey.size, 0, "storeId mismatch should not unlock");

  resetState();
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "PAID complete should succeed");
  assert.equal(result.payload.status, "UNLOCKED");
  response = await handleSinglePaymentComplete(completeRequest(state.payment.merchantUid), ENV, AUTH);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "same paymentId complete should be idempotent");
  assert.equal(state.entitlementByKey.size, 1, "same paymentId should keep one unlock record");
  let webhook = await signedWebhookRequest({ type: "Transaction.Cancelled", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Cancelled webhook should succeed");
  assert.equal(result.payload.unlockRevoked, true, "full cancellation webhook should revoke unlock");
  const revokedEntitlement = Array.from(state.entitlementByKey.values())[0];
  assert.equal(revokedEntitlement.status, "CANCELLED", "full cancellation should close entitlement");
  assert.ok(state.userFeaturePulls.some((entry) => entry?.paidFeatures?.$in?.includes("section_summary")), "full cancellation should pull paid feature");

  resetState();
  webhook = await signedWebhookRequest({ type: "Transaction.Paid", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Paid webhook should succeed");
  webhook = await signedWebhookRequest({ type: "Transaction.Paid", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "duplicate Transaction.Paid webhook should succeed");
  assert.equal(state.entitlementByKey.size, 1, "duplicate Transaction.Paid webhook should not duplicate unlock");

  resetState();
  state.payment = makePayment({ status: "success", orderState: "UNLOCKED", paidAt: new Date() });
  webhook = await signedWebhookRequest({ type: "Transaction.Failed", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "Transaction.Failed webhook should be idempotent");
  assert.equal(state.payment.orderState, "UNLOCKED", "Transaction.Failed should not overwrite UNLOCKED order");

  resetState();
  webhook = await signedWebhookRequest({ type: "Transaction.VirtualAccountIssued", data: { paymentId: state.payment.merchantUid } });
  response = await handleWebhook(webhook, ENV);
  result = await jsonResponse(response);
  assert.equal(result.status, 200, "VirtualAccountIssued webhook should succeed");
  assert.equal(state.payment.orderState, "VIRTUAL_ACCOUNT_ISSUED");
  assert.equal(state.entitlementByKey.size, 0, "VirtualAccountIssued should not unlock");
}

function runClientStaticTests() {
  assertContains(clientPaymentSource, "window._cdCoinGatePerUseInFlight", "duplicate click guard");
  assertContains(indexSource, "__cdDirectKrwCheckoutInFlight", "main shell direct checkout single-flight guard");
  assertContains(indexSource, "__cdPaidServiceGateInFlight", "main shell paid service gate single-flight guard");
  assertContains(indexSource, "window.__cdDirectPaymentChoiceActive", "main shell payment choice modal lock");
  assertContains(indexSource, "service.executePayment({", "main shell delegates paid gate duplicate locking to Payment Service");
  assertContains(destinyProfileSource, "__cdDirectKrwCheckoutInFlight", "runtime direct checkout single-flight guard");
  assertContains(destinyProfileSource, "service.executePayment({", "runtime delegates paid gate duplicate locking to Payment Service");
  assertContains(paymentServiceSource, "commandInFlight[key]", "Payment Service owns the shared command in-flight map");
  assertContains(paymentServiceSource, "DUPLICATE_CLIENT_COMMAND", "Payment Service records duplicate client commands");
  assertContains(destinyProfileSource, "__cdSinglePaymentGuard", "runtime payment guard marker");
  assertContains(clientPaymentSource, "window.PortOne.requestPayment(requestData)", "PortOne payment window call");
  assertContains(indexSource, "function _cdNormalizeKoreanPhoneNumber", "Inicis checkout phone normalizer");
  assertContains(indexSource, "_cdPromptDirectCheckoutPhoneNumber", "Inicis checkout phone prompt");

  // 🔴 결제 시 번호 수집 **경로 고정**(2026-08-25). 전화번호는 카카오·네이버 모두 선택 동의라
  // 거부한 채로 가입이 끝날 수 있고, 그 사용자는 결제할 때 자기 소셜에서 동의해야 한다.
  // 구글은 번호를 주지 않으므로 자체 폼이 그대로 보인다.
  //
  // 되살아나기 쉬운 형태는 둘이다 — ①직접 입력을 항상 보이게 되돌리기(그러면 "둘 중 아무거나"
  // 로 돌아간다) ②팝업 차단 분기를 지우기(그러면 팝업이 막힌 사용자는 카드 결제를 **영영** 못 한다).
  // 그래서 렌더러 3벌 모두에서 그 둘을 함께 못박는다.
  for (const [label, source] of [
    ["shell", indexSource],
    ["dp", destinyProfileSource],
    ["react", readFileSync(resolve(root, "app/_lib/payment-phone-prompt.ts"), "utf8")],
  ]) {
    assertContains(source, "setManualEntryVisible(false)",
      `${label}: 공급자가 번호를 줄 수 있으면 직접 입력을 감춰야 한다`);
    assertContains(source, "setManualEntryVisible(true)",
      `${label}: 팝업이 막혔을 때 직접 입력을 되살리는 안전 밸브가 있어야 한다`);
    // 안전 밸브는 팝업 차단 분기 안에 있어야 한다 — 밖으로 나가면 항상 보이게 되돌린 것과 같다.
    assertBefore(source, "setManualEntryVisible(true)", "socialButton.disabled = true;",
      `${label}: 안전 밸브는 팝업 열기 실패 분기 안에 있어야 한다`);
  }
  assertContains(indexSource, "phoneNumber: customerPhone", "PortOne V2 customer phoneNumber");
  assertContains(indexSource, "hasBuyerPhoneNumber: Boolean(customerPhone)", "direct checkout safe phone presence log");
  // 시그니처가 아니라 존재를 본다 — 인자 추가로 깨지면 안 되는 단언이다(위 ②-b 주석과 같은 이유).
  assert.ok(
    /async function _dpEnsurePaymentPhoneNumber\(/.test(destinyProfileSource),
    "runtime Inicis phone prompt: missing marker",
  );
  assert.ok(
    /customerPhone = await _dpEnsurePaymentPhoneNumber\(/.test(destinyProfileSource),
    "runtime direct checkout phone fallback: missing marker",
  );
  assertContains(destinyProfileSource, "phoneNumber: customerPhone", "runtime PortOne V2 customer phoneNumber");
  assertBefore(destinyProfileSource, "customerPhone = await _dpEnsurePaymentPhoneNumber(", "window.PortOne.requestPayment(requestData)", "runtime phone fallback must run before PortOne window opens");
  // 결제 프로필은 결제 모달을 여는 순간이 아니라 실제 결제 버튼을 누른 뒤에만 조회한다.
  // 상점/결제창 진입만으로 payment-phone을 호출하면 503과 사용자별 조회 폭주를 다시 만들 수 있다.
  // 3번째 인자 null = 프리페치 없음. 4번째(serverConfirmedNoPhone)는 나중에 붙었으므로 열어 둔다.
  assert.ok(
    /ensurePaymentPhoneNumber\(apiBase, authUser, null[,)]/.test(pointsPageSource),
    "points page resolves payment phone only during checkout (no prefetch)",
  );
  assertNotContains(pointsPageSource, "paymentPhonePrefetchRef", "points page must not prefetch payment phone before checkout");
  assertContains(pointsPageSource, "phoneNumber: resolvedPhoneNumber", "points page PortOne phoneNumber");
  // 프로필 카드 관리는 React(app/me)에서 정적 셸 하나로 합쳐졌다. 같은 보장을 셸 기준으로 계속 건다 —
  // 추가·수정·삭제는 공용 코인 게이트를 타야 하고, 별도 주문 준비 경로를 새로 파면 안 된다.
  assertContains(destinyProfileSource, "window._cdCoinGatePerUse(PROFILE_CARD_MANAGE_COST", "profile card mutations delegate checkout to the shared coin gate");
  assertContains(destinyProfileSource, "amountKrw: PROFILE_CARD_MANAGE_COST * 100", "profile card mutations price through the shared gate payload");
  assertNotContains(destinyProfileSource, "/api/payments/prepare", "profile actions must not prepare orders outside the shared checkout");
  assertContains(clientPaymentSource, "if (!rsp || rsp.code || !paymentId)", "PortOne response.code failure handling");
  assertContains(clientPaymentSource, "paymentFailed", "failure UI state");
  assertContains(clientPaymentSource, "paymentSuccess", "success UI state");
  assertContains(indexSource, "if (status === 'checkingEntitlement') {", "checking entitlement UI state");
  assertContains(indexSource, "if (status === 'readyToPay' || status === 'noEntitlement')", "ready-to-pay UI state");
  assertContains(indexSource, "status === 'opening' || status === 'loadingProducts' || status === 'generationPreparing'", "pre-payment UI state");
  assertContains(indexSource, "if (status === 'paymentProcessing')", "payment processing UI state");
  assertContains(indexSource, "if (status === 'savingUnlock') return { title:", "unlock saving UI state");
  assertContains(indexSource, "redirectUrl.searchParams.set('portone_redirect', '1')", "mobile redirect marker");
  assertContains(paymentsRouteSource, 'redirectUrl.searchParams.set("payment_id", paymentId)', "redirectUrl carries paymentId");
  assertBefore(indexSource, "_cdHasVerifiedServerAccess(confirmRes.payload", "return confirmRes.payload", "server complete failure must block unlock success");
  assertBefore(indexSource, "if (!order.merchantUid && allowDirectCheckoutAccessBypass && _cdIsCheckoutAccessBypass", "await _cdPortOneV2SdkPromise()", "explicitly allowed access-bypass branch should not open payment modal");
  assertContains(indexSource, "alreadyUnlocked", "already unlocked branch");
  assertContains(pagesHeadersSource, "connect-src 'self'", "Cloudflare Pages CSP connect-src");
  assertContains(pagesHeadersSource, "connect-src 'self' https://code-destiny.com https://www.code-destiny.com https://code-destiny-web.bulegyung.workers.dev https://cdn.portone.io https://checkout-service.prod.iamport.co", "PortOne checkout prepare API must be allowed by connect-src");
  assertContains(pagesHeadersSource, "https://tx-gateway-service.prod.iamport.co", "KG Inicis virtual-account notification gateway must be allowed by CSP");
  assertContains(pagesHeadersSource, "frame-src 'self' https://checkout-service.prod.iamport.co", "PortOne checkout frame must be allowed by frame-src");
  assertContains(pagesHeadersSource, "form-action 'self' https://tx-gateway-service.prod.iamport.co", "KG Inicis virtual-account gateway form action must be allowed");
}

function runE2EStaticTests() {
  assertBefore(indexSource, "await _cdChooseServicePaymentMode({", "var directPayload = await (window._cdRunDirectKrwCheckout || _cdRunDirectKrwCheckout)({", "paid content click should choose before direct PortOne checkout");
  assertBefore(indexSource, "window.PortOne.requestPayment(requestData)", "_cdHasVerifiedServerAccess(confirmRes.payload", "payment should verify server before unlock");
  assertContains(paymentsRouteSource, "upsertSinglePaymentUnlockRecord", "server unlock persistence");
  assertContains(paymentsRouteSource, "profileId,", "profile-scoped unlock");
  assertContains(paymentsRouteSource, "contentId,", "content-scoped unlock");
  assertContains(paymentsRouteSource, "accessType: \"single_purchase\"", "single purchase branch");
  assertContains(paymentsRouteSource, "PAYMENT_NOT_PAID", "failed payment should not open content");
  assertContains(paymentsRouteSource, "alreadyUnlocked: true", "same profile/content avoids payment");
  assertContains(modelsSource, "contentEntitlementSchema.index(", "unlock unique index");
  assertContains(modelsSource, "{ userId: 1, profileId: 1, serviceKey: 1, contentKey: 1, scope: 1 }", "profile-specific unique unlock");
}

try {
  await runServerTests();
  runClientStaticTests();
  runPortOneRequestShapeTests();
  runPgWindowLocaleTests();
  runPortOneSdkLoaderResilienceTests();
  runReactSdkPreloadAndRetryTests();
  runInstantPgWindowTests();
  runInstantPgLatencyTests();
  runDirectPgOverlayTests();
  runPreCheckoutWaitUiAndArtWeightTests();
  runE2EStaticTests();
  assertContains(portoneSource, "Authorization: `PortOne ${apiSecret}`", "PortOne REST authorization header");
  assertContains(portoneSource, "noticeUrl,", "PortOne public config should expose webhook notice URL");
  assert.equal(portoneMod.getPortOnePublicConfig(ENV).noticeUrl, "https://code-destiny.test/api/webhooks/portone", "PortOne public config should derive a default notice URL from SITE_BASE_URL");
  assertContains(paymentsRouteSource, "noticeUrl: config.noticeUrl", "payment config API should return PortOne notice URL");
  console.log("[verify-portone-single-payment-regression] PASS");
} finally {
  restoreMocks();
}
