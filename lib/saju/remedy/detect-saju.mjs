// 사주 액땜 케이스 판정. 입력(원국·세운·대운)은 읽기만 하고, 판정은 natal-core 정본(analyzeNatalCore·computeShinsal) 결과로만 한다.
// 순수 함수. 던질 수 있는 곳은 index.mjs 가 감싼다.
import { analyzeNatalCore, computeShinsal } from '../natal-core/index.mjs';
import { readPillar } from '../natal-core/shinsal/chart.mjs';
import { STEM_ORDER, BRANCH_ORDER, STEM_EL, BRANCH_EL, ELEMENTS, EL_KO, EL_HAN, GENERATES } from '../natal-core/tables.mjs';
import { samjaeStatus } from './samjae.mjs';
import { withJosa } from './copy.ko.mjs';

const NATAL = Object.freeze(['year', 'month', 'day', 'hour']);
const LUCK_SCOPES = Object.freeze(['sewoon', 'daewoon']);
const PILLAR_KO = Object.freeze({ year: '년', month: '월', day: '일', hour: '시' });
const ANIMAL_KO = Object.freeze({ 子: '쥐', 丑: '소', 寅: '호랑이', 卯: '토끼', 辰: '용', 巳: '뱀', 午: '말', 未: '양', 申: '원숭이', 酉: '닭', 戌: '개', 亥: '돼지' });
const NATAL_PERIOD = Object.freeze({ kind: 'natal', label: '타고난 원국' });
// 신살 적중 → 케이스(세운·대운 기둥에 든 것만).
const LUCK_HIT_CASE = Object.freeze({ baekho: 'baekho', yangin: 'yangin', yeokmasal: 'yeokma', sangmun: 'sangmun-jogaek', jogaek: 'sangmun-jogaek', gongmang: 'gongmang-year' });
// 상문·조객·공망은 그해(세운)만 본다.
const SEWOON_ONLY = new Set(['sangmun-jogaek', 'gongmang-year']);
// 기신 해: 세운 천간·지지 오행이 모두 꺼리는 오행일 때만(골든 30건 분포로 정함 — 상태 파일 R0 절).
export const GISIN_YEAR_RULE = 'both';
// 오행 과다: 꺼리는 오행이 원국에 이 칸 수 이상.
export const ELEMENT_EXCESS_MIN = 4;

const finite = (value) => (value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);
const mod = (n, m) => ((n % m) + m) % m;
const ganjiOfYear = (year) => STEM_ORDER[mod(year - 4, 10)] + BRANCH_ORDER[mod(year - 4, 12)];
const elText = (el) => `${EL_KO[el]}(${EL_HAN[el]})`;

function pickPillar(saju, key) {
  return readPillar(saju?.pillars?.[key]) || readPillar(saju?.pillars?.[key[0]])
    || readPillar(saju?.[`${key}Pillar`]) || readPillar(saju?.pillarDetails?.[key]?.pillar) || readPillar(saju?.pillarDetails?.[key]);
}

function readSewoon(saju, refYear) {
  const own = saju?.sewoon;
  if (own && finite(own.year) === refYear) {
    const pillar = readPillar(own.pillar ?? own.ganji ?? own);
    if (pillar) return { ...pillar, year: refYear };
  }
  const row = Array.isArray(saju?.yearlyLuck) ? saju.yearlyLuck.find((r) => finite(r?.year) === refYear) : null;
  const fromRow = row ? readPillar(row.pillar ?? row) : null;
  return { ...(fromRow || readPillar(ganjiOfYear(refYear))), year: refYear };
}

function readLuckCycle(row) {
  if (!row || typeof row !== 'object') return null;
  const pillar = readPillar(row.pillar ?? row.ganji ?? row);
  if (!pillar) return null;
  return { ...pillar, startYear: finite(row.startYear), endYear: finite(row.endYear), startAge: finite(row.startAge), endAge: finite(row.endAge) };
}

function readDaewoon(saju, refYear) {
  if (saju?.daewoon) return readLuckCycle(saju.daewoon);
  const cycles = Array.isArray(saju?.majorLuck?.cycles) ? saju.majorLuck.cycles : [];
  const index = cycles.findIndex((c) => finite(c?.startYear) !== null && finite(c?.endYear) !== null && finite(c.startYear) <= refYear && refYear <= finite(c.endYear));
  if (index >= 0) {
    const cycle = readLuckCycle(cycles[index]);
    if (cycle) return { ...cycle, next: readLuckCycle(cycles[index + 1]) };
  }
  const current = readLuckCycle(saju?.majorLuck?.currentCycle);
  if (!current) return null;
  const covers = current.startYear === null || current.endYear === null || (current.startYear <= refYear && refYear <= current.endYear);
  return covers ? current : null;
}

function readNatalCore(saju, pillars) {
  const own = saju?.natalCore;
  if (own?.yongsinMethods?.final) return own;
  const toCore = (p) => (p ? { g: p.stem, j: p.branch } : {});
  const core = analyzeNatalCore({ y: toCore(pillars.year), m: toCore(pillars.month), d: toCore(pillars.day), h: toCore(pillars.hour) });
  return core?.status === 'ok' && core.yongsinMethods?.final ? core : null;
}

/**
 * 사주 입력을 판정용 차트로. 년·월·일주가 없으면 null.
 * 받는 모양: { pillars:{year,month,day,hour} } | { yearPillar…hourPillar } | { pillarDetails:{year:{pillar}} } (calculateLifeBookAiSaju 결과 그대로),
 * 선택 { timeUnknown|birthTimeUnknown, sewoon:{year,pillar}, yearlyLuck:[{year,pillar}], daewoon:{pillar,startYear,endYear},
 * majorLuck:{cycles,currentCycle}, natalCore(analyzeNatalCore 결과) }.
 */
export function readSajuChart(saju, refYear) {
  if (!saju || typeof saju !== 'object') return null;
  const pillars = Object.fromEntries(NATAL.map((key) => [key, pickPillar(saju, key)]));
  if (!pillars.year || !pillars.month || !pillars.day) return null;
  const timeUnknown = saju.timeUnknown === true || saju.birthTimeUnknown === true || !pillars.hour;
  if (timeUnknown) pillars.hour = null;
  return { pillars, timeUnknown, refYear, sewoon: readSewoon(saju, refYear), daewoon: readDaewoon(saju, refYear), natalCore: readNatalCore(saju, pillars) };
}

function luckSource(chart, scope) {
  if (scope === 'sewoon') {
    const s = chart.sewoon;
    return { period: { kind: 'year', label: `${s.year}년` }, evidence: { label: '세운', value: `${s.year} ${s.ganji} 세운` } };
  }
  const d = chart.daewoon;
  const span = d.startYear !== null && d.endYear !== null ? `${d.startYear}~${d.endYear}` : '';
  return {
    period: { kind: 'decade', label: span ? `${span} 대운` : '지금 대운' },
    evidence: { label: '대운', value: span ? `${d.ganji} 대운(${span})` : `${d.ganji} 대운` },
  };
}

const yongsinElementOf = (core) => core?.yongsinMethods?.final?.yongsin || core?.yongsinMethods?.final?.useful?.[0] || '';
const partnerText = (node, suffix) => `${PILLAR_KO[node.pillar]}지 ${withJosa(node.char, '과')} ${suffix}`;

/** 사주 케이스 후보 목록(우선순위·방법은 index.mjs 가 붙인다). 같은 케이스는 세운 근거를 먼저 쓰고 한 번만 낸다. */
export function detectSajuCases(chart) {
  const found = new Map();
  const add = (caseId, data) => { if (!found.has(caseId)) found.set(caseId, { caseId, variant: '', system: 'saju', ...data }); };
  const useEl = yongsinElementOf(chart.natalCore);
  const elements = { use: useEl, activity: useEl };
  const scopes = LUCK_SCOPES.filter((scope) => scope === 'sewoon' || chart.daewoon);

  const luckRows = [{ scope: 'sewoon', ganji: chart.sewoon.ganji, year: chart.sewoon.year }];
  if (chart.daewoon) luckRows.push({ scope: 'daewoon', ganji: chart.daewoon.ganji, startAge: chart.daewoon.startAge ?? undefined });
  const shinsal = computeShinsal({
    pillars: Object.fromEntries(NATAL.map((key) => [key, chart.pillars[key]?.ganji ?? null])),
    timeUnknown: chart.timeUnknown,
    luckRows,
  });
  const hits = shinsal?.valid ? shinsal.hits : [];
  const relations = shinsal?.valid ? shinsal.relations : [];
  const luckOf = (pair, scope) => pair?.find((n) => n?.pillar === scope);
  const natalOf = (pair) => pair?.find((n) => NATAL.includes(n?.pillar));

  for (const scope of scopes) {
    const source = luckSource(chart, scope);
    // 충(년·월·일지)·형: 운 기둥과 원국 지지의 짝.
    for (const rel of relations) {
      const luck = luckOf(rel.pair, scope);
      const natal = natalOf(rel.pair);
      if (!luck || !natal || !BRANCH_ORDER.includes(natal.char)) continue;
      if (rel.ruleId === 'chung' && natal.pillar !== 'hour') {
        add(`${natal.pillar}-clash`, { period: source.period, evidence: [source.evidence, { label: '충', value: partnerText(natal, '충') }], elements });
      } else if (rel.ruleId === 'hyeong') {
        add('hyeong', { period: source.period, evidence: [source.evidence, { label: '형', value: partnerText(natal, rel.detail ? `형(${rel.detail})` : '형') }], elements });
      }
    }
    // 원진: 그해(세운)와 원국 지지의 짝.
    if (scope === 'sewoon') {
      for (const hit of hits) {
        const natal = hit.ruleId === 'wonjin' && luckOf(hit.pair, 'sewoon') ? natalOf(hit.pair) : null;
        if (natal) add('wonjin', { period: source.period, evidence: [source.evidence, { label: '원진', value: partnerText(natal, '원진') }], elements });
      }
    }
    // 운 기둥에 든 신살.
    const names = new Map();
    for (const hit of hits) {
      const caseId = hit.pillar === scope ? LUCK_HIT_CASE[hit.ruleId] : '';
      if (!caseId || (SEWOON_ONLY.has(caseId) && scope !== 'sewoon')) continue;
      if (!names.has(caseId)) names.set(caseId, []);
      if (!names.get(caseId).includes(hit.name)) names.get(caseId).push(hit.name);
    }
    for (const [caseId, list] of names) add(caseId, { period: source.period, evidence: [source.evidence, { label: '신살', value: list.join('·') }], elements });
  }

  // 삼재: 띠(년지)와 그해.
  const yearBranch = chart.pillars.year.branch;
  const samjae = samjaeStatus(yearBranch, chart.refYear);
  if (samjae?.stage) {
    add('samjae', {
      period: { kind: 'year', label: `${chart.refYear}년` },
      evidence: [{ label: '띠', value: `${ANIMAL_KO[yearBranch]}띠(${yearBranch})` }, { label: '삼재', value: `${chart.refYear} ${samjae.label}` }],
      elements,
      samjae: { stage: samjae.stage, years: samjae.years.map((row) => row.year) },
    });
  }

  // 대운 교체: 새 대운 첫 두 해, 또는 대운 마지막 해.
  const d = chart.daewoon;
  if (d && d.startYear !== null && d.endYear !== null) {
    const period = { kind: 'decade', label: `${d.startYear}~${d.endYear} 대운` };
    if (chart.refYear - d.startYear >= 0 && chart.refYear - d.startYear <= 1) {
      add('daewoon-shift', { period, evidence: [{ label: '대운', value: `${d.startYear}년부터 ${d.ganji} 대운` }], elements });
    } else if (chart.refYear === d.endYear) {
      add('daewoon-shift', { period, evidence: [{ label: '대운', value: d.next ? `${d.endYear + 1}년부터 ${d.next.ganji} 대운` : `${d.endYear + 1}년 대운 교체` }], elements });
    }
  }

  const core = chart.natalCore;
  const final = core?.yongsinMethods?.final;
  if (final) {
    const avoid = Array.isArray(final.avoid) ? final.avoid : [];
    // 기신이 드는 해.
    const sewoonEls = [STEM_EL[chart.sewoon.stem], BRANCH_EL[chart.sewoon.branch]];
    const avoided = [...new Set(sewoonEls.filter((el) => avoid.includes(el)))];
    const gisin = GISIN_YEAR_RULE === 'both' ? sewoonEls.every((el) => avoid.includes(el)) : avoided.length > 0;
    if (gisin && avoided.length) {
      const source = luckSource(chart, 'sewoon');
      add('gisin-year', { period: source.period, evidence: [source.evidence, { label: '오행', value: `꺼리는 오행 ${avoided.map(elText).join('·')}` }], elements });
    }
    // 꺼리는 오행이 원국에 몰림.
    const byEl = core.counts?.byEl || {};
    const excess = ELEMENTS.filter((el) => avoid.includes(el) && Number(byEl[el]) >= ELEMENT_EXCESS_MIN)
      .sort((a, b) => Number(byEl[b]) - Number(byEl[a]))[0];
    if (excess) {
      add('element-excess', {
        period: NATAL_PERIOD,
        evidence: [{ label: '오행', value: `원국 ${elText(excess)} ${Number(byEl[excess])}칸` }],
        elements: { use: useEl, activity: GENERATES[excess] },
      });
    }
  }
  // 조후가 급한 원국.
  const johu = core?.yongsinMethods?.johu;
  if (johu?.status === 'ok' && johu.urgent === true) {
    const warm = String(johu.type || '').includes('한') || johu.useful?.[0] === 'fire';
    const johuEl = johu.useful?.[0] || useEl;
    add('johu-urgent', {
      variant: warm ? 'warm' : 'hydrate',
      period: NATAL_PERIOD,
      evidence: [{ label: '조후', value: `원국 조후 ${johu.type || (warm ? '한' : '조')}` }],
      elements: { use: johuEl, activity: johuEl },
    });
  }
  return [...found.values()];
}

/** 아무 케이스도 없을 때 쓰는 기본 케이스(쓸 오행 하나로 평소 균형). 쓸 오행을 모르면 null. */
export function everydayBalanceCase(chart) {
  const core = chart?.natalCore;
  let useEl = yongsinElementOf(core);
  if (!useEl) {
    const byEl = core?.counts?.byEl;
    useEl = byEl ? ELEMENTS.slice().sort((a, b) => Number(byEl[a]) - Number(byEl[b]))[0] : '';
  }
  if (!useEl) return null;
  return {
    caseId: 'everyday-balance',
    variant: '',
    system: 'saju',
    period: NATAL_PERIOD,
    evidence: [{ label: '오행', value: `힘이 되는 오행 ${elText(useEl)}` }],
    elements: { use: useEl, activity: useEl },
  };
}
