import { getBranchPairRelations, getStemPairRelation } from './saju-shinsal.js';

export const RELATIONSHIP_EVIDENCE_VERSION = 'pillar-relationship-v1';
const KEYS = ['year', 'month', 'day', 'hour'];
const LABELS = ['년주', '월주', '일주', '시주'];
const AREAS = ['배경과 익숙한 관계 방식', '사회생활과 함께하는 리듬', '가까운 관계와 일상', '미래 계획과 함께 키울 것'];
const TRIADS = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'];
const ELEMENTS = ['목','목','화','화','토','토','금','금','수','수'];
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const GENERATES = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const CONTROLS = { 목:'토', 화:'금', 토:'수', 금:'목', 수:'화' };

function rows(chart, side) {
  return KEYS.flatMap((key, index) => {
    if (key === 'hour' && chart.birthTimeUnknown === true) return [];
    const raw = chart.pillars?.[index] ?? chart.pillars?.[key] ?? chart[`${key}Pillar`];
    const gan = typeof raw === 'string' ? raw[0] : raw?.gan;
    const ji = typeof raw === 'string' ? raw[1] : raw?.ji;
    return STEMS.includes(gan) && '子丑寅卯辰巳午未申酉戌亥'.includes(ji)
      ? [{ side, pillar:key, label:LABELS[index], gan, ji }] : [];
  });
}
const branchRelations = (a,b) => getBranchPairRelations(a,b).filter(kind => kind !== '삼합' || a !== b).map(kind => kind === '삼합' ? '삼합 부분 관계' : kind);
const pair = (a,b,scope) => ({ id:`${scope}:${a.side}.${a.pillar}:${b.side}.${b.pillar}`, scope, from:a, to:b,
  stem:getStemPairRelation(a.gan,b.gan), branches:branchRelations(a.ji,b.ji) });
function triads(rows, scope) {
  return TRIADS.flatMap(group => {
    const members = rows.filter(row => group.includes(row.ji));
    return new Set(members.map(row => row.ji)).size === 3
      && (scope !== 'cross' || new Set(members.map(row => row.side)).size === 2)
      ? [{ scope, kind:'삼합 세 글자 충족', group, members, transformationConfirmed:false }] : [];
  });
}

/** Structured facts only. No score adjustment, birth calculation, or prediction. */
export function buildSajuRelationshipEvidence(self = {}, partner = {}) {
  const a = rows(self,'self'), b = rows(partner,'partner');
  const cross = a.flatMap(left => b.map(right => pair(left,right,'cross')));
  const natal = [a,b].flatMap(list => list.flatMap((left,i) => list.slice(i+1).map(right => pair(left,right,'natal'))));
  const da = a.find(row => row.pillar === 'day'), db = b.find(row => row.pillar === 'day');
  const ea = ELEMENTS[STEMS.indexOf(da?.gan)], eb = ELEMENTS[STEMS.indexOf(db?.gan)];
  const direction = ea === eb ? '같은 오행' : GENERATES[ea] === eb ? '본인이 상대를 생함' : GENERATES[eb] === ea ? '상대가 본인을 생함' : CONTROLS[ea] === eb ? '본인이 상대를 극함' : CONTROLS[eb] === ea ? '상대가 본인을 극함' : '';
  return { version:RELATIONSHIP_EVIDENCE_VERSION, cross, natal,
    dayStem: da && db ? { ...pair(da,db,'cross'), elements:[ea,eb], direction } : null,
    triads:[...triads(a,'selfNatal'),...triads(b,'partnerNatal'),...triads([...a,...b],'cross')],
    chapters:KEYS.map((key,index) => ({ key, label:LABELS[index], area:AREAS[index],
      available:a.some(row => row.pillar === key) && b.some(row => row.pillar === key),
      evidenceIds:cross.filter(item => item.from.pillar === key || item.to.pillar === key).map(item => item.id) })),
    limitations:[...(a.length < 4 || b.length < 4 ? ['출생시간 미상인 사람의 시주 작용은 제외합니다.'] : []),
      '기승전결은 생활 영역을 연결한 서사이며 사건 발생 순서나 시기 예언이 아닙니다.',
      '합은 자동 합화가 아니며 원진·귀문은 외도·정신질환·관계 결말의 판정 근거가 아닙니다.'] };
}
