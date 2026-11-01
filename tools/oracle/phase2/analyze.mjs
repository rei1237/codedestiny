import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './corpus.mjs';
import { readRows, writer, equal, ziweiDifferences } from './io.mjs';
import { verifyLicenses } from '../verify-licenses.mjs';
import { blockNetwork } from '../network-guard.mjs';

verifyLicenses(); blockNetwork();
const { getTenGod, getVoidBranches } = await import('manseryeok');
const inputs = new Map(); for await (const row of readRows('inputs.jsonl.gz')) inputs.set(row.id, row);
const controls = new Map(); for await (const row of readRows('controls.jsonl.gz')) controls.set(row.id, row);
const py = new Map();
for await (const row of readRows('python.jsonl.gz')) {
  const p = row.koreanSaju;
  py.set(row.id, { status: p.status, error: p.error, facts: p.facts,
    school: { pattern: p.school?.regularPattern?.gyeokguk?.hangul, special: p.school?.specialPatterns,
      useful: p.school?.usefulGod?.yong_o_haeng?.hangul, strength: p.school?.strength?.level?.hangul,
      reason: p.school?.usefulGod?.reason } });
}
const observations = writer('observations.jsonl.gz');
const summary = { total: inputs.size, processed: 0, statuses: {}, errors: {}, comparisons: {}, groups: {}, coverage: {}, categories: {}, sourceNotes: { truth: 'Stored KASI proxy fixtures, not a new official API capture', matching: 'Original results are never replaced by controls' } };
const casesByCategory = {}, casesByGroup = {}, seen = new Set();
const inc = (object, key, n = 1) => object[key] = (object[key] ?? 0) + n;
function comparison(key, mismatch, group) {
  const stat = summary.comparisons[key] ??= { comparable: 0, different: 0, byInputGroup: {} };
  stat.comparable++; if (mismatch) stat.different++;
  const part = stat.byInputGroup[group] ??= { comparable: 0, different: 0 }; part.comparable++; if (mismatch) part.different++;
}
async function record(row, category, group, field, service, oracle, basis, certainty = 'observed-difference') {
  const input = inputs.get(row.id);
  const entry = { id: row.id, inputGroup: input.group, category, group, field, service, oracle, basis, certainty };
  await observations.write(entry);
  const g = summary.groups[group] ??= { category, certainty, observations: 0, examples: [], basis };
  g.observations++;
  (casesByGroup[group] ??= new Set()).add(row.id);
  (casesByCategory[category] ??= new Set()).add(row.id);
  inc(summary.categories, category);
  if (g.examples.length < 4 && !g.examples.some(x => x.id === row.id)) g.examples.push({ ...entry, input: input.input, anchor: input.anchor });
}
const koStem = '갑을병정무기경신임계', hanStem = '甲乙丙丁戊己庚辛壬癸', koBranch = '자축인묘진사오미신유술해', hanBranch = '子丑寅卯辰巳午未申酉戌亥';
const elementKo = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const solarText = s => s ? `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}` : null;
for (let shard = 0; shard < 4; shard++) for await (const row of readRows(`node-${shard}.jsonl.gz`)) {
  if (!inputs.has(row.id) || seen.has(row.id)) throw new Error(`CORPUS_ID_INTEGRITY: ${row.id}`);
  seen.add(row.id); summary.processed++;
  const c = inputs.get(row.id), input = c.input, s = row.saju, m = row.manseryeok, matched = row.manseryeokMatched, control = controls.get(row.id) ?? {}, p = py.get(row.id);
  if (!p) throw new Error('PYTHON_ROW_MISSING');
  for (const provider of ['saju', 'ziwei', 'manseryeok', 'lunar', 'iztro', 'manseryeokMatched', 'iztroMatched']) {
    const result = row[provider], stats = summary.statuses[provider] ??= {};
    inc(stats, result.status);
    if (result.status === 'error') inc(summary.errors[provider] ??= {}, result.error ?? result.reason ?? 'unknown');
    if (result.status === 'error') await record(row, 'C', `C-status-${provider}`, 'execution', provider.startsWith('saju') || provider === 'ziwei' ? result.error : null, result.error, 'Unsupported range, invalid calendar input, ambiguous civil time or runner limitation; see exact error. Not a confirmed service defect.');
  }
  inc(summary.statuses.koreanSaju ??= {}, p.status);
  if (p.status === 'error') inc(summary.errors.koreanSaju ??= {}, p.error ?? 'unknown');
  if (p.status === 'error') await record(row, 'C', 'C-status-korean-saju', 'execution', null, p.error, 'Python provider cannot calculate this input; check range/calendar coverage.');
  if (s.status === 'ok') {
    if (input.gender !== 'unknown' && s.evidence.input.gender === 'unknown') inc(summary.coverage, 'knownGenderDroppedByPublicAdapter');
    if (s.evidence.daewoon.direction === 'unknown') inc(summary.coverage, 'serviceMajorLuckUnavailable');
    if (input.timeUnknown) inc(summary.coverage, 'serviceUnknownTimeHandled');
    const dayStem = koStem[hanStem.indexOf(s.pillars.day[0])];
    for (const [pillar, list] of Object.entries(s.hiddenStems)) for (const item of list) {
      const expected = getTenGod(dayStem, item.hiddenStem);
      comparison('hiddenStemTenGod', expected !== item.tenGod, c.group);
      if (expected !== item.tenGod) await record(row, 'A', 'A-hidden-ten-god', `${pillar}.${item.hiddenStem}`, item.tenGod, expected, 'Same exposed day stem and target stem; public manseryeok getTenGod relation', 'candidate-needs-independent-rule-confirmation');
    }
    const voidRow = s.school.shinsal?.rows?.find(v => v.shinsalName === '공망');
    if (voidRow?.trigger?.target) {
      const expected = getVoidBranches(dayStem, koBranch[hanBranch.indexOf(s.pillars.day[1])]);
      const actual = voidRow.trigger.target.split(/[,\s]+/).filter(Boolean).sort();
      comparison('dayVoidBranches', !equal(actual, [...expected].sort()), c.group);
      if (!equal(actual, [...expected].sort())) await record(row, 'A', 'A-void-branches', 'gongmang', actual, expected, 'Service public shinsal target versus oracle day-pillar void branches', 'candidate-needs-rule-confirmation');
    }
  }
  if (s.status === 'ok' && m.status === 'ok') {
    const rawDiff = !equal(s.pillars, m.facts.pillars);
    comparison('sajuDefaultPillars', rawDiff, c.group);
    comparison('sajuMatchedPillars', !equal(s.pillars, matched.facts.pillars), c.group);
    const final = control.sajuRounded?.status === 'ok' ? control.sajuRounded : matched;
    comparison('sajuRoundedControlPillars', !equal(s.pillars, final.facts.pillars), c.group);
    for (const field of ['year', 'month', 'day', 'hour']) {
      const actual = s.pillars[field], initial = m.facts.pillars[field], adjusted = final.facts.pillars[field];
      if (actual === initial && actual === adjusted) continue;
      if (actual === matched.facts.pillars[field]) await record(row, 'D', 'D-saju-clock-and-day-boundary', field, actual, initial, 'Difference disappears with local mean solar time / historical DST / jasi option');
      else if (actual === adjusted) await record(row, 'D', 'D-saju-minute-rounding', field, actual, matched.facts.pillars[field], 'Difference disappears with exact-minute longitude 127 control; service rounds Seoul correction -32.088 to -32 minutes');
      else if (+input.date.slice(0, 4) < 1908) await record(row, 'C', 'C-manseryeok-pre1908-offset', field, actual, adjusted, 'Oracle korea-timezone.js uses UTC+9 fallback before 1908; service uses IANA LMT');
      else await record(row, 'A', 'A-saju-residual', field, actual, adjusted, 'Residual after explicit policy/rounding controls; inspect historical offset and term evidence before deciding correctness', 'candidate-unconfirmed');
    }
  }
  if (c.anchor?.kind === 'kasi-calendar') {
    const anchor = c.anchor;
    if (s.status === 'ok') {
      const actual = input.calendar === 'lunar' ? solarText(s.evidence.solarDate) : s.pillars.day;
      const expected = input.calendar === 'lunar' ? anchor.solar : anchor.iljin;
      const oracle = input.calendar === 'lunar' ? m.facts?.calendar?.solar : m.facts?.pillars?.day;
      comparison(input.calendar === 'lunar' ? 'kasiLunarToSolarService' : 'kasiNoonDayPillarService', actual !== expected, c.group);
      if (actual !== expected) await record(row, 'A', 'A-kasi-calendar-day', input.calendar === 'lunar' ? 'solarDate' : 'dayPillar', actual, expected, `Stored KASI sample ${anchor.solar}; manseryeok=${oracle}`, oracle === expected ? 'confirmed-against-stored-kasi-and-oracle' : 'candidate-oracle-conflict');
    }
    if (input.calendar === 'solar') for (const [provider, result] of [['manseryeok', m], ['korean-saju', p], ['lunar-javascript', row.lunar]]) {
      const lunar = result.facts?.calendar?.lunar;
      if (!lunar) continue;
      const expected = [anchor.lunarYear, anchor.lunarMonth, anchor.lunarDay, anchor.isLeapMonth], actual = [lunar.year, lunar.month, lunar.day, lunar.leapMonth];
      comparison(`kasiCalendarOracle:${provider}`, !equal(actual, expected), c.group);
      if (!equal(actual, expected)) await record(row, provider === 'lunar-javascript' ? 'D' : 'C', `calendar-${provider}`, 'lunarDate', expected, actual, 'Stored Korean KASI lunar sample versus provider calendar; Chinese calendar not treated as Korean truth');
    }
  }
  if (c.anchor?.kind === 'kasi-term' && s.status === 'ok') {
    const a = c.anchor, expected = (a.index / 2 + (a.deltaMinutes < 0 ? 11 : 0)) % 12, actual = s.evidence.solarTerms.active.index;
    comparison('kasiTermBoundary', actual !== expected, c.group);
    if (actual !== expected) await record(row, 'C', a.year === 2011 && a.index === 20 ? 'C-kasi-2011-ipdong-conflict' : 'C-term-minute-resolution', 'activeJeolIndex', actual, expected,
      a.year === 2011 && a.index === 20 ? 'Known fixture discrepancy 09:26 versus service 03:35; public Meeus longitude check recorded in controls. No fresh official response.' : 'Stored minute-level KASI boundary versus minute-rounded service table/model; exact second-level astronomical adjudication not established');
  }
  if (s.status === 'ok' && p.status === 'ok') {
    const same = equal(s.pillars, p.facts.pillars); comparison('pythonSamePillars', !same, c.group);
    if (same) {
      const pattern = s.school.pattern.finalGyeokguk, useful = elementKo[s.school.useful.coreYongshin];
      comparison('schoolPatternLabels', pattern !== p.school.pattern, c.group);
      if (pattern !== p.school.pattern) await record(row, 'B', 'B-pattern-selection', 'pattern', pattern, { regular: p.school.pattern, special: p.school.special }, 'Identical pillars; service final selection versus Python regular/special hierarchy. Label comparison is not semantic equivalence or correctness.');
      comparison('schoolUsefulElement', useful !== p.school.useful, c.group);
      if (useful !== p.school.useful) await record(row, 'B', 'B-useful-element', 'usefulElement', useful, p.school.useful, 'Identical pillars; strength, climate and pattern precedence are school choices');
      if (s.school.strength.strength !== p.school.strength) await record(row, 'B', 'B-strength-scale', 'strengthLabel', s.school.strength.strength, p.school.strength, 'Different grading scales/weights; labels are not interchangeable numeric truth');
    }
  }
  const z = row.ziwei;
  if (z.status === 'ok' && row.iztro.status === 'ok') {
    const raw = ziweiDifferences(z, row.iztro);
    comparison('ziweiDefaultCore', raw.some(d => ['life', 'body', 'bureau'].includes(d.field)), c.group);
    comparison('ziweiDefaultAllComparedFields', raw.length > 0, c.group);
  }
  if (z.status === 'ok' && row.iztroMatched.status === 'ok') {
    const matchedZ = row.iztroMatched, differences = ziweiDifferences(z, matchedZ);
    comparison('ziweiClockMatchedCore', differences.some(d => ['life', 'body', 'bureau'].includes(d.field)), c.group);
    comparison('ziweiClockMatchedAllComparedFields', differences.length > 0, c.group);
    const lunar = control.ziweiKoreanCalendar;
    const final = lunar?.status === 'ok' && lunar.echoMatches ? lunar : matchedZ;
    const finalDiff = ziweiDifferences(z, final);
    const invalidLunar = lunar && (lunar.status !== 'ok' || !lunar.echoMatches);
    if (!invalidLunar) comparison('ziweiCalendarMatchedAllComparedFields', finalDiff.length > 0, c.group);
    const fields = new Map([...ziweiDifferences(z, row.iztro), ...differences, ...finalDiff].map(d => [d.field, d]));
    for (const [field, difference] of fields) {
      if (!differences.some(d => d.field === field)) await record(row, 'D', 'D-ziwei-clock', field, difference.service, difference.oracle, 'Independent local-mean/IANA/full-date Zi rollover control resolves this field');
      else if (invalidLunar) await record(row, 'C', 'C-iztro-korean-lunar-representation', field, difference.service, difference.oracle, 'Independent Korean lunar date is invalid or echoed differently by Chinese calendar oracle; cannot adjudicate star placement here');
      else if (!finalDiff.some(d => d.field === field)) await record(row, 'D', 'D-ziwei-korean-chinese-calendar', field, difference.service, difference.oracle, 'Independent manseryeok Korean lunar input removes the residual; no service lunar output injected');
      else if (lunar?.yearlyGanji?.startsWith('辛') && ((field === 'stars.천괴' && difference.service === 2 && difference.oracle === 6) || (field === 'stars.천월' && difference.service === 6 && difference.oracle === 2))) await record(row, 'B', 'B-ziwei-xin-noble-stars', field, difference.service, difference.oracle, 'Known Xin-year 天魁/天钺 rule difference documented in scripts/verify-ziwei-reference.mjs::SCHOOL_RULES; classical citation not independently adjudicated here');
      else await record(row, 'A', 'A-ziwei-residual', field, difference.service, difference.oracle, 'Residual under independent clock and Korean calendar controls; rule/source confirmation still required', 'candidate-unconfirmed');
    }
  }
}
if (seen.size !== inputs.size || py.size !== inputs.size) throw new Error('INCOMPLETE_CORPUS');
for await (const row of readRows('twelve-stages.jsonl.gz')) {
  if (!row.service.ok) throw new Error('TWELVE_STAGE_PUBLIC_ADAPTER_FAILURE');
  for (const stage of row.service.allStages) {
    const expected = row.oracle[stage.pillar.toUpperCase()]?.hangul;
    if (!expected) throw new Error('TWELVE_STAGE_SCHEMA');
    comparison('twelveStages', stage.labelKo !== expected, inputs.get(row.id).group);
    if (stage.labelKo !== expected) await record(row, 'B', 'B-twelve-stages', stage.pillar, stage.labelKo, expected, 'Same existing-result pillars, public resolveAnimalTwelveResult versus korean-saju; school-dependent stage application');
  }
}
const cacheValidation = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'python-cache-validation.json')));
if (cacheValidation.initialFailure) await record({ id: cacheValidation.initialFailure.id }, 'C', 'C-python-location-order', 'school.stars.locations', cacheValidation.initialFailure.batch, cacheValidation.initialFailure.fresh, 'Fresh process changes only unordered location-array ordering; facts and canonical location sets match. Raw results were not rewritten.');
await observations.close();
for (const [group, ids] of Object.entries(casesByGroup)) summary.groups[group].cases = ids.size;
summary.uniqueCasesByCategory = Object.fromEntries(Object.entries(casesByCategory).map(([key, ids]) => [key, ids.size]));
summary.note = 'Categories overlap by input; observations are field-level, not unique defects. A candidates are not confirmed defects.';
fs.writeFileSync(path.join(OUTPUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ processed: summary.processed, comparisons: summary.comparisons, categories: summary.categories, groups: Object.fromEntries(Object.entries(summary.groups).map(([key, g]) => [key, { cases: g.cases, observations: g.observations, certainty: g.certainty }])) }, null, 2));
