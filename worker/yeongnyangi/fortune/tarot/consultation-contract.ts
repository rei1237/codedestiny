import {getSpreadDefinition} from '../../../../lib/tarot/spreads.mjs';
import {yeongnyangiConsultationSpreads} from '../../../../lib/tarot/yeongnyangi-consultation-spreads.mjs';
import {relationshipSpread} from '../../../../lib/tarot/yeongnyangi-relationship-spread.mjs';
import {FortuneError} from '../shared/contracts';

export const TAROT_CONSULTATION_VERSION='yeongnyangi-tarot-consultation-v2';
export const tarotConsultations={
 choice:{label:'지금의 선택',spreadId:'three_card_cause_process_outcome',questionType:'general',topic:'general',koOnly:false,prompt:'지금 어떤 선택을 고민하고 있나요?'},
 love:{label:'사랑과 관계',spreadId:'relationship_six_card',questionType:'relationship',topic:'love',koOnly:false,prompt:'두 사람 사이에서 이해하고 싶은 장면을 알려 주세요.'},
 feelings:{label:'그 사람 마음',spreadId:'mindscan_five_card',questionType:'exMind',topic:'love',koOnly:true,prompt:'상대의 어떤 말이나 행동이 마음에 남았나요?'},
 contact:{label:'연락의 흐름',spreadId:'yeongnyangi_contact_five',questionType:'relationship',topic:'love',koOnly:true,prompt:'마지막 소통과 지금 고민하는 행동을 알려 주세요.'},
 reunion:{label:'재회와 관계 회복',spreadId:'reunion_lighthouse_five_card',questionType:'reunion',topic:'love',koOnly:true,prompt:'관계가 멀어진 이유와 다시 확인하고 싶은 점은 무엇인가요?'},
 compatibility:{label:'두 사람 궁합',spreadId:'yeongnyangi_compatibility_six',questionType:'relationship',topic:'relationship',koOnly:true,prompt:'함께 이어가고 싶은 관계와 조율할 점을 알려 주세요.'},
 career:{label:'일과 진로',spreadId:'job_change_seven_card',questionType:'career',topic:'work',koOnly:true,prompt:'지금의 일과 생각 중인 변화는 무엇인가요?'},
 money:{label:'돈과 생활',spreadId:'yeongnyangi_money_five',questionType:'money',topic:'money',koOnly:true,prompt:'수입·지출·생활에서 바꾸고 싶은 습관을 알려 주세요.'},
 healing:{label:'마음 회복',spreadId:'healing_rising_four_card',questionType:'currentMind',topic:'general',koOnly:true,prompt:'요즘 마음을 지치게 하는 일과 필요한 도움은 무엇인가요?'},
} as const;
export type TarotConsultationId=keyof typeof tarotConsultations;
export function tarotConsultation(id:unknown){
 return typeof id==='string'&&Object.hasOwn(tarotConsultations,id)?tarotConsultations[id as TarotConsultationId]:undefined;
}
export function tarotConsultationSpread(id:TarotConsultationId){
 const spec=tarotConsultations[id];
 const source=spec.spreadId===relationshipSpread.id?relationshipSpread:
  yeongnyangiConsultationSpreads[spec.spreadId as keyof typeof yeongnyangiConsultationSpreads]||getSpreadDefinition(spec.spreadId);
 if(!source)throw new FortuneError('UNSUPPORTED_SPREAD');
 // Interpretive wording belongs to this version, never to a legacy shared spread.
 return {...source,questionType:spec.questionType,positions:source.positions.map((p:any)=>({...p,
  ...(id==='feelings'&&p.key==='hidden'?{label:'감정의 경향',role:'겉으로 드러나지 않은 감정의 상징적 가능성; 실제 속마음의 확인이 아니다'}:{}),
  readingFocus:'자리의 질문에 카드 상징으로 답하고 현실에서 확인할 조건을 구분한다. 실제 마음·사건·날짜를 확정하지 않는다.',
 }))};
}
export const tarotInterpretationRules=[
 '질문에 대한 답을 먼저 말하고 카드의 자리·상징·정역방향·질문 맥락을 연결한다.',
 '모든 선택 카드를 읽되 각 장에 배정된 논점만 자세히 해석한다. 같은 결론과 사례로 장수를 채우지 않는다.',
 '역방향을 단순한 반대로 만들지 않는다. 제공된 의미에 맞는 지연·내면화·과잉·막힘을 조건과 함께 설명한다.',
 '원소·숫자·메이저·궁정 카드와 조합은 실제 배열의 근거만 사용한다. 도상·시선은 기록된 것만 읽는다.',
 '상대의 실제 마음, 확정된 연락 날짜, 성공 확률, 투자 수익을 만들지 않는다. 거절과 무응답을 존중한다.',
 '따뜻하고 차분한 영냥이 상담 문체로 근거·다른 가능성·관찰 신호·사용자가 선택할 행동을 구분한다.',
].join(' ');
