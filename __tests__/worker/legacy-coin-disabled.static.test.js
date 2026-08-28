/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("legacy COIN removal regression guards", () => {
  test.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["   ", false],
    ["DIRECT_KRW", false],
    ["MOONLIGHT_STONE", false],
    ["MEMBERSHIP_PASS", false],
    ["unknown", false],
    ["COIN", true],
    ["coins", true],
    ["coin_credit", true],
    ["coin_payment", true],
    ["pig_coin", true],
    ["pig-coin", true],
  ])("classifies paymentMode %p as explicit legacy coin=%p", (paymentMode, expected) => {
    const source = read("worker/routes/billing.js");
    const modeSetStart = source.indexOf("const LEGACY_COIN_PAYMENT_MODES = new Set([");
    const modeSetEnd = source.indexOf("]);", modeSetStart);
    const modeSetSource = source.slice(modeSetStart, modeSetEnd);
    const modes = new Set(Array.from(modeSetSource.matchAll(/"([^"]+)"/g), (match) => match[1]));
    const actual = modes.has(String(paymentMode ?? "").trim().toLowerCase());
    expect(actual).toBe(expected);
  });

  test.each([
    ["worker/routes/billing.js", 'legacyCoinDisabled: true', "$inc: { points: -requiredCoins"],
    ["worker/routes/fortune.js", 'reason: "LEGACY_COIN_DISABLED"', "$inc: { points: -cost"],
  ])("%s rejects legacy debit before the old mutation marker", (relativePath, guardMarker, mutationMarker) => {
    const source = read(relativePath);
    const guardIndex = source.indexOf(guardMarker);
    const mutationIndex = source.indexOf(mutationMarker);

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(mutationIndex).toBeGreaterThan(guardIndex);
  });

  test("ziwei daehan compatibility route has no point debit dependency", () => {
    const source = read("worker/routes/ziwei-daehan.js");

    expect(source).not.toMatch(/User\.points|PointHistory|\$inc\s*:\s*\{\s*points/);
    expect(source).toMatch(/handleBillingRoutes/);
    expect(source).toMatch(/ContentEntitlement|daehan_purchases/);
  });

  test("billing treats only an explicit legacy payment mode as COIN", () => {
    const source = read("worker/routes/billing.js");
    const start = source.indexOf("const coinPaymentRequested =");
    const end = source.indexOf("const deferUsage =", start);
    const paymentModeBlock = source.slice(start, end);

    expect(paymentModeBlock).toMatch(/isExplicitLegacyCoinPaymentMode\(requestedPaymentMode\)/);
    expect(paymentModeBlock).not.toMatch(/!requestedPaymentMode\s*&&\s*!directPaymentRequested/);
    expect(source).toMatch(/const knownPaymentMode = !requestedPaymentMode/);
  });

  test("existing unlock and pass decisions run before legacy COIN blocking", () => {
    const source = read("worker/routes/billing.js");
    const existingAccess = source.indexOf('accessDecision.reason === "already_unlocked" || accessDecision.reason === "pass_covered"');
    const legacyBlock = source.indexOf('logPaidAccessStage("LEGACY_COIN_BLOCKED"');

    expect(existingAccess).toBeGreaterThanOrEqual(0);
    expect(legacyBlock).toBeGreaterThan(existingAccess);
  });

  test("client surfaces do not activate legacy COIN flags or endpoints", () => {
    const files = [
      "app",
      "components",
      "src",
      "js",
      "index.html",
      // 루트 진입 컴포넌트/엔진도 배포되는 클라이언트 표면이다. StonehengeRune 은
      // app/oracle/rune/RuneRouteClient.tsx 가 dynamic import 로 싣는 살아있는 라우트인데,
      // 스캔 목록에 루트가 없어 forceDeduct:true 잔재가 그대로 통과했었다.
      "AnalysisEngine.js",
      "HwatuFortune.js",
      "OlympusVIPLounge.jsx",
      "PastLifeFaceUI.js",
      "PhysiognomyUI.js",
      "StonehengeRune.jsx",
    ];
    const blocked = /forceDeduct\s*:\s*true|paymentMode\s*:\s*["']COIN["']|\/api\/fortune\/pig-coin\/(?:balance|consume|unlock|share-reward|charge-simulate|earn)/;

    for (const relativePath of files) {
      const target = path.join(root, relativePath);
      const entries = fs.statSync(target).isDirectory()
        ? fs.readdirSync(target, { recursive: true }).map((entry) => path.join(target, entry)).filter((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())
        : [target];
      for (const file of entries) {
        if (!/\.(?:[cm]?[jt]sx?|html)$/i.test(file)) continue;
        expect(read(path.relative(root, file))).not.toMatch(blocked);
      }
    }
  });

  /**
   * 🔴 코드가 아니라 **사용자 문구**를 본다. 위 검사는 forceDeduct·paymentMode:"COIN"·pig-coin
   *    엔드포인트 같은 플래그만 막아서, 화면에 "포인트 충전"이라고 써 놓아도 통과했다.
   *
   *    이게 왜 문제인가: 코인·포인트는 폐지된 개념이고 현재 판매 상품은 30일 이용권과 콘텐츠
   *    단건 결제뿐이다(docs/context/payment-gating.md). 그런데 포트원 위험업종 문서가 '사주/운세'를
   *    등재하면서 "보통 '포인트 충전'으로 사이트를 구축해 충전 조건 제한을 받는다"고 명시한다 —
   *    즉 '충전형 사이트'로 읽히는 것 자체가 PG 심사에서 불리하다. 실제로 탈퇴 경고가
   *    "보유 포인트 및 모든 데이터가…"로 12개 로케일에 남아 있었다(2026-08-28 정정).
   *
   *    금지하는 것은 **폐지 재화를 보유·구매 가능한 잔액으로 제시하는 표현**뿐이다.
   *    운세 본문의 '용신 충전'·'핵심 포인트'나 정책을 못박는 부정문
   *    ('월정석은 구매·충전할 수 없습니다')은 걸리지 않는다 — 후자는 오히려 오해를 막는 문구다.
   */
  test("사용자 문구가 폐지 재화(포인트·코인)를 보유·충전 가능한 잔액으로 제시하지 않는다", () => {
    const surfaces = ["public/i18n", "app", "components", "src", "js", "index.html"];
    const banned = /보유 (?:포인트|코인)|(?:포인트|코인)(?:을|를)? ?충전|(?:포인트|코인) ?구매|(?:포인트|코인) ?잔액/;

    let scanned = 0;
    for (const relativePath of surfaces) {
      const target = path.join(root, relativePath);
      const entries = fs.statSync(target).isDirectory()
        ? fs.readdirSync(target, { recursive: true })
          .map((entry) => path.join(target, entry))
          .filter((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())
        : [target];
      for (const file of entries) {
        if (!/\.(?:[cm]?[jt]sx?|html|json)$/i.test(file)) continue;
        const rel = path.relative(root, file);
        scanned += 1;
        expect([rel, banned.test(read(rel))]).toEqual([rel, false]);
      }
    }

    // 🔴 fail-closed: 스캔이 0 이면 '검사가 통과했다'와 '검사가 없다'가 구분되지 않는다.
    expect(scanned).toBeGreaterThan(500);
  });
});
