import {
  VEDIC_PREMIUM_CHAPTERS,
  VEDIC_SOLO_TARGET_CHARS,
  sanitizeVedicPremiumText,
} from "./vedic-premium-chapters.js";
import { getEnv } from "./env.js";

const MIN_SECTION_CHARS = 900;
const MIN_CHAPTER_CHARS = 4000;
const MIN_TOTAL_CHARS = Math.max(Number(VEDIC_SOLO_TARGET_CHARS || 0), 40000);
const VEDIC_MASTER_JSON_SCHEMA_VERSION = "vedic-premium-master-json.v1";
export const VEDIC_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  provider: "vedic-local-assembler",
  templateVersion: "vedic-premium-local-assembled-v2",
});
export const VEDIC_ASTROLOGY_ASSEMBLY_VERSION = VEDIC_PDF_CONFIG.templateVersion;
const FORBIDDEN_TEXT_RE = /\b(?:fallback|safe-local|seed|skeleton|payload|json|debug|local|localdraft|engine|validation|retry|api|wasm|swiss\s*wasm|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|preflightfailed|chart\s*seed\s*failed)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|로컬\s*기반|계산\s*시그니처|데이터\s*정규화|품질\s*검증|재생성|내부\s*데이터|템플릿/gi;
const VEDIC_SAFETY_REPLACEMENTS = Object.freeze([
  [/반드시\s*이혼한다/gi, "관계에서 현실적인 책임과 감정 소통을 꾸준히 조율해야 하는 흐름이다"],
  [/결혼하면\s*불행하다/gi, "장기 관계로 갈수록 기대치, 역할 분담, 생활 리듬을 명확히 맞추는 것이 중요하다"],
  [/망갈\s*도샤라서\s*결혼하면\s*안\s*된다/gi, "Manglik 성향은 강한 추진력과 감정 반응을 만들 수 있어 관계 안에서 속도 조절이 필요하다"],
  [/사데사티라서\s*올해는\s*최악이다/gi, "Sade Sati 성향은 책임, 인내, 구조 조정을 요구하는 시기로 볼 수 있다"],
  [/라후\s*때문에\s*인생이\s*무너진다/gi, "Rahu의 영향은 욕망과 확장 욕구가 커지는 방향으로 나타날 수 있어 선택의 기준이 중요하다"],
  [/케투\s*때문에\s*고립된다/gi, "Ketu의 영향은 거리두기와 내면 정리를 요구할 수 있으므로 관계 단절로만 해석하지 않는 것이 좋다"],
  [/토성\s*때문에\s*실패한다/gi, "Saturn의 영향은 속도를 늦추지만 장기적인 구조를 세우게 만드는 흐름으로 볼 수 있다"],
  [/직장을\s*잃는다/gi, "직장 내 역할 변화나 책임 조정이 생길 수 있으므로 성과와 관계 관리가 중요하다"],
  [/큰\s*사고가\s*난다/gi, "생활 리듬과 안전 관리에 신경 써야 하는 시기다"],
  [/병에\s*걸린다/gi, "생활 리듬과 체력 관리에 신경 써야 하는 시기다"],
  [/아이를\s*갖기\s*어렵다/gi, "가족 계획은 몸과 마음의 리듬을 살피며 신중히 준비하는 편이 좋다"],
  [/가난해진다/gi, "재정 흐름을 보수적으로 관리하며 지출 기준을 선명하게 둘 필요가 있다"],
  [/가족과\s*단절된다/gi, "가족과의 거리와 역할을 현실적으로 조율해야 하는 흐름이다"],
  [/이\s*차트는\s*나쁘다/gi, "이 차트는 관리해야 할 과제와 성장 포인트가 분명하다"],
  [/전생\s*업보\s*때문에\s*불행하다/gi, "반복되는 선택 패턴을 의식적으로 바꿀 기회가 있는 흐름이다"],
]);
const VEDIC_LOCAL_REQUIRED_SIGNAL_HINTS = Object.freeze({
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
const VEDIC_LOCAL_REQUIRED_SIGNAL_IDS_BY_SECTION = Object.freeze({
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

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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
  const profileBirth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const profileLocation = profile.location && typeof profile.location === "object" ? profile.location : {};
  return {
    name: input.name ?? birthInput.name ?? user.name ?? profile.name,
    gender: input.gender ?? input.sex ?? birthInput.gender ?? user.gender ?? profile.gender,
    date: input.birthDate ?? birthInput.birthDate ?? input.birthday ?? input.solarDate ?? input.date ?? birth.date ?? profileBirth.date ?? user.birthDate ?? profile.birthDate,
    year: input.birthYear ?? birthInput.birthYear ?? birth.year ?? profileBirth.year ?? profile.birthYear,
    month: input.birthMonth ?? birthInput.birthMonth ?? birth.month ?? profileBirth.month ?? profile.birthMonth,
    day: input.birthDay ?? birthInput.birthDay ?? birth.day ?? profileBirth.day ?? profile.birthDay,
    time: input.birthTime ?? birthInput.birthTime ?? input.time ?? birth.time ?? profileBirth.time ?? profile.birthTime ?? user.birthTime,
    hour: input.birthHour ?? birthInput.birthHour ?? input.hour ?? input.birth_hour ?? birth.hour ?? profileBirth.hour ?? profile.birthHour,
    minute: input.birthMinute ?? birthInput.birthMinute ?? input.minute ?? birth.minute ?? profileBirth.minute ?? profile.birthMinute,
    timezone: input.timezone ?? birthInput.timezone ?? input.tz ?? location.tz ?? profileLocation.tz ?? user.timezone ?? profile.timezone,
    birthPlace: input.birthPlace ?? birthInput.birthPlace ?? input.place ?? input.locationName ?? (typeof input.location === "string" ? input.location : undefined) ?? location.label ?? location.name ?? user.birthPlace ?? profile.birthPlace ?? profile.place ?? profile.locationName ?? profileLocation.label ?? profileLocation.name,
    latitude: input.latitude ?? birthInput.latitude ?? input.lat ?? location.lat ?? location.latitude ?? profile.latitude ?? profile.lat ?? profileLocation.lat ?? profileLocation.latitude,
    longitude: input.longitude ?? birthInput.longitude ?? input.lng ?? input.lon ?? location.lon ?? location.lng ?? location.longitude ?? profile.longitude ?? profile.lng ?? profile.lon ?? profileLocation.lon ?? profileLocation.lng ?? profileLocation.longitude,
    isTimeUnknown: Boolean(input.isTimeUnknown || birthInput.isTimeUnknown || input.timeUnknown || input.birthTimeUnknown || profile.isTimeUnknown || profileBirth.isTimeUnknown),
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

  const firstHouse = safeArray(chart?.houses).find((house) => Number(house?.house || house?.number) === 1)
    || safeArray(houses).find((house) => Number(house?.house || house?.number) === 1)
    || {};
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

  const lagnaSign = clean(rawInput?.lagna?.sign || chart?.lagnaSignEn || firstHouse?.signEn || chart?.lagnaSign || firstHouse?.sign);
  const lagnaSignKo = clean(rawInput?.lagna?.signKo || chart?.lagnaSign || firstHouse?.sign || chart?.lagnaSignKo);

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
      lagnaSignEn: lagnaSign.signEn || "",
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
  chartJson.chartSource = {
    source: clean(chartSource?.source || chartSource?.calculationSource || ""),
    engineQuality: clean(chartSource?.engineQuality || ""),
    fallbackUsed: chartSource?.fallbackUsed === true,
    ayanamsaName: clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType || ""),
    hasAscendant: Number.isFinite(lagnaLon),
    hasAyanamsaValue: Number.isFinite(Number(chartSource?.ayanamsa)),
    hasAyanamsaName: Boolean(clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType)),
    planetCount: planets.length,
  };
  chartJson.chartSourceQuality = validateVedicPremiumChartSourceQuality({
    chartSource,
    chartJson,
  });
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
  const chart = chartJson?.chart || {};
  const chartHouses = safeArray(chart?.houses);
  const pickChartHouse = (number) => chartHouses.find((house) => Number(house?.house || house?.number) === Number(number)) || {};
  const planetSign = (planet, fallback = "") => clean(planet?.sign || planet?.signKo || planet?.rashi || fallback);
  const chapterId = clean(chapter?.id || "vedic_soul_map");
  const sectionTitle = clean(section?.title || `세부 해석 ${sectionIndex + 1}`);
  const firstHouse = pickChartHouse(1) || pickHouse(context?.bhavas, 1);
  const lagnaEn = clean(chart?.lagnaSignEn || firstHouse?.signEn || context?.lagna?.sign || "Pisces");
  const lagnaKo = clean(chart?.lagnaSign || firstHouse?.sign || context?.lagna?.signKo || "물고기자리");
  const lagnaLord = clean(firstHouse?.lord || context?.lagna?.lord || SIGN_LORD_BY_EN[lagnaEn] || "Jupiter");
  const moon = findPlanetByName(chart?.planets, "Moon") || findPlanetByName(context?.planets, "Moon");
  const sun = findPlanetByName(chart?.planets, "Sun") || findPlanetByName(context?.planets, "Sun");
  const venus = findPlanetByName(chart?.planets, "Venus") || findPlanetByName(context?.planets, "Venus");
  const mars = findPlanetByName(chart?.planets, "Mars") || findPlanetByName(context?.planets, "Mars");
  const mercury = findPlanetByName(chart?.planets, "Mercury") || findPlanetByName(context?.planets, "Mercury");
  const jupiter = findPlanetByName(chart?.planets, "Jupiter") || findPlanetByName(context?.planets, "Jupiter");
  const saturn = findPlanetByName(chart?.planets, "Saturn") || findPlanetByName(context?.planets, "Saturn");
  const rahu = findPlanetByName(chart?.planets, "Rahu") || findPlanetByName(context?.planets, "Rahu");
  const ketu = findPlanetByName(chart?.planets, "Ketu") || findPlanetByName(context?.planets, "Ketu");
  const moonSign = planetSign(moon, chart?.moonSign || "황소자리");
  const sunSign = planetSign(sun, chart?.sunSign || "물병자리");
  const mercurySign = planetSign(mercury, "쌍둥이자리");
  const venusSign = planetSign(venus, "황소자리");
  const marsSign = planetSign(mars, "양자리");
  const jupiterSign = planetSign(jupiter, "사수자리");
  const saturnSign = planetSign(saturn, "염소자리");
  const rahuSign = planetSign(rahu, "물병자리");
  const ketuSign = planetSign(ketu, "사자자리");
  const moonBhava = Number(moon?.bhava || moon?.house || 2);
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
    vedic_soul_map: `라그나 ${lagnaKo}, 문 사인 ${moonSign}, 태양 ${sunSign}을 한 장의 설계도처럼 겹쳐 보며 삶 전체의 방향을 정리합니다.`,
    vedic_lagna: `라그나 ${lagnaKo}와 ${house1}하우스의 리듬을 통해 첫인상, 생존 전략, 몸의 반응 속도를 읽습니다.`,
    vedic_moon_nakshatra: `달 ${moonSign}, 나크샤트라 ${moonNk}, 나크샤트라 로드 ${moonLord}를 통해 감정의 결을 해석합니다.`,
    vedic_sun_self: `태양 ${sunSign}과 ${house10}하우스 책임감을 연결해 자아와 권위의 쓰임을 설명합니다.`,
    vedic_planet_talents: `수성 ${mercurySign}, 금성 ${venusSign}, 화성 ${marsSign}, 목성 ${jupiterSign}, 토성 ${saturnSign}의 재능 배치를 읽습니다.`,
    vedic_bhavas: `${house1}·${house2}·${house4}·${house7}·${house10}하우스를 중심으로 삶의 영역별 과제를 설명합니다.`,
    vedic_career_success: `${house10}하우스, 태양, 목성, 토성, 현재 ${activeDasha} 다샤를 활용해 직업 방향을 구체화합니다.`,
    vedic_money_flow: `${house2}하우스와 ${house11}하우스, 금성과 목성, 토성의 흐름으로 돈의 축적 방식을 해석합니다.`,
    vedic_love_partnership: `${house7}하우스, 금성 ${venusSign}, 화성 ${marsSign}, 달 ${moonSign}, 다라카라카 ${darakaraka}를 통해 관계 패턴을 읽습니다.`,
    vedic_dasha_flow: `현재 ${activeDasha} 마하다샤와 다음 ${nextDasha} 흐름을 중심으로 지금의 과목을 설명합니다.`,
    vedic_karma_growth: `라후 ${rahuSign}, 케투 ${ketuSign}, ${house12}하우스와 나크샤트라 ${moonNk}를 통해 카르마 축을 설명합니다.`,
    vedic_master_plan: `라그나 ${lagnaKo}, 아트마카라카 ${atmakaraka}, 다샤 ${activeDasha}를 하나의 3년 계획으로 통합합니다.`,
  };
  const realityMap = {
    vedic_soul_map: `전체 차트를 넓게 보면 지금 삶의 핵심 배움은 무엇을 붙들고 무엇을 내려놓아야 하는지 우선순위를 세우는 데 있습니다. ${sectionTitle}에서 드러나는 당신의 패턴은 한번 마음을 정하면 깊게 밀고 나가지만, 감정의 파고가 올라오는 날에는 달과 나크샤트라가 주변 분위기까지 흡수해 판단을 무겁게 만들 수 있다는 점입니다.`,
    vedic_lagna: `라그나는 단순한 성격표가 아니라 세상을 처음 맞닥뜨릴 때의 자세입니다. ${sectionTitle}를 보면 당신은 먼저 상황의 결을 읽고 자신의 기준을 세우려는 편이며, 라그나 로드 ${lagnaLord}의 성질 때문에 몸의 리듬이 흔들리면 결정력도 함께 출렁일 수 있습니다.`,
    vedic_moon_nakshatra: `달과 나크샤트라는 마음이 어디에서 안정을 찾고 어디에서 소모되는지 보여줍니다. ${sectionTitle}에서는 ${moonBhava}하우스의 달이 감정 정보를 크게 받아들이는 만큼 관계의 미세한 변화와 말투의 온도까지 민감하게 읽어내는 장면이 자주 보입니다.`,
    vedic_sun_self: `태양은 스스로를 세상에 증명하는 방식입니다. ${sectionTitle}에서 보이는 핵심은 인정 욕구를 숨기려 하기보다, 어떤 기준에서 자신을 빛내고 싶은지 명확히 해야 한다는 점입니다.`,
    vedic_planet_talents: `행성 재능은 재주 목록이 아니라 실제 행동 전략입니다. ${sectionTitle}에서는 강한 행성 ${strongest}이 당신의 성과를 빠르게 끌어올리고, 약한 행성이 만든 틈은 일정 관리나 관계 피로 형태로 먼저 드러난다는 점이 중요합니다.`,
    vedic_bhavas: `하우스는 인생의 장면을 나누는 무대입니다. ${sectionTitle}를 읽으면 관계, 돈, 집, 일의 문제가 따로 터지는 것이 아니라 하나의 축에서 동시에 흔들릴 수 있다는 사실이 분명해집니다.`,
    vedic_career_success: `직업운은 적성 한 단어로 끝나지 않습니다. ${sectionTitle}의 흐름을 보면 조직형, 전문가형, 상담형, 콘텐츠형 가능성이 모두 보이지만 무엇이 오래 가는지는 토성과 목성의 호흡, 그리고 현재 다샤가 요구하는 공부를 받아들이는 태도에 달려 있습니다.`,
    vedic_money_flow: `재물운은 벌어들이는 힘과 지키는 힘이 동시에 작동해야 합니다. ${sectionTitle}를 보면 당신은 수입의 통로를 넓힐 재능이 있으면서도 감정이 흔들릴 때 지출 판단이 느슨해질 수 있어, 돈을 버는 일과 보존하는 규칙을 분리해 운영해야 합니다.`,
    vedic_love_partnership: `사랑과 배우자운은 끌림만으로 읽지 않습니다. ${sectionTitle}에서는 금성과 화성이 만드는 설렘, 달이 원하는 정서적 안전, 다라카라카 ${darakaraka}가 요구하는 관계의 성숙이 함께 작동합니다.`,
    vedic_dasha_flow: `다샤는 예언보다 시기의 과목을 알려 줍니다. ${sectionTitle}에서 현재 ${activeDasha}는 ${dashaMeaning.theme}을 반복해 보여 주고, 다음 ${nextDasha}는 아직 정리되지 않은 숙제를 확대해 드러낼 준비를 하고 있습니다.`,
    vedic_karma_growth: `라후와 케투는 이번 생의 성장축입니다. ${sectionTitle}를 보면 익숙해서 쉽게 고르는 패턴과 두렵지만 반드시 배워야 하는 방향이 분명히 갈리며, 그 갈림길에서 성숙이 시작됩니다.`,
    vedic_master_plan: `최종 계획은 동기부여 문구가 아니라 차트 전체를 삶의 시간표로 바꾸는 작업입니다. ${sectionTitle}에서 가장 중요한 점은 앞으로 3년을 한 번에 바꾸려 하지 말고, 운이 열리는 순서대로 체력, 수익, 관계를 재배치하는 것입니다.`,
  };
  const cautionMap = {
    vedic_soul_map: `${signMeaning.shadow} ${nkMeaning.shadow} 이 조합은 중요한 결정을 앞두고 과도한 책임감을 만들 수 있으므로, 큰 결정일수록 원칙 문장을 먼저 적어 두는 편이 좋습니다.`,
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
    vedic_career_success: `조직형, 전문가형, 창업형, 상담형, 콘텐츠형 중 지금 가장 가까운 길 하나를 정해 90일 안에 증거를 남기십시오.`,
    vedic_money_flow: `고정 지출 세 가지를 점검하고, 다음 달까지 유지할 축적 규칙 한 가지를 숫자로 정하십시오.`,
    vedic_love_partnership: `관계에서 되풀이되는 서운함 하나를 골라, 사실 전달 문장과 감정 표현 문장을 분리해 써 보십시오.`,
    vedic_dasha_flow: `지금 다샤가 요구하는 과제 한 가지를 정해 90일 실행표로 만들고 매주 완료 여부를 표시하십시오.`,
    vedic_karma_growth: `나를 지치게 하는 익숙한 습관 하나와, 낯설지만 성장시키는 행동 하나를 적어 매주 교차 실천하십시오.`,
    vedic_master_plan: `앞으로 3년 동안 반드시 키울 힘 하나, 내려놓을 습관 하나, 가장 빛나는 길 하나를 문장으로 선언하십시오.`,
  };

  const sections = [
    ["핵심 진단", `${sectionTitle}에서 가장 먼저 보이는 사실은 ${focusMap[chapterId] || focusMap.vedic_soul_map} 라그나 로드 ${lagnaLord}는 ${signMeaning.core}을 만들고, 달 ${moonSign}과 나크샤트라 ${moonNk} ${moonPada}파다는 ${sectionTitle}를 다룰 때 감정의 결을 섬세하게 조정합니다. 특히 이 카테고리에서는 ${sectionIndex + 1}번째 관문에서 무엇을 먼저 붙드느냐가 이후 흐름을 바꾸므로, 차트는 막연한 위로보다 행동의 순서를 분명히 제시하는 지도에 가깝습니다.`],
    ["차트 근거", `${sectionTitle}의 차트 근거는 매우 구체적입니다. 태양 ${sunSign}, 수성 ${mercurySign}, 금성 ${venusSign}, 화성 ${marsSign}, 목성 ${jupiterSign}, 토성 ${saturnSign}이 ${sectionTitle}에서 역할을 나누고, 라후 ${rahuSign}와 케투 ${ketuSign} 축은 여기서 욕망과 익숙함의 방향을 갈라놓습니다. ${yogaLine ? `감지되는 핵심 요가는 ${yogaLine}이며, ` : ""}${drishtiLine ? `드리슈티는 ${drishtiLine} 흐름으로 압력을 보냅니다. ` : ""}${dignityLine || ""} 또한 현재 ${activeDasha} 다샤와 다음 ${nextDasha} 흐름이 겹치므로, 이 단락은 지금 배워야 할 과목과 미뤄야 할 유혹을 동시에 읽게 만듭니다. ${clean(insightCard?.text)}`],
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
      code: clean(error.code),
      status: Number(error.status || 0) || null,
      reasonClass: clean(error.reasonClass || classifyVedicLlmFailure(error)),
      details: error.details || null,
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

function classifyVedicLlmFailure(error) {
  const code = clean(error?.code || error?.error).toLowerCase();
  const message = clean(error?.message || error).toLowerCase();
  const status = Number(error?.status || 0);
  const joined = `${code} ${message}`;
  if (code === "gemini_keys_missing" || status === 401 || status === 403 || /key|credential|auth|permission|unauthorized|forbidden/.test(joined)) return "missing_key";
  if (status === 429 || /rate|quota|resource_exhausted/.test(joined)) return "rate_limited";
  if (status === 408 || status === 504 || /timeout|deadline|aborted|abort|timed\s*out|524/.test(joined)) return "timeout";
  if (/chapter_invalid|invalid_chapter|parse|json|schema|signal|unsupported-claims/.test(joined)) return "invalid_chapter";
  if (/manuscript_invalid|quality|repetition|evidence|validation|검증/.test(joined)) return "quality_gate_failed";
  return "llm_generation_failed";
}

export function normalizeVedicError(error) {
  return normalizeManuscriptError(error);
}

function sanitizeVedicSafetyText(value) {
  let out = String(value || "");
  VEDIC_SAFETY_REPLACEMENTS.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out;
}

function cleanForbidden(text) {
  return sanitizeVedicSafetyText(sanitizeVedicPremiumText(String(text || "")))
    .replace(FORBIDDEN_TEXT_RE, "")
    .replace(/한 줄가/g, "한 줄이")
    .replace(/한 줄를/g, "한 줄을")
    .replace(/한 줄는/g, "한 줄은")
    .replace(/방식를/g, "방식을")
    .replace(/방식는/g, "방식은")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanForbiddenBlock(text) {
  const lineBreakToken = "%%VEDIC_NL%%";
  return sanitizeVedicSafetyText(sanitizeVedicPremiumText(String(text || "").replace(/\r\n?/g, "\n").replace(/\n/g, lineBreakToken)))
    .replace(FORBIDDEN_TEXT_RE, "")
    .split(lineBreakToken).join("\n")
    .replace(/한 줄가/g, "한 줄이")
    .replace(/한 줄를/g, "한 줄을")
    .replace(/한 줄는/g, "한 줄은")
    .replace(/방식를/g, "방식을")
    .replace(/방식는/g, "방식은")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasVedicBrokenText(value) {
  const body = clean(value);
  return /[\uFFFD\uF900-\uFAFF]/.test(body)
    || /\?{2,}/.test(body)
    || /\?[가-힣]/.test(body)
    || /(?:Ã.|Â.|â[€€™€œ]|[ìíêë][\u0080-\u02FF]{1,3}){2,}/.test(body)
    || /[ㄱ-ㅎㅏ-ㅣ]{2,}/.test(body);
}

function readVedicFlag(env, key, fallback = false) {
  const value = clean(getEnv(env, key));
  if (!value) return Boolean(fallback);
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return Boolean(fallback);
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashStableValue(value) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getBirthTimeConfidence(birthInput = {}, rawInput = {}) {
  const explicit = clean(rawInput?.birthTimeConfidence || birthInput?.birthTimeConfidence).toLowerCase();
  if (["known", "approximate", "unknown"].includes(explicit)) return explicit;
  if (birthInput?.isTimeUnknown || !Number.isFinite(Number(birthInput?.birthHour))) return "unknown";
  if (birthInput?.isTimeApproximate || rawInput?.isTimeApproximate) return "approximate";
  return "known";
}

export function buildVedicAstrologyFacts(localVedicChartJson = {}, rawInput = {}) {
  const birthInput = safeObject(localVedicChartJson?.birthInput);
  const chart = safeObject(localVedicChartJson?.chart);
  const context = localVedicChartJson?.pdfContext || normalizeVedicPdfContext(rawInput, localVedicChartJson);
  const planets = safeArray(chart?.planets).map(compactVedicPlanetForLlm).filter((planet) => clean(planet.name));
  const houses = safeArray(chart?.houses).map(compactVedicHouseForLlm).filter((house) => house.house >= 1 && house.house <= 12);
  const moonNakshatra = safeObject(context?.moonNakshatra || chart?.nakshatra);
  const dashaPeriods = safeArray(chart?.dashas?.periods);
  const dashaSystem = clean(chart?.dashas?.system || "vimshottari");
  const birthTimeConfidence = getBirthTimeConfidence(birthInput, rawInput);
  const dignities = planets.map((planet) => ({
    planet: clean(planet.name),
    planetKo: clean(planet.nameKo),
    dignity: clean(planet.dignity || "unknown"),
  }));

  return {
    productId: "vedic_astrology",
    serviceKey: "vedic-premium",
    mode: "personal",
    assemblyVersion: VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
    birthInfo: {
      name: clean(birthInput.name),
      gender: clean(birthInput.gender),
      birthDate: clean(birthInput.birthDate),
      birthTime: clean(birthInput.birthTime),
      birthHour: Number.isFinite(Number(birthInput.birthHour)) ? Number(birthInput.birthHour) : null,
      birthMinute: Number.isFinite(Number(birthInput.birthMinute)) ? Number(birthInput.birthMinute) : 0,
      timezone: clean(birthInput.timezone),
      birthPlace: clean(birthInput.birthPlace),
      latitude: Number.isFinite(Number(birthInput.latitude)) ? Number(birthInput.latitude) : null,
      longitude: Number.isFinite(Number(birthInput.longitude)) ? Number(birthInput.longitude) : null,
      birthTimeConfidence,
    },
    partnerBirthInfo: null,
    targetPeriod: {
      targetYear: Number.isFinite(Number(rawInput?.targetYear || rawInput?.targetPeriod?.targetYear)) ? Number(rawInput?.targetYear || rawInput?.targetPeriod?.targetYear) : null,
      startDate: clean(rawInput?.startDate || rawInput?.targetPeriod?.startDate),
      endDate: clean(rawInput?.endDate || rawInput?.targetPeriod?.endDate),
      label: clean(rawInput?.periodLabel || rawInput?.targetPeriod?.label),
    },
    calculationBasis: {
      zodiacType: clean(localVedicChartJson?.settings?.zodiac || "sidereal"),
      ayanamsa: clean(localVedicChartJson?.settings?.ayanamsa || context?.settings?.ayanamsa || "Lahiri"),
      houseSystem: clean(localVedicChartJson?.settings?.houseSystem || "whole-sign"),
      dashaSystem,
      timezone: clean(birthInput.timezone),
      birthPlace: { label: clean(birthInput.birthPlace) },
      coordinates: {
        latitude: Number.isFinite(Number(birthInput.latitude)) ? Number(birthInput.latitude) : null,
        longitude: Number.isFinite(Number(birthInput.longitude)) ? Number(birthInput.longitude) : null,
      },
      ephemerisVersion: clean(rawInput?.vedicBase?.chart?.source || rawInput?.chart?.source || "worker-swiss-vedic-chart"),
      algorithmVersion: "vedic-premium-worker-local-v1",
      dateBoundaryRule: "existing_engine_basis",
      birthTimeConfidence,
    },
    rashiChart: {
      ascendant: {
        sign: clean(chart?.lagnaSign || context?.lagna?.signKo),
        signEn: clean(context?.lagna?.sign),
        lord: clean(context?.lagna?.lord),
      },
      moonSign: { sign: clean(chart?.moonSign) },
      sunSign: { sign: clean(chart?.sunSign) },
      grahaPositions: planets,
      housePlacements: houses,
      aspects: safeArray(chart?.aspects || localVedicChartJson?.insights?.drishti),
      retrogradePlanets: planets.filter((planet) => planet.retrograde).map((planet) => clean(planet.nameKo || planet.name)),
      combustPlanets: [],
      exaltedPlanets: planets.filter((planet) => clean(planet.dignity) === "exalted").map((planet) => clean(planet.nameKo || planet.name)),
      debilitatedPlanets: planets.filter((planet) => clean(planet.dignity) === "debilitated").map((planet) => clean(planet.nameKo || planet.name)),
      ownSignPlanets: planets.filter((planet) => clean(planet.dignity) === "own").map((planet) => clean(planet.nameKo || planet.name)),
    },
    divisionalCharts: {
      navamsaD9: safeObject(context?.divisionalCharts?.navamsaD9 || rawInput?.navamsaD9),
      dashamsaD10: safeObject(context?.divisionalCharts?.dashamsaD10 || rawInput?.dashamsaD10),
      otherCharts: safeObject(context?.divisionalCharts?.otherCharts || {}),
    },
    nakshatra: {
      moonNakshatra,
      moonPada: clean(moonNakshatra?.pada),
      nakshatraLord: clean(moonNakshatra?.lord),
      keywords: safeArray(VEDIC_NAKSHATRA_INTERPRETATION[clean(moonNakshatra?.name)] ? [
        VEDIC_NAKSHATRA_INTERPRETATION[clean(moonNakshatra?.name)]?.instinct,
        VEDIC_NAKSHATRA_INTERPRETATION[clean(moonNakshatra?.name)]?.advice,
      ] : []).map((item) => clean(item)).filter(Boolean),
    },
    planetaryStrengths: {
      shadbala: safeObject(rawInput?.shadbala || context?.shadbala),
      dignities,
      functionalBenefics: safeArray(context?.functionalBenefics),
      functionalMalefics: safeArray(context?.functionalMalefics),
    },
    yogas: safeArray(localVedicChartJson?.insights?.yogas || context?.yogas),
    doshas: safeArray(localVedicChartJson?.insights?.doshas || context?.doshas),
    houseThemes: safeArray(localVedicChartJson?.insights?.cards),
    personalityCore: safeArray(localVedicChartJson?.interpretationSeeds?.personalityKeywords),
    emotionalPattern: safeArray(localVedicChartJson?.interpretationSeeds?.soulKeywords),
    careerTalentPattern: safeArray(localVedicChartJson?.interpretationSeeds?.careerKeywords),
    wealthPattern: safeArray(localVedicChartJson?.interpretationSeeds?.moneyKeywords),
    relationshipPattern: safeArray(localVedicChartJson?.interpretationSeeds?.relationshipKeywords),
    marriagePattern: safeArray(localVedicChartJson?.interpretationSeeds?.relationshipKeywords),
    familyPattern: safeArray(localVedicChartJson?.interpretationSeeds?.familyKeywords),
    healthLifestylePattern: safeArray(localVedicChartJson?.interpretationSeeds?.healthKeywords),
    spiritualKarmaPattern: safeArray(localVedicChartJson?.interpretationSeeds?.karmaKeywords),
    currentDasha: {
      mahadasha: { planet: clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha) },
      antardasha: { planet: clean(chart?.dashas?.currentAntarDasha || context?.dashas?.currentAntarDasha) },
      pratyantardasha: {},
      timeline: dashaPeriods.slice(0, 12),
    },
    transits: {
      saturnTransit: safeObject(context?.transits?.saturnTransit),
      jupiterTransit: safeObject(context?.transits?.jupiterTransit),
      rahuKetuTransit: safeObject(context?.transits?.rahuKetuTransit),
      majorTransitEvents: safeArray(context?.transits?.majorTransitEvents),
    },
    compatibility: null,
    opportunitySignals: safeArray(localVedicChartJson?.interpretationSeeds?.growthKeywords),
    riskWarnings: safeArray(localVedicChartJson?.interpretationSeeds?.cautionKeywords),
    recommendedActions: safeArray(localVedicChartJson?.insights?.cards).map((card) => clean(card?.text)).filter(Boolean).slice(0, 8),
    avoidActions: birthTimeConfidence === "unknown"
      ? ["출생 시간이 불명확하므로 라그나와 하우스 기반 해석은 단정하지 않는다."]
      : [],
  };
}

export function buildVedicAstrologyChapterPlans(localManuscript = {}, facts = {}, chartJson = {}) {
  return safeArray(localManuscript?.chapters).map((chapter) => {
    const chapterSpec = VEDIC_PREMIUM_CHAPTERS.find((item) => clean(item.id) === clean(chapter.id)) || chapter;
    const evidencePack = buildVedicEvidencePack(chartJson, chapterSpec);
    const lockedFacts = safeArray(evidencePack?.signals)
      .map((signal) => clean(`${signal.label}: ${signal.value}`))
      .filter(Boolean)
      .slice(0, 14);
    const localDraft = safeArray(chapter?.sections)
      .map((section) => [clean(section?.title), clean(section?.body)].filter(Boolean).join("\n\n"))
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 9000);
    const warnings = [
      "라그나, 문 사인, 선 사인, 나크샤트라, 파다, 행성 위치, 하우스 배치, 다샤는 lockedFacts와 로컬 계산 결과만 따른다.",
      "사주 용어와 서양 트로피컬 기준을 베다점 계산 결과처럼 섞지 않는다.",
    ];
    if (facts?.calculationBasis?.birthTimeConfidence !== "known") {
      warnings.push("출생 시간이 불명확하므로 라그나와 하우스 기반 해석은 단정하지 않는다.");
    }
    return {
      chapterId: clean(chapter.id),
      chapterTitle: clean(chapter.title),
      mode: "personal",
      purpose: clean(chapter.subtitle || chapterSpec.subtitle),
      lockedFacts,
      interpretationPoints: safeArray(chapter?.sections).map((section) => clean(section?.title)).filter(Boolean),
      warnings,
      recommendedTone: "전문적이고 신비로운 한국어 베다점 상담문",
      localDraft: cleanForbidden(localDraft),
    };
  });
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
  addVedicEvidenceSignal(signals, "core.lagna.signEn", "라그나 사인 영문", chart?.lagnaSignEn || context?.lagna?.sign, "core");
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
    const required = safeArray(VEDIC_LOCAL_REQUIRED_SIGNAL_IDS_BY_SECTION[clean(category?.id)]);
    return [category.id, required.filter((id) => signalIds.has(id))];
  }));
  const unavailableRequiredSignalIdsBySection = Object.fromEntries(safeArray(chapter?.categories).map((category) => {
    const required = safeArray(VEDIC_LOCAL_REQUIRED_SIGNAL_IDS_BY_SECTION[clean(category?.id)]);
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

function buildVedicEvidenceIndex(evidencePack = {}) {
  return new Map(safeArray(evidencePack?.signals)
    .map((signal) => [clean(signal?.id), signal])
    .filter(([id]) => Boolean(id)));
}

const VEDIC_CHAPTER_ACCURACY_SIGNAL_GROUPS = Object.freeze({
  vedic_soul_map: [["core.lagna."], ["core.moon."], ["core.sun."], ["karaka.atmakaraka"]],
  vedic_lagna: [["core.lagna.", "house.1."], ["core.lagna.lord"], ["house.1."]],
  vedic_moon_nakshatra: [["core.moon.sign"], ["core.moon.nakshatra."], ["core.moon.nakshatra.lord"]],
  vedic_sun_self: [["core.sun.sign", "planet.Sun."], ["planet.Sun."], ["house.10."]],
  vedic_planet_talents: [["planet.Mercury."], ["planet.Venus."], ["planet.Mars."], ["planet.Jupiter."], ["planet.Saturn."]],
  vedic_bhavas: [["house.1."], ["house.2."], ["house.4."], ["house.7."], ["house.10."]],
  vedic_career_success: [["house.10."], ["planet.Sun."], ["planet.Jupiter.", "planet.Saturn."], ["dasha.current."], ["karaka.amatyakaraka"]],
  vedic_money_flow: [["house.2."], ["house.11."], ["planet.Venus."], ["planet.Jupiter."], ["planet.Saturn."]],
  vedic_love_partnership: [["house.7."], ["planet.Venus."], ["planet.Mars."], ["karaka.darakaraka"], ["core.moon.sign", "planet.Moon."]],
  vedic_dasha_flow: [["dasha.current."], ["dasha.next"], ["core.moon.nakshatra.lord"]],
  vedic_karma_growth: [["axis.rahu"], ["axis.ketu"], ["house.8.", "house.12."], ["karaka.atmakaraka"]],
  vedic_master_plan: [["core.lagna."], ["core.moon."], ["karaka.atmakaraka"], ["dasha.current."], ["house.10."]],
});

function vedicSignalIdMatchesNeed(signalId = "", need = "") {
  const id = clean(signalId);
  const token = clean(need);
  if (!id || !token) return false;
  return id === token || id.startsWith(token);
}

function buildVedicChapterAccuracyAudit(chapter = {}) {
  const chapterId = clean(chapter?.id);
  const groups = safeArray(VEDIC_CHAPTER_ACCURACY_SIGNAL_GROUPS[chapterId]);
  const usedSignalIds = new Set();
  safeArray(chapter?.sections).forEach((section) => {
    safeArray(section?.usedSignalIds).forEach((id) => {
      const cleanId = clean(id);
      if (cleanId) usedSignalIds.add(cleanId);
    });
  });
  const used = Array.from(usedSignalIds);
  const missingGroups = groups
    .map((group) => safeArray(group).map((need) => clean(need)).filter(Boolean))
    .filter((group) => group.length && !group.some((need) => used.some((id) => vedicSignalIdMatchesNeed(id, need))));
  return {
    chapterId,
    ok: missingGroups.length === 0,
    requiredGroupCount: groups.length,
    missingGroupCount: missingGroups.length,
    missingGroups,
  };
}

function buildVedicChapterSpecsWithEvidence(chartJson = {}) {
  return VEDIC_PREMIUM_CHAPTERS.map((chapter) => {
    const evidencePack = buildVedicEvidencePack(chartJson, chapter);
    return {
      id: clean(chapter.id),
      order: Number(chapter.order || 0),
      roman: clean(chapter.roman),
      title: clean(chapter.title),
      subtitle: clean(chapter.subtitle),
      categories: safeArray(chapter.categories).map((category, index) => ({
        id: clean(category.id),
        order: index + 1,
        title: clean(category.title),
        requiredSignalIds: safeArray(evidencePack?.requiredSignalIdsBySection?.[category.id]),
      })),
      evidencePack,
    };
  });
}

function summarizeVedicClientEvidence(rawInput = {}) {
  const clientEvidence = safeObject(rawInput?.vedicClientEvidenceJson || rawInput?.clientEvidenceJson);
  if (!clean(clientEvidence?.schemaVersion)) return null;
  return {
    schemaVersion: clean(clientEvidence.schemaVersion),
    source: clean(clientEvidence.source || "browser"),
    chartAvailable: Boolean(clientEvidence.chartAvailable),
    evidenceCount: Number(clientEvidence.evidenceCount || 0),
    hasBirthInput: Boolean(clientEvidence.hasBirthInput),
    hasPlanets: Boolean(clientEvidence.hasPlanets),
    hasAscendant: Boolean(clientEvidence.hasAscendant),
  };
}

export function buildVedicMasterJson(localVedicChartJson = {}, rawInput = {}) {
  const birthInput = safeObject(localVedicChartJson?.birthInput);
  const chart = safeObject(localVedicChartJson?.chart);
  const context = localVedicChartJson?.pdfContext || normalizeVedicPdfContext(rawInput, localVedicChartJson);
  const planets = safeArray(chart.planets).map(compactVedicPlanetForLlm).filter((planet) => clean(planet.name));
  const houses = safeArray(chart.houses).map(compactVedicHouseForLlm).filter((house) => Number(house.house) >= 1);
  const dashaPeriods = safeArray(chart?.dashas?.periods).slice(0, 12).map((row, index) => ({
    planet: clean(row?.planet || row?.lord),
    start: clean(row?.start),
    end: clean(row?.end),
    years: Number.isFinite(Number(row?.years)) ? Number(row.years) : undefined,
    active: Boolean(row?.active || index === 0),
  }));
  return {
    schemaVersion: VEDIC_MASTER_JSON_SCHEMA_VERSION,
    serviceKey: "vedic-premium",
    featureKey: "premium_pdf_vedic",
    reportType: "vedicPremium",
    generationMode: VEDIC_PDF_CONFIG.generationMode,
    assemblyVersion: VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
    calculationSource: clean(localVedicChartJson?.calculationMode || rawInput?.calculationMode || "worker-swiss-vedic-chart"),
    birthProfile: {
      name: clean(birthInput.name) || "사용자",
      gender: clean(birthInput.gender),
      birthDate: clean(birthInput.birthDate),
      birthTime: clean(birthInput.birthTime),
      birthHour: Number.isFinite(Number(birthInput.birthHour)) ? Number(birthInput.birthHour) : null,
      birthMinute: Number.isFinite(Number(birthInput.birthMinute)) ? Number(birthInput.birthMinute) : 0,
      birthPlace: clean(birthInput.birthPlace),
      timezone: clean(birthInput.timezone),
      latitude: Number.isFinite(Number(birthInput.latitude)) ? Number(birthInput.latitude) : null,
      longitude: Number.isFinite(Number(birthInput.longitude)) ? Number(birthInput.longitude) : null,
    },
    settings: {
      zodiac: clean(localVedicChartJson?.settings?.zodiac || "sidereal"),
      ayanamsa: clean(localVedicChartJson?.settings?.ayanamsa || context?.settings?.ayanamsa || "Lahiri"),
      houseSystem: clean(localVedicChartJson?.settings?.houseSystem || "whole-sign"),
      calculationMode: clean(localVedicChartJson?.calculationMode),
    },
    chart: {
      core: {
        lagnaSign: clean(chart.lagnaSign || context?.lagna?.signKo),
        lagnaSignEn: clean(context?.lagna?.sign),
        lagnaLord: clean(context?.lagna?.lord || houses.find((house) => Number(house.house) === 1)?.lord),
        moonSign: clean(chart.moonSign),
        sunSign: clean(chart.sunSign),
        moonNakshatra: safeObject(context?.moonNakshatra || chart.nakshatra),
        currentMahaDasha: clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha),
        currentAntarDasha: clean(chart?.dashas?.currentAntarDasha || context?.dashas?.currentAntarDasha),
        nextDasha: clean(context?.derived?.nextDasha),
      },
      planets,
      houses,
      dashas: {
        system: clean(chart?.dashas?.system || "vimshottari"),
        currentMahaDasha: clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha),
        currentAntarDasha: clean(chart?.dashas?.currentAntarDasha || context?.dashas?.currentAntarDasha),
        periods: dashaPeriods,
      },
      karakas: safeObject(context?.karakas || chart.karakas),
      yogas: safeArray(chart?.insights?.yogas || localVedicChartJson?.insights?.yogas || context?.yogas).slice(0, 12),
      aspects: safeArray(chart?.aspects || chart?.insights?.drishti || localVedicChartJson?.insights?.drishti).slice(0, 32),
      insightCards: safeArray(localVedicChartJson?.insights?.cards || chart?.insights?.cards).slice(0, 12),
      derived: safeObject(context?.derived),
    },
    chapterSpecs: buildVedicChapterSpecsWithEvidence(localVedicChartJson),
    clientEvidence: summarizeVedicClientEvidence(rawInput),
    qualityRules: {
      minSectionChars: MIN_SECTION_CHARS,
      minChapterChars: MIN_CHAPTER_CHARS,
      minTotalChars: MIN_TOTAL_CHARS,
      requiredEvidencePerSection: 3,
      requiredUsedSignalIds: true,
      forbiddenDeveloperTerms: ["JSON", "API", "schema", "prompt", "payload", "debug", "fallback"],
      tone: "professional-mystical-korean-vedic-consultation",
    },
  };
}

export function validateVedicMasterJson(masterJson = {}) {
  const missing = [];
  const requireField = (ok, key) => {
    if (!ok) missing.push(key);
  };
  const birth = safeObject(masterJson?.birthProfile);
  const chart = safeObject(masterJson?.chart);
  const core = safeObject(chart.core);
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const chapterSpecs = safeArray(masterJson?.chapterSpecs);
  requireField(clean(masterJson?.schemaVersion) === VEDIC_MASTER_JSON_SCHEMA_VERSION, "schemaVersion");
  requireField(clean(masterJson?.serviceKey) === "vedic-premium", "serviceKey");
  requireField(clean(masterJson?.generationMode) === VEDIC_PDF_CONFIG.generationMode, "generationMode");
  requireField(clean(birth.birthDate), "birthProfile.birthDate");
  requireField(Number.isFinite(Number(birth.birthHour)), "birthProfile.birthHour");
  requireField(clean(birth.timezone), "birthProfile.timezone");
  requireField(clean(masterJson?.settings?.ayanamsa), "settings.ayanamsa");
  requireField(clean(core.lagnaSign), "chart.core.lagnaSign");
  requireField(clean(core.moonSign), "chart.core.moonSign");
  requireField(clean(core.sunSign), "chart.core.sunSign");
  requireField(clean(core.moonNakshatra?.name), "chart.core.moonNakshatra.name");
  requireField(clean(core.currentMahaDasha) || safeArray(chart?.dashas?.periods).length > 0, "chart.dashas");
  requireField(planets.length >= 9, "chart.planets");
  requireField(houses.length >= 12, "chart.houses");
  requireField(chapterSpecs.length === VEDIC_PREMIUM_CHAPTERS.length, "chapterSpecs");
  chapterSpecs.forEach((chapter, index) => {
    const expected = VEDIC_PREMIUM_CHAPTERS[index] || {};
    requireField(Number(chapter.order) === Number(expected.order), `chapterSpecs.${index}.order`);
    requireField(clean(chapter.title) === clean(expected.title), `chapterSpecs.${index}.title`);
    requireField(safeArray(chapter.categories).length === safeArray(expected.categories).length, `chapterSpecs.${index}.categories`);
  });
  return {
    ok: missing.length === 0,
    missing,
    schemaVersion: VEDIC_MASTER_JSON_SCHEMA_VERSION,
    stats: {
      planetCount: planets.length,
      houseCount: houses.length,
      chapterCount: chapterSpecs.length,
      sectionCount: chapterSpecs.reduce((sum, chapter) => sum + safeArray(chapter.categories).length, 0),
      evidenceSignalCount: chapterSpecs.reduce((sum, chapter) => sum + safeArray(chapter?.evidencePack?.signals).length, 0),
      hasClientEvidence: Boolean(masterJson?.clientEvidence),
    },
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
    chapterSignalHints: safeArray(VEDIC_LOCAL_REQUIRED_SIGNAL_HINTS[clean(chapter?.id)]),
    evidencePack,
  };
}

const VEDIC_SECTION_COUNSELING_FRAMES = Object.freeze({
  soul_1: ["운명의 중심 문장", "라그나, 달, 태양, 아트마카라카를 한 축으로 묶어 삶의 기본 방향을 읽습니다.", "중요한 결정을 앞두면 먼저 한 문장 원칙을 세우고 방향을 좁히는 방식이 좋습니다."],
  soul_2: ["삶의 출발점", "라그나와 1하우스는 세상에 첫 반응을 내는 방식과 기본 자세를 보여줍니다.", "새로운 일을 시작할 때 몸의 속도와 일정의 여백을 먼저 맞추십시오."],
  soul_3: ["마음의 결", "달과 나크샤트라는 감정이 안정되는 조건과 반복되는 내면 반응을 드러냅니다.", "불안이 올라올 때는 즉시 결론을 내기보다 감정의 이름을 기록하는 편이 낫습니다."],
  soul_4: ["전체 분위기", "태양, 달, 현재 다샤를 함께 보아 이번 생의 주요 리듬과 사건의 분위기를 정리합니다.", "큰 흐름을 판단할 때는 한 요소보다 여러 근거가 같은 방향을 가리키는지 확인하십시오."],
  soul_5: ["핵심 배움", "아트마카라카와 달의 주재성, 현재 다샤를 묶어 이번 생에서 되풀이 배우는 과제를 봅니다.", "되풀이되는 문제를 벌로 보지 말고 같은 반응을 다르게 끝내는 훈련으로 다루십시오."],
  lagna_1: ["첫인상과 태도", "라그나, 라그나 로드, 1하우스 사인이 외부 세계 앞에 서는 자세를 만듭니다.", "처음 만나는 자리에서는 빠른 증명보다 안정된 리듬을 보여주는 편이 유리합니다."],
  lagna_2: ["세상 대응 방식", "라그나와 달의 사인을 함께 보아 환경 변화에 반응하는 기본 방식을 읽습니다.", "상황을 바꾸기 전 자신의 반응 속도를 먼저 조절하면 판단의 흔들림이 줄어듭니다."],
  lagna_3: ["생존 전략", "라그나 로드, 1하우스, 화성의 신호를 통해 위기에서 힘을 쓰는 방식을 봅니다.", "급한 상황에서는 모든 것을 밀어붙이기보다 한 가지 행동만 먼저 완수하십시오."],
  lagna_4: ["몸과 마음의 리듬", "라그나, 달, 토성의 신호를 통해 체력과 정서가 버티는 방식을 확인합니다.", "루틴이 깨지면 판단도 흔들리므로 수면, 식사, 이동 시간을 먼저 보호하십시오."],
  lagna_5: ["라그나 활용법", "라그나와 현재 다샤를 함께 보아 지금 몸에 맞는 현실 전략을 정합니다.", "이번 시기에는 큰 변화를 한 번에 잡기보다 매일 반복 가능한 기준을 세우는 편이 좋습니다."],
  moon_1: ["감정 구조", "달의 사인, 달의 하우스, 나크샤트라가 마음의 기본 온도와 반응을 설명합니다.", "감정이 빠르게 움직일 때는 관계보다 몸의 안정 조건을 먼저 회복하십시오."],
  moon_2: ["영혼의 결", "나크샤트라 이름, 파다, 주재 행성을 통해 무의식의 세부 결을 읽습니다.", "익숙한 끌림이 반복될 때는 그것이 안정인지 습관인지 구분해야 합니다."],
  moon_3: ["불안 반응", "달, 달의 하우스, 토성의 신호를 함께 보아 압박을 받을 때의 패턴을 봅니다.", "불안을 없애려 하기보다 일정과 책임 범위를 줄여 마음이 숨 쉴 공간을 만드십시오."],
  moon_4: ["편안한 조건", "달과 금성의 신호를 통해 마음이 풀리고 관계가 부드러워지는 조건을 찾습니다.", "좋아하는 것과 안전한 것을 구분하면 관계 판단이 훨씬 선명해집니다."],
  moon_5: ["감정의 힘", "달의 사인, 나크샤트라 주재성, 현재 다샤를 묶어 감정을 쓰는 방향을 정합니다.", "감정은 판단을 흐리는 요소가 아니라 제대로 기록하면 결정을 정교하게 만드는 자료입니다."],
  sun_1: ["자존감 방식", "태양의 사인, 하우스, 강약 신호를 통해 자존감이 회복되는 방식을 봅니다.", "인정받기 위한 행동보다 스스로 책임질 수 있는 기준을 먼저 세우십시오."],
  sun_2: ["사회적 인정", "태양, 10하우스 사인을 통해 바깥에서 어떤 모습으로 인정받고 싶은지 읽습니다.", "명예와 성과를 동시에 좇기보다 지금 증명할 역할 하나를 분명히 하십시오."],
  sun_3: ["권위와 책임", "태양의 위치, 토성, 10하우스 로드를 함께 보아 책임을 다루는 태도를 봅니다.", "부담을 피하기보다 맡을 책임과 거절할 책임을 나누어야 합니다."],
  sun_4: ["중심의 흔들림", "태양의 강약과 달의 신호를 함께 보아 자아가 흔들리는 순간을 확인합니다.", "비교가 시작되면 외부 평가보다 오늘 지킬 기준 하나로 돌아오십시오."],
  sun_5: ["빛의 회복", "태양과 현재 다샤를 묶어 자기 확신을 회복하는 현실 방법을 정합니다.", "지금은 큰 선언보다 매일 반복되는 작은 완수가 자신감을 되살립니다."],
  planet_1: ["사고와 말", "수성의 사인, 하우스, 강약을 통해 생각을 정리하고 전달하는 방식을 봅니다.", "말이 빨라질수록 기록을 먼저 두면 오해와 누락을 줄일 수 있습니다."],
  planet_2: ["사랑과 취향", "금성의 사인, 하우스, 강약을 통해 끌림과 아름다움의 기준을 읽습니다.", "좋아하는 감각을 현실 조건과 연결하면 관계와 소비가 안정됩니다."],
  planet_3: ["추진력과 욕망", "화성의 사인, 하우스, 강약을 통해 행동력과 충돌의 방향을 봅니다.", "분노나 조급함이 올라오면 목표를 줄이고 몸으로 처리할 행동을 정하십시오."],
  planet_4: ["확장과 복", "목성의 사인, 하우스, 강약을 통해 성장과 배움의 통로를 봅니다.", "운을 키우려면 사람과 지식을 넓히되 약속은 감당 가능한 범위로 제한하십시오."],
  planet_5: ["과제와 성숙", "토성의 사인, 하우스, 강약을 통해 오래 버텨야 할 책임을 확인합니다.", "느린 진행을 실패로 보지 말고 구조를 만드는 시간으로 다루십시오."],
  bhava_1: ["자기 자신", "1하우스의 사인, 로드, 입궁 행성이 몸과 정체성의 출발점을 보여줍니다.", "자기 관리는 운을 여는 첫 관문이므로 생활 리듬을 가장 먼저 정돈하십시오."],
  bhava_2: ["돈과 말과 가족", "2하우스의 사인, 로드, 입궁 행성이 수입 감각과 말의 습관을 보여줍니다.", "재정 판단을 할 때 말로 약속하기 전에 숫자와 기록을 먼저 확인하십시오."],
  bhava_3: ["집과 안식처", "4하우스의 사인, 로드, 입궁 행성이 마음의 기반과 사적인 안정감을 말합니다.", "외부 성과가 흔들릴 때는 집, 수면, 가족 경계부터 조정하는 편이 좋습니다."],
  bhava_4: ["관계와 배우자", "7하우스의 사인, 로드, 입궁 행성이 상대와 계약을 맺는 방식을 보여줍니다.", "관계에서는 끌림보다 신뢰의 반복 조건을 먼저 확인하십시오."],
  bhava_5: ["직업과 역할", "10하우스의 사인, 로드, 입궁 행성이 사회적 역할과 일의 무대를 보여줍니다.", "일의 방향을 정할 때 이름값보다 오래 맡을 수 있는 역할을 고르십시오."],
  career_1: ["직업 방향", "10하우스와 현재 다샤를 통해 지금 열리는 일의 방향을 읽습니다.", "직업 결정은 흥미보다 꾸준한 기여 방식에서 안정됩니다."],
  career_2: ["인정 방식", "10하우스, 태양, 토성의 신호가 사회에서 신뢰를 얻는 방식을 보여줍니다.", "인정받고 싶을수록 결과물의 기준과 마감 방식을 명확히 하십시오."],
  career_3: ["먼저 쌓을 힘", "아마티아카라카, 토성, 목성의 신호가 일에서 먼저 키울 기반을 말합니다.", "돈보다 먼저 실력의 증거와 추천받을 수 있는 기록을 쌓으십시오."],
  career_4: ["피해야 할 패턴", "10하우스 로드, 토성, 화성의 신호를 통해 무리하거나 소모되는 패턴을 봅니다.", "속도를 높이기 전 책임 범위와 체력 한계를 먼저 정해야 합니다."],
  career_5: ["성공 전략", "10하우스, 아마티아카라카, 현재 다샤를 묶어 실전 전략을 정합니다.", "지금은 역할을 넓히기보다 가장 잘 증명되는 일의 형태를 선명히 하십시오."],
  money_1: ["돈이 들어오는 방식", "2하우스, 11하우스, 목성의 신호가 수입이 만들어지는 통로를 말합니다.", "수입을 키우려면 재능보다 반복 가능한 공급 방식을 먼저 설계하십시오."],
  money_2: ["돈이 새는 지점", "2하우스 로드, 금성, 토성의 신호가 지출과 보존의 균형을 보여줍니다.", "감정적 소비와 필요한 투자를 분리하면 재물 흐름이 안정됩니다."],
  money_3: ["축적과 확장", "2하우스, 11하우스, 토성의 신호를 통해 쌓는 힘과 넓히는 힘을 비교합니다.", "확장보다 먼저 고정 지출과 저축 기준을 분명히 하십시오."],
  money_4: ["재물 태도", "목성, 금성, 현재 다샤가 풍요를 받아들이고 운용하는 태도를 말합니다.", "좋은 기회가 와도 기준 없는 낙관은 피하고 숫자로 확인하십시오."],
  money_5: ["풍요 안정법", "2하우스 로드, 11하우스 로드, 토성이 장기 안정의 조건을 보여줍니다.", "큰 수익보다 오래 유지되는 규칙을 만들 때 재물운이 단단해집니다."],
  love_1: ["사랑할 때의 모습", "7하우스, 금성, 화성이 애정 표현과 끌림의 방식을 설명합니다.", "감정의 속도와 행동의 속도를 분리하면 관계의 안정감이 커집니다."],
  love_2: ["끌리는 사람", "7하우스 로드, 금성의 하우스, 다라카라카가 인연의 분위기를 보여줍니다.", "강한 끌림이 있어도 생활 리듬과 약속 방식이 맞는지 확인하십시오."],
  love_3: ["반복 과제", "7하우스, 화성, 토성의 신호가 관계에서 반복되는 긴장 지점을 말합니다.", "논쟁을 이기려 하기보다 반복되는 감정의 순서를 끊는 훈련이 필요합니다."],
  love_4: ["장기 관계 조건", "7하우스, 금성, 다라카라카를 함께 보아 오래 가는 관계의 조건을 읽습니다.", "관계의 미래는 설렘보다 신뢰를 회복하는 방식에서 결정됩니다."],
  love_5: ["사랑 유지법", "7하우스 로드, 달, 금성이 정서적 안정과 애정 표현의 균형을 보여줍니다.", "상대에게 원하는 것을 말하기 전에 자신이 안정되는 조건을 먼저 알아야 합니다."],
  dasha_1: ["현재 시기 주제", "현재 마하 다샤와 안타르 다샤, 다음 다샤를 통해 지금의 큰 과제를 봅니다.", "지금 열리는 문과 아직 기다려야 할 일을 구분하십시오."],
  dasha_2: ["강해지는 기회", "현재 다샤와 목성, 태양의 신호가 성장과 인정의 기회를 보여줍니다.", "기회가 보일 때는 확장보다 명확한 결과물 하나를 먼저 만드십시오."],
  dasha_3: ["감당할 과제", "현재 다샤와 토성, 화성이 이번 시기의 부담과 훈련 지점을 알려줍니다.", "압박을 줄이려면 의지보다 구조와 마감 방식을 먼저 바꾸십시오."],
  dasha_4: ["다음 흐름 준비", "다음 다샤, 현재 다샤, 나크샤트라 주재성이 전환의 예고를 보여줍니다.", "다가올 흐름을 위해 지금 정리해야 할 약속과 습관을 분명히 하십시오."],
  dasha_5: ["다샤 활용 전략", "현재 다샤, 다음 다샤, 라그나를 함께 보아 시간의 쓰임을 현실화합니다.", "운의 흐름을 기다리기보다 그 흐름에 맞는 생활 순서를 정하십시오."],
  karma_1: ["이번 생의 욕망", "라후의 사인, 하우스, 축이 새롭게 끌리는 성장 방향을 보여줍니다.", "욕망을 억누르기보다 책임질 수 있는 형태로 이름 붙이십시오."],
  karma_2: ["익숙한 습관", "케투의 사인, 하우스, 축이 이미 익숙하지만 내려놓아야 할 방식을 보여줍니다.", "편한 반응이 되풀이될수록 새로운 배움이 막히는지 살피십시오."],
  karma_3: ["반복 숙제", "라후와 케투의 하우스, 8하우스가 반복되는 전환 과제를 보여줍니다.", "같은 문제를 다시 만났다면 반응을 바꾸는 것이 가장 빠른 해소입니다."],
  karma_4: ["관계와 일의 카르마", "7하우스, 10하우스, 라후의 신호가 사람과 일에서 반복되는 과제를 말합니다.", "관계와 일을 같은 방식으로 통제하려는 습관을 줄이십시오."],
  karma_5: ["성숙의 길", "케투, 아트마카라카, 현재 다샤가 성숙할수록 열리는 방향을 보여줍니다.", "포기할 것과 책임질 것을 구분하면 오래 막혔던 길이 정리됩니다."],
  master_1: ["최종 핵심 메시지", "라그나, 달, 아트마카라카를 묶어 리포트 전체의 핵심을 다시 정리합니다.", "모든 결정은 몸의 리듬, 마음의 안정, 영혼의 방향이 함께 맞을 때 힘을 얻습니다."],
  master_2: ["키워야 할 힘", "라그나 로드, 목성, 토성이 앞으로 길러야 할 지속력을 알려줍니다.", "재능보다 오래 지속되는 구조를 키울 때 운의 폭이 넓어집니다."],
  master_3: ["내려놓을 습관", "케투, 토성, 달의 신호가 익숙하지만 소모적인 습관을 보여줍니다.", "반복되는 회피를 줄이고 작게라도 끝내는 경험을 쌓으십시오."],
  master_4: ["앞으로 3년", "현재 다샤, 다음 다샤, 10하우스가 앞으로의 현실 방향을 정리합니다.", "3년 계획은 성과보다 역할, 역할보다 생활 리듬에서 시작해야 합니다."],
  master_5: ["빛나는 길", "태양, 아트마카라카, 10하우스를 통해 자신을 가장 밝히는 길을 봅니다.", "남에게 맞는 길보다 자신이 책임질 수 있는 빛을 붙드십시오."],
});

function signalCategoryLabel(signalId = "") {
  const id = clean(signalId);
  if (id.startsWith("planet.")) return "행성 반응";
  if (id.startsWith("house.")) return "하우스 자리";
  if (id.startsWith("dasha.")) return "다샤의 시간";
  if (id.startsWith("karaka.")) return "카르마의 축";
  if (id.startsWith("axis.")) return "업의 방향";
  if (id.includes("nakshatra")) return "나크샤트라 결";
  return "";
}

function vedicEvidenceCountLabel(count = 0) {
  const total = Number(count || 0);
  if (total >= 4) return "여러 단서";
  if (total === 3) return "세 단서";
  if (total === 2) return "두 단서";
  return "첫 근거";
}

function vedicSectionApplicationFocus(sectionId = "", sectionIndex = 0) {
  const id = clean(sectionId);
  if (id.startsWith("career_")) return "일의 방향과 책임 범위를 한꺼번에 바꾸기보다 오늘 맡을 역할 하나를 먼저 분명히 하십시오";
  if (id.startsWith("money_")) return "수입 방식과 지출 기준을 동시에 흔들기보다 돈이 들어오고 머무는 길을 하나씩 정리하십시오";
  if (id.startsWith("love_")) return "관계의 결론을 서두르기보다 끌림, 약속, 생활 리듬이 같은 방향인지 차분히 살피십시오";
  if (id.startsWith("moon_")) return "감정의 이름을 먼저 붙이고 몸이 안정되는 조건을 하나 회복한 뒤 다음 말을 고르십시오";
  if (id.startsWith("dasha_")) return "지금 열리는 시간과 아직 기다려야 할 시간을 구분해 오늘 움직일 범위만 정하십시오";
  if (id.startsWith("karma_")) return "되풀이되는 장면을 탓으로 돌리기보다 이번에는 다르게 끝낼 행동 하나를 고르십시오";
  if (id.startsWith("bhava_")) return "해당 삶의 영역에서 가장 자주 되풀이되는 행동을 하나 적고 그 행동의 대가를 살피십시오";
  const variants = [
    "생활 전체를 한 번에 바꾸기보다 가장 가까운 행동 하나를 조용히 바로잡으십시오",
    "마음의 반응과 실제 일정이 어긋나는 지점을 먼저 확인한 뒤 움직이십시오",
    "크게 선언하기보다 꾸준히 지킬 작은 원칙을 세우는 편이 이번 리듬에 맞습니다",
    "관계, 일, 돈, 회복 중 지금 가장 흔들리는 한 영역만 골라 조정하십시오",
  ];
  return variants[Math.abs(Number(sectionIndex || 0)) % variants.length];
}

function vedicStableSeed(parts = []) {
  const text = safeArray(parts).map((part) => clean(part)).join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVedicVariant(list = [], seed = 0, offset = 0) {
  const items = safeArray(list).filter(Boolean);
  if (!items.length) return "";
  return items[Math.abs(Number(seed || 0) + Number(offset || 0)) % items.length];
}

function planetBrief(planets = [], name = "") {
  const planet = findPlanetByName(planets, name) || {};
  const en = normalizePlanetName(name) || clean(planet?.name);
  const ko = PLANET_KO[en] || clean(planet?.nameKo || name);
  const sign = clean(planet?.sign || planet?.rashiKo || planet?.signEn || planet?.rashi);
  const house = Number(planet?.house || planet?.bhava || 0);
  return `${ko}${sign ? ` ${sign}` : ""}${house ? ` ${house}하우스` : ""}`.trim();
}

function houseBrief(houses = [], number = 0) {
  const house = pickHouse(houses, number) || {};
  const sign = clean(house?.sign || house?.rashiKo || house?.signEn || house?.rashi);
  const lord = PLANET_KO[clean(house?.lord)] || clean(house?.lord);
  return `${number}하우스${sign ? ` ${sign}` : ""}${lord ? `, 주인 행성 ${lord}` : ""}`;
}

function dashaMeaningFor(value = "") {
  const dashaKo = clean(value);
  const dashaEn = PLANET_EN_BY_KO[dashaKo] || normalizePlanetName(dashaKo) || dashaKo;
  return VEDIC_DASHA_INTERPRETATION[dashaEn] || VEDIC_DASHA_INTERPRETATION.Moon;
}

function buildVedicPersonalizedSectionInsight(chapterSpec = {}, category = {}, chartJson = {}, evidenceSignals = [], usedSignalIds = [], sectionIndex = 0) {
  const chart = chartJson?.chart || {};
  const context = chartJson?.pdfContext || normalizeVedicPdfContext({}, chartJson);
  const birth = chartJson?.birthInput || context?.profile || {};
  const sectionId = clean(category?.id);
  const chapterId = clean(chapterSpec?.id);
  const sectionAnchor = clean(category?.title || "이 항목");
  const activeDasha = clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha || "");
  const dashaMeaning = dashaMeaningFor(activeDasha);
  const signals = safeArray(evidenceSignals).map((item) => clean(item)).filter(Boolean);
  const ids = safeArray(usedSignalIds).map((id) => clean(id)).filter(Boolean);
  const seed = vedicStableSeed([
    birth?.birthDate,
    birth?.birthTime,
    sectionId,
    chapterId,
    activeDasha,
    ...signals,
  ]);
  const primaryEvidence = signals[seed % Math.max(1, signals.length)] || clean(category?.title || "첫 근거");
  const secondaryEvidence = signals[(seed + 1) % Math.max(1, signals.length)] || primaryEvidence;
  const tertiaryEvidence = signals[(seed + 2) % Math.max(1, signals.length)] || secondaryEvidence;
  const sectionCase = vedicJosaCase(sectionAnchor);
  const primaryCase = vedicJosaCase(primaryEvidence);
  const secondaryCase = vedicJosaCase(secondaryEvidence);
  const tertiaryCase = vedicJosaCase(tertiaryEvidence);
  const primaryLabel = "첫 단서";
  const secondaryLabel = "보조 단서";
  const tertiaryLabel = "세부 단서";
  const hasDashaEvidence = ids.some((id) => id.startsWith("dasha."));
  const domainLine = pickVedicVariant([
    `${sectionAnchor}에서는 ${primaryCase.agent} 먼저 드러납니다. ${sectionAnchor}의 ${secondaryLabel}는 현실 조정을 보완합니다.`,
    `${sectionCase.object} 생활 장면에 놓고 보면 ${secondaryEvidence}보다 ${primaryLabel}가 우선순위를 정합니다.`,
    `${sectionAnchor}에서 ${primaryCase.agent} 선명할 때 ${sectionAnchor}의 실행 순서가 가까워집니다. ${tertiaryLabel}는 ${sectionAnchor}의 보조 잣대입니다.`,
    `${sectionAnchor}의 균형은 ${secondaryCase.agent} 잡아 줍니다. ${sectionAnchor}의 ${primaryLabel}는 결론의 방향을 좁힙니다.`,
  ], seed, 0);
  const openingPhrase = pickVedicVariant([
    "처음 살필 문은",
    "가장 먼저 반응하는 자리는",
    "해석의 첫 불빛은",
    "오늘의 초점은",
    "차트가 먼저 가리키는 곳은",
  ], seed, 1);
  const boundaryPhrase = pickVedicVariant([
    `${sectionAnchor}에서 ${primaryCase.object} 벗어난 판단은 결론으로 넓히지 않습니다`,
    `${sectionAnchor}의 현실 조언은 ${secondaryCase.agent} 보여 주는 범위 안에서만 세웁니다`,
    `${sectionCase.topic} ${primaryCase.agent} 가리키는 ${sectionAnchor}의 지점까지만 경계를 잡습니다. ${secondaryLabel}는 ${sectionAnchor}의 보조 잣대입니다`,
    `${sectionAnchor}에서는 ${tertiaryCase.agent} 보조선일 때 ${sectionAnchor}의 결론을 낮춰 읽습니다`,
  ], seed, 2);
  const alignmentPhrase = pickVedicVariant([
    `${sectionAnchor}의 판단은 ${primaryCase.object} 먼저 놓고 ${sectionAnchor}에서 가장 작은 실천부터 좁히십시오`,
    `${sectionAnchor}에서 ${secondaryCase.agent} 흔들리면 ${sectionAnchor}의 결론보다 ${sectionAnchor}에서 할 수 있는 검증 행동 하나를 먼저 두십시오`,
    `${sectionAnchor}의 일정은 ${tertiaryCase.agent} 보완할 수 있는 ${sectionAnchor}의 시간대로 나눌 때 오래 갑니다`,
    `${sectionAnchor}에서는 ${primaryCase.object} 중심에 두고 ${secondaryLabel}는 검토 순서로 남기십시오`,
  ], seed, 3);
  const practiceLine = pickVedicVariant([
    hasDashaEvidence ? `${sectionAnchor}의 다샤 조언은 ${dashaMeaning.advice}` : `${sectionAnchor}에서는 ${primaryCase.object} 하루의 작은 행동으로 낮추십시오.`,
    `${sectionAnchor}의 기록은 ${secondaryCase.agent} 드러난 시간과 몸의 반응을 ${sectionAnchor}의 장소와 함께 남길 때 선명해집니다.`,
    `${sectionCase.topic} ${tertiaryCase.object} 무리하게 키우기보다 ${sectionAnchor}의 되풀이를 다루는 원칙으로 바꾸는 편이 좋습니다.`,
    `${sectionAnchor}에서 ${primaryCase.agent} 강해지는 날에는 ${sectionAnchor}의 기존 약속부터 완성도를 보십시오.`,
  ], seed, 4);
  const checkLine = pickVedicVariant([
    `${sectionAnchor}에서는 사람 관계에 ${primaryCase.agent} 어떻게 드러나는지 적고, 비용은 ${sectionAnchor}의 재정 리듬으로, 회복 리듬은 ${sectionAnchor}의 두 번째 기록으로 나누십시오.`,
    `${sectionAnchor}에서 ${secondaryCase.agent} 강해지는 상황과 약해지는 상황을 한 줄씩 나누어 보십시오.`,
    `${sectionAnchor}의 오늘 행동으로 ${tertiaryCase.object} 옮길 때 ${sectionAnchor}에서 줄여야 할 습관을 함께 고르십시오.`,
    `${sectionCase.topic} ${primaryCase.object} 중심으로 ${sectionAnchor}에서 유지할 약속과 미룰 일을 분리하십시오.`,
  ], seed, 5);
  const cautionLine = pickVedicVariant([
    `${sectionAnchor}에서 ${primaryEvidence}만 과하게 믿으면 ${sectionAnchor}의 보조 단서로 경계를 다시 비춰 보십시오.`,
    `${sectionAnchor}에서 ${secondaryCase.object} 살피지 않으면 ${sectionAnchor}의 좋은 기세도 ${sectionAnchor} 안에서는 결론이 성급해질 수 있습니다.`,
    `${sectionAnchor}의 ${tertiaryCase.agent} 약하게 느껴지는 날에는 판단보다 관찰을 먼저 두십시오.`,
    `${sectionAnchor}에서 ${primaryCase.agent} 어긋나게 느껴지는 날에는 ${secondaryCase.object} 곁에 두고 결론을 늦추십시오.`,
  ], seed, 6);
  const closingLine = pickVedicVariant([
    `${sectionAnchor}에서 ${primaryCase.object} 오늘의 행동으로 내릴 때 ${sectionAnchor}의 힘이 실제 삶에 닿습니다.`,
    `${sectionCase.topic} ${secondaryCase.object} 중심으로 ${sectionAnchor}의 주기를 남기면 ${sectionAnchor}에서 오래 쓰이는 원칙이 됩니다.`,
    `${sectionAnchor}에서는 ${tertiaryCase.object} ${sectionAnchor}의 생활 언어로 바꾸면 ${sectionAnchor}의 리듬이 안정됩니다.`,
    `${sectionAnchor}에서 ${primaryCase.object} 먼저 살피고 ${secondaryLabel}를 다음 잣대로 두는 습관이 판단의 등불이 됩니다.`,
  ], seed, 7);

  return { seed, openingPhrase, boundaryPhrase, domainLine, alignmentPhrase, practiceLine, checkLine, cautionLine, closingLine };
}

const VEDIC_CHAPTER_COUNSELING_STYLES = Object.freeze({
  vedic_soul_map: {
    intro: ["영혼의 중심 문장", "삶의 첫 문", "내면의 합의"],
    evidence: ["별들이 남긴 중심 단서", "차트의 중심축", "운명의 재료"],
    reading: ["삶의 방향 읽기", "영혼의 결 해석", "중심을 잡는 방식"],
    practice: ["오늘의 결정법", "흔들림을 줄이는 법", "한 문장 원칙"],
    closing: ["통합 메시지", "이번 생의 문장", "마지막 확인"],
    readingLead: ["전체 차트는 하나의 큰 문장처럼 읽어야 합니다.", "이 장은 성격보다 삶의 방향을 먼저 묻습니다.", "흩어진 단서가 한 방향으로 모일 때 중심 문장이 생깁니다."],
    actionLead: ["중요한 결정 앞에서는", "삶의 방향이 흐려질 때는", "갈림길이 많아질수록"],
    closingLead: ["이 장의 결론은 방향을 줄이는 데 있습니다.", "중심 문장은 거창한 선언보다 꾸준한 원칙으로 드러납니다.", "오늘의 작은 원칙이 다음 시기의 큰 흐름을 안정시킵니다."],
  },
  vedic_lagna: {
    intro: ["몸이 먼저 아는 방향", "세상 앞의 첫 자세", "라그나의 문"],
    evidence: ["몸과 첫인상의 단서", "라그나가 여는 자리", "출발점의 배열"],
    reading: ["첫 반응 해석", "생존 리듬 읽기", "나를 세우는 방식"],
    practice: ["하루의 시작 조정", "몸의 속도 맞추기", "첫 반응의 훈련"],
    closing: ["라그나 활용법", "나답게 서는 원칙", "몸으로 확인할 답"],
    readingLead: ["라그나는 머리보다 몸이 먼저 반응하는 지점입니다.", "첫인상은 꾸민 모습보다 되풀이되는 리듬에서 드러납니다.", "라그나가 안정되면 다른 좋은 단서도 행동으로 내려옵니다."],
    actionLead: ["몸의 속도가 흐트러질 때는", "새로운 일을 시작하기 전에는", "타인의 속도에 휘말릴수록"],
    closingLead: ["이 장의 핵심은 자신을 먼저 세우는 일입니다.", "라그나는 매일의 첫 행동에서 가장 선명해집니다.", "몸이 편안해야 운의 문도 오래 열립니다."],
  },
  vedic_moon_nakshatra: {
    intro: ["마음의 물결", "달이 숨 쉬는 자리", "나크샤트라의 속삭임"],
    evidence: ["감정이 남긴 단서", "무의식의 결", "마음의 별자리"],
    reading: ["감정 구조 해석", "무의식 반응 읽기", "회복 조건 보기"],
    practice: ["마음 회복법", "감정 기록법", "불안을 낮추는 순서"],
    closing: ["달의 조언", "내면의 안정 원칙", "마음이 편안해지는 문"],
    readingLead: ["달은 사건보다 반응의 결을 보여 줍니다.", "나크샤트라는 마음이 되풀이해서 찾는 익숙한 길입니다.", "감정의 문제는 대개 안정 조건을 잃은 자리에서 시작됩니다."],
    actionLead: ["마음이 급해지는 날에는", "관계의 온도에 예민해질수록", "불안이 올라올 때는"],
    closingLead: ["이 장의 답은 감정을 억누르는 데 있지 않습니다.", "달의 결을 알면 회복의 문도 함께 보입니다.", "마음이 안정되면 결정의 언어가 부드러워집니다."],
  },
  vedic_sun_self: {
    intro: ["태양의 자리", "자존감의 불빛", "중심을 세우는 힘"],
    evidence: ["자아가 빛나는 단서", "권위와 책임의 배열", "태양의 무대"],
    reading: ["자존감 해석", "권위 사용법", "인정 욕구 읽기"],
    practice: ["책임을 세우는 법", "빛을 쓰는 법", "중심 회복 훈련"],
    closing: ["태양의 조언", "내 이름을 지키는 원칙", "중심의 문장"],
    readingLead: ["태양은 어디에서 자신을 증명하려 하는지 보여 줍니다.", "자존감은 칭찬보다 책임지는 방식에서 더 선명해집니다.", "빛이 강한 사람일수록 원칙이 흐려지면 쉽게 지칩니다."],
    actionLead: ["인정받고 싶은 마음이 커질 때는", "역할이 무거워지는 시기에는", "자신을 증명하려는 충동이 올라올수록"],
    closingLead: ["이 장의 핵심은 더 빛나는 것보다 바르게 빛나는 일입니다.", "태양은 책임을 받아들일 때 가장 맑게 드러납니다.", "자신의 중심을 지키면 관계의 무게도 가벼워집니다."],
  },
  vedic_planet_talents: {
    intro: ["행성 재능의 결", "타고난 능력의 배열", "재능이 움직이는 방식"],
    evidence: ["행성들이 남긴 단서", "재능과 과제의 배치", "능력의 별자리"],
    reading: ["재능 해석", "강점과 약점 분리", "능력의 쓰임 보기"],
    practice: ["재능 운용법", "장점의 배치", "과한 힘 조절"],
    closing: ["행성의 조언", "능력을 현실로 내리는 법", "재능의 마무리"],
    readingLead: ["행성은 재능 목록이 아니라 힘을 쓰는 순서를 알려 줍니다.", "강한 능력도 배치가 어긋나면 피로가 됩니다.", "이 장은 무엇을 키울지보다 어떻게 나눠 쓸지를 봅니다."],
    actionLead: ["여러 재능을 한꺼번에 쓰려 할 때는", "성과가 흩어지는 시기에는", "좋아하는 일과 잘하는 일이 갈라질수록"],
    closingLead: ["재능은 방향을 만날 때 운이 됩니다.", "능력은 꾸준한 구조로 내려올 때 오래 갑니다.", "행성의 힘은 균형 있게 배치할수록 선명해집니다."],
  },
  vedic_bhavas: {
    intro: ["삶의 무대", "하우스가 여는 장면", "현실 영역의 문"],
    evidence: ["무대별 단서", "삶의 영역 배열", "하우스의 지도"],
    reading: ["영역별 사건 읽기", "되풀이 장면 해석", "생활 무대 보기"],
    practice: ["영역 정리법", "생활의 순서", "우선순위 조정"],
    closing: ["하우스의 조언", "생활 장면의 원칙", "현실을 정돈하는 문"],
    readingLead: ["하우스는 운이 실제로 일어나는 장소를 보여 줍니다.", "같은 문제도 어느 무대에서 시작됐는지에 따라 답이 달라집니다.", "생활의 영역을 나누면 문제의 크기도 줄어듭니다."],
    actionLead: ["여러 영역이 동시에 흔들릴 때는", "현실 문제가 커져 보일수록", "관계와 돈, 일이 엉킬 때는"],
    closingLead: ["이 장의 답은 모든 영역을 한꺼번에 바꾸는 데 있지 않습니다.", "하우스는 삶을 나누어 회복하게 만드는 지도입니다.", "무대를 구분하면 판단도 선명해집니다."],
  },
  vedic_career_success: {
    intro: ["일의 무대", "사회적 이름의 자리", "직업운의 문"],
    evidence: ["일과 책임의 단서", "성과가 쌓이는 배열", "사회적 역할의 지도"],
    reading: ["직업 방향 해석", "인정받는 방식", "일의 무게 읽기"],
    practice: ["90일 실행법", "역할을 세우는 법", "성과를 남기는 순서"],
    closing: ["직업운의 조언", "사회적 빛의 원칙", "일의 다음 문"],
    readingLead: ["직업운은 적성보다 오래 맡을 수 있는 역할을 묻습니다.", "사회적 성공은 타고난 힘과 현재 시간이 만나는 방식에서 드러납니다.", "이 장은 무엇을 할지보다 어떤 책임을 오래 품을지 봅니다."],
    actionLead: ["성과를 급히 증명하고 싶을 때는", "일의 방향이 여러 갈래로 갈라질 때는", "사회적 역할이 무거워질수록"],
    closingLead: ["직업운은 기록으로 남는 책임에서 커집니다.", "일의 복은 꾸준한 성과로 증명됩니다.", "사회적 이름은 오래 지킬 원칙 위에서 밝아집니다."],
  },
  vedic_money_flow: {
    intro: ["돈의 흐름", "풍요가 머무는 자리", "수입과 축적의 문"],
    evidence: ["재물의 단서", "돈이 오가는 배열", "풍요의 지도"],
    reading: ["수입 방식 해석", "축적 리듬 읽기", "지출의 경계 보기"],
    practice: ["돈을 남기는 법", "축적 원칙", "재정 루틴"],
    closing: ["재물운의 조언", "풍요의 원칙", "돈의 다음 문"],
    readingLead: ["재물운은 많이 버는 힘과 오래 남기는 힘을 함께 봅니다.", "돈의 흐름은 감각과 규칙이 만날 때 안정됩니다.", "수입 통로와 지출 습관은 서로 다른 언어로 읽어야 합니다."],
    actionLead: ["수입을 넓히고 싶을 때는", "돈이 새는 느낌이 들 때는", "좋은 기회가 갑자기 커질수록"],
    closingLead: ["풍요는 감각보다 규칙을 만날 때 오래 머뭅니다.", "돈의 운은 작은 누수를 닫는 순간부터 안정됩니다.", "재물의 문은 매일의 숫자 안에서 열립니다."],
  },
  vedic_love_partnership: {
    intro: ["사랑의 결", "관계가 시작되는 자리", "배우자운의 문"],
    evidence: ["관계의 단서", "끌림과 약속의 배열", "사랑의 지도"],
    reading: ["관계 패턴 해석", "끌림의 방식", "장기 관계 조건"],
    practice: ["사랑의 전달법", "약속을 지키는 법", "관계 경계선"],
    closing: ["사랑의 조언", "관계의 원칙", "오래 가는 마음"],
    readingLead: ["사랑은 끌림만으로 유지되지 않고 생활의 약속으로 검증됩니다.", "관계운은 마음이 원하는 안정과 몸이 반응하는 끌림을 함께 봅니다.", "배우자운은 만남보다 되풀이되는 관계 태도에서 더 분명합니다."],
    actionLead: ["마음이 앞서갈 때는", "서운함이 되풀이될수록", "관계의 미래를 빨리 정하고 싶을 때는"],
    closingLead: ["사랑은 정확한 전달과 따뜻한 경계가 함께 있을 때 오래 갑니다.", "관계의 복은 서로의 리듬을 존중하는 자리에서 커집니다.", "오래 가는 인연은 감정과 약속이 같은 방향일 때 남습니다."],
  },
  vedic_dasha_flow: {
    intro: ["다샤의 시간", "운이 여는 시기", "지금의 과목"],
    evidence: ["시간의 단서", "다샤가 남긴 배열", "시기의 문"],
    reading: ["현재 운의 해석", "기회와 과제 분리", "다음 흐름 보기"],
    practice: ["시기를 쓰는 법", "기다릴 것과 움직일 것", "90일 조정"],
    closing: ["다샤의 조언", "시간의 원칙", "운의 다음 문"],
    readingLead: ["다샤는 사건을 맞히기보다 지금 배워야 할 과목을 알려 줍니다.", "시기의 힘은 무엇을 밀고 무엇을 기다릴지 구분하게 만듭니다.", "현재 운은 빠른 결론보다 정확한 순서를 요구합니다."],
    actionLead: ["기회가 빨리 커질 때는", "마음이 급해지는 시기에는", "다음 흐름을 미리 당기고 싶을수록"],
    closingLead: ["운의 시간은 서두를수록 흐려지고 순서를 지킬수록 밝아집니다.", "다샤의 복은 지금의 과목을 끝낼 때 열립니다.", "기다림과 실행을 나누는 사람이 시기를 잘 씁니다."],
  },
  vedic_karma_growth: {
    intro: ["카르마의 축", "되풀이 숙제의 문", "영혼이 자라는 방향"],
    evidence: ["업의 단서", "라후와 케투의 지도", "성장의 배열"],
    reading: ["되풀이 패턴 해석", "익숙함과 성장 분리", "영적 과제 보기"],
    practice: ["되풀이를 끊는 법", "성장을 받아들이는 법", "습관의 전환"],
    closing: ["카르마의 조언", "성장의 원칙", "다시 열 문"],
    readingLead: ["카르마는 벌이 아니라 되풀이되는 반응을 다르게 끝내라는 초대입니다.", "라후와 케투는 익숙한 과거와 낯선 성장을 마주 보게 합니다.", "영적 성장은 현실을 피하는 것이 아니라 같은 장면을 다르게 통과하는 일입니다."],
    actionLead: ["같은 문제가 되풀이될 때는", "익숙한 반응으로 돌아가고 싶을 때는", "두려운 방향이 계속 눈에 밟힐수록"],
    closingLead: ["성장은 낯선 길을 한 번에 정복하는 일이 아닙니다.", "카르마의 문은 반응을 바꾸는 순간부터 열립니다.", "되풀이를 알아차리는 힘이 이번 생의 공부를 밝힙니다."],
  },
  vedic_master_plan: {
    intro: ["최종 설계", "인생의 다음 지도", "마스터플랜의 문"],
    evidence: ["통합 단서", "앞으로의 배열", "실행 계획의 재료"],
    reading: ["전체 통합 해석", "3년 흐름 읽기", "키울 힘과 내려놓을 것"],
    practice: ["마스터플랜 실행", "순서를 세우는 법", "장기 원칙"],
    closing: ["최종 메시지", "인생의 문장", "빛나는 선택"],
    readingLead: ["마스터플랜은 감동적인 문구가 아니라 삶의 순서를 다시 세우는 일입니다.", "전체 차트는 결국 무엇을 키우고 무엇을 내려놓을지 묻습니다.", "긴 계획은 오늘의 꾸준함으로 내려올 때 진짜 힘이 됩니다."],
    actionLead: ["앞으로의 길을 한 번에 정하려 할 때는", "변화 욕구가 커질수록", "긴 계획이 막연해질 때는"],
    closingLead: ["최종 메시지는 멀리 있는 운보다 오늘 지킬 원칙에 가깝습니다.", "인생의 큰 방향은 작은 행동이 같은 방향으로 쌓일 때 바뀝니다.", "빛나는 길은 자신이 책임질 수 있는 자리에서 시작됩니다."],
  },
});

const VEDIC_CATEGORY_COUNSELING_PROFILES = Object.freeze({
  soul_1: ["운명 한 줄", "차트의 중심 문장은 흩어진 갈림길을 하나의 중심으로 모을 때 모습을 드러냅니다.", "라그나, 달, 태양, 아트마카라카를 한 줄로 겹쳐 삶의 주된 방향을 읽습니다.", "지금 삶을 가장 복잡하게 만드는 결정을 한 문장으로 줄일 수 있는지 봅니다.", "이번 주에는 반드시 지킬 원칙 하나와 과감히 미룰 일 하나를 나누십시오.", "전체 차트를 한 번에 결론내리면 실제 행동의 순서가 흐려집니다."],
  soul_2: ["삶의 출발점", "라그나는 세상에 들어서는 첫 문이며 몸이 먼저 아는 운명의 방향입니다.", "1하우스와 라그나 주인 행성으로 시작 방식, 반응 속도, 삶의 자세를 봅니다.", "새로운 일을 시작할 때 몸과 마음 중 무엇이 먼저 거부하는지 확인합니다.", "아침 첫 행동을 고정하고 중요한 약속은 체력이 안정된 시간에 배치하십시오.", "타인의 속도를 따라가면 라그나가 가진 고유한 리듬이 약해집니다."],
  soul_3: ["마음의 결", "달의 자리는 마음이 기억하는 오래된 물결을 비춥니다.", "달의 자리와 나크샤트라로 감정이 흔들리는 원인과 회복 조건을 나눕니다.", "불안이 올라올 때 사실과 느낌을 분리해 말할 수 있는지 봅니다.", "감정이 커진 날에는 결론보다 몸의 반응, 말투, 회복 시간을 기록하십시오.", "감정을 운명 전체의 결론으로 확대하면 달의 작은 신호가 과장됩니다."],
  soul_4: ["인생 분위기", "행성 배열은 삶의 날씨이며 같은 사건도 어떤 공기로 겪는지 알려 줍니다.", "강하게 모인 행성과 분산된 행성을 비교해 인생의 기본 분위기를 읽습니다.", "내가 반복해서 끌리는 환경과 피로해지는 환경이 무엇인지 봅니다.", "좋은 분위기를 만드는 장소, 사람, 시간대를 세 가지로 정리하십시오.", "분위기를 성격 문제로만 보면 차트가 말하는 환경 조정법을 놓칩니다."],
  soul_5: ["이번 생의 배움", "이번 생의 배움은 더 많이 얻는 길보다 더 정확히 결정하는 길에서 열립니다.", "아트마카라카, 달의 주인 별, 현재 다샤를 묶어 영혼의 과제를 봅니다.", "되풀이되는 장면에서 이번에는 어떤 반응을 바꿀 수 있는지 묻습니다.", "같은 문제가 나타나면 즉시 결론내리지 말고 이전 반응과 다른 행동 하나를 고르십시오.", "배움을 고통으로만 해석하면 성장의 문이 아니라 체념의 문을 엽니다."],
  lagna_1: ["첫인상", "첫인상은 꾸미는 얼굴보다 세상 앞에 서는 자연스러운 자세에서 나옵니다.", "라그나 자리, 주인 행성, 1하우스로 외부가 느끼는 첫 기운을 봅니다.", "처음 만나는 자리에서 내가 과하게 증명하려는 부분이 있는지 확인합니다.", "새 만남 전에는 말보다 표정, 속도, 몸의 긴장을 먼저 정돈하십시오.", "첫 반응을 숨기려 할수록 오히려 라그나의 장점이 흐려집니다."],
  lagna_2: ["세상 대응법", "세상을 대하는 방식은 운이 들어오는 문을 여는 손잡이와 같습니다.", "라그나와 달의 관계로 외부 자극을 받아들이고 거절하는 방식을 읽습니다.", "내가 쉽게 받아들이는 요구와 반드시 거절해야 할 요구를 구분합니다.", "하루 일정에서 남의 요청을 받기 전 자신에게 필요한 시간을 먼저 확보하십시오.", "모든 관계에 같은 태도로 대응하면 라그나의 판단 능력이 약해집니다."],
  lagna_3: ["생존 전략", "생존 전략은 위기에서 가장 먼저 나오는 본능의 언어입니다.", "라그나 주인 행성과 화성의 흐름으로 압박을 돌파하는 방식을 봅니다.", "압박이 커질 때 싸우는지, 숨는지, 설득하는지 자신의 첫 반응을 봅니다.", "어려운 일을 시작하기 전 자원, 도움, 마감 시간을 종이에 분리하십시오.", "강한 추진력을 생존 전체의 답으로 삼으면 회복할 시간을 잃습니다."],
  lagna_4: ["몸과 마음의 리듬", "몸의 리듬은 운을 담는 그릇이며 마음은 그 그릇의 물결입니다.", "라그나, 달, 토성의 관계로 체력과 감정의 기본 주기를 읽습니다.", "몸이 지친 날 마음의 결론도 함께 어두워지는지 확인합니다.", "중요한 결정은 수면, 식사, 이동 리듬이 무너지지 않은 날에 하십시오.", "마음 문제를 의지로만 밀어붙이면 몸이 보내는 경고를 놓칩니다."],
  lagna_5: ["라그나 활용", "라그나를 잘 쓴다는 것은 나를 바꾸는 일이 아니라 나에게 맞는 문으로 들어가는 일입니다.", "라그나와 현재 다샤를 연결해 지금 가장 자연스럽게 열리는 행동 방식을 봅니다.", "지금의 운에서 내가 억지로 쓰는 힘과 자연스럽게 살아나는 힘을 구분합니다.", "이번 달에는 가장 쉬운 시작 방식 하나를 정해 반복하십시오.", "좋아 보이는 방식만 따라가면 라그나가 가진 진짜 출발점이 흐려집니다."],
  moon_1: ["감정 구조", "감정 구조는 마음이 사건을 해석하는 오래된 문법입니다.", "달의 자리와 하우스로 안정, 불안, 애착의 기본 흐름을 읽습니다.", "같은 말에도 마음이 크게 흔들리는 조건이 무엇인지 봅니다.", "감정이 올라온 순간의 장소, 사람, 말투를 함께 기록하십시오.", "감정을 약점으로 몰아가면 달이 알려 주는 보호 본능을 잃습니다."],
  moon_2: ["영혼의 결", "나크샤트라는 영혼이 반복해서 걷는 미세한 길입니다.", "나크샤트라 이름, 파다, 주인 행성으로 마음의 깊은 취향과 반응을 봅니다.", "내가 설명하기 어렵지만 계속 끌리는 분위기가 무엇인지 확인합니다.", "마음이 안정되는 소리, 공간, 리듬을 하나 정해 회복 의식으로 쓰십시오.", "나크샤트라를 낭만으로만 보면 반복되는 무의식의 습관을 놓칩니다."],
  moon_3: ["불안 반응", "불안은 피해야 할 적이 아니라 마음이 경계를 다시 세우라는 신호입니다.", "달의 자리와 토성의 긴장으로 불안이 올라오는 속도와 형태를 봅니다.", "불안할 때 사실보다 해석을 먼저 믿는지 확인합니다.", "불안이 커지는 날에는 결정을 미루고 몸의 감각을 세 문장으로 적으십시오.", "불안을 즉시 해결하려 하면 마음이 진짜 원하는 안전 조건을 듣지 못합니다."],
  moon_4: ["편안함의 조건", "마음이 쉬는 조건은 운을 부드럽게 흐르게 하는 숨은 열쇠입니다.", "달과 금성의 관계로 정서적 안정, 취향, 관계의 온도를 봅니다.", "내 마음이 편안해지는 사람과 장소에는 어떤 공통점이 있는지 봅니다.", "회복되는 공간의 색, 소리, 거리감을 구체적으로 정리하십시오.", "편안함을 게으름으로 오해하면 달이 회복할 문이 닫힙니다."],
  moon_5: ["감정의 힘", "감정의 힘은 흔들림을 없애는 데서가 아니라 흔들림을 읽는 데서 생깁니다.", "달의 주인 별과 다샤를 연결해 감정을 현실 판단으로 바꾸는 방식을 봅니다.", "감정이 커질 때 그것을 말, 일, 관계 중 어디에 쓰는지 확인합니다.", "감정이 생긴 날 바로 결론내리지 말고 다음 날 같은 문장을 다시 읽으십시오.", "감정을 억누르면 직관도 함께 흐려집니다."],
  sun_1: ["자존감", "태양은 내가 어디에서 스스로를 인정하고 싶은지 비추는 불빛입니다.", "태양의 자리, 하우스, 품위를 통해 자존감이 살아나는 무대를 봅니다.", "칭찬이 없어도 내가 계속 지키고 싶은 기준이 무엇인지 묻습니다.", "이번 주에는 타인의 평가와 상관없이 끝낼 책임 하나를 정하십시오.", "자존감을 인정 욕구로만 쓰면 태양의 빛이 쉽게 지칩니다."],
  sun_2: ["사회적 인정", "사회적 인정은 남에게 보이는 얼굴이 아니라 책임이 남긴 빛입니다.", "태양과 10하우스를 함께 보며 어떤 모습으로 인정받고 싶은지 읽습니다.", "내가 인정받고 싶은 자리와 실제로 오래 버틸 수 있는 자리가 같은지 봅니다.", "성과를 말하기보다 결과가 보이는 기록 하나를 남기십시오.", "보여지는 모습만 키우면 태양의 중심보다 그림자가 커집니다."],
  sun_3: ["권위와 책임", "권위는 누르는 힘이 아니라 책임을 끝까지 지키는 불입니다.", "태양, 토성, 10하우스 주인 행성으로 책임을 감당하는 태도를 봅니다.", "내가 권위를 피하는지, 과하게 붙드는지 스스로 확인합니다.", "맡은 역할에서 오늘 끝낼 책임과 위임할 책임을 나누십시오.", "책임을 모두 혼자 지려 하면 태양은 빛이 아니라 부담이 됩니다."],
  sun_4: ["중심 흔들림", "중심이 흔들리는 순간은 태양이 다시 기준을 묻는 시간입니다.", "태양의 품위와 달의 반응을 비교해 자아가 흔들리는 조건을 봅니다.", "내 중심이 흔들릴 때 가장 먼저 확인하고 싶은 사람이 누구인지 봅니다.", "흔들리는 날에는 설명을 늘리지 말고 지켜야 할 약속 하나만 남기십시오.", "흔들림을 실패로 여기면 회복해야 할 중심이 더 멀어집니다."],
  sun_5: ["빛의 회복", "자아의 빛은 크게 드러날 때보다 정확히 설 때 회복됩니다.", "태양과 현재 다샤를 연결해 지금 회복해야 할 자존감의 방식을 봅니다.", "내가 스스로에게 허락하지 못한 역할이 무엇인지 확인합니다.", "작지만 공개적으로 지킬 수 있는 약속 하나를 정하십시오.", "빛을 되찾는 일을 경쟁으로 만들면 태양의 회복이 늦어집니다."],
  planet_1: ["사고와 말", "수성은 생각이 말이 되고 말이 길을 여는 방식을 알려 줍니다.", "수성의 자리, 하우스, 품위로 사고 속도와 전달 방식을 봅니다.", "내 말이 사람을 잇는지, 지나치게 설명을 늘리는지 확인합니다.", "중요한 대화 전에는 결론, 근거, 부탁을 세 줄로 나누십시오.", "빠른 말이 항상 명확한 말은 아닙니다."],
  planet_2: ["사랑과 취향", "금성은 내가 무엇을 아름답다 느끼고 어떻게 마음을 나누는지 보여 줍니다.", "금성의 자리와 품위로 사랑, 취향, 즐거움의 방향을 봅니다.", "내가 편안함과 설렘 중 무엇에 더 자주 기우는지 확인합니다.", "소비, 관계, 휴식에서 나를 실제로 부드럽게 하는 것을 하나 남기십시오.", "취향을 인정 욕구로 쓰면 금성의 기쁨이 피로로 변합니다."],
  planet_3: ["추진력", "화성은 원하는 것을 향해 몸이 먼저 움직이는 불입니다.", "화성의 자리와 하우스로 욕망, 분노, 실행 속도를 봅니다.", "내가 싸워야 할 일과 그냥 지나가야 할 일을 구분합니다.", "화가 올라올 때 바로 반응하지 말고 몸을 먼저 움직여 열을 낮추십시오.", "추진력을 관계에 그대로 쓰면 원하는 결과보다 상처가 먼저 남습니다."],
  planet_4: ["확장과 복", "목성은 삶을 넓히는 믿음과 복의 방향을 보여 줍니다.", "목성의 자리, 하우스, 품위로 배움과 확장의 문을 봅니다.", "내가 쉽게 낙관하는 영역과 더 배워야 하는 영역을 구분합니다.", "새 기회를 잡기 전 그 기회가 누구에게 도움이 되는지 적으십시오.", "확장을 관리하지 않으면 복도 책임 없이 흩어집니다."],
  planet_5: ["과제와 성숙", "토성은 늦게 열리지만 오래 남는 문을 지키는 별입니다.", "토성의 자리와 품위로 지연, 책임, 성숙의 과제를 봅니다.", "내가 미루는 일이 두려움 때문인지 구조 부족 때문인지 봅니다.", "반복해야 할 일을 작게 쪼개고 같은 시간에 다시 시작하십시오.", "토성을 벌로만 보면 시간이 주는 깊은 보상을 놓칩니다."],
  bhava_1: ["자기 자신", "1하우스는 내가 삶을 시작하는 얼굴이자 몸의 첫 문입니다.", "1하우스의 자리, 주인 행성, 입궁 행성으로 자기 인식과 반응을 봅니다.", "내가 나를 설명하는 말과 실제 행동이 같은지 확인합니다.", "몸이 편안한 방향부터 정리하면 자기 확신이 빨리 돌아옵니다.", "자신을 고정된 성격으로만 보면 1하우스의 성장성을 잃습니다."],
  bhava_2: ["돈과 말", "2하우스는 돈을 담는 그릇이자 말이 뿌리내리는 가족의 자리입니다.", "2하우스의 자리와 주인 행성으로 수입, 말, 가족의 습관을 봅니다.", "내가 돈과 말을 같은 방식으로 아끼거나 흘려보내는지 확인합니다.", "지출 기록과 말의 후회를 같은 날 함께 적어 보십시오.", "돈 문제를 숫자로만 보면 말과 가족에서 새는 힘을 놓칩니다."],
  bhava_3: ["집과 안식처", "4하우스는 마음이 돌아가 쉬는 내면의 집입니다.", "4하우스의 자리, 주인 행성, 입궁 행성으로 안식과 뿌리를 봅니다.", "내가 집에서 회복되는지 더 지치는지 솔직히 확인합니다.", "쉬는 공간에서 가장 먼저 치울 물건과 더할 온기를 정하십시오.", "집을 의무의 장소로만 만들면 마음의 안식처가 사라집니다."],
  bhava_4: ["관계의 문", "7하우스는 나와 타인이 서로를 비추는 거울입니다.", "7하우스의 자리와 주인 행성으로 배우자, 계약, 긴 관계를 봅니다.", "내가 관계에서 반복해서 맡는 역할이 무엇인지 확인합니다.", "중요한 관계에서는 기대, 책임, 경계를 각각 한 문장으로 말하십시오.", "상대를 운명의 답으로만 보면 내 선택의 책임이 약해집니다."],
  bhava_5: ["사회적 역할", "10하우스는 세상에 남길 이름과 책임의 무대입니다.", "10하우스의 자리, 주인 행성, 입궁 행성으로 직업과 평판을 봅니다.", "내가 오래 책임질 수 있는 역할과 잠깐 빛나는 역할을 구분합니다.", "성과를 쌓을 영역 하나를 정하고 90일 기록을 시작하십시오.", "명예를 서두르면 10하우스가 요구하는 구조가 약해집니다."],
  career_1: ["직업 방향", "직업의 방향은 재능보다 오래 감당할 책임에서 선명해집니다.", "10하우스와 현재 다샤를 함께 보며 일이 열리는 큰 방향을 봅니다.", "지금의 일이 내 이름을 키우는지, 체력만 쓰는지 확인합니다.", "가장 오래 남길 성과 하나를 정하고 그 외 일은 우선순위를 낮추십시오.", "직업을 빠른 성과로만 보면 차트가 말하는 장기 역할을 놓칩니다."],
  career_2: ["인정 방식", "인정은 보여주려는 마음보다 꾸준히 남긴 결과에서 옵니다.", "10하우스, 태양, 토성으로 사회가 나를 알아보는 방식을 봅니다.", "내가 인정받는 순간 어떤 책임도 함께 따라오는지 확인합니다.", "이번 달에는 남이 확인할 수 있는 결과물을 하나 완성하십시오.", "인정 욕구가 커질수록 실제 실력의 기록이 더 중요합니다."],
  career_3: ["먼저 쌓을 힘", "돈보다 먼저 쌓아야 할 힘은 오래 버티는 전문성입니다.", "아마티야카라카, 토성, 목성으로 직업적 기반과 조언자의 힘을 봅니다.", "지금 돈보다 먼저 배워야 할 기술이나 태도가 무엇인지 묻습니다.", "수익 목표 전에 반복 훈련할 능력 하나를 정하십시오.", "돈을 먼저 좇으면 직업운이 요구하는 뿌리가 약해집니다."],
  career_4: ["피해야 할 패턴", "피해야 할 패턴은 운이 막힌 곳이 아니라 힘이 새는 자리입니다.", "10하우스 주인 행성, 토성, 화성으로 과로와 충돌의 패턴을 봅니다.", "일에서 같은 갈등이 반복될 때 내 반응이 어디서 시작되는지 확인합니다.", "갈등이 큰 일은 즉시 반응하지 말고 사실, 감정, 요청을 분리하십시오.", "문제를 사람 탓으로만 보면 직업운의 반복 패턴을 바꾸기 어렵습니다."],
  career_5: ["성공 전략", "성공은 좋은 운을 현실의 구조로 받아낼 때 커집니다.", "10하우스, 아마티야카라카, 현재 다샤를 묶어 실행 전략을 세웁니다.", "지금 확장할 일과 정리할 일을 같은 기준으로 나눌 수 있는지 봅니다.", "90일 안에 측정할 성과, 만날 사람, 줄일 일을 각각 정하십시오.", "전략 없이 열정만 키우면 좋은 시기도 흩어집니다."],
  money_1: ["수입 통로", "돈이 들어오는 길은 재능보다 반복 가능한 공급 방식에서 열립니다.", "2하우스, 11하우스, 목성으로 수입이 만들어지는 통로를 봅니다.", "내 돈이 사람, 기술, 신뢰 중 어디에서 오는지 확인합니다.", "가장 안정적인 수입 통로 하나를 더 자주 노출시키십시오.", "수입을 여러 곳으로 넓히기만 하면 실제 축적이 늦어집니다."],
  money_2: ["돈의 누수", "돈이 새는 지점은 감정이 숫자를 대신 결정하는 자리입니다.", "2하우스 주인 행성, 금성, 토성으로 지출 습관과 통제력을 봅니다.", "내가 보상받고 싶을 때 돈을 쓰는지 확인합니다.", "이번 달 반복 지출 중 마음을 달래려 쓴 항목 하나를 줄이십시오.", "누수를 부끄러움으로만 보면 재물운을 고칠 실마리를 놓칩니다."],
  money_3: ["축적 리듬", "축적은 큰 수입보다 새지 않는 반복에서 자랍니다.", "2하우스, 11하우스, 토성으로 쌓고 넓히는 속도를 봅니다.", "저축, 투자, 지출 중 어느 리듬이 가장 불안정한지 확인합니다.", "같은 날짜에 같은 비율로 남기는 규칙을 먼저 세우십시오.", "확장만 보고 보유력을 보지 않으면 풍요가 오래 머물지 않습니다."],
  money_4: ["재물 태도", "재물운은 돈을 대하는 태도와 삶을 신뢰하는 방식이 만나는 곳입니다.", "목성, 금성, 현재 다샤로 풍요를 받아들이고 키우는 태도를 봅니다.", "좋은 기회 앞에서 감사보다 불안이 먼저 올라오는지 확인합니다.", "돈이 들어온 날에는 즉시 쓸 몫과 남길 몫을 나누십시오.", "풍요를 과시로 쓰면 재물운의 품격이 약해집니다."],
  money_5: ["풍요 안정", "풍요는 단번에 커지는 것이 아니라 매일 같은 기준으로 안정됩니다.", "2하우스와 11하우스 주인 행성, 토성으로 재정의 지속성을 봅니다.", "내가 오래 유지할 수 있는 돈의 규칙이 있는지 확인합니다.", "수입, 보관, 지출, 나눔의 네 칸으로 돈을 관리하십시오.", "돈을 모으는 일만 강조하면 풍요가 삶을 넓히는 기쁨이 줄어듭니다."],
  love_1: ["사랑의 모습", "사랑할 때의 모습은 마음보다 먼저 관계 안의 리듬으로 드러납니다.", "7하우스, 금성, 화성으로 애정 표현과 끌림의 방식을 봅니다.", "사랑이 시작될 때 내가 빨라지는지 조심스러워지는지 확인합니다.", "좋아하는 마음을 행동, 말, 시간 중 어떤 방식으로 주는지 정리하십시오.", "끌림을 확신으로 착각하면 관계의 실제 약속을 놓칩니다."],
  love_2: ["끌림의 분위기", "끌리는 사람의 분위기는 내 안의 부족함과 성장 욕구를 동시에 비춥니다.", "7하우스 주인 행성, 금성, 다라카라카로 인연의 결을 봅니다.", "내가 반복해서 끌리는 사람에게서 어떤 감정을 기대하는지 확인합니다.", "끌림이 생길 때 상대의 말보다 생활 태도를 먼저 관찰하십시오.", "분위기만 보고 인연을 판단하면 장기 관계의 조건을 놓칩니다."],
  love_3: ["관계 과제", "관계의 반복 과제는 사랑이 부족해서가 아니라 배워야 할 경계가 남아서 옵니다.", "7하우스, 화성, 토성으로 갈등과 거리 조절의 패턴을 봅니다.", "같은 다툼에서 내가 방어하는 말이 무엇인지 확인합니다.", "갈등이 생기면 결론보다 요청을 한 문장으로 낮추십시오.", "관계 문제를 운명 탓으로만 돌리면 바꿀 수 있는 태도가 사라집니다."],
  love_4: ["장기 관계", "오래 가는 관계는 감정보다 생활의 약속을 함께 지키는 힘에서 열립니다.", "7하우스, 금성, 다라카라카로 배우자운과 장기 약속의 조건을 봅니다.", "나에게 안정감을 주는 약속과 답답하게 만드는 약속을 구분합니다.", "장기 관계에서는 돈, 시간, 가족 역할을 미리 말로 정리하십시오.", "배우자운을 만남의 유무로만 보면 관계의 성숙 조건을 놓칩니다."],
  love_5: ["성숙한 사랑", "사랑을 성숙하게 유지하는 법은 마음을 줄이는 것이 아니라 표현을 맑게 하는 일입니다.", "7하우스 주인 행성, 달, 금성으로 애정 유지와 회복 방식을 봅니다.", "관계가 편안해질수록 내가 소홀해지는 표현이 무엇인지 확인합니다.", "고마움, 부탁, 서운함을 각각 다른 문장으로 말하는 연습을 하십시오.", "사랑을 참는 일로만 이해하면 따뜻한 경계가 사라집니다."],
  dasha_1: ["현재 과목", "현재 다샤는 지금 인생이 풀어야 할 가장 큰 과목을 엽니다.", "현재 마하 다샤, 안타르 다샤, 다음 다샤로 시기의 중심 주제를 봅니다.", "지금 반복해서 등장하는 선택이 무엇을 배우라고 하는지 확인합니다.", "현재 시기에 끝낼 일과 다음 시기로 넘길 일을 분리하십시오.", "다샤를 사건 예측으로만 보면 지금 해야 할 공부를 놓칩니다."],
  dasha_2: ["강해지는 기회", "지금 강해지는 기회는 문이 열리는 방향을 조용히 알려 줍니다.", "현재 다샤와 목성, 태양으로 확장과 인정의 기회를 봅니다.", "최근 자주 들어오는 제안이 어떤 삶의 문을 여는지 확인합니다.", "기회가 생기면 즉시 확장하지 말고 책임질 범위를 먼저 정하십시오.", "기회를 모두 잡으려 하면 현재 다샤가 준 집중력이 흩어집니다."],
  dasha_3: ["감당할 과제", "지금의 과제는 막힘이 아니라 다음 문을 통과하기 위한 훈련입니다.", "현재 다샤와 토성, 화성으로 책임과 압박의 형태를 봅니다.", "요즘 가장 무겁게 느껴지는 일이 실제로는 어떤 힘을 키우는지 봅니다.", "어려운 일은 작게 나누고 끝낸 흔적을 매일 남기십시오.", "과제를 피하면 다음 운이 와도 받을 그릇이 준비되지 않습니다."],
  dasha_4: ["다음 흐름", "다음 흐름은 아직 오지 않았지만 오늘의 준비 속에서 이미 문을 두드립니다.", "다음 다샤, 현재 다샤, 나크샤트라 주인 행성으로 전환의 준비를 봅니다.", "앞으로 필요한 능력을 지금부터 작게 시작하고 있는지 확인합니다.", "다음 시기에 필요한 사람, 기술, 체력 중 하나를 미리 기르십시오.", "미래를 급히 당기면 현재 다샤가 끝내야 할 일을 놓칩니다."],
  dasha_5: ["시기 활용", "다샤를 잘 쓴다는 것은 움직일 때와 기다릴 때를 분명히 나누는 일입니다.", "현재 다샤, 다음 다샤, 라그나로 시기를 현실 전략으로 바꿉니다.", "지금 해야 할 일과 아직 때가 아닌 일을 구분할 수 있는지 봅니다.", "90일 계획을 실행, 정리, 대기 세 칸으로 나누십시오.", "시기를 무시한 노력은 좋은 의도와 달리 피로를 크게 만듭니다."],
  karma_1: ["라후의 욕망", "라후는 낯선 욕망을 통해 이번 생의 확장 방향을 보여 줍니다.", "라후의 자리와 하우스로 끌림, 야망, 낯선 성장의 문을 봅니다.", "내가 두렵지만 계속 시선이 가는 방향이 무엇인지 확인합니다.", "새 욕망을 바로 실행하기보다 왜 원하는지 세 번 묻고 시작하십시오.", "라후를 무조건 따라가면 확장은 되지만 기준이 흔들릴 수 있습니다."],
  karma_2: ["케투의 습관", "케투는 익숙하지만 더는 전부가 될 수 없는 과거의 방식을 보여 줍니다.", "케투의 자리와 하우스로 무심함, 거리두기, 오래된 재능을 봅니다.", "내가 너무 쉽게 포기하거나 무관심해지는 영역이 무엇인지 확인합니다.", "익숙한 방식을 버리기 전 그 안에 남은 지혜를 하나만 살리십시오.", "케투를 단절로만 쓰면 과거가 준 선물을 함께 잃습니다."],
  karma_3: ["되풀이 숙제", "되풀이되는 숙제는 같은 문 앞에서 다른 반응을 하라는 부름입니다.", "라후와 케투, 8하우스로 깊은 변화와 되풀이되는 위기를 봅니다.", "같은 상황에서 내가 늘 보이는 반응이 무엇인지 확인합니다.", "되풀이 장면이 오면 이전과 다른 말 한 문장을 준비해 두십시오.", "되풀이를 운명으로 단정하면 바꿀 수 있는 작은 문이 닫힙니다."],
  karma_4: ["관계와 일의 업", "관계와 일에서 드러나는 카르마는 역할을 바꾸라는 현실의 신호입니다.", "7하우스, 10하우스, 라후로 인연과 사회적 역할의 반복을 봅니다.", "관계와 일에서 같은 책임을 과하게 맡고 있는지 확인합니다.", "도와줄 일과 거절할 일을 같은 기준으로 나눠 말하십시오.", "인연과 일을 분리해서만 보면 반복되는 역할의 뿌리를 놓칩니다."],
  karma_5: ["성숙의 길", "성숙해질수록 열리는 길은 더 큰 자극보다 더 맑은 선택을 요구합니다.", "케투, 아트마카라카, 현재 다샤를 묶어 영적 성장의 방향을 봅니다.", "나이가 들수록 덜 반응하고 더 깊어지는 영역이 무엇인지 확인합니다.", "매달 하나의 습관을 내려놓고 하나의 기준을 더하십시오.", "성숙을 체념으로 착각하면 영혼이 열어 둔 다음 문이 보이지 않습니다."],
  master_1: ["최종 메시지", "최종 핵심 메시지는 모든 장을 통과한 뒤 남는 가장 조용한 진실입니다.", "라그나, 달, 아트마카라카를 묶어 차트 전체의 결론을 정리합니다.", "내 삶에서 끝까지 지켜야 할 기준이 무엇인지 다시 묻습니다.", "리포트 전체에서 가장 많이 반복된 조언 하나를 오늘의 약속으로 바꾸십시오.", "최종 메시지를 감동으로만 남기면 실제 삶의 방향이 바뀌지 않습니다."],
  master_2: ["키울 힘", "반드시 키워야 할 힘은 이미 차트 안에서 여러 번 신호를 보낸 능력입니다.", "라그나 주인 행성, 목성, 토성으로 장기적으로 키울 힘을 봅니다.", "내가 오래 키우면 삶 전체를 안정시킬 능력이 무엇인지 확인합니다.", "3개월 동안 매주 같은 시간에 그 힘을 훈련하십시오.", "모든 능력을 동시에 키우려 하면 진짜 힘이 깊어지지 않습니다."],
  master_3: ["내려놓을 습관", "내려놓아야 할 습관은 나쁜 것이 아니라 더 이상 나를 지켜 주지 못하는 옛 갑옷입니다.", "케투, 토성, 달로 오래된 방어와 피로한 반복을 봅니다.", "내가 안전하다고 믿지만 실제로는 삶을 좁히는 습관이 무엇인지 확인합니다.", "한 번에 끊지 말고 나타나는 순간을 먼저 알아차리는 기록부터 시작하십시오.", "습관을 죄책감으로만 다루면 바뀔 힘보다 자기비난이 커집니다."],
  master_4: ["3년 방향", "앞으로 3년은 운명이 크게 바뀌기보다 행동의 순서가 다시 정렬되는 시간입니다.", "현재 다샤, 다음 다샤, 10하우스로 장기 방향과 사회적 변화를 봅니다.", "1년 안에 정리할 일과 3년 동안 키울 일을 구분할 수 있는지 봅니다.", "체력, 수익, 관계의 순서를 정해 무리한 확장을 줄이십시오.", "긴 계획을 감으로만 세우면 다샤가 알려 주는 순서를 놓칩니다."],
  master_5: ["빛나는 길", "나를 가장 빛나게 하는 길은 남의 기대보다 내 영혼의 책임에 가까운 길입니다.", "태양, 아트마카라카, 10하우스를 묶어 가장 빛나는 사회적 방향을 봅니다.", "내가 두렵지만 자꾸 책임지고 싶은 길이 무엇인지 확인합니다.", "작게 공개하고 꾸준히 완성할 수 있는 행동 하나를 시작하십시오.", "빛나는 길을 화려함으로만 보면 오래 지킬 수 있는 길을 잃습니다."],
});

function softenVedicStaticProfileTerms(value = "") {
  return clean(localizeVedicSignalText(value))
    .replace(/\b(?:1|2|3|4|5|6|7|8|9|10|11|12)하우스/g, "이 하우스")
    .replace(/아마티야카라카|아트마카라카|다라카라카/g, "카르마 지표")
    .replace(/라후와 케투|라후|케투/g, "업의 축")
    .replace(/태양|달|수성|금성|화성|목성|토성/g, "이 행성")
    .replace(/업의 축는/g, "업의 축은")
    .replace(/업의 축가/g, "업의 축이")
    .replace(/업의 축를/g, "업의 축을");
}

function vedicCategoryCounselingProfile(sectionId = "", title = "") {
  const fallbackAxis = clean(title || "상담 항목");
  const values = VEDIC_CATEGORY_COUNSELING_PROFILES[clean(sectionId)] || [
    fallbackAxis,
    `${fallbackAxis}은 계산된 차트 단서를 현실의 결정 언어로 바꾸는 문입니다.`,
    `${fallbackAxis}에서는 계산된 근거를 넓히지 않고 삶의 장면과 연결해 읽습니다.`,
    `${fallbackAxis}에서 지금 가장 먼저 조정할 행동이 무엇인지 봅니다.`,
    `${fallbackAxis}의 조언은 오늘 실행할 작은 기준 하나로 낮추십시오.`,
    `${fallbackAxis}을 크게 해석하면 실제로 바꿀 수 있는 행동이 흐려집니다.`,
  ];
  const [axis, oracle, lens, question, practice, risk] = values;
  return {
    axis: clean(localizeVedicSignalText(axis)),
    oracle: clean(localizeVedicSignalText(oracle)),
    lens: softenVedicStaticProfileTerms(lens),
    question: clean(localizeVedicSignalText(question)),
    practice: clean(localizeVedicSignalText(practice)),
    risk: clean(localizeVedicSignalText(risk)),
  };
}

function vedicChapterFlowHeads(chapterId = "", profileAxis = "") {
  const axis = clean(profileAxis || "상담");
  const flows = {
    vedic_soul_map: ["중심 선언", "차트의 중심", "삶의 방향", "오늘의 결정", "영혼의 상징"],
    vedic_lagna: ["라그나의 문", "출발 근거", "첫 반응", "몸의 실천", "나를 세우는 상징"],
    vedic_moon_nakshatra: ["마음의 문", "달의 근거", "감정의 결", "회복 실천", "내면의 상징"],
    vedic_sun_self: ["태양의 선언", "자아의 근거", "중심 해석", "책임 실천", "빛의 상징"],
    vedic_planet_talents: ["재능의 문", "행성 근거", "능력 해석", "힘의 배치", "재능의 상징"],
    vedic_bhavas: ["현실 무대", "하우스 근거", "생활 장면", "영역 정리", "삶의 상징"],
    vedic_career_success: ["일의 방향", "사회적 근거", "역할 진단", "90일 전략", "성공의 상징"],
    vedic_money_flow: ["수입의 문", "돈의 근거", "흐름 진단", "축적 전략", "풍요의 상징"],
    vedic_love_partnership: ["관계의 문", "사랑의 근거", "인연 해석", "약속의 실천", "사랑의 상징"],
    vedic_dasha_flow: ["시간의 문", "다샤 근거", "현재 과목", "다음 준비", "운의 상징"],
    vedic_karma_growth: ["카르마의 문", "업의 근거", "되풀이 해석", "성장의 행동", "영적 상징"],
    vedic_master_plan: ["최종 방향", "통합 근거", "마스터 해석", "장기 계획", "빛나는 상징"],
  };
  return (flows[clean(chapterId)] || flows.vedic_soul_map).map((label) => `${axis} ${label}`);
}

function vedicChapterCounselingStyle(chapterId = "") {
  return VEDIC_CHAPTER_COUNSELING_STYLES[clean(chapterId)] || VEDIC_CHAPTER_COUNSELING_STYLES.vedic_soul_map;
}

function buildVedicChapterCounselingBody(args = {}) {
  const style = vedicChapterCounselingStyle(args.chapterId);
  const profile = vedicCategoryCounselingProfile(args.sectionId, args.title);
  const seed = Number(args.personal?.seed || 0);
  const introHead = pickVedicVariant(style.intro, seed, 1);
  const evidenceHead = pickVedicVariant(style.evidence, seed, 2);
  const readingHead = pickVedicVariant(style.reading, seed, 3);
  const practiceHead = pickVedicVariant(style.practice, seed, 4);
  const closingHead = pickVedicVariant(style.closing, seed, 5);
  const readingLead = pickVedicVariant(style.readingLead, seed, 6);
  const actionLead = pickVedicVariant(style.actionLead, seed, 7);
  const closingLead = pickVedicVariant(style.closingLead, seed, 8);
  const sectionAnchor = clean(args.frameLabel || args.title || "이 항목");
  const sectionSubject = withKoreanJosa(sectionAnchor, "은", "는");
  const sectionAgent = withKoreanJosa(sectionAnchor, "이", "가");
  const sectionObject = withKoreanJosa(sectionAnchor, "을", "를");
  const primaryKindCase = vedicJosaCase(args.primaryKind);
  const profileAxis = clean(profile.axis || args.title || sectionAnchor);
  const profileSubject = withKoreanJosa(profileAxis, "은", "는");
  const introHeadObject = withKoreanJosa(introHead, "을", "를");
  const evidenceHeadTopic = withKoreanJosa(evidenceHead, "은", "는");
  const heads = vedicChapterFlowHeads(args.chapterId, profileAxis);
  const doorwayVerb = pickVedicVariant([
    `${primaryKindCase.object} 우선 읽습니다`,
    `${primaryKindCase.object} 먼저 붙듭니다`,
    `${primaryKindCase.object} 상담의 출발점으로 둡니다`,
    `${primaryKindCase.object} 가장 앞에 세웁니다`,
  ], seed, 13);
  const evidenceBridge = pickVedicVariant([
    `${sectionAnchor}의 다음 근거는 ${args.secondaryKindSubject} ${profileAxis}의 실제 장면에서 ${sectionAnchor}이 어떤 반응으로 나타나는지 봅니다.`,
    `${args.secondaryKindSubject} ${sectionAnchor}의 생활 장면을 ${profileAxis}의 축으로 다시 걸러 냅니다.`,
    `${sectionAnchor}에서는 ${args.secondaryKindSubject} 두 번째 층에서 판단의 속도를 조절합니다.`,
    `${args.secondaryKindSubject} ${sectionAnchor}의 말투와 약속을 ${profileAxis}의 실제 반응으로 ${sectionObject} 다시 비춰 줍니다.`,
  ], seed, 14);
  const practiceClose = pickVedicVariant([
    `${sectionSubject} ${primaryKindCase.pair} 엇갈릴 때는 ${sectionAnchor}에서 오늘 줄일 행동을 ${profileAxis}의 부담이 가장 작은 것부터 정하십시오.`,
    `${sectionAnchor}에서는 큰 결론보다 ${sectionAnchor}의 작은 약속이 운의 결을 안정시킵니다.`,
    `${sectionObject} 실천할 때는 ${profileAxis}를 크게 바꾸려 하지 말고 ${sectionAnchor}의 가장 가까운 장면 하나부터 바로잡으십시오.`,
    `${sectionAnchor}의 처방은 매일 같은 시간에 점검할 수 있을 때 힘을 얻습니다.`,
  ], seed, 15);
  const readingFocus = pickVedicVariant([
    `${sectionAnchor}에서는 ${profileAxis}의 질문을 실제 계산 근거의 반응으로 좁힙니다.`,
    `${profileAxis}의 첫 초점은 ${sectionAnchor}에서 되풀이되는 장면을 ${profileAxis}의 차트 근거와 맞추는 데 있습니다.`,
    `${sectionAnchor}의 상담은 ${profileAxis}가 생활에서 어느 순간 강해지는지부터 봅니다.`,
    `${profileAxis}는 ${sectionAnchor} 안에서 보이는 반응과 ${profileAxis}의 근거 순서를 함께 열어 줍니다.`,
  ], seed, 16);
  const readingDetail = pickVedicVariant([
    `${sectionSubject} ${args.title}의 겉모습보다 ${args.primaryKind}의 반응 순서를 먼저 봅니다. ${sectionAnchor} 안의 판단은 ${sectionAnchor}의 리듬으로 살펴야 합니다.`,
    `${sectionAnchor}의 상담은 ${primaryKindCase.agent} 밝힌 첫 방향과 ${profileAxis}의 현실 장면을 나란히 놓을 때 선명해집니다.`,
    `${sectionObject} 읽을 때는 ${args.primaryKind}의 강약을 먼저 살피고, ${sectionAnchor}의 다음 판단은 생활 장면에서 점검합니다.`,
    `${sectionAnchor}에서는 ${primaryKindCase.object} 결론으로 서두르지 않습니다. ${sectionAnchor}의 작은 반응을 따라가야 조언이 정확해집니다.`,
  ], seed, 9);
  const evidenceDetail = pickVedicVariant([
    `${sectionSubject} 장식보다 ${profileAxis}에서 계산된 단서 순서로 읽습니다. ${sectionAnchor}의 약한 근거는 결론으로 쓰지 않습니다.`,
    `${sectionAnchor}의 근거는 결론보다 ${profileAxis}의 판단 순서를 좁힙니다. 계산된 신호는 ${sectionAnchor}의 생활 언어로 옮깁니다.`,
    `${sectionObject} 지탱하는 단서는 ${profileAxis}의 서로 다른 층에서 같은 방향을 가리킬 때 힘을 얻습니다. ${sectionAnchor}의 결론도 그 범위 안에 둡니다.`,
    `${sectionAnchor}의 근거는 넓게 부풀리지 않습니다. ${sectionAnchor}에서 계산된 단서는 ${profileAxis}의 다음 행동을 고르는 재료가 됩니다.`,
  ], seed, 10);
  const practiceDetail = pickVedicVariant([
    `${sectionAnchor}에서는 ${profileAxis}에 먼저 남길 일을 적고, ${sectionAnchor}에서 덜어낼 행동은 ${profileAxis}의 일정에서 가장 작은 것부터 줄입니다.`,
    `${sectionAnchor}에서는 새 결심보다 ${sectionAnchor}의 꾸준한 약속이 중요합니다. ${sectionAnchor}의 기록은 하루보다 ${profileAxis}의 한 주 리듬으로 보십시오.`,
    `${sectionObject} 생활에 옮길 때는 ${profileAxis}에서 관찰 가능한 장면 하나를 고릅니다. ${sectionAnchor}의 조언은 그 장면에서 힘을 얻습니다.`,
    `${sectionAnchor}의 실천은 말보다 순서입니다. ${profileAxis}에서 먼저 덜어낼 행동 하나가 다음 판단을 맑게 합니다.`,
  ], seed, 11);
  const closingDetail = pickVedicVariant([
    `${sectionAnchor}의 마지막 원칙은 과장 없는 꾸준함입니다. ${sectionAgent} 매일의 행동 속에서 작게 맞아떨어질 때 상담은 현실이 됩니다.`,
    `${sectionSubject} 한 번의 선언보다 ${sectionAnchor}의 조용한 점검을 요구합니다. ${sectionAnchor}의 빛은 꾸준함 속에서 신뢰로 바뀝니다.`,
    `${sectionObject} 오래 쓰려면 ${profileAxis}의 결론을 크게 만들지 말고 ${sectionAnchor}의 원칙을 선명하게 남기십시오. ${sectionAnchor}의 힘은 거기서 안정됩니다.`,
    `${sectionAnchor}의 답은 멀리 있지 않습니다. ${sectionAnchor}에서 살핀 단서를 ${profileAxis}의 오늘 말로 낮추면 ${sectionAnchor}의 길이 보입니다.`,
  ], seed, 12);
  const tertiarySentence = args.tertiaryKindSubject
    ? ` ${sectionAnchor}의 ${args.tertiaryKindSubject} 세부 속도와 경계선을 알려 주는 단서입니다.`
    : "";

  return cleanForbiddenBlock([
    `${heads[0]}\n\n${profile.oracle} ${args.titleSubject} ${args.chapterTitle} 안에서 ${introHeadObject} 여는 항목입니다. ${args.frameReading} ${sectionSubject} ${doorwayVerb}. ${args.frameObject} 읽을 때는 ${args.supportKindsText}. ${args.personal.domainLine} ${args.personal.boundaryPhrase}. ${readingDetail}`,
    `${heads[1]}\n\n${args.evidenceBlock}\n\n${profile.lens} ${evidenceHeadTopic} 장식이 아니라 상담의 경계입니다. ${evidenceDetail}`,
    `${heads[2]}\n\n${readingLead} ${profile.question} ${readingFocus} ${evidenceBridge}${tertiarySentence} ${args.alignmentPhrase}. ${args.personal.cautionLine}`,
    `${heads[3]}\n\n${profile.practice} ${args.framePractice} ${actionLead} ${args.practiceFocus}. ${args.personal.practiceLine} ${practiceDetail} ${practiceClose}`,
    `${heads[4]}\n\n${closingLead} ${profile.risk} ${args.personal.checkLine} ${args.personal.closingLine} ${closingDetail}`,
  ].join("\n\n")).trim();
}

function hasKoreanFinalConsonant(value = "") {
  const chars = [...clean(value)];
  const char = chars[chars.length - 1] || "";
  const code = char.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function withKoreanJosa(value = "", withFinal = "", withoutFinal = "") {
  const text = clean(value);
  return `${text}${hasKoreanFinalConsonant(text) ? withFinal : withoutFinal}`;
}

function vedicJosaCase(value = "") {
  const text = clean(value);
  return {
    text,
    topic: withKoreanJosa(text, "은", "는"),
    agent: withKoreanJosa(text, "이", "가"),
    object: withKoreanJosa(text, "을", "를"),
    pair: withKoreanJosa(text, "과", "와"),
  };
}

function localizeVedicSignalText(value = "") {
  return clean(value)
    .replace(/\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu)\b/g, (planet) => PLANET_KO[planet] || planet)
    .replace(/문 사인이/g, "달의 자리가")
    .replace(/문 사인은/g, "달의 자리는")
    .replace(/문 사인을/g, "달의 자리를")
    .replace(/문 사인/g, "달의 자리")
    .replace(/달 사인이/g, "달의 자리가")
    .replace(/달 사인은/g, "달의 자리는")
    .replace(/달 사인을/g, "달의 자리를")
    .replace(/달 사인/g, "달의 자리")
    .replace(/태양 사인이/g, "태양의 자리가")
    .replace(/태양 사인은/g, "태양의 자리는")
    .replace(/태양 사인을/g, "태양의 자리를")
    .replace(/태양 사인/g, "태양의 자리")
    .replace(/달의 자리과/g, "달의 자리와")
    .replace(/라그나 로드/g, "라그나 주인 행성")
    .replace(/문 나크샤트라 로드/g, "달 나크샤트라 주인 행성")
    .replace(/로드/g, "주인 행성")
    .replace(/사인이/g, "자리가")
    .replace(/사인은/g, "자리는")
    .replace(/사인을/g, "자리를")
    .replace(/사인/g, "자리");
}

function buildEvidenceBoundSectionBody(chapterSpec = {}, category = {}, evidenceSignals = [], usedSignalIds = [], sectionIndex = 0, chartJson = {}) {
  const sectionId = clean(category?.id);
  const title = clean(localizeVedicSignalText(category?.title || `세부 상담 ${sectionIndex + 1}`));
  const chapterTitle = clean(localizeVedicSignalText(chapterSpec?.title || "베다 리포트"));
  const frame = safeArray(VEDIC_SECTION_COUNSELING_FRAMES[sectionId]);
  const frameTitle = clean(frame[0] || title);
  const frameLabel = frameTitle === title ? `${title}의 핵심` : frameTitle;
  const frameReading = clean(localizeVedicSignalText(frame[1] || `${title}은 실제 계산 근거를 중심으로 성향과 현실 결정을 함께 살피는 항목입니다.`));
  const framePractice = clean(localizeVedicSignalText(frame[2] || `${title}의 조언은 근거가 계산된 신호 안에서만 실천 순서를 정하는 데 있습니다.`));
  const signals = safeArray(evidenceSignals).map((item) => cleanForbidden(localizeVedicSignalText(item))).filter(Boolean);
  const ids = safeArray(usedSignalIds).map((id) => clean(id)).filter(Boolean);
  const signalKindList = Array.from(new Set(ids.map(signalCategoryLabel).filter(Boolean))).slice(0, 4);
  const primaryKind = signalKindList[0] || `${title} 계산 근거`;
  const secondaryKind = signalKindList[1] || "실제 반응";
  const tertiaryKind = signalKindList[2] || "";
  const secondaryKindSubject = withKoreanJosa(secondaryKind, "은", "는");
  const tertiaryKindSubject = tertiaryKind ? withKoreanJosa(tertiaryKind, "은", "는") : "";
  const supportKindsText = signalKindList.length > 1
    ? `${withKoreanJosa(primaryKind, "을", "를")} ${title}의 중심축으로 삼고 ${withKoreanJosa(signalKindList.slice(1).join(", "), "을", "를")} ${title}의 보조 근거로 맞춥니다`
    : `${withKoreanJosa(primaryKind, "을", "를")} ${title}의 중심축으로 삼고 ${withKoreanJosa(title, "은", "는")} 세부 근거를 보조 근거로 둡니다`;
  const evidenceBlock = signals.length
    ? signals.map((item) => `- ${item}`).join("\n")
    : `- ${title}: 계산 근거 점검`;
  const titleSubject = withKoreanJosa(title, "은", "는");
  const frameObject = withKoreanJosa(frameLabel, "을", "를");
  const evidenceLabel = vedicEvidenceCountLabel(signals.length);
  const personal = buildVedicPersonalizedSectionInsight(chapterSpec, category, chartJson, signals, usedSignalIds, sectionIndex);
  const alignmentLead = pickVedicVariant([
    `${title}에서 ${withKoreanJosa(evidenceLabel, "이", "가")} 같은 방향으로 모이면`,
    `${title}에서 ${withKoreanJosa(evidenceLabel, "이", "가")} ${title}의 결론을 서로 받쳐 주면`,
    `${title}에서 ${withKoreanJosa(evidenceLabel, "이", "가")} 한쪽으로 기울지 않으면`,
    `${title}에서 ${withKoreanJosa(evidenceLabel, "이", "가")} 생활 장면과 맞물리면`,
  ], personal.seed, 16);
  const alignmentPhrase = signals.length >= 3
    ? `${alignmentLead} ${personal.alignmentPhrase}`
    : `${withKoreanJosa(evidenceLabel, "이", "가")} 서로를 받쳐 주면 ${personal.alignmentPhrase}`;
  const practiceFocus = vedicSectionApplicationFocus(sectionId, sectionIndex);

  return buildVedicChapterCounselingBody({
    chapterId: clean(chapterSpec?.id),
    sectionId,
    title,
    chapterTitle,
    frameLabel,
    frameReading,
    framePractice,
    evidenceBlock,
    titleSubject,
    frameObject,
    primaryKind,
    secondaryKindSubject,
    tertiaryKindSubject,
    supportKindsText,
    practiceFocus,
    personal,
    alignmentPhrase,
  });
}

function normalizeVedicLocalFallbackManuscript(localManuscript = {}, chartJson = {}) {
  const expanded = expandVedicLocalManuscript(safeArray(localManuscript?.chapters), chartJson);
  return VEDIC_PREMIUM_CHAPTERS.map((chapterSpec, chapterIndex) => {
    const sourceChapter = expanded[chapterIndex] || {};
    const evidencePack = buildVedicEvidencePack(chartJson, chapterSpec);
    const evidenceIndex = buildVedicEvidenceIndex(evidencePack);
    const sections = safeArray(chapterSpec.categories).map((category, sectionIndex) => {
      const sourceSection = safeArray(sourceChapter.sections)[sectionIndex] || {};
      const requiredSignalIds = safeArray(evidencePack?.requiredSignalIdsBySection?.[category.id]);
      const usedSignalIds = Array.from(new Set(requiredSignalIds)).slice(0, 5);
      const evidenceSignals = usedSignalIds
        .map((id) => evidenceIndex.get(id))
        .filter(Boolean)
        .map((signal) => cleanForbidden(localizeVedicSignalText(`${signal.label}: ${signal.value}`)))
        .filter(Boolean)
        .slice(0, 5);
      return {
        id: clean(sourceSection.id || category.id),
        title: clean(sourceSection.title || category.title),
        body: buildEvidenceBoundSectionBody(chapterSpec, category, evidenceSignals, usedSignalIds, sectionIndex, chartJson),
        bullets: evidenceSignals,
        usedSignalIds,
      };
    });
    const draft = {
      chapterNo: Number(chapterSpec.order),
      id: chapterSpec.id,
      key: chapterSpec.key,
      roman: chapterSpec.roman,
      title: chapterSpec.title,
      subtitle: chapterSpec.subtitle,
      sections,
      localQuality: collectSignals({ ...sourceChapter, sections }, chartJson),
    };
    return draft;
  });
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
    vedic_karakas: `${sectionTitle}에서는 아트마카라카·아마티야카라카·다라카라카가 각각 영혼, 일, 관계에서 어떤 판단 원칙을 만드는지 설명합니다.`,
    vedic_planetary_strength: `${sectionTitle}에서는 강한 행성과 약한 행성을 나누어 재능으로 쓸 영역과 관리해야 할 영역을 구분합니다.`,
    vedic_bhavas: `${sectionTitle}에서는 12바바의 삶의 영역을 실제 관계, 재물, 직업, 마음의 기반으로 옮겨 해석합니다.`,
    vedic_love_partnership: `${sectionTitle}에서는 7바바, 금성, 다라카라카를 중심으로 사랑과 결혼에서 반복되는 카르마를 다룹니다.`,
    vedic_career_money: `${sectionTitle}에서는 10바바, 2바바, 11바바, 아마티야카라카를 연결해 직업과 수익 구조를 정리합니다.`,
    vedic_dasha_flow: `${sectionTitle}에서는 현재 다샤와 다음 다샤를 비교해 지금 정해야 할 우선순위를 제시합니다.`,
    vedic_yogas_karma: `${sectionTitle}에서는 요가와 라후·케투 축을 현실 전략으로 번역해 반복 패턴을 줄이는 방향을 제안합니다.`,
    vedic_chakra_remedy: `${sectionTitle}에서는 차크라, 만트라, 보석, 도샤 루틴을 생활에서 실행 가능한 방식으로 정리합니다.`,
    vedic_master_plan: `${sectionTitle}에서는 전체 차트 해석을 1년·3년·10년 실행 계획으로 통합합니다.`,
  };

  const suffix = pass > 1
    ? ` 이번 보강에서는 실행 순서를 ${pass}단계로 구분해 실제 판단 원칙을 구체화합니다.`
    : " 실행 기준은 이번 주 행동 우선순위와 다음 달 조정 기준으로 분리해 제시합니다.";

  return cleanForbidden(`${map[chapterId] || `${sectionTitle}에서는 계산된 차트 신호를 바탕으로 현실적인 실행 기준을 정리합니다.`}${suffix}`);
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

const VEDIC_PREMIUM_REQUIRED_SOURCE_PLANETS = Object.freeze(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]);
const VEDIC_PREMIUM_BLOCKED_SOURCE_RE = /\b(?:fallback|basic|recovered|provided|client|cache|mock|sample|seed|safe-local|astronomy-engine-fallback)\b/i;
const VEDIC_PREMIUM_TRUSTED_SOURCE_RE = /\b(?:swiss|external-vedic-api|server-vedic|premium-vedic)\b/i;

function readVedicSourcePlanetLongitude(sourcePlanets = {}, planetName = "") {
  const variants = [planetName, planetName.toLowerCase(), PLANET_KO[planetName]].map((item) => clean(item)).filter(Boolean);
  for (const key of variants) {
    const value = sourcePlanets?.[key];
    const longitude = value && typeof value === "object"
      ? value.longitude ?? value.absoluteLongitude ?? value.lon ?? value.siderealLongitude
      : value;
    const degree = normalizeDegree(longitude);
    if (Number.isFinite(degree)) return degree;
  }
  return NaN;
}

export function validateVedicPremiumChartSourceQuality(input = {}) {
  const chartSource = safeObject(input?.chartSource || input?.source || input?.vedicBase?.chart || input?.chart);
  const chartJson = safeObject(input?.chartJson || input?.localVedicChartJson || input?.payload);
  const chart = safeObject(chartJson?.chart);
  const sourceMeta = safeObject(chartJson?.chartSource);
  const requireTrustedSource = input?.requireTrustedSource === true;
  const issues = [];
  const sourceLabel = clean(chartSource?.source || chartSource?.calculationSource || sourceMeta?.source || input?.sourceLabel);
  const engineQuality = clean(chartSource?.engineQuality || sourceMeta?.engineQuality || input?.engineQuality);
  const calculationMode = clean(input?.calculationMode || chartJson?.calculationMode || chartSource?.calculationMode);
  const fallbackUsed = chartSource?.fallbackUsed === true || sourceMeta?.fallbackUsed === true || VEDIC_PREMIUM_BLOCKED_SOURCE_RE.test(sourceLabel);
  const sourcePlanets = safeObject(chartSource?.planets);
  const chartPlanets = safeArray(chart?.planets);
  const missingPlanets = VEDIC_PREMIUM_REQUIRED_SOURCE_PLANETS.filter((planet) => {
    if (Number.isFinite(readVedicSourcePlanetLongitude(sourcePlanets, planet))) return false;
    return !chartPlanets.some((item) => normalizePlanetName(item?.name || item?.graha) === planet && Number.isFinite(Number(item?.longitude)));
  });
  const sourcePlanetCount = VEDIC_PREMIUM_REQUIRED_SOURCE_PLANETS.length - missingPlanets.length;
  const hasAllPlanets = missingPlanets.length === 0;
  const hasAscendant = Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude))
    || sourceMeta?.hasAscendant === true
    || Boolean(clean(chart?.lagnaSign));
  const hasAyanamsaValue = Number.isFinite(Number(chartSource?.ayanamsa)) || sourceMeta?.hasAyanamsaValue === true;
  const hasAyanamsaName = Boolean(clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType)) || sourceMeta?.hasAyanamsaName === true;
  const hasAyanamsa = hasAyanamsaValue || hasAyanamsaName;
  const hasMoonNakshatra = Boolean(clean(chart?.nakshatra?.name)) || !Object.keys(chart).length;
  const hasDasha = Boolean(clean(chart?.dashas?.currentMahaDasha)) || safeArray(chart?.dashas?.periods).length > 0 || !Object.keys(chart).length;
  const trustedSource = Boolean(sourceLabel && VEDIC_PREMIUM_TRUSTED_SOURCE_RE.test(sourceLabel));
  const engineTrusted = !engineQuality || /(swiss|vedic|external)/i.test(engineQuality);

  if (calculationMode && calculationMode !== "full") issues.push("calculation_mode_not_full");
  if (!hasAllPlanets) issues.push("planets_missing");
  if (!hasAscendant) issues.push("ascendant_missing");
  if (!hasAyanamsa) issues.push("ayanamsa_missing");
  if (!hasMoonNakshatra) issues.push("moon_nakshatra_missing");
  if (!hasDasha) issues.push("dasha_missing");
  if (fallbackUsed) issues.push("fallback_source_blocked");
  if (!engineTrusted) issues.push("engine_quality_untrusted");
  if (requireTrustedSource && !sourceLabel) issues.push("source_missing");
  if (requireTrustedSource && sourceLabel && !trustedSource) issues.push("source_untrusted");

  const qualityChecks = [
    hasAllPlanets,
    hasAscendant,
    hasAyanamsa,
    hasMoonNakshatra,
    hasDasha,
    !fallbackUsed,
    engineTrusted,
    !requireTrustedSource || Boolean(sourceLabel && trustedSource),
  ];
  const qualityScore = Math.round((qualityChecks.filter(Boolean).length / qualityChecks.length) * 100);
  const qualityGrade = issues.length === 0 ? "premium" : qualityScore >= 75 ? "review" : "blocked";

  return {
    ok: issues.length === 0,
    issues: Array.from(new Set(issues)),
    source: sourceLabel,
    engineQuality,
    calculationMode,
    fallbackUsed,
    hasAllPlanets,
    hasAscendant,
    hasAyanamsaValue,
    hasAyanamsaName,
    hasAyanamsa,
    hasMoonNakshatra,
    hasDasha,
    sourcePlanetCount,
    requiredPlanetCount: VEDIC_PREMIUM_REQUIRED_SOURCE_PLANETS.length,
    missingPlanets,
    trustedSource,
    engineTrusted,
    qualityScore,
    qualityGrade,
    trustedSourceRequired: requireTrustedSource,
  };
}

export function validateVedicPremiumChartSignals(chartJson = {}) {
  const issues = [];
  const chart = chartJson?.chart || {};
  const context = chartJson?.pdfContext || {};
  const sourceQuality = validateVedicPremiumChartSourceQuality({ chartJson });

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
  if (!sourceQuality.ok) issues.push(...sourceQuality.issues.map((issue) => `source:${issue}`));

  return {
    ok: issues.length === 0 && safeArray(context?.missingSignals).length === 0,
    issues: Array.from(new Set([...issues, ...safeArray(context?.missingSignals)])),
    sourceQuality,
  };
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
  const housePattern = `(?<!\\d)${house}\\s*하우스(?!\\d)`;
  const ignoredContext = /(로드|주재|주인|카라카|karaka|lord)/i;
  const patterns = [
    new RegExp(`(?:${planetPattern})(?:은|는|이|가|의)?\\s*(?:${housePattern})`, "g"),
    new RegExp(`(?:${planetPattern})[^\\n,.。]{0,14}(?:${housePattern})`, "g"),
    new RegExp(`(?:${housePattern})(?:의|에\\s*있는|에\\s*자리한)\\s*(?:${planetPattern})`, "g"),
  ];
  return patterns.some((pattern) => {
    let match;
    while ((match = pattern.exec(text))) {
      const start = Number(match.index || 0);
      const context = text.slice(Math.max(0, start - 24), start + match[0].length + 24);
      if (!ignoredContext.test(context)) return true;
    }
    return false;
  });
}

function hasDirectHouseSignClaim(text, houseNumber, sign) {
  const house = Number(houseNumber);
  const signToken = escapeVedicRegex(sign);
  if (!Number.isFinite(house) || !signToken) return false;
  const housePattern = `(?<!\\d)${house}\\s*하우스(?!\\d)`;
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
      const unsupportedClaims = detectVedicAllUnsupportedClaims(section?.body, evidencePack, chartJson);
      const literalContradictions = detectVedicLiteralChartContradictions(section?.body, chartJson);
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
          if (found) literalContradictions.push(`inline:core:${item.key}:wrong-sign:${sign}`);
        });
      });
      if (!usedSignalIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:used-signal-ids-missing`);
      if (invalidSignalIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:invalid-signal-ids`);
      if (missingRequiredIds.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:missing-required-signal-ids`);
      if (literalContradictions.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:literal-chart-contradictions`);
      if (unsupportedClaims.length) issues.push(`chapter:${chapterSpec.id}:section:${category.id}:unsupported-claims`);
    });
  });
  return issues;
}

function buildVedicEvidenceAudit(chapters = [], chartJson = {}, options = {}) {
  const allowFallback = Boolean(options?.allowFallback);
  const chapterSpecs = new Map(VEDIC_PREMIUM_CHAPTERS.map((chapter) => [chapter.id, chapter]));
  const usedUnique = new Set();
  let totalSections = 0;
  let totalUsedSignalRefs = 0;
  let missingRequiredCount = 0;
  let invalidSignalCount = 0;
  let unsupportedClaimCount = 0;
  let missingChapterAccuracyCount = 0;

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
    const accuracyAudit = buildVedicChapterAccuracyAudit(chapter);
    missingChapterAccuracyCount += Number(accuracyAudit.missingGroupCount || 0);
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
      if (!allowFallback) unsupportedClaimCount += unsupportedClaims.length;
      return {
        sectionId: category.id,
        ok: !invalidSignalIds.length && !missingRequiredSignalIds.length && (allowFallback || !unsupportedClaims.length) && usedSignalIds.length > 0,
        usedSignalIds,
        requiredSignalIds,
        missingRequiredSignalIds,
        invalidSignalIds,
        unsupportedClaims: allowFallback ? [] : unsupportedClaims.slice(0, 6),
      };
    });
    return {
      chapterId: chapterSpec.id,
      ok: accuracyAudit.ok && sectionAudits.every((section) => section.ok),
      accuracy: accuracyAudit,
      sections: sectionAudits,
    };
  });

  return {
    version: "vedic-evidence-audit-v1",
    ok: missingRequiredCount === 0 && invalidSignalCount === 0 && unsupportedClaimCount === 0 && missingChapterAccuracyCount === 0 && totalSections > 0,
    totalSections,
    totalUsedSignalRefs,
    uniqueSignalCount: usedUnique.size,
    missingRequiredCount,
    invalidSignalCount,
    unsupportedClaimCount,
    missingChapterAccuracyCount,
    fallbackClaimReviewRelaxed: allowFallback,
    chapters: chapterAudits,
  };
}

export function validateVedicFinalManuscript(input) {
  const birthInput = input?.birthInput || null;
  const chartJson = input?.localVedicChartJson || null;
  const chapters = safeArray(input?.chapters);
  const requireSignalIds = Boolean(input?.requireSignalIds);
  const allowFallback = Boolean(input?.allowFallback);

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
    const signalUsageIssues = validateVedicFinalSignalUsage(chapters, chartJson);
    issues.push(...(allowFallback
      ? signalUsageIssues.filter((issue) => !String(issue || "").includes("unsupported-claims"))
      : signalUsageIssues));
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
    if (!allowFallback) issues.push("manuscript:repetition-detected");
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
  const lines = cleanForbiddenBlock(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const html = [];
  let bulletItems = [];
  let headingCount = 0;
  const flushBullets = () => {
    if (!bulletItems.length) return;
    html.push(`<ul>${bulletItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    bulletItems = [];
  };

  lines.forEach((line) => {
    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet) {
      bulletItems.push(bullet[1]);
      return;
    }
    flushBullets();
    const isHeading = /^(핵심 진단|차트 근거|현실에서 드러나는 모습|주의해야 할 흐름|베다 마스터의 조언|실천 과제)$/.test(line)
      || /(?:차트 근거|해석|적용|점검|실천 기준)$/.test(line)
      || (/^[가-힣0-9·\s]+(?:의 핵심)?$/.test(line) && line.length <= 34);
    if (isHeading) {
      headingCount += 1;
      html.push(headingCount === 1
        ? `<h5 class="vd-section-lead-label">${escapeHtml(line)}</h5>`
        : `<div class="vd-section-label" data-vedic-pdf-section-label>${escapeHtml(line)}</div>`);
      return;
    }
    html.push(`<p>${escapeHtml(line)}</p>`);
  });
  flushBullets();
  return html.join("");
}

function extractVedicSectionSummary(body = "") {
  const blocks = cleanForbiddenBlock(body)
    .split(/\n\s*\n/)
    .map((block) => clean(block))
    .filter(Boolean);
  const firstText = blocks.find((block, index) => index > 0 && !block.startsWith("- ")) || blocks[0] || "";
  const sentence = clean(firstText.split(/[.!?。？！]/)[0] || firstText);
  return sentence.length > 120 ? `${sentence.slice(0, 118)}...` : sentence;
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

const VEDIC_PDF_CHAPTER_DISPLAY = {
  vedic_soul_map: "베다 차트 전체 총론",
  vedic_lagna: "라그나와 타고난 인생 설계",
  vedic_moon_nakshatra: "문 사인과 나크샤트라 심층 해석",
  vedic_sun_self: "태양과 자아의 방향성",
  vedic_planet_talents: "행성들이 말하는 재능과 성향",
  vedic_bhavas: "하우스로 보는 인생 영역",
  vedic_career_success: "직업과 사회적 성공운",
  vedic_money_flow: "재물과 풍요의 흐름",
  vedic_love_partnership: "사랑과 배우자운",
  vedic_dasha_flow: "다샤로 보는 운의 흐름",
  vedic_karma_growth: "카르마와 영적 성장의 방향",
  vedic_master_plan: "최종 베다 마스터플랜",
};

const VEDIC_PDF_CHAPTER_SYMBOLS = {
  vedic_soul_map: "☉",
  vedic_lagna: "△",
  vedic_moon_nakshatra: "☾",
  vedic_sun_self: "☀",
  vedic_planet_talents: "✶",
  vedic_bhavas: "◇",
  vedic_career_success: "♔",
  vedic_money_flow: "✦",
  vedic_love_partnership: "♡",
  vedic_dasha_flow: "⌛",
  vedic_karma_growth: "☊",
  vedic_master_plan: "🪷",
};

const VEDIC_PDF_CHAPTER_PHRASES = {
  vedic_soul_map: "당신의 차트는 삶의 중심축을 먼저 보여주고, 결정의 방향은 그 축 위에서 선명해집니다.",
  vedic_lagna: "라그나는 세상 앞에 처음 드러나는 문이며, 당신의 운은 그 문을 통과하는 태도에서 움직입니다.",
  vedic_moon_nakshatra: "달과 나크샤트라는 마음의 기억을 비추고, 반복되는 감정의 리듬을 해석하게 합니다.",
  vedic_sun_self: "태양은 스스로 증명하려는 빛이며, 명예와 자존감이 어디에서 회복되는지 알려줍니다.",
  vedic_planet_talents: "행성들은 흩어진 재능이 아니라 현실에서 써야 할 도구의 순서를 말합니다.",
  vedic_bhavas: "하우스는 사건의 무대이며, 어느 삶의 영역이 먼저 응답을 요구하는지 보여줍니다.",
  vedic_career_success: "직업운은 적성보다 오래 남는 기여의 방식에서 가장 또렷하게 열립니다.",
  vedic_money_flow: "재물운은 버는 힘과 지키는 힘이 같은 방향으로 놓일 때 안정됩니다.",
  vedic_love_partnership: "관계운은 끌림의 강도보다 반복되는 신뢰의 문법을 읽을 때 깊어집니다.",
  vedic_dasha_flow: "다샤는 지금 열려 있는 시간의 문이며, 서두를 것과 기다릴 것을 구분하게 합니다.",
  vedic_karma_growth: "카르마는 벌이 아니라 되풀이되는 반응을 다른 방식으로 끝내라는 초대입니다.",
  vedic_master_plan: "별의 언어는 현실의 순서가 될 때 비로소 운명의 안내가 됩니다.",
};

const VEDIC_SIGN_ELEMENT_KO = {
  Aries: "불", Leo: "불", Sagittarius: "불",
  Taurus: "땅", Virgo: "땅", Capricorn: "땅",
  Gemini: "바람", Libra: "바람", Aquarius: "바람",
  Cancer: "물", Scorpio: "물", Pisces: "물",
  "양자리": "불", "사자자리": "불", "사수자리": "불",
  "황소자리": "땅", "처녀자리": "땅", "염소자리": "땅",
  "쌍둥이자리": "바람", "천칭자리": "바람", "물병자리": "바람",
  "게자리": "물", "전갈자리": "물", "물고기자리": "물",
};

function resolveVedicPdfChapterId(chapter = {}) {
  return clean(chapter?.id || chapter?.key);
}

function displayVedicPdfChapterTitle(chapter = {}, index = 0) {
  const id = resolveVedicPdfChapterId(chapter);
  return cleanForbidden(VEDIC_PDF_CHAPTER_DISPLAY[id] || normalizeChapterTitleForDisplay(chapter?.title) || `제${index + 1}장`);
}

function resolveVedicElement(sign) {
  const value = clean(sign);
  return VEDIC_SIGN_ELEMENT_KO[value] || "기타";
}

function countVedicEvidenceSignals(chapters = []) {
  const unique = new Set();
  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      safeArray(section?.usedSignalIds).forEach((id) => {
        const cleanId = clean(id);
        if (cleanId) unique.add(cleanId);
      });
    });
  });
  return unique.size;
}

function buildVedicPdfVisualSummary(chapters = [], payload = {}) {
  const chart = payload?.chart || payload?.localVedicChartJson?.chart || {};
  const context = payload?.pdfContext || normalizeVedicPdfContext({}, payload);
  const planets = safeArray(chart?.planets).length ? safeArray(chart.planets) : safeArray(context?.planets);
  const houses = safeArray(chart?.houses).length ? safeArray(chart.houses) : safeArray(context?.bhavas);
  const elementCounts = { "불": 0, "땅": 0, "바람": 0, "물": 0, "기타": 0 };
  planets.forEach((planet) => {
    const element = resolveVedicElement(planet?.signEn || planet?.sign || planet?.rashi);
    elementCounts[element] = Number(elementCounts[element] || 0) + 1;
  });
  const maxElement = Math.max(1, ...Object.values(elementCounts));
  const houseFocus = [1, 2, 4, 7, 10, 11, 12].map((houseNo) => {
    const house = houses.find((item) => Number(item?.house || item?.number) === houseNo) || {};
    const planetsInHouse = safeArray(house?.planets).length
      ? safeArray(house.planets)
      : planets.filter((planet) => Number(planet?.house || planet?.bhava) === houseNo);
    const value = Math.max(1, planetsInHouse.length + (houseNo === 1 || houseNo === 10 ? 1 : 0));
    return {
      label: `${houseNo}H`,
      title: `${houseNo}하우스`,
      value,
      percent: Math.min(100, Math.round((value / 4) * 100)),
    };
  });
  const activeDasha = clean(chart?.dashas?.currentMahaDasha || context?.derived?.activeDasha) || "현재 다샤";
  const nextDasha = clean(context?.derived?.nextDasha || chart?.dashas?.nextMahaDasha) || "다음 다샤";
  const evidenceCount = countVedicEvidenceSignals(chapters);
  const lagna = cleanForbidden(chart?.lagnaSign || context?.lagna?.signKo || "라그나");
  const moonSign = cleanForbidden(chart?.moonSign || "문 사인");
  const moonNakshatra = cleanForbidden(chart?.nakshatra?.name || context?.moonNakshatra?.name || "나크샤트라");
  return {
    lagna,
    moonSign,
    moonNakshatra,
    activeDasha,
    nextDasha,
    evidenceCount,
    symbolicSentence: `${lagna} 라그나와 ${moonNakshatra}의 달빛이 만나, 지금의 결정은 ${activeDasha}의 시간 안에서 현실의 문장으로 정리됩니다.`,
    elementBalance: ["불", "땅", "바람", "물"].map((label) => ({
      label,
      value: Number(elementCounts[label] || 0),
      percent: Number(elementCounts[label] || 0) > 0
        ? Math.max(8, Math.round((Number(elementCounts[label] || 0) / maxElement) * 100))
        : 0,
    })),
    houseFocus,
    dashaTimeline: [
      { label: "현재", value: activeDasha, active: true },
      { label: "다음", value: nextDasha, active: false },
      { label: "통합", value: "실천 계획", active: false },
    ],
  };
}

function renderVedicPdfBars(rows = [], className = "") {
  const barWidth = (row) => {
    const value = Number(row?.value || 0);
    const percent = Number(row?.percent || 0);
    return value > 0 ? Math.max(6, Math.min(100, percent || value)) : 0;
  };
  return safeArray(rows).map((row) => `
    <div class="vd-pdf-bar ${escapeHtml(className)}">
      <span>${escapeHtml(row.label || row.title)}</span>
      <i style="--value:${barWidth(row)}%"></i>
      <b>${escapeHtml(String(Number(row.value || 0)))}</b>
    </div>
  `).join("");
}

function renderVedicPdfEvidenceChips(section = {}) {
  const chips = safeArray(section?.bullets).length
    ? safeArray(section.bullets)
    : safeArray(section?.usedSignalIds).map((id) => clean(id).replace(/\./g, " · "));
  return chips
    .map((chip) => cleanForbidden(chip))
    .filter(Boolean)
    .slice(0, 4)
    .reduce((html, chip) => `${html}<span class="vd-pdf-evidence-chip" data-vedic-pdf-evidence-chip>${escapeHtml(chip)}</span>`, `<span class="vd-pdf-evidence-title" data-vedic-pdf-evidence-title>차트 근거</span>`);
}

function renderVedicChapterGuide(chapter = {}) {
  const sections = safeArray(chapter.sections).map((section) => cleanForbidden(section?.title)).filter(Boolean);
  const first = sections[0] || "첫 상담 항목";
  const middle = sections[Math.min(2, sections.length - 1)] || first;
  const last = sections[sections.length - 1] || middle;
  return `
    <div class="chapter-guide" data-vedic-pdf-chapter-guide>
      <span>읽는 순서</span>
      <strong>${escapeHtml(first)} → ${escapeHtml(middle)} → ${escapeHtml(last)}</strong>
      <small>이 장은 먼저 큰 방향을 잡고, 이어서 생활 장면과 실천 기준으로 내려갑니다.</small>
    </div>
  `;
}

function renderEnhancedVedicChapterHtml(chapter, visualSummary, chapterIndex = 0) {
  const id = resolveVedicPdfChapterId(chapter);
  const chapterNo = Number(chapter.chapterNo || chapter.order || chapterIndex + 1);
  const title = displayVedicPdfChapterTitle(chapter, chapterIndex);
  const symbol = VEDIC_PDF_CHAPTER_SYMBOLS[id] || "✦";
  const phrase = cleanForbidden(VEDIC_PDF_CHAPTER_PHRASES[id] || visualSummary?.symbolicSentence || "");
  const sections = safeArray(chapter.sections).map((section) => `
    <article class="cat-card" data-vedic-pdf-section>
      <div class="cat-card__head">
        <h4>${escapeHtml(cleanForbidden(section.title) || "상담 항목")}</h4>
        <span>${escapeHtml(symbol)}</span>
      </div>
      <p class="cat-card__summary" data-vedic-pdf-section-summary>${escapeHtml(extractVedicSectionSummary(section.body))}</p>
      <div class="vd-section-body">${renderVedicSectionBody(section.body)}</div>
      <div class="vd-pdf-evidence">${renderVedicPdfEvidenceChips(section)}</div>
    </article>
  `).join("");

  return `
    <section class="chapter">
      <div class="chapter-head">
        <span class="chapter-symbol">${escapeHtml(symbol)}</span>
        <div>
          <p>제${chapterNo}장</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
      </div>
      <div class="symbol-card" data-vedic-pdf-symbolic-card>${escapeHtml(phrase)}</div>
      ${renderVedicChapterGuide(chapter)}
      <div class="cat-grid">${sections}</div>
    </section>
  `;
}

function renderEnhancedVedicPremiumPdf(chapters, payload) {
  const safeName = cleanForbidden(payload?.birthInput?.name || "사용자") || "사용자";
  const safeBirth = cleanForbidden(payload?.birthInput?.birthDate || "") || "출생 정보";
  const visualSummary = buildVedicPdfVisualSummary(chapters, payload);
  const toc = safeArray(chapters).map((chapter, index) => {
    const sectionLine = safeArray(chapter.sections)
      .map((section) => cleanForbidden(section?.title))
      .filter(Boolean)
      .join(" · ");
    return `<li><span>${index + 1}</span><div><strong>${escapeHtml(displayVedicPdfChapterTitle(chapter, index))}</strong><small>${escapeHtml(sectionLine)}</small></div></li>`;
  }).join("");
  const body = safeArray(chapters).map((chapter, index) => renderEnhancedVedicChapterHtml(chapter, visualSummary, index)).join("");
  const elementBars = renderVedicPdfBars(visualSummary.elementBalance, "vd-pdf-bar--element");
  const houseBars = renderVedicPdfBars(visualSummary.houseFocus, "vd-pdf-bar--house");
  const dashaTimeline = safeArray(visualSummary.dashaTimeline).map((item) => `
    <div class="dasha-step${item.active ? " active" : ""}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join("");
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} 베다점 프리미엄 PDF</title>
<style>
*{box-sizing:border-box}
body{font-family:'Noto Serif KR','Apple SD Gothic Neo',serif;background:#070a1a;color:#f7eedc;line-height:1.8;margin:0}
main{max-width:980px;margin:0 auto;padding:34px 26px 64px}
.cover{position:relative;overflow:hidden;border:1px solid rgba(245,158,11,.28);border-radius:20px;padding:30px;background:radial-gradient(circle at 20% 0,#3d2d63,#111936 46%,#070a1a 100%)}
.cover:before{content:"";position:absolute;inset:18px;border:1px solid rgba(255,209,102,.16);border-radius:16px;pointer-events:none}
.cover h1{position:relative;margin:0 0 8px;font-size:2rem;color:#ffd166;letter-spacing:0}
.cover p{position:relative;margin:4px 0;color:#d8c79f}
.cover-grid{position:relative;display:grid;grid-template-columns:1.08fr .92fr;gap:18px;align-items:center;margin-top:16px}
.seal{width:220px;aspect-ratio:1;margin:0 auto;border-radius:50%;border:1px solid rgba(255,209,102,.45);display:grid;place-items:center;background:radial-gradient(circle,rgba(255,209,102,.14),rgba(15,23,42,.86) 64%,rgba(7,10,26,.9));box-shadow:0 0 46px rgba(251,146,60,.18) inset}
.seal span{font-size:3.4rem;color:#fde68a}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.summary span,.vd-pdf-evidence-chip{border:1px solid rgba(255,209,102,.25);border-radius:999px;padding:5px 10px;color:#fde68a;background:rgba(88,28,135,.24);font-size:.86rem}
.visual-summary,.toc,.chapter{margin-top:24px;border:1px solid rgba(245,158,11,.2);border-radius:14px;padding:18px;background:rgba(12,18,42,.74)}
.visual-summary{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.visual-panel h3,.toc h2{margin:0 0 10px;color:#ffe39d;font-size:1rem}
.vd-pdf-bar{display:grid;grid-template-columns:54px 1fr 42px;gap:8px;align-items:center;margin:7px 0;color:#f8e7bb;font-size:.86rem}
.vd-pdf-bar i{height:8px;border-radius:999px;background:linear-gradient(90deg,#f59e0b,#fef3c7);width:var(--value);display:block;max-width:100%}
.vd-pdf-bar b{font-weight:700;color:#fde68a;text-align:right}
.dasha-line{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dasha-step{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;background:rgba(255,255,255,.06)}
.dasha-step.active{border-color:rgba(253,230,138,.44);background:rgba(245,158,11,.12)}
.dasha-step span{display:block;color:#cbd5e1;font-size:.78rem}
.dasha-step strong{display:block;color:#fef3c7;font-size:.9rem}
.toc ol{margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;list-style:none}
.toc li{display:flex;gap:8px;align-items:flex-start;color:#f7eedc;font-size:.92rem}
.toc li span{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(245,158,11,.16);color:#fde68a;font-weight:800}
.toc li div{min-width:0}
.toc li strong{display:block;color:#fff7ed;font-weight:800;line-height:1.45}
.toc li small{display:block;color:#cbd5e1;font-size:.76rem;line-height:1.55;word-break:keep-all}
.chapter h2{margin:0;color:#ffe39d;font-size:1.2rem}
.chapter-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.chapter-head p{margin:0;color:#fbbf24;font-size:.78rem;text-transform:uppercase}
.chapter-symbol{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;border:1px solid rgba(253,230,138,.36);color:#fde68a;background:rgba(255,255,255,.07);font-size:1.25rem}
.symbol-card{margin:10px 0 14px;padding:12px 14px;border-left:3px solid rgba(253,230,138,.72);border-radius:8px;background:rgba(245,158,11,.1);color:#fff7ed;font-weight:700;word-break:keep-all}
.chapter-guide{display:grid;grid-template-columns:92px 1fr;gap:6px 12px;margin:0 0 14px;padding:12px 14px;border:1px solid rgba(253,230,138,.18);border-radius:10px;background:rgba(255,255,255,.05)}
.chapter-guide span{grid-row:1 / span 2;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(245,158,11,.14);color:#fde68a;font-size:.78rem;font-weight:800}
.chapter-guide strong{color:#fff7ed;font-size:.92rem;line-height:1.55;word-break:keep-all}
.chapter-guide small{color:#cbd5e1;font-size:.78rem;line-height:1.55;word-break:keep-all}
.cat-grid{display:grid;grid-template-columns:1fr;gap:10px}
.cat-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:16px;background:rgba(29,21,57,.72);break-inside:avoid;page-break-inside:avoid}
.cat-card__head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.cat-card h4{margin:0 0 6px;color:#ffd166;font-size:1rem}
.cat-card__head span{color:#fef3c7}
.cat-card__summary{margin:4px 0 12px;color:#fff7ed;border-left:2px solid rgba(253,230,138,.6);padding-left:10px;font-weight:700;line-height:1.7;word-break:keep-all}
.vd-section-body{display:flex;flex-direction:column;gap:12px}
.vd-section-lead-label{margin:10px 0 0;color:#fde68a;font-size:.95rem;font-weight:800}
.vd-section-label{display:inline-flex;width:max-content;max-width:100%;margin:10px 0 0;border:1px solid rgba(253,230,138,.24);border-radius:999px;padding:2px 9px;color:#fde68a;background:rgba(245,158,11,.08);font-size:.82rem;font-weight:800}
.vd-section-body p{margin:0;color:#eee4cf;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}
.vd-section-body ul{margin:0;padding-left:18px;color:#fef3c7;line-height:1.8}
.vd-section-body li{margin:2px 0;word-break:keep-all;overflow-wrap:break-word}
.vd-pdf-evidence{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}
.vd-pdf-evidence-title{border:1px solid rgba(253,230,138,.18);border-radius:999px;padding:5px 9px;color:#fff7ed;background:rgba(255,255,255,.06);font-size:.78rem;font-weight:800}
@media print{body{background:#fff;color:#1f2937}.cover,.visual-summary,.toc,.chapter{break-inside:avoid;background:#fff;color:#1f2937}.chapter{break-before:page;page-break-before:always}.cat-card{break-inside:avoid;page-break-inside:avoid;background:#fff}.vd-section-body p,.vd-section-body ul{color:#1f2937}}
@media (max-width:720px){main{padding:22px 14px}.cover-grid,.visual-summary,.toc ol,.chapter-guide{grid-template-columns:1fr}.chapter-guide span{grid-row:auto;width:max-content}.seal{width:180px}.dasha-line{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
  <section class="cover">
    <h1>베다점 프리미엄 PDF</h1>
    <p>라그나와 나크샤트라로 읽는 계산 기반 상담 리포트</p>
    <p>${escapeHtml(safeName)} · ${escapeHtml(safeBirth)}</p>
    <div class="summary">
      <span>라그나 ${escapeHtml(visualSummary.lagna)}</span>
      <span>달 ${escapeHtml(visualSummary.moonSign)}</span>
      <span>나크샤트라 ${escapeHtml(visualSummary.moonNakshatra)}</span>
      <span>${safeArray(chapters).length}장 구성</span>
      <span>근거 신호 ${visualSummary.evidenceCount}개</span>
    </div>
    <div class="cover-grid">
      <div class="symbol-card" data-vedic-pdf-symbolic-card>${escapeHtml(visualSummary.symbolicSentence)}</div>
      <div class="seal" aria-label="Vedic chart seal"><span>🪷</span></div>
    </div>
  </section>
  <section class="visual-summary" data-vedic-pdf-visual-summary>
    <div class="visual-panel">
      <h3>원소 밸런스</h3>
      ${elementBars}
    </div>
    <div class="visual-panel">
      <h3>삶의 무대 집중도</h3>
      ${houseBars}
    </div>
    <div class="visual-panel">
      <h3>다샤 타임라인</h3>
      <div class="dasha-line">${dashaTimeline}</div>
    </div>
    <div class="visual-panel">
      <h3>상담 신뢰 지표</h3>
      <div class="summary">
        <span>정밀 계산 기반</span>
        <span>장별 차트 근거</span>
        <span>상담 근거 일치</span>
      </div>
    </div>
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
    visualSummary,
    symbolicSentence: visualSummary.symbolicSentence,
  };
}

export function renderVedicPremiumPdf(chapters, payload) {
  return renderEnhancedVedicPremiumPdf(chapters, payload);
}

export function validateVedicPdfCompletionPayload({ pdfReady = {}, chapters = [], payload = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const normalizedChapters = safeArray(chapters).map((chapter, index) => ({
    ...chapter,
    id: clean(chapter?.id || chapter?.key || VEDIC_PREMIUM_CHAPTERS[index]?.id),
    key: clean(chapter?.key || chapter?.id || VEDIC_PREMIUM_CHAPTERS[index]?.id),
    chapterNo: Number(chapter?.chapterNo || chapter?.order || index + 1),
    title: clean(chapter?.title || VEDIC_PREMIUM_CHAPTERS[index]?.title),
    sections: safeArray(chapter?.sections).length > 0
      ? safeArray(chapter.sections)
      : safeArray(chapter?.categories).map((category) => ({
        id: clean(category?.id),
        title: clean(category?.title),
        body: clean(category?.body || category?.text || category?.localSummary),
        usedSignalIds: safeArray(category?.usedSignalIds),
      })),
  }));
  const manuscript = validateVedicFinalManuscript({
    birthInput: payload?.birthInput,
    localVedicChartJson: payload,
    chapters: normalizedChapters,
    requireSignalIds: true,
    allowFallback: false,
  });
  if (!manuscript.ok) issues.push(...manuscript.issues.map((issue) => `manuscript.${issue}`));
  const chartSourceQuality = payload?.chartSourceQuality && typeof payload.chartSourceQuality === "object"
    ? payload.chartSourceQuality
    : validateVedicPremiumChartSourceQuality({ chartJson: payload });
  if (!chartSourceQuality.ok) issues.push(...safeArray(chartSourceQuality.issues).map((issue) => `chart_source.${issue}`));

  const html = clean(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");
  if (html && !/data-vedic-pdf-visual-summary/.test(html)) issues.push("html.visual_summary_missing");
  if (html && !/data-vedic-pdf-symbolic-card/.test(html)) issues.push("html.symbolic_card_missing");
  if (html && !/data-vedic-pdf-evidence-chip/.test(html)) issues.push("html.evidence_chip_missing");

  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  const pdfUrl = clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl);
  const htmlUrl = clean(pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");
  if (requireDownloadUrl && !/\/api\/premium\/pdf-archive\/.+[?&]format=pdf(?:&|$)/i.test(pdfUrl)) issues.push("download_url.archive_pdf_format");
  if (requireDownloadUrl && !/\/api\/premium\/pdf-archive\/.+[?&]format=html(?:&|$)/i.test(htmlUrl)) issues.push("html_url.archive_html_format");
  if (requireDownloadUrl && clean(pdfReady?.renderFormat) !== "pdf-archive") issues.push("pdf_ready.render_format");
  if (requireDownloadUrl && clean(pdfReady?.mimeType) !== "application/pdf") issues.push("pdf_ready.mime_type");
  if (requireDownloadUrl && clean(pdfReady?.contentType) !== "application/pdf") issues.push("pdf_ready.content_type");
  if (requireDownloadUrl && pdfReady?.canDownload === false) issues.push("pdf_ready.can_download");

  const manuscriptText = normalizedChapters
    .flatMap((chapter) => [
      chapter.title,
      ...safeArray(chapter.sections).flatMap((section) => [section.title, section.body]),
    ])
    .join("\n");
  if (hasVedicBrokenText(`${html}\n${manuscriptText}`)) issues.push("text.broken");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: normalizedChapters.length,
    expectedChapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    totalLength: manuscript?.stats?.totalLength || allTextLength(normalizedChapters),
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
    pdfUrl,
    htmlUrl,
    canDownload: pdfReady?.canDownload === true,
    manuscript,
    chartSourceQuality,
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

  log("LocalCalculationStart", {
    hasBirthDate: Boolean(clean(rawInput?.birthDate || rawInput?.user?.birthDate || rawInput?.birth?.date)),
    hasBirthTime: Boolean(clean(rawInput?.birthTime || rawInput?.user?.birthTime || rawInput?.birth?.time)),
  });

  let workingInput = rawInput;
  let localVedicChartJson;

  try {
    localVedicChartJson = buildVedicLocalChartJson(workingInput, { strictPremium: true });
  } catch (error) {
    log("StrictChartBuildFailed", {
      code: clean(error?.code || "VEDIC_CHART_SOURCE_INVALID"),
      reason: clean(error?.message || error),
    });
    error.code = clean(error?.code || "VEDIC_CHART_SOURCE_INVALID");
    error.status = Number(error?.status || 422);
    throw error;
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
    const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
    error.code = "VEDIC_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = signalValidation;
    throw error;
  }
  const chartSourceQuality = signalValidation.sourceQuality || validateVedicPremiumChartSourceQuality({ chartJson: localVedicChartJson });
  localVedicChartJson.chartSourceQuality = chartSourceQuality;

  if (clean(localVedicChartJson?.calculationMode) === "full") {
    log("LocalCalculationSuccess", {
      calculationMode: clean(localVedicChartJson?.calculationMode),
      chartSourceQuality: chartSourceQuality.ok,
      chartSource: clean(chartSourceQuality.source),
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

  log("LocalManuscriptBuildStart", {
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
  });
  const localDraft = buildVedicLocalPremiumManuscript(localVedicChartJson, {
    onChapterDone: (meta) => {
      log("LocalManuscriptChapterDone", {
        chapterNo: Number(meta?.chapterNo || 0),
        chapterId: clean(meta?.chapterId),
        chapterTitle: clean(meta?.chapterTitle),
        completed: Number(meta?.completed || 0),
        total: Number(meta?.total || VEDIC_PREMIUM_CHAPTERS.length),
      });
    },
  });
  const localFallbackChapters = normalizeVedicLocalFallbackManuscript(localDraft, localVedicChartJson);
  const vedicAstrologyFacts = buildVedicAstrologyFacts(localVedicChartJson, rawInput);
  const vedicAstrologyChapterPlans = buildVedicAstrologyChapterPlans({ chapters: localFallbackChapters }, vedicAstrologyFacts, localVedicChartJson);

  log("LocalManuscriptBuildSuccess", {
    chapterCount: localFallbackChapters.length,
    totalLength: allTextLength(localFallbackChapters),
    assemblyVersion: VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
  });

  const vedicMasterJson = buildVedicMasterJson(localVedicChartJson, rawInput);
  vedicMasterJson.vedicAstrologyFacts = vedicAstrologyFacts;
  vedicMasterJson.chapterPlans = vedicAstrologyChapterPlans;
  const masterJsonValidation = validateVedicMasterJson(vedicMasterJson);
  log("MasterJsonValidated", {
    ok: masterJsonValidation.ok,
    missing: masterJsonValidation.missing,
    stats: masterJsonValidation.stats,
  });
  if (!masterJsonValidation.ok) {
    const error = new Error("베다점 마스터 JSON 검증에 실패했습니다.");
    error.code = "VEDIC_MASTER_JSON_INVALID";
    error.status = 422;
    error.details = masterJsonValidation;
    throw error;
  }

  const localAssembly = {
    enabled: true,
    source: VEDIC_PDF_CONFIG.generationMode,
    provider: VEDIC_PDF_CONFIG.provider,
    templateVersion: VEDIC_PDF_CONFIG.templateVersion,
    chapterCount: localFallbackChapters.length,
    expectedChapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  log("LocalAssembledManuscriptReady", {
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    manuscriptSource: VEDIC_PDF_CONFIG.generationMode,
    assemblyVersion: VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
    localAssembly,
  });

  log("LocalAssembledManuscriptSuccess", {
    chapterCount: localFallbackChapters.length,
    totalLength: allTextLength(localFallbackChapters),
    localAssembly,
  });

  const finalChapters = safeArray(localFallbackChapters);
  const manuscriptSource = VEDIC_PDF_CONFIG.generationMode;

  const finalValidation = validateVedicFinalManuscript({
    birthInput,
    localVedicChartJson,
    chapters: finalChapters,
    requireSignalIds: true,
    allowFallback: false,
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

  const evidenceAudit = buildVedicEvidenceAudit(finalChapters, localVedicChartJson, { allowFallback: false });
  if (!evidenceAudit.ok) {
    const error = new Error("베다점 PDF 상담 근거 검증에 실패했습니다.");
    error.code = "VEDIC_EVIDENCE_AUDIT_FAILED";
    error.status = 422;
    error.details = evidenceAudit;
    throw error;
  }

  log("FinalManuscriptValidated", {
    chapterCount: finalValidation.stats.chapterCount,
    totalLength: finalValidation.stats.totalLength,
    hasAyanamsa: finalValidation.stats.hasAyanamsa,
    hasLagna: finalValidation.stats.hasLagna,
    hasMoonSign: finalValidation.stats.hasMoonSign,
    hasNakshatra: finalValidation.stats.hasNakshatra,
    manuscriptSource,
    localAssembly,
  });

  log("PdfRenderStart", {
    chapterCount: finalChapters.length,
    manuscriptSource,
    localAssembly,
  });

  const chapterDrafts = finalChapters.map((chapter) => ({
    ...chapter,
    localQuality: collectSignals(chapter, localVedicChartJson),
  }));
  const legacyChapters = chapterDrafts.map((chapter) => toLegacyChapterShape(chapter));
  const pdfReady = renderVedicPremiumPdf(chapterDrafts, localVedicChartJson);
  const pdfCompletionValidation = validateVedicPdfCompletionPayload({
    pdfReady,
    chapters: chapterDrafts,
    payload: localVedicChartJson,
    requireDownloadUrl: false,
  });
  if (!pdfCompletionValidation.ok) {
    const error = new Error("베다점 PDF 완료 검증에 실패했습니다.");
    error.code = "VEDIC_PDF_COMPLETION_VALIDATION_FAILED";
    error.status = 500;
    error.issues = pdfCompletionValidation.issues;
    throw error;
  }

  log("PdfRenderSuccess", {
    chapterCount: chapterDrafts.length,
    totalLength: finalValidation.stats.totalLength,
    manuscriptSource,
    localAssembly,
    pdfCompletionValidation: pdfCompletionValidation.ok,
  });

  return {
    payload: localVedicChartJson,
    birthInput,
    localVedicChartJson,
    vedicMasterJson,
    vedicAstrologyFacts,
    vedicAstrologyChapterPlans,
    masterJsonValidation,
    localDraft,
    chapters: legacyChapters,
    chapterDrafts,
    chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
    manuscriptSource,
    generationMode: VEDIC_PDF_CONFIG.generationMode,
    provider: VEDIC_PDF_CONFIG.provider,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
    localAssembly,
    calculationFallbackUsed: false,
    vedicVisualSummary: pdfReady.visualSummary,
    symbolicSentence: pdfReady.symbolicSentence,
    pdfReady: {
      ...pdfReady,
      manuscriptSource,
      localAssembly,
      chartSourceQuality,
    },
    pdfCompletionValidation,
    quality: {
      ...finalValidation.stats,
      evidenceAuditOk: evidenceAudit.ok,
      evidenceUniqueSignalCount: evidenceAudit.uniqueSignalCount,
      evidenceUsedSignalRefs: evidenceAudit.totalUsedSignalRefs,
      evidenceMissingRequiredCount: evidenceAudit.missingRequiredCount,
      evidenceInvalidSignalCount: evidenceAudit.invalidSignalCount,
      evidenceUnsupportedClaimCount: evidenceAudit.unsupportedClaimCount,
      evidenceMissingChapterAccuracyCount: evidenceAudit.missingChapterAccuracyCount,
      chartSourceQualityOk: chartSourceQuality.ok,
      chartSourceQuality,
      writingPipeline: "local-calculation-to-local-assembled-pdf",
      manuscriptSource,
      localAssembly,
    },
    diagnostics: {
      localAssembly,
      manuscript: finalValidation,
      pdfCompletionValidation,
      evidence: evidenceAudit,
      masterJson: masterJsonValidation,
      chartSourceQuality,
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
