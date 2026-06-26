export type LoveSecretMode = 'SOLO' | 'COUPLE';

export type LovePdfMode = "solo" | "compatibility";

export type LoveChapterSpec = {
  number: string;
  title: string;
  categories: string[];
};

const LOVE_SECRET_REPORT_TEXT_TRANSLATIONS = {
  ko: {
    "loveSecretReport.001": "나의 사랑 원형",
    "loveSecretReport.002": "끌림의 공식",
    "loveSecretReport.003": "연애 패턴 분석",
    "loveSecretReport.004": "표현과 소통",
    "loveSecretReport.005": "연애에서의 불안과 집착",
    "loveSecretReport.006": "결혼운과 배우자운",
    "loveSecretReport.007": "이별과 재회 패턴",
    "loveSecretReport.008": "조후로 보는 친밀감과 속궁합",
    "loveSecretReport.009": "좋은 인연을 만나는 시기와 조건",
    "loveSecretReport.010": "나를 위한 연애 마스터플랜",
    "loveSecretReport.011": "두 사람의 관계 설계도",
    "loveSecretReport.012": "일간 궁합 — 서로를 바라보는 본질",
    "loveSecretReport.013": "일지와 배우자궁 — 오래 갈 수 있는 관계인가",
    "loveSecretReport.014": "월지와 생활 리듬 — 함께 살 때 드러나는 차이",
    "loveSecretReport.015": "오행 보완 궁합 — 부족함을 채우는가, 과잉을 키우는가",
    "loveSecretReport.016": "십성 관계 궁합 — 사랑, 책임, 의존, 통제의 구조",
    "loveSecretReport.017": "끌림과 케미 — 왜 서로에게 반응하는가",
    "loveSecretReport.018": "표현과 소통 궁합 — 말이 통하는 관계인가",
    "loveSecretReport.019": "갈등과 권력 구조 — 싸움이 반복되는 지점",
    "loveSecretReport.020": "결혼 현실성 — 사랑이 생활로 이어질 수 있는가",
    "loveSecretReport.021": "조후로 보는 친밀감과 속궁합 — 온도, 습도, 리듬의 조화",
    "loveSecretReport.022": "신살·12운성으로 보는 숨은 인연 코드",
    "loveSecretReport.023": "대운·세운으로 보는 관계의 타이밍",
    "loveSecretReport.024": "두 사람을 위한 최종 관계 전략서",
  },
} as const;

function loveSecretReportText(key: keyof typeof LOVE_SECRET_REPORT_TEXT_TRANSLATIONS.ko) {
  return LOVE_SECRET_REPORT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export const SOLO_LOVE_CHAPTER_SPECS = [
  {
    number: "I",
    title: loveSecretReportText("loveSecretReport.001"),
    categories: [
      "일간으로 보는 사랑에서의 자아",
      "일지 배우자궁이 말하는 관계 본능",
      "월지가 만드는 연애의 계절감",
      "오행 분포로 보는 애정 에너지",
      "십성 구조로 보는 사랑의 역할",
      "배우자성이 드러나는 방식",
      "내가 사랑에서 중요하게 여기는 가치",
      "나도 모르게 반복하는 관계 선택",
      "상대에게 비치는 나의 첫인상과 분위기",
      "나의 사랑 원형을 한 문장으로 정리",
    ],
  },
  {
    number: "II",
    title: loveSecretReportText("loveSecretReport.002"),
    categories: [
      "내가 강하게 끌리는 사람의 오행",
      "내가 반응하는 십성 유형",
      "도화, 홍염, 문창, 역마 등 매력 코드",
      "외모보다 먼저 반응하는 분위기와 태도",
      "설렘이 빠르게 생기는 조건",
      "천천히 깊어지는 안정적 끌림의 조건",
      "위험하지만 강하게 끌리는 유형",
      "내 사주가 가진 연애 매력 포인트",
      "상대가 나에게 끌리는 지점",
      "좋은 끌림과 소모적인 끌림을 구분하는 기준",
    ],
  },
  {
    number: "III",
    title: loveSecretReportText("loveSecretReport.003"),
    categories: [
      "연애를 시작하는 방식",
      "호감이 생겼을 때의 행동 패턴",
      "관계가 깊어질수록 드러나는 모습",
      "권태기가 올 때의 반응",
      "비겁, 식상, 재성, 관성, 인성으로 보는 연애 습관",
      "반복해서 만나는 상대 유형",
      "연애에서 주도권을 잡는 방식",
      "상대에게 맞추는 정도와 자기주장",
      "현재 대운이 연애 패턴에 주는 영향",
      "2026년 세운이 연애 흐름에 주는 영향",
    ],
  },
  {
    number: "IV",
    title: loveSecretReportText("loveSecretReport.004"),
    categories: [
      "감정을 표현하는 기본 방식",
      "식상으로 보는 말과 표현력",
      "인성으로 보는 이해와 공감 방식",
      "관성으로 보는 책임감과 약속 태도",
      "재성으로 보는 현실적 배려",
      "연락 빈도와 소통 리듬",
      "갈등 상황에서의 말투",
      "상대가 오해하기 쉬운 표현",
      "고백, 사과, 화해에 유리한 방식",
      "연애운을 살리는 소통 습관",
    ],
  },
  {
    number: "V",
    title: loveSecretReportText("loveSecretReport.005"),
    categories: [
      "불안이 올라오는 사주적 조건",
      "관계에서 집착이 생기는 패턴",
      "질투와 비교심이 생기는 지점",
      "버림받을까 봐 두려워지는 순간",
      "상대에게 확인받고 싶은 욕구",
      "회피와 밀어내기가 나타나는 조건",
      "비겁, 인성, 관성, 재성의 불안 구조",
      "내가 스스로를 지키기 위해 하는 방어",
      "불안을 낮추는 현실적 루틴",
      "건강한 애착을 만들기 위한 관계 연습",
    ],
  },
  {
    number: "VI",
    title: loveSecretReportText("loveSecretReport.006"),
    categories: [
      "배우자성의 위치와 강약",
      "배우자궁의 안정성",
      "내가 원하는 결혼의 형태",
      "결혼 후 역할 분담 성향",
      "현실적으로 잘 맞는 배우자 조건",
      "결혼운이 열리기 쉬운 대운과 세운",
      "결혼 이야기가 막히기 쉬운 시기",
      "결혼 전 반드시 확인해야 할 가치관",
      "배우자와 갈등이 생기기 쉬운 지점",
      "좋은 결혼으로 이어지기 위한 선택 기준",
    ],
  },
  {
    number: "VII",
    title: loveSecretReportText("loveSecretReport.007"),
    categories: [
      "이별이 발생하기 쉬운 관계 구조",
      "내가 마음이 식는 방식",
      "상대가 멀어질 때 내가 보이는 반응",
      "미련이 오래 남는 사주적 이유",
      "재회를 바라는 마음과 실제 인연의 구분",
      "재회 가능성을 높이는 조건",
      "재회를 피해야 하는 조건",
      "반복되는 이별 패턴을 끊는 방법",
      "이별 후 회복에 필요한 시간과 방식",
      "새로운 사랑으로 넘어가기 위한 정리법",
    ],
  },
  {
    number: "VIII",
    title: loveSecretReportText("loveSecretReport.008"),
    categories: [
      "한난조습으로 보는 나의 친밀감 온도",
      "차가운 기운과 뜨거운 기운이 애정 표현에 주는 영향",
      "건조한 기운과 습한 기운이 정서적 밀착에 주는 영향",
      "내가 편안하게 느끼는 스킨십 리듬",
      "관계가 과열되기 쉬운 조건",
      "관계가 차갑게 식기 쉬운 조건",
      "정서적 안정감을 느끼는 분위기",
      "친밀감에서 필요한 배려와 속도",
      "속궁합을 높이는 생활 리듬과 소통",
      "성적 단정이 아니라 조후 기반 친밀감 경향임을 명시",
    ],
  },
  {
    number: "IX",
    title: loveSecretReportText("loveSecretReport.009"),
    categories: [
      "좋은 인연이 들어오기 쉬운 대운",
      "연애운이 강해지는 세운",
      "2026년에 인연운이 움직이는 달",
      "용신과 희신이 살아나는 만남 조건",
      "나에게 맞는 만남 장소와 환경",
      "소개, 모임, 앱, 직장, 취미 중 유리한 경로",
      "피해야 할 만남의 조건",
      "인연을 놓치기 쉬운 나의 습관",
      "좋은 사람을 알아보는 기준",
      "인연운을 현실에서 활성화하는 행동 계획",
    ],
  },
  {
    number: "X",
    title: loveSecretReportText("loveSecretReport.010"),
    categories: [
      "내 연애의 핵심 한 문장",
      "반드시 살려야 할 매력",
      "반드시 관리해야 할 약점",
      "이상적인 상대의 구체적 조건",
      "피해야 할 상대 유형",
      "앞으로 90일 연애 행동 계획",
      "앞으로 1년 연애 행동 계획",
      "관계가 시작됐을 때 지켜야 할 원칙",
      "이별과 재회를 대하는 기준",
      "나에게 주는 최종 연애 조언",
    ],
  },
] satisfies LoveChapterSpec[];

export const COMPATIBILITY_LOVE_CHAPTER_SPECS = [
  { number: "I", title: loveSecretReportText("loveSecretReport.011"), categories: [] },
  { number: "II", title: loveSecretReportText("loveSecretReport.012"), categories: [] },
  { number: "III", title: loveSecretReportText("loveSecretReport.013"), categories: [] },
  { number: "IV", title: loveSecretReportText("loveSecretReport.014"), categories: [] },
  { number: "V", title: loveSecretReportText("loveSecretReport.015"), categories: [] },
  { number: "VI", title: loveSecretReportText("loveSecretReport.016"), categories: [] },
  { number: "VII", title: loveSecretReportText("loveSecretReport.017"), categories: [] },
  { number: "VIII", title: loveSecretReportText("loveSecretReport.018"), categories: [] },
  { number: "IX", title: loveSecretReportText("loveSecretReport.019"), categories: [] },
  { number: "X", title: loveSecretReportText("loveSecretReport.020"), categories: [] },
  { number: "XI", title: loveSecretReportText("loveSecretReport.021"), categories: [] },
  { number: "XII", title: loveSecretReportText("loveSecretReport.022"), categories: [] },
  { number: "XIII", title: loveSecretReportText("loveSecretReport.023"), categories: [] },
  { number: "XIV", title: loveSecretReportText("loveSecretReport.024"), categories: [] },
] satisfies LoveChapterSpec[];

export interface LoveSecretPersonBirth {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  calType?: 'solar' | 'lunar' | 'lunar_leap';
  calendarType?: 'solar' | 'lunar' | 'lunar_leap';
  isLunar?: boolean;
  timeUnknown?: boolean;
  birthDate?: string;
  birthTime?: string;
}

export interface SajuSoloSecretData {
  mode: 'SOLO';
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface SajuCoupleSecretPartnerData {
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface SajuCoupleSecretData {
  mode: 'COUPLE';
  profileId?: string;
  name: string;
  gender?: string;
  birth: LoveSecretPersonBirth;
  partnerName: string;
  partnerGender?: string;
  partnerBirth: LoveSecretPersonBirth;
  partnerData?: string;
  partner?: SajuCoupleSecretPartnerData;
  sajuData?: string;
  engineData?: Record<string, unknown>;
}

export interface LoveSecretChapterMeta {
  chapter: number;
  title: string;
  subtitle?: string;
  purpose?: string;
}

export interface LoveSecretReportPayloadBase {
  reportId?: string;
  reportMode: LoveSecretMode;
  totalChapters: 7 | 8;
  _premiumStrictPayload?: boolean;
  _premiumStrictValidation?: boolean;
}

export type LoveSecretReportPayload = SajuSoloSecretData | SajuCoupleSecretData;
