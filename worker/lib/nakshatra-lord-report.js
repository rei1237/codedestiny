// 나크샤트라 지배성 심화 리포트 (₩10,000) — 결정론 조립 엔진.
//
// LLM 을 쓰지 않는다. 재열람이 전제인 고정 콘텐츠라 같은 생년월일이면 언제나 같은 본문이 나와야 하고,
// 근거(지배성·파다·나바암샤·가나·나디·요니·모티브)가 전부 표에서 결정되기 때문이다.
//
// 값의 출처는 constants/nakshatra-attributes.js(27수 속성) 하나뿐이며, 이 파일은 그 속성들을
// 사람이 읽는 문장으로 엮는 조립 레이어다. 계산은 하지 않는다(호출부가 넘겨준다).
//
// 그라하 성숙 연령(matureAge)은 자이미니·파라샤라 전통의 graha maturity 정본:
//   Jupiter 16 · Sun 22 · Moon 24 · Venus 25 · Mars 28 · Mercury 32 · Saturn 36 · Rahu 42 · Ketu 48.

import { NAKSHATRA_ATTRIBUTES, getNakshatraAttributes, getPadaDetail } from "../../constants/nakshatra-attributes.js";
import { GRAHA_KO } from "./vedic-derived-calculations.js";

// ── 지배성 9종 ──────────────────────────────────────────────────────────────
const LORD_PROFILE = {
  Sun: {
    sanskrit: "수리야(Surya)",
    archetype: "중심에 서는 사람",
    innerVoice: "앞에 나서 방향을 정하는",
    matureAge: 22,
    core: "당신의 별을 다스리는 것은 태양입니다. 태양은 스스로 빛나야 하는 별이라, 이 지배성을 가진 사람은 누군가의 그늘에 오래 머물면 기력이 떨어집니다. 인정받고 싶다는 마음이 허영이 아니라 생리에 가깝고, 자기 이름을 걸 수 있는 일에서 비로소 힘이 돕니다.",
    talent: "방향을 정하는 능력이 뛰어납니다. 모두가 망설일 때 \"이쪽\"이라고 말할 수 있고, 그 말에 사람이 따라붙습니다. 원칙을 지키는 성실함과 위엄이 신뢰의 근거가 됩니다.",
    shadow: "인정이 늦어질 때 자존심이 먼저 반응합니다. 조언을 비판으로 듣거나, 굽히면 지는 것이라 여겨 관계를 굳게 만듭니다. 태양의 그림자는 오만이 아니라 실은 \"보이지 않는 것에 대한 두려움\"입니다.",
    relation: "상대를 지켜 주려는 마음이 크지만, 그 방식이 종종 통제로 번역됩니다. 사랑을 표현하는 언어가 \"해결해 주기\"라서, 그저 들어 주기를 바라는 사람과 어긋납니다.",
    work: "책임의 무게가 분명한 자리에서 강합니다. 조직의 대표, 전문직, 자기 이름이 붙는 창작·교육이 맞습니다. 익명으로 처리되는 반복 업무에서는 동력이 빨리 식습니다.",
    wealth: "체면과 관대함이 지출의 두 축입니다. 벌이보다 \"어디에 서 있는가\"로 소비를 결정하는 경향이 있어, 지위 비용을 따로 예산화해 두면 흔들림이 줄어듭니다.",
    weekday: "일요일",
    colors: ["루비 레드", "황금 오렌지"],
    mantra: "옴 흐람 흐림 흐라움 사하 수리야야 나마하",
    practices: [
      "해 뜬 뒤 30분 안에 햇빛을 직접 받으며 10분 걷기",
      "일주일에 한 번, 결정권을 온전히 쥐는 작은 프로젝트 만들기",
      "칭찬을 들었을 때 부정하지 말고 \"고맙습니다\" 한 마디로 받기",
    ],
  },
  Moon: {
    sanskrit: "찬드라(Chandra)",
    archetype: "마음의 물결을 읽는 사람",
    innerVoice: "주변의 마음부터 살피는",
    matureAge: 24,
    core: "달이 당신의 별을 다스립니다. 달은 스스로 빛을 내지 않고 받아서 비추는 별이라, 주변의 정서를 그대로 흡수합니다. 기분의 진폭이 큰 것은 미숙함이 아니라 감지력이 높다는 뜻이고, 그 감지력이 이 사람의 가장 값진 도구입니다.",
    talent: "말하지 않은 것을 알아차립니다. 방의 공기가 바뀌는 순간, 상대가 참고 있는 말, 아직 문제가 되지 않은 균열을 먼저 봅니다. 돌보고 이어 붙이는 일에서 대체 불가능해집니다.",
    shadow: "타인의 감정을 자기 것으로 착각해 소진됩니다. 거절이 어려워 떠맡고, 떠맡은 뒤에 서운해합니다. 달의 그림자는 게으름이 아니라 \"경계 없음\"입니다.",
    relation: "정서적 안정이 사랑의 기준입니다. 화려한 사람보다 예측 가능한 사람 곁에서 오래갑니다. 다만 서운함을 말 대신 침묵으로 표현해 상대를 헤매게 만드는 습관이 있습니다.",
    work: "사람을 상대하는 일, 돌봄·상담·교육·요식·콘텐츠처럼 정서가 상품이 되는 분야에서 강합니다. 감정 소모가 큰 만큼 회복 시간을 일정에 넣어야 오래 갑니다.",
    wealth: "기분에 따라 지출이 출렁입니다. 위로 소비의 비중이 큰 편이라, 자동이체로 저축을 먼저 떼어 두는 구조가 의지보다 잘 듣습니다.",
    weekday: "월요일",
    colors: ["펄 화이트", "은빛 회색"],
    mantra: "옴 슈람 슈림 슈라움 사하 찬드라야 나마하",
    practices: [
      "잠들기 전 10분, 그날 느낀 감정 세 가지만 적기",
      "물가(강·바다·호수) 근처를 달마다 한 번 걷기",
      "거절해야 할 때 \"생각해 보고 답할게요\"로 시간을 확보하기",
    ],
  },
  Mars: {
    sanskrit: "망갈라(Mangala)",
    archetype: "먼저 움직이는 사람",
    innerVoice: "먼저 몸을 움직이고 보는",
    matureAge: 28,
    core: "화성이 당신의 별을 다스립니다. 화성은 시작의 힘이라, 이 사람은 생각을 오래 굴리기보다 몸이 먼저 나갑니다. 에너지가 몸에 머무는 시간이 짧아, 쓰지 않으면 안에서 열이 됩니다.",
    talent: "결단과 돌파. 남들이 위험을 재는 동안 이미 첫 삽을 뜹니다. 위기 상황에서 판단이 오히려 또렷해지고, 몸을 쓰는 정확성과 기술 습득이 빠릅니다.",
    shadow: "속도가 관계를 다칩니다. 옳은 말을 너무 빨리, 너무 세게 해서 내용이 아니라 태도로 기억됩니다. 화성의 그림자는 분노 자체가 아니라 \"멈추지 못함\"입니다.",
    relation: "직진합니다. 좋으면 좋다고 하고 아니면 아니라고 해 오해가 적지만, 갈등에서 물러설 줄 몰라 사소한 일이 커집니다. 다툰 뒤 먼저 손 내미는 훈련이 관계 수명을 바꿉니다.",
    work: "경쟁·기술·현장이 있는 곳에서 빛납니다. 엔지니어링, 의료·수술, 스포츠, 영업 최전선, 창업 초기. 회의만 반복되는 자리에서는 급격히 무기력해집니다.",
    wealth: "벌 때 크게 벌고 쓸 때 즉흥적입니다. 충동 구매보다 위험한 것은 조급한 투자로, 결정과 집행 사이에 24시간 규칙을 두는 것만으로 손실이 크게 줄어듭니다.",
    weekday: "화요일",
    colors: ["코럴 레드", "테라코타"],
    mantra: "옴 크람 크림 크라움 사하 바우마야 나마하",
    practices: [
      "주 3회 이상 땀이 나는 운동으로 열을 밖으로 빼기",
      "화가 났을 때 첫 문장을 삼키고 열까지 세기",
      "한 달에 하나, 끝까지 완결하는 작은 과제 정하기",
    ],
  },
  Mercury: {
    sanskrit: "부다(Budha)",
    archetype: "언어로 세상을 다루는 사람",
    innerVoice: "말로 상황을 풀어 가는",
    matureAge: 32,
    core: "수성이 당신의 별을 다스립니다. 수성은 연결과 번역의 별이라, 이 사람은 서로 다른 영역 사이를 오가며 말을 옮기고 뜻을 맞춥니다. 호기심이 넓고 학습이 빠르며, 지루함을 가장 견디기 어려워합니다.",
    talent: "설명하는 재능. 복잡한 것을 상대의 언어로 바꿔 말합니다. 협상·중개·기획·글쓰기·거래에서 강하고, 여러 갈래의 정보를 동시에 다루는 데 능합니다.",
    shadow: "넓이가 깊이를 먹습니다. 시작한 것이 늘 여럿이고 완결이 적습니다. 수성의 그림자는 거짓말이 아니라 \"영리한 회피\" — 감정을 논리로 처리해 정작 자기 마음을 모릅니다.",
    relation: "대화가 되는 사람에게 끌립니다. 말이 통하면 나이·조건을 넘어서고, 말이 막히면 아무리 좋은 조건도 시들합니다. 다만 감정의 순간에 분석을 꺼내 상대를 서운하게 합니다.",
    work: "정보·언어·거래가 재료인 곳. 기획, 마케팅, 개발, 교육, 통번역, 유통. 한 우물만 파야 하는 자리보다 여러 축을 동시에 굴리는 구조가 맞습니다.",
    wealth: "여러 갈래의 수입을 만드는 데 능하지만 관리가 흩어집니다. 계좌와 목적을 통합하고 자산 점검일을 달력에 고정하면 수입 구조가 안정됩니다.",
    weekday: "수요일",
    colors: ["에메랄드 그린", "라이트 세이지"],
    mantra: "옴 브람 브림 브라움 사하 부다야 나마하",
    practices: [
      "매일 20분, 화면 없이 종이에 손으로 쓰기",
      "동시에 진행하는 일을 세 개 이하로 제한하기",
      "감정을 설명하지 말고 한 단어로만 말해 보기",
    ],
  },
  Jupiter: {
    sanskrit: "구루/브리하스파티(Brihaspati)",
    archetype: "의미를 찾아 주는 사람",
    innerVoice: "일의 의미를 먼저 묻는",
    matureAge: 16,
    core: "목성이 당신의 별을 다스립니다. 목성은 확장과 가르침의 별이라, 이 사람은 일의 이유를 알아야 움직입니다. 사람들이 자연스럽게 조언을 구해 오고, 본인도 설명하고 정리해 줄 때 가장 편안합니다.",
    talent: "큰 그림을 봅니다. 지금의 사건을 더 긴 시간 위에 놓고 해석해 방향을 제시합니다. 신뢰를 얻는 속도가 빠르고, 사람을 키우는 데 재능이 있습니다.",
    shadow: "가르치려는 자세가 관계를 위에서 아래로 만듭니다. 낙관이 과해 확인을 건너뛰고, 원칙에 어긋나는 상황을 견디지 못해 스스로를 고립시킵니다. 목성의 그림자는 과함입니다 — 말도 계획도 늘 조금씩 크게 잡힙니다.",
    relation: "존경할 수 있는 사람과 오래갑니다. 관대하고 잘 베풀지만, 상대가 자기 기준에 못 미친다고 느끼면 실망을 감추지 못합니다.",
    work: "가르침·해석·설계가 핵심인 자리. 교육, 법률, 상담, 연구, 종교·철학, 전략 기획, 큰 조직의 방향타. 의미를 설명할 수 없는 일에서는 오래 버티지 못합니다.",
    wealth: "돈은 잘 들어오지만 규모를 크게 잡아 여유가 남지 않습니다. 남을 돕는 지출의 상한을 미리 정해 두는 것이 이 지배성의 가장 실용적인 재무 규칙입니다.",
    weekday: "목요일",
    colors: ["샤프란 옐로", "딥 골드"],
    mantra: "옴 그람 그림 그라움 사하 구라베 나마하",
    practices: [
      "배운 것을 한 사람에게 설명해 주는 시간을 주에 한 번 만들기",
      "계획을 세운 뒤 규모를 20% 줄여 시작하기",
      "베푸는 돈의 월 상한을 정해 두기",
    ],
  },
  Venus: {
    sanskrit: "슈크라(Shukra)",
    archetype: "아름다움으로 관계를 짓는 사람",
    innerVoice: "결이 고운 것에 마음이 가는",
    matureAge: 25,
    core: "금성이 당신의 별을 다스립니다. 금성은 조화와 감각의 별이라, 이 사람은 추한 환경에서 능력이 나오지 않습니다. 공간·소리·촉감이 마음 상태를 직접 바꾸고, 관계의 결이 삶의 질을 결정합니다.",
    talent: "사람을 편하게 만드는 힘. 취향과 심미안이 정확하고, 갈등을 부드럽게 중재합니다. 감각으로 판단하는 분야에서 논리보다 빠르고 정확합니다.",
    shadow: "불화를 견디지 못해 할 말을 미룹니다. 미룬 말이 쌓여 어느 날 관계 자체를 끊는 방식으로 터집니다. 금성의 그림자는 사치가 아니라 \"회피된 갈등\"입니다.",
    relation: "사랑이 삶의 중심축입니다. 헌신적이고 다정하지만, 관계에 자기를 너무 많이 넣어 혼자 있는 시간을 잃습니다. 상대에게 맞추다 자기 취향을 잊는 순간이 신호입니다.",
    work: "미감이 값이 되는 곳. 디자인, 예술, 패션·뷰티, 공간, 브랜딩, 접객, 인사·중재. 미적 기준이 없는 조직에서는 열의가 빨리 식습니다.",
    wealth: "좋은 것에 쓰는 돈을 아깝게 여기지 않습니다. 문제는 액수보다 빈도이므로, 사치의 총량이 아니라 횟수를 관리하는 편이 효과적입니다.",
    weekday: "금요일",
    colors: ["오팔 화이트", "로즈 핑크"],
    mantra: "옴 드람 드림 드라움 사하 슈크라야 나마하",
    practices: [
      "일하는 공간에 좋아하는 물건 하나를 반드시 두기",
      "불편한 말을 그날 안에 짧게 한 문장으로 전하기",
      "일주일에 한 번 혼자만의 감각 시간(음악·전시·요리) 갖기",
    ],
  },
  Saturn: {
    sanskrit: "샤니(Shani)",
    archetype: "시간을 견디는 사람",
    innerVoice: "확실해질 때까지 기다리는",
    matureAge: 36,
    core: "토성이 당신의 별을 다스립니다. 토성은 시간과 구조의 별이라, 이 사람의 성취는 늦게 오고 대신 무너지지 않습니다. 또래보다 출발이 느리다고 느껴 온 시간이 있었다면, 그것은 뒤처짐이 아니라 이 지배성의 기본 속도입니다.",
    talent: "지속하는 힘. 남들이 흥미를 잃은 뒤에도 남아 있는 사람이라, 결국 그 분야의 기준이 됩니다. 현실 감각이 냉정하고 책임을 끝까지 집니다.",
    shadow: "자기 검열이 지나칩니다. 아직 부족하다는 이유로 시작을 미루고, 미룬 만큼 더 부족해집니다. 토성의 그림자는 게으름이 아니라 \"완벽해질 때까지의 유예\"입니다.",
    relation: "표현이 적어 오해받습니다. 마음이 없는 것이 아니라 확신이 서기 전에는 말하지 않는 방식인데, 상대는 그 침묵을 거리로 읽습니다. 오래 지켜본 뒤에 깊어지는 관계가 맞습니다.",
    work: "시간이 쌓여야 값이 되는 분야. 연구, 제조, 건축·토목, 법·행정, 장인 기술, 자산 관리. 유행에 따라 바뀌는 자리에서는 강점이 드러나지 않습니다.",
    wealth: "축적에 강하고 소비에 인색합니다. 위험은 낭비가 아니라 과도한 방어로, 기회를 재느라 놓치는 비용이 더 큽니다. 투자 예산을 미리 떼어 두는 편이 낫습니다.",
    weekday: "토요일",
    colors: ["딥 네이비", "차콜"],
    mantra: "옴 프람 프림 프라움 사하 샤나이샤라야 나마하",
    practices: [
      "완성도 70%에서 일단 내보내는 연습",
      "같은 시간에 같은 일을 하는 고정 루틴 하나 유지하기",
      "고마운 사람에게 짧게라도 말로 표현하기",
    ],
  },
  Rahu: {
    sanskrit: "라후(Rahu)",
    archetype: "낯선 곳으로 건너가는 사람",
    innerVoice: "낯선 쪽으로 끌리는",
    matureAge: 42,
    core: "라후가 당신의 별을 다스립니다. 라후는 그림자 행성이라 실체가 없고, 그래서 늘 \"아직 갖지 못한 것\"을 향합니다. 익숙한 자리에서 답답함을 느끼고, 남들이 가지 않은 길에서 오히려 편안해지는 사람입니다.",
    talent: "경계를 넘는 감각. 새로운 기술·문화·시장을 남보다 먼저 알아보고, 전례가 없는 조합을 만들어 냅니다. 외국·이질적 환경에서 능력이 커집니다.",
    shadow: "닿으면 시들합니다. 원하던 것을 얻는 순간 다음 것으로 옮겨가 성취가 축적되지 않습니다. 라후의 그림자는 욕망이 아니라 \"목적지를 계속 바꾸는 습관\"입니다.",
    relation: "강렬하게 끌리고 빠르게 가까워집니다. 다만 상상 속 상대와 실제 상대의 간극을 확인하는 순간이 위기이며, 그 간극을 견디면 관계가 오히려 깊어집니다.",
    work: "새로 생겨나는 분야. 신기술, 해외 사업, 미디어, 대체 산업, 전환기의 조직. 100년 된 업계의 100년 된 방식 안에서는 답답함이 성과를 갉아먹습니다.",
    wealth: "큰 진폭이 특징입니다. 급격한 확대와 급격한 축소를 모두 겪을 수 있으므로, 손실 한도를 숫자로 정해 두는 규칙이 이 지배성에는 필수입니다.",
    weekday: "토요일(라후 카알라를 피함)",
    colors: ["스모키 그레이", "딥 인디고"],
    mantra: "옴 브람 브림 브라움 사하 라하베 나마하",
    practices: [
      "새 일을 벌이기 전, 진행 중인 일 하나를 반드시 끝내기",
      "매년 한 번 완전히 낯선 환경에 자신을 놓기",
      "손실 한도를 숫자로 적어 눈에 보이는 곳에 두기",
    ],
  },
  Ketu: {
    sanskrit: "케투(Ketu)",
    archetype: "덜어내며 깊어지는 사람",
    innerVoice: "혼자 깊이 파고드는",
    matureAge: 48,
    core: "케투가 당신의 별을 다스립니다. 케투는 머리 없는 그림자라 방향을 묻지 않고 파고듭니다. 세상의 기준으로 설명되는 성공에 이상하리만치 무심하고, 대신 한 가지를 끝까지 들여다보는 데서 만족을 얻습니다.",
    talent: "직관과 몰입. 논리를 건너뛰고 답에 먼저 닿는 순간이 잦고, 이유를 나중에 찾습니다. 연구·수행·치유·기술의 깊은 지점에서 남다른 성취를 냅니다.",
    shadow: "관계와 물질에서 스스로를 떼어 놓습니다. 상처받기 전에 먼저 거리를 두는 방식이라 외로움이 선택처럼 보입니다. 케투의 그림자는 무욕이 아니라 \"미리 하는 체념\"입니다.",
    relation: "가까워지면 물러섭니다. 상대를 싫어해서가 아니라 자기 안의 공간이 좁아지는 것을 견디기 어려워서입니다. 혼자의 시간을 존중해 주는 상대와 오래갑니다.",
    work: "깊이가 값이 되는 자리. 연구, 분석, 의료·심리, 수행·명상 지도, 고도 기술, 감정 노동이 적은 전문직. 사교가 성과를 좌우하는 자리는 소모가 큽니다.",
    wealth: "돈에 대한 관심이 낮아 관리가 방치되기 쉽습니다. 벌이보다 무관심이 위험이므로, 자동화로 관리 부담 자체를 없애는 방식이 맞습니다.",
    weekday: "화요일",
    colors: ["애시 그레이", "머스터드"],
    mantra: "옴 스람 스림 스라움 사하 케타베 나마하",
    practices: [
      "하루 15분 아무것도 하지 않는 시간을 일정에 넣기",
      "물러서고 싶을 때 이유를 한 문장으로 적어 보기",
      "재무는 자동이체·자동투자로 구조화해 두기",
    ],
  },
};

// ── 가나(기질 계열) 3종 ─────────────────────────────────────────────────────
const GANA_TRAIT = {
  Deva: {
    label: "데바(신성)",
    text: "타고난 결이 부드럽고 상대의 기분을 먼저 살핍니다. 갈등이 생기면 자기 몫을 더 크게 잡는 쪽이라 손해를 보면서도 관계를 지킵니다.",
    edge: "다만 그 배려가 상대에게 \"괜찮은 사람\"으로만 읽혀, 정작 필요한 요구를 못 하게 됩니다.",
  },
  Manushya: {
    label: "마누샤(인간)",
    text: "이상과 현실을 저울에 올려 두고 사는 결입니다. 원하는 것과 가능한 것 사이에서 계산이 정확하고, 그래서 실행이 현실적입니다.",
    edge: "다만 저울질 자체가 습관이 되면, 이미 결정된 일에도 마음이 계속 흔들립니다.",
  },
  Rakshasa: {
    label: "락샤사(격렬)",
    text: "감정과 의지의 밀도가 높습니다. 좋고 싫음이 분명하고, 한번 정하면 밀어붙이는 힘이 셉니다. 위기에서 오히려 또렷해지는 유형입니다.",
    edge: "다만 그 강도가 평온한 자리에서는 과잉으로 읽혀, 의도보다 세게 전달되는 손해를 봅니다.",
  },
};

// ── 나디(체질 축) 3종 ───────────────────────────────────────────────────────
const NADI_TRAIT = {
  Vata: {
    label: "바타(바람·아디)",
    text: "생각과 움직임이 빠르고 변화에 잘 적응합니다. 잠이 얕고 마음이 앞서 달리는 편이라, 회복은 자극을 더하는 쪽이 아니라 줄이는 쪽에서 옵니다.",
    care: "규칙적인 식사 시간과 따뜻한 음식, 정해진 취침 시각이 이 체질에는 보약입니다.",
  },
  Pitta: {
    label: "피타(불·마디아)",
    text: "집중력과 추진력이 강하고 목표가 뚜렷합니다. 열이 안에 쌓이는 유형이라 과로와 조급함이 몸에 먼저 신호를 보냅니다.",
    care: "찬 성질의 음식, 한낮의 과로를 피하는 일정, 물가나 그늘에서의 휴식이 균형을 잡아 줍니다.",
  },
  Kapha: {
    label: "카파(물·안티아)",
    text: "지구력과 안정감이 큽니다. 한번 자리를 잡으면 흔들리지 않지만, 시작이 무겁고 정체되면 오래 머뭅니다.",
    care: "아침의 가벼운 운동, 무거운 음식 줄이기, 주기적인 환경 변화가 흐름을 되살립니다.",
  },
};

// ── 요니(관계 본능) 14종 ────────────────────────────────────────────────────
const YONI_TRAIT = {
  Horse: { ko: "말", text: "달리고 있을 때 살아 있다고 느낍니다. 관계에서도 정체를 견디지 못해, 함께 나아가는 감각이 있어야 애정이 유지됩니다." },
  Elephant: { ko: "코끼리", text: "무겁고 오래갑니다. 쉽게 마음을 열지 않지만 한번 받아들이면 좀처럼 놓지 않고, 상처의 기억도 오래 남깁니다." },
  Goat: { ko: "염소", text: "온순해 보이지만 자기 영역이 분명합니다. 부드럽게 물러서는 것처럼 보이다가도 선을 넘으면 단호합니다." },
  Serpent: { ko: "뱀", text: "감정의 밀도가 높고 감지력이 예민합니다. 표면은 고요한데 안에서는 많은 일이 일어나며, 신뢰가 깨지면 회복이 어렵습니다." },
  Dog: { ko: "개", text: "충직하고 곁을 지킵니다. 관계에 헌신하는 대신 같은 충직함을 상대에게도 기대해, 어긋날 때 상처가 큽니다." },
  Cat: { ko: "고양이", text: "가까움과 거리를 스스로 조절하려 합니다. 애정이 없는 것이 아니라 자기 속도로 다가가야 하는 유형입니다." },
  Rat: { ko: "쥐", text: "기민하고 눈치가 빠릅니다. 위험을 먼저 감지해 대비하지만, 그 경계심이 관계 초반의 거리를 만듭니다." },
  Cow: { ko: "소", text: "품이 넓고 돌봅니다. 요구하지 않고 내어 주는 방식이라, 자기 소진을 스스로 알아차리기 어렵습니다." },
  Buffalo: { ko: "물소", text: "인내가 깊고 쉽게 흔들리지 않습니다. 대신 참는 총량이 커서, 한계에 닿았을 때의 반응이 갑작스럽게 보입니다." },
  Tiger: { ko: "호랑이", text: "존재감이 강하고 주도권을 쥐려 합니다. 대등한 상대에게 끌리며, 눌리는 관계에서는 오래 머물지 못합니다." },
  Deer: { ko: "사슴", text: "섬세하고 놀람이 빠릅니다. 거친 어조 하나에도 마음이 접히므로, 안전한 분위기가 애정의 전제 조건입니다." },
  Monkey: { ko: "원숭이", text: "재기와 유희가 관계의 언어입니다. 웃음이 통해야 마음이 열리고, 진지함만 이어지면 답답해합니다." },
  Mongoose: { ko: "몽구스", text: "위협 앞에서 물러서지 않습니다. 지켜야 할 것이 분명할 때 가장 용감해지고, 불의를 참지 못합니다." },
  Lion: { ko: "사자", text: "당당하고 관대합니다. 존중받는 자리에서 최선을 내주지만, 무시당했다고 느끼면 관계를 통째로 접습니다." },
};

// ── 모티브(삶의 동기) 4종 ───────────────────────────────────────────────────
const MOTIVE_TRAIT = {
  Dharma: { label: "다르마(사명·정의)", text: "옳은가를 먼저 묻습니다. 이익보다 명분이 앞서고, 자기가 믿는 기준에 어긋나면 유리한 자리도 버립니다. 삶의 만족은 \"쓸모 있는 자리에 있는가\"에서 옵니다." },
  Artha: { label: "아르타(재물·성취)", text: "결과를 손에 쥐어야 안심합니다. 숫자와 실적으로 확인되는 성취가 자존의 근거이고, 노력의 대가가 보이지 않는 구조에서 빠르게 지칩니다." },
  Kama: { label: "카마(욕망·창의)", text: "느낌이 살아 있어야 움직입니다. 즐거움과 아름다움, 끌림이 동력이라 의무만으로는 오래 못 갑니다. 창작과 관계가 삶의 두 기둥입니다." },
  Moksha: { label: "목샤(해방·영성)", text: "왜 사는가를 계속 묻습니다. 세속의 기준이 헐거워지는 순간이 반복되고, 그 물음을 억누르기보다 정면으로 다루는 편이 오히려 안정적입니다." },
};

function lordProfile(lord) {
  return LORD_PROFILE[lord] || null;
}

function lordKo(lord) {
  return GRAHA_KO[lord] || lord || "";
}

function joinSentences(parts) {
  return parts.filter(Boolean).join(" ");
}

// 지배성 × 나바암샤 지배성 — 81조합을 표로 두지 않고 두 원형의 관계로 서술한다.
function blendNavamsa(lord, navamsaLord) {
  const base = lordProfile(lord);
  const inner = lordProfile(navamsaLord);
  if (!base || !inner) return "";
  if (lord === navamsaLord) {
    return `겉과 속의 지배성이 모두 ${lordKo(lord)}입니다. 성향이 한 방향으로 모여 강도가 세지는 대신, 균형을 잡아 줄 반대 축이 안에 없습니다. ${base.shadow.split(".")[0]} — 이 대목이 남보다 빨리, 자주 찾아옵니다.`;
  }
  return `겉으로 드러나는 결은 ${lordKo(lord)}(${base.archetype})이지만, 나바암샤가 가리키는 안쪽은 ${lordKo(navamsaLord)}(${inner.archetype})입니다. 남들이 보는 당신과 혼자일 때의 당신이 다른 이유가 여기 있습니다. 밖에서는 ${base.innerVoice} 모습으로 살면서, 안에서는 ${inner.innerVoice} 사람입니다. 어느 쪽도 가짜가 아니고, 둘 다 당신입니다.`;
}

function padaLine(padaDetail) {
  if (!padaDetail) return null;
  return `${padaDetail.pada}번째 파다 — 나바암샤 ${padaDetail.navamsaSignKo}, 그 방의 주인은 ${lordKo(padaDetail.navamsaLord)}입니다.`;
}

function buildSections(attrs, padaDetail, dasha) {
  const lord = attrs.lord;
  const profile = lordProfile(lord);
  const gana = GANA_TRAIT[attrs.gana];
  const nadi = NADI_TRAIT[attrs.nadi];
  const yoni = YONI_TRAIT[attrs.yoni];
  const motive = MOTIVE_TRAIT[attrs.motive];
  const sections = [];

  sections.push({
    id: "lordPortrait",
    title: "지배성의 초상",
    icon: "☉",
    keyInsight: `${attrs.nameKo}의 주인은 ${lordKo(lord)} — ${profile.archetype}`,
    paragraphs: [
      profile.core,
      `${attrs.nameKo}는 ${attrs.symbol}을 상징으로 삼고, 전통은 이 별의 고유한 힘을 "${attrs.shakti}"이라 부릅니다. ${attrs.deity}가 이 자리를 주관합니다 — ${attrs.deityRole}.`,
      `산스크리트 이름은 ${profile.sanskrit}. 이 지배성이 제 몫을 온전히 하기 시작하는 나이는 전통적으로 ${profile.matureAge}세 전후로 봅니다. 그 이전의 기복은 결함이 아니라 아직 다 자라지 않은 별의 상태로 읽습니다.`,
    ],
  });

  const padaText = padaLine(padaDetail);
  sections.push({
    id: "padaNavamsa",
    title: "파다와 나바암샤 — 별 안의 방",
    icon: "◧",
    keyInsight: padaDetail
      ? `${padaDetail.pada}파다 · ${padaDetail.navamsaSignKo} · 안쪽의 주인 ${lordKo(padaDetail.navamsaLord)}`
      : "출생 시각이 없어 파다는 산출하지 않았습니다",
    paragraphs: padaDetail
      ? [
        `하나의 나크샤트라는 네 개의 방(파다)으로 나뉘고, 방마다 안쪽 지배성이 다릅니다. 같은 ${attrs.nameKo}라도 몇 번째 방에 태어났느냐로 결이 갈립니다.`,
        padaText,
        blendNavamsa(lord, padaDetail.navamsaLord),
      ]
      : [
        `하나의 나크샤트라는 네 개의 방(파다)으로 나뉘고, 방마다 안쪽 지배성이 다릅니다. 파다는 달의 위치를 3°20′ 단위로 다시 쪼개 정하므로, 출생 시각이 몇 분만 어긋나도 방이 바뀝니다.`,
        `입력에 출생 시각이 없어 파다를 산출하지 않았습니다. 근거 없이 하나를 고르면 이 리포트에서 가장 개인화된 대목이 오히려 가장 부정확해지기 때문입니다. 시각을 확인하시면 같은 화면에서 바로 다시 열립니다.`,
        `참고로 ${attrs.nameKo}의 네 방은 각각 ${attrs.padaSignsKo.join(" · ")}에 놓입니다.`,
      ],
  });

  sections.push({
    id: "temperament",
    title: "기질의 삼중 구조",
    icon: "❈",
    keyInsight: `${gana.label} · ${nadi.label} · ${yoni.ko}`,
    paragraphs: [
      `베다 점성은 기질을 세 축으로 나눠 봅니다 — 사람을 대하는 결(가나), 몸이 반응하는 방식(나디), 관계에서 드러나는 본능(요니).`,
      `${gana.label} — ${gana.text} ${gana.edge}`,
      `${nadi.label} — ${nadi.text} ${nadi.care}`,
      `${yoni.ko} 요니 — ${yoni.text}`,
    ],
  });

  sections.push({
    id: "talent",
    title: "타고난 재능",
    icon: "✦",
    keyInsight: profile.talent.split(".")[0],
    paragraphs: [
      profile.talent,
      `${attrs.deity}의 결이 여기에 겹칩니다. ${attrs.deityKw.join(" · ")} — 이 세 단어가 당신이 가장 자연스럽게 잘하는 일의 방향입니다.`,
      `${motive.label}가 삶의 동기축입니다. ${motive.text}`,
    ],
  });

  // 아홉 그라하가 27수를 셋씩 나눠 다스린다 — 형제별과의 대조는 지배성만으로 뭉뚱그려지지 않는
  // "같은 주인 아래 무엇이 나만의 몫인가"를 드러내는 대목이라 별도 섹션으로 둔다.
  const siblings = NAKSHATRA_ATTRIBUTES.filter((item) => item.lord === lord && item.index !== attrs.index);
  sections.push({
    id: "siblings",
    title: "같은 주인을 둔 세 별",
    icon: "⁂",
    keyInsight: siblings.length
      ? `${lordKo(lord)}는 ${attrs.nameKo} · ${siblings.map((item) => item.nameKo).join(" · ")}를 함께 다스립니다`
      : `${lordKo(lord)}가 다스리는 별`,
    paragraphs: [
      `아홉 그라하가 스물일곱 별을 셋씩 나눠 맡습니다. ${lordKo(lord)}의 몫은 ${[attrs, ...siblings].map((item) => item.nameKo).join(" · ")} 세 자리이고, 당신은 그중 ${attrs.nameKo}에 태어났습니다.`,
      siblings.length === 2
        ? `${siblings[0].nameKo}는 ${siblings[0].symbol}을 상징 삼아 "${siblings[0].shakti}"을 씁니다. ${siblings[1].nameKo}는 ${siblings[1].symbol}을 상징 삼아 "${siblings[1].shakti}"을 씁니다. 같은 ${lordKo(lord)}의 힘인데 쓰이는 방식이 이렇게 다릅니다.`
        : `같은 지배성이라도 별마다 상징과 고유한 힘이 달라, 쓰이는 방향이 갈립니다.`,
      `당신 몫은 "${attrs.shakti}"입니다. ${lordKo(lord)}의 재능을 가졌다는 말만으로는 부족하고, 그 재능이 ${attrs.symbol}의 방식으로 나온다는 데까지 가야 정확해집니다. 지배성이 무엇을 잘하는지를 정한다면, 나크샤트라는 그것을 어떤 손짓으로 하는지를 정합니다.`,
      `${attrs.gana === "Deva" ? "가나가 데바인 것도 여기서 의미가 생깁니다 — 같은 힘을 부드러운 쪽으로 씁니다." : attrs.gana === "Rakshasa" ? "가나가 락샤사인 것도 여기서 의미가 생깁니다 — 같은 힘을 세게, 끝까지 밀어 씁니다." : "가나가 마누샤인 것도 여기서 의미가 생깁니다 — 같은 힘을 현실적인 저울 위에서 씁니다."}`,
    ],
  });

  sections.push({
    id: "shadow",
    title: "그림자 — 되풀이되는 함정",
    icon: "◑",
    keyInsight: profile.shadow.split(".")[0],
    paragraphs: [
      profile.shadow,
      `여기에 ${gana.label}의 결이 더해집니다. ${gana.edge}`,
      `그림자는 고칠 결함이 아니라 재능의 뒷면입니다. ${profile.talent.split(".")[0]}가 과해질 때 나타나는 얼굴이라, 없애려 하면 강점까지 함께 무뎌집니다. 알아차리고 속도를 늦추는 것이 유일하게 듣는 방법입니다.`,
    ],
  });

  sections.push({
    id: "relation",
    title: "관계에서의 발현",
    icon: "◈",
    keyInsight: `${yoni.ko}의 본능 × ${lordKo(lord)}의 애정 방식`,
    paragraphs: [
      profile.relation,
      `요니가 여기에 겹칩니다. ${yoni.text}`,
      `${gana.label}인 사람은 갈등의 순간에 ${attrs.gana === "Deva" ? "먼저 물러서고" : attrs.gana === "Manushya" ? "누가 옳은지부터 따지고" : "물러서지 않고"}, 그 반응이 상대에게는 늘 같은 장면으로 반복됩니다. 관계가 어긋나는 지점은 대개 이 한 장면입니다.`,
    ],
  });

  sections.push({
    id: "work",
    title: "일과 재물",
    icon: "▲",
    keyInsight: profile.work.split(".")[0],
    paragraphs: [
      profile.work,
      profile.wealth,
      `${motive.label}가 동기축이므로, ${attrs.motive === "Artha" ? "성과가 숫자로 돌아오는 구조" : attrs.motive === "Dharma" ? "일의 명분이 분명한 조직" : attrs.motive === "Kama" ? "재미와 감각이 살아 있는 현장" : "의미를 스스로 정의할 수 있는 자리"}에서 오래갑니다. 조건이 좋아도 이 축이 비면 이유 없이 지치는 시기가 옵니다.`,
    ],
  });

  const dashaLord = dasha?.currentMahadasha || "";
  const dashaProfile = lordProfile(dashaLord);
  sections.push({
    id: "timing",
    title: "성숙의 시간표",
    icon: "◷",
    keyInsight: dashaProfile
      ? `지금은 ${lordKo(dashaLord)} 대주기 — ${dashaProfile.archetype}의 시간`
      : `${lordKo(lord)}가 제 몫을 하는 나이는 ${profile.matureAge}세 전후`,
    paragraphs: [
      `그라하는 저마다 제 몫을 하기 시작하는 나이가 다릅니다. 당신의 지배성 ${lordKo(lord)}는 ${profile.matureAge}세 전후로 봅니다. 그 이전에 이 별의 힘이 서툴게 나타난 일이 있었다면, 그것은 실패의 기록이 아니라 예정된 연습입니다.`,
      dashaProfile
        ? `그리고 지금 당신은 ${lordKo(dashaLord)} 대주기(마하다샤)를 지나고 있습니다${dasha?.current?.startDate ? ` — ${dasha.current.startDate} ~ ${dasha.current.endDate}` : ""}. 이 기간에는 ${dashaProfile.archetype}의 과제가 삶의 표면으로 올라옵니다. ${dashaProfile.talent.split(".")[0]}가 유난히 잘 통하고, 동시에 ${dashaProfile.shadow.split(".")[0]}가 반복적으로 시험대에 오릅니다.`
        : `대주기(마하다샤) 정보를 함께 보시려면 다샤 인생지도에서 120년 타임라인 전체를 펼쳐 볼 수 있습니다.`,
      `타이밍은 결과를 정하지 않습니다. 같은 시기가 누군가에게는 확장이고 누군가에게는 소모인 것은, 그 시기의 과제를 알고 있었는가의 차이입니다.`,
    ],
  });

  sections.push({
    id: "remedy",
    title: `${lordKo(lord)}를 기르는 처방`,
    icon: "✧",
    keyInsight: `${profile.weekday} · ${profile.colors.join(" / ")}`,
    paragraphs: [
      `베다의 처방(우파야)은 운명을 바꾸는 주술이 아니라, 약해진 축에 의식적으로 시간을 쓰게 만드는 생활 설계입니다. 효과는 신비가 아니라 반복에서 옵니다.`,
      `요일 — ${profile.weekday}. 이 날에 ${lordKo(lord)}와 관련된 일(위 실천 항목)을 배치하면 습관이 붙기 쉽습니다.`,
      `색 — ${profile.colors.join(", ")}. 옷·소품·작업 공간 어디든 좋습니다. 상징을 눈에 두는 것 자체가 주의를 그 축으로 되돌립니다.`,
      `만트라 — ${profile.mantra}. 아침에 조용히 아홉 번. 소리를 내기 어려우면 속으로도 무방합니다.`,
      `그리고 처방보다 먼저인 것이 있습니다. ${gana.edge.replace(/^다만 /, "")} 이 문장이 자기 이야기처럼 들린다면, 아래 실천 세 가지 중 첫 번째만 한 달 해 보십시오. 세 개를 다 하려다 하나도 못 하는 것이 이 지배성들이 공통으로 겪는 실패입니다.`,
    ],
    bullets: profile.practices.map((text, index) => ({ label: `실천 ${index + 1}`, text })),
  });

  sections.push({
    id: "closing",
    title: "이 리포트를 쓰는 법",
    icon: "❖",
    keyInsight: "타고난 것은 바뀌지 않지만, 쓰는 방식은 바뀝니다",
    paragraphs: [
      `여기까지가 ${attrs.nameKo}와 그 주인 ${lordKo(lord)}가 말하는 당신의 기본 설계입니다. 설계는 바뀌지 않습니다. 바뀌는 것은 같은 설계로 무엇을 짓느냐입니다.`,
      `읽으면서 "맞다" 싶은 대목과 "이건 아닌데" 싶은 대목이 함께 있었을 겁니다. 맞는 쪽은 이미 살고 있는 부분이고, 아닌 쪽은 대개 아직 쓰지 않은 부분입니다. 특히 그림자 항목이 낯설게 느껴진다면, 아직 그 대목이 시험대에 오르는 시기를 지나지 않았을 가능성이 큽니다.`,
      `점성은 결정된 미래를 알려 주는 도구가 아닙니다. 되풀이되는 자기 패턴에 이름을 붙여 주는 도구입니다. 이름이 붙으면 같은 상황에서 반응하기 전에 반 박자 멈출 수 있고, 그 반 박자가 실제로 삶을 바꾸는 전부입니다.`,
      `언제 무엇이 시험대에 오르는지가 궁금하다면, 다샤 인생지도에서 120년 주기 전체를 펼쳐 보실 수 있습니다. 이 리포트가 "누구인가"라면 그쪽은 "언제인가"를 다룹니다.`,
    ],
  });

  return sections;
}

function countChars(sections, headline) {
  let total = String(headline || "").length;
  for (const section of sections) {
    total += String(section.title || "").length + String(section.keyInsight || "").length;
    for (const paragraph of section.paragraphs || []) total += String(paragraph || "").length;
    for (const bullet of section.bullets || []) total += String(bullet.text || "").length;
  }
  return total;
}

/**
 * 지배성 심화 리포트 조립. 계산 결과(나크샤트라 인덱스·파다·다샤)를 받아 본문만 만든다.
 *
 * @param {{ nakIndex:number, pada:(number|null), dasha:(object|null), timeUnknown:boolean }} input
 * @returns {object|null} 조립 실패(인덱스 무효)면 null
 */
export function buildNakshatraLordReport({ nakIndex, pada = null, dasha = null, timeUnknown = false }) {
  const attrs = getNakshatraAttributes(nakIndex);
  if (!attrs) return null;
  const profile = lordProfile(attrs.lord);
  if (!profile) return null;

  const padaDetail = timeUnknown ? null : getPadaDetail(attrs.index, pada);
  const headline = joinSentences([
    `${attrs.nameKo}의 주인은 ${lordKo(attrs.lord)}입니다.`,
    `${profile.archetype} — 이 한 줄이 당신의 별을 움직이는 원리입니다.`,
  ]);
  const sections = buildSections(attrs, padaDetail, dasha);

  return {
    meta: {
      nakshatraIndex: attrs.index,
      nakshatraKo: attrs.nameKo,
      nakshatraEn: attrs.nameEn,
      lord: attrs.lord,
      lordKo: lordKo(attrs.lord),
      lordSanskrit: profile.sanskrit,
      archetype: profile.archetype,
      matureAge: profile.matureAge,
      pada: padaDetail ? padaDetail.pada : null,
      navamsaSignKo: padaDetail ? padaDetail.navamsaSignKo : null,
      navamsaLord: padaDetail ? padaDetail.navamsaLord : null,
      navamsaLordKo: padaDetail ? lordKo(padaDetail.navamsaLord) : null,
      ganaKo: attrs.ganaKo,
      nadiKo: attrs.nadiKo,
      yoniKo: YONI_TRAIT[attrs.yoni] ? YONI_TRAIT[attrs.yoni].ko : attrs.yoni,
      motiveKo: attrs.motiveKo,
      symbol: attrs.symbol,
      shakti: attrs.shakti,
      deity: attrs.deity,
      timeUnknown: Boolean(timeUnknown),
    },
    headline,
    sections,
    charCount: countChars(sections, headline),
  };
}

export const __nakshatraLordReportTestUtils = { LORD_PROFILE, GANA_TRAIT, NADI_TRAIT, YONI_TRAIT, MOTIVE_TRAIT };
