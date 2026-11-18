// 홈(/ggulggul/) 서비스 진입 카드 영역의 사용자 노출 문구 정본. 키 이름은 homeCards.*.
// 이 구역은 한국어 전용(data-cd-korean-only)이라 런타임 사전을 쓰지 않고 빌드 때 이 모듈에서 읽는다.
// 가격·목적지·액션은 여기에 두지 않는다 — 레지스트리/카탈로그/free-promo 에서만 읽는다.
export const HOME_CARD_COPY = Object.freeze({
  'homeCards.blockFree.title': '지금 무료로 시작',
  'homeCards.blockPaid.title': '더 깊이 보기 (유료)',
  'homeCards.blockMap.title': '나의 운명 지도 — 엔진별 기본 풀이 (무료)',
  'homeCards.billing.free': '기본 결과는 무료예요.',
  'homeCards.billing.paid': 'AI 심층 상담만 별도 유료예요.',
  'homeCards.badge.free': '무료',
  'homeCards.badge.paid': '유료',
  'homeCards.badge.pick': '추천',
  'homeCards.result.label': '받는 결과',
  'homeCards.look.label': '보는 것',
  'homeCards.get.label': '얻는 것',
  'homeCards.natal.title': '내 사주 여덟 글자 보기',
  'homeCards.natal.desc': '태어난 날로 네 기둥(명식)과 12신살을 바로 계산해요.',
  'homeCards.natal.result': '내 사주 여덟 글자와 타고난 기운',
  'homeCards.natal.cta': '무료로 내 만세력 보기',
  'homeCards.tarot.title': '마음에 걸린 질문, 카드로 풀어보기',
  'homeCards.tarot.desc': '질문을 떠올리고 카드 3장을 직접 뽑아요.',
  'homeCards.tarot.result': '과거·현재·미래 3장 해석',
  'homeCards.tarot.cta': '카드 3장 뽑고 해석 받기',
  'homeCards.heukwol.title': '조심해야 할 시기 짚어보기',
  'homeCards.heukwol.desc': '앞으로 어느 때에 신경 쓰면 좋을지 알려줘요.',
  'homeCards.heukwol.cta': '주의할 시기 확인하기',
  'homeCards.light.title': '라이트 사주 풀이',
  'homeCards.light.lead': '라이트 사주와 대운 흐름을 한 번 결제로 영구 소장해요.',
  'homeCards.light.v1': '영구 소장',
  'homeCards.light.v2': '명식 계산 기반 · AI 생성 아님',
  'homeCards.light.v3': '구매한 계정의 프로필에서 언제든 다시 보기',
  'homeCards.light.priceNote': '한 번 결제',
  'homeCards.light.cta': '풀이 구성 미리 보기',
  'homeCards.light.ctaHint': '결제 전에 구성만 볼 수 있어요',
  'homeCards.ziwei.look': '열두 궁으로 짜는 명반',
  'homeCards.ziwei.get': '타고난 흐름을 한 장의 내 운명 지도로',
  'homeCards.sukuyo.look': '태어난 날의 달 별자리',
  'homeCards.sukuyo.get': '나의 본명숙(타고난 성향)과 관계 흐름',
  'homeCards.vedic.look': '태어난 순간의 하늘 지도',
  'homeCards.vedic.get': '타고난 기질과 흐름',
  'homeCards.astro.look': '행성과 하우스의 배치',
  'homeCards.astro.get': '나의 출생 차트와 성향',
});
export function hc(key) {
  const value = HOME_CARD_COPY[key];
  if (typeof value !== 'string' || !value) throw new Error(`Missing home card copy: ${key}`);
  return value;
}
