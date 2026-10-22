import { getBillingFeaturePricing } from './billing-feature-registry.js';
// Honey is an alternative unlock method; cash prices remain authoritative in the paid registry.
const entries = [
  ['section_summary', '라이트 사주 풀이', '기본 사주', null, '타고난 성향·강점·반복되는 패턴과 삶의 큰 흐름', 'cdOneStepFreeSajuEntry'],
  ['section_daewun', '사주 대운 풀이', '기본 사주', null, '10년 단위 변화와 시기마다 살펴볼 선택', 'cdOneStepFreeSajuEntry'],
  ['rpt_specialCharmCard', '나의 매력 클래스', '재미 사주', 6, '사람에게 자연스럽게 전해지는 나의 매력', 'cdOneStepFreeSajuEntry'],
  ['rpt_skillTreeCard', '인생 스킬 트리', '재미 사주', 6, '강점을 쓰는 방법과 다음 성장 포인트', 'cdOneStepFreeSajuEntry'],
  ['rpt_villainCard', '빌런 블랙리스트', '재미 사주', 30, '나를 소모시키는 관계 패턴과 지켜야 할 선', 'cdOneStepFreeSajuEntry'],
  ['astro_basic_deep_pack', '점성술 기본 심층 해석', '점성술', 30, '겉으로 보이는 나와 마음이 원하는 나', 'cdHomeAstroEntry'],
  ['astro_stellar_career_room', '일과 역할', '점성술', 30, '능력이 살아나는 역할과 나다운 일의 방식', 'cdHomeAstroEntry'],
  ['astro_stellar_talent_room', '재능과 끌림', '점성술', 30, '좋아하는 일이 강점과 매력으로 이어지는 방식', 'cdHomeAstroEntry'],
  ['astro_stellar_relationship_room', '관계의 문', '점성술', 30, '마음이 열리는 조건과 오래 가는 관계의 간격', 'cdHomeAstroEntry'],
  ['astro_stellar_growth_room', '과제와 변화', '점성술', 30, '반복되는 어려움에서 바꿔볼 선택', 'cdHomeAstroEntry'],
  ['astro_career_talent_deep', '커리어·재능 정밀 해석', '점성술', 30, '일에서 인정받는 강점과 소모되는 패턴', 'cdHomeAstroEntry'],
  ['astro_talent_attraction_deep', '재능·매력 심화 해석', '점성술', 30, '나의 호감과 추진력이 드러나는 장면', 'cdHomeAstroEntry'],
  ['astro_relationship_deep', '관계·끌림 심화 해석', '점성술', 30, '끌림의 이유와 관계에서 필요한 조율', 'cdHomeAstroEntry'],
  ['astro_growth_shadow_deep', '성장·내면 심화 해석', '점성술', 30, '강점의 이면을 이해하고 회복하는 방법', 'cdHomeAstroEntry'],
  ['ziwei_twelve_palaces', '자미두수 12궁 해설', '자미두수', 30, '삶의 영역마다 달라지는 강점과 과제', 'cdHomeZiweiEntry'],
  ['ziwei_love_deep', '자미두수 부부궁 해석', '자미두수', 30, '가까운 관계에서 반복되는 기대와 반응', 'cdHomeZiweiEntry'],
  ['ziwei_symbolic_layer', '자미두수 상징 해석', '자미두수', 30, '별의 상징을 생활 속 선택으로 읽기', 'cdHomeZiweiEntry'],
  ['ziwei_decade_luck', '자미두수 대한 흐름', '자미두수', 30, '시기마다 달라지는 삶의 중심 주제', 'cdHomeZiweiEntry'],
  ['ziwei_life_yearly_flow', '자미두수 생애·연간 흐름', '자미두수', 30, '큰 흐름 속에서 올해 살펴볼 방향', 'cdHomeZiweiEntry'],
  ['sukuyo-nature-deep-dive', '숙요 본성 심화', '숙요', 30, '타고난 반응과 마음을 돌보는 방법', 'cdHomeSukuyoEntry'],
  ['sukuyo-relationship-encyclopedia', '숙요 인연 도감', '숙요', 30, '인연마다 달라지는 거리와 소통의 리듬', 'cdHomeSukuyoEntry'],
  ['vedic_basic_reading', '베다 기본 해석', '베다', 30, '출생 차트로 읽는 성향과 생활의 리듬', 'cdHomeVedicEntry'],
];

const perUseEntries = [
  ['compat-sukuyo-compatibility', '숙요 궁합 상세', '숙요', null, '두 사람의 관계 패턴과 구체적인 행동 조언', 'cdHomeSukuyoEntry'],
  ['tarot-myeongri-three-card', '기본 타로 세 장 해석', '타로', null, '선택한 세 장의 흐름과 실천 조언', 'openTarotModal'],
];
export const HONEY_UNLOCK_PRODUCTS = Object.freeze(entries.concat(perUseEntries).map(([featureKey, title, group, honeyCost, description, action]) => {
  const { pricing } = getBillingFeaturePricing({ featureKey });
  // The two Saju reports follow the approved 5,000 KRW / 30-drop pricing proportion.
  // This is a product pricing rule, never a redeemable cash value of the reward.
  return Object.freeze({ productId: featureKey, featureKey, title, group,
    serviceScope: 'GGULGGUL', billingType: perUseEntries.some(row => row[0] === featureKey) ? 'per_use' : 'birth_unlock',
    honeyCost: honeyCost ?? Math.ceil(pricing.amountKRW / 1000) * 6, description, action,
    cashPriceKRW: pricing.amountKRW, cashCost: pricing.cost });
}));

const byKey = new Map(HONEY_UNLOCK_PRODUCTS.map(product => [product.featureKey, product]));
export const HONEY_LETTER_COST = 10;
export const TAROT_ALBUM_UNLOCK_COST = 10;
export function getHoneyUnlockProduct(value) {
  return byKey.get(String(value || '').replace(/^unlock\./, '')) || null;
}


export const HONEY_SCOPE_MESSAGE = '꿀방울은 꿀꿀운세의 지정된 기본 운세 상품에서만 사용할 수 있어요.';
export function isHoneySpendProduct(featureKey) { return getHoneyUnlockProduct(featureKey)?.serviceScope === 'GGULGGUL'; }
// 운세 프롬프트 1회 생성은 HONEY_UNLOCK_PRODUCTS(홈 사용처 24상품) 밖에서 꿀방울 1개만 허용한다. 3,000원 단건 결제는 그대로다.
export const HONEY_PROMPT_HUB_FEATURE_KEY = 'fortune-prompt-hub-generate';
export function isHoneyPromptHubSpend(featureKey) { return String(featureKey || '') === HONEY_PROMPT_HUB_FEATURE_KEY; }
