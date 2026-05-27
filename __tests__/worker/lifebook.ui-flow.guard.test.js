/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");

function readLifeBookSource() {
  const filePath = path.resolve(__dirname, "../../js/life-book.js");
  return fs.readFileSync(filePath, "utf8");
}

describe("lifebook ui flow guard", () => {
  test("상세 팝업 open 함수는 코인 게이트를 직접 호출하지 않는다", () => {
    const src = readLifeBookSource();
    const openFn = src.match(/window\.openLifeBookModal\s*=\s*function\s*\(\)\s*\{[\s\S]*?\n\s*\};/);

    expect(openFn).toBeTruthy();
    const body = String(openFn[0] || "");

    expect(body.includes("_ensurePremiumPaymentThenStart")).toBe(false);
    expect(body.includes("_cdCoinGatePerUse")).toBe(false);
    expect(body.includes("DETAIL_POPUP_OPEN")).toBe(true);
  });

  test("생성 버튼 액션에는 코인 게이트 호출이 존재한다", () => {
    const src = readLifeBookSource();
    const start = src.indexOf("if (action === 'generateLifeBook') {");
    const end = src.indexOf("if (action === 'downloadLifeBookPdf') {");

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);

    expect(body.includes("_cdCoinGatePerUse")).toBe(true);
    expect(body.includes("COIN_GATE_START")).toBe(true);
  });

  test("라이프북 총 챕터 수는 12로 고정된다", () => {
    const src = readLifeBookSource();
    expect(src.includes("var LIFEBOOK_TOTAL_CHAPTERS = 12;")).toBe(true);
  });
});
