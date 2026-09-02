// 사주 FPTI ₩20,000 심층 리포트의 결과 PDF 배선 정적 계약.
//
// 🔴 여기에 둔 이유: 이 축에는 소스를 읽는 `verify:*` 가 없고, 새 스크립트를 만들면
//    `verify:guard-wiring` 배선까지 붙여야 하는데 그 사이 단언은 CI 에서 안 돈다
//    (CLAUDE.md 원칙 10). __tests__/ui/*.test.js 는 `npm run test:node` 가 글로브로 집어
//    pr-ci 의 fast 잡(티어 무관 상시)에서 돌므로 지금 바로 무는 자리다.
//    🔴 jest 는 이 디렉터리를 testPathIgnorePatterns 로 건너뛴다 — 여기 단언을 jest 로 옮기면 죽는다.
//
// 🔴 이 기능의 진짜 위험은 "잠금 챕터가 PDF 에 실리는 것"이다. 방어가 3중이고, 아래 검사는
//    세 겹을 각각 따로 고정한다. 한 겹이 무너져도 나머지가 남도록 셋 다 유지해야 한다:
//      ① 버튼·핸들러의 accessState.isUnlocked 게이트
//      ② 마커를 조건부 스프레드로만 부착 → 잠금 챕터는 캡처 선택자에 애초에 안 걸린다
//      ③ normalizeDeepReport 가 잠금 챕터의 sections 를 DOM 에 넣지 않는다(데이터 절단)
//
// 캡처 계약의 핵심 둘(축1 공통):
//   (1) 마커가 붙은 엘리먼트마다 PDF 새 페이지가 시작된다 → 마커는 본문에만.
//   (2) 마커가 중첩되면 그 내용이 PDF 에 두 번 담긴다 → 마커끼리 조상-자손이 되면 안 된다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const card = read("components/fpti/FptiResultCard.tsx");
const copy = read("components/fpti/_lib/copy.ts");
const premiumReport = read("lib/fpti/premium-report.ts");

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function handlerBody() {
  const start = card.indexOf("const handleSaveDeepReportPdf = async () => {");
  assert.notEqual(start, -1, "handleSaveDeepReportPdf 핸들러를 찾지 못했다");
  const end = card.indexOf("\n  return (", start);
  assert.notEqual(end, -1, "핸들러 뒤의 return 을 찾지 못했다");
  return card.slice(start, end);
}

test("PDF 유틸을 동적 import 로만 끌어온다(초기 번들 미포함)", () => {
  assert.equal(
    count(card, 'await import("@/lib/pdf/export-result-pdf")'),
    1,
    "FPTI 결과 카드의 동적 import 가 1곳이어야 한다",
  );
  assert.doesNotMatch(
    card,
    /^import[\s\S]*?from "@\/lib\/pdf\/export-result-pdf"/m,
    "PDF 유틸을 정적 import 하면 html2canvas·jsPDF 가 FPTI 초기 번들에 딸려온다",
  );
});

test("캡처 선택자가 마커를 겨눈다", () => {
  assert.ok(
    card.includes('captureTargets: ["[data-fpti-pdf-section]"]'),
    "캡처 선택자가 없다",
  );
});

test("방어 ① — 버튼과 핸들러가 둘 다 accessState.isUnlocked 게이트 뒤에 있다", () => {
  const handler = handlerBody();
  assert.ok(handler.includes("if (pdfBusy) return;"), "중복 실행 진입 가드가 없다");
  assert.ok(
    handler.includes("if (!accessState.isUnlocked) return;"),
    "핸들러의 해금 게이트가 없다 — 미해금 상태에서 캡처가 돌 수 있다",
  );

  // 버튼은 `{accessState.isUnlocked && (...)}` 분기 안에서만 렌더돼야 한다.
  assert.equal(count(card, "onClick={handleSaveDeepReportPdf}"), 1, "PDF 버튼이 1개가 아니다");
  const unlockedBranch = card.slice(
    card.indexOf("{accessState.isUnlocked && ("),
    card.indexOf("{copy.statusLabel}"),
  );
  assert.ok(
    unlockedBranch.includes("onClick={handleSaveDeepReportPdf}"),
    "PDF 버튼이 해금 분기 밖에 있다 — 미해금 이용자에게 버튼이 보인다",
  );
});

test("방어 ② — 마커는 조건부 스프레드로만 붙는다", () => {
  const spreads = card.match(/\{\.\.\.\([^\n]*"data-fpti-pdf-section"[^\n]*\)\}/g) || [];
  assert.equal(spreads.length, 2, "조건부 스프레드 마커가 2곳(요약 카드·챕터)이 아니다");
  for (const spread of spreads) {
    assert.match(
      spread,
      /accessState\.isUnlocked/,
      `마커 스프레드에 해금 조건이 없다: ${spread}`,
    );
  }
  // 챕터 마커는 잠금 챕터를 한 번 더 배제한다(데이터 절단이 뚫려도 선택자에 안 걸리게).
  assert.ok(
    spreads.some((spread) => spread.includes("accessState.isUnlocked && !lockedChapter")),
    "챕터 마커에 !lockedChapter 조건이 없다",
  );
  // 무조건 부착(`data-fpti-pdf-section` 을 그냥 속성으로 적은 것)이 하나라도 있으면 실패한다.
  assert.doesNotMatch(
    card,
    /data-fpti-pdf-section[ =>]/,
    "마커가 조건 없이 속성으로 붙었다 — 잠금 상태에서도 캡처 대상이 된다",
  );
});

test("방어 ③ — normalizeDeepReport 의 데이터 절단이 그대로다", () => {
  assert.ok(
    card.includes(": (idx === 0 ? normalizedSections.slice(0, 1) : []),"),
    "미해금 챕터의 sections 절단이 사라졌다 — 잠금 본문이 DOM 에 실린다",
  );
});

test("마커끼리 중첩되지 않는다 — 중첩되면 그 내용이 PDF 에 두 번 담긴다", () => {
  for (const [label, anchor] of [
    ["심층 리포트 루트 section", /<section className=\{`\$\{styles\.cosmicNeonCard\} rounded-3xl p-5[^\n]*/],
    ["챕터 안 섹션 카드", /<article key=\{`\$\{chapter\.roman\}-\$\{section\?\.title\}`\}[^\n]*/],
    ["프리미엄 안내 카드", /<div className=\{`\$\{styles\.cosmicNeonCard\} rounded-3xl border border-\[#E9C46A\][^\n]*/],
  ]) {
    const hit = card.match(anchor);
    assert.ok(hit, `${label} 을 찾지 못했다 — 이 검사를 다시 맞춰야 한다`);
    assert.doesNotMatch(hit[0], /data-fpti-pdf-section/, `${label} 에 마커가 붙어 중첩된다`);
  }
});

test("export 중에는 7개 챕터가 전부 마운트된다", () => {
  assert.ok(
    card.includes("const open = pdfExporting || idx === activeChapter;"),
    "export 중 전 챕터 강제 펼침이 없다 — 접힌 챕터는 DOM 에 없어 PDF 에서 통째로 빠진다",
  );
  assert.ok(
    card.includes("{!pdfExporting && <span"),
    "캡처 중 접기/펼치기 배지를 숨기지 않는다 — PDF 에 화면 상태 UI 가 찍힌다",
  );
});

test("핸들러가 캡처 상태를 finally 에서 반드시 되돌린다", () => {
  const handler = handlerBody();
  assert.match(
    handler,
    /finally \{[\s\S]*?setPdfExporting\(false\)[\s\S]*?setPdfBusy\(false\)/,
    "finally 에서 캡처·busy 상태를 되돌리지 않는다 — 실패하면 화면이 캡처 모드로 굳는다",
  );
  assert.match(
    handler,
    /requestAnimationFrame\(\(\) => requestAnimationFrame\([\s\S]*?setTimeout\(resolve, 120\)/,
    "펼친 뒤 레이아웃 확정 대기(2×rAF + 120ms)가 없다",
  );
});

test("meta.pdfEnabled 는 계속 false 다 — 서버 PDF 플래그이지 이 버튼과 무관하다", () => {
  // 클라이언트 [PDF 저장] 은 화면 캡처다. 리포트 스키마의 pdfEnabled 를 뒤집으면
  // validateFptiDeepReport 가 리포트를 통째로 무효 처리한다.
  assert.ok(card.includes("pdfEnabled: false,"), "FptiResultCard 의 pdfEnabled: false 가 사라졌다");
  assert.ok(
    premiumReport.includes("if (report.meta.pdfEnabled !== false) errors.push"),
    "premium-report 의 pdfEnabled 검증이 사라졌다",
  );
  assert.equal(count(premiumReport, "pdfEnabled: false"), 3, "premium-report 의 pdfEnabled: false 고정이 3곳이 아니다");
});

test("PDF 문구가 5개 로케일에 전부 저작됐다", () => {
  for (const key of ["pdfButtonLabel", "pdfButtonBusyLabel", "pdfSavedNotice", "pdfFailedNotice", "pdfCoverTitle"]) {
    const values = copy.match(new RegExp(`^\\s*${key}: "([^"]*)"`, "gm")) || [];
    assert.equal(values.length, 5, `${key} 가 5개 로케일(en·ko·ja·zh-CN·zh-TW)에 다 있지 않다`);
  }
  assert.equal(
    (copy.match(/^\s*pdfFileName: \(code, date\) =>/gm) || []).length,
    5,
    "pdfFileName 이 5개 로케일에 다 있지 않다",
  );
});

test("PDF 문구에 가격·결제 표현이 없다(이미 결제된 리포트의 무료 부가 기능)", () => {
  const banned = /원|₩|결제|코인|이용권|월정석|구매|해금|購入|決済|付款|支付|購買|price|payment|unlock/i;
  for (const key of ["pdfButtonLabel", "pdfButtonBusyLabel", "pdfSavedNotice", "pdfFailedNotice", "pdfCoverTitle"]) {
    for (const line of copy.match(new RegExp(`^\\s*${key}: "([^"]*)"`, "gm")) || []) {
      const value = line.match(/"([^"]*)"/)[1];
      assert.doesNotMatch(value, banned, `${key} 에 결제 문구가 섞였다: ${value}`);
    }
  }
});
