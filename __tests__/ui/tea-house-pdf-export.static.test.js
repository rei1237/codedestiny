// 운명의 찻집 유료 3종(사주 ₩10,000 · 사주궁합 ₩20,000 · 수쿠요 ₩20,000)의 결과 PDF 배선 정적 계약.
//
// 🔴 여기에 둔 이유: `verify:tea-house-perf-budget` 는 초기 로드 예산(정적 import 금지)만 보는
//    스크립트라 마커·핸들러 계약을 얹을 자리가 아니다. __tests__/ui/*.test.js 는 `npm run test:node`
//    가 글로브로 집어 pr-ci 의 fast 잡(티어 무관 상시)에서 돌므로 새 배선 승인 없이 즉시 무는 자리다
//    (CLAUDE.md 원칙 10 — 미배선 스크립트에 얹은 단언은 CI 에서 영영 안 돈다).
//
// 캡처 계약의 핵심 둘:
//   (1) 마커가 붙은 엘리먼트마다 PDF 새 페이지가 시작된다 → 마커는 본문에만, 버튼 행·CTA 에는 금지.
//   (2) 마커가 중첩되면 그 내용이 PDF 에 두 번 담긴다 → 마커끼리 조상-자손이 되면 안 된다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const DIR = "src/features/fortune-tea-house/components";
const read = (file) => fs.readFileSync(path.join(root, DIR, file), "utf8");

const sheet = read("TeaHouseResultSheet.tsx");
const sajuPanel = read("TeaHouseSajuResultPanel.tsx");
const compatPanel = read("TeaHouseSajuCompatResultPanel.tsx");
const sukuyoPanel = read("TeaHouseSukuyoResultPanel.tsx");
const pillarBoard = read("SajuPillarBoard.tsx");
const elementBalance = read("FiveElementBalance.tsx");
const css = fs.readFileSync(
  path.join(root, "src/features/fortune-tea-house/styles/fortune-tea-house.module.css"),
  "utf8",
);

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
// 속성 위치의 마커만 센다 — 선택자 문자열 안의 `[data-tea-pdf-section]` 은 `]` 로 끝나 걸리지 않는다.
function markerCount(source) {
  return (source.match(/data-tea-pdf-section[ >]/g) || []).length;
}

test("PDF 유틸을 동적 import 로만 끌어온다(초기 번들 미포함)", () => {
  assert.equal(
    count(sheet, 'await import("@/lib/pdf/export-result-pdf")'),
    1,
    "결과 시트의 동적 import 가 1곳이어야 한다",
  );
  assert.doesNotMatch(
    sheet,
    /^import[\s\S]*?from "@\/lib\/pdf\/export-result-pdf"/m,
    "PDF 유틸을 정적 import 하면 html2canvas·jsPDF 가 찻집 초기 번들에 딸려온다",
  );
});

test("캡처 선택자가 마커를 겨눈다", () => {
  assert.ok(
    sheet.includes('captureTargets: ["[data-tea-pdf-section]"]'),
    "결과 시트의 캡처 선택자가 없다",
  );
});

test("본문 마커가 파일별로 남아 있다 — 새 본문에 마커가 빠지면 실패한다", () => {
  for (const [label, source, expected] of [
    ["결과 시트", sheet, 11],
    ["사주 패널", sajuPanel, 10],
    ["사주궁합 패널", compatPanel, 7],
    ["수쿠요 패널", sukuyoPanel, 9],
    ["사주 기둥판", pillarBoard, 1],
    ["오행 균형", elementBalance, 2],
  ]) {
    assert.equal(markerCount(source), expected, `${label} 의 본문 마커가 ${expected}개가 아니다`);
  }
});

test("마커끼리 중첩되지 않는다 — 중첩되면 그 내용이 PDF 에 두 번 담긴다", () => {
  // 패널 루트는 마커 없이 남아야 한다(자식 섹션들이 각자 마커를 갖는다).
  for (const [label, source, anchor] of [
    ["사주 패널 루트(미해금)", sajuPanel, /className=\{styles\.sajuResultPanel\} data-available="false"[^\n]*/],
    ["사주 패널 루트", sajuPanel, /className=\{styles\.sajuResultPanel\} data-available="true"[^\n]*/],
    ["사주궁합 패널 루트", compatPanel, /className=\{styles\.sukuyoResultPanel\} data-available="true"[^\n]*/],
    ["수쿠요 패널 루트", sukuyoPanel, /className=\{styles\.sukuyoResultPanel\} data-available="true"[^\n]*/],
    // 이 그리드 안에 SajuPillarBoard 가 자기 마커를 갖고 들어간다.
    ["사주 미해금 그리드", sajuPanel, /className=\{styles\.sajuLockedGrid\}[^\n]*/],
  ]) {
    const hit = source.match(anchor);
    assert.ok(hit, `${label} 을 찾지 못했다 — 이 검사를 다시 맞춰야 한다`);
    assert.doesNotMatch(hit[0], /data-tea-pdf-section/, `${label} 에 마커가 붙어 자식 마커와 중첩된다`);
  }
  // 패널은 시트의 마커 붙은 섹션들과 형제 위치에 렌더돼야 한다.
  const panelLine = sheet.match(/\{isSajuMode \? <TeaHouseSajuResultPanel[^\n]*/);
  assert.ok(panelLine, "시트의 사주 패널 렌더 지점을 찾지 못했다");
  assert.doesNotMatch(panelLine[0], /data-tea-pdf-section/, "패널 렌더 지점에 마커가 붙었다");
});

test("버튼 행·꿀 CTA·타로 진열장에는 마커가 없다", () => {
  for (const [label, anchor] of [
    ["버튼 행(resultActions)", /className=\{`\$\{styles\.resultActions\}[^\n]*/],
    ["꿀편지 블록(honeyLetterBlock)", /styles\.honeyLetterBlock\}`\}[^\n]*/],
    ["타로 진열장(resultTarotShowcase)", /styles\.resultTarotShowcase\}[^\n]*/],
  ]) {
    const hit = sheet.match(anchor);
    assert.ok(hit, `${label} 을 찾지 못했다 — 이 검사를 다시 맞춰야 한다`);
    assert.doesNotMatch(hit[0], /data-tea-pdf-section/, `${label} 에 캡처 마커가 붙었다`);
  }
  // 편지 카드에만 마커가 있고, 꿀 소모 CTA 는 캡처 밖이다.
  assert.match(
    sheet,
    /className=\{styles\.honeyLetterCard\} aria-live="polite" data-tea-pdf-section/,
    "받은 편지 카드의 마커가 없다",
  );
});

test("타로 모드에서는 PDF 버튼을 세우지 않는다(앨범이 자체 PDF 를 갖는다)", () => {
  assert.equal(count(sheet, "onClick={saveResultAsPdf}"), 1, "PDF 버튼이 1개가 아니다");
  assert.match(
    sheet,
    /\{isTarotMode \? null : \(\r?\n\s*<TeaHouseButton variant="secondary" onClick=\{saveResultAsPdf\}/,
    "PDF 버튼이 타로 모드 제외 분기 안에 있지 않다",
  );
});

test("핸들러가 중복 실행을 막고 data-export 를 반드시 되돌린다", () => {
  const handler = sheet.slice(
    sheet.indexOf("async function saveResultAsPdf()"),
    sheet.indexOf("return (", sheet.indexOf("async function saveResultAsPdf()")),
  );
  assert.ok(handler.length > 0, "saveResultAsPdf 핸들러를 찾지 못했다");
  assert.ok(handler.includes("if (!sheet || pdfBusy) return;"), "중복 실행 진입 가드가 없다");
  assert.ok(handler.includes('sheet.setAttribute("data-export", "true")'), "캡처용 data-export 를 켜지 않는다");
  assert.match(
    handler,
    /finally \{[\s\S]*?sheet\.removeAttribute\("data-export"\)[\s\S]*?setPdfBusy\(false\)/,
    "finally 에서 data-export·busy 상태를 되돌리지 않는다 — 실패하면 화면이 캡처 모드로 굳는다",
  );
  assert.match(
    sheet,
    /<article\r?\n\s*ref=\{resultSheetRef\}\r?\n\s*className=\{`\$\{styles\.resultSheet\}/,
    "캡처 루트(.resultSheet article)에 ref 배선이 없다 — data-export 를 걸 지점이 사라진다",
  );
});

test("PDF 버튼 문구에 가격·결제 문구가 없다(이미 결제된 결과의 무료 부가 기능)", () => {
  for (const key of ["pdfButton", "pdfButtonBusy", "pdfSaved", "pdfFailed"]) {
    const hit = sheet.match(new RegExp(`^\\s*${key}: "([^"]*)"`, "m"));
    assert.ok(hit, `KO 문구 ${key} 가 없다`);
    assert.doesNotMatch(
      hit[1],
      /원|₩|결제|코인|이용권|월정석|구매|해금/,
      `${key} 에 결제 문구가 섞였다: ${hit[1]}`,
    );
  }
});

test("내보내는 동안 게이지 등장 애니메이션을 끄는 CSS 가 있다", () => {
  // html2canvas 는 문서를 복제해 찍고 복제본에서 @keyframes 가 t=0 부터 다시 시작한다.
  // `softFadeIn ... both` 의 0% 프레임이 그대로 찍혀 게이지가 빈 칸으로 나오는 것을 막는 스위치다.
  assert.match(
    css,
    /\.resultSheet\[data-export="true"\] \.resultGaugeTrack span \{\s*animation: none;/,
    "게이지 애니메이션 해제 규칙이 없다",
  );
});
