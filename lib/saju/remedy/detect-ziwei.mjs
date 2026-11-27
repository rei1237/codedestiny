// 자미두수 액땜 케이스 판정. 입력은 worker/lib/ziwei-ai-chart.js calculateZiweiAiChart 결과(명반)를 읽기만 한다.
// 순수 함수. 태어난 시를 모르면 궁 배치가 흔들리므로 케이스를 내지 않는다.
// 범위 밖: 그해(유년) 화기는 R0 에서 다루지 않는다(후속 과제).

// 궁 이름 → variant(slug). 부부궁의 다른 이름 부처궁도 받는다.
const PALACE_SLUG = Object.freeze({ 명궁: 'ming', 재백궁: 'wealth', 관록궁: 'career', 부부궁: 'spouse', 부처궁: 'spouse', 천이궁: 'travel', 질액궁: 'health', 전택궁: 'home' });
const NATAL_PERIOD = Object.freeze({ kind: 'natal', label: '타고난 명반' });
const LUCK_HWAGI = /^화기:([^()]+)\(([^)]+)\)$/;

const finite = (value) => (value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);
const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : []);
const palaceName = (name) => (name === '부처궁' ? '부부궁' : name);

/** 명반을 판정용으로. 12궁과 명궁이 없으면 null. */
export function readZiweiChart(ziwei) {
  if (!ziwei || typeof ziwei !== 'object' || !Array.isArray(ziwei.palaces) || ziwei.palaces.length !== 12) return null;
  const byName = new Map();
  for (const palace of ziwei.palaces) {
    if (palace && typeof palace.name === 'string') byName.set(palaceName(palace.name), palace);
  }
  if (!byName.has('명궁')) return null;
  return {
    byName,
    timeUnknown: ziwei.uncertainty?.birthTimeUnknown === true,
    lunarYear: finite(ziwei.lunar?.year),
    majorLuck: Array.isArray(ziwei.majorLuck) ? ziwei.majorLuck : [],
    minorLuck: ziwei.minorLuck && typeof ziwei.minorLuck === 'object' ? ziwei.minorLuck : null,
  };
}

/** refYear 의 나이(세는 나이). 음력 생년이 없으면 소한(minorLuck.current) 나이를 쓴다. */
function ageAt(chart, refYear) {
  if (chart.lunarYear !== null) return refYear - chart.lunarYear + 1;
  const current = chart.minorLuck?.current;
  return current && finite(current.year) === refYear ? finite(current.age) : null;
}

/** 자미 케이스 후보 목록(우선순위·방법은 index.mjs 가 붙인다). */
export function detectZiweiCases(chart, refYear) {
  if (!chart || chart.timeUnknown) return [];
  const out = [];
  const add = (caseId, data) => { if (!out.some((row) => row.caseId === caseId)) out.push({ caseId, variant: '', system: 'ziwei', elements: { use: '', activity: '' }, ...data }); };
  const malefic = (name) => strings(chart.byName.get(name)?.maleficStars);

  // 이번 대한에 화기가 드는 궁.
  const age = ageAt(chart, refYear);
  const row = age === null ? null : chart.majorLuck.find((r) => {
    const start = finite(r?.startAge);
    const end = finite(r?.endAge);
    return start !== null && end !== null && start <= age && age <= end;
  });
  if (row) {
    for (const text of strings(row.transformations)) {
      const match = LUCK_HWAGI.exec(text);
      const target = match ? palaceName(match[2].trim()) : '';
      if (!PALACE_SLUG[target]) continue;
      const span = `${finite(row.startAge)}~${finite(row.endAge)}세`;
      add('zw-decade-hwagi', {
        variant: PALACE_SLUG[target],
        period: { kind: 'decade', label: `${span} 대한` },
        evidence: [
          { label: '대한', value: row.palaceName ? `${span} 대한(${palaceName(row.palaceName)})` : `${span} 대한` },
          { label: '대한 화기', value: `${target}에 화기(${match[1].trim()})` },
        ],
      });
      break;
    }
  }

  // 타고난 화기가 놓인 궁.
  for (const [name, palace] of chart.byName) {
    const text = strings(palace.transformations).find((item) => item.startsWith('화기:'));
    if (!text || !PALACE_SLUG[name]) continue;
    add('zw-natal-hwagi', { variant: PALACE_SLUG[name], period: NATAL_PERIOD, evidence: [{ label: '생년 화기', value: `${name} 화기(${text.slice(3)})` }] });
    break;
  }

  const ming = malefic('명궁');
  const yangTuo = ming.filter((star) => star === '경양' || star === '타라');
  if (yangTuo.length) add('zw-yang-tuo', { period: NATAL_PERIOD, evidence: [{ label: '명궁', value: `명궁 ${yangTuo.join('·')}` }] });

  const huoLing = ['명궁', '천이궁']
    .map((name) => [name, malefic(name).filter((star) => star === '화성' || star === '영성')])
    .filter(([, stars]) => stars.length);
  if (huoLing.length) add('zw-huo-ling', { period: NATAL_PERIOD, evidence: huoLing.map(([name, stars]) => ({ label: name, value: `${name} ${stars.join('·')}` })) });

  const kongJie = ['재백궁', '전택궁']
    .map((name) => [name, malefic(name).filter((star) => star === '지공' || star === '지겁')])
    .filter(([, stars]) => stars.length);
  if (kongJie.length) add('zw-kong-jie', { period: NATAL_PERIOD, evidence: kongJie.map(([name, stars]) => ({ label: name, value: `${name} ${stars.join('·')}` })) });

  const travel = malefic('천이궁');
  if (travel.length) add('zw-travel-malefic', { period: NATAL_PERIOD, evidence: [{ label: '천이궁', value: `천이궁 ${travel.join('·')}` }] });

  const mingMain = chart.byName.get('명궁')?.mainStars;
  if (Array.isArray(mingMain) && mingMain.length === 0) {
    const borrowed = strings(chart.byName.get('천이궁')?.mainStars);
    const evidence = [{ label: '명궁', value: '명궁 주성 없음(공궁)' }];
    if (borrowed.length) evidence.push({ label: '천이궁', value: `마주 보는 천이궁 ${borrowed.join('·')}` });
    add('zw-empty-ming', { period: NATAL_PERIOD, evidence });
  }
  return out;
}
