import {
  VEDIC_PREMIUM_CHAPTERS,
  VEDIC_SOLO_TARGET_CHARS,
  sanitizeVedicPremiumText,
} from "./vedic-premium-chapters.js";
import { callGeminiText } from "./gemini.js";

const MIN_SECTION_CHARS = 900;
const MIN_CHAPTER_CHARS = 4000;
const MIN_TOTAL_CHARS = Math.max(Number(VEDIC_SOLO_TARGET_CHARS || 0), 40000);
const FORBIDDEN_TEXT_RE = /\b(?:fallback|safe-local|seed|skeleton|payload|json|debug|local|localdraft|engine|validation|retry|llm|api|wasm|swiss\s*wasm|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|preflightfailed|chart\s*seed\s*failed)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|로컬\s*기반|계산\s*시그니처|데이터\s*정규화|품질\s*검증|재생성|내부\s*데이터|템플릿/gi;
const VEDIC_LLM_KEY_ENV_KEYS = Object.freeze([
  "VEDIC_PREMIUM_GEMINI_API_KEY1",
  "VEDIC_PREMIUM_GEMINI_API_KEY2",
  "VEDIC_PREMIUM_GEMINI_API_KEY3",
  "VEDIC_PREMIUM_GEMINI_API_KEY4",
  "VEDIC_PREMIUM_GEMINI_API_KEY5",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
]);
const VEDIC_LLM_MODEL_ENV_KEYS = Object.freeze(["VEDIC_PREMIUM_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"]);
const VEDIC_LLM_REQUIRED_SIGNAL_HINTS = Object.freeze({
  vedic_soul_map: ["라그나", "문", "달", "태양", "아트마카라카", "나크샤트라"],
  vedic_lagna: ["라그나", "1하우스", "1바바", "라그나 로드"],
  vedic_moon_nakshatra: ["문", "달", "나크샤트라", "파다", "나크샤트라 로드"],
  vedic_sun_self: ["태양", "자아", "권위", "책임"],
  vedic_planet_talents: ["수성", "금성", "화성", "목성", "토성"],
  vedic_bhavas: ["1하우스", "2하우스", "4하우스", "7하우스", "10하우스"],
  vedic_career_success: ["10하우스", "토성", "태양", "목성", "아마티아카라카", "다샤"],
  vedic_money_flow: ["2하우스", "11하우스", "금성", "목성", "다나"],
  vedic_love_partnership: ["7하우스", "금성", "화성", "다라카라카"],
  vedic_dasha_flow: ["다샤", "마하", "안타르", "현재", "다음"],
  vedic_karma_growth: ["라후", "케투", "8하우스", "9하우스", "12하우스"],
  vedic_master_plan: ["라그나", "문", "다샤", "라후", "케투", "아트마카라카"],
});
const VEDIC_LLM_REQUIRED_SIGNAL_IDS_BY_SECTION = Object.freeze({
  soul_1: ["core.lagna.sign", "core.moon.sign", "core.sun.sign", "karaka.atmakaraka"],
  soul_2: ["core.lagna.sign", "core.lagna.lord", "house.1.sign"],
  soul_3: ["core.moon.sign", "core.moon.nakshatra.name", "planet.Moon.house"],
  soul_4: ["planet.Sun.house", "planet.Moon.house", "dasha.current.maha"],
  soul_5: ["karaka.atmakaraka", "core.moon.nakshatra.lord", "dasha.current.maha"],
  lagna_1: ["core.lagna.sign", "core.lagna.lord", "house.1.sign"],
  lagna_2: ["core.lagna.sign", "house.1.lord", "planet.Moon.sign"],
  lagna_3: ["core.lagna.lord", "house.1.sign", "planet.Mars.sign"],
  lagna_4: ["core.lagna.sign", "planet.Moon.sign", "planet.Saturn.sign"],
  lagna_5: ["core.lagna.sign", "core.lagna.lord", "dasha.current.maha"],
  moon_1: ["core.moon.sign", "planet.Moon.house", "core.moon.nakshatra.name"],
  moon_2: ["core.moon.nakshatra.name", "core.moon.nakshatra.pada", "core.moon.nakshatra.lord"],
  moon_3: ["core.moon.sign", "planet.Moon.house", "planet.Saturn.sign"],
  moon_4: ["core.moon.sign", "core.moon.nakshatra.name", "planet.Venus.sign"],
  moon_5: ["core.moon.sign", "core.moon.nakshatra.lord", "dasha.current.maha"],
  sun_1: ["core.sun.sign", "planet.Sun.house", "planet.Sun.dignity"],
  sun_2: ["core.sun.sign", "planet.Sun.house", "house.10.sign"],
  sun_3: ["planet.Sun.house", "planet.Saturn.sign", "house.10.lord"],
  sun_4: ["core.sun.sign", "planet.Sun.dignity", "planet.Moon.sign"],
  sun_5: ["core.sun.sign", "planet.Sun.house", "dasha.current.maha"],
  planet_1: ["planet.Mercury.sign", "planet.Mercury.house", "planet.Mercury.dignity"],
  planet_2: ["planet.Venus.sign", "planet.Venus.house", "planet.Venus.dignity"],
  planet_3: ["planet.Mars.sign", "planet.Mars.house", "planet.Mars.dignity"],
  planet_4: ["planet.Jupiter.sign", "planet.Jupiter.house", "planet.Jupiter.dignity"],
  planet_5: ["planet.Saturn.sign", "planet.Saturn.house", "planet.Saturn.dignity"],
  bhava_1: ["house.1.sign", "house.1.lord", "house.1.planets"],
  bhava_2: ["house.2.sign", "house.2.lord", "house.2.planets"],
  bhava_3: ["house.4.sign", "house.4.lord", "house.4.planets"],
  bhava_4: ["house.7.sign", "house.7.lord", "house.7.planets"],
  bhava_5: ["house.10.sign", "house.10.lord", "house.10.planets"],
  career_1: ["house.10.sign", "house.10.lord", "dasha.current.maha"],
  career_2: ["house.10.sign", "planet.Sun.house", "planet.Saturn.house"],
  career_3: ["karaka.amatyakaraka", "planet.Saturn.sign", "planet.Jupiter.sign"],
  career_4: ["house.10.lord", "planet.Saturn.dignity", "planet.Mars.sign"],
  career_5: ["house.10.sign", "karaka.amatyakaraka", "dasha.current.maha"],
  money_1: ["house.2.sign", "house.11.sign", "planet.Jupiter.sign"],
  money_2: ["house.2.lord", "planet.Venus.sign", "planet.Saturn.sign"],
  money_3: ["house.2.sign", "house.11.sign", "planet.Saturn.house"],
  money_4: ["planet.Jupiter.sign", "planet.Venus.sign", "dasha.current.maha"],
  money_5: ["house.2.lord", "house.11.lord", "planet.Saturn.sign"],
  love_1: ["house.7.sign", "planet.Venus.sign", "planet.Mars.sign"],
  love_2: ["house.7.lord", "planet.Venus.house", "karaka.darakaraka"],
  love_3: ["house.7.sign", "planet.Mars.sign", "planet.Saturn.sign"],
  love_4: ["house.7.sign", "planet.Venus.sign", "karaka.darakaraka"],
  love_5: ["house.7.lord", "planet.Moon.sign", "planet.Venus.sign"],
  dasha_1: ["dasha.current.maha", "dasha.current.antar", "dasha.next"],
  dasha_2: ["dasha.current.maha", "planet.Jupiter.sign", "planet.Sun.sign"],
  dasha_3: ["dasha.current.maha", "planet.Saturn.sign", "planet.Mars.sign"],
  dasha_4: ["dasha.next", "dasha.current.maha", "core.moon.nakshatra.lord"],
  dasha_5: ["dasha.current.maha", "dasha.next", "core.lagna.sign"],
  karma_1: ["planet.Rahu.sign", "planet.Rahu.house", "axis.rahu"],
  karma_2: ["planet.Ketu.sign", "planet.Ketu.house", "axis.ketu"],
  karma_3: ["planet.Rahu.house", "planet.Ketu.house", "house.8.sign"],
  karma_4: ["house.7.sign", "house.10.sign", "planet.Rahu.sign"],
  karma_5: ["planet.Ketu.sign", "karaka.atmakaraka", "dasha.current.maha"],
  master_1: ["core.lagna.sign", "core.moon.sign", "karaka.atmakaraka"],
  master_2: ["core.lagna.lord", "planet.Jupiter.sign", "planet.Saturn.sign"],
  master_3: ["planet.Ketu.sign", "planet.Saturn.sign", "core.moon.sign"],
  master_4: ["dasha.current.maha", "dasha.next", "house.10.sign"],
  master_5: ["core.sun.sign", "karaka.atmakaraka", "house.10.sign"],
});

function hasForbiddenText(value) {
  return new RegExp(FORBIDDEN_TEXT_RE.source, "i").test(String(value || ""));
}

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PLANET_KO = {
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};
const PLANET_EN_BY_KO = Object.freeze(Object.fromEntries(Object.entries(PLANET_KO).map(([en, ko]) => [ko, en])));

const VEDIC_SIGN_INTERPRETATION = {
  Aries: { core: "시작이 빠르고 결단이 분명한 추진형 기질", shadow: "속도가 앞서면 조급한 결론으로 흐를 수 있다.", advice: "결정을 내리기 전 사실 점검 순서를 먼저 두는 것이 안전하다." },
  Taurus: { core: "꾸준함과 축적, 감각적 안정성을 중시하는 기질", shadow: "변화 저항이 커지면 기회를 늦게 잡을 수 있다.", advice: "핵심 원칙은 지키되 실행 방식은 유연하게 조정한다." },
  Gemini: { core: "정보 연결과 언어 감각, 학습 속도가 빠른 기질", shadow: "분산이 커지면 깊이가 약해질 수 있다.", advice: "우선순위 3개만 고정해 집중 구간을 만든다." },
  Cancer: { core: "보호와 돌봄, 정서적 공명을 중시하는 기질", shadow: "감정 파도에 따라 선택이 흔들릴 수 있다.", advice: "감정 기록과 생활 루틴을 함께 유지한다." },
  Leo: { core: "표현력과 중심성, 존재감이 강한 기질", shadow: "인정 욕구가 과해지면 관계 피로가 쌓일 수 있다.", advice: "성과보다 과정의 신뢰를 먼저 쌓는다." },
  Virgo: { core: "정교함과 분석력, 실용적 개선 감각이 뛰어난 기질", shadow: "과도한 기준이 자기비판으로 이어질 수 있다.", advice: "완벽보다 반복 가능한 품질을 목표로 둔다." },
  Libra: { core: "균형과 조율, 관계 감각이 섬세한 기질", shadow: "결정 지연이 길어질 수 있다.", advice: "합의 기준을 문장으로 명확히 두고 결정한다." },
  Scorpio: { core: "집중력과 통찰, 깊은 변환 에너지가 강한 기질", shadow: "통제 욕구가 높아지면 피로가 누적될 수 있다.", advice: "신뢰 가능한 범위부터 단계적으로 개방한다." },
  Sagittarius: { core: "의미 탐색과 철학, 확장 지향성이 큰 기질", shadow: "확장만 앞서면 실행 디테일이 비어질 수 있다.", advice: "비전을 주간 실행 계획으로 분해한다." },
  Capricorn: { core: "구조화와 책임, 장기 성과를 만드는 기질", shadow: "과도한 의무감이 정서 경직으로 이어질 수 있다.", advice: "휴식도 일정으로 관리해 지속 가능성을 지킨다." },
  Aquarius: { core: "혁신과 관찰, 집단적 가치에 민감한 기질", shadow: "정서 거리감이 커질 수 있다.", advice: "아이디어를 사람의 언어로 번역해 전달한다." },
  Pisces: { core: "영성, 공감, 치유, 예술성, 보이지 않는 흐름을 읽는 힘", shadow: "경계가 흐려지거나 타인의 감정을 과하게 흡수할 수 있다.", advice: "공감 능력을 현실적 구조와 경계선 안에서 써야 한다." },
};

const VEDIC_NAKSHATRA_INTERPRETATION = {
  Ashwini: { instinct: "빠른 시작, 회복력, 치유 본능, 즉각적인 반응", shadow: "성급함, 무모함, 빨리 끝내려는 조급함", advice: "빠른 직감을 행동으로 옮기기 전 한 번 정리하는 습관이 필요하다." },
  아슈비니: { instinct: "빠른 시작, 회복력, 치유 본능, 즉각적인 반응", shadow: "성급함, 무모함, 빨리 끝내려는 조급함", advice: "빠른 직감을 행동으로 옮기기 전 한 번 정리하는 습관이 필요하다." },
  바라니: { instinct: "강한 생명력, 책임, 금기와 욕망을 다루는 힘", shadow: "감정의 압력, 소유욕, 극단적 선택", advice: "욕망을 억누르기보다 안전한 형태로 표현해야 한다." },
  크리티카: { instinct: "분별력, 절단력, 정화와 보호 본능", shadow: "날카로운 말, 완벽주의, 관계를 쉽게 끊는 경향", advice: "비판의 칼을 먼저 자신이 지킬 기준으로 바꾸어라." },
  로히니: { instinct: "매력, 생산성, 아름다움과 풍요를 키우는 힘", shadow: "안락함 집착, 질투, 느린 변화", advice: "풍요를 오래 누리려면 감각과 규칙을 함께 세워야 한다." },
  므리가시라: { instinct: "탐색, 호기심, 섬세한 관찰력", shadow: "불안한 방황, 결정 지연, 감정 회피", advice: "찾는 시간을 정해 두고 선택의 문을 닫는 훈련이 필요하다." },
  아르드라: { instinct: "폭풍 뒤의 통찰, 해체와 재구성", shadow: "감정 폭발, 냉소, 관계 피로", advice: "강한 감정이 온 날에는 결론보다 정화를 먼저 선택하라." },
  푸나르바수: { instinct: "회복, 귀환, 다시 시작하는 복원력", shadow: "같은 자리로 돌아가는 반복, 안일함", advice: "돌아갈 곳을 지키되 같은 실수까지 반복하지 말아야 한다." },
  푸샤: { instinct: "양육, 보호, 가르침, 신뢰를 쌓는 힘", shadow: "과도한 책임, 정서적 의무감", advice: "돌봄을 주기 전 자신의 그릇부터 채워라." },
  아슐레샤: { instinct: "심리 통찰, 결속, 숨은 흐름을 읽는 감각", shadow: "의심, 집착, 말의 독", advice: "직관을 무기로 쓰지 말고 경계선으로 써야 한다." },
  마가: { instinct: "조상, 명예, 계승과 왕좌의 기억", shadow: "자존심, 권위 집착, 과거 영광", advice: "존재감을 증명하려 하기보다 품격 있는 책임을 선택하라." },
  "푸르바 팔구니": { instinct: "즐거움, 사랑, 창조성과 휴식", shadow: "쾌락 지연 실패, 게으른 낭비", advice: "즐거움이 힘이 되려면 약속과 마감이 함께 있어야 한다." },
  "우타라 팔구니": { instinct: "계약, 신뢰, 오래 가는 관계", shadow: "의무 과잉, 체면 때문에 버티는 습관", advice: "좋은 인연은 헌신과 조건을 모두 분명히 할 때 오래 간다." },
  하스타: { instinct: "손재주, 기술, 치유와 조율", shadow: "통제욕, 잔기술, 마음을 숨기는 습관", advice: "손에 잡히는 작은 실행이 운의 문을 연다." },
  치트라: { instinct: "아름다운 구조, 설계, 독창적 존재감", shadow: "겉모습 집착, 비교, 완벽주의", advice: "빛나기 위해 꾸미기보다 오래 남을 구조를 만들어라." },
  스와티: { instinct: "독립성, 이동, 바람처럼 배우는 힘", shadow: "흩어짐, 고립, 결속 회피", advice: "자유를 지키려면 스스로 정한 리듬이 필요하다." },
  비샤카: { instinct: "목표 집중, 성취욕, 깊은 동맹", shadow: "집착, 경쟁심, 결과 강박", advice: "목표를 하나로 좁힐수록 운의 화살이 곧게 나간다." },
  아누라다: { instinct: "우정, 헌신, 질서 있는 사랑", shadow: "외로움, 인정 욕구, 관계 의존", advice: "진심은 오래 가지만 경계가 있어야 향기가 남는다." },
  제슈타: { instinct: "위기관리, 권위, 보호자의 힘", shadow: "방어심, 우월감, 감정 통제", advice: "강함을 증명하기보다 필요한 순간에만 사용하라." },
  물라: { instinct: "근원 탐구, 해체, 영적 뿌리", shadow: "극단적 단절, 파괴 충동", advice: "무너뜨릴 것은 습관이지 삶 전체가 아니다." },
  "푸르바 아샤다": { instinct: "신념, 승리 의지, 물처럼 밀어붙이는 힘", shadow: "고집, 설득 강박, 감정 과열", advice: "믿음이 강할수록 검증의 물을 통과시켜라." },
  "우타라 아샤다": { instinct: "최종 승리, 책임, 오래 가는 명예", shadow: "느린 성과에 대한 조급함", advice: "큰 승리는 단번에 오지 않고 매일의 기준에서 자란다." },
  슈라바나: { instinct: "경청, 학습, 전승되는 지혜", shadow: "소문, 과도한 정보 수집, 눈치", advice: "많이 듣되 자신의 목소리로 결론을 내려라." },
  다니슈타: { instinct: "리듬, 공동체, 성취와 자원 순환", shadow: "성과 중독, 관계의 박자 불균형", advice: "성과와 쉼의 박자를 맞출 때 풍요가 오래 간다." },
  샤타비샤: { instinct: "치유, 비밀 연구, 독립적 통찰", shadow: "고립, 차가운 거리감, 회피", advice: "혼자 회복하되 완전히 닫히지는 말아야 한다." },
  "푸르바 바드라파다": { instinct: "깊은 신념, 영적 불꽃, 전환의 문", shadow: "극단성, 내면의 과열", advice: "불꽃은 방향을 만나야 의식의 등불이 된다." },
  "우타라 바드라파다": { instinct: "깊은 안정, 인내, 영혼의 저수지", shadow: "무기력, 감정 침잠, 늦은 반응", advice: "느린 힘을 믿되 매일 하나씩 현실로 끌어올려라." },
  레바티: { instinct: "보호, 여행, 마무리와 인도", shadow: "도피, 이상화, 경계 흐림", advice: "부드러움이 길을 잃지 않도록 일정과 약속을 세워라." },
};

const VEDIC_DASHA_INTERPRETATION = {
  Sun: {
    theme: "자아, 권위, 책임, 이름을 세상에 드러내는 힘",
    opportunity: "역할과 기준을 분명히 하면 사회적 존재감이 빠르게 살아난다.",
    caution: "인정 욕구가 강해지며 혼자 책임을 떠안기 쉽다.",
    advice: "빛나고 싶은 무대를 하나로 정하고 그 기준을 끝까지 지켜야 한다.",
  },
  Moon: {
    theme: "마음, 안정감, 가족, 말, 재물 축적, 대중과의 연결",
    opportunity: "감정과 생활 기반을 안정시키면 수입과 관계의 흐름이 함께 좋아진다.",
    caution: "기분에 따라 선택이 흔들리거나 감정적 소비가 늘 수 있다.",
    advice: "감정이 흔들릴수록 수면, 식사, 기록, 재정 관리의 기본 루틴을 유지해야 한다.",
  },
  Mars: {
    theme: "실행, 표현, 자기주도, 손과 말의 추진력",
    opportunity: "콘텐츠와 실무 실행을 병행하면 성과 회수가 빨라진다.",
    caution: "성급한 결론과 충돌형 소통이 생기기 쉽다.",
    advice: "속도보다 방향 점검을 먼저 두고 실행한다.",
  },
  Mercury: {
    theme: "지성, 언어, 거래, 학습, 네트워크",
    opportunity: "말과 문서, 콘텐츠, 계약을 정리하면 운의 통로가 넓어진다.",
    caution: "생각이 많아져 핵심 결정을 미루거나 말이 흩어질 수 있다.",
    advice: "모든 선택을 기록과 숫자로 남기면 수성의 복이 현실화된다.",
  },
  Jupiter: {
    theme: "성장, 스승, 지혜, 확장, 보호",
    opportunity: "배움과 신뢰를 기반으로 더 큰 무대에 들어갈 수 있다.",
    caution: "낙관이 지나치면 약속과 지출이 함께 커진다.",
    advice: "확장할수록 기준을 세우고, 좋은 스승과 좋은 시스템을 함께 잡아야 한다.",
  },
  Venus: {
    theme: "사랑, 예술, 관계의 즐거움, 풍요",
    opportunity: "매력과 감각을 수익, 관계, 창작으로 바꾸기 좋은 흐름이다.",
    caution: "편안함과 쾌락에 머물면 중요한 결정을 늦출 수 있다.",
    advice: "아름다움을 즐기되 관계와 돈의 경계선을 선명하게 세워라.",
  },
  Saturn: {
    theme: "시간, 책임, 단련, 구조, 장기 성취",
    opportunity: "버티는 힘이 전문성과 신뢰로 바뀐다.",
    caution: "무거운 책임감과 자기비판이 판단을 늦출 수 있다.",
    advice: "느린 성과를 두려워하지 말고 매일 반복할 구조를 만들어야 한다.",
  },
  Rahu: {
    theme: "낯선 확장, 욕망, 기술, 경계 밖의 경험",
    opportunity: "새로운 시장, 관계, 기술, 외부 세계가 갑자기 문을 연다.",
    caution: "과도한 욕망과 비교심이 방향을 흐릴 수 있다.",
    advice: "낯선 기회를 잡되 검증되지 않은 약속에는 시간을 두어야 한다.",
  },
  Ketu: {
    theme: "분리, 정화, 영적 통찰, 오래된 집착의 해체",
    opportunity: "불필요한 것을 덜어낼수록 직관과 본질이 선명해진다.",
    caution: "무관심이나 단절이 관계와 현실 감각을 약하게 만들 수 있다.",
    advice: "놓아야 할 것과 지켜야 할 것을 구분하면 케투의 지혜가 열린다.",
  },
};
const DIGNITY = ["exalted", "own", "friendly", "neutral", "enemy", "debilitated", "unknown"];
const NAKSHATRA_ROWS = [
  ["아슈비니", "Ketu"], ["바라니", "Venus"], ["크리티카", "Sun"], ["로히니", "Moon"], ["므리가시라", "Mars"], ["아르드라", "Rahu"],
  ["푸나르바수", "Jupiter"], ["푸샤", "Saturn"], ["아슐레샤", "Mercury"], ["마가", "Ketu"], ["푸르바 팔구니", "Venus"], ["우타라 팔구니", "Sun"],
  ["하스타", "Moon"], ["치트라", "Mars"], ["스와티", "Rahu"], ["비샤카", "Jupiter"], ["아누라다", "Saturn"], ["제슈타", "Mercury"],
  ["물라", "Ketu"], ["푸르바 아샤다", "Venus"], ["우타라 아샤다", "Sun"], ["슈라바나", "Moon"], ["다니슈타", "Mars"], ["샤타비샤", "Rahu"],
  ["푸르바 바드라파다", "Jupiter"], ["우타라 바드라파다", "Saturn"], ["레바티", "Mercury"],
];

const DASHA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const SIGN_LORD_BY_EN = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};
const VEDIC_OWN_SIGNS = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
  Rahu: [],
  Ketu: [],
};
const VEDIC_EXALTATION = { Sun: "Aries", Moon: "Taurus", Mars: "Capricorn", Mercury: "Virgo", Jupiter: "Cancer", Venus: "Pisces", Saturn: "Libra", Rahu: "Taurus", Ketu: "Scorpio" };
const VEDIC_DEBILITATION = { Sun: "Libra", Moon: "Scorpio", Mars: "Cancer", Mercury: "Pisces", Jupiter: "Capricorn", Venus: "Virgo", Saturn: "Aries", Rahu: "Scorpio", Ketu: "Taurus" };

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDegree(value) {
  const n = safeNumber(value, NaN);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function signFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return { index: null, sign: "", degree: null };
  const index = Math.floor(lon / 30);
  return {
    index,
    signEn: SIGN_EN[index] || "",
    sign: SIGN_KO[index] || "",
    degree: Math.round((lon % 30) * 100) / 100,
  };
}

function houseFromLagna(longitude, lagnaLongitude) {
  const lon = normalizeDegree(longitude);
  const lagna = normalizeDegree(lagnaLongitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lagna)) return null;
  return Math.floor(normalizeDegree(lon - lagna) / 30) + 1;
}

function nakshatraFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return { name: "", pada: null, lord: "" };
  const unit = 360 / 27;
  const idx = Math.min(26, Math.floor(lon / unit));
  const within = lon - idx * unit;
  const [name, lord] = NAKSHATRA_ROWS[idx] || ["", ""];
  const pada = Math.min(4, Math.floor(within / (unit / 4)) + 1);
  return { name, pada, lord };
}

function normalizeGender(value) {
  const token = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남자", "남성"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여자", "여성"].includes(token)) return "female";
  return "unknown";
}

function parseBirthDate(value) {
  const text = clean(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (y > 1800 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { birthDate: `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, birthYear: y, birthMonth: m, birthDay: d };
    }
  }
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const y = Number(compact[1]);
    const m = Number(compact[2]);
    const d = Number(compact[3]);
    if (y > 1800 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { birthDate: `${y}-${compact[2]}-${compact[3]}`, birthYear: y, birthMonth: m, birthDay: d };
    }
  }
  return null;
}

function parseBirthTime(rawTime, rawHour, rawMinute, explicitUnknown = false) {
  if (explicitUnknown) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const unknownTokens = ["모름", "시간 모름", "unknown", "미상", "na", "n/a", "-"];
  const timeToken = clean(rawTime);
  if (timeToken && unknownTokens.includes(timeToken.toLowerCase())) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const hourOnly = Number(rawHour);
  const minuteOnly = Number(rawMinute);
  if (Number.isFinite(hourOnly)) {
    const hh = Math.max(0, Math.min(23, Math.floor(hourOnly)));
    const mm = Number.isFinite(minuteOnly) ? Math.max(0, Math.min(59, Math.floor(minuteOnly))) : 0;
    return {
      birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      birthHour: hh,
      birthMinute: mm,
      isTimeUnknown: false,
    };
  }

  const text = timeToken;
  if (!text) {
    return {
      birthTime: "",
      birthHour: null,
      birthMinute: 0,
      isTimeUnknown: true,
    };
  }

  const hhmm = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmm) {
    const hh = Number(hhmm[1]);
    const mm = Number(hhmm[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        birthHour: hh,
        birthMinute: mm,
        isTimeUnknown: false,
      };
    }
  }

  const hourText = text.match(/^(\d{1,2})\s*시$/);
  if (hourText) {
    const hh = Number(hourText[1]);
    if (hh >= 0 && hh <= 23) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:00`,
        birthHour: hh,
        birthMinute: 0,
        isTimeUnknown: false,
      };
    }
  }

  const numericHour = text.match(/^(\d{1,2})$/);
  if (numericHour) {
    const hh = Number(numericHour[1]);
    if (hh >= 0 && hh <= 23) {
      return {
        birthTime: `${String(hh).padStart(2, "0")}:00`,
        birthHour: hh,
        birthMinute: 0,
        isTimeUnknown: false,
      };
    }
  }

  const korean = text.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const marker = korean[1];
    let hh = Number(korean[2]);
    const mm = Number.isFinite(Number(korean[3])) ? Number(korean[3]) : 0;
    if (hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59) {
      if (marker === "오전") {
        if (hh === 12) hh = 0;
      } else if (hh !== 12) {
        hh += 12;
      }
      return {
        birthTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        birthHour: hh,
        birthMinute: mm,
        isTimeUnknown: false,
      };
    }
  }

  return {
    birthTime: "",
    birthHour: null,
    birthMinute: 0,
    isTimeUnknown: true,
  };
}

function pickRawBirthSource(input = {}) {
  const birthInput = input.birthInput && typeof input.birthInput === "object" ? input.birthInput : {};
  const birth = input.birth && typeof input.birth === "object" ? input.birth : {};
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const location = input.location && typeof input.location === "object" ? input.location : {};
  return {
    name: input.name ?? birthInput.name ?? user.name ?? profile.name,
    gender: input.gender ?? input.sex ?? birthInput.gender ?? user.gender ?? profile.gender,
    date: input.birthDate ?? birthInput.birthDate ?? input.birthday ?? input.birth ?? input.solarDate ?? input.date ?? birth.date ?? user.birthDate ?? profile.birthDate,
    year: input.birthYear ?? birthInput.birthYear ?? birth.year ?? profile.birthYear,
    month: input.birthMonth ?? birthInput.birthMonth ?? birth.month ?? profile.birthMonth,
    day: input.birthDay ?? birthInput.birthDay ?? birth.day ?? profile.birthDay,
    time: input.birthTime ?? birthInput.birthTime ?? input.time ?? birth.time ?? profile.birthTime ?? user.birthTime,
    hour: input.birthHour ?? birthInput.birthHour ?? input.hour ?? input.birth_hour ?? birth.hour ?? profile.birthHour,
    minute: input.birthMinute ?? birthInput.birthMinute ?? input.minute ?? birth.minute ?? profile.birthMinute,
    timezone: input.timezone ?? birthInput.timezone ?? input.tz ?? location.tz ?? user.timezone ?? profile.timezone,
    birthPlace: input.birthPlace ?? birthInput.birthPlace ?? input.place ?? input.locationName ?? input.location ?? user.birthPlace ?? profile.birthPlace,
    latitude: input.latitude ?? birthInput.latitude ?? input.lat ?? location.lat,
    longitude: input.longitude ?? birthInput.longitude ?? input.lng ?? input.lon ?? location.lon,
    isTimeUnknown: Boolean(input.isTimeUnknown || birthInput.isTimeUnknown || input.timeUnknown || input.birthTimeUnknown),
  };
}

export function normalizeVedicPremiumBirthInput(input = {}) {
  const src = pickRawBirthSource(input);

  const dateFromFields = Number.isFinite(Number(src.year)) && Number.isFinite(Number(src.month)) && Number.isFinite(Number(src.day))
    ? parseBirthDate(`${Number(src.year)}-${Number(src.month)}-${Number(src.day)}`)
    : null;
  const parsedDate = dateFromFields || parseBirthDate(src.date);

  const parsedTime = parseBirthTime(src.time, src.hour, src.minute, src.isTimeUnknown);
  const timezone = clean(src.timezone) || "Asia/Seoul";

  const out = {
    name: clean(src.name) || undefined,
    gender: normalizeGender(src.gender),
    birthDate: parsedDate ? parsedDate.birthDate : "",
    birthYear: parsedDate ? parsedDate.birthYear : NaN,
    birthMonth: parsedDate ? parsedDate.birthMonth : NaN,
    birthDay: parsedDate ? parsedDate.birthDay : NaN,
    birthTime: parsedTime.birthTime,
    birthHour: parsedTime.birthHour,
    birthMinute: parsedTime.birthMinute,
    timezone,
    birthPlace: clean(src.birthPlace) || undefined,
    latitude: Number.isFinite(Number(src.latitude)) ? Number(src.latitude) : null,
    longitude: Number.isFinite(Number(src.longitude)) ? Number(src.longitude) : null,
    isTimeUnknown: parsedTime.isTimeUnknown,
  };

  return out;
}

export function validateVedicBirthInput(birthInput) {
  const missing = [];
  if (!clean(birthInput?.birthDate)) missing.push("birthDate");
  if (!Number.isFinite(Number(birthInput?.birthYear))) missing.push("birthYear");
  if (!Number.isFinite(Number(birthInput?.birthMonth))) missing.push("birthMonth");
  if (!Number.isFinite(Number(birthInput?.birthDay))) missing.push("birthDay");
  if (!clean(birthInput?.timezone)) missing.push("timezone");

  const hardFail = [];
  if (missing.includes("birthDate")) hardFail.push("birthDate");
  if (birthInput?.isTimeUnknown || birthInput?.birthHour == null) hardFail.push("birthTime");

  return {
    ok: hardFail.length === 0,
    missing,
    hardFail,
    message: hardFail.includes("birthTime")
      ? "베다점 PDF는 라그나와 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요."
      : "생년월일 정보가 올바르지 않습니다. 프로필의 출생 정보를 확인해주세요.",
  };
}

function normalizePlanetMap(rawPlanets = {}, retrograde = {}, lagnaLongitude = NaN) {
  const source = rawPlanets && typeof rawPlanets === "object" ? rawPlanets : {};
  const planets = [];

  for (const englishName of Object.keys(PLANET_KO)) {
    const keyVariants = [englishName, englishName.toLowerCase(), PLANET_KO[englishName]];
    const found = keyVariants.map((k) => source[k]).find((value) => value != null);
    const longitude = typeof found === "object"
      ? normalizeDegree(found.longitude ?? found.absoluteLongitude ?? found.lon)
      : normalizeDegree(found);
    const sign = signFromLongitude(longitude);
    const nk = nakshatraFromLongitude(longitude);

    planets.push({
      name: englishName,
      nameKo: PLANET_KO[englishName] || englishName,
      signEn: sign.signEn || "",
      sign: sign.sign || "",
      degree: sign.degree,
      house: houseFromLagna(longitude, lagnaLongitude),
      nakshatra: nk.name || "",
      pada: Number.isFinite(Number(nk.pada)) ? Number(nk.pada) : undefined,
      retrograde: Boolean(
        retrograde?.[englishName]
        || retrograde?.[englishName.toLowerCase()]
        || (found && typeof found === "object" && found.retrograde),
      ),
      dignity: deriveVedicDignity(englishName, sign.signEn),
      longitude: Number.isFinite(longitude) ? longitude : null,
    });
  }

  return planets;
}

function buildWholeSignHouses(lagnaLongitude, planets = []) {
  const lagnaSign = signFromLongitude(lagnaLongitude).index;
  if (!Number.isFinite(lagnaSign)) return [];

  return Array.from({ length: 12 }, (_, index) => {
    const house = index + 1;
    const signIndex = (lagnaSign + index) % 12;
    const sign = SIGN_KO[signIndex] || "";
    const signEn = SIGN_EN[signIndex] || "";
    const lord = SIGN_LORD_BY_EN[signEn] || "";
    const inHouse = planets.filter((planet) => Number(planet.house) === house).map((planet) => PLANET_KO[planet.name] || planet.name);
    return {
      house,
      sign,
      signEn,
      lord,
      lordKo: PLANET_KO[lord] || lord,
      planets: inHouse,
    };
  });
}

function buildSimpleAspects(planets = []) {
  const majors = planets.filter((planet) => Number.isFinite(Number(planet.longitude)));
  const out = [];
  for (let i = 0; i < majors.length; i += 1) {
    for (let j = i + 1; j < majors.length; j += 1) {
      const a = majors[i];
      const b = majors[j];
      const rawDiff = Math.abs(Number(a.longitude) - Number(b.longitude));
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
      let type = "";
      let strength = "weak";
      if (Math.abs(diff - 0) <= 6) {
        type = "conjunction";
        strength = "strong";
      } else if (Math.abs(diff - 120) <= 7) {
        type = "trine";
        strength = "strong";
      } else if (Math.abs(diff - 180) <= 7) {
        type = "opposition";
        strength = "medium";
      } else if (Math.abs(diff - 90) <= 7) {
        type = "square";
        strength = "medium";
      }
      if (!type) continue;
      out.push({
        planetA: PLANET_KO[a.name] || a.name,
        planetB: PLANET_KO[b.name] || b.name,
        type,
        strength,
      });
    }
  }
  return out;
}

function buildVimshottariFromMoon(moonNakshatra) {
  const lord = clean(moonNakshatra?.lord) || "Moon";
  const startIndex = Math.max(0, DASHA_SEQUENCE.indexOf(lord));
  const periods = DASHA_SEQUENCE.map((planet, index) => {
    const lordIndex = (startIndex + index) % DASHA_SEQUENCE.length;
    const l = DASHA_SEQUENCE[lordIndex];
    return {
      type: "maha",
      lord: PLANET_KO[l] || l,
      start: "",
      end: "",
      years: DASHA_YEARS[l] || 0,
    };
  });
  return {
    system: "vimshottari",
    currentMahaDasha: periods[0]?.lord || "",
    currentAntarDasha: periods[1]?.lord || "",
    periods,
  };
}

function normalizePlanetName(value) {
  const token = clean(value);
  if (!token) return "";
  if (PLANET_KO[token]) return token;
  if (PLANET_EN_BY_KO[token]) return PLANET_EN_BY_KO[token];
  const normalized = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  return PLANET_KO[normalized] ? normalized : "";
}

function deriveVedicDignity(planetName, signEn) {
  const planet = normalizePlanetName(planetName);
  const sign = clean(signEn);
  if (!planet || !sign) return "unknown";
  if (VEDIC_EXALTATION[planet] === sign) return "exalted";
  if (VEDIC_DEBILITATION[planet] === sign) return "debilitated";
  if (safeArray(VEDIC_OWN_SIGNS[planet]).includes(sign)) return "own";
  return "neutral";
}

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => clean(v)).filter(Boolean);
  if (typeof value === "string") return value.split(/[,/|]/).map((v) => clean(v)).filter(Boolean);
  return [];
}

function findPlanetByName(planets, name) {
  const en = normalizePlanetName(name);
  if (!en) return null;
  return safeArray(planets).find((planet) => normalizePlanetName(planet?.name || planet?.graha || planet?.nameKo) === en) || null;
}

function strongestPlanetNames(planets = []) {
  const weights = { exalted: 4, own: 3, friendly: 2, neutral: 1, enemy: 0, debilitated: -1, unknown: 0 };
  return safeArray(planets)
    .map((planet) => ({
      name: normalizePlanetName(planet?.name || "") || clean(planet?.name),
      score: Number(weights[String(planet?.dignity || "unknown").toLowerCase()] || 0) + (planet?.retrograde ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean);
}

function concentratedBhavas(houses = []) {
  return safeArray(houses)
    .map((house) => ({
      bhava: Number(house?.house || house?.number || 0),
      rashi: clean(house?.sign || house?.rashi),
      planets: safeArray(house?.planets),
    }))
    .filter((row) => row.bhava >= 1 && row.bhava <= 12)
    .sort((a, b) => (safeArray(b.planets).length - safeArray(a.planets).length))
    .slice(0, 3);
}

function requiredSignal(value, key, missingSignals) {
  const text = clean(value);
  if (!text) {
    missingSignals.push(key);
    return "";
  }
  return text;
}

function normalizeVedicPdfContext(rawInput = {}, chartJson = {}) {
  const birthInput = chartJson?.birthInput || normalizeVedicPremiumBirthInput(rawInput);
  const chart = chartJson?.chart || {};
  const missingSignals = [];

  const planets = safeArray(chart.planets).map((planet) => {
    const en = normalizePlanetName(planet?.name || planet?.graha || "");
    return {
      graha: en || clean(planet?.name),
      grahaKo: PLANET_KO[en] || clean(planet?.name),
      rashi: clean(planet?.signEn),
      rashiKo: clean(planet?.sign),
      degree: Number.isFinite(Number(planet?.degree)) ? Number(planet.degree) : undefined,
      bhava: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
      nakshatra: clean(planet?.nakshatra),
      nakshatraLord: clean(planet?.nakshatraLord),
      pada: Number.isFinite(Number(planet?.pada)) ? Number(planet.pada) : undefined,
      dignity: clean(planet?.dignity),
      retrograde: Boolean(planet?.retrograde),
      navamsa: clean(planet?.navamsa),
      dashamsa: clean(planet?.dashamsa),
    };
  });

  const houses = safeArray(chart.houses).map((house) => ({
    number: Number(house?.house || house?.number || 0),
    rashi: clean(house?.signEn),
    rashiKo: clean(house?.sign),
    lord: clean(house?.lord),
    planets: safeArray(house?.planets),
  }));

  const dashaRaw = safeArray(rawInput?.dasha).length ? safeArray(rawInput?.dasha) : safeArray(rawInput?.dashas?.periods);
  const chartDashas = safeArray(chart?.dashas?.periods);
  const mergedDasha = chartDashas.length ? chartDashas : dashaRaw;
  const dasha = mergedDasha.length
    ? mergedDasha.map((row, index) => ({
      planet: clean(row?.planet || row?.lord),
      start: clean(row?.start),
      end: clean(row?.end),
      years: Number.isFinite(Number(row?.years)) ? Number(row.years) : undefined,
      active: Boolean(row?.active || index === 0),
    }))
    : [];

  const lagnaPlanet = findPlanetByName(planets, "Jupiter");
  const moon = findPlanetByName(planets, "Moon");
  const venus = findPlanetByName(planets, "Venus");
  const jupiter = findPlanetByName(planets, "Jupiter");
  const saturn = findPlanetByName(planets, "Saturn");

  const moonNakshatra = {
    name: clean(rawInput?.moonNakshatra?.name || chart?.nakshatra?.name || moon?.nakshatra),
    pada: Number(rawInput?.moonNakshatra?.pada || chart?.nakshatra?.pada || moon?.pada),
    lord: clean(rawInput?.moonNakshatra?.lord || chart?.nakshatra?.lord),
    deity: clean(rawInput?.moonNakshatra?.deity),
    motive: clean(rawInput?.moonNakshatra?.motive),
  };

  const karakas = {
    atmakaraka: clean(rawInput?.karakas?.atmakaraka || chart?.karakas?.atmakaraka?.planetKo || chart?.atmakaraka),
    amatyakaraka: clean(rawInput?.karakas?.amatyakaraka || chart?.karakas?.amatyakaraka?.planetKo),
    darakaraka: clean(rawInput?.karakas?.darakaraka || chart?.karakas?.darakaraka?.planetKo),
  };

  const yogas = toList(rawInput?.yogas);
  const romance = rawInput?.romance && typeof rawInput.romance === "object" ? rawInput.romance : {};
  const wealth = rawInput?.wealth && typeof rawInput.wealth === "object" ? rawInput.wealth : {};
  const career = rawInput?.career && typeof rawInput.career === "object" ? rawInput.career : {};
  const chakra = rawInput?.chakra && typeof rawInput.chakra === "object" ? rawInput.chakra : {};
  const remedies = rawInput?.remedies && typeof rawInput.remedies === "object" ? rawInput.remedies : {};

  const lagnaSign = clean(rawInput?.lagna?.sign || lagnaPlanet?.rashi || chart?.lagnaSign);
  const lagnaSignKo = clean(rawInput?.lagna?.signKo || lagnaPlanet?.rashiKo);

  requiredSignal(birthInput?.birthDate, "birthDate", missingSignals);
  requiredSignal(birthInput?.birthTime, "birthTime", missingSignals);
  requiredSignal(birthInput?.timezone, "timezone", missingSignals);
  const hasLocation = Number.isFinite(Number(birthInput?.latitude)) && Number.isFinite(Number(birthInput?.longitude));
  if (!hasLocation && !clean(birthInput?.birthPlace)) {
    missingSignals.push("location");
  }
  requiredSignal(chartJson?.settings?.ayanamsa, "ayanamsa", missingSignals);
  if (!lagnaSign) missingSignals.push("ascendantOrLagna");

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const contextPlanetNames = new Set(planets.map((planet) => normalizePlanetName(planet?.graha)).filter(Boolean));
  requiredPlanets.forEach((planet) => {
    if (!contextPlanetNames.has(planet)) missingSignals.push(`planet:${planet}`);
  });
  requiredSignal(moonNakshatra?.name, "moonNakshatra", missingSignals);
  if (houses.length !== 12) missingSignals.push("houses");
  if (!clean(chart?.dashas?.currentMahaDasha) && !dasha.length) missingSignals.push("dasha");

  return {
    profile: {
      name: clean(rawInput?.name || birthInput?.name),
      gender: clean(rawInput?.gender || birthInput?.gender),
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      birthPlace: clean(birthInput?.birthPlace),
      timezone: clean(birthInput?.timezone),
      latitude: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : undefined,
      longitude: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : undefined,
    },
    lagna: {
      sign: lagnaSign,
      signKo: lagnaSignKo,
      degree: Number(rawInput?.lagna?.degree || 0) || undefined,
      lord: clean(rawInput?.lagna?.lord),
    },
    moonNakshatra,
    karakas,
    personality: {
      coreTraits: toList(rawInput?.personality?.coreTraits),
      lifeTheme: clean(rawInput?.personality?.lifeTheme),
    },
    yogas,
    planets,
    bhavas: houses,
    dasha,
    romance,
    wealth,
    career,
    chakra,
    remedies,
    navamsa: rawInput?.navamsa || {},
    dashamsa: rawInput?.dashamsa || {},
    derived: {
      activeDasha: clean(chart?.dashas?.currentMahaDasha || safeArray(dasha).find((row) => row.active)?.planet || safeArray(dasha)[0]?.planet),
      nextDasha: clean(safeArray(dasha).find((row) => !row.active)?.planet),
      strongestPlanets: strongestPlanetNames(planets),
      challengingPlanets: ["Rahu", "Ketu"],
      concentratedBhavas: concentratedBhavas(houses),
      loveFactors: [clean(romance?.h7sign), clean(karakas?.darakaraka), clean(venus?.rashi)].filter(Boolean),
      careerFactors: [clean(career?.primary?.[0]), clean(career?.primary?.[1]), clean(jupiter?.rashi)].filter(Boolean),
      wealthFactors: [String(wealth?.score || ""), clean((wealth?.yogas || [])[0]), clean(saturn?.rashi)].filter(Boolean),
      mindFactors: [clean(moon?.rashi), clean(moonNakshatra?.name), clean(romance?.advice || "")].filter(Boolean),
      remedyFactors: [clean(remedies?.mantra || ""), clean(remedies?.gem || ""), clean(remedies?.dosha?.type || "")].filter(Boolean),
    },
    missingSignals: Array.from(new Set(missingSignals)),
    isCompleteForPremiumPdf: Array.from(new Set(missingSignals)).length === 0,
  };
}

function pickPlanet(planets, name) {
  return safeArray(planets).find((planet) => planet.name === name) || null;
}

function pickHouse(houses, number) {
  return safeArray(houses).find((house) => Number(house.house) === Number(number)) || null;
}

function baseKeywordsFromChart(chartJson) {
  const planets = safeArray(chartJson?.chart?.planets);
  const houses = safeArray(chartJson?.chart?.houses);
  const moon = pickPlanet(planets, "Moon");
  const venus = pickPlanet(planets, "Venus");
  const saturn = pickPlanet(planets, "Saturn");
  const jupiter = pickPlanet(planets, "Jupiter");
  const house10 = pickHouse(houses, 10);
  const house7 = pickHouse(houses, 7);
  const house2 = pickHouse(houses, 2);
  const house11 = pickHouse(houses, 11);

  return {
    personalityKeywords: [
      clean(chartJson?.chart?.lagnaSign),
      clean(moon?.sign),
      clean(pickPlanet(planets, "Sun")?.sign),
    ].filter(Boolean),
    careerKeywords: [
      clean(house10?.sign),
      clean(saturn?.sign),
      clean(jupiter?.house ? `${jupiter.house}하우스` : ""),
    ].filter(Boolean),
    moneyKeywords: [clean(house2?.sign), clean(house11?.sign), clean(jupiter?.sign)].filter(Boolean),
    relationshipKeywords: [clean(venus?.sign), clean(house7?.sign), clean(moon?.nakshatra)].filter(Boolean),
    healingKeywords: [clean(saturn?.sign), clean(moon?.sign), clean(pickHouse(houses, 6)?.sign)].filter(Boolean),
    timingKeywords: [clean(chartJson?.chart?.dashas?.currentMahaDasha), clean(chartJson?.chart?.dashas?.currentAntarDasha)].filter(Boolean),
    karmaKeywords: [clean(pickPlanet(planets, "Rahu")?.sign), clean(pickPlanet(planets, "Ketu")?.sign)].filter(Boolean),
  };
  const personality = [
    clean(chartJson?.chart?.lagnaSign),
    clean(moon?.sign),
    clean(pickPlanet(planets, "Sun")?.sign),
  ].filter(Boolean);
  const career = [
    clean(house10?.sign),
    clean(saturn?.sign),
    clean(jupiter?.house ? `${jupiter.house}하우스` : ""),
  ].filter(Boolean);
  const money = [clean(house2?.sign), clean(house11?.sign), clean(jupiter?.sign)].filter(Boolean);
  const relationship = [clean(venus?.sign), clean(house7?.sign), clean(moon?.nakshatra)].filter(Boolean);
  const health = [clean(saturn?.sign), clean(moon?.sign), clean(pickHouse(houses, 6)?.sign)].filter(Boolean);
  const timing = [clean(chartJson?.chart?.dashas?.currentMahaDasha), clean(chartJson?.chart?.dashas?.currentAntarDasha)].filter(Boolean);
  const karma = [clean(pickPlanet(planets, "Rahu")?.sign), clean(pickPlanet(planets, "Ketu")?.sign)].filter(Boolean);

  return {
    personalityKeywords: personality,
    soulKeywords: [clean(chartJson?.chart?.nakshatra?.name), clean(chartJson?.chart?.atmakaraka)].filter(Boolean),
    careerKeywords: career,
    moneyKeywords: money,
    relationshipKeywords: relationship,
    familyKeywords: [clean(pickHouse(houses, 4)?.sign), clean(moon?.sign)].filter(Boolean),
    healthKeywords: health,
    timingKeywords: timing,
    karmaKeywords: karma,
    cautionKeywords: [clean(pickHouse(houses, 8)?.sign), clean(saturn?.sign), clean(pickPlanet(planets, "Rahu")?.sign)].filter(Boolean),
    growthKeywords: [clean(jupiter?.sign), clean(chartJson?.chart?.lagnaSign), clean(chartJson?.chart?.nakshatra?.name)].filter(Boolean),
  };
}

function deriveSimpleLongitudeSeed(birthInput = {}, offset = 0) {
  const y = Number(birthInput.birthYear) || 1990;
  const m = Number(birthInput.birthMonth) || 1;
  const d = Number(birthInput.birthDay) || 1;
  const h = Number(birthInput.birthHour);
  const hour = Number.isFinite(h) ? h : 12;
  return normalizeDegree((y % 100) * 3.6 + m * 9.7 + d * 1.3 + hour * 0.5 + offset);
}

export function fallbackChartSourceFromBirthInput(birthInput) {
  const sun = deriveSimpleLongitudeSeed(birthInput, 120);
  const moon = deriveSimpleLongitudeSeed(birthInput, 15);
  const asc = deriveSimpleLongitudeSeed(birthInput, 45);
  return {
    ayanamsaName: "Lahiri",
    ascendantSidereal: asc,
    planets: {
      Sun: sun,
      Moon: moon,
      Mercury: normalizeDegree(sun + 14),
      Venus: normalizeDegree(sun - 23),
      Mars: normalizeDegree(sun + 77),
      Jupiter: normalizeDegree(sun + 136),
      Saturn: normalizeDegree(sun - 51),
      Rahu: normalizeDegree(moon + 180),
      Ketu: normalizeDegree(moon),
    },
    retrograde: {},
  };
}

function pickNestedChartSource(rawInput = {}) {
  const maybe = [
    rawInput?.chart,
    rawInput?.localVedicChartJson,
    rawInput?.vedicResult,
    rawInput?.vedicBase?.chart,
    rawInput?.vedicBase,
    rawInput,
  ];
  return maybe.find((item) => item && typeof item === "object") || {};
}

function computeAtmakaraka(planets = []) {
  const pool = safeArray(planets).filter((planet) => {
    const name = clean(planet?.name);
    return name && !["Rahu", "Ketu"].includes(name) && Number.isFinite(Number(planet?.longitude));
  });
  if (!pool.length) return "";
  const sorted = [...pool].sort((a, b) => {
    const ad = normalizeDegree(Number(a.longitude)) % 30;
    const bd = normalizeDegree(Number(b.longitude)) % 30;
    return bd - ad;
  });
  const winner = sorted[0];
  return PLANET_KO[winner.name] || winner.name;
}

function computeJaiminiKarakas(planets = []) {
  const pool = safeArray(planets)
    .filter((planet) => clean(planet?.name) && !["Rahu", "Ketu"].includes(clean(planet?.name)) && Number.isFinite(Number(planet?.longitude)))
    .sort((a, b) => (normalizeDegree(Number(b.longitude)) % 30) - (normalizeDegree(Number(a.longitude)) % 30));
  const roles = ["atmakaraka", "amatyakaraka", "bhratrikaraka", "matrikaraka", "putrakaraka", "gnatikaraka", "darakaraka"];
  return roles.reduce((out, role, index) => {
    const planet = pool[index] || null;
    out[role] = planet ? {
      planet: planet.name,
      planetKo: PLANET_KO[planet.name] || planet.name,
      sign: clean(planet.sign),
      degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree) : null,
    } : null;
    return out;
  }, {});
}

function buildVedicDrishti(planets = []) {
  const offsetsByPlanet = {
    Mars: [4, 7, 8],
    Jupiter: [5, 7, 9],
    Saturn: [3, 7, 10],
  };
  return safeArray(planets)
    .filter((planet) => Number.isFinite(Number(planet?.house)))
    .flatMap((planet) => {
      const offsets = offsetsByPlanet[planet.name] || [7];
      return offsets.map((offset) => ({
        graha: planet.name,
        grahaKo: PLANET_KO[planet.name] || planet.name,
        fromHouse: Number(planet.house),
        targetHouse: ((Number(planet.house) + offset - 2) % 12) + 1,
        type: offset === 7 ? "direct" : "special",
      }));
    });
}

function dignityKo(value) {
  const key = clean(value).toLowerCase();
  if (key === "exalted") return "고양";
  if (key === "own") return "자기 별자리";
  if (key === "debilitated") return "쇠약";
  if (key === "neutral") return "중립";
  return "미확인";
}

function buildCoreVedicYogas(planets = [], houses = []) {
  const moon = pickPlanet(planets, "Moon");
  const jupiter = pickPlanet(planets, "Jupiter");
  const venus = pickPlanet(planets, "Venus");
  const saturn = pickPlanet(planets, "Saturn");
  const h2 = pickHouse(houses, 2);
  const h9 = pickHouse(houses, 9);
  const h10 = pickHouse(houses, 10);
  const h11 = pickHouse(houses, 11);
  const yogas = [];
  const moonHouse = Number(moon?.house);
  const jupiterHouse = Number(jupiter?.house);
  if (Number.isFinite(moonHouse) && Number.isFinite(jupiterHouse)) {
    const rel = ((jupiterHouse - moonHouse + 12) % 12) + 1;
    if ([1, 4, 7, 10].includes(rel)) {
      yogas.push({ id: "gaja_kesari", title: "가자케사리 요가", summary: "달과 목성이 켄드라로 호응해 보호, 명예, 배움의 복을 키웁니다." });
    }
  }
  if (["exalted", "own"].includes(clean(venus?.dignity))) {
    yogas.push({ id: "lakshmi", title: "락슈미 요가", summary: "금성이 강해 사랑, 미감, 풍요를 현실 자원으로 바꾸는 힘이 살아납니다." });
  }
  if ([1, 4, 7, 10].includes(Number(saturn?.house)) && ["exalted", "own"].includes(clean(saturn?.dignity))) {
    yogas.push({ id: "shasha", title: "샤샤 요가", summary: "토성이 켄드라에서 강해 장기 책임, 조직력, 늦게 완성되는 권위를 줍니다." });
  }
  if (clean(h9?.lord) && clean(h10?.lord) && clean(h9.lord) === clean(h10.lord)) {
    yogas.push({ id: "raja_lord_bridge", title: "라자 요가 신호", summary: "9하우스와 10하우스의 지배 흐름이 이어져 공부와 사회적 역할이 함께 상승합니다." });
  }
  if (safeArray(h2?.planets).length || safeArray(h11?.planets).length || [2, 11].includes(Number(jupiter?.house))) {
    yogas.push({ id: "dhana", title: "다나 요가 신호", summary: "2·11하우스 또는 목성의 재물 축이 살아 있어 수입과 축적의 통로를 만들 수 있습니다." });
  }
  return yogas.slice(0, 5);
}

function buildVedicChartInsights(chartJson = {}) {
  const chart = chartJson?.chart || {};
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const moon = pickPlanet(planets, "Moon");
  const sun = pickPlanet(planets, "Sun");
  const venus = pickPlanet(planets, "Venus");
  const mars = pickPlanet(planets, "Mars");
  const jupiter = pickPlanet(planets, "Jupiter");
  const saturn = pickPlanet(planets, "Saturn");
  const rahu = pickPlanet(planets, "Rahu");
  const ketu = pickPlanet(planets, "Ketu");
  const moonNk = chart?.nakshatra || {};
  const nkName = clean(moonNk?.name || moon?.nakshatra);
  const nkMeaning = VEDIC_NAKSHATRA_INTERPRETATION[nkName] || VEDIC_NAKSHATRA_INTERPRETATION.Ashwini;
  const activeDasha = normalizePlanetName(chart?.dashas?.currentMahaDasha) || normalizePlanetName(chart?.dashas?.periods?.[0]?.lord) || "Moon";
  const dashaMeaning = VEDIC_DASHA_INTERPRETATION[activeDasha] || VEDIC_DASHA_INTERPRETATION.Moon;
  const karakas = computeJaiminiKarakas(planets);
  const drishti = buildVedicDrishti(planets);
  const yogas = buildCoreVedicYogas(planets, houses);
  const strongPlanets = planets
    .filter((planet) => ["exalted", "own"].includes(clean(planet?.dignity)))
    .map((planet) => PLANET_KO[planet.name] || planet.name);
  const weakPlanets = planets
    .filter((planet) => clean(planet?.dignity) === "debilitated")
    .map((planet) => PLANET_KO[planet.name] || planet.name);
  return {
    version: "vedic-insights-v1",
    nakshatra: {
      name: nkName,
      pada: Number.isFinite(Number(moonNk?.pada || moon?.pada)) ? Number(moonNk?.pada || moon.pada) : null,
      lord: clean(moonNk?.lord) || clean(moon?.nakshatraLord),
      instinct: nkMeaning.instinct,
      shadow: nkMeaning.shadow,
      advice: nkMeaning.advice,
      summary: `${nkName || "나크샤트라"}는 ${nkMeaning.instinct}을 품고 있으며, 그림자는 ${nkMeaning.shadow}으로 드러납니다.`,
    },
    dasha: {
      current: activeDasha,
      currentKo: PLANET_KO[activeDasha] || activeDasha,
      nextKo: clean(chart?.dashas?.currentAntarDasha),
      theme: dashaMeaning.theme,
      opportunity: dashaMeaning.opportunity,
      caution: dashaMeaning.caution,
      advice: dashaMeaning.advice,
    },
    karakas,
    drishti,
    yogas,
    dignity: {
      strongPlanets,
      weakPlanets,
      summary: `${strongPlanets.length ? `강한 행성은 ${strongPlanets.join(", ")}` : "강한 행성은 생활 속 반복으로 키워야 합니다"}. ${weakPlanets.length ? `보강할 행성은 ${weakPlanets.join(", ")}` : "쇠약 신호가 크지 않아 기본 흐름은 비교적 균형적입니다"}.`,
    },
    cards: [
      {
        id: "soul",
        title: "영혼의 출발점",
        text: `라그나 ${clean(chart.lagnaSign) || "라그나"}와 달 ${clean(chart.moonSign) || clean(moon?.sign) || "문 사인"}이 이번 생의 기본 자세를 이룹니다. 태양 ${clean(chart.sunSign) || clean(sun?.sign) || "태양"}은 세상에 드러낼 중심의 빛입니다.`,
      },
      {
        id: "nakshatra",
        title: "달의 별자리",
        text: `${nkName || "나크샤트라"} ${Number(moonNk?.pada || moon?.pada || 0) || ""}파다는 ${nkMeaning.instinct}을 열고, ${nkMeaning.advice}`,
      },
      {
        id: "dasha",
        title: "현재 다샤",
        text: `${PLANET_KO[activeDasha] || activeDasha} 다샤는 ${dashaMeaning.theme}을 삶의 전면에 올립니다. ${dashaMeaning.advice}`,
      },
      {
        id: "love",
        title: "사랑과 인연",
        text: `7하우스 ${clean(pickHouse(houses, 7)?.sign) || "관계의 자리"}, 금성 ${clean(venus?.sign) || "금성"}, 화성 ${clean(mars?.sign) || "화성"}이 끌림과 지속성의 온도를 나눠 보여 줍니다.`,
      },
      {
        id: "career_money",
        title: "직업과 재물",
        text: `10하우스 ${clean(pickHouse(houses, 10)?.sign) || "사회적 역할"}, 2하우스 ${clean(pickHouse(houses, 2)?.sign) || "축적"}, 11하우스 ${clean(pickHouse(houses, 11)?.sign) || "수익"}가 일과 돈의 실제 길을 만듭니다. 목성 ${clean(jupiter?.sign) || "목성"}은 확장, 토성 ${clean(saturn?.sign) || "토성"}은 지속성을 맡습니다.`,
      },
      {
        id: "karma",
        title: "카르마 축",
        text: `라후 ${clean(rahu?.sign) || "라후"}는 낯선 성장의 문이고, 케투 ${clean(ketu?.sign) || "케투"}는 이미 익숙한 습관입니다. 편한 길에서 배운 힘을 낯선 선택으로 옮길 때 운의 방향이 바뀝니다.`,
      },
    ],
  };
}

export function buildVedicLocalChartJson(rawInput = {}, options = {}) {
  const strictPremium = options?.strictPremium === true;
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  let chartSource = pickNestedChartSource(rawInput);
  let calculationMode = "full";

  const hasPlanetData = Object.keys(chartSource?.planets || {}).length > 0;
  const hasAsc = Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude));
  if (!hasPlanetData || !hasAsc) {
    if (strictPremium) {
      const error = new Error("베다점 프리미엄 PDF에 필요한 라그나와 행성 계산값이 없습니다.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      error.details = { hasPlanetData, hasAsc };
      throw error;
    }
    chartSource = fallbackChartSourceFromBirthInput(birthInput);
    calculationMode = hasPlanetData || hasAsc ? "basic" : "recovered";
  }

  const ayanamsa = clean(chartSource.ayanamsaName || chartSource.ayanamsaType || chartSource.ayanamsa) || "Lahiri";
  const lagnaLon = normalizeDegree(chartSource.ascendantSidereal ?? chartSource.ascendant ?? chartSource.lagnaLongitude);
  const lagnaSign = signFromLongitude(lagnaLon);

  const planets = normalizePlanetMap(
    chartSource.planets || {},
    chartSource.retrograde || {},
    lagnaLon,
  );

  const moon = pickPlanet(planets, "Moon");
  const sun = pickPlanet(planets, "Sun");
  const houses = buildWholeSignHouses(lagnaLon, planets);
  const aspects = buildSimpleAspects(planets);
  const moonNakshatra = moon?.nakshatra ? {
    name: moon.nakshatra,
    pada: moon.pada || null,
    lord: nakshatraFromLongitude(moon.longitude).lord || "",
  } : undefined;

  const chartJson = {
    birthInput,
    calculationMode,
    settings: {
      zodiac: "sidereal",
      ayanamsa,
      houseSystem: "whole-sign",
    },
    chart: {
      lagnaSign: lagnaSign.sign || "",
      moonSign: clean(moon?.sign),
      sunSign: clean(sun?.sign),
      atmakaraka: "",
      nakshatra: moonNakshatra,
      planets: planets.map((planet) => ({
        name: planet.name,
        nameKo: PLANET_KO[planet.name] || planet.name,
        sign: clean(planet.sign),
        signEn: clean(planet.signEn),
        degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree) : undefined,
        longitude: Number.isFinite(Number(planet.longitude)) ? Number(planet.longitude) : undefined,
        house: Number.isFinite(Number(planet.house)) ? Number(planet.house) : undefined,
        nakshatra: clean(planet.nakshatra) || undefined,
        pada: Number.isFinite(Number(planet.pada)) ? Number(planet.pada) : undefined,
        retrograde: Boolean(planet.retrograde),
        dignity: DIGNITY.includes(String(planet.dignity)) ? planet.dignity : "unknown",
      })),
      houses,
      aspects,
      dashas: buildVimshottariFromMoon(nakshatraFromLongitude(moon?.longitude)),
    },
    interpretationSeeds: {
      personalityKeywords: [],
      soulKeywords: [],
      careerKeywords: [],
      moneyKeywords: [],
      relationshipKeywords: [],
      familyKeywords: [],
      healthKeywords: [],
      timingKeywords: [],
      karmaKeywords: [],
      cautionKeywords: [],
      growthKeywords: [],
    },
  };

  const englishPlanetMap = normalizePlanetMap(
    chartSource.planets || {},
    chartSource.retrograde || {},
    lagnaLon,
  );
  chartJson.chart.atmakaraka = clean(computeAtmakaraka(englishPlanetMap));
  chartJson.chart.karakas = computeJaiminiKarakas(englishPlanetMap);
  chartJson.insights = buildVedicChartInsights(chartJson);
  chartJson.interpretationSeeds = baseKeywordsFromChart(chartJson);
  return chartJson;
}

function chapterSignalBundle(chartJson) {
  const chart = chartJson.chart || {};
  const moon = clean(chart.moonSign);
  const sun = clean(chart.sunSign);
  const lagna = clean(chart.lagnaSign);
  const nk = clean(chart.nakshatra?.name);
  const dasha = clean(chart.dashas?.currentMahaDasha);
  const house10 = clean(pickHouse(chart.houses, 10)?.sign);
  const house7 = clean(pickHouse(chart.houses, 7)?.sign);
  const house2 = clean(pickHouse(chart.houses, 2)?.sign);
  const house11 = clean(pickHouse(chart.houses, 11)?.sign);

  return {
    lagna,
    moon,
    sun,
    nk,
    dasha,
    house10,
    house7,
    house2,
    house11,
  };
}

function buildSectionBody(chapter, section, chartJson, sectionIndex) {
  const context = chartJson?.pdfContext || normalizeVedicPdfContext({}, chartJson);
  const chapterId = clean(chapter?.id || "vedic_soul_map");
  const sectionTitle = clean(section?.title || `세부 해석 ${sectionIndex + 1}`);
  const lagnaEn = clean(context?.lagna?.sign || "Pisces");
  const lagnaKo = clean(context?.lagna?.signKo || "물고기자리");
  const lagnaLord = clean(context?.lagna?.lord || "Jupiter");
  const moon = findPlanetByName(context?.planets, "Moon");
  const sun = findPlanetByName(context?.planets, "Sun");
  const venus = findPlanetByName(context?.planets, "Venus");
  const mars = findPlanetByName(context?.planets, "Mars");
  const mercury = findPlanetByName(context?.planets, "Mercury");
  const jupiter = findPlanetByName(context?.planets, "Jupiter");
  const saturn = findPlanetByName(context?.planets, "Saturn");
  const rahu = findPlanetByName(context?.planets, "Rahu");
  const ketu = findPlanetByName(context?.planets, "Ketu");
  const moonSign = clean(moon?.rashi || "Aries");
  const moonBhava = Number(moon?.bhava || 2);
  const moonNk = clean(context?.moonNakshatra?.name || moon?.nakshatra || "Ashwini");
  const moonPada = Number(context?.moonNakshatra?.pada || moon?.pada || 1);
  const moonLord = clean(context?.moonNakshatra?.lord || "Moon");
  const activeDasha = clean(context?.derived?.activeDasha || "Moon");
  const nextDasha = clean(context?.derived?.nextDasha || "Mars");
  const atmakaraka = clean(context?.karakas?.atmakaraka || chartJson?.chart?.atmakaraka || "목성");
  const darakaraka = clean(context?.karakas?.darakaraka || PLANET_KO.Venus);
  const house1 = Number(pickHouse(context?.bhavas, 1)?.number || 1);
  const house2 = Number(pickHouse(context?.bhavas, 2)?.number || 2);
  const house4 = Number(pickHouse(context?.bhavas, 4)?.number || 4);
  const house7 = Number(pickHouse(context?.bhavas, 7)?.number || 7);
  const house10 = Number(pickHouse(context?.bhavas, 10)?.number || 10);
  const house11 = Number(pickHouse(context?.bhavas, 11)?.number || 11);
  const house12 = Number(pickHouse(context?.bhavas, 12)?.number || 12);
  const strongest = safeArray(context?.derived?.strongestPlanets)
    .map((name) => PLANET_KO[name] || name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ") || "금성, 목성, 토성";
  const signMeaning = VEDIC_SIGN_INTERPRETATION[lagnaEn] || VEDIC_SIGN_INTERPRETATION.Pisces;
  const nkMeaning = VEDIC_NAKSHATRA_INTERPRETATION[moonNk] || VEDIC_NAKSHATRA_INTERPRETATION.Ashwini;
  const dashaMeaning = VEDIC_DASHA_INTERPRETATION[activeDasha] || VEDIC_DASHA_INTERPRETATION.Moon;
  const insights = chartJson?.insights || {};
  const insightCard = safeArray(insights?.cards)[sectionIndex % Math.max(1, safeArray(insights?.cards).length)] || {};
  const yogaLine = safeArray(insights?.yogas).map((yoga) => clean(yoga?.title)).filter(Boolean).slice(0, 3).join(", ");
  const drishtiLine = safeArray(insights?.drishti).slice(0, 4).map((item) => `${clean(item?.grahaKo)}→${Number(item?.targetHouse || 0)}하우스`).filter(Boolean).join(", ");
  const dignityLine = clean(insights?.dignity?.summary);
  const focusMap = {
    vedic_soul_map: `라그나 ${lagnaKo}, 문 사인 ${moonSign}, 태양 ${clean(sun?.rashi || "Leo")}을 한 장의 설계도처럼 겹쳐 보며 삶 전체의 방향을 정리합니다.`,
    vedic_lagna: `라그나 ${lagnaKo}와 ${house1}하우스의 리듬을 통해 첫인상, 생존 전략, 몸의 반응 속도를 읽습니다.`,
    vedic_moon_nakshatra: `달 ${moonSign}, 나크샤트라 ${moonNk}, 나크샤트라 로드 ${moonLord}를 통해 감정의 결을 해석합니다.`,
    vedic_sun_self: `태양 ${clean(sun?.rashi || "Leo")}과 ${house10}하우스 책임감을 연결해 자아와 권위의 쓰임을 설명합니다.`,
    vedic_planet_talents: `수성 ${clean(mercury?.rashi || "Gemini")}, 금성 ${clean(venus?.rashi || "Taurus")}, 화성 ${clean(mars?.rashi || "Aries")}, 목성 ${clean(jupiter?.rashi || "Sagittarius")}, 토성 ${clean(saturn?.rashi || "Capricorn")}의 재능 배치를 읽습니다.`,
    vedic_bhavas: `${house1}·${house2}·${house4}·${house7}·${house10}하우스를 중심으로 삶의 영역별 과제를 설명합니다.`,
    vedic_career_success: `${house10}하우스, 태양, 목성, 토성, 현재 ${activeDasha} 다샤를 활용해 직업 방향을 구체화합니다.`,
    vedic_money_flow: `${house2}하우스와 ${house11}하우스, 금성과 목성, 토성의 흐름으로 돈의 축적 방식을 해석합니다.`,
    vedic_love_partnership: `${house7}하우스, 금성 ${clean(venus?.rashi || "Taurus")}, 화성 ${clean(mars?.rashi || "Aries")}, 달 ${moonSign}, 다라카라카 ${darakaraka}를 통해 관계 패턴을 읽습니다.`,
    vedic_dasha_flow: `현재 ${activeDasha} 마하다샤와 다음 ${nextDasha} 흐름을 중심으로 지금의 과목을 설명합니다.`,
    vedic_karma_growth: `라후 ${clean(rahu?.rashi || "Aquarius")}, 케투 ${clean(ketu?.rashi || "Leo")}, ${house12}하우스와 나크샤트라 ${moonNk}를 통해 카르마 축을 설명합니다.`,
    vedic_master_plan: `라그나 ${lagnaKo}, 아트마카라카 ${atmakaraka}, 다샤 ${activeDasha}를 하나의 3년 계획으로 통합합니다.`,
  };
  const realityMap = {
    vedic_soul_map: `전체 차트를 넓게 보면 지금 삶의 핵심 배움은 무엇을 붙들고 무엇을 내려놓아야 하는지 우선순위를 세우는 데 있습니다. ${sectionTitle}에서 드러나는 당신의 패턴은 한번 마음을 정하면 깊게 밀고 나가지만, 감정의 파고가 올라오는 날에는 달과 나크샤트라가 주변 분위기까지 흡수해 판단을 무겁게 만들 수 있다는 점입니다.`,
    vedic_lagna: `라그나는 단순한 성격표가 아니라 세상을 처음 맞닥뜨릴 때의 자세입니다. ${sectionTitle}를 보면 당신은 먼저 상황의 결을 읽고 자신의 기준을 세우려는 편이며, 라그나 로드 ${lagnaLord}의 성질 때문에 몸의 리듬이 흔들리면 결정력도 함께 출렁일 수 있습니다.`,
    vedic_moon_nakshatra: `달과 나크샤트라는 마음이 어디에서 안정을 찾고 어디에서 소모되는지 보여줍니다. ${sectionTitle}에서는 ${moonBhava}하우스의 달이 감정 정보를 크게 받아들이는 만큼 관계의 미세한 변화와 말투의 온도까지 민감하게 읽어내는 장면이 자주 보입니다.`,
    vedic_sun_self: `태양은 스스로를 세상에 증명하는 방식입니다. ${sectionTitle}에서 보이는 핵심은 인정 욕구를 숨기려 하기보다, 어떤 기준에서 자신을 빛내고 싶은지 명확히 해야 한다는 점입니다.`,
    vedic_planet_talents: `행성 재능은 재주 목록이 아니라 실제 선택 전략입니다. ${sectionTitle}에서는 강한 행성 ${strongest}이 당신의 성과를 빠르게 끌어올리고, 약한 행성이 만든 틈은 일정 관리나 관계 피로 형태로 먼저 드러난다는 점이 중요합니다.`,
    vedic_bhavas: `하우스는 인생의 장면을 나누는 무대입니다. ${sectionTitle}를 읽으면 관계, 돈, 집, 일의 문제가 따로 터지는 것이 아니라 하나의 축에서 동시에 흔들릴 수 있다는 사실이 분명해집니다.`,
    vedic_career_success: `직업운은 적성 한 단어로 끝나지 않습니다. ${sectionTitle}의 흐름을 보면 조직형, 전문가형, 상담형, 콘텐츠형 가능성이 모두 보이지만 무엇이 오래 가는지는 토성과 목성의 호흡, 그리고 현재 다샤가 요구하는 공부를 받아들이는 태도에 달려 있습니다.`,
    vedic_money_flow: `재물운은 벌어들이는 힘과 지키는 힘이 동시에 작동해야 합니다. ${sectionTitle}를 보면 당신은 수입의 통로를 넓힐 재능이 있으면서도 감정이 흔들릴 때 지출 판단이 느슨해질 수 있어, 돈을 버는 일과 보존하는 규칙을 분리해 운영해야 합니다.`,
    vedic_love_partnership: `사랑과 배우자운은 끌림만으로 읽지 않습니다. ${sectionTitle}에서는 금성과 화성이 만드는 설렘, 달이 원하는 정서적 안전, 다라카라카 ${darakaraka}가 요구하는 관계의 성숙이 함께 작동합니다.`,
    vedic_dasha_flow: `다샤는 예언보다 시기의 과목을 알려 줍니다. ${sectionTitle}에서 현재 ${activeDasha}는 ${dashaMeaning.theme}을 반복해 보여 주고, 다음 ${nextDasha}는 아직 정리되지 않은 숙제를 확대해 드러낼 준비를 하고 있습니다.`,
    vedic_karma_growth: `라후와 케투는 이번 생의 성장축입니다. ${sectionTitle}를 보면 익숙해서 쉽게 선택하는 패턴과 두렵지만 반드시 배워야 하는 방향이 분명히 갈리며, 그 갈림길에서 성숙이 시작됩니다.`,
    vedic_master_plan: `최종 계획은 동기부여 문구가 아니라 차트 전체를 삶의 시간표로 바꾸는 작업입니다. ${sectionTitle}에서 가장 중요한 점은 앞으로 3년을 한 번에 바꾸려 하지 말고, 운이 열리는 순서대로 체력, 수익, 관계를 재배치하는 것입니다.`,
  };
  const cautionMap = {
    vedic_soul_map: `${signMeaning.shadow} ${nkMeaning.shadow} 이 조합은 중요한 결정을 앞두고 과도한 책임감을 만들 수 있으므로, 큰 선택일수록 기준 문장을 먼저 적어 두는 편이 좋습니다.`,
    vedic_lagna: `라그나 축이 피곤해지면 남의 속도에 맞추려는 습관이 강해지고, 그때 ${house4}하우스의 회복력이 무너지면 몸과 마음이 동시에 지칩니다.`,
    vedic_moon_nakshatra: `감정이 과열될 때는 상대의 말보다 분위기를 더 크게 받아들여 스스로 상처를 키울 수 있으니, 사실과 해석을 분리하는 훈련이 필수입니다.`,
    vedic_sun_self: `태양이 약해지는 순간에는 인정받지 못한다는 불안 때문에 오히려 중요한 역할을 과도하게 끌어안기 쉽습니다.`,
    vedic_planet_talents: `강점을 한꺼번에 모두 쓰려 하면 오히려 집중이 흩어집니다. 특히 수성과 화성의 속도가 빨라질 때 금성과 토성의 조율이 빠지면 관계 피로가 먼저 올라옵니다.`,
    vedic_bhavas: `${house2}하우스와 ${house7}하우스 문제가 한 번에 흔들리면 재정과 관계가 서로를 악화시키기 쉽습니다.`,
    vedic_career_success: `${house10}하우스 성취욕이 강한 만큼 다샤가 바뀌는 시기에는 무리한 확장보다 기반 정비가 우선입니다.`,
    vedic_money_flow: `${house11}하우스 확장 욕구가 강한 시기일수록 큰 수익보다 고정 누수를 먼저 닫아야 실제 자산이 남습니다.`,
    vedic_love_partnership: `관계에서 서운함을 바로 결론으로 바꾸면 달과 화성의 반응이 과열돼 같은 장면을 반복할 수 있습니다.`,
    vedic_dasha_flow: `다샤 전환기에는 마음이 급해지면서 여러 계획을 동시에 열고 싶어지지만, 한 시기의 과목은 하나씩 끝낼수록 힘이 붙습니다.`,
    vedic_karma_growth: `${house12}하우스와 라후·케투 축은 피하고 싶은 주제를 다시 불러오기도 하므로, 회피 자체를 문제로 보기보다 무엇이 두려운지 이름 붙이는 작업이 필요합니다.`,
    vedic_master_plan: `장기 계획에서 가장 경계해야 할 것은 감동이 큰 목표만 붙들고 생활 리듬을 비워 두는 일입니다.`,
  };
  const adviceMap = {
    vedic_soul_map: `베다 마스터의 조언은 단순합니다. 라그나 ${lagnaKo}가 원하는 출발점과 달 ${moonSign}이 원하는 안정 조건을 같은 날 달성하려 하지 말고, 하루에는 한 축만 확실히 지키십시오.`,
    vedic_lagna: `아침 첫 30분을 남에게 주지 말고 몸의 속도를 먼저 정하십시오. 라그나가 안정되면 차트의 좋은 신호가 실제 행동으로 내려옵니다.`,
    vedic_moon_nakshatra: `감정이 올라오는 순간 결론부터 말하지 말고, 마음이 왜 흔들렸는지 한 문장으로 적으십시오. 그 문장이 당신의 나크샤트라를 보호하는 경계선이 됩니다.`,
    vedic_sun_self: `인정받기 위해 더 많은 일을 떠안는 방식 대신, 자신이 책임질 기준을 먼저 밝히십시오. 태양은 기준이 선명할수록 빛이 납니다.`,
    vedic_planet_talents: `가장 강한 행성 하나를 이번 달 대표 전략으로 삼고, 나머지 행성은 보조 역할로 배치하십시오. 그러면 성과의 밀도가 올라갑니다.`,
    vedic_bhavas: `관계, 돈, 집, 일 중 가장 먼저 흔들리는 영역을 찾고 그 한 축을 회복의 출발점으로 삼으십시오. 다른 하우스는 그 뒤에 따라옵니다.`,
    vedic_career_success: `90일 안에 한 분야의 전문성 흔적을 남기십시오. 글, 포트폴리오, 상담 사례, 실적 기록처럼 눈에 보이는 형태가 중요합니다.`,
    vedic_money_flow: `수입 계획과 지출 규칙을 따로 쓰십시오. 벌어들이는 전략과 지키는 전략을 같은 종이에 적을 때 재물운이 안정됩니다.`,
    vedic_love_partnership: `사랑에서 필요한 것은 참음이 아니라 정확한 전달입니다. 감정, 요구, 경계선을 순서대로 말하는 습관을 들이십시오.`,
    vedic_dasha_flow: `${activeDasha} 시기의 과목을 한 문장으로 정리하고 앞으로 90일 동안 그 문장에 맞는 행동만 남기십시오.`,
    vedic_karma_growth: `라후는 낯설지만 성장하는 문이고 케투는 익숙하지만 오래 머물면 멈추는 자리입니다. 편한 습관을 줄이고 두려운 공부를 늘리십시오.`,
    vedic_master_plan: `앞으로 3년은 체력 회복, 핵심 수익, 관계 확장의 순서로 놓으십시오. 그 순서를 지키는 사람이 차트를 오래 누립니다.`,
  };
  const taskMap = {
    vedic_soul_map: `이번 주에는 가장 중요한 목표 두 개만 남기고 나머지는 뒤로 미루십시오. 그 두 목표가 라그나와 달의 합의를 이룰 때 전체 운세가 정렬됩니다.`,
    vedic_lagna: `기상 직후와 잠들기 전의 루틴을 고정하고, 몸이 무거운 날에는 약속 수를 줄여 라그나의 체력을 보호하십시오.`,
    vedic_moon_nakshatra: `감정이 크게 흔들린 날의 트리거, 몸의 반응, 회복까지 걸린 시간을 기록해 다음 보름 동안 패턴을 확인하십시오.`,
    vedic_sun_self: `당신이 책임지고 싶은 영역 하나를 정하고 그 분야에서 지킬 기준 세 문장을 작성하십시오.`,
    vedic_planet_talents: `수성은 기록, 금성은 관계, 화성은 실행, 목성은 배움, 토성은 반복으로 구분해 한 주 계획표를 다시 짜십시오.`,
    vedic_bhavas: `${house1}·${house2}·${house4}·${house7}·${house10}하우스에 대응하는 생활 항목을 각각 하나씩 적고, 이번 달에는 가장 약한 한 영역만 우선 보강하십시오.`,
    vedic_career_success: `조직형, 전문가형, 창업형, 상담형, 콘텐츠형 중 지금 가장 가까운 길 하나를 선택해 90일 안에 증거를 남기십시오.`,
    vedic_money_flow: `고정 지출 세 가지를 점검하고, 다음 달까지 유지할 축적 규칙 한 가지를 숫자로 정하십시오.`,
    vedic_love_partnership: `관계에서 반복되는 서운함 하나를 선택해, 사실 전달 문장과 감정 표현 문장을 분리해 써 보십시오.`,
    vedic_dasha_flow: `지금 다샤가 요구하는 과제 한 가지를 정해 90일 실행표로 만들고 매주 완료 여부를 표시하십시오.`,
    vedic_karma_growth: `나를 지치게 하는 익숙한 습관 하나와, 낯설지만 성장시키는 선택 하나를 적어 매주 교차 실천하십시오.`,
    vedic_master_plan: `앞으로 3년 동안 반드시 키울 힘 하나, 내려놓을 습관 하나, 가장 빛나는 선택 하나를 문장으로 선언하십시오.`,
  };

  const sections = [
    ["핵심 진단", `${sectionTitle}에서 가장 먼저 보이는 사실은 ${focusMap[chapterId] || focusMap.vedic_soul_map} 라그나 로드 ${lagnaLord}는 ${signMeaning.core}을 만들고, 달 ${moonSign}과 나크샤트라 ${moonNk} ${moonPada}파다는 ${sectionTitle}를 다룰 때 감정의 결을 섬세하게 조정합니다. 특히 이 카테고리에서는 ${sectionIndex + 1}번째 관문에서 무엇을 먼저 선택하느냐가 이후 흐름을 바꾸므로, 차트는 막연한 위로보다 선택의 순서를 분명히 제시하는 지도에 가깝습니다.`],
    ["차트 근거", `${sectionTitle}의 차트 근거는 매우 구체적입니다. 태양 ${clean(sun?.rashi || "Leo")}, 수성 ${clean(mercury?.rashi || "Gemini")}, 금성 ${clean(venus?.rashi || "Taurus")}, 화성 ${clean(mars?.rashi || "Aries")}, 목성 ${clean(jupiter?.rashi || "Sagittarius")}, 토성 ${clean(saturn?.rashi || "Capricorn")}이 ${sectionTitle}에서 역할을 나누고, 라후 ${clean(rahu?.rashi || "Aquarius")}와 케투 ${clean(ketu?.rashi || "Leo")} 축은 여기서 욕망과 익숙함의 방향을 갈라놓습니다. ${yogaLine ? `감지되는 핵심 요가는 ${yogaLine}이며, ` : ""}${drishtiLine ? `드리슈티는 ${drishtiLine} 흐름으로 압력을 보냅니다. ` : ""}${dignityLine || ""} 또한 현재 ${activeDasha} 다샤와 다음 ${nextDasha} 흐름이 겹치므로, 이 단락은 지금 배워야 할 과목과 미뤄야 할 유혹을 동시에 읽게 만듭니다. ${clean(insightCard?.text)}`],
    ["현실에서 드러나는 모습", `${sectionTitle}를 현실 장면으로 옮기면 ${(realityMap[chapterId] || realityMap.vedic_soul_map)} ${sectionTitle}의 장면에서는 말 한마디, 일정 하나, 돈을 쓰는 방식 하나가 곧바로 라그나와 달의 반응으로 이어지기 때문에, 겉으로는 사소해 보이는 생활 습관이 실제 운의 체감 차이를 크게 만듭니다.`],
    ["주의해야 할 흐름", `${sectionTitle}에서 특히 조심할 흐름은 ${(cautionMap[chapterId] || cautionMap.vedic_soul_map)} ${sectionTitle}를 다룰 때는 같은 문제를 감정, 관계, 일정 세 축으로 동시에 크게 해석하지 말고 어떤 하우스가 먼저 흔들렸는지부터 확인해야 손실을 줄일 수 있습니다.`],
    ["베다 마스터의 조언", `${sectionTitle}에 대한 베다 마스터의 조언은 다음과 같습니다. ${adviceMap[chapterId] || adviceMap.vedic_soul_map} 아트마카라카 ${atmakaraka}가 보여 주는 영혼의 방향과 ${house7}하우스, ${house10}하우스의 현실 과제를 함께 읽어야 ${sectionTitle} 상담이 삶에 닿습니다. ${dashaMeaning.advice || signMeaning.advice}`],
    ["실천 과제", `${sectionTitle}의 실천 과제는 분명합니다. ${taskMap[chapterId] || taskMap.vedic_soul_map} 이 과제를 실행할 때는 ${strongest}의 장점을 먼저 앞세우고, 달이 예민해지는 날에는 판단보다 기록을 먼저 두십시오. 그러면 ${sectionTitle}의 통찰이 추상적 문장으로 끝나지 않고, 관계·일·돈·회복의 장면에서 서로 다른 행동으로 구체화됩니다.`],
  ];

  let body = sections.map(function (item) {
    return item[0] + "\n\n" + item[1];
  }).join("\n\n");
  body = sanitizeVedicPremiumText(body).replace(FORBIDDEN_TEXT_RE, "").trim();

  if (body.length < MIN_SECTION_CHARS) {
    const filler = `\n\n실천 과제\n\n추가 실행 지침으로는 첫째, 결정이 급해질수록 사실 확인 문장을 먼저 적고 둘째, 다음 14일 동안 관계·일·돈 중 한 축만 최우선으로 두며 셋째, 다샤 변화에 따라 체력과 일정의 밀도를 조절하는 것입니다. 이 세 단계를 지키면 ${sectionTitle}에서 읽힌 차트 근거가 실제 생활에서 안정적인 결과로 이어집니다.`;
    body = sanitizeVedicPremiumText(`${body}${filler}`).replace(FORBIDDEN_TEXT_RE, "").trim();
  }

  return body;
}

function chapterTextLength(chapter) {
  const sections = safeArray(chapter?.sections);
  return sections.reduce((sum, section) => sum + clean(section?.body).length, 0);
}

function allTextLength(chapters) {
  return safeArray(chapters).reduce((sum, chapter) => sum + chapterTextLength(chapter), 0);
}

function collectSignals(chapter, chartJson) {
  const planets = safeArray(chartJson?.chart?.planets)
    .filter((planet) => clean(planet.sign))
    .map((planet) => clean(planet.name))
    .filter(Boolean);
  const houses = safeArray(chartJson?.chart?.houses)
    .map((house) => Number(house.house))
    .filter((house) => Number.isFinite(house));

  return {
    minLengthPassed: chapterTextLength(chapter) >= MIN_CHAPTER_CHARS,
    usedPlanets: Array.from(new Set(planets)).slice(0, 10),
    usedHouses: Array.from(new Set(houses)).slice(0, 12),
    usedNakshatras: [clean(chartJson?.chart?.nakshatra?.name)].filter(Boolean),
    usedDashas: [clean(chartJson?.chart?.dashas?.currentMahaDasha)].filter(Boolean),
    usedSignals: [
      clean(chartJson?.chart?.lagnaSign),
      clean(chartJson?.chart?.moonSign),
      clean(chartJson?.chart?.sunSign),
    ].filter(Boolean),
  };
}

export function buildVedicLocalPremiumManuscript(chartJson, options = {}) {
  const onChapterDone = typeof options?.onChapterDone === "function" ? options.onChapterDone : () => {};
  const chapters = VEDIC_PREMIUM_CHAPTERS.map((chapter, index) => {
    const sections = chapter.categories.map((category, index) => ({
      id: category.id,
      title: category.title,
      body: buildSectionBody(chapter, category, chartJson, index),
      bullets: [],
    }));

    const draft = {
      chapterNo: Number(chapter.order),
      id: chapter.id,
      key: chapter.key,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      sections,
      localQuality: {
        minLengthPassed: false,
        usedPlanets: [],
        usedHouses: [],
        usedNakshatras: [],
        usedDashas: [],
        usedSignals: [],
      },
    };

    draft.localQuality = collectSignals(draft, chartJson);
    onChapterDone({
      chapterNo: Number(chapter.order),
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterLength: chapterTextLength(draft),
      completed: index + 1,
      total: VEDIC_PREMIUM_CHAPTERS.length,
    });
    return draft;
  });

  return {
    chapters,
    chapterCount: chapters.length,
    totalLength: allTextLength(chapters),
  };
}

function normalizeManuscriptError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_err) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

export function normalizeVedicError(error) {
  return normalizeManuscriptError(error);
}

function cleanForbidden(text) {
  return sanitizeVedicPremiumText(String(text || "")).replace(FORBIDDEN_TEXT_RE, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeChapterTitleForDisplay(title) {
  const raw = clean(title);
  if (!raw) return "";
  return raw.split("—")[0].trim();
}

function compactVedicPlanetForLlm(planet = {}) {
  const name = normalizePlanetName(planet?.name || planet?.graha) || clean(planet?.name || planet?.graha);
  return {
    name,
    nameKo: PLANET_KO[name] || clean(planet?.grahaKo || planet?.name),
    sign: clean(planet?.sign || planet?.signKo || planet?.rashiKo),
    signEn: clean(planet?.signEn || planet?.rashi),
    house: Number.isFinite(Number(planet?.house || planet?.bhava)) ? Number(planet?.house || planet?.bhava) : undefined,
    degree: Number.isFinite(Number(planet?.degree)) ? Number(planet.degree) : undefined,
    nakshatra: clean(planet?.nakshatra),
    pada: Number.isFinite(Number(planet?.pada)) ? Number(planet.pada) : undefined,
    nakshatraLord: clean(planet?.nakshatraLord),
    dignity: clean(planet?.dignity),
    retrograde: Boolean(planet?.retrograde),
  };
}

function compactVedicHouseForLlm(house = {}) {
  return {
    house: Number(house?.house || house?.number || 0),
    sign: clean(house?.sign || house?.rashiKo),
    signEn: clean(house?.signEn || house?.rashi),
    lord: clean(house?.lord),
    planets: safeArray(house?.planets).map((item) => clean(item)).filter(Boolean),
  };
}

function signalValue(value, emptyFallback = "") {
  if (Array.isArray(value)) {
    const joined = value.map((item) => clean(item)).filter(Boolean).join(", ");
    return joined || clean(emptyFallback);
  }
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return clean(value) || clean(emptyFallback);
}

function addVedicEvidenceSignal(signals, id, label, value, kind = "chart", emptyFallback = "") {
  const normalizedValue = signalValue(value, emptyFallback);
  if (!clean(id) || !normalizedValue) return;
  signals.push({
    id: clean(id),
    label: clean(label),
    value: normalizedValue,
    kind: clean(kind),
  });
}

function resolveKarakaValue(value) {
  if (typeof value === "string") return clean(value);
  return clean(value?.planetKo || value?.planet || value?.name || value?.grahaKo || value?.graha);
}

function buildVedicEvidencePack(chartJson = {}, chapter = {}) {
  const context = chartJson?.pdfContext || normalizeVedicPdfContext({}, chartJson);
  const chart = chartJson?.chart || {};
  const planets = safeArray(chart?.planets).length ? safeArray(chart.planets) : safeArray(context?.planets);
  const houses = safeArray(chart?.houses).length ? safeArray(chart.houses) : safeArray(context?.bhavas);
  const compactPlanets = planets.map(compactVedicPlanetForLlm).filter((planet) => clean(planet.name));
  const compactHouses = houses.map(compactVedicHouseForLlm).filter((house) => house.house >= 1 && house.house <= 12);
  const activeDasha = clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha);
  const currentAntarDasha = clean(chart?.dashas?.currentAntarDasha || context?.dashas?.currentAntarDasha);
  const dashaPeriods = safeArray(chart?.dashas?.periods).length ? safeArray(chart.dashas.periods) : safeArray(context?.dasha);
  const karakas = context?.karakas || chart?.karakas || {};
  const moonNakshatra = context?.moonNakshatra || chart?.nakshatra || {};
  const firstHouse = compactHouses.find((house) => Number(house.house) === 1) || {};
  const signals = [];

  addVedicEvidenceSignal(signals, "core.lagna.sign", "라그나 사인", chart?.lagnaSign || context?.lagna?.signKo, "core");
  addVedicEvidenceSignal(signals, "core.lagna.signEn", "라그나 사인 영문", context?.lagna?.sign, "core");
  addVedicEvidenceSignal(signals, "core.lagna.lord", "라그나 로드", context?.lagna?.lord || firstHouse?.lord, "core");
  addVedicEvidenceSignal(signals, "core.moon.sign", "문 사인", chart?.moonSign, "core");
  addVedicEvidenceSignal(signals, "core.sun.sign", "태양 사인", chart?.sunSign, "core");
  addVedicEvidenceSignal(signals, "core.moon.nakshatra.name", "문 나크샤트라", moonNakshatra?.name, "nakshatra");
  addVedicEvidenceSignal(signals, "core.moon.nakshatra.pada", "문 나크샤트라 파다", moonNakshatra?.pada, "nakshatra");
  addVedicEvidenceSignal(signals, "core.moon.nakshatra.lord", "문 나크샤트라 로드", moonNakshatra?.lord, "nakshatra");
  addVedicEvidenceSignal(signals, "dasha.current.maha", "현재 마하 다샤", activeDasha, "dasha");
  addVedicEvidenceSignal(signals, "dasha.current.antar", "현재 안타르 다샤", currentAntarDasha, "dasha");
  addVedicEvidenceSignal(signals, "dasha.next", "다음 다샤", context?.derived?.nextDasha, "dasha");
  addVedicEvidenceSignal(signals, "karaka.atmakaraka", "아트마카라카", resolveKarakaValue(karakas?.atmakaraka), "karaka");
  addVedicEvidenceSignal(signals, "karaka.amatyakaraka", "아마티아카라카", resolveKarakaValue(karakas?.amatyakaraka), "karaka");
  addVedicEvidenceSignal(signals, "karaka.darakaraka", "다라카라카", resolveKarakaValue(karakas?.darakaraka), "karaka");

  compactPlanets.forEach((planet) => {
    addVedicEvidenceSignal(signals, `planet.${planet.name}.sign`, `${planet.nameKo || planet.name} 사인`, planet.sign || planet.signEn, "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.house`, `${planet.nameKo || planet.name} 하우스`, planet.house ? `${planet.house}하우스` : "", "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.degree`, `${planet.nameKo || planet.name} 도수`, Number.isFinite(Number(planet.degree)) ? `${planet.degree}도` : "", "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.nakshatra`, `${planet.nameKo || planet.name} 나크샤트라`, planet.nakshatra, "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.pada`, `${planet.nameKo || planet.name} 파다`, planet.pada, "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.dignity`, `${planet.nameKo || planet.name} 강약`, dignityKo(planet.dignity), "planet");
    addVedicEvidenceSignal(signals, `planet.${planet.name}.retrograde`, `${planet.nameKo || planet.name} 역행`, planet.retrograde ? "역행" : "순행", "planet");
  });

  compactHouses.forEach((house) => {
    addVedicEvidenceSignal(signals, `house.${house.house}.sign`, `${house.house}하우스 사인`, house.sign || house.signEn, "house");
    addVedicEvidenceSignal(signals, `house.${house.house}.lord`, `${house.house}하우스 로드`, house.lord, "house");
    addVedicEvidenceSignal(signals, `house.${house.house}.planets`, `${house.house}하우스 입궁 행성`, house.planets, "house", "입궁 행성 없음");
  });

  const rahu = findPlanetByName(compactPlanets, "Rahu");
  const ketu = findPlanetByName(compactPlanets, "Ketu");
  addVedicEvidenceSignal(signals, "axis.rahu", "라후 축", [rahu?.sign, rahu?.house ? `${rahu.house}하우스` : ""], "karma");
  addVedicEvidenceSignal(signals, "axis.ketu", "케투 축", [ketu?.sign, ketu?.house ? `${ketu.house}하우스` : ""], "karma");

  const signalIds = new Set(signals.map((signal) => signal.id));
  const requiredSignalIdsBySection = Object.fromEntries(safeArray(chapter?.categories).map((category) => {
    const required = safeArray(VEDIC_LLM_REQUIRED_SIGNAL_IDS_BY_SECTION[clean(category?.id)]);
    return [category.id, required.filter((id) => signalIds.has(id))];
  }));
  const unavailableRequiredSignalIdsBySection = Object.fromEntries(safeArray(chapter?.categories).map((category) => {
    const required = safeArray(VEDIC_LLM_REQUIRED_SIGNAL_IDS_BY_SECTION[clean(category?.id)]);
    return [category.id, required.filter((id) => !signalIds.has(id))];
  }));

  return {
    version: "vedic-evidence-pack-v1",
    signals,
    allowedSignalIds: Array.from(signalIds),
    requiredSignalIdsBySection,
    unavailableRequiredSignalIdsBySection,
  };
}

function buildVedicLlmSignalPack(chartJson = {}, chapter = {}) {
  const context = chartJson?.pdfContext || normalizeVedicPdfContext({}, chartJson);
  const chart = chartJson?.chart || {};
  const planets = safeArray(chart?.planets).length ? safeArray(chart.planets) : safeArray(context?.planets);
  const houses = safeArray(chart?.houses).length ? safeArray(chart.houses) : safeArray(context?.bhavas);
  const activeDasha = clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha);
  const currentAntarDasha = clean(chart?.dashas?.currentAntarDasha || context?.dashas?.currentAntarDasha);
  const dashaPeriods = safeArray(chart?.dashas?.periods).length ? safeArray(chart.dashas.periods) : safeArray(context?.dasha);
  const evidencePack = buildVedicEvidencePack(chartJson, chapter);
  return {
    profile: context?.profile || {},
    settings: {
      ayanamsa: clean(chartJson?.settings?.ayanamsa),
      zodiac: clean(chartJson?.settings?.zodiac),
      calculationMode: clean(chartJson?.calculationMode),
    },
    core: {
      lagnaSign: clean(chart?.lagnaSign || context?.lagna?.signKo),
      lagnaSignEn: clean(context?.lagna?.sign),
      lagnaLord: clean(context?.lagna?.lord),
      moonSign: clean(chart?.moonSign),
      sunSign: clean(chart?.sunSign),
      moonNakshatra: context?.moonNakshatra || chart?.nakshatra || {},
      currentMahaDasha: activeDasha,
      currentAntarDasha,
      nextDasha: clean(context?.derived?.nextDasha),
    },
    karakas: context?.karakas || chart?.karakas || {},
    planets: planets.map(compactVedicPlanetForLlm).filter((planet) => clean(planet.name)),
    houses: houses.map(compactVedicHouseForLlm).filter((house) => house.house >= 1 && house.house <= 12),
    dashas: dashaPeriods.slice(0, 8).map((row) => ({
      planet: clean(row?.planet || row?.lord),
      start: clean(row?.start),
      end: clean(row?.end),
      years: Number.isFinite(Number(row?.years)) ? Number(row.years) : undefined,
      active: Boolean(row?.active),
    })),
    yogas: safeArray(chart?.insights?.yogas || chartJson?.insights?.yogas || context?.yogas).slice(0, 8),
    drishti: safeArray(chart?.insights?.drishti || chartJson?.insights?.drishti).slice(0, 12),
    insightCards: safeArray(chartJson?.insights?.cards || chart?.insights?.cards).slice(0, 8),
    derived: context?.derived || {},
    chapterSignalHints: safeArray(VEDIC_LLM_REQUIRED_SIGNAL_HINTS[clean(chapter?.id)]),
    evidencePack,
  };
}

function buildVedicLlmChapterPrompt({ chapter, chartJson, previousSummaries = [], lastDraft = null, lastErrors = [] } = {}) {
  const signalPack = buildVedicLlmSignalPack(chartJson, chapter);
  const categories = safeArray(chapter?.categories).map((category, index) => ({
    order: index + 1,
    id: category.id,
    title: category.title,
    requiredSignalIds: safeArray(signalPack?.evidencePack?.requiredSignalIdsBySection?.[category.id]),
  }));
  const repairBlock = lastErrors.length
    ? `이전 응답의 문제: ${lastErrors.map((item) => clean(item)).filter(Boolean).join(", ")}\n이전 초안 일부: ${JSON.stringify(lastDraft || {}).slice(0, 7000)}`
    : "";

  return [
    "당신은 최고 수준의 베다 점성술 상담가입니다. 결과 문장은 전문적이고 신비롭지만, 실제 삶에서 바로 이해되는 한국어로 작성하십시오.",
    "출력은 순수 JSON 객체 하나만 허용합니다. 코드블록, 설명문, 마크다운, 사과문, 내부 용어를 쓰지 마십시오.",
    "최종 본문에는 JSON, API, LLM, local, engine, debug, retry, fallback, template, 데이터 부족, 내부 데이터 같은 구현 용어를 절대 쓰지 마십시오.",
    "모든 해석은 제공된 차트 신호만 근거로 삼고, 의료·법률·투자 보장처럼 단정적인 약속은 하지 마십시오.",
    "각 카테고리 body는 한국어 950~1300자입니다. evidenceSignals는 3~6개, advice와 cautions는 각각 1~2문장입니다.",
    "각 섹션 usedSignalIds는 evidencePack.allowedSignalIds 안에서만 고르고, 해당 섹션 requiredSignalIds를 반드시 포함하십시오.",
    "사인, 하우스, 행성 위치, 다샤, 나크샤트라, 카라카는 evidencePack.signals에 있는 값만 사용하십시오.",
    "행성-사인, 행성-하우스, 하우스-사인, 현재 다샤 조합은 evidencePack 값과 다르면 안 됩니다.",
    "카테고리 id와 title은 아래 계약을 한 글자도 바꾸지 말고 순서도 유지하십시오.",
    JSON.stringify({
      chapterContract: {
        chapterId: chapter.id,
        chapterNo: chapter.order,
        roman: chapter.roman,
        title: chapter.title,
        subtitle: chapter.subtitle,
        categories,
      },
      requiredOutputShape: {
        chapterId: chapter.id,
        chapterNo: chapter.order,
        title: chapter.title,
        sections: categories.map((category) => ({
          id: category.id,
          title: category.title,
          usedSignalIds: category.requiredSignalIds,
          body: "한국어 950~1300자 본문",
          evidenceSignals: ["차트 근거 1", "차트 근거 2", "차트 근거 3"],
          advice: "현실 조언",
          cautions: "주의할 흐름",
        })),
      },
      currentChartSignals: signalPack,
      previousChapterSummaries: safeArray(previousSummaries).slice(-4),
    }),
    repairBlock,
  ].filter(Boolean).join("\n\n");
}

function extractVedicLlmJsonObject(text = "") {
  const raw = String(text || "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(raw);
  } catch (_) {}

  const candidates = [
    raw.match(/```json\s*([\s\S]*?)\s*```/i)?.[1],
    raw.match(/```\s*([\s\S]*?)\s*```/i)?.[1],
  ].filter(Boolean);

  const start = raw.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        candidates.push(raw.slice(start, index + 1));
        break;
      }
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(clean(candidate));
    } catch (_) {}
  }

  throw Object.assign(new Error("베다점 원고 응답 파싱에 실패했습니다."), {
    code: "VEDIC_LLM_JSON_PARSE_FAILED",
    status: 502,
  });
}

function buildVedicEvidenceIndex(evidencePack = {}) {
  return new Map(safeArray(evidencePack?.signals).map((signal) => [clean(signal?.id), signal]).filter((entry) => entry[0]));
}

function normalizeUsedSignalIds(ids = [], evidencePack = {}) {
  const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
  return Array.from(new Set(safeArray(ids).map((id) => clean(id)).filter((id) => id && evidenceIndex.has(id))));
}

function escapeVedicRegex(value) {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function planetClaimAliases(planetName) {
  const en = normalizePlanetName(planetName);
  if (!en) return [];
  return Array.from(new Set([PLANET_KO[en], en].map((item) => clean(item)).filter(Boolean)));
}

function evidenceSignalValue(evidencePack = {}, id = "") {
  const signal = buildVedicEvidenceIndex(evidencePack).get(clean(id));
  return clean(signal?.value);
}

function hasDirectPlanetSignClaim(text, planetAliases = [], sign) {
  const aliases = safeArray(planetAliases).map(escapeVedicRegex).filter(Boolean);
  const signToken = escapeVedicRegex(sign);
  if (!aliases.length || !signToken) return false;
  const planetPattern = aliases.join("|");
  return new RegExp(`(?:${planetPattern})(?:은|는|이|가|의)?\\s*${signToken}`).test(text)
    || new RegExp(`(?:${planetPattern})[^\\n,.。]{0,14}${signToken}`).test(text)
    || new RegExp(`${signToken}(?:의|에\\s*있는|에\\s*자리한)?\\s*(?:${planetPattern})`).test(text);
}

function hasLiteralPlanetSignClaim(text, planetAliases = [], sign) {
  const body = clean(text);
  const signText = clean(sign);
  if (!body || !signText) return false;
  return safeArray(planetAliases).some((alias) => {
    const token = clean(alias);
    if (!token) return false;
    return body.includes(`${token}은 ${signText}`)
      || body.includes(`${token}는 ${signText}`)
      || body.includes(`${token}이 ${signText}`)
      || body.includes(`${token}가 ${signText}`)
      || body.includes(`${token} ${signText}`)
      || body.includes(`${signText}의 ${token}`);
  });
}

function hasDirectPlanetHouseClaim(text, planetAliases = [], houseNumber) {
  const aliases = safeArray(planetAliases).map(escapeVedicRegex).filter(Boolean);
  const house = Number(houseNumber);
  if (!aliases.length || !Number.isFinite(house)) return false;
  const planetPattern = aliases.join("|");
  const housePattern = `${house}\\s*하우스`;
  return new RegExp(`(?:${planetPattern})(?:은|는|이|가|의)?\\s*(?:${housePattern})`).test(text)
    || new RegExp(`(?:${planetPattern})[^\\n,.。]{0,14}(?:${housePattern})`).test(text)
    || new RegExp(`(?:${housePattern})(?:의|에\\s*있는|에\\s*자리한)\\s*(?:${planetPattern})`).test(text);
}

function hasDirectHouseSignClaim(text, houseNumber, sign) {
  const house = Number(houseNumber);
  const signToken = escapeVedicRegex(sign);
  if (!Number.isFinite(house) || !signToken) return false;
  const housePattern = `${house}\\s*하우스`;
  return new RegExp(`(?:${housePattern})(?:은|는|이|가)?\\s*${signToken}`).test(text)
    || new RegExp(`${signToken}\\s*(?:${housePattern})`).test(text);
}

function detectVedicUnsupportedClaims(text = "", evidencePack = {}) {
  const body = clean(text);
  if (!body) return [];
  const issues = [];
  const signs = SIGN_KO.filter(Boolean);

  ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"].forEach((planet) => {
    const aliases = planetClaimAliases(planet);
    const expectedSign = evidenceSignalValue(evidencePack, `planet.${planet}.sign`);
    const expectedHouse = Number((evidenceSignalValue(evidencePack, `planet.${planet}.house`).match(/\d+/) || [])[0]);
    signs.forEach((sign) => {
      if (expectedSign && sign !== expectedSign && (hasDirectPlanetSignClaim(body, aliases, sign) || hasLiteralPlanetSignClaim(body, aliases, sign))) {
        issues.push(`planet:${planet}:wrong-sign:${sign}`);
      }
    });
    for (let house = 1; house <= 12; house += 1) {
      if (Number.isFinite(expectedHouse) && house !== expectedHouse && hasDirectPlanetHouseClaim(body, aliases, house)) {
        issues.push(`planet:${planet}:wrong-house:${house}`);
      }
    }
  });

  for (let house = 1; house <= 12; house += 1) {
    const expectedSign = evidenceSignalValue(evidencePack, `house.${house}.sign`);
    signs.forEach((sign) => {
      if (expectedSign && sign !== expectedSign && hasDirectHouseSignClaim(body, house, sign)) {
        issues.push(`house:${house}:wrong-sign:${sign}`);
      }
    });
  }

  const activeDasha = normalizePlanetName(evidenceSignalValue(evidencePack, "dasha.current.maha"));
  if (activeDasha) {
    ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"].forEach((planet) => {
      if (planet === activeDasha) return;
      const wrongAliases = planetClaimAliases(planet).map(escapeVedicRegex).filter(Boolean);
      if (!wrongAliases.length) return;
      const wrongPattern = wrongAliases.join("|");
      if (new RegExp(`(?:현재|지금|이번\\s*시기)[^\\n.。]{0,18}(?:${wrongPattern})\\s*다샤`).test(body)) {
        issues.push(`dasha:current:wrong-maha:${planet}`);
      }
    });
  }

  return Array.from(new Set(issues));
}

function detectVedicChartUnsupportedClaims(text = "", chartJson = {}) {
  const body = clean(text);
  if (!body) return [];
  const issues = [];
  const signs = SIGN_KO.filter(Boolean);
  const chart = chartJson?.chart || {};
  safeArray(chart?.planets).forEach((planet) => {
    const planetName = normalizePlanetName(planet?.name || planet?.graha);
    if (!planetName) return;
    const aliases = planetClaimAliases(planetName);
    const expectedSign = clean(planet?.sign || planet?.signKo);
    const expectedHouse = Number(planet?.house);
    signs.forEach((sign) => {
      if (expectedSign && sign !== expectedSign && (hasDirectPlanetSignClaim(body, aliases, sign) || hasLiteralPlanetSignClaim(body, aliases, sign))) {
        issues.push(`chart:planet:${planetName}:wrong-sign:${sign}`);
      }
    });
    for (let house = 1; house <= 12; house += 1) {
      if (Number.isFinite(expectedHouse) && house !== expectedHouse && hasDirectPlanetHouseClaim(body, aliases, house)) {
        issues.push(`chart:planet:${planetName}:wrong-house:${house}`);
      }
    }
  });
  safeArray(chart?.houses).forEach((house) => {
    const houseNumber = Number(house?.house || house?.number);
    const expectedSign = clean(house?.sign || house?.rashiKo);
    if (!Number.isFinite(houseNumber) || !expectedSign) return;
    signs.forEach((sign) => {
      if (sign !== expectedSign && hasDirectHouseSignClaim(body, houseNumber, sign)) {
        issues.push(`chart:house:${houseNumber}:wrong-sign:${sign}`);
      }
    });
  });
  const activeDasha = normalizePlanetName(chart?.dashas?.currentMahaDasha);
  if (activeDasha) {
    ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"].forEach((planet) => {
      if (planet === activeDasha) return;
      const wrongAliases = planetClaimAliases(planet).map(escapeVedicRegex).filter(Boolean);
      if (!wrongAliases.length) return;
      const wrongPattern = wrongAliases.join("|");
      if (new RegExp(`(?:현재|지금|이번\\s*시기)[^\\n.。]{0,18}(?:${wrongPattern})\\s*다샤`).test(body)) {
        issues.push(`chart:dasha:current:wrong-maha:${planet}`);
      }
    });
  }
  return Array.from(new Set(issues));
}

function detectVedicAllUnsupportedClaims(text = "", evidencePack = {}, chartJson = {}) {
  return Array.from(new Set([
    ...detectVedicUnsupportedClaims(text, evidencePack),
    ...detectVedicChartUnsupportedClaims(text, chartJson),
  ]));
}

function detectVedicLiteralChartContradictions(text = "", chartJson = {}) {
  const body = clean(text);
  const issues = [];
  if (!body) return issues;
  const chart = chartJson?.chart || {};
  [
    { key: "moon", aliases: ["달", "문", "Moon"], expectedSign: clean(chart?.moonSign) },
    { key: "sun", aliases: ["태양", "Sun"], expectedSign: clean(chart?.sunSign) },
    { key: "lagna", aliases: ["라그나", "Lagna"], expectedSign: clean(chart?.lagnaSign) },
  ].forEach((item) => {
    if (!item.expectedSign) return;
    SIGN_KO.filter((sign) => sign && sign !== item.expectedSign).forEach((sign) => {
      const found = item.aliases.some((alias) => {
        const token = clean(alias);
        return token && (
          body.includes(`${token}은 ${sign}`)
          || body.includes(`${token}는 ${sign}`)
          || body.includes(`${token}이 ${sign}`)
          || body.includes(`${token}가 ${sign}`)
          || body.includes(`${token} ${sign}`)
        );
      });
      if (found) issues.push(`literal:core:${item.key}:wrong-sign:${sign}`);
    });
  });
  safeArray(chart?.planets).forEach((planet) => {
    const planetName = normalizePlanetName(planet?.name || planet?.graha);
    if (!planetName) return;
    const aliases = planetClaimAliases(planetName);
    const expectedSign = clean(planet?.sign || planet?.signKo);
    if (!expectedSign) return;
    SIGN_KO.filter((sign) => sign && sign !== expectedSign).forEach((sign) => {
      const found = aliases.some((alias) => {
        const token = clean(alias);
        return token && (
          body.includes(`${token}은 ${sign}`)
          || body.includes(`${token}는 ${sign}`)
          || body.includes(`${token}이 ${sign}`)
          || body.includes(`${token}가 ${sign}`)
          || body.includes(`${token} ${sign}`)
        );
      });
      if (found) issues.push(`literal:planet:${planetName}:wrong-sign:${sign}`);
    });
  });
  return Array.from(new Set(issues));
}

function validateVedicLlmChapterJson(parsed = {}, chapter = {}, evidencePack = {}, chartJson = {}) {
  const errors = [];
  const expectedSections = safeArray(chapter?.categories);
  const sections = safeArray(parsed?.sections);
  const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
  if (clean(parsed?.chapterId) !== clean(chapter?.id)) errors.push("chapter_id_mismatch");
  if (Number(parsed?.chapterNo) !== Number(chapter?.order)) errors.push("chapter_no_mismatch");
  if (clean(parsed?.title) !== clean(chapter?.title)) errors.push("chapter_title_mismatch");
  if (sections.length !== expectedSections.length) errors.push("section_count_mismatch");

  expectedSections.forEach((expected, index) => {
    const section = sections[index] || {};
    if (clean(section?.id) !== clean(expected.id)) errors.push(`section_${index + 1}_id_mismatch`);
    if (clean(section?.title) !== clean(expected.title)) errors.push(`section_${index + 1}_title_mismatch`);
    const body = clean(section?.body);
    const evidence = safeArray(section?.evidenceSignals).map((item) => clean(item)).filter(Boolean);
    const usedSignalIds = safeArray(section?.usedSignalIds).map((id) => clean(id)).filter(Boolean);
    const invalidSignalIds = usedSignalIds.filter((id) => !evidenceIndex.has(id));
    const requiredSignalIds = safeArray(evidencePack?.requiredSignalIdsBySection?.[expected.id]);
    const missingRequiredIds = requiredSignalIds.filter((id) => !usedSignalIds.includes(id));
    const unsupportedClaims = [
      ...detectVedicAllUnsupportedClaims([body, evidence.join(" "), section?.advice, section?.cautions].join(" "), evidencePack, chartJson),
      ...detectVedicLiteralChartContradictions([body, evidence.join(" "), section?.advice, section?.cautions].join(" "), chartJson),
    ];
    if (body.length < 800) errors.push(`section_${index + 1}_body_too_short`);
    if (evidence.length < 3) errors.push(`section_${index + 1}_evidence_too_light`);
    if (usedSignalIds.length < Math.min(3, Math.max(1, requiredSignalIds.length))) errors.push(`section_${index + 1}_used_signals_too_light`);
    if (invalidSignalIds.length) errors.push(`section_${index + 1}_invalid_signal_ids:${invalidSignalIds.join("|")}`);
    if (missingRequiredIds.length) errors.push(`section_${index + 1}_missing_required_signal_ids:${missingRequiredIds.join("|")}`);
    if (unsupportedClaims.length) errors.push(`section_${index + 1}_unsupported_claims:${unsupportedClaims.slice(0, 4).join("|")}`);
    if (hasForbiddenText([body, evidence.join(" "), section?.advice, section?.cautions].join(" "))) {
      errors.push(`section_${index + 1}_forbidden_text`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

function convertVedicLlmChapterToDraft(parsed = {}, chapter = {}, evidencePack = {}) {
  const parsedSections = safeArray(parsed?.sections);
  const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
  const sections = safeArray(chapter?.categories).map((category, index) => {
    const source = parsedSections[index] || {};
    const usedSignalIds = normalizeUsedSignalIds(source?.usedSignalIds, evidencePack).slice(0, 8);
    const exactEvidenceSignals = usedSignalIds
      .map((id) => evidenceIndex.get(id))
      .filter(Boolean)
      .map((signal) => cleanForbidden(`${signal.label}: ${signal.value}`));
    const modelEvidenceSignals = safeArray(source?.evidenceSignals).map((item) => cleanForbidden(item)).filter(Boolean);
    const evidenceSignals = Array.from(new Set([...exactEvidenceSignals, ...modelEvidenceSignals])).slice(0, 6);
    const advice = cleanForbidden(source?.advice);
    const cautions = cleanForbidden(source?.cautions);
    const bodyParts = [cleanForbidden(source?.body)];
    if (evidenceSignals.length) bodyParts.push(`차트 근거\n\n${evidenceSignals.map((item) => `- ${item}`).join("\n")}`);
    if (advice) bodyParts.push(`현실 조언\n\n${advice}`);
    if (cautions) bodyParts.push(`주의할 흐름\n\n${cautions}`);
    return {
      id: category.id,
      title: category.title,
      body: cleanForbidden(bodyParts.join("\n\n")),
      bullets: evidenceSignals,
      usedSignalIds,
    };
  });

  return {
    chapterNo: Number(chapter.order),
    id: chapter.id,
    key: chapter.key,
    roman: chapter.roman,
    title: chapter.title,
    subtitle: chapter.subtitle,
    sections,
    llmQuality: {
      sectionCount: sections.length,
      totalLength: sections.reduce((sum, section) => sum + clean(section.body).length, 0),
    },
  };
}

function validateVedicLlmChapterDraft(chapterDraft = {}, chapterSpec = {}, evidencePack = {}, chartJson = {}) {
  const issues = [
    ...validateChapterSchema([chapterDraft]),
    ...validateSections([chapterDraft]),
  ];
  const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
  const mergedText = safeArray(chapterDraft?.sections).map((section) => clean(section?.body)).join("\n");
  const hints = safeArray(VEDIC_LLM_REQUIRED_SIGNAL_HINTS[clean(chapterSpec?.id)]);
  const hitCount = hints.filter((hint) => mergedText.includes(hint)).length;
  if (hints.length && hitCount < Math.min(2, hints.length)) {
    issues.push(`chapter:${chapterSpec.id}:required-signal-missing`);
  }
  safeArray(chapterSpec?.categories).forEach((category, index) => {
    const section = safeArray(chapterDraft?.sections)[index] || {};
    const usedSignalIds = safeArray(section?.usedSignalIds).map((id) => clean(id)).filter(Boolean);
    const requiredSignalIds = safeArray(evidencePack?.requiredSignalIdsBySection?.[category.id]);
    const invalidSignalIds = usedSignalIds.filter((id) => !evidenceIndex.has(id));
    const missingRequiredIds = requiredSignalIds.filter((id) => !usedSignalIds.includes(id));
    const unsupportedClaims = [
      ...detectVedicAllUnsupportedClaims(section?.body, evidencePack, chartJson),
      ...detectVedicLiteralChartContradictions(section?.body, chartJson),
    ];
    if (invalidSignalIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:invalid-signal-ids`);
    if (missingRequiredIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:missing-required-signal-ids`);
    if (unsupportedClaims.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:unsupported-claims`);
  });
  return {
    ok: issues.length === 0,
    issues,
  };
}

async function callVedicPremiumLlm(env, prompt, meta = {}) {
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: VEDIC_LLM_KEY_ENV_KEYS,
    modelEnvKeys: VEDIC_LLM_MODEL_ENV_KEYS,
    temperature: Number(env?.VEDIC_PREMIUM_GEMINI_TEMPERATURE || env?.PREMIUM_GEMINI_TEMPERATURE || 0.35),
    topP: Number(env?.VEDIC_PREMIUM_GEMINI_TOP_P || env?.PREMIUM_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.VEDIC_PREMIUM_GEMINI_MAX_OUTPUT_TOKENS || env?.PREMIUM_GEMINI_MAX_OUTPUT_TOKENS || 24576),
    timeoutMs: Number(env?.VEDIC_PREMIUM_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
    totalTimeoutMs: Number(env?.VEDIC_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Number(env?.VEDIC_PREMIUM_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 2),
    disableVertexFallback: env?.VEDIC_PREMIUM_GEMINI_DISABLE_VERTEX_FALLBACK ?? env?.GEMINI_DISABLE_VERTEX_FALLBACK,
    metadata: meta,
  });
  if (!result?.ok || !clean(result?.text)) {
    throw Object.assign(new Error(clean(result?.message || "베다점 원고 생성에 실패했습니다.")), {
      code: clean(result?.error || "VEDIC_LLM_GENERATION_FAILED"),
      status: Number(result?.status || 502),
    });
  }
  return {
    text: clean(result.text),
    model: clean(result.model),
  };
}

function summarizeVedicLlmChapter(chapter = {}) {
  return safeArray(chapter?.sections)
    .slice(0, 2)
    .map((section) => `${clean(section?.title)}: ${clean(section?.body).slice(0, 140)}`)
    .join(" ");
}

async function generateVedicLlmChapter(env, chartJson, chapter, previousSummaries = [], options = {}) {
  let lastDraft = null;
  let lastErrors = [];
  const maxAttempts = Math.max(2, Math.min(3, Number(env?.VEDIC_PREMIUM_CHAPTER_REPAIRS || 2)));
  const evidencePack = buildVedicEvidencePack(chartJson, chapter);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prompt = buildVedicLlmChapterPrompt({
      chapter,
      chartJson,
      previousSummaries,
      lastDraft,
      lastErrors,
    });
    const result = await callVedicPremiumLlm(env, prompt, {
      requestId: clean(options?.requestId),
      chapterId: chapter.id,
      chapterNo: String(chapter.order),
      attempt,
    });

    let parsed = null;
    try {
      parsed = extractVedicLlmJsonObject(result.text);
    } catch (error) {
      lastDraft = { rawText: result.text.slice(0, 9000) };
      lastErrors = [clean(error?.code || "VEDIC_LLM_JSON_PARSE_FAILED")];
      continue;
    }

    const jsonValidation = validateVedicLlmChapterJson(parsed, chapter, evidencePack, chartJson);
    if (!jsonValidation.ok) {
      lastDraft = parsed;
      lastErrors = jsonValidation.errors;
      continue;
    }

    const chapterDraft = convertVedicLlmChapterToDraft(parsed, chapter, evidencePack);
    const draftValidation = validateVedicLlmChapterDraft(chapterDraft, chapter, evidencePack, chartJson);
    if (draftValidation.ok) {
      return {
        chapter: chapterDraft,
        summary: summarizeVedicLlmChapter(chapterDraft),
        attempts: attempt,
        model: result.model,
      };
    }

    lastDraft = parsed;
    lastErrors = draftValidation.issues;
  }

  throw Object.assign(new Error(`베다점 챕터 원고 생성 검수에 실패했습니다: ${chapter.roman}`), {
    code: "VEDIC_LLM_CHAPTER_INVALID",
    status: 502,
    details: {
      chapterId: chapter.id,
      chapterNo: chapter.order,
      errors: lastErrors,
    },
  });
}

export async function enhanceVedicPremiumManuscriptWithLLM(env, localManuscript, localVedicChartJson, options = {}) {
  const previousSummaries = [];
  const chapters = [];
  const attempts = [];
  const models = new Set();
  const onChapterDone = typeof options?.onChapterDone === "function" ? options.onChapterDone : () => {};

  for (const chapter of VEDIC_PREMIUM_CHAPTERS) {
    const generated = await generateVedicLlmChapter(env, localVedicChartJson, chapter, previousSummaries, {
      requestId: clean(options?.requestId),
    });
    chapters.push(generated.chapter);
    previousSummaries.push(generated.summary);
    attempts.push({
      chapterId: chapter.id,
      chapterNo: Number(chapter.order),
      attempts: Number(generated.attempts || 1),
      model: clean(generated.model),
    });
    if (clean(generated.model)) models.add(clean(generated.model));
    onChapterDone({
      chapterNo: Number(chapter.order),
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      completed: chapters.length,
      total: VEDIC_PREMIUM_CHAPTERS.length,
      attempts: Number(generated.attempts || 1),
    });
  }

  return {
    chapters,
    llmFailed: false,
    fallbackUsed: false,
    reason: "LLM_ONLY",
    error: null,
    attempts,
    model: Array.from(models).join(", "),
  };
}

function detectDuplicateRate(chapters) {
  const sentences = [];
  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      clean(section?.body)
        .split(/[.!?。？！\n]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 24)
        .forEach((token) => sentences.push(token));
    });
  });
  if (!sentences.length) return 1;
  const unique = new Set(sentences);
  return 1 - unique.size / sentences.length;
}

function detectHighRepetition(chapters) {
  const sentenceFreq = new Map();
  const paragraphFreq = new Map();

  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      const body = clean(section?.body);
      body
        .split(/[.!?。？！\n]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          sentenceFreq.set(token, (sentenceFreq.get(token) || 0) + 1);
        });

      body
        .split(/\n\s*\n/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          paragraphFreq.set(token, (paragraphFreq.get(token) || 0) + 1);
        });
    });
  });

  const repeatedSentenceOver2 = Array.from(sentenceFreq.values()).some((count) => count > 3);
  const repeatedParagraphOver2 = Array.from(paragraphFreq.values()).some((count) => count > 2);
  return {
    repeatedSentenceOver2,
    repeatedParagraphOver2,
  };
}

function validateNoVedicPdfRepetition(chapters = []) {
  const starts = new Map();
  const COMMON_NGRAM_PATTERNS = [
    /chapter\s+[ivx]+/i,
    /vedic\s+soul\s+map/i,
    /해석에서\s*중요한\s*점은/,
    /장면의\s*핵심은/,
    /기준으로\s*라그나/,
    /무엇을\s*먼저\s*붙들어야\s*하는지/,
    /다샤\s*변동기에도\s*손실을\s*줄이고/,
    /사실\s*확인\s*문장을\s*먼저\s*두어/,
    /주간\s*생활\s*루틴과\s*함께\s*묶어/,
    /토성처럼\s*느리고\s*단단하게\s*쌓/,
    /성향을\s*맞히는\s*데서\s*멈추지\s*않고/,
    /공명을\s*중시하는\s*기질로\s*드러/,
    /라그나와\s*라그나\s*로드/,
    /로드는\s*[A-Za-z]+로\s*읽히며/,
    /AK\s*[가-힣A-Za-z]+,\s*AmK\s*[A-Za-z]+,\s*DK/,
    /강한\s*행성\s*[A-Za-z,\s]+의\s*장점/,
    /손실을\s*줄이고\s*성장\s*곡선을\s*유지/,
  ];
  const sentenceFreq = new Map();
  const ngramFreq = new Map();
  const paragraphFreq = new Map();
  const repeatedExamples = [];
  let repeatedSentence = false;
  let repeatedLongNgram = false;
  let repeatedParagraph = false;

  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      const body = clean(section?.body);
      const firstSentence = clean(body.split(/[.!?。？！\n]+/)[0] || "");
      if (firstSentence.length > 10) {
        starts.set(firstSentence, (starts.get(firstSentence) || 0) + 1);
      }
      body
        .split(/[.!?。？！\n]+/)
        .map((token) => clean(token))
        .filter((token) => token.length >= 30)
        .forEach((token) => {
          if (/^[와를을이가은는]\s*/.test(token)) return;
          const count = (sentenceFreq.get(token) || 0) + 1;
          sentenceFreq.set(token, count);
          if (token.length >= 80 && count >= 3 && !COMMON_NGRAM_PATTERNS.some((pattern) => pattern.test(token))) {
            repeatedSentence = true;
            repeatedExamples.push({ type: "sentence", sample: token.slice(0, 120), count });
          }

          for (let i = 0; i <= token.length - 30; i += 1) {
            const gram = token.slice(i, i + 30);
            if (COMMON_NGRAM_PATTERNS.some((pattern) => pattern.test(gram))) continue;
            const gramCount = (ngramFreq.get(gram) || 0) + 1;
            ngramFreq.set(gram, gramCount);
            if (gramCount >= 5) {
              repeatedLongNgram = true;
              repeatedExamples.push({ type: "ngram30", sample: gram, count: gramCount });
              break;
            }
          }
        });

      body
        .split(/\n\s*\n/)
        .map((token) => clean(token))
        .filter((token) => token.length >= 80)
        .forEach((token) => {
          const count = (paragraphFreq.get(token) || 0) + 1;
          paragraphFreq.set(token, count);
          if (count >= 3) {
            repeatedParagraph = true;
            repeatedExamples.push({ type: "paragraph", sample: token.slice(0, 120), count });
          }
        });
    });
  });

  const repeatedStarts = Array.from(starts.values()).some((count) => count >= 3);
  return {
    ok: !repeatedSentence && !repeatedLongNgram && !repeatedParagraph,
    repeatedSentence,
    repeatedLongNgram,
    repeatedStarts,
    repeatedParagraph,
    repeatedExamples: repeatedExamples.slice(0, 8),
  };
}

function validateSections(chapters) {
  const issues = [];
  safeArray(chapters).forEach((chapter) => {
    if (!safeArray(chapter.sections).length) {
      issues.push(`chapter:${chapter.id}:missing-sections`);
      return;
    }
    if (chapter.sections.some((section) => clean(section.body).length < MIN_SECTION_CHARS)) {
      issues.push(`chapter:${chapter.id}:section-too-short`);
    }
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) {
      issues.push(`chapter:${chapter.id}:chapter-too-short`);
    }
    if (hasForbiddenText(chapter.sections.map((section) => section.body).join("\n"))) {
      issues.push(`chapter:${chapter.id}:forbidden-text`);
    }
  });
  return issues;
}

function validateChapterSchema(chapters) {
  const issues = [];
  const schemaMap = new Map(VEDIC_PREMIUM_CHAPTERS.map((chapter) => [clean(chapter.id), chapter]));

  safeArray(chapters).forEach((chapter) => {
    const schema = schemaMap.get(clean(chapter?.id));
    if (!schema) {
      issues.push(`chapter:${clean(chapter?.id) || "unknown"}:unknown-id`);
      return;
    }

    if (Number(chapter?.chapterNo) !== Number(schema.order)) {
      issues.push(`chapter:${schema.id}:order-mismatch`);
    }
    if (clean(chapter?.title) !== clean(schema.title)) {
      issues.push(`chapter:${schema.id}:title-mismatch`);
    }

    const chapterSections = safeArray(chapter?.sections);
    const schemaSections = safeArray(schema?.categories);
    if (chapterSections.length !== schemaSections.length) {
      issues.push(`chapter:${schema.id}:section-count-mismatch`);
      return;
    }

    for (let index = 0; index < schemaSections.length; index += 1) {
      if (clean(chapterSections[index]?.id) && clean(chapterSections[index]?.id) !== clean(schemaSections[index]?.id)) {
        issues.push(`chapter:${schema.id}:section-id-mismatch`);
      }
      if (clean(chapterSections[index]?.title) !== clean(schemaSections[index]?.title)) {
        issues.push(`chapter:${schema.id}:section-title-mismatch`);
      }
    }
  });

  return issues;
}

function buildVedicExpansionParagraph(chapter, section, chartJson, pass = 1) {
  const context = chartJson?.pdfContext || {};
  const chapterId = clean(chapter?.id);
  const sectionTitle = clean(section?.title);
  const lagna = clean(context?.lagna?.signKo || chartJson?.chart?.lagnaSign);
  const moon = clean(chartJson?.chart?.moonSign);
  const nakshatra = clean(chartJson?.chart?.nakshatra?.name);
  const dasha = clean(chartJson?.chart?.dashas?.currentMahaDasha);

  const map = {
    vedic_soul_map: `${sectionTitle}에서는 라그나 ${lagna}, 달 ${moon}, 나크샤트라 ${nakshatra}, 현재 ${dasha} 다샤를 함께 보며 삶의 방향을 정리합니다.`,
    vedic_lagna: `${sectionTitle}에서는 라그나와 1바바의 신호를 바탕으로 몸의 반응, 첫인상, 삶을 시작하는 방식을 현실적으로 해석합니다.`,
    vedic_moon_nakshatra: `${sectionTitle}에서는 달과 나크샤트라의 감정 리듬을 중심으로 불안이 올라오는 순간과 회복 루틴을 분리합니다.`,
    vedic_karakas: `${sectionTitle}에서는 아트마카라카·아마티야카라카·다라카라카가 각각 영혼, 일, 관계에서 어떤 선택 기준을 만드는지 설명합니다.`,
    vedic_planetary_strength: `${sectionTitle}에서는 강한 행성과 약한 행성을 나누어 재능으로 쓸 영역과 관리해야 할 영역을 구분합니다.`,
    vedic_bhavas: `${sectionTitle}에서는 12바바의 삶의 영역을 실제 관계, 재물, 직업, 마음의 기반으로 옮겨 해석합니다.`,
    vedic_love_partnership: `${sectionTitle}에서는 7바바, 금성, 다라카라카를 중심으로 사랑과 결혼에서 반복되는 카르마를 다룹니다.`,
    vedic_career_money: `${sectionTitle}에서는 10바바, 2바바, 11바바, 아마티야카라카를 연결해 직업과 수익 구조를 정리합니다.`,
    vedic_dasha_flow: `${sectionTitle}에서는 현재 다샤와 다음 다샤를 비교해 지금 선택해야 할 우선순위를 제시합니다.`,
    vedic_yogas_karma: `${sectionTitle}에서는 요가와 라후·케투 축을 현실 전략으로 번역해 반복 패턴을 줄이는 방향을 제안합니다.`,
    vedic_chakra_remedy: `${sectionTitle}에서는 차크라, 만트라, 보석, 도샤 루틴을 생활에서 실행 가능한 방식으로 정리합니다.`,
    vedic_master_plan: `${sectionTitle}에서는 전체 차트 해석을 1년·3년·10년 실행 계획으로 통합합니다.`,
  };

  const suffix = pass > 1
    ? ` 이번 보강에서는 실행 순서를 ${pass}단계로 구분해 실제 선택 기준을 구체화합니다.`
    : " 실행 기준은 이번 주 행동 우선순위와 다음 달 조정 기준으로 분리해 제시합니다.";

  return cleanForbidden(`${map[chapterId] || `${sectionTitle}에서는 확인된 차트 신호를 바탕으로 현실적인 실행 기준을 정리합니다.`}${suffix}`);
}

function expandSectionText(text, chapter, section, chartJson) {
  let out = cleanForbidden(text);
  let pass = 1;
  while (out.length < MIN_SECTION_CHARS) {
    out = cleanForbidden(`${out}\n\n${buildVedicExpansionParagraph(chapter, section, chartJson, pass)}`);
    pass += 1;
    if (pass > 5) break;
  }
  return out;
}

export function expandVedicLocalManuscript(chapters, chartJson) {
  var expanded = safeArray(chapters).map((chapter) => {
    const sections = safeArray(chapter.sections).map((section) => ({
      ...section,
      body: expandSectionText(section.body, chapter, section, chartJson),
    }));
    return {
      ...chapter,
      sections,
    };
  });

  var total = allTextLength(expanded);
  var chapterIndex = 0;
  var sectionIndex = 0;
  while (total < MIN_TOTAL_CHARS && expanded.length > 0) {
    var chapter = expanded[chapterIndex % expanded.length];
    var sections = safeArray(chapter.sections);
    if (!sections.length) break;
    var section = sections[sectionIndex % sections.length];
    section.body = cleanForbidden(`${section.body}\n\n${buildVedicExpansionParagraph(chapter, section, chartJson, Math.max(2, chapterIndex + 2))}`);
    total = allTextLength(expanded);
    chapterIndex += 1;
    sectionIndex += 1;
  }

  return expanded;
}

export function validateVedicPremiumChartSignals(chartJson = {}) {
  const issues = [];
  const chart = chartJson?.chart || {};
  const context = chartJson?.pdfContext || {};

  if (!clean(chartJson?.settings?.ayanamsa)) issues.push("ayanamsa");
  if (!clean(chart?.lagnaSign)) issues.push("lagnaSign");
  if (!clean(chart?.moonSign)) issues.push("moonSign");
  if (!clean(chart?.nakshatra?.name)) issues.push("moonNakshatra");

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const chartPlanetSet = new Set(safeArray(chart?.planets).map((planet) => normalizePlanetName(planet?.name)).filter(Boolean));
  requiredPlanets.forEach((planet) => {
    if (!chartPlanetSet.has(planet)) issues.push(`planet:${planet}`);
  });

  if (safeArray(chart?.houses).length !== 12) issues.push("houses");
  if (!clean(chart?.dashas?.currentMahaDasha) && !safeArray(chart?.dashas?.periods).length) issues.push("dasha");

  return {
    ok: issues.length === 0 && safeArray(context?.missingSignals).length === 0,
    issues: Array.from(new Set([...issues, ...safeArray(context?.missingSignals)])),
  };
}

function validateVedicFinalSignalUsage(chapters = [], chartJson = {}) {
  const issues = [];
  const chapterSpecs = new Map(VEDIC_PREMIUM_CHAPTERS.map((chapter) => [chapter.id, chapter]));
  safeArray(chapters).forEach((chapter) => {
    const chapterSpec = chapterSpecs.get(clean(chapter?.id));
    if (!chapterSpec) return;
    const evidencePack = buildVedicEvidencePack(chartJson, chapterSpec);
    const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
    safeArray(chapterSpec?.categories).forEach((category, index) => {
      const section = safeArray(chapter?.sections)[index] || {};
      const usedSignalIds = safeArray(section?.usedSignalIds).map((id) => clean(id)).filter(Boolean);
      const requiredSignalIds = safeArray(evidencePack?.requiredSignalIdsBySection?.[category.id]);
      const invalidSignalIds = usedSignalIds.filter((id) => !evidenceIndex.has(id));
      const missingRequiredIds = requiredSignalIds.filter((id) => !usedSignalIds.includes(id));
      const unsupportedClaims = [
        ...detectVedicAllUnsupportedClaims(section?.body, evidencePack, chartJson),
        ...detectVedicLiteralChartContradictions(section?.body, chartJson),
      ];
      const sectionText = clean(section?.body);
      [
        { key: "moon", aliases: ["달", "문"], expectedSign: clean(chartJson?.chart?.moonSign) },
        { key: "sun", aliases: ["태양"], expectedSign: clean(chartJson?.chart?.sunSign) },
        { key: "lagna", aliases: ["라그나"], expectedSign: clean(chartJson?.chart?.lagnaSign) },
      ].forEach((item) => {
        if (!item.expectedSign) return;
        SIGN_KO.filter((sign) => sign && sign !== item.expectedSign).forEach((sign) => {
          const found = item.aliases.some((alias) => (
            sectionText.includes(`${alias}은 ${sign}`)
            || sectionText.includes(`${alias}는 ${sign}`)
            || sectionText.includes(`${alias} ${sign}`)
          ));
          if (found) unsupportedClaims.push(`inline:core:${item.key}:wrong-sign:${sign}`);
        });
      });
      if (!usedSignalIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:used-signal-ids-missing`);
      if (invalidSignalIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:invalid-signal-ids`);
      if (missingRequiredIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:missing-required-signal-ids`);
      if (unsupportedClaims.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:unsupported-claims`);
    });
  });
  return issues;
}

function buildVedicEvidenceAudit(chapters = [], chartJson = {}) {
  const chapterSpecs = new Map(VEDIC_PREMIUM_CHAPTERS.map((chapter) => [chapter.id, chapter]));
  const usedUnique = new Set();
  let totalSections = 0;
  let totalUsedSignalRefs = 0;
  let missingRequiredCount = 0;
  let invalidSignalCount = 0;
  let unsupportedClaimCount = 0;

  const chapterAudits = safeArray(chapters).map((chapter) => {
    const chapterSpec = chapterSpecs.get(clean(chapter?.id));
    if (!chapterSpec) {
      return {
        chapterId: clean(chapter?.id),
        ok: false,
        issue: "unknown-chapter",
        sections: [],
      };
    }
    const evidencePack = buildVedicEvidencePack(chartJson, chapterSpec);
    const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
    const sectionAudits = safeArray(chapterSpec?.categories).map((category, index) => {
      totalSections += 1;
      const section = safeArray(chapter?.sections)[index] || {};
      const usedSignalIds = safeArray(section?.usedSignalIds).map((id) => clean(id)).filter(Boolean);
      usedSignalIds.forEach((id) => usedUnique.add(id));
      totalUsedSignalRefs += usedSignalIds.length;
      const requiredSignalIds = safeArray(evidencePack?.requiredSignalIdsBySection?.[category.id]);
      const invalidSignalIds = usedSignalIds.filter((id) => !evidenceIndex.has(id));
      const missingRequiredSignalIds = requiredSignalIds.filter((id) => !usedSignalIds.includes(id));
      const unsupportedClaims = [
        ...detectVedicAllUnsupportedClaims(section?.body, evidencePack, chartJson),
        ...detectVedicLiteralChartContradictions(section?.body, chartJson),
      ];
      missingRequiredCount += missingRequiredSignalIds.length;
      invalidSignalCount += invalidSignalIds.length;
      unsupportedClaimCount += unsupportedClaims.length;
      return {
        sectionId: category.id,
        ok: !invalidSignalIds.length && !missingRequiredSignalIds.length && !unsupportedClaims.length && usedSignalIds.length > 0,
        usedSignalIds,
        requiredSignalIds,
        missingRequiredSignalIds,
        invalidSignalIds,
        unsupportedClaims: unsupportedClaims.slice(0, 6),
      };
    });
    return {
      chapterId: chapterSpec.id,
      ok: sectionAudits.every((section) => section.ok),
      sections: sectionAudits,
    };
  });

  return {
    version: "vedic-evidence-audit-v1",
    ok: missingRequiredCount === 0 && invalidSignalCount === 0 && unsupportedClaimCount === 0 && totalSections > 0,
    totalSections,
    totalUsedSignalRefs,
    uniqueSignalCount: usedUnique.size,
    missingRequiredCount,
    invalidSignalCount,
    unsupportedClaimCount,
    chapters: chapterAudits,
  };
}

export function validateVedicFinalManuscript(input) {
  const birthInput = input?.birthInput || null;
  const chartJson = input?.localVedicChartJson || null;
  const chapters = safeArray(input?.chapters);
  const requireSignalIds = Boolean(input?.requireSignalIds);

  const issues = [];

  const birthValidation = validateVedicBirthInput(birthInput || {});
  if (!birthValidation.ok) {
    issues.push(...birthValidation.hardFail.map((key) => `birth:${key}`));
  }

  if (!chartJson) issues.push("chart:missing");
  if (chartJson && !clean(chartJson?.chart?.lagnaSign) && safeArray(chartJson?.chart?.planets).length === 0) {
    issues.push("chart:missing-core");
  }

  if (chapters.length !== VEDIC_PREMIUM_CHAPTERS.length) {
    issues.push("chapters:count-mismatch");
  }

  issues.push(...validateChapterSchema(chapters));

  issues.push(...validateSections(chapters));
  if (requireSignalIds) {
    issues.push(...validateVedicFinalSignalUsage(chapters, chartJson));
  }

  const totalLength = allTextLength(chapters);
  if (totalLength < MIN_TOTAL_CHARS) issues.push("manuscript:total-too-short");

  const duplicateRate = detectDuplicateRate(chapters);
  if (duplicateRate > 0.9) {
    issues.push("manuscript:duplicate-too-high");
  }

  const mergedText = chapters.map((chapter) => safeArray(chapter.sections).map((section) => section.body).join("\n")).join("\n");
  const banned = hasForbiddenText(mergedText);
  const forbiddenTermsCount = (mergedText.match(new RegExp(FORBIDDEN_TEXT_RE.source, "gi")) || []).length;
  if (banned) issues.push("manuscript:banned-text");

  const repetitionCheck = validateNoVedicPdfRepetition(chapters);
  const shouldFailByRepetition = Boolean(
    repetitionCheck.repeatedParagraph
    || (repetitionCheck.repeatedSentence && duplicateRate > 0.82)
    || (repetitionCheck.repeatedLongNgram && duplicateRate > 0.78),
  );
  if (shouldFailByRepetition) {
    issues.push("manuscript:repetition-detected");
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      chapterCount: chapters.length,
      totalLength,
      duplicateRate,
      hasBirthDate: Boolean(clean(birthInput?.birthDate)),
      hasBirthTime: Boolean(clean(birthInput?.birthTime)),
      birthHour: Number.isFinite(Number(birthInput?.birthHour)) ? Number(birthInput.birthHour) : null,
      hasTimezone: Boolean(clean(birthInput?.timezone)),
      hasLocation: Boolean(clean(birthInput?.birthPlace)),
      hasAyanamsa: Boolean(clean(chartJson?.settings?.ayanamsa)),
      hasLagna: Boolean(clean(chartJson?.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(chartJson?.chart?.moonSign)),
      hasNakshatra: Boolean(clean(chartJson?.chart?.nakshatra?.name)),
      hasAtmakaraka: Boolean(clean(chartJson?.chart?.atmakaraka)),
      hasDasha: Boolean(clean(chartJson?.chart?.dashas?.currentMahaDasha)),
      planetCount: safeArray(chartJson?.chart?.planets).length,
      houseCount: safeArray(chartJson?.chart?.houses).length,
      forbiddenTermsCount,
      repetitionScore: duplicateRate,
    },
    repetition: repetitionCheck,
  };
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderVedicSectionBody(body) {
  return cleanForbidden(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^(핵심 진단|차트 근거|현실에서 드러나는 모습|주의해야 할 흐름|베다 마스터의 조언|실천 과제)$/.test(line)) {
        return `<h4>${escapeHtml(line)}</h4>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function renderChapterHtml(chapter) {
  const sections = safeArray(chapter.sections).map((section) => `
    <article class="cat-card">
      <h4>${escapeHtml(section.title)}</h4>
      <div class="vd-section-body">${renderVedicSectionBody(section.body)}</div>
    </article>
  `).join("");

  return `
    <section class="chapter">
      <h2>${escapeHtml(`제${Number(chapter.chapterNo || 0)}장 ${normalizeChapterTitleForDisplay(chapter.title)}`)}</h2>
      <div class="cat-grid">${sections}</div>
    </section>
  `;
}

export function renderVedicPremiumPdf(chapters, payload) {
  const safeName = cleanForbidden(payload?.birthInput?.name || "사용자") || "사용자";
  const safeBirth = cleanForbidden(payload?.birthInput?.birthDate || "") || "출생 정보";
  const lagna = cleanForbidden(payload?.chart?.lagnaSign || "라그나") || "라그나";
  const moonNakshatra = cleanForbidden(payload?.chart?.nakshatra?.name || "나크샤트라") || "나크샤트라";

  const toc = safeArray(chapters).map((chapter) => `<li>${escapeHtml(`제${Number(chapter.chapterNo || 0)}장 ${normalizeChapterTitleForDisplay(chapter.title)}`)}</li>`).join("");
  const body = safeArray(chapters).map((chapter) => renderChapterHtml(chapter)).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} 베다점 프리미엄 PDF</title>
<style>
body{font-family:'Noto Serif KR',serif;background:#070a1a;color:#f7eedc;line-height:1.8;margin:0}
main{max-width:980px;margin:0 auto;padding:34px 26px 64px}
.cover{border:1px solid rgba(245,158,11,.28);border-radius:20px;padding:30px;background:radial-gradient(circle at 20% 0,#30205f,#101936 46%,#070a1a 100%)}
.cover h1{margin:0 0 8px;font-size:2rem;color:#ffd166}
.cover p{margin:4px 0;color:#d8c79f}
.cover img{width:100%;max-width:380px;display:block;margin:16px auto;border-radius:14px}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.summary span{border:1px solid rgba(255,209,102,.25);border-radius:999px;padding:5px 10px;color:#fde68a;background:rgba(88,28,135,.24)}
.toc,.chapter{margin-top:24px;border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:18px;background:rgba(12,18,42,.74)}
.chapter h2{margin:0 0 10px;color:#ffe39d;font-size:1.2rem}
.cat-grid{display:grid;grid-template-columns:1fr;gap:10px}
.cat-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(29,21,57,.72)}
.cat-card h4{margin:0 0 6px;color:#ffd166;font-size:1rem}
.vd-section-body{display:flex;flex-direction:column;gap:12px}
.vd-section-body h4{margin:18px 0 4px;color:#fde68a;font-weight:800}
.vd-section-body p{margin:0;color:#eee4cf;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}
</style>
</head>
<body>
<main>
  <section class="cover">
    <h1>베다점 프리미엄 PDF</h1>
    <p>라그나와 나크샤트라로 읽는 영혼의 실전 리포트</p>
    <p>${escapeHtml(safeName)} · ${escapeHtml(safeBirth)}</p>
    <div class="summary">
      <span>라그나 ${escapeHtml(lagna)}</span>
      <span>달 나크샤트라 ${escapeHtml(moonNakshatra)}</span>
      <span>${safeArray(chapters).length}장 구성</span>
    </div>
    <img src="/fuctionassets/veda.webp" alt="vedic premium cover">
  </section>
  <section class="toc">
    <h2>목차</h2>
    <ol>${toc}</ol>
  </section>
  ${body}
</main>
</body>
</html>`;

  return {
    title: `${safeName} 베다점 프리미엄 PDF`,
    filename: `premium-vedic-${safeName.replace(/\s+/g, "-").toLowerCase()}.html`,
    html,
  };
}

function toLegacyChapterShape(chapterDraft) {
  return {
    id: chapterDraft.id,
    key: chapterDraft.key,
    order: chapterDraft.chapterNo,
    roman: chapterDraft.roman,
    title: chapterDraft.title,
    subtitle: chapterDraft.subtitle,
    categories: safeArray(chapterDraft.sections).map((section) => ({
      id: clean(section.id) || clean(section.title).toLowerCase().replace(/\s+/g, "_"),
      title: section.title,
      localSummary: section.body,
      text: section.body,
      body: section.body,
      usedSignalIds: safeArray(section.usedSignalIds),
    })),
    sections: safeArray(chapterDraft.sections).map((section) => ({
      id: clean(section.id),
      title: section.title,
      body: section.body,
      bullets: safeArray(section.bullets),
      usedSignalIds: safeArray(section.usedSignalIds),
    })),
    localQuality: chapterDraft.localQuality,
  };
}

function buildSafeVedicRawInput(rawInput = {}, birthInput = {}, safeChartSource = {}) {
  return {
    ...rawInput,
    birthInput,
    chart: safeChartSource,
    vedicBase: {
      ...(rawInput?.vedicBase && typeof rawInput.vedicBase === "object" ? rawInput.vedicBase : {}),
      birthInput,
      chart: safeChartSource,
    },
  };
}

export async function generateVedicPremiumReport(env, rawInput = {}, options = {}) {
  const log = typeof options.log === "function" ? options.log : () => {};
  const hasExplicitLocalChartJson = Boolean(rawInput?.localVedicChartJson && typeof rawInput.localVedicChartJson === "object");

  log("LocalCalculationStart", {
    hasBirthDate: Boolean(clean(rawInput?.birthDate || rawInput?.user?.birthDate || rawInput?.birth?.date)),
    hasBirthTime: Boolean(clean(rawInput?.birthTime || rawInput?.user?.birthTime || rawInput?.birth?.time)),
  });

  const normalizedBirthInput = normalizeVedicPremiumBirthInput(rawInput);
  let workingInput = rawInput;
  let localVedicChartJson;
  let chartRecoveryApplied = false;

  try {
    localVedicChartJson = buildVedicLocalChartJson(workingInput, { strictPremium: true });
  } catch (error) {
    if (hasExplicitLocalChartJson) throw error;
    const safeChartSource = fallbackChartSourceFromBirthInput(normalizedBirthInput);
    workingInput = buildSafeVedicRawInput(rawInput, normalizedBirthInput, safeChartSource);
    chartRecoveryApplied = true;
    log("StrictChartBuildFailedUseSafeChart", {
      code: clean(error?.code || "VEDIC_CHART_SOURCE_INVALID"),
      reason: clean(error?.message || error),
    });
    localVedicChartJson = buildVedicLocalChartJson(workingInput, { strictPremium: false });
  }
  localVedicChartJson.pdfContext = normalizeVedicPdfContext(workingInput, localVedicChartJson);
  localVedicChartJson.profile = {
    name: clean(localVedicChartJson?.pdfContext?.profile?.name || "사용자"),
  };
  localVedicChartJson.user = {
    name: clean(localVedicChartJson?.pdfContext?.profile?.name || "사용자"),
    birthDate: clean(localVedicChartJson?.pdfContext?.profile?.birthDate),
  };
  const birthInput = localVedicChartJson.birthInput;
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    const error = new Error(birthValidation.message);
    error.code = "BIRTH_INPUT_INVALID";
    error.status = 400;
    throw error;
  }

  const signalValidation = validateVedicPremiumChartSignals(localVedicChartJson);
  if (!signalValidation.ok) {
    if (!chartRecoveryApplied) {
      const safeChartSource = fallbackChartSourceFromBirthInput(birthInput);
      workingInput = buildSafeVedicRawInput(rawInput, birthInput, safeChartSource);
      localVedicChartJson = buildVedicLocalChartJson(workingInput, { strictPremium: false });
      localVedicChartJson.pdfContext = normalizeVedicPdfContext(workingInput, localVedicChartJson);
      chartRecoveryApplied = true;
    }
    const recoveredSignalValidation = validateVedicPremiumChartSignals(localVedicChartJson);
    if (!recoveredSignalValidation.ok) {
      const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      error.details = recoveredSignalValidation;
      throw error;
    }
  }

  if (clean(localVedicChartJson?.calculationMode) === "full") {
    log("LocalCalculationSuccess", {
      calculationMode: clean(localVedicChartJson?.calculationMode),
      hasAyanamsa: Boolean(clean(localVedicChartJson.settings?.ayanamsa)),
      hasLagna: Boolean(clean(localVedicChartJson.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(localVedicChartJson.chart?.moonSign)),
      hasNakshatra: Boolean(clean(localVedicChartJson.chart?.nakshatra?.name)),
    });
  } else {
    log("LocalCalculationRecovered", {
      calculationMode: clean(localVedicChartJson?.calculationMode) || "recovered",
      hasAyanamsa: Boolean(clean(localVedicChartJson.settings?.ayanamsa)),
      hasLagna: Boolean(clean(localVedicChartJson.chart?.lagnaSign)),
      hasMoonSign: Boolean(clean(localVedicChartJson.chart?.moonSign)),
      hasNakshatra: Boolean(clean(localVedicChartJson.chart?.nakshatra?.name)),
    });
  }

  log("LLMManuscriptBuildStart", {
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
  });

  const localDraft = null;
  let llmDraft = null;
  try {
    llmDraft = await enhanceVedicPremiumManuscriptWithLLM(env, null, localVedicChartJson, {
      requestId: clean(options?.requestId || rawInput?.reportId || rawInput?.sessionId),
      onChapterDone: (meta) => {
        log("LLMManuscriptChapterDone", {
          chapterNo: Number(meta?.chapterNo || 0),
          chapterId: clean(meta?.chapterId),
          chapterTitle: clean(meta?.chapterTitle),
          completed: Number(meta?.completed || 0),
          total: Number(meta?.total || VEDIC_PREMIUM_CHAPTERS.length),
          attempts: Number(meta?.attempts || 1),
        });
      },
    });
  } catch (error) {
    log("LLMManuscriptFailed", {
      code: clean(error?.code || "VEDIC_LLM_MANUSCRIPT_FAILED"),
      reason: clean(error?.message || error),
    });
    const wrapped = new Error("베다점 프리미엄 원고 생성에 실패했습니다.");
    wrapped.code = clean(error?.code || "VEDIC_LLM_MANUSCRIPT_FAILED");
    wrapped.status = Number(error?.status || 502);
    wrapped.details = normalizeManuscriptError(error);
    throw wrapped;
  }

  log("LLMManuscriptBuildSuccess", {
    chapterCount: safeArray(llmDraft?.chapters).length,
    totalLength: allTextLength(llmDraft?.chapters),
    model: clean(llmDraft?.model),
  });

  const finalChapters = safeArray(llmDraft?.chapters);
  const manuscriptSource = "llm-only";

  const finalValidation = validateVedicFinalManuscript({
    birthInput,
    localVedicChartJson,
    chapters: finalChapters,
    requireSignalIds: true,
  });

  if (!finalValidation.ok) {
    console.error("[VedicPremiumPDF][FinalValidationFailed]", {
      issues: finalValidation.issues,
      stats: finalValidation.stats,
      repetition: finalValidation.repetition,
      chapterMetrics: finalChapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        sectionCount: chapter.sections?.length || 0,
        chars: chapterTextLength(chapter),
      })),
    });
    const error = new Error("베다점 프리미엄 원고 검증에 실패했습니다.");
    error.code = "VEDIC_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = finalValidation;
    throw error;
  }

  const evidenceAudit = buildVedicEvidenceAudit(finalChapters, localVedicChartJson);

  log("FinalManuscriptValidated", {
    chapterCount: finalValidation.stats.chapterCount,
    totalLength: finalValidation.stats.totalLength,
    hasAyanamsa: finalValidation.stats.hasAyanamsa,
    hasLagna: finalValidation.stats.hasLagna,
    hasMoonSign: finalValidation.stats.hasMoonSign,
    hasNakshatra: finalValidation.stats.hasNakshatra,
    manuscriptSource,
  });

  log("PdfRenderStart", {
    chapterCount: finalChapters.length,
    manuscriptSource,
  });

  const chapterDrafts = finalChapters.map((chapter) => ({
    ...chapter,
    localQuality: collectSignals(chapter, localVedicChartJson),
  }));
  const legacyChapters = chapterDrafts.map((chapter) => toLegacyChapterShape(chapter));
  const pdfReady = renderVedicPremiumPdf(chapterDrafts, localVedicChartJson);

  log("PdfRenderSuccess", {
    chapterCount: chapterDrafts.length,
    totalLength: finalValidation.stats.totalLength,
    manuscriptSource,
  });

  return {
    payload: localVedicChartJson,
    birthInput,
    localVedicChartJson,
    localDraft,
    chapters: legacyChapters,
    chapterDrafts,
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    fallbackUsed: false,
    manuscriptSource,
    pdfReady,
    quality: {
      ...finalValidation.stats,
      evidenceAuditOk: evidenceAudit.ok,
      evidenceUniqueSignalCount: evidenceAudit.uniqueSignalCount,
      evidenceUsedSignalRefs: evidenceAudit.totalUsedSignalRefs,
      evidenceMissingRequiredCount: evidenceAudit.missingRequiredCount,
      evidenceInvalidSignalCount: evidenceAudit.invalidSignalCount,
      evidenceUnsupportedClaimCount: evidenceAudit.unsupportedClaimCount,
    },
    diagnostics: {
      llm: {
        reason: "LLM_ONLY",
        failed: false,
        model: clean(llmDraft?.model),
        attempts: safeArray(llmDraft?.attempts),
      },
      manuscript: finalValidation,
      evidence: evidenceAudit,
    },
  };
}

export function validateVedicPayloadForApi(rawInput = {}) {
  const birthInput = normalizeVedicPremiumBirthInput(rawInput);
  const birthValidation = validateVedicBirthInput(birthInput);
  if (!birthValidation.ok) {
    return {
      ok: false,
      code: "BIRTH_INPUT_INVALID",
      missing: birthValidation.hardFail,
      message: birthValidation.message,
      birthInput,
    };
  }

  try {
    const localVedicChartJson = buildVedicLocalChartJson(rawInput, { strictPremium: false });
    const hasCore = Boolean(
      clean(localVedicChartJson?.chart?.lagnaSign)
      || safeArray(localVedicChartJson?.chart?.planets).some((planet) => clean(planet.sign)),
    );

    if (!hasCore) {
      return {
        ok: false,
        code: "MISSING_VEDIC_DATA",
        missing: ["lagnaOrPlanets"],
        message: "베다점 계산 데이터가 부족합니다. 라그나와 핵심 행성 정보를 확인해주세요.",
        birthInput,
      };
    }

    return {
      ok: true,
      missing: [],
      message: "",
      birthInput,
      localVedicChartJson,
    };
  } catch (error) {
    return {
      ok: false,
      code: "VEDIC_DRY_RUN_FAILED",
      missing: ["localVedicChartJson"],
      message: "베다 차트 계산을 완료하지 못했습니다. 입력값을 확인해주세요.",
      details: normalizeManuscriptError(error),
      birthInput,
    };
  }
}
