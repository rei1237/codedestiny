export const readings=[
  {id:'saju_mackerel',name:'고등어 상담',tag:'한 가지 고민부터',description:'지금 마음에 걸리는 한 가지 질문을 사주의 기본 흐름과 함께 살펴봐요.',sections:5},
  {id:'saju_salmon',name:'연어 상담',tag:'선택의 조건 살펴보기',description:'내 성향과 반복되는 선택을 짚고, 질문에 영향을 주는 흐름을 함께 살펴봐요.',sections:8},
  {id:'saju_flounder',name:'광어 상담',tag:'시기와 변화까지',description:'출생 시각과 지역을 바탕으로 변화의 흐름과 판단할 때 확인할 조건을 살펴봐요.',sections:11},
  {id:'saju_tuna',name:'참치 상담',tag:'여러 관점에서 정리하기',description:'강점과 부담, 시기별 변화와 실천할 일을 여러 항목으로 나누어 정리해요.',sections:15},
];
export const questions=[
  {title:'지금 이직해도 괜찮을까',topic:'career',hint:'일하는 방식과 변화의 흐름'},
  {title:'내 일과 돈의 흐름은 어떨까',topic:'money',hint:'재능, 자원과 선택의 기준'},
  {title:'나는 어떤 관계에서 편안할까',topic:'love',hint:'나의 관계 패턴과 소통 방식'},
  {title:'요즘 내 마음은 왜 이럴까',topic:'general',hint:'현재의 흐름과 작은 실천'},
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
  TOSS_APP_REQUIRED:'토스 앱에서 열어 주세요. 브라우저에서는 화면과 결과 예시를 살펴볼 수 있어요.',
  TOSS_RELEASE_PENDING:'서비스 등록을 확인하고 있어요. 지금은 구매할 수 없어요.',
  LOGIN_REQUIRED:'기록과 구매를 확인하려면 토스 로그인이 필요해요.',SESSION_EXPIRED:'로그인 시간이 만료되었어요. 다시 로그인해 주세요.',
  USER_CANCELED:'결제를 취소했어요. 다시 선택할 수 있어요.',PAYMENT_PENDING:'결제 상태를 확인하고 있어요. 다시 결제하지 말고 구매 복구를 이용해 주세요.',
  IAP_NOT_SUPPORTED:'현재 토스 앱에서 결제를 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.',
  ORDER_REFUNDED:'환불된 주문이에요. 문의가 있다면 주문번호와 함께 고객지원으로 알려 주세요.',
  REQUEST_FAILED:'요청을 완료하지 못했어요. 입력과 연결 상태를 확인해 주세요. 결제했다면 구매 복구를 이용해 주세요.',
};
