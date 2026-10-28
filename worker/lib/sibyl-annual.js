import { calculateLifeBookAiSaju, buildLuckNatalInteractions, tenGodFor } from './life-book-ai-saju.js';
import { nodeTerms, ganji, formatPillar } from '../../lib/korean-calendar/index.js';

export const SIBYL_ANALYSIS_VERSION = 'annual-v1';
export const kstYear = (now = new Date()) => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now));
export function validateSibylYear(value, now = new Date()) {
  const year = value == null ? kstYear(now) : Number(value);
  if (!Number.isInteger(year) || year < kstYear(now) || year > kstYear(now) + 9) throw new Error('SIBYL_INVALID_YEAR');
  return year;
}
const DOMAINS = [
  { id: 'money', title: '금전', gods: ['정재', '편재', '겁재'], pillars: ['month','hour'], signal: '수입 기대와 실제 지출 사이의 간격', action: '고정 지출과 확정 수입을 나누어 적고, 큰 지출은 조건을 다시 확인한 뒤 결정하세요.', sign: '예상 수입을 근거로 지출을 앞당기거나 손실을 만회하려고 거래를 늘리는지 확인하세요.', change: '현금 흐름과 계약 조건이 확인되고 생활비 여유가 확보되면 계획한 범위에서 진행하세요.' },
  { id: 'love', title: '연애', gods: ['정재','편재','정관','편관'], pillars: ['day'], signal: '관계의 속도와 기대 차이', action: '상대의 마음을 추측해 결론 내리기보다 원하는 연락과 만남의 간격을 직접 확인하세요.', sign: '답장이 늦다는 이유만으로 관계의 결론을 내리거나 감정 확인을 반복하는지 돌아보세요.', change: '서로의 의사가 분명하고 약속이 실제 행동으로 이어지면 관계의 속도를 함께 조정하세요.' },
  { id: 'relationships', title: '인간관계', gods: ['비견','겁재','상관'], pillars: ['year','day'], signal: '역할과 경계가 겹치는 상황', action: '도움을 주기 전에 가능한 범위와 기한을 말하고, 중요한 합의는 짧게 기록하세요.', sign: '거절하지 못한 부탁이나 확인하지 않은 말이 쌓이고 있는지 살펴보세요.', change: '역할과 책임이 합의되고 상대도 경계를 지키면 협력 범위를 넓혀도 좋습니다.' },
  { id: 'work', title: '직장·일', gods: ['정관','편관','상관','식신'], pillars: ['month','hour'], signal: '업무 요구와 실행 여력의 차이', action: '이번 주 우선순위와 완료 기준을 정하고, 일정이 겹치면 책임자와 범위를 먼저 조율하세요.', sign: '평가를 의식해 약속을 늘리거나 협업의 책임이 모호해지는지 점검하세요.', change: '일정과 책임이 명확하고 휴식 여력이 확보되면 중요한 과제를 단계적으로 실행하세요.' },
];
const TENSION = ['stemClashes','branchClashes','branchHarms','branchBreaks','branchPunishments'];
const SUPPORT = ['stemCombinations','branchCombinations','threeHarmony','directionalGroups'];
const flatten = (interactions, keys) => keys.flatMap(key => interactions?.[key] || []);
function evidenceFor(saju, pillar, id, label) {
  const interactions = buildLuckNatalInteractions(pillar, saju.pillarDetails, { includeGroups: true });
  return { id, label, pillar, tenGod: tenGodFor(saju.dayMaster, pillar[0]), tensions: flatten(interactions,TENSION), supports: flatten(interactions,SUPPORT) };
}
function relevance(e, domain) {
  // An ordinal review priority, never an event probability or diagnostic score.
  return e.tensions.reduce((sum, item) => sum + (item.pillars.some(p => domain.pillars.includes(p)) ? 2 : 1), 0)
    + (domain.gods.includes(e.tenGod) ? 1 : 0);
}
const dateLabel = t => `${t.year}-${String(t.month).padStart(2,'0')}-${String(t.day).padStart(2,'0')} ${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`;
const ELEMENT_TRAITS = {
  '목': ['새로운 방향을 찾아 시작하는 힘', '여러 일을 동시에 벌이면 마무리에 쓸 힘이 흩어질 수 있어요.', '새 일을 추가하기 전에 진행 중인 일 하나를 마무리하세요.'],
  '화': ['표현과 추진으로 분위기를 움직이는 힘', '반응을 빨리 얻으려 하면 말과 결정의 속도가 앞설 수 있어요.', '중요한 답변은 한 번 적고 시간을 두어 다시 읽으세요.'],
  '토': ['관계를 이어 주고 일을 안정시키는 힘', '책임을 혼자 떠안으면 필요한 변화도 늦출 수 있어요.', '지킬 책임과 나눌 책임을 구분하세요.'],
  '금': ['기준을 세우고 복잡한 일을 정리하는 힘', '기준이 경직되면 관계의 사정이나 새로운 가능성을 놓칠 수 있어요.', '판단하기 전에 예외가 필요한 사정을 하나 확인하세요.'],
  '수': ['상황을 읽고 정보를 연결하는 힘', '생각이 길어지면 시작 시점을 놓치거나 걱정이 커질 수 있어요.', '더 알아볼 일과 지금 할 수 있는 작은 행동을 나누세요.'],
};
export function buildSibylAnnual(birth, year) {
  if (!birth?.date) throw new Error('SIBYL_INVALID_BIRTH_INPUT');
  const saju = calculateLifeBookAiSaju({ birthDate: birth.date, birthTime: birth.time, birthTimeUnknown: !birth.timeKnown, calendarType: 'solar', gender: birth.gender }, { year });
  const terms = [...(nodeTerms(year) || []), ...(nodeTerms(year + 1) || []).slice(0,2)];
  const start = terms.findIndex(t => t.index === 2); // 입춘부터 다음 입춘 직전까지: civil January is not a fabricated year boundary.
  if (start < 0 || terms.length < start + 13) throw new Error('SIBYL_CALENDAR_UNAVAILABLE');
  const annual = evidenceFor(saju,saju.yearlyLuck[0].pillar,'annual',`${year}년 세운`);
  const cycle = saju.majorLuck?.currentCycle;
  const major = cycle?.pillar ? evidenceFor(saju,cycle.pillar,'major','대운') : null;
  const months = terms.slice(start,start+12).map((term,index) => {
    const monthGanji=ganji(term).month;
    const pillar = formatPillar(monthGanji.stemIndex,monthGanji.branchIndex,'hanja');
    return { ...evidenceFor(saju,pillar,`month-${index+1}`,`${term.month}월 절입 구간`), start:dateLabel(term), end:dateLabel(terms[start+index+1]), month:term.month };
  });
  const domains = DOMAINS.map(domain => {
    const ranked = months.map(m => ({ ...m, priority:relevance(m,domain) + relevance(annual,domain) + (major ? relevance(major,domain) : 0) })).sort((a,b) => b.priority-a.priority || a.start.localeCompare(b.start));
    const peak = ranked[0].priority;
    const periods = ranked.filter(m => m.priority === peak).map(m => ({ id:m.id, label:m.label, start:m.start, end:m.end }));
    const sources = [annual,...(major ? [major] : []),...months.filter(m => periods.some(p => p.id===m.id))];
    const reasons = sources.map(e => ({ id:e.id, text:`${e.label} ${e.pillar} · ${e.tenGod}${e.tensions.length ? ' · '+e.tensions.map(t => t.label+' ('+t.pillarLabels.join('·')+')').join(', ') : ' · 뚜렷한 충형파해 신호 없음'}`, supports:e.supports.map(t => t.label) }));
    return { ...domain, priority:peak, periods, reasons, caution:peak ? domain.signal : '특정 시기의 강한 주의 신호가 두드러지지 않아요.', balancedNote:sources.some(e => e.supports.length) ? '합과 충의 신호가 함께 있어요. 협력 가능성과 조율 부담을 함께 살펴보세요.' : '주의 신호가 실제 사건을 뜻하지는 않아요. 현재 상황과 대조하세요.' };
  });
  const strongest = Object.entries(saju.fiveElements).sort((a,b) => b[1]-a[1]);
  const traits = strongest.filter(([,v]) => v===strongest[0][1]).map(([element,count]) => ({ element, count, strength:ELEMENT_TRAITS[element][0], caution:ELEMENT_TRAITS[element][1], action:ELEMENT_TRAITS[element][2] }));
  const maxPriority = Math.max(...domains.map(d=>d.priority));
  return { version:SIBYL_ANALYSIS_VERSION, year, title:`${year} 시빌라 연간 대비 리포트`, period:`${months[0].start} ~ ${months[11].end} KST`,
    limitation:'전통 명리 해석을 생활의 점검 기준으로 활용하세요. 주의 우선순위는 사건 발생 확률이나 손실률이 아닙니다.',
    uncertainty:[saju.calculationMeta.uncertainty, !major ? (saju.majorLuck?.reason || '선택 연도에 대응하는 대운 정보가 없습니다.') : ''].filter(Boolean),
    pillars:Object.values(saju.pillarDetails).filter(p=>p?.pillar).map(p=>({label:p.label,pillar:p.pillar})),
    natal:{elements:saju.fiveElements,tenGods:saju.tenGods,interactions:saju.natalInteractions,traits},
    annual, major, months, domains, priorityDomains:domains.filter(d=>d.priority===maxPriority).map(d=>d.id),
    summary:maxPriority ? domains.filter(d=>d.priority===maxPriority).map(d=>d.title).join('·')+'의 조건을 먼저 점검하세요. 실제 일정과 관계의 신호를 함께 확인하면 대비의 순서를 정하기 쉬워져요.' : '특정 분야에 강한 주의 신호가 집중되지 않습니다. 일상의 점검 루틴을 유지하세요.',
  };
}
export function sibylPreview(analysis) {
  const first=analysis.domains.find(d=>analysis.priorityDomains.includes(d.id));
  return { version:analysis.version,year:analysis.year,title:analysis.title,period:analysis.period,summary:analysis.summary,limitation:analysis.limitation,uncertainty:analysis.uncertainty,pillars:analysis.pillars,traits:analysis.natal.traits,action:first.action };
}
