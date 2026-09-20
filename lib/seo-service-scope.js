// Public service scope, shared by search landings. Prices remain in product registries.
export const SEO_SERVICE_SCOPES = {
  '/saju': { free: '사주 명식과 오행·십성 등 기본 계산 결과를 확인합니다.', paid: '질문과 주제를 반영한 영냥이 상담과 심층 리포트는 별도 유료 상품입니다.', input: '생년월일, 양력·음력·윤달, 성별, 알고 있다면 출생시간', basis: '/methodology/' },
  '/manse': { free: '생년월일시를 명식으로 바꾼 만세력과 기본 배치를 확인합니다.', paid: '개인 질문에 대한 긴 상담 해설은 별도 상품에서 선택합니다.', input: '생년월일, 달력 구분, 출생시간', basis: '/methodology/' },
  '/ziwei': { free: '명반의 12궁과 별 배치 등 기본 결과를 확인합니다.', paid: '대한·유년을 엮은 심층 상담과 개인 질문 해설은 선택형 유료 서비스입니다.', input: '생년월일, 성별, 출생시간, 달력 구분', basis: '/ziwei/guide/' },
  '/sukuyo': { free: '본명숙과 기본 성향, 두 사람의 숙 관계를 확인합니다.', paid: '질문을 반영한 관계 상담은 영냥이에서 별도로 선택합니다.', input: '생년월일, 관계를 볼 때는 상대의 생년월일', basis: '/sukuyo/guide/' },
  '/vedic': { free: '베다 점성술의 라그나·나크샤트라 등 기본 배치를 확인합니다.', paid: '주제별 심층 해설과 영냥이 상담은 별도 유료 상품입니다.', input: '생년월일, 출생시간, 출생지역과 시간대', basis: '/methodology/' },
  '/astrology': { free: '출생차트의 행성과 별자리 등 기본 계산 결과를 확인합니다.', paid: '질문에 맞춘 장문 상담은 별도 유료 상품입니다.', input: '생년월일, 출생시간, 출생지역과 시간대', basis: '/astrology/guide/' },
  '/tarot': { free: '공개 타로 도구에서 카드와 기본 풀이를 확인합니다.', paid: '주제와 질문에 맞춘 영냥이 타로 상담은 별도 단건 결제입니다.', input: '현재 궁금한 질문. 타로 상담에는 출생 프로필이 필요하지 않습니다.', basis: '/methodology/' },
  '/compatibility': { free: '체계별 궁합 도구의 기본 관계 해석을 확인합니다.', paid: '관계 질문에 대한 심층 리포트와 상담은 상품별로 선택합니다.', input: '선택한 체계에 따라 두 사람의 생년월일과 출생정보', basis: '/methodology/' },
  '/today': { free: '오늘의 운세와 생활 속에서 점검할 기본 항목을 읽습니다.', paid: '오늘의 무료 결과 열람과 개인 질문 상담은 별개입니다.', input: '생년월일 또는 페이지에서 제공하는 운세 분류', basis: '/methodology/' },
};
