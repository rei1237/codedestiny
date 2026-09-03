// 이용권 판정 실패가 "결제 자체를 못 하는 막다른 길"이 되지 않는지 회귀 방지.
//
// 실제 사고(2026-09-03): 사주 분석 화면에서 이용권 보유자가 유료 섹션을 열면
// "Unlock permission could not be verified." / "이용권 접근 권한 저장을 확인하지 못했습니다." 가 뜨고,
// 그 뒤 **단건 결제도 월정석도 고를 수 없었다.** 원인은 이용권 판정과 결제창 호출 사이에
// `_cdUpdatePaidFeatureGate({status:'error'}) + window.alert + return` 3종 세트가 들어간 것이다.
//   - `'error'` 는 `gate.dataset.readyPay` 정규식(readyToPay|noEntitlement|paymentFailed)에 **없어서**
//     "결제 방식 선택" 버튼이 아예 렌더되지 않는다.
//   - `_cdEndPaidFeatureInFlight` 도 이 게이트를 닫지 않아 전체화면 모달 + 스크롤 락이 남는다.
//   - `return` 이 결제창 호출(`_cdChooseServicePaymentMode`)보다 **앞**이라 3옵션이 영영 안 뜬다.
// 즉 이용권을 산 사람만 결제가 막히는 역설이 된다.
//
// 여기서 강제하는 계약 — 이용권 판정이 끝난 지점부터 결제창을 여는 줄까지의 **구간**을 잘라서 본다.
// 이름 grep 이 아니라 구간 슬라이스인 이유는 CLAUDE.md 원칙 6과 같다(같은 이름이 다른 맥락에 여럿 있다).
//   A. 그 구간에 `window.alert(` 가 없다        — alert 는 언제나 return 과 짝이었다.
//   B. 그 구간에 `status: 'error'` 가 없다      — readyPay 밖 상태 = 전진 버튼 소멸.
//   C. 사유를 버리지 않는다                     — 결제창 호출이 `passOutcomeNote` 를 받는다.
//   D. 🔴 결제 **후** 형제 지점은 예외다        — 이미 돈이 움직였으므로 결제창 fall-through 는 이중
//      청구가 된다. 대신 그 지점의 게이트 상태가 readyPay 에 포함된 값인지를 별도로 단언한다.
//
// 🔴 fail-closed: 슬라이스 앵커를 하나라도 못 찾으면 통과가 아니라 실패다. 손으로 쓴 심볼 목록이
//    조용히 죽는 사고가 이 레포에 이미 있었다(resolve-paid-gate-scope.mjs 의 __cdRequireTileLockGate).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const SHELL_MIRRORS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
];

// 이용권 판정 직후 ~ 결제창 호출 직전. `nth` 는 시작 앵커가 여러 번 나올 때 몇 번째인지.
const FALLTHROUGH_REGIONS = [
  {
    label: "해제 버튼(tryUnlockFeature)",
    start: "if (!passAccess) passAccess = { status: 'payment_required' };",
    startNth: 0,
    end: "var paymentChoice = await _cdChooseServicePaymentMode({",
    requiresNote: true,
  },
  {
    label: "타일 잠금 클릭",
    start: "if (!tilePassAccess) tilePassAccess = { status: 'payment_required' };",
    startNth: 0,
    end: "var tilePaymentChoice = await _cdChooseServicePaymentMode({",
    requiresNote: true,
  },
  {
    label: "회당 결제 타일(_cdRunPerUseCoinGate)",
    start: "if (!passAccess) passAccess = { status: 'payment_required' };",
    startNth: 1,
    end: "var perUseChoice = await _cdChooseServicePaymentMode({",
    // 이 경로는 게이트 오버레이를 쓰지 않아 사유 줄을 넘길 자리가 없다. A·B 만 강제한다.
    requiresNote: false,
  },
];

// 🔴 예외(계약 D) — 결제가 끝난 뒤의 저장 확인 실패. 결제창으로 흘려보내면 이중 청구가 되므로
//    구조는 그대로 두되, 게이트 상태가 readyPay 에 포함된 값이어야 한다.
const READY_PAY_STATUSES = ["readyToPay", "noEntitlement", "paymentFailed"];
const POST_PAYMENT_EXCEPTIONS = [
  {
    label: "해제 버튼 결제 후",
    anchor: "_cdFinalizeUnlockState(featureKey, result.payload);",
    within: 600,
  },
  {
    label: "타일 잠금 PortOne 결제 후",
    anchor: "_cdFinalizeUnlockState(tileLockKey, tileDirectPayload);",
    within: 600,
  },
];

const failures = [];
const must = (condition, message) => { if (!condition) failures.push(message); };

function indexOfNth(haystack, needle, nth) {
  let at = -1;
  for (let i = 0; i <= nth; i += 1) {
    at = haystack.indexOf(needle, at + 1);
    if (at < 0) return -1;
  }
  return at;
}

for (const rel of SHELL_MIRRORS) {
  const source = read(rel);
  const label = `셸 ${rel}`;

  for (const region of FALLTHROUGH_REGIONS) {
    const start = indexOfNth(source, region.start, region.startNth);
    // 🔴 앵커가 없으면 통과가 아니라 실패다. 리팩터로 앵커가 사라졌다면 이 가드를 함께 갱신해야 한다.
    must(start >= 0, `${label} / ${region.label}: 시작 앵커를 못 찾았습니다 — 가드가 아무것도 지키지 못합니다: ${region.start}`);
    const end = start >= 0 ? source.indexOf(region.end, start) : -1;
    must(end > start, `${label} / ${region.label}: 결제창 호출 앵커를 못 찾았습니다: ${region.end}`);
    if (start < 0 || end <= start) continue;

    const slice = source.slice(start, end);
    must(
      !slice.includes("window.alert("),
      `${label} / ${region.label}: 이용권 판정과 결제창 사이에 window.alert 가 있습니다 — 이 alert 는 언제나 return 과 짝이었고, 이용권 보유자가 단건·월정석 어느 쪽으로도 결제할 수 없게 됩니다.`,
    );
    must(
      !/status:\s*'error'/.test(slice),
      `${label} / ${region.label}: 이용권 판정과 결제창 사이에 status:'error' 게이트가 있습니다 — 'error' 는 readyPay(${READY_PAY_STATUSES.join("|")}) 밖이라 "결제 방식 선택" 버튼이 렌더되지 않습니다.`,
    );

    if (!region.requiresNote) continue;
    // 사유를 삼키지 않는다 — 왜 결제창이 떴는지 첫 줄로 알려 준다.
    must(
      // 지역 변수 이름은 경로마다 다르다(_cdUnlockPassOutcomeNote / _cdTilePassOutcomeNote).
      /passOutcomeNote/i.test(slice),
      `${label} / ${region.label}: 이용권 판정 실패 사유를 담는 passOutcomeNote 계산이 사라졌습니다.`,
    );
    const callTail = source.slice(end, end + 400);
    must(
      /passOutcomeNote\s*:/.test(callTail),
      `${label} / ${region.label}: _cdChooseServicePaymentMode 호출이 passOutcomeNote 를 넘기지 않습니다 — 결제창이 이유 없이 뜹니다.`,
    );
  }

  for (const exception of POST_PAYMENT_EXCEPTIONS) {
    const at = source.indexOf(exception.anchor);
    must(at >= 0, `${label} / ${exception.label}: 앵커를 못 찾았습니다 — 가드가 아무것도 지키지 못합니다: ${exception.anchor}`);
    if (at < 0) continue;
    const tail = source.slice(at, at + exception.within);
    must(
      tail.includes("if (!isTileKeyUnlocked("),
      `${label} / ${exception.label}: 결제 후 저장 확인 분기를 못 찾았습니다.`,
    );
    const statusMatch = /_cdUpdatePaidFeatureGate\(\{[^}]*status:\s*'([A-Za-z]+)'/.exec(tail);
    must(statusMatch, `${label} / ${exception.label}: 결제 후 게이트 상태 갱신을 못 찾았습니다.`);
    if (!statusMatch) continue;
    must(
      READY_PAY_STATUSES.includes(statusMatch[1]),
      `${label} / ${exception.label}: 결제 후 게이트 상태가 '${statusMatch[1]}' 입니다 — readyPay(${READY_PAY_STATUSES.join("|")}) 밖이면 결제를 마친 사용자가 전진할 수 없습니다. 🔴 이 지점은 이미 돈이 움직인 뒤라 결제창 fall-through 로 고치면 안 됩니다(이중 청구).`,
    );
  }
}

assert.equal(
  failures.length,
  0,
  `이용권 결제 막다른 길 가드 실패 ${failures.length}건:\n- ${failures.join("\n- ")}`,
);
console.log(`[verify:paid-gate-no-dead-end] OK — 셸 ${SHELL_MIRRORS.length}개 × 구간 ${FALLTHROUGH_REGIONS.length}개 + 결제 후 예외 ${POST_PAYMENT_EXCEPTIONS.length}개 검사`);
