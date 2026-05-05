import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import {
  getSwissWesternChart as getLocalSwissWesternChart,
  getSwissVedicPlanets as getLocalSwissVedicPlanets,
} from "../lib/swiss-ephemeris.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const SUKUYO_MANSIONS = [
  ["각", "角", "Kaku", "동방", "목", "청룡"], ["항", "亢", "Kou", "동방", "금", "청룡"],
  ["저", "氐", "Tei", "동방", "토", "청룡"], ["방", "房", "Bou", "동방", "일", "청룡"],
  ["심", "心", "Shin", "동방", "월", "청룡"], ["미", "尾", "Bi", "동방", "화", "청룡"],
  ["기", "箕", "Ki", "동방", "수", "청룡"], ["두", "斗", "To", "북방", "목", "현무"],
  ["우", "牛", "Gyu", "북방", "금", "현무"], ["여", "女", "Jo", "북방", "토", "현무"],
  ["허", "虚", "Kyo", "북방", "일", "현무"], ["위", "危", "Ki", "북방", "월", "현무"],
  ["실", "室", "Shitsu", "북방", "화", "현무"], ["벽", "壁", "Heki", "북방", "수", "현무"],
  ["규", "奎", "Kei", "서방", "목", "백호"], ["루", "婁", "Ro", "서방", "금", "백호"],
  ["위", "胃", "I", "서방", "토", "백호"], ["묘", "昴", "Bo", "서방", "일", "백호"],
  ["필", "畢", "Hitsu", "서방", "월", "백호"], ["자", "觜", "Shi", "서방", "화", "백호"],
  ["삼", "参", "Shin", "서방", "수", "백호"], ["정", "井", "Sei", "남방", "목", "주작"],
  ["귀", "鬼", "Ki", "남방", "금", "주작"], ["류", "柳", "Ryu", "남방", "토", "주작"],
  ["성", "星", "Sei", "남방", "일", "주작"], ["장", "張", "Cho", "남방", "월", "주작"],
  ["익", "翼", "Yoku", "남방", "화", "주작"],
];

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const SUKUYO_CHAPTER_META = [
  { num: 1, title: "영혼의 원형", subtitle: "당신의 숙요별이 새긴 운명 코드", icon: "moon" },
  { num: 2, title: "감정의 조수간만", subtitle: "달의 주기가 만들어내는 정서 파동", icon: "moon" },
  { num: 3, title: "페르소나와 브랜딩", subtitle: "세상이 당신을 기억하는 방식", icon: "moon" },
  { num: 4, title: "자산의 중력", subtitle: "부를 끌어당기는 달빛 전략", icon: "moon" },
  { num: 5, title: "보이지 않는 톱니바퀴", subtitle: "성공 뒤에 숨겨진 협력 역학", icon: "moon" },
  { num: 6, title: "관계의 정밀 레이더", subtitle: "안괴·성쇠·우친 방향성과 거리 기반 궁합 해석", icon: "moon" },
  { num: 7, title: "파괴적 혁신", subtitle: "위기를 기회로 전환하는 달빛 전략", icon: "moon" },
  { num: 8, title: "조화로운 성장", subtitle: "나를 살리는 공간과 환경의 법칙", icon: "moon" },
  { num: 9, title: "정서적 유대", subtitle: "깊은 연결을 만드는 감정 지능", icon: "moon" },
  { num: 10, title: "운명적 거리", subtitle: "가까이해야 할 것과 멀리해야 할 것", icon: "moon" },
  { num: 11, title: "달의 주기", subtitle: "월령 에너지 사이클 완전 공략", icon: "moon" },
  { num: 12, title: "관계를 정리하는 회복 기술", subtitle: "힘든 인연을 좋은 흐름으로 바꾸는 법", icon: "moon" },
  { num: 13, title: "영혼의 마스터플랜", subtitle: "달빛 전략가의 10년 로드맵", icon: "moon" },
];

const SUKUYO_REPORT_TITLE_PERSONAL = "Moonlight Strategy: 숙요점 프리미엄 인생 리포트";
const SUKUYO_REPORT_TITLE_COMPAT = "Moonlight Strategy: 숙요점 프리미엄 궁합 리포트";
const SUKUYO_MIN_CHARS = 4000;
const SUKUYO_RELATION_LABELS = ["명", "영친", "우쇠", "안괴", "성위", "위성", "친영", "쇠우", "괴안"];
const SUKUYO_CHAPTER_GUIDES = [
  "27수 원형, 무의식 반응, 반복 패턴, 재능 사용 조건을 명확히 풀어내고 잘못 쓰일 때의 그림자도 함께 제시하세요.",
  "초승·상현·보름·하현·그믐 리듬을 감정 파동과 연결해 상승/하강 구간의 행동 규칙을 제시하세요.",
  "첫인상, 외부 평판, 브랜드 언어, 관계에서의 기대치 관리를 실제 문장/행동 예시로 제시하세요.",
  "수익 패턴, 누수 패턴, 손실 회피 습관, 달 리듬 기반 재정 운영 루틴을 현실적으로 제시하세요.",
  "협업 시 강점 역할, 충돌 트리거, 조정 대화 프레임을 구체적인 상황 예시와 함께 쓰세요.",
  "관계 축(안괴/성쇠/우친/영친)과 거리값을 근거로 방향성(나/상대 역할)을 절대 반대로 쓰지 말고 명시하세요.",
  "위기 구간에서의 감정 폭주를 혁신 동력으로 바꾸는 단계형 전환 전략을 작성하세요.",
  "공간, 수면, 식사, 이동 리듬을 숙요 에너지에 맞춰 재배치하는 생활 설계를 제시하세요.",
  "정서적 친밀감 형성 방식, 오해 누적 패턴, 회복 대화 문장을 포함한 관계 유지 지침을 제시하세요.",
  "관계 거리 조절법, 에너지 소모 관계 경계선, 귀인 구분 기준을 실제 상황 중심으로 쓰세요.",
  "한 달 주기를 5단계(초승/상현/보름/하현/그믐)로 나눠 각 단계별 행동 우선순위를 제시하세요.",
  "힘든 인연 정리와 회복의 경계선을 구분하고 안전한 종료/유지/복원 규칙을 단계별로 제시하세요.",
  "1년·3년·10년 마스터플랜과 90일 실행표를 제공하고 마지막에 핵심 행동 3가지를 확정하세요.",
];

const ASTRO_CHAPTER_META = [
  { num: 1, title: "페르소나와 존재의 핵", subtitle: "ASC·Sun·Moon", icon: "star" },
  { num: 2, title: "감정의 뿌리와 무의식의 안전가옥", subtitle: "Moon & 4th House", icon: "star" },
  { num: 3, title: "인지 체계와 정보의 연금술", subtitle: "Mercury & 3rd/9th", icon: "star" },
  { num: 4, title: "욕망의 미학과 가치 자산", subtitle: "Venus & 2nd/7th", icon: "star" },
  { num: 5, title: "추진력의 방향과 에너지 관리", subtitle: "Mars & 1st/8th", icon: "star" },
  { num: 6, title: "행운의 좌표와 확장의 철학", subtitle: "Jupiter & 9th", icon: "star" },
  { num: 7, title: "업보의 한계와 마스터의 길", subtitle: "Saturn & 10th", icon: "star" },
  { num: 8, title: "세대적 변화와 개인의 혁신", subtitle: "Uranus·Neptune·Pluto", icon: "star" },
  { num: 9, title: "영혼의 나침반", subtitle: "Lunar Nodes", icon: "star" },
  { num: 10, title: "시냅스트리", subtitle: "관계의 심리적 투사", icon: "star" },
  { num: 11, title: "컴포지트", subtitle: "우리라는 독립적 운명", icon: "star" },
  { num: 12, title: "현재 하늘의 메시지", subtitle: "Transit·Progression·Solar Return", icon: "star" },
  { num: 13, title: "별들의 마스터플랜", subtitle: "총결산과 Master Habit", icon: "star" },
];
const ASTRO_TOTAL_CHAPTERS = ASTRO_CHAPTER_META.length;
const ASTRO_REPORT_TITLE_PERSONAL = "Professional Edition: 서양 점성술 프리미엄 리포트";
const ASTRO_REPORT_SUBTITLE_PERSONAL = "ASC, Sun, Moon과 행성의 각도로 읽는 나의 심리적 우주 지도";
const ASTRO_REPORT_TITLE_COMPAT = "Professional Edition: 서양 점성술 궁합 리포트";
const ASTRO_REPORT_SUBTITLE_COMPAT = "Synastry와 Composite Chart로 읽는 두 사람의 관계 심리와 공동 운명";
const ASTRO_MIN_CHARS = 4000;
const ASTRO_MISSING_DATA_NOTICE = "일부 세부 점성술 데이터가 부족하므로, 제공된 차트 데이터와 일반 점성술 원리를 바탕으로 보완 분석합니다. 단, 없는 데이터를 있는 것처럼 단정하지 않습니다.";
const ASTRO_NO_BIRTHTIME_NOTICE = "출생 시간이 없어 ASC, MC, 하우스, 차트 통치성, 일부 궁합 하우스 오버레이 분석의 정밀도가 제한됩니다. 이 리포트는 태양, 달, 행성 간 주요 각도 중심으로 보완 분석되었습니다.";
const ASTRO_CHAPTER_GUIDES = [
  "ASC·Sun·Moon 삼각 구조, Chart Ruler, 원소/모달리티 균형을 결합해 성격 핵심과 행동 루틴을 작성하세요.",
  "Moon·4하우스·IC·4하우스 로드를 근거로 정서 패턴과 안전가옥 회복 루틴을 제시하세요.",
  "Mercury·3/9하우스·학습 스타일·정보 과부하 트리거를 분석하고 소통/브랜딩 전략을 제시하세요.",
  "Venus·2/7하우스·가치관·재물·관계 패턴을 연결하고 풍요 루틴과 관계 경계 규칙을 제시하세요.",
  "Mars·1/8하우스·분노 전환·에너지 관리·위기 돌파 전략을 구체적으로 제시하세요.",
  "Jupiter·9하우스 중심의 확장 통로, 전문성, 철학 정렬, 기회 포착 전략을 제시하세요.",
  "Saturn·10하우스·MC·Saturn Return을 통해 장기 성공 구조와 마스터리 훈련 계획을 제시하세요.",
  "Uranus·Neptune·Pluto와 개인 행성 연결을 통해 혁신/영감/변용의 균형을 제시하세요.",
  "North/South Node 축을 통해 익숙한 패턴과 진화 과제를 대비하고 30일 챌린지를 제시하세요.",
  "궁합이면 Synastry를, 개인 리포트면 관계 트리거/이상형 기준을 다루고 NVC 대화법을 포함하세요.",
  "궁합이면 Composite를, 개인 리포트면 미래 관계 설계를 다루고 공동 루틴을 제시하세요.",
  "Transit/Progression/Solar Return을 통합해 1~12월 월별 전략을 반드시 포함하세요.",
  "1~12챕터를 통합해 Master Habit 1개와 90일 실행표를 반드시 포함하세요.",
];

const VEDIC_CHAPTER_META = [
  { num: 1, title: "라그나와 영혼의 목적", subtitle: "Lagna & Atmakaraka", icon: "veda" },
  { num: 2, title: "나크샤트라", subtitle: "무의식의 27가지 빛", icon: "veda" },
  { num: 3, title: "다샤", subtitle: "인생의 웅장한 계절", icon: "veda" },
  { num: 4, title: "푸루샤르타와 부의 정렬", subtitle: "Artha·2하우스·11하우스", icon: "veda" },
  { num: 5, title: "카르마와 천직", subtitle: "Dharma·10하우스·D9·D10", icon: "veda" },
  { num: 6, title: "나밤샤", subtitle: "영혼의 성숙도와 잠재력", icon: "veda" },
  { num: 7, title: "관계의 거울", subtitle: "Ashta Koota Compatibility", icon: "veda" },
  { num: 8, title: "인연의 깊이와 카르믹 계약", subtitle: "7하우스·금성·화성", icon: "veda" },
  { num: 9, title: "생명력과 정화", subtitle: "6·8·12하우스 Health Analysis", icon: "veda" },
  { num: 10, title: "요가", subtitle: "특별한 축복의 조합", icon: "veda" },
  { num: 11, title: "우파야", subtitle: "운명을 바꾸는 실천 비책", icon: "veda" },
  { num: 12, title: "고차라와 올해의 전략", subtitle: "Transit & Annual Strategy", icon: "veda" },
  { num: 13, title: "마스터플랜", subtitle: "카르마를 넘어선 자유", icon: "veda" },
];
const VEDIC_TOTAL_CHAPTERS = VEDIC_CHAPTER_META.length;

const VEDIC_REPORT_TITLE_PERSONAL = "Karmic Blueprint: 베다 점성술 프리미엄 리포트";
const VEDIC_REPORT_SUBTITLE_PERSONAL = "라그나, 나크샤트라, 다샤로 읽는 이번 생의 카르마 지도";
const VEDIC_REPORT_TITLE_COMPAT = "Karmic Blueprint: 베다 점성술 궁합 리포트";
const VEDIC_REPORT_SUBTITLE_COMPAT = "Ashta Koota와 7하우스로 읽는 두 사람의 카르믹 계약";
const VEDIC_MIN_CHARS = 4000;
const VEDIC_PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const VEDIC_PLANET_KO = {
  Sun: "태양(Surya)",
  Moon: "달(Chandra)",
  Mars: "화성(Mangala)",
  Mercury: "수성(Budha)",
  Jupiter: "목성(Guru)",
  Venus: "금성(Shukra)",
  Saturn: "토성(Shani)",
  Rahu: "라후(Rahu)",
  Ketu: "케투(Ketu)",
};
const VEDIC_DASHA_SEQUENCE = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 },
];
const VEDIC_SIGN_EN = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const VEDIC_NAKSHATRA_META = [
  { name: "Ashwini", lord: "Ketu", deity: "Ashvini Kumaras", symbol: "말의 머리" },
  { name: "Bharani", lord: "Venus", deity: "Yama", symbol: "자궁" },
  { name: "Krittika", lord: "Sun", deity: "Agni", symbol: "칼날" },
  { name: "Rohini", lord: "Moon", deity: "Brahma", symbol: "수레" },
  { name: "Mrigashira", lord: "Mars", deity: "Soma", symbol: "사슴 머리" },
  { name: "Ardra", lord: "Rahu", deity: "Rudra", symbol: "눈물" },
  { name: "Punarvasu", lord: "Jupiter", deity: "Aditi", symbol: "활집" },
  { name: "Pushya", lord: "Saturn", deity: "Brihaspati", symbol: "꽃" },
  { name: "Ashlesha", lord: "Mercury", deity: "Nagas", symbol: "뱀" },
  { name: "Magha", lord: "Ketu", deity: "Pitris", symbol: "왕좌" },
  { name: "Purva Phalguni", lord: "Venus", deity: "Bhaga", symbol: "침대 앞다리" },
  { name: "Uttara Phalguni", lord: "Sun", deity: "Aryaman", symbol: "침대 뒷다리" },
  { name: "Hasta", lord: "Moon", deity: "Savitar", symbol: "손" },
  { name: "Chitra", lord: "Mars", deity: "Tvashtar", symbol: "보석" },
  { name: "Swati", lord: "Rahu", deity: "Vayu", symbol: "바람" },
  { name: "Vishakha", lord: "Jupiter", deity: "Indra-Agni", symbol: "개선문" },
  { name: "Anuradha", lord: "Saturn", deity: "Mitra", symbol: "연꽃" },
  { name: "Jyeshtha", lord: "Mercury", deity: "Indra", symbol: "귀걸이" },
  { name: "Mula", lord: "Ketu", deity: "Nirriti", symbol: "뿌리 묶음" },
  { name: "Purva Ashadha", lord: "Venus", deity: "Apah", symbol: "부채" },
  { name: "Uttara Ashadha", lord: "Sun", deity: "Vishwadevas", symbol: "코끼리 이빨" },
  { name: "Shravana", lord: "Moon", deity: "Vishnu", symbol: "귀" },
  { name: "Dhanishtha", lord: "Mars", deity: "Vasus", symbol: "북" },
  { name: "Shatabhisha", lord: "Rahu", deity: "Varuna", symbol: "빈 원" },
  { name: "Purva Bhadrapada", lord: "Jupiter", deity: "Aja Ekapada", symbol: "칼" },
  { name: "Uttara Bhadrapada", lord: "Saturn", deity: "Ahir Budhnya", symbol: "뒷다리" },
  { name: "Revati", lord: "Mercury", deity: "Pushan", symbol: "탬버린" },
];
const VEDIC_CHAPTER_GUIDES = [
  "라그나·라그나로드·아트마카라카를 함께 해석하고, 영혼 과제를 현실 루틴으로 연결하세요.",
  "Moon Nakshatra 신화·상징·지배 행성을 설명하고 감정 트리거와 안정 루틴을 제시하세요.",
  "Maha/Antar/Pratyantar Dasha 흐름을 계절 은유로 설명하고 확장/수성 시기를 나누세요.",
  "2·11하우스와 다나 요가를 근거로 수익/누수 패턴과 재정 루틴을 제시하세요.",
  "10하우스·아마티아카라카·D10 중심으로 직업 전략과 조직/독립 적합도를 제시하세요.",
  "D1 대비 D9 변화를 설명하고 중년 이후 발현되는 성숙 과제를 구체화하세요.",
  "궁합 데이터가 있으면 Ashta Koota 8항목과 총점을 해석하고, 없으면 조화로운 파트너 기준을 제시하세요.",
  "7하우스·금성·화성·다라카라카를 연결해 연애/결혼 패턴과 경계 설정법을 제시하세요.",
  "6·8·12하우스와 생활 루틴을 연결해 건강 관리·정화 전략을 제시하세요.",
  "Raja/Dhana/Gaja Kesari/Neecha Bhanga/Vipareeta Raja를 중심으로 요가 발현 조건을 제시하세요.",
  "우파야를 미신이 아닌 행동 처방으로 제시하고 요일·색상·만트라·봉사 루틴을 제공합니다.",
  "고차라(목성/토성/라후-케투)와 다샤를 결합해 월별 행동 전략 1~12월을 작성하세요.",
  "전체 분석을 통합해 90일 로드맵 표와 최종 선언문을 포함한 마스터플랜을 작성하세요.",
];
const VEDIC_MISSING_DATA_NOTICE = "일부 세부 계산 데이터가 부족하므로, 제공된 베다 점성술 데이터와 일반 주티쉬 원리를 바탕으로 보완 분석합니다. 단, 없는 데이터를 있는 것처럼 단정하지 않습니다.";

const ZIWEI_CHAPTER_META = [
  {
    num: 1,
    title: "타고난 명(命)과 본질 - 명궁·신궁 분석",
    subtitle: "핵심 자아·행동 방식·삼방사정 기반 인생 방향 해석",
    icon: "ziwei"
  },
  {
    num: 2,
    title: "내면의 심리와 무의식 - 복덕궁 분석",
    subtitle: "스트레스 패턴·회복력·정서 개운 루틴 심층 분석",
    icon: "ziwei"
  },
  {
    num: 3,
    title: "외형적 이미지와 사회적 페르소나 - 천이궁 분석",
    subtitle: "첫인상·대외 활동운·이동/여행/확장 전략",
    icon: "ziwei"
  },
  {
    num: 4,
    title: "진로, 적성 및 직업운 - 관록궁 분석",
    subtitle: "직업 적성·조직/사업 성향·명예운과 실전 커리어 전략",
    icon: "ziwei"
  },
  {
    num: 5,
    title: "재물운과 자산 관리 스타일 - 재백궁 분석",
    subtitle: "수익 구조·지출 패턴·리스크 관리 기반 자산 전략",
    icon: "ziwei"
  },
  {
    num: 6,
    title: "연애 성향과 배우자운 - 부처궁 분석",
    subtitle: "연애 패턴·궁합 구조·관계 안정화 전략",
    icon: "ziwei"
  },
  {
    num: 7,
    title: "인간관계와 인맥 - 교우궁·형제궁 분석",
    subtitle: "귀인/소인 구분·네트워크 운영·관계 스트레스 관리",
    icon: "ziwei"
  },
  {
    num: 8,
    title: "부동산 운과 가정 환경 - 전택궁 분석",
    subtitle: "거주 안정성·공간 에너지·이사/주거 전략",
    icon: "ziwei"
  },
  {
    num: 9,
    title: "건강과 활력 - 질액궁 분석",
    subtitle: "체력 흐름·생활 습관·회복 루틴 기반 건강 관리",
    icon: "ziwei"
  },
  {
    num: 10,
    title: "생애 주기와 10년 대운 - 대한 분석",
    subtitle: "현재 대한 중심의 10년 전략 보고서",
    icon: "ziwei"
  },
  {
    num: 11,
    title: "올해의 신년운세와 월별 흐름 - 유년·유월 분석",
    subtitle: "연간 핵심 흐름과 12개월 타이밍 로드맵",
    icon: "ziwei"
  },
  {
    num: 12,
    title: "액운 대처법과 맞춤형 행운 아이템 - 개운법 총결산",
    subtitle: "수호 상징·행운 아이템·리스크 대응 개운 설계",
    icon: "ziwei"
  },
  {
    num: 13,
    title: "종합 총운과 90일 실행 로드맵",
    subtitle: "전체 명반 통합 총평과 실천 중심 변화 계획",
    icon: "ziwei"
  },
];

const ZIWEI_REPORT_TITLE = "나의 운명을 깨우는 심화 자미두수 리포트";
const ZIWEI_PROLOGUE_TITLE = "프롤로그: 이 명반이 말해주는 삶의 큰 방향";
const ZIWEI_MIN_CHARS = 5200;

const ZIWEI_CHAPTER_GUIDES = [
  "명궁과 신궁을 중심으로 타고난 기질, 실제 행동 방식, 겉모습과 내면의 차이, 강점·약점, 핵심 키워드, 아침/저녁 루틴, 마인드셋 개운법을 다루고 마지막에 '나는 어떤 방식으로 살아야 운이 열리는 사람인가?'를 상담형으로 정리하세요.",
  "복덕궁 중심으로 깊은 불안 원인, 스트레스/붕괴 패턴, 회복 환경, 취미, 5분 명상, 잠들기 전 심상화, 감정 정화 글쓰기, 공간 정리, 불안 완화 취미를 포함해 상담가 톤으로 작성하세요.",
  "천이궁을 세상과 만나는 방식으로 해석하고 첫인상, 사회생활 태도, 이동/이사/해외 인연, 귀인 장소, 피해야 할 대외 행동, 스타일링, 운 트이는 색/방향/장소, 여행 개운법을 포함하세요.",
  "관록궁 중심으로 직업 재능, 추천 직업군 3~5개(근거 포함), 직장형/사업형, 리더십 스타일, 조직 관계 유의점, 승진운, 사무실 풍수, 처세술을 작성하고 인생 격을 올리는 일의 조건을 명확히 정리하세요.",
  "재백궁 중심으로 수익 구조, 누수 패턴, 저축/투자 성향, 수익 형태 궁합, 유리한 시기, 피해야 할 투자 습관, 지갑 색상, 보관 방향, 생활 풍수를 포함하세요. 수익 보장 표현은 금지하고 위험 관리 조언으로 쓰세요.",
  "부처궁 중심으로 끌리는 사람과 실제 궁합, 연애 실수, 결혼 후 성향, 상처 지점, 악연 구별, 좋은 인연 행동, 데이트 스타일링, 말투/장소/색상, 관계 안정화 전략을 포함하세요.",
  "교우궁·형제궁을 함께 해석해 귀인/소인 유형, 동업 가능성, 배신 예방, 인맥 기회화, 거리 조절, 대화 개운법, 관계운 소품/방향을 제시하고 두 궁의 충돌/보완 지점을 명확히 설명하세요.",
  "전택궁 중심으로 부동산 인연, 내 집 마련 흐름, 청약/매매/임대/상속, 가정환경 영향, 안정되는 집 조건, 피할 환경, 현관/침실/책상/침대 배치, 이사 방향/시기, 대장군방/삼살방 현대 해석을 포함하세요.",
  "질액궁 중심으로 취약 부위 경향, 스트레스 신체화, 체력 장단점, 생활 습관, 오행 균형 음식, 운동, 숙면 환경, 머리 방향, 약한 시기 관리, 몸-마음 동시 회복 루틴을 제시하세요. 질병 진단/보장은 금지하세요.",
  "대한 중심으로 현재 10년을 가장 자세히 다루고 이전/다음 대한과 연결하세요. 강해지는 운/약해지는 운, 재물·직업·관계·건강 흐름, 확장/수비 타이밍, 무리수 방지, 대운 강약 대응법을 포함하고 핵심 행동 강령 5가지를 제시하세요.",
  "유년·유월 분석으로 올해 전체 흐름, 기회/주의점, 직업/재물/관계/건강 흐름을 다루고 반드시 1월~12월을 '## N월' + 핵심 흐름/좋은 선택/주의할 점/개운 행동 형식으로 모두 작성하세요.",
  "1~11챕터 종합 개운법으로 수호 동물, 행운 색/숫자/방향/장소, 추천 소품, 피할 습관, 액운 신호, 대응 행동, 상승기 행동, 운명 개조 마스터플랜을 제시하고 마지막에 '나만의 개운 선언문'을 작성하세요.",
  "전체 명반의 핵심 총평과 1년/3년 방향, 실패 패턴과 차단법, 7일·30일·60일·90일 루틴을 제시하고 반드시 90일 실행 로드맵 표를 포함하세요. 엔딩 메시지는 운명은 고정이 아니라 선택의 결과라는 방향으로 마무리하세요.",
];

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseSections(text) {
  return String(text || "").split(/\n(?=##\s+)/g).map((part) => {
    const match = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return match ? { title: match[1].trim(), body: match[2].trim() } : null;
  }).filter(Boolean);
}

function normalizeBody(body) {
  return {
    year: clampInt(body.year ?? body.birthYear, 1990, 1900, 2100),
    month: clampInt(body.month ?? body.birthMonth, 1, 1, 12),
    day: clampInt(body.day ?? body.birthDay, 1, 1, 31),
    hour: clampInt(body.hour ?? body.birthHour, 12, 0, 23),
    minute: clampInt(body.minute, 0, 0, 59),
    timezone: Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665,
    lon: Number.isFinite(Number(body.lon ?? body.lng)) ? Number(body.lon ?? body.lng) : 126.978,
    chapter: clampInt(body.chapter ?? body.sessionId, 1, 1, 13),
    name: String(body.name || "사용자").slice(0, 80),
    gender: String(body.gender || "").slice(0, 20),
  };
}

function normalizeDeg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function signFromDeg(value) {
  const lon = normalizeDeg(value);
  if (!Number.isFinite(lon)) return null;
  const sign = Math.floor(lon / 30);
  return {
    longitude: Math.round(lon * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    degree: Math.round((lon % 30) * 100) / 100,
  };
}

function getApiBaseOrigin(request, env) {
  const preferred = String(env.API_UPSTREAM_ORIGIN || "").trim();
  if (preferred) return preferred.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

async function postBackendJson(request, env, apiPath, payload, timeoutMs = 12000) {
  const base = getApiBaseOrigin(request, env);
  const url = `${base}${apiPath}`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (_) {}
    }
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      const message = String(data?.error || data?.message || `API 호출 실패 (${response.status})`).trim();
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function getSwissWesternChart(request, env, input) {
  return getLocalSwissWesternChart(env, input, { requestUrl: request?.url });
}

const VEDIC_DIGNITY_MAP = {
  Sun: { exalt: 0, debit: 6, own: [4] },
  Moon: { exalt: 1, debit: 7, own: [3] },
  Mars: { exalt: 9, debit: 3, own: [0, 7] },
  Mercury: { exalt: 5, debit: 11, own: [2, 5] },
  Jupiter: { exalt: 3, debit: 9, own: [8, 11] },
  Venus: { exalt: 11, debit: 5, own: [1, 6] },
  Saturn: { exalt: 6, debit: 0, own: [9, 10] },
  Rahu: { exalt: 2, debit: 8, own: [] },
  Ketu: { exalt: 8, debit: 2, own: [] },
};

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function toIsoDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function asBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

function getRashiLord(signIdx) {
  const lords = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
  const idx = ((Number(signIdx) % 12) + 12) % 12;
  return lords[idx];
}

function calcNakshatraInfoByLongitude(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) {
    return {
      name: "Unknown",
      ko: "정보 없음",
      pada: null,
      lord: "Unknown",
      deity: "정보 없음",
      symbol: "정보 없음",
      degreeInNakshatra: null,
    };
  }
  const span = 360 / 27;
  const padaSpan = span / 4;
  const idx = Math.floor(lon / span);
  const inNak = lon - idx * span;
  const pada = Math.floor(inNak / padaSpan) + 1;
  const meta = VEDIC_NAKSHATRA_META[idx] || { name: "Unknown", lord: "Unknown", deity: "정보 없음", symbol: "정보 없음" };
  return {
    name: meta.name,
    ko: meta.name,
    pada,
    lord: meta.lord,
    deity: meta.deity,
    symbol: meta.symbol,
    degreeInNakshatra: Math.round(inNak * 100) / 100,
  };
}

function calcNavamsaSign(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon % 30;
  const part = Math.floor(degInSign / (30 / 9));
  const startSign = [0, 8, 4, 0, 8, 4, 0, 8, 4, 0, 8, 4][signIdx];
  const navSign = (startSign + part) % 12;
  return { sign: navSign, signName: VEDIC_SIGN_EN[navSign], signKo: SIGN_KO[navSign] };
}

function calcDashamsaSign(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon % 30;
  const part = Math.floor(degInSign / 3);
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? signIdx : (signIdx + 9) % 12;
  const d10Sign = (start + part) % 12;
  return { sign: d10Sign, signName: VEDIC_SIGN_EN[d10Sign], signKo: SIGN_KO[d10Sign] };
}

function calcDignityFlags(planetName, signIdx) {
  const info = VEDIC_DIGNITY_MAP[planetName];
  if (!info) {
    return {
      dignity: "Neutral",
      isExalted: false,
      isDebilitated: false,
      isOwnSign: false,
      isFriendlySign: false,
      isEnemySign: false,
    };
  }
  const isExalted = info.exalt === signIdx;
  const isDebilitated = info.debit === signIdx;
  const isOwnSign = Array.isArray(info.own) && info.own.includes(signIdx);
  return {
    dignity: isExalted ? "Exalted" : isDebilitated ? "Debilitated" : isOwnSign ? "Own Sign" : "Neutral",
    isExalted,
    isDebilitated,
    isOwnSign,
    isFriendlySign: false,
    isEnemySign: false,
  };
}

function calcVimshottariFromMoon(moonLongitude, input) {
  const moonNak = calcNakshatraInfoByLongitude(moonLongitude);
  const lordIndex = VEDIC_DASHA_SEQUENCE.findIndex((d) => d.planet === moonNak.lord);
  const seqStart = lordIndex >= 0 ? lordIndex : 0;
  const span = 360 / 27;
  const elapsed = Number(moonNak.degreeInNakshatra || 0) / span;
  const firstYears = VEDIC_DASHA_SEQUENCE[seqStart].years * (1 - elapsed);
  const birthDate = new Date(Date.UTC(
    Number(input.year || 1990),
    Math.max(0, Number(input.month || 1) - 1),
    Number(input.day || 1),
    Number(input.hour || 12),
    Number(input.minute || 0),
    0,
    0,
  ));
  const now = new Date();

  let cursor = new Date(birthDate);
  let seq = seqStart;
  let current = null;
  let antar = null;
  let pratyantar = null;
  let upcoming = null;

  for (let i = 0; i < 27; i += 1) {
    const major = VEDIC_DASHA_SEQUENCE[seq % 9];
    const years = i === 0 ? firstYears : major.years;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + years * 365.25 * 86400000);

    if (start <= now && now < end) {
      const remainYears = Math.round(((end.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
      current = {
        planet: major.planet,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        remainYears,
      };

      let antarCursor = new Date(start);
      for (let j = 0; j < 9; j += 1) {
        const antarMajor = VEDIC_DASHA_SEQUENCE[(seq + j) % 9];
        const antarMs = ((major.years * antarMajor.years) / 120) * 365.25 * 86400000;
        const antarEnd = new Date(antarCursor.getTime() + antarMs);
        if (antarCursor <= now && now < antarEnd) {
          const antarRemain = Math.round(((antarEnd.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
          antar = {
            planet: antarMajor.planet,
            startDate: toIsoDate(antarCursor),
            endDate: toIsoDate(antarEnd),
            remainYears: antarRemain,
          };

          let prCursor = new Date(antarCursor);
          for (let k = 0; k < 9; k += 1) {
            const prMajor = VEDIC_DASHA_SEQUENCE[(seq + j + k) % 9];
            const prMs = ((major.years * antarMajor.years * prMajor.years) / (120 * 120)) * 365.25 * 86400000;
            const prEnd = new Date(prCursor.getTime() + prMs);
            if (prCursor <= now && now < prEnd) {
              const prRemain = Math.round(((prEnd.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
              pratyantar = {
                planet: prMajor.planet,
                startDate: toIsoDate(prCursor),
                endDate: toIsoDate(prEnd),
                remainYears: prRemain,
              };
              break;
            }
            prCursor = new Date(prEnd);
          }
          break;
        }
        antarCursor = new Date(antarEnd);
      }
    } else if (start > now && !upcoming && current) {
      upcoming = {
        planet: major.planet,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        remainYears: Math.round(((end.getTime() - start.getTime()) / (365.25 * 86400000)) * 10) / 10,
      };
      break;
    }

    cursor = new Date(end);
    seq = (seq + 1) % 9;
  }

  if (!current) {
    const major = VEDIC_DASHA_SEQUENCE[seqStart];
    current = {
      planet: major.planet,
      startDate: toIsoDate(birthDate),
      endDate: "",
      remainYears: major.years,
    };
  }
  if (!antar) {
    antar = {
      planet: current.planet,
      startDate: current.startDate,
      endDate: current.endDate,
      remainYears: current.remainYears,
    };
  }

  return { current, antar, pratyantar, upcoming };
}

function detectVedicYogasFromChart(chart) {
  const planets = chart.planets || {};
  const yogas = [];
  const moon = planets.Moon;
  const jupiter = planets.Jupiter;
  const sun = planets.Sun;
  const mercury = planets.Mercury;

  if (moon && jupiter) {
    const diff = Math.abs((jupiter.house || 0) - (moon.house || 0));
    const kendra = [0, 3, 6, 9].includes(diff) || [0, 3, 6, 9].includes(12 - diff);
    if (kendra) yogas.push({ name: "Gaja Kesari Yoga", nameKo: "가자 케사리 요가", description: "목성과 달의 켄드라 연결" });
  }

  if (sun && mercury && sun.sign === mercury.sign) {
    yogas.push({ name: "Budha-Aditya Yoga", nameKo: "부다-아디티야 요가", description: "태양-수성 동궁" });
  }

  const dhanaCandidates = [2, 11].some((house) => Object.values(planets).some((p) => p && p.house === house && p.isOwnSign));
  if (dhanaCandidates) {
    yogas.push({ name: "Dhana Yoga", nameKo: "다나 요가", description: "자산·이익 하우스의 강화 배치" });
  }

  const rajaCandidates = Object.values(planets).some((p) => p && [1, 4, 7, 10].includes(p.house) && p.isExalted);
  if (rajaCandidates) {
    yogas.push({ name: "Raja Yoga", nameKo: "라자 요가", description: "켄드라에서의 강한 권위 배치" });
  }

  return yogas;
}

function deriveVedicChartFromPlanets(planetsPayload = {}, input = {}) {
  const planets = planetsPayload.planets || {};
  const asc = signFromDeg(planetsPayload.ascendantSidereal);
  if (!asc) {
    throw new Error("Swiss 라이브러리 계산 응답에 ascendantSidereal이 없어 베다 차트를 생성할 수 없습니다.");
  }

  const moonLon = Number(planets.Moon);
  if (!Number.isFinite(moonLon)) {
    throw new Error("Swiss 라이브러리 계산 응답에 Moon sidereal longitude가 없습니다.");
  }

  const retroMap = planetsPayload.retrograde || planetsPayload.retro || planetsPayload.retrogrades || {};
  const combustMap = planetsPayload.combust || planetsPayload.combustion || {};
  const strengthMap = planetsPayload.strength || planetsPayload.dignityStrength || {};

  const vedicPlanets = {};
  for (const name of VEDIC_PLANET_ORDER) {
    const info = signFromDeg(planets[name]);
    if (!info) continue;
    const nak = calcNakshatraInfoByLongitude(info.longitude);
    const dignityFlags = calcDignityFlags(name, info.sign);
    vedicPlanets[name] = {
      name,
      nameKo: VEDIC_PLANET_KO[name] || name,
      ...info,
      signName: VEDIC_SIGN_EN[info.sign],
      house: ((info.sign - asc.sign + 12) % 12) + 1,
      nakshatra: nak.name,
      nakshatraKo: nak.ko,
      nakshatraPada: nak.pada,
      nakshatraLord: nak.lord,
      nakshatraDeity: nak.deity,
      nakshatraSymbol: nak.symbol,
      isRetrograde: asBool(retroMap[name]),
      isCombust: asBool(combustMap[name]),
      strength: Number.isFinite(Number(strengthMap[name])) ? Number(strengthMap[name]) : null,
      ...dignityFlags,
    };
  }

  const moonNak = calcNakshatraInfoByLongitude(moonLon);
  const moonSign = signFromDeg(moonLon) || { signKo: "정보 없음", sign: null };

  const movablePlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const sortedByDegree = movablePlanets
    .map((p) => vedicPlanets[p])
    .filter(Boolean)
    .sort((a, b) => b.degree - a.degree);
  const atmakaraka = sortedByDegree[0] || null;
  const amatyakaraka = sortedByDegree[1] || null;
  const darakaraka = sortedByDegree[sortedByDegree.length - 1] || null;

  const computedDasha = calcVimshottariFromMoon(moonLon, input);
  const payloadDasha = planetsPayload.vimshottariDasha || planetsPayload.dasha || {};
  const vimshottariDasha = {
    current: payloadDasha.current || computedDasha.current,
    antar: payloadDasha.antar || computedDasha.antar,
    pratyantar: payloadDasha.pratyantar || computedDasha.pratyantar || null,
    upcoming: payloadDasha.upcoming || computedDasha.upcoming || null,
  };

  const d9 = {};
  const d10 = {};
  for (const p of Object.keys(vedicPlanets)) {
    const nav = calcNavamsaSign(vedicPlanets[p].longitude);
    const da10 = calcDashamsaSign(vedicPlanets[p].longitude);
    if (nav) d9[p] = nav;
    if (da10) d10[p] = da10;
  }

  const derived = {
    source: String(planetsPayload.source || "swiss-wasm-local"),
    ayanamsa: Number.isFinite(Number(planetsPayload.ayanamsa)) ? Number(planetsPayload.ayanamsa) : null,
    ayanamsaMode: String(input.ayanamsa || "lahiri").toLowerCase(),
    lagna: {
      ...asc,
      house: 1,
      signName: VEDIC_SIGN_EN[asc.sign],
      lord: getRashiLord(asc.sign),
    },
    moonNakshatra: {
      name: moonNak.name,
      ko: moonNak.ko,
      pada: moonNak.pada,
      lord: moonNak.lord,
      deity: moonNak.deity,
      symbol: moonNak.symbol,
      degreeInNakshatra: moonNak.degreeInNakshatra,
      moonSign: VEDIC_SIGN_EN[moonSign.sign] || "Unknown",
      moonSignKo: moonSign.signKo || "정보 없음",
    },
    planets: vedicPlanets,
    atmakaraka,
    amatyakaraka,
    darakaraka,
    vimshottariDasha,
    d1: {
      lagnaSign: VEDIC_SIGN_EN[asc.sign],
      lagnaDegree: round1(asc.degree),
      ascendantSidereal: round1(asc.longitude),
    },
    d9,
    d10,
    yogas: Array.isArray(planetsPayload.yogas) && planetsPayload.yogas.length
      ? planetsPayload.yogas
      : detectVedicYogasFromChart({ planets: vedicPlanets }),
    houses: {
      h2: { sign: VEDIC_SIGN_EN[(asc.sign + 1) % 12], lord: getRashiLord((asc.sign + 1) % 12) },
      h7: { sign: VEDIC_SIGN_EN[(asc.sign + 6) % 12], lord: getRashiLord((asc.sign + 6) % 12) },
      h10: { sign: VEDIC_SIGN_EN[(asc.sign + 9) % 12], lord: getRashiLord((asc.sign + 9) % 12) },
      h11: { sign: VEDIC_SIGN_EN[(asc.sign + 10) % 12], lord: getRashiLord((asc.sign + 10) % 12) },
      h12: { sign: VEDIC_SIGN_EN[(asc.sign + 11) % 12], lord: getRashiLord((asc.sign + 11) % 12) },
    },
    transits: planetsPayload.transits || planetsPayload.gochar || null,
    ashtaKoota: planetsPayload.ashtaKoota || planetsPayload.compatibility || null,
    rawSwiss: {
      ayanamsa: planetsPayload.ayanamsa,
      ascendantSidereal: planetsPayload.ascendantSidereal,
      planets,
    },
  };

  return derived;
}

async function getSwissVedicChart(request, env, input) {
  const payload = await getLocalSwissVedicPlanets(env, input, { requestUrl: request?.url });
  return deriveVedicChartFromPlanets(payload, input);
}

function zodiacBySeed(year, month, day, hour, offset = 0) {
  const raw = year * 372 + month * 31 + day + hour + offset * 17;
  const longitude = ((raw * 13.176 + offset * 29.53) % 360 + 360) % 360;
  const sign = Math.floor(longitude / 30);
  return {
    longitude: Math.round(longitude * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    signEmoji: "",
    degree: Math.round((longitude % 30) * 100) / 100,
  };
}

function buildWesternChart(input) {
  const asc = zodiacBySeed(input.year, input.month, input.day, input.hour, 1);
  const planets = {};
  PLANETS.forEach((name, index) => {
    const info = zodiacBySeed(input.year, input.month, input.day, input.hour, index + 2);
    planets[name] = { ...info, house: ((info.sign - asc.sign + 12) % 12) + 1 };
  });
  const aspects = [];
  const names = Object.keys(planets);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const diff = Math.abs(planets[names[i]].longitude - planets[names[j]].longitude);
      const normalized = diff > 180 ? 360 - diff : diff;
      const types = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
      const found = types.find(([deg]) => Math.abs(normalized - deg) <= 8);
      if (found) aspects.push({ p1: names[i], p2: names[j], type: found[1], orb: Math.round(Math.abs(normalized - found[0]) * 100) / 100 });
    }
  }
  return {
    planets,
    ascendant: { ...asc, house: 1 },
    midheaven: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 11), house: 10 },
    northNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 12), house: 9 },
    southNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 13), house: 3 },
    aspects,
  };
}

const ASTRO_SIGN_RULER = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"];
const ASTRO_ELEMENT_BY_SIGN = ["Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water"];
const ASTRO_MODALITY_BY_SIGN = ["Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable"];
const ASTRO_PLANET_KO = {
  Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성",
  Uranus: "천왕성", Neptune: "해왕성", Pluto: "명왕성", NorthNode: "북노드", SouthNode: "남노드", Chiron: "키론",
  PartOfFortune: "포르투나", Vertex: "버텍스",
};
const ASTRO_MAJORS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode", "SouthNode", "Chiron"];
const ASTRO_REPORT_CACHE = new Map();

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeAspectType(type) {
  const source = String(type || "").trim().toLowerCase();
  if (source.includes("conj")) return "conjunction";
  if (source.includes("opp")) return "opposition";
  if (source.includes("squ")) return "square";
  if (source.includes("tri")) return "trine";
  if (source.includes("sex")) return "sextile";
  if (source.includes("quin")) return "quincunx";
  if (source.includes("semi")) return "semi-square";
  if (source.includes("sesqui")) return "sesquiquadrate";
  return source || "aspect";
}

function aspectDegreeByType(type) {
  const t = normalizeAspectType(type);
  const map = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
    quincunx: 150,
    "semi-square": 45,
    sesquiquadrate: 135,
  };
  return Number.isFinite(map[t]) ? map[t] : null;
}

function getAspectOrbLimit(p1, p2, type) {
  const major = ["conjunction", "opposition", "square", "trine", "sextile"].includes(type);
  const luminary = p1 === "Sun" || p1 === "Moon" || p2 === "Sun" || p2 === "Moon";
  if (!major) return luminary ? 3.5 : 2.8;
  if (luminary) return 8;
  if (p1.includes("Node") || p2.includes("Node") || p1 === "Chiron" || p2 === "Chiron") return 5;
  return 6;
}

function calcAspectsFromLongitudes(points, includeMinor = true) {
  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
  ];
  if (includeMinor) {
    defs.push(
      { type: "quincunx", deg: 150 },
      { type: "semi-square", deg: 45 },
      { type: "sesquiquadrate", deg: 135 },
    );
  }

  const aspects = [];
  const names = Object.keys(points || {}).filter((k) => Number.isFinite(Number(points[k])));
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const p1 = names[i];
      const p2 = names[j];
      const lon1 = normalizeDeg(points[p1]);
      const lon2 = normalizeDeg(points[p2]);
      if (!Number.isFinite(lon1) || !Number.isFinite(lon2)) continue;
      const diff = Math.abs(lon1 - lon2);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        const maxOrb = getAspectOrbLimit(p1, p2, def.type);
        if (orb <= maxOrb) {
          aspects.push({ p1, p2, type: def.type, orb: round2(orb), exact: round2(def.deg), distance: round2(dist) });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

function buildHouseCusps(ascLon, houseSystem = "placidus") {
  const normalizedAsc = normalizeDeg(ascLon);
  if (!Number.isFinite(normalizedAsc)) return [];
  const system = String(houseSystem || "placidus").toLowerCase();
  const cusps = [];
  if (system === "whole-sign" || system === "whole" || system === "wholesign") {
    const start = Math.floor(normalizedAsc / 30) * 30;
    for (let i = 0; i < 12; i += 1) cusps.push(normalizeDeg(start + i * 30));
    return cusps;
  }
  // Swiss 응답에 하우스 커스프가 없을 때는 ASC 기준 30도 등분 근사값을 사용한다.
  for (let i = 0; i < 12; i += 1) cusps.push(normalizeDeg(normalizedAsc + i * 30));
  return cusps;
}

function locateHouseByCusps(longitude, cusps) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon) || !Array.isArray(cusps) || cusps.length !== 12) return null;
  for (let i = 0; i < 12; i += 1) {
    const start = normalizeDeg(cusps[i]);
    const end = normalizeDeg(cusps[(i + 1) % 12]);
    const inHouse = start <= end ? (lon >= start && lon < end) : (lon >= start || lon < end);
    if (inHouse) return i + 1;
  }
  return 1;
}

function signByLongitude(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const sign = Math.floor(lon / 30);
  return {
    sign,
    signKo: SIGN_KO[sign],
    degree: round2(lon % 30),
    longitude: round2(lon),
    element: ASTRO_ELEMENT_BY_SIGN[sign],
    modality: ASTRO_MODALITY_BY_SIGN[sign],
  };
}

function enrichPlanet(name, longitude, house, extras = {}) {
  const info = signByLongitude(longitude);
  if (!info) return null;
  return {
    name,
    nameKo: ASTRO_PLANET_KO[name] || name,
    ...info,
    house: Number.isFinite(Number(house)) ? Number(house) : null,
    ...extras,
  };
}

function dominantByCount(values = []) {
  const counter = {};
  for (const v of values) {
    if (!v) continue;
    counter[v] = (counter[v] || 0) + 1;
  }
  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return entries[0] ? { key: entries[0][0], count: entries[0][1], breakdown: counter } : { key: null, count: 0, breakdown: counter };
}

function dedupeAspects(aspects) {
  const seen = new Set();
  const result = [];
  for (const a of aspects || []) {
    const left = String(a.p1 || "");
    const right = String(a.p2 || "");
    const key = `${[left, right].sort().join("~")}::${normalizeAspectType(a.type)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...a, type: normalizeAspectType(a.type), orb: round2(a.orb) });
  }
  return result;
}

function buildWesternPremiumChart(rawChart = {}, input = {}, options = {}) {
  const houseSystem = String(options.houseSystem || input.houseSystem || "placidus").toLowerCase();
  const zodiacType = String(options.zodiacType || input.zodiacType || "tropical").toLowerCase();
  const includeMinorAspects = options.includeMinorAspects !== false;

  const ascLon = Number(rawChart?.ascendant?.longitude);
  const mcLon = Number(rawChart?.midheaven?.longitude);
  const northNodeLon = Number(rawChart?.northNode?.longitude);
  const southNodeLon = Number(rawChart?.southNode?.longitude);
  if (!Number.isFinite(ascLon)) {
    throw new Error("서양 점성술 차트에 ASC longitude가 없습니다.");
  }

  const houseCusps = buildHouseCusps(ascLon, houseSystem);
  const planets = {};
  const points = {};
  for (const name of PLANETS) {
    const lon = Number(rawChart?.planets?.[name]?.longitude);
    if (!Number.isFinite(lon)) continue;
    const house = locateHouseByCusps(lon, houseCusps);
    const enriched = enrichPlanet(name, lon, house, {
      sourceHouse: Number(rawChart?.planets?.[name]?.house) || null,
      dignity: "Neutral",
    });
    if (enriched) {
      planets[name] = enriched;
      points[name] = enriched.longitude;
    }
  }

  const northNode = Number.isFinite(northNodeLon)
    ? enrichPlanet("NorthNode", northNodeLon, locateHouseByCusps(northNodeLon, houseCusps))
    : null;
  const southNode = Number.isFinite(southNodeLon)
    ? enrichPlanet("SouthNode", southNodeLon, locateHouseByCusps(southNodeLon, houseCusps))
    : null;
  if (northNode) points.NorthNode = northNode.longitude;
  if (southNode) points.SouthNode = southNode.longitude;

  const chironLon = Number(rawChart?.chiron?.longitude);
  const chiron = Number.isFinite(chironLon)
    ? enrichPlanet("Chiron", chironLon, locateHouseByCusps(chironLon, houseCusps))
    : null;
  if (chiron) points.Chiron = chiron.longitude;

  const rawAspects = Array.isArray(rawChart?.aspects)
    ? rawChart.aspects.map((a) => ({
      p1: String(a.p1 || ""),
      p2: String(a.p2 || ""),
      type: normalizeAspectType(a.type),
      orb: round2(a.orb),
      exact: aspectDegreeByType(a.type),
    }))
    : [];

  const calcAspects = calcAspectsFromLongitudes(points, includeMinorAspects);
  const aspects = dedupeAspects(rawAspects.concat(calcAspects));

  const asc = enrichPlanet("Ascendant", ascLon, 1);
  const mc = Number.isFinite(mcLon)
    ? enrichPlanet("Midheaven", mcLon, locateHouseByCusps(mcLon, houseCusps))
    : enrichPlanet("Midheaven", ascLon + 90, 10);

  const chartRulerName = ASTRO_SIGN_RULER[asc.sign] || "Sun";
  const chartRuler = planets[chartRulerName] || null;
  const chartRulerAspects = aspects.filter((a) => a.p1 === chartRulerName || a.p2 === chartRulerName);

  const majorNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const majors = majorNames.map((n) => planets[n]).filter(Boolean);
  const element = {
    Fire: majors.filter((p) => p.element === "Fire").length,
    Earth: majors.filter((p) => p.element === "Earth").length,
    Air: majors.filter((p) => p.element === "Air").length,
    Water: majors.filter((p) => p.element === "Water").length,
  };
  const modality = {
    Cardinal: majors.filter((p) => p.modality === "Cardinal").length,
    Fixed: majors.filter((p) => p.modality === "Fixed").length,
    Mutable: majors.filter((p) => p.modality === "Mutable").length,
  };

  const eastHouses = [10, 11, 12, 1, 2, 3];
  const westHouses = [4, 5, 6, 7, 8, 9];
  const northHouses = [7, 8, 9, 10, 11, 12];
  const southHouses = [1, 2, 3, 4, 5, 6];
  const hemisphere = {
    east: majors.filter((p) => eastHouses.includes(p.house)).length,
    west: majors.filter((p) => westHouses.includes(p.house)).length,
    north: majors.filter((p) => northHouses.includes(p.house)).length,
    south: majors.filter((p) => southHouses.includes(p.house)).length,
  };

  const planetScore = {};
  for (const p of majors) {
    let score = 1;
    if ([1, 4, 7, 10].includes(p.house)) score += 2;
    const aspCount = aspects.filter((a) => a.p1 === p.name || a.p2 === p.name).length;
    if (aspCount >= 5) score += 2;
    if (aspCount >= 3 && aspCount < 5) score += 1;
    if (ASTRO_SIGN_RULER[p.sign] === p.name) score += 1;
    planetScore[p.name] = score;
  }
  const dominantPlanet = Object.entries(planetScore).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const dominantSignInfo = dominantByCount(majors.map((p) => p.signKo));
  const dominantHouseInfo = dominantByCount(majors.map((p) => String(p.house || "")));

  const houses = [];
  for (let i = 0; i < 12; i += 1) {
    const cuspLon = houseCusps[i];
    const sign = signByLongitude(cuspLon);
    houses.push({
      house: i + 1,
      cuspLongitude: round2(cuspLon),
      sign: sign?.sign,
      signKo: sign?.signKo,
      ruler: ASTRO_SIGN_RULER[sign?.sign ?? 0],
      planets: Object.values(planets).filter((p) => p.house === i + 1).map((p) => p.name),
    });
  }

  return {
    source: rawChart?.source || "swiss-wasm-local",
    zodiacType,
    houseSystem,
    houseSystemMeta: {
      requested: houseSystem,
      approximation: houseSystem !== "whole-sign" && houseSystem !== "whole" && houseSystem !== "wholesign",
      note: houseSystem !== "whole-sign" && houseSystem !== "whole" && houseSystem !== "wholesign"
        ? "Swiss 응답의 하우스 커스프 부재로 ASC 기준 30도 등분 근사를 사용했습니다."
        : "Whole Sign 커스프를 적용했습니다.",
    },
    ascendant: asc,
    midheaven: mc,
    chartRuler: {
      planet: chartRulerName,
      sign: chartRuler?.signKo || "정보 없음",
      house: chartRuler?.house || null,
      aspects: chartRulerAspects,
    },
    planets,
    northNode,
    southNode,
    chiron,
    partOfFortune: rawChart?.partOfFortune || null,
    vertex: rawChart?.vertex || null,
    houseCusps,
    houses,
    aspects,
    elementBalance: element,
    modalityBalance: modality,
    hemisphereBalance: hemisphere,
    dominantPlanet,
    dominantSign: dominantSignInfo.key,
    dominantHouse: dominantHouseInfo.key ? Number(dominantHouseInfo.key) : null,
    rawSwiss: rawChart,
  };
}

function midpointLongitude(a, b) {
  const lonA = normalizeDeg(a);
  const lonB = normalizeDeg(b);
  if (!Number.isFinite(lonA) || !Number.isFinite(lonB)) return NaN;
  let diff = lonB - lonA;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeDeg(lonA + diff / 2);
}

function buildSynastry(primary, partner) {
  const primaryPoints = {};
  const partnerPoints = {};
  for (const k of ASTRO_MAJORS) {
    const p1 = primary.planets?.[k] || primary[k.charAt(0).toLowerCase() + k.slice(1)] || null;
    const p2 = partner.planets?.[k] || partner[k.charAt(0).toLowerCase() + k.slice(1)] || null;
    if (Number.isFinite(Number(p1?.longitude))) primaryPoints[k] = Number(p1.longitude);
    if (Number.isFinite(Number(p2?.longitude))) partnerPoints[k] = Number(p2.longitude);
  }
  if (primary.northNode?.longitude != null) primaryPoints.NorthNode = Number(primary.northNode.longitude);
  if (partner.northNode?.longitude != null) partnerPoints.NorthNode = Number(partner.northNode.longitude);
  if (primary.southNode?.longitude != null) primaryPoints.SouthNode = Number(primary.southNode.longitude);
  if (partner.southNode?.longitude != null) partnerPoints.SouthNode = Number(partner.southNode.longitude);

  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
    { type: "quincunx", deg: 150 },
  ];

  const aspects = [];
  const aKeys = Object.keys(primaryPoints);
  const bKeys = Object.keys(partnerPoints);
  for (const a of aKeys) {
    for (const b of bKeys) {
      const lonA = primaryPoints[a];
      const lonB = partnerPoints[b];
      const diff = Math.abs(lonA - lonB);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        const maxOrb = getAspectOrbLimit(a, b, def.type);
        if (orb <= maxOrb) {
          aspects.push({ p1: a, p2: b, type: def.type, orb: round2(orb), exact: def.deg, distance: round2(dist) });
          break;
        }
      }
    }
  }

  const filterPairs = (left, right) => aspects.filter((a) => (a.p1 === left && a.p2 === right) || (a.p1 === right && a.p2 === left));

  const overlays = [];
  const overlayTargets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode", "Chiron"];
  for (const name of overlayTargets) {
    const partnerLon = partnerPoints[name];
    if (!Number.isFinite(partnerLon)) continue;
    const house = locateHouseByCusps(partnerLon, primary.houseCusps || []);
    if (house) overlays.push({ who: "partnerToMe", planet: name, house });
  }

  return {
    aspects: aspects.sort((a, b) => a.orb - b.orb),
    sunMoonAspects: filterPairs("Sun", "Moon"),
    moonMoonAspects: filterPairs("Moon", "Moon"),
    venusMarsAspects: filterPairs("Venus", "Mars"),
    venusSaturnAspects: filterPairs("Venus", "Saturn"),
    marsSaturnAspects: filterPairs("Mars", "Saturn"),
    saturnHardAspects: aspects.filter((a) => (a.p1 === "Saturn" || a.p2 === "Saturn") && ["square", "opposition", "conjunction"].includes(a.type)),
    plutoHardAspects: aspects.filter((a) => (a.p1 === "Pluto" || a.p2 === "Pluto") && ["square", "opposition", "conjunction"].includes(a.type)),
    nodeContacts: aspects.filter((a) => a.p1.includes("Node") || a.p2.includes("Node")),
    chironContacts: aspects.filter((a) => a.p1 === "Chiron" || a.p2 === "Chiron"),
    houseOverlays: overlays,
    house7Overlays: overlays.filter((o) => o.house === 7),
    house8Overlays: overlays.filter((o) => o.house === 8),
    house12Overlays: overlays.filter((o) => o.house === 12),
  };
}

function buildCompositeChart(primary, partner, houseSystem = "placidus") {
  const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode"];
  const base = {};
  for (const name of names) {
    const lonA = primary.planets?.[name]?.longitude ?? (name === "NorthNode" ? primary.northNode?.longitude : NaN);
    const lonB = partner.planets?.[name]?.longitude ?? (name === "NorthNode" ? partner.northNode?.longitude : NaN);
    const mid = midpointLongitude(lonA, lonB);
    if (Number.isFinite(mid)) base[name] = mid;
  }

  const compAscLon = midpointLongitude(primary.ascendant?.longitude, partner.ascendant?.longitude);
  const compMcLon = midpointLongitude(primary.midheaven?.longitude, partner.midheaven?.longitude);
  const cusps = buildHouseCusps(compAscLon, houseSystem);

  const planets = {};
  for (const [name, lon] of Object.entries(base)) {
    const house = locateHouseByCusps(lon, cusps);
    planets[name] = enrichPlanet(name, lon, house);
  }

  const aspects = calcAspectsFromLongitudes(base, true);
  const houseEmphasis = dominantByCount(Object.values(planets).map((p) => String(p.house || "")));
  return {
    ascendant: enrichPlanet("Ascendant", compAscLon, 1),
    midheaven: enrichPlanet("Midheaven", Number.isFinite(compMcLon) ? compMcLon : compAscLon + 90, locateHouseByCusps(compMcLon, cusps) || 10),
    planets,
    nodes: {
      northNode: planets.NorthNode || null,
      southNode: planets.NorthNode ? enrichPlanet("SouthNode", planets.NorthNode.longitude + 180, locateHouseByCusps(planets.NorthNode.longitude + 180, cusps)) : null,
    },
    houseCusps: cusps,
    house7: { signKo: signByLongitude(cusps[6])?.signKo || "정보 없음", planets: Object.values(planets).filter((p) => p.house === 7).map((p) => p.name) },
    house10: { signKo: signByLongitude(cusps[9])?.signKo || "정보 없음", planets: Object.values(planets).filter((p) => p.house === 10).map((p) => p.name) },
    aspects,
    houseEmphasis,
  };
}

async function buildAstroTimingData(request, env, input, natalChart) {
  const now = new Date();
  const transitInput = {
    ...input,
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
  };
  const transitRaw = await getSwissWesternChart(request, env, transitInput);
  const transitChart = buildWesternPremiumChart(transitRaw, transitInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: true,
  });

  const natalPoints = {};
  const transitPoints = {};
  for (const n of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode"]) {
    const natalLon = natalChart.planets?.[n]?.longitude ?? (n === "NorthNode" ? natalChart.northNode?.longitude : NaN);
    const transitLon = transitChart.planets?.[n]?.longitude ?? (n === "NorthNode" ? transitChart.northNode?.longitude : NaN);
    if (Number.isFinite(Number(natalLon))) natalPoints[n] = Number(natalLon);
    if (Number.isFinite(Number(transitLon))) transitPoints[n] = Number(transitLon);
  }

  const transitToNatal = [];
  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
    { type: "quincunx", deg: 150 },
  ];
  for (const [tp, tLon] of Object.entries(transitPoints)) {
    for (const [np, nLon] of Object.entries(natalPoints)) {
      const diff = Math.abs(tLon - nLon);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        if (orb <= getAspectOrbLimit(tp, np, def.type)) {
          transitToNatal.push({ transit: tp, natal: np, type: def.type, orb: round2(orb), exact: def.deg });
          break;
        }
      }
    }
  }
  transitToNatal.sort((a, b) => a.orb - b.orb);

  const age = Math.max(0, now.getUTCFullYear() - input.year);
  const progressedDate = new Date(Date.UTC(input.year, Math.max(0, input.month - 1), input.day, input.hour, input.minute, 0, 0));
  progressedDate.setUTCDate(progressedDate.getUTCDate() + age);
  const progressedInput = {
    ...input,
    year: progressedDate.getUTCFullYear(),
    month: progressedDate.getUTCMonth() + 1,
    day: progressedDate.getUTCDate(),
    hour: progressedDate.getUTCHours(),
    minute: progressedDate.getUTCMinutes(),
  };
  const progressedRaw = await getSwissWesternChart(request, env, progressedInput);
  const progressed = buildWesternPremiumChart(progressedRaw, progressedInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: false,
  });

  const solarReturnInput = {
    ...input,
    year: now.getUTCFullYear(),
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
  };
  const solarRaw = await getSwissWesternChart(request, env, solarReturnInput);
  const solarReturn = buildWesternPremiumChart(solarRaw, solarReturnInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: false,
  });

  const progressedMoonSunDiff = Math.abs((progressed.planets.Moon?.longitude || 0) - (progressed.planets.Sun?.longitude || 0));
  const progressedMoonPhase = round2(progressedMoonSunDiff > 180 ? 360 - progressedMoonSunDiff : progressedMoonSunDiff);
  const saturnReturn = transitToNatal.some((a) => a.transit === "Saturn" && a.natal === "Saturn" && a.orb <= 2);
  const jupiterReturn = transitToNatal.some((a) => a.transit === "Jupiter" && a.natal === "Jupiter" && a.orb <= 2);
  const nodalReturn = transitToNatal.some((a) => a.transit === "NorthNode" && a.natal === "NorthNode" && a.orb <= 2);

  return {
    currentDate: now.toISOString().slice(0, 10),
    transitPlanetPositions: transitChart.planets,
    transitToNatalAspects: transitToNatal,
    progressedSun: progressed.planets.Sun || null,
    progressedMoon: progressed.planets.Moon || null,
    progressedAsc: progressed.ascendant || null,
    progressedMoonPhase,
    solarReturn: {
      ascendant: solarReturn.ascendant,
      sunHouse: solarReturn.planets.Sun?.house || null,
      moonHouse: solarReturn.planets.Moon?.house || null,
    },
    saturnReturn,
    jupiterReturn,
    nodalReturn,
    keyTransitPeriods: transitToNatal.slice(0, 18),
  };
}

function buildAstroDataContext(body, input, chart, reportType, partnerChart, synastry, composite, timingData) {
  const birthTimeKnown = hasPreciseBirthTime(body);
  const warnings = [];
  if (!birthTimeKnown) warnings.push(ASTRO_NO_BIRTHTIME_NOTICE);
  if (!body.birthPlace && !body.place && !body.location) warnings.push("출생지가 없어 시간대/위경도 계산의 정밀도가 제한됩니다.");
  if (chart?.houseSystemMeta?.approximation) warnings.push(ASTRO_MISSING_DATA_NOTICE);
  if (reportType === "compatibility" && !partnerChart) warnings.push("궁합 리포트 입력이 부족해 개인 리포트 기준으로 보완 분석합니다.");

  const profileLines = [
    `- 사용자 이름: ${String(body.name || input.name || "사용자")}`,
    `- 생년월일: ${input.year}-${input.month}-${input.day}`,
    `- 출생 시간: ${birthTimeKnown ? `${input.hour}:${String(input.minute).padStart(2, "0")}` : "미상"}`,
    `- 출생지: ${String(body.birthPlace || body.place || body.location || "정보 없음")}`,
    `- 위도/경도: ${round2(input.lat)}, ${round2(input.lon)}`,
    `- 시간대: ${String(body.timezoneName || body.timezone || input.timezone || "정보 없음")}`,
    `- 성별: ${String(body.gender || input.gender || "정보 없음")}`,
    `- 하우스 시스템: ${String(input.houseSystem || "placidus")}`,
    `- Zodiac: ${String(input.zodiacType || "tropical")}`,
  ];

  const chartLines = [
    `- Ascendant Sign: ${chart.ascendant?.signKo || "정보 없음"}`,
    `- Ascendant Degree: ${chart.ascendant?.degree ?? "정보 없음"}`,
    `- Midheaven Sign: ${chart.midheaven?.signKo || "정보 없음"}`,
    `- Midheaven Degree: ${chart.midheaven?.degree ?? "정보 없음"}`,
    `- Chart Ruler: ${chart.chartRuler?.planet || "정보 없음"}`,
    `- Chart Ruler Sign: ${chart.chartRuler?.sign || "정보 없음"}`,
    `- Chart Ruler House: ${chart.chartRuler?.house || "정보 없음"}`,
    `- Chart Ruler Aspects: ${(chart.chartRuler?.aspects || []).map((a) => `${a.p1}-${a.p2} ${a.type} orb ${a.orb}`).join(", ") || "정보 없음"}`,
  ];

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const planetLines = requiredPlanets.map((name) => {
    const p = chart.planets?.[name];
    if (!p) return `- ${name}: 정보 없음`;
    const pAspects = chart.aspects.filter((a) => a.p1 === name || a.p2 === name).map((a) => `${a.p1}-${a.p2} ${a.type} orb ${a.orb}`).slice(0, 10).join(", ");
    return `- ${name}: Sign ${p.signKo}, House ${p.house}, Degree ${p.degree}, Aspects ${pAspects || "정보 없음"}`;
  });

  const nodeLines = [
    `- North Node Sign/House: ${chart.northNode?.signKo || "정보 없음"} / ${chart.northNode?.house || "정보 없음"}`,
    `- South Node Sign/House: ${chart.southNode?.signKo || "정보 없음"} / ${chart.southNode?.house || "정보 없음"}`,
    `- Chiron Sign/House: ${chart.chiron?.signKo || "정보 없음"} / ${chart.chiron?.house || "정보 없음"}`,
    `- Part of Fortune: ${chart.partOfFortune ? JSON.stringify(chart.partOfFortune) : "정보 없음"}`,
    `- Vertex: ${chart.vertex ? JSON.stringify(chart.vertex) : "정보 없음"}`,
  ];

  const houseLines = chart.houses.map((h) => `- House ${h.house}: cusp ${h.cuspLongitude}, sign ${h.signKo}, planets ${h.planets.join(", ") || "없음"}`);

  const balanceLines = [
    `- Element Balance: ${JSON.stringify(chart.elementBalance)}`,
    `- Modality Balance: ${JSON.stringify(chart.modalityBalance)}`,
    `- Hemisphere Balance: ${JSON.stringify(chart.hemisphereBalance)}`,
    `- Dominant Planet: ${chart.dominantPlanet || "정보 없음"}`,
    `- Dominant Sign: ${chart.dominantSign || "정보 없음"}`,
    `- Dominant House: ${chart.dominantHouse || "정보 없음"}`,
  ];

  const compatLines = [];
  if (reportType === "compatibility" && partnerChart) {
    compatLines.push(
      `- 상대방 이름: ${String(body.partnerName || "상대")}`,
      `- 상대방 생년월일: ${[body.partnerYear, body.partnerMonth, body.partnerDay].filter(Boolean).join("-") || "정보 없음"}`,
      `- 상대방 출생시간: ${body.partnerHour == null ? "미상" : `${body.partnerHour}:${String(body.partnerMinute || 0).padStart(2, "0")}`}`,
      `- 상대방 출생지: ${String(body.partnerBirthPlace || "정보 없음")}`,
      `- Synastry Aspects: ${(synastry?.aspects || []).slice(0, 40).map((a) => `${a.p1}-${a.p2} ${a.type} orb ${a.orb}`).join(", ") || "정보 없음"}`,
      `- Sun-Moon aspects: ${JSON.stringify(synastry?.sunMoonAspects || [])}`,
      `- Moon-Moon aspects: ${JSON.stringify(synastry?.moonMoonAspects || [])}`,
      `- Venus-Mars aspects: ${JSON.stringify(synastry?.venusMarsAspects || [])}`,
      `- Venus-Saturn aspects: ${JSON.stringify(synastry?.venusSaturnAspects || [])}`,
      `- Mars-Saturn aspects: ${JSON.stringify(synastry?.marsSaturnAspects || [])}`,
      `- Saturn hard aspects: ${JSON.stringify(synastry?.saturnHardAspects || [])}`,
      `- Pluto hard aspects: ${JSON.stringify(synastry?.plutoHardAspects || [])}`,
      `- Node contacts: ${JSON.stringify(synastry?.nodeContacts || [])}`,
      `- Chiron contacts: ${JSON.stringify(synastry?.chironContacts || [])}`,
      `- 7th House overlays: ${JSON.stringify(synastry?.house7Overlays || [])}`,
      `- 8th House overlays: ${JSON.stringify(synastry?.house8Overlays || [])}`,
      `- 12th House overlays: ${JSON.stringify(synastry?.house12Overlays || [])}`,
      `- Composite ASC: ${composite?.ascendant?.signKo || "정보 없음"}`,
      `- Composite Sun: ${JSON.stringify(composite?.planets?.Sun || null)}`,
      `- Composite Moon: ${JSON.stringify(composite?.planets?.Moon || null)}`,
      `- Composite Venus: ${JSON.stringify(composite?.planets?.Venus || null)}`,
      `- Composite Mars: ${JSON.stringify(composite?.planets?.Mars || null)}`,
      `- Composite Saturn: ${JSON.stringify(composite?.planets?.Saturn || null)}`,
      `- Composite Nodes: ${JSON.stringify(composite?.nodes || null)}`,
      `- Composite 7th House: ${JSON.stringify(composite?.house7 || null)}`,
      `- Composite 10th House: ${JSON.stringify(composite?.house10 || null)}`,
    );
  }

  const timingLines = timingData ? [
    `- Current Date: ${timingData.currentDate}`,
    `- Transit Planet Positions: ${JSON.stringify(timingData.transitPlanetPositions || {})}`,
    `- Transit to Natal Aspects: ${JSON.stringify((timingData.transitToNatalAspects || []).slice(0, 30))}`,
    `- Progressed Sun: ${JSON.stringify(timingData.progressedSun || null)}`,
    `- Progressed Moon: ${JSON.stringify(timingData.progressedMoon || null)}`,
    `- Progressed ASC: ${JSON.stringify(timingData.progressedAsc || null)}`,
    `- Solar Return: ${JSON.stringify(timingData.solarReturn || null)}`,
    `- Saturn Return: ${String(!!timingData.saturnReturn)}`,
    `- Jupiter Return: ${String(!!timingData.jupiterReturn)}`,
    `- Nodal Return: ${String(!!timingData.nodalReturn)}`,
    `- Progressed Moon Phase: ${timingData.progressedMoonPhase}`,
    `- 주요 Transit 기간: ${JSON.stringify((timingData.keyTransitPeriods || []).slice(0, 15))}`,
  ] : [
    "- 시기 분석 데이터는 챕터 12/13에서 집중 계산됩니다.",
  ];

  const dataText = [
    "[사용자 데이터]",
    ...profileLines,
    "",
    "[네이탈 핵심값]",
    ...chartLines,
    ...nodeLines,
    "",
    "[행성 데이터]",
    ...planetLines,
    "",
    "[하우스 커스프/행성]",
    ...houseLines,
    "",
    "[밸런스/지배성]",
    ...balanceLines,
    "",
    "[시기 분석]",
    ...timingLines,
    compatLines.length ? "" : null,
    compatLines.length ? "[궁합 분석]" : null,
    ...compatLines,
  ].filter(Boolean).join("\n");

  return { dataText, warnings, birthTimeKnown };
}

function astroMissingMarkers(text, chapter, reportType) {
  const source = String(text || "");
  const required = [
    "### 핵심 요약",
    "### 데이터 근거 해석",
    "### 심화 분석",
    "### 관계·일·재물 적용",
    "### 오늘부터 실천할 3가지",
  ];
  if (chapter === 12) {
    required.push("### 1월");
    required.push("### 12월");
    required.push("- 핵심 흐름:");
    required.push("- 좋은 선택:");
    required.push("- 주의할 점:");
    required.push("- 개운 행동:");
  }
  if (chapter === 13) {
    required.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    required.push("| 1~7일 |  |  |  |  |");
    required.push("| 8~30일 |  |  |  |  |");
    required.push("| 31~60일 |  |  |  |  |");
    required.push("| 61~90일 |  |  |  |  |");
  }
  if (reportType === "compatibility" && chapter === 10) required.push("Synastry");
  if (reportType === "compatibility" && chapter === 11) required.push("Composite");
  return required.filter((m) => !source.includes(m));
}

function buildAstroPremiumPrompt(meta, chapter, input, reportType, context) {
  const guide = ASTRO_CHAPTER_GUIDES[chapter - 1] || "현재 챕터 주제에 맞춰 차트 근거 중심으로 작성하세요.";
  const reportTitle = reportType === "compatibility" ? ASTRO_REPORT_TITLE_COMPAT : ASTRO_REPORT_TITLE_PERSONAL;
  const reportSubtitle = reportType === "compatibility" ? ASTRO_REPORT_SUBTITLE_COMPAT : ASTRO_REPORT_SUBTITLE_PERSONAL;
  const monthlyRule = chapter === 12
    ? "챕터 12에서는 반드시 ### 1월부터 ### 12월까지 월별 블록을 만들고, 각 월마다 - 핵심 흐름/- 좋은 선택/- 주의할 점/- 개운 행동 형식을 지키세요."
    : "";
  const roadmapRule = chapter === 13
    ? "챕터 13에서는 반드시 아래 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";
  const compatibilityRule = reportType === "compatibility"
    ? "궁합 리포트에서는 Synastry와 Composite를 반드시 구분해 설명하세요."
    : "개인 리포트에서는 궁합 데이터가 없음을 명시하고 이상적 파트너/관계 트리거 중심으로 작성하세요.";

  return [
    "너는 30년 경력의 서양 점성술 전문가이자, 융 심리학 기반 상담가, 관계 심리 컨설턴트, 프리미엄 PDF 리포트 작가다.",
    "사용자의 점성술 차트 데이터를 바탕으로 단순한 별자리 운세가 아니라, 사용자가 자신의 성격 구조, 무의식 패턴, 관계 방식, 직업적 재능, 현재 삶의 흐름을 이해하고 실제 선택을 개선할 수 있도록 돕는 고급 리포트를 작성한다.",
    "전문적이지만 어렵지 않게 작성하고, 점성술 용어는 처음 등장할 때 쉬운 한국어 설명을 붙인다.",
    "ASC, Chart Ruler, Aspect, House, Transit, Synastry, Composite를 반드시 해설한다.",
    "공포를 조장하지 말고 단정 예언(이별/사망/투자 보장/질병 진단)을 금지한다.",
    "오직 마크다운 본문만 출력한다.",
    "",
    `[리포트 제목] ${reportTitle}`,
    `[리포트 부제] ${reportSubtitle}`,
    `[리포트 타입] ${reportType}`,
    `[현재 챕터] ${chapter}. ${meta.title} — ${meta.subtitle}`,
    `[최소 분량] ${ASTRO_MIN_CHARS}자 이상 (권장 5000자 이상)`,
    "",
    "[반드시 지킬 구조]",
    `## 챕터 ${chapter}. ${meta.title}`,
    "### 핵심 요약",
    "### 데이터 근거 해석",
    "### 심화 분석",
    "### 관계·일·재물 적용",
    "### 오늘부터 실천할 3가지",
    "",
    "[챕터 전용 지시]",
    guide,
    compatibilityRule,
    monthlyRule,
    roadmapRule,
    "",
    "[데이터 부족 시 반드시 포함할 문장]",
    ASTRO_MISSING_DATA_NOTICE,
    "",
    "[입력 데이터]",
    context.dataText,
    context.warnings.length ? `\n[주의/제한]\n- ${context.warnings.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");
}

function buildAstroFallbackMarkdown(meta, chapter, input, reportType, context) {
  const title = reportType === "compatibility" ? ASTRO_REPORT_TITLE_COMPAT : ASTRO_REPORT_TITLE_PERSONAL;
  const subtitle = reportType === "compatibility" ? ASTRO_REPORT_SUBTITLE_COMPAT : ASTRO_REPORT_SUBTITLE_PERSONAL;
  let text = [
    `# ${title}`,
    `# ${subtitle}`,
    `## 챕터 ${chapter}. ${meta.title}`,
    "### 핵심 요약",
    "- ASC·Sun·Moon은 같은 성격을 다른 각도에서 보여주는 좌표입니다.",
    "- 어스펙트는 저주가 아니라 에너지의 패턴이며, 관리 가능한 행동 변수입니다.",
    "- 장점과 약점은 같은 에너지의 사용 방식 차이에서 갈립니다.",
    "- 관계·일·재물은 분리된 문제가 아니라 같은 의사결정 체계의 결과입니다.",
    "- 작은 루틴의 고정이 장기적 운의 체감을 바꿉니다.",
    "### 데이터 근거 해석",
    context.warnings.length ? `${ASTRO_MISSING_DATA_NOTICE}\n\n${context.warnings.join("\n")}` : "제공된 네이탈 차트/어스펙트 데이터를 기반으로 해석합니다.",
    `입력 요약: ${input.year}-${input.month}-${input.day} ${input.hour}:${String(input.minute).padStart(2, "0")}, 위도 ${round2(input.lat)}, 경도 ${round2(input.lon)}.`,
    "### 심화 분석",
    "현재 챕터의 핵심은 사건 예언이 아니라 반응 패턴의 구조화입니다. 같은 사건이라도 해석 프레임에 따라 결과가 달라집니다. 따라서 이 리포트는 성향을 단정하지 않고 의사결정 기준을 선명하게 만드는 데 집중합니다.",
    "행성 간 긴장각은 갈등 자체가 아니라 성장의 방향을 알려주는 신호입니다. 회피보다 조정, 과속보다 지속성이 장기 성과를 만듭니다.",
    "### 관계·일·재물 적용",
    "1. 관계: 감정 강도보다 경계의 일관성을 우선하세요.",
    "2. 일: 우선순위 1개를 먼저 완료해 실행 피로를 줄이세요.",
    "3. 재물: 확장보다 누수 차단을 먼저 설계하세요.",
    "4. 회복: 주간 복기 루틴으로 재발 비용을 줄이세요.",
    "### 오늘부터 실천할 3가지",
    "1. 오늘 결정 1건을 감정/현실/장기로 분리해 기록합니다.",
    "2. 이번 주 소모 패턴 1개를 멈추고 대체 행동 1개를 고정합니다.",
    "3. 월말에 관계·일·재정·건강 점검을 한 번에 실행합니다.",
  ].join("\n\n");

  if (chapter === 12) {
    const months = [];
    for (let m = 1; m <= 12; m += 1) {
      months.push(`### ${m}월\n- 핵심 흐름: 내부 리듬 정렬이 성과를 좌우합니다.\n- 좋은 선택: 핵심 우선순위 1개를 먼저 확정하세요.\n- 주의할 점: 과속 확장과 감정적 결정을 피하세요.\n- 개운 행동: 주간 복기 30분을 고정하세요.`);
    }
    text += `\n\n${months.join("\n\n")}`;
  }
  if (chapter === 13) {
    text += "\n\n| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |\n|---|---|---|---|---|\n| 1~7일 |  |  |  |  |\n| 8~30일 |  |  |  |  |\n| 31~60일 |  |  |  |  |\n| 61~90일 |  |  |  |  |";
  }

  let depth = 1;
  while (text.length < ASTRO_MIN_CHARS) {
    text += `\n\n### 심화 보충 노트 ${depth}\n점성술 해석의 목적은 운명의 단정이 아니라 선택의 품질 개선입니다. 이번 주에는 큰 결정보다 작은 루틴 고정을 우선하고, 월말에는 반드시 복기해 다음 달 실행 기준으로 이어가세요.`;
    depth += 1;
  }
  return text;
}

async function generateAstroPremiumChapter(env, body, input, chapter, meta, chart, reportType, partnerChart, synastry, composite, timingData) {
  const context = buildAstroDataContext(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  const prompt = buildAstroPremiumPrompt(meta, chapter, input, reportType, context);
  const options = {
    temperature: 0.84,
    topP: 0.95,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_ASTRO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_ASTRO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], options);
  let usedFallback = false;
  if (!text || text.trim().length < 1200) {
    usedFallback = true;
    text = buildAstroFallbackMarkdown(meta, chapter, input, reportType, context);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = astroMissingMarkers(text, chapter, reportType);
    const tooShort = text.length < ASTRO_MIN_CHARS;
    const truncated = looksTruncatedMarkdown(text);
    const banned = hasBannedDeterministicExpression(text);
    if (!tooShort && missing.length === 0 && !truncated && !banned) break;

    const refinePrompt = [
      "아래 서양 점성술 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${ASTRO_MIN_CHARS}자`,
      "오직 마크다운 본문만 출력하고 기존 구조를 유지하면서 누락 요소를 채우세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""}`.trim(),
      "",
      "[초안]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], options);
    if (!refined || !refined.trim()) break;
    const candidate = refined.trim();
    text = candidate.length >= Math.floor(text.length * 0.8) ? candidate : `${text}\n\n${candidate}`;
  }

  const finalMissing = astroMissingMarkers(text, chapter, reportType);
  if (text.length < ASTRO_MIN_CHARS || finalMissing.length > 0 || looksTruncatedMarkdown(text) || hasBannedDeterministicExpression(text)) {
    usedFallback = true;
    text = buildAstroFallbackMarkdown(meta, chapter, input, reportType, context);
  }

  return {
    text,
    sections: parseSections(text),
    usedFallback,
    warnings: context.warnings,
  };
}

function astroReportIdFromInput(body, input, reportType) {
  const seed = [
    reportType,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.lat,
    input.lon,
    String(body.name || input.name || ""),
    String(body.partnerName || ""),
    String(input.houseSystem || "placidus"),
    String(input.zodiacType || "tropical"),
    String(body.reportYear || new Date().getUTCFullYear()),
  ].join("|");
  return `astro_${stableHash(seed)}`;
}

function readAstroCache(cacheKey) {
  const hit = ASTRO_REPORT_CACHE.get(cacheKey);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    ASTRO_REPORT_CACHE.delete(cacheKey);
    return null;
  }
  return hit.payload;
}

function writeAstroCache(cacheKey, payload, ttlMs = 30 * 60 * 1000) {
  ASTRO_REPORT_CACHE.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

function buildSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, source = "kasi-api") {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKUYO_MONTH_START[lunarMonth - 1] ?? 11;
  const mansionIdx = (start + lunarDay - 1) % 27;
  const m = SUKUYO_MANSIONS[mansionIdx];
  return {
    mansionIdx,
    mansion: m[0],
    mansionCh: m[1],
    mansionEn: m[2],
    icon: "moon",
    direction: m[3],
    element: m[4],
    animal: m[5],
    lunarMonth,
    lunarDay,
    source,
  };
}

async function fetchKasiLunarFromSolar(request, env, input) {
  try {
    const data = await postBackendJson(
      request,
      env,
      "/api/kasi/calendar",
      {
        method: "getLunCalInfo",
        params: {
          solYear: String(input.year),
          solMonth: String(input.month).padStart(2, "0"),
          solDay: String(input.day).padStart(2, "0"),
        },
      },
      Number(env.PREMIUM_KASI_TIMEOUT_MS || 8000),
    );
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (!rows.length) return null;
    const row = rows[0] || {};
    const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
    const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
    if (!Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) return null;
    return { lunarMonth, lunarDay };
  } catch (_) {
    return null;
  }
}

async function calcSukuyo(request, env, input) {
  const kasiLunar = await fetchKasiLunarFromSolar(request, env, input);
  if (kasiLunar) {
    return buildSukuyoFromLunar(kasiLunar.lunarMonth, kasiLunar.lunarDay, "kasi-api");
  }

  const fallbackLunarMonth = ((input.month + 10) % 12) + 1;
  const fallbackLunarDay = ((input.day + input.hour) % 30) + 1;
  return buildSukuyoFromLunar(fallbackLunarMonth, fallbackLunarDay, "fallback-approx");
}

function resolveSukuyoDirection(distance, label) {
  if (distance === 0) return { axis: "명", me: "명", other: "명", pairLabel: "명", icon: "🪞" };
  if ([1, 10, 19].includes(distance)) return { axis: "영친", me: "영", other: "친", pairLabel: "영친", icon: "✨" };
  if ([8, 17, 26].includes(distance)) return { axis: "영친", me: "친", other: "영", pairLabel: "친영", icon: "🌟" };
  if ([2, 11, 20].includes(distance)) return { axis: "우친", me: "우", other: "친", pairLabel: "우친", icon: "🤝" };
  if ([7, 16, 25].includes(distance)) return { axis: "우친", me: "친", other: "우", pairLabel: "친우", icon: "🌙" };
  if ([3, 12, 21].includes(distance)) return { axis: "안괴", me: "안", other: "괴", pairLabel: "안괴", icon: "🛡️" };
  if ([6, 15, 24].includes(distance)) return { axis: "안괴", me: "괴", other: "안", pairLabel: "괴안", icon: "⚔️" };
  if ([4, 13, 22].includes(distance)) return { axis: "성쇠", me: "성", other: "쇠", pairLabel: "성쇠", icon: "🏛️" };
  if ([5, 14, 23].includes(distance)) return { axis: "성쇠", me: "쇠", other: "성", pairLabel: "쇠성", icon: "🗝️" };
  return {
    axis: String(label || "관계"),
    me: "정보 없음",
    other: "정보 없음",
    pairLabel: String(label || "관계"),
    icon: "🌙",
  };
}

function sukuyoRelation(myIdx, otherIdx) {
  if (otherIdx == null) return null;
  const distance = (otherIdx - myIdx + 27) % 27;
  const label = SUKUYO_RELATION_LABELS[distance % SUKUYO_RELATION_LABELS.length] || "관계";
  const direction = resolveSukuyoDirection(distance, label);
  return {
    distance,
    label,
    axis: direction.axis,
    pairLabel: direction.pairLabel,
    roleMe: direction.me,
    roleOther: direction.other,
    roleIcon: direction.icon,
    score: Math.max(38, 96 - Math.abs(13 - distance) * 4),
  };
}

function extractSwissEclipticLongitude(chartPayload, planetName) {
  if (!chartPayload || !planetName) return NaN;
  const direct = Number(chartPayload?.planets?.[planetName]?.longitude);
  if (Number.isFinite(direct)) return normalizeDeg(direct);
  const flat = Number(chartPayload?.planets?.[planetName]);
  if (Number.isFinite(flat)) return normalizeDeg(flat);
  const lower = String(planetName).toLowerCase();
  const lowerObj = Number(chartPayload?.planets?.[lower]?.longitude);
  if (Number.isFinite(lowerObj)) return normalizeDeg(lowerObj);
  const lowerFlat = Number(chartPayload?.planets?.[lower]);
  if (Number.isFinite(lowerFlat)) return normalizeDeg(lowerFlat);
  return NaN;
}

function resolveMoonPhaseByAngle(angle) {
  const a = normalizeDeg(angle);
  if (!Number.isFinite(a)) {
    return {
      phaseAngle: null,
      illumination: null,
      label: "정보 없음",
      cycle: "미확인",
      yinYangFlow: "미확인",
    };
  }

  let label = "정보 없음";
  if (a < 22.5 || a >= 337.5) label = "삭(신월)";
  else if (a < 67.5) label = "초승";
  else if (a < 112.5) label = "상현";
  else if (a < 157.5) label = "차는달";
  else if (a < 202.5) label = "망(보름)";
  else if (a < 247.5) label = "기우는달";
  else if (a < 292.5) label = "하현";
  else label = "그믐";

  const illumination = Math.round((((1 - Math.cos((a * Math.PI) / 180)) / 2) * 1000)) / 10;
  const waxing = a < 180;
  return {
    phaseAngle: Math.round(a * 10) / 10,
    illumination,
    label,
    cycle: waxing ? "상현 이전(증가)" : "하현 이후(감소)",
    yinYangFlow: waxing ? "양기 생장" : "음기 수렴",
  };
}

function buildSukuyoOrientalChart(sukuyo, partner, rel, swissBasis, partnerSwissBasis) {
  const moonLon = Number(swissBasis?.moonLongitude);
  const sunLon = Number(swissBasis?.sunLongitude);
  const phase = resolveMoonPhaseByAngle(moonLon - sunLon);

  const partnerMoonLon = Number(partnerSwissBasis?.moonLongitude);
  const partnerSunLon = Number(partnerSwissBasis?.sunLongitude);
  const partnerPhase = Number.isFinite(partnerMoonLon) && Number.isFinite(partnerSunLon)
    ? resolveMoonPhaseByAngle(partnerMoonLon - partnerSunLon)
    : null;

  const wheel = SUKUYO_MANSIONS.map((m, idx) => {
    const isPrimary = idx === sukuyo.mansionIdx;
    const isPartner = partner ? idx === partner.mansionIdx : false;
    return {
      index: idx + 1,
      mansion: m[0],
      mansionCh: m[1],
      mansionEn: m[2],
      direction: m[3],
      element: m[4],
      guardian: m[5],
      isPrimary,
      isPartner,
      role: isPrimary ? "본명숙" : (isPartner ? "상대숙" : ""),
    };
  });

  return {
    type: "sukuyo-oriental-chart",
    source: Number.isFinite(moonLon) && Number.isFinite(sunLon) ? "swiss-wasm-local+oriental-mapping" : String(sukuyo.source || "kasi-api"),
    core: {
      primaryMansion: `${sukuyo.mansion}宿(${sukuyo.mansionCh})`,
      primaryDirection: sukuyo.direction,
      primaryElement: sukuyo.element,
      primaryGuardian: sukuyo.animal,
      lunarDate: `${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일`,
      partnerMansion: partner ? `${partner.mansion}宿(${partner.mansionCh})` : null,
    },
    moonPhase: phase,
    relation: rel ? {
      label: rel.label,
      pairLabel: rel.pairLabel,
      axis: rel.axis,
      distance: rel.distance,
      score: rel.score,
      roleMe: rel.roleMe,
      roleOther: rel.roleOther,
      roleIcon: rel.roleIcon,
    } : null,
    swissBasis: {
      moonLongitude: Number.isFinite(moonLon) ? Math.round(normalizeDeg(moonLon) * 100) / 100 : null,
      sunLongitude: Number.isFinite(sunLon) ? Math.round(normalizeDeg(sunLon) * 100) / 100 : null,
      partnerMoonLongitude: Number.isFinite(partnerMoonLon) ? Math.round(normalizeDeg(partnerMoonLon) * 100) / 100 : null,
      partnerSunLongitude: Number.isFinite(partnerSunLon) ? Math.round(normalizeDeg(partnerSunLon) * 100) / 100 : null,
    },
    partnerMoonPhase: partnerPhase,
    wheel,
  };
}

async function fetchSwissSukuyoBasis(request, env, input) {
  try {
    const payload = await getSwissWesternChart(request, env, {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      timezone: input.timezone,
      lat: input.lat,
      lon: input.lon,
    });
    return {
      moonLongitude: extractSwissEclipticLongitude(payload, "Moon"),
      sunLongitude: extractSwissEclipticLongitude(payload, "Sun"),
    };
  } catch (_) {
    return null;
  }
}

function buildVedicChart(input) {
  const lagna = zodiacBySeed(input.year, input.month, input.day, input.hour, 21);
  const moon = zodiacBySeed(input.year, input.month, input.day, input.hour, 22);
  const nakIndex = Math.floor(moon.longitude / (360 / 27));
  const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
  return {
    lagna,
    moonNakshatra: { name: nakshatras[nakIndex], ko: nakshatras[nakIndex], pada: (nakIndex % 4) + 1 },
    planets: Object.fromEntries(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].map((p, i) => [p, { name: p, ...zodiacBySeed(input.year, input.month, input.day, input.hour, i + 30), house: ((i + lagna.sign) % 12) + 1 }])),
    vimshottariDasha: { current: { planet: ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"][input.year % 9], remainYears: 4.8 }, antar: { planet: "Moon", remainYears: 0.8 } },
    yogas: [{ name: "Dharma Focus", nameKo: "다르마 정렬", description: "삶의 방향성을 실행으로 고정하는 조합입니다." }],
  };
}

function longFallback({ system, chapterTitle, profileLine, focusLine }) {
  const sections = [
    ["핵심 구조", `${profileLine} 이 장은 ${system}의 상징을 단편적인 운세가 아니라 반복되는 선택 패턴으로 읽습니다. 지금 드러나는 핵심은 타고난 성향을 과장하거나 숨기는 것이 아니라, 가장 자연스럽게 힘이 생기는 방식과 에너지가 새는 방식을 동시에 보는 것입니다.`],
    ["삶에서 드러나는 패턴", `${chapterTitle}에서는 관계, 일, 돈, 감정 반응이 서로 따로 움직이지 않습니다. 같은 선택 습관이 다른 장면에서 이름만 바꾸어 반복됩니다. 이 PDF는 그 반복을 발견하고, 사용자가 실제 일정과 대화와 결정을 바꿀 수 있도록 구체적인 언어로 정리합니다.`],
    ["주의할 그림자", `강점이 강하게 켜질수록 그림자도 같이 커집니다. 빠른 판단, 과도한 책임감, 인정 욕구, 회피, 완벽주의 중 어느 하나가 현재의 운 흐름을 좁힐 수 있습니다. 중요한 것은 나쁜 성향을 없애는 것이 아니라, 그 성향이 등장하는 조건을 알아차리고 더 좋은 출구를 만드는 것입니다.`],
    ["실행 처방", `${focusLine} 오늘부터 7일 동안은 큰 결심보다 작은 반복을 우선하세요. 아침에는 오늘 반드시 끝낼 한 가지를 적고, 저녁에는 감정이 크게 움직였던 장면 하나와 실제로 한 행동 하나를 분리해서 기록합니다. 이 기록이 쌓이면 운세는 막연한 예언이 아니라 생활을 조정하는 지도처럼 작동합니다.`],
    ["30일 로드맵", `1주차에는 관찰, 2주차에는 정리, 3주차에는 실험, 4주차에는 고정이 핵심입니다. 사람과 돈과 일의 흐름을 모두 바꾸려 하지 말고, 가장 반복 비용이 큰 한 가지 습관을 고르세요. 그 습관을 바꾸는 작은 행동이 다음 운의 문을 여는 첫 번째 열쇠입니다.`],
  ];
  const text = sections.map(([title, body]) => `## ${title}\n${body}\n\n${body}\n\n${body}`).join("\n\n");
  return text.length >= 5200 ? text : `${text}\n\n${text}`;
}

function buildPrompt(kind, input, chapterTitle, dataLine) {
  const labels = {
    sukuyo: "숙요점 27수",
    astro: "서양 점성술",
    vedic: "베다 점성술",
    ziwei: "자미두수",
  };
  const guard = kind === "sukuyo"
    ? "중요: 사주명리 PDF가 아니라 숙요점 PDF입니다. 십성, 용신, 대운 중심으로 쓰지 말고 27수, 달의 리듬, 숙요 관계성, 카르마 패턴 중심으로 쓰세요."
    : "";
  return `당신은 ${labels[kind]} 프리미엄 PDF 전문 작가입니다.
${guard}

사용자: ${input.name}, 생년월일시 ${input.year}-${input.month}-${input.day} ${input.hour}:${input.minute}
분석 데이터: ${dataLine}
챕터: ${chapterTitle}

한국어로 고품질 PDF 본문을 작성하세요. 아래 형식을 지키세요.
## 핵심 구조
## 삶에서 드러나는 패턴
## 관계/커리어/돈의 적용
## 그림자와 주의점
## 30일 실행 가이드

각 섹션은 두 문단 이상, 추상적인 위로보다 실제 선택과 행동 기준을 많이 포함하세요.`;
}

async function callGemini(env, prompt, modelEnvKeys = [], options = {}) {
  const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86;
  const topP = Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95;
  const maxOutputTokens = Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : Number(env.PREMIUM_GEMINI_TIMEOUT_MS || 45000);
  const maxAttemptsPerPair = Number.isFinite(Number(options.maxAttemptsPerPair))
    ? Number(options.maxAttemptsPerPair)
    : Number(env.PREMIUM_GEMINI_RETRIES || 2);
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: [
      "PREMIUM_GEMINI_API_KEY1",
      "PREMIUM_GEMINI_API_KEY2",
      "PREMIUM_GEMINI_API_KEY3",
      "PREMIUM_GEMINI_API_KEY4",
    ],
    modelEnvKeys: ["PREMIUM_GEMINI_MODEL", ...modelEnvKeys],
    temperature,
    topP,
    maxOutputTokens,
    timeoutMs,
    maxAttemptsPerPair,
  });
  return result.ok ? result.text : "";
}

async function generatedChapter(env, kind, input, meta, dataLine, fallbackProfile, fallbackFocus, modelEnvKeys = []) {
  const prompt = buildPrompt(kind, input, meta.title, dataLine);
  let text = await callGemini(env, prompt, modelEnvKeys);
  let usedFallback = false;
  if (!text || text.length < 900) {
    usedFallback = true;
    text = longFallback({
      system: kind,
      chapterTitle: meta.title,
      profileLine: fallbackProfile,
      focusLine: fallbackFocus,
    });
  }
  return { text, sections: parseSections(text), usedFallback };
}

function stableHash(value) {
  const source = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function hasPreciseBirthTime(body = {}) {
  if (asBool(body.birthTimeUnknown) || asBool(body.noBirthTime) || asBool(body.timeUnknown)) return false;
  if (body.hour == null && body.birthHour == null) return false;
  return true;
}

function computeAshtaKoota(myChart, partnerChart) {
  if (!myChart?.moonNakshatra || !partnerChart?.moonNakshatra) return null;
  const myMoon = myChart.planets?.Moon;
  const otherMoon = partnerChart.planets?.Moon;
  const myLagna = myChart.lagna;
  const otherLagna = partnerChart.lagna;
  if (!myMoon || !otherMoon || !myLagna || !otherLagna) return null;

  const moonDiff = (otherMoon.sign - myMoon.sign + 12) % 12;
  const nakIndexA = VEDIC_NAKSHATRA_META.findIndex((n) => n.name === myChart.moonNakshatra.name);
  const nakIndexB = VEDIC_NAKSHATRA_META.findIndex((n) => n.name === partnerChart.moonNakshatra.name);
  const nakDiff = ((nakIndexB - nakIndexA) + 27) % 27;

  const scoreVarna = moonDiff % 3 === 0 ? 1 : 0.5;
  const scoreVashya = [0, 1, 5, 7, 9].includes(moonDiff) ? 2 : 1;
  const scoreTara = [1, 3, 5, 7].includes(nakDiff % 9) ? 3 : 1.5;
  const scoreYoni = [0, 1, 2].includes(nakDiff % 6) ? 4 : 2;
  const scoreGrahaMaitri = getRashiLord(myMoon.sign) === getRashiLord(otherMoon.sign) ? 5 : 3;
  const scoreGana = nakDiff % 3 === 0 ? 6 : 3;
  const scoreBhakoot = [0, 1, 5, 7, 9, 11].includes(moonDiff) ? 7 : 2;
  const scoreNadi = nakDiff % 9 === 0 ? 0 : 8;

  const rows = [
    { key: "Varna", score: scoreVarna, max: 1 },
    { key: "Vashya", score: scoreVashya, max: 2 },
    { key: "Tara", score: scoreTara, max: 3 },
    { key: "Yoni", score: scoreYoni, max: 4 },
    { key: "Graha Maitri", score: scoreGrahaMaitri, max: 5 },
    { key: "Gana", score: scoreGana, max: 6 },
    { key: "Bhakoot", score: scoreBhakoot, max: 7 },
    { key: "Nadi", score: scoreNadi, max: 8 },
  ];
  const total = Math.round(rows.reduce((sum, row) => sum + row.score, 0) * 10) / 10;

  return {
    total,
    totalMax: 36,
    verdict: total >= 28 ? "우수" : total >= 21 ? "양호" : "보완 필요",
    rows,
    moonDiff,
    nakDiff,
  };
}

function buildVedicDataContext(body, input, chart, reportType, partnerChart, ashta) {
  const birthTimeKnown = hasPreciseBirthTime(body);
  const profileLines = [
    `- 사용자 이름: ${String(body.name || input.name || "사용자")}`,
    `- 생년월일: ${input.year}-${input.month}-${input.day}`,
    `- 출생 시간: ${birthTimeKnown ? `${input.hour}:${String(input.minute).padStart(2, "0")}` : "미상"}`,
    `- 출생지: ${String(body.birthPlace || body.place || "정보 없음")}`,
    `- 위도/경도: ${Number(input.lat).toFixed(4)}, ${Number(input.lon).toFixed(4)}`,
    `- 시간대: ${String(body.timezoneName || body.timezone || input.timezone || "정보 없음")}`,
    `- 성별: ${String(body.gender || input.gender || "정보 없음")}`,
    `- 양력/음력: ${String(body.calendarType || "solar")}`,
    `- 윤달 여부: ${String(body.isLeapMonth ?? "정보 없음")}`,
    `- Ayanamsa 모드: ${String(body.ayanamsa || chart.ayanamsaMode || "lahiri")}`,
    `- Ayanamsa 값: ${chart.ayanamsa == null ? "정보 없음" : chart.ayanamsa}`,
    `- Lahiri 사용 여부: ${String((body.ayanamsa || chart.ayanamsaMode || "lahiri").toLowerCase() === "lahiri")}`,
  ];

  const lagna = chart.lagna || {};
  const moonNak = chart.moonNakshatra || {};
  const dasha = chart.vimshottariDasha || {};
  const planets = chart.planets || {};
  const planetLines = VEDIC_PLANET_ORDER.map((name) => {
    const p = planets[name];
    if (!p) return `- ${name}: 정보 없음`;
    return [
      `- ${name}:`,
      `  - Sign: ${p.signName || "정보 없음"}(${p.signKo || "정보 없음"})`,
      `  - Degree: ${p.degree ?? "정보 없음"}`,
      `  - Nakshatra/Pada: ${p.nakshatra || "정보 없음"} / ${p.nakshatraPada || "정보 없음"}`,
      `  - House: ${p.house ?? "정보 없음"}`,
      `  - Retrograde: ${String(!!p.isRetrograde)}`,
      `  - Combust: ${String(!!p.isCombust)}`,
      `  - Dignity: ${p.dignity || "정보 없음"}`,
      `  - Exaltation/Debilitation: ${String(!!p.isExalted)} / ${String(!!p.isDebilitated)}`,
      `  - Own/Friendly/Enemy: ${String(!!p.isOwnSign)} / ${String(!!p.isFriendlySign)} / ${String(!!p.isEnemySign)}`,
    ].join("\n");
  });

  const coreLines = [
    `- 라그나 Sign: ${lagna.signName || "정보 없음"}`,
    `- 라그나 Degree: ${lagna.degree ?? "정보 없음"}`,
    `- 라그나 Lord: ${lagna.lord || "정보 없음"}`,
    `- Sun Sign: ${planets.Sun?.signName || "정보 없음"}`,
    `- Moon Sign: ${planets.Moon?.signName || "정보 없음"}`,
    `- Moon Nakshatra: ${moonNak.name || "정보 없음"}`,
    `- Moon Nakshatra Pada: ${moonNak.pada || "정보 없음"}`,
    `- Atmakaraka: ${chart.atmakaraka?.name || "정보 없음"}`,
    `- Amatyakaraka: ${chart.amatyakaraka?.name || "정보 없음"}`,
    `- Darakaraka: ${chart.darakaraka?.name || "정보 없음"}`,
    `- Rahu 위치: ${planets.Rahu ? `${planets.Rahu.signName} ${planets.Rahu.house}H` : "정보 없음"}`,
    `- Ketu 위치: ${planets.Ketu ? `${planets.Ketu.signName} ${planets.Ketu.house}H` : "정보 없음"}`,
    `- D1 Rashi Chart: ${JSON.stringify(chart.d1 || {})}`,
    `- D9 Navamsa Chart: ${JSON.stringify(chart.d9 || {})}`,
    `- D10 Dashamsa Chart: ${JSON.stringify(chart.d10 || {})}`,
    `- 현재 Maha Dasha: ${dasha.current?.planet || "정보 없음"}`,
    `- 현재 Antar Dasha: ${dasha.antar?.planet || "정보 없음"}`,
    `- 현재 Pratyantar Dasha: ${dasha.pratyantar?.planet || "정보 없음"}`,
    `- Dasha Start Date: ${dasha.current?.startDate || "정보 없음"}`,
    `- Dasha End Date: ${dasha.current?.endDate || "정보 없음"}`,
    `- 주요 Yoga 목록: ${(chart.yogas || []).map((y) => y.nameKo || y.name).join(", ") || "정보 없음"}`,
    `- Dhana Yoga 여부: ${String((chart.yogas || []).some((y) => /Dhana|다나/i.test(String(y.name || y.nameKo || ""))))}`,
    `- Raja Yoga 여부: ${String((chart.yogas || []).some((y) => /Raja|라자/i.test(String(y.name || y.nameKo || ""))))}`,
    `- Gaja Kesari Yoga 여부: ${String((chart.yogas || []).some((y) => /Gaja\s*Kesari|가자\s*케사리/i.test(String(y.name || y.nameKo || ""))))}`,
    `- Neecha Bhanga Yoga 여부: ${String((chart.yogas || []).some((y) => /Neecha\s*Bhanga|니차\s*방가/i.test(String(y.name || y.nameKo || ""))))}`,
    `- Vipareeta Raja Yoga 여부: ${String((chart.yogas || []).some((y) => /Vipareeta\s*Raja|비파리타\s*라자/i.test(String(y.name || y.nameKo || ""))))}`,
    `- 기타 특수 요가: ${(chart.yogas || []).map((y) => y.name || y.nameKo).slice(0, 8).join(", ") || "정보 없음"}`,
    `- Saturn Transit: ${JSON.stringify(chart.transits?.saturn || chart.transits?.Saturn || "정보 없음")}`,
    `- Jupiter Transit: ${JSON.stringify(chart.transits?.jupiter || chart.transits?.Jupiter || "정보 없음")}`,
    `- Rahu/Ketu Transit: ${JSON.stringify(chart.transits?.rahuKetu || chart.transits?.RahuKetu || "정보 없음")}`,
  ];

  const houseLines = [
    `- 2하우스: ${JSON.stringify(chart.houses?.h2 || "정보 없음")}`,
    `- 7하우스: ${JSON.stringify(chart.houses?.h7 || "정보 없음")}`,
    `- 10하우스: ${JSON.stringify(chart.houses?.h10 || "정보 없음")}`,
    `- 11하우스: ${JSON.stringify(chart.houses?.h11 || "정보 없음")}`,
    `- 12하우스: ${JSON.stringify(chart.houses?.h12 || "정보 없음")}`,
  ];

  const compatLines = [];
  if (reportType === "compatibility" && partnerChart) {
    compatLines.push(
      `- 상대방 이름: ${String(body.partnerName || "상대")}`,
      `- 상대방 생년월일: ${[body.partnerYear, body.partnerMonth, body.partnerDay].filter(Boolean).join("-") || "정보 없음"}`,
      `- 상대방 출생 시간: ${body.partnerHour == null ? "미상" : `${body.partnerHour}:${String(body.partnerMinute || 0).padStart(2, "0")}`}`,
      `- 상대방 출생지: ${String(body.partnerBirthPlace || "정보 없음")}`,
      `- 상대 Moon Nakshatra: ${partnerChart.moonNakshatra?.name || "정보 없음"}`,
      `- 상대 Moon Sign: ${partnerChart.planets?.Moon?.signName || "정보 없음"}`,
      `- 상대 Lagna: ${partnerChart.lagna?.signName || "정보 없음"}`,
      `- Manglik Dosha 여부(본인/상대): ${String([1, 2, 4, 7, 8, 12].includes(Number(chart.planets?.Mars?.house || -1)))}/${String([1, 2, 4, 7, 8, 12].includes(Number(partnerChart.planets?.Mars?.house || -1)))}`,
    );

    if (ashta) {
      compatLines.push(
        `- Ashta Koota 총점: ${ashta.total}/${ashta.totalMax}`,
        ...ashta.rows.map((r) => `- ${r.key}: ${r.score}/${r.max}`),
      );
    }
  }

  const warnings = [];
  if (!birthTimeKnown) {
    warnings.push("출생 시간이 없어 라그나, 하우스, 분할 차트 분석의 정밀도가 제한됩니다. 이 리포트는 달과 나크샤트라 중심으로 보완 분석되었습니다.");
  }
  if (!body.birthPlace && !body.place) {
    warnings.push("출생지 정보가 부족해 시간대/위경도 기반 정밀 계산이 제한될 수 있습니다.");
  }
  if (!chart?.ayanamsaMode || String(chart.ayanamsaMode).trim() === "") {
    warnings.push(VEDIC_MISSING_DATA_NOTICE);
  }

  const dataText = [
    "[사용자 프로필]",
    ...profileLines,
    "",
    "[베다 핵심 계산값]",
    ...coreLines,
    "",
    "[하우스 핵심값]",
    ...houseLines,
    "",
    "[행성 상세값]",
    ...planetLines,
    compatLines.length ? "" : null,
    compatLines.length ? "[궁합 데이터]" : null,
    ...compatLines,
  ].filter(Boolean).join("\n");

  return {
    dataText,
    warnings,
    birthTimeKnown,
  };
}

function vedicMissingMarkers(text, chapter) {
  const source = String(text || "");
  const required = [
    "### 핵심 요약",
    "### 데이터 근거 해석",
    "### 심화 분석",
    "### 실전 우파야",
    "### 오늘부터 실천할 3가지",
  ];

  if (chapter === 12) {
    required.push("### 1월");
    required.push("### 12월");
    required.push("- 핵심 흐름:");
    required.push("- 좋은 선택:");
    required.push("- 주의할 점:");
    required.push("- 개운 행동:");
  }
  if (chapter === 13) {
    required.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    required.push("| 1~7일 |  |  |  |  |");
    required.push("| 8~30일 |  |  |  |  |");
    required.push("| 31~60일 |  |  |  |  |");
    required.push("| 61~90일 |  |  |  |  |");
  }

  return required.filter((m) => !source.includes(m));
}

function hasBannedDeterministicExpression(text) {
  const source = String(text || "");
  const banned = [
    /무조건\s*실패/i,
    /반드시\s*이혼/i,
    /평생\s*가난/i,
    /확정\s*수익/i,
    /100%\s*수익/i,
    /질병\s*진단/i,
    /사망\s*확정/i,
  ];
  return banned.some((re) => re.test(source));
}

function buildVedicPremiumPrompt(meta, chapter, input, reportType, context) {
  const chapterGuide = VEDIC_CHAPTER_GUIDES[chapter - 1] || "현재 챕터 주제에 맞춰 베다 데이터 근거 중심으로 작성하세요.";
  const reportTitle = reportType === "compatibility" ? VEDIC_REPORT_TITLE_COMPAT : VEDIC_REPORT_TITLE_PERSONAL;
  const reportSubtitle = reportType === "compatibility" ? VEDIC_REPORT_SUBTITLE_COMPAT : VEDIC_REPORT_SUBTITLE_PERSONAL;
  const monthlyRule = chapter === 12
    ? "챕터 12에서는 반드시 ### 1월부터 ### 12월까지 월별 블록을 만들고, 각 월마다 - 핵심 흐름/- 좋은 선택/- 주의할 점/- 개운 행동을 작성하세요."
    : "";
  const roadmapRule = chapter === 13
    ? "챕터 13에서는 반드시 아래 90일 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";

  return [
    "너는 30년 경력의 베다 점성술 전문가이자, 주티쉬(Jyotish) 마스터, 인도 철학 연구가, 심리 상담가, 프리미엄 PDF 리포트 작가다.",
    "사용자의 베다 점성술 차트 데이터를 바탕으로 단순한 운세 풀이가 아니라 카르마 구조와 실행 전략을 연결한다.",
    "전문적이되 어렵지 않게 작성하고, 산스크리트 용어는 반드시 쉬운 한국어 설명을 붙인다.",
    "공포 조장 문구와 단정 예언(결혼/이혼/사망/투자 보장/질병 진단)을 금지한다.",
    "카르마를 저주가 아닌 성장 과제와 반복 패턴으로 설명한다.",
    "오직 마크다운 본문만 출력한다.",
    "",
    `[리포트 제목] ${reportTitle}`,
    `[리포트 부제] ${reportSubtitle}`,
    `[리포트 타입] ${reportType}`,
    `[현재 챕터] ${chapter}. ${meta.title} — ${meta.subtitle}`,
    `[최소 분량] ${VEDIC_MIN_CHARS}자 이상 (권장 5000자 이상)`,
    "",
    "[반드시 지킬 구조]",
    `## 챕터 ${chapter}. ${meta.title}`,
    "### 핵심 요약",
    "### 데이터 근거 해석",
    "### 심화 분석",
    "### 실전 우파야",
    "### 오늘부터 실천할 3가지",
    "",
    "[챕터 전용 지시]",
    chapterGuide,
    monthlyRule,
    roadmapRule,
    "",
    "[데이터 부족 시 반드시 포함할 문장]",
    VEDIC_MISSING_DATA_NOTICE,
    "",
    "[입력 데이터]",
    context.dataText,
    context.warnings.length ? `\n[주의/제한]\n- ${context.warnings.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");
}

function buildVedicFallbackMarkdown(meta, chapter, input, reportType, context) {
  const reportTitle = reportType === "compatibility" ? VEDIC_REPORT_TITLE_COMPAT : VEDIC_REPORT_TITLE_PERSONAL;
  const reportSubtitle = reportType === "compatibility" ? VEDIC_REPORT_SUBTITLE_COMPAT : VEDIC_REPORT_SUBTITLE_PERSONAL;

  const core = [
    `# ${reportTitle}`,
    `# ${reportSubtitle}`,
    `## 챕터 ${chapter}. ${meta.title}`,
    "### 핵심 요약",
    "- 라그나와 나크샤트라는 성격보다 반복되는 선택 패턴을 설명하는 좌표입니다.",
    "- 현재 다샤는 외부 사건보다 내부 의사결정 습관의 재정렬을 요구합니다.",
    "- 요가의 강점은 자동 성공이 아니라 발현 조건을 지켰을 때 현실화됩니다.",
    "- 우파야는 미신이 아닌 행동 루틴이며, 지속성이 핵심입니다.",
    "- 작은 루틴의 누적이 카르마 체감 흐름을 바꿉니다.",
    "### 데이터 근거 해석",
    context.warnings.length ? `${VEDIC_MISSING_DATA_NOTICE}\n\n${context.warnings.join("\n")}` : "제공된 Swiss 기반 베다 데이터(사이드리얼 황도/아야남샤/행성 배치)를 중심으로 분석합니다.",
    `입력값 요약: ${input.year}-${input.month}-${input.day} ${input.hour}:${String(input.minute).padStart(2, "0")}, 위도 ${Number(input.lat).toFixed(3)}, 경도 ${Number(input.lon).toFixed(3)}.`,
    "### 심화 분석",
    "카르마는 정해진 형벌이 아니라 반복되는 반응 패턴을 인식하고 재설계할 기회입니다. 이 챕터에서는 라그나 축(현실 태도), 나크샤트라 축(감정 반응), 다샤 축(시기 과제)을 한 번에 보아 실행 우선순위를 설계합니다.",
    "실무적으로는 결정 속도를 늦추는 기준선, 관계 대화의 경계선, 체력 관리를 통한 집중력 복원이 핵심입니다. 세 영역을 분리하지 않고 하나의 생활 시스템으로 묶어야 운의 체감이 개선됩니다.",
    "### 실전 우파야",
    "1. 요일 루틴: 월(감정 정리), 화(실행), 수(대화), 목(확장), 금(관계), 토(정리), 일(복기)로 리듬을 고정합니다.",
    "2. 만트라/확언: 종교 강요 없이 3분 호흡 후 핵심 확언 1문장을 반복합니다.",
    "3. 봉사/기여 루틴: 주 1회 타인에게 실질적 도움을 주는 행동을 고정해 라후/케투 불안을 낮춥니다.",
    "4. 수면/식단: 과도한 자극과 야간 각성을 줄이고 회복 시간을 먼저 확보합니다.",
    "### 오늘부터 실천할 3가지",
    "1. 오늘 의사결정 1건을 감정/현실/장기로 분리해 기록합니다.",
    "2. 이번 주 소모 패턴 1개를 멈추고 대체 루틴 1개를 고정합니다.",
    "3. 월말에 관계·직업·재정·건강을 한 번에 점검합니다.",
  ].join("\n\n");

  let text = core;
  if (chapter === 12) {
    const months = [];
    for (let m = 1; m <= 12; m += 1) {
      months.push(`### ${m}월\n- 핵심 흐름: 외부 이벤트보다 내부 리듬 정렬이 중요합니다.\n- 좋은 선택: 핵심 우선순위 1개를 먼저 확정하세요.\n- 주의할 점: 과속 확장과 감정적 결정을 피하세요.\n- 개운 행동: 주간 복기 30분을 고정하세요.`);
    }
    text += `\n\n${months.join("\n\n")}`;
  }
  if (chapter === 13) {
    text += "\n\n| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |\n|---|---|---|---|---|\n| 1~7일 |  |  |  |  |\n| 8~30일 |  |  |  |  |\n| 31~60일 |  |  |  |  |\n| 61~90일 |  |  |  |  |";
  }

  let depth = 1;
  while (text.length < VEDIC_MIN_CHARS) {
    text += `\n\n### 심화 보충 노트 ${depth}\n베다 리포트의 핵심은 해석 자체보다 실행의 지속성입니다. 같은 챕터를 읽어도 루틴으로 옮긴 사람만 체감이 달라집니다. 이번 주에는 큰 결정보다 작은 루틴 고정을 우선하고, 월말에는 반드시 복기해서 다음 달에 이어가세요.`;
    depth += 1;
  }

  return text;
}

async function generateVedicPremiumChapter(env, body, input, chapter, meta, chart, reportType, partnerChart, ashta) {
  const context = buildVedicDataContext(body, input, chart, reportType, partnerChart, ashta);
  const prompt = buildVedicPremiumPrompt(meta, chapter, input, reportType, context);
  const options = {
    temperature: 0.86,
    topP: 0.95,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_VEDIC_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_VEDIC_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_VEDIC_GEMINI_MODEL"], options);
  let usedFallback = false;

  if (!text || text.trim().length < 1200) {
    usedFallback = true;
    text = buildVedicFallbackMarkdown(meta, chapter, input, reportType, context);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = vedicMissingMarkers(text, chapter);
    const tooShort = text.length < VEDIC_MIN_CHARS;
    const truncated = looksTruncatedMarkdown(text);
    const banned = hasBannedDeterministicExpression(text);
    if (!tooShort && missing.length === 0 && !truncated && !banned) break;

    const refinePrompt = [
      "아래 베다 점성술 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${VEDIC_MIN_CHARS}자`,
      "오직 마크다운 본문만 출력하고, 기존 흐름을 유지하면서 누락 요소를 채우세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""}`.trim(),
      "",
      "[초안]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_VEDIC_GEMINI_MODEL"], options);
    if (!refined || !refined.trim()) break;
    const candidate = refined.trim();
    if (candidate.length >= Math.floor(text.length * 0.8)) {
      text = candidate;
    } else {
      text = `${text}\n\n${candidate}`;
    }
  }

  const finalMissing = vedicMissingMarkers(text, chapter);
  if (text.length < VEDIC_MIN_CHARS || finalMissing.length > 0 || looksTruncatedMarkdown(text) || hasBannedDeterministicExpression(text)) {
    usedFallback = true;
    text = buildVedicFallbackMarkdown(meta, chapter, input, reportType, context);
  }

  return {
    text,
    sections: parseSections(text),
    usedFallback,
    warnings: context.warnings,
  };
}

function normalizeZiweiField(value, fallback = "정보 없음") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function buildZiweiDataContext(body, input, summary, structured) {
  const lunarType = normalizeZiweiField(body?.calendarType || body?.calendar || body?.isLunar || body?.solarLunar || "정보 없음");
  const leapMonth = normalizeZiweiField(body?.isLeapMonth || body?.leapMonth || "정보 없음");
  const baseLines = [
    `- 사용자 생년월일: ${input.year}-${input.month}-${input.day}`,
    `- 출생 시간: ${input.hour}:${String(input.minute).padStart(2, "0")}`,
    `- 성별: ${normalizeZiweiField(body?.gender || input.gender || "정보 없음")}`,
    `- 음력/양력: ${lunarType}`,
    `- 윤달 여부: ${leapMonth}`,
    `- 명궁: ${normalizeZiweiField(body?.mingong || body?.mingung || "정보 없음")}`,
    `- 신궁: ${normalizeZiweiField(body?.shingong || body?.shingung || "정보 없음")}`,
    `- 12궁 배치: ${normalizeZiweiField(body?.palaces || body?.palaceLayout || "정보 없음")}`,
    `- 각 궁의 주성: ${normalizeZiweiField(body?.mainStars || body?.palaceMainStars || "정보 없음")}`,
    `- 보조성: ${normalizeZiweiField(body?.auxStars || body?.palaceAuxStars || "정보 없음")}`,
    `- 살성: ${normalizeZiweiField(body?.badStars || body?.palaceBadStars || "정보 없음")}`,
    `- 사화: ${normalizeZiweiField(body?.sihua || body?.sihuaSummary || "정보 없음")}`,
    `- 대한: ${normalizeZiweiField(body?.daehan || body?.majorCycle || "정보 없음")}`,
    `- 유년: ${normalizeZiweiField(body?.yunyeon || body?.yearFlow || "정보 없음")}`,
    `- 유월: ${normalizeZiweiField(body?.yuwol || body?.monthFlow || "정보 없음")}`,
    `- 기타 계산된 자미두수 데이터: ${normalizeZiweiField(summary || body?.ziweiData || "정보 없음")}`,
  ];

  if (Array.isArray(structured) && structured.length) {
    const palaceLines = structured.slice(0, 12).map((p) => {
      const palace = normalizeZiweiField(p?.palace || p?.name || "미상궁");
      const main = Array.isArray(p?.stars) ? p.stars.map((s) => normalizeZiweiField(s?.name || s)).filter(Boolean).join(", ") : "";
      const aux = Array.isArray(p?.auxStars) ? p.auxStars.map((s) => normalizeZiweiField(s?.name || s)).filter(Boolean).join(", ") : "";
      const bad = Array.isArray(p?.badStars) ? p.badStars.map((s) => normalizeZiweiField(s?.name || s)).filter(Boolean).join(", ") : "";
      return `- ${palace}: 주성[${main || "정보 없음"}] 보조성[${aux || "정보 없음"}] 살성[${bad || "정보 없음"}]`;
    });
    return {
      dataText: baseLines.concat("", "[구조화된 12궁 요약]", ...palaceLines).join("\n"),
      missingNotice: "",
    };
  }

  return {
    dataText: baseLines.join("\n"),
    missingNotice: "명반 데이터가 부족해 일반론으로 보완한다",
  };
}

function ziweiMissingMarkers(text, chapter) {
  const source = String(text || "");
  const required = [
    "### 핵심 요약 5줄",
    "### 명반 근거 해석",
    "### 성향과 현실 적용",
    "### 장점과 기회",
    "### 약점과 주의점",
    "### 구체적인 개운법",
    "### 실천 체크리스트",
    "### 따뜻한 상담 메시지",
    "### 오늘부터 실천할 3가지",
    "---",
  ];

  if (chapter === 1) {
    required.push(`# ${ZIWEI_REPORT_TITLE}`);
    required.push(`# ${ZIWEI_PROLOGUE_TITLE}`);
  }
  if (chapter === 11) {
    required.push("## 1월");
    required.push("## 12월");
    required.push("- 핵심 흐름:");
    required.push("- 좋은 선택:");
    required.push("- 주의할 점:");
    required.push("- 개운 행동:");
  }
  if (chapter === 13) {
    required.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    required.push("| 1~7일 |  |  |  |  |");
    required.push("| 8~30일 |  |  |  |  |");
    required.push("| 31~60일 |  |  |  |  |");
    required.push("| 61~90일 |  |  |  |  |");
  }

  return required.filter((marker) => !source.includes(marker));
}

function looksTruncatedMarkdown(text) {
  const source = String(text || "").trim();
  if (!source) return true;
  const tail = source.slice(-140);
  const hasTerminalMark = /[.!?。！？]$/.test(tail.trim()) || /---\s*$/.test(source);
  const abruptlyCut = /(:|,|\(|\[|\-|\*|\s)$/.test(tail);
  return !hasTerminalMark && abruptlyCut;
}

function buildZiweiPremiumPrompt(meta, chapter, input, dataText, missingNotice) {
  const chapterGuide = ZIWEI_CHAPTER_GUIDES[chapter - 1] || "현재 챕터 주제에 맞춰 궁위·삼방사정·대운·세운 흐름을 함께 해석하세요.";
  const chapterMinChars = chapter === 11 || chapter === 13 ? 5600 : 5200;
  const chapterHeading = `## 챕터 ${chapter}. ${meta.title}`;

  const monthlyRule = chapter === 11
    ? "챕터 11에서는 반드시 1월부터 12월까지 아래 형식을 반복하세요: ## N월 / - 핵심 흐름: / - 좋은 선택: / - 주의할 점: / - 개운 행동:"
    : "";
  const roadmapRule = chapter === 13
    ? "챕터 13에서는 반드시 아래 90일 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";
  const prologueRule = chapter === 1
    ? `챕터 1 시작 전 반드시 '# ${ZIWEI_REPORT_TITLE}' 다음 줄에 '# ${ZIWEI_PROLOGUE_TITLE}'를 작성하고, 프롤로그에는 가장 강한 기운·반복 패턴·운이 열리는 방식·심리적 함정·리포트 활용법·자미두수는 선택의 나침반이라는 안내를 포함하세요.`
    : "";

  return [
    "너는 30년 경력의 자미두수 명리 전문가이자, 심리 상담가, 인생 전략 컨설턴트, 프리미엄 PDF 리포트 작가다.",
    "사용자의 자미두수 명반 데이터를 기반으로 단순 점괘가 아니라 타고난 구조→현재 심리/현실→선택 전략→구체적 개운 실천법을 연결해 작성하라.",
    "오직 마크다운 본문만 출력하라. 코드, 컴포넌트, UI 설명, 개발 설명은 절대 출력하지 마라.",
    "건강·투자·법률·의료는 진단/보장 표현을 금지하고 생활 관리 수준의 조언으로 작성하라.",
    "단정적 공포 문구(예: 반드시 망한다, 절대 안 된다)를 금지하고 상담형 문장으로 작성하라.",
    "한자 용어에는 쉬운 한국어 해설을 반드시 붙여라.",
    "별 하나만 단편 해석하지 말고 궁위·삼방사정·대운·세운·사화를 종합하라.",
    "",
    `[현재 생성 대상] ${chapterHeading}`,
    `[부제] ${meta.subtitle}`,
    `[최소 분량] ${chapterMinChars}자 이상 (권장 6000자)` ,
    "",
    "[반드시 지킬 형식]",
    "- 챕터 제목: H2(##)",
    "- 소제목: H3(###)",
    "- 핵심 요약: bullet 5줄",
    "- 실천 체크리스트: 체크박스 형식(- [ ])",
    "- 중요한 문장: 굵게(** **)",
    "- 챕터 마지막: 오늘부터 실천할 3가지 + 구분선(---)",
    "",
    "[챕터 본문 필수 순서]",
    chapter === 1 ? `# ${ZIWEI_REPORT_TITLE}` : "",
    chapter === 1 ? `# ${ZIWEI_PROLOGUE_TITLE}` : "",
    chapterHeading,
    "### 핵심 요약 5줄",
    "### 명반 근거 해석",
    "### 성향과 현실 적용",
    "### 장점과 기회",
    "### 약점과 주의점",
    "### 구체적인 개운법",
    "### 실천 체크리스트",
    "### 따뜻한 상담 메시지",
    "### 오늘부터 실천할 3가지",
    "---",
    "",
    "[챕터 전용 추가 지시]",
    chapterGuide,
    monthlyRule,
    roadmapRule,
    prologueRule,
    "",
    "[입력 데이터]",
    dataText,
    missingNotice ? `- 데이터 주의: ${missingNotice}` : "",
    "",
    "데이터가 일부 부족하면 문장 중에 반드시 '명반 데이터가 부족해 일반론으로 보완한다'를 포함하고, 가능한 범위 내 최선 해석을 제공하라.",
  ].filter(Boolean).join("\n");
}

function buildZiweiFallbackMarkdown(meta, chapter, input, dataText, missingNotice) {
  const chapterHeading = `## 챕터 ${chapter}. ${meta.title}`;
  const intro = chapter === 1
    ? `# ${ZIWEI_REPORT_TITLE}\n\n# ${ZIWEI_PROLOGUE_TITLE}\n**이 명반의 가장 강한 기운은 타고난 책임감과 현실 대응력의 결합입니다.** 삶에서 반복되는 핵심 패턴은 중요한 순간에 스스로를 과도하게 압박한 뒤, 다시 균형을 회복하는 방식으로 나타납니다. 운이 열리는 방식은 큰 결심보다 작은 실행을 꾸준히 쌓을 때이며, 조심해야 할 심리적 함정은 완벽주의와 비교 의식입니다. 이 리포트는 정답을 강요하는 문서가 아니라 선택의 품질을 높이는 안내서입니다. **자미두수는 운명을 고정하는 도구가 아니라, 선택의 질을 높이는 나침반입니다.**\n\n`
    : "";

  const summaryList = [
    "- **핵심 에너지는 강점과 부담이 동시에 작동하는 이중 구조입니다.**",
    "- 타이밍을 잡을 때는 감정 속도보다 실행 지속성을 우선하는 편이 유리합니다.",
    "- 관계·일·재정은 분리된 문제가 아니라 같은 의사결정 습관의 다른 얼굴입니다.",
    "- 리스크는 외부 변수보다 내부 리듬 붕괴(수면, 과부하, 경계 붕괴)에서 커집니다.",
    "- 오늘의 작은 조정이 3개월 뒤 운의 체감을 바꾸는 출발점이 됩니다.",
  ].join("\n");

  const monthlyTemplate = chapter === 11
    ? [
      "## 1월\n- 핵심 흐름: 속도보다 정렬이 중요한 달입니다.\n- 좋은 선택: 오래 미뤄둔 우선순위 1개를 확정하세요.\n- 주의할 점: 충동적 확장 결정을 피하세요.\n- 개운 행동: 아침 10분 계획 점검을 고정하세요.",
      "## 2월\n- 핵심 흐름: 관계 조정과 협업 재정렬이 필요한 달입니다.\n- 좋은 선택: 대화 기준을 문장으로 합의하세요.\n- 주의할 점: 감정 누적 후 폭발 패턴을 경계하세요.\n- 개운 행동: 주 1회 감정 기록을 실천하세요.",
      "## 3월\n- 핵심 흐름: 실행력이 회복되는 구간입니다.\n- 좋은 선택: 작은 성과를 빠르게 반복하세요.\n- 주의할 점: 완벽주의로 시작이 늦어지지 않게 하세요.\n- 개운 행동: 25분 집중 루틴을 도입하세요.",
      "## 4월\n- 핵심 흐름: 외부 활동운이 점차 확장됩니다.\n- 좋은 선택: 이동/미팅을 전략적으로 배치하세요.\n- 주의할 점: 체력 과소평가를 피하세요.\n- 개운 행동: 수면 우선 루틴을 지키세요.",
      "## 5월\n- 핵심 흐름: 재정 의사결정의 분기점입니다.\n- 좋은 선택: 위험 노출도를 숫자로 점검하세요.\n- 주의할 점: 단기 기대 수익에 과몰입하지 마세요.\n- 개운 행동: 고정지출 재정렬을 실행하세요.",
      "## 6월\n- 핵심 흐름: 관계 안정화와 경계 설정이 중요합니다.\n- 좋은 선택: 요청·거절 기준을 명확히 하세요.\n- 주의할 점: 정서적 소모 관계를 방치하지 마세요.\n- 개운 행동: 주간 관계 정리 시간을 고정하세요.",
      "## 7월\n- 핵심 흐름: 커리어 집중력이 상승합니다.\n- 좋은 선택: 성과 지표를 단순화하세요.\n- 주의할 점: 다중 프로젝트 동시 과부하를 피하세요.\n- 개운 행동: 가장 중요한 한 가지를 먼저 완료하세요.",
      "## 8월\n- 핵심 흐름: 회복과 재충전이 성과를 좌우합니다.\n- 좋은 선택: 리듬 회복 계획을 먼저 세우세요.\n- 주의할 점: 누적 피로를 의지로만 버티지 마세요.\n- 개운 행동: 저녁 디지털 디톡스 시간을 만드세요.",
      "## 9월\n- 핵심 흐름: 장기 계획을 다시 설계하기 좋은 달입니다.\n- 좋은 선택: 1년 목표를 90일 단위로 재배치하세요.\n- 주의할 점: 과거 실패 기억에 발목 잡히지 마세요.\n- 개운 행동: 주간 회고 30분을 유지하세요.",
      "## 10월\n- 핵심 흐름: 대외 신뢰와 평판 관리가 중요합니다.\n- 좋은 선택: 약속 이행률을 높이세요.\n- 주의할 점: 즉흥적 발언으로 오해를 만들지 마세요.\n- 개운 행동: 핵심 메시지 3문장 템플릿을 준비하세요.",
      "## 11월\n- 핵심 흐름: 수확과 정리의 균형이 필요합니다.\n- 좋은 선택: 유지할 것과 종료할 것을 분리하세요.\n- 주의할 점: 미련으로 비효율을 끌지 마세요.\n- 개운 행동: 월말 정리 루틴을 실행하세요.",
      "## 12월\n- 핵심 흐름: 다음 해를 위한 구조화가 핵심입니다.\n- 좋은 선택: 체력·관계·재정의 기준선을 재설정하세요.\n- 주의할 점: 과도한 자기평가로 의욕을 잃지 마세요.\n- 개운 행동: 7일 실천 계획을 먼저 시작하세요.",
    ].join("\n\n")
    : "";

  const roadmapTable = chapter === 13
    ? "### 90일 실행 로드맵\n| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |\n|---|---|---|---|---|\n| 1~7일 |  |  |  |  |\n| 8~30일 |  |  |  |  |\n| 31~60일 |  |  |  |  |\n| 61~90일 |  |  |  |  |"
    : "";

  let text = [
    intro,
    chapterHeading,
    "### 핵심 요약 5줄",
    summaryList,
    "### 명반 근거 해석",
    `${missingNotice ? "명반 데이터가 부족해 일반론으로 보완한다. " : ""}입력 정보(${input.year}-${input.month}-${input.day} ${input.hour}:${String(input.minute).padStart(2, "0")})와 제공된 궁위 단서를 기준으로 보면, 이 챕터의 핵심은 단일 별 해석이 아니라 궁위 간 연결 구조를 읽는 데 있습니다. 명궁·신궁·삼방사정·대한·유년·유월 흐름을 함께 고려하면 같은 사건도 전혀 다른 선택 결과를 만들 수 있습니다.`,
    `데이터 단서 요약:\n${dataText}\n\n해석의 목적은 예언이 아니라 실행 가능한 선택 기준을 만드는 것입니다. 따라서 이 챕터는 지금 당장 바꿀 수 있는 행동과 중장기적으로 지켜야 할 원칙을 분리해 제시합니다.`,
    "### 성향과 현실 적용",
    "성향은 고정된 운명이 아니라 반복되는 반응 방식입니다. 현실 적용의 핵심은 내 반응 속도를 늦추고, 중요한 결정의 평가 기준을 명문화하는 것입니다. 예를 들어 관계에서는 감정 강도보다 경계의 일관성을, 커리어에서는 열정 강도보다 지속 가능성을 먼저 점검하면 리스크가 빠르게 줄어듭니다.",
    "또한 궁위 해석은 영역별로 나눠 보되 결국 하나의 생활 시스템으로 통합해야 체감이 생깁니다. 아침 루틴, 주간 회고, 월간 점검의 3단계만 고정해도 운세 해석이 생활 운영 매뉴얼로 전환됩니다.",
    "### 장점과 기회",
    "**이 명반의 장점은 위기 상황에서 구조를 재정렬하는 능력입니다.** 감정이 흔들리는 상황에서도 핵심을 다시 붙잡는 힘이 있어, 장기전에서 강점을 발휘합니다. 외부 확장 기회는 준비된 루틴 위에서 더 빠르게 현실화됩니다.",
    "기회를 키우는 방법은 복잡하지 않습니다. 핵심 목표를 줄이고, 실행 단위를 작게 나누고, 반복 가능한 리듬으로 고정하는 것입니다. 이렇게 하면 기회가 들어올 때 과부하 없이 받아낼 수 있습니다.",
    "### 약점과 주의점",
    "약점은 저주가 아니라 관리해야 할 에너지입니다. 특히 과도한 자기압박, 완벽주의, 관계 과잉 책임은 성과를 늦추는 대표 패턴입니다. 이 시기에는 보수적으로 접근하는 것이 좋으며, 큰 결정보다 손실을 줄이는 운영이 유리합니다.",
    "주의점은 실패를 두려워하는 태도 자체보다, 실패 후 회복 프로토콜이 없는 상태입니다. 회복 규칙이 있으면 동일한 실수도 다른 결과를 만듭니다.",
    "### 구체적인 개운법",
    "개운의 핵심은 생활 리듬 재정렬입니다. 아침에는 10분 계획 정리, 낮에는 핵심 1개 완수, 저녁에는 감정/행동 분리 회고를 실행하세요. 심리 안정이 필요한 날에는 5분 복식호흡(4초 들숨-4초 멈춤-6초 날숨)을 5회 반복하세요.",
    "공간 개운은 과장된 풍수보다 동선 단순화가 효과적입니다. 현관-책상-침실 3구역의 잡음을 줄이고, 시선이 닿는 곳에 실행 체크리스트를 배치하면 행동 지속성이 올라갑니다.",
    "### 실천 체크리스트",
    "- [ ] 오늘 의사결정 1건을 감정/현실/장기효과로 분리 기록한다.",
    "- [ ] 이번 주 가장 큰 소모 패턴 1개를 식별하고 대체 행동 1개를 정한다.",
    "- [ ] 수면 시간을 기준선으로 고정해 체력 변동폭을 줄인다.",
    "- [ ] 관계 경계 문장 1개를 만들어 실제 대화에 사용한다.",
    "- [ ] 주간 회고에서 다음 주 중단할 행동 1개를 확정한다.",
    "### 따뜻한 상담 메시지",
    "지금까지의 흔들림은 실패의 증거가 아니라 방향을 미세 조정해 온 과정입니다. 당신의 강점은 이미 충분하며, 필요한 것은 더 큰 의지가 아니라 더 안정적인 리듬입니다. **지금의 작은 실행이 앞으로의 운을 바꾸는 가장 현실적인 시작점입니다.**",
    monthlyTemplate,
    roadmapTable,
    chapter === 13 ? "### 엔딩 메시지\n운명은 고정된 판결문이 아닙니다. 명반은 나를 이해하기 위한 지도이며, 약점은 관리해야 할 에너지이고 강점은 실천할 때 현실이 되는 선물입니다. 지금부터의 선택이 앞으로의 운을 바꿉니다." : "",
    "### 오늘부터 실천할 3가지",
    "1. 하루 10분, 내 선택 기준을 글로 남깁니다.",
    "2. 이번 주 가장 큰 소모 패턴 1개를 멈추고 대체 행동을 고정합니다.",
    "3. 월말에 관계·일·건강·재정 점검을 한 번에 정리합니다.",
    "---",
  ].filter(Boolean).join("\n\n");

  let depth = 1;
  while (text.length < ZIWEI_MIN_CHARS) {
    text += `\n\n### 심화 보충 노트 ${depth}\n`;
    text += "이 보충 노트는 해석을 행동으로 연결하기 위한 실전 안내입니다. 큰 결정을 서두르기보다, 매주 같은 시간에 복기 루틴을 반복하면 리스크가 줄고 기회 포착력이 높아집니다. 궁위 해석은 정답이 아니라 선택 품질을 높이는 프레임이므로, 현재 상황에 맞게 가중치를 조정해 적용하세요.\n\n";
    text += "실행 문장: 이번 주에는 하나의 핵심 목표만 남기고, 나머지는 보류 리스트로 이동해 실행 피로를 줄이세요.";
    depth += 1;
  }

  return text;
}

async function generateZiweiPremiumChapter(env, body, input, chapter, meta, summary, structured) {
  const { dataText, missingNotice } = buildZiweiDataContext(body, input, summary, structured);
  const prompt = buildZiweiPremiumPrompt(meta, chapter, input, dataText, missingNotice);
  const genOptions = {
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_ZIWEI_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(env.PREMIUM_ZIWEI_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], genOptions);
  let usedFallback = false;

  if (!text || text.trim().length < 1200) {
    usedFallback = true;
    text = buildZiweiFallbackMarkdown(meta, chapter, input, dataText, missingNotice);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = ziweiMissingMarkers(text, chapter);
    const tooShort = text.length < ZIWEI_MIN_CHARS;
    const truncated = looksTruncatedMarkdown(text);
    if (!tooShort && missing.length === 0 && !truncated) break;

    const refinePrompt = [
      "아래 자미두수 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${ZIWEI_MIN_CHARS}자`,
      "중요: 초안의 장점을 유지하면서 누락 섹션만 보완하고 문장 흐름을 자연스럽게 연결하세요.",
      "오직 마크다운 본문만 출력하세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김 의심" : ""}`.trim(),
      "",
      "[초안]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], genOptions);
    if (!refined || !refined.trim()) break;
    const candidate = refined.trim();
    if (candidate.length >= Math.floor(text.length * 0.8)) {
      text = candidate;
    } else {
      text = `${text}\n\n${candidate}`;
    }
  }

  const finalMissing = ziweiMissingMarkers(text, chapter);
  if (text.length < ZIWEI_MIN_CHARS || finalMissing.length > 0 || looksTruncatedMarkdown(text)) {
    usedFallback = true;
    text = buildZiweiFallbackMarkdown(meta, chapter, input, dataText, missingNotice);
  }

  return { text, sections: parseSections(text), usedFallback };
}

async function handleSukuyoLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, 13);
  const sukuyo = await calcSukuyo(request, env, input);
  const hasPartner = body.partnerYear && body.partnerMonth && body.partnerDay;
  const partner = hasPartner
    ? await calcSukuyo(request, env, normalizeBody({ year: body.partnerYear, month: body.partnerMonth, day: body.partnerDay, hour: body.partnerHour ?? 12 }))
    : null;
  const rel = sukuyoRelation(sukuyo.mansionIdx, partner?.mansionIdx);
  const swissBasis = await fetchSwissSukuyoBasis(request, env, input);
  const partnerSwissBasis = hasPartner
    ? await fetchSwissSukuyoBasis(request, env, normalizeBody({
      year: body.partnerYear,
      month: body.partnerMonth,
      day: body.partnerDay,
      hour: body.partnerHour ?? 12,
      minute: body.partnerMinute ?? 0,
      timezone: body.partnerTimezone ?? body.timezone,
      lat: body.partnerLat ?? body.lat,
      lon: body.partnerLon ?? body.lon,
    }))
    : null;
  const chart = buildSukuyoOrientalChart(sukuyo, partner, rel, swissBasis, partnerSwissBasis);
  const meta = SUKUYO_CHAPTER_META[chapter - 1];
  const generated = await generatedChapter(
    env,
    "sukuyo",
    input,
    meta,
    `${sukuyo.mansion}宿/${sukuyo.mansionCh}, ${sukuyo.direction}, ${sukuyo.element}, 관계 ${rel ? rel.label : "개인 리포트"}, 월상 ${chart.moonPhase?.label || "정보 없음"}, 삭망각 ${chart.moonPhase?.phaseAngle ?? "정보 없음"}도, 조도 ${chart.moonPhase?.illumination ?? "정보 없음"}%`,
    `${sukuyo.mansion}宿은 달의 리듬과 관계의 반복 패턴을 통해 삶을 읽는 숙요점 데이터입니다.`,
    "숙요점에서는 같은 사건보다 같은 감정 리듬이 반복되는 지점을 먼저 조정해야 합니다.",
  );
  return json({ ok: true, sukuyo, partner, relation: rel, chart, chapter, chapterMeta: meta, ...generated });
}

async function handleAstroWestern(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chart = await getSwissWesternChart(request, env, input);
  return json({ ok: true, ...chart });
}

async function handleAstroLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, ASTRO_TOTAL_CHAPTERS);
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  let reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";

  input.birthPlace = String(body.birthPlace || body.place || body.location || "");
  input.houseSystem = String(body.houseSystem || "placidus").toLowerCase();
  input.zodiacType = String(body.zodiacType || "tropical").toLowerCase();
  input.includeMinorAspects = body.includeMinorAspects !== false;

  const reportId = astroReportIdFromInput(body, input, reportType);
  const cacheKey = `${reportId}:${chapter}:${reportType}:${input.houseSystem}:${input.zodiacType}`;
  const forceRegen = asBool(body.forceRegenerate) || asBool(body.retryChapter);
  if (!forceRegen) {
    const cached = readAstroCache(cacheKey);
    if (cached) return json({ ok: true, cached: true, ...cached });
  }

  const rawChart = await getSwissWesternChart(request, env, input);
  const chart = buildWesternPremiumChart(rawChart, input, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: input.includeMinorAspects,
  });

  let partnerChart = null;
  let synastry = null;
  let composite = null;
  if (reportType === "compatibility") {
    const hasPartnerBirth = Number.isFinite(Number(body.partnerYear))
      && Number.isFinite(Number(body.partnerMonth))
      && Number.isFinite(Number(body.partnerDay));

    if (!hasPartnerBirth) {
      reportType = "personal";
    } else {
      const partnerInput = normalizeBody({
        ...body,
        year: body.partnerYear,
        month: body.partnerMonth,
        day: body.partnerDay,
        hour: body.partnerHour ?? body.hour ?? 12,
        minute: body.partnerMinute ?? body.minute ?? 0,
        lat: body.partnerLat ?? body.lat,
        lon: body.partnerLon ?? body.lon,
      });
      partnerInput.houseSystem = input.houseSystem;
      partnerInput.zodiacType = input.zodiacType;
      partnerInput.includeMinorAspects = input.includeMinorAspects;

      const partnerRaw = await getSwissWesternChart(request, env, partnerInput);
      partnerChart = buildWesternPremiumChart(partnerRaw, partnerInput, {
        houseSystem: partnerInput.houseSystem,
        zodiacType: partnerInput.zodiacType,
        includeMinorAspects: partnerInput.includeMinorAspects,
      });
      synastry = buildSynastry(chart, partnerChart);
      composite = buildCompositeChart(chart, partnerChart, input.houseSystem);
    }
  }

  let timingData = null;
  if (chapter === 12 || chapter === 13) {
    try {
      timingData = await buildAstroTimingData(request, env, input, chart);
    } catch (_) {
      timingData = null;
    }
  }

  const meta = ASTRO_CHAPTER_META[chapter - 1];
  const generated = await generateAstroPremiumChapter(
    env,
    body,
    input,
    chapter,
    meta,
    chart,
    reportType,
    partnerChart,
    synastry,
    composite,
    timingData,
  );

  const responsePayload = {
    reportId,
    reportType,
    chapter,
    totalChapters: ASTRO_TOTAL_CHAPTERS,
    chapterMeta: meta,
    chart,
    partnerChart,
    synastry,
    composite,
    timingData,
    generatedAt: new Date().toISOString(),
    quality: {
      minChars: ASTRO_MIN_CHARS,
      actualChars: generated.text.length,
      usedFallback: generated.usedFallback,
      warnings: generated.warnings || [],
    },
    ...generated,
  };

  writeAstroCache(cacheKey, responsePayload);
  return json({ ok: true, ...responsePayload });
}

async function handleVedicLife(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, VEDIC_TOTAL_CHAPTERS);
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  let reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";

  input.birthPlace = String(body.birthPlace || body.place || body.location || "");
  input.calendarType = String(body.calendarType || "solar");
  input.isLeapMonth = body.isLeapMonth ?? false;
  input.ayanamsa = String(body.ayanamsa || "lahiri");

  const chart = await getSwissVedicChart(request, env, input);
  let partnerChart = null;
  let ashtaKoota = chart.ashtaKoota || null;

  if (reportType === "compatibility") {
    const hasPartnerBirth = Number.isFinite(Number(body.partnerYear))
      && Number.isFinite(Number(body.partnerMonth))
      && Number.isFinite(Number(body.partnerDay));

    if (!hasPartnerBirth) {
      reportType = "personal";
    } else {
      const partnerInput = normalizeBody({
        ...body,
        year: body.partnerYear,
        month: body.partnerMonth,
        day: body.partnerDay,
        hour: body.partnerHour ?? body.hour ?? 12,
        minute: body.partnerMinute ?? body.minute ?? 0,
        lat: body.partnerLat ?? body.lat,
        lon: body.partnerLon ?? body.lon,
      });

      partnerInput.birthPlace = String(body.partnerBirthPlace || body.birthPlace || body.place || "");
      partnerInput.calendarType = String(body.partnerCalendarType || body.calendarType || "solar");
      partnerInput.isLeapMonth = body.partnerIsLeapMonth ?? false;
      partnerInput.ayanamsa = String(body.ayanamsa || "lahiri");

      partnerChart = await getSwissVedicChart(request, env, partnerInput);
      ashtaKoota = computeAshtaKoota(chart, partnerChart);
      if (ashtaKoota) {
        chart.ashtaKoota = ashtaKoota;
      }
    }
  }

  const meta = VEDIC_CHAPTER_META[chapter - 1];
  const generated = await generateVedicPremiumChapter(
    env,
    body,
    input,
    chapter,
    meta,
    chart,
    reportType,
    partnerChart,
    ashtaKoota,
  );

  const reportId = `vedic_${Date.now().toString(36)}_${stableHash([
    reportType,
    chapter,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.lat,
    input.lon,
    body.name,
    body.partnerName,
  ].join("|"))}`;

  return json({
    ok: true,
    reportId,
    reportType,
    chapter,
    totalChapters: VEDIC_TOTAL_CHAPTERS,
    chapterMeta: meta,
    chart,
    partnerChart,
    ashtaKoota,
    generatedAt: new Date().toISOString(),
    quality: {
      minChars: VEDIC_MIN_CHARS,
      actualChars: generated.text.length,
      usedFallback: generated.usedFallback,
      warnings: generated.warnings || [],
    },
    ...generated,
  });
}

const LIFEBOOK_CHAPTERS = [
  "사주 원국 완전 해설",
  "나의 설계도",
  "숨겨진 무기",
  "대운 정밀 분석",
  "재물과 직업의 방향",
  "관계와 가족의 패턴",
  "건강과 에너지 관리",
  "연애와 결혼의 흐름",
  "위기와 전환점",
  "나를 지키는 습관",
  "올해의 실전 전략",
  "장기 로드맵",
  "인생의 책 마스터 플랜",
];

const LIFEBOOK_CHAPTER_SUBTITLES = [
  "팔자 8글자와 사주 원국의 구조를 정밀 해독",
  "월지·일간·조후로 읽는 타고난 삶의 설계도",
  "용신·희신·기신으로 찾는 핵심 강점과 천직 방향",
  "대운 흐름과 전환 구간을 읽는 시계열 전략",
  "재물 그릇과 커리어 확장 포인트의 현실적 설계",
  "가족·동료·파트너 관계에서 반복되는 패턴 분석",
  "오행 균형 기반 건강·회복·에너지 관리 지침",
  "연애·결혼의 궁합 구조와 관계 유지 전략",
  "위기 신호·손실 구간·반전 구간의 대응 시나리오",
  "삶을 지키는 루틴과 의사결정 습관 재설계",
  "당해년 실행력 극대화를 위한 월별 행동 전략",
  "중장기 성장 경로와 인생 포트폴리오 설계",
  "전체 흐름 통합과 최종 마스터 플랜 제언",
];

const LIFEBOOK_COUNSELOR_FOCUS = [
  "원국의 기본축(년·월·일·시)을 분리 해석한 뒤 실제 성격·의사결정 습관과 연결합니다.",
  "월지·일간·조후의 균형을 통해 환경 적응 방식과 성장 최적 환경을 구체화합니다.",
  "용신/희신/기신을 행동 선택 기준으로 번역해 직업·학습·관계 전략으로 제시합니다.",
  "대운의 상승·정체·전환 시점을 구분해 타이밍 기반 실행안을 설계합니다.",
  "재성·식상·관성 흐름을 돈 버는 방식과 커리어 구조로 연결해 현실안을 제시합니다.",
  "합충·거리두기·경계선 설정 관점에서 관계 피로를 줄이는 실전 규칙을 제공합니다.",
  "오행 불균형이 만드는 신체/정서 소진 패턴을 회복 루틴과 함께 제시합니다.",
  "연애·결혼 의사결정에서 감정과 현실 조건을 함께 점검하는 프레임을 제안합니다.",
  "위기 발생 전 징후를 분류하고 손실 최소화 행동 순서를 단계별로 제시합니다.",
  "장기적으로 나를 지키는 핵심 습관을 설계하고 재발 방지 장치를 제공합니다.",
  "연간 흐름을 월 단위 행동계획으로 쪼개 실전 선택 기준으로 정리합니다.",
  "생애 포트폴리오(일·돈·관계·건강)를 균형 있게 재배치하는 전략을 제시합니다.",
  "전 챕터 해석을 통합해 향후 1년/3년/10년 실행 로드맵으로 마무리합니다.",
];

const LIFEBOOK_SECTION_HEADERS = [
  ["원국 핵심 구조 해석", "기질과 반응의 반복 패턴", "관계·일·돈 적용 포인트", "리스크와 그림자 관리", "7일 실행 루틴"],
  ["설계도 핵심 진단", "환경 적응 반복 패턴", "성장 환경 선택 포인트", "과부하 리스크 관리", "2주 실행 루틴"],
  ["강점 자산 핵심 진단", "성공/실패 반복 패턴", "천직 선택 포인트", "기신 과열 리스크", "실전 강화 루틴"],
  ["대운 흐름 핵심 진단", "상승/정체 반복 패턴", "타이밍 선택 포인트", "전환기 리스크", "월별 실행 루틴"],
  ["재물·커리어 핵심 진단", "수익/소진 반복 패턴", "직업 확장 선택 포인트", "손실 리스크 관리", "현실 실행 루틴"],
  ["관계 구조 핵심 진단", "갈등/회복 반복 패턴", "소통·경계 선택 포인트", "관계 소진 리스크", "관계 회복 루틴"],
  ["건강 에너지 핵심 진단", "소진/회복 반복 패턴", "생활관리 선택 포인트", "건강 리스크 관리", "회복 실행 루틴"],
  ["연애·결혼 핵심 진단", "관계 지속 반복 패턴", "정착 선택 포인트", "관계 파열 리스크", "친밀도 실행 루틴"],
  ["위기 전환 핵심 진단", "위기 재발 반복 패턴", "대응 선택 포인트", "손실 확대 리스크", "위기 대응 루틴"],
  ["습관 시스템 핵심 진단", "재발 반복 패턴", "행동 전환 선택 포인트", "의지 고갈 리스크", "습관 고정 루틴"],
  ["연간 전략 핵심 진단", "월별 파동 반복 패턴", "Go/Stop 선택 포인트", "조급함 리스크", "연간 실행 루틴"],
  ["장기 경로 핵심 진단", "성장/정체 반복 패턴", "중장기 선택 포인트", "방향 상실 리스크", "장기 실행 루틴"],
  ["통합 마스터 진단", "핵심 패턴 총정리", "최종 선택 포인트", "재발 리스크 관리", "1년·3년·10년 실행 루틴"],
];

const LIFEBOOK_MIN_CHARS = 6000;

const LOVE_SECRET_CHAPTERS = [
  "🔑 본연의 연애 자아: 나도 몰랐던 사랑의 본능",
  "💘 치명적 매력과 페로몬: 이성을 끌어당기는 나의 무기",
  "💑 두 사람의 사주 궁합: 우리는 운명인가",
  "⚔️ 밀당 전략서: 상대방 심리를 꿰뚫는 작전 지도",
  "📅 시기별 연애 운의 흐름: 운명이 허락하는 그날",
  "🌑 연애 리스크: 충돌 지점과 금기 지도",
  "🔥 육체적 궁합: 두 사람의 감각 에너지 호환성",
  "📲 현대적 상황별 비책: 디지털 시대의 연애 전략",
  "💍 결혼 시기: 언제, 누구와 정착할 것인가",
  "🌿 개운 처방전: 두 사람의 사랑을 부르는 비책",
  "🌊 속궁합 완전 해석: 조후와 십성으로 본 깊은 궁합의 비밀",
];

const LOVE_SECRET_CHAPTER_SUBTITLES = [
  "감정 반응과 애착 리듬을 읽는 연애 기초 해석",
  "매력 발산 포인트와 관계 유입 신호 분석",
  "오행/일주 합충으로 보는 궁합의 실제 체감",
  "상대 심리 단계별 접근 전략과 금기어 정리",
  "연애 운 상승/정체/변곡 시점별 의사결정 가이드",
  "반복 충돌 패턴과 경계선 설정 플랜",
  "감각 궁합과 친밀도 에너지 온도차 해석",
  "연락/메신저/소개팅 플랫폼 실전 운영법",
  "결혼 적기와 정착 파트너 조건 매칭",
  "기운 보완 루틴과 관계 회복 실천 루틴",
  "조후·십성·심층 궁합을 종합한 최종 판정",
];

const LOVE_SECRET_COUNSELOR_FOCUS = [
  "일간·일지·애착 반응을 연결해 감정 기동 패턴을 진단하고, 자기 파괴적 연애 트리거를 명확히 짚습니다.",
  "도화/홍염/관성·식상 균형을 바탕으로 매력 발현 포인트와 첫인상 설계 전략을 제시합니다.",
  "두 사람의 일주·합충·오행 보완 구조를 비교해 실제 관계 지속력과 체감 궁합을 판단합니다.",
  "상대의 반응 리듬을 십성 관점으로 해석해 접근-거리두기-회복의 대화 시퀀스를 설계합니다.",
  "대운·세운의 변곡점을 근거로 고백/관계전환/정리 타이밍을 월 단위로 제안합니다.",
  "충돌 원인(감정, 언어, 경계선)을 분리 진단하고 악화 시그널과 차단 규칙을 구체화합니다.",
  "친밀도와 감각 궁합의 온도차를 해석하고 신뢰를 해치지 않는 친밀도 합의 프레임을 제안합니다.",
  "메신저/DM/소개팅앱 상황별로 오해를 줄이는 문장 구조와 응답 템포 전략을 제공합니다.",
  "결혼 적기, 동거/재정/가치관 정착 조건을 사주 리스크와 함께 현실적으로 매칭합니다.",
  "개운 루틴(수면, 공간, 관계 습관)을 통해 감정 소진을 줄이고 관계 회복 확률을 높이는 처방을 제시합니다.",
  "조후·십성·오행 상생/상극을 통합해 속궁합과 장기 친밀 지속 가능성을 최종 판정합니다.",
];

const DEFAULT_BOOK_SECTION_HEADERS = [
  "핵심 해석",
  "반복되는 패턴",
  "관계와 선택의 포인트",
  "조심해야 할 그림자",
  "실전 행동 가이드",
];

const LOVE_SECRET_SECTION_HEADERS = [
  ["연애 본능 핵심 해석", "감정 트리거의 반복 패턴", "관계 시작의 선택 포인트", "집착/회피의 그림자", "7일 자기조율 행동 가이드"],
  ["치명적 매력의 구조 해석", "호감 유입의 반복 패턴", "매력 발산 타이밍 포인트", "과잉 어필의 그림자", "매력 강화 실전 루틴"],
  ["두 사람 궁합 핵심 해석", "합/충의 반복 패턴", "관계 유지 선택 포인트", "궁합 약점의 그림자", "관계 안정 행동 가이드"],
  ["상대 심리 핵심 해석", "밀당 실패의 반복 패턴", "대화/거리 조절 포인트", "심리전 과몰입의 그림자", "상황별 밀당 행동 가이드"],
  ["연애 타이밍 핵심 해석", "운의 파동 반복 패턴", "고백/관계전환 포인트", "조급함의 그림자", "월별 실행 행동 가이드"],
  ["리스크 핵심 해석", "충돌 재발 반복 패턴", "갈등 중재 선택 포인트", "파국 신호의 그림자", "리스크 차단 행동 가이드"],
  ["감각 궁합 핵심 해석", "친밀도 온도차 반복 패턴", "속도/강도 조율 포인트", "신뢰 훼손의 그림자", "친밀 회복 행동 가이드"],
  ["디지털 연애 핵심 해석", "연락 텐션 반복 패턴", "채널별 운영 포인트", "오해 증폭의 그림자", "메신저 실전 행동 가이드"],
  ["정착 가능성 핵심 해석", "결혼 변수 반복 패턴", "정착 의사결정 포인트", "현실 조건의 그림자", "결혼 준비 행동 가이드"],
  ["개운 전략 핵심 해석", "운 보정 반복 패턴", "관계 회복 선택 포인트", "소진의 그림자", "개운 실천 행동 가이드"],
  ["속궁합 심층 핵심 해석", "조후/십성 반복 패턴", "심층 친밀 선택 포인트", "불균형의 그림자", "장기 궁합 행동 가이드"],
];

function stringifyCompact(value, maxLength = 4200) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, maxLength);
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function buildSessionInput(body, maxChapter) {
  const input = normalizeBody(body);
  input.chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, maxChapter);
  return input;
}

function buildSessionPrompt(kind, title, chapter, totalChapters, body, sectionHeaders, options = {}) {
  const sajuData = stringifyCompact(body.sajuData || body.profile || body.birth || body, 5200);
  const partnerData = stringifyCompact(body.partnerData || body.partner || "", 2600);
  const relationshipGuide = partnerData
    ? "\n[Partner / compatibility data]\n" + partnerData
    : "";
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const minTotalChars = clampInt(options.minTotalChars, 1100, 900, 12000);
  const minSectionParagraphs = clampInt(options.minSectionParagraphs, 2, 2, 6);
  const minSectionChars = clampInt(options.minSectionChars, 180, 120, 2400);
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;

  return [
    `You are Code Destiny's premium ${kind} writer.`,
    "Your role: elite relationship counselor + advanced saju analyst.",
    "Return ONLY natural Korean markdown. Do not use English headings.",
    "Use the provided saju/birth-analysis data as the source of truth.",
    "Write a premium PDF chapter with concrete interpretation, choices, cautions, and a practical action plan.",
    "Avoid generic fortune-telling filler. Make the answer specific to the supplied data.",
    "Do NOT describe other chapters. Keep all interpretation tightly aligned to this chapter title and subtitle.",
    "Keep a professional, warm counseling tone without fear marketing or deterministic verdicts.",
    "",
    `[Chapter ${chapter}/${totalChapters}] ${chapterLabel}`,
    counselorFocus ? `[Counselor Focus]\n${counselorFocus}` : "",
    "",
    "[Saju / analysis data]",
    sajuData || "No structured saju data was supplied; infer cautiously from the request body.",
    relationshipGuide,
    "",
    "Required markdown structure:",
    `## ${chapterLabel} 핵심 진단`,
    ...headers.map((h) => `## ${h}`),
    "",
    "Quality constraints:",
    "- Include at least one concrete behavioral example in each section.",
    "- Use saju terms only when tied to a plain-language implication.",
    "- End each section with one actionable sentence.",
    `- Each section must have at least ${minSectionParagraphs} substantial paragraphs and at least ${minSectionChars} Korean characters.`,
    `- Total length must be at least ${minTotalChars} Korean characters.`,
  ].join("\n");
}

async function refineChapterToMinLength(env, text, minChars, options = {}, modelEnvKeys = []) {
  let draft = String(text || "").trim();
  if (!draft) return draft;
  if (draft.length >= minChars) return draft;

  const title = String(options.title || "").trim();
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const sectionHeaders = Array.isArray(options.sectionHeaders) ? options.sectionHeaders : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(options.data || "", 1400);

  for (let attempt = 0; attempt < 2 && draft.length < minChars; attempt += 1) {
    const prompt = [
      "아래 원고를 같은 사실관계와 톤을 유지하면서 고품질로 확장하세요.",
      `목표 길이: 최소 ${minChars}자`,
      "응답은 한국어 마크다운만 사용하세요.",
      "섹션 헤더를 유지하고, 각 섹션은 최소 3문단으로 확장하세요.",
      "추상적 문장 대신 상황·행동·의사결정 기준을 구체적으로 쓰세요.",
      "기존 내용의 핵심 진단은 지우지 말고 심화 설명을 추가하세요.",
      "공포 유도 문구나 단정적 예언은 금지합니다.",
      "",
      `[챕터] ${chapterLabel}`,
      counselorFocus ? `[상담 포커스]\n${counselorFocus}` : "",
      `[필수 섹션]\n${sectionHeaders.map((h) => `- ${h}`).join("\n")}`,
      dataHint ? `[데이터 힌트]\n${dataHint}` : "",
      "",
      "[기존 원고]",
      draft,
    ].filter(Boolean).join("\n");

    const expanded = await callGemini(env, prompt, modelEnvKeys);
    if (expanded && expanded.trim().length > draft.length) {
      draft = expanded.trim();
    } else {
      break;
    }
  }

  return draft;
}

function lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, minChars = LIFEBOOK_MIN_CHARS) {
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(body.sajuData || body.profile || body.birth || body, 1800).replace(/\s+/g, " ").trim();
  const focus = String(counselorFocus || "").trim() || "사주 구조를 실제 행동 기준으로 번역해 실천 가능한 전략을 제시합니다.";

  const sectionBodies = [
    `${chapterLabel}에서 먼저 확인할 것은 타고난 성향 자체보다 성향이 의사결정으로 변환되는 방식입니다. 같은 사실을 보아도 어떤 사람은 관계를 우선하고, 어떤 사람은 성취를 우선하며, 또 어떤 사람은 안전을 먼저 계산합니다. 이 차이가 장기적으로 삶의 궤적을 가릅니다.\n\n현재 입력된 데이터 단서${dataHint ? `(${dataHint.slice(0, 280)})` : ""}를 기준으로 보면, 강점은 특정 상황에서 빠르게 발화되지만 피로가 쌓일 때는 판단 편향이 같이 커지는 구조입니다. 따라서 이 챕터의 목표는 장점 확대가 아니라 '지속 가능한 장점 운용법'을 만드는 것입니다.\n\n실행 문장: 오늘부터 중요한 결정을 내릴 때 감정·현실·장기효과를 각각 한 줄로 분리해 기록하세요.`,
    `반복 패턴은 사건이 아니라 반응에서 드러납니다. 비슷한 갈등이 되풀이되는 이유는 상대가 같아서가 아니라 내가 사용하는 해석 프레임이 늘 비슷하기 때문입니다. 특히 압박이 커질수록 익숙한 반응으로 돌아가는 경향이 강해집니다.\n\n패턴을 바꾸려면 의지를 키우기보다 트리거를 먼저 식별해야 합니다. 언제 피로가 커지고, 어떤 말에 방어가 올라오며, 어떤 상황에서 과한 확신 또는 과한 회피가 나타나는지 추적하면 변화 속도가 빨라집니다.\n\n실행 문장: 이번 주에는 감정이 크게 흔들린 장면 3개를 기록하고, 공통 트리거 1개를 찾아 이름 붙이세요.`,
    `관계·일·돈은 분리된 주제가 아니라 같은 선택 체계의 다른 표면입니다. 관계에서 경계를 못 세우면 일에서도 우선순위가 무너지고, 돈에서도 손실 회피보다 즉흥 대응이 늘어납니다. 반대로 한 영역의 선택 기준을 정리하면 다른 영역도 안정됩니다.\n\n${focus} 이 관점에서 보면 당장 필요한 것은 더 많은 정보가 아니라 선택 기준의 단순화입니다. 기준이 많을수록 불안은 줄지 않고, 실행은 늦어집니다. 그래서 이 챕터는 '지금 버릴 기준'과 '반드시 지킬 기준'을 구분하는 방식으로 설계됩니다.\n\n실행 문장: 이번 달 핵심 선택 기준을 2개만 남기고 나머지는 보류 리스트로 이동하세요.`,
    `리스크는 운이 나빠서 생기기보다 누적된 미세 오차가 임계점을 넘을 때 발생합니다. 특히 과로, 과속 의사결정, 관계 과잉 책임, 수면 붕괴는 함께 나타나는 경우가 많습니다. 이런 구간에서는 큰 기회를 잡는 전략보다 손실 상한을 먼저 정하는 전략이 유효합니다.\n\n그림자 관리의 핵심은 자기비판이 아니라 복구 시스템입니다. 실수 이후 회복 시간을 줄이는 사람은 같은 실수를 하더라도 결과가 달라집니다. 회복 규칙이 없으면 같은 패턴이 더 큰 비용으로 재발합니다.\n\n실행 문장: 위기 상황에서 즉시 실행할 3단계(중단-정리-재개) 체크리스트를 메모 앱 첫 화면에 고정하세요.`,
    `실행 가이드는 거창할수록 실패합니다. 하루 10분, 주 2회, 월 1회처럼 작고 반복 가능한 단위가 장기적으로 더 강력합니다. 중요한 것은 완벽한 계획이 아니라 관성의 방향을 바꾸는 것입니다.\n\n첫 7일은 관찰, 다음 7일은 조정, 다음 7일은 고정, 마지막 7일은 확장으로 운영하면 부담이 낮고 체감 변화가 빠릅니다. 이 리듬을 통해 관계·일·건강·재정의 균형점이 조금씩 올라갑니다.\n\n실행 문장: 오늘부터 28일간 주간 점검(관계/일/돈/건강 각 10점)을 매주 같은 시간에 기록하세요.`,
  ];

  let text = `## ${chapterLabel} 핵심 진단\n${sectionBodies[0]}\n\n## ${headers[0]}\n${sectionBodies[1]}\n\n## ${headers[1]}\n${sectionBodies[2]}\n\n## ${headers[2]}\n${sectionBodies[3]}\n\n## ${headers[3]}\n${sectionBodies[4]}\n\n## ${headers[4]}\n${sectionBodies.join("\n\n")}`;

  let depth = 1;
  while (text.length < minChars) {
    text += `\n\n## 심화 실행 노트 ${depth}\n`;
    text += `이 심화 노트의 목적은 해석을 실전 결정으로 연결하는 것입니다. ${chapterLabel}의 관점에서는 감정 반응, 시간 관리, 관계 경계, 재정 판단을 따로 보지 않고 하나의 시스템으로 통합합니다.\n\n`;
    text += `점검 질문: 지금 내 선택이 3개월 뒤에도 유효한가? 대안이 존재하는데도 익숙함 때문에 같은 결정을 반복하고 있지 않은가? 이 질문을 주 1회 반복하면 의사결정 품질이 눈에 띄게 개선됩니다.\n\n`;
    text += `실행 문장: 이번 주에는 가장 비용이 큰 습관 1개를 멈추고, 대체 행동 1개를 같은 시간대에 고정하세요.`;
    depth += 1;
  }

  return text;
}

function bookFallback(kind, title, body, sectionHeaders) {
  const source = stringifyCompact(body.sajuData || body.partnerData || body, 900).replace(/\s+/g, " ").trim();
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const base = [
    `## ${headers[0]}\n${title} 챕터는 현재 입력된 사주 데이터와 선택 흐름을 바탕으로 ${kind}의 중심 패턴을 정리합니다. ${source ? `참고 데이터의 핵심 단서는 "${source.slice(0, 180)}" 구간에 모여 있습니다.` : "현재 데이터가 제한적이므로 기본 사주 흐름을 보수적으로 해석합니다."} 이 결과는 단정이 아니라 선택을 더 선명하게 보기 위한 지도입니다.`,
    `## ${headers[1]}\n반복되는 흐름은 감정, 관계, 일의 방식이 서로 영향을 주고받는 지점에서 드러납니다. 같은 문제가 이름만 바뀌어 다시 나타난다면 운이 나빠서가 아니라 아직 정리되지 않은 선택 기준이 있다는 뜻입니다.`,
    `## ${headers[2]}\n가장 중요한 기준은 지금 당장 강한 감정이 아니라 장기적으로 나를 안정시키는 방향입니다. 관계에서는 말의 양보다 일관성, 직업과 돈에서는 속도보다 지속 가능성을 우선해서 판단하는 것이 좋습니다.`,
    `## ${headers[3]}\n강점이 강하게 드러날수록 조급함, 과잉 책임감, 회피, 완벽주의 같은 그림자도 함께 커질 수 있습니다. 이 그림자를 억누르기보다 미리 알아차리고 작은 규칙으로 관리하는 것이 안전합니다.`,
    `## ${headers[4]}\n앞으로 7일 동안은 하나의 큰 결정보다 작은 검증을 먼저 하세요. 매일 감정 점수와 실제 행동 하나를 기록하고, 반복해서 에너지를 빼앗는 선택은 줄이며, 회복감을 주는 루틴은 일정에 고정하는 방식이 좋습니다.`,
  ].join("\n\n");
  return base.length >= 900 ? base : `${base}\n\n${base}`;
}

async function handleLifebookSession(request, env) {
  const body = await readJson(request);
  const input = buildSessionInput(body, 13);
  const chapter = input.chapter;
  const title = LIFEBOOK_CHAPTERS[chapter - 1] || LIFEBOOK_CHAPTERS[0];
  const subtitle = LIFEBOOK_CHAPTER_SUBTITLES[chapter - 1] || "사주 분석 기반 인생의 책";
  const counselorFocus = LIFEBOOK_COUNSELOR_FOCUS[chapter - 1] || "사주 구조를 실제 행동 기준으로 번역해 실행 전략으로 제시합니다.";
  const sectionHeaders = LIFEBOOK_SECTION_HEADERS[chapter - 1] || DEFAULT_BOOK_SECTION_HEADERS;
  const prompt = buildSessionPrompt(
    "saju life book",
    title,
    chapter,
    13,
    body,
    sectionHeaders,
    {
      subtitle,
      counselorFocus,
      minTotalChars: LIFEBOOK_MIN_CHARS,
      minSectionParagraphs: 3,
      minSectionChars: 850,
    }
  );
  let text = await callGemini(env, prompt, ["LIFEBOOK_GEMINI_MODEL"]);
  let usedFallback = false;
  if (!text || text.length < 1200) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    const refined = await refineChapterToMinLength(
      env,
      text,
      LIFEBOOK_MIN_CHARS,
      {
        title,
        subtitle,
        counselorFocus,
        sectionHeaders,
        data: body.sajuData || body.profile || body.birth || body,
      },
      ["LIFEBOOK_GEMINI_MODEL"]
    );
    if (refined && refined.length > text.length) {
      text = refined;
    }
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  return json({
    ok: true,
    sessionId: chapter,
    chapter,
    chapterMeta: { num: chapter, title, subtitle, icon: "book" },
    text,
    sections: parseSections(text),
    usedFallback,
  });
}

async function handleLoveSecretSession(request, env) {
  const body = await readJson(request);
  const input = buildSessionInput(body, 11);
  const chapter = input.chapter;
  const totalChapters = clampInt(body.totalChapters, 11, 10, 11);
  const title = LOVE_SECRET_CHAPTERS[chapter - 1] || LOVE_SECRET_CHAPTERS[0];
  const subtitle = LOVE_SECRET_CHAPTER_SUBTITLES[chapter - 1] || "사주 궁합 기반 연애 비책";
  const counselorFocus = LOVE_SECRET_COUNSELOR_FOCUS[chapter - 1] || "사주 기반 연애 패턴 분석과 실전 상담 가이드를 균형 있게 제시합니다.";
  const sectionHeaders = LOVE_SECRET_SECTION_HEADERS[chapter - 1] || DEFAULT_BOOK_SECTION_HEADERS;
  const prompt = buildSessionPrompt(
    "love secret relationship guide",
    title,
    chapter,
    totalChapters,
    body,
    sectionHeaders,
    { subtitle, counselorFocus }
  );
  let text = await callGemini(env, prompt, ["LOVE_SECRET_GEMINI_MODEL"]);
  let usedFallback = false;
  if (!text || text.length < 500) {
    usedFallback = true;
    text = bookFallback("연애 비책", title, body, sectionHeaders);
  }

  return json({
    ok: true,
    sessionId: chapter,
    chapter,
    chapterMeta: {
      num: chapter,
      title,
      subtitle,
      icon: "heart"
    },
    text,
    sections: parseSections(text),
    usedFallback,
  });
}

async function handleZiweiBookSession(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  const chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, 13);
  const meta = ZIWEI_CHAPTER_META[chapter - 1] || {
    num: chapter,
    title: `자미두수 Chapter ${chapter}`,
    subtitle: "자미두수 프리미엄 인생 총람",
    icon: "ziwei"
  };
  const structured = body.ziweiStructured?.palaceStarData;
  const summary = Array.isArray(structured)
    ? structured.slice(0, 12).map((p) => {
      const palace = p?.palace || "미상궁";
      const stars = Array.isArray(p?.stars) ? p.stars.map((s) => s?.name || "").filter(Boolean).join(",") : "";
      const aux = Array.isArray(p?.auxStars) ? p.auxStars.map((s) => s?.name || "").filter(Boolean).join(",") : "";
      const bad = Array.isArray(p?.badStars) ? p.badStars.map((s) => s?.name || "").filter(Boolean).join(",") : "";
      return `${palace}: 주성(${stars || "정보없음"}) 보조(${aux || "정보없음"}) 살성(${bad || "정보없음"})`;
    }).join(" / ")
    : String(body.ziweiData || "").slice(0, 2200);
  const generated = await generateZiweiPremiumChapter(
    env,
    body,
    input,
    chapter,
    meta,
    summary || "명반 데이터가 부족해 일반론으로 보완한다",
    Array.isArray(structured) ? structured : [],
  );
  return json({ ok: true, chapter, chapterMeta: meta, ...generated });
}

export async function handlePremiumRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/premium");
    if (path === "/sukuyo-life") return await handleSukuyoLife(request, env);
    if (path === "/astro-western") return await handleAstroWestern(request, env);
    if (path === "/astro-life") return await handleAstroLife(request, env);
    if (path === "/vedic-life") return await handleVedicLife(request, env);
    if (path === "/ziwei-life") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleLifebookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/lifebook");
    if (path === "/session") return await handleLifebookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleLoveSecretRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/love-secret");
    if (path === "/session") return await handleLoveSecretSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleZiweiBookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (path === "/session") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
