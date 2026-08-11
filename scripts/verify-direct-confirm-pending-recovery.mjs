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

const REMOVE_MARKER = "sessionStorage.removeItem('cd_direct_payment_resume')";

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
}

// dp 폴백은 원래 올바른 순서(성공 후 회수)였다 — 그 계약이 유지되는지 함께 고정한다.
for (const file of ["js/destiny-profile.js", "public/js/destiny-profile.js"]) {
  const source = readFileSync(path.join(root, file), "utf8");
  assert.ok(
    source.includes("// 확정됐으니 이제 복귀 티켓을 회수한다."),
    `${file}: dp 의 confirm-후-회수 계약 주석이 사라졌다 — 순서 회귀 여부를 확인할 것`,
  );
}

console.log("verify-direct-confirm-pending-recovery: OK — 티켓 수명(2회수 지점·순서)과 PENDING_CONFIRMATION 분기, 7셸+dp 패리티 통과");
