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
} satisfies Record<string, MasterProfileData>;
