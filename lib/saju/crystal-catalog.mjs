// 사주 원석 추천용 원석 카탈로그. 오행 배정(element)과 상징 의미(symbolicMeanings)는 서로 다른 근거라 필드를 나눈다.
// 오행 배정은 색과 오행을 잇는 전통적 관점을 따르며, 확인한 출처는 docs/design/saju-crystal-catalog-sources.md에 남긴다.
// 설명 문장은 출처 문장을 옮기지 않고 새로 썼다. 가격·판매 정보는 넣지 않는다.
export const CATALOG_VERSION = 'crystal-catalog-v1';
export const CRYSTAL_ELEMENTS = Object.freeze(['wood', 'fire', 'earth', 'metal', 'water']);
export const CRYSTAL_ELEMENT_KO = Object.freeze({ wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' });

const REVIEWED = '2026-11-11';
const SRC = Object.freeze({
  wuxing: 'https://qiyicrystal.com/kr/wuxing',
  guide: 'https://qiyicrystal.com/kr/guide',
  crystals: 'https://qiyicrystal.com/kr/crystals',
});
const BASIS = Object.freeze({
  wood: '초록·청록 빛을 목(木)에 잇는 색 기준 배정',
  fire: '빨강·분홍·보라 빛을 화(火)에 잇는 색 기준 배정',
  earth: '노랑·갈색 빛을 토(土)에 잇는 색 기준 배정',
  metal: '흰색·투명·금빛을 금(金)에 잇는 색 기준 배정',
  water: '검정·짙은 파랑을 수(水)에 잇는 색 기준 배정',
});

const entry = (e) => ({
  aliases: [], variant: null, elementBasis: BASIS[e.element], recommendable: true,
  reviewedAt: REVIEWED, image: `/images/saju-crystals/stones/${e.id}`, ...e,
});

// rank는 오행 안에서의 고정 표시 순서다(작을수록 먼저). 추천 불가 항목은 rank를 비교하지 않는다.
const LIST = [
  // 목(木)
  entry({ id: 'amazonite', nameKo: '아마조나이트', nameEn: 'Amazonite', aliases: ['천하석'], color: '청록', element: 'wood', rank: 1,
    symbolicMeanings: ['소통', '용기'], description: '잔잔한 호수 같은 청록빛 장석이에요. 말을 꺼낼 용기와 부드러운 소통을 상징하는 돌로 전해져요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'green-phantom-quartz', nameKo: '그린 팬텀 쿼츠', nameEn: 'Green Phantom Quartz', aliases: ['녹유령'], color: '초록', element: 'wood', rank: 2,
    symbolicMeanings: ['꾸준한 성장', '안정적인 축적'], description: '수정 안에 초록 능선이 겹겹이 자란 모습이에요. 한 겹씩 쌓아 가는 성장과 차곡차곡 모으는 힘을 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'green-aventurine', nameKo: '그린 어벤츄린', nameEn: 'Green Aventurine', aliases: ['그린 아벤츄린'], color: '연초록', element: 'wood', rank: 3,
    symbolicMeanings: ['여유', '새로운 기회'], description: '부드러운 초록 바탕에 잔잔한 반짝임이 비치는 돌이에요. 마음의 여유와 새 기회를 상징하는 돌로 알려져 있어요.',
    sourceUrls: [SRC.wuxing, SRC.crystals] }),
  // 화(火)
  entry({ id: 'amethyst', nameKo: '자수정', nameEn: 'Amethyst', color: '보라', element: 'fire', rank: 1,
    symbolicMeanings: ['차분함', '집중'], description: '맑은 보랏빛 수정이에요. 들뜬 마음을 가라앉히고 한 가지에 마음을 모으는 차분함을 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'rose-quartz', nameKo: '로즈쿼츠', nameEn: 'Rose Quartz', aliases: ['홍수정'], color: '연분홍', element: 'fire', rank: 2,
    symbolicMeanings: ['사랑', '관계'], description: '은은한 분홍빛 수정이에요. 나를 아끼는 마음과 사람 사이의 따뜻한 관계를 상징하는 돌로 사랑받아요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'tiger-eye-red', nameKo: '레드 타이거아이', nameEn: 'Red Tiger Eye', variant: '붉은 변종', color: '적갈색', element: 'fire', rank: 3,
    symbolicMeanings: ['활력', '결단'], description: '붉은 갈색 결 위로 빛줄기가 움직이는 타이거아이예요. 망설임을 끊고 움직이는 활력을 상징해요.',
    sourceUrls: [SRC.wuxing] }),
  // 토(土)
  entry({ id: 'citrine', nameKo: '황수정', nameEn: 'Citrine', aliases: ['시트린'], color: '노랑', element: 'earth', rank: 1,
    symbolicMeanings: ['풍요', '자신감'], description: '햇살 같은 노란 수정이에요. 성실하게 채워 가는 풍요와 스스로를 믿는 자신감을 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'tiger-eye-gold', nameKo: '타이거아이', nameEn: 'Tiger Eye', aliases: ['골드 타이거아이', '호안석'], variant: '금갈색 기본종', color: '금갈색', element: 'earth', rank: 2,
    symbolicMeanings: ['결단', '축적'], description: '금갈색 결이 빛에 따라 물결치는 돌이에요. 흔들리지 않는 결단과 꾸준히 모으는 힘을 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'smoky-quartz', nameKo: '스모키 쿼츠', nameEn: 'Smoky Quartz', aliases: ['연수정', '차수정'], color: '갈색', element: 'earth', rank: 3,
    symbolicMeanings: ['안정', '중심 잡기'], description: '옅은 갈색 연기가 머문 듯한 수정이에요. 발을 땅에 딛듯 마음의 중심을 잡는 안정을 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide] }),
  // 금(金)
  entry({ id: 'clear-quartz', nameKo: '백수정', nameEn: 'Clear Quartz', aliases: ['클리어 쿼츠', '수정'], color: '투명', element: 'metal', rank: 1,
    symbolicMeanings: ['맑음', '정돈'], description: '물처럼 투명한 기본 수정이에요. 생각을 맑게 비우고 주변을 가지런히 정돈하는 상징으로 쓰여요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'gold-rutilated-quartz', nameKo: '골드 루틸 쿼츠', nameEn: 'Golden Rutilated Quartz', aliases: ['티타늄 쿼츠', '금발정'], color: '금빛', element: 'metal', rank: 2,
    symbolicMeanings: ['풍요', '자신감'], description: '투명한 수정 속에 금빛 바늘 결정이 비치는 돌이에요. 넉넉한 재물과 당당한 자신감을 상징하는 돌로 전해져요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'white-chalcedony', nameKo: '화이트 칼세도니', nameEn: 'White Chalcedony', color: '우윳빛 흰색', element: 'metal', rank: 3,
    symbolicMeanings: ['평온', '부드러운 말'], description: '우윳빛으로 은은하게 비치는 돌이에요. 날 선 마음을 누그러뜨리는 평온과 부드러운 말씨를 상징해요.',
    sourceUrls: [SRC.wuxing] }),
  // 수(水)
  entry({ id: 'obsidian', nameKo: '흑요석', nameEn: 'Obsidian', aliases: ['옵시디언'], color: '검정', element: 'water', rank: 1,
    symbolicMeanings: ['수호', '보호'], description: '화산이 만든 검은 천연 유리예요. 나를 지키는 수호의 돌로 오래 전해져 왔어요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'aquamarine', nameKo: '아쿠아마린', nameEn: 'Aquamarine', color: '바다빛 하늘색', element: 'water', rank: 2,
    symbolicMeanings: ['소통', '용기'], description: '맑은 바닷물 빛을 닮은 보석이에요. 막힌 말을 풀어 주는 소통과 먼 길을 나서는 용기를 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide, SRC.crystals] }),
  entry({ id: 'tiger-eye-blue', nameKo: '블루 타이거아이', nameEn: 'Blue Tiger Eye', aliases: ['호크아이'], variant: '푸른 변종', color: '짙은 청회색', element: 'water', rank: 3,
    symbolicMeanings: ['침착함', '통찰'], description: '짙은 푸른 결이 빛을 따라 흐르는 타이거아이예요. 한 걸음 물러서 살피는 침착함을 상징해요.',
    sourceUrls: [SRC.wuxing] }),
  entry({ id: 'labradorite', nameKo: '라브라도라이트', nameEn: 'Labradorite', aliases: ['랍라도라이트'], variant: '장석(라브라도라이트) 품종', color: '회청색 무지갯빛', element: 'water', rank: 4,
    symbolicMeanings: ['직관', '보호'], description: '회색 바탕에 푸른 무지갯빛이 번지는 장석이에요. 마음속 직관과 나를 감싸는 보호를 상징해요.',
    sourceUrls: [SRC.wuxing, SRC.guide] }),
  // 추천 불가: 유통명만으로는 품종이 갈려 오행·의미 근거를 하나로 확정하지 않는다.
  entry({ id: 'moon-stone-blue', nameKo: '블루 문스톤', nameEn: 'Blue Moonstone (trade name)', variant: '유통명(품종 미확정)', color: '푸른 빛 흰색', element: 'metal', rank: 90,
    recommendable: false, symbolicMeanings: ['부드러움'], description: '같은 이름으로 서로 다른 장석이 팔리는 경우가 있어 품종을 확인하기 전까지 추천하지 않아요.',
    sourceUrls: [SRC.wuxing, SRC.guide] }),
  entry({ id: 'moon-stone-peach', nameKo: '피치 문스톤', nameEn: 'Peach Moonstone (trade name)', variant: '유통명(품종 미확정)', color: '복숭아빛', element: 'fire', rank: 90,
    recommendable: false, symbolicMeanings: ['부드러움'], description: '같은 이름으로 서로 다른 장석이 팔리는 경우가 있어 품종을 확인하기 전까지 추천하지 않아요.',
    sourceUrls: [SRC.wuxing] }),
  entry({ id: 'money-stone', nameKo: '머니스톤', nameEn: 'Money Stone (trade name)', aliases: ['금운석'], variant: '유통명(광물명 미확인)', color: '짙은 회색에 은빛 띠', element: 'water', rank: 90,
    recommendable: false, symbolicMeanings: ['재물'], description: '광물명이 확인되지 않은 유통명이라 오행과 의미를 단정하지 않고 추천에서 뺐어요.',
    sourceUrls: [SRC.wuxing, SRC.crystals] }),
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

export const CRYSTAL_CATALOG = deepFreeze(LIST);

export const recommendableCrystals = (catalog = CRYSTAL_CATALOG) => catalog.filter((c) => c.recommendable === true);

/** 그 오행의 추천 가능 원석을 rank 순으로. */
export const crystalsForElement = (element, catalog = CRYSTAL_CATALOG) => recommendableCrystals(catalog)
  .filter((c) => c.element === element).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
