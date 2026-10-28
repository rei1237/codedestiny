const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const groups = {
  saju: {
    hook: '나는 왜 비슷한 선택을 반복할까요?',
    answers: ['타고난 성향과 힘이 되는 강점', '관계·일·돈에서 반복되는 패턴', '삶의 큰 흐름을 이해하는 관점'],
    basis: '오행의 균형과 십성의 관계 → 성향과 선택 습관',
    note: '타고난 성향과 반복되는 삶의 패턴을 먼저 알아보세요. 지금 겪는 고민이나 구체적인 선택은 전문가 상담에서 더 깊게 다룰 수 있어요.',
  },
  astro: {
    hook: '겉으로 보이는 나와 마음속 나는 왜 다를까요?',
    answers: ['내가 편안함을 느끼는 조건', '일과 관계에서 드러나는 강점', '반복되는 어려움에 대처하는 선택'],
    basis: '출생 차트의 행성·하우스·각도 → 성향과 생활 속 장면',
    note: '서양 점성술의 출생 차트로 읽습니다. 정확한 출생시각이 있을 때 하우스와 상승궁을 더 구체적으로 살펴볼 수 있어요.',
  },
  ziwei: {
    hook: '같은 나인데, 어떤 자리에서 더 잘 풀릴까요?',
    answers: ['삶의 영역마다 달라지는 강점', '관계와 역할에서 생기는 반복 패턴', '시기별로 살펴볼 과제와 방향'],
    basis: '명반의 12궁과 별의 배치 → 영역별 성향과 흐름',
    note: '자미두수 명반의 배치를 생활 언어로 풀어 읽습니다. 선택한 장의 해석을 통해 나에게 필요한 부분부터 살펴보세요.',
  },
  sukuyo: {
    hook: '마음이 편한 거리에는 이유가 있을까요?',
    answers: ['타고난 감정과 반응의 리듬', '가까워질 때 드러나는 관계 패턴', '나와 상대를 소모시키지 않는 소통'],
    basis: '출생일로 산출한 본명숙과 숙의 관계 → 기질과 인연의 거리',
    note: '숙요의 27수 체계로 읽습니다. 인연의 유형은 관계를 이해하는 실마리이며, 상대의 마음이나 결말을 단정하지 않아요.',
  },
  vedic: {
    hook: '지금의 선택을 내 기질과 연결해 볼까요?',
    answers: ['나를 움직이는 성향과 욕구', '생활 속에서 강점이 드러나는 방식', '스스로 조율해 볼 선택과 습관'],
    basis: '라그나·라시·나크샤트라 → 삶의 태도와 감정의 리듬',
    note: '베다 점성술의 출생 차트를 바탕으로 읽습니다. 라그나는 삶의 출발점, 라시는 달의 별자리, 나크샤트라는 달이 머무는 구역을 뜻해요.',
  },
};
const keys = {
  'saju-summary': ['saju', 'section_summary'],
  'saju-daewun': ['saju', 'section_daewun'],
  'astro-basic-deep': ['astro', 'astro_basic_deep_pack'],
  'astro-career-talent': ['astro', 'astro_career_talent_deep'],
  'astro-talent-attraction': ['astro', 'astro_talent_attraction_deep'],
  'astro-relationship': ['astro', 'astro_relationship_deep'],
  'astro-growth-shadow': ['astro', 'astro_growth_shadow_deep'],
  'astro-stellar-career': ['astro', 'astro_stellar_career_room'],
  'astro-stellar-talent': ['astro', 'astro_stellar_talent_room'],
  'astro-stellar-relationship': ['astro', 'astro_stellar_relationship_room'],
  'astro-stellar-growth': ['astro', 'astro_stellar_growth_room'],
  'ziwei-decade': ['ziwei', 'ziwei_decade_luck'],
  'ziwei-spouse': ['ziwei', 'ziwei_love_deep'],
  'ziwei-twelve-palaces': ['ziwei', 'ziwei_twelve_palaces'],
  'ziwei-symbolic': ['ziwei', 'ziwei_symbolic_layer'],
  'ziwei-life-yearly': ['ziwei', 'ziwei_life_yearly_flow'],
  'sukuyo-nature': ['sukuyo', 'sukuyo-nature-deep-dive'],
  'sukuyo-encyclopedia': ['sukuyo', 'sukuyo-relationship-encyclopedia'],
  'vedic-basic-reading': ['vedic', 'vedic_basic_reading'],
};
const focused = {
  section_daewun: { hook: '지금은 넓힐 때일까요, 다질 때일까요?', answers: ['10년 단위로 달라지는 삶의 배경', '현재 대운과 해마다 살펴볼 흐름', '속도를 내거나 조율할 때 참고할 근거'], basis: '대운의 간지와 원국·세운의 관계 → 시기별 변화와 선택', note: '같은 노력도 시기마다 다르게 느껴질 수 있어요. 원국과 대운의 연결을 살펴보고, 현재와 다음 시기를 비교해 보세요. 출생시각을 모르면 시작 시점의 해석에는 한계가 있어요.' },
  astro_stellar_career_room: { hook: '잘하는 일과 나에게 맞는 역할은 같을까요?', answers: ['사회에서 드러나는 나의 역할', '힘이 나는 업무 환경과 일의 리듬', '강점을 실제 일에 쓰는 방향'], basis: 'MC·10하우스·6하우스와 관련 행성 → 일과 역할' },
  astro_stellar_talent_room: { hook: '내가 좋아하는 것에 어떤 재능이 숨어 있을까요?', answers: ['자연스럽게 끌리는 일', '행동으로 옮길 때 드러나는 강점', '사람에게 전해지는 나의 매력'], basis: '금성·화성·목성의 배치 → 취향·추진력·확장' },
  astro_stellar_relationship_room: { hook: '끌리는 마음과 편안한 관계는 왜 다를까요?', answers: ['마음이 열리는 조건', '끌림과 표현의 속도', '오래 가는 관계에서 필요한 조율'], basis: '금성·화성·7하우스 → 끌림과 관계의 방식' },
  astro_stellar_growth_room: { hook: '반복되는 어려움에서 무엇을 바꿀 수 있을까요?', answers: ['자꾸 마주하는 과제', '강점의 이면에 있는 소모 패턴', '현실에서 회복하는 작은 선택'], basis: '토성·명왕성·해왕성 → 과제·변화·회복' },
};
export function renderBasicFortuneDetail(detail) {
  const pair = keys[detail?.id]; if (!pair) return '';
  const [group, key] = pair, copy = { ...groups[group], ...focused[key] };
  const title = key === 'section_summary' ? '라이트 사주 풀이' : detail.title;
  return `<section class="craftedDetail basic-fortune-detail"><p class="basic-fortune-detail__eyebrow">${escape(title)}</p><h3>${copy.hook}</h3><p>${copy.note}</p><h4>이 해석에서 얻는 답</h4><ol>${copy.answers.map(text => `<li>${text}</li>`).join('')}</ol><figure><figcaption>계산 근거 미리보기</figcaption><p>${copy.basis}</p><small>해석의 구성 예시입니다. 실제 내용은 입력한 출생정보와 선택한 콘텐츠에 따라 달라져요.</small></figure><button type="button" class="cd-section-gate__btn" data-cd-basic-detail-go="${escape(key)}">해금 방법 확인하기</button></section>`;
}
