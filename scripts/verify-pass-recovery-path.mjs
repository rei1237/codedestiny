// 이용권 구제 경로(결제창에서 보유 이용권이 그 자리에서 적용되는 길) 회귀 방지.
//
// 실제 사고(2026-08-01): 결제창의 '이용권으로 구매' 카드가 이용권을 확인하기 **전에** 로컬 구독 스냅샷을
// 먼저 지우고 서버에 물었다. 그 확인이 degrade/타임아웃으로 실패하면 판정 근거가 영구히 사라져,
// 그 뒤 모든 유료 클릭에서 낙관 즉시통과가 죽고 매번 결제창이 떴다. 사용자에게는 "이용권이 잘 되다가
// 한 번 실패하면 그 뒤로 계속 결제창"으로 보인다. 앞선 사고(PR #124)에서는 이용권 카드가 상점 링크로
// 축소돼 클릭해도 이용권이 적용되지 않았고, 핸들러·소비자는 남아 있어 이름 grep으로는 정상으로 보였다.
//
// 여기서 강제하는 계약(모두 **함수 본문을 중괄호 균형으로 잘라** 검사한다 — 이름 grep 금지, CLAUDE.md 원칙6):
//   A. 세 렌더러의 결제창은 이용권 카드를 렌더하고, 그 클릭이 **서버 이용권 재검증**을 돌린다.
//   B. 커버로 확인되면 결제 없이 'pass'(또는 pass_applied)로 닫는다 — 그 반환을 처리하는 소비자도 존재한다.
//   C. 이용권 확인 경로는 확인 **전에** 로컬 스냅샷을 지우지 않는다(실패 시 판정 근거 소실 금지).
//   D. 402(미커버·한도초과)는 스냅샷 **무효화** 사유가 아니다 — 402는 가격에 대한 답이지 보유 상태에 대한
//      답이 아니며, 무효화하면 한도 이내 다른 기능의 낙관 통과까지 죽는다.
//   E. 확인 **실패**를 '미커버'로 세탁해 상점으로 보내지 않는다 — 재시도 분기가 반드시 있어야 한다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const SHELL_MIRRORS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
const REACT_CLIENT = "app/_lib/billing-client.ts";
const STANDALONE_FALLBACKS = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

// 함수 본문 슬라이스·주석 제거는 verify-payment-choice-parity.mjs 와 **같은 공용 모듈**을 쓴다.
// 예전에는 두 스크립트가 같은 구현을 각자 복사해 갖고 있었고, 둘 다 정규식 리터럴을 문자열로 오인해
// 검사 대상 파일의 주석에 홑따옴표를 홀수로 쓰면 슬라이스가 잘렸다(자세한 경위는 모듈 상단 주석).
// TS 함수는 파라미터가 객체 타입({ force?: boolean ... })이면 중괄호 균형 슬라이서가 본문 대신
// 파라미터를 잘라 낸다. 그런 경우만 다음 최상위 선언 직전까지를 본문으로 본다.
function sliceUntilNextTopLevelDeclaration(source, startMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: 시작 마커 없음 (${startMarker.trim()})`);
  const rest = source.slice(start + startMarker.length);
  const next = rest.search(/\n(?:export\s+)?(?:async\s+)?function\s/);
  return next >= 0 ? source.slice(start, start + startMarker.length + next) : source.slice(start);
}

const failures = [];
function must(condition, message) {
  if (!condition) failures.push(message);
}

// ── A~C, E: 정적 셸 6미러 ────────────────────────────────────────────────────────────────
// 이용권 확인 함수: 결제창 안에서 서버 정본을 다시 읽는 지점.
for (const rel of SHELL_MIRRORS) {
  const source = read(rel);
  const label = `셸 ${rel}`;

  const refresh = stripComments(sliceFunction(source, "      async function refreshDirectEntitlementStatus() {", `${label}/refresh`));
  // A: 서버 재검증을 실제로 돌린다(로컬 스냅샷 fast-path 로 때우지 않는다).
  must(refresh.includes("_cdResolvePaidContentAccess"), `${label}: 이용권 카드가 서버 재검증(_cdResolvePaidContentAccess)을 호출하지 않습니다`);
  must(refresh.includes("requireServerPassCheck: true"), `${label}: 이용권 재검증에 requireServerPassCheck 가 없습니다`);
  must(refresh.includes("allowSnapshotFastPath: false"), `${label}: 결제창 안 이용권 확인이 오래된 스냅샷으로 미커버를 확정합니다`);
  // C: 확인 전에 스냅샷을 지우지 않는다.
  must(
    !/_cdClearSubscriptionSnapshotForCurrentUser\s*\(/.test(refresh),
    `${label}: 이용권 확인 전에 구독 스냅샷을 삭제합니다 — 확인이 실패하면 판정 근거가 영구히 사라집니다`,
  );
  // E: 확인 실패를 미커버와 구분한다.
  must(refresh.includes("pass_check_failed"), `${label}: 이용권 확인 실패(pass_check_failed)를 미커버와 구분하지 않습니다`);

  const choice = stripComments(sliceFunction(source, "  async function _cdChooseServicePaymentMode(", `${label}/choice`));
  // A: 이용권 카드를 렌더한다.
  must(choice.includes('data-mode="\' + passMode + \'"'), `${label}: 결제창이 이용권 카드를 렌더하지 않습니다`);

  // 🔴 이용권 카드 **클릭 분기 본문**만 잘라서 본다. 바깥 함수 전체를 대상으로 하면
  // refreshDirectEntitlementStatus() 정의부에 남은 문자열이 클릭 분기의 삭제를 가려 준다
  // (변이 테스트에서 실제로 이 오탐이 잡혔다).
  const passBranch = stripComments(sliceFunction(source, "          if (mode === 'pass-store' || mode === 'pass') {", `${label}/pass-branch`));
  // A: 그 카드 클릭이 확인 지점이다.
  must(passBranch.includes("refreshDirectEntitlementStatus()"), `${label}: 이용권 카드 클릭이 이용권을 재검증하지 않습니다(상점 링크로만 축소됨)`);
  // B: 커버로 확인되면 결제 없이 닫는다.
  must(passBranch.includes("close('pass')") || passBranch.includes("close('pass_applied')"), `${label}: 이용권 커버 확인 후 무료 통과로 닫는 경로가 없습니다`);
  // E: 실패는 상점으로 보내지 않고 재시도를 안내한다.
  must(passBranch.includes("pass_check_failed"), `${label}: 이용권 확인 실패 시 재시도 분기 없이 상점으로 보냅니다`);

  const explicitPassFallbackStart = source.indexOf("var passChoiceAccess = await _cdResolvePaidContentAccess({");
  const explicitPassFallbackEnd = source.indexOf("if (_cdIsPassBypassAccess(passChoiceAccess))", explicitPassFallbackStart);
  const explicitPassFallback = explicitPassFallbackStart >= 0 && explicitPassFallbackEnd > explicitPassFallbackStart
    ? source.slice(explicitPassFallbackStart, explicitPassFallbackEnd)
    : "";
  must(explicitPassFallback.includes("allowSnapshotFastPath: false"), `${label}: 결제창 이용권 선택 폴백이 스냅샷으로 미커버를 확정합니다`);

  // 재진입 직후의 인증 복구가 끝나기 전에 final POST가 나가면 첫 401이 이용권 미커버로 오인될 수 있다.
  // 기존 이용권 확인 UI 안에서 인증 single-flight를 먼저 완료하고, 그 뒤에만 final MEMBERSHIP_PASS를 보낸다.
  const finalPass = stripComments(sliceFunction(source, "  async function _cdResolvePaidContentAccess(content) {", `${label}/final-pass-auth-ready`));
  const authPrepareIndex = finalPass.indexOf("_cdPrepareMembershipPassAuth()");
  const passPostIndex = finalPass.indexOf("fetchJsonWithAuth('/api/billing/coin-gate'");
  must(authPrepareIndex >= 0, `${label}: 결제창 이용권 선택이 인증 준비 single-flight를 기다리지 않습니다`);
  must(passPostIndex >= 0 && authPrepareIndex < passPostIndex, `${label}: 인증 준비보다 MEMBERSHIP_PASS final POST가 먼저 나갑니다`);
  must(!finalPass.includes("status: 'payment_required', reason: 'auth_recovered_payment_required'"), `${label}: 인증 401을 이용권 미커버/상점 이동으로 바꿉니다`);
}

// ── A~C, E: React 렌더러 ─────────────────────────────────────────────────────────────────
{
  const source = read(REACT_CLIENT);
  const label = `React ${REACT_CLIENT}`;
  const modal = stripComments(sliceFunction(source, "async function openReactPaymentChoiceModalInner(", `${label}/modal`));

  must(modal.includes('data-mode="pass-store"'), `${label}: 결제창이 이용권 카드를 렌더하지 않습니다`);
  // A: 읽기 전용 GET이 아니라 공용 런타임의 최종 MEMBERSHIP_PASS 적용을 호출한다.
  must(modal.includes("__cdApplyMembershipPassBeforePayment"), `${label}: 이용권 카드 클릭이 최종 이용권 적용을 호출하지 않습니다`);
  must(!/fetchPaymentEligibility\(/.test(modal), `${label}: 이용권 카드 클릭이 최종 판정 전에 읽기 전용 이용권 조회로 갈립니다`);
  must(modal.includes("requestId: toText(opts.requestId)"), `${label}: React 최종 이용권 적용이 기존 requestId를 전달하지 않습니다`);
  must(modal.includes("featureKey: passCheckFeatureKey"), `${label}: React 최종 이용권 적용이 표시 기능 키를 전달하지 않습니다`);
  // B: 커버면 'pass' 로 닫는다.
  must(modal.includes('close("pass")'), `${label}: 이용권 커버 확인 후 무료 통과('pass')로 닫는 경로가 없습니다`);
  // C: 확인 전 스냅샷 선삭제 금지 — force:true 는 fetchPaymentEligibility 진입부에서 스냅샷을 지운다.
  must(!/force:\s*true[^}]*phase:\s*"pass"/.test(modal), `${label}: 이용권 확인이 force:true 로 스냅샷을 선삭제합니다 — revalidate 를 쓰세요`);
  must(!/clearSubscriptionSnapshotForUser\s*\(/.test(modal), `${label}: 결제창이 구독 스냅샷을 직접 삭제합니다`);
  // E: 확인 실패는 상점으로 세탁하지 않는다.
  must(modal.includes("passCheckRetry"), `${label}: 이용권 확인 실패 시 재시도 분기 없이 상점으로 보냅니다`);
  must(modal.includes('passStatus !== "payment_required"'), `${label}: 실제 미커버 외 응답도 이용권 상점으로 이동할 수 있습니다`);

  // C(진입부 계약): revalidate 는 스냅샷을 지우지 않는 경로여야 한다.
  const uncached = stripComments(sliceUntilNextTopLevelDeclaration(source, "async function fetchPaymentEligibilityUncached(", `${label}/eligibility`));
  must(uncached.includes("revalidate"), `${label}: fetchPaymentEligibility 에 스냅샷 비파괴 재검증(revalidate) 경로가 없습니다`);
  const forceBlock = uncached.slice(uncached.indexOf("clearSubscriptionSnapshotForUser"));
  must(
    !/revalidate\s*===\s*true\s*\)\s*\{\s*clearSubscriptionSnapshotForUser/.test(uncached) && forceBlock.length > 0,
    `${label}: revalidate 경로가 스냅샷을 삭제합니다`,
  );

  // D: 402 는 스냅샷 무효화 사유가 아니다.
  const invalidate = stripComments(sliceFunction(source, "function shouldInvalidateSubscriptionSnapshot(", `${label}/invalidate`));
  must(!invalidate.includes("402"), `${label}: shouldInvalidateSubscriptionSnapshot 이 402 로 스냅샷을 버립니다 — 402는 가격에 대한 답이지 보유 상태에 대한 답이 아닙니다`);
  must(!invalidate.includes("PAYMENT_REQUIRED"), `${label}: shouldInvalidateSubscriptionSnapshot 이 PAYMENT_REQUIRED 로 스냅샷을 버립니다`);
  must(!invalidate.includes("MEMBERSHIP_PASS_NOT_COVERED"), `${label}: shouldInvalidateSubscriptionSnapshot 이 MEMBERSHIP_PASS_NOT_COVERED 로 스냅샷을 버립니다`);
  must(invalidate.includes("401") && invalidate.includes("403"), `${label}: shouldInvalidateSubscriptionSnapshot 이 401/403(보유 주체 변경)을 놓칩니다`);

  // D(대칭): 402 는 삭제 대신 재검증으로 처리되어야 한다.
  must(source.includes("shouldRefreshSubscriptionSnapshotAfterDenial"), `${label}: 402 를 삭제 없이 재검증하는 경로(shouldRefreshSubscriptionSnapshotAfterDenial)가 없습니다`);

  // D(낙관 잠금): 전역 60초 잠금은 '한도 초과'만으로 켜지면 안 된다.
  const record = stripComments(sliceFunction(source, "async function recordMembershipPassInBackground(", `${label}/record`));
  must(record.includes("passLimitForTier"), `${label}: 낙관 잠금이 한도초과 402 와 보유상태 불일치를 구분하지 않습니다(전역 60초 잠금이 한도 이내 기능까지 죽입니다)`);

}

// ── A~C, E: 독립 정적 폴백 2사본 ──────────────────────────────────────────────────────────
for (const rel of STANDALONE_FALLBACKS) {
  const source = read(rel);
  const label = `독립 폴백 ${rel}`;
  const modal = stripComments(sliceFunction(source, "  function _dpRenderStandalonePaymentChoice(", `${label}/modal`));

  must(modal.includes('data-mode="pass-store"'), `${label}: 결제창이 이용권 카드를 렌더하지 않습니다`);
  must(modal.includes("__cdApplyMembershipPassBeforePayment"), `${label}: 이용권 카드 클릭이 이용권을 적용해 보지 않습니다(상점 링크로만 축소됨)`);
  must(modal.includes("finish('pass')"), `${label}: 이용권 커버 확인 후 무료 통과('pass')로 닫는 경로가 없습니다`);
  // B(소비자): finish() 가 'pass' 를 실제로 resolve 해야 한다 — 화이트리스트에서 빠지면 조용히 'cancel' 이 된다.
  const finish = stripComments(sliceFunction(modal, "      function finish(choice) {", `${label}/finish`));
  must(/choice\s*===\s*'pass'/.test(finish), `${label}: finish() 화이트리스트에 'pass' 가 없어 이용권 선택이 조용히 취소로 바뀝니다`);
  must(!/_dpRemoveSubscriptionSnapshot\s*\(/.test(modal), `${label}: 결제창이 구독 스냅샷을 직접 삭제합니다`);
  must(modal.includes("passCheckRetry"), `${label}: 이용권 확인 실패 시 재시도 분기 없이 상점으로 보냅니다`);

  // D(낙관 잠금): 한도초과 402 로 전역 잠금을 켜지 않는다.
  const record = stripComments(sliceFunction(source, "  function _dpRecordMembershipPassInBackground(", `${label}/record`));
  must(record.includes("_dpMembershipPassLimitForTier"), `${label}: 낙관 잠금이 한도초과 402 와 보유상태 불일치를 구분하지 않습니다`);

  const finalApply = stripComments(sliceFunction(source, "  async function _dpApplyMembershipPassBeforePayment(", `${label}/final-pass-apply`));
  must(!finalApply.includes("cached && cached.status === 'payment_required'"), `${label}: 직전 미커버 캐시가 다음 명시적 이용권 확인을 막습니다`);
  must(!finalApply.includes("_dpStorePaidPassGateResult(cacheKey, notCovered)"), `${label}: 미커버 결과를 재사용해 다음 이용권 확인을 막습니다`);
  const authPrepareIndex = finalApply.indexOf("_dpPrepareMembershipPassAuth()");
  const passPostIndex = finalApply.indexOf("_dpPaymentFetchJson('/api/billing/coin-gate'");
  must(authPrepareIndex >= 0, `${label}: 독립 정적 이용권 선택이 인증 준비 single-flight를 기다리지 않습니다`);
  must(passPostIndex >= 0 && authPrepareIndex < passPostIndex, `${label}: 독립 정적 인증 준비보다 MEMBERSHIP_PASS final POST가 먼저 나갑니다`);
  must(!finalApply.includes("status: 'payment_required', code: code || 'AUTH_REQUIRED'"), `${label}: 독립 정적 인증 401을 이용권 미커버/상점 이동으로 바꿉니다`);
}

// ── B(소비자): 게이트가 결제창의 'pass' 반환을 실제로 처리한다 ────────────────────────────
for (const rel of STANDALONE_FALLBACKS) {
  const source = stripComments(read(rel));
  must(/choice\s*===\s*'pass'/.test(source), `${rel}: 게이트에 결제창 'pass' 반환 소비자가 없습니다 — 이용권을 골라도 아무 일도 일어나지 않습니다`);
}

// ── D: 셸의 402 처리도 삭제가 아니라 재검증 ────────────────────────────────────────────────
for (const rel of SHELL_MIRRORS) {
  const source = read(rel);
  const label = `셸 ${rel}`;
  const handler = stripComments(sliceFunction(source, "  function _cdHandleSubscriptionSnapshotServerSignal(", `${label}/signal`));
  must(handler.includes("_cdSubscriptionSnapshotSignalIsIdentityChange"), `${label}: 402 와 401/403 을 구분하지 않고 스냅샷을 삭제합니다`);
  must(handler.includes("_cdScheduleSubscriptionSnapshotRevalidate"), `${label}: 402 를 삭제 없이 재검증하는 경로가 없습니다`);

  const identity = stripComments(sliceFunction(source, "  function _cdSubscriptionSnapshotSignalIsIdentityChange(", `${label}/identity`));
  must(!identity.includes("402"), `${label}: 402 를 '보유 주체 변경'으로 취급해 스냅샷을 버립니다`);

  const record = stripComments(sliceFunction(source, "  function _cdRecordMembershipPassInBackground(", `${label}/record`));
  must(record.includes("passLimitForTier"), `${label}: 낙관 잠금이 한도초과 402 와 보유상태 불일치를 구분하지 않습니다`);
}

if (failures.length) {
  console.error("[verify-pass-recovery-path] FAIL");
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log(`[verify-pass-recovery-path] PASS (셸 ${SHELL_MIRRORS.length}미러 + React + 독립 폴백 ${STANDALONE_FALLBACKS.length}사본)`);
