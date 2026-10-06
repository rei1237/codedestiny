import type {ChapterSpec} from './book-contracts';
import type {Consultation} from './consultation';
import type {DomainContext} from './shared/contracts';
import {resolveAskPeriods} from './ask/period';
import {resolveQuestionYears} from './consultation';
import {READING_V7_VERSION} from './reading-policy';
import {withV7Sections,type ChapterSpecV7} from './reading-v7';

export const COUNSEL_VERSION='purpose-counsel-v1';
export const isMajorQuestion=(text:string)=>/대운|大運|大运|daewoon|daeun|(?:decade|major)\s*(?:luck|cycle)/iu.test(text);
type Cycle={index:number;startYear:number;endYear:number;startAge?:number;endAge?:number;pillar:string;isCurrent?:boolean};

/** Per-question scope: an unrelated dated question must not trim a lifetime question. */
export function questionCycles(text:string,asOf:string,cycles:Cycle[]):Cycle[]{
  const year=Number(asOf.slice(0,4));
  const current=cycles.find(c=>c.startYear<=year&&c.endYear>=year);
  const namedPattern=/([갑을병정무기경신임계][자축인묘진사오미신유술해]|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s*대운/gu;
  const named=[...text.matchAll(namedPattern)].map(m=>m[1]);
  const ranges=resolveAskPeriods(text.replace(namedPattern,''),asOf,resolveQuestionYears);
  const explicit=[...text.matchAll(/\b((?:19|20|21)\d{2})\s*년/gu)].map(m=>Number(m[1]));
  if(ranges.length)return cycles.filter(c=>ranges.some(r=>c.endYear>=Number(r.start.slice(0,4))&&c.startYear<=Number(r.end.slice(0,4))));
  if(explicit.length)return cycles.filter(c=>c.endYear>=Math.min(...explicit)&&c.startYear<=Math.max(...explicit));
  if(named.length){
    const stems='갑을병정무기경신임계',branches='자축인묘진사오미신유술해',hs='甲乙丙丁戊己庚辛壬癸',hb='子丑寅卯辰巳午未申酉戌亥';
    return cycles.filter(c=>named.some(n=>n===c.pillar||n===stems[hs.indexOf(c.pillar[0])]+branches[hb.indexOf(c.pillar[1])]));
  }
  if(/전체|평생|과거.*미래|all|lifetime/iu.test(text))return cycles;
  const ages=[...text.matchAll(/(\d{1,3})\s*(세|대)/gu)];
  if(ages.length){const start=Math.min(...ages.map(m=>Number(m[1]))),end=Math.max(...ages.map(m=>Number(m[1])+(m[2]==='대'?9:0)));return cycles.filter(c=>c.startAge!==undefined&&c.endAge!==undefined&&c.endAge>=start&&c.startAge<=end);}
  if(/현재|지금|이번|다음|current|next/iu.test(text))return cycles.filter(c=>
    (/현재|지금|이번|current/iu.test(text)&&c===current)||(/다음|next/iu.test(text)&&c===(current?cycles.find(x=>x.index===current.index+1):cycles.find(x=>x.startYear>year))));
  return cycles;
}

const PURPOSES:Record<string,string>={
  personal:'기질·강점·반복 패턴과 선택 습관을 연결한다.',
  love:'끌림·감정 표현·관계 속도와 경계를 설명한다. 상대의 마음을 확정하지 않는다.',
  reunion:'관계가 끊어진 맥락은 입력된 사실만 사용하고, 연락·기다림·정리의 조건과 경계를 비교한다.',
  marriage:'연애의 끌림과 함께 사는 조건을 구분하고 책임·생활·갈등 조율 및 계산된 시기만 설명한다.',
  compatibility:'실제 두 사람의 근거를 비교해 편안한 점·차이·갈등·합의를 설명한다. 상대 자료가 없으면 비교를 만들지 않는다.',
  relationship:'두 사람의 속도·기대·표현·경계와 관계 회복의 조건을 설명한다.',
  work:'역량이 살아나는 업무·환경·협업 방식과 선택 기준을 설명한다.',
  career:'역량이 살아나는 업무·환경·협업 방식과 선택 기준을 설명한다.',
  job_change:'현재 자리 유지와 이동의 이점·부담·준비 조건을 비교하고 합격·이직 날짜를 만들지 않는다.',
  money:'수입을 만드는 방식·지출·축적·위험 관리에 집중하며 수익률이나 투자 성공을 보장하지 않는다.',
  business:'운영·고객 대응·협업·현금 흐름·확장 부담을 구분하고 구체적 사업 사실을 지어내지 않는다.',
  health:'생활 리듬·소진·회복을 설명한다. 한난조습은 전통적 비유이며 체온·질환·치료 판단이 아니다.',
  movement:'변화·이동·해외 적응·정착의 조건과 현실적인 준비를 설명한다.',
  move:'변화·이동·해외 적응·정착의 조건과 현실적인 준비를 설명한다.',
  study:'학습 방식·집중·반복·환경 조정과 준비 행동을 설명한다. 합격을 보장하지 않는다.',
  family:'가족의 역할·기대·거리와 대화 및 부담 분담을 설명한다.',
  relationships:'대인관계의 반응·신뢰·경계·역할과 조율을 설명한다.',
  self:'기질의 장점과 과하거나 막힐 때의 모습을 구체적인 선택 습관으로 설명한다.',
  timing:'실제 계산된 시기별 변화와 준비를 비교한다. 날짜의 해상도를 높이거나 사건을 확정하지 않는다.',
};
export const PLAIN_COUNSEL='생활에서 느낄 변화와 질문의 답을 먼저 말하고 실제 근거→쉬운 뜻→선택과 행동으로 잇는다. 전문 용어는 꼭 필요한 것만 첫 등장에 짧게 풀고 한 문장에 여러 용어를 나열하지 않는다. 낯선 한자와 내부 키를 본문에 노출하지 않는다. 같은 설명을 장마다 반복하지 않는다. 장면은 예시이며 실제 경험으로 단정하지 않는다. 체계마다 고유 근거와 한계를 유지하고 퓨전에서는 공통점과 상충점을 구분한다.';
export const SAJU_CYCLE_GUIDE='각 배정 대운을 빠짐없이 시기 요약→원국과 비교→연애·건강·재물·직업→행동 순서로 설명한다. 지장간·투간·투출·개고·도충은 계산된 성립 조건과 해당 기간만 사용한다. 도충의 반대 글자를 원국에 추가하지 않는다. 개고의 강도·열린 십성·유불리와 완화 조건을 구분하고 횡재나 파국으로 단정하지 않는다. 원국의 격국·종격·강약·용신 판정은 고정하고 운에서 돕거나 부담을 주는 조건만 비교한다. 억부 우선·조후 보완 정책을 유지하고 원국의 한난과 조습 및 운의 오행을 대조하되 새 점수나 용신을 만들지 않는다. 존재하지 않는 작용을 억지로 설명하지 않는다. 과거는 돌아볼 패턴, 미래는 조건과 선택이며 현재·다음 대운은 준비를 더 구체화한다. 세운은 해당 대운과 겹치는 제공 연도만 읽는다.';
export function purposeGuide(kind:string,topic:string){return PURPOSES[kind]||PURPOSES[topic]||'선택한 상담의 질문과 기존 전용 해석 계약을 우선하고, 그 목적에 맞는 근거·선택·행동으로 답한다.';}

/** Keep the purchased chapter count/budget. Reuse the native renderer and section IDs. */
export function counselManifest(manifest:ChapterSpec[],context:DomainContext|undefined,tier:string,kind:string,question:string,asOf:string):ChapterSpec[]{
  const major=context?.facts.find(f=>f.label==='majorLuck')?.value as {cycles?:Cycle[]}|undefined;
  const premium=['tuna','assorted','omakase'].includes(tier);
  const requested=premium&&context?.domain==='saju'&&(kind==='timing'||isMajorQuestion(question));
  const units=question.trim().split(/\n+|(?<=[?？])\s*/u).filter(text=>kind==='timing'||isMajorQuestion(text));
  const chosen=requested?(units.length?(major?.cycles||[]).filter(c=>units.some(text=>questionCycles(text,asOf,major?.cycles||[]).some(x=>x.index===c.index))):major?.cycles||[]):[];
  const v7=manifest[0]?.version===READING_V7_VERSION;
  const slots=manifest.filter(c=>c.ordinal>0&&c.key!=='prevention'&&c.key!=='action'&&(!v7||['majorArc','majorNow','majorNext'].includes(c.key||'')));
  return manifest.map(c=>{
    const slot=slots.findIndex(s=>s.id===c.id);
    const assigned=slot<0?[]:chosen.filter((_,i)=>Math.min(slots.length-1,Math.floor(i*slots.length/chosen.length))===slot);
    const focus=purposeGuide(kind,'');
    let next:ChapterSpec={...c,counsel:{version:COUNSEL_VERSION,focus,...(assigned.length?{cycleIndexes:assigned.map(x=>x.index)}:{})}};
    if(!assigned.length)return next;
    const labels=assigned.map(x=>`${x.startYear}–${x.endYear}년`);
    next={...next,title:`${labels.join(' · ')}의 변화`,titleKey:undefined,theme:'timing',
      systems:[...new Set([...(c.systems||[]),'saju' as const])],
      focus:SAJU_CYCLE_GUIDE,excludes:[],periodScope:'배정된 대운과 그 안의 계산된 세운만 읽는다.',
      factSelectors:{...c.factSelectors,saju:['pillars','dayMaster','tenGodsByPillar','seasonalBalance','healthBasis','strengthHeuristic','usefulGod','jong','advancedFactors','majorLuck']},
      sections:c.sections?.map(s=>({...s,instruction:`${s.instruction} ${labels.join(', ')} 각 주기의 원국 비교와 연애·건강·재물·직업을 역할에 맞게 설명한다.`}))};
    if(v7){const chapter=next as ChapterSpecV7;
      next=withV7Sections({...chapter,owns:chapter.owns.filter(p=>!p.startsWith('majorLuck')).concat(assigned.map(x=>`majorLuck.cycle${x.index}`)),
        refs:[...new Set([...chapter.refs,'advancedFactors','strengthHeuristic','seasonalBalance','healthBasis','usefulGod','jong'])],
        mustCover:labels.map(label=>`${label}: 원국 비교·연애·건강·재물·직업·행동`),mustNotCover:[],
        minInsightUnits:labels.length,timingRef:'owner'});
    }
    return next;
  });
}

export const hasPurposeCounsel=(consultation?:Consultation)=>consultation?.counselVersion===COUNSEL_VERSION;
