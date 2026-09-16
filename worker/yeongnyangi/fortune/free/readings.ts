import {freeCategories,type FreeReading} from './categories';
import {domains} from '../index';
import {chartView} from '../charts';
import {context} from '../shared/domain';
import {FortuneError,type DomainContext,type DomainId,type FortuneInput,type FortuneLLMRequest} from '../shared/contracts';
import {ganji,formatPillar} from '../../../../lib/korean-calendar/index.js';
import {tenGodFor} from '../../../lib/life-book-ai-saju.js';
import {calculateSukuyoForMoment} from '../../../lib/sukuyo-astronomy.js';
import {relationFromForwardDistance} from '../../../lib/sukuyo-relation-core.js';
import {drawTarotCardsForSpread} from '../../../../lib/tarot/tarot-interpretation-engine.mjs';
import {buildKuseiPromptPayload} from '../../../../app/fortune/prompt-hub/kusei-calc';
import {buildMeihuaPrompt,calculateBasicMeihua} from '../../../../app/fortune/prompt-hub/meihua-calc';
import dangsaju from './dangsaju-data.json';
import {koreanCivilProfile} from '../shared/korean-time';
import {NUMEROLOGY_DATA,calculateLifePath,calculatePersonalDay} from '../../../../lib/tarot/numerology-tarot.mjs';

export const FREE_VERSION='anchovy-free-v2';
const tenGodAdvice:Record<string,[string,string]>={
 비견:['네 기준을 지키면서도 다른 사람의 방식이 들어올 자리를 남겨봐.','혼자 끝낼 일과 함께 결정할 일을 나누면 힘을 덜 낭비할 수 있어.'],
 겁재:['비교가 자극이 될 수 있지만, 다른 사람의 속도를 네 기준으로 삼을 필요는 없어.','함께 쓰는 돈과 시간의 경계를 먼저 정해봐.'],
 식신:['익숙한 능력을 차분히 꺼내는 쪽으로 오늘의 선택을 정리해봐.','큰 성과를 재촉하기보다 완성 가능한 작은 결과물을 하나 남겨.'],
 상관:['생각을 말로 꺼내는 힘이 살아나는 상징이야. 다만 솔직함과 날카로움은 다를 수 있어.','제안하기 전에 상대가 받아들일 수 있는 표현으로 한 번 다듬어봐.'],
 편재:['새로운 기회에 시선이 갈 때일수록 감당할 수 있는 범위를 확인해봐.','수익을 예상하기 전에 시간·비용·책임을 적어보는 게 순서야.'],
 정재:['지금 가진 자원을 꾸준히 관리하는 태도에 초점을 맞춰봐.','작은 지출이나 밀린 일을 하나 정리해. 안정감은 확인 가능한 행동에서 자라.'],
 편관:['해야 한다는 압박과 실제 필요한 책임을 구분할 필요가 있어.','마감과 휴식 시간을 함께 정하고, 혼자 떠안은 일은 나눠봐.'],
 정관:['약속과 기준을 점검하기 좋은 상징이야. 기준이 너무 많으면 네 움직임도 좁아질 수 있어.','꼭 지킬 원칙 하나를 정하고 나머지는 상황에 맞춰 조절해봐.'],
 편인:['낯선 관점이 도움이 될 수 있지만 생각만 늘어나지 않게 해봐.','떠오른 해석 중 하나를 작게 시험하고 실제 반응을 기록해.'],
 정인:['정보를 받아들이고 회복할 여지를 만드는 데 초점을 맞춰봐.','도움을 받는 일을 미안해하지 말고, 필요한 것을 구체적으로 부탁해.'],
};
const frames:Record<string,[string,string,string]>={
 ziwei:['열두 궁은 삶의 여러 역할을 나누어 살피는 틀이야. 한 궁의 별만으로 네 삶을 결정하지 않아.','별이 몰린 영역에 기대가 커질 수 있지만, 비어 있는 자리를 실패라고 볼 필요는 없어.','일·관계·휴식 중 요즘 가장 뒤로 밀린 영역에 작은 시간을 남겨봐.'],
 astrology:['출생 차트는 욕구와 감정, 바깥으로 드러나는 태도를 나누어 보는 지도야.','서로 다른 행성의 표현이 충돌할 때는 어느 한쪽이 틀렸다기보다 필요한 것이 다를 수 있어.','지금 느끼는 감정과 실제로 할 행동을 따로 적어봐. 선택 사이에 간격을 두는 거야.'],
 vedic:['베다 차트는 라그나와 달의 위치처럼 서로 다른 단서를 함께 읽어. 서양 별자리 해석과는 기준이 달라.','한 가지 상징으로 적성이나 관계를 확정하지 말고 반복되는 생활 리듬과 비교해봐.','힘을 쓰는 시간과 회복하는 시간을 관찰해. 네가 오래 유지할 수 있는 속도를 찾는 게 먼저야.'],
 yukhyo:['육효는 질문을 세우고 얻은 여섯 효의 변화에서 상황을 읽는 체계야.','여기서는 확정된 효·납갑 계산 없이 길흉을 만들지 않아. 네 질문에서 바꿀 수 있는 조건부터 살펴볼게.','원하는 결과, 현재의 장애물, 직접 바꿀 수 있는 행동을 하나씩 나눠 적어봐.'],
 psych:['심리 탐색은 너를 한 유형에 가두기보다 반복되는 반응을 알아차리는 시간이야.','감정이 크게 올라온 순간의 사실과 그때 붙인 해석을 나눠봐. 같은 사건도 다르게 받아들일 여지가 있어.','가장 최근의 장면 하나에서 느낀 감정·원했던 것·다음 행동을 적어보면 돼.'],
 dream:['꿈은 실제 사건을 예고한다고 단정하기보다 마음에 남은 이미지와 감정을 살피는 단서로 읽어.','같은 상징도 네 경험에 따라 의미가 달라져. 가장 강했던 감정과 깨어난 뒤 떠오른 일을 연결해봐.','꿈에서 반복된 장면 하나를 고르고, 요즘 현실에서 비슷하게 느끼는 순간을 기록해봐.'],
 horary:['호라리는 질문이 분명해진 시각과 장소의 차트를 읽는 체계야. 출생 차트와는 구분해야 해.','질문 시각의 차트를 계산하지 않은 상태에서 상대의 마음이나 성패를 답으로 만들지는 않을게.','누구의 어떤 선택을 언제까지 확인하려는지 질문을 좁혀봐. 답을 확인할 수 있는 조건을 함께 적어.'],
 numerology:['숫자의 상징은 성격을 증명하는 검사가 아니라 반복되는 선택을 돌아보는 도구야.','숫자 하나로 관계나 성공을 단정하지 말고 네 경험과 맞는 부분과 다른 부분을 구분해봐.','오늘 반복한 선택 하나를 기록하고, 다음에는 무엇을 조금 바꾸고 싶은지 적어봐.'],
};
const advancedDirectives:Record<string,string[]>={
 basic:['사주의 일간과 오늘 일주의 관계를 먼저 읽는다.','오늘의 흐름과 타고난 원국을 구분하고 하루 안에 실행할 선택으로 마무리한다.'],
 yukhyo:['확정된 괘와 효가 없으므로 괘명·동효·응기를 만들지 않는다.','질문의 주체, 기한, 바꿀 수 있는 조건을 분리해 실제 점괘를 얻기 전의 질문 설계로 답한다.'],
 dangsaju:['초년·청년·중년·말년의 12성 배치를 순서대로 읽고 현재 나이의 생활 장면과 연결한다.','고전 별 이름은 성격 낙인이 아니라 반복되는 강점과 과제의 상징으로 번역한다.'],
 kusei:['본명성과 월명성, 오행 관계를 구분한다.','일명성·시명성 또는 방위반이 없으면 길방과 이동 시기를 창작하지 않는다.'],
 psych:['입력된 장면에서 사실·감정·해석·욕구를 구분한다.','진단명이나 성격 유형을 확정하지 않고 반복 패턴을 시험할 작은 행동을 제안한다.'],
 numerology:['생명수와 오늘수를 서로 다른 시간축으로 읽는다.','숫자를 사건의 확률이나 우열로 바꾸지 않고 반복되는 선택 습관과 연결한다.'],
 dream:['꿈의 장면, 등장인물, 감정, 반복 상징을 각각 분리한 뒤 최근 상황과 연결한다.','상징 사전의 단일 뜻이나 예지몽으로 단정하지 않고 사용자 개인의 연상을 우선한다.'],
 horary:['질문 시각과 장소의 실제 차트가 없으면 행성·하우스·시그니피케이터를 만들지 않는다.','질문을 하나의 주체·행동·기한으로 좁히고 차트 계산 전 확인할 조건을 제시한다.'],
 meihua:['본괘·체용·동효·변괘를 서로 다른 근거로 구분한다.','징후를 확정 예언으로 키우지 않고 유지할 것과 바꿀 것을 현실 행동으로 나눈다.'],
};
function specializedPrompt(category:string,draft:Record<string,string>,basis:FreeReading['basis'],limitations:string[]) {
 const config=freeCategories.find(c=>c.id===category)!;
 const inputs=config.fields.map(f=>draft[f.id]?`- ${f.label}: ${draft[f.id]}`:'').filter(Boolean);
 return [`너는 영냥이, 도도하지만 다정한 달빛 점술방의 상담가다. 전문 역할: ${config.role}.`,
 `[${config.label} 전용 해석 규칙]`,...(advancedDirectives[category]||[]).map(x=>'- '+x),'[입력 단서]',...inputs,'[확정 산출 데이터]',...basis.map(b=>`- ${b.label}: ${b.value}`),'[산출 한계]',...limitations.map(x=>'- '+x),'[해석 원칙]',...config.principles.map(x=>'- '+x),'- 확정 값은 바꾸거나 다시 계산하지 않는다. 없는 차트·시기·상대 마음은 만들지 않는다.','- 각 해석의 근거를 밝히고 장점과 과다의 부담을 함께 설명한다. 의료·법률·투자 판단을 대신하지 않는다.','[답변 구조]',...config.answerSections.map((x,i)=>`${i+1}. ${x}`),'[영냥이 말투]','손님을 너라고 부르되 존중한다. 짧은 문단으로 구체적으로 말한다. 고양이 어미는 짧은 반응에만 절제한다. 공포와 확정 예언, 모욕, 성공 보장은 하지 않는다. 마지막에는 오늘 할 수 있는 행동 하나를 준다.'].join('\n');
}
function domainPrompt(request:FortuneLLMRequest) {
 return ['[영냥이 시스템 지침]',request.system,'[운세별 전문 지침]',request.domainRules,'[확정 계산 데이터]',JSON.stringify(request.calculatedData,null,2),'[사용자 질문]',request.userQuestion,'[답변 섹션]',...request.sectionTitles.map((x,i)=>`${i+1}. ${x}`),'[출력 구조]',JSON.stringify(request.outputSchema,null,2),`[프롬프트 버전] ${request.promptVersion}`].join('\n');
}
function buildDomainPrompt(domain:DomainId,input:FortuneInput,calculated:DomainContext) {
 return domainPrompt(domains[domain].buildPrompt(input,calculated,'mackerel'));
}
function withYeongnyangi(prompt:string) {
 return `너는 영냥이, 도도하지만 다정한 달빛 점술방의 상담가다. 아래 전용 프롬프트의 계산 규칙과 답변 구조를 빠짐없이 따르되, 문체는 영냥이답게 차분하고 구체적으로 다듬는다.\n\n${prompt}`;
}
export async function calculateFree(category:string,input:FortuneInput,draft:Record<string,string>,day:string,env:Record<string,string>,drawn?:unknown):Promise<FreeReading> {
 const config=freeCategories.find(c=>c.id===category);if(!config)throw new FortuneError('INVALID_CATEGORY');
 let basis:FreeReading['basis']=[],limitations:string[]=[],paragraphs:string[]=[],kind:FreeReading['kind']='reflection';
 let charts:NonNullable<FreeReading['charts']>=[],prompt='';
 const at=day+'T12:00:00+09:00',p=input.personA;
 if(['saju','basic','comprehensive','dangsaju'].includes(category)) {
  const c=await domains.saju.calculate(domains.saju.validateInput({...input,readingMode:'personal'}),{runtimeEnv:env,asOf:at});
  charts=[chartView(c)];prompt=buildDomainPrompt('saju',input,c);
  const f=Object.fromEntries(c.facts.map(x=>[x.label,x.value])) as Record<string,any>;
  const [year,month,date]=day.split('-').map(Number),today=ganji({year,month,day:date,hour:12,minute:0});
  if(!today)throw new FortuneError('CALENDAR_UNAVAILABLE',503);
  const pillar=formatPillar(today.day.stemIndex,today.day.branchIndex,'hanja'),tg=tenGodFor(f.dayMaster,pillar[0]);
  const advice=tenGodAdvice[tg]||tenGodAdvice['정인'];
  basis=[{label:'나의 일간',value:String(f.dayMaster)},{label:'오늘의 일주 · KST 정오 기준',value:pillar},{label:'오늘 천간과의 십성',value:String(tg)}];
  paragraphs=[`네 일간은 ${f.dayMaster}, 오늘 확인한 일주는 ${pillar}. 두 천간 사이에서 '${tg}' 관계를 읽을 수 있어.`,advice[0],`이건 오늘의 사건을 확정하는 말이 아니라, 서로 다른 기운의 관계를 선택의 관점으로 풀어본 거야. 타고난 장점도 과해지면 부담이 될 수 있다는 점은 기억해.`,advice[1]];
  limitations=c.limitations;kind='calculated';
  if(category==='dangsaju') {
   const stars=Object.entries(f.pillars as Record<string,string>).filter(([,v])=>!!v).map(([key,v])=>({label:({year:'초년',month:'청년',day:'중년',hour:'말년'} as Record<string,string>)[key],star:dangsaju.branches['자축인묘진사오미신유술해'['子丑寅卯辰巳午未申酉戌亥'.indexOf(v[1])] as keyof typeof dangsaju.branches]})).filter(x=>x.star);
   if(!stars.length)throw new FortuneError('CALENDAR_UNAVAILABLE',503);
   basis=stars.map(x=>({label:x.label,value:x.star}));
   const m=dangsaju.meanings[stars[Math.min(2,stars.length-1)].star as keyof typeof dangsaju.meanings];
   paragraphs=[`기존 당사주 자료로 풀면 ${stars.map(x=>`${x.label} ${x.star}`).join(', ')}의 상징이 이어져.`,m.summary,`강점은 ${m.strength.join(', ')}에 있어. 다만 ${m.caution.join(', ')} 쪽으로 치우치지 않는지 살펴봐.`,`오늘은 ${m.increase[0]}부터 해봐. ${m.reduce[0]}은 조금 내려놓아도 괜찮아.`];
   limitations=[...limitations,'생애 상징 해설이며 오늘의 사건을 계산한 결과는 아닙니다.'];prompt='';
   } else if(category==='comprehensive') {
    const promptParts=[`[사주 고급 프롬프트]\n${prompt}`];
    paragraphs=[paragraphs[0],paragraphs[1]];
   for(const system of ['ziwei','astrology','vedic'] as const) {
    if(!p?.birthTime||!p.birthPlace){limitations.push(`${system}: 출생시간·장소가 부족해 종합 해설에서 제외했습니다.`);continue;}
    const other=await calculateFree(system,input,draft,day,env);
     basis.push(...other.basis.map(b=>({label:`${other.title} · ${b.label}`,value:b.value})));
     paragraphs.push(`${other.title}에서는 ${other.paragraphs[0]}`);
     limitations.push(...other.limitations);
     charts.push(...(other.charts||[]));
     promptParts.push(`[${other.title} 고급 프롬프트]\n${other.prompt}`);
   }
   if(paragraphs.length===2)paragraphs.push('출생시간이 없어 시간에 따라 달라지는 차트는 제외했어. 미산출 부분을 상상으로 채우지 않고 확인된 사주 근거에 한해 읽어줄게.');
    paragraphs.push('체계마다 보는 관점이 달라. 서로 같은 결론이라고 억지로 묶지 않고, 오늘 실천할 선택과 타고난 성향을 구분해서 읽어줘. '+advice[1]);
    prompt=promptParts.join('\n\n========================================\n\n');
   }
 } else if(category==='tarot') {
  const cards=drawn as {nameKo:string;orientation:string;interpretation:string}[];
  basis=cards.map((x,i)=>({label:['원인','과정','결과'][i],value:`${x.nameKo} · ${x.orientation==='reversed'?'역방향':'정방향'}`}));
  paragraphs=cards.map((x,i)=>`${basis[i].label} 자리에는 ${basis[i].value}가 나왔어. ${x.interpretation}`);
  paragraphs.push('세 카드를 네 질문과 함께 읽어봐. 상대의 속마음이나 미래를 확정하는 답은 아니야. 지금 직접 바꿀 수 있는 행동 하나를 고르는 데 써줘.');kind='symbolic';limitations=['당일 최초 카드 배열을 보관합니다. 다시 읽어도 같은 카드입니다.'];
  const calculated=context('tarot',{spreadId:'three_card_cause_process_outcome',cards},limitations);
  charts=[chartView(calculated)];prompt=buildDomainPrompt('tarot',input,calculated);
 } else if(['ziwei','sukuyo','vedic','astrology'].includes(category)) {
  const d=category as DomainId,c=await domains[d].calculate(domains[d].validateInput({...input,readingMode:'personal'}),{runtimeEnv:env,asOf:at}),chart=chartView(c);
  charts=[chart];prompt=buildDomainPrompt(d,input,c);
  basis=chart.groups.slice(0,3).flatMap(g=>g.items.slice(0,2).map(i=>({label:`${g.label} · ${i.label}`,value:i.value})));limitations=c.limitations;kind='calculated';
  const frame=frames[category]||['네 본명숙은 태어난 순간의 달 위치에서 계산해.','가까운 관계에서도 편안한 거리는 서로 다를 수 있어.','네가 원하는 속도와 상대가 편한 속도를 말로 확인해봐.'];
  paragraphs=[`${basis[0]?.label}에서 ‘${basis[0]?.value}’가 확인됐어. ${frame[0]}`,frame[1],`이 자료는 ${chart.title}에서 확인한 단서야. ${basis.slice(1,3).map(b=>`${b.label}: ${b.value}`).join(' · ')}. 한 값만으로 너를 규정하지는 않을게.`,frame[2]];
  if(category==='sukuyo') {
   const [year,month,date]=day.split('-').map(Number);
   const today=await calculateSukuyoForMoment(env,{year,month,day:date,hour:12,minute:0,timezoneOffsetHours:9,calendarType:'solar'},{strictSwiss:true});
   const natal=c.facts.find(x=>x.label==='personA')!.value as {index:number;strengths?:string[];shadows?:string[];keywords?:string[]};
   paragraphs[1]=`이 숙의 키워드는 ${(natal.keywords||[]).join('·')}이야. ${(natal.strengths||[]).join('·')}을 강점으로 읽지만, ${(natal.shadows||['한 가지 방식에 치우침']).join('·')}으로 과해지지 않도록 균형을 살펴봐.`;
   const relation=relationFromForwardDistance((today.index-natal.index+27)%27);
   if(!relation)throw new FortuneError('PRECISION_UNAVAILABLE',503);
   basis.push({label:'오늘 정오의 숙과 본명숙 관계',value:String(relation.relationType)});
   paragraphs[2]=`오늘은 한국 시간 정오의 달 위치를 기준으로 네 본명숙과 ${relation.relationType} 관계로 계산됐어. 이것은 오늘 살펴볼 관계의 상징이지, 실제 사람이 너를 어떻게 대할지 확정하는 뜻은 아니야.`;
   limitations.push('오늘 숙은 KST 정오의 대표값입니다. 숙 경계 시각에는 달의 위치가 달라질 수 있습니다.');
  }
 } else if(category==='kusei') {
  if(p!.birthPlace?.timezone!=='Asia/Seoul')throw new FortuneError('SAJU_KST_REQUIRED');
  const [h,m]=(p!.birthTime||'12:00').split(':').map(Number);
  const payload=buildKuseiPromptPayload({gender:p!.gender!,birthDate:p!.birthDate,calendarType:'solar',birthTimeKnown:!!p!.birthTime,birthHour:h,birthMinute:m,timezone:'Asia/Seoul',currentDateTime:day+'T12:00',userQuestion:input.question}),r=payload.calculation;
  basis=[{label:'본명성',value:r.honmeiStar.koreanName},{label:'월명성',value:r.getsumeiStar?.koreanName||'미산출'}];
  paragraphs=[`네 본명성은 ${r.honmeiStar.koreanName}야. ${r.honmeiStar.strengthText}`,r.honmeiStar.cautionText,r.honmeiStar.relationshipText,r.honmeiStar.workText];limitations=[...r.warnings,'일명성·시명성은 미산출입니다. 오늘의 사건 예측이 아닌 기질 해설입니다.'];kind='calculated';prompt=withYeongnyangi(payload.prompt);
 } else if(category==='numerology') {
  const life=calculateLifePath(p!.birthDate);
  // Reference calculator reads getMonth/getDate; pass the locked KST civil date,
  // independent of the server's own timezone.
  const [,month,date]=day.split('-').map(Number);
  const personal=calculatePersonalDay(p!.birthDate,{getMonth:()=>month-1,getDate:()=>date} as Date);
  const lifeData=NUMEROLOGY_DATA[life as keyof typeof NUMEROLOGY_DATA],dayData=NUMEROLOGY_DATA[personal as keyof typeof NUMEROLOGY_DATA];
  basis=[{label:'생명수',value:String(life)},{label:'오늘수 · KST 날짜 기준',value:String(personal)}];kind='symbolic';
  paragraphs=[`네 생명수는 ${life}, '${lifeData.keyword}'의 상징이야. ${lifeData.meaning}을 중심으로 선택을 돌아볼 수 있어.`,`오늘수는 ${personal}, '${dayData.keyword}'로 읽혀. ${dayData.meaning} 중 지금 네 상황과 연결되는 단어를 하나 골라봐.`,`숫자가 같으면 그 주제가 반복된다고 살펴보고, 다르면 익숙한 방식과 오늘 살펴볼 관점의 차이를 생각해봐. 어느 쪽이 더 좋은 숫자라는 뜻은 아니야.`,`오늘 고른 단어를 행동 하나로 옮겨봐. 숫자가 결정을 대신하는 게 아니라, 네가 놓친 선택을 발견하도록 돕는 거야.`];limitations=['기존 수비학의 생명수·개인일수 공식을 사용합니다. 숫자 상징은 실제 사건의 발생 확률이 아닙니다.'];
 } else if(category==='meihua') {
  const date=new Date(at),[year,month,d]=day.split('-').map(Number);
  const r=calculateBasicMeihua({modeLabel:'매화역수',name:'',gender:'',birthDate:'',birthTime:'',calendarType:'solar',question:input.question,year,month,day:d,hour24:12,minute:0,baseDateTime:date.toISOString()});
  basis=[{label:'본괘',value:r.mainHexagramName},{label:'변괘',value:r.changedHexagramName},{label:'동효',value:String(r.changingLine)}];
  paragraphs=[`오늘 한국 시간 정오를 기준으로 얻은 본괘는 ${r.mainHexagramName}야.`,r.bodyUseRelation,`움직이는 효는 ${r.changingLine}효, 변괘는 ${r.changedHexagramName}로 이어져. 변화가 반드시 일어난다는 예언보다 상황을 다른 각도에서 살피는 상징으로 봐줘.`,`네 질문에서 유지할 것과 바꿔볼 것을 하나씩 정해봐. 결과를 재촉하기보다 실행 가능한 작은 선택으로 옮기는 거야.`];kind='symbolic';limitations=['기존 매화역수의 정오 기준 시간 기괘입니다. 질문 순간의 호라리 차트와 다릅니다.'];prompt=withYeongnyangi(buildMeihuaPrompt(r));
 } else {
  const frame=frames[category]||frames.psych;
  basis=[{label:'입력한 질문',value:input.question||'오늘 나의 선택을 어떻게 돌아볼까?'},...config.fields.filter(f=>draft[f.id]&&!['question','tone','depth'].includes(f.id)).map(f=>({label:f.label,value:draft[f.id]}))];
  paragraphs=[`‘${basis[0].value}’라는 질문을 중심에 놓아볼게.`,...frame];
  limitations=['질문·상징을 정리한 해설입니다. 이 분야의 개인 차트나 오늘의 길흉은 산출하지 않았습니다.'];
 }
 const promptDraft={...draft,question:input.question,...(p?{birthDate:p.birthDate,birthTime:p.birthTime||'모름',birthPlace:p.birthPlace?.name||'',birthTimezone:p.birthPlace?.timezone||'Asia/Seoul',calendarType:'양력',gender:p.gender==='female'?'여성':'남성'}:{})};
 if(!prompt)prompt=specializedPrompt(category,promptDraft,basis,limitations);
 return {category,day,title:config.label,kind,summary:paragraphs.slice(0,2).join(' '),paragraphs,basis,limitations,charts,prompt,version:FREE_VERSION};
}
