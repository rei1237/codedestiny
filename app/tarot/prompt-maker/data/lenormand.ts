import type {TarotSpread} from '../types';

function buildLenormandCardImage(cardNumber: string, cardName: string, symbol: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f8fafc"/><stop offset="0.52" stop-color="#ede9fe"/><stop offset="1" stop-color="#fef3c7"/></linearGradient></defs><rect width="240" height="360" rx="24" fill="url(#g)"/><rect x="16" y="16" width="208" height="328" rx="18" fill="none" stroke="#7c3aed" stroke-width="3" opacity="0.55"/><text x="120" y="58" text-anchor="middle" font-family="serif" font-size="22" fill="#4c1d95">${cardNumber}</text><text x="120" y="176" text-anchor="middle" font-size="74">${symbol}</text><text x="120" y="282" text-anchor="middle" font-family="serif" font-size="24" font-weight="700" fill="#312e81">${cardName}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const LENORMAND_CARD_DATA = [
  ["01", "기수", "Rider", "소식", "방문", "빠른 움직임", "소식과 접근 신호", "♘"],
  ["02", "클로버", "Clover", "작은 행운", "기회", "가벼운 전환", "작지만 유리한 틈", "♣"],
  ["03", "배", "Ship", "이동", "거리", "확장", "멀어지거나 넓어지는 흐름", "⛵"],
  ["04", "집", "House", "안정", "기반", "가족", "안전한 자리와 생활 기반", "⌂"],
  ["05", "나무", "Tree", "성장", "건강", "시간", "천천히 뿌리내리는 흐름", "♧"],
  ["06", "구름", "Clouds", "혼란", "불확실성", "가림", "시야를 흐리는 요소", "☁"],
  ["07", "뱀", "Snake", "복잡함", "우회", "경계", "직선이 아닌 복잡한 길", "♆"],
  ["08", "관", "Coffin", "종료", "멈춤", "정리", "끝내야 열리는 흐름", "▭"],
  ["09", "꽃다발", "Bouquet", "호의", "선물", "좋은 인상", "부드럽게 열리는 호감", "✽"],
  ["10", "낫", "Scythe", "절단", "결단", "급변", "빠르게 잘라낼 지점", "⌁"],
  ["11", "채찍", "Whip", "반복", "논쟁", "압박", "되풀이되는 긴장", "〰"],
  ["12", "새들", "Birds", "대화", "걱정", "소문", "말과 신경 쓰임의 흐름", "♬"],
  ["13", "아이", "Child", "시작", "순수함", "미숙함", "아직 작고 여린 가능성", "◇"],
  ["14", "여우", "Fox", "주의", "전략", "일", "세밀한 경계와 계산", "△"],
  ["15", "곰", "Bear", "힘", "보호", "영향력", "크게 버티는 힘", "⬟"],
  ["16", "별", "Stars", "희망", "방향", "영감", "멀리서 길을 잡는 신호", "✦"],
  ["17", "황새", "Stork", "변화", "이전", "개선", "상태가 바뀌는 움직임", "⇧"],
  ["18", "개", "Dog", "신뢰", "친구", "충성", "믿을 수 있는 연결", "●"],
  ["19", "탑", "Tower", "거리", "기관", "고립", "높은 기준과 분리된 자리", "▥"],
  ["20", "정원", "Garden", "모임", "공개", "사회성", "사람들 앞에 드러나는 흐름", "✿"],
  ["21", "산", "Mountain", "장애", "지연", "막힘", "넘어야 할 큰 저항", "▲"],
  ["22", "갈림길", "Crossroads", "선택", "분기", "대안", "길이 나뉘는 순간", "⌯"],
  ["23", "쥐", "Mice", "소모", "손실", "불안", "조금씩 갉아먹는 누수", "⋯"],
  ["24", "하트", "Heart", "마음", "애정", "끌림", "감정이 살아 있는 자리", "♡"],
  ["25", "반지", "Ring", "약속", "계약", "순환", "묶임과 반복되는 약속", "○"],
  ["26", "책", "Book", "비밀", "지식", "숨은 정보", "아직 열리지 않은 내용", "▤"],
  ["27", "편지", "Letter", "문서", "메시지", "연락", "글로 오가는 소식", "✉"],
  ["28", "남자", "Man", "남성 인물", "주체", "관계 축", "남성적 축 또는 당사자", "♂"],
  ["29", "여자", "Woman", "여성 인물", "주체", "관계 축", "여성적 축 또는 당사자", "♀"],
  ["30", "백합", "Lily", "성숙", "평온", "품위", "차분하게 익은 흐름", "⚜"],
  ["31", "태양", "Sun", "성공", "활력", "명료함", "밝게 드러나는 힘", "☉"],
  ["32", "달", "Moon", "감정", "평판", "직감", "감정과 인상이 흐르는 자리", "☾"],
  ["33", "열쇠", "Key", "해결", "확신", "돌파", "문을 여는 결정적 단서", "⚿"],
  ["34", "물고기", "Fish", "돈", "흐름", "교환", "자원과 거래의 흐름", "♓"],
  ["35", "닻", "Anchor", "고정", "안정", "지속", "쉽게 흔들리지 않는 기준", "⚓"],
  ["36", "십자가", "Cross", "부담", "운명감", "책임", "피하기 어려운 무게", "✚"],
] as const;

export const LENORMAND_CARD_POOL = LENORMAND_CARD_DATA.map(([number, nameKo, nameEn, ...rest]) => {
  const symbol = rest[rest.length - 1];
  const keywords = rest.slice(0, 3);
  const focus = rest[3];
  return {
    cardCode: `L${number}`,
    cardNameKo: nameKo,
    cardNameEn: nameEn,
    keywords,
    focus,
    image: buildLenormandCardImage(number, nameKo, symbol),
  };
});

const PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "promptMaker.001": "레노먼드 6장 흐름",
    "promptMaker.002": "현재 상황",
    "promptMaker.003": "지금 질문의 표면에 드러난 중심 흐름",
    "promptMaker.004": "가까운 배경",
    "promptMaker.005": "이 흐름을 만든 최근 조건과 주변 분위기",
    "promptMaker.006": "반복 신호",
    "promptMaker.007": "계속 되풀이되는 패턴과 확인할 포인트",
    "promptMaker.008": "전환 단서",
    "promptMaker.009": "흐름이 바뀌거나 열리는 계기",
    "promptMaker.010": "행동 단서",
    "promptMaker.011": "줄이거나 늘려야 할 현실 행동",
    "promptMaker.012": "다음 흐름",
    "promptMaker.013": "가까운 다음 장면과 정리 메시지",
    "promptMaker.014": "타로 프롬프트",
    "promptMaker.015": "질문, 스프레드, 카드의 방향을 하나의 섬세한 AI 타로 상담 프롬프트로 엮습니다.",
    "promptMaker.016": "레노먼드 프롬프트",
    "promptMaker.017": "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
  },
} as const;

export function promptMakerPageText(key: keyof typeof PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS.ko): string {
  return PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export const LENORMAND_SPREAD: TarotSpread = {
  id: "lenormand-six-flow",
  title: promptMakerPageText("promptMaker.001"),
  category: "special",
  cardCount: 6,
  difficulty: "easy",
  purpose: "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다.",
  positions: [
    { index: 1, label: promptMakerPageText("promptMaker.002"), description: promptMakerPageText("promptMaker.003"), x: 20, y: 30, rotate: -8 },
    { index: 2, label: promptMakerPageText("promptMaker.004"), description: promptMakerPageText("promptMaker.005"), x: 50, y: 18, rotate: 0 },
    { index: 3, label: promptMakerPageText("promptMaker.006"), description: promptMakerPageText("promptMaker.007"), x: 80, y: 30, rotate: 8 },
    { index: 4, label: promptMakerPageText("promptMaker.008"), description: promptMakerPageText("promptMaker.009"), x: 20, y: 70, rotate: -8 },
    { index: 5, label: promptMakerPageText("promptMaker.010"), description: promptMakerPageText("promptMaker.011"), x: 50, y: 82, rotate: 0, emphasis: true },
    { index: 6, label: promptMakerPageText("promptMaker.012"), description: promptMakerPageText("promptMaker.013"), x: 80, y: 70, rotate: 8 },
  ],
  interpretationGuide: [
    "카드를 한 장씩 고립하지 않고 인접 카드와 조합해 문장처럼 읽습니다.",
    "타로식 역방향을 쓰지 않고 카드의 거리, 순서, 반복 신호를 봅니다.",
    "좋고 나쁨보다 어떤 행동을 줄이거나 늘릴지 정리합니다.",
  ],
  tags: ["레노먼드", "6 cards", "무료"],
  mood: "흐름과 행동 단서를 짧고 또렷하게 읽는 레노먼드 라인",
  ritual: "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리하세요.",
};
