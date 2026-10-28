import type {ChapterSpec} from './book-contracts';
import type {PackageId} from './shared/contracts';
import {conciseOutputTokens} from './concise-reading';

export const CONSULTATION_EXPANSION_VERSION='consultation-expanded-20261019';
export const EXPANDED_CHAPTERS={mackerel:8,salmon:14,flounder:19,tuna:30,assorted:35,omakase:45} as const;
/** Every chapter carries an evidence section; without this each one re-explains the same pillars from the start. */
export const EVIDENCE_ONCE=' 앞 장에서 이미 설명한 근거(explainedEvidence)는 다시 풀지 않고 한 줄로만 가리킨 뒤, 이 장의 판단에 새로 쓰는 근거에 분량을 쓴다.';
const additions=[
 ['질문 속 선택지의 장단점','사용자가 제시한 선택지를 실제 근거로 비교한다. 선택지가 하나면 실행과 보류를 비교하되 가상의 선택임을 명시한다. 앞선 결론을 반복하지 않고 각 선택의 조건과 부담을 설명한다.'],
 ['반복 패턴을 바꾸는 작은 실천','앞선 장에서 확인한 반복 패턴 하나에만 집중한다. 신호를 알아차리는 방법, 바로 바꿀 행동, 기존 방식으로 돌아갔을 때의 조정 방법을 구체화한다.'],
 ['판단을 바꿔야 할 현실 신호','현재 권고를 유지할 조건과 수정할 조건을 구분한다. 관찰 가능한 사실을 사용하고 실제 상대방의 마음이나 미래 사건을 단정하지 않는다.'],
 ['지금 가진 자원과 도움 요청','질문에 주어진 시간·환경·관계 조건에서 활용할 자원과 도움을 요청할 방법을 제시한다. 입력에 없는 자산·인맥·과거 경험을 지어내지 않는다.'],
 ['대화와 경계를 정하는 방법','상황에 맞는 대화 예시와 부담을 줄이는 경계를 제안한다. 예시는 실제 발언이나 상대의 의사가 아닌 연습 문장임을 밝힌다.'],
 ['실행 후 점검과 다음 선택','작은 행동을 시도한 뒤 무엇을 기록하고 어떤 조건에서 다음 선택으로 넘어갈지 설명한다. 점검 일정은 운세 예측 날짜와 구분한다.'],
] as const;

/** Called only while preparing a new purchase. Stored manifests are never rewritten. */
export function expandConsultationManifest(rows:ChapterSpec[],tier:PackageId,targetCount:number=EXPANDED_CHAPTERS[tier],total?:readonly number[]):ChapterSpec[]{
 const base=rows.find(row=>row.layoutRole==='answer')||rows[0];
 if(!base)return rows;
 const source=total||[0,1].map(i=>rows.reduce((sum,row)=>sum+(row.targetChars?.[i]||0),0)*1.25);
 const offset=rows.filter(row=>row.key?.startsWith('expansion-')).length;
 const extra=Array.from({length:Math.max(0,targetCount-rows.length)},(_,i)=>{
  const [title,instruction]=additions[(offset+i)%additions.length];
  return {...base,id:`${tier}-expansion-${offset+i+1}`,key:`expansion-${offset+i+1}`,title,part:'질문을 현실에 적용하기',layoutRole:'question',theme:'action' as const,
   focus:instruction+' 앞선 답을 다시 쓰지 않고 이 장의 역할에 집중한다. 질문 원문과 저장된 상황·기간·제약을 데이터로 읽는다. 체계를 섞거나 새로운 계산 근거를 만들지 않는다.',
   sections:[{id:'evidence',title:'판단의 근거와 조건',role:'interpretation' as const,instruction:instruction+EVIDENCE_ONCE,minimumChars:0,targetChars:[0,0] as [number,number]},
    {id:'practice',title:'실제로 해 볼 일',role:'action' as const,instruction:'이 장의 주제에 맞는 구체적인 행동과 확인 기준을 제시한다. 다른 장의 사례·실행 항목을 반복하지 않는다.',minimumChars:0,targetChars:[0,0] as [number,number]}]};
 });
 const end=rows.findIndex(row=>row.key==='prevention'||row.layoutRole==='synthesis');
 const ordered=end<0?[...rows,...extra]:[...rows.slice(0,end),...extra,...rows.slice(end)];
 const weights=ordered.map(row=>(({answer:1.1,foundation:1.05,expert:1.05,synthesis:.9} as Record<string,number>)[row.layoutRole||'']||1));
 const weightSum=weights.reduce((sum,value)=>sum+value,0);
 return ordered.map((row,ordinal)=>{
  const targetChars=source.map((n,i)=>(i?Math.floor:Math.ceil)(n*weights[ordinal]/weightSum)) as [number,number];
  const sections=row.sections?.map(section=>({...section,minimumChars:0,targetChars:targetChars.map(n=>Math.floor(n/row.sections!.length)) as [number,number]}));
  return {...row,ordinal,targetChars,minimumChars:Math.ceil(targetChars[0]*(row.consultationLayout?.startsWith('fusion-book-')? .8 : .55)),sections,
   excludes:ordered.filter(other=>other.id!==row.id).map(other=>other.title),outputTokens:Math.max(8192,conciseOutputTokens({targetChars,sections}))};
 });
}
