// 앱 빌드에 외부 결제(PortOne/이니시스) 경로가 남아있지 않은지 검증 — 배포 게이트.
//
// 정적 문자열 검사만으로는 부족하다(destiny-profile.js는 웹·앱 공용이라 PortOne 코드가
// 파일 안에 남아 있다). 그래서 가드를 jsdom에서 실제로 실행해 "정말 막히는가"를 확인한다.
//
// 실행:
//   node scripts/verify-app-no-portone.mjs             # 가드 동작만 검증(빌드 불필요)
//   node scripts/verify-app-no-portone.mjs --dist dist # dist 산출물까지 검증

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
// 죽은 자산 판정 규칙은 빌드가 정본이다 — 여기서 다시 구현하면 두 규칙이 갈라진다.
import { buildReferencedNameIndex } from "./build-mobile-app.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distArgIndex = process.argv.indexOf("--dist");
const DIST = distArgIndex > -1 ? path.resolve(ROOT, process.argv[distArgIndex + 1]) : "";
const GUARD_PUBLIC_PATH = "/js/app-payment-guard.js";

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

// --- 1) 가드 동작 검증 (jsdom 실제 실행) ---------------------------------
console.log("\n[1] 결제 가드가 실제로 PortOne 경로를 막는가 (jsdom 실행)");

const guardSource = await fs.readFile(path.join(ROOT, "scripts", "app-payment-guard.js"), "utf8");
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "https://code-destiny.com/saju/basic/",
  runScripts: "outside-only",
});
const { window } = dom;
window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: {} }) });
window.eval(guardSource);

check("가드 설치됨", window.__cdAppPaymentGuard?.installed === true);

// PortOne SDK가 자리잡지 못하는가 — SDK 로드 자체를 흉내낸다.
window.eval("window.PortOne = { requestPayment: function(){ return Promise.resolve({ code: null }); } };");
check(
  "PortOne SDK 대입이 무력화됨 (window.PortOne === undefined)",
  window.PortOne === undefined,
  `실제값=${typeof window.PortOne}`,
);

// destiny-profile.js가 나중에 PortOne 구현을 대입하는 상황을 흉내낸다.
window.eval("window.__cdPortOneImplInstalled = false; window._cdRunDirectKrwCheckout = function(){ window.__cdPortOneImplInstalled = true; return Promise.resolve({}); };");
check(
  "_cdRunDirectKrwCheckout에 PortOne 구현이 대입되지 않음",
  window._cdRunDirectKrwCheckout === window.__cdAppPaymentGuard.runPlayBillingCheckout,
  "가드 구현이 유지되어야 한다",
);

window.eval("window.__cdOpenChargeModal = function(){ window.__cdChargeModalOpened = true; };");
check(
  "__cdOpenChargeModal이 앱 스토어로 고정됨",
  window.__cdOpenChargeModal === window.__cdAppPaymentGuard.openAppStore,
);

// 상점으로 떠나기 전에 복귀 티켓을 남기는가 — /app/store/ 가 구매 성공 뒤 이 티켓으로 원래 콘텐츠로
// 돌려보낸다(app/app/store/AppPassStoreClient.tsx scheduleCheckoutReturn). 앱에서 상점으로 가는 모든
// 경로가 openAppStore 한 곳으로 모이므로 여기가 유일한 저장 지점이다. jsdom 은 location.assign 을
// 구현하지 않아 콘솔에 오류만 찍으므로 조용한 가상 콘솔로 띄운다.
function bootGuardAt(url) {
  const quiet = new JSDOM("<!doctype html><html><head><title>타로</title></head><body></body></html>", {
    url,
    runScripts: "outside-only",
    virtualConsole: new VirtualConsole(),
  });
  const tickets = [];
  quiet.window.__cdCheckoutEntry = { rememberCheckoutReturn: (ticket) => { tickets.push(ticket); return true; } };
  quiet.window.eval(guardSource);
  quiet.window.__cdAppPaymentGuard.openAppStore();
  return tickets;
}
const contentTickets = bootGuardAt("https://code-destiny.com/tarot/love/?spread=3#result");
check(
  "상점 진입 시 복귀 티켓을 1회 저장함(경로·쿼리·해시 보존)",
  contentTickets.length === 1 && contentTickets[0].url === "/tarot/love/?spread=3#result",
  `tickets=${JSON.stringify(contentTickets)}`,
);
const appTabTickets = bootGuardAt("https://code-destiny.com/app/");
check(
  "앱 탭 화면(/app/**)에서는 복귀 티켓을 저장하지 않음(상점→상점 루프 방지)",
  appTabTickets.length === 0,
  `tickets=${JSON.stringify(appTabTickets)}`,
);

// /points 링크 클릭이 차단되는가
let navigatedTo = "";
window.__cdAppPaymentGuard.openAppStore = () => { navigatedTo = "/app/store/"; };
window.eval(`
  var a = document.createElement('a');
  a.href = '/points?source=test';
  a.textContent = 'x';
  document.body.appendChild(a);
  window.__cdTestAnchor = a;
`);
const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true });
window.__cdTestAnchor.dispatchEvent(clickEvent);
check("/points 링크 클릭이 차단됨 (preventDefault)", clickEvent.defaultPrevented === true);

// 외부 결제를 언급하는 안내 문구가 걸러지는가.
// destiny-profile.js가 402 안내에 '포트원 V2 KG이니시스…'를 alert로 덧붙이는데(웹·앱 공용이라
// 수정 불가), 앱에서는 사실과 다르고 Play 정책에도 걸리므로 가드가 걷어내야 한다.
// 가드는 설치 시점의 alert를 감싸므로, alert를 먼저 갈아끼운 새 창에서 확인한다.
const alertDom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "https://code-destiny.com/saju/basic/",
  runScripts: "outside-only",
});
let captured = "";
alertDom.window.alert = (message) => { captured = String(message); };
alertDom.window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: {} }) });
alertDom.window.eval(guardSource);
alertDom.window.alert("단건 결제가 필요합니다.\n\n단건 결제 기준: 5,000원\n포트원 V2 KG이니시스 결제로 진행됩니다.");
check(
  "402 안내에서 외부 결제(포트원/이니시스) 문장이 제거됨",
  !/포트원|PortOne|이니시스/i.test(captured) && captured.includes("단건 결제가 필요합니다"),
  `실제 표시=${JSON.stringify(captured)}`,
);

// 연타 중복 결제 방지 — 가드가 _cdRunDirectKrwCheckout를 고정하면서 destiny-profile.js의
// single-flight 래퍼(:3012)가 붙지 못하므로, 같은 보호를 가드가 직접 해야 한다.
// (가드는 네이티브 브리지가 없으면 intent 전에 실패하므로 가짜 브리지를 붙인다)
alertDom.window.CodeDestinyNative = {
  purchase: async () => ({ ok: true, purchaseToken: "test-token" }),
  consume: async () => ({ ok: true }),
};
let intentCalls = 0;
alertDom.window.fetch = async (url) => {
  if (String(url).includes("/google/intent")) intentCalls += 1;
  // 첫 호출이 끝나기 전에 두 번째가 들어오는지 보려고 응답을 지연시킨다.
  await new Promise((resolve) => { alertDom.window.setTimeout(resolve, 20); });
  return { ok: false, json: async () => ({ ok: false, message: "stop" }) };
};
await Promise.all([
  alertDom.window.__cdAppPaymentGuard.runPlayBillingCheckout({ featureKey: "x", coinPrice: 30 }).catch(() => null),
  alertDom.window.__cdAppPaymentGuard.runPlayBillingCheckout({ featureKey: "x", coinPrice: 30 }).catch(() => null),
]);
check("연타 시 결제 의도(intent)가 1회만 전송됨", intentCalls === 1, `intent 호출 ${intentCalls}회`);

// 응답이 영영 안 오는 intent — 상한 안에 실패해야 하고, 실패 뒤에는 single-flight 가 풀려
// 다음 시도가 intent 를 다시 보내야 한다(상한이 없던 시절엔 앱을 재시작해야 풀렸다).
alertDom.window.__cdAppStoreFetchTimeoutMs = 50;
let hungIntentCalls = 0;
alertDom.window.fetch = (url, init) => new Promise((_resolve, reject) => {
  if (String(url).includes("/google/intent")) hungIntentCalls += 1;
  // 실제 fetch 처럼 signal 이 abort 될 때만 끝난다.
  if (init?.signal) init.signal.addEventListener("abort", () => reject(new Error("aborted")));
});
// 상한이 빠지면 이 await 자체가 영영 안 풀리므로(node 가 exit 13 으로 죽는다) 검사 쪽에서 2s 로 자른다.
const hungRun = () => Promise.race([
  alertDom.window.__cdAppPaymentGuard.runPlayBillingCheckout({ featureKey: "x", coinPrice: 30 }).then(() => null, (error) => error),
  new Promise((resolve) => { setTimeout(() => resolve({ code: "STILL_HANGING" }), 2000); }),
]);
const hungError = await hungRun();
check(
  "응답 없는 intent 가 상한 안에 APP_STORE_REQUEST_TIMEOUT 으로 실패함",
  hungError?.code === "APP_STORE_REQUEST_TIMEOUT",
  `code=${hungError?.code}`,
);
await hungRun();
check("타임아웃 뒤 single-flight 가 풀려 재시도가 intent 를 다시 보냄", hungIntentCalls === 2, `intent 호출 ${hungIntentCalls}회`);
delete alertDom.window.__cdAppStoreFetchTimeoutMs;

// 결제 확정 뒤 access 스냅샷을 갱신하는가 — 가드가 통째로 대체한 웹 _cdRunDirectKrwCheckout 안의
// refreshUserAccessAfterPayment 호출을 이어받아야 한다. 빠지면 60초 스냅샷 동안 방금 산 콘텐츠가
// 잠긴 것처럼 보인다.
let accessRefreshCalls = 0;
alertDom.window.CodeDestinyUserAccessCache = {
  refreshUserAccessAfterPayment: async () => { accessRefreshCalls += 1; return {}; },
};
alertDom.window.fetch = async (url) => {
  if (String(url).includes("/google/intent")) {
    return { ok: true, json: async () => ({ ok: true, data: { product: { productId: "cd_test", productType: "inapp" }, obfuscatedAccountId: "u1" } }) };
  }
  if (String(url).includes("/google/verify")) {
    return { ok: true, json: async () => ({ ok: true, data: { appPurchase: { shouldConsume: true } } }) };
  }
  return { ok: false, json: async () => ({ ok: false }) };
};
const successPayload = await alertDom.window.__cdAppPaymentGuard
  .runPlayBillingCheckout({ featureKey: "x", coinPrice: 30 })
  .catch((error) => error);
check(
  "Play 결제 확정 뒤 access 스냅샷 갱신을 1회 호출함",
  accessRefreshCalls === 1 && successPayload?.ok === true,
  `calls=${accessRefreshCalls} payload=${JSON.stringify(successPayload)}`,
);

// --- 2) 가드가 PortOne을 호출하지 않는가 (소스 검사) ---------------------
console.log("\n[2] 가드 자체가 외부 결제를 호출하지 않는가");
check("가드에 cdn.portone.io 참조 없음", !guardSource.includes("cdn.portone.io"));
check("가드에 requestPayment 호출 없음", !/\.requestPayment\s*\(/.test(guardSource));
check("가드가 Play Billing(app-store) API만 사용", guardSource.includes("/api/app-store"));

// --- 2-b) AdSense가 앱 런타임에서 차단되는가 (소스 검사) -----------------
//
// AdSense 프로그램 정책: "Google ads may not be integrated into a software application"
// (AdMob만 예외 — support.google.com/adsense/answer/48182). 앱에서 광고가 뜨면 AdSense
// 계정 자체가 정지될 수 있고, 그러면 웹 광고 수익까지 함께 잃는다.
// 광고 서빙 코드는 DeferredAdsense 한 곳으로 중앙화되어 있으므로(CLAUDE.md) 그 게이트를 강제한다.
console.log("\n[2-b] AdSense가 앱 런타임에서 차단되는가");
{
  const adsenseSource = await fs.readFile(path.join(ROOT, "app", "components", "DeferredAdsense.tsx"), "utf8")
    .catch(() => "");
  check("DeferredAdsense 소스를 읽을 수 있음", Boolean(adsenseSource));
  if (adsenseSource) {
    check(
      "앱 런타임이면 광고를 로드하지 않음(isMobileAppRuntime 게이트)",
      /isMobileAppRuntime\s*\(\s*\)/.test(adsenseSource),
      "앱에서 AdSense가 뜨면 계정 정지 위험 — currentDocumentAllowsAdsense에 앱 분기 필요",
    );
  }
}

// --- 2-c) 셸이 가드를 우회하지 않는가 (소스 검사) -------------------------
//
// 가드는 defineProperty 로 '전역 프로퍼티'만 고정할 수 있다. 셸이 같은 파일 안의 지역
// 바인딩을 직접 부르면 그 고정을 통째로 우회해 PortOne 경로로 가버린다(앱에서는 SDK 가
// 무력화돼 있어 결제가 실패한다). 반드시 window 값을 우선 조회해야 한다.
console.log("\n[2-c] 셸 결제 호출부가 window 값을 우선 쓰는가");
{
  const shells = [
    "index.html",
    "public/index.html",
    "public/en/index.html",
    "public/ja/index.html",
    "public/zh/index.html",
    "public/static/index.html",
  ];
  for (const rel of shells) {
    const source = await fs.readFile(path.join(ROOT, rel), "utf8").catch(() => "");
    if (!source) {
      failures.push(`${rel} 를 읽지 못했다 — 셸 결제 호출부를 검증할 수 없다`);
      continue;
    }
    // 정의부(async function _cd...)는 제외하고 '호출'만 본다.
    const bypass = (source.match(/await\s+_cdRunDirectKrwCheckout\s*\(/g) || []).length
      + (source.match(/(?<![.\w|]\s?)(?<!\|\| )\bopenChargeModal\s*\(\s*\)\s*;/g) || []).length;
    check(
      `${rel}: 가드 우회 직접호출 없음`,
      bypass === 0,
      bypass ? `${bypass}건 — (window._cdRunDirectKrwCheckout || _cdRunDirectKrwCheckout)(…) 형태로 바꿀 것` : "",
    );
  }
}

// --- 2-d) /me 프로필 카드 결제가 앱에서 Play Billing 을 타는가 -------------
//
// /me 는 공용 게이트를 거치지 않는 자체 PortOne 체크아웃(prepare→requestPayment→confirm)을
// 갖고 있다. 앱에서 그 경로를 타면 Play 결제 정책 위반이고, 실제로는 가드가 window.PortOne 을
// 봉인해 둬서 카드 추가·삭제가 그냥 먹통이 된다. 앱 분기가 PortOne 호출보다 앞에 있어야 한다.
console.log("\n[2-d] 프로필 카드 결제가 앱에서 Play Billing 을 타는가");
{
  // 이 검사는 예전에 app/me/MeClient.tsx 를 봤다. 그 React 화면은 프로필 카드 관리의 두 번째
  // 구현이라 제거됐고(정본은 정적 셸 하단 시트), 부활은 verify-profile-card-action-policy.mjs 가
  // 막는다. 그런데 여기서는 그 파일을 계속 요구해 **두 가드가 서로 충돌**했고, 이 스크립트는
  // 항상 실패 상태라 실질적으로 아무것도 지키지 못했다. 실제 구현 위치로 옮긴다.
  check(
    "React /me 프로필 결제 화면이 되살아나지 않았다",
    !(await exists(path.join(ROOT, "app", "me"))),
    "프로필 카드 관리 정본은 정적 셸 하단 시트 하나다(verify-profile-card-action-policy 와 같은 계약)",
  );

  const profileSource = await fs.readFile(path.join(ROOT, "js", "destiny-profile.js"), "utf8").catch(() => "");
  check("js/destiny-profile.js 소스를 읽을 수 있음", Boolean(profileSource));
  if (profileSource) {
    // 이용권 상점 인계 지점. 앱은 /points 가 번들에 없어 반드시 인앱 상점을 먼저 타야 한다.
    const goPassStoreAt = profileSource.indexOf("function goPassStore()");
    check("이용권 상점 인계 경로가 있다", goPassStoreAt !== -1);
    if (goPassStoreAt !== -1) {
      const body = profileSource.slice(goPassStoreAt, goPassStoreAt + 2000);
      const appBranch = body.indexOf("__cdOpenChargeModal");
      const webStoreNav = body.indexOf("_dpBuildPassStoreUrl(");
      check("앱 런타임 분기가 있음", appBranch !== -1, "_dpShouldUseAppStoreEntry + __cdOpenChargeModal 경로 필요");
      check(
        "앱 분기가 웹 /points 이동보다 먼저 실행됨",
        appBranch !== -1 && (webStoreNav === -1 || appBranch < webStoreNav),
        "앱에서 /points 로 먼저 가면 번들에 없는 라우트라 빈 화면이 된다",
      );
    }
    // 단건(PortOne)은 사용자가 결제창에서 명시적으로 고른 뒤에만 실행돼야 한다.
    const portoneCall = profileSource.indexOf("window.PortOne.requestPayment(");
    const appEntryHelper = profileSource.indexOf("_dpShouldUseAppStoreEntry");
    check(
      "앱 판별 헬퍼가 PortOne 호출보다 먼저 정의됨",
      appEntryHelper !== -1 && (portoneCall === -1 || appEntryHelper < portoneCall),
      "앱에서 외부 PG가 먼저 호출되면 정책 위반이다",
    );
  }
}

// --- 2-e) 소셜 로그인이 앱에서 웹으로 이탈하지 않는가 ---------------------
//
// 이 검사가 없어서 한 번 크게 당했다. 네이티브 브릿지(openAuth)는 만들어 놨는데 로그인 화면이
// 그걸 호출하지 않아, 앱에서 로그인 버튼을 누르면 절대 URL 로 이동 → Capacitor 가 외부 Chrome 으로
// 던짐 → 사용자가 앱 밖 웹사이트에 갇히고 세션도 앱에 남지 않았다. 앱이 통째로 못 쓰는 상태였다.
// 앱 분기가 location.href 보다 **앞에** 있어야 한다.
console.log("\n[2-e] 소셜 로그인/회원가입이 앱에서 네이티브 브릿지를 타는가");
// 🔴 로그인·회원가입 화면은 둘 다 app/components/auth/AuthShell.tsx 한 벌에 위임한다
// (LoginClient/SignupClient 는 7줄짜리 래퍼다). 예전에는 래퍼를 검사해서, 구현이 AuthShell 로
// 옮겨간 뒤로는 "CodeDestinyNative 없음"이 되어 이 검사가 늘 실패했다 — 늘 실패하는 가드는
// 아무도 안 보게 되므로 실제 구현 파일을 본다.
for (const [rel, label] of [
  ["app/components/auth/AuthShell.tsx", "로그인·회원가입 공용 셸"],
]) {
  const source = await fs.readFile(path.join(ROOT, rel), "utf8").catch(() => "");
  if (!source) {
    failures.push(`${rel} 를 읽지 못했다 — 소셜 로그인 이탈을 검증할 수 없다`);
    continue;
  }
  const nativeBranch = source.indexOf("CodeDestinyNative");
  // 네이티브 브릿지가 없을 때의 폴백. assign/href 어느 쪽으로 써도 잡는다.
  const escapeNav = source.search(/window\.location\.(assign\(|href\s*=)/);
  check(`${label}: 네이티브 분기가 있음`, nativeBranch !== -1, "openAuth 경로가 없다");
  check(
    `${label}: 네이티브 분기가 절대 URL 이동보다 먼저 실행됨`,
    nativeBranch !== -1 && (escapeNav === -1 || nativeBranch < escapeNav),
    "앱에서 외부 브라우저로 튕겨 나간다",
  );
}

// --- 3) dist 산출물 검증 (선택) -----------------------------------------
if (DIST) {
  console.log(`\n[3] 앱 빌드 산출물 검증: ${path.relative(ROOT, DIST) || DIST}`);
  if (!(await exists(DIST))) {
    failures.push(`dist를 찾을 수 없습니다: ${DIST}`);
    console.log(`  ✗ dist 없음 — 먼저 build:mobile:app 실행`);
  } else {
    check("가드 자산이 배치됨", await exists(path.join(DIST, "js", "app-payment-guard.js")));
    // 브릿지가 없으면 가드가 결제 시 NATIVE_BILLING_UNAVAILABLE 로 죽는다 —
    // 클래식 셸(앱 메인 UI)의 모든 유료 기능이 결제 불가가 된다.
    check("네이티브 브릿지 자산이 배치됨", await exists(path.join(DIST, "js", "app-native-bridge.js")));
    {
      // 연이/네오 토글은 앱에도 반드시 남아 있어야 한다.
      //
      // 한동안 앱 빌드에서 이 마크업을 들어냈다. 그런데 셸의 마지막 테마 적용(js/share.js 의
      // window.load 핸들러)이 `if (themeCb)` 로 감싸여 있어서, #themeCheckbox 가 없으면
      // <html> 과 <body> 의 테마 상태가 어긋난 채 남는다 — 이 프로젝트가 금지한 "반쪽 오버라이드".
      // 그 결과 로딩 중 다크→연이로 뒤집혀 보였고, 테마 강제까지 겹치자 홈이 흰 화면이 됐다.
      // 다시 사라지면 같은 사고가 반복되므로 존재를 강제한다.
      const shellPath = path.join(DIST, "index.html");
      const shellHtml = await fs.readFile(shellPath, "utf8").catch(() => "");
      const markupRe = /<[a-z]+[^>]*\sclass="[^"]*theme-switch-wrapper[^"]*"/i;
      check(
        "연이/네오 토글 마크업이 셸에 살아있음 (반쪽 오버라이드 방지)",
        markupRe.test(shellHtml) && shellHtml.includes('id="themeCheckbox"'),
        "js/share.js 의 테마 적용이 #themeCheckbox 존재에 의존한다 — 지우면 테마가 반쪽만 적용된다",
      );
    }
    {
      // 자사 절대 URL 앵커가 남아 있으면 그걸 누른 사용자가 외부 Chrome 으로 튕겨 나가
      // 앱 밖 웹사이트에 갇힌다(결제 가드 없는 페이지 = Play 안티스티어링 위반 소지).
      const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
      const anchorRe = /<a\s[^>]*?href=(["'])https?:\/\/(?:www\.)?code-destiny\.com[^"']*\1/gi;
      const offenders = [];
      let scanned = 0;
      for (const file of htmlFiles) {
        const html = await fs.readFile(file, "utf8").catch(() => "");
        if (!html) continue;
        scanned += 1;
        const hits = (html.match(anchorRe) || []).length;
        if (hits) offenders.push(`${path.relative(DIST, file).replace(/\\/g, "/")}(${hits})`);
      }
      check(
        `자사 절대 URL 앵커 0건 (HTML ${scanned}개 스캔)`,
        offenders.length === 0,
        offenders.length ? `잔존: ${offenders.slice(0, 5).join(", ")}${offenders.length > 5 ? ` 외 ${offenders.length - 5}개` : ""}` : "",
      );
    }
    {
      // 셸 계열 HTML 에 브릿지 <script> 가 실제로 주입됐는지 표본 검사.
      const shellCandidates = ["index.html", "en/index.html", "ja/index.html", "zh/index.html", "static/index.html"];
      let checkedShells = 0;
      let missingBridge = [];
      for (const rel of shellCandidates) {
        const file = path.join(DIST, rel);
        if (!(await exists(file))) continue;
        checkedShells += 1;
        const html = await fs.readFile(file, "utf8").catch(() => "");
        if (!html.includes("/js/app-native-bridge.js")) missingBridge.push(rel);
      }
      check("셸 HTML 을 찾음", checkedShells > 0, "dist 에 셸이 없다");
      check(
        `셸 ${checkedShells}개 전부에 브릿지가 주입됨`,
        missingBridge.length === 0,
        missingBridge.length ? `누락: ${missingBridge.join(", ")}` : "",
      );
    }
    {
      // 앱 전용 스트립(build-mobile-app.mjs 의 stripAppOnlyMarkedBlocks) 결과를 독립적으로 단언한다.
      // 🔴 목록을 빌드 쪽과 공유하지 않는다 — 빌드가 조용히 죽어도 여기서 물게 하려는 것이다.
      //
      // 지워졌어야 하는 것 / 남아 있어야 하는 것을 함께 본다. "0건"만 세면 푸터를 통째로 날려
      // 개인정보처리방침·이용약관·사업자 정보가 앱에서 사라진 것도 통과시킨다(Play 정책·전자상거래법).
      const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
      const strayMarkers = [];
      const strayBlocks = [];
      let scanned = 0;
      for (const file of htmlFiles) {
        const html = await fs.readFile(file, "utf8").catch(() => "");
        if (!html) continue;
        scanned += 1;
        const rel = path.relative(DIST, file).replace(/\\/g, "/");
        if (html.includes("<!--cd-app-strip-->") || html.includes("<!--/cd-app-strip-->")) strayMarkers.push(rel);
        if (html.includes('class="cd-footer-shell"') || html.includes('id="cdAdminFlowerWrap"')) strayBlocks.push(rel);
      }
      check(
        `앱 스트립 표식 잔존 0건 (HTML ${scanned}개 스캔)`,
        strayMarkers.length === 0,
        strayMarkers.length ? `잔존: ${strayMarkers.slice(0, 5).join(", ")}` : "",
      );
      check(
        "SEO 링크 허브·관리자 진입 버튼 제거됨",
        strayBlocks.length === 0,
        strayBlocks.length ? `잔존: ${strayBlocks.slice(0, 5).join(", ")}` : "",
      );

      const shellHtml = await fs.readFile(path.join(DIST, "index.html"), "utf8").catch(() => "");
      const legalKept = ['href="/privacy/', 'href="/terms/', 'cd-footer-business-details'];
      const missingLegal = legalKept.filter((needle) => !shellHtml.includes(needle));
      check(
        "법적 고지 존치: 개인정보처리방침·이용약관 링크 + 사업자 정보",
        shellHtml.length > 0 && missingLegal.length === 0,
        missingLegal.length ? `누락: ${missingLegal.join(", ")}` : "dist/index.html 을 읽지 못했다",
      );
    }

    for (const prefix of ["", "en", "ja", "zh"]) {
      const label = prefix ? `/${prefix}/points` : "/points";
      check(`${label} 라우트 제거됨`, !(await exists(path.join(DIST, prefix, "points"))));
    }

    // SEO 전용 문서 — 앱 사용자는 도달하지 않는데 압축 후 28MB를 차지한다.
    for (const route of ["insights", "famous-saju"]) {
      check(`/${route} 라우트 제거됨`, !(await exists(path.join(DIST, route))));
    }

    // 웹 배포 전용 산출물 — build-mobile-app.mjs 의 removeWebOnlyArtifacts 가 지웠어야 한다.
    // 목록을 일부러 공유하지 않는다: 빌드 쪽 목록이 줄어도 이 단언이 독립적으로 문다(fail-closed).
    for (const name of ["_worker.js", "_routes.json", "_headers", "sitemap.xml", "robots.txt", "og", "404", "500", "admin"]) {
      check(`웹 전용 산출물 제거됨: /${name}`, !(await exists(path.join(DIST, name))));
    }

    // 참조되는 자산은 살아남아야 한다 — 프루닝이 실사용 자산을 먹으면 앱에서 이미지가 깨진다.
    // (다마고치는 index.html이 /tadagochi로 링크하는 실제 기능이고, tadagochi.html이
    //  fuctionassets/tadagochi* 이미지를 쓴다. 한때 이걸 '참조 0건'으로 오판했다.)
    check(
      "실사용 자산 존치: fuctionassets/tadagochi (다마고치)",
      await exists(path.join(DIST, "fuctionassets", "tadagochi")),
      "tadagochi.html이 쓰는 이미지가 사라졌다",
    );
    check("실사용 페이지 존치: /tadagochi", await exists(path.join(DIST, "tadagochi.html")));

    // 죽은 PNG 원본(webp 쌍 존재 + 참조 0건)이 남아있지 않은가.
    // 빌드와 같은 판정 함수를 쓴다 — 규칙을 두 번 쓰면 갈라진다.
    // 참조가 있는 PNG는 남는 게 맞으므로(fail-safe), '참조 0건인데 남은 것'만 잡는다.
    const referencedNames = await buildReferencedNameIndex(DIST);
    const deadSurvivors = [];
    for (const png of await walk(DIST, (file) => file.toLowerCase().endsWith(".png"))) {
      if (!(await exists(`${png.slice(0, -4)}.webp`))) continue;
      if (referencedNames.has(path.basename(png))) continue;
      deadSurvivors.push(path.relative(DIST, png).replace(/\\/g, "/"));
    }
    check(
      "죽은 PNG 원본(webp 쌍 + 참조 0건) 제거됨",
      deadSurvivors.length === 0,
      deadSurvivors.slice(0, 3).join(", "),
    );

    const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
    const missingGuard = [];
    const directSdkTag = [];
    for (const file of htmlFiles) {
      const html = await fs.readFile(file, "utf8");
      if (!html.includes(GUARD_PUBLIC_PATH)) missingGuard.push(path.relative(DIST, file).replace(/\\/g, "/"));
      // <script src="https://cdn.portone.io/...">를 HTML이 직접 걸고 있으면 가드보다 먼저 뜰 수 있다.
      if (/<script[^>]+src=["'][^"']*cdn\.portone\.io/i.test(html)) {
        directSdkTag.push(path.relative(DIST, file).replace(/\\/g, "/"));
      }
    }
    check(
      `모든 HTML에 가드 주입됨 (${htmlFiles.length - missingGuard.length}/${htmlFiles.length})`,
      missingGuard.length === 0,
      missingGuard.slice(0, 5).join(", "),
    );
    check(
      "PortOne SDK를 직접 거는 <script> 태그 없음",
      directSdkTag.length === 0,
      directSdkTag.slice(0, 5).join(", "),
    );

    // --- 4) 실제 페이지에 가드를 돌려 링크가 사라지는지 -------------------
    //
    // 라우트 파일을 지웠으니 링크가 남으면 그대로 404다. 정적 문자열 검사로는
    // "가드가 정말 지우는가"를 볼 수 없어 실제 산출물 HTML에 가드를 실행한다.
    // 페이지 자체 스크립트는 돌리지 않는다(1.9MB 인라인 JS라 느리고 불안정) —
    // 정적 앵커만 봐도 충분하고, 동적 생성분은 가드의 MutationObserver가 맡는다.
    console.log("\n[4] 실제 산출물 페이지에서 프루닝 링크가 사라지는가 (jsdom)");
    // 로케일 접두사가 붙은 링크(/en/insights/)도 프루닝 대상이다 — 라우트 파일이
    // LOCALE_PREFIXES 조합으로 지워지므로 접두사가 붙었다고 살려두면 죽은 링크가 된다.
    const PRUNED_HREF_RE = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/(?:insights|famous-saju)(?:\/|\?|#|$)/;
    const countPrunedLinks = (doc) =>
      Array.from(doc.querySelectorAll("a[href]")).filter((anchor) =>
        PRUNED_HREF_RE.test(String(anchor.getAttribute("href") || "").replace(/^https?:\/\/[^/]+/, "")),
      ).length;

    const pagesToCheck = [
      ["index.html", "홈(루트 셸)"],
      [path.join("saju", "basic", "index.html"), "/saju/basic (앱 탭 — /insights 링크 있던 곳)"],
      [path.join("en", "today", "index.html"), "/en/today (로케일 페이지 — /en/insights 링크 있던 곳)"],
    ];

    for (const [relPath, label] of pagesToCheck) {
      const full = path.join(DIST, relPath);
      if (!(await exists(full))) {
        check(`${label}: 파일 존재`, false, `${relPath} 없음`);
        continue;
      }
      const pageDom = new JSDOM(await fs.readFile(full, "utf8"), {
        url: "https://code-destiny.com/",
        runScripts: "outside-only",
      });
      const pageWindow = pageDom.window;
      pageWindow.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: {} }) });

      const beforeCount = countPrunedLinks(pageWindow.document);

      pageWindow.eval(guardSource);
      // 가드는 DOMContentLoaded에 정리를 건다 — jsdom은 이미 로드가 끝나 있어
      // 즉시 실행되지만, 확실히 하려고 한 번 더 부른다(멱등).
      pageWindow.__cdAppPaymentGuard.applyPrunedRouteCleanup();

      const afterCount = countPrunedLinks(pageWindow.document);

      check(
        `${label}: 프루닝 링크 0건 (가드 실행 전 ${beforeCount}건)`,
        afterCount === 0,
        `남은 링크 ${afterCount}건`,
      );

      if (relPath === "index.html") {
        // 섹션째 사라져야 한다 — 앵커만 지우면 제목만 남은 빈 카드가 된다.
        for (const id of ["cd-insights-body", "cd-famous-body", "fsp-grid"]) {
          check(`홈: #${id} 제거됨`, !pageWindow.document.getElementById(id));
        }
        // 과잉 제거 감시 — 섹션 부모를 지우다 홈을 통째로 날리면 안 된다.
        // (.cd-section-body는 index.html에 2개뿐이고 둘 다 프루닝 대상이라 기준이 못 된다)
        // 모바일 홈 허브(#cdMobileDestinyHub)는 반응형 리디자인(v20260723)으로 제거됐으므로,
        // 홈 루트(#inputPage) 또는 슬림 헤더(#cdMobileHeader)가 살아있는지로 '홈 통째 삭제'를 감시한다.
        check(
          "홈: 모바일 홈이 살아있음 (과잉 제거 없음)",
          Boolean(pageWindow.document.getElementById("inputPage") || pageWindow.document.getElementById("cdMobileHeader")),
        );
        const survivingFeatureLinks = pageWindow.document.querySelectorAll(
          'a[href^="/oracle/"], a[href^="/fortune-tea-house"], a[href^="/saju"], a[href^="/tarot"]',
        ).length;
        check(
          `홈: 기능 진입 링크가 살아있음 (${survivingFeatureLinks}건)`,
          survivingFeatureLinks > 0,
          "기능 링크까지 사라졌다 — 앵커 제거가 과했다",
        );
      }
      pageWindow.close();
    }
  }
} else {
  console.log("\n[3] dist 검증 생략 (--dist 미지정)");
}

if (failures.length) {
  console.error(`\n[실패] 앱 PortOne 차단 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[통과] 앱 PortOne 차단 검증 — SDK 무력화·단건결제 Play 전환·/points 차단 확인\n");
