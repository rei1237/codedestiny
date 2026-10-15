import type { MasterProfileData } from "./MasterProfile";

const base = "/images/master-profiles";

export const masterProfiles = {
  master: {
    name: "마스터", role: "인연의 서 · 사랑의 패턴을 읽는 안내자",
    description: "사주와 자미두수를 함께 읽어, 사랑에서 반복되는 패턴과 관계의 선택을 짚어주는 마스터입니다.",
    approach: "기질과 관계의 흐름을 차근차근 풀고, 지금의 인연에서 살펴볼 질문과 현실적인 행동을 함께 정리합니다.",
    portrait: `${base}/master-love-portrait.webp`, portraitAlt: "검은 머리와 버건디 장식의 인연의 서 마스터",
    sheet: `${base}/master-love-profile.webp`, sheetWidth: 1024, sheetHeight: 1536, theme: "master",
  },
  neo: {
    name: "네오", role: "백사자의 영혼을 가진 운명 마스터",
    description: "반복되는 선택을 짚고, 실행할 행동을 정리하는 운명 전략론. 네오는 막연한 위로보다 지금 바꿀 수 있는 지점을 먼저 찾습니다.",
    approach: "선택한 사주·자미두수·베다점·점성술의 근거를 바탕으로 판세를 읽습니다. 직설적으로 짚되, 당신을 깎아내리지 않고 다음 행동을 함께 정리합니다.",
    portrait: `${base}/neo-strategy-portrait.webp`, portraitAlt: "남색 제복과 흰 망토를 입은 백사자의 운명 마스터 네오",
    sheet: `${base}/neo-strategy-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "neo",
  },
  yeoni: {
    name: "연이", role: "운명 찻집 마스터 · 따뜻한 공감으로 여는 상담",
    description: "마음을 먼저 듣고, 흐름의 근거와 작은 실천을 함께 전하는 운명 찻집 마스터예요. 쉽게 꺼내지 못했던 이야기도 천천히 들려주세요.",
    approach: "사주는 삶의 흐름을, 타로는 지금의 선택을, 숙요점은 관계의 거리감을 살펴봐요. 따뜻한 차 한 잔처럼 마음을 보듬으며, 오늘 할 수 있는 작은 행동을 함께 찾아요.",
    portrait: `${base}/yeoni-teahouse-portrait.webp`, portraitAlt: "분홍빛 한복을 입고 찻잔을 건네는 운명 찻집 마스터 연이",
    sheet: `${base}/yeoni-teahouse-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yeoni",
  },
  // 손금 — 소설 캐주얼 연이. 찻집 한복 연이(yeoni)와 다른 사람처럼 보이지 않게 이름은 같고 역할만 다르다.
  yeoniPalm: {
    name: "연이", role: "손바닥 선을 함께 들여다보는 손금 상담가 · 손금",
    description: "펼친 손바닥 사진에서 생명선·두뇌선·감정선·운명선을 하나씩 짚어 읽는 손금 상담가예요. 사진에 또렷이 보이는 선만 읽고, 보이지 않는 선은 보이지 않는다고 솔직하게 말씀드려요.",
    approach: "손금을 정해진 운명으로 단정하기보다, 지금의 습관과 흐름을 비춰 보는 거울로 읽어요. 선마다 근거를 함께 보여 드리고, 오늘 해 볼 수 있는 작은 행동을 같이 찾아요.",
    portrait: `${base}/yeoni-palm-portrait.webp`, portraitAlt: "꽃무늬 블라우스를 입고 펼친 손바닥을 들어 보이는 손금 상담가 연이",
    sheet: `${base}/yeoni-palm-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yeoniPalm",
  },
  yun: {
    name: "윤달", role: "생시부터 묻는 점성술사 · 서양 점성술",
    description: "누구에게나 태어난 시각부터 묻는 점성술사예요. 분까지 맞추면 상승궁과 열두 하우스가 또렷해지고, 태양·달과 함께 기질의 중심을 정확히 잡을 수 있어요.",
    approach: "행성·사인·하우스·애스펙트의 근거를 먼저 보여 드리고, 비유는 쉽게 하나만 곁들여요. 생시를 모르면 상승궁 해석의 한계부터 말씀드리고, 읽을 수 있는 하늘부터 차근차근 풀어 드려요.",
    portrait: `${base}/yun-astrology-portrait.webp`, portraitAlt: "남색 두루마기에 은빛 초승달 귀걸이를 하고 접부채를 든 점성술사 윤달",
    sheet: `${base}/yun-astrology-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yun",
  },
  musung: {
    name: "무성", role: "막힌 별을 녹으로 바꾸는 판결 · 자미두수",
    description: "명반에서 막힌 자리(화기·化忌)를 먼저 짚고, 그 자리를 풀어 갈 길(화록·化祿)을 처방하는 자미두수 판결자입니다.",
    approach: "짧고 분명한 판결로 시작해, 처방은 오늘 해 볼 수 있는 구체적인 행동으로 이어 드려요. 명궁과 열두 궁, 대운의 근거를 함께 보여 드리고, 미래를 단정하지 않습니다.",
    portrait: `${base}/musung-ziwei-portrait.webp`, portraitAlt: "후드를 내리고 먹색 학자 도포를 입은 채 금빛 깃털을 든 자미두수 판결자 무성",
    sheet: `${base}/musung-ziwei-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "musung",
  },
  hanbi: {
    name: "서한비", role: "두 달집 사이의 거리를 재는 사람 · 숙요점 궁합",
    description: "두 사람의 달이 머문 자리를 나란히 놓고, 서로 다가가는 속도와 거리를 재는 숙요점 상담가예요. 반복되는 엇갈림을 누구의 잘못으로 보기보다, 관계에 쌓이는 습관으로 읽어요.",
    approach: "쌓인 엇갈림을 장부처럼 하나씩 셈하고, 두 분이 함께 갚아 갈 수 있는 작은 약속을 찾아요. 서두르지 않고, 두 분 사이의 거리를 차분히 재어 드립니다.",
    portrait: `${base}/hanbi-sukuyo-portrait.webp`, portraitAlt: "빗빛 인디고 코트 드레스를 입고 덮인 장부를 든 숙요점 상담가 서한비",
    sheet: `${base}/hanbi-sukuyo-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "hanbi",
  },
} satisfies Record<string, MasterProfileData>;
