// 운명의 섬 유료 2종(궁 심층상담 ₩20,000 · 12궁 리포트 ₩5,000)의 결과 PDF 배선 정적 계약.
//
// 🔴 여기에 둔 이유: 계획서는 `verify:ziwei-island` 에 소스 단언을 얹으라고 했지만, 그 스크립트는
//    (1) 워커 엔진만 import 하는 결정론·서명 게이트라 소스를 한 줄도 읽지 않고
//    (2) scripts/verify-guard-wiring.mjs:160 에 "배선 후보(미승인)" 으로 선언돼 어떤 워크플로도
//    호출하지 않는다. 거기 얹은 단언은 CI 에서 영영 안 돈다(CLAUDE.md 원칙 10).
//    __tests__/ui/*.test.js 는 `npm run test:node` 가 글로브로 집어 pr-ci 의 fast 잡(티어 무관 상시)
//    에서 돌므로, 새 npm 스크립트·배선 승인 없이 즉시 무는 자리다.
//
// 캡처 계약의 핵심: 마커가 붙은 엘리먼트마다 PDF 새 페이지가 시작된다. 그래서 마커는 본문에만
// 붙어야 하고 히어로 이미지(next/image)·버튼 행에는 붙으면 안 된다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const FILE = "app/island-consult/IslandConsultClient.tsx";
const source = fs.readFileSync(path.join(root, FILE), "utf8");

// 인라인 <style> 문자열과 JSX 를 갈라 본다 — CSS 안의 `.ic-sec` 같은 선택자가 마커 검사에 섞이면
// 검사가 조용히 헐거워진다.
const cssStart = source.indexOf("const CSS = `");
assert.ok(cssStart > 0, `${FILE} 에서 인라인 CSS 블록(const CSS = \`)을 찾지 못했다`);
const jsx = source.slice(0, cssStart);
const css = source.slice(cssStart);

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("PDF 유틸을 동적 import 로만 끌어온다(초기 번들 미포함)", () => {
  assert.equal(
    count(jsx, 'await import("@/lib/pdf/export-result-pdf")'),
    2,
    "동적 import 가 2곳(₩20,000 상담 · ₩5,000 리포트)이어야 한다",
  );
  assert.doesNotMatch(
    source,
    /^import[\s\S]*?from "@\/lib\/pdf\/export-result-pdf"/m,
    "PDF 유틸을 정적 import 하면 html2canvas·jsPDF 가 초기 번들에 딸려온다",
  );
});

test("캡처 선택자 2종이 각자의 마커를 겨눈다", () => {
  assert.ok(
    jsx.includes('captureTargets: [".ic-result [data-ic-pdf-section]"]'),
    "₩20,000 상담 결과의 캡처 선택자가 없다",
  );
  assert.ok(
    jsx.includes('captureTargets: [".ic-report--open [data-ic-report-pdf-page]"]'),
    "₩5,000 리포트의 캡처 선택자가 없다 — 해금 분기(.ic-report--open)로 스코프해야 잠긴 화면을 안 캡처한다",
  );
});

test("마커는 본문에만 붙는다 — 새로 추가된 본문에 마커가 빠지면 실패한다", () => {
  // 속성 위치의 마커만 센다(선택자 문자열 안의 `[data-...]` 는 `]` 로 끝나 걸리지 않는다).
  const attrCount = (name) => (jsx.match(new RegExp(`${name}[ >]`, "g")) || []).length;
  // 리포트: 안내 장 + 12궁 장. 장(page)이 늘어나면 이 검사가 마커 누락을 잡는다.
  assert.equal(attrCount("data-ic-report-pdf-page"), 2, "리포트 장 마커가 2개(안내·궁)가 아니다");
  assert.doesNotMatch(
    jsx,
    /className="ic-rpt-page"(?! data-ic-report-pdf-page)/,
    "마커 없는 .ic-rpt-page 가 있다 — 그 장은 PDF 에서 통째로 빠진다",
  );
  // 상담 본문 섹션은 map 한 곳에서만 렌더된다.
  assert.equal(attrCount("data-ic-pdf-section"), 1, "상담 본문 섹션 마커가 1개가 아니다");
  assert.doesNotMatch(
    jsx,
    /className="ic-sec"(?! data-ic-pdf-section)/,
    "마커 없는 .ic-sec 가 있다 — 그 섹션은 PDF 에서 빠진다",
  );
});

test("히어로 이미지와 버튼 행에는 마커가 없다(캔버스 오염·중복 페이지 차단)", () => {
  for (const [label, line] of [
    ["ic-result__hero", /ic-result__hero[^\n]*/],
    ["ic-report__visual", /ic-report__visual[^\n]*/],
    ["ic-result__foot", /ic-result__foot[^\n]*/],
    ["ic-report__actions", /ic-report__actions[^\n]*/],
  ]) {
    const hit = jsx.match(line);
    assert.ok(hit, `${label} 을 찾지 못했다`);
    assert.doesNotMatch(hit[0], /data-ic-(report-)?pdf-(section|page)/, `${label} 에 캡처 마커가 붙었다`);
  }
});

test("리포트 PDF 버튼은 해금 분기(reportUnlocked && report) 안에만 있다", () => {
  const gate = jsx.indexOf("if (reportUnlocked && report) {");
  const locked = jsx.indexOf('<section className="ic-report" ref={reportRef}');
  const button = jsx.indexOf("onClick={saveReportPdf}");
  assert.ok(gate > 0 && locked > gate, "해금/잠금 분기 구조가 바뀌었다 — 이 검사를 다시 맞춰야 한다");
  assert.equal(count(jsx, "onClick={saveReportPdf}"), 1, "리포트 PDF 버튼이 1개가 아니다");
  assert.ok(
    button > gate && button < locked,
    "리포트 PDF 버튼이 해금 분기 밖에 있다 — 결제 안 한 사용자에게 노출된다",
  );
});

test("뷰어를 펼친 뒤 캡처한다 — 한 장씩 모드의 빈 캔버스 방지", () => {
  assert.ok(
    jsx.includes("expandForExport={reportExporting}"),
    "PagedResultViewer 의 기존 expandForExport prop 배선이 없다(뷰어는 나머지 장을 display:none 으로 감춘다)",
  );
  const handler = jsx.slice(jsx.indexOf("async function saveReportPdf()"), jsx.indexOf("async function saveConsultPdf()"));
  assert.ok(handler.includes("setReportExporting(true)"), "펼치기 상태를 켜지 않는다");
  assert.match(handler, /finally \{[\s\S]*?setReportExporting\(false\)/, "finally 에서 펼치기 상태를 되돌리지 않는다");
  assert.match(handler, /requestAnimationFrame\([\s\S]*?requestAnimationFrame\(/, "레이아웃 확정 대기(2×rAF)가 없다");
  assert.ok(handler.includes("await sleep(120)"), "펼친 뒤 페인트 대기(120ms)가 없다");
});

test("중복 실행·미해금 상태를 핸들러가 각각 막는다", () => {
  assert.ok(jsx.includes("if (!report || reportExporting) return;"), "리포트 PDF 핸들러의 진입 가드가 없다");
  assert.ok(jsx.includes("if (!result || consultPdfBusy) return;"), "상담 PDF 핸들러의 진입 가드가 없다");
});

test("PDF 버튼 문구에 가격·결제 문구가 없다(이미 결제된 결과의 무료 부가 기능)", () => {
  const labels = jsx.match(/"PDF 만드는 중…" : "[^"]+"/g) || [];
  assert.equal(labels.length, 2, "PDF 버튼 문구가 2곳이 아니다");
  for (const label of labels) {
    assert.doesNotMatch(
      label,
      /원|₩|결제|코인|이용권|월정석|구매|해금/,
      `PDF 버튼 문구에 결제 문구가 섞였다: ${label}`,
    );
  }
});

test("버튼 행 배치와 저장 중 상태 CSS 가 있다", () => {
  assert.match(css, /\.ic-back-btn:disabled\{/, "저장 중 disabled 스타일이 없다");
  assert.match(css, /\.ic-report__actions\{/, "리포트 버튼 행 배치 규칙이 없다");
});
