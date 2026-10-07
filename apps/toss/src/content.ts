import {questionScopes} from '../../../worker/yeongnyangi/fortune/ask/question-policy';
export const readings=[
  {id:'saju_mackerel',name:'고등어 상담',tag:'한 가지 고민부터',description:questionScopes.mackerel},
  {id:'saju_salmon',name:'연어 상담',tag:'선택의 조건 살펴보기',description:questionScopes.salmon},
  {id:'saju_flounder',name:'광어 상담',tag:'두 사람의 관계 살펴보기',description:questionScopes.flounder},
  {id:'saju_tuna',name:'참치 상담',tag:'장기 흐름과 전환 준비',description:questionScopes.tuna},
];
export const questions=[
  {title:'지금 이직해도 괜찮을까',topic:'job_change',hint:'일하는 방식과 변화의 흐름'},
  {title:'내 일과 돈의 흐름은 어떨까',topic:'money',hint:'재능, 자원과 선택의 기준'},
  {title:'나는 어떤 관계에서 편안할까',topic:'love',hint:'나의 관계 패턴과 소통 방식'},
  {title:'요즘 내 마음은 왜 이럴까',topic:'self',hint:'현재의 흐름과 작은 실천'},
];
export const cities=[
  {label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'},
  {label:'부산',lat:35.1796,lng:129.0756,tz:'Asia/Seoul'},
  {label:'대구',lat:35.8714,lng:128.6014,tz:'Asia/Seoul'},
  {label:'인천',lat:37.4563,lng:126.7052,tz:'Asia/Seoul'},
  {label:'광주',lat:35.1595,lng:126.8526,tz:'Asia/Seoul'},
  {label:'대전',lat:36.3504,lng:127.3845,tz:'Asia/Seoul'},
  {label:'제주',lat:33.4996,lng:126.5312,tz:'Asia/Seoul'},
];
export const errors:Record<string,string>={
  QUESTION_FOLLOWUP_BUSY:'이전 질문의 답변을 저장하고 있어요. 잠시 후 같은 요청으로 확인해 주세요.',
  QUESTION_FOLLOWUP_SUPPORT:'같은 질문의 자동 재시도 한도에 도달했어요. 기존 결과는 그대로 보관되며 고객지원에서 확인할 수 있어요.',
  QUESTION_CONVERSATION_CLOSED:'이 상담의 후속 질문을 모두 이용했어요. 저장된 결과는 계속 읽을 수 있어요.',
  QUESTION_SCOPE_REQUIRED:'질문의 주제와 상황, 필요한 기간과 조건을 확인해 주세요.',
  QUESTION_PRODUCT_MISMATCH:'질문에 해당하는 상담 범위와 선택한 상품이 달라요. 상담을 다시 확인해 주세요.',
  PARTNER_REQUIRED:'두 사람의 관계 상담에는 상대방의 출생정보가 필요해요.',
  TOSS_APP_REQUIRED:'토스 앱에서 열어 주세요. 브라우저에서는 화면과 결과 예시를 살펴볼 수 있어요.',
  TOSS_RELEASE_PENDING:'서비스 등록을 확인하고 있어요. 지금은 구매할 수 없어요.',
  LOGIN_REQUIRED:'기록과 구매를 확인하려면 토스 로그인이 필요해요.',SESSION_EXPIRED:'로그인 시간이 만료되었어요. 다시 로그인해 주세요.',
  USER_CANCELED:'결제를 취소했어요. 다시 선택할 수 있어요.',PAYMENT_PENDING:'결제 상태를 확인하고 있어요. 다시 결제하지 말고 구매 복구를 이용해 주세요.',
  IAP_NOT_SUPPORTED:'현재 토스 앱에서 결제를 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.',
  ORDER_REFUNDED:'환불된 주문이에요. 문의가 있다면 주문번호와 함께 고객지원으로 알려 주세요.',
  REQUEST_FAILED:'요청을 완료하지 못했어요. 입력과 연결 상태를 확인해 주세요. 결제했다면 구매 복구를 이용해 주세요.',
};
