import {STEM_EL, POSITIONS, POS_KO, relationOf, tenGod} from '../natal-core/tables.mjs';
import {gyeokgukView} from '../natal-core/index.mjs';
import {GOD_WORK, AXIS_MODES, AXIS_QUESTIONS, COMBINATION_WORK} from './depth-copy.mjs';

const positionText = positions => positions.map(p=>`${POS_KO[p]}주`).join('·');
const insight=(id,title,basis,scene,condition,action)=>({id,title,basis,scene,condition,action});

// 엔진의 결과를 읽는 편집 계층이다. 합으로 글자를 지우거나 오행을 재계산하지 않는다.
export function careerEvidence(core) {
 if(core?.status!=='ok')throw new Error('유효한 원국 분석이 필요합니다.');
 const day=core.dayMaster;
 const visible=POSITIONS.filter(p=>p!=='d'&&core.input.pillars[p]).map(pos=>{
  const stem=core.input.pillars[pos][0];
  return {pos,stem,god:tenGod(day.stem,stem),family:relationOf(day.el,STEM_EL[stem])};
 });
 const hidden=POSITIONS.flatMap(pos=>(core.hidden[pos]||[]).map(h=>({...h,pos,
  family:relationOf(day.el,h.el),exposedAt:visible.filter(v=>v.stem===h.stem).map(v=>v.pos)})));
 const month=core.monthStructure;
 const picked=month.chosen || core.hidden.m.at(-1);
 const selectedFamily=relationOf(day.el,STEM_EL[picked.stem]);
 const selectedGod=tenGod(day.stem,picked.stem);
 const roots=core.roots.day;
 const knownOnly=!core.input.hourKnown;
 const interactions=[];
 for(const r of core.relations.stems){
  const checks=[r.checks.competing?'같은 글자의 경합 있음':'',r.checks.clashed?'충하는 천간 있음':'',!r.adjacent?'떨어진 자리':''].filter(Boolean).join(' · ');
  interactions.push(insight(`stem-${r.positions.join('-')}`,`천간 ${r.pair}: ${r.state}`,
   `${positionText(r.positions)} · 엔진 판정 ${r.state}${checks?` · ${checks}`:''}`,
   r.state==='합화'?'기존 엔진의 합화 조건을 충족한 관계입니다. 이 기록만으로 직업 성향을 다른 오행으로 교체하지 않습니다.':r.state==='합거'?'기존 엔진이 합거로 분류한 관계입니다. 해당 글자나 역할이 사라졌다는 뜻으로 읽지 않고 다른 근거와 함께 남깁니다.':r.involvesDay?'나를 나타내는 일간이 합에 참여합니다. 타인의 기대와 내 기준을 함께 조정하는 장면을 관찰하는 참고로 삼습니다.':'두 기운이 연결되는 관계를 기록합니다. 실제 친화력이나 협업 성과를 보장하는 표시는 아닙니다.',
   r.checks.competing?'여러 요청이 겹칠 때 누구의 기준을 먼저 따를지 정하는 조건이 도움이 될 수 있습니다.':'합의한 목표와 개인의 책임을 구분하면 기대가 엉키는 것을 줄일 수 있습니다.',
   '공동 작업의 목표·담당·완료 기준을 각각 한 줄로 적고 상대와 확인하세요.'));
 }
 for(const r of core.relations.branches.liuhe)interactions.push(insight(`liuhe-${r.positions.join('-')}`,`지지 ${r.pair}: 육합`,
  `${positionText(r.positions)} · ${r.adjacent?'인접':'원격'} · ${r.state}`,
  '육합은 두 지지의 관계 기록입니다. 실제로 잘 맞는 동료가 정해져 있거나 갈등이 없다는 뜻은 아닙니다.',
  '관계가 편해도 일의 기준을 생략하지 않는 조건을 만들어 보세요.',
  '친한 사람과 일할 때도 기한과 검토자를 명시해 편안함과 완성도를 함께 지키세요.'));
 for(const kind of ['samhap','banghap'])for(const r of core.relations.branches[kind]){
  // 한 글자만으로 합국을 주장하지 않는다. 부분 상태는 별도 근거 목록에서 보존한다.
  if(r.state==='partial')continue;
  interactions.push(insight(`${kind}-${r.members}`,`${r.present}: ${kind==='samhap'?'삼합':'방합'} ${r.state==='full'?'구성 완비':'반합'}`,
   `구성 ${r.members} 중 ${r.present} 확인 · ${r.state}`,
   r.state==='full'?'엔진에서 필요한 구성 글자를 모두 확인했습니다. 구성의 완비와 합화 성립은 구분하며 오행이나 직업을 자동 전환하지 않습니다.':'삼합 구성 중 왕지를 포함한 두 글자가 확인된 반합입니다. 나머지 글자를 있다고 가정하거나 완성된 합국으로 읽지 않습니다.',
   '여러 과제가 같은 목표를 향하는지 확인하는 질문으로 활용하세요.',
   '이번 주 할 일 세 개가 어떤 한 결과에 연결되는지 표시하고 연결되지 않는 일은 재검토하세요.'));
 }
 for(const r of core.relations.branches.chung)interactions.push(insight(`chung-${r.a}-${r.b}`,`지지 ${r.chars}: 충`,
  `${positionText([r.a,r.b])} · ${r.adjacent?'인접':'원격'} · 해당 지장간의 뿌리 약화 기록 유지`,
  r.a==='m'||r.b==='m'?'월지가 포함된 충입니다. 환경의 요구와 다른 작업 방식이 동시에 필요할 때 어떤 조정이 도움이 되는지 살펴보세요. 이직·실패·가정 문제를 예고하지 않습니다.':'서로 다른 방향의 요구를 조정하는 질문으로 읽습니다. 충이 있다는 이유로 성격 결함이나 직업 불안을 판단하지 않습니다.',
  '서로 다른 요구를 한 번에 만족시키려 하기보다 시간과 역할을 나누는 조건을 시험하세요.',
  '충돌하는 요청 두 개를 적고 반드시 지킬 기준·조정할 기준·결정할 사람을 구분하세요.'));
 const stableFamilies=new Set(visible.map(v=>v.family));
 if(!month.hourSensitive)stableFamilies.add(selectedFamily);
 const combinations=COMBINATION_WORK.filter(c=>c.families.every(f=>stableFamilies.has(f))).map(c=>insight(c.id,c.title,
  `월령에서 취한 ${selectedGod}${month.hourSensitive?'(시주에 따라 달라져 조합 판정에서 제외)':''} · 드러난 십성 ${visible.map(v=>v.god).join('·')}`,c.scene,c.condition,c.action));
 const rootInsight=insight('roots','통근: 내 기준을 받치는 자리',
  roots.any?roots.list.map(r=>`${POS_KO[r.pos]}지 ${r.stem} ${r.layer}${r.weakenedBy.length?'(충으로 약화)':''}`).join(' · '):`알려진 지지에서 같은 오행의 뿌리 미확인${knownOnly?' · 시주 미상':''}`,
  roots.effective?'충을 받지 않은 정기·중기의 뿌리가 있습니다. 자신의 기준을 유지하는 장면을 관찰할 단서이며, 실제 끈기나 능력 점수는 아닙니다.':roots.weak?'여기이거나 충으로 약화된 뿌리만 확인됩니다. 뿌리가 사라진 것으로 처리하지 않으며, 지원 조건에 따른 차이를 살펴봅니다.':'알려진 자리에서 같은 오행의 뿌리를 확인하지 못했습니다. 독립성이나 재능이 없다는 뜻은 아니며 보이지 않은 정보와 실제 경험을 구분해야 합니다.',
  roots.effective?'기준을 유지하면서 수정 의견을 받아들일 시점을 함께 정하세요.':'참고 사례·질문할 사람·반복 가능한 절차를 갖추고 작업을 시작해 보세요.',
  '같은 종류의 과제를 혼자 한 번, 준비 자료를 갖춰 한 번 해보고 부담과 수정 횟수를 비교하세요.');
 return {visible,hidden,selectedFamily,selectedGod,month,picked,roots,knownOnly,interactions,combinations,rootInsight,
  structure:gyeokgukView(core),branches:core.relations.branches,
  scope:'기존 엔진의 지장간·투간·통근·천간합·육합·삼합·방합·지지충을 사용합니다. 형·파·해와 독립적인 천간충 해석은 이 엔진 출력에 없어 이번 리포트에서 별도 판정하지 않습니다. 업무 해석은 이 근거를 자기관찰 질문으로 옮긴 편집 콘텐츠입니다.'};
}

export function careerAxis(axis,evidence){
 const e=evidence;
 const visible=e.visible.filter(v=>axis.families.includes(v.family));
 const month=axis.families.includes(e.selectedFamily)&&!e.month.hourSensitive;
 const hidden=e.hidden.filter(h=>axis.families.includes(h.family));
 const special=e.structure.type==='특수격';
 const mode=e.month.hourSensitive||special?'open':month&&visible.length?'matched':month||visible.length?'mixed':hidden.length?'latent':'open';
 const [easy,support]=AXIS_MODES[axis.id][mode];
 const statuses={matched:'월령과 드러난 십성이 함께 제시하는 조건',mixed:'월령과 드러난 방식의 무게가 다른 혼합 조건',latent:'지장간에서만 확인되어 작은 경험으로 탐색할 조건',open:'우선순위를 확정하지 않고 비교할 조건'};
 return {...axis,mode,basis:`월령 ${e.selectedGod}${e.month.hourSensitive?'(판정 유동)':''} / 관련 천간 ${visible.map(v=>`${POS_KO[v.pos]} ${v.god}`).join('·')||'미확인'} / 지장간 ${[...new Set(hidden.map(h=>h.tenGod))].join('·')||'미확인'}`,
  reading:`${statuses[mode]}. ${AXIS_QUESTIONS[axis.id]}`,
  easy, support};
}

export function hiddenInsights(e){
 return POSITIONS.filter(p=>e.hidden.some(h=>h.pos===p)).map(pos=>{
  const rows=e.hidden.filter(h=>h.pos===pos);
  const representative=rows.find(h=>h.exposedAt.length&&h.layer==='정기')||rows.find(h=>h.exposedAt.length)||rows.at(-1);
  const work=GOD_WORK[representative.tenGod];
  return insight(`hidden-${pos}`,`${POS_KO[pos]}지 지장간: ${work.focus}`,
   rows.map(h=>`${h.stem} ${h.layer}·${h.tenGod}${h.exposedAt.length?` / ${positionText(h.exposedAt)} 투간`:' / 미투간'}${h.weakenedBy.length?' / 충으로 뿌리 약화':''}`).join(' | '),
   `${work.scene} 지장간은 지지 안의 기운을 구분한 것이며 숨겨진 능력을 입증하는 검사는 아닙니다.`,work.condition,work.action);
 });
}
