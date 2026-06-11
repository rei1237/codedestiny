import {
  ANIMAL_DESTINY_DATA,
  STAGE_LABEL_TO_KEY,
  STAGE_SEQUENCE,
  STAGE_KEY_TO_LABEL,
} from "@/components/fortune/animal-twelve/animalTwelveData";
import { getPrimaryAnimalStage } from "./twelveStages";
import type {
  AnimalCompatibilityResult,
  AnimalDestinyData,
  AnimalId,
  SajuEngineResult,
  TwelveStage,
  TwelveStageKey,
} from "./types";

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
type TenGodKey = "self" | "output" | "wealth" | "authority" | "resource";

export type GuardianAnimalProfile = {
  id: AnimalId;
  name: string;
  animal: string;
  assetKey: string;
  symbol: string;
  elementKeys: ElementKey[];
  supportElements: ElementKey[];
  tenGodKeys: TenGodKey[];
  stageKeys: TwelveStageKey[];
  guardianType: string;
  oneLine: string;
  intro: string;
  basisTone: string;
  power: string;
  warning: string;
  todayMessage: string;
  luckyAction: string;
  keywords: string[];
  cautionKeywords: string[];
  memeLines: string[];
  goodMatches: AnimalId[];
  cautionMatches: AnimalId[];
  shareLine: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    ink: string;
  };
};

export type GuardianSajuBasis = {
  dayStem: string;
  dayElement: ElementKey | null;
  monthBranch: string;
  monthElement: ElementKey | null;
  strongestElement: ElementKey | null;
  weakestElement: ElementKey | null;
  dominantTenGod: TenGodKey | null;
  elementCounts: Record<ElementKey, number>;
};

const ELEMENT_LABEL: Record<ElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const ELEMENT_STYLE: Record<ElementKey, string> = {
  wood: "성장과 회복",
  fire: "자신감과 표현",
  earth: "안정감과 현실감",
  metal: "결단력과 경계선",
  water: "직감과 회복력",
};

const TEN_GOD_LABEL: Record<TenGodKey, string> = {
  self: "비겁",
  output: "식상",
  wealth: "재성",
  authority: "관성",
  resource: "인성",
};

const TEN_GOD_STYLE: Record<TenGodKey, string> = {
  self: "독립형 가디언",
  output: "표현형 가디언",
  wealth: "현실형·돈복형 가디언",
  authority: "질서형·보호자형 가디언",
  resource: "치유형·영감형 가디언",
};

const STEM_ELEMENT: Record<string, ElementKey> = {
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
};

const BRANCH_ELEMENT: Record<string, ElementKey> = {
  인: "wood",
  묘: "wood",
  사: "fire",
  오: "fire",
  진: "earth",
  술: "earth",
  축: "earth",
  미: "earth",
  신: "metal",
  유: "metal",
  자: "water",
  해: "water",
};

const PRODUCES: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

export const STAGE_TO_ANIMAL: Record<TwelveStage, AnimalId> = {
  장생: "cheetah",
  목욕: "monkey",
  관대: "black-panther",
  건록: "koala",
  제왕: "tiger",
  쇠: "raccoon",
  병: "rhino",
  사: "elephant",
  묘: "sheep",
  절: "pegasus",
  태: "wolf",
  양: "fawn",
};

export const GUARDIAN_ANIMAL_PROFILES: Record<AnimalId, GuardianAnimalProfile> = {
  cheetah: {
    id: "cheetah",
    name: "달빛 여우 가디언",
    animal: "여우",
    assetKey: "fox-moon",
    symbol: "🦊",
    elementKeys: ["wood", "water"],
    supportElements: ["water", "wood"],
    tenGodKeys: ["output", "resource"],
    stageKeys: ["jangsaeng", "mogyok", "sa"],
    guardianType: "감각형 보호자",
    oneLine: "분위기를 읽고, 위험을 피하고, 기회를 조용히 잡는 수호자",
    intro: "겉으로는 부드럽지만 위험한 기운을 누구보다 빠르게 감지합니다. 말보다 표정, 속도, 공기의 변화를 먼저 읽는 타입이에요.",
    basisTone: "직접 부딪히기보다 먼저 읽고 움직이는 구조가 선명합니다.",
    power: "무리해서 앞에 나설 때보다 분위기를 읽고 타이밍을 잡을 때 수호력이 강해집니다. 첫인상보다 두 번째 느낌을 믿을수록 실수가 줄어듭니다.",
    warning: "상대의 말투, 답장 속도, 표정 하나까지 다 분석하기 시작하면 내 운의 중심이 흔들릴 수 있습니다.",
    todayMessage: "촉 왔다고 바로 뛰지 말고, 여우처럼 한 박자만 기다려.",
    luckyAction: "첫 느낌을 기록하고 바로 반응하지 않기",
    keywords: ["직감", "거리조절", "매력", "눈치"],
    cautionKeywords: ["과해석", "혼자 버티기", "감정 피로"],
    memeLines: ["다 느낀 척 안 하지만 사실 이미 눈치챔", "카톡 온도 변화에 제일 먼저 반응함", "좋아하는 사람 앞에서는 방어막이 살짝 느슨해짐"],
    goodMatches: ["monkey", "koala", "tiger"],
    cautionMatches: ["raccoon", "black-panther"],
    shareLine: "분위기를 읽고 위험을 피하는 감각형 행운캐",
    palette: { primary: "#7c5cff", secondary: "#63d7d4", accent: "#ffd66b", background: "#19142f", ink: "#fff7dc" },
  },
  monkey: {
    id: "monkey",
    name: "금빛 사슴 가디언",
    animal: "사슴",
    assetKey: "deer-gold",
    symbol: "🦌",
    elementKeys: ["wood", "earth"],
    supportElements: ["wood", "earth"],
    tenGodKeys: ["resource", "authority"],
    stageKeys: ["jangsaeng", "yang", "geonrok"],
    guardianType: "귀인형 보호자",
    oneLine: "조용히 좋은 사람과 기회를 끌어당기는 부드러운 행운",
    intro: "강하게 밀어붙이기보다 품격 있게 흐름을 만들 때 운이 열립니다. 주변에 오래 남는 귀인운이 있는 타입이에요.",
    basisTone: "성장 기운과 안정 기운이 균형을 이루며 부드러운 보호막을 만듭니다.",
    power: "예의 있게 선을 지키고, 좋은 사람을 오래 보살필 때 기회가 따라옵니다. 급하게 빛나기보다 오래 반짝이는 힘이 강합니다.",
    warning: "모두에게 좋은 사람이 되려다 내 우선순위가 흐려지면 귀인운도 같이 약해질 수 있습니다.",
    todayMessage: "좋은 사람에게는 더 다정하게, 애매한 약속에는 더 단단하게.",
    luckyAction: "감사 인사 하나를 정확한 사람에게 보내기",
    keywords: ["품격", "귀인", "부드러운 행운", "균형"],
    cautionKeywords: ["눈치 양보", "느린 결정", "관계 피로"],
    memeLines: ["좋은 척이 아니라 진짜 예의를 챙김", "싸우기 전에 분위기를 먼저 정리함", "괜찮다고 말하지만 기준은 은근 확실함"],
    goodMatches: ["cheetah", "koala", "tiger"],
    cautionMatches: ["black-panther", "raccoon"],
    shareLine: "조용히 귀인과 기회를 끌어당기는 품격형 행운캐",
    palette: { primary: "#46b48f", secondary: "#f6d37a", accent: "#fff0a8", background: "#173326", ink: "#fff8df" },
  },
  "black-panther": {
    id: "black-panther",
    name: "백호 기사 가디언",
    animal: "백호",
    assetKey: "tiger-white",
    symbol: "🐯",
    elementKeys: ["metal"],
    supportElements: ["metal", "earth"],
    tenGodKeys: ["authority", "self"],
    stageKeys: ["gwandae", "geonrok", "jewang"],
    guardianType: "전사형 보호막",
    oneLine: "아닌 것은 아니라고 말할 때 강해지는 결단형 수호자",
    intro: "경계선이 분명하고 위기 앞에서 흐트러지지 않습니다. 해야 할 말은 결국 하는 쪽에 가까워요.",
    basisTone: "결단과 질서의 기운이 강해 스스로를 지키는 힘이 선명합니다.",
    power: "불편한 약속을 미루지 않고 정리할 때 운이 강해집니다. 부드러운 표현을 함께 쓰면 보호막이 더 넓어집니다.",
    warning: "정확함이 지나치면 차갑게 보일 수 있습니다. 이길 말보다 남길 말을 고르는 날이 필요합니다.",
    todayMessage: "선은 긋되, 말끝은 부드럽게. 오늘의 카리스마는 톤에서 완성돼.",
    luckyAction: "미뤄둔 거절 하나를 짧고 명확하게 정리하기",
    keywords: ["결단", "경계선", "보호막", "카리스마"],
    cautionKeywords: ["차가움", "단정", "완벽 압박"],
    memeLines: ["괜찮다고 했지만 사실 기준표 돌리는 중", "정리 버튼 누르면 속도가 빠름", "내 사람에게는 방어력이 갑자기 999"],
    goodMatches: ["sheep", "fawn", "monkey"],
    cautionMatches: ["raccoon", "cheetah"],
    shareLine: "선을 지키고 기회를 베어 여는 결단형 수호자",
    palette: { primary: "#dfe8f3", secondary: "#6d7f9d", accent: "#8ef0ff", background: "#151b28", ink: "#f8fbff" },
  },
  koala: {
    id: "koala",
    name: "복돼지 가디언",
    animal: "돼지",
    assetKey: "pig-fortune",
    symbol: "🐷",
    elementKeys: ["earth"],
    supportElements: ["earth", "fire"],
    tenGodKeys: ["wealth", "output"],
    stageKeys: ["geonrok", "myo", "yang"],
    guardianType: "현실형 행운캐",
    oneLine: "돈과 기회를 귀엽게 감지하는 현실 감각의 수호자",
    intro: "편안해 보여도 내가 좋아하는 것과 필요한 것에는 확실히 움직입니다. 웃고 있어도 계산은 빠른 편이에요.",
    basisTone: "현실 감각과 결과를 만드는 기운이 만나 복을 손에 잡히는 형태로 바꿉니다.",
    power: "막연한 꿈보다 손에 잡히는 결과, 말보다 실제 행동, 분위기보다 계산 가능한 안정감에서 수호력이 나옵니다.",
    warning: "좋아하는 사람 앞에서 내 몫을 양보하다가 뒤늦게 억울해질 수 있습니다. 귀여워도 밥그릇은 지켜야 합니다.",
    todayMessage: "착한 척하다가 손해 보지 마. 오늘은 귀엽게, 하지만 확실하게 챙기는 날.",
    luckyAction: "쿠폰, 정산, 일정 중 하나를 바로 챙기기",
    keywords: ["재물", "먹복", "편안함", "현실 감각"],
    cautionKeywords: ["양보 과다", "익숙한 손해", "늦은 정산"],
    memeLines: ["돈 싫다고 말하지만 할인쿠폰은 절대 안 놓침", "감으로 움직이는 척하지만 속으로 계산 끝남", "힘들어도 귀여운 척으로 버티는 생존형"],
    goodMatches: ["monkey", "cheetah", "pegasus"],
    cautionMatches: ["black-panther", "raccoon"],
    shareLine: "돈 냄새를 귀엽게 맡는 현실형 행운캐",
    palette: { primary: "#ff8faf", secondary: "#ffd980", accent: "#7ee2c8", background: "#332033", ink: "#fff2dd" },
  },
  tiger: {
    id: "tiger",
    name: "별빛 고래 가디언",
    animal: "고래",
    assetKey: "whale-star",
    symbol: "🐋",
    elementKeys: ["water"],
    supportElements: ["water", "metal"],
    tenGodKeys: ["resource"],
    stageKeys: ["tae", "sa", "mogyok"],
    guardianType: "치유형 예언자",
    oneLine: "깊은 감성과 직감으로 마음을 회복시키는 밤의 수호자",
    intro: "겉으로는 느긋해 보여도 속은 깊고 넓습니다. 혼자만의 시간이 충전의 핵심이에요.",
    basisTone: "흐름을 읽는 수 기운과 영감형 에너지가 강해 마음의 파도를 잘 감지합니다.",
    power: "조용히 쉬면서 생각을 가라앉힐 때 답이 올라옵니다. 빨리 설명하려 하지 않아도 깊이는 이미 전달됩니다.",
    warning: "감정을 오래 품기만 하면 몸이 먼저 무거워질 수 있습니다. 깊은 마음에도 환기 창이 필요합니다.",
    todayMessage: "오늘은 깊게 느끼되 오래 잠기진 마. 별빛은 물 위로 올라올 때 보여.",
    luckyAction: "혼자 있는 20분을 먼저 확보하기",
    keywords: ["감성", "치유", "직감", "깊이"],
    cautionKeywords: ["잠수", "감정 과적", "느린 회복"],
    memeLines: ["괜찮다면서 혼자 충전기 꽂으러 감", "말은 적어도 감정 로그는 길게 남음", "사람보다 분위기 파동을 먼저 느낌"],
    goodMatches: ["cheetah", "monkey", "sheep"],
    cautionMatches: ["raccoon", "black-panther"],
    shareLine: "감성과 직감으로 마음을 회복시키는 깊은 수호자",
    palette: { primary: "#356dff", secondary: "#53d6ff", accent: "#f4e7ff", background: "#12183d", ink: "#eef7ff" },
  },
  raccoon: {
    id: "raccoon",
    name: "불꽃 봉황 가디언",
    animal: "봉황",
    assetKey: "phoenix-fire",
    symbol: "🔥",
    elementKeys: ["fire"],
    supportElements: ["fire", "wood"],
    tenGodKeys: ["output", "wealth"],
    stageKeys: ["jewang", "gwandae", "mogyok"],
    guardianType: "재도약형 스타",
    oneLine: "무너져도 다시 화려하게 살아나는 표현력의 수호자",
    intro: "사람들 앞에서 빛날수록 운이 열립니다. 주목이 부담이면서도 결국 에너지가 되는 타입이에요.",
    basisTone: "표현과 확장의 기운이 강해 멈춘 자리에서도 다시 불씨를 만드는 힘이 있습니다.",
    power: "아이디어를 말하고 보여줄 때 수호력이 켜집니다. 나를 숨기기보다 작은 무대라도 잡는 편이 좋습니다.",
    warning: "계속 불타기만 하면 재가 남습니다. 반응을 받기 위해 무리하면 마음의 온도가 너무 올라갑니다.",
    todayMessage: "오늘은 작게라도 보여줘. 봉황은 박수보다 재도약할 무대를 먼저 고른다.",
    luckyAction: "미뤄둔 게시, 발표, 제안을 하나 실행하기",
    keywords: ["재도약", "인기", "표현력", "열정"],
    cautionKeywords: ["과열", "인정 욕구", "번아웃"],
    memeLines: ["조용히 살고 싶다면서 결과물은 화려함", "칭찬 받으면 배터리 급속 충전", "망했다가도 갑자기 리브랜딩함"],
    goodMatches: ["pegasus", "fawn", "koala"],
    cautionMatches: ["tiger", "black-panther"],
    shareLine: "무너져도 다시 빛나는 재도약형 인기캐",
    palette: { primary: "#ff6a3d", secondary: "#ffd15c", accent: "#ff9bd1", background: "#35151d", ink: "#fff0d6" },
  },
  rhino: {
    id: "rhino",
    name: "흑룡 가디언",
    animal: "용",
    assetKey: "dragon-black",
    symbol: "🐉",
    elementKeys: ["water", "earth"],
    supportElements: ["water", "earth"],
    tenGodKeys: ["authority", "resource", "self"],
    stageKeys: ["sa", "jeol", "myo"],
    guardianType: "반전운 수호자",
    oneLine: "위기 속에서 깊은 힘을 깨우는 카리스마형 수호자",
    intro: "평범한 길보다 굴곡이 있는 길에서 더 강해집니다. 인생의 반전 구간이 오히려 힘을 깨우는 타입이에요.",
    basisTone: "깊은 수 기운과 버티는 토 기운이 만나 쉽게 꺾이지 않는 중심을 만듭니다.",
    power: "혼란스러운 상황에서 우선순위를 세울 때 수호력이 폭발합니다. 위기를 작게 쪼개면 반전운이 살아납니다.",
    warning: "모든 것을 혼자 통제하려 들면 주변의 도움을 놓칠 수 있습니다. 카리스마에도 휴식이 필요합니다.",
    todayMessage: "흔들리는 판에서 네가 중심을 잡아. 단, 혼자 다 들 필요는 없어.",
    luckyAction: "가장 큰 걱정을 세 조각으로 나누기",
    keywords: ["깊은 힘", "반전운", "카리스마", "버팀"],
    cautionKeywords: ["통제 과다", "고립", "긴장 누적"],
    memeLines: ["평온할 땐 조용한데 위기 오면 갑자기 각성함", "대충 넘기는 듯해도 핵심은 절대 안 놓침", "상처를 힘으로 바꾸는 편"],
    goodMatches: ["sheep", "tiger", "black-panther"],
    cautionMatches: ["raccoon", "pegasus"],
    shareLine: "위기 속에서 더 강해지는 반전운 카리스마",
    palette: { primary: "#24283f", secondary: "#4b7d90", accent: "#b7fff1", background: "#090b18", ink: "#eefcff" },
  },
  elephant: {
    id: "elephant",
    name: "연꽃 토끼 가디언",
    animal: "토끼",
    assetKey: "rabbit-lotus",
    symbol: "🐰",
    elementKeys: ["wood"],
    supportElements: ["wood", "water"],
    tenGodKeys: ["output", "resource"],
    stageKeys: ["mogyok", "jangsaeng", "yang"],
    guardianType: "호감형 생존가",
    oneLine: "귀여움과 생존감각으로 관계의 문을 여는 수호자",
    intro: "만만해 보이지만 은근히 자기 영역이 확실합니다. 부드러움이 곧 전략이 되는 타입이에요.",
    basisTone: "자라나는 목 기운과 섬세한 표현성이 만나 호감운을 만들고 있습니다.",
    power: "부드럽게 부탁하고 빠르게 분위기를 전환할 때 수호력이 강해집니다. 귀여움은 약함이 아니라 생존 기술입니다.",
    warning: "싫은 걸 싫다고 말하지 못하면 마음속 방이 금방 어지러워집니다. 작은 거절을 연습해야 합니다.",
    todayMessage: "귀여운 건 무기야. 하지만 네 영역 표시도 같이 해.",
    luckyAction: "작은 부탁 하나를 정확히 말하기",
    keywords: ["귀여움", "생존감각", "호감운", "부드러운 선"],
    cautionKeywords: ["거절 어려움", "감정 숨김", "눈치 피로"],
    memeLines: ["만만해 보이지만 선 넘으면 조용히 멀어짐", "귀여운 척이 아니라 귀여운데 똑똑함", "좋아하는 사람한텐 약하고 싫은 사람한텐 자동 방어막"],
    goodMatches: ["cheetah", "monkey", "tiger"],
    cautionMatches: ["black-panther", "raccoon"],
    shareLine: "귀여움으로 살아남는 호감형 생존캐",
    palette: { primary: "#f09bd6", secondary: "#a8f0c6", accent: "#fff28a", background: "#29172c", ink: "#fff5f9" },
  },
  sheep: {
    id: "sheep",
    name: "은빛 늑대 가디언",
    animal: "늑대",
    assetKey: "wolf-silver",
    symbol: "🐺",
    elementKeys: ["metal", "water"],
    supportElements: ["metal", "water"],
    tenGodKeys: ["self", "authority"],
    stageKeys: ["tae", "jeol", "geonrok"],
    guardianType: "독립형 감시자",
    oneLine: "혼자 있을 때 더 강해지는 집중력의 밤 수호자",
    intro: "아무에게나 마음을 열지 않지만 한 번 정하면 끝까지 지킵니다. 고독이 약점이 아니라 충전 방식이에요.",
    basisTone: "금의 경계선과 수의 직감이 만나 조용하지만 날카로운 보호 본능을 만듭니다.",
    power: "혼자 정리하고 깊게 집중할 때 운이 선명해집니다. 적은 사람과 깊은 신뢰를 쌓을수록 강해집니다.",
    warning: "혼자 버티는 시간이 길어지면 도움을 받을 타이밍을 놓칠 수 있습니다.",
    todayMessage: "아무에게나 설명하지 마. 오늘은 네 페이스를 지키는 게 수호력.",
    luckyAction: "알림을 줄이고 집중 시간 40분 확보하기",
    keywords: ["독립", "집중", "밤의 감각", "충성심"],
    cautionKeywords: ["고립", "무표정", "긴장"],
    memeLines: ["단톡에 조용하지만 상황 파악은 다 함", "혼자 있을 때 능률이 갑자기 올라감", "마음 열면 오래 지키는 타입"],
    goodMatches: ["tiger", "black-panther", "rhino"],
    cautionMatches: ["raccoon", "koala"],
    shareLine: "혼자 있을수록 강해지는 밤의 집중캐",
    palette: { primary: "#8aa0b8", secondary: "#24324b", accent: "#dff7ff", background: "#101626", ink: "#f1f8ff" },
  },
  pegasus: {
    id: "pegasus",
    name: "햇살 다람쥐 가디언",
    animal: "다람쥐",
    assetKey: "squirrel-sun",
    symbol: "🐿️",
    elementKeys: ["fire", "earth"],
    supportElements: ["fire", "earth"],
    tenGodKeys: ["wealth", "output"],
    stageKeys: ["myo", "geonrok", "gwandae"],
    guardianType: "준비형 실속가",
    oneLine: "작은 기회를 모아 큰 결과를 만드는 알뜰한 수호자",
    intro: "남들이 흘려보낸 가능성을 잘 주워 담습니다. 작아 보여도 쌓이면 크게 이기는 운이에요.",
    basisTone: "표현의 불씨와 현실의 저장력이 만나 기회를 모으는 구조가 강합니다.",
    power: "작은 루틴, 저장, 기록에서 수호력이 나옵니다. 하루 하나씩 모으면 어느 순간 판이 바뀝니다.",
    warning: "너무 많이 대비하면 시작이 늦어질 수 있습니다. 저장만큼 실행도 필요합니다.",
    todayMessage: "작은 거 하나 챙긴 사람이 결국 이겨. 오늘의 복은 메모장에 숨어 있어.",
    luckyAction: "흩어진 할 일 3개를 한 목록으로 모으기",
    keywords: ["준비성", "수집", "실속", "작지만 강한 운"],
    cautionKeywords: ["걱정 저장", "시작 지연", "소소한 과소비"],
    memeLines: ["별거 아닌 정보도 일단 저장함", "작은 혜택을 모아 큰 기쁨을 만듦", "준비물 없는 상황을 제일 싫어함"],
    goodMatches: ["koala", "raccoon", "monkey"],
    cautionMatches: ["rhino", "sheep"],
    shareLine: "작은 기회를 모아 큰 결과를 만드는 준비형 행운캐",
    palette: { primary: "#ffb347", secondary: "#72d6a3", accent: "#fff1a6", background: "#2f2413", ink: "#fff8df" },
  },
  wolf: {
    id: "wolf",
    name: "하얀 고양이 가디언",
    animal: "고양이",
    assetKey: "cat-white",
    symbol: "🐱",
    elementKeys: ["metal", "wood"],
    supportElements: ["metal", "wood"],
    tenGodKeys: ["self", "resource"],
    stageKeys: ["soe", "mogyok", "tae"],
    guardianType: "우아한 경계자",
    oneLine: "부드러운 얼굴로 내 공간을 지키는 우아한 수호자",
    intro: "다가갈 땐 다정하지만 내 리듬을 침범당하면 바로 조용해집니다. 취향과 감각이 운을 부릅니다.",
    basisTone: "섬세한 감각과 선명한 경계선이 함께 작동하는 구조입니다.",
    power: "내 공간을 예쁘게 정리하고 취향을 드러낼 때 수호력이 살아납니다. 좋아하는 것을 아끼지 마세요.",
    warning: "싫은 티를 너무 늦게 내면 관계가 갑자기 끊기는 모양이 될 수 있습니다.",
    todayMessage: "오늘은 착한 척보다 취향을 지켜. 네 공간이 곧 부적이야.",
    luckyAction: "책상, 가방, 폰 화면 중 하나를 내 취향대로 정리하기",
    keywords: ["취향", "경계", "우아함", "감각"],
    cautionKeywords: ["갑작스런 단절", "예민함", "혼자 판단"],
    memeLines: ["괜찮은 척하다가 갑자기 거리 둠", "취향 맞는 순간 마음이 열림", "내 공간 건드리면 표정부터 바뀜"],
    goodMatches: ["cheetah", "sheep", "monkey"],
    cautionMatches: ["raccoon", "koala"],
    shareLine: "내 공간과 취향을 지키는 우아한 경계캐",
    palette: { primary: "#f7f7ff", secondary: "#b9ffd9", accent: "#9d7cff", background: "#171629", ink: "#fbfbff" },
  },
  fawn: {
    id: "fawn",
    name: "푸른 용 가디언",
    animal: "용",
    assetKey: "dragon-blue",
    symbol: "🐲",
    elementKeys: ["wood", "water"],
    supportElements: ["wood", "water", "fire"],
    tenGodKeys: ["self", "output", "authority"],
    stageKeys: ["jewang", "jangsaeng", "tae"],
    guardianType: "개척형 수호신",
    oneLine: "흐름을 읽고 새 길을 여는 성장형 카리스마",
    intro: "가만히 있어도 방향을 크게 바꾸는 힘이 있습니다. 새로운 세계를 열 때 운이 따라오는 타입이에요.",
    basisTone: "성장하는 목 기운과 흐름을 읽는 수 기운이 만나 큰 전환의 문을 엽니다.",
    power: "새로운 계획을 선언하고 첫 움직임을 만들 때 수호력이 커집니다. 큰 그림을 말로 꺼내야 길이 열립니다.",
    warning: "계획이 커질수록 오늘 할 한 가지가 흐려질 수 있습니다. 거대한 비전에도 작은 착지가 필요합니다.",
    todayMessage: "큰 꿈은 좋아. 대신 오늘의 첫 발자국까지 같이 찍어.",
    luckyAction: "큰 목표 하나를 오늘 할 15분 행동으로 바꾸기",
    keywords: ["개척", "성장", "흐름", "비전"],
    cautionKeywords: ["과한 확장", "착지 부족", "일정 분산"],
    memeLines: ["갑자기 인생 로드맵을 새로 짬", "작게 시작한다면서 스케일이 커짐", "촉과 야망이 동시에 움직임"],
    goodMatches: ["raccoon", "black-panther", "monkey"],
    cautionMatches: ["koala", "sheep"],
    shareLine: "새 길을 여는 성장형 카리스마 수호자",
    palette: { primary: "#2f8fff", secondary: "#5df0bc", accent: "#ffe177", background: "#0f1d38", ink: "#efffff" },
  },
};

function relationByDistance(distance: number) {
  if (distance <= 1) return { relationType: "환상" as const, baseScore: 92 };
  if (distance <= 2) return { relationType: "좋음" as const, baseScore: 82 };
  if (distance <= 4) return { relationType: "긴장" as const, baseScore: 62 };
  return { relationType: "주의" as const, baseScore: 48 };
}

function stageDistance(myStageKey: TwelveStageKey, partnerStageKey: TwelveStageKey) {
  const myIndex = STAGE_SEQUENCE.indexOf(myStageKey);
  const partnerIndex = STAGE_SEQUENCE.indexOf(partnerStageKey);
  if (myIndex < 0 || partnerIndex < 0) return 6;

  const direct = Math.abs(myIndex - partnerIndex);
  return Math.min(direct, 12 - direct);
}

function relationSummary(myAnimal: string, partnerAnimal: string, distance: number) {
  if (distance <= 1) {
    return `${myAnimal}와 ${partnerAnimal}는 감정 박자가 빠르게 맞아 서로의 수호력을 키우는 조합입니다.`;
  }
  if (distance <= 2) {
    return `${myAnimal}와 ${partnerAnimal}는 부족한 기운을 부드럽게 보완하며 성장하는 조합입니다.`;
  }
  if (distance <= 4) {
    return `${myAnimal}와 ${partnerAnimal}는 끌림은 강하지만 생활 리듬 조율이 필요한 조합입니다.`;
  }
  return `${myAnimal}와 ${partnerAnimal}는 표현 방식 차이가 커 경계와 합의가 중요한 조합입니다.`;
}

function buildDefaultBreakdown(myAnimal: string, partnerAnimal: string, relationType: "환상" | "좋음" | "긴장" | "주의") {
  const relationLine =
    relationType === "환상"
      ? "서로의 리듬이 빠르게 동기화되는 조합"
      : relationType === "좋음"
      ? "역할을 나누면 장점이 크게 증폭되는 조합"
      : relationType === "긴장"
      ? "매력은 크지만 조율이 필요한 조합"
      : "차이를 합의로 관리해야 안정되는 조합";

  return {
    overall: {
      title: "종합 궁합",
      body: [
        `${myAnimal}와 ${partnerAnimal}는 ${relationLine}입니다. 수호동물 궁합은 감정의 강약보다 에너지 운용 방식의 합을 먼저 봅니다.`,
        "처음의 끌림이 강할수록 관계 설계를 생략하기 쉽지만, 장기적으로는 생활 루틴과 갈등 복구 방식의 합의가 궁합 점수를 좌우합니다.",
      ],
    },
    emotionCommunication: {
      title: "감정 및 소통 궁합",
      body: [
        "감정의 온도와 표현 속도가 다를 수 있어 오해는 대개 의도보다 전달 방식에서 발생합니다.",
        "감정 해석보다 사실 확인을 먼저 하고, 원하는 반응이 공감인지 해결인지 짧게 물어보면 관계 피로가 줄어듭니다.",
      ],
    },
    valueLifestyle: {
      title: "가치관 및 생활 패턴",
      body: [
        "생활 리듬, 휴식 방식, 돈과 시간의 우선순위에서 차이가 드러날 가능성이 있습니다.",
        "루틴을 강요하기보다 각자의 회복 방식과 일상 템포를 존중하면 다른 성향이 갈등이 아니라 시너지로 바뀝니다.",
      ],
    },
    practicalAdvice: {
      title: "실전 조언",
      body: [
        "관계의 핵심은 감정 토론의 길이가 아니라 점검의 주기입니다.",
        "월 1회 고정된 타이밍에 감정 온도, 생활 합의, 다음 한 달의 역할 분담을 함께 점검하면 궁합의 안정도가 올라갑니다.",
        "갈등이 발생한 주간에는 승패를 가르기보다 재발 방지 규칙 1개를 남기는 방식이 가장 실전적입니다.",
      ],
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getPillars(sajuResult: SajuEngineResult) {
  const root = asRecord(sajuResult) || {};
  const pillars = asRecord(root.pillars) || {};

  return (["year", "month", "day", "hour"] as const).map((key) => {
    const source = asRecord(pillars[key]) || asRecord(root[`${key}Pillar`]) || {};
    const ganji = cleanText(source.ganji);
    const stem = cleanText(source.stem || source.stemKo || source.heavenlyStem || ganji.slice(0, 1));
    const branch = cleanText(source.branch || source.branchKo || source.earthlyBranch || ganji.slice(1, 2));
    return { key, stem, branch, ganji };
  });
}

function tenGodForElement(dayElement: ElementKey, targetElement: ElementKey): TenGodKey {
  if (targetElement === dayElement) return "self";
  if (PRODUCES[dayElement] === targetElement) return "output";
  if (CONTROLS[dayElement] === targetElement) return "wealth";
  if (CONTROLS[targetElement] === dayElement) return "authority";
  return "resource";
}

export function analyzeGuardianSaju(sajuResult: SajuEngineResult | null | undefined): GuardianSajuBasis {
  const counts: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (!sajuResult) {
    return {
      dayStem: "",
      dayElement: null,
      monthBranch: "",
      monthElement: null,
      strongestElement: null,
      weakestElement: null,
      dominantTenGod: null,
      elementCounts: counts,
    };
  }

  const root = asRecord(sajuResult) || {};
  const pillars = getPillars(sajuResult);
  const dayPillar = pillars.find((pillar) => pillar.key === "day");
  const monthPillar = pillars.find((pillar) => pillar.key === "month");
  const dayStem = cleanText(root.dayStem) || dayPillar?.stem || "";
  const dayElement = STEM_ELEMENT[dayStem] || null;
  const monthBranch = monthPillar?.branch || "";
  const monthElement = BRANCH_ELEMENT[monthBranch] || null;
  const tenGodCounts: Record<TenGodKey, number> = { self: 0, output: 0, wealth: 0, authority: 0, resource: 0 };

  pillars.forEach((pillar) => {
    const stemElement = STEM_ELEMENT[pillar.stem];
    const branchElement = BRANCH_ELEMENT[pillar.branch];
    if (stemElement) counts[stemElement] += 1;
    if (branchElement) counts[branchElement] += pillar.key === "month" ? 2 : 1;

    if (dayElement && stemElement && pillar.key !== "day") {
      tenGodCounts[tenGodForElement(dayElement, stemElement)] += 1;
    }
    if (dayElement && branchElement) {
      tenGodCounts[tenGodForElement(dayElement, branchElement)] += pillar.key === "month" ? 2 : 1;
    }
  });

  const orderedElements = (Object.keys(counts) as ElementKey[]).sort((left, right) => counts[right] - counts[left]);
  const strongestElement = orderedElements[0] || null;
  const weakestElement = [...orderedElements].sort((left, right) => counts[left] - counts[right])[0] || null;
  const dominantTenGod = (Object.keys(tenGodCounts) as TenGodKey[]).sort((left, right) => tenGodCounts[right] - tenGodCounts[left])[0] || null;

  return {
    dayStem,
    dayElement,
    monthBranch,
    monthElement,
    strongestElement,
    weakestElement,
    dominantTenGod,
    elementCounts: counts,
  };
}

function scoreGuardianProfile(profile: GuardianAnimalProfile, basis: GuardianSajuBasis, stageKey: TwelveStageKey | null) {
  let score = 0;
  if (basis.dayElement && profile.elementKeys.includes(basis.dayElement)) score += 7;
  if (basis.monthElement && profile.elementKeys.includes(basis.monthElement)) score += 4;
  if (basis.strongestElement && profile.elementKeys.includes(basis.strongestElement)) score += 2;
  if (basis.weakestElement && profile.supportElements.includes(basis.weakestElement)) score += 6;
  if (basis.dominantTenGod && profile.tenGodKeys.includes(basis.dominantTenGod)) score += 3;
  if (stageKey && profile.stageKeys.includes(stageKey)) score += 2;
  return score;
}

function decorateGuardianData(data: AnimalDestinyData): AnimalDestinyData {
  const guardian = GUARDIAN_ANIMAL_PROFILES[data.id];
  if (!guardian) return data;

  return {
    ...data,
    animalName: guardian.name,
    titleLine: `내 사주 가디언은 ${guardian.name}`,
    subtitleLine: guardian.oneLine,
    keywords: guardian.keywords,
    palette: {
      primary: guardian.palette.primary,
      secondary: guardian.palette.secondary,
      accent: guardian.palette.accent,
      background: guardian.palette.background,
    },
    symbolItems: [guardian.animal, ...guardian.keywords],
    profile: {
      ...data.profile,
      animalName: guardian.name,
      title: guardian.guardianType,
      subtitle: guardian.oneLine,
      keywords: guardian.keywords,
      colors: {
        primary: guardian.palette.primary,
        secondary: guardian.palette.secondary,
        accent: guardian.palette.accent,
        background: guardian.palette.background,
      },
      symbolItems: [guardian.assetKey, guardian.animal, guardian.guardianType],
      personality: {
        ...data.profile.personality,
        summary: guardian.intro,
        strengths: guardian.keywords,
        weaknesses: guardian.cautionKeywords,
        hiddenPattern: guardian.memeLines[0],
        advice: guardian.power,
        paragraphs: [guardian.intro, guardian.power, guardian.warning],
      },
      daily: {
        ...data.profile.daily,
        message: guardian.todayMessage,
        luckyAction: guardian.luckyAction,
        caution: guardian.warning,
      },
    },
    animal_ko: guardian.name,
    animal_en: guardian.assetKey,
    title: guardian.guardianType,
    short_copy: guardian.oneLine,
    description: [guardian.intro, guardian.power, guardian.warning],
    personality: {
      ...data.personality,
      summary: guardian.intro,
      strengths: guardian.keywords,
      weaknesses: guardian.cautionKeywords,
      hidden_side: guardian.memeLines[0],
      stress_behavior: guardian.warning,
      growth_direction: guardian.power,
    },
    love: {
      ...data.love,
      style: `${guardian.guardianType}답게 감정의 속도보다 안전한 타이밍을 먼저 봅니다.`,
      attraction_point: guardian.oneLine,
      weakness_in_love: guardian.warning,
      advice: guardian.todayMessage,
    },
    career: {
      ...data.career,
      talent: guardian.keywords.slice(0, 2).join(" · "),
      work_style: guardian.power,
      money_style: guardian.name === "복돼지 가디언" ? "기회와 실속을 빠르게 감지하는 현실형 머니 감각" : data.career.money_style,
      advice: guardian.luckyAction,
    },
    wealth: {
      ...data.wealth,
      spending_style: guardian.name === "복돼지 가디언" ? "좋아하는 것에는 확실히 쓰지만 손익 계산도 빠른 편입니다." : data.wealth.spending_style,
      saving_style: guardian.luckyAction,
    },
    human_relations: {
      ...data.human_relations,
      first_impression: guardian.oneLine,
      social_relations: guardian.intro,
      connection_traits: `${guardian.goodMatches.map((id) => GUARDIAN_ANIMAL_PROFILES[id].name).join(", ")} 계열의 기운`,
    },
    today: {
      ...data.today,
      caution: guardian.cautionKeywords.join(" · "),
      action: guardian.luckyAction,
      lucky_behavior: guardian.luckyAction,
      emotion_management: guardian.warning,
      support_message: guardian.todayMessage,
    },
    luck_essentials: {
      ...data.luck_essentials,
      item: guardian.symbol,
      color: guardian.palette.accent,
      place: "달빛이 닿는 조용한 자리",
    },
    tamagotchi: {
      ...data.tamagotchi,
      growth_message: guardian.power,
      care_tip: guardian.todayMessage,
      mood_when_happy: `${guardian.name}의 수호력이 반짝입니다. ${guardian.luckyAction}`,
      mood_when_tired: guardian.warning,
    },
    share_card: {
      ...data.share_card,
      badge: "사주 가디언",
      headline: `내 사주 가디언은 ${guardian.name}`,
      quote: guardian.shareLine,
      hashtags: ["#사주가디언", "#수호동물", `#${guardian.name.replace(/\s+/g, "")}`],
    },
  };
}

export function getGuardianAnimalProfile(animalId: AnimalId | null | undefined): GuardianAnimalProfile | null {
  if (!animalId) return null;
  return GUARDIAN_ANIMAL_PROFILES[animalId] || null;
}

export function formatGuardianBasisLine(basis: GuardianSajuBasis) {
  const dayLine = basis.dayStem && basis.dayElement
    ? `일간 ${basis.dayStem}은 ${ELEMENT_LABEL[basis.dayElement]} 기운으로, 기본 성향을 ${ELEMENT_STYLE[basis.dayElement]} 쪽으로 이끕니다.`
    : "일간 정보가 부족해 기본 성향은 보조 계산값으로 읽었습니다.";
  const monthLine = basis.monthBranch && basis.monthElement
    ? `월지 ${basis.monthBranch}은 사회적 생존 방식에서 ${ELEMENT_LABEL[basis.monthElement]} 기운을 강하게 드러냅니다.`
    : "월지 정보가 부족해 사회적 방식은 연·일 중심으로 보완했습니다.";
  const weakLine = basis.weakestElement
    ? `부족한 오행은 ${ELEMENT_LABEL[basis.weakestElement]}이며, 필요한 수호 에너지는 ${ELEMENT_STYLE[basis.weakestElement]}입니다.`
    : "오행 균형 정보가 부족해 필요한 수호 에너지는 보조 해석으로 계산했습니다.";
  const tenGodLine = basis.dominantTenGod
    ? `십성 흐름은 ${TEN_GOD_LABEL[basis.dominantTenGod]} 쪽이 두드러져 ${TEN_GOD_STYLE[basis.dominantTenGod]} 성향을 더합니다.`
    : "십성 흐름은 큰 쏠림 없이 균형형으로 보았습니다.";

  return { dayLine, monthLine, weakLine, tenGodLine };
}

export function getElementLabel(element: ElementKey | null | undefined) {
  return element ? ELEMENT_LABEL[element] : "보조";
}

export function getTenGodLabel(tenGod: TenGodKey | null | undefined) {
  return tenGod ? TEN_GOD_LABEL[tenGod] : "균형";
}

export function getAnimalByStage(stage: TwelveStage | null | undefined): AnimalId | null {
  if (!stage) return null;
  return STAGE_TO_ANIMAL[stage] || null;
}

export function getAnimalBySajuResult(sajuResult: SajuEngineResult): {
  primaryStage: TwelveStage | null;
  animalId: AnimalId | null;
} {
  const primaryStage = getPrimaryAnimalStage(sajuResult);
  const stageKey = primaryStage ? STAGE_LABEL_TO_KEY[primaryStage] : null;
  const basis = analyzeGuardianSaju(sajuResult);
  const fallbackAnimalId = getAnimalByStage(primaryStage);
  const candidates = Object.values(GUARDIAN_ANIMAL_PROFILES)
    .map((profile) => ({
      id: profile.id,
      score: scoreGuardianProfile(profile, basis, stageKey),
    }))
    .sort((left, right) => right.score - left.score);

  return {
    primaryStage,
    animalId: candidates[0]?.score > 0 ? candidates[0].id : fallbackAnimalId,
  };
}

export function getAnimalDisplayData(animalId: AnimalId | null | undefined): AnimalDestinyData | null {
  if (!animalId) return null;
  const data = ANIMAL_DESTINY_DATA[animalId] || null;
  return data ? decorateGuardianData(data) : null;
}

export function getAnimalCompatibility(animalId: AnimalId | null | undefined) {
  const data = getAnimalDisplayData(animalId);
  return data ? data.compatibility : null;
}

export function calculateAnimalCompatibility(myAnimalId: AnimalId, partnerAnimalId: AnimalId): AnimalCompatibilityResult {
  const my = getAnimalDisplayData(myAnimalId) || ANIMAL_DESTINY_DATA[myAnimalId];
  const partner = getAnimalDisplayData(partnerAnimalId) || ANIMAL_DESTINY_DATA[partnerAnimalId];

  const myStageKey = STAGE_LABEL_TO_KEY[my.stageLabel || my.saju_stage];
  const partnerStageKey = STAGE_LABEL_TO_KEY[partner.stageLabel || partner.saju_stage];

  if (!myStageKey || !partnerStageKey) {
    return {
      score: 66,
      relationType: "좋음",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 대화를 자주 할수록 안정감이 올라갑니다.`,
      goodPoints: ["따뜻한 공감", "역할 보완"],
      clashPoints: ["속도 차이", "표현 온도 차이"],
      tips: ["주 1회 감정 점검 대화를 해보세요."],
      breakdown: buildDefaultBreakdown(my.animal_ko, partner.animal_ko, "좋음"),
    };
  }

  const distance = stageDistance(myStageKey, partnerStageKey);
  const relation = relationByDistance(distance);
  const score = relation.baseScore;
  const myGuardian = getGuardianAnimalProfile(myAnimalId);
  const partnerGuardian = getGuardianAnimalProfile(partnerAnimalId);
  const myKeywords = myGuardian?.keywords || my.keywords || [];
  const partnerKeywords = partnerGuardian?.keywords || partner.keywords || [];

  return {
    score,
    relationType: relation.relationType,
    summary: relationSummary(my.animal_ko, partner.animal_ko, distance),
    goodPoints: [
      `${myKeywords[0] || "안정"}과 ${partnerKeywords[0] || "균형"}의 상호 보완`,
      `${myKeywords[1] || "배려"}을(를) 통해 신뢰를 쌓는 흐름`,
      `${partnerKeywords[1] || "실행"}이(가) 관계의 추진력을 높임`,
    ],
    clashPoints: [
      "중요한 결정을 내릴 때 속도 차이가 발생할 수 있음",
      "감정 표현 방식이 달라 오해가 생길 수 있음",
      "서로의 휴식 방식이 달라 피로 누적 가능성",
    ],
    tips: [
      `${STAGE_KEY_TO_LABEL[myStageKey]}-${STAGE_KEY_TO_LABEL[partnerStageKey]} 조합은 경계와 기대치를 먼저 합의할수록 장기 안정성이 높아집니다.`,
      "갈등이 생기면 감정 해석보다 사실 확인을 먼저 해보세요.",
      "한 달에 한 번, 관계 목표를 함께 업데이트해 보세요.",
    ],
    breakdown: buildDefaultBreakdown(my.animal_ko, partner.animal_ko, relation.relationType),
  };
}
