import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Offline only: accepts an authorized export, never connects to a production database.
export function summarizeHoneyEconomy({ ledgers = [], aiRuns = [] } = {}) {
  const result = { attendanceIssued: 0, attendanceClaims: 0, spentByContent: {}, aiPerks: {} };
  for (const row of ledgers) {
    const amount = Math.max(0, Number(row.amount) || 0);
    if (row.type === 'attendance') { result.attendanceIssued += amount; result.attendanceClaims++; }
    if (row.type === 'spend') {
      const key = row.featureKey || row.reason || 'unspecified';
      const entry = result.spentByContent[key] ||= { uses: 0, honey: 0 };
      entry.uses++; entry.honey += amount;
    }
  }
  for (const row of aiRuns) {
    const entry = result.aiPerks[row.featureKey || 'unspecified'] ||= { runs: 0, knownCostKRW: 0, unmeasuredRuns: 0 };
    entry.runs++;
    if (typeof row.costKRW === 'number' && Number.isFinite(row.costKRW) && row.costKRW >= 0) entry.knownCostKRW += row.costKRW;
    else entry.unmeasuredRuns++;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];
  if (!input) throw Error('Usage: node scripts/report-honey-economy.mjs <authorized-anonymous-export.json>');
  console.log(JSON.stringify(summarizeHoneyEconomy(JSON.parse(readFileSync(input, 'utf8'))), null, 2));
}
