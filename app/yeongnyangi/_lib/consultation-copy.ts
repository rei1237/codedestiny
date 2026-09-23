import type {Product} from '@/worker/yeongnyangi/payments/catalog';

const fusionDescriptions:Record<string,string>={
 fusion_saju_ziwei:'타고난 기질과 별의 배치를 나란히 읽어, 일과 관계에서 반복되는 패턴을 짚어줄게.',
 fusion_sukuyo_vedic:'관계의 거리와 마음의 리듬을 살펴볼게. 숙요와 베다의 서로 다른 기준도 구분해줄게.',
 fusion_astrology_tarot:'출생 차트의 성향과 지금 펼친 카드의 상징으로, 고민 속 선택지를 함께 살펴보자.',
 fusion_all:'여섯 체계를 한 권에 펼쳐줄게. 같은 이야기는 연결하고, 다른 해석은 선택의 조건으로 정리할게.',
};
export function consultationTitle(product:Product){
 return product.readingKind==='all'?'오마카세 초융합 운세':product.name;
}
export function fusionDescription(product:Product){return fusionDescriptions[product.id];}
