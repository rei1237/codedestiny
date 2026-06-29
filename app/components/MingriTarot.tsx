"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readCurrentDestinyProfile, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { normalizeDuplicatedSubjectParticles } from "@/lib/tarot/myeongri-tarot-text-utils.mjs";

type TarotMode = "one" | "three";

type TarotCategory =
  | "love"
  | "reunion"
  | "friendship"
  | "wealth"
  | "loss"
  | "contract"
  | "travel"
  | "creative"
  | "health";

type DrawnCard = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: string;
};

type ReadingPayload = Record<string, string | string[]>;

type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

type QuestionDomain = "wealthBusiness" | "love" | "relationship" | "career" | "health" | "movement" | "creative";

type CardTone = "caution" | "positive" | "unclear" | "binding" | "turning" | "neutral";

type CardMeaning = {
  keywords: string[];
  core: string;
  reality: string;
  advice: string;
  tone: CardTone;
  bannedAdvice?: string[];
};

type CardMeaningPair = {
  upright: CardMeaning;
  reversed: CardMeaning;
};

type TenGodDomainReading = {
  scene: string;
  risk: string;
  advice: string;
};

type TenGodReading = {
  core: string;
  domains: Record<QuestionDomain, TenGodDomainReading>;
};

type DomainAdvice = {
  label: string;
  anchor: string;
  judgment: string;
  reality: string;
  actions: string[];
  oneLine: string;
};

type MingriSajuContext = {
  hasProfile: boolean;
  hasSajuSignals: boolean;
  name: string;
  dayMaster: string;
  strongElements: string;
  weakElements: string;
  yongshin: string;
  gisin: string;
  tenGod: TenGod | "";
};

type MingriTarotProps = {
  initialMode?: TarotMode;
  initialCategory?: TarotCategory;
  lockCategory?: boolean;
  heading?: string;
  subtitle?: string;
};

const MINGRI_TAROT_TEXT_TRANSLATIONS = {
  ko: {
    "mingriTarot.001": "연애/애정",
    "mingriTarot.002": "재회운",
    "mingriTarot.003": "우정/관계",
    "mingriTarot.004": "사업운",
    "mingriTarot.005": "재물운",
    "mingriTarot.006": "계약/문서",
    "mingriTarot.007": "이동/해외",
    "mingriTarot.008": "창의/예술",
    "mingriTarot.009": "건강/휴식",
    "mingriTarot.010": "재물/사업",
    "mingriTarot.011": "연애",
    "mingriTarot.012": "관계",
    "mingriTarot.013": "계약/일",
    "mingriTarot.014": "건강/컨디션",
    "mingriTarot.015": "리딩 모드",
    "mingriTarot.016": "원카드",
    "mingriTarot.017": "3카드",
    "mingriTarot.018": "질문의 문",
  },
} as const;

function mingriTarotText(key: keyof typeof MINGRI_TAROT_TEXT_TRANSLATIONS.ko) {
  return MINGRI_TAROT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
const CATEGORY_OPTIONS: Array<{ value: TarotCategory; label: string }> = [
  { value: "love", label: mingriTarotText("mingriTarot.001") },
  { value: "reunion", label: mingriTarotText("mingriTarot.002") },
  { value: "friendship", label: mingriTarotText("mingriTarot.003") },
  { value: "wealth", label: mingriTarotText("mingriTarot.004") },
  { value: "loss", label: mingriTarotText("mingriTarot.005") },
  { value: "contract", label: mingriTarotText("mingriTarot.006") },
  { value: "travel", label: mingriTarotText("mingriTarot.007") },
  { value: "creative", label: mingriTarotText("mingriTarot.008") },
  { value: "health", label: mingriTarotText("mingriTarot.009") },
];

function spreadTypeForMode(mode: TarotMode) {
  return mode === "three" ? "three_card_past_present_future" : "one_card";
}

const ONE_CARD_POSITION = ["현재의 핵심"];
const THREE_CARD_POSITIONS = ["과거", "현재", "가까운 미래"];
const READING_CHAR_DELAY_MS = 75;

const EMPTY_SAJU_CONTEXT: MingriSajuContext = {
  hasProfile: false,
  hasSajuSignals: false,
  name: "",
  dayMaster: "",
  strongElements: "",
  weakElements: "",
  yongshin: "",
  gisin: "",
  tenGod: "",
};

const DOMAIN_BY_CATEGORY: Record<TarotCategory, QuestionDomain> = {
  love: "love",
  reunion: "love",
  friendship: "relationship",
  wealth: "wealthBusiness",
  loss: "wealthBusiness",
  contract: "career",
  travel: "movement",
  creative: "creative",
  health: "health",
};

const DOMAIN_ADVICE: Record<QuestionDomain, DomainAdvice> = {
  wealthBusiness: {
    label: mingriTarotText("mingriTarot.010"),
    anchor: "재물/사업",
    judgment: "수익의 크기보다 비용 구조와 회수 시점을 먼저 살필 때입니다.",
    reality: "계약서, 환불 조건, 정산일, 광고비, 고정비, 지분, 동업 조건이 실제 변수가 됩니다.",
    actions: [
      "회수 시점이 흐린 투자는 오늘 보류하세요.",
      "누가 얼마를 부담하고 언제 정산되는지 숫자로 다시 적으세요.",
      "경쟁자 대응보다 내 손익분기점과 고정비를 먼저 계산하세요.",
    ],
    oneLine: "돈이 새는 구멍을 먼저 막을 때 다음 판이 단단해집니다.",
  },
  love: {
    label: mingriTarotText("mingriTarot.011"),
    anchor: "연애",
    judgment: "상대의 말보다 반복되는 행동 패턴을 기준으로 삼을 때입니다.",
    reality: "자존심 싸움, 비교심리, 숨은 감정, 집착, 회피가 관계의 온도를 바꿉니다.",
    actions: [
      "오늘은 답장을 재촉하기보다 상대가 실제로 지킨 약속을 확인하세요.",
      "서운함과 요구를 한 문장씩 분리한 뒤 말하세요.",
      "확신을 얻으려는 질문보다 관계에서 필요한 경계를 먼저 정하세요.",
    ],
    oneLine: "사랑은 말의 온도보다 반복된 행동에서 더 선명해집니다.",
  },
  relationship: {
    label: mingriTarotText("mingriTarot.012"),
    anchor: "관계",
    judgment: "감정의 승패보다 거리와 역할을 다시 맞출 때입니다.",
    reality: "비교, 소유욕, 침묵, 책임 회피가 관계 안의 균열로 번질 수 있습니다.",
    actions: [
      "누가 맡을 일인지, 어디까지 도울 수 있는지 선을 적어 두세요.",
      "상대의 속마음을 단정하기보다 최근 행동 세 가지를 근거로 삼으세요.",
      "오늘 대화는 결론보다 오해를 줄이는 순서로 여는 편이 낫습니다.",
    ],
    oneLine: "관계의 힘은 가까움보다 지켜지는 선에서 살아납니다.",
  },
  career: {
    label: mingriTarotText("mingriTarot.013"),
    anchor: "계약/일",
    judgment: "밀어붙일지 고쳐 세울지부터 갈라야 합니다.",
    reality: "상사, 동료, 경쟁자, 계약, 평가, 일정 압박이 실제 사건의 형태로 드러납니다.",
    actions: [
      "업무 범위, 책임자, 마감일, 평가 기준을 문서로 남기세요.",
      "지금 당장 승부를 걸기보다 조건이 불리한 부분을 먼저 수정하세요.",
      "말로 합의한 내용은 메시지나 계약 항목으로 다시 확인하세요.",
    ],
    oneLine: "일의 흐름은 속도보다 책임의 위치가 분명할 때 안정됩니다.",
  },
  health: {
    label: mingriTarotText("mingriTarot.014"),
    anchor: "건강/컨디션",
    judgment: "몸이 보내는 긴장 신호를 가볍게 넘기지 않을 때입니다.",
    reality: "과로, 수면 부족, 생활 리듬의 흐트러짐, 스트레스 반응이 컨디션을 흔들 수 있습니다.",
    actions: [
      "오늘은 무리한 일정 하나를 줄이고 수면 시간을 먼저 확보하세요.",
      "통증이나 불편감이 이어지면 전문가와 상의할 여지를 남겨 두세요.",
      "카페인, 야식, 늦은 업무처럼 회복을 밀어내는 습관을 하나만 줄이세요.",
    ],
    oneLine: "회복은 큰 결심보다 몸의 작은 신호를 늦지 않게 돌보는 데서 시작됩니다.",
  },
  movement: {
    label: mingriTarotText("mingriTarot.007"),
    anchor: "이동/해외",
    judgment: "새 길을 열기 전에 일정과 비용의 빈틈을 먼저 확인할 때입니다.",
    reality: "예약, 환불, 서류, 이동 시간, 현지 변수, 체력 배분이 흐름을 가릅니다.",
    actions: [
      "출발 전 필요한 문서와 취소 조건을 다시 확인하세요.",
      "이동 비용과 예비 시간을 따로 잡아 급한 변경에 대비하세요.",
      "낯선 제안은 즉흥 승낙보다 출처와 조건을 먼저 살피세요.",
    ],
    oneLine: "멀리 가는 길일수록 작은 조건을 또렷하게 챙겨야 합니다.",
  },
  creative: {
    label: mingriTarotText("mingriTarot.008"),
    anchor: "창의/예술",
    judgment: "영감보다 완성 구조와 공개 시점을 함께 다듬을 때입니다.",
    reality: "브랜딩, 표현 방식, 협업, 마감, 저작권, 피드백이 작품의 힘을 좌우합니다.",
    actions: [
      "오늘은 아이디어를 늘리기보다 완성 기준 세 가지를 적으세요.",
      "공개 전 저작권, 협업 범위, 수정 횟수를 확인하세요.",
      "튀는 표현은 살리되 오해를 부를 문장은 한 번 더 다듬으세요.",
    ],
    oneLine: "영감은 형태를 얻을 때 오래 남는 힘이 됩니다.",
  },
};

const CARD_MEANING_OVERRIDES: Record<string, CardMeaningPair> = {
  M10: {
    upright: {
      keywords: ["전환점", "흐름 변화", "기회", "타이밍"],
      core: "멈춰 있던 판이 다른 리듬으로 돌아서는 카드입니다.",
      reality: "기회는 갑자기 커지지만 준비되지 않은 돈과 일정은 쉽게 흔들립니다.",
      advice: "타이밍을 붙잡되 조건, 회수 시점, 책임 범위를 먼저 확인하세요.",
      tone: "turning",
    },
    reversed: {
      keywords: ["지연", "엇갈린 타이밍", "반복", "흐름 저하"],
      core: "기회처럼 보이는 장면이 아직 제 속도를 얻지 못한 카드입니다.",
      reality: "서두르면 같은 문제가 되풀이되거나 약속이 밀릴 수 있습니다.",
      advice: "일정과 자금 여유를 다시 잡고, 바뀌지 않는 조건을 먼저 분리하세요.",
      tone: "unclear",
    },
  },
  M11: {
    upright: {
      keywords: ["공정", "계약", "판단", "책임"],
      core: "감정보다 기준과 문서가 앞서는 카드입니다.",
      reality: "구두 합의보다 조항, 증빙, 책임 소재가 현실을 결정합니다.",
      advice: "좋고 싫음보다 조건의 균형과 불리한 문구를 먼저 확인하세요.",
      tone: "neutral",
    },
    reversed: {
      keywords: ["불균형", "불공정", "책임 회피", "판단 오류"],
      core: "기준이 흐려지거나 한쪽에 불리한 조건이 숨어 있는 카드입니다.",
      reality: "감정으로 넘긴 항목이 나중에 책임 문제로 돌아올 수 있습니다.",
      advice: "서명, 승인, 확답은 근거 자료를 확인한 뒤로 미루세요.",
      tone: "caution",
    },
  },
  M15: {
    upright: {
      keywords: ["집착", "유혹", "계약", "욕망", "묶인 구조"],
      core: "매력적인 제안 뒤에 벗어나기 어려운 조건이 붙는 카드입니다.",
      reality: "큰돈, 빠른 수익, 강한 욕망이 판단을 좁히고 계약을 무겁게 만들 수 있습니다.",
      advice: "수익률보다 해지 조건, 담보, 위약금, 의존 구조를 먼저 보세요.",
      tone: "binding",
      bannedAdvice: ["무리한 확장", "큰돈을 바로 밀어붙이기", "감정적 계약"],
    },
    reversed: {
      keywords: ["집착 완화", "속박 인식", "탈출 준비", "유혹 거리두기"],
      core: "묶인 구조를 알아차리고 빠져나갈 틈을 찾는 카드입니다.",
      reality: "욕망의 압박은 남아 있지만 끊어낼 조건이 조금씩 보입니다.",
      advice: "한 번에 끊기보다 비용, 관계, 일정의 의존도를 단계적으로 낮추세요.",
      tone: "caution",
    },
  },
  M16: {
    upright: {
      keywords: ["갑작스러운 붕괴", "문제 노출", "구조 재점검", "충격", "기반 해체"],
      core: "이미 약해진 기반이 갑자기 드러나는 카드입니다.",
      reality: "숨긴 문제, 불리한 계약, 비용 누수, 사람 사이의 균열이 한꺼번에 표면으로 올라올 수 있습니다.",
      advice: "확장보다 구조 점검을 먼저 두고, 문제를 숨기지 말고 드러내야 합니다.",
      tone: "caution",
      bannedAdvice: ["과감히 확장", "크게 밀어붙이기", "낙관적으로 공개", "공개와 실행"],
    },
    reversed: {
      keywords: ["붕괴 회피", "문제 은폐", "변화 지연", "조용한 균열", "늦춰진 정리"],
      core: "무너짐이 겉으로 터지기 전 조용히 금이 가는 카드입니다.",
      reality: "겉으로는 유지되는 듯해도 비용, 관계, 일정의 균열이 뒤로 밀려 있을 수 있습니다.",
      advice: "당장 터지지 않았다는 이유로 넘기지 말고 작은 이상 징후를 기록하세요.",
      tone: "caution",
      bannedAdvice: ["과감히 확장", "크게 밀어붙이기", "문제를 덮기"],
    },
  },
  M18: {
    upright: {
      keywords: ["불안", "착각", "숨은 감정", "모호함", "직감"],
      core: "감정과 사실이 섞여 판단이 흐려지는 카드입니다.",
      reality: "말하지 못한 마음, 불확실한 정보, 혼자 키운 상상이 관계나 선택을 흔들 수 있습니다.",
      advice: "직감은 참고하되 확인된 행동과 기록을 따로 놓고 판단하세요.",
      tone: "unclear",
    },
    reversed: {
      keywords: ["혼란 완화", "진실 접근", "불안 정리", "착각 해소"],
      core: "흐렸던 감정이 조금씩 가라앉고 실체가 드러나는 카드입니다.",
      reality: "오해가 풀릴 수 있지만 아직 전부를 단정하기에는 이릅니다.",
      advice: "확실해진 사실부터 정리하고, 남은 불안은 대화의 순서로 낮추세요.",
      tone: "neutral",
    },
  },
  M19: {
    upright: {
      keywords: ["회복", "공개", "성취", "활력", "명확성"],
      core: "가려졌던 것이 밝아지고 회복력이 살아나는 카드입니다.",
      reality: "마음과 행동이 맞아떨어질수록 표현, 성취, 관계의 온도가 선명해집니다.",
      advice: "숨기기보다 건강한 방식으로 드러내고, 약속 가능한 행동을 작게 이어가세요.",
      tone: "positive",
    },
    reversed: {
      keywords: ["지연된 회복", "과한 낙관", "체력 저하", "표현 부족"],
      core: "빛은 있지만 과한 기대나 피로가 선명함을 늦추는 카드입니다.",
      reality: "좋은 흐름을 느끼더라도 일정, 컨디션, 상대의 속도가 아직 맞지 않을 수 있습니다.",
      advice: "무리한 약속보다 회복 가능한 범위 안에서 표현을 이어가세요.",
      tone: "neutral",
    },
  },
  S10: {
    upright: {
      keywords: ["종결", "소진", "배신감", "한계", "더 버틸 수 없는 구조"],
      core: "생각과 긴장이 한계에 닿아 더 버티는 방식이 끝나는 카드입니다.",
      reality: "억지로 이어가면 말, 계약, 일정, 관계의 상처가 더 깊어질 수 있습니다.",
      advice: "무리한 재시작보다 중단, 손실 확정, 회복 시간을 먼저 확보하세요.",
      tone: "caution",
      bannedAdvice: ["다시 크게 밀어붙이기", "무리한 재도전", "버티면 해결"],
    },
    reversed: {
      keywords: ["회복 시작", "상처 정리", "끝난 패턴 인식", "재기 전 정돈"],
      core: "최악의 고비는 지나가도 몸과 마음이 아직 회복을 요구하는 카드입니다.",
      reality: "바로 다음 판으로 뛰어들면 같은 피로와 판단 오류가 반복될 수 있습니다.",
      advice: "끝난 일의 책임 범위를 정리하고, 회복 가능한 일정부터 다시 세우세요.",
      tone: "caution",
    },
  },
  P05: {
    upright: {
      keywords: ["결핍", "재정 압박", "소외", "지원 부족", "현실 기반 흔들림"],
      core: "돈, 몸, 관계의 부족함이 현실 압박으로 떠오르는 카드입니다.",
      reality: "없는 자원을 있는 것처럼 계산하거나 혼자 버티면 손실과 고립감이 커질 수 있습니다.",
      advice: "큰 수익 기대보다 비용 축소, 도움 요청, 회수 일정, 생활 기반 점검을 먼저 하세요.",
      tone: "caution",
      bannedAdvice: ["과감한 투자", "큰돈을 바로 넣기", "낙관적 확장"],
    },
    reversed: {
      keywords: ["도움의 발견", "압박 완화", "회복 실마리", "지원 연결"],
      core: "부족한 자원을 인정한 뒤 도움과 회복의 실마리를 찾는 카드입니다.",
      reality: "상황이 조금 풀려도 비용과 체력의 바닥은 아직 조심해야 합니다.",
      advice: "작은 지원선부터 연결하고, 고정비와 회수 시점을 다시 적으세요.",
      tone: "caution",
    },
  },
};

const CARD_TEN_GOD_OVERRIDES: Record<string, TenGod> = {
  M00: "비견",
  M01: "상관",
  M02: "정인",
  M03: "식신",
  M04: "정관",
  M05: "정인",
  M06: "정재",
  M07: "편관",
  M08: "비견",
  M09: "편인",
  M10: "편재",
  M11: "정관",
  M12: "편인",
  M13: "편관",
  M14: "정재",
  M15: "편재",
  M16: "겁재",
  M17: "정인",
  M18: "편인",
  M19: "식신",
  M20: "정관",
  M21: "정재",
  S10: "편관",
  P05: "정재",
};

const SUIT_TEN_GOD: Record<string, TenGod> = {
  W: "상관",
  C: "식신",
  S: "편관",
  P: "정재",
};

const TEN_GOD_READING: Record<TenGod, TenGodReading> = {
  비견: {
    core: "자기주도, 독립성, 동료, 자존심, 같은 위치의 경쟁이 강해지는 별입니다.",
    domains: {
      wealthBusiness: { scene: "혼자 결정하려는 힘이 커지고 동등한 파트너와의 경쟁 구도가 선명해집니다.", risk: "내 기준만 앞세우면 공동 비용과 역할 분담에서 마찰이 생깁니다.", advice: "독립 판단은 살리되 지출과 책임은 숫자로 나누세요." },
      love: { scene: "내 감정의 기준이 강해져 상대에게 맞추기보다 내 속도를 지키려 합니다.", risk: "자존심 싸움이 길어지면 사과할 타이밍을 놓칠 수 있습니다.", advice: "원하는 것과 양보 가능한 것을 먼저 나누세요." },
      relationship: { scene: "동료, 친구, 가족 사이에서 동등한 대우를 바라게 됩니다.", risk: "비교심이 올라오면 작은 말도 경쟁으로 받아들이기 쉽습니다.", advice: "도움과 간섭의 경계를 분명히 하세요." },
      career: { scene: "주도권을 직접 잡고 싶은 마음이 커집니다.", risk: "협업 규칙을 무시하면 평가나 일정에서 부담이 돌아옵니다.", advice: "맡을 범위와 넘길 범위를 문서로 남기세요." },
      health: { scene: "버티는 힘은 있지만 쉬어야 할 신호를 자존심으로 누를 수 있습니다.", risk: "무리한 자기증명이 피로를 키웁니다.", advice: "오늘은 경쟁보다 회복 기준을 정하세요." },
      movement: { scene: "혼자 움직이는 선택에 힘이 실립니다.", risk: "동행자와 비용, 일정 기준이 다르면 갈등이 생깁니다.", advice: "개별 일정과 공동 일정을 분리하세요." },
      creative: { scene: "자기 색을 밀고 나가려는 힘이 살아납니다.", risk: "피드백을 경쟁으로 받아들이면 완성도가 늦어집니다.", advice: "핵심 콘셉트는 지키되 수정 기준은 열어 두세요." },
    },
  },
  겁재: {
    core: "경쟁자, 분배, 손재, 동업 리스크, 공동재정, 지분, 강한 생존 본능이 움직이는 별입니다.",
    domains: {
      wealthBusiness: { scene: "돈과 권한이 나뉘는 자리에서 경쟁, 지분, 정산 문제가 떠오릅니다.", risk: "비용 누수, 광고비 과소비, 회수 지연, 공동재정의 손실이 생기기 쉽습니다.", advice: "수익 확대보다 계약 조건, 지분 배분, 정산일을 먼저 확인하세요." },
      love: { scene: "삼각 구도, 비교심리, 소유욕, 자존심 싸움이 강하게 떠오릅니다.", risk: "상대를 이기려는 마음이 관계의 신뢰를 깎을 수 있습니다.", advice: "경쟁심인지 진짜 문제인지 먼저 구분하세요." },
      relationship: { scene: "가까운 사람 사이에서도 주도권과 몫을 두고 민감해집니다.", risk: "누가 더 얻고 덜 주는지 따지다 감정이 거칠어질 수 있습니다.", advice: "도움, 돈, 시간의 분담 기준을 분명히 하세요." },
      career: { scene: "경쟁 포지션, 독립 욕구, 팀 내 주도권이 강하게 움직입니다.", risk: "성과를 빼앗길까 봐 무리하면 동료와 충돌할 수 있습니다.", advice: "내 역할의 증거와 협업 범위를 남겨 두세요." },
      health: { scene: "버티려는 생존 감각이 강해져 피로를 밀어낼 수 있습니다.", risk: "긴장과 과로가 누적되어 회복 리듬이 끊길 수 있습니다.", advice: "승부를 미루고 몸의 소모를 줄이는 일정을 잡으세요." },
      movement: { scene: "이동 과정에서 비용 분담, 동행자 선택, 경쟁 일정이 변수가 됩니다.", risk: "급한 예약과 공동 비용이 갈등으로 번질 수 있습니다.", advice: "환불 조건과 부담 비율을 출발 전에 확인하세요." },
      creative: { scene: "비슷한 작업자와의 경쟁, 팀 프로젝트의 지분 문제가 커집니다.", risk: "성과 배분이 흐리면 작품보다 갈등이 앞설 수 있습니다.", advice: "기여도, 저작권, 공개 순서를 미리 정하세요." },
    },
  },
  식신: {
    core: "생산성, 표현, 결과물, 안정적 수익화, 꾸준한 창작을 살리는 별입니다.",
    domains: {
      wealthBusiness: { scene: "꾸준히 만든 결과물이 수익 구조로 이어질 가능성이 살아납니다.", risk: "성과가 좋아도 관리가 느슨하면 작은 지출이 쌓입니다.", advice: "반복 가능한 상품, 일정, 정산 루틴을 먼저 만드세요." },
      love: { scene: "따뜻한 표현과 편안한 행동이 관계를 부드럽게 만듭니다.", risk: "좋은 마음만으로 상대의 불안을 모두 덮으려 하면 지칩니다.", advice: "말보다 꾸준히 지킬 수 있는 애정 표현을 선택하세요." },
      relationship: { scene: "부드러운 말과 돌봄이 관계의 긴장을 낮춥니다.", risk: "상대에게 맞추느라 내 필요를 미루기 쉽습니다.", advice: "돕는 범위와 쉬는 시간을 같이 정하세요." },
      career: { scene: "성과물, 포트폴리오, 루틴형 업무에서 힘이 납니다.", risk: "완성도에만 머물면 평가와 공개 시점이 늦어질 수 있습니다.", advice: "오늘 완성할 수 있는 결과물 하나를 정하세요." },
      health: { scene: "회복 루틴과 식사, 수면의 안정감이 중요해집니다.", risk: "편안함에 기대어 활동량이 줄면 몸이 무거워질 수 있습니다.", advice: "부담 없는 반복 습관 하나를 고정하세요." },
      movement: { scene: "무리 없는 일정과 편안한 동선에서 만족이 커집니다.", risk: "즐거움에 치우쳐 비용과 시간을 놓칠 수 있습니다.", advice: "예산과 휴식 시간을 일정표에 같이 넣으세요." },
      creative: { scene: "꾸준히 만든 작업물이 사람에게 닿기 좋은 흐름입니다.", risk: "기분이 좋아도 마감 구조가 없으면 흩어집니다.", advice: "작은 공개와 피드백 루틴을 잡으세요." },
    },
  },
  상관: {
    core: "파격, 말, 브랜딩, 반항, 기존 질서 돌파, 구설 리스크가 함께 움직이는 별입니다.",
    domains: {
      wealthBusiness: { scene: "튀는 마케팅과 빠른 제안이 눈길을 끕니다.", risk: "말이 앞서면 환불, 약속, 광고 문구가 문제를 부를 수 있습니다.", advice: "브랜딩은 살리되 계약 문구와 고객 응대를 정교하게 다듬으세요." },
      love: { scene: "솔직한 말이 관계를 흔들거나 풀어낼 수 있습니다.", risk: "상처 주는 표현이 오래 남을 수 있습니다.", advice: "비판보다 원하는 행동을 구체적으로 말하세요." },
      relationship: { scene: "답답한 질서를 깨고 싶은 마음이 강해집니다.", risk: "농담이나 직설이 오해로 번질 수 있습니다.", advice: "불만을 말하기 전 목적과 선을 정하세요." },
      career: { scene: "새 방식, 제안, 브랜딩, 발표에 힘이 실립니다.", risk: "규칙을 가볍게 보면 상사나 제도와 충돌합니다.", advice: "파격을 문서와 근거로 받치세요." },
      health: { scene: "쌓인 긴장이 말과 행동으로 튀어나오기 쉽습니다.", risk: "흥분, 수면 부족, 과한 자극이 컨디션을 흔듭니다.", advice: "자극적인 일정과 늦은 대화를 줄이세요." },
      movement: { scene: "즉흥 이동과 새로운 경험에 끌립니다.", risk: "규정, 서류, 시간표를 놓치면 일정이 틀어집니다.", advice: "새로운 선택일수록 기본 조건을 다시 확인하세요." },
      creative: { scene: "강한 콘셉트와 독특한 표현이 살아납니다.", risk: "튀는 문장이 불필요한 논란을 부를 수 있습니다.", advice: "날카로움은 남기되 오해될 문장은 덜어내세요." },
    },
  },
  편재: {
    core: "큰돈, 사업성, 투자, 외부 기회, 유동성, 시장 감각이 움직이는 별입니다.",
    domains: {
      wealthBusiness: { scene: "외부 기회와 큰돈의 냄새가 강하게 들어옵니다.", risk: "유동성이 큰 만큼 회수 지연, 과투자, 계약 의존이 생길 수 있습니다.", advice: "시장성은 보되 현금흐름, 손절 기준, 해지 조건을 먼저 잡으세요." },
      love: { scene: "매력적인 사람이나 새로운 자극에 마음이 흔들릴 수 있습니다.", risk: "관계가 소비나 소유의 감각으로 기울면 피로해집니다.", advice: "끌림과 책임을 분리해 보세요." },
      relationship: { scene: "넓은 인맥과 외부 제안이 들어옵니다.", risk: "여기저기 맞추다 중요한 관계의 신뢰를 잃을 수 있습니다.", advice: "받을 제안과 거절할 제안을 기준으로 나누세요." },
      career: { scene: "사업성, 영업, 시장 기회, 외부 프로젝트가 떠오릅니다.", risk: "규모가 커 보이는 일일수록 책임과 비용도 커집니다.", advice: "수익 모델과 리스크 한도를 먼저 계산하세요." },
      health: { scene: "외부 일정과 욕심이 몸의 리듬을 흔들 수 있습니다.", risk: "무리한 약속과 과소비가 피로로 돌아옵니다.", advice: "오늘은 일정과 지출을 같이 줄이세요." },
      movement: { scene: "먼 곳의 기회, 출장, 이동 제안이 들어오기 쉽습니다.", risk: "비용과 보상이 맞지 않으면 체력만 소모됩니다.", advice: "이동의 목적과 회수 가치를 숫자로 보세요." },
      creative: { scene: "작품을 시장과 연결할 기회가 생깁니다.", risk: "팔리는 것만 좇으면 색이 흐려질 수 있습니다.", advice: "상업 조건과 창작 기준을 함께 세우세요." },
    },
  },
  정재: {
    core: "고정수입, 계산, 현실성, 관리, 안정적 축적을 다루는 별입니다.",
    domains: {
      wealthBusiness: { scene: "돈의 흐름을 안정적으로 관리하려는 힘이 강해집니다.", risk: "너무 보수적으로 잡으면 필요한 기회를 놓칠 수 있습니다.", advice: "수입, 지출, 보류 자금을 분리해 계산하세요." },
      love: { scene: "관계의 안정감과 신뢰를 확인하고 싶어집니다.", risk: "감정을 계산처럼 재면 상대가 답답해할 수 있습니다.", advice: "기준은 지키되 표현은 부드럽게 하세요." },
      relationship: { scene: "약속, 예의, 상호 책임이 중요해집니다.", risk: "원칙만 앞세우면 관계가 딱딱해집니다.", advice: "지켜야 할 기준과 넘어갈 일을 구분하세요." },
      career: { scene: "정해진 업무, 급여, 계약, 관리 체계가 중심에 옵니다.", risk: "변화가 필요한 순간에도 익숙한 방식만 고집할 수 있습니다.", advice: "안정은 지키되 개선할 항목을 하나 정하세요." },
      health: { scene: "규칙적인 생활과 관리 습관이 회복의 핵심입니다.", risk: "작은 불편을 참고 넘기면 누적될 수 있습니다.", advice: "수면, 식사, 운동 기록을 간단히 남기세요." },
      movement: { scene: "계획된 일정과 예산 안에서 움직일 때 안정됩니다.", risk: "예비 비용이 없으면 작은 변수에도 흔들립니다.", advice: "예약과 지출 내역을 한 번 더 확인하세요." },
      creative: { scene: "작업을 상품이나 결과물로 안정화하기 좋습니다.", risk: "새로움보다 안전함만 택하면 힘이 줄어듭니다.", advice: "완성 기준과 공개 일정을 함께 잡으세요." },
    },
  },
  편관: {
    core: "압박, 규칙, 위기 대응, 승부, 권위, 강제성이 강해지는 별입니다.",
    domains: {
      wealthBusiness: { scene: "압박성 비용, 규제, 경쟁, 기한 문제가 떠오릅니다.", risk: "급한 승부가 손실을 키울 수 있습니다.", advice: "위험 한도와 법적 조건을 먼저 확인하세요." },
      love: { scene: "관계 안에서 압박감과 불안이 커질 수 있습니다.", risk: "상대를 통제하려는 말이 갈등을 키웁니다.", advice: "요구보다 불안을 먼저 인정하세요." },
      relationship: { scene: "권위자, 강한 사람, 규칙이 관계를 누릅니다.", risk: "참다가 한 번에 터뜨리기 쉽습니다.", advice: "거절할 부분을 짧고 분명하게 말하세요." },
      career: { scene: "상사, 평가, 마감, 책임 압박이 강하게 작동합니다.", risk: "위기 대응에만 매달리면 장기 기준이 흐려집니다.", advice: "급한 일과 중요한 일을 나누세요." },
      health: { scene: "긴장, 스트레스, 과로 신호가 커질 수 있습니다.", risk: "몸의 경고를 의지로 누르면 회복이 늦어집니다.", advice: "무리한 운동이나 야근을 줄이세요." },
      movement: { scene: "규정, 심사, 통제된 일정이 변수가 됩니다.", risk: "서류 하나가 전체 일정을 막을 수 있습니다.", advice: "허가, 비자, 보험 조건을 확인하세요." },
      creative: { scene: "강한 주제와 승부성 있는 작업에 힘이 실립니다.", risk: "압박이 커지면 표현이 거칠어질 수 있습니다.", advice: "강도는 살리되 일정과 휴식을 분리하세요." },
    },
  },
  정관: {
    core: "질서, 신뢰, 계약, 책임, 공적 평가, 제도권을 다루는 별입니다.",
    domains: {
      wealthBusiness: { scene: "정식 계약, 신뢰, 세무, 규정, 공적 평판이 중요해집니다.", risk: "절차를 가볍게 보면 손실보다 신뢰 훼손이 큽니다.", advice: "계약서와 증빙을 먼저 정리하세요." },
      love: { scene: "관계의 책임과 공식성이 중요한 질문으로 떠오릅니다.", risk: "형식만 챙기면 마음의 온도가 식을 수 있습니다.", advice: "약속과 감정을 함께 확인하세요." },
      relationship: { scene: "예의, 책임, 신뢰가 관계의 기준이 됩니다.", risk: "너무 바르게만 굴면 속마음이 눌릴 수 있습니다.", advice: "원칙은 지키되 대화의 온도를 낮추지 마세요." },
      career: { scene: "계약, 평가, 직책, 공적 책임이 중심에 섭니다.", risk: "작은 절차 누락이 신뢰 문제로 번질 수 있습니다.", advice: "승인권자, 일정, 문서 기준을 확인하세요." },
      health: { scene: "규칙적인 관리와 전문적 조언이 도움이 됩니다.", risk: "괜찮다는 말로 루틴을 무너뜨리면 회복이 늦어집니다.", advice: "검진, 상담, 기록처럼 확인 가능한 관리를 선택하세요." },
      movement: { scene: "공식 문서와 예약, 규정 준수가 핵심입니다.", risk: "간단해 보이는 절차가 전체 일정을 좌우할 수 있습니다.", advice: "확인번호, 여권, 보험, 결제 내역을 챙기세요." },
      creative: { scene: "작업의 신뢰도, 저작권, 공식 발표가 중요해집니다.", risk: "절차 없는 공개는 나중에 권리 문제를 부릅니다.", advice: "계약, 크레딧, 공개 조건을 정리하세요." },
    },
  },
  편인: {
    core: "직감, 연구, 비주류 지식, 고립, 불안정한 아이디어가 움직이는 별입니다.",
    domains: {
      wealthBusiness: { scene: "남들이 보지 못한 틈과 특수한 정보에 끌립니다.", risk: "근거가 약한 아이디어가 투자 판단을 흐릴 수 있습니다.", advice: "직감은 기록하고, 숫자와 계약으로 한 번 더 검증하세요." },
      love: { scene: "상대의 마음을 혼자 해석하고 의미를 붙이기 쉽습니다.", risk: "불안이 커지면 사실보다 상상이 앞섭니다.", advice: "느낌과 확인된 행동을 분리하세요." },
      relationship: { scene: "숨은 감정과 미묘한 기류에 예민해집니다.", risk: "혼자 결론을 내리면 오해가 커질 수 있습니다.", advice: "확신 없는 부분은 질문으로 낮추세요." },
      career: { scene: "연구, 기획, 비주류 전문성, 혼자 하는 작업에 힘이 납니다.", risk: "아이디어가 현실 일정과 떨어질 수 있습니다.", advice: "자료, 일정, 검증 기준을 붙이세요." },
      health: { scene: "예민함, 수면, 불안, 고립감이 컨디션에 닿습니다.", risk: "검색만 반복하면 걱정이 커질 수 있습니다.", advice: "불편감이 이어지면 전문가와 상의하고, 밤에는 정보 탐색을 줄이세요." },
      movement: { scene: "낯선 장소나 조용한 이동이 마음을 끕니다.", risk: "정보가 부족한 길은 불안을 키울 수 있습니다.", advice: "후기, 안전, 연락 수단을 확인하세요." },
      creative: { scene: "독특한 상징과 연구형 아이디어가 살아납니다.", risk: "너무 혼자 파고들면 전달력이 약해집니다.", advice: "한 사람에게 먼저 보여 반응을 확인하세요." },
    },
  },
  정인: {
    core: "보호, 학습, 문서, 신뢰, 자격, 안정적 지원을 살리는 별입니다.",
    domains: {
      wealthBusiness: { scene: "안정적 지원, 문서, 보증, 자격이 돈의 기반을 받칩니다.", risk: "도움에 기대기만 하면 실행이 늦어질 수 있습니다.", advice: "지원 조건과 책임 범위를 확인하세요." },
      love: { scene: "배려와 보호받고 싶은 마음이 커집니다.", risk: "안정만 바라면 관계의 생동감이 줄 수 있습니다.", advice: "고마움과 요구를 함께 표현하세요." },
      relationship: { scene: "신뢰할 수 있는 사람의 조언과 보호가 들어옵니다.", risk: "의존이 길어지면 내 판단이 약해질 수 있습니다.", advice: "조언은 받되 마지막 기준은 직접 정하세요." },
      career: { scene: "학습, 자격, 문서, 지원 체계가 중요해집니다.", risk: "준비만 길어지면 기회가 지나갈 수 있습니다.", advice: "오늘 필요한 자료와 승인 절차를 정리하세요." },
      health: { scene: "회복을 돕는 안정된 환경이 필요합니다.", risk: "편안함에 머물러 필요한 관리를 미룰 수 있습니다.", advice: "전문 조언과 생활 루틴을 함께 세우세요." },
      movement: { scene: "안전한 숙소, 보호 장치, 공식 안내가 중요합니다.", risk: "익숙한 곳만 택하면 필요한 변화가 늦어집니다.", advice: "안전 기준을 챙긴 뒤 이동 폭을 정하세요." },
      creative: { scene: "자료 조사, 배움, 멘토의 조언이 작업을 받칩니다.", risk: "준비가 길면 공개가 늦어집니다.", advice: "참고 자료를 줄이고 첫 버전을 완성하세요." },
    },
  },
};

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.webp",M01:"themagician.webp",M02:"thehighpriestess.webp",M03:"theempress.webp",
  M04:"theemperor.webp",M05:"thehierophant.webp",M06:"TheLovers.webp",M07:"thechariot.webp",
  M08:"thestrength.webp",M09:"thehermit.webp",M10:"wheeloffortune.webp",M11:"justice.webp",
  M12:"thehangedman.webp",M13:"death.webp",M14:"temperance.webp",M15:"thedevil.webp",
  M16:"thetower.webp",M17:"thestar.webp",M18:"themoon.webp",M19:"thesun.webp",
  M20:"judgement.webp",M21:"theworld.webp",
  W01:"aceofwands.webp",W02:"twoofwands.webp",W03:"threeofwands.webp",W04:"fourofwands.webp",
  W05:"fiveofwands.webp",W06:"sixofwands.webp",W07:"sevenofwands.webp",W08:"eightofwands.webp",
  W09:"nineofwands.webp",W10:"tenofwands.webp",W11:"pageofwands.webp",W12:"knightofwands.webp",
  W13:"queenofwands.webp",W14:"kingofwands.webp",
  C01:"aceofcups.webp",C02:"twoofcups.webp",C03:"threeofcups.webp",C04:"fourofcups.webp",
  C05:"fiveofcups.webp",C06:"sixofcups.webp",C07:"sevenofcups.webp",C08:"eightofcups.webp",
  C09:"nineofcups.webp",C10:"tenofcups.webp",C11:"pageofcups.webp",C12:"knightofcups.webp",
  C13:"queenofcups.webp",C14:"kingofcups.webp",
  S01:"aceofswords.webp",S02:"twoofswords.webp",S03:"threeofswords.webp",S04:"fourofswords.webp",
  S05:"fiveofswords.webp",S06:"sixofswords.webp",S07:"sevenofswords.webp",S08:"eightofswords.webp",
  S09:"nineofswords.webp",S10:"tenofswords.webp",S11:"pageofswords.webp",S12:"knightofswords.webp",
  S13:"queenofswords.webp",S14:"kingofswords.webp",
  P01:"aceofpentacles.webp",P02:"twoofpentacles.webp",P03:"threeofpentacles.webp",P04:"fourofpentacles.webp",
  P05:"fiveofpentacles.webp",P06:"sixofpentacles.webp",P07:"sevenofpentacles.webp",P08:"eightofpentacles.webp",
  P09:"nineofpentacles.webp",P10:"tenofpentacles.webp",P11:"pageofpentacles.webp",P12:"knightofpentacles.webp",
  P13:"queenofpentacles.webp",P14:"kingofpentacles.webp",
};

function cardImageUrl(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  const fn = TAROT_IMAGE_MAP[key];
  return fn ? `/tarot-cards/${fn}` : `/tarot-cards/thefool.webp`;
}

const MAJOR_KR = [
  "바보", "마법사", "여사제", "여황제", "황제", "교황", "연인", "전차", "힘", "은둔자", "운명의 수레바퀴",
  "정의", "매달린 사람", "죽음", "절제", "악마", "탑", "별", "달", "태양", "심판", "세계",
];

const SUIT_KR: Record<string, string> = {
  W: "완드",
  C: "컵",
  S: "소드",
  P: "펜타클",
};

const RANK_KR: Record<string, string> = {
  "01": "에이스",
  "02": "2",
  "03": "3",
  "04": "4",
  "05": "5",
  "06": "6",
  "07": "7",
  "08": "8",
  "09": "9",
  "10": "10",
  "11": "페이지",
  "12": "나이트",
  "13": "퀸",
  "14": "킹",
};

function cardNameKr(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  if (key.startsWith("M")) {
    const idx = Number(key.slice(1));
    return Number.isFinite(idx) && idx >= 0 && idx < MAJOR_KR.length
      ? MAJOR_KR[idx]
      : `메이저 ${key.slice(1)}`;
  }
  const suit = SUIT_KR[key[0]] || "타로";
  const rank = RANK_KR[key.slice(1)] || key.slice(1);
  return `${suit} ${rank}`;
}

function orientationKr(orientation?: string) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function topicMarked(value: string) {
  const text = String(value || "").trim();
  const last = text.charCodeAt(text.length - 1) - 0xac00;
  const hasBatchim = Number.isFinite(last) && last >= 0 && last <= 11171 && last % 28 > 0;
  return `${text}${hasBatchim ? "은" : "는"}`;
}

function normalizeTenGod(value: unknown): TenGod | "" {
  const text = String(value || "").trim();
  return (Object.keys(TEN_GOD_READING) as TenGod[]).find((key) => text.includes(key)) || "";
}

function getQuestionDomain(category: TarotCategory): QuestionDomain {
  return DOMAIN_BY_CATEGORY[category] || "relationship";
}

function buildGenericCardMeaning(cardId: string, cardName: string, orientation: "upright" | "reversed"): CardMeaning {
  const key = String(cardId || "").toUpperCase();
  const suit = key[0];
  const rank = Number(key.slice(1));
  const suitFrame: Record<string, { theme: string; reality: string; advice: string; tone: CardTone }> = {
    W: { theme: "의지와 실행의 불씨가 살아나는 카드입니다.", reality: "속도가 붙는 만큼 말과 행동의 순서가 중요해집니다.", advice: "바로 밀어붙이기보다 오늘 끝낼 수 있는 일부터 잡으세요.", tone: "turning" },
    C: { theme: "감정과 관계의 온도가 섬세하게 움직이는 카드입니다.", reality: "마음의 반응이 선택을 부드럽게 만들 수도, 흐리게 만들 수도 있습니다.", advice: "기분과 사실을 분리한 뒤 필요한 말을 고르세요.", tone: "unclear" },
    S: { theme: "판단, 말, 긴장, 결단의 칼날이 드러나는 카드입니다.", reality: "생각이 빨라질수록 표현 하나가 관계와 일의 결을 바꿉니다.", advice: "확답 전에 근거와 상대가 받아들일 문장을 확인하세요.", tone: "caution" },
    P: { theme: "돈, 몸, 시간, 현실 조건이 무게를 갖는 카드입니다.", reality: "손에 잡히는 자원과 실제 관리 능력이 질문의 핵심이 됩니다.", advice: "숫자, 일정, 비용, 책임자를 먼저 적으세요.", tone: "neutral" },
  };
  const frame = suitFrame[suit] || { theme: `${cardName}의 상징이 질문의 현재 결을 가리키는 카드입니다.`, reality: "상징보다 현실 조건을 함께 살필 때 판단이 맑아집니다.", advice: "오늘 확인 가능한 근거부터 정리하세요.", tone: "neutral" as CardTone };
  const rankHint = rank >= 10 ? "완성 직전의 부담과 책임이 겹칩니다." : rank >= 7 ? "버티는 힘과 조정할 부분이 같이 떠오릅니다." : rank >= 4 ? "유지할 것과 바꿀 것을 나누는 흐름입니다." : "시작의 가능성과 아직 덜 익은 조건이 함께 있습니다.";

  if (orientation === "reversed") {
    return {
      keywords: ["지연", "재검토", "불균형", "조정"],
      core: `${frame.theme} 다만 역방향에서는 ${rankHint} 속도가 늦거나 기준이 흔들릴 수 있습니다.`,
      reality: frame.reality,
      advice: "확장보다 보류, 확인, 수정에 힘을 두세요.",
      tone: frame.tone === "positive" ? "neutral" : frame.tone,
    };
  }

  return {
    keywords: ["현실화", "선택", "조정", "실행"],
    core: `${frame.theme} ${rankHint}`,
    reality: frame.reality,
    advice: frame.advice,
    tone: frame.tone,
  };
}

function getCardMeaning(card: DrawnCard): CardMeaning {
  const key = String(card.cardId || "").toUpperCase();
  const orientation = card.orientation === "reversed" ? "reversed" : "upright";
  const override = CARD_MEANING_OVERRIDES[key]?.[orientation];
  return override || buildGenericCardMeaning(key, card.nameKr || cardNameKr(key), orientation);
}

function resolveCardTenGod(card: DrawnCard, sajuContext: MingriSajuContext): TenGod {
  if (sajuContext.tenGod) return sajuContext.tenGod;
  const key = String(card.cardId || "").toUpperCase();
  return CARD_TEN_GOD_OVERRIDES[key] || SUIT_TEN_GOD[key[0]] || "정인";
}

function extractTextSignal(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return String(record.name || record.label || record.value || record.stem || record.elementKo || record.ko || "").trim();
}

function findSajuSignal(source: unknown, keys: string[], depth = 0): string {
  if (!source || typeof source !== "object" || depth > 4) return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const direct = extractTextSignal(record[key]);
    if (direct) return direct;
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      const found = value.map((item) => findSajuSignal(item, keys, depth + 1)).find(Boolean);
      if (found) return found;
      continue;
    }
    const nested = findSajuSignal(value, keys, depth + 1);
    if (nested) return nested;
  }
  return "";
}

function buildMingriSajuContext(profile: DestinyProfileCard | null): MingriSajuContext {
  if (!profile) return EMPTY_SAJU_CONTEXT;
  const record = profile as Record<string, unknown>;
  const dayMaster = findSajuSignal(record, ["dayMaster", "dayStem", "일간", "dayPillarStem"]);
  const strongElements = findSajuSignal(record, ["strongElements", "dominantElements", "과다오행", "strongElement"]);
  const weakElements = findSajuSignal(record, ["weakElements", "missingElements", "부족오행", "weakElement"]);
  const yongshin = findSajuSignal(record, ["yongshin", "coreYongshinKo", "용신"]);
  const gisin = findSajuSignal(record, ["gisin", "gishin", "기신"]);
  const tenGod = normalizeTenGod(findSajuSignal(record, ["tenGod", "tenStar", "dominantTenGod", "십성"]));

  return {
    hasProfile: true,
    hasSajuSignals: Boolean(dayMaster || strongElements || weakElements || yongshin || gisin || tenGod),
    name: String(record.name || "").trim(),
    dayMaster,
    strongElements,
    weakElements,
    yongshin,
    gisin,
    tenGod,
  };
}

function readMingriSajuContext(): MingriSajuContext {
  try {
    return buildMingriSajuContext(readCurrentDestinyProfile());
  } catch {
    return EMPTY_SAJU_CONTEXT;
  }
}

function sajuContextSentence(sajuContext: MingriSajuContext, tenGod: TenGod) {
  if (sajuContext.hasSajuSignals) {
    const parts = [
      sajuContext.dayMaster ? `일간 ${sajuContext.dayMaster}` : "",
      sajuContext.strongElements ? `강한 오행 ${sajuContext.strongElements}` : "",
      sajuContext.weakElements ? `부족한 오행 ${sajuContext.weakElements}` : "",
      sajuContext.yongshin ? `용신 ${sajuContext.yongshin}` : "",
      sajuContext.gisin ? `기신 ${sajuContext.gisin}` : "",
    ].filter(Boolean);
    return `${sajuContext.name ? `${sajuContext.name}님의 ` : ""}저장된 사주 신호에서는 ${parts.join(", ") || `${tenGod} 기운`}이 먼저 드러납니다. 다만 원국 전체가 모두 열린 자료는 아닐 수 있어, 이번 카드는 ${tenGod}의 움직임이 현실에서 어떻게 나타나는지 중심으로 조심스럽게 읽습니다.`;
  }
  if (sajuContext.hasProfile) {
    return "프로필 생년월일은 연결되어 있지만 일간, 용신, 기신 같은 정밀 신호는 충분하지 않습니다. 그래서 이번 리딩에서는 카드가 불러낸 십성 상징을 빌려, 지금 질문의 현실 장면에 맞추어 읽습니다.";
  }
  return `저장된 사주 원국이 열려 있지 않아, 이번 리딩에서는 ${tenGod}의 상징을 빌려 카드와 질문이 만나는 지점을 살핍니다.`;
}

function variant<T>(items: T[], seed: string): T {
  const base = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + Math.floor(Date.now() / 60000);
  return items[Math.abs(base) % items.length];
}

function buildCoreJudgment(card: DrawnCard, meaning: CardMeaning, tenGod: TenGod, domain: QuestionDomain): string {
  const domainAdvice = DOMAIN_ADVICE[domain];
  const cardName = card.nameKr || cardNameKr(card.cardId);
  const orientation = orientationKr(card.orientation);

  if (card.cardId.toUpperCase() === "M16" && card.orientation !== "reversed" && domain === "wealthBusiness" && tenGod === "겁재") {
    return "지금은 확장보다 구조 점검이 먼저입니다. 숨겨진 비용, 불리한 계약, 공동 운영이나 경쟁 구도에서 생긴 균열을 차분히 확인해야 합니다.";
  }
  if (card.cardId.toUpperCase() === "M16" && card.orientation === "reversed" && domain === "wealthBusiness" && tenGod === "겁재") {
    return "아직 크게 드러나지 않았다고 해서 안심할 흐름은 아닙니다. 돈이 새는 구조와 정산의 균열이 조용히 뒤로 밀려 있을 수 있습니다.";
  }
  if (card.cardId.toUpperCase() === "M15" && domain === "wealthBusiness") {
    return "수익의 향이 강할수록 조건은 더 차분하게 확인해야 합니다. 유혹적인 이익보다 빠져나올 수 있는 계약인지가 먼저입니다.";
  }
  if (card.cardId.toUpperCase() === "M19" && domain === "love") {
    return "관계의 온도는 밝아질 수 있습니다. 다만 좋은 감정은 말보다 꾸준한 표현과 약속 가능한 행동으로 살려야 합니다.";
  }
  if (card.cardId.toUpperCase() === "M18" && domain === "relationship") {
    return "지금은 감정과 사실이 섞이기 쉬운 자리입니다. 관계를 단정하기보다 확인된 행동과 내 안의 불안을 먼저 분리해야 합니다.";
  }
  if (card.cardId.toUpperCase() === "S10") {
    return "지금은 더 버티는 선택보다 멈춰야 할 구조를 인정하는 쪽이 먼저입니다. 회복 시간과 책임 범위를 정해야 다음 판단이 흐려지지 않습니다.";
  }
  if (card.cardId.toUpperCase() === "P05") {
    return "낙관으로 부족함을 덮기보다 실제 자원과 지원선을 확인해야 합니다. 비용, 체력, 도움 요청의 순서를 먼저 잡으세요.";
  }
  if (card.cardId.toUpperCase() === "M11" && domain === "career") {
    return "계약과 일의 핵심은 공정한 기준과 책임 소재입니다. 말로 맞춘 약속보다 문서, 일정, 승인권자를 먼저 확인해야 합니다.";
  }
  if (card.cardId.toUpperCase() === "M10" && domain === "wealthBusiness") {
    return "전환점은 열려 있지만 타이밍만 믿고 크게 움직일 때는 아닙니다. 기회와 현금흐름이 같은 속도로 움직이는지 확인해야 합니다.";
  }

  return `${cardName} ${orientation}은 ${meaning.core} ${domainAdvice.anchor} 질문에서는 ${domainAdvice.judgment}`;
}

function buildCombinedReading(card: DrawnCard, meaning: CardMeaning, tenGod: TenGod, domain: QuestionDomain): string {
  const cardName = card.nameKr || cardNameKr(card.cardId);
  const orientation = orientationKr(card.orientation);
  const ten = TEN_GOD_READING[tenGod];
  const tenDomain = ten.domains[domain];
  const domainAdvice = DOMAIN_ADVICE[domain];

  if (card.cardId.toUpperCase() === "M16" && card.orientation !== "reversed" && domain === "wealthBusiness" && tenGod === "겁재") {
    return "탑 정방향은 이미 약해진 기반이 갑자기 드러나는 카드입니다. 여기에 겁재의 기운이 더해지면 문제는 혼자만의 실수보다 사람, 경쟁, 나눔 구조, 공동재정 문제로 나타나기 쉽습니다. 재물/사업 질문에서는 더 벌 수 있는가보다 어디서 새고 있는가를 먼저 보아야 합니다.";
  }

  return `${cardName} ${orientation}은 ${meaning.core} 여기에 ${tenGod}의 기운이 닿으면 ${tenDomain.scene} ${domainAdvice.label} 질문에서 이 조합은 ${meaning.reality} 그래서 오늘의 핵심은 ${meaning.advice}`;
}

function buildTenGodOperation(tenGod: TenGod, domain: QuestionDomain, sajuContext: MingriSajuContext): string {
  const ten = TEN_GOD_READING[tenGod];
  const tenDomain = ten.domains[domain];
  return `${topicMarked(tenGod)} ${ten.core} 이 기운이 ${DOMAIN_ADVICE[domain].anchor} 자리에서 흔들리면 ${tenDomain.risk} 그래서 ${tenDomain.advice} ${sajuContextSentence(sajuContext, tenGod)}`;
}

function buildPracticalAdvice(category: TarotCategory, meaning: CardMeaning, tenGod: TenGod, domain: QuestionDomain): string {
  const domainAdvice = DOMAIN_ADVICE[domain];
  const tenDomain = TEN_GOD_READING[tenGod].domains[domain];
  const actions = domainAdvice.actions.slice(0, 2);
  const closing = variant([
    tenDomain.advice,
    meaning.advice,
    domainAdvice.reality,
  ], `${category}:${tenGod}:${meaning.keywords.join("|")}`);

  return `${actions.join(" ")} 마지막으로 ${closing}`;
}

function buildOneLine(card: DrawnCard, tenGod: TenGod, domain: QuestionDomain): string {
  const key = String(card.cardId || "").toUpperCase();
  if (key === "M16" && card.orientation !== "reversed") return "무너지는 신호를 일찍 본 사람은 다음 판을 더 단단히 세울 수 있습니다.";
  if (key === "M16" && card.orientation === "reversed") return "조용한 균열을 외면하지 않을 때 손실은 작아집니다.";
  if (key === "M19") return "따뜻한 빛은 꾸준한 행동 위에서 오래 머뭅니다.";
  if (key === "M18") return "불안이 짙을수록 사실 하나가 길을 밝힙니다.";
  if (key === "M15") return "강한 욕망일수록 빠져나올 문을 먼저 확인해야 합니다.";
  if (key === "S10") return "끝난 방식을 놓아야 다음 숨이 돌아옵니다.";
  if (key === "P05") return "부족함을 인정할 때 도움의 문이 보입니다.";
  if (key === "M11") return "공정한 조건은 관계와 일을 함께 지켜 줍니다.";
  if (key === "M10") return "타이밍은 준비된 구조 위에서 기회가 됩니다.";
  return DOMAIN_ADVICE[domain].oneLine;
}

function buildSpreadReading(cards: DrawnCard[], domain: QuestionDomain, sajuContext: MingriSajuContext): string {
  return cards
    .map((card, idx) => {
      const cardName = card.nameKr || cardNameKr(card.cardId);
      const meaning = getCardMeaning(card);
      const tenGod = resolveCardTenGod(card, sajuContext);
      const tenDomain = TEN_GOD_READING[tenGod].domains[domain];
      return `${idx + 1}. ${card.position || `자리 ${idx + 1}`} — ${cardName} ${orientationKr(card.orientation)}\n${meaning.core} 이 자리에서는 ${topicMarked(tenGod)} ${tenDomain.scene} 지금은 ${meaning.advice}`;
    })
    .join("\n\n");
}

function applyAdviceGuard(text: string, meaning: CardMeaning): string {
  let next = text;
  const banned = meaning.bannedAdvice || [];
  for (const phrase of banned) {
    if (!phrase) continue;
    next = next.split(phrase).join(meaning.advice);
  }
  return next;
}

function splitSentences(text: string) {
  return String(text || "")
    .split(/(?<=[.!?。]|습니다\.|세요\.|입니다\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function removeRepeatedSentences(text: string) {
  const seen = new Set<string>();
  return splitSentences(text)
    .filter((sentence) => {
      const key = sentence.replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

function limitRepeatedTerms(payload: ReadingPayload): ReadingPayload {
  const synonyms: Record<string, string[]> = {
    "동업": ["공동 운영", "함께 얽힌 돈자리"],
    "지분": ["몫", "권리 비율"],
    "분배": ["나눔 구조", "몫의 기준"],
    "경쟁자": ["비슷한 위치의 사람", "시장 안의 맞상대"],
    "비용": ["지출", "나가는 돈"],
    "확장": ["규모 키우기", "큰 결정"],
  };
  const counts = new Map<string, number>();
  const nextPayload: ReadingPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    const text = Array.isArray(value) ? value.join("\n") : String(value || "");
    let next = removeRepeatedSentences(text);
    for (const [term, replacements] of Object.entries(synonyms)) {
      next = next.replace(new RegExp(term, "g"), () => {
        const count = counts.get(term) || 0;
        counts.set(term, count + 1);
        if (count < 2) return term;
        return replacements[(count - 2) % replacements.length];
      });
    }
    next = normalizeDuplicatedSubjectParticles(next);
    nextPayload[key] = Array.isArray(value) ? next.split("\n").filter(Boolean) : next;
  }

  return nextPayload;
}

function generateLocalReading(category: TarotCategory, mode: TarotMode, selectedCards: DrawnCard[], sajuContext: MingriSajuContext = EMPTY_SAJU_CONTEXT): ReadingPayload {
  const cardCount = selectedCards.length;
  const domain = getQuestionDomain(category);
  const domainAdvice = DOMAIN_ADVICE[domain];
  const primaryIndex = mode === "three" && selectedCards[1] ? 1 : 0;
  const primaryCard = selectedCards[primaryIndex] || selectedCards[0];
  const primaryMeaning = getCardMeaning(primaryCard);
  const primaryTenGod = resolveCardTenGod(primaryCard, sajuContext);
  const primaryCardName = primaryCard.nameKr || cardNameKr(primaryCard.cardId);
  const cardDisplay = cardCount === 1
    ? `${domainAdvice.anchor} — ${primaryCardName} ${orientationKr(primaryCard.orientation)}`
    : selectedCards
      .map((card, idx) => `${idx + 1}. ${card.position || `자리 ${idx + 1}`} — ${card.nameKr || cardNameKr(card.cardId)} ${orientationKr(card.orientation)}`)
      .join("\n");

  const payload: ReadingPayload = {
    "제목": cardCount === 1 ? "명리학 타로 한 장 리딩" : "명리학 타로 세 장 리딩",
    "서브카피": "카드와 십성이 만나는 지점에서 오늘의 선택을 차분히 살핍니다.",
    "카드 표시": cardDisplay,
    "핵심 흐름": buildCoreJudgment(primaryCard, primaryMeaning, primaryTenGod, domain),
    ...(cardCount >= 3 ? { "배열별 해석": buildSpreadReading(selectedCards, domain, sajuContext) } : {}),
    "카드와 십성의 결합 해석": buildCombinedReading(primaryCard, primaryMeaning, primaryTenGod, domain),
    "십성이 움직이는 방식": buildTenGodOperation(primaryTenGod, domain, sajuContext),
    [`질문별 현실 조언 · ${domainAdvice.label}`]: buildPracticalAdvice(category, primaryMeaning, primaryTenGod, domain),
    "오늘의 한 문장": buildOneLine(primaryCard, primaryTenGod, domain),
  };

  return limitRepeatedTerms(Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map((item) => applyAdviceGuard(item, primaryMeaning)) : applyAdviceGuard(value, primaryMeaning),
    ]),
  ) as ReadingPayload);
}

export const __MINGRI_TAROT_TEST__ = {
  buildMingriSajuContext,
  generateLocalReading,
  normalizeDuplicatedSubjectParticles,
  normalizeTenGod,
};

function shuffle<T>(arr: T[]) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function MingriTarot({
  initialMode = "one",
  initialCategory = "love",
  lockCategory = false,
  heading = "명리학 타로",
  subtitle = "오행의 결 위에 타로 카드를 올려 오늘의 선택을 차분히 짚습니다.",
}: MingriTarotProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TarotMode>(initialMode);
  const [category, setCategory] = useState<TarotCategory>(initialCategory);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingRaw, setReadingRaw] = useState<ReadingPayload | null>(null);
  const [typedReading, setTypedReading] = useState<Record<string, string>>({});
  const [sajuContext, setSajuContext] = useState<MingriSajuContext>(EMPTY_SAJU_CONTEXT);

  const spreadType = useMemo(() => spreadTypeForMode(mode), [mode]);
  const requiredRevealCount = mode === "three" ? 3 : 1;
  const canRead = cards.length >= requiredRevealCount && revealedCount >= requiredRevealCount && !loading;

  useEffect(() => {
    const refreshSajuContext = () => setSajuContext(readMingriSajuContext());
    refreshSajuContext();
    window.addEventListener("storage", refreshSajuContext);
    window.addEventListener("cd:destiny-profile-updated", refreshSajuContext);
    return () => {
      window.removeEventListener("storage", refreshSajuContext);
      window.removeEventListener("cd:destiny-profile-updated", refreshSajuContext);
    };
  }, []);

  useEffect(() => {
    if (!readingRaw) {
      setTypedReading({});
      return;
    }

    const entries = Object.entries(readingRaw)
      .map(([key, value]) => {
        const text = Array.isArray(value) ? value.join("\n") : String(value || "");
        return [key, text] as const;
      })
      .filter(([, text]) => text.trim().length > 0);

    if (!entries.length) {
      setTypedReading({});
      return;
    }

    setTypedReading(Object.fromEntries(entries.map(([key]) => [key, ""])));

    let sectionIdx = 0;
    let charIdx = 0;
    const timer = window.setInterval(() => {
      const current = entries[sectionIdx];
      if (!current) {
        window.clearInterval(timer);
        return;
      }
      const [key, fullText] = current;
      const nextChar = fullText.charAt(charIdx);

      if (nextChar) {
        setTypedReading((prev) => ({
          ...prev,
          [key]: (prev[key] || "") + nextChar,
        }));
        charIdx += 1;
        return;
      }

      sectionIdx += 1;
      charIdx = 0;
      if (sectionIdx >= entries.length) {
        window.clearInterval(timer);
      }
    }, READING_CHAR_DELAY_MS);

    return () => window.clearInterval(timer);
  }, [readingRaw]);

  async function startDraw() {
    setLoading(true);
    setError("");
    setReadingRaw(null);
    setCards([]);
    setRevealedCount(0);

    try {
      const deckIds = shuffle(Object.keys(TAROT_IMAGE_MAP));
      const positions = mode === "three" ? THREE_CARD_POSITIONS : ONE_CARD_POSITION;
      const picked = deckIds.slice(0, requiredRevealCount).map((cardId, idx) => ({
        cardId,
        nameKr: cardNameKr(cardId),
        position: positions[idx],
        orientation: Math.random() < 0.2 ? "reversed" : "upright",
      }));
      if (!picked.length) throw new Error("카드의 문이 아직 열리지 않았습니다.");
      setCards(picked);
    } catch (e: any) {
      setError(e?.message || "카드 뽑기 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReading() {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const payloadCards = cards.slice(0, requiredRevealCount);
      const localReading = generateLocalReading(category, mode, payloadCards, sajuContext);
      window.setTimeout(() => {
        setReadingRaw(localReading);
      }, 320);
    } catch (e: any) {
      setError(e?.message || "해석 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl border border-violet-500/30 bg-violet-950/35 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">{heading}</h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
            >
              홈으로
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-300">{subtitle}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>{mingriTarotText("mingriTarot.015")}</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as TarotMode)}
              >
                <option value="one">{mingriTarotText("mingriTarot.016")}</option>
                <option value="three">{mingriTarotText("mingriTarot.017")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
                <span>{mingriTarotText("mingriTarot.018")}</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as TarotCategory)}
                disabled={lockCategory}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={startDraw}
            disabled={loading}
            className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "카드의 결을 여는 중..." : "카드의 문 열기"}
          </button>
        </section>

        {cards.length > 0 ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
            <h2 className="mb-3 text-lg font-semibold">펼쳐진 카드</h2>
            <div className={`grid gap-3 ${mode === "three" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
              {cards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const canReveal = idx === revealedCount && revealedCount < requiredRevealCount;
                return (
                  <button
                    key={`${card.cardId}-${idx}`}
                    type="button"
                    onClick={() => canReveal && setRevealedCount((prev) => prev + 1)}
                    disabled={!canReveal}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left"
                  >
                    {isRevealed ? (
                      <>
                        <Image
                          src={cardImageUrl(card.cardId)}
                          alt={card.nameKr || card.name || `tarot-${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 90vw, 300px"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                          {(card.nameKr || card.name || "Unknown").trim()}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-300">
                        {canReveal ? "카드의 빛 열기" : "앞선 카드의 빛을 먼저 여세요"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={loadReading}
                disabled={!canRead}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                리딩 열기
              </button>
              <span className="text-xs text-slate-400">
                열린 카드: {revealedCount}/{requiredRevealCount}
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</section>
        ) : null}

        {readingRaw ? (
          <section className="rounded-2xl border border-emerald-600/35 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-lg font-semibold">명리 오라클 리딩</h2>
            <p className="mb-3 text-xs text-emerald-200/75">카드의 문장이 천천히 열립니다. 잠시 흐름을 따라가 주세요.</p>
            <div className="space-y-3 text-sm leading-7 text-slate-100">
              {Object.entries(readingRaw).map(([key, value]) => {
                if (!value) return null;
                const text = Array.isArray(value) ? value.join("\n") : String(value);
                if (!text.trim()) return null;
                const typed = typedReading[key] ?? "";
                return (
                  <article key={key} className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                    <h3 className="mb-1 text-sm font-semibold text-emerald-300">{key}</h3>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{typed || " "}</pre>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

