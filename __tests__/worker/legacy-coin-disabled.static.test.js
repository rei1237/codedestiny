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
});
