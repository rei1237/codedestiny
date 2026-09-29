import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';

export type FortuneCopy = {
 cardTitle:string;
 hook:string;
 description:string;
 detail:string;
 method:string;
 example:string;
 limit:string;
};

type FortuneCopyLocale = {
 domains:Record<DomainId,FortuneCopy>;
 consultationKinds:Record<'compatibility',FortuneCopy>;
};

// Editorial copy, not a diagnosis or outcome guarantee. Keep this as the Korean
// source of truth so cards, product guides, and consultation selection stay aligned.
export const fortuneCopyByLocale:Record<'ko',FortuneCopyLocale>={
 ko:{
  domains:{
   saju:{
    cardTitle:'네 기질의 네 기둥',
    hook:'왜 나는 같은 선택을 반복할까?',
    description:'태어난 해·달·날·시 네 기둥으로 타고난 기질과 인생의 흐름을 읽는 전통 명리학입니다.',
    detail:'오행과 십성의 관계를 따라, 지금 내 운이 어디에서 막히고 어디서 열리는지 살펴봅니다. 단정적인 예언보다 반복되는 선택과 현실적인 다음 행동에 초점을 둡니다.',
    method:'태어난 날의 나를 뜻하는 일간, 오행의 균형, 십성의 관계를 연결해 기질과 선택 습관을 읽어요.',
    example:'시작하는 힘이 강하게 읽히더라도 끝맺음까지 저절로 따라오는 것은 아니에요. 일을 더 벌이기 전에, 이번 주 마칠 한 가지를 정해 보는 식으로 강점을 써볼 수 있어요.',
    limit:'출생시간을 모르면 시주와 정확한 대운 시작 시점은 단정하지 않아요. 기본 구성은 기질·재능·관계 중심이며, 대운 심층 해석은 심화 구성에서 다뤄요.',
   },
   ziwei:{
    cardTitle:'별이 그린 인생의 지도',
    hook:'일은 풀리는데, 관계는 왜 어려울까?',
    description:'중국 황실에서 귀하게 다뤄졌다고 전해지는 별자리 운명학입니다.',
    detail:'명궁과 12궁, 주성의 배치를 통해 성격·재물·연애·직업의 흐름을 입체적으로 살펴봅니다. 단순한 성격풀이보다 내 인생의 설계도를 펼쳐보는 데 가깝습니다.',
    method:'별이 놓인 12궁을 삶의 지도로 읽어요. 나를 나타내는 명궁, 일을 보는 관록궁, 관계를 보는 부부궁을 서로 구별해 살펴봐요.',
    example:'일에서 힘이 되는 주도성이 가까운 관계에서는 부담으로 느껴질 수 있어요. 역할을 이끄는 순간과 상대의 답을 기다리는 순간을 나눠 보는 거예요.',
    limit:'출생시간이 필요해요. 기본 구성은 삶의 중심·일·관계·자원 관리에 집중하며, 대한·유년의 시기 해석은 심화 구성에서 다뤄요.',
   },
   sukuyo:{
    cardTitle:'달이 머문 27개의 자리',
    hook:'끌리는데, 가까워질수록 지치는 이유는 뭘까?',
    description:'달의 별자리 27숙을 바탕으로 인연과 궁합, 관계의 거리를 읽는 오래된 점술입니다.',
    detail:'일본에서 도쿠가와 시대에 지나치게 예리해 금지됐다는 전승으로도 알려져 있습니다. 관계의 우열을 단정하기보다, 서로의 속도와 거리를 조율할 단서를 살펴봅니다.',
    method:'27숙으로 나의 기질을 읽고, 궁합에서는 두 사람의 숙 사이 관계와 양방향 거리를 비교해요.',
    example:'한쪽은 자주 확인해야 안심하고, 다른 쪽은 혼자 정리할 시간이 필요할 수 있어요. 마음의 크기를 단정하기보다 서로 편한 연락 간격을 정해 보는 거예요.',
    limit:'두 사람의 관계를 보려면 궁합과 상대 프로필을 선택해 주세요. 한 사람 해석은 나의 기질 중심이며 상대의 속마음이나 재회 확률을 판정하지 않아요.',
   },
   vedic:{
    cardTitle:'오래된 별의 시간표',
    hook:'지금의 변화는 우연일까, 전환점일까?',
    description:'오랜 인도 전승을 바탕으로 라그나·나크샤트라·다샤의 흐름을 읽는 점성술입니다.',
    detail:'라그나는 삶을 마주하는 태도, 나크샤트라는 마음의 결, 다샤는 시기의 변화를 살피는 기준으로 사용합니다. 다른 체계와 섞지 않고 인생의 리듬과 선택의 조건을 풀어냅니다.',
    method:'베다점의 라그나로 삶을 대하는 태도, 달과 나크샤트라로 마음의 결을 읽어요. 익숙한 별자리와 다른 항성황도 기준으로 나의 차트를 펼쳐요.',
    example:'밖에서는 책임을 먼저 챙겨도 속으로는 변화와 자유를 바랄 수 있어요. 의무를 모두 버리는 대신, 지킬 책임과 새롭게 시도할 일을 구분해 보는 거예요.',
    limit:'기본 구성은 태도·마음·재능·관계 중심이에요. 행성의 시기를 읽는 다샤와 보조 차트는 심화 구성에서 다루며, 전생이나 정해진 사건을 사실로 판정하지 않아요.',
   },
   astrology:{
    cardTitle:'태어난 순간의 별자리 지도',
    hook:'나는 왜 이렇게 느끼고, 이런 사람에게 끌릴까?',
    description:'태어난 순간의 행성 배치를 통해 성격, 욕망, 관계 패턴과 인생의 방향을 읽는 상징 체계입니다.',
    detail:'태양·달·상승점과 주요 행성의 관계를 연결해, 겉으로 보이는 나와 마음이 반응하는 방식 사이의 차이를 섬세하게 풀어냅니다.',
    method:'태양은 내가 향하는 방향, 달은 편안함을 느끼는 조건, 상승점은 세상을 마주하는 태도의 단서예요. 행성 사이의 각도까지 연결해 숨은 차이를 읽어요.',
    example:'겉으로는 먼저 다가가도 마음이 편해지기까지는 시간이 걸릴 수 있어요. 친밀해지고 싶은 마음과 혼자 있을 필요를 함께 인정하면 관계의 선택지도 달라져요.',
    limit:'서양 점성술의 출생 차트 해석이에요. 실시간 트랜짓과 특정 사건이 일어날 날짜는 포함하지 않아요.',
   },
   tarot:{
    cardTitle:'지금 펼쳐지는 상징의 카드',
    hook:'놓아야 할까, 한 번 더 다가갈까?',
    description:'지금 이 순간의 질문에 반응하는 상징의 카드로, 감정과 선택지의 흐름을 이야기처럼 읽습니다.',
    detail:'연애·연락·이직·돈처럼 당장 답의 실마리가 필요한 고민에 맞춰, 카드의 이미지와 배열에서 현재 상황과 가까운 흐름을 살펴봅니다.',
    method:'내가 고른 카드의 상징과 펼쳐진 위치를 질문에 연결해요. 원하는 것, 망설이는 이유, 선택의 기준을 차례로 읽어요.',
    example:'기다림이 의미 있는 선택인지 보려면 내가 바라는 변화부터 구체화해 보세요. 상대의 마음을 추측하기보다, 실제 대화와 행동에서 확인할 신호를 정하는 거예요.',
    limit:'질문에 대한 상징 해석이에요. 상대의 속마음·연락 날짜·성공 확률을 확정하지 않아요.',
   },
  },
  consultationKinds:{
   compatibility:{
    cardTitle:'두 사람 사이의 운명선',
    hook:'왜 끌리고, 어디서 자꾸 부딪힐까?',
    description:'두 사람의 사주 또는 숙요 흐름을 함께 보며, 잘 맞는지보다 관계가 움직이는 이유를 살펴봅니다.',
    detail:'끌림과 충돌의 지점, 표현 속도와 기대의 차이, 오래 이어가기 위해 필요한 합의를 관계의 선택지로 풀어냅니다. 썸·재회·결혼 고민에서도 상대의 마음을 단정하지 않고 양쪽의 흐름을 함께 봅니다.',
    method:'두 사람의 기질과 관계 지표를 나란히 놓고, 공통점과 긴장이 실제 대화·거리·책임 분담에서 어떻게 드러나는지 비교해요.',
    example:'한 사람은 빠른 확인을 원하고 다른 사람은 혼자 정리할 시간이 필요할 수 있어요. 마음의 크기를 재기보다 서로 지킬 연락 간격부터 합의해 보는 식이에요.',
    limit:'궁합은 관계의 가능성과 조율 조건을 살펴보는 해석이며, 재회·결혼·관계 지속을 확정하지 않아요.',
   },
  },
 },
};

export const productCuriosity=fortuneCopyByLocale.ko.domains;

export function getFortuneCopy(domain:DomainId,kindId?:string):FortuneCopy{
 return kindId==='compatibility'
  ? fortuneCopyByLocale.ko.consultationKinds.compatibility
  : productCuriosity[domain];
}
