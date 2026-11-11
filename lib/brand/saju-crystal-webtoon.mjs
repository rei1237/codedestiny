// 사주 원석 추천 설명 웹툰 10컷(연이·영냥이). 대사는 HTML로 렌더하고 그림에는 글자를 넣지 않는다.
// 그림은 4단계에서 public/images/saju-crystals/webtoon/NN-{640,1080}.avif + NN-720.webp로 들어온다.
// 파일이 아직 없으면 랜딩이 그림 없이 대사만 보여 준다(app/saju/crystals/page.js).

export const SAJU_CRYSTAL_WEBTOON_DIR = '/images/saju-crystals/webtoon';
export const SAJU_CRYSTAL_WEBTOON_WIDTHS = Object.freeze([640, 1080]);
export const SAJU_CRYSTAL_WEBTOON_FALLBACK = 720;

const WIDE = { w: 1536, h: 1024 };
const SQUARE = { w: 1280, h: 1280 };
const Y = '연이';
const C = '영냥이';
const say = (speaker, text, note) => (note ? { speaker, text, note } : { speaker, text });

const CUTS = [
  { n: 1, size: WIDE, kind: 'scene', alt: '여러 빛깔의 원석이 놓인 공방 탁자 앞에서 연이가 원석을 고르고, 영냥이가 앞발이 안 보일 만큼 원석을 끌어안고 있다',
    lines: [say(Y, '다 예쁜데… 나한테 잘 맞는 건 뭘까?'), say(C, '벌써 앞발이 안 보이는데?')] },
  { n: 2, size: WIDE, kind: 'scene', alt: '연이가 목(木) 칸이 비어 있는 설명용 예시 오행 카드를 들고 초록 원석을 가리키고, 영냥이가 고개를 젓는다',
    lines: [say(Y, '목이 없네? 그럼 초록색 원석을 고르면 돼?'), say(C, '없는 오행이 꼭 필요한 오행은 아니야')],
    caption: '설명용 예시' },
  { n: 3, size: SQUARE, kind: 'scene', alt: '영냥이가 계절과 글자 사이를 잇는 흐름을 짚어 보이고, 연이가 고개를 기울여 듣는다',
    lines: [say(Y, '빈 곳을 채우면 되는 줄 알았는데…'), say(C, '태어난 계절과 글자 사이의 관계까지 봐야 해'), say(C, '그 안에서 너에게 도움이 되는 기운을 찾는 거야')] },
  { n: 4, size: WIDE, kind: 'scene', alt: '영냥이가 작은 달력 카드를 내밀고, 연이가 즐거웠던 해를 떠올리며 웃는다',
    lines: [say(C, '유난히 잘 풀렸던 해가 기억나?'), say(Y, '응! 그때는 정말 신나게 일했어'), say(C, '반대로 힘들었던 해도 함께 알려줘')] },
  { n: 5, size: WIDE, kind: 'scene', alt: '연이가 한 해를 일과 사람 두 갈래 카드로 나눠 놓고, 영냥이가 두 카드를 나란히 정리한다',
    lines: [say(Y, '이 해는 장사는 잘됐는데, 사람 때문에 힘들었어'), say(C, '그럼 일과 관계를 나눠서 알려줘'), say(C, '한 해에 좋은 일과 힘든 일이 함께 있을 수 있으니까')] },
  { n: 6, size: WIDE, kind: 'scene', alt: '영냥이가 시간의 흐름을 잇는 길 위에 연이의 기억 카드를 하나씩 올려 비교한다',
    lines: [say(Y, '그 기억으로 뭘 알 수 있어?'), say(C, '그때의 대운과 세운을 네 사주와 함께 살펴봐', '대운·세운: 그 시기의 운 흐름'), say(C, '어떤 해석이 네 경험과 더 잘 이어지는지 비교하는 거야')] },
  { n: 7, size: SQUARE, kind: 'scene', alt: '흐릿한 기억 카드를 든 연이에게 영냥이가 여러 후보 카드를 함께 펼쳐 보인다',
    lines: [say(Y, '기억이 흐리거나 서로 안 맞으면?'), say(C, '더 물어보거나, 여러 후보를 함께 살펴볼 거야')] },
  { n: 8, size: WIDE, kind: 'scene', alt: '영냥이가 도움이 되는 기운과 이어지는 예시 원석 카드를 고르고, 연이가 이해했다는 듯 손뼉을 친다',
    lines: [say(C, '이렇게 도움이 되는 기운을 살펴본 다음…'), say(C, '그 기운과 연결되는 원석을 고르는 거야'), say(Y, '아, 이제 왜 추천하는지 알겠다!')],
    caption: '예시' },
  { n: 9, size: SQUARE, kind: 'scene', alt: '연이가 빛깔이 다른 원석들을 손바닥에 올려 비교하고, 영냥이가 원석마다 설명을 덧붙인다',
    lines: [say(Y, '원석마다 담긴 뜻도 다르네?'), say(C, '응. 오행과 상징, 추천한 이유까지 같이 알려줄게'), say(Y, '그럼 마음에 드는 빛깔도 골라봐야지')] },
  { n: 10, size: WIDE, kind: 'scene', alt: '연이와 영냥이가 공방 문 앞에서 함께 이야기를 시작하려는 듯 앞을 바라본다',
    lines: [say(Y, '나는 좋았던 해부터 이야기해볼래!'), say(C, '너의 흐름에 어울리는 원석도 함께 찾아보자')] },
];

export const sajuCrystalWebtoonBase = (n) => `${SAJU_CRYSTAL_WEBTOON_DIR}/${String(n).padStart(2, '0')}`;

/** CutReader용 컷 목록. caption은 그림 위 표시(설명용 예시 등)로, 대사 앞에 해설 줄로 넣는다. */
export const SAJU_CRYSTAL_WEBTOON_CUTS = Object.freeze(CUTS.map((cut) => Object.freeze({
  n: cut.n,
  src: sajuCrystalWebtoonBase(cut.n),
  widths: [...SAJU_CRYSTAL_WEBTOON_WIDTHS],
  fallback: SAJU_CRYSTAL_WEBTOON_FALLBACK,
  w: cut.size.w,
  h: cut.size.h,
  alt: cut.alt,
  kind: cut.kind,
  lines: Object.freeze([...(cut.caption ? [{ speaker: '', text: `(${cut.caption})` }] : []), ...cut.lines]),
})));
