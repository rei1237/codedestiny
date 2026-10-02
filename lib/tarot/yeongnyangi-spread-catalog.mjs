// Yeongnyangi tarot v3 spread catalog. Every spread answers one kind of question;
// each position asks its own question so no two cards repeat a role. Purchases
// snapshot the whole definition, so editing a spread here never rewrites a past
// reading — bump `version` whenever a position's wording or order changes.
//
// Sources: the 영냥이 spreads are original designs from question purpose. The
// three traditional spreads fix one published variant each (see source.note);
// no external creator's names, wording or diagrams are reproduced.

export const YEONGNYANGI_SPREAD_CATALOG_VERSION='yn-spreads-2026-10-02';
export const TAROT_TIER_ORDER=['mackerel','salmon','flounder','tuna'];
/** Card-count ceiling per fish tier (product decision 2026-10-02). Prices and entitlements are unchanged. */
export const TAROT_TIER_CARD_CAP={mackerel:5,salmon:7,flounder:9,tuna:10};
export function minTierFor(cardCount){return TAROT_TIER_ORDER.find(tier=>cardCount<=TAROT_TIER_CARD_CAP[tier])||null;}
export function tierAllowsSpread(fishId,spread){return Boolean(spread)&&TAROT_TIER_CARD_CAP[fishId]>=spread.cardCount;}

export const SPREAD_PURPOSES=['understand','compare','act','relation','period','overview'];
export const LAYOUT_KINDS=['single','line','knot','bridge','ab-compare','balance','cycle','timeline','orbit','horseshoe','celtic'];
export const LINK_RELATIONS=['compare','cause-response','expectation-constraint','center-outcome','sequence'];
const OUTCOME_LIMIT='현재 조건이 이어질 때의 방향으로만 읽는다. 사건·날짜·확률을 확정하지 않는다.';
const OTHER_LIMIT='드러난 말과 행동에 비춘 상징적 가설로만 읽는다. 상대의 실제 마음을 확인했다고 말하지 않는다.';

// rows: [id, label, question, role]; slots: [id, desktopCol, desktopRow, mobileCol, mobileRow]
function spread({id,title,topic,purpose,summary,targets,kind,rows,slots,links,inputs=[],symmetry,readOrder,source}){
 const positions=rows.map(([pid,label,question,role],i)=>({id:pid,label,question,role,drawOrder:i+1,
  readOrder:readOrder?readOrder.indexOf(pid)+1:i+1}));
 return {id,version:1,title,topic,purpose,summary,cardCount:positions.length,minTier:minTierFor(positions.length),
  positions,layout:{kind,slots:slots.map(([sid,dc,dr,mc,mr,extra])=>({id:sid,desktop:{col:dc,row:dr},mobile:{col:mc,row:mr},...(extra||{})}))},
  links:links.map(([ids,relation,note])=>({ids,relation,note})),
  ...(symmetry?{symmetry}:{}),
  appliesTo:{purposes:[purpose],targets},requiredInputs:inputs,reversalPolicy:'upright-reversed-even',
  source:source||{kind:'yeongnyangi-original',note:'영냥이 자체 설계. 질문 목적에서 위치 역할을 도출했다.'}};
}

const spreads=[
 spread({id:'yn_one_word',title:'지금 내게 필요한 한마디',topic:'self',purpose:'act',targets:['self'],kind:'single',
  summary:'오늘 의식적으로 골라 쓸 태도 하나를 살펴봐요.',
  rows:[['attitude','지금 선택할 태도','지금 어떤 태도를 골라 쓰면 좋을까?','질문 상황에서 사용자가 스스로 선택할 수 있는 태도. 예언이 아니라 실천할 자세로 읽는다.']],
  slots:[['attitude',1,1,1,1]],links:[]}),
 spread({id:'yn_knot_three',title:'막힌 상황을 푸는 실마리',topic:'self',purpose:'act',targets:['self','work','relation'],kind:'knot',
  summary:'막힌 매듭, 지금 쓸 수 있는 자원, 다음 한 걸음을 이어서 봐요.',
  rows:[
   ['knot','현재의 매듭','지금 무엇이 엉켜서 움직이지 않을까?','상황을 멈추게 하는 핵심 조건. 원인을 단정하지 않고 엉킨 지점을 묘사한다.'],
   ['resource','활용할 자원','이미 가진 것 중 무엇을 쓸 수 있을까?','사용자가 지금 꺼내 쓸 수 있는 강점·관계·도구.'],
   ['next_action','다음 행동','매듭을 풀기 위한 다음 한 걸음은?','자원을 매듭에 적용하는 구체적이고 작은 행동.'],
  ],slots:[['knot',2,1,2,1],['resource',1,2,1,2],['next_action',3,2,3,2]],
  links:[[['knot','resource'],'cause-response','매듭에 어떤 자원이 맞서는지'],[['resource','next_action'],'sequence','자원이 어떤 행동으로 이어지는지']]}),
 spread({id:'yn_contact_first',title:'먼저 연락해도 괜찮을까?',topic:'love',purpose:'act',targets:['relation'],kind:'bridge',inputs:['relationStatus'],
  summary:'연락하고 싶은 마음과 연락 이후의 흐름을 나누어, 내가 고를 행동을 살펴봐요.',
  rows:[
   ['my_wish','내가 바라는 것','연락으로 내가 정말 얻고 싶은 건 뭘까?','연락 욕구 밑에 있는 사용자의 바람.'],
   ['current_communication','현재 소통 양상','지금 두 사람의 소통은 어떤 모습일까?',`최근 실제 소통의 거리·속도·온도. ${OTHER_LIMIT}`],
   ['approach_barrier','접근의 걸림돌','다가가기 어렵게 만드는 건 뭘까?','연락을 망설이게 하거나 어렵게 하는 조건. 나와 상황 양쪽에서 본다.'],
   ['boundary','존중할 경계','어떤 선을 지켜야 서로 편할까?','사용자와 상대가 존중해야 할 경계. 거절·무응답·연락 거부 의사를 존중한다.'],
   ['if_contact','연락을 선택했을 때의 흐름','연락을 고른다면 어떤 흐름이 열릴까?',`한 번의 정중한 연락을 선택했을 때의 가능성. ${OUTCOME_LIMIT}`],
  ],slots:[['my_wish',1,1,1,1],['current_communication',3,1,3,1],['approach_barrier',2,1,2,1],['boundary',1,2,1,2],['if_contact',3,2,2,2]],
  links:[[['my_wish','boundary'],'expectation-constraint','바람과 지켜야 할 선이 어디서 부딪히는지'],[['current_communication','approach_barrier'],'cause-response','지금 소통 모습이 걸림돌과 어떻게 이어지는지'],[['approach_barrier','if_contact'],'center-outcome','걸림돌이 연락 이후 흐름에 남기는 조건']]}),
 spread({id:'yn_crossed_six',title:'우리 사이, 왜 엇갈릴까?',topic:'love',purpose:'relation',targets:['relation'],kind:'bridge',inputs:['relationStatus'],
  summary:'내 기대와 드러난 태도 사이에서 엇갈리는 지점과 조율할 부분을 살펴봐요.',
  rows:[
   ['my_expectation','내 기대','이 관계에서 나는 무엇을 기대하고 있을까?','사용자가 관계에 거는 기대와 바람.'],
   ['observed_attitude','드러난 태도의 해석','상대에게서 드러난 태도는 어떻게 읽힐까?',`상대가 보여 준 말·행동을 비추는 해석. ${OTHER_LIMIT}`],
   ['communication_style','소통 방식','두 사람은 어떤 방식으로 주고받을까?','표현 속도·방식·빈도의 차이.'],
   ['mismatch','엇갈리는 지점','어디에서 서로 엇갈릴까?','기대와 태도, 소통 방식이 어긋나는 구체적 지점.'],
   ['to_adjust','조율할 부분','무엇을 조율하면 덜 엇갈릴까?','사용자가 먼저 시도할 수 있는 조율.'],
   ['pattern_flow','패턴이 이어질 때의 흐름','지금 패턴이 이어지면 어디로 갈까?',OUTCOME_LIMIT],
  ],slots:[['my_expectation',1,1,1,1],['observed_attitude',3,1,3,1],['communication_style',2,1,2,1],['mismatch',2,2,2,2],['to_adjust',1,3,1,3],['pattern_flow',3,3,3,3]],
  symmetry:{a:['my_expectation'],b:['observed_attitude']},
  links:[[['my_expectation','observed_attitude'],'compare','같은 관계를 두 쪽에서 볼 때의 차이'],[['communication_style','mismatch'],'cause-response','소통 방식이 엇갈림을 만드는 방식'],[['mismatch','to_adjust'],'cause-response','엇갈림에 대한 조율'],[['mismatch','pattern_flow'],'center-outcome','엇갈림이 그대로일 때의 흐름']]}),
 spread({id:'yn_reunion_seven',title:'다시 만나면 달라질까?',topic:'love',purpose:'relation',targets:['relation'],kind:'timeline',inputs:['relationStatus'],
  summary:'남은 감정과 반복 위험, 다시 만나려면 충족돼야 할 조건을 차례로 살펴봐요.',
  rows:[
   ['remaining_feeling','남은 감정','지금 내 안에 남은 감정은 뭘까?','미련·그리움·아쉬움 등 사용자 쪽 감정.'],
   ['lesson','이별에서 배울 점','헤어짐이 나에게 알려 준 건 뭘까?','이별에서 얻을 수 있는 이해.'],
   ['repeat_risk','반복 위험','다시 만나면 같은 이유가 되풀이될까?','관계를 끝낸 이유가 다시 나타날 가능성과 그 조건.'],
   ['my_change','내 변화 과제','내가 바꿔야 할 건 뭘까?','사용자가 스스로 다룰 수 있는 변화.'],
   ['change_check','상대 변화를 확인할 지점','상대가 달라졌는지 무엇으로 확인할까?',`말이 아니라 행동으로 관찰할 확인 지점. ${OTHER_LIMIT}`],
   ['recontact_condition','재접촉의 조건','다시 닿으려면 어떤 조건이 필요할까?','서로의 동의와 경계를 전제로 한 재접촉 조건. 상대가 거부했다면 접촉을 권하지 않는다.'],
   ['if_met','조건이 충족될 때의 흐름','조건이 갖춰지면 어떤 흐름일까?',OUTCOME_LIMIT],
  ],slots:[['remaining_feeling',1,1,1,1],['lesson',2,1,2,1],['repeat_risk',3,1,3,1],['my_change',1,2,1,2],['change_check',2,2,2,2],['recontact_condition',3,2,3,2],['if_met',2,3,2,3]],
  links:[[['repeat_risk','my_change'],'cause-response','반복 위험에 맞서는 나의 변화'],[['change_check','recontact_condition'],'expectation-constraint','확인할 것과 재접촉 조건'],[['recontact_condition','if_met'],'sequence','조건에서 흐름으로'],[['remaining_feeling','lesson'],'compare','감정과 배움의 차이']]}),
 spread({id:'yn_new_bond_five',title:'새로운 인연을 맞이하는 문',topic:'love',purpose:'act',targets:['self','relation'],kind:'knot',
  summary:'새 인연을 만나기 위한 준비와 내려놓을 패턴, 넓혀 볼 행동을 살펴봐요.',
  rows:[
   ['readiness','현재 준비 상태','새로운 관계를 맞을 준비는 어느 정도일까?','감정·생활·시간 면에서 지금의 준비.'],
   ['charm','드러낼 매력','어떤 모습을 더 보여 주면 좋을까?','사용자가 자연스럽게 드러낼 강점.'],
   ['let_go','내려놓을 패턴','새 인연을 막는 익숙한 패턴은?','반복해서 기회를 닫는 습관이나 기준.'],
   ['widen','만남을 넓힐 행동','만남의 폭을 넓히려면 뭘 해 볼까?','구체적인 만남 확장 행동.'],
   ['begin_advice','관계를 시작할 때의 조언','관계가 시작될 때 무엇을 기억할까?','시작 단계에서 지킬 태도.'],
  ],slots:[['readiness',2,1,2,1],['charm',1,2,1,2],['let_go',3,2,3,2],['widen',1,3,1,3],['begin_advice',3,3,3,3]],
  links:[[['charm','let_go'],'expectation-constraint','드러낼 매력과 내려놓을 패턴의 대비'],[['readiness','widen'],'cause-response','준비 상태에 맞는 행동'],[['widen','begin_advice'],'sequence','만남에서 시작으로']]}),
 spread({id:'yn_deepen_seven',title:'관계를 더 깊게 이어가려면',topic:'love',purpose:'relation',targets:['relation'],kind:'bridge',
  summary:'두 사람의 필요와 현실적 마찰, 함께 합의할 것을 나란히 살펴봐요.',
  rows:[
   ['common_ground','공동의 기반','두 사람을 이어 주는 기반은 뭘까?','관계를 받치는 공통점과 신뢰.'],
   ['my_need','내 필요','나는 이 관계에서 무엇이 필요할까?','사용자의 필요.'],
   ['other_need_hypothesis','상대의 필요에 대한 가설','상대에게 필요한 건 무엇일 수 있을까?',`상대의 필요를 대화로 확인할 가설로 제시한다. ${OTHER_LIMIT}`],
   ['friction','현실적 마찰','생활 속에서 어떤 마찰이 생길까?','시간·돈·거리·습관 등 현실 조건의 마찰.'],
   ['conflict_response','갈등 대응','갈등이 생기면 어떻게 다루면 좋을까?','다툼을 다루는 방식과 개선점.'],
   ['agreement','함께 합의할 것','둘이 무엇을 정하면 좋을까?','대화로 합의할 구체적 항목.'],
   ['growth','관계의 성장 방향','관계는 어디로 자랄 수 있을까?',OUTCOME_LIMIT],
  ],slots:[['common_ground',2,1,2,1],['my_need',1,2,1,2],['other_need_hypothesis',3,2,3,2],['friction',2,2,2,2],['conflict_response',1,3,1,3],['agreement',3,3,3,3],['growth',2,3,2,4]],
  symmetry:{a:['my_need'],b:['other_need_hypothesis']},
  links:[[['my_need','other_need_hypothesis'],'compare','두 필요가 만나는 곳과 다른 곳'],[['friction','conflict_response'],'cause-response','마찰을 다루는 방식'],[['agreement','growth'],'sequence','합의에서 성장으로'],[['common_ground','growth'],'center-outcome','기반이 성장에 주는 힘']]}),
 spread({id:'yn_ab_seven',title:'A와 B, 무엇이 나에게 맞을까?',topic:'choice',purpose:'compare',targets:['options'],kind:'ab-compare',inputs:['options'],
  summary:'두 선택지를 같은 기준과 같은 자리 수로 나란히 비교해요.',
  rows:[
   ['criteria','선택 기준','이번 선택에서 나에게 가장 중요한 기준은?','두 선택지를 공정하게 재는 사용자의 기준.'],
   ['a_opportunity','A의 기회','A를 고르면 무엇이 열릴까?','선택지 A가 주는 가능성.'],
   ['a_burden','A의 부담','A를 고르면 무엇을 감당할까?','선택지 A의 비용·위험·부담.'],
   ['a_action','A에서 필요한 행동','A를 고른다면 무엇부터 할까?','A를 선택했을 때 필요한 준비와 행동.'],
   ['b_opportunity','B의 기회','B를 고르면 무엇이 열릴까?','선택지 B가 주는 가능성.'],
   ['b_burden','B의 부담','B를 고르면 무엇을 감당할까?','선택지 B의 비용·위험·부담.'],
   ['b_action','B에서 필요한 행동','B를 고른다면 무엇부터 할까?','B를 선택했을 때 필요한 준비와 행동.'],
  ],slots:[['criteria',2,1,2,1],['a_opportunity',1,2,1,2],['a_burden',1,3,1,3],['a_action',1,4,1,4],['b_opportunity',3,2,3,2],['b_burden',3,3,3,3],['b_action',3,4,3,4]],
  symmetry:{a:['a_opportunity','a_burden','a_action'],b:['b_opportunity','b_burden','b_action']},
  links:[[['a_opportunity','b_opportunity'],'compare','두 기회의 성격'],[['a_burden','b_burden'],'compare','두 부담의 무게'],[['a_action','b_action'],'compare','각 선택에 필요한 행동'],[['criteria','a_opportunity','b_opportunity'],'center-outcome','기준에 더 맞는 쪽']]}),
 spread({id:'yn_stay_leave_nine',title:'이직과 잔류, 두 길의 지도',topic:'work',purpose:'compare',targets:['work','options'],kind:'ab-compare',
  summary:'남는 길과 옮기는 길을 같은 네 가지 자리로 나란히 비교해요.',
  rows:[
   ['core_value','핵심 가치','일에서 지금 가장 지키고 싶은 가치는?','두 길을 같은 잣대로 비교할 사용자의 가치.'],
   ['stay_resource','잔류의 자원','남는다면 무엇을 활용할 수 있을까?','현재 자리에서 쓸 수 있는 자원.'],
   ['stay_constraint','잔류의 제약','남는다면 무엇이 발목을 잡을까?','현재 자리의 제약.'],
   ['stay_action','잔류 시 행동','남는다면 무엇을 바꿔 볼까?','잔류를 택할 때의 행동.'],
   ['stay_flow','잔류의 흐름','남는 길은 어디로 이어질까?',OUTCOME_LIMIT],
   ['leave_resource','이직의 자원','옮긴다면 무엇을 들고 갈 수 있을까?','이직에서 쓸 수 있는 자원.'],
   ['leave_constraint','이직의 제약','옮긴다면 무엇이 어려울까?','이직의 제약.'],
   ['leave_action','이직 시 행동','옮긴다면 무엇부터 준비할까?','이직을 택할 때의 행동.'],
   ['leave_flow','이직의 흐름','옮기는 길은 어디로 이어질까?',OUTCOME_LIMIT],
  ],slots:[['core_value',2,1,2,1],['stay_resource',1,2,1,2],['stay_constraint',1,3,1,3],['stay_action',1,4,1,4],['stay_flow',1,5,1,5],['leave_resource',3,2,3,2],['leave_constraint',3,3,3,3],['leave_action',3,4,3,4],['leave_flow',3,5,3,5]],
  symmetry:{a:['stay_resource','stay_constraint','stay_action','stay_flow'],b:['leave_resource','leave_constraint','leave_action','leave_flow']},
  links:[[['stay_resource','leave_resource'],'compare','두 길의 자원'],[['stay_constraint','leave_constraint'],'compare','두 길의 제약'],[['stay_action','leave_action'],'compare','두 길에 필요한 행동'],[['stay_flow','leave_flow'],'compare','두 길의 흐름'],[['core_value','stay_flow','leave_flow'],'center-outcome','핵심 가치에 더 가까운 길']]}),
 spread({id:'yn_work_block_six',title:'내 일은 어디에서 막힐까?',topic:'work',purpose:'understand',targets:['work'],kind:'knot',
  summary:'일하는 방식 안의 장애와 바깥 제약을 나누고, 작은 실험을 찾아봐요.',
  rows:[
   ['current_method','현재 방식','나는 지금 어떤 방식으로 일하고 있을까?','현재 업무 방식과 리듬.'],
   ['strength','살릴 강점','더 살려야 할 강점은?','이미 작동하는 강점.'],
   ['inner_block','내부 장애','내 안에서 막히는 지점은?','습관·두려움·기준 등 내부 요인.'],
   ['outer_constraint','외부 제약','바깥에서 막는 조건은?','조직·시장·사람 등 외부 요인.'],
   ['small_experiment','작은 실험','부담 없이 시도할 실험은?','2주 안에 해 볼 수 있는 작은 변화.'],
   ['check_change','점검할 변화','무엇이 달라졌는지 어떻게 확인할까?','실험 뒤 확인할 신호와 기준.'],
  ],slots:[['current_method',2,1,2,1],['strength',1,2,1,2],['inner_block',2,2,2,2],['outer_constraint',3,2,3,2],['small_experiment',1,3,1,3],['check_change',3,3,3,3]],
  symmetry:{a:['inner_block'],b:['outer_constraint']},
  links:[[['inner_block','outer_constraint'],'compare','안과 밖 중 어디가 더 큰 장애인지'],[['strength','small_experiment'],'cause-response','강점을 쓰는 실험'],[['small_experiment','check_change'],'sequence','실험에서 점검으로']]}),
 spread({id:'yn_money_pattern_five',title:'돈을 대하는 내 패턴',topic:'money',purpose:'understand',targets:['self'],kind:'knot',
  summary:'돈에 대한 태도와 새는 패턴, 실천할 습관을 살펴봐요.',
  rows:[
   ['attitude','현재 태도','나는 돈을 어떻게 대하고 있을까?','돈에 대한 감정과 태도.'],
   ['resource_use','자원 활용','가진 자원을 어떻게 쓰고 있을까?','수입·시간·능력 등 자원을 쓰는 방식.'],
   ['drain_pattern','소모 패턴','어디로 새고 있을까?','반복되는 소모·지출 패턴.'],
   ['missed_task','놓친 관리 과제','미뤄 둔 관리 과제는?','확인하지 않은 기록·계약·예산 등 관리 과제.'],
   ['habit','실천할 습관','이번에 들일 습관 하나는?','작고 구체적인 돈 습관. 투자 수익을 예언하지 않는다.'],
  ],slots:[['attitude',2,1,2,1],['resource_use',1,2,1,2],['drain_pattern',3,2,3,2],['missed_task',1,3,1,3],['habit',3,3,3,3]],
  links:[[['resource_use','drain_pattern'],'compare','쓰는 방식과 새는 방식의 차이'],[['attitude','drain_pattern'],'cause-response','태도가 소모로 이어지는 고리'],[['missed_task','habit'],'sequence','미룬 과제를 습관으로']]}),
 spread({id:'yn_offer_six',title:'이 제안, 받아도 괜찮을까?',topic:'work',purpose:'act',targets:['work','options'],kind:'balance',
  summary:'끌리는 이유와 기대 이익·부담을 저울질하고, 확인하고 협의할 조건을 정리해요.',
  rows:[
   ['pull','끌리는 이유','이 제안이 왜 끌릴까?','제안에 마음이 가는 이유.'],
   ['expected_gain','기대 이익','받으면 무엇을 얻을까?','현실적으로 기대할 이익.'],
   ['burden','감당할 부담','받으면 무엇을 감당해야 할까?','시간·책임·위험 등 부담.'],
   ['to_verify','추가 확인 사항','결정 전에 무엇을 확인할까?','계약·조건·사람 등 확인할 정보.'],
   ['to_negotiate','협의할 조건','무엇을 협의하면 좋을까?','조정을 요청할 조건.'],
   ['if_met','조건 충족 시 방향','조건이 맞으면 어디로 갈까?',OUTCOME_LIMIT],
  ],slots:[['pull',2,1,2,1],['expected_gain',1,2,1,2],['burden',3,2,3,2],['to_verify',1,3,1,3],['to_negotiate',3,3,3,3],['if_met',2,4,2,4]],
  symmetry:{a:['expected_gain'],b:['burden']},
  links:[[['expected_gain','burden'],'compare','이익과 부담의 무게'],[['to_verify','to_negotiate'],'sequence','확인에서 협의로'],[['to_negotiate','if_met'],'center-outcome','협의 결과에 따른 방향'],[['pull','expected_gain'],'expectation-constraint','끌림과 실제 이익의 차이']]}),
 spread({id:'yn_repeat_pattern_six',title:'나는 왜 같은 관계를 반복할까?',topic:'self',purpose:'understand',targets:['self','relation'],kind:'cycle',
  summary:'반복되는 장면과 그 밑의 욕구, 다른 반응을 연습할 자리를 살펴봐요.',
  rows:[
   ['scene','반복 장면','어떤 장면이 되풀이될까?','관계에서 반복되는 상황.'],
   ['reaction','그때의 반응','그 장면에서 나는 어떻게 반응할까?','사용자의 익숙한 반응.'],
   ['need','지키려는 욕구','그 반응으로 무엇을 지키려 할까?','반응 밑의 욕구.'],
   ['cost','반응의 대가','그 반응이 남기는 대가는?','반응이 반복될 때의 대가.'],
   ['alternative','대안 행동','다르게 반응한다면?','같은 욕구를 지키는 다른 행동.'],
   ['boundary_practice','연습할 경계','어떤 경계를 연습할까?','일상에서 연습할 경계.'],
  ],slots:[['scene',2,1,2,1],['reaction',3,2,3,2],['need',2,3,2,3],['cost',1,2,1,2],['alternative',1,4,1,4],['boundary_practice',3,4,3,4]],
  links:[[['scene','reaction'],'cause-response','장면이 반응을 부르는 고리'],[['need','cost'],'expectation-constraint','지키려는 것과 잃는 것'],[['alternative','boundary_practice'],'sequence','대안에서 경계 연습으로']]}),
 spread({id:'yn_recovery_four',title:'지친 마음에 필요한 회복',topic:'healing',purpose:'act',targets:['self'],kind:'knot',
  summary:'나를 지치게 하는 것과 쉬어도 되는 것, 기댈 자원을 살펴봐요.',
  rows:[
   ['drain','소모 요인','무엇이 나를 지치게 할까?','에너지를 빼앗는 요인.'],
   ['may_rest','쉬어도 되는 부분','무엇은 내려놓아도 될까?','잠시 멈춰도 되는 일과 기준.'],
   ['support','도움 자원','누구와 무엇에 기댈 수 있을까?','사람·공간·도움 자원. 위기 신호가 있으면 전문 도움을 우선 안내한다.'],
   ['small_step','작은 회복 행동','오늘 할 수 있는 작은 회복은?','하루 안에 할 수 있는 회복 행동.'],
  ],slots:[['drain',1,1,1,1],['may_rest',2,1,2,1],['support',1,2,1,2],['small_step',2,2,2,2]],
  links:[[['drain','may_rest'],'expectation-constraint','지치게 하는 것과 내려놓을 것'],[['support','small_step'],'sequence','자원에서 행동으로']]}),
 spread({id:'yn_month_compass_six',title:'앞으로 한 달의 나침반',topic:'self',purpose:'period',targets:['self','work','relation'],kind:'timeline',inputs:['period'],
  summary:'한 달의 주제와 주차별 초점을 순서대로 짚어 봐요. 사건을 예언하지 않아요.',
  rows:[
   ['theme','한 달의 주제','이번 한 달을 꿰는 주제는?','기간 전체의 상징적 주제.'],
   ['week1','1주 차 초점','첫 주에는 무엇에 힘을 쓸까?','1주 차에 의식할 초점. 사건을 예고하지 않는다.'],
   ['week2','2주 차 초점','둘째 주에는?','2주 차에 의식할 초점.'],
   ['week3','3주 차 초점','셋째 주에는?','3주 차에 의식할 초점.'],
   ['week4','4주 차 초점','넷째 주에는?','4주 차에 의식할 초점.'],
   ['practice','전체 실천 조언','한 달 내내 지킬 실천은?','기간 전체에 걸친 실천 조언.'],
  ],slots:[['theme',1,1,1,1],['week1',2,1,1,2],['week2',3,1,2,2],['week3',4,1,1,3],['week4',5,1,2,3],['practice',3,2,1,4,{span:2}]],
  links:[[['week1','week2','week3','week4'],'sequence','주차가 이어지는 흐름'],[['theme','practice'],'center-outcome','주제와 실천의 연결']]}),
 spread({id:'yn_whole_map_ten',title:'복잡한 고민의 전체 지도',topic:'self',purpose:'overview',targets:['self','work','relation','options'],kind:'orbit',
  summary:'고민의 중심과 주변 요인, 내 자원과 바깥 조건을 한 장의 지도로 펼쳐요.',
  rows:[
   ['now','현재','지금 상황은 어떤 모습일까?','현재 상황의 전체 분위기.'],
   ['core_conflict','핵심 갈등','가장 크게 부딪히는 것은?','고민의 중심에서 충돌하는 두 힘.'],
   ['background','배경','이 고민은 어디서 시작됐을까?','고민을 만든 바탕과 이전 경험.'],
   ['want','원하는 것','나는 진짜 무엇을 원할까?','사용자의 바람.'],
   ['overlooked','외면한 요소','보지 않으려 한 것은?','놓치거나 피한 요인.'],
   ['my_resource','내 자원','내가 가진 힘은?','사용자의 자원.'],
   ['outer_condition','외부 조건','바깥 조건은 어떨까?','환경·사람·제도 등 외부 조건.'],
   ['alternative_action','대안 행동','시도할 수 있는 다른 행동은?','지금과 다른 선택지.'],
   ['near_change','가까운 변화','가까이 다가오는 변화는?',`가까운 변화의 방향. ${OUTCOME_LIMIT}`],
   ['overall','종합 방향','전체를 종합하면 어디로 갈까?','모든 자리를 종합한 방향과 조건.'],
  ],slots:[['now',2,2,2,2],['core_conflict',2,1,2,1],['background',1,3,1,3],['want',1,1,1,1],['overlooked',3,1,3,1],['my_resource',1,2,1,2],['outer_condition',3,2,3,2],['alternative_action',2,3,2,3],['near_change',3,3,3,3],['overall',2,4,2,4]],
  symmetry:{a:['want','my_resource'],b:['overlooked','outer_condition']},
  links:[[['now','core_conflict'],'center-outcome','중심 상황과 갈등'],[['want','overlooked'],'compare','원하는 것과 외면한 것'],[['my_resource','outer_condition'],'compare','안의 힘과 바깥 조건'],[['alternative_action','near_change','overall'],'sequence','행동에서 변화와 종합으로'],[['background','core_conflict'],'cause-response','배경이 갈등을 만든 방식']]}),
 spread({id:'trad_past_present_future',title:'과거·현재·미래',topic:'self',purpose:'understand',targets:['self','relation','work'],kind:'line',
  summary:'지나온 흐름, 지금, 가까운 흐름을 시간 순서로 읽는 전통 배열이에요.',
  source:{kind:'traditional',note:'전통 3장 배열. 위치 정의: 과거(지나온 영향) / 현재(지금의 상황) / 미래(현재 흐름이 이어질 때의 가까운 방향). 읽는 순서 1→2→3.'},
  rows:[
   ['past','과거','지금에 영향을 준 지나온 흐름은?','이미 지나갔지만 영향을 남긴 흐름.'],
   ['present','현재','지금은 어떤 상황일까?','현재의 핵심 상황.'],
   ['future','미래','이대로라면 어디로 갈까?',OUTCOME_LIMIT],
  ],slots:[['past',1,1,1,1],['present',2,1,2,1],['future',3,1,3,1]],
  links:[[['past','present','future'],'sequence','시간의 흐름']]}),
 spread({id:'trad_horseshoe_seven',title:'말발굽 배열',topic:'self',purpose:'overview',targets:['self','relation','work'],kind:'horseshoe',
  summary:'과거에서 결과까지 일곱 자리를 말발굽 모양으로 읽는 전통 배열이에요.',
  source:{kind:'traditional',note:'전통 7장 말발굽 배열의 한 변형을 고정: 과거 / 현재 / 숨은 영향 / 장애 / 주변 영향 / 조언 / 결과. 왼쪽 아래에서 시작해 오른쪽 아래로 1→7 순서로 읽는다.'},
  rows:[
   ['past','과거','지금에 영향을 준 과거는?','지나온 영향.'],
   ['present','현재','지금은 어떤 상황일까?','현재 상황.'],
   ['hidden_influence','숨은 영향','보이지 않게 작용하는 것은?','드러나지 않은 요인. 제3자나 사건을 지어내지 않는다.'],
   ['obstacle','장애','무엇이 가로막을까?','주요 장애.'],
   ['surroundings','주변 영향','주변은 어떻게 작용할까?','환경과 주변 사람의 영향.'],
   ['advice','조언','무엇을 하면 좋을까?','취할 행동.'],
   ['outcome','결과','이대로라면 어디로 갈까?',OUTCOME_LIMIT],
  ],slots:[['past',1,3,1,3],['present',2,2,1,2],['hidden_influence',3,1,1,1],['obstacle',4,1,2,1],['surroundings',5,1,3,1],['advice',6,2,3,2],['outcome',7,3,3,3]],
  links:[[['obstacle','advice'],'cause-response','장애에 대한 조언'],[['present','outcome'],'center-outcome','현재에서 결과로'],[['hidden_influence','surroundings'],'compare','안 보이는 영향과 주변 영향']]}),
 spread({id:'trad_celtic_cross_ten',title:'켈틱 크로스',topic:'self',purpose:'overview',targets:['self','relation','work'],kind:'celtic',
  summary:'상황의 중심·위아래·앞뒤와 나·주변·바람·결과를 열 자리로 읽는 전통 배열이에요.',
  source:{kind:'traditional',note:'A. E. Waite, The Pictorial Key to the Tarot(1911)의 순서를 고정: 1 현재(덮는 카드) / 2 가로지르는 도전 / 3 위: 의식하는 목표 / 4 아래: 바탕 / 5 뒤: 막 지나간 영향 / 6 앞: 다가오는 영향 / 7 나의 태도 / 8 주변 환경 / 9 바람과 두려움 / 10 결과. 읽는 순서 1→10. 다른 변형(3·5·6 자리 배치)은 채택하지 않는다.'},
  rows:[
   ['present','현재','지금 상황의 중심은?','상황의 중심 분위기.'],
   ['crossing','가로지르는 도전','무엇이 가로막거나 시험할까?','현재를 가로지르는 도전. 긍정 카드도 도전의 형태로 읽는다.'],
   ['crown','의식하는 목표','내가 의식적으로 바라는 최선은?','의식 차원의 목표와 이상.'],
   ['foundation','바탕','이 상황의 뿌리는?','상황 밑에 깔린 바탕.'],
   ['recent_past','막 지나간 영향','방금 지나간 영향은?','물러가는 영향.'],
   ['near_future','다가오는 영향','가까이 다가오는 영향은?',`다가오는 영향의 성격. ${OUTCOME_LIMIT}`],
   ['self','나의 태도','나는 이 상황에 어떤 태도로 서 있을까?','사용자의 태도.'],
   ['environment','주변 환경','주변은 어떻게 작용할까?','주변 사람과 환경의 영향.'],
   ['hopes_fears','바람과 두려움','무엇을 바라고 두려워할까?','바람과 두려움이 섞인 마음.'],
   ['outcome','결과','이대로라면 어디로 갈까?',OUTCOME_LIMIT],
  ],slots:[['present',2,2,2,2],['crossing',2,2,2,2,{cross:true}],['crown',2,1,2,1],['foundation',2,3,2,3],['recent_past',1,2,1,2],['near_future',3,2,3,2],['self',4,4,4,4],['environment',4,3,4,3],['hopes_fears',4,2,4,2],['outcome',4,1,4,1]],
  links:[[['present','crossing'],'center-outcome','중심과 도전의 긴장'],[['crown','foundation'],'compare','의식하는 목표와 바탕의 차이'],[['recent_past','near_future'],'sequence','지나간 영향에서 다가오는 영향으로'],[['self','environment'],'compare','나와 주변'],[['hopes_fears','outcome'],'expectation-constraint','바람·두려움과 결과의 관계'],[['near_future','outcome'],'sequence','가까운 영향이 결과로 이어지는 길']]}),
];

export function validateSpread(s){
 const errors=[];
 const ids=s.positions.map(p=>p.id),set=new Set(ids);
 if(s.cardCount!==s.positions.length)errors.push('cardCount');
 if(set.size!==ids.length)errors.push('duplicate position id');
 for(const key of ['drawOrder','readOrder']){
  const orders=s.positions.map(p=>p[key]).sort((a,b)=>a-b);
  if(orders.some((n,i)=>n!==i+1))errors.push(`${key} not a permutation`);
 }
 if(!SPREAD_PURPOSES.includes(s.purpose))errors.push('purpose');
 if(!LAYOUT_KINDS.includes(s.layout.kind))errors.push('layout kind');
 const slotIds=s.layout.slots.map(x=>x.id);
 if(slotIds.length!==ids.length||!slotIds.every(id=>set.has(id))||new Set(slotIds).size!==slotIds.length)errors.push('layout slots');
 const mobileCols=s.layout.kind==='celtic'?4:3; // celtic keeps its upright staff beside the cross (smaller mobile cell)
 for(const slot of s.layout.slots)if(slot.mobile.col>mobileCols)errors.push(`mobile col ${slot.id}`);
 for(const view of ['desktop','mobile']){
  const cells=s.layout.slots.filter(x=>!x.cross).map(x=>`${x[view].col}:${x[view].row}`);
  if(new Set(cells).size!==cells.length)errors.push(`${view} slots overlap`);
 }
 for(const link of s.links){
  if(!LINK_RELATIONS.includes(link.relation))errors.push('link relation');
  if(link.ids.length<2||!link.ids.every(id=>set.has(id)))errors.push(`link ids ${link.ids}`);
 }
 if(s.cardCount>=3&&!s.links.length)errors.push('3+ cards need links');
 if(s.symmetry){
  const {a,b}=s.symmetry;
  if(a.length!==b.length||![...a,...b].every(id=>set.has(id)))errors.push('symmetry');
 }
 for(const p of s.positions)if(!p.label||!p.question||!p.role)errors.push(`position text ${p.id}`);
 if(s.minTier!==minTierFor(s.cardCount)||!s.minTier)errors.push('minTier');
 return errors;
}

function deepFreeze(value){
 if(value&&typeof value==='object'){Object.freeze(value);for(const v of Object.values(value))deepFreeze(v);}
 return value;
}
// Fail-closed: a malformed spread must never reach a purchase.
for(const s of spreads){const errors=validateSpread(s);if(errors.length)throw new Error(`Invalid tarot spread ${s.id}: ${errors.join(', ')}`);}
if(new Set(spreads.map(s=>s.id)).size!==spreads.length)throw new Error('Duplicate tarot spread id');

export const yeongnyangiSpreads=deepFreeze(spreads);
export function getYeongnyangiSpread(id){return typeof id==='string'?yeongnyangiSpreads.find(s=>s.id===id):undefined;}
/** Purchases store this copy; later catalog edits never change a saved reading. */
export function spreadSnapshot(spread){return structuredClone(spread);}
