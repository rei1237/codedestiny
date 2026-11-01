// Fixed-seed OFF parity and ON scope impact. Approved adapters only; no oracle/network/Swiss.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REPO } from '../service-runner.mjs';
import { readRows } from '../phase2/io.mjs';
import { project } from './runner.mjs';
import { validateInput } from '../contract.mjs';
const shard = Number(process.argv[2]); assert.ok(Number.isInteger(shard) && shard >= 0 && shard < 4);
const output = path.join(REPO, 'docs/engine-audit/results/implementation-20261101');
const data = JSON.parse(fs.readFileSync(path.join(output, 'verified-authorities.json')));
const inputs = new Map(); for await (const row of readRows('inputs.jsonl.gz')) if (row.group === 'random') inputs.set(row.id, validateInput(row.input));
const sourcePinHash = createHash('sha256').update(fs.readFileSync(path.join(REPO, 'tools/oracle/implementation/service-source-pins.json'))).digest('hex');
const progress = path.join(output, `progress-${shard}.json`);
const summary = fs.existsSync(progress) ? JSON.parse(fs.readFileSync(progress)) : { shard, sourcePinHash, randomInputs: 0, lastId: '', offCompared: { saju: 0, ziwei: 0 }, offDifferences: [], enabled: { saju: 0, ziwei: 0 }, changedFacts: { saju: 0, ziwei: 0 }, enabledErrors: [], changes: [] };
assert.equal(summary.sourcePinHash, sourcePinHash, 'SOURCE_CHANGED_SINCE_CHECKPOINT');
const facts = (domain, r) => domain === 'saju' && r.status === 'ok' ? r.pillars : r;
for await (const old of readRows(`node-${shard}.jsonl.gz`)) {
  const input = inputs.get(old.id); if (!input) continue;
  if (old.id <= summary.lastId) continue;
  summary.randomInputs++;
  for (const domain of ['saju', 'ziwei']) {
    const current = await project(domain, input); summary.offCompared[domain]++;
    try { assert.deepEqual(current, old[domain]); } catch { summary.offDifferences.push({ id: old.id, domain, currentStatus: current.status, priorStatus: old[domain].status }); }
    if (current.status !== 'ok') continue;
    // ON attempts are counted separately; outside the verified windows remains explicitly blocked.
    const civilDate = domain === 'saju' ? current.evidence.solarDate : null;
    const solarDay = input.calendar === 'solar' ? Date.parse(input.date) / 86400000 : civilDate ? Date.UTC(civilDate.year, civilDate.month - 1, civilDate.day) / 86400000 : NaN;
    const calendarCandidate = input.calendar === 'lunar'
      ? data.months.some(m => m.lunarYear === +input.date.slice(0, 4) && m.monthNumber === +input.date.slice(5, 7) && m.isLeap === input.leapMonth)
      : data.months.some(m => m.startDay <= solarDay && solarDay < m.startDay + m.length);
    const termCandidate = domain === 'saju' && data.termYears.includes(civilDate.year);
    if (!calendarCandidate && !termCandidate) continue;
    const flags = { sajuTermAuthorityV2: termCandidate, koreanCalendarAuthorityV2: calendarCandidate };
    const enabled = await project(domain, input, { authorityFlags: flags }); summary.enabled[domain]++;
    if (enabled.status !== 'ok') { summary.enabledErrors.push({ id: old.id, domain, result: enabled }); continue; }
    try { assert.deepEqual(facts(domain, enabled), facts(domain, current)); } catch {
      summary.changedFacts[domain]++;
      summary.changes.push({ id: old.id, domain, flags, before: facts(domain, current), after: facts(domain, enabled) });
    }
  }
  summary.lastId = old.id;
  if (summary.randomInputs % 250 === 0) { fs.writeFileSync(progress, JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify({ shard, completed: summary.randomInputs, offDifferences: summary.offDifferences.length })); }
}
fs.writeFileSync(path.join(output, `impact-${shard}.json`), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
if (fs.existsSync(progress)) fs.unlinkSync(progress);
assert.equal(summary.offDifferences.length, 0, 'DEFAULT_OFF_REGRESSION');
console.log(JSON.stringify({ shard, complete: true, inputs: summary.randomInputs, changedFacts: summary.changedFacts, enabledErrors: summary.enabledErrors.length }));
