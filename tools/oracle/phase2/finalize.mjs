import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './corpus.mjs';
import { readRows, writer } from './io.mjs';

const inputs = new Map(), controls = new Map(), initialControls = new Map(), termDisagreements = new Set();
for await (const r of readRows('inputs.jsonl.gz')) inputs.set(r.id, r);
for await (const r of readRows('adjudication.jsonl.gz')) controls.set(r.id, r);
for await (const r of readRows('controls.jsonl.gz')) initialControls.set(r.id, r);
for await (const r of readRows('observations.jsonl.gz')) if (r.group === 'C-term-minute-resolution') termDisagreements.add(r.id);
const sink = writer('observations-final.jsonl.gz'), candidates = writer('a-candidates.jsonl.gz');
const summary = { status: 'complete', confirmedServiceDefects: 0, categories: {}, groups: {}, uniqueCasesByCategory: {},
  initialSummary: 'summary.json', adjudicationCases: controls.size,
  note: 'Final classification of original field observations; categories overlap by input. A is unconfirmed. Original raw/control files are retained, not replaced. Only initial A cases were replayed with corrected historical seconds/Python calendars; original aggregate comparison rates are not recomputed.' };
const groupIds = {}, categoryIds = {};
const set = (r, category, group, basis) => Object.assign(r, { category, group, basis, certainty: category === 'A' ? 'candidate-unconfirmed' : 'observed-difference' });
for await (const original of readRows('observations.jsonl.gz')) {
  const r = { ...original }, c = inputs.get(r.id), control = controls.get(r.id);
  if (r.group === 'B-twelve-stages' && r.service === '건록' && r.oracle === '임관') {
    set(r, 'D', 'D-twelve-stage-label-alias', 'Service table and Python twelve-stage cycle both place this at index 3; same stage, different label. All 182 initial differences are this pair.');
  }
  if (r.group === 'A-saju-residual') {
    const corrected = control?.saju?.facts?.pillars?.[r.field];
    if (control?.solarInput.date < '1908-04-01') set(r, 'C', 'C-manseryeok-pre1908-offset', 'Oracle UTC+9 fallback applies through 1908-03-31, while service uses IANA LMT; unaligned historical clock.');
    else if (corrected === r.service) set(r, 'C', 'C-manseryeok-calendar-conflict', 'Independent korean-saju lunar-to-solar control resolves this pillar; stored KASI corroborates the 2050 samples only. Other dates require official historical calendar adjudication.');
    else if (c.anchor?.kind === 'kasi-term') {
      if (termDisagreements.has(r.id)) set(r, 'A', 'A-saju-term-minute-boundary', 'Service switches at stored KASI minute minus one; manseryeok still returns the preceding pillar. Official second-level timing/rounding is unverified. Candidate, not confirmed defect.');
      else set(r, 'C', 'C-manseryeok-term-conflict', 'Service agrees with stored KASI minute boundary while the oracle switches earlier; second-level authoritative evidence still absent.');
    }
    r.adjudication = { solarInput: control?.solarInput, oraclePillar: corrected };
  }
  if (r.group === 'A-ziwei-residual') {
    const z = control?.ziwei, difference = z?.differences?.find(d => d.field === r.field);
    if (z?.status !== 'ok' || !z.echoMatches) set(r, 'C', 'C-iztro-korean-lunar-representation', 'Independent calendar control cannot be represented/echoed unchanged in iztro.');
    else if (!difference) {
      const before = initialControls.get(r.id)?.ziweiKoreanCalendar?.controlInput;
      const clockOnly = before?.date === z.controlInput.date && before?.time !== z.controlInput.time;
      set(r, 'C', clockOnly ? 'C-harness-historical-offset-seconds' : 'C-oracle-calendar-clock-control',
        clockOnly ? 'Audit harness previously dropped IANA offset seconds before 1908; preserving seconds resolves the field. Service is unchanged.' : 'Independent Python calendar and second-preserving IANA control resolve the field. Stored KASI corroborates only sampled dates; no majority-vote truth claim.');
    } else if (z.yearlyGanji.startsWith('辛') && ((r.field === 'stars.천괴' && difference.service === 2 && difference.oracle === 6) || (r.field === 'stars.천월' && difference.service === 6 && difference.oracle === 2))) {
      set(r, 'B', 'B-ziwei-xin-noble-stars', 'Known Xin-year noble-star rule difference, after independent calendar/clock control.');
    } else {
      set(r, 'A', 'A-ziwei-historical-calendar-placement', 'Residual after independent Python Korean calendar + IANA clock + iztro lunar echo. No stored KASI anchor for these historical dates; fixed-KST calendar convention and placement remain candidates for adjudication, not a confirmed bug.');
      r.initialOracle = r.oracle; r.oracle = difference.oracle;
    }
    r.adjudication = { clockInput: control?.clockInput, lunarInput: z?.controlInput, echoMatches: z?.echoMatches, calendarSource: control?.correctedCalendarSource };
  }
  if (r.category !== original.category || r.group !== original.group) r.initialClassification = { category: original.category, group: original.group };
  await sink.write(r);
  const g = summary.groups[r.group] ??= { category: r.category, observations: 0, cases: 0, examples: [], basis: r.basis };
  g.observations++; (groupIds[r.group] ??= new Set()).add(r.id); (categoryIds[r.category] ??= new Set()).add(r.id);
  summary.categories[r.category] = (summary.categories[r.category] ?? 0) + 1;
  if (g.examples.length < 3 && !g.examples.some(e => e.id === r.id)) g.examples.push({ ...r, input: c.input, anchor: c.anchor });
  if (r.category === 'A') await candidates.write({ ...r, input: c.input, anchor: c.anchor,
    expected: { value: r.oracle, status: 'provisional-oracle-value-not-authoritative' },
    impact: r.group.startsWith('A-saju') ? 'computeNatalFromInput public adapter: natal pillars/derived analysis; animal/love callers. Other service surfaces not executed.' : 'buildZiweiAdapter fusionExpert: guardian/fusion chart evidence and star-based prompts. Other UI/worker surfaces not executed.',
    requiredEvidence: r.group.startsWith('A-saju') ? 'Official solar-term instant with seconds and rounding convention' : 'Official Korean lunar date for this historical solar date, then star-placement rule check' });
}
await sink.close(); await candidates.close();
for (const [key, ids] of Object.entries(groupIds)) summary.groups[key].cases = ids.size;
for (const [key, ids] of Object.entries(categoryIds)) summary.uniqueCasesByCategory[key] = ids.size;
fs.writeFileSync(path.join(OUTPUT, 'summary-final.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ categories: summary.categories, uniqueCases: summary.uniqueCasesByCategory, groups: Object.fromEntries(Object.entries(summary.groups).map(([k, g]) => [k, { cases: g.cases, observations: g.observations }])) }, null, 2));
