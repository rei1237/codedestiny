// 공개 브라우저에 실어도 되는 읽기 깊이 조각. scripts/build-saju-reading-depth.mjs 가 이 파일만 묶어 js/core/saju/reading-depth.generated.js 를 만든다.
// 일주·월령 문장(dayReading·monthReading·contextualReading·표)은 묶음 전용 해석이라 lib/saju/reading-depth.mjs(서버 전용)에만 있다.
// 여기에는 월령 제목(번호·간지 이름뿐), 격국·뿌리 수치, 대운 행동 문장(cycleActions)만 둔다.
import { buildGyeokgukAnalysis } from '../../worker/lib/saju-gyeokguk.js';
import { ZHI_HIDE_GAN, SHI_SHEN, WU_XING_GAN } from './myeongri-tables.js';

export const STEM_ORDER = [...'甲乙丙丁戊己庚辛壬癸'];
export const MONTH_ORDER = [...'寅卯辰巳午未申酉戌亥子丑'];
const GOD_KO = { 比肩:'비견', 劫财:'겁재', 食神:'식신', 伤官:'상관', 偏财:'편재', 正财:'정재', 七杀:'편관', 正官:'정관', 偏印:'편인', 正印:'정인' };
const POS = {y:'year',m:'month',d:'day',h:'hour'};
const POS_KO = {y:'년주',m:'월주',d:'일주',h:'시주'};
// 월령 제목 "인월(寅月)의 갑목" 에 쓰는 이름뿐이다. 계절·질문 문장은 서버 전용 모듈에 있다.
const STEM_NAME = { 甲:'갑목', 乙:'을목', 丙:'병화', 丁:'정화', 戊:'무토', 己:'기토', 庚:'경금', 辛:'신금', 壬:'임수', 癸:'계수' };
const MONTH_NAME = { 寅:'인', 卯:'묘', 辰:'진', 巳:'사', 午:'오', 未:'미', 申:'신', 酉:'유', 戌:'술', 亥:'해', 子:'자', 丑:'축' };

export function monthTitle(stem, month) {
  return STEM_NAME[stem] && MONTH_NAME[month] ? `${MONTH_NAME[month]}월(${month}月)의 ${STEM_NAME[stem]}` : null;
}

// monthOf(stem, month) 가 월령 값을 만든다: 공개판은 {title} 뿐이고, 서버 전용 모듈은 문장이 든 전체 읽기를 넣는다.
export function depthFactsWith(facts, monthOf) {
  const p=facts?.p;
  if (!p?.d?.g || !p?.m?.j) return null;
  const keys=Object.keys(POS).filter(k => p[k]?.g && p[k]?.j && !(k==='h' && facts.unknown));
  const pillarRows=keys.map(k=>({position:POS[k],stem:p[k].g,branch:p[k].j}));
  const hiddenStems=pillarRows.flatMap(row=>(ZHI_HIDE_GAN[row.branch]||[]).map((hiddenStem,i)=>({position:row.position,branch:row.branch,hiddenStem,layer:['정기','중기','여기'][i],tenGodFromDayMaster:GOD_KO[SHI_SHEN[p.d.g+hiddenStem]]})));
  const hiddenStemExposures=hiddenStems.map(row=>({...row,exposedInNatalHeavenlyStem:pillarRows.some(pillar=>pillar.stem===row.hiddenStem)}));
  const gyeokguk=facts.gyeokguk || buildGyeokgukAnalysis({pillarRows,dayStem:p.d.g,hiddenStems,hiddenStemExposures,power:facts.power,jong:facts.jong});
  const roots=keys.filter(k=>(ZHI_HIDE_GAN[p[k].j]||[]).some(s=>WU_XING_GAN[s]===WU_XING_GAN[p.d.g])).map(k=>`${POS_KO[k]} ${p[k].j}`);
  return { month:monthOf(p.d.g,p.m.j),gyeokguk,roots,unknown:!!facts.unknown };
}

export function buildDepthFacts(facts) {
  return depthFactsWith(facts, (stem, month) => { const title = monthTitle(stem, month); return title ? { title } : null; });
}

export function cycleActions(input, persona) {
  if(!input?.stem || !input?.branch)return [];
  const weak=input.power?.isStrong===false && !input.jong?.isJong;
  const burden=input.stem.balance==='bad'||input.branch.balance==='bad';
  const god=input.stem.god||'';
  const action=/재/.test(god)?'작은 수익·업무 기회 하나를 골라 필요한 시간과 유지 비용을 적고 시험해 보세요.':/관/.test(god)?'맡을 역할의 책임·권한·지원 인력을 문서로 정리하고 작은 범위에서 먼저 합의해 보세요.':/인/.test(god)?'현재 필요한 기술 하나를 정해 배우고, 배운 내용을 실제 과제 하나에 적용해 보세요.':/식신|상관/.test(god)?'보여 줄 결과물 하나와 완성 날짜를 정하고, 작은 규모로 공개해 사용자의 반응을 받아 보세요.':'혼자 결정할 일과 함께 결정할 일을 나누고, 협업의 역할·비용·성과 배분을 먼저 합의해 보세요.';
  const month=input.depth?.month?.title || (input.month?`${input.month}월의 원국`:'원국');
  const geok=input.depth?.gyeokguk?.finalGyeokguk;
  if(persona==='neo'){
    const neoAction=/재/.test(god)?'작은 수익·업무 기회 하나를 골라서 필요한 시간과 유지 비용을 적고 시험해 봐.':/관/.test(god)?'맡을 역할의 책임·권한·지원 인력을 문서로 정리하고, 작은 범위에서 먼저 합의해 봐.':/인/.test(god)?'지금 필요한 기술 하나를 정해서 배우고, 배운 걸 실제 과제 하나에 적용해 봐.':/식신|상관/.test(god)?'보여 줄 결과물 하나와 완성 날짜를 정하고, 작은 규모로 공개해서 반응을 받아 봐.':'혼자 결정할 일과 함께 결정할 일을 나누고, 협업의 역할·비용·성과 배분부터 합의해 봐.';
    return [
      {title:'이번 대운에서 먼저 해 볼 일',text:`${input.stem.char}${input.branch.char} 대운의 ${input.stem.god}·${input.branch.god}을 ${month}${geok?`, ${geok}의 역할`:''}과 함께 읽어 볼게. ${neoAction} ${weak?'지금은 지원부터 확보하고, 기존 일을 줄인 만큼만 새 일을 넣는 순서가 좋아.':burden?'기회가 보여도 이미 부담이 되는 조건까지 같이 늘리지 않도록 범위를 정해 둬.':'기존 기반을 지킬 수 있는 범위에서 새 시도를 하나씩 더해 봐.'}`},
      {title:'시작할 조건, 그리고 신중히 고를 선택',text:`${weak?'도움받을 사람·쓸 시간·배울 범위가 정해졌는지 먼저 확인해 봐. 혼자 모든 역할을 떠안는 확대는 신중하게 해.':burden?'같은 기운이 더해지면 부담이 커질 수도 있어. 일정과 비용의 상한을 정하고, 기존 약속을 지키기 어려워지면 규모를 줄여.':'작은 시도가 실제로 이어지는지 확인한 뒤에 다음 단계를 정해. 대운 점수만 보고 직장·관계·투자를 한꺼번에 바꾸지는 마.'} 한 달 뒤에는 완성한 결과, 쓴 시간, 관계에서 반복된 갈등을 비교해서 유지할 것과 조절할 것을 정해 봐.`},
    ];
  }
  return [
    {title:'이번 대운에서 먼저 해볼 일',text:`${input.stem.char}${input.branch.char} 대운의 ${input.stem.god}·${input.branch.god}을 ${month}${geok?`, ${geok}의 역할`:''}과 함께 읽어요. ${action} ${weak?'현재는 지원을 먼저 확보하고 기존 일을 줄인 만큼 새 일을 넣는 순서가 좋아요.':burden?'기회가 보여도 이미 부담이 되는 조건을 함께 늘리지 않도록 범위를 제한해요.':'기존 기반을 유지할 수 있는 범위에서 새 시도를 하나씩 더해요.'}`},
    {title:'시작할 조건과 신중히 할 선택',text:`${weak?'도움을 받을 사람·사용할 시간·학습 범위가 정해졌는지 먼저 확인하세요. 혼자 모든 역할을 떠안는 확대는 신중히 해요.':burden?'같은 기운이 더해질 때 부담이 커질 수 있어요. 일정과 비용의 상한을 정하고, 기존 약속을 지키기 어려워지면 규모를 줄여요.':'작은 시도가 실제로 지속되는지 확인한 뒤 다음 단계를 정해요. 대운 점수만 보고 직장·관계·투자를 한 번에 바꾸지 않아요.'} 한 달 뒤에는 완성한 결과, 소모한 시간, 관계에서 반복된 갈등을 비교해 유지할 것과 조절할 것을 정해 보세요.`},
  ];
}
