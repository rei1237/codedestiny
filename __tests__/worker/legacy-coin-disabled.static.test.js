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
    ["worker/routes/billing.js", 'legacyCoinDisabled: true', "$inc: { points: -requiredCoins"],
    ["worker/routes/fortune.js", 'reason: "LEGACY_COIN_DISABLED"', "$inc: { points: -cost"],
    ["server/routes/fortune.routes.js", 'reason: "LEGACY_COIN_DISABLED"', "$inc: { points: -cost"],
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

  test("client surfaces do not activate legacy COIN flags or endpoints", () => {
    const files = [
      "app",
      "components",
      "src",
      "js",
      "index.html",
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
