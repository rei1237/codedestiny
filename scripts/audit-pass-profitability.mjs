import { readFileSync } from "node:fs";
import { CURRENT_PASS_PLANS } from "../lib/payment/pass-policy.js";
import { auditPassSale, auditPassSaleEvidence } from "../worker/lib/pass-sale-policy.js";
import { PASS_COST_EVIDENCE } from "../lib/payment/pass-cost-evidence.js";

// Read-only: a report never enables sales or writes production evidence.
const file = process.argv[2];
const evidence = file ? JSON.parse(readFileSync(file, "utf8")) : PASS_COST_EVIDENCE;
const report = ["web", "googlePlay"].flatMap(channel => Object.keys(CURRENT_PASS_PLANS).map(tier => {
  const result = file
    ? auditPassSaleEvidence(tier, channel, evidence[tier]?.[channel])
    : auditPassSale(tier, channel);
  return { tier, channel, ...result };
}));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.every(row => row.eligible) ? 0 : 2;
