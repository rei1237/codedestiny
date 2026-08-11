/**
 * @jest-environment node
 */

const { execFileSync } = require("child_process");
const path = require("path");
const { pathToFileURL } = require("url");

function readPaymentModePolicy() {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, "../../worker/routes/billing.js")).href;
  const script = `
    import(${JSON.stringify(moduleUrl)}).then(({ __billingTestUtils: utils }) => {
      const direct = { paymentMode: "DIRECT_KRW", provider: "portone_v2", pg: "kg_inicis" };
      process.stdout.write(JSON.stringify({
        directCreatesOrder: utils.shouldCreateDirectPortOneOrder(direct),
        directAppliesPass: utils.shouldApplyMembershipPassBeforeCard(direct),
        membershipAppliesPass: utils.shouldApplyMembershipPassBeforeCard({ paymentMode: "MEMBERSHIP_PASS" }),
        membershipAliasAppliesPass: utils.shouldApplyMembershipPassBeforeCard({ paymentMode: "membership" }),
        emptyAppliesPass: utils.shouldApplyMembershipPassBeforeCard({}),
        monthlyAppliesPass: utils.shouldApplyMembershipPassBeforeCard({ paymentMode: "MOONLIGHT_STONE" }),
        meteredWrites: ["standard", "premium", "vvip", "family"].map((tier) => [tier, utils.requiresMeteredPassWrite(tier)]),
      }));
    }).catch((error) => {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    });
  `;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], {
    cwd: path.resolve(__dirname, "../.."),
    encoding: "utf8",
  }));
}

describe("billing payment mode boundary", () => {
  const policy = readPaymentModePolicy();

  test("DIRECT_KRW always creates an order path instead of consuming a pass", () => {
    expect(policy.directCreatesOrder).toBe(true);
    expect(policy.directAppliesPass).toBe(false);
  });

  test("only explicit membership-pass selection may apply a pass", () => {
    expect(policy.membershipAppliesPass).toBe(true);
    expect(policy.membershipAliasAppliesPass).toBe(true);
    expect(policy.emptyAppliesPass).toBe(false);
    expect(policy.monthlyAppliesPass).toBe(false);
  });

  test("every valid tier requires a synchronous metered pass write (monthly spend cap tracking)", () => {
    expect(Object.fromEntries(policy.meteredWrites)).toEqual({
      standard: true,
      premium: true,
      vvip: true,
      family: true,
    });
  });
});
