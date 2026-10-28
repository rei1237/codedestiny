import { calculateNatalSaju } from '../../korean-calendar/index.js';
import { analyzeNatalCore } from '../natal-core/index.mjs';
import { STEM_EL, EL_KO, mainHidden, relationOf, tenGod } from '../natal-core/tables.mjs';
import { DAY_COPY, MONTH_COPY, RELATION_COPY, AXES, DISCLAIMER } from './copy.mjs';
import {careerEvidence,careerAxis,hiddenInsights} from './evidence.mjs';
import {GOD_WORK} from './depth-copy.mjs';
import {careerStory} from './story.mjs';

export const CAREER_URL = 'https://code-destiny.com/saju/career-style/';

// Input is the existing selectedBirthProfileSeed, never a global/guest profile cache.
export function careerNatalInput(seed) {
  const hasLocation = Boolean(seed.timezone || seed.longitude || seed.latitude || seed.region);
  if (hasLocation && (!seed.timezone || seed.longitude === '' || seed.longitude == null)) {
    throw new Error('저장된 출생지의 시간대·경도가 부족해요. 프로필 카드에서 출생지를 확인해 주세요.');
  }
  return {
    birthDate: seed.birthDate,
    birthTime: seed.birthTime || undefined,
    birthTimeUnknown: seed.birthTimeUnknown === true || !seed.birthTime,
    calendarType: seed.isLeapMonth ? 'lunar_leap' : (seed.calendarType || 'solar'),
    ...(hasLocation ? {birthPlace: {name:seed.region || seed.city || '저장된 출생지', timezone:seed.timezone,
      longitude:Number(seed.longitude), ...(seed.latitude !== '' && seed.latitude != null ? {latitude:Number(seed.latitude)} : {})}} : {}),
  };
}

export function analyzeCareerInput(input) {
  const natal = calculateNatalSaju(input);
  const pillars = Object.fromEntries([['y','year'],['m','month'],['d','day'],['h','hour']].map(([key,name]) =>
    [key, natal.pillars[name] ? {g:natal.pillars[name][0],j:natal.pillars[name][1]} : null]));
  const core = analyzeNatalCore(pillars);
  if (core.status !== 'ok') throw new Error('명식을 계산하지 못했어요. 프로필의 출생정보를 확인해 주세요.');
  return {natal, pillars, core};
}

export function buildCareerReport(input) {
  const analysis = analyzeCareerInput(input);
  const {natal,pillars:p,core} = analysis;
  const evidence=careerEvidence(core);
  const day = DAY_COPY[p.d.g], month = MONTH_COPY[p.m.j];
  const monthStem = mainHidden(p.m.j);
  const monthFamily = relationOf(core.dayMaster.el, STEM_EL[monthStem]);
  const monthGod = tenGod(p.d.g, monthStem);
  const rel = RELATION_COPY[monthFamily];
  const exposed = [p.y,p.m,p.h].filter(Boolean).map(v=>({stem:v.g,god:tenGod(p.d.g,v.g),family:relationOf(core.dayMaster.el,STEM_EL[v.g])}));
  const families = [...new Set(exposed.map(v=>v.family))];
  const basis = `일간 ${p.d.g}(${EL_KO[core.dayMaster.el]}) · 월지 ${p.m.j} · 월지 본기 ${monthStem}의 ${monthGod}`;
  const strength = core.special.decision==='special'
    ? `최종 격국은 ${core.gyeokguk.name}입니다. 기존 엔진이 특수격을 채택해 일반적인 억부 조언을 그대로 적용하지 않습니다. 격국은 우열이나 직업을 지정하지 않으며, 이 리포트에서는 역할과 지원 조건을 실제 경험으로 확인하는 수준으로 해석합니다.`
    : core.strength.complete
    ? `기존 엔진은 일간을 돕는 힘과 소모·제어하는 힘을 비교해 ${core.strength.isStrong ? '신강' : '신약'}으로 분류합니다. 이는 능력이나 의지의 높낮이가 아닙니다. ${core.strength.isStrong ? '스스로 밀고 가는 방식과 외부 의견을 반영하는 시점을 함께 관찰해 보세요.' : '준비 자료와 지원을 갖췄을 때 실행 경험이 어떻게 달라지는지 관찰해 보세요.'}`
    : '출생 시각이 없어 신강약을 완성된 판단으로 사용하지 않습니다. 혼자 추진할 때와 도움을 받으며 진행할 때의 차이는 실제 경험으로 비교해 보세요.';
  const climateNames={cold:'한랭',cool:'서늘',warm:'온열',hot:'더움',neutral:'중립',dry:'건조',wet:'습윤',balanced:'균형',insufficient:'판단 보류'};
  const climate=`조후는 계절의 온도·습도 균형을 읽는 전통적 관점입니다. 기존 분석은 한난 ${climateNames[core.climate.hanNan.type] || '판단 보류'}, 조습 ${climateNames[core.climate.joSeup.type] || '판단 보류'}로 나타납니다. 이를 실제 체질이나 근무 공간의 온도 처방으로 바꾸지 않습니다. 일정의 밀도와 휴식 간격을 바꿨을 때 체감이 달라지는지 기록하는 참고로만 사용하세요.`;
  const axes = AXES.map(axis=>careerAxis(axis,evidence));
  const secondFamily=families.find(f=>f!==monthFamily) || (monthFamily==='parent'?'output':'parent');
  const second=RELATION_COPY[secondFamily];
  const roles=[
    {title:day[4],reason:`일간 ${p.d.g}의 ${day[1]} 상징을 실제 과제로 확인하는 역할군입니다.`,skill:'문제 정의, 초안 작성, 결과 설명',activity:'관심 있는 문제 하나를 한 장 제안서로 만들고 다른 사람에게 설명해 보세요.'},
    {title:rel.role,reason:`월지 본기의 ${monthGod}를 ${rel.meaning}의 관점으로 읽어 선택했습니다.`,skill:rel.skill,activity:rel.experiment},
    {title:second.role,reason:families.includes(secondFamily)?`드러난 십성의 ${second.name} 단서를 바탕으로 비교할 역할군입니다.`:'한 가지 해석에 갇히지 않도록 비교하는 학습 과제입니다. 이 역할의 우세를 명식에서 확정하지 않습니다.',skill:second.skill,activity:second.experiment},
  ];
  /** @type {{title:string, paragraphs:string[], axes?:typeof axes, roles?:typeof roles, insights?:ReturnType<typeof detail>[], analysisNote?:string}[]} */
  const sections=[
    {title:'한눈에 보는 나', paragraphs:[
      `${basis}를 함께 읽으면 ‘${day[0]}’이라는 탐색 주제를 얻을 수 있습니다. ${day[1]} 방식이 나에게 익숙한지 돌아보세요. 유형은 성격을 고정하는 이름이 아니라 경험과 대조할 가설입니다.`,
      `주요 강점의 후보는 ${day[1]} 힘과 ${rel.meaning}입니다. ${day[2]}가 있는 환경에서 이 힘을 시험해 볼 수 있습니다. 지금까지 즐겁게 끝낸 과제 하나를 떠올리고, 결과보다 그때 도움이 된 조건을 적어 보세요.`,
    ]},
    {title:'나의 성향과 작업 방식',paragraphs:[
      `일간 ${p.d.g}는 나를 나타내는 기준이며 ${EL_KO[core.dayMaster.el]} 오행으로 읽습니다. ${day[1]} 상징은 시작할 때 무엇을 먼저 보는지 살펴보는 단서입니다. 이것만으로 실행력이나 학업 능력을 판단하지 않습니다. 시작을 잘해도 마무리는 일정과 지원에 따라 달라질 수 있습니다.`,
      `천간에 드러난 관계는 ${exposed.map(v=>`${v.stem} ${v.god}`).join(', ')}입니다. 십성은 일간과 다른 기운의 관계를 말합니다. ${families.map(f=>RELATION_COPY[f].meaning).join(', ')}이라는 여러 관점이 함께 있으므로 한 가지 성향으로 환원하지 않습니다. 배울 때 자료를 읽는 시간, 설명하는 시간, 직접 만드는 시간을 나눠 어떤 순서가 편했는지 비교해 보세요.`,
      strength,
    ]},
    {title:'월지로 읽는 환경',paragraphs:[
      `월지 ${p.m.j}는 절기로 구분한 ${month[0]}의 상징입니다. 전통 명리에서는 이를 ${month[1]}와 연결해 읽을 수 있습니다. 실제 성장환경·가정형편·직장 경험을 알아낸 뜻은 아닙니다. 이런 요구를 받을 때 편안했는지, 부담이 컸는지를 경험과 대조해야 합니다.`,
      `월지의 중심 기운 ${monthStem}는 일간과 ${monthGod} 관계이며, 여기서는 ${rel.meaning}로 풀었습니다. ${rel.scene} 모습을 떠올려 볼 수 있습니다. ${rel.help} 다음 과제에서는 ${month[2]} 방법을 하나 적용해 보세요.`,
      climate,
    ]},
    {title:'성향과 환경의 조합',paragraphs:[
      `${day[0]}이라는 개인의 방식과 ${rel.meaning}라는 환경 주제가 만납니다. 자신의 선호와 외부 요구가 같을 때는 자연스럽게 힘을 쓰기 쉽지만, 다를 때는 속도나 설명 방식의 조정이 필요할 수 있습니다. 의견이 다른 장면을 성격 문제로 끝내기보다 목표·기한·권한 중 무엇이 달랐는지 나눠 보세요.`,
      `예를 들어 자신이 충분히 준비하고 싶어도 팀은 빠른 초안을 원할 수 있고, 먼저 실행하고 싶어도 검토 절차가 필요할 수 있습니다. ${day[2]}를 요청하되 팀의 완료 기준도 한 문장으로 확인해 보세요. 이번 주에는 익숙한 방식 한 번, 상대가 요청한 방식 한 번을 비교하고 소요 시간과 만족감을 따로 기록하세요.`,
    ]},
    {title:'현대 업무 환경과의 접점',paragraphs:[
      '아래 여섯 축은 사람의 우열이나 취업 가능성을 매기는 점수가 아닙니다. 월지 본기의 관계와 드러난 십성을 비교한 탐색 질문입니다. 단서가 엇갈리면 혼합형으로 남기며, 같은 직무도 조직·담당 업무·상사에 따라 경험이 달라집니다.',
    ],axes},
    {title:'탐색해 볼 진로·역할',paragraphs:[
      '다음 세 역할군은 진로를 결정하는 답이 아니라 경험을 고르는 출발점입니다. 직업명보다 실제 하루의 과제와 함께 일하는 방식을 확인하세요. 필요한 역량은 학습과 연습으로 키울 수 있으며, 현재의 전공이나 경력이 이 탐색을 제한하지 않습니다.',
    ],roles},
    {title:'강점의 그림자와 보완',paragraphs:[
      `${day[1]} 힘도 과하면 ${day[3]} 수 있습니다. 강점이 과해져 오히려 필요한 기능을 쓰지 못하는 순간은 없는지 살펴보세요. 한 번의 실수로 성향을 확정하지 말고 같은 장면이 반복되는지 확인하는 편이 좋습니다.`,
      `${rel.meaning}에 집중할수록 다른 조건을 놓칠 수도 있습니다. ${rel.help} 업무를 시작하기 전에 ‘내가 맡을 일·도움받을 일·이번에는 하지 않을 일’을 나누고, 끝낼 기준을 하나만 먼저 정해 보세요. 오행이 적게 보인다는 이유로 해당 능력이 없다고 해석하지 않습니다. 지원 도구와 연습의 효과를 실제 결과로 확인하세요.`,
    ]},
    {title:'작은 진로 실험',paragraphs:[
      `첫째, 이틀 동안 최근 즐거웠던 과제와 지쳤던 과제를 하나씩 기록하세요. ${day[2]}가 있었는지, 일 자체와 주변 조건 중 무엇이 영향을 줬는지 구분합니다.`,
      `둘째, 다음 사흘 동안 ${rel.experiment} 완성도를 높이는 데만 매달리기보다 시작·학습·표현·실행·마무리 중 에너지가 달라진 지점을 표시하세요.`,
      '셋째, 남은 이틀에는 결과물을 신뢰하는 사람 한 명에게 보여 주세요. 잘한 점 하나와 바꿀 점 하나를 듣고 작게 수정합니다. 공유나 후기 작성은 서비스 이용 조건이 아니며, 이 실험의 기록도 제출하지 않아도 됩니다.',
      '기록 질문: 어떤 조건에서 시작이 쉬웠나요? 혼자 할 때와 함께 할 때 무엇이 달랐나요? 피드백 뒤 다시 해보고 싶었나요? 다음에는 한 가지 조건만 바꾼다면 무엇일까요? 연이는 이 리포트가 정답을 대신하기보다 나를 관찰하는 따뜻한 출발점이 되길 바랍니다. 내 길을 정하는 근거는 앞으로 쌓아 갈 경험에도 있습니다.',
    ]},
  ];
  const limitations=[...core.limitations];
  const detail=(id,title,basis,scene,condition,action)=>({id,title,basis,scene,condition,action});
  if(evidence.knownOnly)sections[4].paragraphs.push('시주가 없어 아래 조건을 전체 명식의 결론으로 고정하지 않습니다.');
  if(core.special.decision==='special')sections[4].paragraphs.push('특수격이 채택되어 일반적인 관계의 우선순위는 적용하지 않고 여섯 조건을 비교 질문으로 남깁니다.');
  const monthWork=GOD_WORK[evidence.selectedGod];
  const joins=evidence.interactions.filter(r=>!r.id.startsWith('chung-'));
  const clashes=evidence.interactions.filter(r=>r.id.startsWith('chung-'));
  const overview=joins.length&&clashes.length?'연결과 조정이 함께 필요한 구조':clashes.length?'서로 다른 요구를 조정하며 읽는 구조':joins.length?'연결된 역할의 경계를 살펴보는 구조':'월령과 지장간의 쓰임을 중심으로 읽는 구조';
  sections[0].insights=[detail('overview',overview,
   `${evidence.structure.name} · ${evidence.knownOnly?'시주 미상':'시주 확인'} · ${evidence.structure.confident?'현재 규칙에서 구조 확인':'구조의 확정도 제한'}`,
   `${day[0]}은 일간의 출발점입니다. 여기에 월령에서 취한 ${evidence.selectedGod}의 ‘${monthWork.focus}’와 합충의 조건을 함께 읽습니다. 같은 일간도 준비·표현·역할 조정 방식은 달라질 수 있습니다.`,
   `${monthWork.condition} ${evidence.knownOnly?'아직 알려지지 않은 시주에 따라 달라질 수 있는 결론은 열어 둡니다.':''}`,
   '아래에서 공감하는 장면 한 가지와 맞지 않는 장면 한 가지를 골라 최근 경험을 함께 적어 보세요.')];
  sections[1].insights=[...evidence.visible.filter((v,i,rows)=>rows.findIndex(r=>r.god===v.god)===i).map(v=>{const w=GOD_WORK[v.god];return detail(`visible-${v.god}`,`${v.god}: ${w.focus}`,`${evidence.visible.filter(r=>r.god===v.god).map(r=>`${{y:'년',m:'월',h:'시'}[r.pos]}간 ${r.stem}`).join('·')} ${v.god} · 일간과 드러난 천간의 관계`,w.scene,w.condition,w.action);}),...hiddenInsights(evidence)];
  sections[2].insights=[detail('month-structure','월지의 본기와 실제로 취한 기운',
   `월지 본기 ${monthStem} ${monthGod} / 구조에서 취한 ${evidence.picked.stem} ${evidence.picked.layer} ${evidence.selectedGod}`,
   evidence.structure.reason,
   `${monthWork.scene} ${monthWork.condition}`,
   monthWork.action)];
  const partial=[...evidence.branches.samhap,...evidence.branches.banghap].filter(r=>r.state==='partial');
  sections[3].insights=[...evidence.combinations,...evidence.interactions];
  if(!sections[3].insights.length)sections[3].insights.push(detail('no-combination','합충 유무보다 과제의 조건부터',
   `알려진 자리에서 채택한 합·반합·충 관계 없음${evidence.knownOnly?' · 시주 미상':''}`,
   '합충이 기록되지 않았다고 평온한 직장이나 갈등 없는 성격을 뜻하지 않습니다. 월령의 요구와 실제 작업 습관을 대조하는 것이 먼저입니다.',
   `${day[2]}를 확보했을 때 시작과 마무리가 어떻게 달라지는지 확인하세요.`,
   '최근 과제의 목표·실행 방법·평가 기준을 나눠 가장 불편했던 조건 하나를 바꿔 보세요.'));
  sections[3].analysisNote=`${evidence.scope}${partial.length?` 미완성 구성(${partial.map(r=>`${r.present}/${r.members}`).join(', ')})은 합국으로 채택하지 않았습니다.`:''}`;
  if(joins.length&&clashes.length)sections[3].insights.unshift(detail('coexist','합과 충을 서로 지우지 않고 읽기',
   `연결 관계 ${joins.map(r=>r.title).join(' · ')} / 조정 관계 ${clashes.map(r=>r.title).join(' · ')}`,
   '연결되는 관계와 부딪히는 관계가 함께 확인됩니다. 합이 충을 없앴다거나 충이 모든 협력을 깨뜨렸다고 단순화하지 않습니다.',
   '함께 지킬 목표와 서로 다른 실행 방식을 분리해 합의하는 조건을 시험하세요.',
   '같은 목표를 확인한 뒤 방법은 나누어 실행하고 중간 점검에서 결과만 비교하세요.'));
  sections[4].insights=[detail('axis-guide','여섯 축을 내 경험으로 좁히는 법',
   `월령의 선택·천간의 표현·지장간의 단서를 구분${evidence.month.hourSensitive?' · 월령 선택은 시주에 따라 유동':''}`,
   '월령과 천간이 함께 가리키는 조건, 서로 무게가 다른 혼합 조건, 지장간에서만 드러난 탐색 조건을 구분했습니다. 지장간에 있다는 이유로 숨은 재능이 있다고 보장하지 않습니다.',
   '서로 다른 축은 우열로 비교하지 마세요. 자율적으로 일하면서도 명확한 완료 기준을 필요로 할 수 있습니다.',
   '두 축만 골라 같은 과제에서 한 번에 한 조건씩 바꾸고, 걸린 시간·수정 횟수·피로를 기록하세요.')];
  sections[5].insights=roles.map((role,index)=>detail(`role-check-${index}`,`${role.title}을 확인할 질문`,role.reason,
   `직무 이름보다 ‘${role.skill}’을 실제로 얼마나 사용하는지 확인해야 합니다. 같은 직무에서도 조사·제작·조율의 비중은 다릅니다.`,
   `직무 공고나 담당자의 설명에서 하루의 결과물, 결정 권한, 피드백 주기를 확인하세요. ${index===0?day[2]:index===1?rel.help:second.help}`,
   `${role.activity} 해낸 결과와 다시 해보고 싶은 마음을 따로 기록해 적성과 익숙함을 구분하세요.`));
  sections[6].insights=[evidence.rootInsight];
  if(core.yongshin.conflicts.length)sections[6].insights.push(detail('conflicting-basis','억부와 조후의 방향이 엇갈릴 때',
   core.yongshin.conflicts.map(c=>c.note).join(' · '),
   '일간을 돕고 조절하는 기준과 계절의 균형을 읽는 기준이 같은 방향은 아닙니다. 이를 평균 내어 하나의 좋은 오행이나 직업으로 결론내리지 않습니다.',
   '역할 부담과 작업 속도를 별도로 기록하면 서로 다른 조건을 구분하기 쉽습니다.',
   '업무량을 줄이는 실험과 휴식 간격을 바꾸는 실험을 동시에 하지 말고 각각 비교하세요.'));
  if(evidence.knownOnly||core.special.decision==='pending')sections[6].insights.push(detail('uncertainty','지금 확정하지 않는 해석',
   core.limitations.join(' · '),
   '확정하지 못한 격국이나 시주의 기운을 채워 넣어 문장을 풍부하게 만들지 않습니다. 알려진 관계에 기반한 질문만 현재 결과에 사용합니다.',
   '맞지 않는 해석을 자신에게 억지로 적용하지 말고 실제 경험의 반례도 남기세요.',
   '출생 시각을 확인할 수 있을 때만 프로필을 수정하고 결과의 달라진 근거를 비교하세요.'));
  sections[7].insights=[detail('experiment-design','일주일 뒤 남길 나만의 판단 기준',
   `월령 ${evidence.selectedGod}의 작업 가설 · ${evidence.rootInsight.title}`,
   `${monthWork.action} 처음부터 잘했는지보다 조건을 바꿨을 때 시작과 수정이 쉬워졌는지 보는 실험입니다.`,
   '가설과 맞지 않는 결과도 유용합니다. 흥미가 낮았던 이유가 과제 자체인지 시간 부족이나 낯선 도구 때문인지 나눠 보세요.',
   '마지막 날 ‘계속할 역할 1개 / 필요한 지원 1개 / 다음에 바꿀 조건 1개’를 적으세요. 기록은 제출하거나 공개할 필요가 없습니다.')];
  if(!input.birthPlace)limitations.unshift('출생지 정보가 없어 기존 엔진 기본값인 서울·Asia/Seoul을 적용했습니다.');
  else if(input.birthPlace.name==='저장된 출생지')limitations.unshift('출생지 이름이 없는 카드입니다. 저장 좌표가 기본값인지 프로필에서 확인해 주세요. 현재는 저장된 좌표와 시간대를 유지해 계산했습니다.');
  if(!input.calendarType)limitations.unshift('달력 종류가 없어 양력 기본값을 적용했습니다.');
  const elementBasis=Object.entries(core.counts.byEl).map(([key,value])=>`${EL_KO[key]} ${value}`).join(' · ');
  const story=careerStory(evidence,day,roles,p.d.g);
  const readingSections=sections.map((section,i)=>({...section,analysisParagraphs:section.paragraphs,...story[i]}));
  return {title:day[0],basis,elementBasis,sections:readingSections,limitations,disclaimer:DISCLAIMER,analysis,evidence};
}

export function careerShare(report) {
  // Explicit allowlist: no profile fields or report body can reach a share payload.
  const known=Object.values(DAY_COPY).some(day=>day[0]===report.title);
  return {title:'사주로 찾는 나의 일 스타일',text:known?`나의 일 스타일 탐색 주제는 ‘${report.title}’. 여러분의 업무 조건도 살펴보세요.`:'사주로 나의 일 스타일을 살펴보세요.',url:CAREER_URL};
}
