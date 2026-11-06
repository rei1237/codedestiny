export function tossPsychotestMeta(meta){
 if(meta.id==='psycho')return {...meta,name:'공감과 선택 돌아보기',desc:'20개의 질문으로 살펴보는 나의 공감과 선택 습관'};
 if(meta.id==='narcissist')return {...meta,name:'나와 관계 돌아보기',desc:'나와 타인을 대하는 나의 태도를 살펴봐요'};
 if(meta.id==='mental')return {...meta,desc:'일상 속 선택을 재미있게 돌아봐요'};
 if(meta.id==='pastlife')return {...meta,desc:'선택한 답변으로 상상 속 전생 이야기를 만나봐요'};
 if(meta.id==='office')return {...meta,desc:'나의 K-직장인 생존 유형 이야기'};
 return meta;
}
const tResults={
 TIER_04:{title:'공감에 귀 기울이는 T',subtitle:'상황과 마음을 함께 살펴요',desc:'답변에서는 관계의 감정과 맥락에 귀를 기울이는 선택이 자주 보였어요. 논리와 공감은 상황에 따라 함께 사용할 수 있어요.'},
 TIER_03:{title:'균형을 찾는 T',subtitle:'생각과 공감을 함께 살펴요',desc:'답변에서는 논리적인 판단과 공감을 함께 고려하는 선택이 보였어요. 상대에게 필요한 대화의 방식을 먼저 물어보는 것도 좋아요.'},
 TIER_02:{title:'분석을 선호하는 T',subtitle:'상황을 차분히 정리해요',desc:'답변에서는 해결 방법을 생각하는 선택이 자주 보였어요. 조언하기 전 상대의 감정을 한 번 더 살피면 대화가 부드러워질 수 있어요.'},
 TIER_01:{title:'논리에 집중하는 T',subtitle:'근거와 해결 방법을 살펴요',desc:'답변에서는 근거와 해결 방법을 중시하는 선택이 많았어요. 상대가 공감을 원하는지 조언을 원하는지 먼저 확인해 보세요.'},
};
export function tossPsychotestResult(id,result){
 if(!result||typeof result!=='object')return result;
 if(id==='ttest')return {...result,...(tResults[result.tier]||{})};
 if(id==='hsp')return {...result,...(hspResults[result.tier]||{})};
 if(id==='thriller')return {...result,...(thrillerResults[result.role]||{})};
 if(id==='mental')return {...result,traits:[],desc:result.desc+' 이 결과는 실제 나이를 측정하지 않는 재미용 해석이에요.'};
 if(id==='mentalfit')return {...result,name:'마음의 회복을 돌아보기',badge:'마음의 흐름 살펴보기',traits:[],desc:'선택한 답변을 바탕으로, 힘든 상황 뒤에 자신에게 필요한 휴식과 도움을 돌아보세요. 이 결과는 심리 상태를 진단하지 않아요.'};
 if(id==='mbti'&&typeof result.desc==='string')return {...result,desc:result.desc.replaceAll('반드시 지키며','소중히 여기며').replaceAll('반드시 완수하는','끝까지 해내려는')};
 if(id==='tci'&&typeof result.plan==='string')return {...result,plan:result.plan.replace('반드시 성공할 수 있는 작은 목표부터','실천할 수 있는 작은 목표부터')};
 return result;
}
const hspResults={
 LOW:{desc:'답변에서는 주변 자극을 비교적 편안하게 받아들이는 선택이 보였어요. 컨디션과 환경에 따라 느끼는 정도는 달라질 수 있어요.',prescription:'편안함을 느끼는 환경과 회복에 도움이 되는 시간을 살펴보세요.'},
 MEDIUM:{desc:'답변에서는 주변 자극을 세심하게 살피는 선택이 보였어요. 집중한 뒤에는 스스로에게 쉬는 시간을 주어도 좋아요.',prescription:'소음이나 일정이 부담스럽다면 잠시 자극을 줄이고 편한 방식으로 쉬어 보세요.'},
 HIGH:{desc:'답변에서는 감각과 주변 분위기를 세심하게 느끼는 선택이 많았어요. 이 결과는 성향을 확정하거나 진단하지 않아요.',prescription:'자극이 많은 날에는 자신에게 편안한 공간과 휴식 시간을 마련해 보세요.'},
};
const thrillerResults={
 logic:{name:'[차분한 설계자]',desc:'스릴러 이야기 속에서 단서를 정리하고 가능성을 살피는 인물에 가까워요. 선택의 근거를 차근차근 모으는 장면이 어울려요.'},
 instinct:{name:'[움직이는 추적자]',desc:'스릴러 이야기 속에서 빠르게 움직이며 실마리를 찾는 인물에 가까워요. 실제 위험 상황에서는 안전을 확보하고 도움을 요청하는 것도 중요해요.'},
 survival:{name:'[신중한 목격자]',desc:'스릴러 이야기 속에서 주변을 살피고 상황을 관찰하는 인물에 가까워요. 작은 단서를 놓치지 않는 장면이 어울려요.'},
 mixed:{name:'[예상 밖의 주인공]',desc:'스릴러 이야기 속 예상치 못한 상황에서 자신만의 방법을 찾는 인물에 가까워요. 변화에 맞춰 선택지를 살피는 장면이 어울려요.'},
 mystery:{name:'[반전의 주인공]',desc:'스릴러 이야기 속 여러 가능성을 열어 두는 인물에 가까워요. 사건을 다른 시선으로 바라보는 장면이 어울려요.'},
};
const pastLifeResults={
 F:{title:'상상 속 전사',desc:'용기를 내어 앞으로 나아가는 전사의 이야기가 떠올라요. 어려운 선택 앞에서 자신이 중요하게 여기는 것을 살펴보세요.'},
 S:{title:'상상 속 학자',desc:'질문을 따라 지식을 쌓아 가는 학자의 이야기가 떠올라요. 궁금한 주제를 천천히 탐색하는 시간을 가져보세요.'},
 A:{title:'상상 속 예술가',desc:'느낌과 생각을 자신만의 방식으로 표현하는 예술가의 이야기가 떠올라요. 마음에 남은 장면을 자유롭게 표현해 보세요.'},
 M:{title:'상상 속 상인',desc:'사람과 물건을 연결하며 길을 찾는 상인의 이야기가 떠올라요. 새로운 만남에서 나눌 수 있는 가치를 살펴보세요.'},
 H:{title:'상상 속 치유사',desc:'주변의 이야기에 귀 기울이는 치유사의 장면이 떠올라요. 다른 사람을 돌보는 만큼 자신의 휴식도 챙겨 보세요.'},
 N:{title:'상상 속 귀족',desc:'사람들과 조화를 이루는 궁정의 이야기가 떠올라요. 취향과 관계에서 자신이 소중하게 여기는 것을 생각해 보세요.'},
};
export function tossChihuahuaResult(score){
 if(score>=75)return {title:'뜨거운 불꽃 치와와',badge:'🔥 마음의 열기가 큰 순간',desc:'답변에서는 감정이 빠르게 올라오는 순간에 공감하는 선택이 많았어요. 반응하기 전 잠시 숨을 고르면 원하는 뜻을 더 차분히 전할 수 있어요.'};
 if(score>=50)return {title:'표현을 살피는 치와와',badge:'💼 상황을 읽는 순간',desc:'답변에서는 감정을 느끼면서도 상황에 맞게 표현하려는 선택이 보였어요. 속마음을 쌓아 두지 않도록 편안한 방식으로 말해 보세요.'};
 if(score>=25)return {title:'신중한 치와와',badge:'🌟 마음을 살피는 순간',desc:'답변에서는 곧바로 반응하기보다 상황을 살피는 선택이 보였어요. 필요할 때는 자신의 경계를 차분히 알려도 좋아요.'};
 return {title:'차분한 치와와',badge:'🎋 여유를 찾는 순간',desc:'답변에서는 차분함을 선호하는 선택이 보였어요. 불편한 상황에서도 자신의 마음을 작은 말부터 표현해 보세요.'};
}
export function tossPastLifeResult(result,winner){return {...result,...(pastLifeResults[winner]||{}),talent:'이야기에서 마음에 남는 강점이 무엇인지 떠올려 보세요.',desc:(pastLifeResults[winner]?.desc||'선택한 답변으로 상상 속 이야기를 살펴보세요.')+' 실제 전생을 판별하는 결과는 아니에요.'};}
