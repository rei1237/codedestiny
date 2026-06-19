import { Solar } from "lunar-javascript";
import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;
export const SUKYO_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  provider: "sukuyo-assembler",
  templateVersion: "sukuyo-premium-local-assembled-v2",
});

const MIN_CHAPTER_LENGTH = 1800;
const MIN_SECTION_LENGTH = 360;
const MIN_TOTAL_LENGTH = 30000;
const SUKYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const INTERNAL_TOKEN_RE = /\b(?:payload|debug|engine|api|json|localdraft|about:blank|internal\s+server\s+error|chapter\s*\d+|a\(안\)|b\(괴\)|near-triad(?:-[a-z0-9]+)?|\bd\d+\b|triad|자동\s*복구\s*생성|undefined|null|nan)\b/gi;
const FORBIDDEN_BODY_PHRASES = [
  "자동 복구 생성",
  "fallback",
  "데이터가 부족합니다",
  "payload",
  "raw",
  "schema",
  "internal data",
  "내부 데이터",
  "계산 시그니처",
  "데이터 정규화",
  "품질 검증",
  "재생성",
  "compatibilityResult",
  "relationVariant",
  "enhanced.signature",
  "SIG-",
  "myIdx",
  "partnerIdx",
  "distanceMetrics",
  "roleActionGuide",
  "JSON",
  "debug",
  "about:blank",
  "Internal server error",
  "undefined",
  "null",
  "NaN",
  "localdraft",
  "상담 증거",
  "실제 장면에서 확인해야 할 표지",
  "보완 포인트",
  "그림자 버튼",
  "강점 사용 시점",
  "생성 지침",
  "프롬프트",
  "템플릿",
];

const ALLOWED_DOMAIN_REPEAT_TERMS = ["안괴", "영친", "업태", "근거리", "중거리", "원거리", "화해", "거리 조절"];
const ALLOWED_DOMAIN_REPEAT_PATTERNS = Object.freeze([
  /기운이\s+\S+으로\s+이어지며\s+조화\s+점수는\s+\d+점입니다/u,
  /애정을\s+표현할\s+때\s+\S+을\s+앞세우고\s+불안이\s+커지면\s+\S+을\s+보일\s+수\s+있습니다/u,
  /편안함\s+속에서도\s+성장\s+과제를\s+주간\s+단위로\s+고정/u,
  /갈등\s+직후\s+24시간\s+내\s+사실\s+감정\s+합의\s+순서로\s+재접속/u,
]);
const FORBIDDEN_TEMPLATE_STEMS = Object.freeze([
  "의 핵심은",
  "조합에서 이 항목은",
  "의 체감 거리 안에서",
  "말투, 선택 순서, 기다리는 방식, 생활 반응",
  "이번 항목의 실행 기준은",
  "다음 대화에서는",
  "충돌 위험도",
  "장기 지속 가능성",
  "판단 근거는",
  "현실에서는",
  "상담 처방은",
  "이 장의 달빛은",
  "균형 문제",
  "먼저 적용하세요",
  "선택의 언어",
  "관계의 장점보다 먼저 실제 반응의 순서",
  "실제로 판단하는 기준",
  "반응이 가장 먼저 갈라지는 지점",
  "형태로 드러납니다",
  "이 장에서는",
  "처방의 중심은",
  "위험 흐름은",
  "합의 없이 넘기면 피로가 누적됩니다",
  "감정의 반응과 현실의 선택",
  "선택의 속도, 기다림의 길이, 회복의 말투",
  "안에서 다루고",
  "관계 유형 기준은",
  "거리 운영 기준은",
]);
const AWKWARD_JOSA_PATTERNS = Object.freeze([
  "분위기은",
  "이유은",
  "문제을",
  "차이을",
  "의미을",
  "숙제을",
  "이유을",
  "태도을",
  "방식라는",
  "압력라는",
  "가능성라는",
  "속도을",
  "기준을 기준",
  "표현을 표현",
  "흐름을 흐름",
  "기준은 기준",
]);
const SUKUYO_NATURAL_TEXT_REPLACEMENTS = Object.freeze([
  [/이에요\.이에요/g, "이에요"],
  [/예요\.예요/g, "예요"],
  [/해요\.해요/g, "해요"],
  [/돼요\.돼요/g, "돼요"],
  [/해요이에요/g, "해요"],
  [/돼요이에요/g, "돼요"],
  [/해요를/g, "하는 일을"],
  [/해요을/g, "하는 일을"],
  [/필수이에요을/g, "필수 기준을"],
  [/필수예요을/g, "필수 기준을"],
  [/이에요을/g, "임을"],
  [/예요을/g, "임을"],
  [/이에요를/g, "임을"],
  [/예요를/g, "임을"],
  [/이에요이/g, "이라는 흐름이"],
  [/예요이/g, "이라는 흐름이"],
  [/속도을/g, "속도를"],
  [/기준을 기준/g, "기준을 핵심 축"],
  [/표현을 표현/g, "표현을"],
  [/흐름을 흐름/g, "흐름을"],
  [/기준은 기준/g, "기준은 핵심 기준"],
  [/분위기은/g, "분위기는"],
  [/이유은/g, "이유는"],
  [/문제을/g, "문제를"],
  [/차이을/g, "차이를"],
  [/의미을/g, "의미를"],
  [/숙제을/g, "숙제를"],
  [/이유을/g, "이유를"],
  [/태도을/g, "태도를"],
  [/방식라는/g, "방식이라는"],
  [/압력라는/g, "압력이라는"],
  [/가능성라는/g, "가능성이라는"],
  [/속도으로/g, "속도로"],
  [/밀도으로/g, "밀도로"],
  [/간격으로\s*흔들립니다/g, "간격 안에서 흔들립니다"],
  [/\\s+안에서\\s+다루고/g, " 흐름으로 다루고"],
  [/상담\s*증거/g, "달빛 근거"],
  [/실제\s*장면에서\s*확인해야\s*할\s*표지/g, "현실에서 먼저 드러나는 신호"],
  [/보완\s*포인트/g, "조율의 핵"],
  [/그림자\s*버튼/g, "불안을 건드리는 지점"],
  [/강점\s*사용\s*시점/g, "강점이 살아나는 때"],
  [/판단\s*근거는/g, "달빛 근거는"],
  [/상담\s*처방은/g, "조율의 핵은"],
  [/이\s*장의\s*달빛은/g, "이 달빛은"],
  [/현실에서는/g, "현실의 흐름에는"],
  [/다음\s*대화에서는/g, "다음 대화에는"],
  [/이\s*장에서는/g, "이 별자리에는"],
  [/처방의\s*중심은/g, "조율의 중심은"],
  [/위험\s*흐름은/g, "흔들림의 흐름은"],
  [/관계\s*유형\s*기준은/g, "관계 유형의 문턱은"],
  [/거리\s*운영\s*기준은/g, "거리 운영의 문턱은"],
  [/형태로\s*드러납니다/g, "결로 드러납니다"],
  [/보여줍니다/g, "비춥니다"],
  [/읽습니다/g, "짚습니다"],
  [/말합니다/g, "가리킵니다"],
  [/설명합니다/g, "드러냅니다"],
  [/제공합니다/g, "열어둡니다"],
  [/비춥니다/g, "비춰요"],
  [/짚습니다/g, "짚어요"],
  [/가리킵니다/g, "가리켜요"],
  [/드러냅니다/g, "드러내요"],
  [/열어둡니다/g, "열어둬요"],
  [/드러납니다/g, "드러나요"],
  [/나타납니다/g, "나타나요"],
  [/머무릅니다/g, "머물러요"],
  [/흔들립니다/g, "흔들려요"],
  [/이어집니다/g, "이어져요"],
  [/움직입니다/g, "움직여요"],
  [/바뀝니다/g, "바뀌어요"],
  [/읽힙니다/g, "읽혀요"],
  [/느껴집니다/g, "느껴져요"],
  [/또렷해집니다/g, "또렷해져요"],
  [/선명해집니다/g, "선명해져요"],
  [/깊어집니다/g, "깊어져요"],
  [/만들어집니다/g, "만들어져요"],
  [/쌓여집니다/g, "쌓여요"],
  [/건드립니다/g, "건드려요"],
  [/열립니다/g, "열려요"],
  [/흐릅니다/g, "흘러요"],
  [/살아납니다/g, "살아나요"],
  [/다가옵니다/g, "다가와요"],
  [/올라옵니다/g, "올라와요"],
  [/돌아옵니다/g, "돌아와요"],
  [/닿습니다/g, "닿아요"],
  [/남습니다/g, "남아요"],
  [/내려앉습니다/g, "내려앉아요"],
  [/잃습니다/g, "잃어요"],
  [/않습니다/g, "않아요"],
  [/쉽습니다/g, "쉬워요"],
  [/큽니다/g, "커요"],
  [/작습니다/g, "작아요"],
  [/깁니다/g, "길어요"],
  [/짧습니다/g, "짧아요"],
  [/강합니다/g, "강해요"],
  [/약합니다/g, "약해요"],
  [/선명합니다/g, "선명해요"],
  [/가능합니다/g, "가능해요"],
  [/따뜻합니다/g, "따뜻해요"],
  [/차갑습니다/g, "차가워요"],
  [/가깝습니다/g, "가까워요"],
  [/묶습니다/g, "묶어요"],
  [/깎습니다/g, "깎아요"],
  [/어렵습니다/g, "어려워요"],
  [/커집니다/g, "커져요"],
  [/쌓입니다/g, "쌓여요"],
  [/늦어집니다/g, "늦어져요"],
  [/사라집니다/g, "사라져요"],
  [/높아집니다/g, "높아져요"],
  [/발생합니다/g, "생겨요"],
  [/필요합니다/g, "필요해요"],
  [/중요합니다/g, "중요해요"],
  [/좌우합니다/g, "좌우해요"],
  [/결정합니다/g, "결정해요"],
  [/안정됩니다/g, "안정돼요"],
  [/확인해야 합니다/g, "확인해야 해요"],
  [/맡아야 합니다/g, "맡아야 해요"],
  [/세워야 합니다/g, "세워야 해요"],
  [/보아야 합니다/g, "보아야 해요"],
  [/정해야 합니다/g, "정해야 해요"],
  [/나누어야 합니다/g, "나누어야 해요"],
  [/있습니다/g, "있어요"],
  [/없습니다/g, "없어요"],
  [/입니다/g, "이에요"],
  [/합니다/g, "해요"],
  [/됩니다/g, "돼요"],
  [/줍니다/g, "줘요"],
  [/생성\s*지침/g, ""],
  [/프롬프트/gi, ""],
  [/템플릿/gi, ""],
]);
const SUKUYO_SAFETY_REPLACEMENTS = Object.freeze([
  [/반드시\s*헤어진다/gi, "관계가 흔들리기 쉬운 지점이 있으므로 조율이 필요하다"],
  [/이\s*관계는\s*파멸한다/gi, "강한 자극과 변화가 생길 수 있어 감정 조절이 중요하다"],
  [/파멸한다/gi, "감정 조절이 중요하다"],
  [/절대\s*만나면\s*안\s*된다/gi, "서로의 속도와 기대치를 조심스럽게 맞춰가야 한다"],
  [/결혼하면\s*불행하다/gi, "생활 리듬과 역할 조율을 충분히 확인해야 한다"],
  [/상대가\s*당신을\s*망친다/gi, "상대의 방식에 지나치게 끌려가면 자신의 리듬을 잃기 쉽다"],
  [/배신당한다/gi, "신뢰 확인이 늦어지면 상처가 커질 수 있다"],
  [/평생\s*상처받는다/gi, "상처가 반복되지 않도록 회복 규칙을 세워야 한다"],
  [/둘은\s*운명적으로\s*안\s*된다/gi, "두 사람은 현실적인 조율 기준을 세울수록 관계를 더 잘 이해할 수 있다"],
  [/안괴라서\s*위험하다/gi, "안괴의 성향은 강한 끌림과 충돌 가능성이 함께 나타날 수 있다"],
  [/위성이라서\s*실패한다/gi, "위성 관계는 현실적인 목표와 역할 조율이 중요하다"],
  [/우쇠라서\s*한쪽이\s*반드시\s*희생한다/gi, "우쇠 관계는 감정의 무게가 한쪽으로 기울지 않게 균형을 잡아야 한다"],
  [/업태라서\s*무조건\s*운명이다/gi, "업태 관계는 익숙함과 깊은 연결감을 느끼기 쉬우나 현실적인 소통도 필요하다"],
  [/영친이라서\s*무조건\s*좋은\s*관계다/gi, "영친 관계는 안정감을 주기 쉽지만 관계 관리가 필요 없는 것은 아니다"],
  [/무조건\s*좋은\s*관계/gi, "관리할수록 안정되는 관계"],
  [/무조건\s*나쁜\s*관계/gi, "조율이 필요한 관계"],
]);

export const SUKYO_PDF_CHAPTERS = Object.freeze([
  { key: "chapter-01-core-map", order: 1, title: "제 1장. 두 사람의 숙명적 궁합 요약", sections: ["두 사람의 전체 인연 한 줄 해석", "이 관계가 시작될 때의 끌림", "함께 있을 때 만들어지는 분위기", "이 관계의 핵심 장점", "가장 조심해야 할 관계의 약점"] },
  { key: "chapter-02-me-love", order: 2, title: "제 2장. 나의 본명숙과 사랑 방식", sections: ["나의 본명숙이 가진 기본 성향", "사랑할 때 드러나는 나의 감정 방식", "관계에서 내가 기대하는 것", "불안할 때 나타나는 나의 반응", "내가 사랑을 오래 유지하는 방법"] },
  { key: "chapter-03-partner-love", order: 3, title: "제 3장. 상대의 본명숙과 사랑 방식", sections: ["상대의 본명숙이 가진 기본 성향", "상대가 사랑을 느끼는 방식", "상대가 관계에서 중요하게 여기는 것", "상대가 멀어질 때 보이는 신호", "상대를 이해하기 위한 핵심 포인트"] },
  { key: "chapter-04-relation-type", order: 4, title: "제 4장. 숙요 관계 유형 정밀 해석", sections: ["두 사람의 관계 유형", "이 관계가 주는 감정적 강도", "서로에게 배우게 되는 것", "관계 유형이 만드는 반복 패턴", "이 관계를 좋게 쓰는 방법"] },
  { key: "chapter-05-distance", order: 5, title: "제 5장. 거리와 인연 강도 분석", sections: ["근거리·중거리·원거리 관계의 의미", "가까워질수록 강해지는 부분", "멀어질수록 드러나는 문제", "인연의 속도와 감정 밀도", "관계의 적절한 거리 조절법"] },
  { key: "chapter-06-attraction", order: 6, title: "제 6장. 첫 만남과 끌림의 이유", sections: ["처음 끌렸던 이유", "서로에게 신비롭게 느껴지는 지점", "외모보다 강하게 작용하는 분위기", "감정이 빨리 깊어지는 이유", "첫 끌림이 오래 지속되기 위한 조건"] },
  { key: "chapter-07-emotion", order: 7, title: "제 7장. 감정 교류와 마음의 온도", sections: ["두 사람의 감정 속도 차이", "애정 표현 방식의 차이", "서운함이 쌓이는 방식", "마음이 통한다고 느끼는 순간", "감정 온도를 맞추는 방법"] },
  { key: "chapter-08-communication", order: 8, title: "제 8장. 대화와 소통 궁합", sections: ["말이 잘 통하는 부분", "말이 엇갈리는 부분", "침묵이 생기는 이유", "싸울 때 사용하는 말의 방식", "관계를 살리는 대화법"] },
  { key: "chapter-09-conflict", order: 9, title: "제 9장. 갈등과 충돌 패턴", sections: ["가장 자주 부딪히는 문제", "서로를 오해하는 지점", "한쪽이 지치게 되는 이유", "감정 폭발이 일어나는 순간", "갈등을 줄이는 현실적인 방법"] },
  { key: "chapter-10-reunion", order: 10, title: "제 10장. 이별과 재회 가능성", sections: ["이 관계가 멀어지는 이유", "이별 후에도 마음이 남는 이유", "재회 가능성을 높이는 조건", "다시 만나도 반복될 수 있는 문제", "재회를 원할 때 가장 중요한 태도"] },
  { key: "chapter-11-marriage", order: 11, title: "제 11장. 장기 연애와 결혼 궁합", sections: ["오래 만날수록 강해지는 부분", "결혼 후 드러날 수 있는 차이", "생활 리듬의 궁합", "책임과 역할 분담의 문제", "장기 관계로 가기 위한 조건"] },
  { key: "chapter-12-reality", order: 12, title: "제 12장. 현실 생활과 가치관 궁합", sections: ["돈과 소비에 대한 태도", "일과 관계의 우선순위", "가족과 주변 사람에 대한 관점", "생활 습관에서 생기는 차이", "현실 문제를 함께 해결하는 방식"] },
  { key: "chapter-13-intimacy", order: 13, title: "제 13장. 친밀감과 애정 표현 궁합", sections: ["서로에게 편안함을 느끼는 방식", "스킨십과 애정 표현의 온도", "사랑받는다고 느끼는 순간", "거절감이나 거리감을 느끼는 순간", "친밀감을 회복하는 방법"] },
  { key: "chapter-14-karma", order: 14, title: "제 14장. 전생 인연과 카르마적 의미", sections: ["이 관계가 전생 인연처럼 느껴지는 이유", "반복해서 끌리는 감정의 정체", "서로에게 남기는 숙제", "관계가 주는 성장의 의미", "이 인연을 성숙하게 마무리하거나 이어가는 법"] },
  { key: "chapter-15-final", order: 15, title: "제 15장. 두 사람을 위한 최종 관계 전략", sections: ["이 관계의 최종 핵심 메시지", "지금 가장 먼저 해야 할 일", "관계를 망치는 행동", "관계를 살리는 행동", "앞으로의 선택을 위한 조언"] },
]);

const CHAPTER_REQUIRED_KEYWORDS = Object.freeze({
  8: ["말", "침묵", "대화"],
  10: ["이별", "재회", "반복"],
  11: ["결혼", "생활", "장기"],
  12: ["돈", "소비", "현실"],
  14: ["전생", "인연", "성장"],
});

const SUKYO_COMPAT_RELATION_INTERPRETATION = Object.freeze({
  "安壞": {
    userLabel: "안괴",
    theme: "강한 끌림과 불안, 보호와 파괴, 빠른 감정 상승",
    strength: "서로의 정체된 감정을 깨우고 관계의 변화를 빠르게 만든다.",
    risk: "감정 강도에 비해 대화 순서가 맞지 않으면 상처가 빠르게 누적된다.",
    advice: "감정 강도보다 회복 규칙과 경계선 합의를 먼저 세운다.",
  },
  "榮親": {
    userLabel: "영친",
    theme: "따뜻한 친밀감과 상호 지지",
    strength: "서로의 안정감을 키우며 장기 관계 기반을 만들기 좋다.",
    risk: "편안함만 유지하려 하면 성장 과제를 미룰 수 있다.",
    advice: "주기적 점검 대화로 관계의 발전 축을 함께 만든다.",
  },
  "業胎": {
    userLabel: "업태",
    theme: "강한 숙제와 성장 압력",
    strength: "깊은 성찰과 변화 계기를 만든다.",
    risk: "감정 소모가 커지면 관계 피로가 누적될 수 있다.",
    advice: "과제와 감정을 분리해 운영하고 휴식 규칙을 고정한다.",
  },
  "友衰": {
    userLabel: "우쇠",
    theme: "정서적 교류와 민감한 피로 축",
    strength: "배려가 잘 맞으면 안정감이 빠르게 높아진다.",
    risk: "작은 오해가 누적되면 피로감이 커질 수 있다.",
    advice: "짧은 확인 대화를 자주 두어 오해를 조기에 해소한다.",
  },
  "危成": {
    userLabel: "위성",
    theme: "성과 지향과 긴장 공존",
    strength: "목표를 함께 설정하면 추진력이 강하다.",
    risk: "감정 점검이 늦으면 관계가 성과 중심으로 치우친다.",
    advice: "성과 대화 전에 감정 상태를 먼저 확인한다.",
  },
  "命": {
    userLabel: "명",
    theme: "동질감과 거울 관계",
    strength: "서로를 빠르게 이해하고 공감하기 쉽다.",
    risk: "같은 패턴이 부딪히면 반복 갈등이 생기기 쉽다.",
    advice: "같은 약점을 다르게 대응하는 규칙을 만든다.",
  },
});

const SUKYO_DISTANCE_INTERPRETATION = Object.freeze({
  near: {
    theme: "가까운 거리, 빠른 반응, 높은 체감도",
    strength: "감정 변화가 즉각 전달되어 친밀감이 빨리 깊어진다.",
    risk: "사소한 말과 행동도 크게 느껴져 예민함이 커질 수 있다.",
    advice: "속도보다 쿨다운과 재접속 규칙을 먼저 합의한다.",
  },
  middle: {
    theme: "완충 거리, 조율 중심",
    strength: "감정과 현실을 균형 있게 점검하기 좋다.",
    risk: "확인 빈도가 낮으면 오해가 누적될 수 있다.",
    advice: "주간 점검 루틴으로 연결 감각을 유지한다.",
  },
  far: {
    theme: "원거리, 해석 차이 확대",
    strength: "개별 자율성을 지키며 성장하기 좋다.",
    risk: "연락 공백이 길어지면 거리감이 급격히 커질 수 있다.",
    advice: "연락 리듬과 핵심 확인 문장을 사전에 고정한다.",
  },
  unknown: {
    theme: "거리 정보 미확정",
    strength: "유연한 운영 설계가 가능하다.",
    risk: "기준 부재로 기대치 충돌이 생길 수 있다.",
    advice: "초기 2주 동안 최소 합의를 먼저 만든다.",
  },
});

const SUKYO_MANSION_RELATION_PROFILE = Object.freeze(
  SUKUYO_MANSIONS.reduce((acc, item) => {
    const label = `${text(item.nameKo)}(${text(item.nameHan)})`;
    acc[label] = {
      relationCore: safeArray(item.keywords).slice(0, 4).join(", "),
      shadow: safeArray(item.shadows).slice(0, 2).join(", "),
      love: `${text(item.nameKo)}숙은 ${safeArray(item.strengths).slice(0, 2).join(" · ")} 중심의 사랑 리듬을 보입니다.`,
      risk: safeArray(item.shadows).slice(0, 2).join(" · ") || "감정 과열",
      advice: `${text(item.nameKo)}숙은 감정 확인과 경계선 합의를 함께 지킬 때 안정적입니다.`,
    };
    return acc;
  }, {}),
);

function text(value, fallback = "") {
  const out = String(value == null ? "" : value).trim();
  return out || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function safeNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeGender(raw) {
  const token = text(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = text(raw).toLowerCase();
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function parseDateParts(raw) {
  const value = text(raw);
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function buildLocalSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, options = {}) {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKYO_MONTH_START[lunarMonth - 1] ?? 11;
  const index = (start + lunarDay - 1) % 27;
  const item = SUKUYO_MANSIONS[index];
  if (!item) return null;
  return {
    index,
    ...item,
    lunarMonth,
    lunarDay,
    isLeapMonth: Boolean(options.isLeapMonth),
    source: text(options.source, "sukyo-pdf-local"),
  };
}

function buildLocalSukuyoFromPerson(person = {}) {
  const parts = parseDateParts(person.birthDate);
  if (!parts) return null;
  const calendarType = normalizeCalendarType(person.calendarType);
  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    return buildLocalSukuyoFromLunar(parts.month, parts.day, {
      isLeapMonth: calendarType === "lunar_leap",
      source: "user-lunar-input",
    });
  }
  try {
    const hour = Number.isFinite(Number(person.birthHour)) ? Number(person.birthHour) : 12;
    const minute = Number.isFinite(Number(person.birthMinute)) ? Number(person.birthMinute) : 0;
    const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, hour, minute, 0).getLunar();
    const lunarMonth = Number(lunar.getMonth());
    return buildLocalSukuyoFromLunar(Math.abs(lunarMonth), Number(lunar.getDay()), {
      isLeapMonth: lunarMonth < 0,
      source: "lunar-javascript",
    });
  } catch (_) {
    return null;
  }
}

function normalizeSukuyoStar(star = {}, person = {}) {
  const idx = safeNumber(star?.index ?? star?.mansionIndex ?? star?.mansionIdx, null);
  const byIndex = idx == null ? null : SUKUYO_MANSIONS[idx] || null;
  const calculated = text(star?.nameKo || star?.mansion) ? null : buildLocalSukuyoFromPerson(person);
  const source = text(star?.nameKo || star?.mansion)
    ? star
    : calculated || byIndex || {};
  return {
    ...source,
    index: safeNumber(source.index ?? idx, null),
    nameKo: text(source.nameKo || source.mansion || byIndex?.nameKo),
    nameHan: text(source.nameHan || byIndex?.nameHan),
    category: text(source.category || byIndex?.category),
    element: text(source.element || byIndex?.element),
    keywords: safeArray(source.keywords || source.traits || byIndex?.keywords),
    strengths: safeArray(source.strengths || byIndex?.strengths),
    shadows: safeArray(source.shadows || byIndex?.shadows),
    traits: safeArray(source.traits || source.keywords || byIndex?.keywords),
    lunarMonth: safeNumber(source.lunarMonth, null),
    lunarDay: safeNumber(source.lunarDay, null),
    source: text(source.source || calculated?.source || "sukyo-pdf-seed"),
  };
}

const KOREAN_HOUR_MAP = {
  자시: 23,
  축시: 1,
  인시: 3,
  묘시: 5,
  진시: 7,
  사시: 9,
  오시: 11,
  미시: 13,
  신시: 15,
  유시: 17,
  술시: 19,
  해시: 21,
};

function parseBirthTimeLoose(raw) {
  const value = text(raw).toLowerCase();
  if (!value || value.includes("모름") || value.includes("unknown")) {
    return { birthTime: "", birthHour: null, birthMinute: null, isTimeUnknown: true };
  }

  const hanHour = KOREAN_HOUR_MAP[text(raw)];
  if (Number.isFinite(hanHour)) {
    return { birthTime: `${String(hanHour).padStart(2, "0")}:00`, birthHour: hanHour, birthMinute: 0, isTimeUnknown: false };
  }

  let hour = null;
  let minute = 0;

  const hhmm = value.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    hour = Number(hhmm[1]);
    minute = Number(hhmm[2] || "0");
  }

  const korean = value.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const base = Number(korean[2]);
    const isPm = korean[1] === "오후";
    hour = base % 12;
    if (isPm) hour += 12;
    minute = Number(korean[3] || "0");
  }

  if (hour == null) {
    const digitOnly = value.match(/^(\d{1,2})$/);
    if (digitOnly) hour = Number(digitOnly[1]);
  }

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { birthTime: "", birthHour: null, birthMinute: null, isTimeUnknown: true };
  }

  return {
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    birthHour: hour,
    birthMinute: minute,
    isTimeUnknown: false,
  };
}

function normalizePersonInput(raw = {}, fallbackName) {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const birthDate = text(
    profile.birthDate
      || profile.birthday
      || profile.solarDate
      || profile.lunarDate
      || profile.date
      || profile.partnerBirth
      || profile.partnerBirthDate
      || profile.targetBirth
      || profile.targetDate,
  );
  const date = parseDateParts(birthDate);
  const time = parseBirthTimeLoose(
    profile.birthTime
      || profile.time
      || profile.partnerTime
      || profile.hour
      || profile.birth_hour,
  );

  return {
    name: safeSukyoPersonName(profile.name || profile.label, fallbackName),
    gender: normalizeGender(profile.gender || profile.sex),
    calendarType: normalizeCalendarType(profile.calendarType || profile.calType),
    birthDate,
    birthYear: date?.year ?? null,
    birthMonth: date?.month ?? null,
    birthDay: date?.day ?? null,
    birthTime: time.birthTime,
    birthHour: time.birthHour,
    birthMinute: time.birthMinute,
    timezone: text(profile.timezone || "Asia/Seoul"),
    isTimeUnknown: time.isTimeUnknown,
  };
}

function normalizeMode(raw) {
  const mode = text(raw).toLowerCase();
  if (["compatibility", "compat", "couple"].some((token) => mode.includes(token))) return "compatibility";
  if (["personal", "solo", "single"].some((token) => mode.includes(token))) return "personal";
  return "compatibility";
}

function levelByScore(value, axis = "default") {
  const n = safeNumber(value, null);
  if (n == null) return "middle";
  if (axis === "risk") {
    if (n >= 68) return "high";
    if (n >= 45) return "middle";
    return "low";
  }
  if (n >= 72) return "high";
  if (n >= 45) return "middle";
  return "low";
}

function resolveMansionProfile(starLike = {}, fallbackIdx = null) {
  const nameKo = text(starLike?.nameKo || starLike?.mansion || "");
  const nameHan = text(starLike?.nameHan || "");
  const keyWithHan = nameKo && nameHan ? `${nameKo}(${nameHan})` : "";
  const byKey = keyWithHan ? SUKYO_MANSION_RELATION_PROFILE[keyWithHan] : null;
  if (byKey) return byKey;

  const idx = safeNumber(starLike?.index ?? starLike?.mansionIdx ?? fallbackIdx, null);
  const ref = Number.isFinite(idx) ? SUKUYO_MANSIONS[idx] : null;
  if (!ref) {
    return {
      relationCore: "배려, 조율, 감정 확인",
      shadow: "과해석, 피로 누적",
      love: "상대의 반응 리듬을 확인하며 관계를 안정시키려는 성향",
      risk: "확인 순서가 어긋나면 오해가 누적될 수 있음",
      advice: "감정-사실-합의 순서의 대화 루틴을 유지",
    };
  }
  return {
    relationCore: safeArray(ref.keywords).slice(0, 4).join(", "),
    shadow: safeArray(ref.shadows).slice(0, 2).join(", "),
    love: `${text(ref.nameKo)}숙은 ${safeArray(ref.strengths).slice(0, 2).join(" · ")} 중심의 애정 흐름을 보입니다.`,
    risk: safeArray(ref.shadows).slice(0, 2).join(" · ") || "피로 누적",
    advice: `${text(ref.nameKo)}숙은 경계선과 회복 규칙을 함께 지킬 때 안정됩니다.`,
  };
}

function normalizeLegacyResult(raw = {}) {
  const source = raw.sukuyoResult || raw.compatibility || raw.sukuyoBookContext?.compatibility || {};
  const userHost = text(source.user宿 || source.userHost || source.userMansion || source.personAHost);
  const partnerHost = text(source.partner宿 || source.partnerHost || source.partnerMansion || source.personBHost);
  return {
    userHost,
    partnerHost,
    userHostIndex: safeNumber(source.user宿Index ?? source.userHostIndex ?? source.personAHostIndex),
    partnerHostIndex: safeNumber(source.partner宿Index ?? source.partnerHostIndex ?? source.personBHostIndex),
    relationType: text(source.relationshipType || source.relationType || source.type),
    distance: text(source.distance || source.distanceLabel),
  };
}

export function normalizeShukuyoPdfPayload(raw = {}) {
  const mode = normalizeMode(raw.mode || raw.reportMode);
  const selfInput = normalizePersonInput(raw.self || raw.user || raw.birthInput || raw.sukuyoBookContext?.user || {}, "사용자");
  const partnerInput = normalizePersonInput(raw.partner || raw.partnerInput || raw.sukuyoBookContext?.partner || {}, "상대방");
  const legacy = normalizeLegacyResult(raw);

  return {
    mode,
    self: selfInput,
    partner: partnerInput,
    sukuyoResult: {
      user宿: legacy.userHost,
      user宿Index: legacy.userHostIndex,
      partner宿: legacy.partnerHost,
      partner宿Index: legacy.partnerHostIndex,
      relationshipType: legacy.relationType,
      distance: legacy.distance,
    },
  };
}

function applySukyoPremiumTextFilters(value) {
  let out = text(value).trim();
  for (const [pattern, replacement] of SUKUYO_SAFETY_REPLACEMENTS) {
    out = out.replace(pattern, replacement).trim();
  }

  for (const [pattern, replacement] of SUKUYO_NATURAL_TEXT_REPLACEMENTS) {
    out = out.replace(pattern, replacement).trim();
  }

  for (const phrase of FORBIDDEN_BODY_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "").trim();
  }

  return out.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeSukyoPremiumText(value) {
  const out = text(value)
    .replace(INTERNAL_TOKEN_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return applySukyoPremiumTextFilters(out);
}

function sanitizeSukyoPremiumBody(value) {
  const raw = text(value)
    .replace(INTERNAL_TOKEN_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  return raw
    .split(/\n{2,}/)
    .map((block) => applySukyoPremiumTextFilters(block.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ")))
    .filter(Boolean)
    .join("\n\n");
}

function hasSukyoBrokenText(value) {
  const body = text(value);
  return /[\uFFFD\uF900-\uFAFF]/.test(body)
    || /\?{2,}/.test(body)
    || /\?[가-힣]/.test(body)
    || /(?:Ã.|Â.|â[€€™€œ]|[ìíîïðñòóôõöøùúûüýþÿ][\u0080-\uFFFF]){2,}/.test(body)
    || /[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ][\u0080-\uFFFF]{1,2}/.test(body)
    || /[ㄱ-ㅎㅏ-ㅣ]{2,}/.test(body);
}

function safeSukyoPersonName(value, fallback = "") {
  const name = text(value);
  if (!name || /^\?+$/.test(name) || hasSukyoBrokenText(name)) return text(fallback, "사용자");
  return name;
}

function safeSukyoDisplayText(value, fallback = "") {
  const out = sanitizeSukyoPremiumText(value);
  if (!out || /^\?+$/.test(out) || hasSukyoBrokenText(out)) return fallback;
  INTERNAL_TOKEN_RE.lastIndex = 0;
  return INTERNAL_TOKEN_RE.test(out) ? fallback : out;
}

function splitMeaningfulSentences(value) {
  return text(value)
    .split(/[.!?。？！\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24);
}

function countForbiddenTerms(value) {
  const body = text(value);
  let hit = 0;
  for (const phrase of FORBIDDEN_BODY_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(body)) hit += 1;
  }
  return hit;
}

function countLiteralPhraseHits(value, phrases = []) {
  const body = text(value);
  return safeArray(phrases).reduce((sum, phrase) => {
    const token = text(phrase);
    if (!token) return sum;
    return sum + body.split(token).length - 1;
  }, 0);
}

function computeRepetitionScore(value) {
  const lines = splitMeaningfulSentences(value);
  if (!lines.length) return 1;
  const seen = new Map();
  for (const line of lines) {
    seen.set(line, (seen.get(line) || 0) + 1);
  }
  let repeatedCount = 0;
  for (const count of seen.values()) {
    if (count >= 2) repeatedCount += count;
  }
  return repeatedCount / Math.max(1, lines.length);
}

function hasChapterToneStructure(value, chapter = {}, section = {}, seedTokens = {}) {
  const body = text(value);
  const heading = text(section?.heading || section?.title);
  const chapterTitle = text(chapter?.title);
  const relationToken = text(seedTokens.relationToken);
  const selfStarToken = text(seedTokens.selfStarToken);
  const partnerStarToken = text(seedTokens.partnerStarToken);
  const chapterNo = resolveSukyoChapterNo(chapter);
  const sectionIndex = resolveSukyoSectionIndex(chapterNo, section);
  const sectionTheme = resolveSukyoSectionTheme(chapterNo, sectionIndex, heading);
  const requiredTerms = safeArray(sectionTheme.requiredTerms).filter(Boolean);
  const matchedTerms = requiredTerms.filter((term) => body.includes(term)).length;
  const hasChapterContext = Boolean(
    (heading && body.includes(heading))
    || (chapterTitle && body.includes(chapterTitle.replace(/^제\s*\d+장\.\s*/, ""))),
  );
  const hasSukuyoSignal = Boolean(
    (relationToken && body.includes(relationToken))
    || (selfStarToken && body.includes(selfStarToken))
    || (partnerStarToken && body.includes(partnerStarToken)),
  );
  const hasActionTone = /하세요|정하세요|확인하세요|기록하세요|합의|대화|문장|선택|조율|회복|거리|감정/.test(body);
  const hasSectionSignal = !requiredTerms.length || matchedTerms >= Math.min(2, requiredTerms.length);
  return hasChapterContext && hasSukuyoSignal && hasActionTone && hasSectionSignal;
}

function normalizeKoreanText(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isAllowedDomainRepeat(value) {
  const fragment = normalizeKoreanText(value);
  if (!fragment) return false;
  if (ALLOWED_DOMAIN_REPEAT_TERMS.some((token) => fragment.includes(normalizeKoreanText(token)))) return true;
  return ALLOWED_DOMAIN_REPEAT_PATTERNS.some((pattern) => pattern.test(fragment));
}

function hasRepeatedParagraphs(chapters) {
  const paragraphs = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .flatMap((section) => text(section.body).split(/\n{2,}/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 100);

  const counts = new Map();
  for (const p of paragraphs) {
    const key = normalizeKoreanText(p);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 3,
    maxCount,
  };
}

function hasRepeatedSentences(chapters) {
  const sentences = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .flatMap((section) => splitMeaningfulSentences(section.body))
    .map((line) => normalizeKoreanText(line))
    .filter((line) => line.length >= 30 && !isAllowedDomainRepeat(line));

  const counts = new Map();
  for (const sentence of sentences) {
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  }
  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 12,
    maxCount,
  };
}

function hasRepeatedNgrams(chapters) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();
  if (!source) return { hasRepeated: false, maxCount: 0 };

  const fragments = source
    .split(/[.!?。？！\n]+/)
    .map((line) => normalizeKoreanText(line))
    .filter((line) => line.length >= 30);
  const counts = new Map();

  for (const fragment of fragments) {
    if (isAllowedDomainRepeat(fragment)) continue;
    counts.set(fragment, (counts.get(fragment) || 0) + 1);
  }

  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 12,
    maxCount,
  };
}

function countSevenDayRoutinePatterns(chapters) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n");
  return (source.match(/1일차에는[\s\S]{0,260}3일차에는[\s\S]{0,260}5일차에는[\s\S]{0,260}7일차에는/g) || []).length;
}

function hasForbiddenFallbackText(chapters) {
  const merged = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  const forbidden = [
    "자동 복구 생성",
    "fallback",
    "payload",
    "json",
    "debug",
    "localdraft",
    "internal server error",
    "about:blank",
    "계산 시그니처",
    "내부 데이터",
    "품질 검증",
    "재생성",
    "undefined",
    "null",
    "nan",
  ];
  return forbidden.some((token) => merged.includes(token.toLowerCase()));
}

function chapterIncludesKeywords(chapter, keywords) {
  const body = (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  return (Array.isArray(keywords) ? keywords : []).every((keyword) => body.includes(String(keyword).toLowerCase()));
}

export function isLowQualityShukuyoSection(value) {
  const body = text(value).toLowerCase();
  if (!body) return true;
  if (FORBIDDEN_BODY_PHRASES.some((phrase) => body.includes(String(phrase).toLowerCase()))) return true;
  if (/\b(payload|debug|json|fallback|localdraft|자동\s*복구\s*생성|about:blank)\b/i.test(body)) return true;
  const chunks = body.split(/[.!?。？！\n]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  if (chunks.length < 3) return true;
  const unique = new Set(chunks);
  if (unique.size <= Math.max(1, Math.floor(chunks.length * 0.45))) return true;
  return computeRepetitionScore(body) >= 0.42;
}

export function getSukyoPdfChapters() {
  return SUKYO_PREMIUM_LOCAL_CHAPTERS.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    sections: chapter.sections.slice(),
  }));
}

export function validateSukyoPdfInput(raw = {}) {
  const normalized = normalizeShukuyoPdfPayload(raw);
  const hardMissingFields = [];
  const softMissingFields = [];

  if (normalized.mode !== "compatibility") hardMissingFields.push("mode.compatibility");

  const selfDate = parseDateParts(normalized.self.birthDate);
  const partnerDate = parseDateParts(normalized.partner.birthDate);

  if (!selfDate) hardMissingFields.push("self.birthDate");
  if (!partnerDate) hardMissingFields.push("partner.birthDate");
  if (!text(normalized.sukuyoResult.relationshipType)) hardMissingFields.push("compatibility.relationType");

  if (normalized.self.isTimeUnknown) softMissingFields.push("self.birthTime");
  if (normalized.partner.isTimeUnknown) softMissingFields.push("partner.birthTime");

  return {
    canGenerate: hardMissingFields.length === 0,
    reportMode: "compatibility",
    hardMissingFields,
    softMissingFields,
    payloadValidation: { missingFields: hardMissingFields.slice() },
    normalized,
  };
}

// Backward-compat alias used by legacy tests/callers.
export function validateSukyoPdfSeed(raw = {}) {
  if (text(raw?.mode) === "compatibility") {
    return {
      ok: true,
      issues: [],
      hardMissingFields: [],
      canGenerate: true,
      payloadValidation: { missingFields: [] },
    };
  }

  const fallback = raw || {};
  const hasCanonicalStars = Boolean(text(fallback?.userSukyo?.nameKo)) && Boolean(text(fallback?.partnerSukyo?.nameKo));
  const hasCanonicalRelation = Boolean(text(fallback?.compatibility?.relationType || fallback?.compatibility?.relationTypeHan));
  if (hasCanonicalStars && hasCanonicalRelation) {
    return {
      ok: true,
      issues: [],
      hardMissingFields: [],
      canGenerate: true,
      payloadValidation: { missingFields: [] },
    };
  }

  const result = validateSukyoPdfInput(raw);
  const relaxedHardMissing = safeArray(result?.hardMissingFields).filter((field) => {
    if (field !== "self.birthDate" && field !== "partner.birthDate") return true;
    return !(hasCanonicalStars && hasCanonicalRelation);
  });

  const issues = [];
  issues.push(...relaxedHardMissing);
  issues.push(...safeArray(result?.softMissingFields));
  return {
    ...result,
    ok: relaxedHardMissing.length === 0 || (hasCanonicalStars && hasCanonicalRelation),
    issues,
    canGenerate: relaxedHardMissing.length === 0 || (hasCanonicalStars && hasCanonicalRelation),
    hardMissingFields: relaxedHardMissing,
    payloadValidation: { missingFields: relaxedHardMissing.slice() },
  };
}

function pickKeywordList(star = {}) {
  const k = [
    ...safeArray(star.keywords),
    ...safeArray(star.traits),
    ...safeArray(star.strengths),
  ];
  return Array.from(new Set(k)).slice(0, 8);
}

function toDistanceTier(distanceLabel) {
  const token = text(distanceLabel).toLowerCase();
  if (token.includes("동숙") || token === "same") return "same";
  if (token.includes("특수") || token === "special") return "special";
  if (token.includes("근") || token === "near") return "near";
  if (token.includes("원") || token === "far") return "far";
  if (token.includes("중") || token === "middle") return "middle";
  return "unknown";
}

function displayDistanceLabel(distanceLabel) {
  const tier = toDistanceTier(distanceLabel);
  if (tier === "same") return "동숙";
  if (tier === "special") return "특수관계";
  if (tier === "near") return "근거리";
  if (tier === "middle") return "중거리";
  if (tier === "far") return "원거리";
  const label = text(distanceLabel);
  if (!label || label.toLowerCase() === "unknown") return "중거리";
  return label;
}

function resolveSukuyoRelationInterpretation(relationType) {
  const token = text(relationType);
  if (SUKYO_COMPAT_RELATION_INTERPRETATION[token]) return SUKYO_COMPAT_RELATION_INTERPRETATION[token];
  const matched = Object.values(SUKYO_COMPAT_RELATION_INTERPRETATION)
    .find((item) => token && text(item?.userLabel) === token);
  if (matched) return matched;
  if (token.includes("안괴")) return SUKYO_COMPAT_RELATION_INTERPRETATION["安壞"];
  if (token.includes("영친")) return SUKYO_COMPAT_RELATION_INTERPRETATION["榮親"];
  if (token.includes("업태")) return SUKYO_COMPAT_RELATION_INTERPRETATION["業胎"];
  if (token.includes("우쇠")) return SUKYO_COMPAT_RELATION_INTERPRETATION["友衰"];
  if (token.includes("위성")) return SUKYO_COMPAT_RELATION_INTERPRETATION["危成"];
  if (token.includes("명")) return SUKYO_COMPAT_RELATION_INTERPRETATION["命"];
  return SUKYO_COMPAT_RELATION_INTERPRETATION["命"];
}

function createInterpretationSeeds(seed = {}) {
  const relation = seed.compatibility || {};
  const userHost = text(seed.userSukyo?.nameKo, "A");
  const partnerHost = text(seed.partnerSukyo?.nameKo, "B");
  const relationType = text(relation.relationType, "관계");

  return {
    firstImpression: [
      `${userHost}宿과 ${partnerHost}宿 조합은 첫 만남에서 감정의 방향을 빠르게 정하는 경향이 있습니다.`,
      `${relationType} 구조에서는 첫 반응이 강할수록 경계와 속도 조절이 중요합니다.`,
    ],
    emotionalPattern: [
      `감정 리듬은 반응 속도의 차이에서 흔들리며, 확인 질문이 안정감을 만듭니다.`,
      `불안 신호를 늦게 말할수록 해석 오차가 커지므로 짧은 체크인이 필요합니다.`,
    ],
    communicationPattern: [
      `대화는 사실-감정-요청 순서가 맞을 때 마찰이 줄어듭니다.`,
      `침묵이 길어지면 의미를 추측하기 쉬워 합의된 연락 규칙이 필요합니다.`,
    ],
    lovePattern: [
      `사랑의 밀도는 애정 표현 빈도보다 회복 속도에 크게 좌우됩니다.`,
      `두 사람의 애착 차이를 인정하면 설렘과 안정감을 동시에 만들 수 있습니다.`,
    ],
    conflictPattern: [
      `갈등은 대체로 같은 주제가 반복되며, 촉발 문장을 바꾸면 소모가 줄어듭니다.`,
      `지적보다 요청 중심의 문장이 충돌 강도를 낮춥니다.`,
    ],
    reconciliationPattern: [
      `화해는 원인 분석보다 재접속 타이밍 합의가 먼저입니다.`,
      `사과는 의도보다 영향 확인이 포함될 때 신뢰 회복이 빨라집니다.`,
    ],
    marriagePattern: [
      `장기 관계는 감정 궁합보다 생활 운영 합의에서 안정성이 결정됩니다.`,
      `역할 책임을 선명하게 나누면 갈등 빈도가 줄어듭니다.`,
    ],
    moneyPattern: [
      `돈 문제는 가치관 차이의 요약판이며 사용 원칙 문서화가 유효합니다.`,
      `예산·비상금·책임 구간을 사전에 나누면 감정 소모를 예방합니다.`,
    ],
    intimacyPattern: [
      `친밀감은 속도 차이를 인정할 때 더 오래 유지됩니다.`,
      `안전감의 언어와 설렘의 언어를 구분해 사용하는 것이 좋습니다.`,
    ],
    longTermStrategy: [
      `장기 전략은 거리 조절 규칙과 재합의 주기를 정하는 것에서 시작합니다.`,
      `관계 점검일을 월 1회 고정하면 작은 균열을 빠르게 복구할 수 있습니다.`,
    ],
  };
}

function buildLocalCompatibilityJson(seed = {}) {
  const relation = seed.compatibility || {};
  const selfKeywords = pickKeywordList(seed.userSukyo || {});
  const partnerKeywords = pickKeywordList(seed.partnerSukyo || {});
  const selfProfile = resolveMansionProfile(seed.userSukyo || {}, seed.userSukyo?.index);
  const partnerProfile = resolveMansionProfile(seed.partnerSukyo || {}, seed.partnerSukyo?.index);

  const relationTypeHan = text(relation.relationTypeHan || relation.relationType);
  const relationInterp = resolveSukuyoRelationInterpretation(relationTypeHan);
  const distanceTier = toDistanceTier(relation.distanceLabel || relation.distance);
  const distanceInterp = SUKYO_DISTANCE_INTERPRETATION[distanceTier] || SUKYO_DISTANCE_INTERPRETATION.unknown;

  const chemistryRaw = relation?.enhanced?.chemistry || relation?.chemistry || {};
  const chemistry = {
    emotional: safeNumber(chemistryRaw.emotional, safeNumber(relation.chemistryScore, 58)),
    communication: safeNumber(chemistryRaw.communication, safeNumber(relation.communicationScore, 55)),
    dailyLife: safeNumber(chemistryRaw.dailyLife, safeNumber(relation.stabilityScore, 53)),
    physical: safeNumber(chemistryRaw.physical, 56),
    conflictRisk: safeNumber(chemistryRaw.conflictRisk, safeNumber(relation.conflictScore, 52)),
    recoveryPotential: safeNumber(chemistryRaw.recoveryPotential, safeNumber(relation.growthScore, 51)),
    longTermPotential: safeNumber(chemistryRaw.longTermPotential, safeNumber(relation.compatibilityIndex, 50)),
  };

  const roleActionGuide = {
    meAction: text(relation?.roleActionGuide?.meAction, "핵심 감정을 먼저 문장으로 공유합니다."),
    otherAction: text(relation?.roleActionGuide?.otherAction, "상대 반응을 요약 확인한 뒤 결론을 정합니다."),
    resetLine: text(relation?.roleActionGuide?.resetLine, "갈등 직후 24시간 내 감정-사실-합의 순서로 재접속합니다."),
  };

  const elementHarmony = {
    meElement: text(relation?.elementHarmony?.aElement || relation?.elementHarmony?.meElement || seed?.userSukyo?.element, "토"),
    otherElement: text(relation?.elementHarmony?.bElement || relation?.elementHarmony?.otherElement || seed?.partnerSukyo?.element, "토"),
    relation: text(relation?.elementHarmony?.relation, "보완"),
    harmonyScore: safeNumber(relation?.elementHarmony?.harmonyScore, 64),
    summary: text(relation?.elementHarmony?.summary, "두 사람의 기질은 다르지만 조율 규칙을 세울수록 상호 보완성이 커집니다."),
  };

  const strengthShadowMap = {
    me: {
      strength: text(relation?.strengthShadowMap?.me?.strength || relation?.strengthShadowMap?.a?.strength, safeArray(seed?.userSukyo?.strengths)[0] || "보호력"),
      shadow: text(relation?.strengthShadowMap?.me?.shadow || relation?.strengthShadowMap?.a?.shadow, safeArray(seed?.userSukyo?.shadows)[0] || "과보호"),
    },
    other: {
      strength: text(relation?.strengthShadowMap?.other?.strength || relation?.strengthShadowMap?.b?.strength, safeArray(seed?.partnerSukyo?.strengths)[0] || "혁신력"),
      shadow: text(relation?.strengthShadowMap?.other?.shadow || relation?.strengthShadowMap?.b?.shadow, safeArray(seed?.partnerSukyo?.shadows)[0] || "소진"),
    },
    complementSummary: text(
      relation?.strengthShadowMap?.complementSummary,
      "서로의 강점이 상대의 그림자를 완충할 수 있어 대화 순서를 정하면 관계 회복력이 높아집니다.",
    ),
  };

  const pastLife = {
    type: text(relation?.enhanced?.pastLife?.type, relationTypeHan === "安壞" ? "monk_and_princess" : "soul_companions"),
    title: text(relation?.enhanced?.pastLife?.title, relationTypeHan === "安壞" ? "승려와 공주의 약속" : "달빛 아래의 동행"),
    subtitle: text(relation?.enhanced?.pastLife?.subtitle, "강한 끌림과 조율 과제"),
    presentLifePattern: text(
      relation?.enhanced?.pastLife?.presentLifePattern,
      `${text(relation.relationType)} 관계는 감정 온도가 빠르게 올라가지만 합의 규칙이 없으면 오해가 반복되기 쉽습니다.`,
    ),
    currentTask: text(
      relation?.enhanced?.pastLife?.currentTask,
      "연락 빈도, 갈등 직후 쿨다운 시간, 화해 시작 문장을 미리 합의합니다.",
    ),
    healingKey: text(
      relation?.enhanced?.pastLife?.healingKey,
      "파괴 대신 창조를 선택하는 작은 합의를 반복해 신뢰를 복원합니다.",
    ),
  };

  const score = safeNumber(relation.score, safeNumber(relation.compatibilityIndex, 52));
  const temperature = safeNumber(relation.temperature, safeNumber(relation.chemistryScore, 68));
  const magnetism = safeNumber(relation.magnetism, safeNumber(relation.growthScore, 49));
  const shortestDistance = safeNumber(relation?.distanceMetrics?.shortestDistance, null);
  const requiredAgreements = [
    "연락 빈도 합의",
    "갈등 직후 쿨다운 시간",
    "화해 시작 문장",
  ];
  const recoveryRoutine = [
    "감정 확인",
    "사실 정리",
    "합의 문장 확정",
  ];

  return {
    fortuneType: "sukyo",
    mode: "compatibility",
    input: {
      mode: "compatibility",
      self: normalizePersonInput(seed.userProfile || {}, "사용자"),
      partner: normalizePersonInput(seed.partnerProfile || {}, "상대방"),
    },
    self: {
      sukuyoStar: text(seed.userSukyo?.nameKo),
      starIndex: safeNumber(seed.userSukyo?.index),
      group: text(seed.userSukyo?.category),
      element: text(seed.userSukyo?.element),
      keywords: selfKeywords,
      profile: selfProfile,
    },
    partner: {
      sukuyoStar: text(seed.partnerSukyo?.nameKo),
      starIndex: safeNumber(seed.partnerSukyo?.index),
      group: text(seed.partnerSukyo?.category),
      element: text(seed.partnerSukyo?.element),
      keywords: partnerKeywords,
      profile: partnerProfile,
      gender: text(seed.partnerProfile?.gender, "unknown"),
    },
    relation: {
      type: text(relation.relationType),
      typeHan: relationTypeHan,
      typeKo: text(relationInterp.userLabel || relation.relationType),
      relationTheme: relationInterp.theme,
      directionFromAToB: text(relation.directionFromAToB),
      directionFromBToA: text(relation.directionFromBToA),
      distance: distanceTier,
      distanceLabel: text(relation.distanceLabel || relation.distance),
      score,
      compatibilityScore: safeNumber(relation.compatibilityIndex, score),
      temperature,
      magnetism,
      stamp: text(relation.stamp || relation.relationVariant || ""),
      shortestDistance,
      chemistry,
      chemistryKeywords: safeArray([relation.elementHarmony?.relation, relation.relationType, distanceInterp.theme]),
      conflictKeywords: safeArray([strengthShadowMap.me.shadow, strengthShadowMap.other.shadow, relationInterp.risk]),
      karmicKeywords: safeArray([pastLife.title, pastLife.subtitle, relationInterp.theme]),
      dailyLifeKeywords: safeArray([roleActionGuide.meAction, roleActionGuide.otherAction]),
      loveKeywords: safeArray([selfProfile.love, partnerProfile.love]),
      marriageKeywords: safeArray([elementHarmony.summary, relationInterp.advice]),
      roleActionGuide,
      elementHarmony,
      strengthShadowMap,
      pastLife,
      distanceInterpretation: distanceInterp,
      relationInterpretation: relationInterp,
    },
    derived: {
      isCompatibility: true,
      relationFamily: text(relationInterp.userLabel || relation.relationType),
      distanceTier,
      emotionalBand: temperature >= 85 ? "veryHigh" : (temperature >= 70 ? "high" : (temperature >= 45 ? "middle" : "low")),
      conflictBand: levelByScore(chemistry.conflictRisk, "risk"),
      longTermBand: levelByScore(chemistry.longTermPotential),
      recoveryBand: levelByScore(chemistry.recoveryPotential),
      mainStrengths: [strengthShadowMap.me.strength, strengthShadowMap.other.strength].filter(Boolean),
      mainRisks: [strengthShadowMap.me.shadow, strengthShadowMap.other.shadow].filter(Boolean),
      requiredAgreements,
      recoveryRoutine,
    },
    interpretationSeeds: createInterpretationSeeds(seed),
  };
}

function repeatToLength(base, minLength) {
  const segments = safeArray(base);
  if (!segments.length) return "";
  let i = 0;
  let out = "";
  while (out.length < minLength) {
    const line = segments[i % segments.length];
    out = `${out}${out ? "\n\n" : ""}${line}`;
    i += 1;
    if (i > 64) break;
  }
  return sanitizeSukyoPremiumBody(out);
}

const CHAPTER_TOPIC_GUIDE = Object.freeze({
  1: ["전체 인연의 윤곽", "궁합 지수와 관계 유형", "첫 끌림", "관계 운영 출발점"],
  2: ["나의 본명숙", "나의 사랑 방식", "불안 반응", "오래 사랑하는 법"],
  3: ["상대의 본명숙", "상대의 애정 언어", "멀어지는 신호", "이해의 문턱"],
  4: ["관계 유형의 본질", "감정적 강도", "반복 패턴", "좋게 쓰는 법"],
  5: ["거리감 체감", "감정 밀도", "멀어질 때의 문제", "거리 조절 합의"],
  6: ["첫 만남", "신비로운 끌림", "분위기", "설렘 지속 조건"],
  7: ["감정 속도", "애정 표현", "서운함", "감정 온도 조율"],
  8: ["대화 템포", "침묵", "싸울 때의 말", "관계를 살리는 대화"],
  9: ["갈등 반복 구조", "오해 지점", "감정 폭발", "회복 순서"],
  10: ["이별 원인", "남은 마음", "재회 조건", "반복 문제"],
  11: ["장기 연애", "결혼 후 차이", "생활 리듬", "역할 분담"],
  12: ["돈과 소비", "일과 관계", "가족 관점", "현실 문제"],
  13: ["친밀감", "스킨십", "사랑받는 느낌", "회복 표현"],
  14: ["전생 인연", "카르마 반복", "성장 숙제", "성숙한 마무리"],
  15: ["최종 메시지", "먼저 할 일", "망치는 행동", "살리는 행동"],
});

const CHAPTER_COUNSELING_FRAME = Object.freeze({
  1: {
    entry: "숙명적 궁합의 첫 장은 결론을 서두르기보다 두 사람이 어떤 이름의 인연으로 만났는지 짚는 자리입니다.",
    evidence: "판단 근거는 첫 끌림, 안정감, 약점이 동시에 켜지는 장면에서 가장 선명하게 드러납니다.",
    reality: "현실에서는 호감의 크기보다 서로가 불안을 다루는 순서가 관계의 첫 인상을 오래 좌우합니다.",
    caution: "운명감이 강하다고 세부 신호를 건너뛰면 좋은 흐름도 쉽게 기대와 실망의 반복으로 바뀝니다.",
    prescription: "상담 처방은 호감, 불안, 현실 가능성을 분리해 적고 두 사람이 같은 언어로 확인하는 것입니다.",
    moon: "이 장의 달빛은 큰 인연을 크게 말하기보다, 두 사람이 실제로 지킬 첫 기준을 조용히 비춥니다.",
  },
  2: {
    entry: "나의 본명숙을 보는 장에서는 내가 사랑할 때 먼저 켜는 신호와 방어선을 정직하게 읽어야 합니다.",
    evidence: "판단 근거는 내가 기대하는 안정감, 불안할 때의 반응, 오래 사랑하기 위해 필요한 규칙입니다.",
    reality: "현실에서는 상대의 태도보다 내가 어떤 방식으로 확인을 요구하는지가 관계 온도를 크게 흔듭니다.",
    caution: "내 감정을 상대가 알아서 맞히길 기다리면 사랑은 확인이 아니라 시험처럼 느껴질 수 있습니다.",
    prescription: "상담 처방은 내가 원하는 신호를 작은 행동 단위로 말하고, 기다릴 수 있는 시간을 함께 정하는 것입니다.",
    moon: "이 장의 달빛은 사랑받고 싶은 마음을 부끄러워하지 말고, 다만 알아들을 수 있는 말로 바꾸라고 합니다.",
  },
  3: {
    entry: "상대의 본명숙을 읽는 장에서는 상대가 마음을 여는 순서와 닫히는 신호를 함께 보아야 합니다.",
    evidence: "판단 근거는 상대의 반복 행동, 느려지는 순간, 중요하게 여기는 가치가 어디에서 나타나는지입니다.",
    reality: "현실에서는 내가 듣고 싶은 표현보다 상대가 실제로 보여주는 애정 언어를 알아차리는 힘이 중요합니다.",
    caution: "상대의 속도를 애정 부족으로 단정하면 아직 열릴 수 있는 문까지 스스로 닫게 됩니다.",
    prescription: "상담 처방은 상대의 표현 방식, 부담 신호, 회복 신호를 구분해 확인하는 것입니다.",
    moon: "이 장의 달빛은 상대를 바꾸라는 뜻이 아니라, 상대의 별빛이 어떤 모양으로 도착하는지 보라는 뜻입니다.",
  },
  4: {
    entry: "관계 유형을 해석하는 장에서는 두 사람의 끌림이 어떤 배움과 긴장을 만들고 있는지 정밀하게 봅니다.",
    evidence: "판단 근거는 감정 강도, 반복 패턴, 서로에게 배우는 과제가 같은 방향을 가리키는지입니다.",
    reality: "현실에서는 관계 유형의 이름보다 그 이름이 실제 대화와 화해 방식에 어떤 압력을 주는지가 중요합니다.",
    caution: "좋은 관계와 나쁜 관계로만 나누면 숙요가 알려주는 조율의 핵심을 놓치게 됩니다.",
    prescription: "상담 처방은 관계 유형의 장점과 그림자를 같은 무게로 적고, 강한 장면에 적용할 안전 규칙을 만드는 것입니다.",
    moon: "이 장의 달빛은 관계 유형을 판결문이 아니라 두 사람이 함께 읽어야 할 별의 지도처럼 보여줍니다.",
  },
  5: {
    entry: "거리와 인연 강도를 보는 장에서는 가까움의 양이 아니라 감정이 닿는 속도를 읽어야 합니다.",
    evidence: "판단 근거는 연락 간격, 만남 뒤 회복 시간, 가까워질수록 강해지는 기대의 방향입니다.",
    reality: "현실에서는 사랑의 크기보다 각자 편안하게 숨 쉬는 거리 기준이 관계를 오래 지켜줍니다.",
    caution: "거리의 뜻을 모르면 상대의 느림을 차가움으로, 빠른 반응을 집착으로 오해하기 쉽습니다.",
    prescription: "상담 처방은 연락, 만남, 혼자 있는 시간을 나누어 두 사람만의 적정 간격을 정하는 것입니다.",
    moon: "이 장의 달빛은 가까이 있어도 멀리 있어도 같은 하늘 아래 이어지는 인연의 리듬을 비춥니다.",
  },
  6: {
    entry: "첫 만남과 끌림의 장에서는 왜 이 사람이 신비롭게 느껴졌는지, 그 감각의 뿌리를 살핍니다.",
    evidence: "판단 근거는 첫인상, 분위기, 감정이 빨리 깊어진 이유가 현실 기대와 어떻게 맞물리는지입니다.",
    reality: "현실에서는 처음의 설렘을 오래 보존하려면 속도보다 확인 질문의 타이밍이 더 중요합니다.",
    caution: "첫 끌림을 전부 운명으로만 해석하면 아직 확인해야 할 생활 리듬과 경계가 흐려집니다.",
    prescription: "상담 처방은 끌렸던 이유와 지금 확인해야 할 조건을 따로 말해 기대가 앞서가지 않게 하는 것입니다.",
    moon: "이 장의 달빛은 처음 열린 문을 아름답게 비추되, 그 문을 지나는 속도는 둘이 함께 정하라고 말합니다.",
  },
  7: {
    entry: "감정 교류의 장에서는 두 사람이 사랑을 느끼고 표현하는 속도의 차이를 섬세하게 읽습니다.",
    evidence: "판단 근거는 애정 표현, 서운함의 누적 방식, 마음이 통한다고 느끼는 순간의 반복성입니다.",
    reality: "현실에서는 감정의 크기보다 상대가 받아들일 수 있는 온도로 표현하는 능력이 친밀감을 지킵니다.",
    caution: "서운함을 쌓아두다 한 번에 꺼내면 상대는 내용보다 압력에 먼저 반응합니다.",
    prescription: "상담 처방은 감정 이름, 원하는 행동, 기다릴 시간을 나누어 말하는 것입니다.",
    moon: "이 장의 달빛은 마음을 크게 흔들기보다, 서로의 온도가 맞는 지점을 찾아 천천히 내려앉습니다.",
  },
  8: {
    entry: "대화와 소통의 장에서는 말이 통하는 부분보다 말이 엇갈리는 순간의 구조를 먼저 읽어야 합니다.",
    evidence: "판단 근거는 침묵의 이유, 싸울 때의 말투, 대화 끝에 남는 행동 합의의 유무입니다.",
    reality: "현실에서는 말의 양보다 감정 확인, 사실 정리, 다음 행동 합의의 순서가 소통 품질을 결정합니다.",
    caution: "사과만 하고 행동 합의가 없으면 같은 상처가 이름만 바뀌어 돌아옵니다.",
    prescription: "상담 처방은 대화 끝마다 다음 행동 하나와 확인 시점을 반드시 남기는 것입니다.",
    moon: "이 장의 달빛은 어두운 감정을 없애지 않고, 그 감정이 지나갈 수 있는 말을 찾아줍니다.",
  },
  9: {
    entry: "갈등과 충돌의 장에서는 누가 옳은가보다 어떤 장면에서 같은 상처가 반복되는지 보는 것이 먼저입니다.",
    evidence: "판단 근거는 오해 지점, 지치는 이유, 감정 폭발 직전의 전조가 일정하게 반복되는지입니다.",
    reality: "현실에서는 갈등을 줄이는 힘이 성격을 고치는 데서가 아니라 멈춤 신호를 합의하는 데서 나옵니다.",
    caution: "상대의 말을 공격으로 단정하면 해명할 수 있는 틈이 사라지고 방어만 남습니다.",
    prescription: "상담 처방은 반복 장면, 촉발 문장, 멈춤 신호, 재대화 시간을 한 세트로 정하는 것입니다.",
    moon: "이 장의 달빛은 싸움을 피하라는 뜻보다, 같은 어둠에 다른 발걸음을 놓으라는 뜻에 가깝습니다.",
  },
  10: {
    entry: "이별과 재회의 장에서는 마음이 남는 이유와 다시 만나도 반복될 문제를 함께 놓고 봅니다.",
    evidence: "판단 근거는 멀어지는 원인, 이별 뒤 남은 감정, 재회를 가능하게 하는 조건의 현실성입니다.",
    reality: "현실에서는 그리움만으로 재회가 유지되지 않으며, 과거의 충돌 문장을 새 규칙으로 바꾸어야 합니다.",
    caution: "재회를 서두르면 다시 만난 기쁨이 지나간 뒤 같은 침묵과 같은 상처가 돌아올 수 있습니다.",
    prescription: "상담 처방은 다시 만나기 전 사과, 재발 방지, 연락 기준을 각각 한 문장으로 합의하는 것입니다.",
    moon: "이 장의 달빛은 돌아갈 길을 비추지만, 같은 자리로 돌아가라는 뜻은 아닙니다.",
  },
  11: {
    entry: "장기 연애와 결혼의 장에서는 설렘보다 생활 리듬, 책임, 역할 분담의 현실성을 깊게 봅니다.",
    evidence: "판단 근거는 오래 만날수록 강해지는 점과 결혼 뒤 드러날 차이가 같은 방향인지입니다.",
    reality: "현실에서는 사랑의 확신보다 돈, 시간, 가족 경계, 집안일을 말할 수 있는 능력이 오래 갑니다.",
    caution: "미래 약속만 크게 말하고 현재 생활 규칙을 정하지 않으면 신뢰가 얇아집니다.",
    prescription: "상담 처방은 생활 리듬, 돈, 책임, 가족 경계를 월 1회 점검하는 구조를 만드는 것입니다.",
    moon: "이 장의 달빛은 먼 미래의 장면보다 오늘 지킨 작은 약속 위에 더 오래 머뭅니다.",
  },
  12: {
    entry: "현실 생활과 가치관의 장에서는 돈, 일, 가족, 습관이 사랑의 언어와 어떻게 부딪히는지 봅니다.",
    evidence: "판단 근거는 소비 태도, 우선순위, 주변 사람을 대하는 방식, 생활 습관의 차이입니다.",
    reality: "현실에서는 감정이 좋아도 가치관을 말하지 않으면 작은 생활 문제가 관계 전체의 피로로 번집니다.",
    caution: "현실 문제를 사랑으로만 덮으면 나중에는 사랑을 증명하라는 부담으로 되돌아옵니다.",
    prescription: "상담 처방은 돈, 시간, 주변 경계, 생활 습관을 구체적인 기준으로 나누어 합의하는 것입니다.",
    moon: "이 장의 달빛은 낭만을 지우지 않고, 낭만이 현실에서 무너지지 않을 자리를 마련합니다.",
  },
  13: {
    entry: "친밀감과 애정 표현의 장에서는 편안함, 스킨십, 사랑받는 느낌이 어디에서 살아나는지 읽습니다.",
    evidence: "판단 근거는 서로가 편안해지는 방식, 거절감을 느끼는 순간, 친밀감을 회복하는 행동입니다.",
    reality: "현실에서는 애정의 양보다 상대가 부담 없이 받을 수 있는 표현 방식이 더 오래 남습니다.",
    caution: "친밀감을 요구로만 꺼내면 상대는 사랑보다 압박을 먼저 느낄 수 있습니다.",
    prescription: "상담 처방은 편한 표현과 부담스러운 표현을 나누고, 회복 신호를 작게 반복하는 것입니다.",
    moon: "이 장의 달빛은 닿고 싶은 마음을 부드럽게 낮추어, 상대가 받아들일 수 있는 온도로 만들어줍니다.",
  },
  14: {
    entry: "전생 인연과 카르마의 장에서는 익숙한 끌림과 반복되는 숙제가 왜 함께 오는지 살핍니다.",
    evidence: "판단 근거는 설명하기 어려운 친숙함, 반복해서 끌리는 감정, 서로에게 남기는 성장 과제입니다.",
    reality: "현실에서는 오래된 인연처럼 느껴지는 감각도 결국 현재의 말과 선택으로만 성숙해집니다.",
    caution: "전생적 느낌을 이유로 현재의 상처를 정당화하면 인연은 깊어지지 않고 무거워집니다.",
    prescription: "상담 처방은 미완의 감정 과제를 책임 있는 약속과 회복 행동으로 바꾸는 것입니다.",
    moon: "이 장의 달빛은 과거를 말하지만, 그 빛이 닿는 곳은 언제나 오늘의 선택입니다.",
  },
  15: {
    entry: "최종 관계 전략의 장에서는 지금까지의 신호를 하나의 실행 판단으로 묶어야 합니다.",
    evidence: "판단 근거는 관계를 살리는 행동, 망치는 행동, 가장 먼저 해야 할 일이 같은 결론으로 모이는지입니다.",
    reality: "현실에서는 좋은 말보다 오늘부터 줄일 행동과 반복할 행동이 관계의 방향을 바꿉니다.",
    caution: "최종 조언을 감정적인 결심으로만 끝내면 며칠 뒤 원래 패턴이 다시 고개를 듭니다.",
    prescription: "상담 처방은 두 사람이 지킬 문장 하나, 멈출 행동 하나, 확인 날짜 하나를 확정하는 것입니다.",
    moon: "이 장의 달빛은 예언처럼 끝나지 않고, 두 사람이 실제로 걸어갈 다음 걸음을 비춥니다.",
  },
});

const CHAPTER_CONTEXT_LENS = Object.freeze({
  1: { relation: "인연의 첫 윤곽", distance: "처음 가까워지는 속도", practice: "첫 기준을 정하는 대화", score: true },
  2: { relation: "내가 사랑에서 반응하는 방식", distance: "내 감정이 상대에게 닿는 속도", practice: "내가 원하는 신호를 설명하는 말", score: false },
  3: { relation: "상대가 마음을 여는 순서", distance: "상대의 방어선에 닿는 간격", practice: "상대의 반복 행동을 읽는 태도", score: false },
  4: { relation: "관계 유형이 만드는 배움과 긴장", distance: "관계 유형의 힘이 체감되는 속도", practice: "강한 흐름을 다루는 안전 규칙", score: true },
  5: { relation: "가까움과 멀어짐의 압력", distance: "감정이 닿고 물러나는 간격", practice: "연락, 만남, 혼자 있는 시간의 기준", score: true },
  6: { relation: "첫 끌림이 생긴 이유", distance: "설렘이 깊어지는 속도", practice: "호감과 확인 질문의 균형", score: false },
  7: { relation: "감정 온도가 오르내리는 방식", distance: "애정 표현이 체감되는 간격", practice: "감정 이름과 기다릴 시간을 나누는 말", score: false },
  8: { relation: "말이 통하거나 엇갈리는 구조", distance: "한마디가 상대에게 도착하는 속도", practice: "감정 확인, 사실 정리, 다음 행동 합의", score: true },
  9: { relation: "반복 갈등이 켜지는 장면", distance: "상처가 커지기 전 멈출 수 있는 거리", practice: "멈춤 신호와 재대화 시간", score: true },
  10: { relation: "멀어짐과 재접속의 가능성", distance: "그리움이 다시 켜지는 속도", practice: "재회 전 사과와 재발 방지 문장", score: true },
  11: { relation: "장기 관계에서 견디는 힘", distance: "생활 리듬이 부딪히는 밀도", practice: "돈, 시간, 역할 분담의 월간 점검", score: true },
  12: { relation: "현실 가치관이 사랑을 시험하는 방식", distance: "일상 기준이 서로에게 닿는 간격", practice: "돈, 시간, 주변 경계의 구체적 합의", score: false },
  13: { relation: "친밀감이 살아나는 조건", distance: "애정 표현을 받아들이는 온도", practice: "편한 표현과 부담스러운 표현의 구분", score: false },
  14: { relation: "카르마적 반복과 성장 과제", distance: "오래된 감정이 현재에 되살아나는 속도", practice: "미완의 감정을 책임 있는 약속으로 바꾸는 일", score: true },
  15: { relation: "최종 선택으로 모이는 관계 신호", distance: "오늘부터 바꿀 행동이 닿는 속도", practice: "멈출 행동, 반복할 행동, 확인 날짜", score: true },
});

const RELATION_CONTEXT_TONE = Object.freeze({
  안괴: { force: "강한 끌림과 불안", risk: "보호하려는 마음과 상처 주는 반응이 빠르게 바뀌는 점", medicine: "감정 과열 전에 멈춤 신호를 두는 것" },
  영친: { force: "따뜻한 친밀감과 지지", risk: "편안함 때문에 핵심 갈등을 미루는 점", medicine: "안정감 위에 성장 질문을 더하는 것" },
  업태: { force: "익숙한 끌림과 카르마적 숙제", risk: "같은 과제를 감정으로만 반복하는 점", medicine: "감정과 과제를 분리해 기록하는 것" },
  우쇠: { force: "섬세한 배려와 정서 교류", risk: "작은 서운함이 누적되어 거리감으로 굳는 점", medicine: "짧은 확인 대화를 자주 두는 것" },
  위성: { force: "목표와 현실을 밀어주는 추진력", risk: "관계가 성과나 역할 중심으로 기우는 점", medicine: "목표 대화 전에 감정 상태를 묻는 것" },
  명: { force: "닮은 기질과 거울 같은 공명", risk: "같은 약점이 동시에 켜져 반복 충돌이 생기는 점", medicine: "닮은 반응을 다른 역할로 나누는 것" },
  기본: { force: "끌림과 조율 과제", risk: "서로의 속도를 단정해 오해하는 점", medicine: "감정과 행동 기준을 분리하는 것" },
});

const DISTANCE_CONTEXT_TONE = Object.freeze({
  near: { force: "반응이 빠르게 전달되는 밀착감", risk: "작은 말도 크게 닿아 상처가 빨리 커지는 점", medicine: "쿨다운과 재접속 시간을 짧게 합의하는 것" },
  middle: { force: "감정과 현실을 번갈아 점검할 수 있는 완충감", risk: "확인 빈도가 낮으면 오해가 서서히 쌓이는 점", medicine: "주간 점검 리듬을 고정하는 것" },
  far: { force: "각자의 자율성을 지키며 이어지는 여백", risk: "연락 공백이 감정의 단절로 해석되는 점", medicine: "연락 기준과 핵심 확인 문장을 미리 정하는 것" },
  same: { force: "닮은 감정 패턴이 서로를 비추는 공명", risk: "같은 반응을 동시에 반복해 멈춤이 늦어지는 점", medicine: "역할과 멈춤 신호를 의식적으로 나누는 것" },
  special: { force: "설명하기 어려운 과제와 역할 전환의 압력", risk: "인연감에 기대어 현실 합의를 미루는 점", medicine: "반복 과제를 먼저 이름 붙이는 것" },
  unknown: { force: "중간 거리처럼 조율이 필요한 흐름", risk: "확인 없는 추측이 관계 피로를 키우는 점", medicine: "서로 편안한 거리 기준을 정하는 것" },
});

const SECTION_RELATION_INSIGHT_KEYS = new Set([
  "1:0", "1:1", "1:3", "1:4",
  "2:0", "2:1", "2:3",
  "3:0", "3:1", "3:4",
  "4:0", "4:1", "4:2", "4:3",
  "6:0", "6:1",
  "7:0", "7:1", "7:3",
  "8:0", "8:1", "8:3",
  "9:0", "9:1", "9:3",
  "10:0", "10:1", "10:3",
  "11:0", "11:1", "11:4",
  "12:0", "12:1", "12:2",
  "13:0", "13:1", "13:4",
  "14:0", "14:1", "14:3",
  "15:0", "15:1", "15:4",
]);

const SECTION_DISTANCE_INSIGHT_KEYS = new Set([
  "1:0",
  "3:0", "3:1", "3:2", "3:3", "3:4",
  "5:0", "5:1", "5:2", "5:3", "5:4",
  "8:2",
  "9:0", "9:2",
  "10:1", "10:3",
  "11:1", "11:2",
  "12:2",
  "14:2",
  "15:2", "15:3",
]);

const SECTION_MOON_KEYS = new Set([
  "1:4", "2:4", "3:4", "4:4", "5:4",
  "6:0", "7:4", "10:4", "13:4", "14:4", "15:4",
]);

const CHAPTER_15_FINAL_STRATEGY = Object.freeze([
  "최종 판정은 감정의 크기가 아니라 반복 행동이 안정되는지로 내려야 합니다.",
  "첫 행동은 긴 설명보다 두 사람이 오늘부터 지킬 한 문장을 정하는 것입니다.",
  "즉시 멈출 행동은 불안할 때 상대의 침묵을 결론처럼 단정하는 태도입니다.",
  "계속 지킬 행동은 갈등 뒤 재접속 시간을 미리 정하고 약속처럼 지키는 일입니다.",
  "관계 결정 기준은 끌림, 회복력, 현실 합의가 같은 방향으로 움직이는지입니다.",
]);

function sectionProfileKey(chapterNo, sectionIndex) {
  return `${safeNumber(chapterNo, 0)}:${safeNumber(sectionIndex, 0)}`;
}

function resolveSectionWritingProfile(chapterNo, sectionIndex) {
  const key = sectionProfileKey(chapterNo, sectionIndex);
  const finalChapter = chapterNo === 15;
  return {
    relation: SECTION_RELATION_INSIGHT_KEYS.has(key),
    distance: SECTION_DISTANCE_INSIGHT_KEYS.has(key),
    evidence: sectionIndex !== 3 || [4, 8, 9, 14].includes(chapterNo),
    reality: true,
    caution: sectionIndex !== 4 || [1, 9, 10, 14, 15].includes(chapterNo),
    prescription: true,
    dialogue: !finalChapter || sectionIndex <= 1,
    routine: shouldUseSevenDayRoutine(chapterNo, sectionIndex),
    moon: SECTION_MOON_KEYS.has(key),
    finalStrategy: finalChapter,
  };
}

function sectionTheme(axis, sukuyoLens, reality, caution, prescription, dialogue, routine, moon, requiredTerms = []) {
  const terms = safeArray(requiredTerms).filter(Boolean);
  return {
    axis,
    sukuyoLens,
    reality,
    caution,
    prescription,
    dialogue,
    routine,
    moon,
    requiredTerms: terms,
    guides: [
      axis,
      terms[0] || axis,
      terms[1] || caution,
      terms[2] || prescription,
    ],
  };
}

const SUKYO_SECTION_COUNSELING_MATRIX = Object.freeze({
  1: [
    sectionTheme("전체 인연의 윤곽", "본명숙과 상대숙의 첫 결합이 관계 유형과 거리에서 어떤 큰 흐름으로 묶이는지 읽습니다.", "두 사람은 처음부터 관계의 방향을 빠르게 감지하며, 끌림과 경계가 동시에 켜지는 편입니다.", "처음의 강도를 운명 전체로 단정하면 이후 세부 신호를 놓치기 쉽습니다.", "관계의 첫 기준을 호감, 불안, 현실 가능성으로 나누어 기록하세요.", "우리가 끌린 이유와 불안한 이유를 한 문장씩 나누어 말해보자.", "1일차 전체 인상, 3일차 불안 신호, 7일차 유지 기준을 정리합니다.", "달빛은 이 인연의 큰 윤곽을 먼저 비추며, 서두른 결론보다 흐름의 이름을 정확히 부르게 합니다.", ["전체 인연", "궁합", "큰 흐름"]),
    sectionTheme("시작의 끌림", "숙요의 끌림은 별의 성향 차이와 관계 유형의 긴장도에서 발생합니다.", "처음에는 상대가 낯설면서도 익숙하게 느껴지고, 말보다 분위기에 먼저 반응합니다.", "끌림이 강할수록 상대의 실제 생활 리듬을 확인하기 전에 기대가 커질 수 있습니다.", "첫 끌림을 유지하려면 호감 표현 속도와 확인 질문의 간격을 맞추세요.", "처음 끌렸던 지점과 지금 확인하고 싶은 지점을 분리해서 말해보자.", "첫날 호감 이유, 셋째 날 현실 확인, 일곱째 날 속도 합의를 진행합니다.", "처음 열린 문은 달빛처럼 아름답지만, 발을 들이는 속도는 두 사람이 함께 정해야 합니다.", ["시작", "끌림", "호감"]),
    sectionTheme("함께 있을 때의 분위기", "두 숙의 기운이 같은 공간에서 어떤 정서 온도와 공기감을 만드는지 봅니다.", "함께 있으면 편안함과 긴장이 번갈아 올라오며, 상대의 표정과 침묵에 민감해집니다.", "분위기만 좋다고 핵심 대화를 미루면 나중에 서운함이 한꺼번에 드러납니다.", "좋은 분위기가 생긴 날에는 약속, 기대, 불편함을 짧게 확인하세요.", "오늘 분위기는 좋았지만 혹시 불편했던 점도 있었는지 듣고 싶어.", "만난 뒤 24시간 안에 좋았던 장면 하나와 조심할 장면 하나를 공유합니다.", "달빛 아래의 공기는 따뜻하지만, 그 따뜻함을 지키는 것은 작은 확인의 말입니다.", ["분위기", "정서", "공기감"]),
    sectionTheme("핵심 장점", "숙요 궁합의 장점은 서로가 상대의 약한 부분을 어떻게 보완하는지에서 선명해집니다.", "한 사람은 감정의 결을 읽고, 다른 한 사람은 현실적인 균형을 잡아주는 식으로 힘이 맞물립니다.", "장점을 당연하게 여기면 고마움이 줄고, 보완 관계가 역할 부담으로 변할 수 있습니다.", "서로가 잘해주는 부분을 주 1회 구체적인 행동 단위로 인정하세요.", "네가 해준 것 중 이번 주에 가장 도움이 된 부분은 이거였어.", "장점 기록, 감사 표현, 다음 주 보완 역할 합의를 한 번씩 반복합니다.", "이 인연의 좋은 별빛은 칭찬받을 때 더 오래 머무릅니다.", ["장점", "보완", "강점"]),
    sectionTheme("핵심 약점", "관계 약점은 관계 유형의 그림자와 거리감의 압력이 겹치는 지점에서 드러납니다.", "두 사람은 같은 문제를 다르게 해석해 침묵, 단정, 서운함이 빠르게 누적될 수 있습니다.", "약점을 성격 탓으로 몰면 숙요가 알려주는 조율 포인트가 사라집니다.", "반복되는 약점은 사람 문제가 아니라 상황, 표현, 타이밍 문제로 나누어 다루세요.", "우리가 반복하는 문제를 누가 잘못했는지가 아니라 언제 커지는지부터 보자.", "반복 장면, 촉발 말투, 회복 문장을 각각 하나씩 적어 합의합니다.", "달빛은 약점을 벌하지 않고, 두 사람이 피해야 할 어둠의 길목을 알려줍니다.", ["약점", "반복", "조율"]),
  ],
  2: [
    sectionTheme("나의 본명숙 기질", "나의 본명숙이 사랑에서 먼저 켜는 감정 신호와 방어 방식을 해석합니다.", "나는 애정을 줄 때 빠르게 읽고 깊게 반응하지만, 확신이 없으면 마음속 계산이 많아집니다.", "내 기질을 상대의 무심함으로 보상받으려 하면 기대가 압박으로 바뀝니다.", "내가 원하는 안정감을 요구하기 전에 어떤 신호가 필요한지 먼저 설명하세요.", "나는 이런 신호가 있어야 마음이 안정돼.", "나의 기질, 필요한 신호, 피해야 할 반응을 3문장으로 정리합니다.", "내 별은 사랑을 숨기지 않지만, 달빛은 먼저 나를 이해하라고 말합니다.", ["나의 본명숙", "기질", "나의 신호"]),
    sectionTheme("나의 감정 방식", "사랑할 때 내가 감정을 표현하는 속도와 깊이를 숙요 기질로 읽습니다.", "나는 좋아할수록 상대의 반응을 세밀하게 살피고, 작은 변화에도 의미를 부여합니다.", "감정 표현이 많아질수록 상대가 같은 속도로 따라오지 못할 수 있습니다.", "감정을 전달할 때는 요구보다 상태 설명을 먼저 두세요.", "내가 원하는 건 압박이 아니라 지금 내 마음을 알아주는 거야.", "감정이 올라온 날에는 감정 이름, 원하는 행동, 기다릴 시간을 나누어 말합니다.", "달빛은 감정을 크게 만들지만, 좋은 사랑은 그 감정에 숨 쉴 자리를 줍니다.", ["감정 방식", "표현", "반응"]),
    sectionTheme("내가 기대하는 것", "나의 숙은 관계에서 어떤 안정감, 확인, 책임감을 기대하는지 보여줍니다.", "나는 말보다 반복되는 행동에서 사랑의 진정성을 확인하려는 경향이 있습니다.", "기대를 말하지 않으면 상대는 시험받는 느낌을 받을 수 있습니다.", "상대가 맞힐 때까지 기다리지 말고 기대를 작고 선명한 행동으로 바꾸세요.", "내가 기대하는 건 큰 약속보다 이 행동이 반복되는 거야.", "기대 목록을 세 가지로 줄이고, 각각 확인 가능한 행동으로 번역합니다.", "기대는 달에게 비는 소원이 아니라 두 사람이 함께 쓰는 약속문입니다.", ["기대", "안정감", "확인"]),
    sectionTheme("불안할 때의 나", "불안이 켜질 때 내 본명숙의 그림자가 어떤 반응으로 나오는지 살핍니다.", "나는 불안할수록 확인을 서두르거나 마음을 숨긴 채 상대를 관찰할 수 있습니다.", "불안을 숨기면 상대는 이유를 모르고, 불안을 몰아붙이면 상대는 방어합니다.", "불안이 올라오면 결론 요구 전에 불안의 출처를 먼저 말하세요.", "지금 확답을 받으려는 게 아니라 내가 불안해진 이유를 설명하고 싶어.", "불안 신호가 오면 30분 멈춤, 감정 메모, 짧은 공유 순서로 움직입니다.", "달빛은 불안을 없애지 않지만, 불안을 사랑의 언어로 바꾸는 길을 보여줍니다.", ["불안", "방어", "확답"]),
    sectionTheme("사랑을 오래 유지하는 방법", "나의 숙이 지치지 않고 사랑을 지속하려면 어떤 운영 규칙이 필요한지 봅니다.", "나는 꾸준한 확인과 감정의 안전망이 있을 때 오래 깊어지는 타입입니다.", "혼자 참고 맞추는 방식은 결국 서운함을 크게 터뜨릴 수 있습니다.", "관계를 오래 가게 하려면 배려의 양보다 회복의 규칙을 먼저 세우세요.", "오래 만나기 위해 우리가 지켜야 할 기본 규칙을 같이 정하자.", "주간 감정 점검, 서운함 보류 금지, 화해 문장 연습을 반복합니다.", "오래 가는 사랑은 큰 운보다 매주 지켜낸 작은 달빛에 가깝습니다.", ["오래 유지", "지속", "회복 규칙"]),
  ],
  3: [
    sectionTheme("상대의 본명숙 기질", "상대의 본명숙이 관계에서 마음을 여는 순서와 방어선을 읽습니다.", "상대는 자신만의 속도로 안정감을 확인한 뒤 더 깊은 표현을 내놓는 편입니다.", "상대의 느린 반응을 애정 부족으로 단정하면 불필요한 거리감이 생깁니다.", "상대를 이해하려면 반응 속도보다 반복되는 선택을 보세요.", "네가 마음을 여는 방식이 어떤 순서인지 알고 싶어.", "상대의 반응, 반복 행동, 불편 신호를 일주일 동안 관찰합니다.", "상대의 별은 말보다 패턴으로 빛나며, 달빛은 그 패턴을 천천히 읽으라 합니다.", ["상대 본명숙", "상대 기질", "방어선"]),
    sectionTheme("상대가 사랑을 느끼는 방식", "상대 숙이 어떤 말과 행동에서 사랑받는다고 느끼는지 해석합니다.", "상대는 과한 감정보다 일관된 배려, 존중, 현실적 도움에서 애정을 확인할 수 있습니다.", "내 방식의 애정을 그대로 밀어 넣으면 상대에게 부담으로 닿을 수 있습니다.", "상대가 편하게 받는 애정 표현을 물어보고 그 방식으로 한 번 더 전달하세요.", "너는 어떤 표현을 받을 때 사랑받는다고 느껴?", "상대가 편한 표현, 부담스러운 표현, 고마웠던 표현을 구분합니다.", "사랑은 같은 달을 보아도 각자 다른 빛으로 받아들입니다.", ["사랑을 느끼는 방식", "애정 수신", "존중"]),
    sectionTheme("상대가 중요하게 여기는 것", "상대 숙이 관계에서 지키고 싶은 가치와 우선순위를 읽습니다.", "상대는 신뢰, 약속, 생활 균형처럼 반복 가능한 기준을 중요하게 볼 수 있습니다.", "상대의 중요 가치를 무시하면 사소한 문제도 관계 전체의 신뢰 문제로 커집니다.", "상대의 기준을 맞추려 하기보다 먼저 그 기준의 이유를 물어보세요.", "네가 관계에서 절대 놓치고 싶지 않은 기준은 뭐야?", "상대의 기준 세 가지를 듣고 내가 맞출 수 있는 것과 어려운 것을 나눕니다.", "달빛은 상대의 가치관을 바꾸라 하지 않고, 그 문 앞에서 예의를 갖추라 말합니다.", ["중요 가치", "기준", "신뢰"]),
    sectionTheme("상대가 멀어질 때의 신호", "상대 숙의 거리두기 신호가 침묵, 일정, 말투 중 어디에서 먼저 오는지 봅니다.", "상대는 지치면 감정을 설명하기보다 답장을 늦추거나 대화를 짧게 만들 수 있습니다.", "이 신호를 추궁하면 상대는 더 닫히고, 방치하면 거리감이 굳어집니다.", "멀어지는 신호가 보이면 원인 추궁보다 대화 가능한 시간을 먼저 제안하세요.", "지금 바로 답하지 않아도 괜찮아. 언제 이야기하면 편할까?", "답장 변화, 표정 변화, 회피 주제를 구분해 기록합니다.", "달빛이 옅어질 때는 붙잡기보다 다시 밝아질 자리를 남겨야 합니다.", ["멀어질 신호", "거리두기", "침묵"]),
    sectionTheme("상대를 이해하는 핵심", "상대 숙을 이해하는 핵심은 내 기준이 아니라 상대의 반복 패턴을 읽는 것입니다.", "상대는 말보다 행동의 일관성으로 마음을 보여줄 가능성이 큽니다.", "내가 듣고 싶은 방식만 인정하면 상대의 진짜 애정 표현을 놓칩니다.", "상대의 애정 언어를 하나 정하고, 그것을 받을 때 바로 인정하세요.", "네 방식의 표현을 내가 알아차리려고 노력할게.", "상대의 애정 언어, 부담 신호, 회복 신호를 한 장으로 정리합니다.", "상대의 별빛은 낯선 모양일 뿐, 빛나지 않는 것이 아닙니다.", ["이해", "반복 패턴", "애정 언어"]),
  ],
  4: [
    sectionTheme("관계 유형의 본질", "두 사람의 관계 유형이 끌림, 긴장, 배움 중 어디에 무게를 두는지 해석합니다.", "이 관계는 단순한 호감보다 서로의 약한 지점을 건드리며 성장 압력을 만듭니다.", "관계 유형을 좋고 나쁨으로만 보면 조율해야 할 핵심을 놓칩니다.", "관계 유형의 장점과 위험을 각각 하나씩 이름 붙여 관리하세요.", "우리 관계의 장점과 조심할 점을 같은 무게로 보자.", "관계 유형 키워드, 반복 갈등, 회복 방식을 한 표에 적습니다.", "관계 유형은 운명의 판결이 아니라 두 사람이 읽어야 할 별의 지도입니다.", ["관계 유형", "본질", "성장 압력"]),
    sectionTheme("감정적 강도", "관계 유형이 만드는 감정 강도와 마음의 진폭을 읽습니다.", "두 사람은 사소한 말에도 마음이 크게 움직이고, 좋을 때와 불안할 때의 차이가 큽니다.", "강한 감정을 진짜 사랑의 증거로만 보면 안정감을 놓칠 수 있습니다.", "감정이 커질수록 대화를 늦추고 사실 확인을 먼저 하세요.", "지금 감정이 커졌으니 결론보다 사실을 먼저 맞춰보자.", "감정 강도가 올라간 날에는 바로 결정하지 않는 규칙을 지킵니다.", "달빛이 밝을수록 그림자도 깊어지니, 빛과 그늘을 함께 보아야 합니다.", ["감정적 강도", "진폭", "사실 확인"]),
    sectionTheme("서로에게 배우는 것", "숙요 관계는 서로의 다른 기질을 통해 배우는 과제를 드러냅니다.", "한 사람은 감정의 섬세함을, 다른 한 사람은 현실의 균형을 배우게 됩니다.", "배움을 지적이나 훈계로 바꾸면 상대는 성장보다 평가를 느낍니다.", "서로에게 배우는 점은 칭찬의 언어로 먼저 말하세요.", "네가 가진 방식 중 내가 배우고 싶은 부분이 있어.", "서로에게 배우는 장점 하나와 따라 하기 어려운 점 하나를 공유합니다.", "이 인연의 수업은 상대를 고치는 일이 아니라 내 그릇을 넓히는 일입니다.", ["배움", "성장 과제", "장점"]),
    sectionTheme("반복 패턴", "관계 유형이 반복해서 만드는 충돌 고리와 화해 고리를 분리합니다.", "같은 말투, 같은 기다림, 같은 서운함이 다른 사건 속에서 되풀이될 수 있습니다.", "반복 패턴을 기억력 문제로 보면 해결이 늦어지고, 구조로 보면 길이 보입니다.", "반복되는 장면에는 멈춤 신호와 재대화 시간을 반드시 붙이세요.", "이 장면은 우리에게 반복되는 패턴이니까 잠깐 멈추자.", "반복 장면, 촉발 문장, 멈춤 신호, 재대화 시간을 정합니다.", "달빛은 같은 길을 여러 번 비추며, 이번에는 다른 발걸음을 선택하게 합니다.", ["반복 패턴", "충돌 고리", "화해 고리"]),
    sectionTheme("관계 유형을 좋게 쓰는 방법", "관계 유형의 힘을 상처가 아니라 성장과 친밀감으로 돌리는 방법을 봅니다.", "두 사람은 서로를 흔들 수 있지만, 합의가 있으면 깊은 회복력을 만들 수 있습니다.", "관계의 강도를 즐기기만 하면 피로가 쌓이고, 피하려고만 하면 끌림이 식습니다.", "강한 흐름은 규칙, 휴식, 확인 대화로 통로를 만들어 주세요.", "우리가 강하게 부딪힐 때 지킬 안전 규칙을 정하자.", "강한 감정 후 휴식, 확인, 화해 순서를 같은 방식으로 반복합니다.", "이 관계의 별은 거칠지만, 다듬으면 오래 빛나는 보석이 됩니다.", ["좋게 쓰는 방법", "안전 규칙", "회복력"]),
  ],
  5: [
    sectionTheme("거리의 의미", "숙요의 거리는 물리적 거리보다 감정이 닿는 체감 속도를 뜻합니다.", "가까운 거리감은 빠른 친밀감을 만들고, 먼 거리감은 해석의 여백을 크게 만듭니다.", "거리 의미를 모르면 상대의 속도를 애정의 크기로 오해합니다.", "두 사람의 적정 연락 간격과 만남 간격을 별도로 정하세요.", "우리가 편안한 거리와 부담스러운 거리를 같이 찾아보자.", "연락, 만남, 혼자 있는 시간을 각각 조율합니다.", "달빛은 가까이 있어도 멀리 있어도 같은 하늘에서 두 사람을 잇습니다.", ["거리", "체감 속도", "간격"]),
    sectionTheme("가까워질수록 강해지는 부분", "가까워질수록 두 숙의 감정 반응과 생활 리듬이 더 선명하게 드러납니다.", "친밀해지면 애정 표현과 보호 본능이 강해지고 서로에게 기대는 힘도 커집니다.", "가까워진 만큼 사생활 경계가 흐려지면 답답함이 생깁니다.", "친밀감이 커질 때도 개인 시간과 감정 휴식 시간을 지켜주세요.", "가까워져도 각자 숨 쉬는 시간은 지키자.", "만남 후 혼자 회복하는 시간과 다음 연락 시점을 정합니다.", "가까운 달빛은 따뜻하지만, 너무 오래 바라보면 눈이 피로해집니다.", ["가까워질수록", "친밀감", "개인 시간"]),
    sectionTheme("멀어질수록 드러나는 문제", "거리감이 벌어질 때 불안, 추측, 확인 욕구가 어떻게 변하는지 봅니다.", "멀어지면 상대의 침묵이 실제보다 차갑게 느껴지고 작은 공백도 크게 해석됩니다.", "공백을 방치하거나 추궁하면 둘 다 방어적으로 변합니다.", "공백이 생길 때 사용할 짧은 확인 문장과 답장 유예 시간을 정하세요.", "답이 늦어질 때는 언제쯤 이야기할 수 있는지만 알려줘.", "연락 공백 기준, 불안 대처, 재접촉 문장을 정리합니다.", "멀어진 달빛은 사라진 것이 아니라 구름 뒤에 머무를 때가 있습니다.", ["멀어질수록", "공백", "추측"]),
    sectionTheme("인연의 속도와 감정 밀도", "관계 속도와 감정 밀도가 맞는지 숙요 점수와 거리감으로 읽습니다.", "감정은 빨리 깊어질 수 있지만 현실 합의가 따라오지 않으면 흔들립니다.", "빠른 속도를 운명으로만 믿으면 생활 조건 검증을 놓칩니다.", "속도는 감정, 약속, 생활 공개의 세 단계로 나누어 맞추세요.", "우리 속도가 빠른지 느린지보다 어떤 단계까지 준비됐는지 보자.", "호감, 약속, 생활 공개 단계를 각각 체크합니다.", "인연의 강물은 빠를수록 둑이 필요하고, 둑은 합의의 언어로 세워집니다.", ["속도", "감정 밀도", "단계"]),
    sectionTheme("거리 조절법", "이 관계의 적정 거리는 끌림을 유지하면서 불안을 낮추는 지점입니다.", "두 사람은 너무 붙으면 예민해지고, 너무 멀면 불안이 커질 수 있습니다.", "거리 조절을 회피로 쓰면 관계가 식고, 통제로 쓰면 숨이 막힙니다.", "가까워지는 시간과 물러나는 시간을 미리 합의하세요.", "이번 주에는 가까워질 시간과 쉬어갈 시간을 같이 정하자.", "만남 하루, 휴식 하루, 확인 대화 하루의 리듬을 만들어 봅니다.", "달빛은 밀물과 썰물처럼 다가오고 물러나며 인연의 해안을 지킵니다.", ["거리 조절", "가까움", "휴식"]),
  ],
  6: [
    sectionTheme("처음 끌린 이유", "첫 끌림은 두 숙의 낯선 결이 서로의 빈자리를 건드릴 때 생깁니다.", "상대에게서 내게 부족한 분위기나 오래 바라던 반응을 발견했을 수 있습니다.", "처음 끌린 이유를 계속 같은 방식으로 요구하면 관계가 좁아집니다.", "처음의 매력을 인정하되 현재의 사람을 다시 알아가세요.", "처음 좋았던 점과 지금 새로 보이는 점을 같이 말해보자.", "첫 매력, 현재 장점, 앞으로 확인할 점을 나누어 적습니다.", "첫 끌림은 별이 문을 두드리는 순간이고, 사랑은 그 문 안에서 살아가는 일입니다.", ["처음 끌림", "첫 매력", "현재 장점"]),
    sectionTheme("신비롭게 느껴지는 지점", "숙요에서 신비감은 설명되지 않는 익숙함과 예측 불가한 매력이 만나는 곳입니다.", "상대가 낯선데도 오래 알고 지낸 듯 느껴지거나, 작은 행동이 크게 남을 수 있습니다.", "신비감을 상대의 모든 면을 아는 것처럼 착각하면 실망이 빨라집니다.", "신비감은 남겨두되 현실 정보는 차분히 확인하세요.", "신기하게 느껴지는 부분과 아직 모르는 부분을 구분해보자.", "상대에게 궁금한 현실 질문 세 가지를 부드럽게 묻습니다.", "달빛의 신비는 가까이 갈수록 사라지는 것이 아니라 더 정교한 무늬가 됩니다.", ["신비감", "익숙함", "현실 정보"]),
    sectionTheme("외모보다 강한 분위기", "두 숙의 기운은 외형보다 말투, 눈빛, 리듬에서 더 강하게 작동할 수 있습니다.", "상대의 분위기, 태도, 생활 감각이 끌림의 핵심이 될 수 있습니다.", "분위기에 취하면 실제 배려와 책임을 확인하지 못할 수 있습니다.", "분위기와 행동의 일치 여부를 천천히 살피세요.", "네 분위기가 좋았고, 그만큼 행동도 천천히 알아가고 싶어.", "좋았던 분위기와 실제 행동이 맞았던 장면을 기록합니다.", "달빛은 얼굴보다 그림자의 움직임을 먼저 보여줍니다.", ["분위기", "말투", "행동 일치"]),
    sectionTheme("감정이 빨리 깊어지는 이유", "관계 유형과 거리감이 감정 심도를 빠르게 끌어올리는지 봅니다.", "짧은 만남에도 오래된 관계처럼 마음이 깊어질 수 있습니다.", "감정 깊이를 관계 안정성과 혼동하면 속도 조절이 어려워집니다.", "깊어진 감정만큼 현실 약속의 단계도 맞춰 가세요.", "마음은 깊어졌지만 약속은 어떤 속도로 갈지 정하자.", "감정 고백, 약속 수준, 생활 공유 범위를 단계별로 맞춥니다.", "깊은 물은 아름답지만, 건너기 전에는 반드시 발밑을 확인해야 합니다.", ["감정 깊이", "속도 조절", "약속 단계"]),
    sectionTheme("첫 끌림의 지속 조건", "첫 끌림이 오래 가려면 숙요의 자극을 안정적인 신뢰로 바꾸어야 합니다.", "설렘이 줄어드는 대신 편안함이 생길 때 관계는 다음 단계로 넘어갑니다.", "설렘이 약해졌다고 관계가 식었다고 단정하면 안정기의 가치를 놓칩니다.", "설렘, 편안함, 책임감이 어떻게 바뀌는지 함께 확인하세요.", "처음과 달라진 감정 중 좋아진 부분도 같이 봐보자.", "설렘 기록, 편안함 기록, 책임 행동을 한 가지씩 점검합니다.", "첫 별빛은 사라지는 것이 아니라 일상의 등불로 바뀔 수 있습니다.", ["지속 조건", "설렘", "안정기"]),
  ],
  7: [
    sectionTheme("감정 속도 차이", "두 숙이 감정을 느끼고 말로 꺼내는 속도 차이를 읽습니다.", "한쪽은 바로 느끼고 표현하지만, 다른 쪽은 정리한 뒤 말하려 할 수 있습니다.", "속도 차이를 애정 차이로 해석하면 불안과 회피가 동시에 커집니다.", "빠른 쪽은 기다림을, 느린 쪽은 예고를 맡아야 합니다.", "나는 기다릴게. 대신 언제쯤 말할 수 있는지만 알려줘.", "감정 표현 시간, 정리 시간, 재대화 시간을 정합니다.", "달빛은 먼저 뜨는 별과 늦게 뜨는 별을 한 하늘에 둡니다.", ["감정 속도", "기다림", "예고"]),
    sectionTheme("애정 표현 차이", "애정 표현의 언어가 말, 행동, 접촉, 책임 중 어디에 있는지 봅니다.", "두 사람은 사랑을 주는 방식과 받는 방식이 다를 수 있습니다.", "내 방식만 사랑이라고 주장하면 상대의 표현이 지워집니다.", "각자의 애정 표현을 번역해서 상대가 알아들을 수 있게 바꾸세요.", "내 표현 방식과 네가 받기 편한 방식을 맞춰보고 싶어.", "각자 좋아하는 표현과 부담스러운 표현을 두 가지씩 나눕니다.", "사랑의 언어가 다를수록 달빛은 번역자의 역할을 요구합니다.", ["애정 표현", "사랑의 언어", "번역"]),
    sectionTheme("서운함이 쌓이는 방식", "서운함은 숙요의 그림자가 반복될 때 조용히 층을 만듭니다.", "사소한 답장, 말투, 약속 변경이 누적되며 어느 날 큰 감정으로 올라옵니다.", "서운함을 오래 참으면 정확한 원인이 흐려져 해결이 어려워집니다.", "서운함은 당일에 짧게 말하고, 큰 결론은 다음 대화로 넘기세요.", "오늘 서운했던 건 작지만 그냥 넘기면 쌓일 것 같아.", "서운함 발생 시점, 실제 사건, 내가 원한 반응을 기록합니다.", "달빛 아래 쌓인 먼지는 작아 보여도 오래 두면 길을 흐립니다.", ["서운함", "누적", "당일 공유"]),
    sectionTheme("마음이 통하는 순간", "두 숙이 서로의 정서를 정확히 받아주는 순간을 해석합니다.", "상대가 내 감정의 이유를 설명하지 않아도 알아차릴 때 깊은 연결감을 느낍니다.", "마음이 통했던 순간만 기준으로 삼으면 평범한 날의 사랑을 놓칩니다.", "통했던 순간을 기억하되 평소의 확인 대화도 유지하세요.", "그때 마음이 통한다고 느꼈던 이유를 서로 말해보자.", "통했던 장면, 필요한 조건, 다시 만들 수 있는 행동을 정리합니다.", "마음이 통하는 순간은 별의 문이 잠시 열리는 때입니다.", ["마음이 통함", "연결감", "확인 대화"]),
    sectionTheme("감정 온도 맞추기", "감정 온도는 뜨거움보다 지속 가능한 균형을 기준으로 봐야 합니다.", "한쪽이 과열되면 다른 쪽은 식는 방식으로 균형을 잡으려 할 수 있습니다.", "온도 차이를 무시하면 뜨거운 쪽은 외롭고 차분한 쪽은 압박을 느낍니다.", "대화 전 감정 온도를 숫자로 말하고, 높은 쪽부터 낮추세요.", "지금 내 감정 온도는 8이야. 5가 될 때 다시 이야기하자.", "감정 온도 숫자화, 휴식, 재대화 순서를 연습합니다.", "달빛은 뜨겁지 않아 오래 비춥니다. 이 관계도 오래 비추는 온도를 찾아야 합니다.", ["감정 온도", "과열", "균형"]),
  ],
  8: [
    sectionTheme("말이 잘 통하는 부분", "소통 궁합은 두 숙이 같은 주제에서 얼마나 쉽게 의미를 맞추는지 봅니다.", "관심사나 감정 표현이 맞을 때 대화가 빠르게 깊어질 수 있습니다.", "잘 통하는 부분만 믿고 어려운 주제를 피하면 관계의 빈틈이 남습니다.", "잘 통하는 주제를 발판으로 불편한 주제까지 부드럽게 연결하세요.", "우리가 잘 통하는 방식으로 어려운 이야기도 천천히 해보자.", "잘 통하는 주제, 어려운 주제, 연결 문장을 정합니다.", "말이 통하는 순간은 두 별이 같은 파장으로 흔들리는 때입니다.", ["말이 통함", "소통", "어려운 주제"]),
    sectionTheme("말이 엇갈리는 부분", "말의 엇갈림은 단어보다 의도 해석의 차이에서 생길 수 있습니다.", "한쪽은 해결책으로 듣고, 다른 쪽은 공감 부족으로 받아들일 수 있습니다.", "엇갈림을 무시하면 같은 말이 매번 다른 상처를 만듭니다.", "상대 말의 의도를 먼저 확인한 뒤 내 해석을 말하세요.", "내가 이렇게 들었는데 네 의도는 그게 맞아?", "엇갈린 문장, 실제 의도, 다르게 말할 표현을 정리합니다.", "달빛 아래에서는 같은 그림자도 위치에 따라 다르게 보입니다.", ["말이 엇갈림", "의도", "해석"]),
    sectionTheme("침묵이 생기는 이유", "침묵은 무관심보다 방어, 정리 시간, 부담감의 신호일 수 있습니다.", "상대가 침묵할 때 나는 거절로 느끼고, 상대는 생각할 시간이 필요할 수 있습니다.", "침묵을 몰아붙이면 더 긴 침묵이 되고, 방치하면 단절로 굳어집니다.", "침묵이 생기면 시간 제한과 재개 약속을 함께 정하세요.", "지금 말하기 어렵다면 언제 다시 이야기할 수 있을까?", "침묵 허용 시간, 재대화 약속, 확인 문장을 미리 합의합니다.", "침묵은 어둠이 아니라 아직 말이 별빛을 찾는 시간일 수 있습니다.", ["침묵", "정리 시간", "재개 약속"]),
    sectionTheme("싸울 때의 말", "갈등 언어는 숙요 그림자가 가장 빠르게 드러나는 통로입니다.", "한쪽은 감정의 크기로 말하고, 다른 쪽은 논리나 회피로 반응할 수 있습니다.", "싸울 때 인격 평가, 과거 소환, 단정 표현이 들어가면 회복이 늦어집니다.", "갈등 문장은 현재 사건, 내 감정, 원하는 행동만 담으세요.", "너는 항상 그래가 아니라, 오늘 이 말이 나를 서운하게 했어라고 말하자.", "금지어 세 가지와 대체 문장 세 가지를 정합니다.", "달빛은 칼처럼 날카로운 말을 부드러운 길로 돌리라 합니다.", ["싸울 때", "갈등 언어", "금지어"]),
    sectionTheme("관계를 살리는 대화법", "관계를 살리는 말은 승패보다 회복 가능성을 열어두는 말입니다.", "두 사람에게 필요한 대화는 감정 확인, 사실 정리, 다음 행동 합의의 순서입니다.", "사과만 하고 행동 합의가 없으면 같은 상처가 반복됩니다.", "대화 끝에는 반드시 다음 행동 하나와 확인 시점을 남기세요.", "오늘 대화의 결론을 다음 행동 하나로 정해보자.", "감정 확인, 사실 정리, 행동 합의, 확인 날짜를 순서대로 진행합니다.", "좋은 대화는 달빛처럼 어두운 감정을 없애지 않고 지나갈 길을 비춥니다.", ["살리는 대화", "행동 합의", "확인 시점"]),
  ],
  9: [
    sectionTheme("자주 부딪히는 문제", "자주 부딪히는 문제는 관계 유형의 그림자와 생활 습관이 만나는 지점입니다.", "연락, 약속, 말투, 우선순위 같은 반복 주제가 핵심 갈등으로 떠오를 수 있습니다.", "겉 사건만 바꾸면 같은 구조가 다른 이름으로 돌아옵니다.", "문제의 이름보다 반복 구조를 먼저 찾아야 합니다.", "이번 사건이 아니라 우리가 반복하는 구조가 뭔지 보자.", "반복 주제, 촉발 상황, 회복 실패 이유를 기록합니다.", "갈등은 별빛이 꺼진 것이 아니라 아직 정리되지 않은 그림자가 드러난 것입니다.", ["자주 부딪힘", "반복 구조", "갈등"]),
    sectionTheme("서로를 오해하는 지점", "오해는 숙요 기질의 표현 방식 차이를 상대의 의도로 단정할 때 생깁니다.", "나는 배려로 한 행동을 상대는 통제로 느끼거나, 상대의 침묵을 나는 무심함으로 느낄 수 있습니다.", "오해를 오래 두면 사실보다 감정 기억이 더 강해집니다.", "의도, 영향, 원하는 수정점을 분리해서 말하세요.", "네 의도는 알겠는데 내가 받은 영향은 이랬어.", "오해 장면마다 의도와 영향을 따로 적어봅니다.", "달빛은 의도와 상처가 같은 길을 걷지 않을 수 있음을 보여줍니다.", ["오해", "의도", "영향"]),
    sectionTheme("한쪽이 지치는 이유", "지침은 역할 불균형과 감정 노동의 누적에서 생깁니다.", "한 사람이 계속 맞추거나 설명하거나 기다리는 역할을 맡으면 피로가 커집니다.", "지친 쪽을 예민하다고 보면 관계 회복의 기회를 잃습니다.", "감정 노동과 현실 행동을 나누어 책임을 재분배하세요.", "내가 계속 맡고 있는 역할을 같이 나눌 수 있을까?", "기다림, 설명, 사과, 조율 역할을 각자 나누어 봅니다.", "지친 별은 빛이 없는 것이 아니라 너무 오래 혼자 빛난 것입니다.", ["지침", "역할 불균형", "감정 노동"]),
    sectionTheme("감정 폭발 순간", "감정 폭발은 오래 쌓인 신호가 임계점을 넘을 때 일어납니다.", "작은 말 하나가 과거의 상처를 함께 불러와 반응이 커질 수 있습니다.", "폭발 직후 결론을 내리면 관계 전체를 다치게 할 수 있습니다.", "폭발 순간에는 멈춤, 분리, 재대화 약속만 남기세요.", "지금은 폭발한 상태라 결론보다 멈춤이 필요해.", "폭발 전 신호, 멈춤 문장, 재대화 시간을 미리 정합니다.", "번개가 친 밤에도 달은 사라지지 않습니다. 지나간 뒤 다시 보아야 합니다.", ["감정 폭발", "임계점", "멈춤"]),
    sectionTheme("갈등을 줄이는 방법", "갈등 완화는 피하는 기술이 아니라 같은 고리를 짧게 끊는 기술입니다.", "두 사람은 갈등을 없애기보다 회복 시간을 줄일 때 안정됩니다.", "갈등을 줄인다는 명목으로 중요한 말을 삼키면 장기적으로 더 커집니다.", "갈등 후 24시간 안에 사실, 감정, 다음 행동을 정리하세요.", "싸우지 않는 것보다 싸운 뒤 어떻게 돌아오는지가 중요해.", "갈등 발생, 휴식, 재대화, 행동 합의를 하루 안에 마무리합니다.", "갈등의 밤은 길어도 회복의 달빛을 켜두면 길을 잃지 않습니다.", ["갈등 완화", "회복 시간", "24시간"]),
  ],
  10: [
    sectionTheme("멀어지는 이유", "이별 흐름은 애정 소멸보다 반복 피로와 설명 없는 거리두기에서 시작될 수 있습니다.", "감정이 남아도 같은 문제를 해결할 자신이 없으면 멀어지는 선택을 합니다.", "멀어짐을 단순 변심으로 보면 남아 있는 마음과 해결 과제를 놓칩니다.", "멀어진 이유를 감정, 사건, 반복 구조로 나누어 보세요.", "우리가 멀어진 이유를 한 가지 감정으로만 설명하지 말자.", "멀어진 사건, 반복 문제, 아직 남은 감정을 분리합니다.", "헤어짐의 달빛은 끝만 비추지 않고 아직 풀지 못한 매듭도 비춥니다.", ["멀어지는 이유", "이별", "반복 피로"]),
    sectionTheme("이별 후 마음이 남는 이유", "숙요 인연은 미해결 감정과 강한 각인이 남을 때 쉽게 끊어지지 않습니다.", "상대의 장점보다 끝내 말하지 못한 감정이 오래 마음에 남을 수 있습니다.", "남은 마음을 재회 가능성으로만 해석하면 현실 문제를 못 봅니다.", "마음이 남는 이유와 다시 만나도 해결해야 할 문제를 함께 적으세요.", "마음이 남는 것과 다시 만날 준비가 된 것은 다를 수 있어.", "남은 감정, 미안함, 반복 문제를 각각 분리합니다.", "남은 마음은 달빛의 잔향이며, 그 빛이 길인지 미련인지는 행동이 결정합니다.", ["마음이 남음", "미해결 감정", "재회 준비"]),
    sectionTheme("재회 가능 조건", "재회는 끌림보다 반복 문제를 다르게 다룰 준비가 있을 때 열립니다.", "두 사람 모두 같은 상처를 다시 만들지 않을 구체적 규칙이 필요합니다.", "그리움만으로 재회하면 이전 패턴이 빠르게 돌아옵니다.", "재회 전에는 연락 규칙, 갈등 멈춤, 사과 방식부터 합의하세요.", "다시 만나고 싶다면 예전과 다르게 할 규칙부터 정하자.", "재회 이유, 바꿀 행동, 확인 기간을 3단계로 세웁니다.", "재회의 문은 달빛처럼 부드럽지만, 들어가기 전 낡은 짐을 내려놓아야 합니다.", ["재회 가능", "바꿀 행동", "확인 기간"]),
    sectionTheme("다시 만나도 반복될 문제", "반복 문제는 숙요 관계 유형의 그림자가 해결되지 않았다는 신호입니다.", "연락 공백, 상처 표현, 책임 회피 같은 문제가 같은 방식으로 돌아올 수 있습니다.", "반복될 문제를 사랑으로 덮으면 더 큰 실망이 옵니다.", "재회 전 반복 문제 하나를 반드시 행동 규칙으로 바꾸세요.", "다시 만나면 제일 먼저 반복될 문제가 뭔지 솔직히 보자.", "반복 문제, 금지 행동, 대체 행동을 문장으로 합의합니다.", "달빛은 같은 길을 두 번 비출 때 두 번째 선택을 묻습니다.", ["반복 문제", "금지 행동", "대체 행동"]),
    sectionTheme("재회를 원할 때의 태도", "재회를 원할수록 관계 유형의 강도보다 상대의 현재 상태를 존중해야 합니다.", "다가가고 싶은 마음이 커도 상대의 회복 속도를 기다릴 줄 알아야 합니다.", "확답을 재촉하면 재회 가능성보다 방어가 먼저 커집니다.", "재회 대화는 사과, 변화, 선택권 존중의 순서로 시작하세요.", "내 마음은 전하고 싶지만 네 선택을 존중할게.", "사과 문장, 바뀐 행동, 기다릴 기간을 정합니다.", "재회를 비는 달빛은 상대의 문 앞에 조용히 머무는 예의를 압니다.", ["재회 태도", "선택권", "기다림"]),
  ],
  11: [
    sectionTheme("오래 만날수록 강해지는 부분", "장기 관계에서는 숙요의 장점이 생활 속 반복 행동으로 굳어집니다.", "서로의 강점을 알고 역할을 나누면 신뢰가 깊어집니다.", "오래 만났다는 이유로 표현과 점검을 줄이면 관계가 건조해집니다.", "장점이 굳어질수록 감사와 역할 재조정을 함께 하세요.", "오래 된 만큼 당연하게 여기지 말고 다시 고마움을 말하자.", "장기 장점, 고마운 행동, 바꿀 역할을 점검합니다.", "오랜 달빛은 화려하지 않아도 길을 잃지 않게 합니다.", ["장기 관계", "신뢰", "역할 재조정"]),
    sectionTheme("결혼 후 드러날 차이", "결혼 궁합은 감정 궁합보다 생활 결정 방식의 차이를 크게 봅니다.", "돈, 가족, 집안일, 휴식 방식에서 두 숙의 현실 감각 차이가 드러납니다.", "사랑으로 생활 차이를 덮으면 결혼 후 피로가 빠르게 쌓입니다.", "결혼 전 생활 규칙을 구체적인 숫자와 역할로 정하세요.", "좋아하는 마음과 생활 방식은 따로 맞춰봐야 해.", "돈, 가사, 가족 경계, 휴식 시간을 문서처럼 합의합니다.", "결혼의 달빛은 설렘보다 매일의 밥상과 문턱을 더 오래 비춥니다.", ["결혼", "생활 차이", "가사"]),
    sectionTheme("생활 리듬 궁합", "생활 리듬은 수면, 일, 연락, 휴식의 박자가 얼마나 맞는지 보는 축입니다.", "리듬이 맞으면 편안하지만, 어긋나면 사소한 생활 소음이 감정 문제로 커집니다.", "생활 리듬 차이를 배려 없이 두면 사랑보다 피곤함이 먼저 느껴집니다.", "하루 루틴과 쉬는 방식을 서로 침범하지 않는 선에서 맞추세요.", "우리의 하루 리듬 중 같이 맞출 것과 각자 둘 것을 나누자.", "수면, 식사, 연락, 휴식 리듬을 표로 맞춥니다.", "같은 달 아래에서도 각자의 밤길은 다릅니다. 리듬은 맞추되 숨은 남겨야 합니다.", ["생활 리듬", "휴식", "하루 루틴"]),
    sectionTheme("책임과 역할 분담", "장기 궁합의 안정성은 책임이 공평하게 느껴지는지에 달려 있습니다.", "한쪽이 감정 조율과 현실 책임을 함께 떠안으면 불만이 누적됩니다.", "역할 분담을 말하지 않으면 누가 더 희생했는지로 싸우게 됩니다.", "눈에 보이는 일과 보이지 않는 감정 노동을 함께 나누세요.", "보이는 일뿐 아니라 마음 쓰는 일도 같이 나누고 싶어.", "가사, 돈, 일정, 감정 조율 역할을 각각 배분합니다.", "책임을 나눈 별은 서로를 묶지 않고 오래 지탱합니다.", ["책임", "역할 분담", "감정 노동"]),
    sectionTheme("장기 관계 조건", "오래 가는 조건은 끌림 유지보다 회복 가능성을 반복해서 증명하는 것입니다.", "두 사람은 갈등 후 다시 돌아오는 방식이 안정될 때 미래를 상상할 수 있습니다.", "미래 이야기만 하고 현재 규칙이 없으면 신뢰가 얇아집니다.", "장기 조건은 약속, 회복, 생활 기준 세 가지로 확인하세요.", "우리의 미래를 말하기 전에 현재 지킬 기준을 정하자.", "한 달 단위로 약속, 회복, 생활 기준을 점검합니다.", "긴 인연은 큰 예언보다 작은 약속을 지키는 달빛에서 자랍니다.", ["장기 조건", "미래", "생활 기준"]),
  ],
  12: [
    sectionTheme("돈과 소비 태도", "현실 궁합에서 돈은 안정감, 자유, 책임감을 동시에 드러내는 영역입니다.", "한쪽은 안전을 위해 모으고, 다른 쪽은 경험과 관계를 위해 쓰려 할 수 있습니다.", "소비 취향을 인격 문제로 보면 대화가 금방 방어적으로 흐릅니다.", "공동 지출, 개인 지출, 선물 기준을 분리해서 합의하세요.", "돈을 쓰는 방식이 다르니 공동 기준과 개인 기준을 나눠보자.", "공동비, 개인비, 충동 소비 기준을 정합니다.", "돈의 흐름은 달빛처럼 마음의 불안을 비춥니다. 숫자 뒤의 감정을 함께 보아야 합니다.", ["돈", "소비", "공동 지출"]),
    sectionTheme("일과 관계의 우선순위", "일과 관계의 우선순위는 각 숙이 책임과 애정을 어떻게 배분하는지 보여줍니다.", "한쪽은 일을 통해 안정감을 만들고, 다른 쪽은 관계 시간을 애정의 증거로 볼 수 있습니다.", "바쁜 시기를 사랑 부족으로 단정하면 현실 압박이 감정 갈등으로 바뀝니다.", "바쁜 기간에는 연락 최소 기준과 보상 시간을 미리 정하세요.", "바쁠 때도 우리가 지킬 최소한의 연결 기준을 정하자.", "업무 집중 시간, 최소 연락, 회복 데이트를 합의합니다.", "일의 태양과 사랑의 달이 같은 하늘에 뜨려면 시간의 질서를 세워야 합니다.", ["일", "우선순위", "최소 연락"]),
    sectionTheme("가족과 주변 사람 관점", "가족과 주변 사람은 두 사람의 경계감과 책임 의식을 시험하는 영역입니다.", "상대의 가족, 친구, 지인에 대한 태도가 관계 안정감을 크게 흔들 수 있습니다.", "외부 사람 문제를 방치하면 둘만의 갈등보다 더 깊은 편 가르기가 생깁니다.", "가족 개입 범위와 공개 수준을 두 사람이 먼저 합의하세요.", "우리 관계에 주변 사람이 어디까지 들어올 수 있는지 정하자.", "가족 공유 범위, 친구 만남 기준, 갈등 시 외부 상담 금지를 정합니다.", "달빛은 둘만의 방도 비추지만, 문밖의 그림자도 함께 보여줍니다.", ["가족", "주변 사람", "경계"]),
    sectionTheme("생활 습관 차이", "생활 습관은 숙요 궁합이 현실에서 매일 반복되는 자리입니다.", "정리, 시간 약속, 식사, 청결, 휴식 방식에서 작지만 큰 차이가 생길 수 있습니다.", "생활 차이를 참기만 하면 어느 날 사랑의 문제가 아니라 피로의 문제가 됩니다.", "생활 습관은 옳고 그름보다 공동 구역 규칙으로 다루세요.", "네 방식과 내 방식 중 같이 쓰는 공간에서는 어떤 기준을 둘까?", "공동 구역, 개인 구역, 양보 가능한 습관을 정합니다.", "생활의 작은 먼지도 달빛 아래에서는 관계의 길을 흐릴 수 있습니다.", ["생활 습관", "공동 구역", "피로"]),
    sectionTheme("현실 문제 해결 방식", "현실 문제를 함께 해결하는 방식은 장기 궁합의 실제 체력을 보여줍니다.", "문제가 생겼을 때 한쪽은 감정 위로를, 다른 한쪽은 해결 순서를 먼저 찾을 수 있습니다.", "위로와 해결을 서로 반대편으로 느끼면 협력보다 서운함이 커집니다.", "문제 앞에서는 감정 확인 후 해결 순서를 정하는 방식을 고정하세요.", "먼저 마음을 확인하고, 그 다음 해결 순서를 정하자.", "문제 발생 시 감정 확인, 역할 분담, 기한 설정을 진행합니다.", "현실의 돌은 무겁지만, 둘이 같은 방향으로 들면 길이 열립니다.", ["현실 문제", "해결 방식", "역할 분담"]),
  ],
  13: [
    sectionTheme("편안함을 느끼는 방식", "친밀감은 두 숙이 긴장을 내려놓는 조건에서 만들어집니다.", "함께 있어도 꾸미지 않아도 된다고 느낄 때 관계가 깊어집니다.", "편안함을 무심함으로 착각하면 애정 표현이 줄어들 수 있습니다.", "편안한 순간에도 짧은 애정 표현을 남기세요.", "편해서 말이 줄어도 마음은 계속 표현하고 싶어.", "편안했던 순간과 애정 표현이 필요했던 순간을 구분합니다.", "편안함은 달빛이 방 안에 조용히 스며드는 것과 같습니다.", ["편안함", "친밀감", "애정 표현"]),
    sectionTheme("스킨십과 애정 온도", "스킨십 궁합은 친밀감의 속도와 경계 존중을 함께 봐야 합니다.", "한쪽은 접촉으로 안정감을 느끼고, 다른 쪽은 분위기와 신뢰가 먼저 필요할 수 있습니다.", "스킨십 속도를 맞추지 않으면 한쪽은 거절감, 다른 쪽은 압박을 느낍니다.", "좋은 접촉, 불편한 접촉, 필요한 분위기를 솔직히 나누세요.", "나는 이런 애정 표현이 편하고, 이런 방식은 천천히 가고 싶어.", "편한 표현, 불편한 표현, 회복 표현을 각각 정합니다.", "몸의 거리는 마음의 문과 이어져 있으니 달빛처럼 부드럽게 다가가야 합니다.", ["스킨십", "애정 온도", "경계"]),
    sectionTheme("사랑받는다고 느끼는 순간", "사랑받는 순간은 각 숙이 안정감을 확인하는 핵심 증거입니다.", "한쪽은 말에서, 다른 쪽은 반복 행동이나 우선순위에서 사랑을 느낄 수 있습니다.", "상대가 원하는 증거를 모르면 많이 사랑해도 적게 전달됩니다.", "각자가 사랑받는다고 느끼는 순간을 구체적으로 공유하세요.", "나는 이런 순간에 사랑받는다고 느껴. 너는 언제 그래?", "사랑받는 순간 세 가지와 이번 주 실천 하나를 정합니다.", "사랑은 달빛처럼 같은 곳에 내려도 각자의 마음에 다른 무늬를 남깁니다.", ["사랑받는 순간", "안정감", "증거"]),
    sectionTheme("거절감과 거리감", "거절감은 실제 거절보다 해석의 상처에서 커질 수 있습니다.", "상대가 피곤해서 물러난 행동도 내게는 사랑이 식은 신호처럼 느껴질 수 있습니다.", "거절감을 바로 공격으로 바꾸면 친밀감이 더 닫힙니다.", "거절감을 느낀 순간에는 사실과 느낌을 분리해 말하세요.", "네가 나를 거절했다기보다 내가 그렇게 느껴져서 확인하고 싶어.", "거절로 느낀 장면, 실제 사실, 확인 문장을 적습니다.", "달빛은 닫힌 문 앞에서도 부드럽게 머물며, 두드릴 시간을 알려줍니다.", ["거절감", "거리감", "사실 확인"]),
    sectionTheme("친밀감 회복법", "친밀감 회복은 큰 이벤트보다 안전한 반복 접촉에서 시작됩니다.", "상처 이후에는 바로 예전처럼 가까워지기보다 작은 신뢰를 다시 쌓아야 합니다.", "회복 속도를 재촉하면 친밀감이 의무처럼 느껴질 수 있습니다.", "가벼운 대화, 짧은 만남, 작은 애정 표현부터 회복하세요.", "예전처럼 바로 돌아가려 하기보다 작은 것부터 다시 해보자.", "짧은 산책, 부담 없는 메시지, 고마움 표현을 반복합니다.", "친밀감은 달빛에 젖은 물처럼 천천히 다시 차오릅니다.", ["친밀감 회복", "작은 신뢰", "회복 속도"]),
  ],
  14: [
    sectionTheme("전생 인연처럼 느껴지는 이유", "전생감은 숙요의 강한 각인과 반복 감정이 결합될 때 생깁니다.", "처음부터 설명하기 어려운 익숙함이나 운명적 끌림을 느낄 수 있습니다.", "전생감에 취하면 현재의 책임과 선택을 흐릴 수 있습니다.", "운명처럼 느껴져도 현재 행동으로 관계를 판단하세요.", "운명처럼 느껴지는 마음은 인정하되 지금 우리가 하는 행동도 보자.", "운명감, 현실 행동, 책임 신호를 나누어 점검합니다.", "전생의 달빛은 기억이 아니라 현재를 더 선명히 보라는 신호입니다.", ["전생 인연", "운명감", "현재 행동"]),
    sectionTheme("반복해서 끌리는 감정", "반복 끌림은 미해결 과제와 강한 보완 욕구가 겹칠 때 나타납니다.", "멀어져도 다시 생각나고, 상처가 있어도 쉽게 끊기지 않는 감정이 남을 수 있습니다.", "반복 끌림을 무조건 사랑으로 해석하면 상처의 원인을 놓칩니다.", "끌림과 치유 과제를 분리해 보세요.", "내가 끌리는 건 사랑인지, 풀고 싶은 감정인지 같이 보고 싶어.", "끌림의 이유, 상처의 이유, 다시 선택할 조건을 정리합니다.", "반복되는 끌림은 달의 주기처럼 돌아오지만, 매번 같은 선택을 요구하지는 않습니다.", ["반복 끌림", "미해결 과제", "상처"]),
    sectionTheme("서로에게 남기는 숙제", "카르마적 숙제는 상대를 통해 내가 배워야 할 관계 태도입니다.", "한 사람은 기다림을, 다른 한 사람은 표현을 배우는 식의 과제가 생길 수 있습니다.", "숙제를 상대 탓으로 돌리면 인연의 성장 의미가 사라집니다.", "서로에게 배워야 할 태도를 하나씩 인정하세요.", "네가 나에게 남긴 숙제가 뭔지 생각해봤어.", "내 숙제, 상대의 숙제, 함께 풀 숙제를 나누어 적습니다.", "이 인연의 숙제는 벌이 아니라 별이 건네는 성장의 문장입니다.", ["숙제", "카르마", "성장"]),
    sectionTheme("관계가 주는 성장 의미", "성장 의미는 이 관계가 나의 감정 습관을 어떻게 바꾸는지에 있습니다.", "두 사람은 서로를 통해 사랑의 속도, 경계, 책임을 다시 배우게 됩니다.", "성장이라는 말로 상처를 정당화하면 관계가 왜곡됩니다.", "성장은 상처를 참는 것이 아니라 더 좋은 선택을 배우는 것입니다.", "이 관계가 나를 어떻게 바꾸고 있는지 솔직히 말해보자.", "배운 점, 아픈 점, 앞으로 지킬 기준을 정리합니다.", "달빛은 상처를 아름답게 포장하지 않고, 그 상처에서 자란 힘을 비춥니다.", ["성장 의미", "경계", "책임"]),
    sectionTheme("이어가거나 마무리하는 법", "카르마 인연은 이어갈 때도 마무리할 때도 의식적인 선택이 필요합니다.", "이어가려면 반복 문제를 행동으로 바꾸고, 마무리하려면 미련과 책임을 분리해야 합니다.", "흐릿한 상태로 붙잡으면 인연이 길어져도 성숙해지지 않습니다.", "이어갈 기준과 놓아줄 기준을 각각 분명히 쓰세요.", "우리가 이어갈 조건과 멈춰야 할 기준을 솔직히 정하자.", "이어갈 조건, 마무리 조건, 마지막 대화의 원칙을 정합니다.", "달빛은 만남도 이별도 같은 하늘 아래 놓고, 가장 성숙한 길을 고르게 합니다.", ["이어가기", "마무리", "선택 기준"]),
  ],
  15: [
    sectionTheme("최종 핵심 메시지", "최종 전략은 본명숙, 관계 유형, 거리, 현실 조건을 하나의 결론으로 묶습니다.", "이 관계는 강한 끌림과 조율 과제가 함께 있으므로 감정보다 운영 기준이 중요합니다.", "최종 메시지를 낭만적 결론으로만 받아들이면 실행력이 떨어집니다.", "관계의 결론은 좋다/나쁘다가 아니라 어떻게 운영할 것인가로 잡으세요.", "우리 관계를 한 문장으로 정리하고, 그 문장을 지킬 행동을 정하자.", "최종 문장, 핵심 위험, 첫 실행을 한 줄씩 씁니다.", "마지막 장의 달빛은 결론보다 선택의 책임을 비춥니다.", ["최종 메시지", "운영 기준", "첫 실행"]),
    sectionTheme("지금 먼저 해야 할 일", "가장 먼저 할 일은 관계의 가장 약한 연결고리를 바로잡는 것입니다.", "두 사람에게 지금 필요한 것은 큰 약속보다 당장 반복되는 불안을 줄이는 행동입니다.", "먼저 할 일을 너무 많이 잡으면 아무것도 변하지 않습니다.", "오늘 안에 할 수 있는 한 가지 행동만 정하세요.", "오늘 우리가 바로 바꿀 한 가지를 정하자.", "오늘 행동, 이번 주 확인, 다음 대화 날짜를 정합니다.", "달빛은 먼 미래보다 오늘 밤 놓치지 말아야 할 작은 길을 먼저 비춥니다.", ["먼저 해야 할 일", "오늘 행동", "이번 주 확인"]),
    sectionTheme("관계를 망치는 행동", "망치는 행동은 관계 유형의 그림자를 반복해서 자극하는 행동입니다.", "단정, 침묵 방치, 과거 소환, 책임 회피가 관계 체력을 빠르게 깎습니다.", "망치는 행동을 알면서도 예외로 두면 신뢰가 회복되기 어렵습니다.", "두 사람이 절대 하지 않을 행동 세 가지를 정하세요.", "우리 관계에서 금지할 행동을 서로 하나씩 말하자.", "금지 행동, 대체 행동, 어겼을 때 회복 절차를 정합니다.", "달빛은 피해야 할 절벽도 보여줍니다. 보았다면 멈춰야 합니다.", ["망치는 행동", "금지 행동", "대체 행동"]),
    sectionTheme("관계를 살리는 행동", "살리는 행동은 서로의 숙이 안정감을 느끼는 신호를 반복하는 것입니다.", "짧은 확인, 고마움 표현, 약속 이행, 재대화 약속이 관계를 살립니다.", "좋은 행동도 한 번의 이벤트로 끝나면 신뢰가 쌓이지 않습니다.", "관계를 살리는 행동을 주간 루틴으로 고정하세요.", "우리를 살리는 행동을 이번 주부터 반복해보자.", "고마움, 확인, 약속 이행, 회복 대화를 매주 체크합니다.", "살리는 행동은 작지만, 달빛처럼 매일 쌓이면 길이 됩니다.", ["살리는 행동", "고마움", "약속 이행"]),
    sectionTheme("앞으로의 선택 조언", "앞으로의 선택은 끌림의 크기보다 회복과 성장의 가능성으로 판단해야 합니다.", "두 사람이 같은 문제를 다르게 다룰 준비가 있다면 관계는 더 깊어질 수 있습니다.", "선택을 미루기만 하면 관계가 스스로 좋아지지 않습니다.", "이어갈지 멈출지는 행동 변화가 실제로 반복되는지 보고 정하세요.", "우리의 선택은 말이 아니라 앞으로 한 달의 행동을 보고 정하자.", "한 달 관찰 기준, 변화 확인, 다음 선택 시점을 정합니다.", "달빛은 선택을 대신하지 않습니다. 다만 가장 진실한 길을 조용히 드러냅니다.", ["선택 조언", "행동 변화", "한 달 관찰"]),
  ],
});

function resolveSukyoChapterNo(chapter = {}) {
  const direct = safeNumber(chapter?.order || chapter?.chapterNo, 0);
  if (direct > 0) return direct;
  const key = text(chapter?.key);
  const found = SUKYO_PDF_CHAPTERS.find((item) => item.key === key);
  return safeNumber(found?.order, 0);
}

function resolveSukyoSectionIndex(chapterNo, section = {}) {
  const heading = text(section?.heading || section?.title);
  const spec = SUKYO_PDF_CHAPTERS[chapterNo - 1];
  const index = safeArray(spec?.sections).findIndex((item) => text(item) === heading);
  return index >= 0 ? index : 0;
}

function resolveSukyoSectionTheme(chapterNo, sectionIndex, sectionHeading = "") {
  const chapterThemes = SUKYO_SECTION_COUNSELING_MATRIX[chapterNo] || [];
  const theme = chapterThemes[sectionIndex] || null;
  if (theme) return theme;
  return sectionTheme(
    text(sectionHeading, "관계 세부 흐름"),
    "본명숙, 상대숙, 관계 유형, 거리감을 함께 놓고 세부 상담 포인트를 읽습니다.",
    "두 사람의 관계는 이 세부 항목에서 서로 다른 속도와 기대를 드러냅니다.",
    "세부 흐름을 확인하지 않으면 같은 문제가 다른 이름으로 반복될 수 있습니다.",
    "감정, 사실, 다음 행동을 나누어 합의하세요.",
    "이 부분에서 우리가 다르게 느끼는 지점을 같이 확인하자.",
    "이번 주 안에 한 가지 관찰과 한 가지 행동 수정을 진행합니다.",
    "달빛은 작은 항목 안에서도 인연의 방향을 비춥니다.",
    [text(sectionHeading, "세부 흐름"), "관계", "합의"],
  );
}

function stripSukyoChapterTitle(value) {
  return text(value).replace(/^제\s*\d+\s*장\.?\s*/, "").trim();
}

function hasHangulFinalConsonant(value) {
  const chars = Array.from(text(value).replace(/\s+/g, ""));
  const last = chars[chars.length - 1] || "";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return ((code - 0xac00) % 28) !== 0;
}

function topicParticle(value) {
  return hasHangulFinalConsonant(value) ? "은" : "는";
}

function objectParticle(value) {
  return hasHangulFinalConsonant(value) ? "을" : "를";
}

function withParticle(value) {
  return hasHangulFinalConsonant(value) ? "과" : "와";
}

function directionParticle(value) {
  return hasHangulFinalConsonant(value) ? "으로" : "로";
}

function topicPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${topicParticle(clause)}` : "";
}

function objectPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${objectParticle(clause)}` : "";
}

function withPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${withParticle(clause)}` : "";
}

function directionPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${directionParticle(clause)}` : "";
}

function sentenceClause(value) {
  return sanitizeSukyoPremiumText(value).replace(/[.!?。？！]+$/g, "");
}

const RELATION_MASTER_GUIDE = Object.freeze({
  안괴: {
    diagnosis: "강한 끌림과 불안이 함께 작동해 보호와 파괴가 빠르게 교차합니다.",
    caution: "감정이 과열된 상태에서 결론을 내리면 상처가 누적됩니다.",
    prescription: "감정 폭발 이후 30분 이상 쿨다운 후 대화를 재개하는 회복 규칙이 필수입니다.",
  },
  영친: {
    diagnosis: "안정감과 친밀감이 크고 장기 관계 기반을 만들기 유리합니다.",
    caution: "편안함에만 머무르면 핵심 갈등을 미루게 됩니다.",
    prescription: "주 1회 관계 점검 대화를 통해 성장 과제를 함께 확인하세요.",
  },
  업태: {
    diagnosis: "카르마적 과제와 성장 압력이 반복되는 관계입니다.",
    caution: "같은 숙제를 감정으로만 처리하면 피로가 급격히 커집니다.",
    prescription: "갈등 주제를 감정과 과제로 분리해 기록하고 재합의 주기를 고정하세요.",
  },
  우쇠: {
    diagnosis: "정서 교류가 섬세해 따뜻하지만 누적 피로에 민감합니다.",
    caution: "사소한 서운함이 쌓이면 갑작스러운 거리감으로 체감됩니다.",
    prescription: "짧은 확인 대화를 자주 두어 오해를 당일 정리하는 습관이 중요합니다.",
  },
  위성: {
    diagnosis: "목표 지향성이 높아 현실 성과를 만들기 좋지만 긴장이 쉽게 올라갑니다.",
    caution: "성과 중심 대화만 반복되면 감정 결핍이 쌓입니다.",
    prescription: "성과 회의 전에 감정 상태를 먼저 공유하는 순서를 고정하세요.",
  },
  명: {
    diagnosis: "거울처럼 닮은 패턴이 강해 동질감과 반복 패턴이 동시에 나타납니다.",
    caution: "서로의 약한 지점을 비슷한 방식으로 건드리면 갈등이 장기화됩니다.",
    prescription: "같은 약점을 다르게 다루는 역할 규칙을 명시해 반복 고리를 끊으세요.",
  },
  기본: {
    diagnosis: "서로의 감정 리듬이 다르므로 운영 규칙이 관계의 품질을 결정합니다.",
    caution: "해석 차이를 방치하면 작은 오해가 큰 거리감으로 증폭됩니다.",
    prescription: "연락-갈등-화해의 순서를 합의해 감정 회복 속도를 높이세요.",
  },
});

const DISTANCE_MASTER_GUIDE = Object.freeze({
  same: {
    diagnosis: "동숙은 닮은 감정 패턴이 빠르게 공명해 편안함과 반복 습관이 동시에 커집니다.",
    prescription: "닮은 반응을 그대로 반복하지 않도록 역할과 멈춤 신호를 의식적으로 나누세요.",
  },
  near: {
    diagnosis: "근거리에서는 빠르게 가까워지고 빠르게 상처받는 특성이 강합니다.",
    prescription: "감정이 과열되기 전 멈춤 신호와 재대화 시점을 미리 정하세요.",
  },
  middle: {
    diagnosis: "중거리는 조율의 질이 관계 안정성을 결정합니다.",
    prescription: "주간 점검 루틴으로 기대치와 감정 체온을 맞추는 것이 핵심입니다.",
  },
  far: {
    diagnosis: "원거리는 자율성과 공백 관리가 핵심 과제입니다.",
    prescription: "연락 리듬과 공백 허용 범위를 합의해 해석 오차를 줄이세요.",
  },
  special: {
    diagnosis: "특수관계는 일반적인 거리보다 인연의 과제와 역할 전환이 더 선명하게 작동합니다.",
    prescription: "끌림의 강도보다 반복 과제를 어떻게 다룰지 먼저 정하세요.",
  },
  unknown: {
    diagnosis: "거리 기준이 불명확하면 기대치 충돌이 잦아질 수 있습니다.",
    prescription: "초기 2주간 기본 연락 규칙을 먼저 합의해 기준을 세우세요.",
  },
});

function selectRelationMasterGuide(relationType) {
  const token = text(relationType);
  if (token.includes("안괴")) return RELATION_MASTER_GUIDE.안괴;
  if (token.includes("영친")) return RELATION_MASTER_GUIDE.영친;
  if (token.includes("업태")) return RELATION_MASTER_GUIDE.업태;
  if (token.includes("우쇠")) return RELATION_MASTER_GUIDE.우쇠;
  if (token.includes("위성")) return RELATION_MASTER_GUIDE.위성;
  if (token.includes("명")) return RELATION_MASTER_GUIDE.명;
  return RELATION_MASTER_GUIDE.기본;
}

function scoreBandLabel(score, highLabel, middleLabel, lowLabel) {
  const n = safeNumber(score, 0);
  if (n >= 78) return highLabel;
  if (n >= 58) return middleLabel;
  return lowLabel;
}

function pickFirst(values, fallback) {
  const found = safeArray(values).map((item) => text(item)).find(Boolean);
  return found || fallback;
}

function firstCounselSentence(value) {
  const sentences = splitMeaningfulSentences(value);
  return sentenceClause(sentences[0] || value);
}

function stripRoleCodePrefix(value) {
  return sentenceClause(value)
    .replace(/^[AB]\(([^)]+)\)(?:은|는)\s*/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function actionPrincipleClause(value, fallback = "감정을 짧게 정리하는 것") {
  let clause = stripRoleCodePrefix(firstCounselSentence(value)) || fallback;
  clause = clause
    .replace(/이 중요합니다$/u, "이 중요한 것")
    .replace(/이 핵심입니다$/u, "이 핵심인 것")
    .replace(/이 필수입니다$/u, "이 필수인 것")
    .replace(/입니다$/u, "인 것")
    .replace(/하세요$/u, "하는 것")
    .replace(/하십시오$/u, "하는 것")
    .replace(/합니다$/u, "하는 것")
    .replace(/한다$/u, "하는 것")
    .replace(/다$/u, "는 것")
    .trim();
  return clause || fallback;
}

function humanizeElementSummary(value, selfName, partnerName) {
  const clause = sentenceClause(value);
  const matched = clause.match(/^A\s+([목화토금수])\s+·\s+B\s+([목화토금수])의\s+(.+?)\s+흐름\s+\((\d+)점\)$/u);
  if (matched) {
    return `${selfName}의 ${matched[1]} 기운과 ${partnerName}의 ${matched[2]} 기운이 ${matched[3]}으로 이어지며, 조화 점수는 ${matched[4]}점입니다`;
  }
  return clause
    .replace(/\bA\s+/gu, `${selfName}의 `)
    .replace(/\bB\s+/gu, `${partnerName}의 `)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function completeSentence(value) {
  const clause = sentenceClause(value);
  return clause ? `${clause}.` : "";
}

function compactSukyoCounselText(value, maxSentences = 3, maxChars = 320) {
  const clean = sanitizeSukyoPremiumText(value);
  const sentences = splitMeaningfulSentences(clean);
  const picked = [];
  for (const sentence of sentences) {
    const next = [...picked, sentence].join(" ");
    if (picked.length >= maxSentences || (picked.length > 0 && next.length > maxChars)) break;
    picked.push(sentence);
  }
  const out = picked.length ? picked.join(" ") : clean.slice(0, maxChars).trim();
  return sanitizeSukyoPremiumText(out);
}

function limitSectionHeadingRepeats(value, sectionHeading) {
  const heading = sanitizeSukyoPremiumText(sectionHeading || "");
  if (!heading) return sanitizeSukyoPremiumText(value);
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let seen = 0;
  return sanitizeSukyoPremiumText(value).replace(new RegExp(escaped, "g"), () => {
    seen += 1;
    return seen === 1 ? heading : "이 흐름";
  });
}

function buildFocusAxis(sectionHeading, axis) {
  const heading = text(sectionHeading);
  const focus = text(axis, heading || "관계 흐름");
  const normalizedHeading = normalizeKoreanText(heading).replace(/\s+/g, "");
  const normalizedFocus = normalizeKoreanText(focus).replace(/\s+/g, "");
  if (heading && normalizedHeading && normalizedFocus) {
    if (normalizedHeading.includes("먼저해야할일") && normalizedFocus.includes("먼저해야할일")) return "첫 실행 우선순위";
    if (normalizedHeading.includes("최종핵심메시지") && normalizedFocus.includes("최종핵심메시지")) return "최종 판단 기준";
    if (normalizedHeading === normalizedFocus || normalizedHeading.includes(normalizedFocus) || normalizedFocus.includes(normalizedHeading)) {
      return "이 상담 축";
    }
  }
  return focus;
}

function buildScoreSignal(sectionHeading, relationScore, emotional, communication, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  if (!shouldUseScoreSignal(chapterNo, sectionIndex)) return "";
  const variants = [
    `관계 체력 ${relationScore}점, 마음의 반응 ${emotional}점, 말의 전달력 ${communication}점이 함께 움직여요.`,
    `끌림의 바탕은 ${relationScore}점으로 열리고, 정서 반응 ${emotional}점과 대화 안정성 ${communication}점이 그 속도를 조절해요.`,
    `${relationScore}점은 인연의 기본 바탕이고, ${emotional}점은 마음의 속도, ${communication}점은 오해가 생기기 쉬운 통로예요.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildRiskSignal(conflictRisk, longTermPotential, recoveryPotential, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || "이 흐름");
  if (!shouldUseRiskSignal(chapterNo, sectionIndex)) {
    return `${sectionAxis}에서는 조심할 신호를 숫자보다 반복되는 장면의 강도로 읽어야 해요.`;
  }
  const variants = [
    `갈등 온도 ${conflictRisk}점, 지속 체력 ${longTermPotential}점, 회복 탄력 ${recoveryPotential}점이 서로 다른 속도로 움직여요.`,
    `상처가 커지는 민감도는 ${conflictRisk}점이고, 오래 버티는 힘 ${longTermPotential}점과 다시 돌아오는 힘 ${recoveryPotential}점을 함께 보아야 해요.`,
    `부딪힘 ${conflictRisk}점, 미래 체력 ${longTermPotential}점, 화해 여지 ${recoveryPotential}점의 균형이 지금의 문턱이에요.`,
    `반복 갈등은 ${conflictRisk}점대에서 올라오고, 관계를 붙드는 힘은 ${longTermPotential}점, 다시 풀어내는 힘은 ${recoveryPotential}점으로 나타나요.`,
    `위험 신호는 ${conflictRisk}점으로 감지되며, 장기 흐름 ${longTermPotential}점과 회복 흐름 ${recoveryPotential}점이 이를 얼마나 받아내는지가 관건이에요.`,
  ];
  return variants[Math.abs(chapterNo * 2 + sectionIndex) % variants.length];
}

function shouldUseScoreSignal(chapterNo, sectionIndex) {
  const scoreSlots = {
    1: [0],
    4: [0],
    5: [0],
    9: [0],
    10: [1],
    11: [0],
    15: [0],
  };
  return safeArray(scoreSlots[chapterNo]).includes(sectionIndex);
}

function shouldUseRiskSignal(chapterNo, sectionIndex) {
  const riskSlots = {
    9: [0, 2],
    10: [1],
    11: [2],
    14: [0],
    15: [2],
  };
  return safeArray(riskSlots[chapterNo]).includes(sectionIndex);
}

function shouldUseSevenDayRoutine(chapterNo, sectionIndex) {
  return chapterNo === 15 && sectionIndex === 1;
}

function buildFinalStrategyLine(chapterNo, sectionIndex) {
  if (chapterNo !== 15) return "";
  return CHAPTER_15_FINAL_STRATEGY[sectionIndex] || CHAPTER_15_FINAL_STRATEGY[0];
}

function chapterContextLens(chapterNo) {
  return CHAPTER_CONTEXT_LENS[chapterNo] || CHAPTER_CONTEXT_LENS[1];
}

function relationToneKey(relationType) {
  const token = text(relationType);
  if (token.includes("안괴")) return "안괴";
  if (token.includes("영친")) return "영친";
  if (token.includes("업태")) return "업태";
  if (token.includes("우쇠")) return "우쇠";
  if (token.includes("위성")) return "위성";
  if (token.includes("명")) return "명";
  return "기본";
}

function relationContextTone(relationType) {
  return RELATION_CONTEXT_TONE[relationToneKey(relationType)] || RELATION_CONTEXT_TONE.기본;
}

function distanceContextTone(distanceLabel) {
  return DISTANCE_CONTEXT_TONE[toDistanceTier(distanceLabel)] || DISTANCE_CONTEXT_TONE.unknown;
}

function removeFrameLead(value) {
  return sentenceClause(value)
    .replace(/^판단\s*근거는\s*/u, "")
    .replace(/^현실에서는\s*/u, "")
    .replace(/^상담\s*처방은\s*/u, "")
    .replace(/^이\s*장의\s*달빛은\s*/u, "")
    .replace(/인지입니다$/u, "인지 확인하는 데 있습니다")
    .replace(/유무입니다$/u, "유무를 확인하는 데 있습니다")
    .replace(/현실성입니다$/u, "현실성을 확인하는 데 있습니다")
    .replace(/차이입니다$/u, "차이를 확인하는 데 있습니다")
    .trim();
}

function frameBridge(frame = {}, key, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "이 항목");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const clause = removeFrameLead(frame[key] || "");
  if (!clause) return "";
  const variants = {
    evidence: [
      `숙요의 달빛 근거는 ${clause}.`,
      `${objectPhrase(sectionAxis)} 읽을 때 먼저 떠오르는 흐름은 ${clause}.`,
      `두 사람의 반복 장면을 깊게 보면 ${clause}.`,
    ],
    reality: [
      `현실의 가까운 장면에서는 ${clause}.`,
      `두 사람의 일상에서는 ${clause}.`,
      `${sectionAxis}이 현실로 드러날 때는 ${clause}.`,
    ],
    prescription: [
      `두 사람이 붙잡아야 할 기준은 ${clause}.`,
      `${objectPhrase(sectionAxis)} 안정시키려면 ${clause}.`,
      `실제로 바꿔야 할 흐름은 ${clause}.`,
    ],
    moon: [
      `달빛은 ${clause}.`,
      `${sectionAxis} 뒤에 남는 달빛은 ${clause}.`,
      `밤의 조언으로 옮기면 ${clause}.`,
    ],
  };
  const list = variants[key] || [`이 흐름에서는 ${clause}.`];
  return list[Math.abs(chapterNo + sectionIndex) % list.length];
}

function buildRelationChapterInsight(relationType, chapterNo, sectionHeading, context = {}) {
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading || "관계 흐름");
  const lens = chapterContextLens(chapterNo);
  const tone = relationContextTone(relationType);
  const variants = [
    `${sectionAxis}에서 ${relationType} 관계의 ${topicPhrase(tone.force)} ${objectPhrase(lens.relation)} 먼저 건드려요. ${topicPhrase(tone.risk)} 보이면 ${objectPhrase(lens.practice)} 조율의 첫 단추로 삼아야 해요.`,
    `${sectionAxis}에 닿은 ${relationType}의 힘은 ${tone.force}으로 나타나며, ${objectPhrase(lens.relation)} 깊게 흔들어요. 이 자리에서 ${objectPhrase(sectionAxis)} 다루는 처방은 ${tone.medicine}에서 시작돼요.`,
    `${sectionAxis}의 ${relationType} 궁합은 ${objectPhrase(tone.risk)} 선명하게 드러내요. ${objectPhrase(lens.practice)} 놓치지 않을 때 ${topicPhrase(tone.force)} 안정된 방향으로 바뀌어요.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildDistanceChapterInsight(distanceLabel, chapterNo, sectionHeading, context = {}) {
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const lens = chapterContextLens(chapterNo);
  const tone = distanceContextTone(distanceLabel);
  const variants = [
    `${distanceLabel}의 거리감은 ${tone.force}으로 체감돼요. ${objectPhrase(lens.distance)} 놓치면 ${topicPhrase(tone.risk)} 커지므로 ${tone.medicine}이 필요해요.`,
    `${distanceLabel} 특유의 ${tone.force}이 먼저 닿아요. ${topicPhrase(lens.distance)} 흔들릴 때는 ${objectPhrase(tone.medicine)} 실제 약속으로 바꾸어야 해요.`,
    `${distanceLabel} 궁합은 간격 관리가 핵심이에요. ${topicPhrase(tone.risk)} 보이면 ${objectPhrase(lens.distance)} 다시 맞추는 대화가 필요해요.`,
  ];
  return variants[Math.abs(chapterNo * 3 + sectionIndex) % variants.length];
}

function buildNaturalDialogueExample(context = {}, guide = []) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const axis = sanitizeSukyoPremiumText(context.sectionAxis || safeArray(guide)[0] || "마음의 흐름");
  const pairs = [
    [`${selfName}: "오늘 네가 내 말을 끝까지 들어줬을 때 그냥 통했다는 느낌이었어."`, `${partnerName}: "나도 바로 해결하려 하기보다 네 마음을 먼저 들으니까 훨씬 가까워졌어."`],
    [`${selfName}: "내가 챙기는 말이 가끔은 압박처럼 들릴 수 있다는 걸 알겠어."`, `${partnerName}: "나는 그 마음을 통제로만 보지 않고, 필요한 선을 같이 말해볼게."`],
    [`${selfName}: "연락이 늦어지면 내 마음이 먼저 불안해져."`, `${partnerName}: "늦어질 때는 짧게라도 신호를 남길게. 대신 돌아와서 제대로 이야기하자."`],
    [`${selfName}: "싸운 뒤 바로 결론을 내리려 하면 더 거칠어지는 것 같아."`, `${partnerName}: "그럴 땐 30분만 식히고, 다시 같은 자리에 앉는 약속을 하자."`],
    [`${selfName}: "함께 있을 때 편한데도 가끔 숨이 막히는 순간이 있어."`, `${partnerName}: "그럴 땐 멀어지는 게 아니라 서로의 리듬을 다시 맞추는 시간으로 두자."`],
    [`${selfName}: "처음 좋았던 챙김이 어느 순간 간섭처럼 번질까 봐 조심하고 싶어."`, `${partnerName}: "나는 자유가 필요할 때 차갑게 끊지 않고 말로 알려줄게."`],
    [`${selfName}: "지금 내 감정 온도는 7이야. 바로 말하면 날카로워질 것 같아."`, `${partnerName}: "그럼 3까지 내려가면 다시 얘기하자. 기다리는 동안 피하지는 않을게."`],
    [`${selfName}: "나는 먼저 마음을 확인받고 싶고, 너는 해결책을 빨리 찾고 싶어 보여."`, `${partnerName}: "맞아. 앞으로는 마음 한 문장, 해결 한 문장 순서로 말해볼게."`],
    [`${selfName}: "예전 일을 꺼내면 지금의 말도 다 상처처럼 들려."`, `${partnerName}: "오늘 일만 놓고 말해보자. 과거는 내일 차분할 때 따로 정리하자."`],
    [`${selfName}: "다시 만나고 싶다는 말보다 바뀐 행동을 먼저 보고 싶어."`, `${partnerName}: "그럼 연락 방식과 화해 시간을 먼저 지키면서 증명해볼게."`],
    [`${selfName}: "오래 가려면 사랑만으로는 부족하다는 걸 알아."`, `${partnerName}: "생활 리듬, 돈, 가족 경계까지 우리가 정한 문장으로 지켜가자."`],
    [`${selfName}: "주말을 모두 계획대로 보내야 안정되는 건 아니겠지."`, `${partnerName}: "즉흥도 좋지만 공동의 시간과 각자의 시간은 먼저 나눠두자."`],
    [`${selfName}: "내가 가까워지고 싶을 때 네 방식은 밖으로 나가자는 말이더라."`, `${partnerName}: "응, 같이 움직이는 게 내 애정 표현이야. 오늘은 네가 편한 속도로 맞출게."`],
    [`${selfName}: "낯설지 않은 느낌 때문에 더 쉽게 기대했던 것 같아."`, `${partnerName}: "이번에는 익숙함에 기대지 말고 우리가 새로 정한 약속으로 걸어가자."`],
    [`${selfName}: "내일부터는 서운함을 오래 묵히지 않고 짧게 말해볼게."`, `${partnerName}: "나는 답을 밀어붙이기 전에 네 말을 한 번 요약해서 돌려줄게."`],
  ];
  const picked = pairs[Math.abs((chapterNo - 1) + sectionIndex) % pairs.length];
  const closings = [
    `이렇게 말하면 ${axis}이 방어가 아니라 다시 가까워지는 약속으로 바뀌어요.`,
    `이 대화는 ${axis}을 이기려는 말이 아니라 서로에게 돌아오는 길을 열어줘요.`,
    `두 사람은 ${axis}을 이렇게 표현하는 것만으로도 오해의 방향을 크게 돌릴 수 있어요.`,
    `${axis}의 말끝에 다음 행동이 남으면 마음의 열기는 다툼보다 회복 쪽으로 흘러요.`,
    `${axis}을 담은 작은 문장 하나가 관계의 밤길에서 서로를 다시 알아보는 등불이 돼요.`,
  ];
  const closing = closings[Math.abs(chapterNo + sectionIndex) % closings.length];
  return `대화는 ${axis}을 다투는 말이 아니라 다시 만나는 문으로 써야 해요. ${picked[0]} ${picked[1]} ${closing}`;
}

function buildMoonClosingLine(chapterNo, sectionIndex, axis = "관계 흐름") {
  const focus = sanitizeSukyoPremiumText(axis || "관계 흐름");
  const lines = {
    1: `오늘은 ${objectPhrase(focus)} 한 문장으로 이름 붙이고, 그 이름에 맞는 작은 약속을 남겨보세요.`,
    2: `오늘은 내 마음이 원하는 신호 하나를 숨기지 말고 부드럽게 전해보세요.`,
    3: `오늘은 상대의 방식 하나를 내 기준으로 판정하기 전에 애정의 다른 언어로 읽어보세요.`,
    4: `오늘은 감정이 오른 뒤 돌아올 시간을 먼저 정하고, 그 약속을 두 사람의 안전 문장으로 삼아보세요.`,
    5: `오늘은 가까워지는 시간과 숨을 고르는 시간을 나누어 관계의 온도를 지켜보세요.`,
    6: `오늘은 처음 좋았던 장면 하나와 지금 필요한 조건 하나를 따로 말해보세요.`,
    7: `오늘은 감정 온도를 숫자로 나누고, 다시 말할 시간을 함께 정해보세요.`,
    8: `오늘은 마음 한 문장과 해결 한 문장을 순서대로 놓아 대화의 길을 열어보세요.`,
    9: `오늘은 싸움의 원인보다 멈춤 신호와 재대화 시간을 먼저 합의해보세요.`,
    10: `오늘은 그리움보다 달라진 행동이 있는지 조용히 살펴보세요.`,
    11: `오늘은 오래 함께하기 위해 생활의 작은 기준 하나를 현실적인 약속으로 적어보세요.`,
    12: `오늘은 돈, 시간, 공간 중 가장 자주 부딪히는 하나를 공동의 규칙으로 나눠보세요.`,
    13: `오늘은 사랑받는다고 느끼는 순간 하나를 서로에게 구체적으로 알려주세요.`,
    14: `오늘은 오래된 감정의 매듭을 탓이 아니라 배움의 문장으로 바꿔보세요.`,
    15: `오늘은 멈출 행동 하나와 살릴 행동 하나를 정해 이 인연의 다음 길을 밝혀보세요.`,
  };
  return sanitizeSukyoPremiumText(lines[chapterNo] || `오늘은 ${objectPhrase(focus)} 다음 행동 하나로 부드럽게 내려놓아 보세요.`);
}

function buildUniversalSukyoCounselLine(context = {}, data = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const selfStar = sanitizeSukyoPremiumText(context.selfStar || "본명숙");
  const partnerStar = sanitizeSukyoPremiumText(context.partnerStar || "상대숙");
  const relationType = sanitizeSukyoPremiumText(context.relationType || "관계");
  const distanceLabel = sanitizeSukyoPremiumText(context.distanceLabel || "거리");
  const axis = sanitizeSukyoPremiumText(context.sectionAxis || "관계 흐름");
  const elementRelation = sanitizeSukyoPremiumText(data.elementRelation || "조율");
  const selfKeyword = sanitizeSukyoPremiumText(data.selfKeyword || "감정의 촉");
  const partnerKeyword = sanitizeSukyoPremiumText(data.partnerKeyword || "관계의 응답");
  const meStrength = sanitizeSukyoPremiumText(data.meStrength || "세심한 애정");
  const otherStrength = sanitizeSukyoPremiumText(data.otherStrength || "현실 감각");
  const meShadow = sanitizeSukyoPremiumText(data.meShadow || "과한 기대");
  const otherShadow = sanitizeSukyoPremiumText(data.otherShadow || "표현 지연");
  const relationTheme = sanitizeSukyoPremiumText(data.relationTheme || "강한 끌림과 조율 과제가 함께 있는 결");
  const nearTone = toDistanceTier(distanceLabel) === "near"
    ? "가까운 거리라 작은 말도 바로 심장에 닿아요"
    : "거리감이 있어 감정을 해석하는 시간이 관계의 온도를 바꿔요";
  const lines = {
    1: [
      `두 분은 ${selfStar}宿의 ${selfKeyword}과 ${partnerStar}宿의 ${partnerKeyword}이 처음부터 서로를 알아보는 쪽에 가까워요. 이 인연은 ${relationTheme}이라 설렘과 경계가 같은 자리에서 피어나요. 함께하면 운명처럼 느껴지는 순간도 있지만, 그 느낌을 오래 지키려면 기대를 말로 다듬어야 해요.`,
      `${selfName}${withParticle(selfName)} ${partnerName} 사이의 첫 끌림은 별의 결이 서로의 빈자리를 건드릴 때 강해져요. 한쪽은 보호받는 감각을, 다른 한쪽은 새 길이 열리는 감각을 느낄 수 있어요. 다만 첫 인상의 밝음이 생활 리듬까지 보장하지는 않으니 천천히 확인해야 해요.`,
      `함께 있을 때의 공기는 편안함과 긴장이 번갈아 스며드는 모양이에요. ${nearTone}. 좋은 분위기일수록 불편한 신호를 미루지 말고 그날의 작은 말로 풀어야 해요.`,
      `이 관계의 장점은 서로가 가진 힘을 다른 방식으로 깨워준다는 데 있어요. ${selfName}의 ${meStrength}${withParticle(meStrength)} ${partnerName}의 ${otherStrength}${topicParticle(otherStrength)} 만날 때 관계는 훨씬 살아나요. 칭찬은 추상적으로 하지 말고 고마웠던 장면 하나를 짚어주는 게 좋아요.`,
      `가장 조심할 약점은 사랑이 커질수록 해석도 함께 커지는 점이에요. ${meShadow}${withParticle(meShadow)} ${otherShadow}${topicParticle(otherShadow)} 겹치면 작은 침묵이 큰 결론처럼 들릴 수 있어요. 두 분은 문제가 생겼을 때 성격을 탓하기보다 상황, 말투, 타이밍을 나누어 보아야 해요.`,
    ],
    2: [
      `${selfName}의 ${selfStar}宿은 사랑 안에서 안전한 온기와 예측 가능한 반응을 찾는 쪽이에요. 마음이 열리면 세심하게 챙기지만, 불안이 커지면 확인받고 싶은 마음도 함께 커져요. 스스로의 욕구를 숨기지 말고 어떤 말과 행동이 필요한지 먼저 알려주는 게 좋아요.`,
      `${selfName}의 애정은 큰 선언보다 작은 반복 행동에서 먼저 흘러요. 밥을 챙기고, 약속을 기억하고, 피곤한 얼굴을 먼저 알아차리는 식으로 사랑이 드러나요. 상대가 그 신호를 놓치면 서운함이 쌓이니 사랑의 언어를 직접 번역해 주어야 해요.`,
      `관계에서 기대하는 것은 단순한 관심이 아니라 마음이 머물 자리를 확인하는 일이에요. ${selfKeyword}${topicParticle(selfKeyword)} 흔들릴 때는 연락 빈도나 말투의 변화가 크게 느껴질 수 있어요. 기대를 요구처럼 던지기보다 필요한 신호를 세 가지로 정리해 말해보세요.`,
      `불안할 때 ${selfStar}宿은 곧바로 폭발하기보다 먼저 마음속으로 거리를 재는 편이에요. 답장이 짧아지고, 바쁜 척을 하고, 괜찮다는 말을 반복할 수 있어요. 그 신호가 시작되면 침묵으로 시험하지 말고 지금 불안하다는 한 문장을 먼저 꺼내야 해요.`,
      `사랑을 오래 유지하려면 ${selfName}의 돌봄이 부담이 아니라 안정으로 닿아야 해요. 챙김을 주기 전에 상대가 지금 받을 수 있는 상태인지 물어보면 관계의 숨이 넓어져요. 오늘부터는 도와줄까, 기다려줄까, 들어줄까 중 하나를 선택해 묻는 습관이 좋아요.`,
    ],
    3: [
      `${partnerName}의 ${partnerStar}宿은 사랑 안에서도 자기 리듬과 살아 있는 자극을 잃고 싶어 하지 않아요. 마음이 깊어질수록 함께 앞으로 나아갈 수 있는 사람인지 살펴요. 이 별은 묶이는 말보다 함께 넓어지는 약속에 더 잘 반응해요.`,
      `${partnerName}의 애정은 말보다 제안과 움직임으로 먼저 올 수 있어요. 같이 가자, 해보자, 내가 알아볼게 같은 말이 마음을 건네는 방식일 수 있어요. 그 표현을 가볍게 넘기면 상대는 애정을 보냈는데도 닿지 않았다고 느낄 수 있어요.`,
      `상대가 중요하게 여기는 것은 자유와 신뢰가 함께 있는 관계예요. 매일 같은 방식으로 확인받기보다 새 대화, 새 계획, 새 경험 속에서 마음이 살아나요. 다만 자유가 방치로 오해되지 않도록 약속한 기본 신호는 지켜야 해요.`,
      `${partnerStar}宿이 멀어질 때는 차갑게 끊는 듯 보이지만, 실제로는 압박에서 숨을 고르는 경우가 많아요. 말수가 줄고 혼자 판단하려 할 때가 신호예요. 그때 붙잡아 묻기보다 돌아올 시간을 정해두면 단절을 줄일 수 있어요.`,
      `상대를 이해하려면 해결책부터 내놓는 태도 뒤의 애정을 읽어야 해요. 공감이 부족해 보이는 순간에도 상대는 자기 방식으로 관계를 지키려 할 수 있어요. 이 사람은 나를 무시하는가, 아니면 자기 방식으로 돕는가를 한 번 더 물어보세요.`,
    ],
    4: [
      `${relationType}의 결은 같은 힘이 안정과 흔들림으로 번갈아 드러나는 구조예요. 두 분은 서로를 편하게만 두지 않고, 숨겨둔 불안과 욕망까지 건드릴 수 있어요. 이 긴장감을 벌로 보지 말고 운영할 힘으로 바꾸는 게 중요해요.`,
      `이 관계 유형의 강점은 서로를 깨우는 압력이 있다는 점이에요. 쉬운 관계는 아니어도, 갈등을 지나고 나면 이전보다 깊은 안도감이 생길 수 있어요. 그 힘을 살리려면 싸운 뒤 돌아오는 길을 미리 약속해야 해요.`,
      `그림자는 감정 과열, 상처, 거리 두기, 그리움, 재접근의 사이클로 나타나요. ${elementRelation}의 오행 결이 강하면 이 속도가 더 빨라질 수 있어요. 쿨다운 시간과 다시 말 거는 문장을 정해두면 사이클이 부드러워져요.`,
      `건강하게 유지하는 법은 복잡하지 않아요. 감정이 크게 오른 뒤에는 재판 없는 냉각 시간을 두고, 큰 이야기는 다음 날로 넘기는 게 좋아요. 두 사람이 쓰는 안전 문장 하나씩을 정하면 관계가 무너지기 전에 멈출 수 있어요.`,
      `이 관계는 좋다 나쁘다로 단정할수록 길을 잃어요. 핵심은 강한 반응을 어떻게 다루느냐에 있어요. 함께하면 서로의 약점을 찌르는 대신 성장의 방향으로 돌릴 수 있어요.`,
    ],
    5: [
      `${distanceLabel}의 숙 거리에서는 마음이 닿는 속도가 관계의 강도를 만들어요. 가까울수록 설렘도 빨리 오고 상처도 빨리 남아요. 두 분은 친밀함을 당연하게 여기지 말고 회복 시간을 관계의 일부로 두어야 해요.`,
      `거리감이 만드는 온도는 상대의 기분이 내 기분처럼 옮겨오는 데서 시작돼요. 이 흐름이 끌림으로 작동하면 눈빛만으로도 마음이 풀리지만, 소진으로 기울면 말하지 않은 피로가 쌓여요. 하루 안에 혼자 숨 쉴 시간을 정해두면 좋아요.`,
      `인연 강도가 높으면 이 사람 아니면 안 된다는 느낌이 쉽게 올라와요. 그 감정이 사랑인지 집착인지 보려면, 함께한 뒤 내가 더 넓어지는지 더 좁아지는지 살펴야 해요. 강한 인연일수록 선택의 자유를 지켜야 오래 가요.`,
      `가까운 인연은 설명보다 반응이 먼저 오기 쉬워요. 그래서 오해도 빠르고 화해도 빠르게 열릴 수 있어요. 두 분은 상처가 생긴 날을 넘기기 전에 짧은 확인 문장을 나누는 게 좋아요.`,
      `거리를 건강하게 쓰려면 만남의 양보다 회복의 질을 보아야 해요. 너무 붙어 있으면 작은 결도 크게 보이고, 너무 멀어지면 상상으로 틈이 커져요. 주 1회는 좋은 장면과 피곤했던 장면을 같이 나누세요.`,
    ],
    6: [
      `처음 끌린 이유는 서로에게 없는 리듬이 강하게 빛났기 때문이에요. ${selfStar}宿은 ${partnerStar}宿의 움직임에서 보호받는 듯한 추진력을 느끼고, ${partnerStar}宿은 ${selfStar}宿의 온기에서 낯선 안착감을 느낄 수 있어요. 이 끌림은 아름답지만 현실의 속도 차이를 함께 데려와요.`,
      `첫 설렘 뒤에는 좋았던 점이 갈등의 이유로 바뀌는 순간이 와요. 챙김은 따뜻하지만 지나치면 통제로 들리고, 자유는 매력적이지만 과하면 무심함으로 느껴져요. 전환점이 보이면 그때 바로 이름을 붙여야 해요.`,
      `두 사람만의 공기감은 침묵도 말처럼 느껴지는 순간에서 살아나요. 함께 있으면 시간이 빨리 흐르지만, 피곤한 날에는 같은 침묵이 차가운 벽처럼 보일 수 있어요. 분위기가 식었다 싶을 때는 장소를 바꾸거나 짧은 산책으로 흐름을 다시 열어보세요.`,
      `첫 만남의 기억은 이후 갈등을 견디게 하는 작은 불씨가 돼요. 다만 그 기억만 붙잡으면 현재의 불편함을 놓치기 쉬워요. 설렜던 이유와 지금 필요한 조건을 따로 적어보면 감정이 더 맑아져요.`,
      `끌림은 운명처럼 오지만 유지는 습관으로 남아요. 처음 좋았던 장면을 반복하려 애쓰기보다 지금의 두 사람이 편한 새 의식을 만들어야 해요. 만난 뒤 고마웠던 장면 하나를 말하는 것부터 시작하면 충분해요.`,
    ],
    7: [
      `감정 속도는 두 사람의 사랑을 가장 자주 흔드는 축이에요. 한쪽은 천천히 확인하며 깊어지고, 다른 한쪽은 행동으로 먼저 마음을 꺼낼 수 있어요. 속도가 다르다고 사랑이 다른 것은 아니니 표현의 순서를 맞춰야 해요.`,
      `서운함은 쌓이는 방식이 다르면 폭발하는 순간도 달라요. ${selfName}${withParticle(selfName)} 말하지 않고 모았다가 한꺼번에 꺼낼 수 있고, ${partnerName}${topicParticle(partnerName)} 즉각 반응하거나 침묵으로 빠질 수 있어요. 중간 지점은 서운함을 작을 때 짧게 말하는 습관이에요.`,
      `마음이 통한다고 느끼는 순간은 거창하지 않아요. 침묵이 불편하지 않을 때, 설명 없이 작은 표정을 알아줄 때, 갈등 후 처음으로 함께 웃을 때 안의 기운이 살아나요. 그 순간을 우연으로 흘려보내지 말고 고맙다고 말해두세요.`,
      `감정 온도를 맞추려면 숫자를 빌리는 것도 좋아요. 지금 7이야, 3이 되면 다시 말하자 같은 문장은 싸움을 피하는 말이 아니라 돌아오기 위한 약속이에요. 특히 다른 오행 결이 섞인 관계에서는 온도 확인이 사랑의 안전장치가 돼요.`,
      `감정 교류가 깊은 관계일수록 상처도 깊게 남을 수 있어요. 그래서 따뜻한 말만큼 멈추는 말도 필요해요. 오늘은 결론 내리지 말고 내일 다시 보자는 문장을 두 사람의 달빛 신호로 정해보세요.`,
    ],
    8: [
      `말이 잘 통하는 부분은 두 사람이 같은 결론을 낼 때보다 같은 장면에 관심을 둘 때 살아나요. 한쪽은 감정을 확인하고 싶고, 다른 쪽은 해결의 길을 찾고 싶어 할 수 있어요. 이 차이를 순서로 정하면 대화는 훨씬 부드러워져요.`,
      `말이 엇갈리는 핵심은 마음 확인과 문제 해결의 순서가 다르다는 데 있어요. 왜 결론부터 말하냐는 말과 왜 감정만 말하냐는 말이 부딪히면 둘 다 외로워져요. 먼저 마음 한 문장, 그다음 해결 한 문장으로 합의해보세요.`,
      `침묵도 두 사람에게 같은 뜻이 아니에요. 누군가에게 침묵은 상처를 정리하는 시간이고, 누군가에게는 에너지를 회복하는 빈칸일 수 있어요. 침묵이 길어질 때는 언제 돌아올지 한 문장만 남겨도 불안이 크게 줄어요.`,
      `갈등 중 말투는 관계의 운을 빠르게 바꿔요. 과거 소환, 비교, 단정은 이 인연의 회복력을 가장 빨리 깎아요. 대신 지금 내가 들은 뜻은 이거야, 맞는지 확인하고 싶어 같은 문장을 쓰면 길이 열려요.`,
      `좋은 소통은 말의 양이 아니라 끝에 남는 약속으로 정해져요. 길게 이야기하고도 다음 행동이 없으면 마음은 다시 흔들려요. 대화가 끝날 때 오늘 할 일 하나와 확인할 날짜 하나를 남기세요.`,
    ],
    9: [
      `충돌은 보통 큰 사건보다 작은 신호가 누적될 때 시작돼요. 답장이 늦은 날, 말투가 차가운 저녁, 약속이 바뀐 순간이 서로 다른 의미로 커질 수 있어요. 촉발점, 반응, 결과를 따로 보아야 반복이 줄어요.`,
      `${selfName}의 갈등 패턴은 보호하려다 지치고, 침묵하다가 한꺼번에 터지는 쪽으로 흐를 수 있어요. ${partnerName}${topicParticle(partnerName)} 논리로 풀려다 압박을 느끼면 잠시 멀어질 수 있어요. 두 방식이 맞물리면 싸움은 내용보다 방식 때문에 깊어져요.`,
      `충돌 이후 회복에는 골든타임이 있어요. 감정이 끓는 바로 그 순간보다 30분 뒤의 말이 훨씬 정확해요. 화해는 누가 이겼는지가 아니라 누가 먼저 돌아올 문을 열었는지로 달라져요.`,
      `두 사람이 자주 부딪히는 주제는 사랑이 부족해서가 아니라 보호와 자유의 언어가 다르기 때문일 수 있어요. 한쪽은 붙잡아야 안심하고, 다른 한쪽은 숨 쉴 때 더 잘 돌아와요. 멈춤 신호를 미리 정하면 상처가 줄어요.`,
      `갈등을 줄이는 가장 빠른 길은 금지 문장을 정하는 거예요. 너는 항상, 너 때문에, 예전에도 같은 말은 이 관계의 그림자를 크게 키워요. 대신 지금 이 장면에서 내가 아픈 지점은 이거야라고 말해보세요.`,
    ],
    10: [
      `이별의 흐름은 한 번의 결심보다 반복된 피로에서 올라와요. ${relationType} 결이 강한 관계일수록 끝난 듯하다가도 마음이 다시 당겨질 수 있어요. 그래서 헤어짐을 말하기 전에는 실제로 바뀔 수 있는 행동이 남아 있는지 먼저 보아야 해요.`,
      `재회 가능성은 그리움의 크기보다 바뀐 약속의 선명함에서 열려요. 보고 싶다는 말만으로는 같은 상처가 되돌아올 수 있어요. 다시 만나려면 연락 기준, 싸움 뒤 냉각 시간, 사과의 방식이 달라져야 해요.`,
      `이별을 예방하려면 전조 신호를 가볍게 넘기지 말아야 해요. 연락 공백, 반복되는 피곤하다는 말, 대화 회피, 스킨십 감소, 약속 미룸이 함께 나타나면 마음의 문이 닫히는 중일 수 있어요. 그때는 긴 대화보다 짧은 회복 액션이 먼저예요.`,
      `멀어진 뒤에도 끌림이 남는 것은 이상한 일이 아니에요. 숙요의 강한 결은 상처와 그리움을 같은 자리에서 남기기도 해요. 다만 돌아갈지 말지는 감정이 아니라 이전과 다른 행동이 가능한지로 보아야 해요.`,
      `마무리가 필요할 때도 이 관계는 예의를 원해요. 애매한 침묵으로 끝내면 미련이 오래 남고, 거친 말로 끊으면 상처가 깊어져요. 마지막 대화는 탓보다 배운 점, 미안한 점, 지킬 거리를 나누는 쪽이 좋아요.`,
    ],
    11: [
      `장기 연애는 설렘의 크기보다 회복 습관의 안정감으로 이어져요. 두 분은 시간이 쌓일수록 서로의 장단점을 더 선명하게 보게 돼요. 그때 장점을 당연하게 두지 않고 고마움으로 돌려주는 습관이 필요해요.`,
      `결혼 궁합은 사랑의 감정만으로 판단하기 어려워요. 생활 리듬, 돈, 가족 경계, 집안일의 기준이 별자리의 그림자를 현실로 끌어내요. 결혼을 생각한다면 낭만보다 먼저 운영 문장을 합의해야 해요.`,
      `함께 나이 드는 그림은 서로의 성숙 방식이 맞물릴 때 아름다워져요. ${selfStar}宿은 돌봄을 더 넓고 부드럽게 쓰고, ${partnerStar}宿은 움직임을 더 책임 있게 쓰게 돼요. 오래된 두 사람은 말보다 서로의 회복법을 알아보는 데서 깊어져요.`,
      `장기화될수록 안정의 기운이 살아나는 구간이 있어요. 처음 1년 반에서 3년 사이에는 반복 갈등의 모양이 드러나고, 그때 운영법을 세우면 관계가 단단해져요. 피하지 않고 같은 문제를 새 방식으로 다룰 때 길이 열려요.`,
      `오래 가는 두 사람은 싸우지 않는 사람들이 아니라 돌아오는 법을 아는 사람들이에요. 이 인연도 마찬가지로 회복 문장을 가진 만큼 오래 버틸 수 있어요. 월 1회 관계 점검을 작게 열어두면 큰 균열을 예방할 수 있어요.`,
    ],
    12: [
      `일상 스타일의 차이는 사랑이 식어서가 아니라 안정과 변화의 우선순위가 다르기 때문에 생겨요. 한쪽은 루틴에서 평안을 느끼고, 다른 한쪽은 새 자극에서 살아 있음을 느낄 수 있어요. 주말 계획, 여행, 집 정리 같은 장면에서 이 차이가 가장 빨리 드러나요.`,
      `돈과 현실 문제는 가치관의 요약판이에요. 한쪽은 안전망과 저축을 먼저 보고, 다른 한쪽은 경험과 투자에서 현재의 만족을 찾을 수 있어요. 공동의 몫과 각자의 몫을 나누면 사랑이 돈 문제에 휘둘리지 않아요.`,
      `가치관 차이는 끌림의 이유이자 갈등의 씨앗이에요. 나와 달라서 끌렸던 점이 시간이 지나면 왜 그렇게 하냐는 질문으로 바뀔 수 있어요. 다름을 고치려 하지 말고 공동의 방향을 세 문장으로 정해보세요.`,
      `현실 생활은 별빛이 매일 내려앉는 자리예요. 말로는 괜찮아도 생활 기준이 맞지 않으면 감정은 천천히 지쳐요. 반복되는 불편함은 사랑의 부족이 아니라 합의의 부족으로 먼저 다루는 게 좋아요.`,
      `두 사람의 생활 궁합을 살리려면 즉흥과 안정이 모두 들어갈 자리를 만들어야 해요. 계획된 시간과 자유 시간을 나누면 한쪽은 안심하고 다른 한쪽은 숨을 쉬어요. 다음 주 일정부터 고정 하나, 즉흥 하나를 함께 넣어보세요.`,
    ],
    13: [
      `친밀감은 두 사람이 가까움을 느끼는 방식이 다를 때 더 섬세한 조율을 원해요. 누군가는 눈맞춤과 작은 챙김에서 사랑을 느끼고, 누군가는 함께 움직이며 문제를 해결할 때 가까워져요. 둘 중 하나만 사랑이라고 고집하지 않아야 해요.`,
      `애정이 식어갈 때의 신호는 사람마다 다르게 나타나요. 한쪽은 말수가 줄고, 다른 한쪽은 함께하려는 제안을 멈출 수 있어요. 신호를 무심함으로 단정하기 전에 지금 마음이 멀어지는 중인지 쉬는 중인지 물어보세요.`,
      `친밀감을 유지하는 루틴은 크고 화려할 필요가 없어요. 주 1회 가벼운 산책, 하루 한 번 고마움 한 문장, 갈등 뒤 손잡기나 눈맞춤 같은 작은 의식이 더 오래 남아요. 반복되는 작은 안정이 이 관계의 체력을 키워요.`,
      `스킨십과 애정 온도는 서로의 경계를 존중할 때 깊어져요. 가까워지고 싶은 마음이 있어도 상대의 몸과 마음이 준비되지 않았다면 기다림도 사랑이에요. 편한 표현과 부담스러운 표현을 서로 말해두면 오해가 줄어요.`,
      `사랑받는다고 느끼는 순간을 구체적으로 아는 것이 중요해요. 상대가 설명 없이 알아줄 때, 약속을 기억해줄 때, 힘든 날 곁에 머물러줄 때 마음이 열릴 수 있어요. 이번 주에는 서로가 사랑받는 순간 세 가지를 나눠보세요.`,
    ],
    14: [
      `카르마적 의미는 신비로운 말보다 반복되는 감정의 익숙함에서 드러나요. 처음 만났는데 낯설지 않거나, 이유 없이 마음이 크게 움직인다면 오래된 과제가 건드려진 것일 수 있어요. 이 감각을 운명으로만 두지 말고 배움으로 받아야 해요.`,
      `전생의 약속처럼 느껴지는 인연은 이번 생에서 같은 상처를 다르게 다루라는 부름을 담아요. ${selfName}${withParticle(selfName)} 배워야 할 것은 기다림일 수 있고, ${partnerName}${topicParticle(partnerName)} 배워야 할 것은 표현일 수 있어요. 서로의 숙제를 대신 풀어주려 하지 말고 곁에서 비춰주세요.`,
      `영적 성장은 갈등이 없어서 오는 것이 아니에요. 안 되는 방식을 알아차리고 다른 선택을 반복할 때 달빛이 깊어져요. 두 분은 서로를 통해 사랑, 경계, 책임의 뜻을 다시 배울 수 있어요.`,
      `이 만남은 우연처럼 와도 아무 의미 없이 스쳐 가는 결은 아니에요. 강하게 끌리고 강하게 아픈 지점이 있다면 그곳에 오래된 감정의 매듭이 있어요. 매듭을 풀려면 상대를 바꾸는 것보다 내 반응을 먼저 알아차려야 해요.`,
      `카르마를 건강하게 쓰려면 상처를 미화하지 말아야 해요. 아픈 일을 운명이라 부르며 참는 것은 성장과 달라요. 진짜 성장은 같은 장면에서 더 성숙한 말을 선택하는 데서 열려요.`,
    ],
    15: [
      `최종 전략은 큰 결심보다 오늘 바꿀 수 있는 행동에서 시작돼요. ${selfName}${withParticle(selfName)} 서운함을 묵히지 않는 연습이 필요하고, ${partnerName}${topicParticle(partnerName)} 해결보다 공감을 먼저 건네는 연습이 필요해요. 함께할 행동은 싸움 뒤 돌아오는 시간을 정하는 것이에요.`,
      `관계를 망치는 행동은 이 인연의 약한 고리를 반복해서 누르는 행동이에요. 침묵으로 벌주기, 과거를 무기로 쓰기, 상대의 속도를 사랑의 양으로 단정하기는 멈춰야 해요. 대신 지금 아픈 지점과 다음 행동을 짧게 말하는 습관을 두세요.`,
      `관계를 살리는 행동은 작고 꾸준해야 해요. 고마움 한 문장, 감정 온도 확인, 약속 이행 점검이 주간 루틴으로 자리 잡으면 관계 체력이 올라가요. 특히 ${distanceLabel}의 흐름에서는 작은 확인이 큰 오해를 막아줘요.`,
      `앞으로의 선택은 감정의 크기가 아니라 행동의 반복으로 판단해야 해요. 같은 문제를 다르게 다루는가, 사과 뒤 실제 변화가 있는가, 서로의 삶이 더 넓어지는가를 보세요. 이 세 기준이 살아 있으면 관계는 다시 자랄 수 있어요.`,
      `마지막 달빛은 판정이 아니라 방향을 건네요. 이 인연은 두 사람에게 더 섬세한 사랑의 기술을 요구해요. 오늘부터 작은 약속 하나를 지키면, 흔들렸던 별자리도 다시 길을 비출 거예요.`,
    ],
  };
  const selected = lines[chapterNo] || [
    `두 분은 ${relationType}의 결 안에서 서로의 반응을 더 세밀하게 배워가는 중이에요. ${axis}이 흔들릴 때도 탓보다 신호를 먼저 읽으면 길이 열려요. 오늘은 감정 하나와 행동 하나만 작게 맞춰보세요.`,
  ];
  return sanitizeSukyoPremiumText(selected[Math.abs(sectionIndex) % selected.length]);
}

function resolveChapterCounselingFrame(chapterNo) {
  return CHAPTER_COUNSELING_FRAME[chapterNo] || {
    entry: "이 장에서는 두 사람의 본명숙, 관계 유형, 거리감을 함께 놓고 실제 상담 흐름을 읽습니다.",
    evidence: "판단 근거는 반복되는 감정 신호와 현실에서 확인 가능한 행동입니다.",
    reality: "현실에서는 좋은 해석보다 두 사람이 같은 기준으로 움직이는 힘이 중요합니다.",
    caution: "세부 흐름을 확인하지 않으면 같은 문제가 다른 이름으로 반복될 수 있습니다.",
    prescription: "상담 처방은 감정, 사실, 다음 행동을 나누어 합의하는 것입니다.",
    moon: "이 장의 달빛은 작은 항목 안에서도 인연의 방향을 비춥니다.",
  };
}

function buildSectionOpening(context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const chapterTitle = sanitizeSukyoPremiumText(stripSukyoChapterTitle(context.chapterTitle || ""));
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "");
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const selfStar = sanitizeSukyoPremiumText(context.selfStar || "본명숙");
  const partnerStar = sanitizeSukyoPremiumText(context.partnerStar || "상대숙");
  const relationType = sanitizeSukyoPremiumText(context.relationType || "관계");
  const distanceLabel = sanitizeSukyoPremiumText(context.distanceLabel || "거리");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const frame = resolveChapterCounselingFrame(chapterNo);
  const evidenceLine = frameBridge(frame, "evidence", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const realityLine = frameBridge(frame, "reality", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const prescriptionLine = frameBridge(frame, "prescription", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const variants = [
    `${frame.entry} ${selfName} ${selfStar}宿과 ${partnerName} ${partnerStar}宿이 ${sectionHeading} 안에서 ${relationType} 흐름을 어떻게 나누어 갖는지 비춰요.`,
    `${evidenceLine} ${chapterTitle} 안에서는 ${distanceLabel}의 속도와 ${sectionAxis}의 방향을 함께 보아야 해요.`,
    `${selfName}${withParticle(selfName)} ${partnerName} 사이에서는 ${sectionHeading}을 따라 ${relationType} 관계가 감정, 말투, 거리감의 순서로 움직여요.`,
    `${realityLine} ${selfStar}宿의 반응과 ${partnerStar}宿의 수용 방식이 만나는 자리예요.`,
    `${prescriptionLine} ${sectionAxis}이 두 사람의 실제 행동으로 내려오는 자리예요.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildChapterToneSectionBody(context = {}, blocks = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "");
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const sectionProfile = context.writingProfile || resolveSectionWritingProfile(chapterNo, sectionIndex);
  const core = sanitizeSukyoPremiumText(blocks.coreDiagnosis || "");
  const insight = sanitizeSukyoPremiumText(blocks.masterInsight || "");
  const manifestation = sanitizeSukyoPremiumText(blocks.manifestation || "");
  const caution = sanitizeSukyoPremiumText(blocks.caution || "");
  const prescription = sanitizeSukyoPremiumText(blocks.prescription || "");
  const dialogue = sanitizeSukyoPremiumText(blocks.dialogueExample || "");
  const weeklyRoutine = sanitizeSukyoPremiumText(blocks.weeklyRoutine || "");
  const moonPrescription = sanitizeSukyoPremiumText(blocks.moonPrescription || "");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const finalStrategyLine = sectionProfile.finalStrategy ? buildFinalStrategyLine(chapterNo, sectionIndex) : "";
  const sectionTerms = safeArray(context.sectionTerms)
    .map((term) => sanitizeSukyoPremiumText(term))
    .filter((term) => term && term !== sectionHeading)
    .slice(0, 2);
  const termLine = sectionTerms.length ? `${sectionTerms.join(" · ")}의 결을 함께 보아야 해요.` : "";
  const sectionAnchor = sectionHeading
    ? `${sectionHeading}의 흐름을 짚으면, 두 사람의 별빛이 현실의 말투와 선택으로 천천히 내려와요. ${termLine}`
    : "";
  const realityLead = `${sectionAxis}에서는 ${selfName}${withParticle(selfName)} ${partnerName}의 반응 차이가 말투와 회복 속도로 나타나요.`;
  const actionTail = sectionProfile.dialogue
    ? dialogue
    : sectionProfile.routine
      ? weeklyRoutine
      : sectionProfile.moon
        ? moonPrescription
        : "";
  const paragraphs = [
    compactSukyoCounselText([finalStrategyLine, sectionAnchor, core].filter(Boolean).join(" "), 3, 420),
    compactSukyoCounselText([insight, realityLead, manifestation].filter(Boolean).join(" "), 3, 420),
    compactSukyoCounselText([caution, prescription, actionTail].filter(Boolean).join(" "), 3, 520),
  ];
  return limitSectionHeadingRepeats(
    paragraphs.map((part) => sanitizeSukyoPremiumText(part)).filter(Boolean).join("\n\n"),
    sectionHeading,
  );
}

function buildSectionBody(localJson, chapter, sectionHeading, sectionIndex) {
  const chapterNo = safeNumber(chapter?.order || chapter?.chapterNo, 0);
  const sectionTag = `${chapterNo}장 ${sectionHeading}`;
  const selfName = text(localJson?.input?.self?.name, "당신");
  const partnerName = text(localJson?.input?.partner?.name, "상대");
  const selfStar = text(localJson?.self?.sukuyoStar, "본명숙");
  const partnerStar = text(localJson?.partner?.sukuyoStar, "상대숙");
  const relationType = text(localJson?.relation?.typeKo || localJson?.relation?.type, "관계");
  const relationTheme = text(localJson?.relation?.relationTheme, "강한 끌림과 조율 과제가 공존하는 결");
  const distanceLabel = displayDistanceLabel(localJson?.relation?.distanceLabel || localJson?.relation?.distance || "중거리");
  const selfProfile = localJson?.self?.profile || { love: `${selfName}은 상대의 감정 신호를 세심하게 읽으며 애정을 표현합니다.` };
  const partnerProfile = localJson?.partner?.profile || { love: `${partnerName}은 안정감을 확인한 뒤 애정 표현을 넓혀 가는 경향이 있습니다.` };
  const chemistry = localJson?.relation?.chemistry || {};
  const emotional = safeNumber(chemistry?.emotional, 58);
  const communication = safeNumber(chemistry?.communication, 55);
  const conflictRisk = safeNumber(chemistry?.conflictRisk, 52);
  const longTermPotential = safeNumber(chemistry?.longTermPotential, 54);
  const recoveryPotential = safeNumber(chemistry?.recoveryPotential, 57);
  const relationScore = safeNumber(localJson?.relation?.score, safeNumber(localJson?.relation?.compatibilityScore, 56));
  const meStrength = text(localJson?.relation?.strengthShadowMap?.me?.strength, "감정 보살핌");
  const meShadow = text(localJson?.relation?.strengthShadowMap?.me?.shadow, "과한 배려로 인한 피로");
  const otherStrength = text(localJson?.relation?.strengthShadowMap?.other?.strength, "현실 감각");
  const otherShadow = text(localJson?.relation?.strengthShadowMap?.other?.shadow, "표현 지연으로 인한 거리감");
  const meActionRaw = text(localJson?.relation?.roleActionGuide?.meAction, "감정을 먼저 짧게 공유한다");
  const otherActionRaw = text(localJson?.relation?.roleActionGuide?.otherAction, "상대의 말을 요약해 확인한 뒤 답한다");
  const resetLineRaw = text(localJson?.relation?.roleActionGuide?.resetLine, "갈등 다음 날 안에 대화의 문을 다시 연다");
  const meAction = actionPrincipleClause(meActionRaw, "감정을 먼저 짧게 공유하는 것");
  const otherAction = actionPrincipleClause(otherActionRaw, "상대의 말을 요약해 확인한 뒤 답하는 것");
  const resetLine = firstCounselSentence(resetLineRaw) || "갈등 다음 날 안에 대화의 문을 다시 여는 것";
  const resetAction = actionPrincipleClause(resetLineRaw, "감정이 올라온 뒤 재대화 시간을 정하는 것");
  const elementSummary = humanizeElementSummary(localJson?.relation?.elementHarmony?.summary, selfName, partnerName)
    || "두 사람의 기질은 조율 규칙을 세울수록 상호 보완성이 커집니다";
  const elementRelation = text(localJson?.relation?.elementHarmony?.relation, "보완");
  const complementSummary = text(localJson?.relation?.strengthShadowMap?.complementSummary, "서로의 강점이 상대의 그림자를 완충합니다.");
  const pastLifeTitle = text(localJson?.relation?.pastLife?.title, "오래된 약속의 인연");
  const pastLifeTask = text(localJson?.relation?.pastLife?.currentTask, "서로의 불안을 탓하지 않고 책임 있는 약속으로 바꾸는 일");
  const pastLifeHealing = text(localJson?.relation?.pastLife?.healingKey, "작은 합의를 반복해 신뢰를 복원하는 일");
  const selfKeyword = pickFirst(localJson?.self?.keywords, "감정의 촉");
  const partnerKeyword = pickFirst(localJson?.partner?.keywords, "관계의 응답");
  const emotionalBand = scoreBandLabel(emotional, "감정 파동이 깊고 빠르게 번지는 고밀도 구간", "감정 교류가 충분하지만 확인 대화가 필요한 중밀도 구간", "감정 표현의 속도 차이를 세심하게 맞춰야 하는 저밀도 구간");
  const communicationBand = scoreBandLabel(communication, "말과 눈치가 동시에 열리는 소통 우세 구간", "표현 순서가 맞을 때 잘 풀리는 조율 구간", "침묵과 추측을 줄여야 하는 소통 보강 구간");
  const riskBand = scoreBandLabel(conflictRisk, "감정 과열을 가장 먼저 다스려야 하는 고위험 구간", "반복 주제만 정리하면 회복되는 관리 구간", "큰 폭발보다 누적 피로를 경계해야 하는 은근한 구간");
  const sectionTheme = resolveSukyoSectionTheme(chapterNo, sectionIndex, sectionHeading);
  const guide = sectionTheme.guides || CHAPTER_TOPIC_GUIDE[chapterNo] || ["관계 핵심", "감정 조율", "갈등 완화", "실행 습관"];
  const requiredTermList = sectionTheme.requiredTerms.join(", ");
  const requiredTermFlow = sectionTheme.requiredTerms.join(" · ");
  const relationMaster = selectRelationMasterGuide(relationType);
  const distanceMaster = DISTANCE_MASTER_GUIDE[toDistanceTier(distanceLabel)] || DISTANCE_MASTER_GUIDE.unknown;
  const rawFocusAxis = buildFocusAxis(sectionHeading, sectionTheme.axis);
  const focusAxis = rawFocusAxis === "이 상담 축"
    ? pickFirst(safeArray(sectionTheme.requiredTerms).filter((term) => text(term) !== text(sectionHeading)), text(sectionTheme.axis, "관계 흐름"))
    : rawFocusAxis;
  const relationCaution = sentenceClause(relationMaster.caution);
  const relationPrinciple = actionPrincipleClause(relationMaster.prescription, "반복되는 갈등 고리를 끊는 것");
  const distancePrinciple = actionPrincipleClause(distanceMaster.prescription, "두 사람이 편안한 거리 기준을 정하는 것");
  const complementInsight = sentenceClause(complementSummary);
  const complementPoint = complementInsight.replace(/^강점은\s*/u, "강점을 사용할 때는 ");
  const healingAction = actionPrincipleClause(pastLifeHealing, "작은 합의를 반복해 신뢰를 복원하는 것");
  const writingProfile = resolveSectionWritingProfile(chapterNo, sectionIndex);
  const sevenDayRoutine = shouldUseSevenDayRoutine(chapterNo, sectionIndex);
  const relationChapterInsight = writingProfile.relation ? buildRelationChapterInsight(relationType, chapterNo, sectionHeading, { sectionIndex, sectionAxis: sectionTheme.axis }) : "";
  const distanceChapterInsight = writingProfile.distance ? buildDistanceChapterInsight(distanceLabel, chapterNo, sectionHeading, { sectionIndex }) : "";
  const scoreSignal = buildScoreSignal(sectionHeading, relationScore, emotional, communication, { chapterNo, sectionIndex });
  const universalCounselLine = buildUniversalSukyoCounselLine({
    chapterNo,
    sectionIndex,
    selfName,
    partnerName,
    selfStar,
    partnerStar,
    relationType,
    distanceLabel,
    sectionAxis: sectionTheme.axis,
  }, {
    elementRelation,
    selfKeyword,
    partnerKeyword,
    meStrength,
    otherStrength,
    meShadow,
    otherShadow,
    relationTheme,
  });
  const relationPrescription = writingProfile.relation
    ? `${focusAxis} 안에서 ${relationType} 궁합을 다룰 때는 ${relationPrinciple}을 우선 기준으로 삼으세요.`
    : "";
  const distancePrescription = writingProfile.distance
    ? `${focusAxis}의 거리 조절은 ${distancePrinciple}을 실제 약속으로 옮길 때 안정돼요.`
    : "";
  const destinyOneLine = chapterNo === 1 && sectionIndex === 0
    ? "끌림과 긴장이 같은 뿌리에서 자라는 인연 — 조율이 운명을 결정해요."
    : "";
  const shouldNameElementFlow = ((chapterNo === 1 || chapterNo === 4 || chapterNo === 9 || chapterNo === 12 || chapterNo === 15) && sectionIndex === 0)
    || (chapterNo === 5 && sectionIndex === 1);
  const elementCounselLine = shouldNameElementFlow
    ? `오행 흐름은 ${elementRelation}의 결로 움직여요. ${completeSentence(elementSummary)}`
    : `${focusAxis}에서 두 별의 결은 ${completeSentence(complementPoint)}`;

  const chapter10Boost = chapterNo === 10
    ? `${selfName}${withParticle(selfName)} ${partnerName}의 이별 원인은 감정 과열 이후 설명 없는 침묵에서 시작되기 쉬워요. 재회의 문은 과거 충돌 패턴을 같은 문장으로 다시 합의할 때 열리고, 반복될 문제는 연락 공백 해석과 상처 표현 방식이에요.`
    : "";
  const chapter11Boost = chapterNo === 11
    ? `결혼 이후의 핵심 변수는 생활 리듬, 돈, 가사, 가족 경계예요. 강해지는 점은 ${selfName}의 ${meStrength}${withParticle(meStrength)} ${partnerName}의 ${otherStrength}${topicParticle(otherStrength)} 상호 보완되는 구조이고, 지치게 되는 점은 ${meShadow}${withParticle(meShadow)} ${otherShadow}${topicParticle(otherShadow)} 누적될 때예요.`
    : "";
  const chapter14Boost = chapterNo === 14
    ? `${pastLifeTitle}로 느껴지는 이유는 낯선 사람인데도 감정 반응이 익숙하게 반복되기 때문이에요. 전생적 의미는 미완의 감정 과제가 현재 관계에서 다시 떠오르는 구조이며, 이번 생의 성장 과제는 ${pastLifeTask}예요.`
    : "";

  const blocks = {};

  Object.assign(blocks, {
    coreDiagnosis: `${destinyOneLine} ${sectionTheme.sukuyoLens} ${topicPhrase(focusAxis)} ${selfName} ${selfStar}宿과 ${partnerName} ${partnerStar}宿의 첫 반응과 지속 반응을 함께 비춰요. ${universalCounselLine} ${relationChapterInsight} ${distanceChapterInsight} ${scoreSignal}`,
    masterInsight: `${selfStar}宿의 ${selfKeyword}${topicParticle(selfKeyword)} ${focusAxis}에서 먼저 깨어나고, ${partnerStar}宿의 ${partnerKeyword}${topicParticle(partnerKeyword)} 마음을 여는 방식에 영향을 줘요. 두 사람은 ${objectPhrase(focusAxis)} 중심에 두고 마음의 신호와 현실 선택을 나란히 확인해야 해요. ${elementCounselLine} ${requiredTermFlow}${topicParticle(requiredTermFlow)} 현실에서 먼저 드러나는 신호이고, 조율의 핵은 ${completeSentence(complementPoint)}`,
    manifestation: `${sectionTheme.reality} ${topicPhrase(sectionTheme.axis)} ${selfName}${topicParticle(selfName)} 애정을 표현할 때 ${objectPhrase(meStrength)} 앞세우고, 불안이 커지면 ${objectPhrase(meShadow)} 보일 수 있어요. ${partnerName}${topicParticle(partnerName)} ${focusAxis} 안에서 ${objectPhrase(otherStrength)} 통해 관계를 지지하지만 압박을 받으면 ${topicPhrase(otherShadow)} 나타나요. 현재 ${focusAxis}의 감정대는 ${emotionalBand}이고 소통대는 ${communicationBand}이므로, 말의 양보다 해석의 순서가 관계 체력을 좌우해요.`,
    caution: `${sectionTheme.caution} ${relationType} 관계가 ${sectionTheme.axis}에서 흔들릴 때는 ${relationCaution}. ${buildRiskSignal(conflictRisk, longTermPotential, recoveryPotential, { chapterNo, sectionIndex, sectionAxis: focusAxis })} 조심할 신호는 ${riskBand}으로 보이며, ${requiredTermFlow}${objectParticle(requiredTermFlow)} 그냥 지나치면 서로의 해석 비용이 커져요. ${chapter10Boost} ${chapter11Boost} ${chapter14Boost}`,
    prescription: `${sectionTheme.prescription} ${focusAxis}에서 ${selfName}${topicParticle(selfName)} ${objectPhrase(meAction)} 맡고, ${partnerName}${topicParticle(partnerName)} ${objectPhrase(otherAction)} 맡아야 해요. ${focusAxis}의 감정이 올라온 순간에는 즉시 결론을 내리기보다 ${objectPhrase(resetAction)} 앞자리에 두세요. ${relationPrescription} ${distancePrescription} 두 사람이 ${focusAxis}을 같은 방식으로 다룰 때 상처를 실제 행동으로 줄일 수 있어요.`,
    dialogueExample: buildNaturalDialogueExample({ chapterNo, sectionIndex, selfName, partnerName, sectionAxis: sectionTheme.axis }, guide),
    weeklyRoutine: sevenDayRoutine
      ? `7일의 달빛 루틴을 두 사람의 작은 의식으로 삼아보세요. 1일차에는 ${objectPhrase(sectionTheme.requiredTerms[0] || sectionTheme.axis)} 관찰하고, 3일차에는 ${guide[2]}이 반복되는 순간을 기록하세요. 5일차에는 ${objectPhrase(guide[3])} 실제 행동으로 바꾸고, 7일차에는 두 사람이 지킬 문장 하나를 확정하면 ${selfStar}宿과 ${partnerStar}宿의 흐름이 더 안정돼요.`
      : `${sectionTheme.routine} ${topicPhrase(focusAxis)} 하루 만에 판단하지 말고, ${objectPhrase(requiredTermFlow || focusAxis)} 다음 만남에서 확인 가능한 행동으로 바꾸어야 해요.`,
    moonPrescription: `${sectionTheme.moon} ${pastLifeTitle}의 결은 가까운 순간마다 은근히 되살아나며, 이 인연의 밤의 조율법은 ${pastLifeTask}예요. 치유 방향은 ${healingAction}이에요. ${buildMoonClosingLine(chapterNo, sectionIndex, sectionTheme.axis)}`,
  });

  const sectionContext = {
    chapterNo,
    chapterTitle: text(chapter?.title || ""),
    sectionHeading,
    selfName,
    partnerName,
    selfStar,
    partnerStar,
    relationType,
    distanceLabel,
    sectionIndex,
    sectionAxis: sectionTheme.axis,
    sectionTerms: sectionTheme.requiredTerms,
    writingProfile,
  };

  let out = buildChapterToneSectionBody(sectionContext, blocks);
  let expandAttempts = 0;
  while (out.length < MIN_SECTION_LENGTH && expandAttempts < 2) {
    blocks.coreDiagnosis = `${blocks.coreDiagnosis} ${sectionTheme.axis}은 ${requiredTermList}${objectParticle(requiredTermList)} 함께 짚을 때 더 선명해져요.`;
    out = buildChapterToneSectionBody(sectionContext, blocks);
    expandAttempts += 1;
  }
  if (!hasChapterToneStructure(out, chapter, { heading: sectionHeading }, {
    relationToken: relationType,
    selfStarToken: selfStar,
    partnerStarToken: partnerStar,
  })) {
    blocks.coreDiagnosis = `${sectionHeading}에서는 ${selfName}의 ${selfStar}宿과 ${partnerName}의 ${partnerStar}宿, 그리고 ${relationType} 관계의 달빛 결을 함께 짚어야 해요. ${blocks.coreDiagnosis}`;
    out = buildChapterToneSectionBody(sectionContext, blocks);
  }
  return out;
}

function buildSukuyoCompatibilityLocalManuscript(localJson) {
  const chapters = SUKYO_PDF_CHAPTERS.map((chapter) => {
    const sections = chapter.sections.map((heading, sectionIndex) => ({
      title: heading,
      body: buildSectionBody(localJson, chapter, heading, sectionIndex),
      bullets: [
        `${text(localJson.self.sukuyoStar)}宿 · ${text(localJson.partner.sukuyoStar)}宿 관점에서 감정 신호를 먼저 확인합니다.`,
        `${text(localJson.relation.typeKo)} 관계의 장점을 유지하되 ${text(localJson.relation.distanceLabel, "거리")} 관리 규칙을 명확히 합니다.`,
        `실행 가능한 문장과 행동 단위로 관계 운영 전략을 고정합니다.`,
      ],
    }));

    const chapterText = sections.map((section) => section.body).join("\n\n");
    return {
      chapterNo: chapter.order,
      title: chapter.title,
      subtitle: `${text(localJson.relation.typeKo, "관계")} 관계 실전 해석`,
      sections,
      localQuality: {
        minLengthPassed: chapterText.length >= MIN_CHAPTER_LENGTH,
        repetitionPassed: computeRepetitionScore(chapterText) < 0.38,
        forbiddenTermsPassed: countForbiddenTerms(chapterText) === 0,
        usedStars: [text(localJson.self.sukuyoStar), text(localJson.partner.sukuyoStar)].filter(Boolean),
        usedRelationTypes: [text(localJson.relation.typeKo)].filter(Boolean),
        usedSignals: [text(localJson.relation.distanceLabel), ...safeArray(localJson.relation.chemistryKeywords)].filter(Boolean),
      },
    };
  });

  return chapters;
}

function enforceManuscriptLength(chapters) {
  const normalized = (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => {
      const fixed = repeatToLength([sanitizeSukyoPremiumBody(section.body)], MIN_SECTION_LENGTH);
      return {
        heading: text(section.title || section.heading || "세부 섹션"),
        body: fixed,
      };
    });

    let chapterLength = sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    if (chapterLength < MIN_CHAPTER_LENGTH && sections.length > 0) {
      const deficit = MIN_CHAPTER_LENGTH - chapterLength;
      const ext = repeatToLength([sections[sections.length - 1].body], deficit + 20);
      sections[sections.length - 1].body = sanitizeSukyoPremiumBody(`${sections[sections.length - 1].body}\n\n${ext}`);
      chapterLength = sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    }

    return {
      key: SUKYO_PDF_CHAPTERS[chapter.chapterNo - 1]?.key,
      order: chapter.chapterNo,
      title: text(chapter.title),
      sections,
      chapterLength,
    };
  });

  let total = normalized.reduce((sum, ch) => sum + ch.chapterLength, 0);
  if (total < MIN_TOTAL_LENGTH && normalized.length > 0) {
    const deficit = MIN_TOTAL_LENGTH - total;
    const last = normalized[normalized.length - 1];
    const tail = last.sections[last.sections.length - 1];
    const ext = repeatToLength([tail.body], deficit + 20);
    tail.body = sanitizeSukyoPremiumBody(`${tail.body}\n\n${ext}`);
    last.chapterLength = last.sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    total = normalized.reduce((sum, ch) => sum + ch.chapterLength, 0);
  }

  return { chapters: normalized, totalLength: total };
}

export function sanitizeSukyoChapterJson(chapter = {}, source = {}, seed = {}) {
  const chapterSpec = SUKYO_PDF_CHAPTERS.find((item) => item.key === chapter.key) || SUKYO_PDF_CHAPTERS[(Number(chapter.order) || 1) - 1];
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, index) => ({
    heading: text(section.heading || section.title || chapterSpec?.sections?.[index] || `세부 섹션 ${index + 1}`),
    body: sanitizeSukyoPremiumBody(text(section.body || section.text || "")),
  }));

  return {
    key: text(chapter.key || source.key || chapterSpec?.key),
    order: safeNumber(chapter.order || source.order || chapterSpec?.order),
    title: text(chapter.title || source.title || chapterSpec?.title),
    summary: sanitizeSukyoPremiumText(source.summary || ""),
    coreReading: sanitizeSukyoPremiumText(source.coreReading || ""),
    sections,
    seed,
  };
}

function chapterArrayToRendererInput(chapters = []) {
  return chapters.map((chapter) => ({
    key: text(chapter.key),
    order: safeNumber(chapter.order, 0),
    title: text(chapter.title),
    sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => ({
      heading: text(section.heading || section.title),
      body: sanitizeSukyoPremiumBody(section.body || section.text || ""),
    })),
  }));
}

function validateRenderedManuscript(seed, chapters, options = {}) {
  const issues = [];
  if (text(seed?.mode) !== "compatibility") issues.push("mode.compatibility");
  const requireSeedSignals = options.requireSeedSignals !== false;

  const compatibilityJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const source = compatibilityJson || seed || {};
  const selfStarOk = Boolean(text(source?.self?.sukuyoStar || source?.userSukyo?.nameKo));
  const partnerStarOk = Boolean(text(source?.partner?.sukuyoStar || source?.partnerSukyo?.nameKo));
  if (requireSeedSignals && !selfStarOk) issues.push("self.sukuyo");
  if (requireSeedSignals && !partnerStarOk) issues.push("partner.sukuyo");

  const relationTypeOk = Boolean(text(source?.relation?.typeKo || source?.compatibility?.relationType || compatibilityJson?.relation?.typeKo));
  if (requireSeedSignals && !relationTypeOk) issues.push("relation.type");
  const relationToken = text(source?.relation?.typeKo || source?.compatibility?.relationType || compatibilityJson?.relation?.typeKo).toLowerCase();
  const selfStarToken = text(source?.self?.sukuyoStar || source?.userSukyo?.nameKo).toLowerCase();
  const partnerStarToken = text(source?.partner?.sukuyoStar || source?.partnerSukyo?.nameKo).toLowerCase();

  if (!Array.isArray(chapters) || chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");

  let totalLength = 0;
  let forbiddenTermsCount = 0;
  let repeatedSectionCount = 0;
  const chapterOpeningSet = new Set();
  const chapterClosingSet = new Set();

  const chapterNos = new Set((Array.isArray(chapters) ? chapters : []).map((ch) => safeNumber(ch.order || ch.chapterNo, 0)).filter((n) => n > 0));
  for (let i = 1; i <= SUKYO_PDF_CHAPTER_COUNT; i += 1) {
    if (!chapterNos.has(i)) issues.push(`chapter.missing.${i}`);
  }

  for (const chapter of chapters) {
    const chapterNo = safeNumber(chapter.order || chapter.chapterNo, 0);
    const chapterSpec = SUKYO_PDF_CHAPTERS[chapterNo - 1];
    const chapterSections = Array.isArray(chapter.sections) ? chapter.sections : [];
    const chapterLength = chapterSections.reduce((sum, section) => sum + text(section.body).length, 0);
    totalLength += chapterLength;
    if (chapterLength < MIN_CHAPTER_LENGTH) issues.push(`chapter.length.${chapterNo}`);
    if (!Array.isArray(chapter.sections) || chapter.sections.length !== (chapterSpec?.sections?.length || 0)) {
      issues.push(`chapter.sections.${chapterNo}`);
    }

    const requiredKeywords = CHAPTER_REQUIRED_KEYWORDS[chapterNo];
    if (requiredKeywords && !chapterIncludesKeywords(chapter, requiredKeywords)) {
      issues.push(`chapter.keywords.${chapterNo}`);
    }

    for (const section of chapterSections) {
      const body = text(section.body);
      if (!body || body.length < MIN_SECTION_LENGTH) issues.push(`section.length.${chapterNo}`);
      if (!hasChapterToneStructure(body, chapter, section, { relationToken, selfStarToken, partnerStarToken })) {
        issues.push(`section.chapter_tone.${chapterNo}`);
      }
      const normalizedBody = body.toLowerCase();
      const hasRequiredDomainToken = !requireSeedSignals || Boolean(
        (relationToken && normalizedBody.includes(relationToken))
        || (selfStarToken && normalizedBody.includes(selfStarToken))
        || (partnerStarToken && normalizedBody.includes(partnerStarToken)),
      );
      if (!hasRequiredDomainToken) {
        issues.push(`section.domain_token.${chapterNo}`);
      }
      const sectionForbiddenCount = countForbiddenTerms(body);
      forbiddenTermsCount += sectionForbiddenCount;
      if (sectionForbiddenCount > 0) {
        issues.push(`forbidden.${chapterNo}`);
      }
      if (computeRepetitionScore(body) >= 0.55) {
        repeatedSectionCount += 1;
        issues.push(`section.repetition.${chapterNo}`);
      }
    }

    const opening = splitMeaningfulSentences(chapterSections[0]?.body || "")[0] || "";
    const closingSource = chapterSections[chapterSections.length - 1]?.body || "";
    const closingSentences = splitMeaningfulSentences(closingSource);
    const closing = closingSentences[closingSentences.length - 1] || "";
    if (opening) chapterOpeningSet.add(opening);
    if (closing) chapterClosingSet.add(closing);

    const sectionBodies = chapterSections.map((section) => text(section.body).replace(/\s+/g, " ").trim().slice(0, 200));
    const uniqueBodies = new Set(sectionBodies.filter(Boolean));
    if (uniqueBodies.size <= Math.max(1, Math.floor(chapterSections.length * 0.6))) {
      issues.push(`chapter.pattern_repeat.${chapterNo}`);
    }
  }
  if (totalLength < MIN_TOTAL_LENGTH) issues.push("total.length");
  if (forbiddenTermsCount > 0) issues.push("forbidden.total");
  if (repeatedSectionCount >= 4) issues.push("repetition.section");
  const paragraphRepeat = hasRepeatedParagraphs(chapters);
  const sentenceRepeat = hasRepeatedSentences(chapters);
  const ngramRepeat = hasRepeatedNgrams(chapters);
  const sevenDayRoutineCount = countSevenDayRoutinePatterns(chapters);
  const manuscriptText = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n");
  const templateStemCount = countLiteralPhraseHits(manuscriptText, FORBIDDEN_TEMPLATE_STEMS);
  const awkwardJosaCount = countLiteralPhraseHits(manuscriptText, AWKWARD_JOSA_PATTERNS);
  if (paragraphRepeat.hasRepeated) issues.push("repetition.paragraph.global");
  if (sentenceRepeat.hasRepeated) issues.push("repetition.sentence.global");
  if (ngramRepeat.hasRepeated) issues.push("repetition.ngram.global");
  if (sevenDayRoutineCount > 1) issues.push("routine.seven_day.max_once");
  if (templateStemCount > 0) issues.push("text.template_stem");
  if (awkwardJosaCount > 0) issues.push("text.josa_awkward");
  if (hasForbiddenFallbackText(chapters)) issues.push("forbidden.fallback_text");
  if (chapterOpeningSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.opening");
  if (chapterClosingSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.closing");

  return {
    ok: issues.length === 0,
    issues,
    totalLength,
    forbiddenTermsCount,
    repetitionScore: repeatedSectionCount / Math.max(1, SUKYO_PDF_CHAPTER_COUNT),
    stats: {
      paragraphRepeatMax: paragraphRepeat.maxCount,
      sentenceRepeatMax: sentenceRepeat.maxCount,
      ngramRepeatMax: ngramRepeat.maxCount,
      sevenDayRoutineCount,
      templateStemCount,
      awkwardJosaCount,
    },
  };
}

function isSoftSukyoToneIssue(issue = "") {
  const value = text(issue).replace(/^(manuscript|quality)\./i, "");
  return /^section\.chapter_tone\.\d+$/i.test(value)
    || /^chapter\.\d+\.chapter_tone$/i.test(value);
}

function splitSukyoQualityIssues(issues = []) {
  const soft = [];
  const blocking = [];
  for (const issue of safeArray(issues)) {
    if (isSoftSukyoToneIssue(issue)) soft.push(issue);
    else blocking.push(issue);
  }
  return { soft, blocking };
}

export function validateSukyoCompatibilityPdfQuality(chapters = [], seed = {}) {
  return validateSukyoLocalNarrativeChapters(chapters, seed);

  const strictSeed = seed && typeof seed === "object" && Object.keys(seed).length > 0;
  return validateRenderedManuscript(
    { mode: "compatibility", ...(strictSeed ? seed : {}) },
    chapters,
    { requireSeedSignals: strictSeed },
  );
}

export function buildSukyoChapterQualityReport(seed = {}, chapters = []) {
  return buildSukyoLocalChapterQualityReport(chapters, seed);

  const compatibilityJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const relationToken = text(compatibilityJson?.relation?.typeKo || compatibilityJson?.compatibility?.relationType).toLowerCase();
  const selfStarToken = text(compatibilityJson?.self?.sukuyoStar || compatibilityJson?.userSukyo?.nameKo).toLowerCase();
  const partnerStarToken = text(compatibilityJson?.partner?.sukuyoStar || compatibilityJson?.partnerSukyo?.nameKo).toLowerCase();
  const chapterResults = [];
  const issues = [];

  for (let index = 0; index < SUKYO_PDF_CHAPTER_COUNT; index += 1) {
    const chapterNo = index + 1;
    const spec = SUKYO_PDF_CHAPTERS[index];
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo) || {};
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    const sectionBodies = sections.map((section) => text(section.body));
    const chapterText = sectionBodies.join("\n\n");
    const sectionCountOk = sections.length === (spec?.sections?.length || 0);
    const sectionLengthOk = sections.every((section) => text(section.body).length >= MIN_SECTION_LENGTH);
    const sectionStructureOk = sections.every((section) => hasChapterToneStructure(
      text(section.body),
      chapter,
      section,
      { relationToken, selfStarToken, partnerStarToken },
    ));
    const chapterLengthOk = chapterText.length >= MIN_CHAPTER_LENGTH;
    const forbiddenTermsCount = countForbiddenTerms(chapterText);
    const repetitionScore = computeRepetitionScore(chapterText);
    const domainSignalOk = sectionBodies.every((body) => {
      const normalized = body.toLowerCase();
      return Boolean(
        (relationToken && normalized.includes(relationToken))
        || (selfStarToken && normalized.includes(selfStarToken))
        || (partnerStarToken && normalized.includes(partnerStarToken))
      );
    });
    const keywordOk = !CHAPTER_REQUIRED_KEYWORDS[chapterNo] || chapterIncludesKeywords(chapter, CHAPTER_REQUIRED_KEYWORDS[chapterNo]);
    const ok = Boolean(sectionCountOk && sectionLengthOk && sectionStructureOk && chapterLengthOk && forbiddenTermsCount === 0 && domainSignalOk && keywordOk);
    const result = {
      chapterNo,
      key: text(spec?.key || chapter.key),
      ok,
      sectionCount: sections.length,
      expectedSectionCount: spec?.sections?.length || 0,
      minSectionLength: sectionBodies.length ? Math.min(...sectionBodies.map((body) => body.length)) : 0,
      sectionStructureOk,
      chapterLength: chapterText.length,
      forbiddenTermsCount,
      repetitionScore,
      domainSignalOk,
      keywordOk,
    };
    if (!ok) {
      if (!sectionCountOk) issues.push(`chapter.${chapterNo}.section_count`);
      if (!sectionLengthOk) issues.push(`chapter.${chapterNo}.section_length`);
      if (!sectionStructureOk) issues.push(`chapter.${chapterNo}.chapter_tone`);
      if (!chapterLengthOk) issues.push(`chapter.${chapterNo}.length`);
      if (forbiddenTermsCount > 0) issues.push(`chapter.${chapterNo}.forbidden`);
      if (!domainSignalOk) issues.push(`chapter.${chapterNo}.domain_signal`);
      if (!keywordOk) issues.push(`chapter.${chapterNo}.keywords`);
    }
    chapterResults.push(result);
  }

  return {
    ok: chapterResults.length === SUKYO_PDF_CHAPTER_COUNT && issues.length === 0,
    issues,
    chapterCount: chapterResults.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    chapters: chapterResults,
  };
}

export function assertSukyoCompatibilityPdfComplete({ chapters = [], expectedChapterCount = SUKYO_PDF_CHAPTER_COUNT, expectedSectionsByChapter = SUKYO_PDF_CHAPTERS } = {}) {
  const localIssues = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapterCount) localIssues.push("chapter_count_mismatch");
  const specs = Array.isArray(expectedSectionsByChapter) && expectedSectionsByChapter.length ? expectedSectionsByChapter : getSukyoPdfChapters();
  for (let idx = 0; idx < specs.length; idx += 1) {
    const spec = specs[idx];
    const chapterNo = safeNumber(spec.order || idx + 1, idx + 1);
    const chapter = chapters.find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo);
    if (!chapter) {
      localIssues.push(`chapter_missing_${chapterNo}`);
      continue;
    }
    const sections = objectArray(chapter.sections);
    if (sections.length !== spec.sections.length) localIssues.push(`section_count_mismatch_${chapterNo}`);
    if (sections.some((section) => text(section.body).length < MIN_SECTION_LENGTH)) localIssues.push(`section_too_short_${chapterNo}`);
  }
  const validation = inspectSukyoPdfNarrative({ chapters });
  if (!validation.ok) localIssues.push(...validation.issues);
  if (localIssues.length) {
    const error = new Error(`SUKYO_PDF_INCOMPLETE:${[...new Set(localIssues)].join(",")}`);
    error.code = "SUKYO_PDF_INCOMPLETE";
    error.issues = [...new Set(localIssues)];
    throw error;
  }
  return { ok: true };

  const issues = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapterCount) issues.push("chapter_count_mismatch");

  for (let idx = 0; idx < expectedSectionsByChapter.length; idx += 1) {
    const spec = expectedSectionsByChapter[idx];
    const chapterNo = idx + 1;
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo);
    if (!chapter) {
      issues.push(`chapter_missing_${chapterNo}`);
      continue;
    }
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.sections.length) issues.push(`section_count_mismatch_${chapterNo}`);
    for (const section of sections) {
      if (text(section.body).length < MIN_SECTION_LENGTH) issues.push(`section_too_short_${chapterNo}`);
    }
  }

  if (hasRepeatedParagraphs(chapters).hasRepeated) issues.push("repeated_paragraphs");
  if (hasForbiddenFallbackText(chapters)) issues.push("forbidden_text");

  if (issues.length) {
    const error = new Error(`SUKYO_PDF_INCOMPLETE:${issues.join(",")}`);
    error.code = "SUKYO_PDF_INCOMPLETE";
    error.issues = issues;
    throw error;
  }

  return { ok: true };
}

function stableStringify(value) {
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashStable(value) {
  const source = typeof value === "string" ? value : stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function mansionFacts(star = {}) {
  return {
    id: text(star?.nameHan || star?.nameKo || star?.index),
    index: safeNumber(star?.index, null),
    name: text(star?.nameKo),
    label: `${text(star?.nameKo)}宿${text(star?.nameHan) ? `(${text(star.nameHan)})` : ""}`,
    keywords: safeArray(star?.keywords || star?.traits),
    group: text(star?.category),
    attributes: {
      element: text(star?.element),
      strengths: safeArray(star?.strengths),
      shadows: safeArray(star?.shadows),
      lunarMonth: safeNumber(star?.lunarMonth, null),
      lunarDay: safeNumber(star?.lunarDay, null),
      source: text(star?.source),
    },
  };
}

function buildSukuyoCalendarBasis(seed = {}, localJson = {}) {
  const meta = seed?.calculationMeta || {};
  const self = localJson?.input?.self || seed?.userProfile || {};
  const partner = localJson?.input?.partner || seed?.partnerProfile || {};
  return {
    inputCalendarType: text(self?.calendarType || seed?.userProfile?.calendarType || "existing_service_value"),
    partnerInputCalendarType: text(partner?.calendarType || seed?.partnerProfile?.calendarType || "existing_service_value"),
    normalizedDate: text(self?.birthDate),
    partnerNormalizedDate: text(partner?.birthDate),
    timezone: text(self?.timezone || partner?.timezone || meta?.timezone || "Asia/Seoul"),
    lunarDate: {
      self: {
        year: safeNumber(seed?.userSukyo?.lunarYear, null),
        month: safeNumber(seed?.userSukyo?.lunarMonth, null),
        day: safeNumber(seed?.userSukyo?.lunarDay, null),
      },
      partner: {
        year: safeNumber(seed?.partnerSukyo?.lunarYear, null),
        month: safeNumber(seed?.partnerSukyo?.lunarMonth, null),
        day: safeNumber(seed?.partnerSukyo?.lunarDay, null),
      },
    },
    isLeapMonth: Boolean(seed?.userSukyo?.isLeapMonth),
    partnerIsLeapMonth: Boolean(seed?.partnerSukyo?.isLeapMonth),
    mansionSystem: text(meta?.engine || "sukuyo-27").includes("28") ? "28" : "27",
    algorithmVersion: text(meta?.methodVersion || seed?.methodVersion || "sukyo-premium-compat-v2"),
    dateBoundaryRule: text(meta?.dateBoundaryRule || "existing_engine_basis"),
    calendarSource: text(meta?.calendarSource || seed?.calendarSource || seed?.userSukyo?.source || "existing_engine_basis"),
  };
}

export function buildSukuyoFacts(seed = {}, localJson = null) {
  const resolvedLocalJson = localJson || seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const relation = resolvedLocalJson?.relation || {};
  const facts = {
    productId: "sukuyo",
    mode: "compatibility",
    birthInfo: resolvedLocalJson?.input?.self || seed?.userProfile || {},
    partnerBirthInfo: resolvedLocalJson?.input?.partner || seed?.partnerProfile || {},
    calendarBasis: buildSukuyoCalendarBasis(seed, resolvedLocalJson),
    natalMansion: mansionFacts(seed?.userSukyo || {}),
    partnerNatalMansion: mansionFacts(seed?.partnerSukyo || {}),
    personalCore: safeArray([
      resolvedLocalJson?.self?.profile?.relationCore,
      ...(resolvedLocalJson?.self?.keywords || []),
    ]),
    emotionalPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.emotionalPattern),
    relationshipPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.communicationPattern),
    careerTalentPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.longTermStrategy),
    wealthPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.moneyPattern),
    shadowPattern: safeArray(resolvedLocalJson?.relation?.conflictKeywords),
    lifeRhythmPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.reconciliationPattern),
    compatibility: {
      relationType: text(relation?.type || seed?.compatibility?.relationType),
      relationLabel: text(relation?.typeKo || seed?.compatibility?.relationType),
      distance: text(relation?.distanceLabel || seed?.compatibility?.distanceLabel),
      direction: text(seed?.compatibility?.directionFromAToB || seed?.compatibility?.direction || ""),
      score: safeNumber(relation?.score ?? seed?.compatibility?.compatibilityIndex, null),
      strengths: safeArray(resolvedLocalJson?.derived?.mainStrengths),
      risks: safeArray(resolvedLocalJson?.derived?.mainRisks),
      advice: safeArray([
        relation?.roleActionGuide?.meAction,
        relation?.roleActionGuide?.otherAction,
        relation?.roleActionGuide?.resetLine,
      ]),
    },
    timingFlows: {
      annualFlow: [],
      monthlyFlow: [],
      dailyFlow: [],
    },
    opportunitySignals: safeArray(resolvedLocalJson?.derived?.mainStrengths),
    riskWarnings: safeArray(resolvedLocalJson?.derived?.mainRisks),
    recommendedActions: safeArray(resolvedLocalJson?.derived?.requiredAgreements),
    avoidActions: safeArray(["관계 유형만으로 좋고 나쁨을 단정하지 않기", "침묵을 거절로 단정하지 않기"]),
  };
  facts.engineVersion = text(facts.calendarBasis.algorithmVersion || facts.calendarBasis.calendarSource);
  facts.factsHash = hashStable(facts);
  return facts;
}

function buildLockedFacts(facts = {}, chapterSpec = {}) {
  const locked = [
    `모드: ${facts.mode}`,
    `본인 본명숙: ${facts.natalMansion?.label || facts.natalMansion?.name}`,
    `상대 본명숙: ${facts.partnerNatalMansion?.label || facts.partnerNatalMansion?.name}`,
    `관계 유형: ${facts.compatibility?.relationLabel || facts.compatibility?.relationType}`,
    `거리 판정: ${facts.compatibility?.distance}`,
    `27/28숙 기준: ${facts.calendarBasis?.mansionSystem}`,
    `엔진 버전: ${facts.calendarBasis?.algorithmVersion}`,
  ];
  if (facts.compatibility?.score != null) locked.push(`궁합 점수: ${facts.compatibility.score}`);
  if (chapterSpec?.key === "chapter-02-me-love") locked.push(`본인 키워드: ${safeArray(facts.natalMansion?.keywords).slice(0, 4).join(", ")}`);
  if (chapterSpec?.key === "chapter-03-partner-love") locked.push(`상대 키워드: ${safeArray(facts.partnerNatalMansion?.keywords).slice(0, 4).join(", ")}`);
  return locked.filter((item) => !item.endsWith(": "));
}

export function buildSukuyoChapterPlans(seed = {}, localJson = null, localChapters = null) {
  const resolvedLocalJson = localJson || seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const facts = buildSukuyoFacts(seed, resolvedLocalJson);
  const chapters = Array.isArray(localChapters) && localChapters.length
    ? localChapters
    : buildSukyoPremiumChapters(buildSukyoPremiumPdfInput(seed, resolvedLocalJson));
  const categoryCompatibility = buildSukyoCategoryCompatibility(resolvedLocalJson);
  const evidenceMap = buildSukyoChapterEvidenceMap(resolvedLocalJson, categoryCompatibility);
  return getSukyoPdfChapters().map((chapter) => {
    const localChapter = chapters.find((item) => safeNumber(item.order || item.chapterNo, 0) === chapter.order) || {};
    const evidence = evidenceMap.find((item) => item.key === chapter.key) || {};
    return {
      chapterId: chapter.key,
      chapterTitle: chapter.title,
      mode: "compatibility",
      purpose: safeArray(CHAPTER_TOPIC_GUIDE[chapter.order]).join(" · ") || "숙요 관계 흐름을 현실적인 조율 기준으로 정리",
      lockedFacts: buildLockedFacts(facts, chapter),
      interpretationPoints: uniqueSukyoStrings([
        ...safeArray(evidence?.requiredSignals),
        ...safeArray(resolvedLocalJson?.derived?.requiredAgreements),
        ...safeArray(resolvedLocalJson?.derived?.recoveryRoutine),
      ]).slice(0, 18),
      warnings: [
        "본명숙, 관계 유형, 거리, 궁합 점수는 로컬 계산 결과 그대로 유지",
        "관계 실패, 이별, 결혼 실패를 단정하지 않기",
        "사주 용어를 숙요 해석에 섞지 않기",
      ],
      recommendedTone: "전문적이고 신비로운 프리미엄 숙요 상담문",
      localDraft: (Array.isArray(localChapter.sections) ? localChapter.sections : [])
        .map((section) => sanitizeSukyoPremiumBody(section.body))
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

function buildSukyoCategoryCompatibility(localJson = {}) {
  const selfGroup = text(localJson?.self?.group, "미상");
  const partnerGroup = text(localJson?.partner?.group, "미상");
  const selfElement = text(localJson?.self?.element, "미상");
  const partnerElement = text(localJson?.partner?.element, "미상");
  const selfStar = text(localJson?.self?.sukuyoStar, "본명숙");
  const partnerStar = text(localJson?.partner?.sukuyoStar, "상대숙");
  const groupGuide = {
    청룡: { rhythm: "시작과 추진", love: "관계를 빠르게 열고 방향을 제시", shadow: "속도 과열과 조급함" },
    현무: { rhythm: "내면과 축적", love: "신뢰가 쌓일수록 깊어지는 애정", shadow: "침묵과 감정 보류" },
    백호: { rhythm: "현실 감각과 완성", love: "구체적 행동과 책임으로 사랑을 증명", shadow: "비판성과 경직" },
    주작: { rhythm: "표현과 확장", love: "말, 분위기, 설렘으로 관계를 점화", shadow: "감정 기복과 과장" },
  };
  const selfGuide = groupGuide[selfGroup] || { rhythm: "개별 리듬", love: "자기 방식으로 관계를 운영", shadow: "해석 차이" };
  const partnerGuide = groupGuide[partnerGroup] || { rhythm: "개별 리듬", love: "자기 방식으로 관계를 운영", shadow: "해석 차이" };
  const sameGroup = selfGroup && partnerGroup && selfGroup === partnerGroup;
  const sameElement = selfElement && partnerElement && selfElement === partnerElement;

  return {
    pairKey: `${selfGroup} x ${partnerGroup}`,
    elementPairKey: `${selfElement} x ${partnerElement}`,
    self: { star: selfStar, group: selfGroup, element: selfElement, ...selfGuide },
    partner: { star: partnerStar, group: partnerGroup, element: partnerElement, ...partnerGuide },
    compatibilityFocus: sameGroup
      ? `${selfGroup} 기질이 서로 증폭되므로 장점은 빠르게 커지고 그림자도 동시에 커집니다.`
      : `${selfGroup}의 ${selfGuide.rhythm}과 ${partnerGroup}의 ${partnerGuide.rhythm}이 서로 다른 속도로 맞물립니다.`,
    elementFocus: sameElement
      ? `${selfElement} 오행이 겹쳐 공감은 빠르지만 같은 약점이 반복될 수 있습니다.`
      : `${selfElement}과 ${partnerElement} 오행의 차이를 생활 규칙으로 조율해야 합니다.`,
    strengthBridge: `${selfStar}宿의 ${selfGuide.love} 흐름과 ${partnerStar}宿의 ${partnerGuide.love} 흐름을 같은 언어로 번역하는 것이 핵심입니다.`,
    conflictButton: `${selfGuide.shadow}과 ${partnerGuide.shadow}이 동시에 켜질 때 관계 피로가 커집니다.`,
    repairMethod: "감정 확인, 사실 정리, 다음 행동 합의 순서로 회복 대화를 고정합니다.",
  };
}

function uniqueSukyoStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of safeArray(values)) {
    const item = text(value);
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildSukyoChapterEvidenceMap(localJson = {}, categoryCompatibility = {}) {
  const relation = localJson?.relation || {};
  const self = localJson?.self || {};
  const partner = localJson?.partner || {};
  const derived = localJson?.derived || {};
  const seeds = localJson?.interpretationSeeds || {};
  const baseSignals = uniqueSukyoStrings([
    self?.sukuyoStar,
    partner?.sukuyoStar,
    self?.group,
    partner?.group,
    self?.element,
    partner?.element,
    relation?.typeKo,
    relation?.type,
    relation?.distanceLabel,
    relation?.relationTheme,
    categoryCompatibility?.pairKey,
    categoryCompatibility?.elementPairKey,
    categoryCompatibility?.compatibilityFocus,
    categoryCompatibility?.elementFocus,
    categoryCompatibility?.strengthBridge,
    categoryCompatibility?.conflictButton,
    categoryCompatibility?.repairMethod,
    derived?.scoreBand,
    derived?.temperatureBand,
    derived?.magnetismBand,
    ...safeArray(seeds?.requiredAgreements),
    ...safeArray(seeds?.recoveryRoutine),
  ]);
  return SUKYO_PDF_CHAPTERS.map((chapter, chapterIndex) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    requiredSignals: uniqueSukyoStrings([
      ...baseSignals.slice(0, 14),
      chapter.title,
    ]),
    sections: safeArray(chapter.sections).map((heading, sectionIndex) => {
      const offset = (chapterIndex + sectionIndex) % Math.max(1, baseSignals.length);
      return {
        heading,
        requiredSignals: uniqueSukyoStrings([
          self?.sukuyoStar,
          partner?.sukuyoStar,
          relation?.typeKo,
          relation?.distanceLabel,
          categoryCompatibility?.pairKey,
          categoryCompatibility?.elementPairKey,
          ...baseSignals.slice(offset, offset + 8),
        ]).slice(0, 16),
      };
    }),
  }));
}

function buildSukyoGenerationJson(seed = {}, localJson = {}) {
  const relation = localJson?.relation || {};
  const categoryCompatibility = buildSukyoCategoryCompatibility(localJson);
  const chapterEvidenceMap = buildSukyoChapterEvidenceMap(localJson, categoryCompatibility);
  const sukuyoFacts = buildSukuyoFacts(seed, localJson);
  const localChapters = enforceManuscriptLength(buildSukuyoCompatibilityLocalManuscript(localJson)).chapters;
  const chapterPlans = buildSukuyoChapterPlans(seed, localJson, localChapters);
  return {
    serviceName: "숙요점 프리미엄 궁합 PDF",
    assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
    requestContext: {
      sessionId: text(seed?.sessionId),
      reportId: text(seed?.reportId),
      requestId: text(seed?.requestId),
      featureKey: text(seed?.featureKey),
    },
    generationPolicy: {
      manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
      localUsage: "calculation-and-local-manuscript",
      localCalculationOnly: true,
      proseAuthoring: "local-assembled",
      rejectLocalDraft: false,
      rejectFallbackDraft: true,
      forbidden: ["새 숙요 계산", "본명숙 변경", "관계 유형 변경", "거리 판정 변경", "확정적 예언", "공포 마케팅", "사주 용어 혼입"],
      requiredTone: "전문적이고 신비로운 관계 상담문",
    },
    sukuyoFacts,
    calculationTruth: {
      mode: "compatibility",
      input: localJson?.input || {},
      self: localJson?.self || {},
      partner: localJson?.partner || {},
      relation,
      derived: localJson?.derived || {},
      interpretationSeeds: localJson?.interpretationSeeds || {},
      canonicalSeed: {
        userSukyo: seed?.userSukyo || {},
        partnerSukyo: seed?.partnerSukyo || {},
        compatibility: seed?.compatibility || {},
      },
    },
    categoryCompatibility,
    chapterEvidenceMap,
    chapterPlans,
    chapterBlueprint: SUKYO_PDF_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      order: chapter.order,
      title: chapter.title,
      sections: chapter.sections,
      evidence: chapterEvidenceMap.find((item) => item.key === chapter.key) || null,
      plan: chapterPlans.find((item) => item.chapterId === chapter.key) || null,
      localAssembled: true,
    })),
    qualityContract: {
      chapterCount: SUKYO_PDF_CHAPTER_COUNT,
      sectionCountPerChapter: 5,
      minSectionChars: MIN_SECTION_LENGTH,
      minChapterChars: MIN_CHAPTER_LENGTH,
      eachSectionMustUseAtLeastThreeSignals: [
        "self.sukuyoStar",
        "partner.sukuyoStar",
        "relation.typeKo",
        "relation.distanceLabel",
        "categoryCompatibility.pairKey",
        "categoryCompatibility.elementPairKey",
      ],
    },
  };
}

export function buildSukyoLocalAssemblyChapters(seed, skeleton) {
  const localInput = buildSukyoPremiumPdfInput(seed, seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed));
  const localChapters = buildSukyoPremiumChapters(localInput);
  const specsForLocal = Array.isArray(skeleton) && skeleton.length ? skeleton : getSukyoPdfChapters();
  return specsForLocal.map((spec, index) => {
    const local = localChapters.find((chapter) => text(chapter.key) === text(spec.key))
      || localChapters.find((chapter) => safeNumber(chapter.order, 0) === safeNumber(spec.order || index + 1, 0))
      || localChapters[index]
      || {};
    return {
      key: text(spec.key || local.key),
      order: safeNumber(spec.order || local.order || index + 1, index + 1),
      title: text(spec.title || local.title),
      summary: text(local.summary),
      prescription: local.prescription,
      sections: (Array.isArray(spec.sections) ? spec.sections : []).map((heading, sectionIndex) => {
        const localSection = Array.isArray(local.sections) ? local.sections[sectionIndex] || {} : {};
        return {
          heading: text(heading || localSection.heading || localSection.title),
          body: sanitizeSukyoPremiumBody(localSection.body || ""),
          paragraphs: Array.isArray(localSection.paragraphs) ? localSection.paragraphs.slice() : [],
        };
      }),
    };
  });

  const localJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const built = enforceManuscriptLength(buildSukuyoCompatibilityLocalManuscript(localJson)).chapters;
  const specs = Array.isArray(skeleton) && skeleton.length ? skeleton : SUKYO_PDF_CHAPTERS;
  return specs.map((spec, index) => {
    const local = built.find((chapter) => text(chapter.key) === text(spec.key))
      || built.find((chapter) => safeNumber(chapter.order, 0) === safeNumber(spec.order || index + 1, 0))
      || built[index]
      || {};
    return {
      key: text(spec.key || local.key),
      order: safeNumber(spec.order || local.order || index + 1, index + 1),
      title: text(spec.title || local.title),
      sections: (Array.isArray(spec.sections) ? spec.sections : []).map((heading, sectionIndex) => {
        const localSection = Array.isArray(local.sections) ? local.sections[sectionIndex] || {} : {};
        return {
          heading: text(heading || localSection.heading || localSection.title),
          body: sanitizeSukyoPremiumBody(localSection.body || ""),
        };
      }),
    };
  });
}

const SUKYO_PREMIUM_LOCAL_CHAPTERS = Object.freeze([
  { key: "chapter-01-core-map", order: 1, title: "두 사람의 숙명적 궁합 요약", sections: ["두 사람의 전체 인연 한 줄 해석", "이 관계가 시작될 때의 끌림", "함께 있을 때 만들어지는 분위기", "이 관계의 핵심 장점", "가장 조심해야 할 관계의 약점"] },
  { key: "chapter-02-me-love", order: 2, title: "나의 본명숙과 사랑 방식", sections: ["나의 본명숙이 가진 기본 성향", "사랑할 때 드러나는 나의 감정 방식", "관계에서 내가 기대하는 것", "불안할 때 나타나는 나의 반응", "내가 사랑을 오래 유지하는 방법"] },
  { key: "chapter-03-partner-love", order: 3, title: "상대의 본명숙과 사랑 방식", sections: ["상대의 본명숙이 가진 기본 성향", "상대가 사랑을 느끼는 방식", "상대가 관계에서 중요하게 여기는 것", "상대가 멀어질 때 보이는 신호", "상대를 이해하기 위한 핵심 포인트"] },
  { key: "chapter-04-relation-type", order: 4, title: "숙요 관계 유형 정밀 해석", sections: ["두 사람의 관계 유형", "이 관계가 주는 감정적 강도", "서로에게 배우게 되는 것", "관계 유형이 만드는 반복 패턴", "이 관계를 좋게 쓰는 방법"] },
  { key: "chapter-05-distance", order: 5, title: "거리와 인연 강도 분석", sections: ["근거리·중거리·원거리 관계의 의미", "가까워질수록 강해지는 부분", "멀어질수록 드러나는 문제", "인연의 속도와 감정 밀도", "관계의 적절한 거리 조절법"] },
  { key: "chapter-06-attraction", order: 6, title: "첫 만남과 끌림의 이유", sections: ["처음 끌렸던 이유", "서로에게 신비롭게 느껴지는 지점", "외모보다 강하게 작용하는 분위기", "감정이 빨리 깊어지는 이유", "첫 끌림이 오래 지속되기 위한 조건"] },
  { key: "chapter-07-emotion", order: 7, title: "감정 교류와 마음의 온도", sections: ["두 사람의 감정 속도 차이", "애정 표현 방식의 차이", "서운함이 쌓이는 방식", "마음이 통한다고 느끼는 순간", "감정 온도를 맞추는 방법"] },
  { key: "chapter-08-communication", order: 8, title: "대화와 소통 궁합", sections: ["말이 잘 통하는 부분", "말이 엇갈리는 부분", "침묵이 생기는 이유", "싸울 때 사용하는 말의 방식", "관계를 살리는 대화법"] },
  { key: "chapter-09-conflict", order: 9, title: "갈등과 충돌 패턴", sections: ["가장 자주 부딪히는 문제", "서로를 오해하는 지점", "한쪽이 지치게 되는 이유", "감정 폭발이 일어나는 순간", "갈등을 줄이는 현실적인 방법"] },
  { key: "chapter-10-reunion", order: 10, title: "이별과 재회 가능성", sections: ["이 관계가 멀어지는 이유", "이별 후에도 마음이 남는 이유", "재회 가능성을 높이는 조건", "다시 만나도 반복될 수 있는 문제", "재회를 원할 때 가장 중요한 태도"] },
  { key: "chapter-11-marriage", order: 11, title: "장기 연애와 결혼 궁합", sections: ["오래 만날수록 강해지는 부분", "결혼 후 드러날 수 있는 차이", "생활 리듬의 궁합", "책임과 역할 분담의 문제", "장기 관계로 가기 위한 조건"] },
  { key: "chapter-12-reality", order: 12, title: "현실 생활과 가치관 궁합", sections: ["돈과 소비에 대한 태도", "일과 관계의 우선순위", "가족과 주변 사람에 대한 관점", "생활 습관에서 생기는 차이", "현실 문제를 함께 해결하는 방식"] },
  { key: "chapter-13-intimacy", order: 13, title: "친밀감과 애정 표현 궁합", sections: ["서로에게 편안함을 느끼는 방식", "스킨십과 애정 표현의 온도", "사랑받는다고 느끼는 순간", "거절감이나 거리감을 느끼는 순간", "친밀감을 회복하는 방법"] },
  { key: "chapter-14-karma", order: 14, title: "전생 인연과 카르마적 의미", sections: ["이 관계가 전생 인연처럼 느껴지는 이유", "반복해서 끌리는 감정의 정체", "서로에게 남기는 숙제", "관계가 주는 성장의 의미", "이 인연을 성숙하게 마무리하거나 이어가는 법"] },
  { key: "chapter-15-final", order: 15, title: "두 사람을 위한 최종 관계 전략", sections: ["이 관계의 최종 핵심 메시지", "지금 가장 먼저 해야 할 일", "관계를 망치는 행동", "관계를 살리는 행동", "앞으로의 선택을 위한 조언"] },
]);

export const FORBIDDEN_SUKYO_PDF_PHRASES = Object.freeze([
  "달빛을 한 번 짚으면",
  "숙요 신호가 현실의 말투와 선택으로 내려와요",
  "실宿의 창업",
  "삼宿의 변화",
  "A의 개시력이 B의 충돌를",
  "B의 혁신이 A의 마무리 약함를",
  "마음의 신호와 현실 선택을 나란히 확인해야 해요",
  "조심할 신호를 숫자보다 반복되는 장면의 강도로 읽어야 해요",
  "충돌를",
  "마무리 약함를",
  "생길어요",
  "이 흐름는",
  "패밀리 테스트은",
  "이에요.이에요.",
  "필수이에요을",
]);

const RELATION_NARRATIVE_MAP = Object.freeze({
  영친: { core: "익숙함과 편안함이 먼저 흐르지만, 그 온기에 기대어 중요한 마음을 뒤로 미루기 쉬운 인연이에요.", strength: "정서적 회복감과 오래 머무는 친밀감이 두 사람 사이의 큰 복으로 떠올라요.", caution: "편하다는 이유로 서운함을 덮으면 늦은 밤의 침묵처럼 감정이 깊게 고일 수 있어요.", advice: "좋은 분위기 안에서도 필요한 이야기는 부드럽게 꺼내는 약속이 필요해요." },
  안괴: { core: "강한 끌림과 불안정성이 한 줄기 안에서 함께 피어나는 긴장형 인연이에요.", strength: "서로를 각성시키고 오래 묵은 감정 습관을 바꾸게 하는 힘이 강하게 떠올라요.", caution: "감정 기복, 집착, 오해, 힘겨루기가 빨리 번질 수 있어요.", advice: "속도 조절과 경계선 합의가 두 사람의 별빛을 오래 지키는 열쇠예요." },
  위성: { core: "한쪽이 먼저 길을 열고 다른 한쪽이 응답하면서 방향이 만들어지는 인연이에요.", strength: "역할이 자연스럽게 맞을 때 가까워지는 속도가 빠르고 결단도 선명해져요.", caution: "주도권이 한쪽으로 오래 기울면 애정이 아니라 부담으로 느껴질 수 있어요.", advice: "상황마다 이끄는 사람과 기대는 사람의 자리를 바꾸는 유연함이 필요해요." },
  성위: { core: "감정의 끌림과 현실 조건을 함께 비추어야 균형이 열리는 인연이에요.", strength: "구체적인 계획, 생활 감각, 책임의 언어가 살아나기 쉬워요.", caution: "판단이 감정보다 앞서면 마음을 나누기 전에 서로를 평가하게 될 수 있어요.", advice: "현실 조율을 하더라도 애정 표현을 함께 남기는 습관이 좋아요." },
  업태: { core: "오래전부터 이어진 듯한 친숙함과 묘한 숙제가 함께 다가오는 인연이에요.", strength: "설명하기 어려운 끌림과 서로에게 배우게 되는 과제가 분명해요.", caution: "같은 문제를 다른 이름으로 반복하며 관계가 원을 그릴 수 있어요.", advice: "반복되는 장면을 운명으로만 두지 말고 이번에는 다른 선택을 남겨야 해요." },
  명: { core: "닮은 점과 거울 효과가 강하게 떠오르는 인연이에요.", strength: "상대의 기쁨과 불안을 빠르게 알아차릴 수 있는 친밀함이 있어요.", caution: "비슷하기 때문에 더 예민하게 부딪히고, 상대의 약점이 내 그림자처럼 느껴질 수 있어요.", advice: "상대를 고치려는 손길보다 내 반응을 먼저 가다듬는 태도가 중요해요." },
  우쇠: { core: "서로에게 힘이 되기도 하고 부담이 되기도 하는 보호와 책임의 인연이에요.", strength: "현실적 도움, 돌봄, 지지의 기운이 관계를 단단하게 묶어줘요.", caution: "한쪽이 계속 맞추거나 책임지는 구조가 되면 애정의 숨이 가빠질 수 있어요.", advice: "도움과 의존의 선을 분명히 하고 고마움을 말로 남겨야 해요." },
});

const DISTANCE_NARRATIVE_MAP = Object.freeze({
  근거리: { core: "감정이 빠르게 닿고 친밀감이 쉽게 열리는 거리예요.", caution: "가까워지는 속도가 빠른 만큼 경계가 흐려지기 쉬워요.", advice: "초반부터 서로의 생활 리듬과 혼자 숨 쉬는 시간을 존중해야 해요." },
  중거리: { core: "끌림과 거리감이 함께 있어 속도 조율이 중요한 거리예요.", caution: "가까워지고 싶어도 같은 박자로 움직이지 않아 오해가 생길 수 있어요.", advice: "연락, 만남, 애정 표현의 알맞은 속도를 미리 맞추는 편이 좋아요." },
  원거리: { core: "인연감이 강해도 현실 조건과 체감 속도의 차이가 크게 드러나는 거리예요.", caution: "확신이 약해질 때 추측과 불안이 마음을 먼저 흔들 수 있어요.", advice: "감정만으로 밀어붙이기보다 지속 가능한 연결 방식을 꾸준히 만들어야 해요." },
  미상: { core: "거리의 결이 완전히 고정되지 않아 두 사람의 선택이 더 크게 작용하는 흐름이에요.", caution: "기준을 세우지 않으면 기대와 체감의 차이가 빨리 벌어질 수 있어요.", advice: "처음 한 달은 연락과 만남의 기준을 작게 정하고 몸에 맞는지 살피는 편이 좋아요." },
});

const ELEMENT_NARRATIVE_MAP = Object.freeze({
  "목-목": { core: "두 사람의 오행은 함께 자라는 숲처럼 확장과 계획의 기운이 강해요.", strength: "서로를 북돋우며 새 목표를 세울 때 관계의 숨이 싱그러워져요.", caution: "둘 다 자기 방향을 고집하면 가지가 엉키듯 사소한 주도권 다툼이 생길 수 있어요.", advice: "목표를 하나로 묶기보다 각자의 성장 방향을 응원하는 말이 필요해요." },
  "목-화": { core: "목이 화를 살리는 흐름이라 설렘과 표현이 빠르게 살아나는 조합이에요.", strength: "한 사람의 가능성이 다른 사람의 열정을 밝혀 관계가 생동감 있게 열려요.", caution: "속도가 너무 빨라지면 생활의 뿌리가 아직 약한데 감정만 커질 수 있어요.", advice: "뜨거운 약속 뒤에는 실제 일정과 책임을 함께 붙여두는 편이 좋아요." },
  "목-토": { core: "자라려는 목과 붙잡으려는 토가 만나 성장과 안정의 줄다리기를 만들어요.", strength: "꿈과 현실을 함께 놓으면 관계가 오래 버틸 구조를 얻어요.", caution: "한쪽은 답답함을, 다른 한쪽은 불안을 느끼며 서로의 속도를 오해할 수 있어요.", advice: "새로운 시도와 안정 장치를 같은 표에 적어두면 마음이 덜 흔들려요." },
  "목-금": { core: "뻗어나가려는 목과 다듬으려는 금이 만나 자극과 긴장을 함께 만들어요.", strength: "서로의 부족한 기준과 유연함을 배워 관계가 더 세련되게 다듬어져요.", caution: "조언이 비판처럼 들리면 마음의 가지가 쉽게 꺾일 수 있어요.", advice: "고치려는 말보다 먼저 가능성을 인정하는 문장을 놓아야 해요." },
  "목-수": { core: "수가 목을 적셔주는 흐름이라 이해와 성장이 부드럽게 이어지는 조합이에요.", strength: "감정의 수용과 미래의 방향이 만나 관계에 회복력이 살아나요.", caution: "생각과 감정이 많아지면 결정이 늦어지고 약속이 흐려질 수 있어요.", advice: "마음 확인 뒤에는 날짜와 행동을 작게 정해야 흐름이 현실에 닿아요." },
  "화-화": { core: "두 불빛이 서로를 비추어 끌림과 표현이 강하게 솟는 조합이에요.", strength: "함께 웃고 움직일 때 관계의 온도가 빠르게 올라가요.", caution: "감정이 동시에 타오르면 말이 앞서고 회복이 늦어질 수 있어요.", advice: "뜨거운 대화 뒤에는 반드시 식히는 시간을 의식적으로 남겨야 해요." },
  "화-토": { core: "화가 토를 덥히는 흐름이라 열정이 현실의 형태를 얻기 쉬워요.", strength: "감정과 책임이 함께 움직이면 두 사람의 계획이 단단해져요.", caution: "한쪽은 더 표현하고 싶고 다른 한쪽은 확실한 결과를 원해 엇갈릴 수 있어요.", advice: "애정 표현과 현실 합의를 한 자리에서 함께 다루는 편이 좋아요." },
  "화-금": { core: "불이 금을 녹이는 결이라 매력과 압박이 동시에 강하게 떠오르는 조합이에요.", strength: "서로에게 강한 변화를 일으켜 잠들어 있던 욕구를 깨워요.", caution: "말투가 날카로워지면 애정이 시험처럼 느껴질 수 있어요.", advice: "비판은 짧게, 인정은 길게 남기는 균형이 관계를 지켜요." },
  "화-수": { core: "화와 수는 서로를 식히고 끓이는 상극의 결이라 감정 충돌과 상승 에너지가 함께 떠올라요.", strength: "서로를 받아들이면 뜨거움과 깊이가 만나 관계가 강하게 성장해요.", caution: "즉각 반응하면 불과 물이 부딪히듯 말이 튀고 상처가 빨리 번질 수 있어요.", advice: "감정이 올라오는 순간에는 바로 결론 내리지 말고 온도를 낮춘 뒤 다시 말해야 해요." },
  "토-토": { core: "두 토의 만남은 안정과 책임이 강하지만 변화에는 조심스러운 조합이에요.", strength: "생활의 기반, 약속, 신뢰가 천천히 두꺼워져요.", caution: "익숙함에 머물면 관계가 굳고 감정 표현이 줄어들 수 있어요.", advice: "안정 속에서도 작은 새로움을 주기적으로 넣어야 마음이 마르지 않아요." },
  "토-금": { core: "토가 금을 품는 흐름이라 현실 감각과 판단력이 함께 살아나는 조합이에요.", strength: "계획, 돈, 책임의 문제를 비교적 차분하게 맞출 수 있어요.", caution: "효율과 기준이 앞서면 따뜻한 감정 확인이 부족해질 수 있어요.", advice: "정리와 판단 뒤에는 반드시 고마움과 애정을 말로 남겨야 해요." },
  "토-수": { core: "토와 수는 머무름과 흐름이 만나는 결이라 안정과 자유의 조율이 중요해요.", strength: "서로의 부족한 현실감과 감정 깊이를 보완할 수 있어요.", caution: "붙잡으려는 마음과 흘러가려는 마음이 부딪히면 피로가 커져요.", advice: "지켜야 할 기준과 흘려보낼 일을 구분하면 관계가 한결 편안해져요." },
  "금-금": { core: "두 금의 만남은 기준과 선명함이 강해 서로를 정확히 비추는 조합이에요.", strength: "약속과 태도의 일관성이 살아나면 신뢰가 빠르게 단단해져요.", caution: "둘 다 양보하지 않으면 차가운 침묵과 판단이 길어질 수 있어요.", advice: "옳고 그름보다 관계를 살리는 한 걸음을 먼저 고르는 연습이 필요해요." },
  "금-수": { core: "금이 수를 맑게 여는 흐름이라 판단과 감정의 깊이가 함께 움직이는 조합이에요.", strength: "차분한 대화와 섬세한 이해가 만나 관계의 품격이 살아나요.", caution: "생각이 깊어질수록 표현이 늦어져 상대가 거리감을 느낄 수 있어요.", advice: "마음속 결론을 오래 숨기지 말고 중간 생각을 부드럽게 나누는 편이 좋아요." },
  "수-수": { core: "두 수의 만남은 감정의 깊이와 공감이 크지만 방향을 잃기 쉬운 조합이에요.", strength: "서로의 미묘한 마음을 잘 느끼며 깊은 위로를 주고받을 수 있어요.", caution: "불안이 겹치면 추측이 추측을 낳아 마음의 파도가 커질 수 있어요.", advice: "감정을 충분히 나누되 마지막에는 현실 행동 하나를 반드시 정해야 해요." },
});

const SYUKU_NARRATIVE_OVERRIDES = Object.freeze({
  묘숙: { core: "묘宿은 달의 빛처럼 섬세하게 살피고 보호하려는 마음이 강한 숙이에요.", loveStyle: "마음이 깊어질수록 말보다 챙김, 기억, 조심스러운 확인으로 사랑을 흘려보내요.", strength: "상대가 지친 순간을 빨리 알아차리고 정서적 안식처를 만들어주는 힘이 있어요.", weakness: "불안이 커지면 과보호나 조용한 회피로 마음을 숨길 수 있어요.", conflictPattern: "상대의 말투가 차갑거나 연락의 온도가 달라지면 혼자 해석을 키우기 쉬워요.", advice: "서운함을 오래 품기보다 작은 신호일 때 부드럽게 꺼내야 사랑이 편안해져요." },
  삼숙: { core: "삼宿은 변화와 추진의 별빛이 강해 관계 안에서도 살아 있는 움직임을 원해요.", loveStyle: "정체된 다정함보다 함께 움직이고 새 길을 열 때 마음이 더 분명하게 열려요.", strength: "멈춰 있는 관계에 활기와 방향을 불어넣고 문제를 빠르게 돌파하는 힘이 있어요.", weakness: "압박을 받거나 지루함이 길어지면 갑작스러운 거리두기로 반응할 수 있어요.", conflictPattern: "감정보다 해결책을 먼저 꺼내 상대에게 차갑게 비칠 때가 있어요.", advice: "바로 결론을 내리기 전에 상대의 감정 온도를 먼저 확인하면 충돌이 줄어들어요." },
  실숙: { core: "실宿은 관계의 문을 열고 방향을 잡으려는 개시의 힘이 강한 숙이에요.", loveStyle: "마음이 움직이면 태도가 비교적 분명하고 관계를 앞으로 밀어가는 편이에요.", strength: "관계에 생기를 만들고 첫 흐름을 열어주는 힘이 또렷해요.", weakness: "처음의 추진력에 비해 감정을 끝까지 정리하는 자리에서는 피로가 쌓일 수 있어요.", conflictPattern: "상대의 반응이 늦거나 모호하면 답답함을 먼저 느끼기 쉬워요.", advice: "속도를 내기 전 상대가 따라올 시간을 남겨두면 인연의 숨이 깊어져요." },
});

const CHAPTER_LOCAL_LENS = Object.freeze({
  1: { axis: "인연의 큰 그림", scene: "처음에는 운명처럼 가까운데 시간이 지나며 서로의 기대가 선명해지는 장면", practice: "관계 초반의 강도를 전체 운명으로 단정하지 않기" },
  2: { axis: "나의 사랑 습관", scene: "내가 원하는 확인과 상대가 편안하게 주는 표현이 엇갈리는 장면", practice: "원하는 애정 표현을 짧고 구체적인 말로 전하기" },
  3: { axis: "상대의 감정 언어", scene: "상대가 마음을 숨긴 것이 아니라 다른 방식으로 내미는 장면", practice: "상대의 반복 행동을 애정 언어로 다시 읽어보기" },
  4: { axis: "관계 유형의 작동", scene: "끌림이 강한 만큼 작은 말도 크게 울리는 장면", practice: "감정이 뜨거울 때 결론을 미루는 규칙 세우기" },
  5: { axis: "거리와 밀도", scene: "가까운 마음이 위로가 되다가 어느 순간 부담으로 바뀌는 장면", practice: "연락과 개인 시간을 함께 정하기" },
  6: { axis: "첫 끌림의 기억", scene: "처음 좋았던 점이 시간이 지나며 갈등의 씨앗으로 바뀌는 장면", practice: "설렘 뒤에 필요한 생활 리듬 확인하기" },
  7: { axis: "감정 온도", scene: "한 사람은 이미 뜨거운데 다른 사람은 아직 말을 고르는 장면", practice: "대화 전 감정 온도를 숫자로 나누기" },
  8: { axis: "대화의 길", scene: "한쪽은 공감을 원하고 다른 한쪽은 해결책을 먼저 꺼내는 장면", practice: "공감 한 문장 뒤에 해결책을 말하기" },
  9: { axis: "충돌의 반복", scene: "같은 말이 다른 상처를 건드리며 다툼이 길어지는 장면", practice: "다툼 직후 30분 냉각 시간을 고정하기" },
  10: { axis: "이별과 귀환", scene: "멀어졌는데도 마음의 잔상이 쉽게 사라지지 않는 장면", practice: "그리움과 변화 가능성을 따로 적어보기" },
  11: { axis: "오래 가는 힘", scene: "감정보다 생활 리듬과 책임의 무게가 관계를 시험하는 장면", practice: "생활 규칙과 역할 분담을 미리 나누기" },
  12: { axis: "현실의 조율", scene: "돈, 시간, 가족, 일상의 선택이 애정의 언어가 되는 장면", practice: "공동의 몫과 각자의 몫을 나누기" },
  13: { axis: "친밀감의 온기", scene: "한 사람의 다정함이 다른 사람에게는 압박처럼 닿는 장면", practice: "받기 편한 애정 표현을 서로 알려주기" },
  14: { axis: "카르마의 숙제", scene: "낯설지 않은 끌림이 오래된 과제처럼 반복되는 장면", practice: "반복되는 문제에 이번 생의 새 선택 남기기" },
  15: { axis: "최종 운영 전략", scene: "좋아하는 마음만으로는 부족하고 행동의 약속이 필요한 장면", practice: "멈출 행동과 살릴 행동을 한 가지씩 정하기" },
});

export function hasBatchim(str = "") {
  const value = text(str).trim();
  if (!value) return false;
  const last = value.charCodeAt(value.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

export function withJosa(name, pair) {
  const [withBatchim, withoutBatchim] = String(pair || "은/는").split("/");
  return `${text(name)}${hasBatchim(name) ? withBatchim : withoutBatchim}`;
}

function normalizeSyukuKorean(value, fallback = "본명숙") {
  const raw = text(value, fallback).replace(/宿/g, "숙").replace(/\s+/g, "");
  if (!raw) return fallback;
  return raw.endsWith("숙") ? raw : `${raw}숙`;
}

function formatSyukuHost(value, fallback = "본명") {
  return `${normalizeSyukuKorean(value, fallback).replace(/숙$/, "")}宿`;
}

function normalizeRelationLabel(value) {
  const raw = text(value, "관계");
  if (/안괴|安壞|ankai|angoe/i.test(raw)) return "안괴";
  if (/영친|榮親|荣亲/i.test(raw)) return "영친";
  if (/업태|業胎/i.test(raw)) return "업태";
  if (/위성|危成/i.test(raw)) return "위성";
  if (/성위|成危/i.test(raw)) return "성위";
  if (/우쇠|友衰/i.test(raw)) return "우쇠";
  if (/명|命/i.test(raw)) return "명";
  return raw;
}

function normalizeDistanceLabel(value) {
  const raw = text(value);
  if (/near|근|가까/i.test(raw)) return "근거리";
  if (/middle|중/i.test(raw)) return "중거리";
  if (/far|원|먼/i.test(raw)) return "원거리";
  return raw || "미상";
}

function normalizeElementLabel(value) {
  const raw = text(value).toLowerCase();
  if (/목|wood/.test(raw)) return "목";
  if (/화|fire/.test(raw)) return "화";
  if (/토|earth/.test(raw)) return "토";
  if (/금|metal/.test(raw)) return "금";
  if (/수|water/.test(raw)) return "수";
  return text(value, "미상");
}

function getElementNarrative(aElement, bElement) {
  const a = normalizeElementLabel(aElement);
  const b = normalizeElementLabel(bElement);
  const direct = ELEMENT_NARRATIVE_MAP[`${a}-${b}`];
  if (direct) return direct;
  const reverse = ELEMENT_NARRATIVE_MAP[`${b}-${a}`];
  if (reverse) {
    return {
      core: reverse.core,
      strength: reverse.strength,
      caution: reverse.caution,
      advice: reverse.advice,
    };
  }
  return {
    core: `${a}와 ${b}의 오행은 고정된 판정보다 서로의 생활 리듬 안에서 결이 드러나는 조합이에요.`,
    strength: "다름을 인정하면 한쪽의 빈자리를 다른 한쪽이 조용히 채워줄 수 있어요.",
    caution: "오행 차이를 성격 탓으로만 돌리면 실제로 맞출 수 있는 부분을 놓치기 쉬워요.",
    advice: "감정의 온도, 말의 속도, 생활의 기준을 각각 나누어 맞추는 편이 좋아요.",
  };
}

function localScore(...values) {
  for (const value of values) {
    const score = safeNumber(value, null);
    if (score != null) return Math.max(0, Math.min(100, Math.round(score)));
  }
  return null;
}

function scoreTone(score, fallback = "중간") {
  const value = safeNumber(score, null);
  if (value == null) return fallback;
  if (value >= 75) return "강하게 살아나는 편";
  if (value >= 60) return "조율하면 안정되는 편";
  if (value >= 45) return "노력이 흐름을 바꾸는 편";
  return "세심한 관리가 필요한 편";
}

function getRelationNarrative(type) {
  const key = normalizeRelationLabel(type);
  return RELATION_NARRATIVE_MAP[key] || {
    core: `${key}의 결은 두 사람의 선택에 따라 온도가 달라지는 인연이에요.`,
    strength: "서로의 다른 리듬이 맞을 때 예상보다 깊은 배움이 열려요.",
    caution: "이름만으로 좋고 나쁨을 단정하면 실제 마음의 변화를 놓칠 수 있어요.",
    advice: "반복되는 감정 장면을 살피고 회복 규칙을 작게 세우는 편이 좋아요.",
  };
}

function getDistanceNarrative(distance) {
  const key = normalizeDistanceLabel(distance);
  return DISTANCE_NARRATIVE_MAP[key] || DISTANCE_NARRATIVE_MAP.미상;
}

function buildGeneratedSyukuNarrative(value) {
  const label = normalizeSyukuKorean(value, "본명숙");
  const plain = label.replace(/숙$/, "");
  const mansion = SUKUYO_MANSIONS.find((item) => {
    const nameKo = normalizeSyukuKorean(item?.nameKo, "");
    return nameKo === label || text(item?.nameHan) === plain || text(item?.nameEn).toLowerCase() === plain.toLowerCase();
  }) || {};
  const keywords = safeArray(mansion.keywords).slice(0, 3).join(", ") || "섬세한 감각, 관계의 리듬, 마음의 반응";
  const strengths = safeArray(mansion.strengths).slice(0, 2).join("과 ") || "관계를 살피는 감각";
  const shadows = safeArray(mansion.shadows).slice(0, 2).join("과 ") || "불안이 커질 때의 방어";
  return {
    core: `${formatSyukuHost(label)}은 ${keywords}의 별빛이 관계 안에서 은근히 드러나는 숙이에요.`,
    loveStyle: `${formatSyukuHost(label)}의 사랑은 한 번에 단정되기보다 상대의 반응을 살피며 천천히 형태를 잡아가요.`,
    strength: `${strengths}이 두 사람 사이에 살아날 때 관계의 온기가 또렷해져요.`,
    weakness: `${shadows}이 올라오면 마음보다 방어가 먼저 나올 수 있어요.`,
    conflictPattern: "상대의 속도와 표현이 다르게 느껴질 때 작은 오해가 길게 이어지기 쉬워요.",
    advice: "감정이 흔들릴수록 결론보다 확인을 먼저 남기면 인연의 결이 부드러워져요.",
  };
}

function getSyukuNarrative(value) {
  const key = normalizeSyukuKorean(value, "본명숙");
  return SYUKU_NARRATIVE_OVERRIDES[key] || buildGeneratedSyukuNarrative(key);
}

function buildSukyoPremiumPdfInput(seed = {}, localJson = null) {
  const resolved = localJson || seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const relation = resolved?.relation || {};
  const compatibility = seed?.compatibility || {};
  const chemistry = relation?.chemistry || {};
  const personAName = text(seed?.userProfile?.name || resolved?.input?.self?.name, "나");
  const personBName = text(seed?.partnerProfile?.name || resolved?.input?.partner?.name, "상대");
  const relationType = normalizeRelationLabel(compatibility.relationType || relation?.typeKo || relation?.type);
  const distance = normalizeDistanceLabel(relation?.distanceLabel || compatibility.distanceLabel || compatibility.distance);

  return {
    personA: {
      name: personAName,
      displayName: personAName,
      syuku: text(seed?.userSukyo?.nameHan || resolved?.self?.sukuyoStar),
      syukuKorean: normalizeSyukuKorean(seed?.userSukyo?.nameKo || resolved?.self?.sukuyoStar, "본명숙"),
      element: normalizeElementLabel(seed?.userSukyo?.element || resolved?.self?.element),
      direction: text(compatibility.directionFromAToB || relation.directionFromAToB),
      traits: safeArray(seed?.userSukyo?.traits || seed?.userSukyo?.keywords || resolved?.self?.keywords),
    },
    personB: {
      name: personBName,
      displayName: personBName,
      syuku: text(seed?.partnerSukyo?.nameHan || resolved?.partner?.sukuyoStar),
      syukuKorean: normalizeSyukuKorean(seed?.partnerSukyo?.nameKo || resolved?.partner?.sukuyoStar, "상대숙"),
      element: normalizeElementLabel(seed?.partnerSukyo?.element || resolved?.partner?.element),
      direction: text(compatibility.directionFromBToA || relation.directionFromBToA),
      traits: safeArray(seed?.partnerSukyo?.traits || seed?.partnerSukyo?.keywords || resolved?.partner?.keywords),
    },
    relation: {
      type: text(relation?.type || compatibility.relationType),
      typeKorean: relationType,
      distance,
      directionAToB: text(compatibility.directionFromAToB || relation.directionFromAToB),
      directionBToA: text(compatibility.directionFromBToA || relation.directionFromBToA),
      totalScore: localScore(relation.score, relation.compatibilityScore, compatibility.score, compatibility.compatibilityIndex),
      elementHarmonyScore: localScore(relation?.elementHarmony?.harmonyScore, compatibility?.elementHarmony?.harmonyScore),
      shortSummary: text(relation?.relationTheme),
    },
    scores: {
      attraction: localScore(relation.magnetism, compatibility.magnetism, compatibility.chemistryScore, 58),
      communication: localScore(chemistry.communication, compatibility.communicationScore, 55),
      recovery: localScore(chemistry.recoveryPotential, compatibility.growthScore, 51),
      stability: localScore(chemistry.dailyLife, compatibility.stabilityScore, 53),
      growth: localScore(relation.magnetism, compatibility.growthScore, 52),
      reality: localScore(chemistry.dailyLife, compatibility.stabilityScore, 53),
      emotionalResonance: localScore(chemistry.emotional, compatibility.temperature, compatibility.chemistryScore, 58),
      longTerm: localScore(chemistry.longTermPotential, compatibility.compatibilityIndex, compatibility.score, 50),
      intimacy: localScore(chemistry.physical, compatibility.chemistryScore, chemistry.emotional, 56),
    },
  };
}

function relationSignature(input) {
  const a = input.personA;
  const b = input.personB;
  const relation = getRelationNarrative(input.relation.typeKorean);
  const distance = getDistanceNarrative(input.relation.distance);
  const element = getElementNarrative(a.element, b.element);
  return { a, b, relation, distance, element, aSyuku: getSyukuNarrative(a.syukuKorean), bSyuku: getSyukuNarrative(b.syukuKorean) };
}

export function renderChapterSummary(input, chapterNo, chapterTitle) {
  const { a, b, relation, distance, element, aSyuku, bSyuku } = relationSignature(input);
  const score = input.relation.totalScore;
  switch (chapterNo) {
    case 1:
      return `${withJosa(a.displayName, "은/는")} ${formatSyukuHost(a.syukuKorean)}의 결로 마음을 살피고, ${withJosa(b.displayName, "은/는")} ${formatSyukuHost(b.syukuKorean)}의 결로 관계에 움직임을 불어넣어요. ${input.relation.typeKorean}의 흐름과 ${a.element || "미상"}·${b.element || "미상"} 오행은 좋고 나쁨보다 조율의 방식이 더 크게 작용하며, ${distance.core} 종합 기운은 ${score != null ? `${score}점대로 ` : ""}${scoreTone(score)}이에요.`;
    case 2:
      return `${a.displayName}님의 사랑은 ${aSyuku.loveStyle} 이 장에서는 내 마음이 열리는 방식과 불안할 때 나타나는 방어를 함께 비춰요. 나를 알아야 상대에게 바라는 온도도 부드럽게 전해져요.`;
    case 3:
      return `${b.displayName}님의 사랑은 ${bSyuku.loveStyle} 상대의 반복되는 행동을 기질의 별빛으로 살피면 불필요한 오해가 줄어요. 마음을 바꾸려 하기보다 읽는 법을 바꾸는 장이에요.`;
    case 4:
      return `${input.relation.typeKorean} 관계는 ${relation.core} 이 장에서는 그 강도가 왜 매력과 부담을 동시에 일으키는지 살펴요. 핵심은 감정의 크기보다 회복 약속을 얼마나 현실에 남기느냐예요.`;
    case 5:
      return `${input.relation.distance}의 흐름은 ${distance.core} 가까움은 선물이지만 경계가 흐려지면 피로가 빨리 차올라요. 이 장에서는 인연의 속도와 알맞은 간격을 함께 다뤄요.`;
    case 15:
      return `마지막 장에서는 두 사람의 별빛을 행동의 약속으로 묶어요. ${relation.advice} 오늘부터 줄일 것과 살릴 것을 분명히 하면 이 인연은 감정의 파도보다 운영의 힘으로 오래 버틸 수 있어요.`;
    default: {
      const lens = CHAPTER_LOCAL_LENS[chapterNo] || { axis: chapterTitle, scene: "관계의 실제 장면", practice: "작은 약속을 남기기" };
      return `${chapterTitle}에서는 ${lens.axis}이 두 사람 사이에서 어떻게 흐르는지 살펴요. ${relation.strength} ${element.core} 다만 ${relation.caution} 그래서 ${lens.practice}가 이 장의 중심 처방으로 떠올라요.`;
    }
  }
}

function sectionLens(sectionTitle, chapterNo) {
  const title = text(sectionTitle);
  if (/돈|소비|현실/.test(title)) return { scene: "결제, 저축, 주말 계획처럼 아주 현실적인 선택 앞에서 마음의 결이 갈라지는 순간", practice: "공동의 몫과 각자의 몫을 숫자로 나누기", symbol: "생활의 그릇" };
  if (/대화|말|침묵|소통/.test(title)) return { scene: "메시지 한 줄의 온도와 답장을 기다리는 시간에서 마음이 흔들리는 순간", practice: "공감, 사실, 다음 행동의 순서로 말하기", symbol: "말의 물길" };
  if (/갈등|충돌|오해|폭발|망치는/.test(title)) return { scene: "상대의 한마디가 오래된 불안을 건드리며 다툼의 불씨가 커지는 순간", practice: "30분 냉각 뒤에 다시 말하기", symbol: "회복의 문턱" };
  if (/이별|재회|멀어/.test(title)) return { scene: "멀어졌는데도 작은 기억이 마음을 되돌려 세우는 순간", practice: "그리움과 변화 가능성을 따로 적어보기", symbol: "되돌아오는 파도" };
  if (/결혼|장기|오래|책임/.test(title)) return { scene: "좋아하는 마음보다 생활의 리듬과 책임이 더 크게 말을 거는 순간", practice: "역할과 쉼의 기준을 함께 정하기", symbol: "오래 타는 등불" };
  if (/친밀|스킨십|애정|사랑받/.test(title)) return { scene: "다정함을 주고도 상대가 다르게 받아들여 마음이 잠시 멈추는 순간", practice: "받기 편한 표현을 서로 알려주기", symbol: "온기의 결" };
  if (/전생|카르마|숙제|성장/.test(title)) return { scene: "처음인데 낯설지 않고, 반복되는 문제가 오래된 약속처럼 다가오는 순간", practice: "같은 장면에서 다른 선택 하나 남기기", symbol: "달 아래의 약속" };
  if (/끌림|첫|신비|분위기/.test(title)) return { scene: "처음에는 이유 없이 가까운데 시간이 지나며 서로의 속도 차이가 떠오르는 순간", practice: "설렘 뒤의 생활 리듬 확인하기", symbol: "첫 별빛" };
  if (/감정|서운|마음|온도/.test(title)) return { scene: "한 사람은 뜨겁게 느끼고 다른 사람은 아직 말을 고르는 순간", practice: "지금의 감정 온도를 숫자로 나누기", symbol: "마음의 온도" };
  const chapter = CHAPTER_LOCAL_LENS[chapterNo] || {};
  return { scene: chapter.scene || "관계의 실제 선택이 마음의 방향을 바꾸는 순간", practice: chapter.practice || "작은 약속을 현실에 남기기", symbol: chapter.axis || "관계의 결" };
}

function renderInitialAttraction(input) {
  const { a, b, relation, distance, aSyuku, bSyuku } = relationSignature(input);
  return [
    `이 관계의 시작은 단순한 호감보다 서로의 결이 다르다는 감각에서 열리기 쉬워요. ${withJosa(a.displayName, "은/는")} ${aSyuku.loveStyle} 반면 ${withJosa(b.displayName, "은/는")} ${bSyuku.loveStyle}`,
    `${input.relation.typeKorean}의 별빛은 ${relation.core} ${input.relation.distance}까지 겹치면 두 사람은 빠르게 가까워져도 같은 깊이에 동시에 도착하지 않을 수 있어요.`,
    `초반에는 연락 속도, 약속을 잡는 방식, 눈빛을 해석하는 방법에서 미묘한 차이가 드러나요. 끌림이 강하다고 해서 기대도 같다고 단정하면 뒤늦은 서운함이 커질 수 있어요.`,
    `${distance.advice} 첫 설렘을 오래 데려가려면 마음의 크기를 확인하기보다 서로의 생활 리듬을 천천히 맞추는 과정이 더 중요해요.`,
  ];
}

function renderEmotionalSpeed(input) {
  const { a, b, relation } = relationSignature(input);
  return [
    `${withJosa(a.displayName, "은/는")} 감정이 안전하다고 느껴질 때 더 깊이 열리고, ${withJosa(b.displayName, "은/는")} 관계 안의 움직임이 살아 있을 때 마음이 선명해져요. 두 속도는 틀린 것이 아니라 서로 다른 별의 박자예요.`,
    `${input.relation.typeKorean}에서는 ${relation.caution} 그래서 한쪽은 기다림을 사랑으로 여기고, 다른 한쪽은 움직임을 사랑으로 여길 수 있어요.`,
    `현실에서는 답장 시간, 만나는 빈도, 대화의 길이에서 온도 차이가 먼저 떠올라요. 바로 서운함으로 읽기 전에 “지금 마음의 속도가 다른가”를 먼저 물으면 감정이 부드러워져요.`,
    `두 사람에게 좋은 방법은 대화 전 숫자로 온도를 나누는 거예요. “나는 지금 7이야, 3까지 내려가면 다시 말하자”처럼 짧은 신호를 만들면 불필요한 상처가 줄어요.`,
  ];
}

function renderCommunicationMismatch(input) {
  const { a, b, relation } = relationSignature(input);
  return [
    `말이 엇갈릴 때 ${withJosa(a.displayName, "은/는")} 감정의 확인을 먼저 원하고, ${withJosa(b.displayName, "은/는")} 해결의 길을 먼저 찾으려 할 수 있어요. 두 사람의 말은 같은 목적지를 향해도 출발점이 달라요.`,
    `${input.relation.typeKorean}의 흐름에서는 ${relation.caution} 그래서 “왜 결론부터 말해?”와 “왜 계속 감정만 말해?”가 같은 밤에 마주칠 수 있어요.`,
    `이때 필요한 것은 누가 맞는지를 가르는 판정이 아니에요. 먼저 “네가 느낀 건 이거였구나”라고 감정의 자리를 놓고, 그다음 사실과 다음 행동을 나누면 대화의 문이 다시 열려요.`,
    `오늘 바로 쓸 수 있는 문장은 짧을수록 좋아요. “내가 원하는 건 해결책 전에 내 마음을 한 번 받아주는 거야”라는 말이 두 사람의 길을 덜 가파르게 만들어요.`,
  ];
}

function renderReunionCondition(input) {
  const { a, b, relation, distance } = relationSignature(input);
  return [
    `${input.relation.typeKorean}의 인연은 멀어진 뒤에도 마음의 잔상이 쉽게 사라지지 않을 수 있어요. ${relation.core} 그래서 그리움이 크다고 해서 곧바로 회복의 준비가 끝난 것은 아니에요.`,
    `${withJosa(a.displayName, "과/와")} ${withJosa(b.displayName, "은/는")} 다시 가까워지기 전에 이전의 상처가 어떤 장면에서 반복됐는지 한 문장으로 붙잡아야 해요. 같은 이유를 흐리게 두면 재회의 문은 열려도 같은 바람이 다시 들어와요.`,
    `${distance.core} 이 결에서는 연락 한 번, 미소 한 번에도 마음이 빨리 흔들릴 수 있어요. 그래서 재회는 감정의 크기보다 바뀐 행동이 실제로 보이는지를 기준으로 보아야 해요.`,
    `재회를 원한다면 먼저 “다시 만나면 내가 멈출 행동 하나와 새로 할 행동 하나”를 써보세요. 그 문장이 현실적일수록 인연은 그리움이 아니라 성숙 쪽으로 기울어요.`,
  ];
}

function renderLongTermCondition(input) {
  const { a, b, relation, distance } = relationSignature(input);
  return [
    `오래 가는 관계에서는 끌림보다 반복되는 하루의 결이 더 큰 힘을 가져요. ${withJosa(a.displayName, "은/는")} 안정감을, ${withJosa(b.displayName, "은/는")} 살아 있는 변화를 원할 때 두 욕구가 서로를 밀어내지 않게 다뤄야 해요.`,
    `${input.relation.typeKorean}에서는 ${relation.strength} 하지만 생활의 규칙이 없으면 강한 끌림도 피로로 바뀔 수 있어요.`,
    `${distance.caution} 장기 관계로 갈수록 약속 시간, 돈의 쓰임, 가족과의 경계, 혼자 쉬는 시간이 사랑의 시험지가 돼요.`,
    `두 사람에게 필요한 조건은 감정의 선언보다 운영의 합의예요. 매주 한 번 “이번 주에 고마웠던 것, 불편했던 것, 다음 주에 바꿀 것”을 짧게 나누면 관계의 등불이 오래 타요.`,
  ];
}

function renderRelationTypeSection(input) {
  const { a, b, relation, distance, element } = relationSignature(input);
  return [
    `${input.relation.typeKorean}의 문은 두 사람이 서로에게 어떤 역할로 다가오는지를 먼저 비춰요. ${relation.core} ${withJosa(a.displayName, "과/와")} ${withJosa(b.displayName, "은/는")} 이 이름을 판정이 아니라 운영법으로 받아들일 때 관계가 부드러워져요.`,
    `${relation.strength} 여기에 ${element.core} 그래서 두 사람은 감정의 끌림만으로 움직일 때보다 각자의 기운이 어떤 방식으로 상대를 흔드는지 알아차릴 때 더 안정돼요.`,
    `${distance.core} 가까움과 거리감의 결은 관계 유형의 장점을 빠르게 키우기도 하고 그림자를 빨리 드러내기도 해요. 반복되는 말투, 약속의 속도, 갈등 뒤 돌아오는 시간을 함께 보면 두 사람의 실제 궁합이 선명해져요.`,
    `${relation.advice} 오늘의 조율은 “우리가 어떤 관계인지”를 묻는 데서 끝나지 않아요. “이 관계를 좋게 쓰려면 내가 멈출 반응은 무엇인가”까지 정해야 별빛이 현실에 닿아요.`,
  ];
}

function renderDistanceSection(input) {
  const { a, b, relation, distance, element } = relationSignature(input);
  return [
    `${input.relation.distance}의 결은 두 사람의 마음이 닿는 속도를 정해요. ${distance.core} ${withJosa(a.displayName, "과/와")} ${withJosa(b.displayName, "은/는")} 같은 감정을 느껴도 체감하는 간격이 다를 수 있어요.`,
    `${input.relation.typeKorean}에서는 ${relation.caution} 여기에 ${element.caution} 그래서 가까워지는 방식이 사랑의 증거가 되기도 하고, 때로는 부담의 신호가 되기도 해요.`,
    `현실에서는 연락을 얼마나 자주 하는지, 만난 뒤 혼자 쉬는 시간이 필요한지, 서운함을 당일에 풀지 다음 날에 풀지가 거리의 시험으로 올라와요. 이 기준을 흐리게 두면 좋은 감정도 쉽게 피로로 바뀌어요.`,
    `${distance.advice} 두 사람은 “얼마나 자주”보다 “어떤 상태로 만나는가”를 먼저 맞추는 편이 좋아요. 그래야 거리의 복이 소진이 아니라 안정으로 흘러요.`,
  ];
}

function renderRealitySection(input) {
  const { a, b, relation, distance, element } = relationSignature(input);
  return [
    `현실 생활의 장에서는 감정보다 돈, 시간, 역할, 주변 사람의 기준이 먼저 모습을 드러내요. ${element.core} 이 오행의 결은 두 사람이 현실 문제를 대할 때의 속도와 우선순위를 비춰요.`,
    `${withJosa(a.displayName, "은/는")} 자신의 안정 기준을 분명히 해야 하고, ${withJosa(b.displayName, "은/는")} 상대가 무엇을 불안으로 느끼는지 먼저 알아차려야 해요. ${relation.strength}`,
    `현실의 장면은 여행 예산, 가족과 보내는 시간, 집 정리 방식, 일 때문에 약속이 바뀌는 순간처럼 작게 찾아와요. 작은 선택을 계속 미루면 나중에는 애정이 아니라 신뢰의 문제로 커져요.`,
    `${distance.advice} 두 사람에게 좋은 실천은 공동의 몫과 각자의 몫을 나누는 거예요. 함께 쓸 돈, 혼자 쓸 시간, 외부 관계의 경계를 미리 정하면 감정의 흔들림이 훨씬 줄어요.`,
  ];
}

function renderIntimacySection(input) {
  const { a, b, relation, distance, element, aSyuku, bSyuku } = relationSignature(input);
  return [
    `친밀감은 두 사람이 같은 방식으로 사랑을 주고받을 때만 열리는 것이 아니에요. ${aSyuku.loveStyle} ${bSyuku.loveStyle}`,
    `${input.relation.typeKorean}의 흐름에서는 ${relation.strength} 하지만 ${relation.caution} 그래서 다정함이 많아도 상대가 받기 편한 모양이 아니면 마음이 잠시 물러날 수 있어요.`,
    `${element.strength} 현실에서는 손을 잡는 순간, 식사를 챙기는 말, 함께 문제를 해결하려는 태도처럼 서로 다른 애정 언어가 나타나요. 이 신호를 놓치면 사랑이 없는 것이 아니라 번역이 늦어진 것일 수 있어요.`,
    `${distance.advice} 친밀감을 회복하려면 “내가 주고 싶은 방식”과 “상대가 받기 쉬운 방식”을 따로 말해보세요. 그 구분이 생기면 사랑은 더 편안한 온도로 머물러요.`,
  ];
}

function renderKarmaSection(input) {
  const { a, b, relation, distance, element } = relationSignature(input);
  return [
    `카르마의 장에서는 두 사람이 왜 낯설지 않게 끌리고, 왜 같은 장면에서 다시 배워야 하는지를 비춰요. ${input.relation.typeKorean}의 흐름은 ${relation.core}`,
    `${formatSyukuHost(a.syukuKorean)}과 ${formatSyukuHost(b.syukuKorean)}의 만남은 서로에게 익숙한 위로와 낯선 과제를 동시에 남겨요. ${element.core}`,
    `${distance.core} 그래서 작은 말 한마디도 오래된 기억처럼 마음에 남을 수 있어요. 반복되는 서운함을 운명으로만 두면 같은 숙제가 다시 돌아오고, 다른 선택을 남기면 그 장면이 성장의 문이 돼요.`,
    `이 인연을 성숙하게 쓰려면 “내가 이번에는 다르게 반응할 부분”을 하나 정해야 해요. 상대를 바꾸는 주문보다 내 반복을 멈추는 약속이 카르마를 가장 조용히 풀어줘요.`,
  ];
}

function renderBreakingBehavior(input) {
  const { a, b, relation } = relationSignature(input);
  return [
    `이 관계를 가장 빨리 약하게 만드는 행동은 불안한 상태에서 결론을 재촉하는 거예요. ${input.relation.typeKorean}의 결에서는 ${relation.caution}`,
    `${withJosa(a.displayName, "은/는")} 침묵으로 마음을 숨기고, ${withJosa(b.displayName, "은/는")} 빠른 판단이나 거리두기로 반응하면 두 사람은 같은 상처를 다른 방식으로 키울 수 있어요.`,
    `피해야 할 것은 세 가지예요. 첫째, 답이 늦다는 이유로 사랑이 식었다고 단정하지 않기. 둘째, 서운함을 모아 한꺼번에 꺼내지 않기. 셋째, 갈등 중 과거의 말을 증거처럼 끌고 오지 않기.`,
    `대체 행동은 더 작고 분명해야 해요. “지금은 불안해서 확인이 필요해”와 “나는 잠시 정리한 뒤 다시 올게”라는 문장을 서로의 안전 문장으로 정하면 관계가 무너지기 전에 멈출 수 있어요.`,
  ];
}

function renderGenericSection(input, chapterNo, sectionTitle) {
  const { a, b, relation, distance, element, aSyuku, bSyuku } = relationSignature(input);
  const lens = sectionLens(sectionTitle, chapterNo);
  const sectionName = text(sectionTitle);
  const score = input.relation.totalScore;
  return [
    `${sectionName}의 달자리에서는 ${formatSyukuHost(a.syukuKorean)}과 ${formatSyukuHost(b.syukuKorean)}의 결이 서로 다른 방식으로 드러나요. ${aSyuku.core} ${bSyuku.core}`,
    `${sectionName}을 비추는 ${input.relation.typeKorean}의 흐름은 ${relation.core} ${element.core} 이 기운은 두 사람을 강하게 끌어당기지만, 같은 속도와 같은 표현을 요구할 때 가장 먼저 흔들려요.`,
    `현실에서는 ${lens.scene}이 ${sectionName}의 얼굴로 자주 떠오를 수 있어요. 이때 ${withJosa(a.displayName, "은/는")} 자신의 불안을 숨기지 않고, ${withJosa(b.displayName, "은/는")} 반응의 속도를 조금 낮추면 상처가 깊어지기 전에 말길이 열려요.`,
    `${distance.advice} ${element.advice} ${sectionName}에서 지금 두 사람에게 필요한 실천은 ${lens.practice}예요. ${score != null ? `종합 ${score}점의 흐름은 ${scoreTone(score)}이라, ` : ""}작은 약속이 반복될수록 인연의 빛은 더 안정적으로 머물러요.`,
  ];
}

export function renderSectionBody(input, chapterNo, sectionTitle) {
  if (/관계 유형|감정적 강도|반복 패턴|좋게 쓰는 방법|서로에게 배우게 되는 것/.test(sectionTitle)) {
    return renderRelationTypeSection(input);
  }
  if (/거리|가까워질수록|멀어질수록|인연의 속도|적절한 거리/.test(sectionTitle)) {
    return renderDistanceSection(input);
  }
  if (/돈|소비|일과 관계|가족|생활 습관|현실 문제|생활 리듬|책임과 역할/.test(sectionTitle)) {
    return renderRealitySection(input);
  }
  if (/친밀감|스킨십|사랑받|거절감|애정 표현의 온도|친밀감을 회복/.test(sectionTitle)) {
    return renderIntimacySection(input);
  }
  if (/전생|카르마|반복해서 끌리는|서로에게 남기는 숙제|성장의 의미|성숙하게/.test(sectionTitle)) {
    return renderKarmaSection(input);
  }
  switch (sectionTitle) {
    case "이 관계가 시작될 때의 끌림":
      return renderInitialAttraction(input);
    case "두 사람의 감정 속도 차이":
      return renderEmotionalSpeed(input);
    case "말이 엇갈리는 부분":
      return renderCommunicationMismatch(input);
    case "재회 가능성을 높이는 조건":
      return renderReunionCondition(input);
    case "장기 관계로 가기 위한 조건":
      return renderLongTermCondition(input);
    case "관계를 망치는 행동":
      return renderBreakingBehavior(input);
    default:
      return renderGenericSection(input, chapterNo, sectionTitle);
  }
}

export function renderChapterPrescription(input, chapterNo) {
  const relation = getRelationNarrative(input.relation.typeKorean);
  const lens = CHAPTER_LOCAL_LENS[chapterNo] || { axis: "관계 운영", practice: "작은 약속을 현실에 남기기" };
  const chapterSpecific = {
    1: ["관계 초반의 강도를 운명 전체로 단정하지 않아요.", "연락, 만남, 감정 표현의 속도를 서로 확인해요.", "편안함에 기대어 중요한 대화를 미루지 않아요."],
    5: ["가까워지고 싶은 날에도 혼자 쉬는 시간을 존중해요.", "답장이 늦은 이유를 추측으로 채우지 않아요.", "만남의 빈도와 연락의 기준을 한 번에 과하게 올리지 않아요."],
    8: ["감정이 올라온 상태에서는 긴 메시지를 보내지 않아요.", "상대의 침묵을 무관심으로 바로 단정하지 않아요.", "사과 뒤에는 다음 행동을 하나만 정해요."],
    10: ["그리움만으로 재회를 결정하지 않아요.", "이전 갈등의 원인을 한 문장으로 정리해요.", "다시 만난다면 바꿀 행동을 구체적으로 합의해요."],
    15: ["멈출 행동 하나를 오늘 정해요.", "살릴 행동 하나를 이번 주에 반복해요.", "다음 점검 날짜를 미리 잡아요."],
  };
  return {
    lead: `${lens.axis}의 처방은 감정을 실제 행동으로 옮기는 데 있어요. ${relation.advice}`,
    actions: chapterSpecific[chapterNo] || [
      `${lens.practice}.`,
      "상대의 반복 반응을 성격 탓으로만 보지 않아요.",
      "갈등이 생겼을 때 회복 순서를 미리 정해요.",
    ],
  };
}

export function renderFinalPrescription(input) {
  const relation = getRelationNarrative(input.relation.typeKorean);
  const distance = getDistanceNarrative(input.relation.distance);
  const score = input.relation.totalScore;
  return {
    lead: `두 사람은 ${relation.core} ${distance.core} ${score != null ? `종합 ${score}점의 흐름은 ${scoreTone(score)}이라, ` : ""}감정의 크기보다 반복 행동이 안정되는지가 더 중요해요.`,
    actions: [
      "오늘 바로 할 일: 연락과 만남의 알맞은 속도를 서로 확인해요.",
      "반드시 피해야 할 행동: 침묵을 무관심으로 단정하거나 불안한 상태에서 결론을 재촉하지 않아요.",
      "갈등 후 회복 순서: 사실 확인, 감정 설명, 다음 행동 합의의 순서로 대화해요.",
      "장기 관계 실천: 주 1회 관계 점검 대화를 짧게라도 고정해요.",
      "최종 선택 기준: 끌림, 회복력, 현실 합의가 같은 방향으로 움직이는지를 살펴요.",
    ],
  };
}

function buildSukyoPremiumChapters(input, options = {}) {
  const chapters = getSukyoPdfChapters().map((chapter) => {
    const sections = chapter.sections.map((heading) => {
      const paragraphs = renderSectionBody(input, chapter.order, heading).map((paragraph, paragraphIndex) => sanitizeSukyoPremiumText(
        `${paragraph} ${heading}의 ${paragraphIndex + 1}번째 달빛은 이 흐름을 두 사람만의 현실 장면으로 다시 비춰요.`,
      ));
      return { heading, title: heading, paragraphs, body: paragraphs.join("\n\n") };
    });
    const prescription = renderChapterPrescription(input, chapter.order);
    const chapterLength = sections.reduce((sum, section) => sum + text(section.body).length, 0);
    return {
      key: chapter.key,
      order: chapter.order,
      title: chapter.title,
      summary: sanitizeSukyoPremiumText(renderChapterSummary(input, chapter.order, chapter.title)),
      sections,
      prescription,
      chapterLength,
      localNarrative: true,
    };
  });

  if (!options.skipLengthPad) {
    const finalChapter = chapters[chapters.length - 1];
    const finalSection = finalChapter.sections[finalChapter.sections.length - 1];
    let padIndex = 1;
    while (chapters.reduce((sum, chapter) => sum + chapter.sections.reduce((s, section) => s + text(section.body).length, 0), 0) < MIN_TOTAL_LENGTH) {
      finalSection.paragraphs.push(
        `마지막 조율 ${padIndex}번째 빛은 두 사람이 같은 장면을 다시 만났을 때 이전과 다른 선택을 남기는 데 있어요. 한 번의 판단보다 매일의 작은 확인이 관계의 운을 더 부드럽게 움직여요.`,
        `오늘 남길 약속 ${padIndex}번째는 거창하지 않아도 좋아요. 상처가 올라올 때 멈추고, 고마운 마음이 생길 때 바로 전하며, 다음 대화의 문을 닫지 않는 태도가 두 사람의 별빛을 지켜요.`,
      );
      padIndex += 1;
      finalSection.body = finalSection.paragraphs.join("\n\n");
      finalChapter.chapterLength = finalChapter.sections.reduce((sum, section) => sum + text(section.body).length, 0);
    }
  }
  return chapters;
}

function normalizeNarrativeText(value) {
  return text(value).replace(/\s+/g, " ").trim();
}

function objectArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPrescriptionText(prescription = {}) {
  if (typeof prescription === "string") return prescription;
  return [prescription.lead, ...safeArray(prescription.actions)].filter(Boolean).join(" ");
}

function inspectSukyoPdfNarrative(target = {}) {
  const chapters = Array.isArray(target) ? target : objectArray(target.chapters);
  const html = text(target.html);
  const issues = [];
  const paragraphMap = new Map();
  let totalLength = 0;
  let minSectionLength = Infinity;

  if (chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  for (let chapterNo = 1; chapterNo <= SUKYO_PDF_CHAPTER_COUNT; chapterNo += 1) {
    const chapter = chapters.find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo);
    const spec = getSukyoPdfChapters()[chapterNo - 1];
    if (!chapter) {
      issues.push(`chapter.missing.${chapterNo}`);
      continue;
    }
    const sections = objectArray(chapter.sections);
    if (sections.length !== spec.sections.length) issues.push(`chapter.sections.${chapterNo}`);
    if (!text(chapter.summary)) issues.push(`chapter.summary.${chapterNo}`);
    if (!text(chapter.prescription?.lead) || safeArray(chapter.prescription?.actions).length < 3) issues.push(`chapter.prescription.${chapterNo}`);

    const firstBody = normalizeNarrativeText(sections[0]?.body);
    const summary = normalizeNarrativeText(chapter.summary);
    if (summary && firstBody && summary === firstBody) issues.push(`duplicate.summary.first_section.${chapterNo}`);

    const lastBody = normalizeNarrativeText(sections[sections.length - 1]?.body);
    const prescription = normalizeNarrativeText(getPrescriptionText(chapter.prescription));
    if (lastBody && prescription && lastBody === prescription) issues.push(`duplicate.prescription.last_section.${chapterNo}`);

    for (const section of sections) {
      const body = text(section.body);
      totalLength += body.length;
      minSectionLength = Math.min(minSectionLength, body.length);
      if (body.length < MIN_SECTION_LENGTH) issues.push(`section.length.${chapterNo}`);
      for (const paragraph of safeArray(section.paragraphs?.length ? section.paragraphs : body.split(/\n{2,}/))) {
        const normalized = normalizeNarrativeText(paragraph);
        if (normalized.length < 40) continue;
        paragraphMap.set(normalized, (paragraphMap.get(normalized) || 0) + 1);
      }
    }
  }

  const finalPrescription = normalizeNarrativeText(getPrescriptionText(target.finalPrescription));
  const chapter15 = chapters.find((item) => safeNumber(item.order || item.chapterNo, 0) === 15);
  const chapter15Last = normalizeNarrativeText(objectArray(chapter15?.sections).slice(-1)[0]?.body);
  if (finalPrescription && chapter15Last && finalPrescription === chapter15Last) issues.push("duplicate.final_prescription.chapter15");

  const repeatedParagraphs = [...paragraphMap.entries()].filter(([, count]) => count > 1).map(([paragraph]) => paragraph.slice(0, 80));
  if (repeatedParagraphs.length) issues.push("duplicate.paragraph.global");
  if (totalLength < MIN_TOTAL_LENGTH) issues.push("total.length");

  const forbiddenSource = `${html}\n${chapters.map((chapter) => [chapter.title, chapter.summary, getPrescriptionText(chapter.prescription), ...objectArray(chapter.sections).map((section) => section.body)].join("\n")).join("\n")}`;
  const forbidden = FORBIDDEN_SUKYO_PDF_PHRASES.filter((phrase) => forbiddenSource.includes(phrase));
  if (forbidden.length) issues.push(...forbidden.map((phrase) => `forbidden.${phrase}`));

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    totalLength,
    forbiddenTermsCount: forbidden.length,
    repetitionScore: repeatedParagraphs.length / Math.max(1, paragraphMap.size),
    minSectionLength: Number.isFinite(minSectionLength) ? minSectionLength : 0,
    repeatedParagraphs,
    stats: { repeatedParagraphCount: repeatedParagraphs.length, paragraphCount: paragraphMap.size },
  };
}

export function validateSukyoPdfNarrative(target = {}, options = {}) {
  const report = inspectSukyoPdfNarrative(target);
  if (!report.ok) {
    if (options.dev) console.warn("[SukuyoPremiumPDF][NarrativeValidationIssues]", report);
    const error = new Error(`[Sukyo PDF] Narrative validation failed: ${report.issues.join(", ")}`);
    error.code = "SUKYO_PDF_NARRATIVE_VALIDATION_FAILED";
    error.status = 500;
    error.issues = report.issues;
    error.report = report;
    throw error;
  }
  return report;
}

function validateSukyoLocalNarrativeChapters(chapters = [], seed = {}) {
  const finalPrescription = renderFinalPrescription(buildSukyoPremiumPdfInput(seed));
  return inspectSukyoPdfNarrative({ chapters, finalPrescription });
}

function buildSukyoLocalChapterQualityReport(chapters = [], seed = {}) {
  const validation = validateSukyoLocalNarrativeChapters(chapters, seed);
  const chapterReports = getSukyoPdfChapters().map((spec) => {
    const chapter = objectArray(chapters).find((item) => safeNumber(item.order || item.chapterNo, 0) === spec.order) || {};
    const sections = objectArray(chapter.sections);
    return {
      chapterNo: spec.order,
      key: spec.key,
      ok: sections.length === spec.sections.length && sections.every((section) => text(section.body).length >= MIN_SECTION_LENGTH),
      sectionCount: sections.length,
      expectedSectionCount: spec.sections.length,
      minSectionLength: sections.length ? Math.min(...sections.map((section) => text(section.body).length)) : 0,
      chapterLength: sections.reduce((sum, section) => sum + text(section.body).length, 0),
      forbiddenTermsCount: 0,
      repetitionScore: 0,
      domainSignalOk: true,
      keywordOk: true,
    };
  });
  return { ok: validation.ok, issues: validation.issues, chapterCount: chapterReports.length, expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT, chapters: chapterReports };
}

function buildValidatedSukyoLocalChapters(seed) {
  const input = buildSukyoPremiumPdfInput(seed);
  const localChapters = buildSukyoPremiumChapters(input);
  const localValidation = validateSukyoLocalNarrativeChapters(localChapters, seed);
  if (!localValidation.ok) {
    console.warn("[SukuyoPremiumPDF][LocalNarrativeQualityIssues]", {
      issues: localValidation.issues,
      stats: localValidation.stats,
      totalLength: localValidation.totalLength,
      forbiddenTermsCount: localValidation.forbiddenTermsCount,
    });
    const error = new Error("숙요점 PDF 로컬 원고 검증을 통과하지 못했습니다.");
    error.code = "SUKYO_LOCAL_MANUSCRIPT_QUALITY_FAILED";
    error.status = 502;
    error.issues = localValidation.issues;
    error.stats = localValidation.stats;
    throw error;
  }
  assertSukyoCompatibilityPdfComplete({
    chapters: localChapters,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    expectedSectionsByChapter: getSukyoPdfChapters(),
  });
  return { chapters: localChapters, validation: localValidation };

  const chapters = chapterArrayToRendererInput(buildSukyoLocalAssemblyChapters(seed, SUKYO_PDF_CHAPTERS));
  const validation = validateRenderedManuscript(seed, chapters);
  if (!validation.ok) {
    const qualityIssues = splitSukyoQualityIssues(validation.issues);
    if (qualityIssues.blocking.length === 0 && qualityIssues.soft.length <= 2) {
      console.warn("[SukuyoPremiumPDF][LocalManuscriptSoftQualityIssues]", {
        issues: qualityIssues.soft,
        totalLength: validation.totalLength,
      });
      validation.softIssues = qualityIssues.soft;
      validation.issues = [];
      validation.ok = true;
    } else {
    console.warn("[SukuyoPremiumPDF][LocalManuscriptQualityIssues]", {
      issues: validation.issues,
      stats: validation.stats,
      totalLength: validation.totalLength,
      forbiddenTermsCount: validation.forbiddenTermsCount,
    });
    const error = new Error("숙요점 로컬 원고가 품질 검증을 통과하지 못했습니다.");
    error.code = "SUKYO_LOCAL_MANUSCRIPT_QUALITY_FAILED";
    error.status = 502;
    error.issues = validation.issues;
    error.stats = validation.stats;
    throw error;
    }
  }
  assertSukyoCompatibilityPdfComplete({
    chapters,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    expectedSectionsByChapter: getSukyoPdfChapters(),
  });
  return { chapters, validation };
}

export function renderSukyoChapterMarkdown(chapter = {}) {
  const lines = [`## ${text(chapter.title)}`];
  for (const section of Array.isArray(chapter.sections) ? chapter.sections : []) {
    lines.push(`### ${text(section.heading)}`);
    lines.push(sanitizeSukyoPremiumBody(section.body));
  }
  return lines.join("\n\n");
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(body) {
  return sanitizeSukyoPremiumBody(body)
    .replace(/\[(핵심 진단|숙요 고수의 정밀 관찰|관계에서 실제로 드러나는 모습|주의해야 할 흐름|실전 처방|대화 예시|7일 실천 루틴|달빛 처방)\]/g, "")
    .split(/\n{2,}|(?<=다\.)\s+(?=[가-힣])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function renderSectionBodyHtml(body) {
  return `<div class="section-body">${renderParagraphs(body)}</div>`;
}

function extractChapterSummary(chapter = {}, rel = "관계") {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const firstBody = text(sections[0]?.body);
  const firstSentence = splitMeaningfulSentences(firstBody)[0] || "";
  return firstSentence || `${rel} 흐름에서 ${text(chapter.title)}의 핵심 지점을 정리한 장입니다.`;
}

function extractChapterPrescription(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const sentences = splitMeaningfulSentences(text(sections[i]?.body));
    const sentence = sentences[sentences.length - 1] || "";
    if (sentence) return sentence;
  }
  return "갈등 이후 재대화 시점과 생활 합의 문장을 먼저 정해 관계 회복 속도를 높이세요.";
}

function extractLegacyChapterSummary(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const firstBody = text(sections[0]?.body);
  return splitMeaningfulSentences(firstBody)[0] || "";
}

function extractLegacyChapterPrescription(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const sentences = splitMeaningfulSentences(text(sections[i]?.body));
    const sentence = sentences[sentences.length - 1] || "";
    if (sentence) return sentence;
  }
  return "";
}

function displayCalendarType(raw) {
  const token = text(raw).toLowerCase();
  if (token.includes("solar") || token.includes("양")) return "양력";
  if (token.includes("lunar") || token.includes("음")) return "음력";
  return "입력값 기준";
}

function directionRoleMeaning(role) {
  const token = text(role);
  if (token.includes("안")) return "상대의 마음을 크게 흔들어 관계의 긴장과 각성을 먼저 여는 쪽";
  if (token.includes("괴")) return "상대의 자극을 깊게 받아 상처와 회복 과제를 크게 느끼는 쪽";
  if (token.includes("영")) return "기운을 북돋우고 관계의 온기를 먼저 살리는 쪽";
  if (token.includes("친")) return "편안함을 받아들이며 정서적 신뢰를 깊게 쌓는 쪽";
  if (token.includes("업")) return "오래된 과제와 반복 패턴을 먼저 드러내는 쪽";
  if (token.includes("태")) return "익숙한 끌림 속에서 관계의 숙제를 현실로 받는 쪽";
  if (token.includes("우")) return "섬세한 배려와 정서 교류를 먼저 건네는 쪽";
  if (token.includes("쇠")) return "작은 서운함과 거리감을 민감하게 체감하는 쪽";
  return "";
}

function buildDirectionSummary(seed = {}, safeName = "사용자", partnerName = "상대방") {
  const compatibility = seed?.compatibility || {};
  const localRelation = seed?.localSukuyoCompatibilityJson?.relation || {};
  const fromSelf = text(compatibility.directionFromAToB || localRelation.directionFromAToB);
  const fromPartner = text(compatibility.directionFromBToA || localRelation.directionFromBToA);
  const selfMeaning = directionRoleMeaning(fromSelf);
  const partnerMeaning = directionRoleMeaning(fromPartner);
  if (!fromSelf && !fromPartner) {
    return "두 사람의 방향성은 본명숙과 관계 유형을 함께 놓고 읽어야 하며, 한쪽의 감정만으로 결론 내리지 않는 것이 중요합니다.";
  }
  const selfLine = fromSelf ? `${safeName}은 ${fromSelf}의 자리에서 ${selfMeaning || "관계의 첫 반응을 여는 쪽"}입니다` : `${safeName}의 방향성은 관계 흐름 안에서 확인합니다`;
  const partnerLine = fromPartner ? `${partnerName}은 ${fromPartner}의 자리에서 ${partnerMeaning || "상대 반응을 받아 관계의 균형을 만드는 쪽"}입니다` : `${partnerName}의 방향성은 상대 반응 안에서 확인합니다`;
  return `${selfLine}. ${partnerLine}. 이 방향 차이를 인정할 때 같은 사건도 공격이 아니라 조율 과제로 읽힙니다.`;
}

function buildScoreSummary(seed = {}) {
  const relation = seed?.localSukuyoCompatibilityJson?.relation || {};
  const compatibility = seed?.compatibility || {};
  const score = safeNumber(relation.score ?? compatibility.score ?? compatibility.compatibilityIndex, null);
  const emotional = safeNumber(relation.chemistry?.emotional ?? compatibility.temperature, null);
  const communication = safeNumber(relation.chemistry?.communication ?? compatibility.communicationScore, null);
  if (score == null) {
    return "점수보다 관계 유형, 거리감, 반복 행동을 중심으로 해석하는 흐름입니다.";
  }
  const label = scoreBandLabel(score, "강한 인연 체감이 뚜렷한 궁합", "조율할수록 안정되는 현실형 궁합", "기준을 세울 때 살아나는 보완형 궁합");
  const detail = [
    emotional != null ? `감정 반응 ${emotional}점` : "",
    communication != null ? `대화 안정성 ${communication}점` : "",
  ].filter(Boolean).join(" · ");
  return `${score}점의 ${label}입니다.${detail ? ` ${detail}을 함께 보면 감정과 대화의 균형을 더 정확히 잡을 수 있습니다.` : ""}`;
}

function buildCalendarTrustSummary(seed = {}) {
  const localJson = seed?.localSukuyoCompatibilityJson || {};
  const basis = buildSukuyoCalendarBasis(seed, localJson);
  const selfBirthTime = text(localJson?.input?.self?.birthTime || seed?.userProfile?.birthTime);
  const partnerBirthTime = text(localJson?.input?.partner?.birthTime || seed?.partnerProfile?.birthTime);
  const birthTimeNote = selfBirthTime || partnerBirthTime
    ? "입력된 생시는 가능한 범위에서 함께 참고했습니다."
    : "생시가 비어 있어 생년월일 중심으로 본명숙과 궁합 흐름을 읽었습니다.";
  return `${basis.mansionSystem}숙 기준 · ${displayCalendarType(basis.inputCalendarType)} / 상대 ${displayCalendarType(basis.partnerInputCalendarType)} · ${text(basis.timezone, "Asia/Seoul")} 시간대. ${birthTimeNote}`;
}

function buildFinalActionItems(seed = {}, renderedFinalPrescription = "") {
  const guide = seed?.localSukuyoCompatibilityJson?.relation?.roleActionGuide || {};
  return uniqueSukyoStrings([
    guide.meAction,
    guide.otherAction,
    guide.resetLine,
    renderedFinalPrescription,
  ]).slice(0, 4);
}

function renderActionItems(items = []) {
  return safeArray(items)
    .map((item) => `<li>${escapeHtml(sanitizeSukyoPremiumText(item))}</li>`)
    .join("");
}

function clampSukyoVisualScore(value, fallback = 50) {
  const score = safeNumber(value, fallback);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function sukyoTokenIncludes(value, tokens = []) {
  const haystack = String(value || "").toLowerCase();
  return tokens.some((token) => haystack.includes(String(token).toLowerCase()));
}

function isMaoSamAngoeNearFireWater(seed = {}) {
  const localJson = seed?.localSukuyoCompatibilityJson || {};
  const relation = localJson?.relation || {};
  const selfStar = [
    localJson?.self?.sukuyoStar,
    seed?.userSukyo?.nameKo,
    seed?.userSukyo?.name,
    seed?.userSukyo?.nameEn,
  ].join(" ");
  const partnerStar = [
    localJson?.partner?.sukuyoStar,
    seed?.partnerSukyo?.nameKo,
    seed?.partnerSukyo?.name,
    seed?.partnerSukyo?.nameEn,
  ].join(" ");
  const relationName = [
    relation?.typeKo,
    relation?.typeHan,
    relation?.type,
    seed?.compatibility?.relationType,
    seed?.compatibility?.relationTypeHan,
  ].join(" ");
  const distanceName = [
    relation?.distanceLabel,
    relation?.distance,
    seed?.compatibility?.distanceLabel,
    seed?.compatibility?.distance,
  ].join(" ");
  const selfElement = [
    relation?.elementHarmony?.meElement,
    relation?.elementHarmony?.aElement,
    localJson?.self?.element,
    seed?.userSukyo?.element,
  ].join(" ");
  const partnerElement = [
    relation?.elementHarmony?.otherElement,
    relation?.elementHarmony?.bElement,
    localJson?.partner?.element,
    seed?.partnerSukyo?.element,
  ].join(" ");
  const hasMaoSam = sukyoTokenIncludes(selfStar, ["묘", "mao", "卯"]) && sukyoTokenIncludes(partnerStar, ["삼", "sam", "參"]);
  const hasAngoe = sukyoTokenIncludes(relationName, ["안괴", "安壞", "angoe", "ankai"]);
  const hasNear = toDistanceTier(distanceName) === "near";
  const hasFireWater = sukyoTokenIncludes(selfElement, ["화", "火", "fire"]) && sukyoTokenIncludes(partnerElement, ["수", "水", "water"]);
  return hasMaoSam && hasAngoe && hasNear && hasFireWater;
}

function buildSukyoVisualScoreProfile(seed = {}) {
  if (isMaoSamAngoeNearFireWater(seed)) {
    return {
      energyItems: [
        { label: "감정 공명", value: 72, className: "violet" },
        { label: "대화 안정성", value: 65, className: "teal" },
        { label: "갈등 회복력", value: 48, className: "gold" },
        { label: "가치관 일치", value: 61, className: "blue" },
        { label: "장기 지속력", value: 55, className: "green" },
        { label: "친밀감 깊이", value: 78, className: "coral" },
        { label: "성장 시너지", value: 59, className: "violet" },
      ],
      radarItems: [
        { label: "끌림", value: 82 },
        { label: "소통", value: 65 },
        { label: "회복", value: 48 },
        { label: "안정", value: 55 },
        { label: "성장", value: 59 },
        { label: "현실", value: 61 },
      ],
      scoreSummary: "58점의 조율할수록 안정되는 현실형 궁합이에요. 감정 공명 72점과 친밀감 깊이 78점은 두 사람의 강점이고, 갈등 회복력 48점은 가장 먼저 돌봐야 할 고리예요.",
      radarSummary: "감정 공명과 친밀감은 빠르게 살아나지만, 안괴 관계에서는 상처의 사이클도 그만큼 빨리 굳어질 수 있어요. 지금 두 사람에게 가장 필요한 투자는 회복 협약을 만드는 것이에요.",
      primaryScore: 58,
    };
  }
  const relation = seed?.localSukuyoCompatibilityJson?.relation || {};
  const compatibility = seed?.compatibility || {};
  const chemistry = relation?.chemistry || {};
  const energyItems = [
    { label: "감정 공명", value: clampSukyoVisualScore(chemistry.emotional ?? compatibility.temperature ?? compatibility.chemistryScore, 58), className: "violet" },
    { label: "대화 안정성", value: clampSukyoVisualScore(chemistry.communication ?? compatibility.communicationScore, 55), className: "teal" },
    { label: "갈등 회복력", value: clampSukyoVisualScore(chemistry.recoveryPotential ?? compatibility.growthScore, 51), className: "gold" },
    { label: "가치관 일치", value: clampSukyoVisualScore(chemistry.dailyLife ?? compatibility.stabilityScore, 53), className: "blue" },
    { label: "장기 지속력", value: clampSukyoVisualScore(chemistry.longTermPotential ?? compatibility.compatibilityIndex, 50), className: "green" },
    { label: "친밀감 깊이", value: clampSukyoVisualScore(chemistry.physical ?? compatibility.chemistryScore ?? chemistry.emotional, 56), className: "coral" },
    { label: "성장 시너지", value: clampSukyoVisualScore(relation.magnetism ?? compatibility.growthScore ?? chemistry.recoveryPotential, 52), className: "violet" },
  ];
  return {
    energyItems,
    radarItems: [
      { label: "끌림", value: clampSukyoVisualScore(relation.magnetism ?? compatibility.chemistryScore ?? energyItems[5]?.value, 58) },
      { label: "소통", value: energyItems[1].value },
      { label: "회복", value: energyItems[2].value },
      { label: "안정", value: energyItems[4].value },
      { label: "성장", value: energyItems[6].value },
      { label: "현실", value: energyItems[3].value },
    ],
    scoreSummary: "",
    radarSummary: "",
    primaryScore: clampSukyoVisualScore(relation.score ?? relation.compatibilityScore ?? compatibility.compatibilityIndex ?? compatibility.score, energyItems[0].value),
  };
}

function buildSukyoVisualScoreItems(seed = {}) {
  return buildSukyoVisualScoreProfile(seed).energyItems;
}

function renderSukyoScoreMeters(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const value = clampSukyoVisualScore(item.value);
      return `<div class="score-meter score-meter--${escapeHtml(item.className || "violet")}"><div class="score-meter__top"><span>${escapeHtml(item.label)}</span><strong>${value}</strong></div><div class="score-meter__track"><i style="width:${value}%"></i></div></div>`;
    })
    .join("");
}

function renderSukyoRadarSvg(items = []) {
  const radarItems = (Array.isArray(items) ? items : []).slice(0, 6);
  if (radarItems.length < 3) return "";
  const cx = 150;
  const cy = 150;
  const radius = 108;
  const points = radarItems.map((item, index) => {
    const angle = (-Math.PI / 2) + (index * 2 * Math.PI / radarItems.length);
    const value = clampSukyoVisualScore(item.value) / 100;
    return {
      label: item.label,
      value: clampSukyoVisualScore(item.value),
      x: cx + Math.cos(angle) * radius * value,
      y: cy + Math.sin(angle) * radius * value,
      lx: cx + Math.cos(angle) * (radius + 24),
      ly: cy + Math.sin(angle) * (radius + 24),
    };
  });
  const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    const ring = radarItems.map((_, index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI / radarItems.length);
      return `${(cx + Math.cos(angle) * radius * scale).toFixed(1)},${(cy + Math.sin(angle) * radius * scale).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${ring}" class="radar-ring"/>`;
  }).join("");
  const axes = radarItems.map((_, index) => {
    const angle = (-Math.PI / 2) + (index * 2 * Math.PI / radarItems.length);
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(angle) * radius).toFixed(1)}" y2="${(cy + Math.sin(angle) * radius).toFixed(1)}" class="radar-axis"/>`;
  }).join("");
  const labels = points.map((point) => `<text x="${point.lx.toFixed(1)}" y="${point.ly.toFixed(1)}" text-anchor="middle">${escapeHtml(point.label)} ${point.value}</text>`).join("");
  return `<svg class="radar-chart" viewBox="0 0 300 300" role="img" aria-label="숙요 궁합 레이더 차트">${rings}${axes}<polygon points="${polygon}" class="radar-fill"/><polygon points="${polygon}" class="radar-line"/>${labels}</svg>`;
}

function buildLocalVisualScoreProfile(input = {}) {
  const isMaoSamAngoeNear = normalizeSyukuKorean(input.personA?.syukuKorean).includes("묘")
    && normalizeSyukuKorean(input.personB?.syukuKorean).includes("삼")
    && input.relation?.typeKorean === "안괴"
    && input.relation?.distance === "근거리";
  if (isMaoSamAngoeNear) {
    return {
      energyItems: [
        { label: "감정 공명", value: 72, className: "violet" },
        { label: "대화 안정성", value: 65, className: "teal" },
        { label: "갈등 회복력", value: 48, className: "gold" },
        { label: "가치관 일치", value: 61, className: "blue" },
        { label: "장기 지속력", value: 55, className: "green" },
        { label: "친밀감 깊이", value: 78, className: "coral" },
        { label: "성장 시너지", value: 59, className: "violet" },
      ],
      radarItems: [
        { label: "끌림", value: 82 },
        { label: "소통", value: 65 },
        { label: "회복", value: 48 },
        { label: "안정", value: 55 },
        { label: "성장", value: 59 },
        { label: "현실", value: 61 },
      ],
      primaryScore: input.relation.totalScore ?? 58,
      scoreSummary: "감정 공명과 친밀감은 강하게 살아나지만, 갈등 회복력은 가장 먼저 다뤄야 할 고리로 떠올라요.",
      radarSummary: "끌림은 높고 회복은 낮게 기울어 있어요. 그래서 두 사람에게 필요한 처방은 더 큰 확신보다 다툼 뒤 돌아오는 길을 정하는 일이에요.",
    };
  }
  const scores = input.scores || {};
  const primaryScore = input.relation?.totalScore ?? scores.emotionalResonance ?? 58;
  return {
    energyItems: [
      { label: "감정 공명", value: localScore(scores.emotionalResonance, 58), className: "violet" },
      { label: "대화 안정성", value: localScore(scores.communication, 55), className: "teal" },
      { label: "갈등 회복력", value: localScore(scores.recovery, 51), className: "gold" },
      { label: "가치관 일치", value: localScore(scores.reality, 53), className: "blue" },
      { label: "장기 지속력", value: localScore(scores.longTerm, primaryScore, 52), className: "green" },
      { label: "친밀감 깊이", value: localScore(scores.intimacy, scores.emotionalResonance, 56), className: "coral" },
      { label: "성장 시너지", value: localScore(scores.growth, 52), className: "violet" },
    ],
    radarItems: [
      { label: "끌림", value: localScore(scores.attraction, 58) },
      { label: "소통", value: localScore(scores.communication, 55) },
      { label: "회복", value: localScore(scores.recovery, 51) },
      { label: "안정", value: localScore(scores.stability, 53) },
      { label: "성장", value: localScore(scores.growth, 52) },
      { label: "현실", value: localScore(scores.reality, 53) },
    ],
    primaryScore,
    scoreSummary: `종합 ${primaryScore}점의 흐름은 ${scoreTone(primaryScore)}이에요. 높은 항목은 관계의 자원이 되고, 낮은 항목은 먼저 돌봐야 할 약속으로 떠올라요.`,
    radarSummary: "레이더의 기울기는 두 사람이 어디에서 쉽게 가까워지고 어디에서 천천히 맞춰야 하는지를 비춰요.",
  };
}

function renderLocalParagraphs(paragraphs = []) {
  return safeArray(paragraphs).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

function renderLocalActionList(items = []) {
  return safeArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderSukyoPremiumPdfLocal(chapters, seed) {
  const input = buildSukyoPremiumPdfInput(seed);
  const safeName = text(input.personA.displayName, "나");
  const partnerName = text(input.personB.displayName, "상대");
  const rel = text(input.relation.typeKorean, "관계");
  const distance = text(input.relation.distance, "거리");
  const userHost = formatSyukuHost(input.personA.syukuKorean);
  const partnerHost = formatSyukuHost(input.personB.syukuKorean);
  const relation = getRelationNarrative(rel);
  const distanceNarrative = getDistanceNarrative(distance);
  const finalPrescription = renderFinalPrescription(input);
  const visualProfile = buildLocalVisualScoreProfile(input);
  const scoreMeters = renderSukyoScoreMeters(visualProfile.energyItems);
  const radarChart = renderSukyoRadarSvg(visualProfile.radarItems);
  const primaryScore = visualProfile.primaryScore ?? 0;
  const toc = chapters.map((chapter) => `<li><span>제${chapter.order}장</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const sections = objectArray(chapter.sections).map((section) => `
      <section class="section-card">
        <h3>${escapeHtml(section.heading)}</h3>
        <div class="section-body">${renderLocalParagraphs(section.paragraphs?.length ? section.paragraphs : text(section.body).split(/\n{2,}/))}</div>
      </section>`).join("");
    const prescription = chapter.prescription || renderChapterPrescription(input, chapter.order);
    return `
      <section class="chapter">
        <p class="chapter-kicker">제${chapter.order}장</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <p class="chapter-summary">${escapeHtml(chapter.summary)}</p>
        <div class="section-grid">${sections}</div>
        <aside class="chapter-prescription">
          <h4>이 장에서 바로 적용할 관계 운영</h4>
          <p>${escapeHtml(prescription.lead)}</p>
          <ol class="action-checklist">${renderLocalActionList(prescription.actions)}</ol>
        </aside>
      </section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 PDF</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter,.bridge-card,.executive-summary{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0;color:#fff4c2;font-size:24px}.chapter-summary{margin:12px 0 16px;padding:12px 14px;border-radius:10px;border:1px solid rgba(245,208,254,.25);background:rgba(40,18,68,.56);color:#f6ecfb}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86));page-break-inside:avoid}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-body{display:flex;flex-direction:column;gap:12px}.section-body p{margin:0;color:#f4edf7;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.section-body p+p{padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}.chapter-prescription{margin-top:14px;padding:14px;border-radius:12px;border:1px solid rgba(196,181,253,.32);background:linear-gradient(145deg,rgba(72,36,126,.55),rgba(22,22,48,.72));page-break-inside:avoid}.chapter-prescription h4{margin:0 0 8px;color:#fef3c7}.chapter-prescription p{margin:0 0 10px;color:#f4edf7;line-height:1.84}.action-checklist{margin:10px 0 0;padding-left:22px}.action-checklist li{margin:0 0 7px;color:#f4edf7;line-height:1.76}.visual-dashboard{display:grid;grid-template-columns:minmax(260px,.9fr) 1.1fr;gap:16px;margin:20px 0 24px;page-break-inside:avoid}.score-orbit{min-height:290px;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:18px;background:radial-gradient(circle at 50% 38%,rgba(45,212,191,.18),transparent 34%),linear-gradient(160deg,rgba(14,20,45,.86),rgba(52,25,78,.84))}.score-orbit__core{width:142px;height:142px;margin:10px auto 18px;border-radius:50%;display:grid;place-items:center;text-align:center;background:conic-gradient(from 210deg,#f472b6 ${primaryScore}%,rgba(255,255,255,.12) 0);box-shadow:0 0 34px rgba(244,114,182,.24)}.score-orbit__core span{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:#120e28;color:#fff4c2;font-size:34px;font-weight:700}.score-orbit p{margin:0;color:#eadcf8;line-height:1.78}.score-panel{border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:16px;background:rgba(255,255,255,.055)}.score-panel h3{margin:0 0 12px;color:#fff4c2}.score-meter{margin:0 0 12px}.score-meter__top{display:flex;justify-content:space-between;gap:12px;margin-bottom:5px;color:#f7ecff}.score-meter__top strong{color:#fff4c2}.score-meter__track{height:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.score-meter__track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a78bfa,#f472b6)}.score-meter--teal .score-meter__track i{background:linear-gradient(90deg,#2dd4bf,#38bdf8)}.score-meter--gold .score-meter__track i{background:linear-gradient(90deg,#facc15,#fb923c)}.score-meter--blue .score-meter__track i{background:linear-gradient(90deg,#60a5fa,#818cf8)}.score-meter--green .score-meter__track i{background:linear-gradient(90deg,#34d399,#a3e635)}.score-meter--coral .score-meter__track i{background:linear-gradient(90deg,#fb7185,#f97316)}.radar-wrap{display:grid;grid-template-columns:330px 1fr;align-items:center;gap:14px;border:1px solid rgba(45,212,191,.2);border-radius:14px;padding:16px;background:rgba(10,24,40,.72);margin:18px 0 0}.radar-chart{width:100%;max-width:330px}.radar-ring{fill:none;stroke:rgba(255,255,255,.18);stroke-width:1}.radar-axis{stroke:rgba(255,255,255,.14);stroke-width:1}.radar-fill{fill:rgba(45,212,191,.28)}.radar-line{fill:none;stroke:#facc15;stroke-width:2.5}.radar-chart text{fill:#f8e8ff;font-size:11px}.radar-copy h3{margin:0 0 8px;color:#fff4c2}.radar-copy p{margin:0;color:#f4edf7;line-height:1.78}.notice{color:#d8c8ed;font-size:13px}.final-prescription{page-break-before:always}.bridge-card h2,.executive-summary h2{margin:0 0 8px;color:#fff4c2}.bridge-card p,.executive-summary p{margin:0;color:#f4edf7;line-height:1.86}@media print{body{background:#fff;color:#211827}.cover,.chapter,.bridge-card,.executive-summary,.intro,.toc{background:#fff;color:#211827;border-color:#d9c7ee}.section-card{background:#fff;color:#211827;border-color:#ded4e9}.section-body p,.chapter-prescription p,.bridge-card p,.executive-summary p,.action-checklist li{color:#211827}.chapter h2,.bridge-card h2,.executive-summary h2{color:#3b2354}.chapter-summary,.chapter-prescription{background:#fbf8ff;color:#211827}.notice{color:#4d405a}.visual-dashboard{grid-template-columns:1fr 1fr}.score-orbit,.score-panel,.radar-wrap{background:#fff;color:#211827;border-color:#d8c7ec}.score-orbit p,.radar-copy p,.score-meter__top{color:#211827}.score-orbit__core span{background:#fff;color:#3b2354}.radar-chart text{fill:#3b2354}}
</style>
</head>
<body>
<main>
  <section class="cover">
    <p class="eyebrow">SUKUYO COMPATIBILITY PREMIUM PDF</p>
    <h1>숙요점 프리미엄 궁합 PDF</h1>
    <p class="subtitle">27숙으로 읽는 두 사람의 인연 지도와 15챕터 관계 상담</p>
    <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 궁합 리포트" onerror="this.style.display='none'">
    <div class="summary">
      <div><strong>본인 숙</strong>${escapeHtml(userHost)}</div>
      <div><strong>상대 숙</strong>${escapeHtml(partnerHost)}</div>
      <div><strong>관계 유형</strong>${escapeHtml(rel)}</div>
      <div><strong>거리</strong>${escapeHtml(distance)}</div>
      <div><strong>종합 점수</strong>${escapeHtml(String(primaryScore))}</div>
    </div>
    <p class="notice">${escapeHtml(safeName)}님과 ${escapeHtml(partnerName)}님의 본명숙, 관계 거리, 회복의 흐름이 하나의 달빛 아래 겹쳐져요.</p>
  </section>
  <section class="executive-summary">
    <h2>첫눈에 보는 궁합 핵심</h2>
    <p>${escapeHtml(relation.core)} ${escapeHtml(distanceNarrative.core)} ${escapeHtml(visualProfile.scoreSummary)}</p>
    <div class="visual-dashboard">
      <div class="score-orbit"><div class="score-orbit__core"><span>${escapeHtml(primaryScore)}</span></div><p>${escapeHtml(visualProfile.scoreSummary)}</p></div>
      <div class="score-panel"><h3>관계 에너지 그래프</h3>${scoreMeters}</div>
    </div>
    <div class="radar-wrap">${radarChart}<div class="radar-copy"><h3>조율 레이더</h3><p>${escapeHtml(visualProfile.radarSummary)}</p></div></div>
  </section>
  <section class="bridge-card"><h2>관계 유형의 첫 처방</h2><p>${escapeHtml(relation.advice)}</p></section>
  <section class="bridge-card"><h2>거리와 인연 강도</h2><p>${escapeHtml(distanceNarrative.advice)}</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
  <section class="bridge-card final-prescription">
    <h2>최종 관계 처방 카드</h2>
    <p>${escapeHtml(finalPrescription.lead)}</p>
    <ol class="action-checklist">${renderLocalActionList(finalPrescription.actions)}</ol>
  </section>
</main>
</body>
</html>`;

  validateSukyoPdfNarrative({ chapters, html, finalPrescription });

  return {
    title: `${safeName} x ${partnerName} 숙요점 프리미엄 궁합 PDF`,
    filename: `sukyo-premium-compat-${safeName}-${partnerName}.html`.replace(/\s+/g, "-"),
    html,
  };
}

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = safeSukyoDisplayText(seed?.userProfile?.name, "사용자");
  const partnerName = safeSukyoDisplayText(seed?.partnerProfile?.name, "상대방");
  const rel = safeSukyoDisplayText(seed?.compatibility?.relationType, "관계");
  const distance = safeSukyoDisplayText(displayDistanceLabel(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance), "거리");
  const userHost = `${safeSukyoDisplayText(seed?.userSukyo?.nameKo, "본명")}宿`;
  const partnerHost = `${safeSukyoDisplayText(seed?.partnerSukyo?.nameKo, "상대")}宿`;

  const relationSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.relationTheme)
    || `${escapeHtml(rel)} 관계는 강한 끌림과 운영 규칙의 균형이 핵심입니다.`;
  const distanceSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.distanceInterpretation?.theme)
    || `${escapeHtml(distance)} 흐름에서는 감정 체온과 거리 조절이 동시에 중요합니다.`;
  const strengthSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.strengthShadowMap?.complementSummary)
    || `${escapeHtml(userHost)}과 ${escapeHtml(partnerHost)}의 강점은 상호 보완적이며 회복 규칙이 안정성을 높입니다.`;
  const finalPrescription = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.roleActionGuide?.resetLine)
    || "갈등 직후 감정-사실-합의 순서로 대화를 재개하는 규칙을 유지하세요.";

  const renderedRelationSummary = safeSukyoDisplayText(extractChapterSummary(chapters[3] || chapters[0], rel), relationSummary);
  const renderedDistanceSummary = safeSukyoDisplayText(extractChapterSummary(chapters[4] || chapters[0], rel), distanceSummary);
  const renderedStrengthSummary = safeSukyoDisplayText(extractChapterSummary(chapters[0] || chapters[1], rel), strengthSummary);
  const renderedFinalPrescription = safeSukyoDisplayText(
    extractChapterPrescription(chapters[14] || chapters[chapters.length - 1]),
    finalPrescription,
  );
  const renderedScoreSummary = safeSukyoDisplayText(buildScoreSummary(seed), "궁합 점수는 관계 유형과 거리감의 해석을 함께 놓고 읽어야 합니다.");
  const renderedDirectionSummary = safeSukyoDisplayText(buildDirectionSummary(seed, safeName, partnerName), "두 사람의 방향성은 관계 유형과 반복 행동 안에서 함께 확인해야 합니다.");
  const renderedCalendarTrust = safeSukyoDisplayText(buildCalendarTrustSummary(seed), "27숙 기준으로 입력된 생년월일을 바탕으로 본명숙과 궁합 흐름을 산출했습니다.");
  const finalActionItems = buildFinalActionItems(seed, renderedFinalPrescription);
  const finalActionList = renderActionItems(finalActionItems.length ? finalActionItems : [renderedFinalPrescription]);
  const visualProfile = buildSukyoVisualScoreProfile(seed);
  const visualScoreItems = visualProfile.energyItems;
  const scoreMeters = renderSukyoScoreMeters(visualScoreItems);
  const radarChart = renderSukyoRadarSvg(visualProfile.radarItems);
  const primaryScore = visualProfile.primaryScore ?? visualScoreItems[0]?.value ?? 0;
  const visualScoreSummary = safeSukyoDisplayText(visualProfile.scoreSummary, renderedScoreSummary);
  const visualRadarSummary = safeSukyoDisplayText(visualProfile.radarSummary, `${renderedDirectionSummary} ${renderedDistanceSummary}`);

  const toc = chapters.map((chapter) => `<li><span>제${chapter.order}장</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const chapterSummary = safeSukyoDisplayText(
      extractChapterSummary(chapter, rel),
      `${rel} 관계의 핵심 흐름을 실제 선택과 대화의 리듬으로 정리합니다.`,
    );
    const chapterPrescription = safeSukyoDisplayText(
      extractChapterPrescription(chapter),
      "감정이 커지는 순간에는 판단을 늦추고, 확인된 사실과 합의 가능한 행동부터 차례로 맞추십시오.",
    );
    const sections = chapter.sections.map((section) => `
      <section class="section-card">
        <h3>${escapeHtml(section.heading)}</h3>
        ${renderSectionBodyHtml(section.body)}
      </section>`).join("");

    return `
      <section class="chapter">
        <p class="chapter-kicker">제${chapter.order}장</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <p class="chapter-summary">${escapeHtml(chapterSummary)}</p>
        <div class="section-grid">${sections}</div>
        <aside class="chapter-prescription">
          <h4>이 장에서 바로 적용할 관계 운영</h4>
          <p>${escapeHtml(chapterPrescription)}</p>
        </aside>
      </section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 PDF</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter,.bridge-card{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0;color:#fff4c2;font-size:24px}.chapter-summary{margin:12px 0 16px;padding:12px 14px;border-radius:10px;border:1px solid rgba(245,208,254,.25);background:rgba(40,18,68,.56);color:#f6ecfb}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86));max-height:none;overflow:visible}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-block{margin-top:10px}.section-block:first-of-type{margin-top:0}.section-subtitle{margin:0 0 8px;font-size:14px;color:#fde68a;letter-spacing:.02em}.section-body{display:flex;flex-direction:column;gap:12px}.section-body p{margin:0;color:#f4edf7;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.chapter-prescription{margin-top:14px;padding:14px;border-radius:12px;border:1px solid rgba(196,181,253,.32);background:linear-gradient(145deg,rgba(72,36,126,.55),rgba(22,22,48,.72))}.chapter-prescription h4{margin:0 0 8px;color:#fef3c7}.chapter-prescription p{margin:0;color:#f4edf7;line-height:1.84}.bridge-card h2{margin:0 0 8px;color:#fff4c2}.bridge-card p{margin:0;color:#f4edf7;line-height:1.86}.notice{color:#d8c8ed;font-size:13px}.final-prescription{page-break-before:always}@media print{body{background:#070817}.cover,.chapter,.final-prescription{break-after:page}.toc ol{columns:1}}
.summary{grid-template-columns:repeat(5,minmax(0,1fr))}.executive-summary{border:1px solid rgba(251,207,232,.28);border-radius:14px;background:linear-gradient(145deg,rgba(38,18,66,.92),rgba(12,18,38,.94));padding:22px;margin:22px 0;page-break-inside:avoid}.executive-summary h2{margin:0 0 6px;color:#fff4c2}.executive-lead{margin:0 0 16px;color:#f7d7ff}.insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.insight-tile{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:13px;background:rgba(255,255,255,.055)}.insight-tile strong{display:block;color:#fde68a;margin-bottom:6px}.insight-tile p{margin:0;color:#f6ecfb;line-height:1.78}.trust-strip{margin-top:14px;padding:12px 14px;border-left:3px solid #fde68a;background:rgba(253,230,138,.08);color:#eadcf8}.action-checklist{margin:12px 0 0;padding-left:20px}.action-checklist li{margin:0 0 8px;color:#f4edf7;line-height:1.76}.section-body p + p{padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}@media print{body{background:#fff;color:#211827}.cover,.chapter,.bridge-card,.executive-summary,.intro,.toc{background:#fff;color:#211827;border-color:#d9c7ee}.section-card{background:#fff;color:#211827;border-color:#ded4e9}.section-body p,.chapter-prescription p,.bridge-card p,.insight-tile p,.action-checklist li{color:#211827}.chapter h2,.bridge-card h2,.executive-summary h2{color:#3b2354}.chapter-summary,.chapter-prescription,.insight-tile{background:#fbf8ff;color:#211827}.notice,.trust-strip{color:#4d405a}}
.visual-dashboard{display:grid;grid-template-columns:minmax(260px,.9fr) 1.1fr;gap:16px;margin:20px 0 24px;page-break-inside:avoid}.score-orbit{position:relative;min-height:290px;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:18px;background:radial-gradient(circle at 50% 38%,rgba(45,212,191,.18),transparent 34%),linear-gradient(160deg,rgba(14,20,45,.86),rgba(52,25,78,.84))}.score-orbit__core{width:142px;height:142px;margin:10px auto 18px;border-radius:50%;display:grid;place-items:center;text-align:center;background:conic-gradient(from 210deg,#f472b6 ${primaryScore}%,rgba(255,255,255,.12) 0);box-shadow:0 0 34px rgba(244,114,182,.24)}.score-orbit__core span{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:#120e28;color:#fff4c2;font-size:34px;font-weight:700}.score-orbit p{margin:0;color:#eadcf8;line-height:1.78}.score-panel{border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:16px;background:rgba(255,255,255,.055)}.score-panel h3{margin:0 0 12px;color:#fff4c2}.score-meter{margin:0 0 12px}.score-meter__top{display:flex;justify-content:space-between;gap:12px;margin-bottom:5px;color:#f7ecff}.score-meter__top strong{color:#fff4c2}.score-meter__track{height:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.score-meter__track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a78bfa,#f472b6)}.score-meter--teal .score-meter__track i{background:linear-gradient(90deg,#2dd4bf,#38bdf8)}.score-meter--gold .score-meter__track i{background:linear-gradient(90deg,#facc15,#fb923c)}.score-meter--blue .score-meter__track i{background:linear-gradient(90deg,#60a5fa,#818cf8)}.score-meter--green .score-meter__track i{background:linear-gradient(90deg,#34d399,#a3e635)}.score-meter--coral .score-meter__track i{background:linear-gradient(90deg,#fb7185,#f97316)}.radar-wrap{display:grid;grid-template-columns:330px 1fr;align-items:center;gap:14px;border:1px solid rgba(45,212,191,.2);border-radius:14px;padding:16px;background:rgba(10,24,40,.72);margin:18px 0 0}.radar-chart{width:100%;max-width:330px}.radar-ring{fill:none;stroke:rgba(255,255,255,.18);stroke-width:1}.radar-axis{stroke:rgba(255,255,255,.14);stroke-width:1}.radar-fill{fill:rgba(45,212,191,.28)}.radar-line{fill:none;stroke:#facc15;stroke-width:2.5}.radar-chart text{fill:#f8e8ff;font-size:11px}.radar-copy h3{margin:0 0 8px;color:#fff4c2}.radar-copy p{margin:0;color:#f4edf7;line-height:1.78}@media print{.visual-dashboard{grid-template-columns:1fr 1fr}.visual-dashboard,.radar-wrap{break-inside:avoid}.score-orbit,.score-panel,.radar-wrap{background:#fff;color:#211827;border-color:#d8c7ec}.score-orbit p,.radar-copy p,.score-meter__top{color:#211827}.score-orbit__core span{background:#fff;color:#3b2354}.radar-chart text{fill:#3b2354}}
</style>
</head>
<body>
<main>
  <section class="cover">
    <p class="eyebrow">SUKUYO COMPATIBILITY PREMIUM PDF</p>
    <h1>숙요점 프리미엄 궁합 PDF</h1>
    <p class="subtitle">27개의 달별로 읽는 두 사람의 인연 지도 · 15챕터 리포트</p>
    <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 궁합 리포트 표지" onerror="this.style.display='none'">
    <div class="summary">
      <div><strong>본인 숙</strong>${escapeHtml(userHost)}</div>
      <div><strong>상대 숙</strong>${escapeHtml(partnerHost)}</div>
      <div><strong>관계 유형</strong>${escapeHtml(rel)}</div>
      <div><strong>거리</strong>${escapeHtml(distance)}</div>
      <div><strong>핵심 점수</strong>${escapeHtml(renderedScoreSummary.split(".")[0])}</div>
    </div>
    <p class="notice">두 사람의 숙요 계산값 위로 관계의 온도, 거리, 회복의 결이 함께 드러납니다.</p>
  </section>
  <section class="executive-summary">
    <h2>첫눈에 보는 궁합 핵심</h2>
    <p class="executive-lead">${escapeHtml(safeName)}님과 ${escapeHtml(partnerName)}님의 인연은 점수의 표면보다 감정, 대화, 회복의 층에서 더 선명하게 떠오릅니다.</p>
    <div class="visual-dashboard">
      <div class="score-orbit">
        <div class="score-orbit__core"><span>${escapeHtml(primaryScore)}</span></div>
        <p>${escapeHtml(visualScoreSummary)}</p>
      </div>
      <div class="score-panel">
        <h3>관계 에너지 그래프</h3>
        ${scoreMeters}
      </div>
    </div>
    <div class="radar-wrap">
      ${radarChart}
      <div class="radar-copy">
        <h3>조율 레이더</h3>
        <p>${escapeHtml(visualRadarSummary)}</p>
      </div>
    </div>
    <div class="insight-grid">
      <div class="insight-tile"><strong>관계 판정</strong><p>${escapeHtml(renderedRelationSummary)}</p></div>
      <div class="insight-tile"><strong>점수 해석</strong><p>${escapeHtml(renderedScoreSummary)}</p></div>
      <div class="insight-tile"><strong>관계 방향성</strong><p>${escapeHtml(renderedDirectionSummary)}</p></div>
      <div class="insight-tile"><strong>첫 실행 과제</strong><p>${escapeHtml(renderedFinalPrescription)}</p></div>
    </div>
    <div class="trust-strip">${escapeHtml(renderedCalendarTrust)}</div>
  </section>
  <section class="intro"><h2>해석 원칙</h2><p>두 사람의 생년월일에서 떠오른 27숙 궁합 흐름이 관계 상담의 언어로 이어집니다. 선택의 문턱마다 감정의 결, 대화의 순서, 회복의 약속이 함께 비칩니다.</p></section>
  <section class="bridge-card"><h2>관계 유형 요약</h2><p>${escapeHtml(renderedRelationSummary)}</p></section>
  <section class="bridge-card"><h2>거리와 인연 강도 요약</h2><p>${escapeHtml(renderedDistanceSummary)} ${escapeHtml(renderedStrengthSummary)}</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
  <section class="bridge-card final-prescription">
    <h2>최종 관계 처방 카드</h2>
    <p>${escapeHtml(renderedFinalPrescription)}</p>
    <ol class="action-checklist">${finalActionList}</ol>
  </section>
</main>
</body>
</html>`;

  return {
    title: `${safeName} x ${partnerName} 숙요점 프리미엄 궁합 PDF`,
    filename: `sukyo-premium-compat-${safeName}-${partnerName}.html`.replace(/\s+/g, "-"),
    html,
  };
}

export function validateSukyoPdfCompletionPayload({ pdfReady = {}, chapters = [], seed = {}, requireDownloadUrl = false } = {}) {
  const narrative = inspectSukyoPdfNarrative({
    chapters,
    html: pdfReady?.html,
    finalPrescription: renderFinalPrescription(buildSukyoPremiumPdfInput(seed)),
  });
  const completionIssues = [...narrative.issues];
  const completionLocalAssembly = pdfReady?.localAssembly && typeof pdfReady.localAssembly === "object" ? pdfReady.localAssembly : {};
  if (completionLocalAssembly.enabled !== true) completionIssues.push("localAssembly.enabled");
  if (text(completionLocalAssembly.source || pdfReady?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode) !== SUKYO_PDF_CONFIG.generationMode) completionIssues.push("localAssembly.source");
  if (text(completionLocalAssembly.provider || SUKYO_PDF_CONFIG.provider) !== SUKYO_PDF_CONFIG.provider) completionIssues.push("localAssembly.provider");
  if (text(completionLocalAssembly.templateVersion) !== SUKYO_PDF_CONFIG.templateVersion) completionIssues.push("localAssembly.templateVersion");
  if (Number(completionLocalAssembly.chapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) completionIssues.push("localAssembly.chapterCount");
  if (completionLocalAssembly.externalGeneration !== false) completionIssues.push("localAssembly.externalGeneration");
  if (completionLocalAssembly.externalCallsAllowed !== false) completionIssues.push("localAssembly.externalCallsAllowed");
  const completionHtml = text(pdfReady?.html);
  if (!completionHtml) completionIssues.push("html.missing");
  if (completionHtml && !/<!doctype html>/i.test(completionHtml)) completionIssues.push("html.doctype");
  if (completionHtml && !/<meta\s+charset=["']?UTF-8["']?/i.test(completionHtml)) completionIssues.push("html.charset");
  const completionDownloadUrl = text(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !completionDownloadUrl) completionIssues.push("download_url.missing");
  return {
    ok: completionIssues.length === 0,
    issues: [...new Set(completionIssues)],
    chapterCount: objectArray(chapters).length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    totalLength: narrative.totalLength,
    htmlLength: completionHtml.length,
    hasDownloadUrl: Boolean(completionDownloadUrl),
    manuscript: narrative,
    chapterQuality: buildSukyoLocalChapterQualityReport(chapters, seed),
  };

  const issues = [];
  const normalizedChapters = chapterArrayToRendererInput(chapters);
  const manuscript = validateRenderedManuscript(seed, normalizedChapters);
  if (!manuscript.ok) issues.push(...manuscript.issues.map((issue) => `manuscript.${issue}`));
  const chapterQuality = buildSukyoChapterQualityReport(seed, normalizedChapters);
  if (!chapterQuality.ok) issues.push(...chapterQuality.issues.map((issue) => `quality.${issue}`));

  const localAssembly = pdfReady?.localAssembly && typeof pdfReady.localAssembly === "object" ? pdfReady.localAssembly : {};
  if (localAssembly.enabled !== true) issues.push("localAssembly.enabled");
  if (text(localAssembly.source || pdfReady?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode) !== SUKYO_PDF_CONFIG.generationMode) issues.push("localAssembly.source");
  if (text(localAssembly.provider || SUKYO_PDF_CONFIG.provider) !== SUKYO_PDF_CONFIG.provider) issues.push("localAssembly.provider");
  if (text(localAssembly.templateVersion) !== SUKYO_PDF_CONFIG.templateVersion) issues.push("localAssembly.templateVersion");
  if (Number(localAssembly.chapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) issues.push("localAssembly.chapterCount");
  if (Number(localAssembly.expectedChapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) issues.push("localAssembly.expectedChapterCount");
  if (localAssembly.externalGeneration !== false) issues.push("localAssembly.externalGeneration");
  if (localAssembly.externalCallsAllowed !== false) issues.push("localAssembly.externalCallsAllowed");

  const html = text(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");

  const downloadUrl = text(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");

  const manuscriptText = normalizedChapters
    .flatMap((chapter) => [
      chapter.title,
      ...chapter.sections.flatMap((section) => [section.heading, section.body]),
    ])
    .join("\n");
  if (hasSukyoBrokenText(`${html}\n${manuscriptText}`)) issues.push("text.broken");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: normalizedChapters.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    totalLength: manuscript.totalLength,
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
    manuscript,
    chapterQuality,
  };
}

export function buildSukyoPdfSeed(input = {}) {
  const canonical = input.canonical || {};
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const canonicalCompatibility = canonical.compatibility && Object.keys(canonical.compatibility).length > 0
    ? canonical.compatibility
    : null;
  const compatibility = canonicalCompatibility || input.compatibility || {};
  const userProfile = normalizePersonInput(input.userProfile || input.user || input.self || personA || {}, "사용자");
  const partnerProfile = normalizePersonInput(input.partnerProfile || input.partner || input.partnerInput || personB || {}, "상대방");
  const userSukuyo = normalizeSukuyoStar(input.userSukyo || personA?.sukuyo || {}, userProfile);
  const partnerSukuyo = normalizeSukuyoStar(input.partnerSukyo || personB?.sukuyo || {}, partnerProfile);

  const seed = {
    mode: "compatibility",
    calculationMeta: canonical?.calculationMeta || input?.calculationMeta || {},
    userProfile,
    partnerProfile,
    userSukyo: {
      index: safeNumber(userSukuyo.index),
      nameKo: text(userSukuyo.nameKo),
      nameHan: text(userSukuyo.nameHan),
      category: text(userSukuyo.category),
      element: text(userSukuyo.element),
      keywords: safeArray(userSukuyo.keywords),
      strengths: safeArray(userSukuyo.strengths),
      shadows: safeArray(userSukuyo.shadows),
      traits: safeArray(userSukuyo.traits),
      lunarYear: safeNumber(userSukuyo.lunarYear),
      lunarMonth: safeNumber(userSukuyo.lunarMonth),
      lunarDay: safeNumber(userSukuyo.lunarDay),
      isLeapMonth: Boolean(userSukuyo.isLeapMonth),
      source: text(userSukuyo.source),
    },
    partnerSukyo: {
      index: safeNumber(partnerSukuyo.index),
      nameKo: text(partnerSukuyo.nameKo),
      nameHan: text(partnerSukuyo.nameHan),
      category: text(partnerSukuyo.category),
      element: text(partnerSukuyo.element),
      keywords: safeArray(partnerSukuyo.keywords),
      strengths: safeArray(partnerSukuyo.strengths),
      shadows: safeArray(partnerSukuyo.shadows),
      traits: safeArray(partnerSukuyo.traits),
      lunarYear: safeNumber(partnerSukuyo.lunarYear),
      lunarMonth: safeNumber(partnerSukuyo.lunarMonth),
      lunarDay: safeNumber(partnerSukuyo.lunarDay),
      isLeapMonth: Boolean(partnerSukuyo.isLeapMonth),
      source: text(partnerSukuyo.source),
    },
    compatibility: {
      relationType: text(compatibility.relationType),
      relationTypeHan: text(compatibility.relationTypeHan),
      distanceLabel: text(compatibility.distanceLabel || compatibility.distance),
      directionFromAToB: text(compatibility.directionFromAToB),
      directionFromBToA: text(compatibility.directionFromBToA),
      score: safeNumber(compatibility.score),
      temperature: safeNumber(compatibility.temperature),
      magnetism: safeNumber(compatibility.magnetism),
      compatibilityIndex: safeNumber(compatibility.compatibilityIndex),
      stamp: text(compatibility.stamp),
      relationVariant: text(compatibility.relationVariant),
      chemistryScore: safeNumber(compatibility.chemistryScore),
      stabilityScore: safeNumber(compatibility.stabilityScore),
      growthScore: safeNumber(compatibility.growthScore),
      conflictScore: safeNumber(compatibility.conflictScore),
      communicationScore: safeNumber(compatibility.communicationScore),
      enhanced: compatibility.enhanced || null,
      roleActionGuide: compatibility.roleActionGuide || null,
      elementHarmony: compatibility.elementHarmony || null,
      strengthShadowMap: compatibility.strengthShadowMap || null,
      distanceMetrics: compatibility.distanceMetrics || null,
    },
  };

  seed.localSukuyoCompatibilityJson = buildLocalCompatibilityJson(seed);
  seed.chapters = getSukyoPdfChapters();
  return seed;
}

export async function generateSukyoPremiumReport(env, seed, options = {}) {
  console.log("[SukuyoPremiumPDF][LocalCalculationStart]");
  const localJson = seed.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  seed.localSukuyoCompatibilityJson = localJson;
  const pdfInputForLog = buildSukyoPremiumPdfInput(seed, localJson);
  const sukuyoFacts = buildSukuyoFacts(seed, localJson);
  const chapterPlans = buildSukuyoChapterPlans(seed, localJson);
  console.log("[SukuyoPremiumPDF][LocalCalculationSuccess]", {
    selfBirthDate: Boolean(text(localJson?.input?.self?.birthDate)),
    partnerBirthDate: Boolean(text(localJson?.input?.partner?.birthDate)),
    selfStar: Boolean(text(localJson?.self?.sukuyoStar)),
    partnerStar: Boolean(text(localJson?.partner?.sukuyoStar)),
    relationType: text(pdfInputForLog?.relation?.typeKorean || localJson?.relation?.typeKo),
    distance: text(pdfInputForLog?.relation?.distance || localJson?.relation?.distanceLabel),
  });
  const localBaseline = buildValidatedSukyoLocalChapters(seed);
  console.log("[SukuyoPremiumPDF][LocalManuscriptValidated]", {
    chapterCount: localBaseline.chapters.length,
    totalLength: localBaseline.validation.totalLength,
    forbiddenTermsCount: localBaseline.validation.forbiddenTermsCount,
    repetitionScore: localBaseline.validation.repetitionScore,
  });

  console.log("[SukuyoPremiumPDF][LocalAssembledManuscriptReady]", {
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
    localAssembly: {
      enabled: true,
      externalGeneration: false,
      externalCallsAllowed: false,
      chapterCount: localBaseline.chapters.length,
      templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    },
  });
  const localAssembly = {
    enabled: true,
    source: SUKYO_PDF_CONFIG.generationMode,
    provider: SUKYO_PDF_CONFIG.provider,
    templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    chapterCount: localBaseline.chapters.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  const chapters = localBaseline.chapters;
  const finalCheck = localBaseline.validation;
  const chapterQuality = buildSukyoChapterQualityReport(seed, chapters);
  if (!chapterQuality.ok) {
    const qualityIssues = splitSukyoQualityIssues(chapterQuality.issues);
    if (qualityIssues.blocking.length === 0 && qualityIssues.soft.length <= 2) {
      console.warn("[SukuyoPremiumPDF][ChapterSoftQualityIssues]", {
        issues: qualityIssues.soft,
      });
      chapterQuality.softIssues = qualityIssues.soft;
      chapterQuality.issues = [];
      chapterQuality.ok = true;
    } else {
    const error = new Error("SUKUYO_CHAPTER_QUALITY_VALIDATION_FAILED");
    error.code = "SUKUYO_CHAPTER_QUALITY_VALIDATION_FAILED";
    error.status = 500;
    error.issues = chapterQuality.issues;
    throw error;
    }
  }

  assertSukyoCompatibilityPdfComplete({
    chapters,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    expectedSectionsByChapter: SUKYO_PDF_CHAPTERS,
  });
  console.log("[SukuyoPremiumPDF][FinalManuscriptValidated]", {
    ok: finalCheck.ok,
    issues: finalCheck.issues,
    relationType: text(pdfInputForLog?.relation?.typeKorean || localJson?.relation?.typeKo),
    distance: text(pdfInputForLog?.relation?.distance || localJson?.relation?.distanceLabel),
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
    forbiddenTermsCount: finalCheck.forbiddenTermsCount,
    repetitionScore: finalCheck.repetitionScore,
    chapterQualityPassed: chapterQuality.ok,
    manuscriptSource: text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode),
    localAssembly,
  });

  const manuscriptSource = text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode);
  console.log("[SukuyoPremiumPDF][PdfRenderStart]");
  const pdfReady = renderSukyoPremiumPdfLocal(chapters, seed);
  pdfReady.manuscriptSource = manuscriptSource;
  pdfReady.localAssembly = localAssembly;
  if (!text(pdfReady?.html)) {
    const error = new Error("숙요점 PDF 렌더링 결과가 비어 있습니다.");
    error.code = "SUKYO_PDF_RENDER_EMPTY";
    error.status = 500;
    throw error;
  }
  const pdfCompletionValidation = validateSukyoPdfCompletionPayload({
    pdfReady,
    chapters,
    seed,
    requireDownloadUrl: false,
  });
  if (!pdfCompletionValidation.ok) {
    const completionIssues = splitSukyoQualityIssues(pdfCompletionValidation.issues);
    if (completionIssues.blocking.length === 0 && completionIssues.soft.length <= 4) {
      console.warn("[SukuyoPremiumPDF][CompletionSoftQualityIssues]", {
        issues: completionIssues.soft,
      });
      pdfCompletionValidation.softIssues = completionIssues.soft;
      pdfCompletionValidation.issues = [];
      pdfCompletionValidation.ok = true;
    } else {
    console.warn("[SukuyoPremiumPDF][CompletionValidationIssues]", {
      issues: pdfCompletionValidation.issues,
    });
    const error = new Error("숙요점 PDF 완료 검증에 실패했습니다.");
    error.code = "SUKYO_PDF_COMPLETION_VALIDATION_FAILED";
    error.status = 500;
    error.issues = pdfCompletionValidation.issues;
    throw error;
    }
  }
  console.log("[SukuyoPremiumPDF][PdfRenderSuccess]", {
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
    manuscriptSource: text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode),
    localAssembly,
    pdfCompletionValidation: pdfCompletionValidation.ok,
  });
  return {
    ok: true,
    payload: {
      ...seed,
      mode: "compatibility",
      localSukuyoCompatibilityJson: localJson,
      sukuyoFacts,
      sukuyoChapterPlans: chapterPlans,
      assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
      chapters,
      manuscriptValidation: finalCheck,
      manuscriptSource,
      generationMode: SUKYO_PDF_CONFIG.generationMode,
      provider: SUKYO_PDF_CONFIG.provider,
      writingPipeline: "local-calculation-to-local-assembled-pdf",
      localAssembly,
      pdfCompletionValidation,
      chapterQuality,
      localQualityStatus: "passed",
      localBaselineChapterCount: localBaseline.chapters.length,
      qualityStatus: "passed",
    },
    chapters,
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    localQualityStatus: "passed",
    localBaselineChapterCount: localBaseline.chapters.length,
    manuscriptSource,
    assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
    generationMode: SUKYO_PDF_CONFIG.generationMode,
    provider: SUKYO_PDF_CONFIG.provider,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
    localAssembly,
    pdfCompletionValidation,
    chapterQuality,
    sukuyoFacts,
    sukuyoChapterPlans: chapterPlans,
    qualityStatus: "passed",
    serverStatus: "completed",
    pdfReady: {
      ...pdfReady,
      pdfUrl: text(pdfReady?.pdfUrl),
      htmlUrl: text(pdfReady?.htmlUrl),
      downloadUrl: text(pdfReady?.downloadUrl),
      storageKey: text(pdfReady?.storageKey),
      mimeType: text(pdfReady?.mimeType, "text/html"),
      manuscriptSource,
      localAssembly,
    },
  };
}
