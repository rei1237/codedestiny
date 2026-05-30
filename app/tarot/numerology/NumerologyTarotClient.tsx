"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoinGate } from "../../hooks/useCoinGate";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { showToast } from "../../components/Toast";
import { authFetch } from "../../_lib/auth-client";
import styles from "./numerology-tarot.module.css";
import {
  NUMEROLOGY_DATA,
  TOPIC_LABELS,
  buildNumerologyContext,
  selectCards,
} from "../../../lib/tarot/numerology-tarot.mjs";

type TopicKey = keyof typeof TOPIC_LABELS;

type DrawnCard = {
  card: {
    id: number;
    nameKr: string;
    name: string;
    emoji?: string;
    upright?: string;
    reversed?: string;
  };
  orientation: "upright" | "reversed";
  position: number;
  positionLabel: string;
};

type ReadingResponse = {
  ok: boolean;
  source?: string;
  topic?: string;
  model?: string;
  interpretation?: {
    numerologyReading: string;
    coreMessage: string;
    cardReadings: Array<{ title: string; keywordFocus?: string; interpretation: string; actionTip?: string }>;
    conclusion: {
      summary: string;
      doThis: string[];
      avoidThis: string[];
      finalWord: string;
    };
  };
  message?: string;
};

type NumerologyContext = {
  lifePathNumber: number;
  personalDayNumber: number;
  questionNumber: number;
  topic: string;
  topicLabel: string;
  birthDate: string;
};

type FreeProfileCard = {
  title: string;
  value: string;
};

type FreeProfile = {
  headline: string;
  summary: string;
  cards: FreeProfileCard[];
};

const TOPIC_OPTIONS: Array<{ value: TopicKey; label: string }> = Object.entries(TOPIC_LABELS).map(([value, label]) => ({
  value: value as TopicKey,
  label,
}));

const STEP_LABELS = ["정보 입력", "타로 뽑기", "해석 준비", "결과 확인"];

const PREVIEW_PLACEHOLDERS = [
  { title: "과거", icon: "✶" },
  { title: "현재", icon: "☽" },
  { title: "미래", icon: "☀" },
];

const YEARS = Array.from({ length: 91 }, (_, idx) => String(new Date().getFullYear() - idx));
const MONTHS = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, "0"));

const TAROT_IMAGE_MAP: Record<number, string> = {
  0: "thefool.webp",
  1: "themagician.webp",
  2: "thehighpriestess.webp",
  3: "theempress.webp",
  4: "theemperor.webp",
  5: "thehierophant.webp",
  6: "TheLovers.webp",
  7: "thechariot.webp",
  8: "thestrength.webp",
  9: "thehermit.webp",
  10: "wheeloffortune.webp",
  11: "justice.webp",
  12: "thehangedman.webp",
  13: "death.webp",
  14: "temperance.webp",
  15: "thedevil.webp",
  16: "thetower.webp",
  17: "thestar.webp",
  18: "themoon.webp",
  19: "thesun.webp",
  20: "judgement.webp",
  21: "theworld.webp",
};

const FREE_TALENT_MAP: Record<number, {
  trait: string;
  aptitude: string[];
  strength: string;
  shadow: string;
  love: string;
  work: string;
  money: string;
  relationship: string;
  recovery: string;
  action: string;
  caution: string;
  cardBridge: string;
  growthTip: string;
}> = {
  1: {
    trait: "독립성과 추진력이 강한 개척형",
    aptitude: ["기획/창업", "리더십 직무", "브랜딩"],
    strength: "결정을 늦추지 않고 먼저 길을 여는 힘이 있습니다.",
    shadow: "혼자 빠르게 달리다가 주변 속도를 놓치기 쉽습니다.",
    love: "연애에서는 먼저 다가가는 용기가 매력을 만들지만, 상대의 호흡을 함께 맞추는 쪽이 오래갑니다.",
    work: "새 프로젝트를 여는 역할, 방향을 정하는 역할에서 강합니다.",
    money: "수입의 파동이 빠른 대신 지출 결정을 속도감 있게 하므로 기준표가 필요합니다.",
    relationship: "의견 제시가 분명해 협업 리더로 보이지만, 요청보다 지시로 들리지 않게 톤을 조절하면 좋습니다.",
    recovery: "하루 시작 전에 우선순위 3개만 적으면 에너지가 빠르게 정렬됩니다.",
    action: "이번 주 안에 미뤄둔 첫 단계를 하나만 실행으로 옮기세요.",
    caution: "시작의 흥분이 커질수록 중간 점검과 마감 확인을 건너뛰지 마세요.",
    cardBridge: "바보와 마법사 카드의 조합처럼, 가능성을 현실화하는 첫 동작이 핵심입니다.",
    growthTip: "시작은 빠르니 중간 점검 루틴을 붙이면 성과가 오래갑니다.",
  },
  2: {
    trait: "감정 조율과 공감력이 뛰어난 연결형",
    aptitude: ["상담/코칭", "HR/협업 직무", "파트너십 운영"],
    strength: "사람 사이의 미묘한 온도를 빠르게 읽어냅니다.",
    shadow: "남의 감정에 오래 머물면 내 기준이 흐려질 수 있습니다.",
    love: "연애에서는 섬세한 배려가 장점이지만, 답을 기다리기만 하면 관계가 정체됩니다.",
    work: "조율, 중재, 비공식 커뮤니케이션이 중요한 일에서 빛납니다.",
    money: "금전은 한 번에 크게 움직이기보다 분산 관리가 안정적입니다.",
    relationship: "관계 유지 능력이 뛰어나지만 경계선을 분명히 하면 더 오래 갑니다.",
    recovery: "감정이 많아질 때는 혼자 정리하는 메모 루틴이 도움이 됩니다.",
    action: "오늘은 한 사람에게만 명확한 메시지를 보내세요.",
    caution: "상대의 기분을 먼저 걱정하느라 내 의사를 뒤로 미루지 마세요.",
    cardBridge: "여사제와 연인 카드의 분위기처럼, 드러나지 않은 진심을 천천히 확인해야 합니다.",
    growthTip: "관계 피로를 줄이기 위해 경계선 설정을 함께 연습하세요.",
  },
  3: {
    trait: "표현력과 창의성이 강한 콘텐츠형",
    aptitude: ["콘텐츠 제작", "마케팅/PR", "디자인/크리에이티브"],
    strength: "말과 이미지로 분위기를 살리고 사람의 반응을 끌어냅니다.",
    shadow: "재미를 우선하다 보면 중요한 약속이 가벼워 보일 수 있습니다.",
    love: "연애에서는 설렘과 대화가 강점이지만, 감정의 깊이를 더하면 관계가 오래갑니다.",
    work: "보여주는 일, 설명하는 일, 반응을 만드는 일에 적합합니다.",
    money: "수익화 아이디어가 많아도 한 채널에 집중해야 실제 현금 흐름이 커집니다.",
    relationship: "친화력이 좋고 분위기 메이커지만, 말의 양보다 약속의 질이 중요합니다.",
    recovery: "창작 회복은 산책, 음악, 짧은 기록처럼 가벼운 자극이 잘 맞습니다.",
    action: "오늘 떠오른 아이디어 하나를 바로 3줄 메모로 남기세요.",
    caution: "흥분한 순간에 약속을 늘리지 말고 우선순위를 좁히세요.",
    cardBridge: "태양 카드처럼 드러나는 매력과 창조성이 중심입니다.",
    growthTip: "아이디어를 주간 단위 실험으로 쪼개면 성장이 빨라집니다.",
  },
  4: {
    trait: "구조화와 책임감이 강한 빌더형",
    aptitude: ["운영/PM", "재무/관리", "프로세스 설계"],
    strength: "흔들리는 상황에서도 기준을 세우고 정리합니다.",
    shadow: "안정성을 지키려다 변화 대응이 늦어질 수 있습니다.",
    love: "연애에서는 확실한 태도와 꾸준함이 신뢰를 만듭니다.",
    work: "운영, 관리, 기준 정립, 일정 조정 역할에서 강합니다.",
    money: "예산과 저축 구조를 잡으면 재정 흐름이 아주 안정적으로 바뀝니다.",
    relationship: "책임감이 커서 믿음을 얻기 쉽지만, 완벽함을 요구하면 부담이 될 수 있습니다.",
    recovery: "정리된 공간과 규칙적인 수면이 회복의 핵심입니다.",
    action: "이번 주 해야 할 일을 3개만 남기고 나머지는 뒤로 미루세요.",
    caution: "완벽하게 준비될 때까지 기다리느라 기회를 늦추지 마세요.",
    cardBridge: "황제와 정의 카드처럼, 구조와 원칙이 운을 잡아줍니다.",
    growthTip: "완벽주의보다 반복 개선 중심으로 가면 스트레스가 줄어듭니다.",
  },
  5: {
    trait: "변화 적응력과 실행력이 좋은 탐험형",
    aptitude: ["세일즈/사업개발", "트렌드 리서치", "프로젝트 런칭"],
    strength: "새 판을 읽고 흐름이 바뀌는 지점을 빠르게 포착합니다.",
    shadow: "자극이 많아지면 집중이 흩어져 한 가지를 끝까지 밀기 어렵습니다.",
    love: "연애에서는 자유와 설렘이 중요하지만, 리듬이 무너지면 관계가 흔들립니다.",
    work: "변화가 많은 환경, 이동이 잦은 일, 협상과 런칭에서 강합니다.",
    money: "돈의 흐름이 빠른 만큼 유동성 확보가 중요하고, 즉흥 소비를 조심해야 합니다.",
    relationship: "재미와 에너지를 주는 사람으로 보이지만, 약속 시간과 기준은 명확할수록 좋습니다.",
    recovery: "몸을 움직이는 회복이 잘 맞고, 정체보다 변화가 에너지를 살립니다.",
    action: "오늘은 미뤄둔 연락이나 제안을 먼저 보내 보세요.",
    caution: "호기심이 생길 때마다 새로 시작하기보다 지금 것부터 마무리하세요.",
    cardBridge: "운명의 바퀴와 전차처럼, 흐름을 타되 방향은 잃지 않는 게 핵심입니다.",
    growthTip: "핵심 1가지를 고정하면 변동성 속에서도 성과가 유지됩니다.",
  },
  6: {
    trait: "돌봄과 조화 감각이 강한 하모니형",
    aptitude: ["교육/멘토링", "브랜드 경험 설계", "커뮤니티 운영"],
    strength: "사람을 편안하게 하고 공간의 분위기를 부드럽게 만듭니다.",
    shadow: "배려가 커질수록 내 욕구가 뒤로 밀리기 쉽습니다.",
    love: "연애에서는 따뜻함과 안정감이 강점이며, 관계의 온도를 꾸준히 유지할 때 빛납니다.",
    work: "사람의 만족도, 경험 설계, 돌봄과 조율이 중요한 일에 적합합니다.",
    money: "지출이 관계나 분위기와 연결되기 쉬워 감성 소비를 관리하면 좋습니다.",
    relationship: "협력과 조화에 강하지만, 기대를 혼자 떠안지 않도록 나눠야 합니다.",
    recovery: "집 정리, 향, 조명, 식사 리듬 같은 생활 감각을 돌보면 빠르게 회복됩니다.",
    action: "오늘은 누군가를 돕기 전에 내 일정부터 확인하세요.",
    caution: "좋은 사람으로 보이기 위해 무리한 약속을 늘리지 마세요.",
    cardBridge: "연인과 절제 카드처럼, 균형 잡힌 관계가 운을 키웁니다.",
    growthTip: "타인 기대와 본인 목표를 분리해 우선순위를 정하세요.",
  },
  7: {
    trait: "분석력과 통찰력이 깊은 탐구형",
    aptitude: ["데이터/리서치", "전략/기획", "심층 상담"],
    strength: "표면보다 구조를 보고, 말하지 않은 의미까지 읽어냅니다.",
    shadow: "깊게 파는 만큼 스스로를 고립시키거나 의심이 커질 수 있습니다.",
    love: "연애에서는 진심을 쉽게 내보이지 않지만, 신뢰가 쌓이면 아주 깊어집니다.",
    work: "연구, 분석, 기획, 문제의 핵심을 찾아내는 역할에 강합니다.",
    money: "숫자와 흐름을 읽는 감각이 좋아 장기 전략형 자산 관리에 맞습니다.",
    relationship: "조용하지만 신뢰를 주는 유형이라, 말보다 태도로 인정받습니다.",
    recovery: "혼자 있는 시간이 필요하지만 지나친 단절은 감정의 맥락을 흐립니다.",
    action: "오늘은 결론보다 질문을 1개 더 적어 보세요.",
    caution: "생각이 길어질수록 기회를 놓칠 수 있으니 작게 먼저 검증하세요.",
    cardBridge: "은둔자와 달 카드처럼, 보이지 않는 진실을 천천히 밝혀내는 힘입니다.",
    growthTip: "혼자 정리한 통찰을 작은 피드백 루프로 외부 검증하세요.",
  },
  8: {
    trait: "성과지향과 현실 감각이 강한 매니지형",
    aptitude: ["경영/재무", "비즈니스 운영", "영업 전략"],
    strength: "목표를 숫자와 결과로 연결하는 능력이 뛰어납니다.",
    shadow: "성과 압박이 커질수록 관계와 몸의 신호를 놓칠 수 있습니다.",
    love: "연애에서는 책임감이 신뢰를 만들지만, 통제보다 존중이 오래갑니다.",
    work: "성과 관리, 리소스 배분, 협상, 의사결정이 필요한 일에서 강합니다.",
    money: "수입을 키울 잠재력이 크지만 지출 구조를 함께 관리해야 자산이 쌓입니다.",
    relationship: "리더십이 강해 보이지만, 공정한 기준을 함께 나눌 때 협업이 탄탄해집니다.",
    recovery: "운동과 루틴이 몸의 긴장을 풀고 판단력을 회복시킵니다.",
    action: "오늘은 성과 기준을 한 줄로 적고 그 기준에 맞는 행동만 선택하세요.",
    caution: "빨리 이기려는 마음이 커질수록 장기 신뢰를 해치지 않도록 조심하세요.",
    cardBridge: "정의와 힘 카드처럼, 균형 잡힌 통제력이 결과를 만듭니다.",
    growthTip: "단기 성과와 장기 평판 지표를 동시에 관리하면 더 강해집니다.",
  },
  9: {
    trait: "치유와 통합 감각이 강한 완성형",
    aptitude: ["심리/헬스케어", "사회 공헌", "스토리텔링"],
    strength: "경험을 의미로 바꾸고, 사람과 상황을 묶어 이해합니다.",
    shadow: "지나간 감정을 오래 붙들면 현재의 기회를 늦출 수 있습니다.",
    love: "연애에서는 깊은 공감과 이해가 강점이며, 마무리와 시작을 잘 구분해야 합니다.",
    work: "치유, 교육, 공익, 기록과 서사를 만드는 일에서 힘이 납니다.",
    money: "돈은 목표보다 흐름과 의미를 함께 볼 때 안정적으로 움직입니다.",
    relationship: "상대를 넓게 품는 편이지만, 감정의 정리를 미루지 않는 것이 중요합니다.",
    recovery: "과거를 정리하는 루틴과 수면 회복이 운의 잔향을 맑게 합니다.",
    action: "오늘은 끝난 일 하나를 정리하고, 남은 일 하나만 남기세요.",
    caution: "감정적 동정이 지나치면 내 에너지가 새지 않도록 경계하세요.",
    cardBridge: "심판과 세계 카드처럼, 마무리와 완성이 새로운 문을 엽니다.",
    growthTip: "과거 정리 루틴을 두면 새로운 기회를 더 빠르게 잡습니다.",
  },
  11: {
    trait: "직관과 영감 수신력이 높은 인사이트형",
    aptitude: ["브랜드 전략", "창작/예술", "코칭/가이드"],
    strength: "말하지 않아도 분위기와 흐름을 먼저 감지합니다.",
    shadow: "감각이 강한 만큼 예민함과 피로가 동시에 올라올 수 있습니다.",
    love: "연애에서는 운명적 끌림이 강하지만, 현실 대화가 없으면 흔들릴 수 있습니다.",
    work: "인사이트, 방향 제시, 창의적 기획, 영감이 필요한 일에 강합니다.",
    money: "직감형 판단이 잘 맞지만, 큰 결정 전에는 한 번 더 구조화해야 합니다.",
    relationship: "영감이 잘 통하는 사람과 깊어지기 쉬우며, 공감과 언어화가 중요합니다.",
    recovery: "빛, 음악, 기록처럼 감각을 정돈하는 회복 루틴이 잘 맞습니다.",
    action: "오늘 떠오른 예감을 바로 한 줄로 기록하세요.",
    caution: "강한 확신이 들어도 검증 절차를 생략하지 마세요.",
    cardBridge: "별과 여사제 카드처럼, 직관이 길을 안내합니다.",
    growthTip: "번뜩임을 문서화해 실행 구조로 바꾸면 영향력이 커집니다.",
  },
  22: {
    trait: "큰 그림을 현실화하는 아키텍트형",
    aptitude: ["대형 프로젝트 리드", "시스템 설계", "조직 구축"],
    strength: "복잡한 목표를 구조로 바꾸고 현실에서 굴러가게 만듭니다.",
    shadow: "규모를 크게 보는 만큼 부담과 압박을 스스로 크게 느낄 수 있습니다.",
    love: "연애에서는 장기적 신뢰와 현실적 안정이 중요합니다.",
    work: "플랫폼, 시스템, 대형 프로젝트, 팀 설계에 적합합니다.",
    money: "자산을 쌓는 장기 플랜과 시스템형 수익 구조에 강합니다.",
    relationship: "책임감이 크지만, 모든 것을 혼자 짊어지지 않도록 분담이 필요합니다.",
    recovery: "큰 목표를 분기별 단위로 잘라야 에너지가 오래갑니다.",
    action: "오늘은 목표를 실행 가능한 3단계로 쪼개세요.",
    caution: "완성도를 높이느라 출발이 늦어지지 않도록 첫 단계를 작게 만드세요.",
    cardBridge: "황제와 세계 카드처럼, 구조와 완성이 함께 가야 합니다.",
    growthTip: "큰 목표를 분기별 마일스톤으로 분해해 실행하세요.",
  },
  33: {
    trait: "치유적 공감과 헌신이 큰 케어형",
    aptitude: ["치유/복지", "교육 콘텐츠", "공익 기획"],
    strength: "사람을 안전하게 만들고, 상처를 의미로 바꾸는 힘이 있습니다.",
    shadow: "헌신이 커질수록 자기 소진과 과몰입 위험이 함께 옵니다.",
    love: "연애에서는 깊은 포용력이 강점이지만, 희생이 습관이 되지 않게 해야 합니다.",
    work: "치유, 교육, 돌봄, 공익, 회복을 돕는 메시지 전달에 강합니다.",
    money: "돈보다 가치와 영향력을 먼저 보지만, 구조를 함께 챙겨야 지속됩니다.",
    relationship: "타인을 품는 능력이 크지만, 건강한 거리감이 있어야 오래 갑니다.",
    recovery: "휴식과 회복을 성과처럼 관리해야 에너지가 무너지지 않습니다.",
    action: "오늘은 누군가를 돕기 전에 내 회복 상태를 먼저 체크하세요.",
    caution: "도움이 곧 책임은 아니니, 경계를 분명히 하세요.",
    cardBridge: "절제와 별 카드처럼, 치유는 균형 위에서 오래갑니다.",
    growthTip: "과몰입 방지를 위한 회복 루틴을 성과 루틴만큼 중요하게 두세요.",
  },
};

function createDays(month: string): string[] {
  const monthNumber = Number(month || "1");
  const max = [1, 3, 5, 7, 8, 10, 12].includes(monthNumber)
    ? 31
    : [4, 6, 9, 11].includes(monthNumber)
      ? 30
      : 29;
  return Array.from({ length: max }, (_, idx) => String(idx + 1).padStart(2, "0"));
}

function toText(value: unknown): string {
  return String(value || "").trim();
}

function getCardImageUrl(cardId?: number): string {
  const file = Number.isFinite(Number(cardId)) ? TAROT_IMAGE_MAP[Number(cardId)] : "";
  return `/tarot-cards/${file || "thefool.webp"}`;
}

function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set(["오늘", "이번", "어떻게", "될까요", "해주세요", "저의", "나의", "그리고", "대한", "관련", "문제", "고민"]);
  const words = (question || "")
    .toLowerCase()
    .match(/[가-힣a-zA-Z0-9]{2,}/g) || [];

  const unique: string[] = [];
  for (const word of words) {
    if (stopWords.has(word)) continue;
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique;
}

export default function NumerologyTarotClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const screenRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [topic, setTopic] = useState<TopicKey>("love");
  const [question, setQuestion] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [numerology, setNumerology] = useState<NumerologyContext | null>(null);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse["interpretation"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lifeData = useMemo(() => {
    const key = Number(numerology?.lifePathNumber || 0);
    return NUMEROLOGY_DATA[key as keyof typeof NUMEROLOGY_DATA] || null;
  }, [numerology]);

  const questionKeywords = useMemo(() => extractQuestionKeywords(question), [question]);

  const freeProfile = useMemo<FreeProfile | null>(() => {
    const lifePath = Number(numerology?.lifePathNumber || 0);
    if (!lifePath) return null;
    const base = FREE_TALENT_MAP[lifePath] || FREE_TALENT_MAP[(lifePath % 9) || 9] || FREE_TALENT_MAP[9];
    const topicFocusMap: Record<TopicKey, string> = {
      love: "지금 관계의 온도와 진심을 읽는 흐름에 맞춘 해석입니다.",
      reunion: "끊어진 인연의 잔향과 재연결 가능성을 함께 봅니다.",
      feelings: "상대의 표면과 내면이 얼마나 다른지까지 함께 봅니다.",
      career: "역할, 성장, 성과 흐름이 어디에 모이는지 중심으로 읽습니다.",
      money: "수입, 지출, 기회 포착의 리듬을 기준으로 풀어냅니다.",
      general: "지금 전체 운의 방향과 실행 우선순위를 함께 보는 기준입니다.",
    };

    return {
      headline: `${lifeData?.keyword || "핵심 기질"}을 중심으로 한 무료 상세 리포트`,
      summary: `생명수 ${numerology.lifePathNumber}와 현재 선택한 ${TOPIC_LABELS[topic]} 흐름을 합쳐, 무료로 읽을 수 있는 영역을 최대한 넓혀 정리했습니다.`,
      cards: [
        { title: "타고난 성향", value: base.trait },
        { title: "핵심 강점", value: base.strength },
        { title: "보완 포인트", value: base.shadow },
        { title: "적성 영역", value: base.aptitude.join(" / ") },
        { title: "연애/관계", value: base.love },
        { title: "일/커리어", value: base.work },
        { title: "금전 흐름", value: base.money },
        { title: "대인/협업", value: base.relationship },
        { title: "회복 포인트", value: base.recovery },
        { title: "오늘의 실행", value: base.action },
        { title: "주의 신호", value: base.caution },
        { title: "타로 연결", value: base.cardBridge },
        { title: "주제 초점", value: topicFocusMap[topic] },
      ],
    };
  }, [lifeData?.keyword, numerology, topic]);

  const dayOptions = useMemo(() => createDays(birthMonth), [birthMonth]);

  const activeStep = useMemo(() => {
    if (reading) return 3;
    if (cards.length && revealed.length === cards.length) return 2;
    if (cards.length) return 1;
    return 0;
  }, [cards.length, reading, revealed.length]);

  const revealProgress = `${Math.min(revealed.length, 3)}/3`;

  const readingEnabled = cards.length > 0 && revealed.length === cards.length;

  useEffect(() => {
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [y, m, d] = birthDate.split("-");
      setBirthYear(y);
      setBirthMonth(m);
      setBirthDay(d);
    }
  }, [birthDate]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      setBirthDate(`${birthYear}-${birthMonth}-${birthDay}`);
    }
  }, [birthDay, birthMonth, birthYear]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    if (typeof document === "undefined") return;
    const root = screenRef.current;
    if (!root) return;
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      showToast("브라우저 정책으로 전체화면 전환이 제한되었습니다.", "error");
    }
  }

  function startDraw() {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }

    const context = buildNumerologyContext({
      birthDate,
      topic,
    }) as NumerologyContext;

    const selected = selectCards({
      birthDate,
      topic,
      name,
      numerology: context,
    }) as DrawnCard[];

    setNumerology(context);
    setCards(selected);
    setReading(null);
    setError("");
    setRevealed([]);
  }

  function revealCard(index: number) {
    if (revealed.includes(index)) return;
    setRevealed((prev) => [...prev, index]);
  }

  async function requestReading() {
    const res = await authFetch("/api/tarot/numerology-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: toText(name),
        birthDate,
        topic,
        question: toText(question),
        questionKeywords,
        numerology,
        cards,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ReadingResponse;
    if (!res.ok || !data?.ok || !data?.interpretation) {
      throw new Error(data?.message || "리딩 생성에 실패했습니다.");
    }
    setReading(data.interpretation);
  }

  async function payAndRead() {
    if (!cards.length || !numerology) {
      setError("먼저 카드 뽑기를 진행해 주세요.");
      return;
    }
    if (revealed.length < cards.length) {
      setError("카드 3장을 모두 열어야 해석을 볼 수 있습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-numerology-reading",
        reason: "수비학 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-numerology-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: async ({ chargedCoins, requiredCoins, balanceAfter }) => {
          await requestReading();
          if (chargedCoins <= 0 && requiredCoins > 0) {
            showSubscriptionIncludedNotice({
              message: "구독 혜택이 적용되어 코인이 차감되지 않았습니다.",
              reason: "수비학 타로 리딩",
            });
            return;
          }
          if (chargedCoins > 0) {
            showToast(`수비학 타로 리딩 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setError(`코인이 부족합니다. ${paymentResult.requiredCoins}코인이 필요합니다.`);
          return;
        }
        setError(paymentResult.message || "코인 결제에 실패했습니다.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "리딩 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main ref={screenRef} className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <strong className={styles.brand}>수비학 타로</strong>
          <nav className={styles.topNav} aria-label="수비학 타로 메뉴">
            <button type="button">홈</button>
            <button type="button">리딩하기</button>
            <button type="button">나의 리딩</button>
            <button type="button">숫자 해석</button>
            <button type="button">타로 가이드</button>
            <button type="button">프리미엄</button>
          </nav>
          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={() => router.push("/index.html")}>메인으로</button>
            <button type="button" className={styles.lightBtn} onClick={toggleFullscreen}>{isFullscreen ? "전체화면 해제" : "전체화면"}</button>
          </div>
        </header>

        <section className={styles.heroGrid}>
          <div className={styles.mainPanel}>
            <h1 className={styles.title}>수비학 타로</h1>
            <p className={styles.subtitle}>숫자와 카드가 들려주는 운명의 메시지</p>

            <div className={styles.stepRail}>
              {STEP_LABELS.map((label, idx) => (
                <div key={label} className={`${styles.stepItem} ${activeStep >= idx ? styles.stepActive : ""}`}>
                  {idx + 1}. {label}
                </div>
              ))}
            </div>

            <div className={styles.stage}>
              <section className={styles.formCard}>
                <h2 className={styles.formTitle}>당신에 대해 알려주세요</h2>

                <div className={styles.topicTabs}>
                  {TOPIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.topicTab} ${topic === option.value ? styles.topicTabActive : ""}`}
                      onClick={() => setTopic(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>이름 (선택)</span>
                    <input
                      className={styles.input}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="이름"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>출생연도</span>
                    <select
                      className={styles.select}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                    >
                      <option value="">연도</option>
                      {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>월</span>
                    <select
                      className={styles.select}
                      value={birthMonth}
                      onChange={(event) => {
                        setBirthMonth(event.target.value);
                        setBirthDay("");
                      }}
                    >
                      <option value="">월</option>
                      {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>일</span>
                    <select
                      className={styles.select}
                      value={birthDay}
                      onChange={(event) => setBirthDay(event.target.value)}
                    >
                      <option value="">일</option>
                      {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>질문 (선택)</span>
                    <input
                      className={styles.input}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="예: 오늘 이 관계의 흐름은 어떻게 전개될까요?"
                    />
                  </label>
                </div>

                <div className={styles.actions} style={{ marginTop: 12 }}>
                  <button type="button" onClick={startDraw} className={styles.mainBtn}>리딩 시작하기 ✦</button>
                  <button type="button" onClick={payAndRead} disabled={!readingEnabled || loading || isPaying} className={styles.lightBtn}>
                    {loading || isPaying ? "결제/리딩 진행 중..." : "해석 보기 (30코인)"}
                  </button>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}
              </section>

              <section className={styles.stageVisual}>
                <div className={styles.moon} aria-hidden="true" />
                <div className={styles.wheel} aria-hidden="true">
                  <div className={styles.orbitCenter}>☾</div>
                </div>

                <div className={styles.previewSpread}>
                  {(cards.length ? cards : PREVIEW_PLACEHOLDERS).map((entry, idx) => {
                    const isRealCard = "card" in entry;
                    const isOpen = revealed.includes(idx);
                    return (
                      <button
                        type="button"
                        key={isRealCard ? `${entry.card.id}-${idx}` : `${entry.title}-${idx}`}
                        className={`${styles.previewCard} ${isRealCard && !isOpen ? styles.previewCardLocked : ""}`}
                        onClick={() => {
                          if (isRealCard) revealCard(idx);
                        }}
                      >
                        {isRealCard ? (
                          isOpen ? (
                            <>
                              <p className={styles.previewPosition}>{entry.positionLabel}</p>
                              <div className={styles.previewCardImageWrap}>
                                <Image
                                  src={getCardImageUrl(entry.card.id)}
                                  alt={entry.card.nameKr || entry.card.name}
                                  width={158}
                                  height={248}
                                  className={styles.previewCardImage}
                                />
                              </div>
                              <p className={styles.previewName}>{entry.card.nameKr || entry.card.name}</p>
                              <p className={styles.previewMeta}>{entry.orientation === "reversed" ? "역방향" : "정방향"}</p>
                            </>
                          ) : (
                            <span>OPEN</span>
                          )
                        ) : (
                          <>
                            <p className={styles.previewPosition}>{entry.title}</p>
                            <div style={{ fontSize: 30 }}>{entry.icon}</div>
                            <p className={styles.previewMeta}>카드 대기</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {numerology ? (
              <section className={styles.infoRail}>
                <article className={styles.infoItem}>
                  <h4>생명수</h4>
                  <p>{numerology.lifePathNumber} · {lifeData?.keyword || "핵심 파동"}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>개인수</h4>
                  <p>{numerology.personalDayNumber} · 오늘의 흐름</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>질문수</h4>
                  <p>{numerology.questionNumber} · {numerology.topicLabel}</p>
                </article>
                <article className={styles.infoItem}>
                  <h4>해석 키워드</h4>
                  <p>{lifeData?.meaning || "이번 흐름은 정리와 재배치가 핵심입니다."}</p>
                </article>
              </section>
            ) : null}

            {numerology && freeProfile ? (
              <section className={styles.freeProfileCard}>
                <h3>{freeProfile.headline}</h3>
                <p className={styles.freeProfileLead}>
                  {freeProfile.summary}
                </p>
                <div className={styles.freeProfileGrid}>
                  {freeProfile.cards.map((item) => (
                    <article key={item.title} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      <p>{item.value}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {reading ? (
              <section className={styles.resultCard}>
                <h3>수비학 타로 해석</h3>
                <p style={{ color: "rgba(247, 241, 225, 0.9)", lineHeight: 1.7 }}>{reading.numerologyReading}</p>
                <p style={{ marginTop: 8, color: "#f4dca5" }}>핵심 메시지: {reading.coreMessage}</p>
                {questionKeywords.length ? (
                  <p className={styles.keywordLine}>질문 키워드 초점: {questionKeywords.join(" · ")}</p>
                ) : null}

                <div className={styles.resultGrid}>
                  {reading.cardReadings.map((item, idx) => (
                    <article key={`${item.title}-${idx}`} className={styles.resultBox}>
                      <h4>{item.title}</h4>
                      {item.keywordFocus ? <p className={styles.keywordChip}>키워드: {item.keywordFocus}</p> : null}
                      <p>{item.interpretation}</p>
                      {item.actionTip ? <p className={styles.actionTip}>실행 팁: {item.actionTip}</p> : null}
                    </article>
                  ))}
                </div>

                <div className={styles.resultGrid} style={{ marginTop: 10 }}>
                  <article className={styles.resultBox}>
                    <h4>흐름 요약</h4>
                    <p>{reading.conclusion.summary}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>지금 실행할 것</h4>
                    <p>{reading.conclusion.doThis.join(" / ")}</p>
                  </article>
                  <article className={styles.resultBox}>
                    <h4>피할 것</h4>
                    <p>{reading.conclusion.avoidThis.join(" / ")}</p>
                  </article>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.sidePanel}>
            <div className={styles.sideTitle}>
              <h3>MOBILE READING PREVIEW</h3>
              <p>간결하고 몰입감 있는 모바일 리딩 동행</p>
            </div>

            <div className={styles.phoneGrid}>
              <article className={styles.phone}>
                <h4>1. 정보 입력</h4>
                <div className={styles.miniField}>이름: {name || "이름"}</div>
                <div className={styles.miniField}>생년월일: {birthDate || "YYYY-MM-DD"}</div>
                <div className={styles.miniField}>주제: {TOPIC_LABELS[topic]}</div>
                <div className={styles.miniField}>질문: {question || "질문을 입력하세요"}</div>
              </article>

              <article className={styles.phone}>
                <h4>2. 타로 뽑기</h4>
                <div className={styles.miniCardStack}>
                  {[0, 1, 2].map((idx) => {
                    const picked = cards[idx];
                    const open = revealed.includes(idx);
                    return (
                      <div key={`mini-card-${idx}`} className={styles.miniCard}>
                        {picked ? (
                          open ? (
                            <Image
                              src={getCardImageUrl(picked.card.id)}
                              alt={picked.card.nameKr || picked.card.name}
                              width={70}
                              height={112}
                              className={styles.miniCardImage}
                            />
                          ) : "🂠"
                        ) : "🂠"}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.miniField}>공개 진행률: {revealProgress}</div>
                <div className={styles.miniField}>결제 준비: {readingEnabled ? "완료" : "카드 공개 필요"}</div>
              </article>

              <article className={styles.phone}>
                <h4>3. 결과 확인</h4>
                <div className={styles.statPill}>생명수: {numerology?.lifePathNumber ?? "-"}</div>
                <div className={styles.statPill}>개인수: {numerology?.personalDayNumber ?? "-"}</div>
                <div className={styles.statPill}>질문수: {numerology?.questionNumber ?? "-"}</div>
                <div className={styles.miniField}>{reading?.coreMessage || "결과가 준비되면 핵심 메시지가 표시됩니다."}</div>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
