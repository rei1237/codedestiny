// Toss tarot library's presentation contract. This module contains no pricing,
// payment, browser, or DOM state, so the native client and Toss worker cannot
// disagree about which flow a stored result belongs to.
const flow=(id,name,{access='iap',featureKeys=[],cardCount,positions,resultKind,inputLabel,inputHint=''})=>Object.freeze({
  id,name,access,featureKeys:Object.freeze(featureKeys),cardCount,positions:Object.freeze(positions),resultKind,inputLabel,inputHint,
});

export const TOSS_TAROT_LIBRARY_FLOWS=Object.freeze([
  flow('tarot','오늘의 타로',{access:'free-local',cardCount:1,resultKind:'single',inputLabel:'지금 가장 궁금한 점',positions:[['today','오늘의 메시지']]}),
  flow('tarot-celestial-harmony','천체의 선율',{featureKeys:['tarot-celestial-harmony'],cardCount:11,resultKind:'celestial',inputLabel:'지금 삶에서 조율하고 싶은 흐름',positions:[['sun','태양 · 자아'],['moon','달 · 감정'],['mercury','수성 · 생각'],['venus','금성 · 관계'],['mars','화성 · 추진'],['jupiter','목성 · 확장'],['saturn','토성 · 책임'],['uranus','천왕성 · 변화'],['neptune','해왕성 · 직관'],['pluto','명왕성 · 변용'],['chiron','카이론 · 회복']]}),
  flow('tarot-crystal-soul','원석 소울 타로',{featureKeys:['tarot-crystal-soul-reading'],cardCount:5,resultKind:'crystal',inputLabel:'지금 다루고 싶은 마음의 주제',positions:[['core','마음의 중심'],['shadow','지금의 그림자'],['gift','이미 가진 힘'],['shift','전환의 단서'],['practice','오늘의 실천']]}),
  flow('tarot-healing','태양 회복 타로',{access:'free-local',cardCount:4,resultKind:'healing',inputLabel:'마음이 지친 자리',inputHint:'구체적인 상황을 적으면 회복 행동을 더 선명하게 정리할 수 있어요.',positions:[['hidden_truth','마음이 지친 자리'],['embrace_pain','감정의 온도'],['silver_lining','회복의 단서'],['step_forward','오늘의 회복 행동']]}),
  flow('tarot-ijik','이직 운명의 카드',{featureKeys:['tarot-ijik'],cardCount:7,resultKind:'career',inputLabel:'이직 또는 일의 변화에서 고민되는 점',positions:[['current','현재 자리'],['wish','바라는 변화'],['risk','살필 위험'],['strength','나의 강점'],['choice','선택의 기준'],['timing','가까운 흐름'],['action','현실적인 다음 행동']]}),
  flow('tarot-love-relationship','우리는 무슨 사이?',{featureKeys:['tarot-love-relationship'],cardCount:6,resultKind:'relationship',inputLabel:'두 사람 사이에서 확인하고 싶은 점',positions:[['me','나의 마음'],['other','상대가 보이는 흐름'],['bond','관계의 온도'],['friction','걸리는 조건'],['direction','가까운 방향'],['action','지켜야 할 태도']]}),
  flow('tarot-mindscan','말과 행동 사이 타로',{featureKeys:['tarot-mindscan'],cardCount:5,resultKind:'mindscan',inputLabel:'말과 행동 사이에서 헷갈리는 장면',positions:[['words','겉으로 드러난 말'],['actions','반복되는 행동'],['gap','엇갈림의 이유'],['boundary','지켜야 할 선'],['next','다음 대화의 기준']]}),
  flow('tarot-numerology','수비학 타로',{featureKeys:['tarot-numerology-reading'],cardCount:5,resultKind:'numerology',inputLabel:'지금 확인하고 싶은 선택',inputHint:'생년월일은 유료 생성 전에 별도로 확인해요.',positions:[['number','숫자가 비춘 리듬'],['habit','반복되는 선택'],['resource','활용할 자원'],['caution','주의할 습관'],['action','현실의 한 걸음']]}),
  flow('tarot-prompt-maker','타로 오라클 상담',{featureKeys:['tarot-prompt-maker','tarot-prompt-maker-standard','tarot-prompt-maker-deep','tarot-prompt-maker-master'],cardCount:7,resultKind:'oracle',inputLabel:'카드에게 묻고 싶은 질문',positions:[['core','질문의 핵심'],['past','지금까지의 흐름'],['present','현재의 조건'],['hidden','보이지 않는 변수'],['choice','선택의 기준'],['near','가까운 변화'],['advice','현실적인 조언']]}),
  flow('tarot-reunion','재회운 등대 타로',{featureKeys:['tarot-reunion-reading'],cardCount:5,resultKind:'reunion',inputLabel:'관계 회복에서 확인하고 싶은 점',positions:[['memory','남아 있는 감정'],['distance','지금의 거리'],['pattern','반복될 갈등'],['signal','다시 닿을 신호'],['message','나에게 필요한 태도']]}),
  flow('tarot-self-esteem','자기 기준 회복 타로',{access:'free-local',cardCount:5,resultKind:'self-esteem',inputLabel:'내 기준이 흔들리는 순간',positions:[['past_debuff','흔들림의 시작'],['inner_monster','거절 앞의 마음'],['current_damage','지금의 소모'],['mind_shield','나를 지키는 힘'],['levelup_mastery','오늘 다시 세울 기준']]}),
  flow('tarot-year-fortune','십이지신 천운 타로',{featureKeys:['tarot-year-fortune'],cardCount:12,resultKind:'year',inputLabel:'올해 특히 살펴보고 싶은 영역',positions:Array.from({length:12},(_,index)=>[`month_${index+1}`,`${index+1}월의 흐름`])}),
]);

const byId=new Map(TOSS_TAROT_LIBRARY_FLOWS.map(item=>[item.id,item]));
export function tossTarotLibraryFlow(id){return byId.get(id)||null;}
