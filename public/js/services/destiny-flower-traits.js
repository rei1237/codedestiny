/**
 * 점술 지표 → 오행 환산표, 그리고 사주 외 22종 꽃의 매칭 특성 보강.
 *
 * 왜 있는가:
 *   꽃 카탈로그가 넷으로 갈라져 있고 매칭 필드(`elements`/`seasons`/`environments`/`water_levels`)가
 *   **사주 67종에만** 있었다. 그래서 점성술·자미두수·숙요는 점수를 낼 수 없어 각각 8·6·8종 안에서
 *   해시 홀짝으로 골랐다 — 불의 3궁(양·사자·궁수)이 전부 같은 꽃이 나오고, `tiger_lily` 는 어떤
 *   태양궁에서도 뽑히지 않았다(2026-08-23 전수 재현).
 *
 * 무엇을 하는가:
 *   ① 22종에 같은 네 필드를 채워 **89종 전체가 하나의 점수 함수로 비교 가능**해진다.
 *   ② 별자리·주성·27수를 오행으로 환산한다. 네 점술이 오행 체계를 공유하므로 이 환산은
 *      임의 매핑이 아니라 각 체계의 배속을 따른 것이다.
 *
 * 🔴 여기 있는 것은 "꽃 하나에 별자리 12개를 손으로 적은 표"가 아니다. 그런 표는 89×N 이라
 *    유지가 불가능하다. 지표를 오행으로 옮기고, 꽃이 이미 가진 오행과 맞춘다.
 */

/* ── 서양 4원소 ↔ 오행 ─────────────────────────────────────────────────────
   불=火, 흙=土, 물=水 는 그대로 대응한다. 공기(Air)는 오행에 대응물이 없어
   전통적으로 木(뻗어나감)과 金(정제·분별) 둘로 나눠 읽는다. */
export const WESTERN_ELEMENT_TO_WUXING = Object.freeze({
  Fire: ['Fire'],
  Earth: ['Earth'],
  Water: ['Water'],
  Air: ['Wood', 'Metal'],
});

/** 12별자리 → 오행. ASTRO_ELEMENT_BY_SIGN(4원소)을 위 대응으로 옮긴 것. */
export const ZODIAC_TO_WUXING = Object.freeze({
  Aries: ['Fire'], Leo: ['Fire'], Sagittarius: ['Fire'],
  Taurus: ['Earth'], Virgo: ['Earth'], Capricorn: ['Earth'],
  Gemini: ['Wood', 'Metal'], Libra: ['Wood', 'Metal'], Aquarius: ['Wood', 'Metal'],
  Cancer: ['Water'], Scorpio: ['Water'], Pisces: ['Water'],
});

/**
 * 12별자리 → 계절. 북반구 황도 기준(춘분 양자리 시작).
 * 꽃의 `seasons` 와 맞춰 태양궁이 계절 가중치를 실제로 쓰게 한다.
 */
export const ZODIAC_TO_SEASON = Object.freeze({
  Aries: 'Spring', Taurus: 'Spring', Gemini: 'Spring',
  Cancer: 'Summer', Leo: 'Summer', Virgo: 'Summer',
  Libra: 'Autumn', Scorpio: 'Autumn', Sagittarius: 'Autumn',
  Capricorn: 'Winter', Aquarius: 'Winter', Pisces: 'Winter',
});

/** 12별자리 → 3분류(활동·고정·변통). 꽃의 개화 성격과 맞물린다. */
export const ZODIAC_MODALITY = Object.freeze({
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
});

/**
 * 자미두수 14정성 → 오행. 전통 배속을 따른다.
 * (엔진에 이미 있던 ZIWEI_MAINSTAR_TO_ELEMENT_HINT 와 같은 값이며, 여기서는 조회용 맵으로 둔다.)
 */
export const ZIWEI_STAR_TO_WUXING = Object.freeze({
  자미: 'Earth', 천기: 'Wood', 태양: 'Fire', 무곡: 'Metal', 천동: 'Water', 염정: 'Fire',
  천부: 'Earth', 태음: 'Water', 탐랑: 'Wood', 거문: 'Water', 천상: 'Metal', 천량: 'Earth',
  칠살: 'Metal', 파군: 'Water',
});

/** 사화(四化) — 별에 걸리는 변화. 꽃 선택의 방향을 튼다. */
export const ZIWEI_SIHUA_BIAS = Object.freeze({
  화록: { label: '록', boostWaterLevel: 'high', note: '풍요·확장' },
  화권: { label: '권', boostSeason: 'Summer', note: '장악·추진' },
  화과: { label: '과', boostSeason: 'Autumn', note: '명예·정돈' },
  화기: { label: '기', boostWaterLevel: 'low', note: '집착·정체' },
});

/**
 * 27수 → 오행 · 사방칠수(四方七宿) 배속.
 *
 * 사방은 본명숙의 성격(계절·자리)을 정하고, 달 위상은 오늘의 상태(수분)를 정한다.
 * 동방청룡 7(각~기) · 북방현무 6(두~벽, 27수는 牛를 빼 6수) · 서방백호 7(규~삼) · 남방주작 7(정~진).
 * 🔴 목록과 순서는 `js/saju-engine-tarot-sukuyo-quantum.js` 의 `mansions27` 과 **정확히 같아야 한다**
 *    — 28수에서 牛(우)를 뺀 정통 27수이며, 軫(진)으로 끝난다. 이 순서가 어긋나면 계산기가 준
 *    인덱스와 여기 배속이 밀려 엉뚱한 꽃이 나온다(2026-08-23 실측: 인덱스 8부터 19개가 밀려 있었다).
 *    가드: __tests__/ui/destiny-flower-matching.static.test.js
 */
export const SUKUYO_MANSIONS_27 = Object.freeze([
  { index: 1, ko: '각', han: '角', element: 'Wood', guardian: '교룡', guardianElement: 'Water', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 2, ko: '항', han: '亢', element: 'Metal', guardian: '용', guardianElement: 'Wood', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 3, ko: '저', han: '氐', element: 'Earth', guardian: '담비', guardianElement: 'Earth', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 4, ko: '방', han: '房', element: 'Fire', guardian: '토끼', guardianElement: 'Wood', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 5, ko: '심', han: '心', element: 'Fire', guardian: '여우', guardianElement: 'Metal', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 6, ko: '미', han: '尾', element: 'Fire', guardian: '호랑이', guardianElement: 'Fire', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 7, ko: '기', han: '箕', element: 'Water', guardian: '표범', guardianElement: 'Metal', quarter: '동방청룡', season: 'Spring', environment: 'Forest' },
  { index: 8, ko: '두', han: '斗', element: 'Wood', guardian: '해태', guardianElement: 'Earth', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 9, ko: '여', han: '女', element: 'Earth', guardian: '박쥐', guardianElement: 'Water', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 10, ko: '허', han: '虛', element: 'Earth', guardian: '쥐', guardianElement: 'Water', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 11, ko: '위', han: '危', element: 'Earth', guardian: '제비', guardianElement: 'Wood', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 12, ko: '실', han: '室', element: 'Fire', guardian: '돼지', guardianElement: 'Water', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 13, ko: '벽', han: '壁', element: 'Water', guardian: '고슴도치', guardianElement: 'Earth', quarter: '북방현무', season: 'Winter', environment: 'Wetland' },
  { index: 14, ko: '규', han: '奎', element: 'Wood', guardian: '이리', guardianElement: 'Metal', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 15, ko: '루', han: '婁', element: 'Metal', guardian: '개', guardianElement: 'Earth', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 16, ko: '위', han: '胃', element: 'Earth', guardian: '꿩', guardianElement: 'Fire', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 17, ko: '묘', han: '昴', element: 'Metal', guardian: '닭', guardianElement: 'Metal', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 18, ko: '필', han: '畢', element: 'Water', guardian: '까마귀', guardianElement: 'Fire', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 19, ko: '자', han: '觜', element: 'Fire', guardian: '원숭이', guardianElement: 'Metal', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 20, ko: '삼', han: '參', element: 'Water', guardian: '유인원', guardianElement: 'Wood', quarter: '서방백호', season: 'Autumn', environment: 'Rock' },
  { index: 21, ko: '정', han: '井', element: 'Wood', guardian: '들개', guardianElement: 'Earth', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 22, ko: '귀', han: '鬼', element: 'Metal', guardian: '양', guardianElement: 'Earth', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 23, ko: '류', han: '柳', element: 'Earth', guardian: '노루', guardianElement: 'Wood', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 24, ko: '성', han: '星', element: 'Fire', guardian: '말', guardianElement: 'Fire', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 25, ko: '장', han: '張', element: 'Water', guardian: '사슴', guardianElement: 'Wood', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 26, ko: '익', han: '翼', element: 'Fire', guardian: '뱀', guardianElement: 'Fire', quarter: '남방주작', season: 'Summer', environment: 'Field' },
  { index: 27, ko: '진', han: '軫', element: 'Water', guardian: '지렁이', guardianElement: 'Earth', quarter: '남방주작', season: 'Summer', environment: 'Field' },
]);

/** 달 위상 → 개화 성향. 라벨은 getDailyKarmicGuidance 가 주는 5종. */
export const MOON_PHASE_BIAS = Object.freeze({
  그믐달: { waterLevel: 'low', season: 'Winter', note: '거두어 안으로' },
  초승달: { waterLevel: 'balanced', season: 'Spring', note: '틔우기 시작' },
  반달: { waterLevel: 'balanced', season: 'Spring', note: '균형과 조율' },
  상현달: { waterLevel: 'high', season: 'Summer', note: '차오르는 힘' },
  보름달: { waterLevel: 'high', season: 'Summer', note: '만개와 노출' },
});

/**
 * 사주 외 22종의 매칭 특성.
 *
 * 사주 67종은 처음부터 이 네 필드를 갖고 있었다. 여기 22종은 없어서 점수 계산 대상이 아니었다.
 * 값은 꽃의 실제 생태(개화기·서식지·수분 요구)와 카탈로그가 이미 적어 둔 상징에서 정했다.
 * `description`/`vibeMessage` 는 자미·숙요 14종에 아예 없어 `symbolism`(명사 나열) 하나가
 * 이름·설명·바이브 3역을 하고 있었다.
 */
export const FLOWER_TRAIT_SUPPLEMENT = Object.freeze({
  /* ── 점성술 8종 ── */
  flame_tulip: {
    elements: ['Fire', 'Wood'], seasons: ['Spring'], environments: ['Garden', 'Field'], water_levels: ['balanced'],
    description: '컵 모양 꽃잎 안쪽에 불길이 번지듯 색이 오르는 튤립입니다. 봄의 첫 열기를 그대로 받아 한 번에 터뜨리는 꽃이라, 오래 벼르던 일을 실행으로 옮기는 시기와 겹칩니다.',
    vibe_message: '망설임이 길었던 만큼, 지금의 한 걸음은 생각보다 멀리 갑니다.',
  },
  tiger_lily: {
    elements: ['Fire', 'Earth'], seasons: ['Summer'], environments: ['Field', 'Rock'], water_levels: ['balanced'],
    description: '뒤로 활짝 젖혀진 여섯 장 화피에 검은 반점이 흩뿌려진 백합입니다. 감추지 않는 무늬가 곧 이 꽃의 힘이라, 자기 색을 드러낼수록 유리해지는 자리에 어울립니다.',
    vibe_message: '가리려 애쓰던 부분이 사실은 가장 강한 무늬입니다.',
  },
  ivy_bloom: {
    elements: ['Wood', 'Earth'], seasons: ['Autumn'], environments: ['Forest', 'Rock'], water_levels: ['balanced'],
    description: '눈에 잘 띄지 않는 작은 꽃이 우산처럼 뭉쳐 피는 아이비입니다. 벽을 타고 조용히 면적을 넓혀 가는 성질이라, 빠른 성과보다 쌓아 둔 구조가 힘을 내는 국면을 말합니다.',
    vibe_message: '조금씩 붙잡아 둔 것들이 이제 서로를 지탱합니다.',
  },
  resilient_rose: {
    elements: ['Earth', 'Fire'], seasons: ['Summer', 'Autumn'], environments: ['Garden'], water_levels: ['balanced'],
    description: '겹겹이 감싸 안은 꽃잎이 가운데를 끝까지 지켜 내는 장미입니다. 잘려도 다시 눈을 틔우는 회복력이 이 꽃의 본령이라, 무너진 자리에서 다시 서는 시기와 맞물립니다.',
    vibe_message: '한 번 접혔던 자리가 오히려 더 단단해집니다.',
  },
  astro_lavender: {
    elements: ['Wood', 'Metal'], seasons: ['Summer'], environments: ['Field', 'Rock'], water_levels: ['low'],
    description: '가는 줄기를 따라 작은 입술꽃이 층층이 달리는 라벤더입니다. 메마른 땅에서 향으로 먼저 존재를 알리는 꽃이라, 말과 생각이 앞서 길을 여는 흐름을 가리킵니다.',
    vibe_message: '정리해서 꺼낸 한 문장이 상황을 통째로 바꿉니다.',
  },
  bird_of_paradise: {
    elements: ['Wood', 'Fire'], seasons: ['Winter', 'Spring'], environments: ['Garden'], water_levels: ['balanced'],
    description: '새가 날아오르는 순간을 그대로 굳혀 놓은 듯한 극락조화입니다. 좌우 대칭을 깨뜨린 생김새가 곧 개성이라, 남과 같은 방식으로는 풀리지 않는 문제에 어울립니다.',
    vibe_message: '남들 하는 대로 맞추던 각도를 조금 틀어 볼 때입니다.',
  },
  water_narcissus: {
    elements: ['Water', 'Metal'], seasons: ['Winter', 'Spring'], environments: ['Pond', 'Wetland'], water_levels: ['high'],
    description: '물가에 서서 제 얼굴을 비춰 보는 수선화입니다. 여섯 장 화피 안에 부화관이 한 겹 더 서 있어, 겉과 속을 나눠 들여다보는 시기를 말합니다.',
    vibe_message: '바깥을 살피기 전에 안쪽을 한 번 정리하면 길이 보입니다.',
  },
  water_anemone: {
    elements: ['Water', 'Wood'], seasons: ['Spring'], environments: ['Wetland', 'Field'], water_levels: ['high'],
    description: '바람이 스치기만 해도 꽃잎이 흔들리는 아네모네입니다. 예민함이 약점이 아니라 감지력인 꽃이라, 분위기를 먼저 읽어야 하는 자리에 맞습니다.',
    vibe_message: '먼저 알아차린 사람이 먼저 움직일 수 있습니다.',
  },

  /* ── 자미두수 6종 ── */
  peony_ziwei: {
    elements: ['Earth', 'Fire'], seasons: ['Spring'], environments: ['Garden'], water_levels: ['balanced'],
    description: '겹겹의 꽃잎이 한가운데를 왕좌처럼 받쳐 드는 모란입니다. 스스로 크기를 주장하지 않아도 자리가 저절로 중심이 되는 꽃이라, 자미성의 기품과 겹칩니다.',
    vibe_message: '앞장서지 않아도 사람들이 당신 쪽을 기준으로 섭니다.',
  },
  thorny_rose: {
    elements: ['Fire', 'Metal'], seasons: ['Summer'], environments: ['Garden', 'Rock'], water_levels: ['balanced'],
    description: '붉은 겹꽃 아래로 가시를 그대로 세워 둔 장미입니다. 아름다움과 방어를 나누지 않는 꽃이라, 물러서지 않고 밀어붙여야 할 국면을 가리킵니다.',
    vibe_message: '지금은 부드럽게 도는 것보다 정면이 빠릅니다.',
  },
  delicate_willow: {
    elements: ['Wood', 'Water'], seasons: ['Spring'], environments: ['Wetland', 'Pond'], water_levels: ['high'],
    description: '실처럼 늘어진 가지 끝마다 작은 꽃이 촘촘히 달리는 버드나무꽃입니다. 꺾이는 대신 휘어 버티는 성질이라, 힘으로 맞서기보다 결을 타는 편이 유리한 때입니다.',
    vibe_message: '버티는 힘보다 휘는 각도가 결과를 가릅니다.',
  },
  sunflower_ziwei: {
    elements: ['Fire', 'Earth'], seasons: ['Summer'], environments: ['Field'], water_levels: ['balanced'],
    description: '수백 개의 작은 꽃이 원반을 이루고 하루 종일 해를 따라 도는 해바라기입니다. 방향을 숨기지 않는 꽃이라, 목표가 분명할 때 가장 크게 자랍니다.',
    vibe_message: '어디를 보고 있는지 밝히는 순간 사람이 모입니다.',
  },
  night_cereus: {
    elements: ['Water', 'Metal'], seasons: ['Summer'], environments: ['Desert', 'Rock'], water_levels: ['low'],
    description: '한밤에 몇 시간만 피었다 지는 월하미인입니다. 가늘고 긴 화피가 별처럼 벌어지는 그 짧은 시간이 전부인 꽃이라, 때를 놓치면 안 되는 일을 말합니다.',
    vibe_message: '열려 있는 창이 좁습니다. 재는 것보다 여는 편이 낫습니다.',
  },
  orchid_tanlang: {
    elements: ['Wood', 'Water'], seasons: ['Autumn', 'Winter'], environments: ['Forest'], water_levels: ['balanced'],
    description: '좌우 대칭의 꽃잎 아래 입술꽃잎 하나가 따로 뻗어 나온 난초입니다. 향으로 특정 상대만 불러들이는 구조라, 넓게 알리기보다 정확히 겨냥할 때 힘이 붙습니다.',
    vibe_message: '모두에게 열지 말고, 닿아야 할 한 사람에게 맞추세요.',
  },

  /* ── 숙요 8종 ── */
  white_baby_breath: {
    elements: ['Metal', 'Wood'], seasons: ['Summer'], environments: ['Field', 'Garden'], water_levels: ['low'],
    description: '작고 흰 꽃이 안개처럼 흩어져 피는 안개꽃입니다. 혼자서는 눈에 띄지 않지만 곁의 꽃을 살려 주는 자리라, 사람 사이를 잇는 역할과 겹칩니다.',
    vibe_message: '중심에 서지 않아도 당신이 있어 자리가 부드러워집니다.',
  },
  moon_lily: {
    elements: ['Metal', 'Water'], seasons: ['Summer'], environments: ['Garden', 'Field'], water_levels: ['balanced'],
    description: '순백의 화피 여섯 장이 뒤로 젖혀지고 긴 수술이 밖으로 뻗는 백합입니다. 흐린 곳에서도 형태가 또렷한 꽃이라, 결정을 미루지 않는 시기를 가리킵니다.',
    vibe_message: '정하고 나면 나머지는 생각보다 단순해집니다.',
  },
  red_lycoris: {
    elements: ['Fire', 'Metal'], seasons: ['Autumn'], environments: ['Field', 'Rock'], water_levels: ['low'],
    description: '잎이 다 진 뒤에야 붉은 실꽃을 밀어 올리는 석산입니다. 잎과 꽃이 서로를 보지 못하는 꽃이라, 끝난 국면 위에서 새로 시작하는 자리를 말합니다.',
    vibe_message: '지난 것이 정리됐기 때문에 이번 것이 선명합니다.',
  },
  black_rose: {
    elements: ['Metal', 'Water'], seasons: ['Autumn', 'Winter'], environments: ['Garden', 'NightSky'], water_levels: ['low'],
    description: '검붉은 겹꽃이 빛을 삼키듯 조여 있는 흑장미입니다. 감정을 밖으로 내보내지 않고 안에서 벼리는 꽃이라, 드러내기보다 다지는 시기와 맞물립니다.',
    vibe_message: '지금 말하지 않은 것이 나중에 무게가 됩니다.',
  },
  violet_wisteria: {
    elements: ['Wood', 'Water'], seasons: ['Spring'], environments: ['Forest', 'Garden'], water_levels: ['balanced'],
    description: '보랏빛 꽃송이가 발처럼 길게 늘어지는 등나무꽃입니다. 스스로 서지 않고 무언가를 감아 올라가며 피는 꽃이라, 관계를 타고 흐르는 국면을 가리킵니다.',
    vibe_message: '혼자 밀지 말고, 이미 이어진 줄을 따라가 보세요.',
  },
  orange_trumpet: {
    elements: ['Fire', 'Wood'], seasons: ['Summer'], environments: ['Garden', 'Rock'], water_levels: ['balanced'],
    description: '주황빛 나팔이 담장 위로 연달아 벌어지는 능소화입니다. 높은 곳으로 올라가며 계속 새 꽃을 여는 성질이라, 한 번의 성과보다 이어지는 리듬을 말합니다.',
    vibe_message: '한 건으로 끝내지 말고 다음 칸을 미리 잡아 두세요.',
  },
  blue_iris: {
    elements: ['Water', 'Metal'], seasons: ['Spring'], environments: ['Wetland', 'Pond'], water_levels: ['high'],
    description: '세 장은 아래로 드리우고 세 장은 곧게 세운 붓꽃입니다. 위아래 역할이 분명히 갈린 구조라, 흐트러진 순서를 정리해야 할 때와 겹칩니다.',
    vibe_message: '먼저 할 것과 나중에 할 것만 갈라도 절반은 풀립니다.',
  },
  moon_narcissus: {
    elements: ['Metal', 'Water'], seasons: ['Winter', 'Spring'], environments: ['Pond', 'Field'], water_levels: ['balanced'],
    description: '흰 화피 가운데 옅은 부화관을 두른 수선화입니다. 차가운 계절 끝에서 먼저 올라오는 꽃이라, 아직 아무도 움직이지 않은 자리에 먼저 서는 때를 말합니다.',
    vibe_message: '이르다 싶은 지금이 사실은 가장 조용히 앞서는 시점입니다.',
  },
});

/** 자유형 문자열에서 별자리 영문명을 뽑는다(한글/영문 혼용 입력 대응). */
export function normalizeZodiacName(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const keys = Object.keys(ZODIAC_TO_WUXING);
  const hit = keys.find((k) => text.toLowerCase().includes(k.toLowerCase()));
  return hit || '';
}

/** 27수 표기(‘여(女)’·‘女’·‘여’·번호)를 1~27 인덱스로. 못 찾으면 0. */
export function resolveMansionIndex(raw) {
  const text = String(raw || '').trim();
  if (!text) return 0;
  const asNumber = Number(text);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 27) return Math.floor(asNumber);
  const hit = SUKUYO_MANSIONS_27.find((m) => text.includes(m.han) || text.includes(m.ko));
  return hit ? hit.index : 0;
}

export function mansionByIndex(index) {
  const i = Math.floor(Number(index) || 0);
  return SUKUYO_MANSIONS_27.find((m) => m.index === i) || null;
}

/** 자미두수 별 이름에서 오행을 얻는다. 보조성·살성은 정성 이름을 포함하지 않으므로 ''. */
export function ziweiStarElement(starName) {
  const text = String(starName || '').trim();
  if (!text) return '';
  const hit = Object.keys(ZIWEI_STAR_TO_WUXING).find((star) => text.includes(star));
  return hit ? ZIWEI_STAR_TO_WUXING[hit] : '';
}
