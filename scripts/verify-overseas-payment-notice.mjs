// 해외카드 결제 고지와 참고 환산 표기가 **결제 금액으로 새지 않는지** 본다.
//
// 왜 필요한가:
//   KG이니시스 해외카드결제 특약은 승인·정산이 **모두 KRW** 다
//   (help.portone.io/content/inicis-international, 2026-08-28 확인). 그래서 화면의 외화 표기는
//   언제나 **참고용 개산가**이고, 실제 청구는 원화다. 이 둘이 뒤섞이면 두 가지가 동시에 깨진다:
//
//     ① 화면 금액 ≠ 승인 금액  → PG 심사 탈락 사유이자 카드사 분쟁의 씨앗
//     ② 환율이 움직일 때마다 판매가가 바뀜 → 가격 정책이 환율에 종속된다
//
//   한 번 새기 시작하면 조용하다. 환산값이 totalAmount 로 흘러가도 국내(ko) 화면에서는
//   formatReferenceAmount() 가 빈 문자열이라 **한국어로 개발·리뷰하는 동안 아무 증상이 없다.**
//   해외 사용자만 잘못된 금액을 본다. 이 가드가 그 창을 닫는다.
//
// 무엇을 강제하는가:
//   ① 환산표(REFERENCE_FX_BY_LANG)가 공유 코어 **한 곳에만** 있다 — 사본이 생기면 렌더러마다
//      다른 환율을 쓰게 되고, 그중 하나만 갱신되는 날 두 화면이 다른 개산가를 낸다
//   ② 세 렌더러(정적 셸·React·독립 정적)가 고지 문구를 자체 문자열로 적지 않고 공유 코어
//      빌더(buildOverseasChargeNoticeHtml)를 부른다
//   ③ 세 렌더러가 그 결과를 **실제로 마크업에 끼운다** — 변수만 만들고 안 쓰면 고지가 안 뜬다
//   ④ 환산 결과가 결제 요청 필드로 흘러가지 않는다 (totalAmount·paymentAmount·currency·amountKrw)
//   ⑤ 승인 통화 단언(CURRENCY_KRW)이 살아 있다 — 다통화는 이 계약에 없다
//   ⑥ 이 검사기가 읽는 파일이 전부 paid-flow-gates 트리거 경로에 있다
//
// 🔴 fail-closed: 검사 대상이 바닥 아래로 내려가면 실패한다. 함수 이름이 바뀌거나 정규식이
//    깨져 "대상 0개" 가 되면 조용히 통과하는 것이 이 가드의 유일한 실패 모드다.
//
// 범위: 루트 원본만 본다. 미러(public/**)의 동일성은 verify:payment-choice-single-instance 가
//    따로 강제하므로 여기서 사본을 다시 읽지 않는다.
//
// 실행: npm run verify:overseas-payment-notice
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const CORE = "js/core/checkout-entry.js";
const SHELL = "index.html";
const REACT_CLIENT = "app/_lib/billing-client.ts";
const STANDALONE = "js/destiny-profile.js";
const PG_VERIFIER = "worker/payments/pg.js";
const SERVER_CONFIG = "worker/lib/portone.js";

const coreSource = read(CORE);

// ── 1) 환산표는 공유 코어 하나에만 있다 ──────────────────────────────────────────────
const FX_TABLE_TOKEN = "REFERENCE_FX_BY_LANG";
assert.ok(
  coreSource.includes(FX_TABLE_TOKEN),
  `${CORE}: ${FX_TABLE_TOKEN} 이 없습니다 — 참고 환산의 정본이 사라졌습니다.`,
);

// 정본 외의 어느 소스에도 사본이 없어야 한다.
const COPY_SCAN_TARGETS = [SHELL, REACT_CLIENT, STANDALONE, "app/points/PointsClient.tsx"];
for (const rel of COPY_SCAN_TARGETS) {
  assert.ok(
    !read(rel).includes(FX_TABLE_TOKEN),
    `${rel}: 환산표 사본이 생겼습니다. 정본은 ${CORE} 하나뿐입니다 — 사본을 지우고 `
      + `checkoutEntry.formatReferenceAmount() 를 부르세요.`,
  );
}

// 환산표에 담긴 통화 수. 줄어들면(정규식 파손 포함) 여기서 걸린다.
const fxBlockMatch = coreSource.match(/var REFERENCE_FX_BY_LANG = \{([\s\S]*?)\n {2}\};/);
assert.ok(fxBlockMatch, `${CORE}: ${FX_TABLE_TOKEN} 블록을 파싱하지 못했습니다(정규식 파손).`);
const fxEntryCount = (fxBlockMatch[1].match(/krwPerUnit:/g) || []).length;
const MIN_FX_ENTRIES = 11;
assert.ok(
  fxEntryCount >= MIN_FX_ENTRIES,
  `${CORE}: 환산표 항목이 ${fxEntryCount}개입니다(최소 ${MIN_FX_ENTRIES}). `
    + `줄었다면 그 로케일 사용자는 개산가 없이 원화만 봅니다.`,
);

// 기준 시점이 선언돼 있어야 한다 — 없으면 언제 잰 환율인지 아무도 모른다.
assert.match(
  coreSource,
  /var REFERENCE_FX_AS_OF = "\d{4}-\d{2}";/,
  `${CORE}: REFERENCE_FX_AS_OF 가 "YYYY-MM" 형태로 없습니다 — 참고 환율의 기준 시점은 필수입니다.`,
);

// ── 2·3) 세 렌더러가 공유 빌더를 부르고, 결과를 실제로 끼운다 ────────────────────────
const BUILDER = "buildOverseasChargeNoticeHtml";
assert.ok(
  coreSource.includes(`function ${BUILDER}(`) && coreSource.includes(`${BUILDER}: ${BUILDER},`),
  `${CORE}: ${BUILDER} 의 정의 또는 export 가 없습니다.`,
);

const RENDERERS = [
  { rel: SHELL, label: "정적 셸", variable: "overseasNoticeHtml" },
  { rel: REACT_CLIENT, label: "React", variable: "overseasNoticeHtml" },
  { rel: STANDALONE, label: "독립 정적", variable: "overseasNoticeHtml" },
];

for (const renderer of RENDERERS) {
  const source = read(renderer.rel);
  assert.ok(
    source.includes(BUILDER),
    `${renderer.rel}(${renderer.label}): ${BUILDER} 을 부르지 않습니다 — 이 렌더러만 원화 청구 고지가 빠집니다.`,
  );
  // 변수를 만들기만 하고 마크업에 안 끼우면 고지가 화면에 없다. 선언 1회 + 사용 1회 = 최소 2회.
  const uses = source.split(renderer.variable).length - 1;
  assert.ok(
    uses >= 2,
    `${renderer.rel}(${renderer.label}): ${renderer.variable} 이 ${uses}회만 나옵니다 — `
      + `선언만 하고 마크업에 끼우지 않으면 고지가 렌더되지 않습니다.`,
  );
  // 고지 문구를 렌더러가 자체 문자열로 적으면 세 곳이 갈라진다.
  assert.ok(
    !/VISA\s*[·・]\s*Mastercard/.test(source),
    `${renderer.rel}(${renderer.label}): 카드 브랜드 문구를 직접 적었습니다. `
      + `문구 정본은 ${CORE} 의 ${BUILDER} 하나입니다.`,
  );
}

// ── 4) 환산값이 결제 요청 필드로 새지 않는다 ─────────────────────────────────────────
// formatReferenceAmount 는 표시 전용이다. 아래 필드에 그 결과가 대입되면 화면 금액 ≠ 승인 금액이 된다.
const PAYMENT_FIELDS = ["totalAmount", "paymentAmount", "amountKrw", "amountKRW", "currency"];
const LEAK_SCAN_TARGETS = [CORE, SHELL, REACT_CLIENT, STANDALONE];
for (const rel of LEAK_SCAN_TARGETS) {
  const source = read(rel);
  for (const field of PAYMENT_FIELDS) {
    const leak = new RegExp(`${field}\\s*[:=]\\s*[^,;\\n]*formatReferenceAmount`);
    assert.ok(
      !leak.test(source),
      `${rel}: 참고 환산값이 결제 필드 '${field}' 로 흘러갑니다. `
        + `승인 통화는 언제나 KRW 입니다 — formatReferenceAmount() 는 표시 전용입니다.`,
    );
  }
  // 환산 결과를 PortOne 요청 객체에 직접 넣는 경우도 막는다.
  assert.ok(
    !/requestPayment\([^)]*formatReferenceAmount/s.test(source),
    `${rel}: 참고 환산값이 PortOne requestPayment 인자에 실렸습니다.`,
  );
}

// ── 5) 승인 통화 단언이 살아 있다 ────────────────────────────────────────────────────
// 다통화는 이 계약에 없다. 이 단언들이 사라지면 "지원하지 않는 통화" 가 조용히 열린다.
assert.ok(
  read(PG_VERIFIER).includes('"KRW"'),
  `${PG_VERIFIER}: 승인 통화 KRW 단언이 사라졌습니다 — 해외카드 특약은 KRW 단일 통화입니다. `
    + `다통화를 열려면 계약(일본결제 등)이 먼저입니다.`,
);
assert.ok(
  read(SERVER_CONFIG).includes('currency: "CURRENCY_KRW"'),
  `${SERVER_CONFIG}: getPortOnePublicConfig 의 CURRENCY_KRW 가 사라졌습니다.`,
);

// ── 6) CI 트리거 커버리지 ────────────────────────────────────────────────────────────
// 🔴 검사기가 멀쩡한 것과 검사기가 **실행되는** 것은 다른 문제다.
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const READ_PATHS = [CORE, SHELL, REACT_CLIENT, STANDALONE, PG_VERIFIER, SERVER_CONFIG];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCoversAny(gatePatterns, rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 `
      + `해외 결제 고지 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-overseas-payment-notice] PASS `
    + `(${fxEntryCount} reference currencies, ${RENDERERS.length} renderers, `
    + `${PAYMENT_FIELDS.length} leak-guarded fields, ${READ_PATHS.length} gate-triggered paths)`,
);
