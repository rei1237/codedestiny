export type TenGodId =
  | "bigeon"
  | "geopjae"
  | "siksin"
  | "sanggwan"
  | "pyeonjae"
  | "jeongjae"
  | "pyeongwan"
  | "jeonggwan"
  | "pyeonin"
  | "jeongin";

export type TenGodColorTone = "pink" | "purple" | "gold" | "blue" | "green" | "red" | "gray";

export type TenGodMeta = {
  id: TenGodId;
  nameKo: string;
  hanja?: string;
  roleInTeaHouse: string;
  coreMeaning: string[];
  lightSide: string;
  shadowSide: string;
  yeoniDescription: string;
  visualHint: string;
  colorTone: TenGodColorTone;
};

export const tenGodMetaMap: Record<TenGodId, TenGodMeta> = {
  bigeon: {
    id: "bigeon",
    nameKo: "비견",
    hanja: "比肩",
    roleInTeaHouse: "나와 닮은 손님",
    coreMeaning: ["자기주도", "독립심", "동료", "자존감"],
    lightSide: "스스로 버티는 힘과 주체성을 키웁니다.",
    shadowSide: "고집이 강해지거나 혼자 모든 것을 감당하려 할 수 있습니다.",
    yeoniDescription: "비견은 당신과 닮은 손님처럼, 지금 내 마음이 어디에 서 있는지 비춰주는 기운이에요.",
    visualHint: "거울, 닮은 손님, 두 개의 찻잔",
    colorTone: "purple",
  },
  geopjae: {
    id: "geopjae",
    nameKo: "겁재",
    hanja: "劫財",
    roleInTeaHouse: "옆자리 경쟁자",
    coreMeaning: ["경쟁", "비교", "승부", "빼앗김"],
    lightSide: "위기에서 밀고 나가는 힘과 승부욕을 줍니다.",
    shadowSide: "비교심, 조급함, 관계의 긴장을 키울 수 있습니다.",
    yeoniDescription: "겁재는 옆자리 경쟁자처럼, 지금 당신이 무엇과 비교하며 흔들리는지 보여줘요.",
    visualHint: "번개, 경쟁자, 엇갈린 찻잔",
    colorTone: "red",
  },
  siksin: {
    id: "siksin",
    nameKo: "식신",
    hanja: "食神",
    roleInTeaHouse: "디저트 요리사",
    coreMeaning: ["표현", "즐거움", "회복", "생산성"],
    lightSide: "마음을 편하게 풀고 자연스럽게 표현하게 합니다.",
    shadowSide: "안일함이나 미루는 태도로 흐를 수 있습니다.",
    yeoniDescription: "식신은 찻집의 디저트 요리사처럼, 굳은 마음을 부드럽게 풀어주는 기운이에요.",
    visualHint: "디저트, 꿀, 따뜻한 접시",
    colorTone: "gold",
  },
  sanggwan: {
    id: "sanggwan",
    nameKo: "상관",
    hanja: "傷官",
    roleInTeaHouse: "창가의 예술가",
    coreMeaning: ["표현력", "매력", "반항", "말"],
    lightSide: "자신만의 매력과 표현력을 살립니다.",
    shadowSide: "말이 앞서거나 규칙과 부딪힐 수 있습니다.",
    yeoniDescription: "상관은 창가에서 노래하는 예술가처럼, 숨겨둔 말을 밖으로 꺼내게 하는 기운이에요.",
    visualHint: "노래, 말풍선, 창가, 꽃잎",
    colorTone: "pink",
  },
  pyeonjae: {
    id: "pyeonjae",
    nameKo: "편재",
    hanja: "偏財",
    roleInTeaHouse: "떠돌이 상인",
    coreMeaning: ["기회", "확장", "유동 재물", "외부 인연"],
    lightSide: "새로운 기회와 넓은 관계를 불러옵니다.",
    shadowSide: "산만함, 과소비, 무리한 확장으로 흐를 수 있습니다.",
    yeoniDescription: "편재는 떠돌이 상인처럼, 예상 밖의 기회와 흔들리는 돈의 흐름을 가져오는 손님이에요.",
    visualHint: "금화, 상인, 여행 가방",
    colorTone: "gold",
  },
  jeongjae: {
    id: "jeongjae",
    nameKo: "정재",
    hanja: "正財",
    roleInTeaHouse: "장부 쓰는 총무",
    coreMeaning: ["현실감", "관리", "안정 재물", "성실"],
    lightSide: "생활을 정리하고 현실적인 기반을 세웁니다.",
    shadowSide: "너무 계산적이거나 안정만 고집할 수 있습니다.",
    yeoniDescription: "정재는 찻집의 장부를 쓰는 총무처럼, 지금 현실적으로 지켜야 할 것을 알려줘요.",
    visualHint: "장부, 열쇠, 저금통, 찻집 계산대",
    colorTone: "green",
  },
  pyeongwan: {
    id: "pyeongwan",
    nameKo: "편관",
    hanja: "偏官",
    roleInTeaHouse: "검은 우산의 기사",
    coreMeaning: ["압박", "위기", "돌파", "긴장"],
    lightSide: "어려운 상황을 돌파하는 결단력과 힘을 줍니다.",
    shadowSide: "불안, 압박감, 무리한 대응으로 이어질 수 있습니다.",
    yeoniDescription: "편관은 검은 우산을 든 기사처럼, 피하고 싶은 압박을 마주하게 하는 기운이에요.",
    visualHint: "검은 우산, 기사, 검, 어두운 달",
    colorTone: "gray",
  },
  jeonggwan: {
    id: "jeonggwan",
    nameKo: "정관",
    hanja: "正官",
    roleInTeaHouse: "찻집 규칙 관리자",
    coreMeaning: ["책임", "약속", "질서", "사회성"],
    lightSide: "약속과 책임을 통해 신뢰를 쌓게 합니다.",
    shadowSide: "눈치, 부담, 지나친 규칙 의식으로 답답해질 수 있습니다.",
    yeoniDescription: "정관은 찻집의 규칙 관리자처럼, 지금 지켜야 할 선과 책임을 조용히 알려줘요.",
    visualHint: "문패, 규칙서, 정돈된 찻잔",
    colorTone: "blue",
  },
  pyeonin: {
    id: "pyeonin",
    nameKo: "편인",
    hanja: "偏印",
    roleInTeaHouse: "이상한 책을 읽는 점술가",
    coreMeaning: ["직감", "생각", "의심", "해석"],
    lightSide: "남들이 보지 못한 의미를 읽는 직감을 줍니다.",
    shadowSide: "생각이 많아지고 추측이 깊어질 수 있습니다.",
    yeoniDescription: "편인은 이상한 책을 읽는 점술가처럼, 보이지 않는 의미를 자꾸 해석하게 만드는 기운이에요.",
    visualHint: "신비한 책, 달, 물음표, 촛불",
    colorTone: "purple",
  },
  jeongin: {
    id: "jeongin",
    nameKo: "정인",
    hanja: "正印",
    roleInTeaHouse: "따뜻한 차를 내주는 선생",
    coreMeaning: ["보호", "공부", "회복", "수용"],
    lightSide: "마음을 안정시키고 배움과 회복을 돕습니다.",
    shadowSide: "의존, 미룸, 과한 보호 욕구로 흐를 수 있습니다.",
    yeoniDescription: "정인은 따뜻한 차를 내주는 선생처럼, 지금 당신에게 필요한 보호와 회복을 알려줘요.",
    visualHint: "책, 따뜻한 차, 담요, 등불",
    colorTone: "green",
  },
};

export const tenGods = Object.values(tenGodMetaMap);

export const tenGodLabelToIdMap: Record<string, TenGodId> = {
  비견: "bigeon",
  겁재: "geopjae",
  식신: "siksin",
  상관: "sanggwan",
  편재: "pyeonjae",
  정재: "jeongjae",
  편관: "pyeongwan",
  정관: "jeonggwan",
  편인: "pyeonin",
  정인: "jeongin",
};

export function normalizeTenGodId(value: string): TenGodId | undefined {
  return tenGodLabelToIdMap[value.trim()];
}

export function getTenGodMeta(id: TenGodId) {
  return tenGodMetaMap[id];
}
