import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
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
const mePageSourcePath = existsSync(resolve(root, "app/me/MeClient.tsx"))
  ? "app/me/MeClient.tsx"
  : "app/me/page.tsx";
const mePageSource = readFileSync(resolve(root, mePageSourcePath), "utf8");
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

// 🔴 "단건결제를 눌렀는데 PG창 앞에 또 다른 화면이 뜬다" 회귀 가드 (2026-07)
// 세 증상이 각각 다른 원인이었다: ① 셸 캐시 새니타이저가 결제용 휴대폰 번호를 화이트리스트에서
// 빠뜨려 이미 입력한 번호를 매번 다시 물었다(그리고 dp 가 저장한 번호까지 덮어 지웠다) ② 이용권
// 선검사가 '미커버'로 끝난 직후 readyToPay/loadingProducts 게이트 상태를 emit 해 '선택 대기 /
// 결제 상품 보기' 패널이 결제수단 모달·번호 입력창을 덮었다 ③ 단건을 고른 뒤 PG창이 열리기 전에
// paymentPreparing 대기 오버레이를 띄웠고, access_check.single("단건으로 카드 결제를 준비 중이에요")
// 카피가 접근 확인 단계에 물려 있었다.
function runInstantPgWindowTests() {
  // ① 셸 캐시 새니타이저는 결제용 번호를 반드시 통과시킨다(dp 새니타이저와 대칭).
  const sanitizerIndex = indexSource.indexOf("function __cdSanitizeAuthUserCache(");
  assert.ok(sanitizerIndex >= 0, "shell auth-user cache sanitizer must exist");
  const sanitizerBody = indexSource.slice(sanitizerIndex, sanitizerIndex + 4000);
  assertContains(sanitizerBody, "if (user.phoneNumber) safe.phoneNumber = String(user.phoneNumber);", "shell auth-user cache must keep phoneNumber (payment phone re-prompt regression)");
  assertContains(sanitizerBody, "if (user.phone) safe.phone = String(user.phone);", "shell auth-user cache must keep phone (payment phone re-prompt regression)");
  assertContains(indexSource, "window._cdReadLocalPaymentPhoneNumber = _cdReadLocalPaymentPhoneNumber;", "shell must expose the local payment-phone reader for the dp path");

  // ① dp 는 서버 왕복 전에 로컬 번호를 먼저 보고, 조회 실패를 '번호 없음'으로 단정하지 않는다.
  assertContains(destinyProfileSource, "function _dpReadLocalPaymentPhoneNumber()", "dp local payment-phone reader");
  assertBefore(destinyProfileSource, "var localPhone = _dpReadLocalPaymentPhoneNumber();", "var current = await _dpGetPaymentPhoneStatus();", "dp must read the cached phone before the server round-trip");
  assertContains(destinyProfileSource, "var fallbackPhone = _dpReadLocalPaymentPhoneNumber();", "dp must fall back to the cached phone when the lookup fails (503 must not mean 'no phone')");
  // ① 번호 입력창은 대기 오버레이·게이트 패널을 내린 뒤에 뜬다(가려져서 입력 불가였던 회귀).
  assertContains(destinyProfileSource, "function _dpCloseBlockingLayersBeforePhonePrompt()", "dp must close blocking layers before the phone prompt");
  assertBefore(destinyProfileSource, "_dpCloseBlockingLayersBeforePhonePrompt();", "window._cdPromptDirectCheckoutPhoneNumber()", "dp must close blocking layers before opening the phone prompt");
  assertBefore(indexSource, "if (typeof _cdClosePaidFeatureGate === 'function') _cdClosePaidFeatureGate(); } catch (_) {}", "var overlay = document.createElement('div');", "shell phone prompt must close the gate before rendering its input");

  // 🔴 ①-b "사이트를 나갔다 다시 들어오면 번호를 또 묻는다" 회귀 가드 (2026-07-30)
  // 셸·dp 두 새니타이저만 대칭으로 맞췄고 세 번째(React app/_lib/auth-storage.ts)를 놓쳐서,
  // readSanitizedAuthUser 가 읽을 때마다 정제본을 되쓰며 셸이 저장해 둔 번호를 지웠다. 가입 시
  // 받은 번호도 persistSanitizedAuthUser 를 지나며 버려져 캐시에는 처음부터 번호가 없었다.
  const authStorageSource = readFileSync(resolve(root, "app/_lib/auth-storage.ts"), "utf8");
  assertContains(authStorageSource, 'copyString(source, "phoneNumber", safe);', "React auth-user cache must keep phoneNumber (payment phone re-prompt regression)");
  assertContains(authStorageSource, 'copyString(source, "phone", safe);', "React auth-user cache must keep phone (payment phone re-prompt regression)");

  // 조회 실패(401/503/쿨다운)를 '번호 없음'으로 세탁하지 않는다 — 확정 미보유일 때만 입력창을 띄운다.
  assertContains(indexSource, "savedState.checked = true;", "shell payment-phone lookup must mark a definitive answer");
  assertContains(indexSource, "if (current && current.checked !== true) {", "shell must not treat a failed payment-phone lookup as 'no phone'");
  assertContains(destinyProfileSource, "state.checked = true;", "dp payment-phone lookup must mark a definitive answer");
  assertContains(destinyProfileSource, "if (current && current.checked !== true) {", "dp must not treat a failed payment-phone lookup as 'no phone'");

  // degraded /api/auth/me(토큰 폴백)에는 phoneNumber 가 없다 — 전체 교체 캐시 쓰기가 번호를 지우면 안 된다.
  assertContains(indexSource, "if (!safe.phoneNumber && previousUser && previousUser.phoneNumber) safe.phoneNumber = String(previousUser.phoneNumber);", "shell auth-cache write must carry the known phone across a degraded me response");

  // 이용권(구독) 주문 응답도 저장된 번호를 실어 보낸다 → 결제 직전 번호 조회 왕복 자체가 사라진다.
  assertContains(paymentsRouteSource, "const orderCustomer = buildSinglePaymentCustomer(currentUser, auth.userId);", "membership-pass order must carry the saved customer phone");
  assertContains(destinyProfileSource, "orderCustomer.phoneNumber,", "dp must read the server-supplied order.customer phone");

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
  assertContains(verdictBody, "_cdRecordMembershipPassInBackground(item, coinCost, requestId);", "covered snapshot must grant optimistically and record in the background");
  assertContains(indexSource, "return status === 'payment_required' || status === 'already_unlocked' || status === 'pass_applied';", "pass-applied snapshot prechecks must be cached during the short precheck window");
  assertContains(indexSource, "if (cachedStatus === 'pass_applied') return false;", "cached pass-applied prechecks must not be force-refreshed into intermittent 503 failures");

  // ② 진입 경로에는 서버 왕복이 없다 — 두 진입점 모두 snapshotVerdictOnly 로 스냅샷 판정만 쓴다.
  //    (메인 게이트 _cdOpenPaidServiceGate, 결제창 직행 경로 _cdResolvePassBeforePaymentChoice)
  assertContains(indexSource, "snapshotVerdictOnly: true,", "entry pass check must be snapshot-only");
  assert.ok(
    indexSource.split("snapshotVerdictOnly: true,").length - 1 >= 2,
    "both entry paths (main gate and payment-choice shortcut) must opt into the snapshot-only verdict",
  );
  assertContains(
    indexSource,
    "if (item.snapshotVerdictOnly === true && !isBackgroundPassRecord) {",
    "indeterminate snapshot must open the checkout instead of asking the server",
  );
  // ③ 진입 확인 화면 자체가 없다 — 대기 UI 를 켜지 않고, 중복 클릭 가드만 남긴다.
  assertContains(indexSource, "suppressWaitUi: true", "entry gate must not raise a pass-checking wait screen");
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
  Payment.findOneAndUpdate = (_criteria, update = {}) => {
    if (Array.isArray(_criteria?.status?.$nin) && _criteria.status.$nin.includes(state.payment.status)) {
      return query(null);
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
  assertContains(indexSource, "phoneNumber: customerPhone", "PortOne V2 customer phoneNumber");
  assertContains(indexSource, "hasBuyerPhoneNumber: Boolean(customerPhone)", "direct checkout safe phone presence log");
  assertContains(destinyProfileSource, "async function _dpEnsurePaymentPhoneNumber()", "runtime Inicis phone prompt");
  assertContains(destinyProfileSource, "customerPhone = await _dpEnsurePaymentPhoneNumber()", "runtime direct checkout phone fallback");
  assertContains(destinyProfileSource, "phoneNumber: customerPhone", "runtime PortOne V2 customer phoneNumber");
  assertBefore(destinyProfileSource, "customerPhone = await _dpEnsurePaymentPhoneNumber()", "window.PortOne.requestPayment(requestData)", "runtime phone fallback must run before PortOne window opens");
  // 두 결제 경로 모두 모달 오픈 시 프리페치해 둔 번호 조회 결과를 재사용해야 한다(왕복 1회 절감).
  // 예전에는 포인트 패키지 경로만 프리페치 없이 호출해 클릭 후 번호 조회 왕복이 한 번 더 있었다.
  assertContains(pointsPageSource, "ensurePaymentPhoneNumber(apiBase, authUser, paymentPhonePrefetchRef.current)", "points page reuses the prefetched payment phone lookup");
  assertContains(pointsPageSource, "phoneNumber: resolvedPhoneNumber", "points page PortOne phoneNumber");
  assertContains(mePageSource, "const result = await runBillingCoinGate({", "profile actions delegate checkout to the shared Payment Service");
  assertContains(mePageSource, "paymentMode: \"DIRECT_KRW\"", "profile action card checkout uses the shared direct-KRW command");
  assertContains(mePageSource, "paymentMode: \"MOONLIGHT_STONE\"", "profile action monthly checkout uses the shared monthly command");
  assertNotContains(mePageSource, "window.PortOne", "profile actions must not own a second PortOne orchestrator");
  assertNotContains(mePageSource, "/api/payments/prepare", "profile actions must not prepare orders outside the shared checkout");
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
  runPortOneSdkLoaderResilienceTests();
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
