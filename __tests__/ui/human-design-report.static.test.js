// 프리미엄 리포트 웹 화면의 **정적 계약**.
//
// 여기서 지키는 것은 "돌려 보면 알 수 있는 버그" 가 아니라 **되돌리기 쉬운 결정** 들이다.
// 셋 다 실제로 한 번씩 사고가 났거나(애니메이션이 상태를 쥐는 문제) 사고 직전까지 갔다.
//
// 🔴 node --test 는 PR CI 의 fast 잡이라 **티어와 무관하게 항상 돈다.** 계약 검증을 여기 두는
//    이유가 그것이다 — 리스크 티어가 낮게 잡힌 PR 이 이 규칙을 조용히 넘어가지 못한다.

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..", "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");

const PLAN = read("lib/human-design/report-plan.js");
const TYPES = read("app/human-design/report/_lib/types.ts");
const BLOCKS = read("app/human-design/report/_components/ReportBlocks.tsx");
const BODYGRAPH = read("app/human-design/_components/BodyGraph.tsx");
const BODYGRAPH_CSS = read("app/human-design/_components/bodygraph.module.css");
const HOOK = read("app/human-design/report/_lib/useReportGeneration.ts");
const CLIENT = read("app/human-design/report/HumanDesignReportClient.tsx");
const PAGE = read("app/human-design/report/page.tsx");
const LOCKED = read("app/human-design/report/_components/ReportLockedPanel.tsx");
const CHAPTER = read("app/human-design/report/_components/ReportChapter.tsx");
const REPORT_CSS = read("app/human-design/report/report.module.css");

/**
 * 주석을 걷어낸 소스. 🔴 이 파일이 막는 것들은 대부분 **주석에 그 단어가 적혀 있다**
 * ("여기에 ensurePaidAccess 를 되살리지 말 것"). 주석을 안 걷어내면 경고문 자체가 가드를
 * 깨뜨려, 규칙을 잘 지킨 파일일수록 더 잘 실패한다.
 */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .map((line) => line.replace(/\s\/\/.*$/, ""))
    .join("\n");
}

/**
 * 선언 뒤 첫 여는 중괄호부터 **짝이 맞는 닫는 중괄호까지**를 잘라 낸다.
 * 🔴 "다음 줄 문자열" 로 본문 끝을 잡으면 의존성 배열 한 항목만 늘어도 가드가 깨진다
 *    (scripts/verify-no-nested-retry.mjs 가 같은 이유로 균형 잘라내기를 쓴다).
 */
function balancedBody(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${marker} 를 찾지 못했다`);
  const open = source.indexOf("{", start);
  assert.ok(open >= 0, `${marker} 의 본문 시작을 찾지 못했다`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  assert.fail(`${marker} 의 본문 끝을 찾지 못했다`);
  return "";
}

/** 소스에서 배열 리터럴의 문자열 항목을 뽑는다. */
function stringItems(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${marker} 를 찾지 못했다`);
  const open = source.indexOf("[", start);
  const close = source.indexOf("]", open);
  assert.ok(open >= 0 && close > open, `${marker} 의 배열을 찾지 못했다`);
  return source.slice(open + 1, close)
    .split(",")
    .map((piece) => piece.trim().replace(/^["']|["'],?$/g, ""))
    .filter(Boolean);
}

test("블록 종류: 플랜(.js)의 목록과 화면 타입(.ts)의 유니온이 같다", () => {
  const planKinds = stringItems(PLAN, "export const REPORT_BLOCK_KINDS");
  assert.ok(planKinds.length >= 10, `블록 종류가 너무 적다: ${planKinds.length}`);

  const unionStart = TYPES.indexOf("export type ReportBlockKind");
  assert.ok(unionStart >= 0, "ReportBlockKind 유니온이 없다");
  const unionEnd = TYPES.indexOf(";", unionStart);
  const unionKinds = TYPES.slice(unionStart, unionEnd)
    .split("|")
    .slice(1)
    .map((piece) => piece.trim().replace(/["']/g, ""))
    .filter(Boolean);

  assert.deepEqual(
    [...unionKinds].sort(),
    [...planKinds].sort(),
    "플랜의 REPORT_BLOCK_KINDS 와 화면의 ReportBlockKind 가 어긋났다 — 한쪽만 고치면 웹과 PDF 가 갈린다",
  );
});

test("렌더러 레지스트리가 모든 블록 종류를 갖는다", () => {
  const planKinds = stringItems(PLAN, "export const REPORT_BLOCK_KINDS");
  // Record<ReportBlockKind, Renderer> 라 컴파일에서도 막히지만, 타입만 맞추고 본문을 비워 두는
  // 되돌림을 잡으려면 실제 키가 있는지 문자열로도 봐야 한다.
  assert.ok(
    BLOCKS.includes("Record<ReportBlockKind, Renderer>"),
    "레지스트리가 Record<ReportBlockKind, Renderer> 가 아니면 종류 누락이 컴파일에서 안 잡힌다",
  );
  for (const kind of planKinds) {
    assert.ok(
      new RegExp(`(^|\\n)\\s{2}${kind}:\\s*\\(`).test(BLOCKS),
      `렌더러 레지스트리에 ${kind} 가 없다`,
    );
  }
});

test("BodyGraph 가 정적 렌더 prop 두 개를 갖고, 정적 모드가 뷰박스를 고정한다", () => {
  assert.ok(/interactive\?: boolean/.test(BODYGRAPH), "interactive prop 이 없다");
  assert.ok(/staticRender\?: boolean/.test(BODYGRAPH), "staticRender prop 이 없다");
  assert.ok(
    BODYGRAPH.includes("if (!interactive) return `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`"),
    "정적 모드가 뷰박스를 전체로 고정하지 않으면 사용자의 확대 상태가 캡처에 따라온다",
  );
  assert.ok(
    /data-static=\{staticRender \? "true" : undefined\}/.test(BODYGRAPH),
    "wrap 에 data-static 이 붙지 않으면 CSS 가 최종 상태를 앉힐 수 없다",
  );
});

test("🔴 data-static 이 채널의 최종 상태를 직접 앉힌다", () => {
  const start = BODYGRAPH_CSS.indexOf('.wrap[data-static="true"] .half');
  assert.ok(start >= 0, "data-static 용 .half 규칙이 없다");
  const block = BODYGRAPH_CSS.slice(start, BODYGRAPH_CSS.indexOf("}", start));
  // animation: none 만 주면 stroke-dashoffset: 1 이 남아 채널이 통째로 사라진다.
  assert.ok(/animation:\s*none/.test(block), "정적 모드에서 애니메이션을 끄지 않았다");
  assert.ok(
    /stroke-dashoffset:\s*0/.test(block),
    "🔴 stroke-dashoffset: 0 이 없으면 채널이 '아직 안 그려진' 상태로 멈춘다 — PDF 에 빈 차트가 실린다",
  );
  assert.ok(/stroke-dasharray:\s*none/.test(block), "stroke-dasharray 를 풀지 않았다");
});

test("🔴 결제 뒤 유실 금지 — reportId 는 localStorage 에 적는다", () => {
  assert.ok(
    HOOK.includes('const REPORT_ID_STORAGE_KEY = "cd_hd_report_id_v1"'),
    "reportId 저장 키가 없다",
  );
  assert.ok(
    !/sessionStorage/.test(codeOnly(HOOK)),
    "🔴 sessionStorage 를 쓰면 세션 종료가 곧 결제한 문서의 유실이다",
  );
  assert.ok(
    HOOK.includes("window.localStorage"),
    "localStorage 를 쓰지 않으면 새로고침 뒤 이어서 만들 수 없다",
  );
});

test("🔴 결제 requestId 가 새로고침을 견딘다", () => {
  assert.ok(
    /function stableRequestId/.test(HOOK),
    "requestId 를 저장소에 고정하지 않으면 결제창이 뜬 사이의 새로고침이 이중 결제가 된다",
  );
  const start = HOOK.indexOf("function stableRequestId");
  const body = HOOK.slice(start, HOOK.indexOf("\n}", start));
  assert.ok(body.includes("readStorage("), "저장된 requestId 를 먼저 읽지 않는다");
  assert.ok(body.includes("writeStorage("), "새로 만든 requestId 를 적지 않는다");
});

test("🔴 생성 루프가 결제를 다시 부르지 않는다", () => {
  const body = balancedBody(HOOK, "const runWaves =");
  assert.ok(
    !codeOnly(body).includes("ensurePaidAccess"),
    "🔴 웨이브 루프에서 결제를 재검증하면 생성 도중에 결제한 사용자가 자기 리포트에서 막힌다",
  );
  assert.ok(body.includes("/api/human-design-report/generate"), "생성 엔드포인트를 부르지 않는다");
});

test("🔴 재개 경로가 결제를 다시 부르지 않는다", () => {
  const body = balancedBody(HOOK, "const resume =");
  assert.ok(
    !codeOnly(body).includes("ensurePaidAccess"),
    "🔴 이어서 만들기가 결제를 다시 열면 이중 결제다",
  );
});

test("🔴 환불된 리포트는 저장 키를 놓아 재구매를 연다", () => {
  // 죽은 reportId 를 들고 있으면 재방문이 그 문서를 계속 열려 하고, 같은 requestId 를
  // 재사용하면 PaidExecutionRecord 의 unique 가 새 결제를 막는다(월정석 환불 전례).
  const body = balancedBody(HOOK, "const releaseAfterRefund =");
  assert.ok(body.includes("dropStorage(REPORT_ID_STORAGE_KEY)"), "reportId 를 놓지 않는다");
  assert.ok(body.includes("REQUEST_ID_STORAGE_PREFIX"), "🔴 결제 requestId 를 놓지 않으면 재구매가 막힌다");

  const waves = balancedBody(HOOK, "const runWaves =");
  assert.ok(
    waves.includes("releaseAfterRefund()"),
    "환불로 닫힌 응답을 받고도 키를 놓지 않으면 사용자가 다시 살 수 없다",
  );
  assert.ok(/REFUNDED_REASONS\s*=\s*new Set/.test(HOOK), "환불 종료 사유 목록이 없다");
});

test("🔴 중첩 재시도 금지 — 백오프 루프를 새로 만들지 않는다", () => {
  // postPaidBody 가 이미 일시 503·네트워크 블립을 백오프로 재시도한다. 그 위에 또
  // 지수 백오프를 얹으면 시도 횟수가 곱해진다(코딩 원칙 6).
  assert.ok(
    !/\*\*\s*Math\.min|1\.8\s*\*\*|Math\.pow\(/.test(HOOK),
    "🔴 지수 백오프를 새로 만들었다 — postPaidBody 의 재시도와 중첩된다",
  );
  assert.ok(HOOK.includes("postPaidBody"), "공용 재시도 배관을 쓰지 않는다");
});

test("🔴 결제 전에는 본문을 DOM 에 넣지 않는다", () => {
  assert.ok(!codeOnly(LOCKED).includes("ReportChapter"), "잠금 화면이 장을 렌더한다");
  assert.ok(!codeOnly(LOCKED).includes("ReportBlockView"), "잠금 화면이 블록을 렌더한다");
  assert.ok(!/blur\(/.test(LOCKED), "블러로 덮는 방식은 소스 보기 한 번이면 읽힌다 — 잠금이 아니다");
  // 결제 게이트는 화면 하나가 소유한다.
  assert.ok(LOCKED.includes("onPurchase"), "잠금 화면에 구매 진입이 없다");
});

test("🔴 결제창은 리포트 화면 하나만 소유한다", () => {
  const chartClient = read("app/human-design/HumanDesignClient.tsx");
  assert.ok(
    !codeOnly(chartClient).includes("ensurePaidAccess"),
    "🔴 무료 차트 화면에 결제 게이트가 되살아났다",
  );
  assert.ok(
    chartClient.includes('href="/human-design/report"'),
    "차트 화면에서 리포트로 가는 진입점이 없다",
  );
});

test("리포트 라우트는 색인 대상이 아니다", () => {
  assert.ok(/robots:\s*\{\s*index:\s*false/.test(PAGE), "noindex 가 아니다");
});

test("🔴 리더가 리포트 본문 문장을 직접 쓰지 않는다", () => {
  // 화면이 문장을 보태면 그 문장은 PDF 에 없다 — 웹과 PDF 가 갈린다(요구 3).
  // 40자 이상 이어지는 한글 리터럴이 있으면 그것은 본문이지 라벨이 아니다.
  const longKorean = /["'`][^"'`]*[가-힣][^"'`]{39,}["'`]/;
  for (const [name, source] of [["ReportBlocks", BLOCKS], ["ReportChapter", CHAPTER]]) {
    const withoutComments = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.trim().startsWith("/*"))
      .join("\n");
    assert.ok(
      !longKorean.test(withoutComments),
      `🔴 ${name} 에 긴 한글 리터럴이 있다 — 본문은 플랜에서만 와야 한다`,
    );
  }
});

test("🔴 장을 opacity 로 숨기지 않는다", () => {
  // CodexReader 가 그 방식으로 "스크롤 안 한 장이 백지로 찍히는" 사고를 냈다.
  const start = REPORT_CSS.indexOf(".chapter {");
  assert.ok(start >= 0, ".chapter 규칙이 없다");
  const block = REPORT_CSS.slice(start, REPORT_CSS.indexOf("}", start));
  assert.ok(!/opacity:\s*0/.test(block), "🔴 장을 opacity: 0 으로 숨겼다");
  assert.ok(/content-visibility:\s*auto/.test(block), "25,000자를 한 번에 레이아웃하고 있다");
  assert.ok(/contain-intrinsic-size/.test(block), "높이를 예약하지 않으면 스크롤바가 튄다");
});

test("🔴 도표 자리를 미리 잡는다 (CLS 0)", () => {
  const start = REPORT_CSS.indexOf(".chartHost {");
  assert.ok(start >= 0, ".chartHost 규칙이 없다");
  const block = REPORT_CSS.slice(start, REPORT_CSS.indexOf("}", start));
  assert.ok(/aspect-ratio:/.test(block), "🔴 비율을 예약하지 않으면 도표가 붙을 때 본문이 밀린다");
});

test("🔴 읽기 진행률이 리렌더를 만들지 않는다", () => {
  const source = read("app/human-design/report/_lib/useActiveChapter.ts");
  const start = source.indexOf("export function useReadingProgress");
  const body = source.slice(start);
  assert.ok(body.includes("setProperty("), "CSS 변수로 흘리지 않는다");
  assert.ok(!/setState|useState/.test(body), "🔴 스크롤마다 setState 를 부르면 25,000자가 통째로 리렌더된다");
  assert.ok(body.includes("{ passive: true }"), "스크롤 리스너가 passive 가 아니다");
});

test("본문 언어는 저장된 report.locale 이다", () => {
  assert.ok(
    CLIENT.includes('doc?.locale === "en" ? "en" : "ko"'),
    "🔴 본문 언어를 뷰어 언어에서 끌어오면 ko 리포트를 en 브라우저에서 열 때 웹과 PDF 가 갈린다",
  );
  assert.ok(CLIENT.includes("lang={bodyLocale}"), "본문에 lang 을 달지 않았다");
});
