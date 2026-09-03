// 단건 결제 confirm 의 "승인 후 복구" 계약을 소스 수준으로 고정한다(브레이스 균형 슬라이스).
//
// 배경(2026-08-12): 셸이 복귀 티켓(cd_direct_payment_resume)을 requestPayment 반환 직후에 지워,
// 카드 승인은 났는데 confirm 이 5xx/202 로 밀리면 복구 수단이 사라졌다(돈은 나가고 지급은 안 됨).
// 또 202 PENDING_CONFIRMATION 이 일반 실패 문구("결제가 완료되지 않았어요")로 세탁돼 재결제를
// 유도했다 — 이중결제 방향의 결함. 이 가드는 그 두 가지가 되돌아오지 못하게 한다:
//   ① 티켓 회수는 정확히 2곳 — 취소·PG거절 분기(죽은 시도 정리)와 confirm 검증 성공 뒤.
//      requestPayment 직후의 무조건 회수가 부활하면 회수 지점 수가 달라져 여기서 잡힌다.
//   ② PENDING_CONFIRMATION/GRANT_PENDING 분기가 _cdHasVerifiedServerAccess 판정보다 먼저 온다.
//      그 분기 안에서는 티켓을 지우지 않는다(복귀·새로고침이 멱등 confirm 으로 마무리를 재시도).
//
// 추가(2026-08-13) ③ 중복 결제 코드(ALREADY_PAID 등)에서 **결제창을 다시 열지 않는다**.
//   예전에는 그 자리에서 새 Idempotency-Key 로 checkout 을 통째로 재실행했는데, 키가 바뀌면
//   서버 deriveOrderId 가 다른 주문을 낳아 CAS 가 막지 못하고 이미 승인된 카드에 **한 번 더**
//   결제창이 떴다. 이제 기존 주문으로 confirm 을 먼저 태우고(멱등 200), PG 가 미결제라고 확정한
//   422 에서만 새 키로 재시도한다. 이 순서가 뒤집히면 이중결제가 되돌아온다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
  "public/static/index.html",
];

// 회수는 checkout-entry 의 티켓 저장소 접근자로 위임됐다(localStorage 우선 + sessionStorage 폴백).
// 마커가 호출 한 줄이 되어도 "정확히 2곳" 계약은 그대로다.
const REMOVE_MARKER = "_cdClearDirectResumeTicket()";

for (const file of SHELL_FILES) {
  const source = readFileSync(path.join(root, file), "utf8");
  const core = sliceFunction(source, "  async function _cdRunDirectKrwCheckout(options) {", `${file}: _cdRunDirectKrwCheckout`);

  // ① 티켓 회수는 정확히 2곳(취소·거절 분기 + 검증 성공 뒤)이다.
  const removals = core.split(REMOVE_MARKER).length - 1;
  assert.equal(removals, 2, `${file}: 복귀 티켓 회수는 정확히 2곳이어야 한다(현재 ${removals}곳) — requestPayment 직후 무조건 회수 부활 금지`);

  const requestPaymentAt = core.indexOf("window.PortOne.requestPayment(requestData)");
  const confirmPostAt = core.indexOf("fetchJsonWithAuth('/api/billing/confirm'");
  const abortBranchAt = core.indexOf("if (!rsp || rsp.code || !paymentId) {");
  const firstRemovalAt = core.indexOf(REMOVE_MARKER);
  assert.ok(requestPaymentAt >= 0 && confirmPostAt >= 0 && abortBranchAt >= 0, `${file}: 핵심 마커 소실`);
  assert.ok(firstRemovalAt > abortBranchAt, `${file}: 첫 티켓 회수는 취소·거절 분기 안이어야 한다(그 이전 무조건 회수 금지)`);

  // ② PENDING 분기가 일반 실패 판정보다 먼저 오고, 성공 회수는 검증 캐시 정리 뒤에 온다.
  const pendingBranchAt = core.indexOf("_cdConfirmPendingCode === 'PENDING_CONFIRMATION'");
  const verifiedAccessAt = core.indexOf("_cdHasVerifiedServerAccess(confirmRes.payload");
  const successClearAt = core.indexOf("_cdClearPaidPrecheckCache('single-payment-success')");
  const lastRemovalAt = core.lastIndexOf(REMOVE_MARKER);
  assert.ok(pendingBranchAt >= 0, `${file}: PENDING_CONFIRMATION 분기가 없다 — 202 가 일반 실패 문구로 세탁된다(재결제 유도)`);
  assert.ok(pendingBranchAt < verifiedAccessAt, `${file}: PENDING 분기는 _cdHasVerifiedServerAccess 판정보다 먼저 와야 한다`);
  assert.ok(core.includes("'GRANT_PENDING'"), `${file}: V2 confirm 의 GRANT_PENDING 코드도 같은 분기로 받아야 한다(컷오버 대비)`);
  assert.ok(lastRemovalAt > successClearAt, `${file}: 성공 측 티켓 회수는 confirm 검증·캐시 정리 뒤여야 한다`);

  // PENDING 분기 안에서는 티켓을 지우지 않는다(분기 시작~throw 사이 슬라이스 검사).
  const pendingSlice = core.slice(pendingBranchAt, core.indexOf("throw _cdConfirmPendingError;", pendingBranchAt));
  assert.ok(!pendingSlice.includes(REMOVE_MARKER), `${file}: PENDING 분기에서 복귀 티켓을 지우면 복구 경로가 사라진다`);

  // ③ 중복 결제 코드는 확정을 먼저 태운다 — 새 키 재시도는 confirm 뒤 422 에서만.
  const duplicateCheckAt = core.indexOf("_cdIsPortOneDuplicatePaymentCode(");
  const duplicateRetryAt = core.indexOf("__cdDuplicatePaymentRetry: true");
  const fallbackGuardAt = core.indexOf("if (!_cdDuplicateConfirmFallback) {");
  assert.ok(duplicateCheckAt >= 0, `${file}: 중복 결제 코드 판정이 사라졌다 — ALREADY_PAID 가 일반 실패로 닫히면 재결제를 유도한다`);
  assert.ok(
    duplicateCheckAt < confirmPostAt,
    `${file}: 중복 결제 판정은 confirm 호출보다 먼저 와야 한다(확정으로 흘려보낼지 결정하는 분기다)`,
  );
  assert.ok(
    duplicateRetryAt > confirmPostAt,
    `${file}: 중복 결제 시 새 키 재시도가 confirm 보다 먼저 오면 결제창이 다시 떠 이중결제가 된다`,
  );
  assert.ok(
    core.includes("_cdDuplicateConfirmFallback && Number(confirmRes.status) === 422"),
    `${file}: 새 키 재시도는 422(PG 가 미결제로 확정)에서만 허용해야 한다 — 503 은 결제 여부를 모른다`,
  );
  assert.ok(
    fallbackGuardAt >= 0 && fallbackGuardAt < firstRemovalAt,
    `${file}: 중복 결제 폴백에서는 복귀 티켓을 지우면 안 된다(돈이 이미 나갔을 수 있다)`,
  );
}

// dp 폴백은 원래 올바른 순서(성공 후 회수)였다 — 그 계약이 유지되는지 함께 고정한다.
for (const file of ["js/destiny-profile.js", "public/js/destiny-profile.js"]) {
  const source = readFileSync(path.join(root, file), "utf8");
  assert.ok(
    source.includes("// 확정됐으니 이제 복귀 티켓을 회수한다."),
    `${file}: dp 의 confirm-후-회수 계약 주석이 사라졌다 — 순서 회귀 여부를 확인할 것`,
  );
  // dp 는 새 키 재시도를 가진 적이 없다(추가하지 말 것). 대신 중복 결제 코드에서 티켓을 지우고
  // 실패로 닫으면 복구 수단 없이 "결제가 완료되지 않았습니다"가 떠 사용자가 다시 결제한다.
  assert.ok(
    source.includes("_dpIsPortOneDuplicatePaymentCode("),
    `${file}: dp 의 중복 결제 코드 판정이 사라졌다 — ALREADY_PAID 가 일반 실패로 닫힌다`,
  );
  assert.ok(
    source.includes("if (!dpDuplicateConfirm) {"),
    `${file}: dp 의 티켓 회수·실패 throw 는 중복 결제 폴백에서 제외돼야 한다`,
  );
}

console.log("verify-direct-confirm-pending-recovery: OK — 티켓 수명(2회수 지점·순서)과 PENDING_CONFIRMATION 분기, 7셸+dp 패리티 통과");
