// 9A: a card position names a role in the spread, not a calendar period. The model moved the 'current' card onto
// the question's period ("내년 상반기 … 운명의 수레바퀴가 현재의 흐름으로 나왔거든"), so every card carries the time its
// position means. Only the 1–4주 차 positions of the month spread are dated, and only from the draw. Added at the chapter
// fact boundary (selectChapterFacts) like the saju luck overlap; stored contexts and draws stay as they are.
const UNDATED='달력 시기 아님';
export function tarotTimeFrame(positionKey:unknown):string{
 const key=String(positionKey||'');
 const week=key.match(/^week([1-4])$/)?.[1];
 if(week)return `카드를 뽑은 날부터 ${week}주 차`;
 if(/^(past|recent_past|background|cause)$/.test(key))return `카드를 뽑기 전까지의 흐름 · ${UNDATED}`;
 if(/^(current|present|now|process)$|^current_/.test(key))return `카드를 뽑은 지금 · ${UNDATED}`;
 if(/^(future|near_future|outcome|short_term_outcome|near_change|overall)$|^if_|_flow$/.test(key))return `지금 조건이 이어질 때의 방향 · ${UNDATED}`;
 return `시기가 아닌 자리(마음·조건·행동) · ${UNDATED}`;
}
type O=Record<string,any>;
const withFrames=(cards:unknown)=>Array.isArray(cards)?cards.map(card=>card&&typeof card==='object'&&!('timeFrame' in card)&&(card.positionKey||card.position)?{...card,timeFrame:tarotTimeFrame(card.positionKey||card.position)}:card):cards;

export function enrichTarotTimeFrames<T extends {domain:string;facts:{label:string;value:unknown}[]}>(context:T):T{
 if(context?.domain!=='tarot'||!Array.isArray(context.facts))return context;
 return {...context,facts:context.facts.map(f=>
  f.label==='cards'?{...f,value:withFrames(f.value)}:
  f.label==='tarotConsultation'&&Array.isArray((f.value as O)?.cards)?{...f,value:{...(f.value as O),cards:withFrames((f.value as O).cards)}}:f)};
}
