"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  BatteryLow,
  Cloud,
  CloudRain,
  Coins,
  Download,
  Heart,
  Moon,
  Share2,
  Smile,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  buildYeonHeartStarReading,
  sanitizeYeonHeartStarText,
  type YeonHeartStarReading,
  validateYeonHeartStarReading,
} from "@/lib/yeon/heartStarReading";
import {
  fetchCurrentDestinyProfile,
  isDestinyProfileStorageKey,
  readCurrentDestinyProfile,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";
import { authFetch } from "@/app/_lib/auth-client";
import {
  buildYeonAstroRequestFromProfile,
  buildYeonAstroSignal,
  isYeonZodiacSign,
  type YeonAstroSignal,
} from "@/lib/yeon/astroSignal";
import { getYeonSpriteFrame } from "@/lib/yeon/yeonSpriteMood";

const YEON_STAR_HUG_TEXT_TRANSLATIONS = {
  ko: {
    "yeonStar.label.001": "행복해",
    "yeonStar.label.002": "편안해",
    "yeonStar.label.003": "지쳤어",
    "yeonStar.label.004": "걱정돼",
    "yeonStar.label.005": "설레어",
    "yeonStar.label.006": "우울해",
    "yeonStar.label.007": "태양의 날",
    "yeonStar.label.008": "달의 날",
    "yeonStar.label.009": "화성의 날",
    "yeonStar.label.010": "수성의 날",
    "yeonStar.label.011": "목성의 날",
    "yeonStar.label.012": "금성의 날",
    "yeonStar.label.013": "토성의 날",
    "yeonStar.label.014": "신월(New Moon)",
    "yeonStar.label.015": "초승(Waxing Crescent)",
    "yeonStar.label.016": "상현(First Quarter)",
    "yeonStar.label.017": "차는달(Waxing Gibbous)",
    "yeonStar.label.018": "망(Full Moon)",
    "yeonStar.label.019": "기울달(Waning Gibbous)",
    "yeonStar.label.020": "하현(Last Quarter)",
    "yeonStar.label.021": "그믐(Waning Crescent)",
    "yeonStar.label.022": "합(0°)",
    "yeonStar.label.023": "육분(60°)",
    "yeonStar.label.024": "직각(90°)",
    "yeonStar.label.025": "삼분(120°)",
    "yeonStar.label.026": "대립(180°)",
    "yeonStar.label.027": "중립 각도",
    "yeonStar.label.028": "동일 원소 공명",
    "yeonStar.label.029": "상보 원소 시너지",
    "yeonStar.label.030": "긴장 원소 조율",
    "yeonStar.aria-label.001": "연이의 마음 카드 SVG",
    "yeonStar.text.001": "YEON CHEER CARD",
    "yeonStar.text.002": "연이의 응원 카드",
    "yeonStar.text.003": "연이의 스프라이트 컷",
    "yeonStar.text.004": "연이가 전하는 오늘의 한 문장",
    "yeonStar.text.005": "오늘의 행운 상징",
    "yeonStar.text.006": "연이의 응원은 짧고 선명하게, 너의 오늘을 지켜줄 거야.",
    "yeonStar.text.007": "Code Destiny · Yeon Cheer Card",
    "yeonStar.title.001": "연이의 마음 별자리",
    "yeonStar.title.002": "연이의 마음 별자리",
    "yeonStar.alt.001": "연이의 마음 별자리 아트",
    "yeonStar.placeholder.001": "예: 연이",
    "yeonStar.aria-label.002": "별자리 선택",
    "yeonStar.placeholder.002": "예: 요즘 만나는 사람과 계속 어긋나는 것 같아 답답해요. 또는 돈을 모으고 싶은데 지출 통제가 안 돼서 고민이에요.",
    "yeonStar.aria-label.003": "고민 입력",
    "yeonStar.aria-label.004": "SVG 행운 상징 카드 미리보기",
    "yeonStar.aria-label.005": "기능 요약 배지",
  },
} as const;

function yeonStarHugText(key: keyof typeof YEON_STAR_HUG_TEXT_TRANSLATIONS.ko) {
  return YEON_STAR_HUG_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

type EmotionKey = "happy" | "calm" | "tired" | "worried" | "flutter" | "blue";
type ZodiacSign =
  | "양자리"
  | "황소자리"
  | "쌍둥이자리"
  | "게자리"
  | "사자자리"
  | "처녀자리"
  | "천칭자리"
  | "전갈자리"
  | "사수자리"
  | "염소자리"
  | "물병자리"
  | "물고기자리";

type EmotionOption = {
  key: EmotionKey;
  label: string;
  Icon: LucideIcon;
  tone: string;
};

type ConcernCategory = "love" | "work" | "money" | "family" | "health" | "self" | "legal";

type ConcernDomain =
  | "career"
  | "study"
  | "social"
  | "romance"
  | "familyCare"
  | "finance"
  | "wellness"
  | "growth"
  | "legal";

type ConcernAnalysis = {
  weights: Record<ConcernCategory, number>;
  topCategory: ConcernCategory;
  topKeywords: string[];
  topDomain: ConcernDomain;
  domainKeywords: string[];
};

type MoonSnapshot = {
  age: number;
  illumination: number;
  phaseKey: string;
  label: string;
  scoreBias: { overall: number; love: number; money: number };
};

type AspectSnapshot = {
  distance: number;
  label: string;
  summary: string;
  scoreBias: number;
};

type DayRulerSnapshot = {
  label: string;
  summary: string;
  scoreBias: { overall: number; love: number; money: number };
};

type ConsultationResult = {
  recipientLabel: string;
  sign: ZodiacSign;
  period: string;
  overall: number;
  love: number;
  money: number;
  luckyItem: string;
  warmMessage: string;
  practicalTip: string;
  detailedForecast: string[];
  actionPlan: string[];
  astroEvidence: string[];
  keywordSupportLines: string[];
  concernReasoning: string[];
  resilienceMessage: string;
  concernCategory: ConcernCategory;
  concernDomain: ConcernDomain;
  concernCategoryLabel: string;
  concernDomainLabel: string;
  concernKeywords: string[];
  todaySunSign: ZodiacSign;
  moon: MoonSnapshot;
  aspect: AspectSnapshot;
  dayRuler: DayRulerSnapshot;
  astroSignal?: YeonAstroSignal | null;
};

type ProfileSeed = {
  name: string;
  birthDateInput: string;
  birthTimeInput: string;
  source: "profile" | "auth" | "none";
};

type HeartSymbolId = "clover" | "moonStar" | "lotus" | "goldKey" | "butterfly" | "comet";

type HeartSymbol = {
  id: HeartSymbolId;
  name: string;
  meaning: string;
  whisper: string;
};

const HERO_IMAGE = "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp";
const SPRITE_SHEET =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";
const SPRITE_CELL_SIZE = 362;
const SPRITE_GRID_COLS = 4;
const SPRITE_GRID_ROWS = 3;
const SPRITE_IMAGE_WIDTH = SPRITE_CELL_SIZE * SPRITE_GRID_COLS;
const SPRITE_IMAGE_HEIGHT = SPRITE_CELL_SIZE * SPRITE_GRID_ROWS;

const EMOTIONS: EmotionOption[] = [
  { key: "happy", label: yeonStarHugText("yeonStar.label.001"), Icon: Smile, tone: "from-pink-300 to-orange-200" },
  { key: "calm", label: yeonStarHugText("yeonStar.label.002"), Icon: Cloud, tone: "from-cyan-200 to-purple-200" },
  { key: "tired", label: yeonStarHugText("yeonStar.label.003"), Icon: BatteryLow, tone: "from-amber-200 to-rose-200" },
  { key: "worried", label: yeonStarHugText("yeonStar.label.004"), Icon: CloudRain, tone: "from-blue-200 to-purple-200" },
  { key: "flutter", label: yeonStarHugText("yeonStar.label.005"), Icon: Sparkles, tone: "from-pink-200 to-fuchsia-200" },
  { key: "blue", label: yeonStarHugText("yeonStar.label.006"), Icon: Moon, tone: "from-indigo-200 to-blue-200" },
];

const EMOTION_LABEL: Record<EmotionKey, string> = {
  happy: "행복",
  calm: "편안",
  tired: "피로",
  worried: "걱정",
  flutter: "설렘",
  blue: "우울",
};

const ZODIAC_SIGNS: Array<{ sign: ZodiacSign; period: string; mmddStart: number; mmddEnd: number }> = [
  { sign: "양자리", period: "3.21 - 4.19", mmddStart: 321, mmddEnd: 419 },
  { sign: "황소자리", period: "4.20 - 5.20", mmddStart: 420, mmddEnd: 520 },
  { sign: "쌍둥이자리", period: "5.21 - 6.21", mmddStart: 521, mmddEnd: 621 },
  { sign: "게자리", period: "6.22 - 7.22", mmddStart: 622, mmddEnd: 722 },
  { sign: "사자자리", period: "7.23 - 8.22", mmddStart: 723, mmddEnd: 822 },
  { sign: "처녀자리", period: "8.23 - 9.23", mmddStart: 823, mmddEnd: 923 },
  { sign: "천칭자리", period: "9.24 - 10.22", mmddStart: 924, mmddEnd: 1022 },
  { sign: "전갈자리", period: "10.23 - 11.22", mmddStart: 1023, mmddEnd: 1122 },
  { sign: "사수자리", period: "11.23 - 12.24", mmddStart: 1123, mmddEnd: 1224 },
  { sign: "염소자리", period: "12.25 - 1.19", mmddStart: 1225, mmddEnd: 119 },
  { sign: "물병자리", period: "1.20 - 2.18", mmddStart: 120, mmddEnd: 218 },
  { sign: "물고기자리", period: "2.19 - 3.20", mmddStart: 219, mmddEnd: 320 },
];

const ZODIAC_INDEX: Record<ZodiacSign, number> = {
  양자리: 0,
  황소자리: 1,
  쌍둥이자리: 2,
  게자리: 3,
  사자자리: 4,
  처녀자리: 5,
  천칭자리: 6,
  전갈자리: 7,
  사수자리: 8,
  염소자리: 9,
  물병자리: 10,
  물고기자리: 11,
};

const ZODIAC_PROFILE: Record<ZodiacSign, { element: "불" | "흙" | "바람" | "물"; modality: "활동" | "고정" | "변동"; ruler: string }> = {
  양자리: { element: "불", modality: "활동", ruler: "화성" },
  황소자리: { element: "흙", modality: "고정", ruler: "금성" },
  쌍둥이자리: { element: "바람", modality: "변동", ruler: "수성" },
  게자리: { element: "물", modality: "활동", ruler: "달" },
  사자자리: { element: "불", modality: "고정", ruler: "태양" },
  처녀자리: { element: "흙", modality: "변동", ruler: "수성" },
  천칭자리: { element: "바람", modality: "활동", ruler: "금성" },
  전갈자리: { element: "물", modality: "고정", ruler: "명왕성/화성" },
  사수자리: { element: "불", modality: "변동", ruler: "목성" },
  염소자리: { element: "흙", modality: "활동", ruler: "토성" },
  물병자리: { element: "바람", modality: "고정", ruler: "천왕성/토성" },
  물고기자리: { element: "물", modality: "변동", ruler: "해왕성/목성" },
};

const EMOTION_OPENING: Record<EmotionKey, string> = {
  happy: "와, 오늘 네 마음빛이 분명 밝게 반짝였어.",
  calm: "지금의 고요함, 사실 아주 큰 힘이야.",
  tired: "오늘까지 버틴 것만으로도 이미 충분히 잘했어.",
  worried: "걱정이 많다는 건 그만큼 진심이라는 뜻이야.",
  flutter: "설렘은 네 안의 방향 감각이 살아 있다는 신호야.",
  blue: "괜찮지 않은 날도 괜찮아, 연이가 옆에 있을게.",
};

const EMOTION_BIAS: Record<EmotionKey, { overall: number; love: number; money: number }> = {
  happy: { overall: 0.7, love: 0.5, money: 0.2 },
  calm: { overall: 0.4, love: 0.3, money: 0.3 },
  tired: { overall: -0.4, love: 0.1, money: -0.2 },
  worried: { overall: -0.3, love: -0.1, money: 0.1 },
  flutter: { overall: 0.6, love: 0.8, money: 0 },
  blue: { overall: -0.5, love: 0.2, money: -0.3 },
};

const CATEGORY_LABEL: Record<ConcernCategory, string> = {
  love: "연애/관계",
  work: "일/학업",
  money: "금전/재정",
  family: "가족",
  health: "건강/멘탈",
  self: "자기확신",
  legal: "법률/분쟁",
};

const DOMAIN_LABEL: Record<ConcernDomain, string> = {
  career: "직업/커리어",
  study: "학업/시험",
  social: "대인관계",
  romance: "연애관계",
  familyCare: "가족관계",
  finance: "재정관리",
  wellness: "건강회복",
  growth: "자기성장",
  legal: "법률/절차",
};

const KEYWORD_DICT: Record<ConcernCategory, string[]> = {
  love: ["연애", "사랑", "썸", "이별", "고백", "데이트", "남친", "여친", "관계", "호감", "권태기", "재회", "연락", "답장", "소개팅"],
  work: ["회사", "직장", "업무", "프로젝트", "면접", "이직", "커리어", "팀장", "상사", "동료", "성과", "평가", "승진", "퇴사", "마감", "회의"],
  money: ["돈", "재정", "지출", "저축", "투자", "월급", "카드값", "대출", "수입", "적금", "비상금", "예산", "소비", "빚", "부업"],
  family: ["가족", "부모", "엄마", "아빠", "형제", "자매", "집안", "육아", "부부", "배우자", "친척", "갈등", "돌봄", "집안일"],
  health: ["건강", "수면", "잠", "피곤", "우울", "불안", "스트레스", "두통", "몸", "번아웃", "무기력", "호흡", "회복", "식습관", "운동", "소화"],
  self: ["미래", "진로", "선택", "결정", "자존감", "자신감", "목표", "불확실", "정체성", "의미", "방향", "성장", "동기", "집중"],
  legal: ["송사", "소송", "법률", "법적", "분쟁", "고소", "고발", "재판", "합의", "조정", "중재", "판결", "변호사", "법원"],
};

const DOMAIN_RULES: Array<{ domain: ConcernDomain; category: ConcernCategory; weight: number; keywords: string[] }> = [
  { domain: "career", category: "work", weight: 1.35, keywords: ["이직", "승진", "연봉", "성과평가", "퇴사", "커리어", "인사", "직무", "직장"] },
  { domain: "study", category: "work", weight: 1.3, keywords: ["공부", "시험", "수능", "자격증", "과제", "학점", "강의", "입시", "논문"] },
  { domain: "social", category: "love", weight: 1.2, keywords: ["인간관계", "친구", "동료", "소통", "오해", "갈등", "거리감", "눈치", "대화"] },
  { domain: "romance", category: "love", weight: 1.4, keywords: ["썸", "연애", "이별", "재회", "고백", "권태기", "데이트", "연락", "호감"] },
  { domain: "familyCare", category: "family", weight: 1.45, keywords: ["가족", "부모", "육아", "부부", "배우자", "형제", "자매", "집안", "돌봄"] },
  { domain: "finance", category: "money", weight: 1.45, keywords: ["저축", "투자", "소비", "지출", "부채", "대출", "카드값", "예산", "월급"] },
  { domain: "wellness", category: "health", weight: 1.5, keywords: ["불안", "우울", "번아웃", "수면", "피로", "무기력", "스트레스", "두통", "건강"] },
  { domain: "growth", category: "self", weight: 1.2, keywords: ["진로", "자존감", "자신감", "방향", "목표", "선택", "동기", "정체성", "미래"] },
  { domain: "legal", category: "legal", weight: 1.65, keywords: ["송사", "소송", "법률", "법적", "고소", "고발", "재판", "합의", "법원", "변호사"] },
];

const FUZZY_KEYWORD_RULES: Array<{ category: ConcernCategory; domain: ConcernDomain; weight: number; synonyms: string[] }> = [
  { category: "money", domain: "finance", weight: 1.6, synonyms: ["재물", "금전", "생활비", "경제", "고정비", "카드", "대출", "빚", "부채", "월세", "전세", "지갑", "돈관리"] },
  { category: "love", domain: "romance", weight: 1.5, synonyms: ["연애", "사랑", "썸", "호감", "고백", "소개팅", "애인", "연락", "답장", "권태", "재회"] },
  { category: "love", domain: "social", weight: 1.3, synonyms: ["인간관계", "대인관계", "친구", "동료", "갈등", "오해", "소통", "거리감", "눈치"] },
  { category: "work", domain: "career", weight: 1.7, synonyms: ["이직", "직장", "회사", "퇴사", "상사", "면접", "연봉", "커리어", "승진", "직무", "출근"] },
  { category: "work", domain: "study", weight: 1.4, synonyms: ["학업", "공부", "시험", "수능", "자격증", "과제", "학점", "입시"] },
  { category: "family", domain: "familyCare", weight: 1.55, synonyms: ["부모", "부모님", "엄마", "아빠", "가족", "형제", "자매", "배우자", "부부", "육아", "자녀"] },
  { category: "health", domain: "wellness", weight: 1.45, synonyms: ["건강", "스트레스", "수면", "잠", "피곤", "무기력", "번아웃", "우울", "불안", "회복"] },
  { category: "self", domain: "growth", weight: 1.3, synonyms: ["미래", "진로", "정체성", "자존감", "자신감", "선택", "방향", "동기", "목표"] },
  { category: "legal", domain: "legal", weight: 1.85, synonyms: ["송사", "소송", "법률", "법적분쟁", "분쟁", "재판", "법원", "판결", "합의", "조정", "중재", "변호사", "법무"] },
];

const GENERAL_CONCERN_SAMPLES: string[] = [
  "요즘 만나는 사람과 계속 어긋나는 것 같아 답답해요. 어떻게 하면 좋을까요?",
  "직장 동료와의 관계가 불편해서 매일 출근하는 게 스트레스예요.",
  "돈을 모으고 싶은데 지출 통제가 안 돼서 고민이에요. 좋은 방법이 있을까요?",
  "요즘따라 인간관계에 회의감이 들고 다 부질없게 느껴져요.",
];

const DOMAIN_TIP: Record<ConcernDomain, string> = {
  career: "커리어는 감정 결정보다 데이터 기반 우선순위가 결과를 지켜줘.",
  study: "학업은 완벽한 계획보다 오늘 1블록 실행이 성과를 만든다.",
  social: "대인관계는 해석보다 확인 질문 한 줄이 오해를 줄여줘.",
  romance: "연애는 결론 서두르기보다 감정 온도 조율이 먼저야.",
  familyCare: "가족관계는 해결보다 공감 문장 1개가 분위기를 바꿔줘.",
  finance: "재정은 즉시 결제 지연 10분만으로 판단 정확도가 올라가.",
  wellness: "건강회복은 생산성보다 리듬 복구를 우선해야 오래 간다.",
  growth: "자기성장은 비교보다 오늘의 작은 진전 기록이 핵심이야.",
  legal: "법률 이슈는 절차와 기록을 차분히 쌓을수록 유리해져. 작은 준비가 결국 판을 바꿔줘.",
};

const LETTER_TOPIC_BY_DOMAIN: Record<ConcernDomain, string[]> = {
  career: [
    "업무 우선순위를 정리하고 에너지를 보호하는 주제",
    "성과 압박 속에서도 마음의 중심을 지키는 주제",
    "커리어 방향을 조급하지 않게 다듬는 주제",
  ],
  study: [
    "시험과 학습 리듬을 안정적으로 회복하는 주제",
    "집중력의 파동을 다정하게 관리하는 주제",
    "결과보다 학습 루틴을 단단히 만드는 주제",
  ],
  social: [
    "대화의 온도와 관계 경계를 균형 있게 맞추는 주제",
    "오해를 줄이고 마음을 안전하게 표현하는 주제",
    "관계 피로를 줄이며 연결을 회복하는 주제",
  ],
  romance: [
    "연애 감정의 속도를 조율하며 신뢰를 쌓는 주제",
    "설렘과 불안을 건강하게 다루는 주제",
    "관계 기대치와 현실 호흡을 맞추는 주제",
  ],
  familyCare: [
    "가족 관계에서 감정 소진을 줄이는 주제",
    "돌봄과 자기보호의 균형을 세우는 주제",
    "가족 대화의 충돌을 완화하는 주제",
  ],
  finance: [
    "지출 판단을 차분하게 재정렬하는 주제",
    "불안 소비를 줄이고 안정감을 회복하는 주제",
    "현실적 재정 루틴을 재건하는 주제",
  ],
  wellness: [
    "마음과 몸의 회복 속도를 맞추는 주제",
    "긴장 해소와 수면 리듬을 되찾는 주제",
    "지친 감정에 안전한 휴식 공간을 만드는 주제",
  ],
  growth: [
    "자기확신을 무리 없이 복원하는 주제",
    "방향성 혼란 속에서도 기준을 세우는 주제",
    "작은 성장을 장기 흐름으로 연결하는 주제",
  ],
  legal: [
    "절차 중심으로 불안을 관리하는 주제",
    "기록과 증빙을 통해 주도권을 회복하는 주제",
    "법적 이슈에서 감정 소모를 줄이는 주제",
  ],
};

const LETTER_CARE_BY_EMOTION: Record<EmotionKey, string[]> = {
  happy: [
    "밝은 에너지가 높아도 속도를 조절하시면 실수가 줄어듭니다.",
    "좋은 기운이 들어오는 날일수록 우선순위 1개에 집중하시면 더 안정적입니다.",
  ],
  calm: [
    "고요한 집중력이 강점이니 오늘 결정을 서두르지 않으셔도 충분합니다.",
    "차분함이 큰 자산이니, 현재의 리듬을 유지하는 것만으로도 좋은 흐름입니다.",
  ],
  tired: [
    "피로 신호가 뚜렷하니 성과보다 회복 루틴을 먼저 두시는 것이 정확합니다.",
    "지친 날에는 판단 기준을 단순화하시면 마음 부담이 훨씬 줄어듭니다.",
  ],
  worried: [
    "걱정이 클수록 확인 가능한 사실부터 정리하시면 불안이 빠르게 낮아집니다.",
    "불확실성에 마음이 흔들릴 때는 결론보다 질문 정리가 먼저입니다.",
  ],
  flutter: [
    "설렘이 큰 시기일수록 관계와 일정의 균형을 함께 잡으시면 더 오래 갑니다.",
    "기대감이 높아도 한 걸음씩 확인하시면 좋은 결과를 안정적으로 만들 수 있습니다.",
  ],
  blue: [
    "감정 에너지가 낮은 날이니 자신을 다그치지 않으시는 선택이 가장 현명합니다.",
    "우울감이 올라올 때는 해야 할 일의 양보다 회복 가능한 리듬이 우선입니다.",
  ],
};

const LETTER_CLOSING_POOL: string[] = [
  "오늘도 충분히 잘하고 계십니다. 느리더라도 멈추지 않으시면 흐름은 반드시 회복됩니다.",
  "완벽하지 않아도 괜찮습니다. 작은 실행 한 가지가 내일의 안정감을 크게 만들어드립니다.",
  "마음이 흔들리는 날에도 기준을 지키고 계신 점이 이미 큰 강점입니다. 저는 끝까지 응원합니다.",
];

function formatRecipientLabel(name: string) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "소중한 당신";
  const withoutHonorific = trimmed.replace(/님$/u, "").trim();
  return withoutHonorific ? `${withoutHonorific}님` : "소중한 당신";
}

function pickBySeed<T>(items: T[], seed: string): T {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("pickBySeed requires a non-empty array");
  }
  let hash = 0;
  const text = String(seed || "seed");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

const LUCKY_ITEM_BY_CATEGORY: Record<ConcernCategory, string[]> = {
  love: ["장미향 립밤", "파스텔 메모카드", "작은 향수 샘플", "하트 북마크"],
  work: ["타이머 위젯", "라인 노트", "포스트잇 세트", "짧은 집중 플레이리스트"],
  money: ["소비 기록 스티커", "황금 흐름 저널", "지출 체크 알람", "예산 카드지갑"],
  family: ["따뜻한 차 티백", "안부 메모", "가족 캘린더", "작은 포토키링"],
  health: ["수면 안대", "라벤더 캔들", "호흡 타이머", "물병 리마인더"],
  self: ["확언 노트", "한줄 일기 카드", "내면 정렬 리추얼 카드", "작은 목표 체크표"],
  legal: ["타임라인 정리 노트", "증빙 보관 파일", "체크리스트 메모패드", "상담 일정 캘린더"],
};

const ACTION_PLAN_BY_CATEGORY: Record<ConcernCategory, string[]> = {
  love: ["감정 해석보다 사실 확인 질문 1개를 먼저 보내기", "답장을 재촉하기보다 내 상태를 먼저 한 문장으로 전달하기", "오늘은 관계 결론보다 감정 온도 맞추기를 우선하기"],
  work: ["가장 큰 업무를 20분 단위로 쪼개 첫 블록만 시작하기", "완벽 기준 3개만 남기고 나머지는 내일로 미루기", "업무 종료 전 5분 회고로 내일의 첫 할 일 1개 적기"],
  money: ["오늘 지출은 즉시 결제 전 10분 보류하기", "필요/위로 소비를 분리해 체크하기", "저녁에 1분만 써서 오늘의 소비 이유 기록하기"],
  family: ["해결보다 안부와 공감 한 문장 먼저 보내기", "가족 대화에서 요구 1개만 명확히 말하기", "감정이 올라오면 5초 멈춘 뒤 말의 속도 낮추기"],
  health: ["잠들기 1시간 전 화면 밝기 낮추기", "3분 복식호흡으로 긴장 신호 끊기", "오늘은 생산성보다 회복 루틴 1개 완료를 목표로 두기"],
  self: ["내가 통제 가능한 일 1개만 적고 바로 실행하기", "비교 대신 오늘 기준의 작은 진전 1개 찾기", "결정은 정보 70%에서 일단 움직이고 보정하기"],
  legal: ["사건 흐름을 날짜순으로 5줄 이내로 정리하기", "대화/문서/영수증 등 증빙을 한 폴더에 모아두기", "전문가 상담 질문 3개를 미리 적어 자신감 있게 확인하기"],
};

const ACTION_PLAN_BY_DOMAIN: Record<ConcernDomain, string[]> = {
  career: ["이번 주 커리어 목표를 숫자 1개로 정의하기", "상사/팀과의 기대치를 일정 전에 한 번 확인하기", "성과 근거를 짧게 기록해 다음 기회에 바로 활용하기"],
  study: ["학습 목표를 25분 1세션으로 잘라 첫 세션부터 시작하기", "틀린 문제 유형을 1개만 골라 집중 복습하기", "하루 마감 전에 내일의 핵심 1단원만 미리 지정하기"],
  social: ["감정 추측 대신 사실 확인 질문을 먼저 던지기", "예민한 대화는 문자보다 짧은 통화로 톤 맞추기", "갈등 신호가 보이면 주장보다 요약 확인부터 하기"],
  romance: ["답장 속도보다 표현의 명확성을 우선하기", "상대 반응 해석 전에 내 감정을 먼저 문장으로 정리하기", "오늘은 결론 대화보다 안정 대화 10분을 목표로 두기"],
  familyCare: ["가족과의 대화에서 요청사항을 하나로 좁혀 말하기", "감정이 올라올 때 5초 멈춘 뒤 낮은 톤으로 시작하기", "대화 후 오해 방지용 확인 문장을 짧게 남기기"],
  finance: ["오늘 지출 1건은 결제 전에 필요/욕구를 분리 체크하기", "정기 지출 점검 시간을 주 1회 캘린더에 고정하기", "소액이라도 소비 사유를 기록해 패턴을 확인하기"],
  wellness: ["잠들기 전 10분 호흡 루틴으로 신경계 긴장 낮추기", "피로 신호가 오면 카페인보다 수분 보충 먼저 하기", "오늘 일정에서 1개를 비워 회복 시간을 확보하기"],
  growth: ["내가 통제 가능한 과제를 1개만 즉시 실행하기", "완벽주의 대신 완료 기준을 70%로 설정하기", "오늘 배운 점 1줄을 남겨 내일의 방향을 선명히 하기"],
  legal: ["사실관계와 일정표를 먼저 정리해 상황을 명료하게 보기", "핵심 증빙 3개부터 우선 확보해 대응 근거 만들기", "전문가 상담 전에 확인할 질문을 정리해 주도적으로 진행하기"],
};

const CATEGORY_INDEX: Record<ConcernCategory, number> = {
  love: 0,
  work: 1,
  money: 2,
  family: 3,
  health: 4,
  self: 5,
  legal: 6,
};

const DOMAIN_INDEX: Record<ConcernDomain, number> = {
  career: 0,
  study: 1,
  social: 2,
  romance: 3,
  familyCare: 4,
  finance: 5,
  wellness: 6,
  growth: 7,
  legal: 8,
};

const WEEKDAY_RULER: Array<{ label: string; summary: string; scoreBias: { overall: number; love: number; money: number } }> = [
  { label: yeonStarHugText("yeonStar.label.007"), summary: "자기표현과 자신감이 올라가는 흐름", scoreBias: { overall: 0.4, love: 0.2, money: 0 } },
  { label: yeonStarHugText("yeonStar.label.008"), summary: "감정 공감과 관계 회복에 유리한 흐름", scoreBias: { overall: 0.2, love: 0.5, money: -0.1 } },
  { label: yeonStarHugText("yeonStar.label.009"), summary: "행동력은 강하지만 말의 온도 조절이 중요한 흐름", scoreBias: { overall: 0.2, love: -0.1, money: 0.1 } },
  { label: yeonStarHugText("yeonStar.label.010"), summary: "대화, 학습, 실무 정리에 강한 흐름", scoreBias: { overall: 0.3, love: 0.1, money: 0.2 } },
  { label: yeonStarHugText("yeonStar.label.011"), summary: "기회 포착과 확장 판단에 힘이 실리는 흐름", scoreBias: { overall: 0.4, love: 0.1, money: 0.5 } },
  { label: yeonStarHugText("yeonStar.label.012"), summary: "관계 조율, 호감, 미적 감각이 살아나는 흐름", scoreBias: { overall: 0.3, love: 0.7, money: 0.1 } },
  { label: yeonStarHugText("yeonStar.label.013"), summary: "현실 점검과 구조화에 유리한 흐름", scoreBias: { overall: 0.1, love: -0.1, money: 0.4 } },
];

const STAR_DOTS = [
  { left: "6%", top: "12%", delay: 0.1 },
  { left: "18%", top: "24%", delay: 0.8 },
  { left: "32%", top: "9%", delay: 1.3 },
  { left: "44%", top: "20%", delay: 1.8 },
  { left: "58%", top: "13%", delay: 0.4 },
  { left: "72%", top: "29%", delay: 1.2 },
  { left: "85%", top: "18%", delay: 1.7 },
  { left: "91%", top: "34%", delay: 0.6 },
  { left: "11%", top: "41%", delay: 1.1 },
  { left: "27%", top: "49%", delay: 1.9 },
  { left: "48%", top: "43%", delay: 0.7 },
  { left: "66%", top: "52%", delay: 1.6 },
  { left: "82%", top: "47%", delay: 1.5 },
  { left: "7%", top: "70%", delay: 0.9 },
  { left: "22%", top: "79%", delay: 1.4 },
  { left: "38%", top: "72%", delay: 0.3 },
  { left: "53%", top: "86%", delay: 1.8 },
  { left: "71%", top: "74%", delay: 0.5 },
  { left: "86%", top: "82%", delay: 1.25 },
];

const HEART_SYMBOL_LIBRARY: Record<HeartSymbolId, HeartSymbol> = {
  clover: {
    id: "clover",
    name: "네잎 클로버",
    meaning: "작은 행운의 문이 동시에 열리는 날",
    whisper: "지금의 선택 하나가 기대보다 크게 이어져요.",
  },
  moonStar: {
    id: "moonStar",
    name: "달과 별",
    meaning: "감정을 다독이는 치유의 밤 기운",
    whisper: "마음을 조용히 정리하면 답이 선명해져요.",
  },
  lotus: {
    id: "lotus",
    name: "연꽃",
    meaning: "흔들림 속에서도 중심을 지키는 회복력",
    whisper: "천천히 숨을 고르면 컨디션이 안정돼요.",
  },
  goldKey: {
    id: "goldKey",
    name: "황금 열쇠",
    meaning: "막힌 흐름을 푸는 현실 해답의 신호",
    whisper: "핵심 하나를 먼저 열면 길이 이어집니다.",
  },
  butterfly: {
    id: "butterfly",
    name: "나비",
    meaning: "관계와 마음이 가볍게 새로워지는 변화",
    whisper: "부드러운 한마디가 분위기를 바꿔줘요.",
  },
  comet: {
    id: "comet",
    name: "혜성",
    meaning: "정체된 구간을 돌파하는 용기의 타이밍",
    whisper: "망설인 일을 짧게 시작하면 속도가 붙어요.",
  },
};

const HEART_SYMBOL_BY_CATEGORY: Record<ConcernCategory, HeartSymbolId> = {
  love: "butterfly",
  work: "goldKey",
  money: "clover",
  family: "lotus",
  health: "moonStar",
  self: "comet",
  legal: "goldKey",
};

const HEART_SYMBOL_BY_DOMAIN: Record<ConcernDomain, HeartSymbolId> = {
  career: "goldKey",
  study: "comet",
  social: "butterfly",
  romance: "butterfly",
  familyCare: "lotus",
  finance: "clover",
  wellness: "moonStar",
  growth: "comet",
  legal: "goldKey",
};

const HEART_SYMBOL_BY_EMOTION: Record<EmotionKey, HeartSymbolId> = {
  happy: "clover",
  calm: "moonStar",
  tired: "lotus",
  worried: "moonStar",
  flutter: "butterfly",
  blue: "lotus",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickHeartSymbols(consultation: ConsultationResult, emotionKey: EmotionKey): HeartSymbol[] {
  const selected: HeartSymbolId[] = [];
  const push = (id: HeartSymbolId) => {
    if (!selected.includes(id)) selected.push(id);
  };

  push(HEART_SYMBOL_BY_CATEGORY[consultation.concernCategory]);
  push(HEART_SYMBOL_BY_DOMAIN[consultation.concernDomain]);
  push(HEART_SYMBOL_BY_EMOTION[emotionKey]);

  const seed = `${consultation.sign}-${consultation.concernCategory}-${consultation.concernDomain}-${emotionKey}-${consultation.luckyItem}`;
  const remaining = (Object.keys(HEART_SYMBOL_LIBRARY) as HeartSymbolId[]).sort(
    (a, b) => hashText(`${seed}-${a}`) - hashText(`${seed}-${b}`)
  );

  remaining.forEach((id) => {
    if (selected.length < 3) push(id);
  });

  return selected.slice(0, 3).map((id) => HEART_SYMBOL_LIBRARY[id]);
}

function buildStarPoints(cx: number, cy: number, outer: number, inner: number) {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(" ");
}

function renderHeartSymbolGlyph(symbolId: HeartSymbolId, cx: number, cy: number) {
  if (symbolId === "clover") {
    return `
      <g filter="url(#symbolGlow)">
        <circle cx="${cx - 22}" cy="${cy - 20}" r="19" fill="url(#symbolLeaf)"/>
        <circle cx="${cx + 22}" cy="${cy - 20}" r="19" fill="url(#symbolLeaf)"/>
        <circle cx="${cx - 22}" cy="${cy + 20}" r="19" fill="url(#symbolLeaf)"/>
        <circle cx="${cx + 22}" cy="${cy + 20}" r="19" fill="url(#symbolLeaf)"/>
        <circle cx="${cx}" cy="${cy}" r="11" fill="#f0fff4" fill-opacity="0.9"/>
        <path d="M ${cx + 6} ${cy + 18} C ${cx + 34} ${cy + 44}, ${cx + 20} ${cy + 66}, ${cx - 4} ${cy + 78}" stroke="#1f8f52" stroke-width="6" fill="none" stroke-linecap="round"/>
      </g>
    `;
  }

  if (symbolId === "moonStar") {
    return `
      <g filter="url(#symbolGlow)">
        <circle cx="${cx - 6}" cy="${cy}" r="38" fill="url(#symbolMoon)"/>
        <circle cx="${cx + 10}" cy="${cy - 8}" r="33" fill="#fff8ff"/>
        <polygon points="${buildStarPoints(cx + 34, cy - 26, 14, 6)}" fill="url(#symbolStar)"/>
      </g>
    `;
  }

  if (symbolId === "lotus") {
    return `
      <g filter="url(#symbolGlow)">
        <ellipse cx="${cx}" cy="${cy + 22}" rx="30" ry="18" fill="#dbeafe" fill-opacity="0.75"/>
        <path d="M ${cx} ${cy - 38} C ${cx + 20} ${cy - 20}, ${cx + 18} ${cy + 10}, ${cx} ${cy + 18} C ${cx - 18} ${cy + 10}, ${cx - 20} ${cy - 20}, ${cx} ${cy - 38} Z" fill="url(#symbolLotus)"/>
        <path d="M ${cx - 28} ${cy - 20} C ${cx - 8} ${cy - 10}, ${cx - 5} ${cy + 12}, ${cx - 20} ${cy + 20} C ${cx - 36} ${cy + 10}, ${cx - 40} ${cy - 8}, ${cx - 28} ${cy - 20} Z" fill="url(#symbolLotus)"/>
        <path d="M ${cx + 28} ${cy - 20} C ${cx + 8} ${cy - 10}, ${cx + 5} ${cy + 12}, ${cx + 20} ${cy + 20} C ${cx + 36} ${cy + 10}, ${cx + 40} ${cy - 8}, ${cx + 28} ${cy - 20} Z" fill="url(#symbolLotus)"/>
      </g>
    `;
  }

  if (symbolId === "goldKey") {
    return `
      <g filter="url(#symbolGlow)">
        <circle cx="${cx - 22}" cy="${cy - 8}" r="22" fill="none" stroke="url(#symbolKey)" stroke-width="8"/>
        <rect x="${cx - 2}" y="${cy - 12}" width="50" height="10" rx="5" fill="url(#symbolKey)"/>
        <rect x="${cx + 32}" y="${cy - 6}" width="12" height="18" rx="3" fill="url(#symbolKey)"/>
        <rect x="${cx + 44}" y="${cy - 6}" width="10" height="12" rx="2" fill="url(#symbolKey)"/>
      </g>
    `;
  }

  if (symbolId === "butterfly") {
    return `
      <g filter="url(#symbolGlow)">
        <ellipse cx="${cx - 18}" cy="${cy - 12}" rx="19" ry="16" fill="url(#symbolWing)"/>
        <ellipse cx="${cx + 18}" cy="${cy - 12}" rx="19" ry="16" fill="url(#symbolWing)"/>
        <ellipse cx="${cx - 16}" cy="${cy + 16}" rx="14" ry="12" fill="url(#symbolWing)"/>
        <ellipse cx="${cx + 16}" cy="${cy + 16}" rx="14" ry="12" fill="url(#symbolWing)"/>
        <rect x="${cx - 4}" y="${cy - 18}" width="8" height="46" rx="4" fill="#7c3aed"/>
        <path d="M ${cx - 2} ${cy - 18} C ${cx - 12} ${cy - 36}, ${cx - 20} ${cy - 34}, ${cx - 24} ${cy - 26}" stroke="#7c3aed" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M ${cx + 2} ${cy - 18} C ${cx + 12} ${cy - 36}, ${cx + 20} ${cy - 34}, ${cx + 24} ${cy - 26}" stroke="#7c3aed" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>
    `;
  }

  return `
    <g filter="url(#symbolGlow)">
      <polygon points="${buildStarPoints(cx - 2, cy - 6, 24, 10)}" fill="url(#symbolStar)"/>
      <path d="M ${cx + 18} ${cy + 2} C ${cx + 50} ${cy - 14}, ${cx + 76} ${cy - 8}, ${cx + 102} ${cy + 8}" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M ${cx + 14} ${cy + 18} C ${cx + 40} ${cy + 10}, ${cx + 62} ${cy + 16}, ${cx + 84} ${cy + 28}" stroke="#fde68a" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
  `;
}

function toScore(value: number) {
  return Math.round(clamp(value, 1, 5));
}

function normalizeBirthDateText(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return digits;
}

function normalizeBirthTimeText(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(0, 4);
  return "";
}

function formatBirthDateInput(value: string) {
  const digits = normalizeBirthDateText(value);
  if (!digits) return "생년월일 미연결";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

function formatBirthTimeInput(value: string) {
  const digits = normalizeBirthTimeText(value);
  if (!digits) return "--:--";
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function parseSignFromBirthDateInput(value: string): ZodiacSign | null {
  const digits = normalizeBirthDateText(value);
  if (!digits) return null;

  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return getSignByMonthDay(month, day);
}

function toProfileInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function padProfile2(value: number) {
  return String(value).padStart(2, "0");
}

function readProfileBirthDateInput(profile: DestinyProfileCard | null): string {
  if (!profile) return "";
  const birth = profile.birth || {};
  const year = toProfileInt(birth.year ?? profile.birthYear);
  const month = toProfileInt(birth.month ?? profile.birthMonth);
  const day = toProfileInt(birth.day ?? profile.birthDay);
  if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return `${year}${padProfile2(month)}${padProfile2(day)}`;
  }

  const dateText = String(profile.birthDate || "").trim()
    || String(profile.birthIso || "").split(/[T\s]/)[0]
    || "";
  return normalizeBirthDateText(dateText);
}

function readProfileBirthTimeInput(profile: DestinyProfileCard | null): string {
  if (!profile) return "";
  const birth = profile.birth || {};
  const hour = toProfileInt(birth.hour ?? profile.birthHour);
  const minute = toProfileInt(birth.minute ?? profile.birthMinute);
  if (hour !== null && hour >= 0 && hour <= 23) {
    const safeMinute = minute !== null && minute >= 0 && minute <= 59 ? minute : 0;
    return `${padProfile2(hour)}${padProfile2(safeMinute)}`;
  }

  const timeText = String(profile.birthTime || "").trim()
    || String(profile.birthIso || "").split(/[T\s]/)[1]
    || "";
  return normalizeBirthTimeText(timeText);
}

function hasYeonProfileBirth(profile: DestinyProfileCard) {
  return Boolean(readProfileBirthDateInput(profile));
}

function buildProfileSeed(profile: DestinyProfileCard, source: ProfileSeed["source"]): ProfileSeed {
  return {
    name: String(profile.name || "").trim(),
    birthDateInput: readProfileBirthDateInput(profile),
    birthTimeInput: readProfileBirthTimeInput(profile),
    source,
  };
}

function profileSyncKey(profile: DestinyProfileCard | null | undefined) {
  if (!profile) return "";
  const birth = profile.birth || {};
  return [
    String(profile.id || profile.profileId || "").trim(),
    String(profile.name || "").trim(),
    readProfileBirthDateInput(profile),
    readProfileBirthTimeInput(profile),
    String(birth.calType || profile.calType || profile.calendarType || "").trim(),
  ].join("|");
}

function getSignByMonthDay(month: number, day: number): ZodiacSign {
  const mmdd = month * 100 + day;
  if (mmdd >= 321 && mmdd <= 419) return "양자리";
  if (mmdd >= 420 && mmdd <= 520) return "황소자리";
  if (mmdd >= 521 && mmdd <= 621) return "쌍둥이자리";
  if (mmdd >= 622 && mmdd <= 722) return "게자리";
  if (mmdd >= 723 && mmdd <= 822) return "사자자리";
  if (mmdd >= 823 && mmdd <= 923) return "처녀자리";
  if (mmdd >= 924 && mmdd <= 1022) return "천칭자리";
  if (mmdd >= 1023 && mmdd <= 1122) return "전갈자리";
  if (mmdd >= 1123 && mmdd <= 1224) return "사수자리";
  if (mmdd >= 1225 || mmdd <= 119) return "염소자리";
  if (mmdd >= 120 && mmdd <= 218) return "물병자리";
  return "물고기자리";
}

function getMoonSnapshot(date: Date): MoonSnapshot {
  const synodicMonth = 29.53058867;
  const knownNewMoonUtc = Date.UTC(2000, 0, 6, 18, 14, 0);
  const nowUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0);
  const daysSince = (nowUtc - knownNewMoonUtc) / 86400000;
  const age = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = (1 - Math.cos((age / synodicMonth) * 2 * Math.PI)) / 2;

  if (age < 1.85) {
    return { age, illumination, phaseKey: "new-moon", label: yeonStarHugText("yeonStar.label.014"), scoreBias: { overall: 0.1, love: 0.1, money: 0.2 } };
  }
  if (age < 5.54) {
    return { age, illumination, phaseKey: "waxing-crescent", label: yeonStarHugText("yeonStar.label.015"), scoreBias: { overall: 0.4, love: 0.3, money: 0.2 } };
  }
  if (age < 9.23) {
    return { age, illumination, phaseKey: "first-quarter", label: yeonStarHugText("yeonStar.label.016"), scoreBias: { overall: 0.3, love: 0.2, money: 0.4 } };
  }
  if (age < 12.92) {
    return { age, illumination, phaseKey: "waxing-gibbous", label: yeonStarHugText("yeonStar.label.017"), scoreBias: { overall: 0.5, love: 0.4, money: 0.3 } };
  }
  if (age < 16.61) {
    return { age, illumination, phaseKey: "full-moon", label: yeonStarHugText("yeonStar.label.018"), scoreBias: { overall: 0.2, love: 0.6, money: 0.1 } };
  }
  if (age < 20.3) {
    return { age, illumination, phaseKey: "waning-gibbous", label: yeonStarHugText("yeonStar.label.019"), scoreBias: { overall: 0.1, love: 0.2, money: 0.4 } };
  }
  if (age < 23.99) {
    return { age, illumination, phaseKey: "last-quarter", label: yeonStarHugText("yeonStar.label.020"), scoreBias: { overall: 0, love: -0.1, money: 0.5 } };
  }
  return { age, illumination, phaseKey: "waning-crescent", label: yeonStarHugText("yeonStar.label.021"), scoreBias: { overall: 0.1, love: 0, money: 0.3 } };
}

function getAspectSnapshot(userSign: ZodiacSign, todaySunSign: ZodiacSign): AspectSnapshot {
  const rawDistance = Math.abs(ZODIAC_INDEX[userSign] - ZODIAC_INDEX[todaySunSign]);
  const distance = Math.min(rawDistance, 12 - rawDistance);

  if (distance === 0) {
    return {
      distance,
      label: yeonStarHugText("yeonStar.label.022"),
      summary: "오늘 태양과 네 별자리가 같은 축에 있어 집중력이 또렷해.",
      scoreBias: 0.8,
    };
  }
  if (distance === 2) {
    return {
      distance,
      label: yeonStarHugText("yeonStar.label.023"),
      summary: "작은 기회가 자연스럽게 연결되는 날의 각도야.",
      scoreBias: 0.5,
    };
  }
  if (distance === 3) {
    return {
      distance,
      label: yeonStarHugText("yeonStar.label.024"),
      summary: "마찰이 있지만 방향 수정으로 성과를 만드는 각도야.",
      scoreBias: -0.6,
    };
  }
  if (distance === 4) {
    return {
      distance,
      label: yeonStarHugText("yeonStar.label.025"),
      summary: "흐름이 부드럽게 이어지는 행운의 각도야.",
      scoreBias: 0.9,
    };
  }
  if (distance === 6) {
    return {
      distance,
      label: yeonStarHugText("yeonStar.label.026"),
      summary: "상대 시선을 통해 균형을 회복하는 조율 각도야.",
      scoreBias: -0.7,
    };
  }
  return {
    distance,
    label: yeonStarHugText("yeonStar.label.027"),
    summary: "큰 충돌 없이 루틴을 안정화하기 좋은 각도야.",
    scoreBias: 0.1,
  };
}

function extractConcernAnalysis(concernText: string): ConcernAnalysis {
  const text = concernText.trim().toLowerCase();
  const compactText = text.replace(/[^0-9a-zA-Z가-힣]/g, "");
  const weights: Record<ConcernCategory, number> = {
    love: 0,
    work: 0,
    money: 0,
    family: 0,
    health: 0,
    self: 0,
    legal: 0,
  };
  const domainWeights: Record<ConcernDomain, number> = {
    career: 0,
    study: 0,
    social: 0,
    romance: 0,
    familyCare: 0,
    finance: 0,
    wellness: 0,
    growth: 0,
    legal: 0,
  };
  const hitSet = new Set<string>();
  const domainHitSet = new Set<string>();

  const hasKeyword = (keyword: string) => {
    const normalizedKeyword = keyword.toLowerCase().replace(/[^0-9a-zA-Z가-힣]/g, "");
    return text.includes(keyword.toLowerCase()) || compactText.includes(normalizedKeyword);
  };

  if (!text) {
    return {
      weights: { ...weights, self: 1 },
      topCategory: "self",
      topKeywords: [],
      topDomain: "growth",
      domainKeywords: [],
    };
  }

  (Object.keys(KEYWORD_DICT) as ConcernCategory[]).forEach((category) => {
    KEYWORD_DICT[category].forEach((keyword) => {
      if (hasKeyword(keyword)) {
        weights[category] += category === "health" ? 1.1 : 0.8;
        hitSet.add(keyword);
      }
    });
  });

  DOMAIN_RULES.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      if (hasKeyword(keyword)) {
        domainWeights[rule.domain] += rule.weight;
        weights[rule.category] += rule.weight * 0.9;
        hitSet.add(keyword);
        domainHitSet.add(keyword);
      }
    });
  });

  FUZZY_KEYWORD_RULES.forEach((rule) => {
    rule.synonyms.forEach((synonym) => {
      if (hasKeyword(synonym)) {
        weights[rule.category] += rule.weight;
        domainWeights[rule.domain] += rule.weight * 0.85;
        hitSet.add(synonym);
        domainHitSet.add(synonym);
      }
    });
  });

  const totalWeight = Object.values(weights).reduce((acc, cur) => acc + cur, 0);
  if (totalWeight === 0) {
    weights.self = 1;
    domainWeights.growth = 1;
  }

  const topCategory = (Object.keys(weights) as ConcernCategory[]).reduce((best, current) =>
    weights[current] > weights[best] ? current : best
  , "self");

  const topDomain = (Object.keys(domainWeights) as ConcernDomain[]).reduce((best, current) =>
    domainWeights[current] > domainWeights[best] ? current : best
  , "growth");

  return {
    weights,
    topCategory,
    topKeywords: Array.from(hitSet).slice(0, 5),
    topDomain,
    domainKeywords: Array.from(domainHitSet).slice(0, 4),
  };
}

function getCardSpriteFrame(
  sign: ZodiacSign,
  emotion: EmotionKey,
  category: ConcernCategory,
  domain: ConcernDomain,
  astroSignal?: YeonAstroSignal | null
) {
  return getYeonSpriteFrame({
    signIndex: ZODIAC_INDEX[sign] ?? 0,
    emotion,
    categoryIndex: CATEGORY_INDEX[category] ?? 0,
    domainIndex: DOMAIN_INDEX[domain] ?? 0,
    astroSignal,
  });
}

function getElementRelation(
  userElement: "불" | "흙" | "바람" | "물",
  sunElement: "불" | "흙" | "바람" | "물"
): { label: string; scoreBias: number; detail: string } {
  if (userElement === sunElement) {
    return {
      label: yeonStarHugText("yeonStar.label.028"),
      scoreBias: 0.55,
      detail: `${userElement} 원소가 같은 축으로 공명해 의사결정의 일관성이 높아져.`,
    };
  }

  const supportive =
    (userElement === "불" && sunElement === "바람") ||
    (userElement === "바람" && sunElement === "불") ||
    (userElement === "흙" && sunElement === "물") ||
    (userElement === "물" && sunElement === "흙");

  if (supportive) {
    return {
      label: yeonStarHugText("yeonStar.label.029"),
      scoreBias: 0.28,
      detail: `${userElement}·${sunElement} 조합은 실행과 감정 균형을 자연스럽게 맞춰줘.`,
    };
  }

  return {
    label: yeonStarHugText("yeonStar.label.030"),
    scoreBias: -0.22,
    detail: `${userElement}·${sunElement} 조합은 속도 차가 커서 우선순위 조율이 중요해.`,
  };
}

function pickLuckyItem(category: ConcernCategory, seed: string) {
  const items = LUCKY_ITEM_BY_CATEGORY[category];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

function collectConcernKeywords(concern: ConcernAnalysis) {
  const seen = new Set<string>();
  return [...concern.domainKeywords, ...concern.topKeywords].filter((keyword) => {
    const normalized = String(keyword || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function buildKeywordSupportLines(
  concern: ConcernAnalysis,
  _context: {
    selectedSign: ZodiacSign;
    todaySunSign: ZodiacSign;
    moon: MoonSnapshot;
    aspect: AspectSnapshot;
    dayRuler: DayRulerSnapshot;
    scores: { overall: number; love: number; money: number };
  }
) {
  void _context;
  const keywords = collectConcernKeywords(concern).slice(0, 3);

  if (keywords.length === 0) {
    return [
      `#${DOMAIN_LABEL[concern.topDomain]}`,
      `#${CATEGORY_LABEL[concern.topCategory]}`,
      `#오늘도괜찮아`,
    ];
  }
  return keywords.map((keyword) => `#${String(keyword).replace(/\s+/g, "")}`);
}

function buildDetailedForecast(args: {
  concern: ConcernAnalysis;
  selectedSign: ZodiacSign;
  todaySunSign: ZodiacSign;
  moon: MoonSnapshot;
  aspect: AspectSnapshot;
  dayRuler: DayRulerSnapshot;
  elementRelation: { label: string; scoreBias: number; detail: string };
  scores: { overall: number; love: number; money: number };
  astroSignal?: YeonAstroSignal | null;
}) {
  const { concern, selectedSign, todaySunSign, moon, aspect, dayRuler, elementRelation, scores } = args;
  const moonPct = Math.round(moon.illumination * 100);
  const dominantTrackLabel =
    scores.love >= scores.money && scores.love >= scores.overall
      ? "관계/연애"
      : scores.money >= scores.overall
      ? "재정/현실"
      : "종합 균형";
  const topTrack =
    scores.love >= scores.money && scores.love >= scores.overall
      ? "관계/연애 트랙"
      : scores.money >= scores.overall
      ? "재정/현실 트랙"
      : "종합 균형 트랙";
  const domainAction = ACTION_PLAN_BY_DOMAIN[concern.topDomain]?.[0] ?? ACTION_PLAN_BY_CATEGORY[concern.topCategory][0];
  const scoreSpan = Math.max(scores.overall, scores.love, scores.money) - Math.min(scores.overall, scores.love, scores.money);
  const confidenceLabel = scoreSpan >= 2 ? "특정 영역 집중" : "균형 운영";

  return [
    `핵심 각도 해석: ${selectedSign} 기준 오늘 태양 ${todaySunSign}과 ${aspect.label} 구도이며, ${aspect.summary}`,
    `달 위상 해석: 달 나이 ${moon.age.toFixed(1)}일 · 조도 ${moonPct}% (${moon.label}) 상태라 ${DOMAIN_LABEL[concern.topDomain]} 이슈에서 감정 반응이 빠르게 올라올 수 있어.`,
    `행성 리듬 해석: ${dayRuler.label}(${dayRuler.summary}) + ${elementRelation.label}(${elementRelation.detail}) 조합으로 오늘 결정 중심축은 ${dominantTrackLabel}이고, 운영 모드는 ${confidenceLabel}이 유리해.`,
    `실행 처방: 종합 ${scores.overall}점 · 관계 ${scores.love}점 · 재정 ${scores.money}점 기준, 첫 행동은 "${domainAction}". 이후 ${topTrack} 우선으로 일정 1개만 확정해.`,
  ];
}

function buildWarmLetterMessage(args: {
  recipientName: string;
  selectedEmotion: EmotionKey;
  concern: ConcernAnalysis;
  selectedSign: ZodiacSign;
  todaySunSign: ZodiacSign;
  moon: MoonSnapshot;
  aspect: AspectSnapshot;
  dayRuler: DayRulerSnapshot;
  astroSignal?: YeonAstroSignal | null;
}) {
  const { recipientName, selectedEmotion, concern, selectedSign, todaySunSign, moon, aspect, dayRuler, astroSignal } = args;

  const recipientLabel = formatRecipientLabel(recipientName);
  const moonPct = Math.round(moon.illumination * 100);
  const topic = pickBySeed(
    LETTER_TOPIC_BY_DOMAIN[concern.topDomain],
    `${recipientLabel}-${concern.topDomain}-${concern.topCategory}-${selectedSign}`
  );
  const emotionCare = pickBySeed(
    LETTER_CARE_BY_EMOTION[selectedEmotion],
    `${recipientLabel}-${selectedEmotion}-${moon.phaseKey}-${dayRuler.label}`
  );
  const closing = pickBySeed(
    LETTER_CLOSING_POOL,
    `${recipientLabel}-${concern.topDomain}-${selectedSign}-${todaySunSign}-${aspect.label}`
  );

  const priorityDomain = DOMAIN_LABEL[concern.topDomain];
  const firstKeyword = concern.domainKeywords[0] ?? concern.topKeywords[0] ?? CATEGORY_LABEL[concern.topCategory];
  const safeKeyword = String(firstKeyword).replace(/\s+/g, "");
  const astroCare = astroSignal ? `정밀 별빛으로는 ${astroSignal.heartTone} ${astroSignal.actionTone}` : "";

  return [
    `${recipientLabel}께,`,
    `${EMOTION_OPENING[selectedEmotion]} 오늘 상담은 ${topic}에 집중해 안내드립니다.`,
    `점성술 흐름을 보면 ${selectedSign} 기준 오늘 태양 ${todaySunSign}과 ${aspect.label} 각도가 형성되어 ${priorityDomain} 이슈에서 체감이 커지기 쉬운 날입니다.`,
    `달의 조도는 ${moonPct}%(${moon.label})이고, 요일 행성은 ${dayRuler.label}입니다. 그래서 결론을 서두르기보다 확인 가능한 사실부터 정리하시면 훨씬 안정적입니다.`,
    `${emotionCare}`,
    ...(astroCare ? [astroCare] : []),
    `오늘의 실전 권장 순서는 "${priorityDomain} → ${CATEGORY_LABEL[concern.topCategory]}"입니다. 작은 실행 하나를 먼저 완료해 주세요.`,
    `응원 키워드: #${safeKeyword} #${priorityDomain.replace(/\//g, "")} #연이응원`,
    closing,
    "연이는 오늘도 진심으로 응원합니다.",
  ].join("\n\n");
}

function buildConcernReasoning(args: {
  concern: ConcernAnalysis;
  selectedSign: ZodiacSign;
  todaySunSign: ZodiacSign;
  moon: MoonSnapshot;
  aspect: AspectSnapshot;
  dayRuler: DayRulerSnapshot;
  astroSignal?: YeonAstroSignal | null;
}) {
  const { concern, selectedSign, todaySunSign, moon, aspect, dayRuler, astroSignal } = args;
  const moonPct = Math.round(moon.illumination * 100);
  const keyLabel = concern.domainKeywords[0] || concern.topKeywords[0] || CATEGORY_LABEL[concern.topCategory];
  const astroReasoning = astroSignal ? `프로필 차트의 핵심은 ${astroSignal.heartTone} ${astroSignal.relationTone}` : "";

  return [
    ...(astroReasoning ? [astroReasoning] : []),
    `${selectedSign}인 너와 오늘 태양 ${todaySunSign}의 ${aspect.label} 각도(${aspect.summary})가 맞물리면서, ${DOMAIN_LABEL[concern.topDomain]} 고민에서 감정 반응이 예민해지기 쉬운 흐름이야.`,
    `${moon.label} (조도 ${moonPct}%) 구간이라 마음의 체감 강도가 커져서 '${keyLabel}' 이슈가 평소보다 더 크게 느껴질 수 있어.`,
    `${dayRuler.label} 리듬(${dayRuler.summary})까지 겹쳐서 생각이 반복되기 쉬운 날이지만, 이건 네가 약해서가 아니라 중요한 것을 지키려는 정상 반응이야.`,
  ];
}

function buildConsultation(
  selectedSign: ZodiacSign,
  selectedEmotion: EmotionKey,
  concernText: string,
  recipientName: string,
  date: Date,
  astroSignal: YeonAstroSignal | null = null
): ConsultationResult {
  const todaySunSign = getSignByMonthDay(date.getMonth() + 1, date.getDate());
  const moon = getMoonSnapshot(date);
  const aspect = getAspectSnapshot(selectedSign, todaySunSign);
  const dayRuler = WEEKDAY_RULER[date.getDay()] || WEEKDAY_RULER[0];
  const concern = extractConcernAnalysis(concernText);
  const emotionBias = EMOTION_BIAS[selectedEmotion];
  const userProfile = ZODIAC_PROFILE[selectedSign];
  const sunProfile = ZODIAC_PROFILE[todaySunSign];
  const elementRelation = getElementRelation(userProfile.element, sunProfile.element);
  const moonIlluminationPct = Math.round(moon.illumination * 100);
  const zodiacDegree = aspect.distance * 30;
  const modalityBias = userProfile.modality === sunProfile.modality ? 0.12 : -0.05;
  const astroSoftBias = astroSignal?.majorAspects.filter((item) => item.tone === "soft").length ?? 0;
  const astroTensionBias = astroSignal?.majorAspects.filter((item) => item.tone === "tension").length ?? 0;
  const astroEmotionBias = astroSignal?.dominantElement === "water" ? 0.18 : astroSignal?.dominantElement === "earth" ? 0.1 : 0;
  const astroRelationBias = astroSignal?.venusSign ? 0.16 : 0;
  const astroActionBias = astroSignal?.marsSign ? 0.12 : 0;

  const focusBias = {
    overall: concern.weights.self * 0.2 + concern.weights.health * 0.25 + concern.weights.legal * 0.18,
    love: concern.weights.love * 0.55 + concern.weights.family * 0.25,
    money: concern.weights.money * 0.65 + concern.weights.work * 0.3 + concern.weights.legal * 0.12,
  };

  const overall = toScore(
    3 +
      emotionBias.overall +
      moon.scoreBias.overall +
      dayRuler.scoreBias.overall +
      aspect.scoreBias * 0.45 +
      focusBias.overall * 0.2 +
      elementRelation.scoreBias * 0.5 +
      modalityBias +
      astroEmotionBias +
      astroSoftBias * 0.08 -
      astroTensionBias * 0.06
  );
  const love = toScore(
    3 +
      emotionBias.love +
      moon.scoreBias.love +
      dayRuler.scoreBias.love +
      aspect.scoreBias * 0.4 +
      focusBias.love * 0.25 +
      elementRelation.scoreBias * 0.35 +
      modalityBias * 0.5 +
      astroRelationBias +
      astroSoftBias * 0.1 -
      astroTensionBias * 0.05
  );
  const money = toScore(
    3 +
      emotionBias.money +
      moon.scoreBias.money +
      dayRuler.scoreBias.money +
      aspect.scoreBias * 0.3 +
      focusBias.money * 0.22 +
      elementRelation.scoreBias * 0.25 +
      modalityBias * 0.35 +
      astroActionBias +
      astroSoftBias * 0.05 -
      astroTensionBias * 0.04
  );

  const luckyItem = pickLuckyItem(concern.topCategory, `${selectedSign}-${selectedEmotion}-${date.toDateString()}-${concernText}`);
  const concernHint = concern.topKeywords.length > 0 ? concern.topKeywords.join(", ") : "오늘 네 마음 상태";

  const practicalTip = `${CATEGORY_LABEL[concern.topCategory]} · ${DOMAIN_LABEL[concern.topDomain]} 고민은 "작게 쪼개서 실행"할수록 정확도가 올라가. ${DOMAIN_TIP[concern.topDomain]}`;

  const astroEvidence = [
    ...(astroSignal?.evidence || []).map((line) => `정밀 별자리 신호: ${line}`),
    `입력 기준: 감정=${EMOTION_LABEL[selectedEmotion]} · 고민 카테고리=${CATEGORY_LABEL[concern.topCategory]} · 도메인=${DOMAIN_LABEL[concern.topDomain]}`,
    `태양 기준값: ${todaySunSign} (${sunProfile.element} 원소 · ${sunProfile.modality} 성질 · 주관 ${sunProfile.ruler})`,
    `사용자 기준값: ${selectedSign} (${userProfile.element} 원소 · ${userProfile.modality} 성질 · 주관 ${userProfile.ruler})`,
    `별자리 각도 계산: 거리 ${aspect.distance}칸 × 30° = ${zodiacDegree}° → ${aspect.label} (bias ${aspect.scoreBias.toFixed(2)})`,
    `달 위상 계산: 달 나이 ${moon.age.toFixed(1)}일 · 조도 ${moonIlluminationPct}% · 위상 ${moon.label} (bias O:${moon.scoreBias.overall.toFixed(2)} / L:${moon.scoreBias.love.toFixed(2)} / M:${moon.scoreBias.money.toFixed(2)})`,
    `요일 행성 계산: ${dayRuler.label} (${dayRuler.summary}) (bias O:${dayRuler.scoreBias.overall.toFixed(2)} / L:${dayRuler.scoreBias.love.toFixed(2)} / M:${dayRuler.scoreBias.money.toFixed(2)})`,
    `원소 상성 계산: ${elementRelation.label} (bias ${elementRelation.scoreBias.toFixed(2)})`,
    `점수식(종합): 3 + 감정(${emotionBias.overall.toFixed(2)}) + 달(${moon.scoreBias.overall.toFixed(2)}) + 요일(${dayRuler.scoreBias.overall.toFixed(2)}) + 각도(${(aspect.scoreBias * 0.45).toFixed(2)}) + 포커스(${(focusBias.overall * 0.2).toFixed(2)}) + 원소(${(elementRelation.scoreBias * 0.5).toFixed(2)}) + 모달(${modalityBias.toFixed(2)}) → ${overall}점`,
    `점수식(관계): 3 + 감정(${emotionBias.love.toFixed(2)}) + 달(${moon.scoreBias.love.toFixed(2)}) + 요일(${dayRuler.scoreBias.love.toFixed(2)}) + 각도(${(aspect.scoreBias * 0.4).toFixed(2)}) + 포커스(${(focusBias.love * 0.25).toFixed(2)}) + 원소(${(elementRelation.scoreBias * 0.35).toFixed(2)}) + 모달(${(modalityBias * 0.5).toFixed(2)}) → ${love}점`,
    `점수식(재정): 3 + 감정(${emotionBias.money.toFixed(2)}) + 달(${moon.scoreBias.money.toFixed(2)}) + 요일(${dayRuler.scoreBias.money.toFixed(2)}) + 각도(${(aspect.scoreBias * 0.3).toFixed(2)}) + 포커스(${(focusBias.money * 0.22).toFixed(2)}) + 원소(${(elementRelation.scoreBias * 0.25).toFixed(2)}) + 모달(${(modalityBias * 0.35).toFixed(2)}) → ${money}점`,
    `인식 키워드: ${concernHint}`,
  ];

  const keywordSupportLines = buildKeywordSupportLines(concern, {
    selectedSign,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
    scores: { overall, love, money },
  });

  const detailedForecast = buildDetailedForecast({
    concern,
    selectedSign,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
    elementRelation,
    scores: { overall, love, money },
    astroSignal,
  });
  if (astroSignal) {
    detailedForecast.push(`프로필 차트 신호: ${astroSignal.healingTone} ${astroSignal.relationTone}`);
  }

  const warmMessage = buildWarmLetterMessage({
    recipientName,
    selectedEmotion,
    concern,
    selectedSign,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
    astroSignal,
  });
  const concernReasoning = buildConcernReasoning({
    concern,
    selectedSign,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
    astroSignal,
  });

  const signInfo = ZODIAC_SIGNS.find((item) => item.sign === selectedSign) ?? ZODIAC_SIGNS[0];

  return {
    recipientLabel: formatRecipientLabel(recipientName),
    sign: selectedSign,
    period: signInfo.period,
    overall,
    love,
    money,
    luckyItem,
    warmMessage,
    practicalTip,
    detailedForecast,
    actionPlan: ACTION_PLAN_BY_DOMAIN[concern.topDomain] ?? ACTION_PLAN_BY_CATEGORY[concern.topCategory],
    astroEvidence,
    keywordSupportLines,
    concernReasoning,
    resilienceMessage: "그럴 수 있어. 오늘은 네 마음이 약한 게 아니라, 버틴 시간이 길었다는 증거야. 천천히 가도 괜찮아. 힘내.",
    concernCategory: concern.topCategory,
    concernDomain: concern.topDomain,
    concernCategoryLabel: CATEGORY_LABEL[concern.topCategory],
    concernDomainLabel: DOMAIN_LABEL[concern.topDomain],
    concernKeywords: concern.domainKeywords.length > 0 ? concern.domainKeywords : concern.topKeywords,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
    astroSignal,
  };
}

function buildReadingFromConsultation(
  consultation: ConsultationResult,
  selectedEmotion: EmotionKey,
  emotionLabel: string,
  spriteFrame: number
): YeonHeartStarReading {
  const userProfile = ZODIAC_PROFILE[consultation.sign];
  const sunProfile = ZODIAC_PROFILE[consultation.todaySunSign];
  const elementRelation = getElementRelation(userProfile.element, sunProfile.element);
  const astroSignal = consultation.astroSignal;
  const symbol = pickHeartSymbols(consultation, selectedEmotion)[0] ?? HEART_SYMBOL_LIBRARY.moonStar;
  const letterLine = consultation.warmMessage
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("응원 키워드") && !/께,$/.test(line)) || "오늘의 너는 조금 느려도 괜찮아.";

  const reading = buildYeonHeartStarReading(
    {
      generatedAt: new Date().toISOString(),
      zodiacSign: consultation.sign,
      emotion: emotionLabel,
      concernCategory: `${consultation.concernCategoryLabel}/${consultation.concernDomainLabel}`,
      oneLineMessage: letterLine,
      warmLetter: consultation.warmMessage,
      luckyItem: consultation.luckyItem,
      luckySymbolName: symbol.name,
      luckySymbolEmoji: symbol.id === "clover" ? "🍀" : symbol.id === "moonStar" ? "🌙" : symbol.id === "lotus" ? "🪷" : symbol.id === "goldKey" ? "🗝️" : symbol.id === "butterfly" ? "🦋" : "☄️",
      luckySymbolMeaning: symbol.whisper,
      auraColorName: selectedEmotion === "happy" || selectedEmotion === "flutter" ? "복숭아빛" : selectedEmotion === "calm" ? "크림 라벤더" : "핑크 미스트",
      auraKeywords: consultation.keywordSupportLines,
      keywords: consultation.keywordSupportLines,
      yeonSprite: String(spriteFrame),
      tinyActions: {
        heartWeather: consultation.actionPlan[0] || "잠들기 전, 오늘 머릿속에 남은 생각 3개를 적어보세요.",
        loveRelation: consultation.actionPlan[1] || "오늘 먼저 건네고 싶은 말 한 문장을 보내보세요.",
        moneyReality: consultation.actionPlan[2] || "결제 전 한 번 숨 고르고 필요/욕구를 나눠보세요.",
        selfCare: "따뜻한 음료를 천천히 마시며 마음 속도를 낮춰보세요.",
        luckyRitual: "복숭아빛 메모지에 오늘 고마웠던 일 하나를 적어보세요.",
      },
    },
    {
      sunSign: astroSignal?.sunSign || consultation.todaySunSign,
      moonPhase: astroSignal?.moonSign ? `달 ${astroSignal.moonSign}` : consultation.moon.label,
      weekdayPlanet: consultation.dayRuler.label,
      zodiacAspect: astroSignal?.majorAspects[0]?.label || consultation.aspect.label,
      elementResonance: astroSignal?.healingTone || elementRelation.label,
      modalityTone: userProfile.modality === sunProfile.modality ? "리듬이 잘 맞는" : "속도를 조절하면 편안해지는",
    }
  );

  const quality = validateYeonHeartStarReading(reading);
  return quality.ok ? reading : { ...reading, meta: { ...reading.meta, debugVisible: false } };
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapByLength(input: string, maxLen: number) {
  const text = String(input || "").trim();
  if (!text) return [""];
  const lines: string[] = [];

  const paragraphs = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);

  paragraphs.forEach((paragraph) => {
    const words = paragraph.includes(" ") ? paragraph.split(/\s+/).filter(Boolean) : paragraph.split("");
    let current = "";

    words.forEach((word) => {
      const glue = paragraph.includes(" ") ? " " : "";
      const candidate = `${current}${current ? glue : ""}${word}`;
      if (candidate.length <= maxLen) {
        current = candidate;
        return;
      }
      if (current) lines.push(current);
      current = word;
    });

    if (current) lines.push(current);
  });

  if (lines.length === 0) lines.push(text);
  return lines.slice(0, 8);
}

function buildHeartCardSvg(
  date: Date,
  emotionKey: EmotionKey,
  emotionLabel: string,
  consultation: ConsultationResult,
  spriteFrame: number,
  oneLineMessage: string
) {
  const dateLabel = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  // 부적 상단 중앙에 놓일 단 하나의 연이 이미지(수호 메달) 좌표 계산
  const medallionSize = 180;
  const medallionCx = 540;
  const medallionCy = 424;
  const medallionScale = medallionSize / SPRITE_CELL_SIZE;
  const mainCellX = (spriteFrame % SPRITE_GRID_COLS) * SPRITE_CELL_SIZE;
  const mainCellY = Math.floor(spriteFrame / SPRITE_GRID_COLS) * SPRITE_CELL_SIZE;
  const medallionSpriteX = medallionCx - medallionSize / 2 - mainCellX * medallionScale;
  const medallionSpriteY = medallionCy - medallionSize / 2 - mainCellY * medallionScale;

  const safeOneLineMessage = sanitizeYeonHeartStarText(oneLineMessage);
  const safeLuckyItem = sanitizeYeonHeartStarText(consultation.luckyItem);
  const heartSymbol = pickHeartSymbols(consultation, emotionKey)[0];

  // 축복 문구는 짧게 두 줄까지만 중앙 정렬
  const blessingLines = wrapByLength(safeOneLineMessage, 18).slice(0, 2);
  const blessingText = blessingLines
    .map((line, index) => {
      const y = 1000 + index * 58;
      return `<text x="540" y="${y}" text-anchor="middle" fill="#4b2f3b" font-size="42" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("");

  // 중앙 행운 상징 글리프를 부적 코어 크기로 확대(혜성은 꼬리가 있어 좌측으로 살짝 보정)
  const emblemShiftX = heartSymbol.id === "comet" ? -42 : 0;
  const symbolEmblem = `<g transform="translate(${540 + emblemShiftX} 720) scale(2.0)">${renderHeartSymbolGlyph(heartSymbol.id, 0, 0)}</g>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="${yeonStarHugText("yeonStar.aria-label.001")}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff3f8"/>
      <stop offset="52%" stop-color="#fff8f0"/>
      <stop offset="100%" stop-color="#fff2d6"/>
    </linearGradient>
    <linearGradient id="goldBorder" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6d68a"/>
      <stop offset="50%" stop-color="#ead089"/>
      <stop offset="100%" stop-color="#dfb15c"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#fff7fb" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
    <radialGradient id="aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6d8" stop-opacity="0.95"/>
      <stop offset="68%" stop-color="#ffeccb" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ffeccb" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="symbolLeaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
    <linearGradient id="symbolMoon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d0fe"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="symbolLotus" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9a8d4"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="symbolKey" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="symbolWing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbcfe8"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="symbolStar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#f9a8d4" flood-opacity="0.35"/>
    </filter>
    <filter id="symbolGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#fda4af" flood-opacity="0.45"/>
    </filter>
    <clipPath id="yeonMedallionClip">
      <circle cx="${medallionCx}" cy="${medallionCy}" r="90"/>
    </clipPath>
  </defs>

  <rect width="1080" height="1350" fill="url(#bg)" rx="48"/>
  <g filter="url(#soft)">
    <rect x="60" y="60" width="960" height="1230" rx="40" fill="url(#panel)"/>
  </g>
  <rect x="40" y="40" width="1000" height="1270" rx="42" fill="none" stroke="url(#goldBorder)" stroke-width="5"/>
  <rect x="62" y="62" width="956" height="1226" rx="34" fill="none" stroke="#e9c987" stroke-opacity="0.55" stroke-width="2"/>

  <polygon points="${buildStarPoints(122, 124, 13, 5)}" fill="url(#goldBorder)" opacity="0.9"/>
  <polygon points="${buildStarPoints(958, 124, 13, 5)}" fill="url(#goldBorder)" opacity="0.9"/>
  <polygon points="${buildStarPoints(122, 1226, 13, 5)}" fill="url(#goldBorder)" opacity="0.9"/>
  <polygon points="${buildStarPoints(958, 1226, 13, 5)}" fill="url(#goldBorder)" opacity="0.9"/>

  <rect x="360" y="112" width="360" height="52" rx="26" fill="#ffffff" stroke="#f4c8dc"/>
  <text x="540" y="146" text-anchor="middle" fill="#db2777" font-size="25" letter-spacing="4" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">${yeonStarHugText("yeonStar.text.001")}</text>

  <text x="540" y="238" text-anchor="middle" fill="#e0396a" font-size="62" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="800">${yeonStarHugText("yeonStar.text.002")}</text>
  <text x="540" y="288" text-anchor="middle" fill="#8a6472" font-size="27" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">${escapeXml(dateLabel)} · ${escapeXml(consultation.sign)} · ${escapeXml(emotionLabel)}</text>

  <circle cx="${medallionCx}" cy="${medallionCy}" r="106" fill="url(#aura)"/>
  <circle cx="${medallionCx}" cy="${medallionCy}" r="96" fill="#fff7fb" stroke="url(#goldBorder)" stroke-width="5"/>
  <g clip-path="url(#yeonMedallionClip)">
    <image href="${SPRITE_SHEET}" x="${medallionSpriteX}" y="${medallionSpriteY}" width="${SPRITE_IMAGE_WIDTH * medallionScale}" height="${SPRITE_IMAGE_HEIGHT * medallionScale}" preserveAspectRatio="none"/>
  </g>

  <circle cx="540" cy="720" r="152" fill="url(#aura)"/>
  <circle cx="540" cy="720" r="120" fill="#fffdf6" stroke="#efd58a" stroke-width="3"/>
  <polygon points="${buildStarPoints(392, 638, 11, 4)}" fill="#f6c76a" opacity="0.85"/>
  <polygon points="${buildStarPoints(690, 660, 9, 3)}" fill="#f6c76a" opacity="0.75"/>
  <polygon points="${buildStarPoints(410, 806, 8, 3)}" fill="#f6c76a" opacity="0.7"/>
  <polygon points="${buildStarPoints(676, 792, 11, 4)}" fill="#f6c76a" opacity="0.8"/>
  ${symbolEmblem}
  <text x="540" y="936" text-anchor="middle" fill="#be185d" font-size="46" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="800">${escapeXml(heartSymbol.name)}</text>

  ${blessingText}

  <rect x="180" y="1116" width="720" height="80" rx="40" fill="url(#chip)"/>
  <text x="540" y="1166" text-anchor="middle" fill="#ffffff" font-size="30" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">오늘의 오라 아이템 · ${escapeXml(safeLuckyItem)}</text>

  <text x="540" y="1256" text-anchor="middle" fill="#a9748c" font-size="22" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">${yeonStarHugText("yeonStar.text.007")}</text>
</svg>
`.trim();
}

async function rasterizeSvgToPngBlob(svgText: string, width: number, height: number) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = typeof window !== "undefined" ? new window.Image() : document.createElement("img");
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG 이미지 로드 실패"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png", 1);
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function YeonStarHugPage() {
  const reduceMotion = useReducedMotion();
  const today = useMemo(() => new Date(), []);
  const defaultSign = useMemo(() => getSignByMonthDay(today.getMonth() + 1, today.getDate()), [today]);

  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey>("calm");
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(defaultSign);
  const [concernText, setConcernText] = useState("");
  const [heroError, setHeroError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("SVG 상징 카드로 저장하거나 공유할 수 있어요.");
  const [profileSeed, setProfileSeed] = useState<ProfileSeed>({ name: "", birthDateInput: "", birthTimeInput: "", source: "none" });
  const [profileSyncNote, setProfileSyncNote] = useState("프로필 카드 생년월일을 연결하면 별자리를 자동으로 맞춰드려요.");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [birthTimeInput, setBirthTimeInput] = useState("");
  const [consultation, setConsultation] = useState<ConsultationResult | null>(null);
  const [reading, setReading] = useState<YeonHeartStarReading | null>(null);
  const [astroSignal, setAstroSignal] = useState<YeonAstroSignal | null>(null);
  const [astroLoading, setAstroLoading] = useState(false);
  const [astroError, setAstroError] = useState("");
  const profileSyncVersionRef = useRef(0);

  const applyProfileAndAstro = async (profile: DestinyProfileCard, isCancelled: () => boolean) => {
    if (isCancelled()) return;
    const nextSeed = buildProfileSeed(profile, "profile");
    setProfileSeed(nextSeed);
    setProfileNameInput(nextSeed.name || "");
    setBirthDateInput(normalizeBirthDateText(nextSeed.birthDateInput));
    setBirthTimeInput(normalizeBirthTimeText(nextSeed.birthTimeInput));

    const signByProfile = parseSignFromBirthDateInput(nextSeed.birthDateInput);
    if (signByProfile) {
      setSelectedSign(signByProfile);
      setProfileSyncNote(`프로필 카드 생년월일(${formatBirthDateInput(nextSeed.birthDateInput)}) 기준으로 ${signByProfile}를 적용했어요.`);
    }

    const astroRequest = buildYeonAstroRequestFromProfile(profile);
    if (!astroRequest) {
      setAstroSignal(null);
      setAstroError("프로필 카드의 생년월일, 출생시간, 시간대를 확인하면 더 정밀한 별자리 위로를 받을 수 있어요.");
      return;
    }

    setAstroLoading(true);
    setAstroError("");
    try {
      const response = await authFetch("/api/astro/western-chart", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(astroRequest),
      }, { retryOn401: true });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(String(payload?.message || "astro_chart_failed"));
      const nextSignal = buildYeonAstroSignal(payload);
      if (isCancelled()) return;
      if (!nextSignal) throw new Error("astro_signal_empty");
      setAstroSignal(nextSignal);
      if (nextSignal.sunSign && isYeonZodiacSign(nextSignal.sunSign)) {
        setSelectedSign(nextSignal.sunSign as ZodiacSign);
      }
      setProfileSyncNote(`프로필 카드와 정밀 별자리 차트를 연결했어요. 달 ${nextSignal.moonSign || "신호"}의 마음 결까지 함께 읽을게요.`);
    } catch {
      if (isCancelled()) return;
      setAstroSignal(null);
      setAstroError("정밀 별자리 계산을 잠시 불러오지 못했어요. 프로필 기준 별자리로 먼저 따뜻하게 읽어볼게요.");
    } finally {
      if (!isCancelled()) setAstroLoading(false);
    }
  };

  const syncProfileFromSource = (eventProfile?: unknown) => {
    const syncVersion = profileSyncVersionRef.current + 1;
    profileSyncVersionRef.current = syncVersion;
    const isCancelled = () => syncVersion !== profileSyncVersionRef.current;
    const cachedProfile = readCurrentDestinyProfile(eventProfile, hasYeonProfileBirth);
    const cachedKey = profileSyncKey(cachedProfile);

    // 프로필 카드 화면에서 막 선택한 값은 이벤트 payload/로컬 캐시에 먼저 반영된다.
    // 서버 조회가 잠시 늦거나 503이어도 화면이 "미연결"로 남지 않도록 즉시 적용한다.
    if (cachedProfile) {
      void applyProfileAndAstro(cachedProfile, isCancelled);
    }

    void fetchCurrentDestinyProfile(hasYeonProfileBirth).then((serverProfile) => {
      if (isCancelled() || !serverProfile || profileSyncKey(serverProfile) === cachedKey) return;
      void applyProfileAndAstro(serverProfile, isCancelled);
    }).catch(() => {
      // 로컬 프로필 캐시가 이미 있으면 그것으로 화면을 유지한다.
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key && !isDestinyProfileStorageKey(event.key) && event.key !== "fortune_auth_user") return;
      syncProfileFromSource();
    };
    const handleProfileChanged = (event: Event) => {
      const eventProfile = event instanceof CustomEvent ? event.detail : undefined;
      syncProfileFromSource(eventProfile);
    };

    syncProfileFromSource();
    // 🔴 document 한 곳에만 건다(window 중복 등록 시 bubbles:true 발행이 핸들러를 2번 돌린다).
    document.addEventListener("destinyProfileChanged", handleProfileChanged);
    window.addEventListener("storage", handleProfileStorage);
    return () => {
      profileSyncVersionRef.current += 1;
      document.removeEventListener("destinyProfileChanged", handleProfileChanged);
      window.removeEventListener("storage", handleProfileStorage);
    };
  }, []);

  const syncSignFromProfile = () => {
    syncProfileFromSource();
  };

  const handleBirthDateInputChange = (value: string) => {
    const normalized = String(value || "").replace(/\D/g, "").slice(0, 8);
    setBirthDateInput(normalized);

    const signByInput = parseSignFromBirthDateInput(normalized);
    if (signByInput) {
      setSelectedSign(signByInput);
      setProfileSyncNote(`입력폼 생년월일(${formatBirthDateInput(normalized)}) 기준으로 ${signByInput}에 매칭했어요.`);
    }
  };

  const handleBirthTimeInputChange = (value: string) => {
    const normalized = String(value || "").replace(/\D/g, "").slice(0, 4);
    setBirthTimeInput(normalized);
  };

  const activeEmotion = useMemo(
    () => EMOTIONS.find((item) => item.key === selectedEmotion) ?? EMOTIONS[0],
    [selectedEmotion]
  );

  const cardSvg = useMemo(
    () => {
      if (!consultation || !reading) return "";
      return buildHeartCardSvg(
        today,
        selectedEmotion,
        activeEmotion.label,
        consultation,
        getCardSpriteFrame(consultation.sign, selectedEmotion, consultation.concernCategory, consultation.concernDomain, consultation.astroSignal),
        reading.displayCard.oneLineMessage
      );
    },
    [today, activeEmotion.label, consultation, selectedEmotion, reading]
  );

  const speechSpriteFrame = useMemo(() => {
    if (!consultation) return 0;
    return getCardSpriteFrame(consultation.sign, selectedEmotion, consultation.concernCategory, consultation.concernDomain, consultation.astroSignal);
  }, [consultation, selectedEmotion]);

  const displayWarmMessage = useMemo(() => {
    if (!consultation) return "";
    return consultation.warmMessage;
  }, [consultation]);

  const runConsultation = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    window.setTimeout(() => {
      const swissSign = astroSignal?.sunSign && isYeonZodiacSign(astroSignal.sunSign) ? astroSignal.sunSign as ZodiacSign : null;
      const matchedSign = swissSign || parseSignFromBirthDateInput(birthDateInput) || selectedSign;
      const recipientName = String(profileSeed.name || profileNameInput || "").trim();
      const recipientLabel = formatRecipientLabel(recipientName);
      const normalizedConcernText = concernText.trim() || `${recipientLabel}의 오늘 마음 흐름이 궁금해요.`;
      if (matchedSign !== selectedSign) {
        setSelectedSign(matchedSign);
      }

      const next = buildConsultation(matchedSign, selectedEmotion, normalizedConcernText, recipientName, new Date(), astroSignal);
      const spriteFrame = getCardSpriteFrame(matchedSign, selectedEmotion, next.concernCategory, next.concernDomain, next.astroSignal);
      const nextReading = buildReadingFromConsultation(next, selectedEmotion, activeEmotion.label, spriteFrame);
      setConsultation(next);
      setReading(nextReading);
      setShareFeedback("연이가 오늘의 마음 별자리 리딩을 따뜻하게 정리했어요.");
      setIsGenerating(false);
    }, 260);
  };

  const handleShare = async () => {
    if (isExporting || !consultation || !reading || !cardSvg) return;

    setIsExporting(true);
    setShareFeedback("SVG 상징 카드를 준비하고 있어요...");

    try {
      const svgBlob = new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" });
      const svgFileName = `yeon-heart-card-${selectedSign}-${selectedEmotion}.svg`;
      const svgFile = new File([svgBlob], svgFileName, { type: "image/svg+xml" });

      const shareText = `${reading.displayCard.zodiacLabel} · ${reading.displayCard.oneLineMessage}`;
      if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [svgFile] })) {
        await navigator.share({
          title: yeonStarHugText("yeonStar.title.001"),
          text: shareText,
          files: [svgFile],
        });
        setShareFeedback("SVG 상징 카드 공유가 완료됐어요.");
      } else {
        const pngBlob = await rasterizeSvgToPngBlob(cardSvg, 1080, 1350);
        if (pngBlob) {
          const pngFile = new File([pngBlob], svgFileName.replace(".svg", ".png"), { type: "image/png" });
          if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [pngFile] })) {
            await navigator.share({
              title: yeonStarHugText("yeonStar.title.002"),
              text: shareText,
              files: [pngFile],
            });
            setShareFeedback("PNG 카드 공유로 전달했어요. 원본은 SVG로 보관할 수 있어요.");
          } else {
            downloadBlob(svgBlob, svgFileName);
            setShareFeedback("고화질 SVG 카드 저장 완료. 어디서나 깨지지 않게 사용할 수 있어요.");
          }
        } else {
          downloadBlob(svgBlob, svgFileName);
          setShareFeedback("고화질 SVG 카드 저장 완료.");
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      }
    } catch {
      setShareFeedback("공유 중 문제가 발생했어요. 다시 눌러볼까요?");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fffaf7] px-4 py-8 text-[#3c1830] md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-14 top-8 h-72 w-72 rounded-full bg-[#f4bed1]/35 blur-3xl" />
        <div className="absolute right-[-4rem] top-[-2rem] h-72 w-72 rounded-full bg-[#f9dbe5]/45 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-[#fff8dc]/80 blur-3xl" />
        {STAR_DOTS.map((dot, idx) => (
          <m.span
            key={idx}
            className="absolute text-pink-300/75"
            style={{ left: dot.left, top: dot.top }}
            animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, delay: dot.delay, ease: "easeInOut" }}
          >
            ✦
          </m.span>
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <m.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid gap-5 rounded-3xl border border-[#f4d8e3] bg-white/85 p-5 shadow-[0_14px_36px_rgba(150,72,104,0.12)] backdrop-blur-sm md:grid-cols-[1.1fr_0.9fr] md:p-8"
        >
          <div className="space-y-4">
            <m.div
              animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={reduceMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/85 px-4 py-2 text-sm font-semibold text-pink-500"
            >
              <Heart className="h-4 w-4 fill-pink-200 text-pink-400" />
              연이의 별빛 상담소
            </m.div>

            <h1 className="font-['ui-rounded','Nunito',sans-serif] text-3xl font-black leading-tight text-[#b31955] md:text-5xl">
              연이의 마음 별자리
            </h1>
            <p className="font-['ui-rounded','Nunito',sans-serif] text-sm text-slate-600 md:text-base">
              오늘의 감정과 고민을 별빛 흐름으로 다정하게 정리해줄게요.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
              태양 위치, 달 위상, 요일 행성 흐름을 기반으로 현실적인 한 줄 행동까지 제안해요. 감정 선택부터 상담 결과,
              SVG 행운 상징 카드 저장까지 한 번에 이어집니다.
            </p>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-100/80 via-white/75 to-orange-100/75 p-4">
            {!heroError ? (
              <Image
                src={HERO_IMAGE}
                alt={yeonStarHugText("yeonStar.alt.001")}
                width={900}
                height={620}
                className="h-full max-h-[360px] w-full max-w-full rounded-2xl object-contain"
                onError={() => setHeroError(true)}
                priority
              />
            ) : (
              <div className="flex h-full min-h-44 w-full flex-col items-center justify-center rounded-2xl bg-pink-50/80 text-pink-500">
                <Sparkles className="mb-2 h-8 w-8" />
                <p className="text-sm font-semibold">연이 아트 로딩중</p>
              </div>
            )}
          </div>
        </m.section>

        <section className="grid gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.8fr)] lg:items-start">
          <m.article
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-3xl border border-[#f4d8e3] bg-white/88 p-5 shadow-[0_14px_34px_rgba(150,72,104,0.12)] backdrop-blur-sm lg:sticky lg:top-6"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">입력 패널</p>
            <h2 className="text-xl font-black text-slate-700">감정 선택 → 별자리 → 고민 입력</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">오늘 마음을 편안하게 정리할 수 있도록 입력 동선을 간결하게 준비했어요.</p>

            <div className="mb-4 rounded-2xl border border-[#ead089]/80 bg-[#fff8dc]/70 p-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-[#70445c]">연결된 프로필 카드</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${profileSeed.source === "profile" ? "bg-[#f4bed1]/50 text-[#8f1647]" : "bg-white/80 text-[#70445c]"}`}>
                  {profileSeed.source === "profile" ? "연결됨" : "미연결"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#3c1830]">{profileSeed.name || "프로필 카드를 선택해 주세요"}</p>
              <p className="mt-1 text-xs leading-6 text-[#70445c]">생년월일 {formatBirthDateInput(profileSeed.birthDateInput)} · 출생시간 {formatBirthTimeInput(profileSeed.birthTimeInput)}</p>
              <p className="mt-1 text-xs leading-6 text-[#70445c]">{profileSyncNote}</p>
              <p className="mt-1 text-xs leading-6 text-[#70445c]">
                {astroLoading
                  ? "연이가 정밀 별자리 차트를 읽고 있어요."
                  : astroSignal
                    ? `정밀 신호: 태양 ${astroSignal.sunSign || "-"} · 달 ${astroSignal.moonSign || "-"} · 상승궁 ${astroSignal.ascendantSign || "-"}`
                    : astroError}
              </p>
              <button
                type="button"
                onClick={syncSignFromProfile}
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-[#ead089] bg-white px-3 py-1.5 text-xs font-bold text-[#70445c] transition hover:bg-[#fff3f8]"
              >
                프로필 카드 기준으로 별자리 다시 맞추기
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-pink-200 bg-white/92 p-4 shadow-[0_10px_26px_rgba(236,72,153,0.12)] sm:grid-cols-2">
              <label htmlFor="yeon-profile-name" className="grid gap-1">
                <span className="text-xs font-bold text-pink-600">이름 (프로필 카드 자동 입력)</span>
                <input
                  id="yeon-profile-name"
                  type="text"
                  value={profileNameInput}
                  onChange={(event) => setProfileNameInput(event.target.value.slice(0, 30))}
                  placeholder={yeonStarHugText("yeonStar.placeholder.001")}
                  className="min-h-12 rounded-xl border border-pink-200 bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400 focus-visible:ring-2 focus-visible:ring-pink-200"
                />
              </label>

              <label htmlFor="yeon-birth-date" className="grid gap-1">
                <span className="text-xs font-bold text-pink-600">생년월일 (YYYYMMDD)</span>
                <input
                  id="yeon-birth-date"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={birthDateInput}
                  onChange={(event) => handleBirthDateInputChange(event.target.value)}
                  placeholder="19990125"
                  className="min-h-12 rounded-xl border border-pink-200 bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400 focus-visible:ring-2 focus-visible:ring-pink-200"
                />
              </label>

              <label htmlFor="yeon-birth-time" className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-bold text-pink-600">출생시간 (HHMM, 선택)</span>
                <input
                  id="yeon-birth-time"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={birthTimeInput}
                  onChange={(event) => handleBirthTimeInputChange(event.target.value)}
                  placeholder="0730"
                  className="min-h-12 rounded-xl border border-pink-200 bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-pink-400 focus-visible:ring-2 focus-visible:ring-pink-200"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EMOTIONS.map((emotion) => {
                const isActive = selectedEmotion === emotion.key;
                return (
                  <m.button
                    key={emotion.key}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedEmotion(emotion.key)}
                    className={`min-h-11 rounded-2xl border px-2 py-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 ${
                      isActive
                        ? `border-pink-200 bg-gradient-to-br ${emotion.tone} shadow-[0_8px_20px_rgba(248,113,113,0.26)]`
                        : "border-pink-100 bg-white/90"
                    }`}
                    aria-label={`${emotion.label} 감정 선택`}
                  >
                    <emotion.Icon className={`mx-auto mb-1 h-4 w-4 ${isActive ? "text-pink-500" : "text-rose-400"}`} />
                    <span className={`text-xs font-bold ${isActive ? "text-slate-700" : "text-slate-600"}`}>{emotion.label}</span>
                  </m.button>
                );
              })}
            </div>

            <label htmlFor="yeon-zodiac-select" className="mt-5 block text-xs font-semibold text-pink-500">내 별자리</label>
            <select
              id="yeon-zodiac-select"
              value={selectedSign}
              onChange={(event) => setSelectedSign(event.target.value as ZodiacSign)}
              className="mt-1 min-h-11 w-full appearance-none rounded-xl border border-white/35 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100"
              aria-label={yeonStarHugText("yeonStar.aria-label.002")}
            >
              {ZODIAC_SIGNS.map((item) => (
                <option key={item.sign} value={item.sign}>{`${item.sign} (${item.period})`}</option>
              ))}
            </select>

            <label htmlFor="yeon-concern-input" className="mt-4 block text-xs font-semibold text-pink-500">지금 고민 (키워드 인식용)</label>
            <textarea
              id="yeon-concern-input"
              value={concernText}
              onChange={(event) => setConcernText(event.target.value)}
              placeholder={yeonStarHugText("yeonStar.placeholder.002")}
              className="mt-1 min-h-32 w-full resize-y rounded-xl border border-white/35 bg-white/90 px-3 py-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100"
              aria-label={yeonStarHugText("yeonStar.aria-label.003")}
            />

            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
              <p className="text-xs font-semibold text-rose-500">추천 고민 샘플 문장</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENERAL_CONCERN_SAMPLES.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setConcernText(sample)}
                    className="min-h-9 rounded-full border border-rose-200 bg-white px-3 py-1 text-left text-[11px] font-medium leading-relaxed text-[#3c1830] transition hover:border-rose-300 hover:bg-rose-50"
                    aria-label={`추천 샘플 문장 적용: ${sample}`}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={runConsultation}
              disabled={isGenerating}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_20px_rgba(251,113,133,0.33)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? <Download className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "연이가 별빛 흐름 정리중..." : "연이 상담 업데이트"}
            </button>
            <p className="mt-2 text-xs text-slate-500">상담 흐름: 감정 선택 → 별자리 선택 → 고민 입력 → 결과 분석 → SVG 카드</p>
          </m.article>

          <div className="flex min-w-0 flex-col gap-5">
            {!consultation || !reading ? (
              <m.article
                initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-[#f4d8e3] bg-white/85 p-8 text-center shadow-[0_14px_34px_rgba(150,72,104,0.1)] backdrop-blur-sm"
              >
                <p className="text-sm font-semibold text-pink-500">감정과 고민을 입력하면 연이가 별빛 상담을 준비해요.</p>
                <p className="mt-2 text-xs text-slate-500">업데이트 버튼을 누르면 분석 결과, SVG 카드, 실행 3단계가 순서대로 표시됩니다.</p>
              </m.article>
            ) : (
              <>
                <m.article
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-3xl border border-[#f4d8e3] bg-white/90 p-5 shadow-[0_14px_34px_rgba(150,72,104,0.12)] backdrop-blur-sm sm:p-7"
                >
                  <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[#b31955]">오늘의 마음 리딩</p>
                  <h2 className="text-2xl font-black text-[#3c1830] sm:text-3xl">오늘의 점성술 상담</h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-[#5b2544]">별자리: {consultation.sign}</span>
                    {profileSeed.birthDateInput ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                        프로필 기준 생일: {formatBirthDateInput(profileSeed.birthDateInput)}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[#5b2544]">기간: {consultation.period}</span>
                    <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-pink-500">태양: {consultation.todaySunSign}</span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-500">달: {consultation.moon.label}</span>
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-500">요일 행성: {consultation.dayRuler.label}</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600">별자리 각도: {consultation.aspect.label}</span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#f4d8e3] bg-white p-4 text-[#3c1830] sm:p-6">
                    <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
                      <p className="text-xs font-semibold text-rose-500">{consultation.recipientLabel}께,</p>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-[#3c1830] md:text-base">{reading.displayCard.oneLineMessage}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {reading.displayCard.keywords.map((keyword) => (
                          <span key={keyword} className="rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-600">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-pink-100 bg-white px-4 py-3">
                      <div className="mb-3 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-white shadow-[0_10px_24px_rgba(244,114,182,0.14)]">
                        <div className="bg-gradient-to-r from-rose-200/70 via-pink-100/70 to-amber-100/70 px-3 py-2">
                          <p className="text-[11px] font-bold tracking-[0.08em] text-rose-700">연이의 응원 편지</p>
                        </div>
                        <div className="grid gap-3 px-3 py-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-start">
                          <div className="rounded-xl border border-pink-100 bg-white/80 p-1.5">
                            <div className="mx-auto h-[72px] w-[72px] overflow-hidden rounded-lg border border-white/70 bg-white/70 shadow-sm">
                              <svg viewBox="0 0 1 1" className="h-full w-full" role="img" aria-label="연이 스프라이트 컷">
                                <image
                                  href={SPRITE_SHEET}
                                  x={-(speechSpriteFrame % SPRITE_GRID_COLS)}
                                  y={-Math.floor(speechSpriteFrame / SPRITE_GRID_COLS)}
                                  width={SPRITE_GRID_COLS}
                                  height={SPRITE_GRID_ROWS}
                                  preserveAspectRatio="xMinYMin slice"
                                />
                              </svg>
                            </div>
                            <p className="mt-1.5 text-center text-[10px] font-semibold text-pink-500">연이의 오늘 스탬프</p>
                          </div>

                          <AnimatePresence mode="wait">
                            <m.div
                              key={`${selectedEmotion}-${selectedSign}-${displayWarmMessage}`}
                              initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                              transition={{ duration: 0.25 }}
                              className="min-h-[160px] whitespace-pre-line rounded-xl border border-rose-100 bg-white/85 px-4 py-4 text-[15px] leading-7 text-[#3c1830] sm:px-5"
                            >
                              <p className="text-xs font-semibold text-rose-500">{consultation.recipientLabel}께 드리는 오늘의 편지</p>
                              <p className="mt-1.5 text-[15px] font-semibold leading-7 text-[#3c1830]">{displayWarmMessage}</p>
                            </m.div>
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 sm:px-3.5 sm:py-3.5">
                        <p className="text-[11px] font-extrabold tracking-[0.08em] text-amber-700">고민이 커진 이유 (점성술 분석)</p>
                        <div className="mt-2.5 grid gap-2">
                          {consultation.concernReasoning.map((line, idx) => (
                            <div key={`reason-${idx}`} className="rounded-xl border border-amber-200 bg-white/90 px-3 py-3">
                              <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-amber-600">근거 {idx + 1}</p>
                              <p className="mt-1 text-sm leading-7 text-amber-950">{line}</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2.5 rounded-lg border border-amber-300 bg-white/85 px-3 py-3 text-sm font-semibold leading-7 text-amber-950">
                          {consultation.resilienceMessage}
                        </p>
                      </div>

                        <div className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2">
                          <p className="text-[11px] font-semibold text-purple-500">오늘의 별빛 상담 7가지</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {reading.categories.map((section) => (
                              <div key={section.id} className="min-w-0 rounded-xl border border-white/70 bg-white/80 p-3">
                                <p className="text-sm font-bold text-[#3c1830]">{section.icon} {section.label}</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {section.keywords.slice(0, 3).map((keyword) => (
                                    <span key={`${section.id}-${keyword}`} className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-2 text-sm font-semibold leading-7 text-[#3c1830]">{section.shortMessage}</p>
                                <p className="mt-1 text-sm leading-7 text-[#70445c]">{section.healingReading}</p>
                                <p className="mt-2 text-sm font-semibold leading-7 text-[#b31955]">오늘의 작은 행동: {section.tinyAction}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                </m.article>

                <m.article
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.04 }}
                  className="rounded-3xl border border-white/45 bg-white/80 p-5 shadow-[0_14px_34px_rgba(236,72,153,0.2)] backdrop-blur-sm"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-400">공유 카드</p>
                  <h2 className="text-lg font-black text-slate-700">고화질 SVG 행운 상징 카드</h2>

                  <div className="mt-3 rounded-2xl border border-white/25 bg-white/90 p-3">
                    <div
                      className="mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-xl border border-pink-100 bg-white [&_svg]:h-full [&_svg]:w-full"
                        aria-label={yeonStarHugText("yeonStar.aria-label.004")}
                      dangerouslySetInnerHTML={{ __html: cardSvg }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={isExporting || !reading}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_20px_rgba(251,113,133,0.33)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isExporting ? <Download className="h-4 w-4 animate-pulse" /> : <Share2 className="h-4 w-4" />}
                    {isExporting ? "SVG 상징 카드 준비중..." : "SVG 상징 카드 공유/저장"}
                  </button>
                  <p className="mt-2 min-h-5 text-xs text-slate-500">{shareFeedback}</p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-pink-200/35 bg-white/90 p-3 text-slate-700">
                      <p className="text-xs font-semibold text-pink-500">핵심 포커스</p>
                      <p className="mt-1 text-xs font-semibold text-purple-600">{reading.summary.title}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{reading.summary.description}</p>
                    </div>

                    <div className="rounded-xl border border-rose-200/35 bg-white/90 p-3 text-slate-700">
                      <p className="text-xs font-semibold text-rose-500">오늘의 실행 3단계</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-slate-600">
                        {reading.categories.slice(0, 3).map((section) => (
                          <li key={section.id} className="break-words">{section.tinyAction}</li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs font-semibold text-slate-700">행운 아이템: {reading.displayCard.auraItem.name}</p>
                    </div>
                  </div>
                </m.article>
              </>
            )}
          </div>
        </section>

        <section className="grid gap-3 rounded-3xl border border-white/45 bg-white/75 p-5 shadow-[0_14px_34px_rgba(236,72,153,0.14)] backdrop-blur-sm md:grid-cols-3">
          <article>
            <h2 className="text-base font-black text-slate-700">결과 저장하고 다시 보기</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              카드 이미지를 저장하면 오늘 뽑힌 행운 상징과 한 문장이 그대로 남아요. 하루가 지난 뒤 다시 열어보면 지금과
              다르게 읽히는 부분이 있는지 확인해 보세요.
            </p>
          </article>
          <article>
            <h2 className="text-base font-black text-slate-700">행운 상징 6종 미리보기</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              네잎 클로버(작은 행운이 동시에 열리는 날), 달과 별(감정을 다독이는 치유), 연꽃(흔들림 속 회복력), 황금 열쇠(막힌
              흐름을 푸는 해답), 나비(관계와 마음의 가벼운 변화), 혜성(정체를 돌파하는 용기) — 오늘 카드에 어떤 상징이 나올지는
              감정과 고민에 따라 달라져요.
            </p>
          </article>
          <article>
            <h2 className="text-base font-black text-slate-700">오늘 다시 확인하면 결과가 바뀌나요?</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              네, 감정 선택이나 고민 문장을 바꾸면 리딩이 새로 계산돼요. 같은 날 여러 번 확인해도 괜찮지만, 가장 처음
              마음에 남은 문장을 기준으로 삼는 걸 추천해요.
            </p>
          </article>
          <article className="md:col-span-3">
            <h2 className="text-base font-black text-slate-700">공유 전 확인할 것</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              카드를 다른 사람과 공유하기 전에 이름·생년월일이 원치 않게 드러나진 않는지 한 번 더 확인하세요. 별자리 리딩은
              참고용 상담이니, 무겁게 받아들이기보다 오늘의 기분을 가볍게 나누는 용도로 활용해 주세요.
            </p>
          </article>
        </section>

        <m.nav
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4"
          aria-label={yeonStarHugText("yeonStar.aria-label.005")}
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-xs font-semibold text-pink-500 shadow-sm">
            <Heart className="h-4 w-4" /> 감정 + 고민 입력
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-200 bg-white/80 px-4 py-2 text-xs font-semibold text-purple-500 shadow-sm">
            <Sparkles className="h-4 w-4" /> 실시간 키워드 인식
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-semibold text-amber-600 shadow-sm">
            <Cloud className="h-4 w-4" /> 실제 점성술 신호
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-xs font-semibold text-rose-500 shadow-sm">
            <Coins className="h-4 w-4" /> SVG 카드 공유
          </div>
        </m.nav>
      </div>
    </main>
  );
}
