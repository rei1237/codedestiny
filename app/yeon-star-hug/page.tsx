"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";

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

type ConcernCategory = "love" | "work" | "money" | "family" | "health" | "self";

type ConcernDomain =
  | "career"
  | "study"
  | "social"
  | "romance"
  | "familyCare"
  | "finance"
  | "wellness"
  | "growth";

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
  sign: ZodiacSign;
  period: string;
  overall: number;
  love: number;
  money: number;
  luckyItem: string;
  warmMessage: string;
  practicalTip: string;
  actionPlan: string[];
  concernCategoryLabel: string;
  concernDomainLabel: string;
  concernKeywords: string[];
  todaySunSign: ZodiacSign;
  moon: MoonSnapshot;
  aspect: AspectSnapshot;
  dayRuler: DayRulerSnapshot;
};

const HERO_IMAGE = "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp";
const SPRITE_SHEET =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";

const EMOTIONS: EmotionOption[] = [
  { key: "happy", label: "행복해", Icon: Smile, tone: "from-pink-300 to-orange-200" },
  { key: "calm", label: "편안해", Icon: Cloud, tone: "from-cyan-200 to-purple-200" },
  { key: "tired", label: "지쳤어", Icon: BatteryLow, tone: "from-amber-200 to-rose-200" },
  { key: "worried", label: "걱정돼", Icon: CloudRain, tone: "from-blue-200 to-purple-200" },
  { key: "flutter", label: "설레어", Icon: Sparkles, tone: "from-pink-200 to-fuchsia-200" },
  { key: "blue", label: "우울해", Icon: Moon, tone: "from-indigo-200 to-blue-200" },
];

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
};

const KEYWORD_DICT: Record<ConcernCategory, string[]> = {
  love: ["연애", "사랑", "썸", "이별", "고백", "데이트", "남친", "여친", "관계", "호감", "권태기", "재회", "연락", "답장", "소개팅"],
  work: ["회사", "직장", "업무", "프로젝트", "면접", "이직", "커리어", "팀장", "상사", "동료", "성과", "평가", "승진", "퇴사", "마감", "회의"],
  money: ["돈", "재정", "지출", "저축", "투자", "월급", "카드값", "대출", "수입", "적금", "비상금", "예산", "소비", "빚", "부업"],
  family: ["가족", "부모", "엄마", "아빠", "형제", "자매", "집안", "육아", "부부", "배우자", "친척", "갈등", "돌봄", "집안일"],
  health: ["건강", "수면", "잠", "피곤", "우울", "불안", "스트레스", "두통", "몸", "번아웃", "무기력", "호흡", "회복", "식습관", "운동", "소화"],
  self: ["미래", "진로", "선택", "결정", "자존감", "자신감", "목표", "불확실", "정체성", "의미", "방향", "성장", "동기", "집중"],
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
};

const LUCKY_ITEM_BY_CATEGORY: Record<ConcernCategory, string[]> = {
  love: ["장미향 립밤", "파스텔 메모카드", "작은 향수 샘플", "하트 북마크"],
  work: ["타이머 위젯", "라인 노트", "포스트잇 세트", "짧은 집중 플레이리스트"],
  money: ["소비 기록 스티커", "가계부 템플릿", "지출 체크 알람", "예산 카드지갑"],
  family: ["따뜻한 차 티백", "안부 메모", "가족 캘린더", "작은 포토키링"],
  health: ["수면 안대", "라벤더 캔들", "호흡 타이머", "물병 리마인더"],
  self: ["확언 노트", "한줄 일기 카드", "마음 정리 템플릿", "작은 목표 체크표"],
};

const ACTION_PLAN_BY_CATEGORY: Record<ConcernCategory, string[]> = {
  love: ["감정 해석보다 사실 확인 질문 1개를 먼저 보내기", "답장을 재촉하기보다 내 상태를 먼저 한 문장으로 전달하기", "오늘은 관계 결론보다 감정 온도 맞추기를 우선하기"],
  work: ["가장 큰 업무를 20분 단위로 쪼개 첫 블록만 시작하기", "완벽 기준 3개만 남기고 나머지는 내일로 미루기", "업무 종료 전 5분 회고로 내일의 첫 할 일 1개 적기"],
  money: ["오늘 지출은 즉시 결제 전 10분 보류하기", "필요/위로 소비를 분리해 체크하기", "저녁에 1분만 써서 오늘의 소비 이유 기록하기"],
  family: ["해결보다 안부와 공감 한 문장 먼저 보내기", "가족 대화에서 요구 1개만 명확히 말하기", "감정이 올라오면 5초 멈춘 뒤 말의 속도 낮추기"],
  health: ["잠들기 1시간 전 화면 밝기 낮추기", "3분 복식호흡으로 긴장 신호 끊기", "오늘은 생산성보다 회복 루틴 1개 완료를 목표로 두기"],
  self: ["내가 통제 가능한 일 1개만 적고 바로 실행하기", "비교 대신 오늘 기준의 작은 진전 1개 찾기", "결정은 정보 70%에서 일단 움직이고 보정하기"],
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
};

const EMOTION_INDEX: Record<EmotionKey, number> = {
  happy: 0,
  calm: 1,
  tired: 2,
  worried: 3,
  flutter: 4,
  blue: 5,
};

const WEEKDAY_RULER: Array<{ label: string; summary: string; scoreBias: { overall: number; love: number; money: number } }> = [
  { label: "태양의 날", summary: "자기표현과 자신감이 올라가는 흐름", scoreBias: { overall: 0.4, love: 0.2, money: 0 } },
  { label: "달의 날", summary: "감정 공감과 관계 회복에 유리한 흐름", scoreBias: { overall: 0.2, love: 0.5, money: -0.1 } },
  { label: "화성의 날", summary: "행동력은 강하지만 말의 온도 조절이 중요한 흐름", scoreBias: { overall: 0.2, love: -0.1, money: 0.1 } },
  { label: "수성의 날", summary: "대화, 학습, 실무 정리에 강한 흐름", scoreBias: { overall: 0.3, love: 0.1, money: 0.2 } },
  { label: "목성의 날", summary: "기회 포착과 확장 판단에 힘이 실리는 흐름", scoreBias: { overall: 0.4, love: 0.1, money: 0.5 } },
  { label: "금성의 날", summary: "관계 조율, 호감, 미적 감각이 살아나는 흐름", scoreBias: { overall: 0.3, love: 0.7, money: 0.1 } },
  { label: "토성의 날", summary: "현실 점검과 구조화에 유리한 흐름", scoreBias: { overall: 0.1, love: -0.1, money: 0.4 } },
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

const SPRITE_FRAMES = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toScore(value: number) {
  return Math.round(clamp(value, 1, 5));
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
    return { age, illumination, label: "신월", scoreBias: { overall: 0.1, love: 0.1, money: 0.2 } };
  }
  if (age < 5.54) {
    return { age, illumination, label: "초승달", scoreBias: { overall: 0.4, love: 0.3, money: 0.2 } };
  }
  if (age < 9.23) {
    return { age, illumination, label: "상현달", scoreBias: { overall: 0.3, love: 0.2, money: 0.4 } };
  }
  if (age < 12.92) {
    return { age, illumination, label: "차오르는 달", scoreBias: { overall: 0.5, love: 0.4, money: 0.3 } };
  }
  if (age < 16.61) {
    return { age, illumination, label: "보름달", scoreBias: { overall: 0.2, love: 0.6, money: 0.1 } };
  }
  if (age < 20.3) {
    return { age, illumination, label: "기우는 달", scoreBias: { overall: 0.1, love: 0.2, money: 0.4 } };
  }
  if (age < 23.99) {
    return { age, illumination, label: "하현달", scoreBias: { overall: 0, love: -0.1, money: 0.5 } };
  }
  return { age, illumination, label: "그믐달", scoreBias: { overall: 0.1, love: 0, money: 0.3 } };
}

function getAspectSnapshot(userSign: ZodiacSign, todaySunSign: ZodiacSign): AspectSnapshot {
  const rawDistance = Math.abs(ZODIAC_INDEX[userSign] - ZODIAC_INDEX[todaySunSign]);
  const distance = Math.min(rawDistance, 12 - rawDistance);

  if (distance === 0) {
    return {
      distance,
      label: "합(Conjunction)",
      summary: "오늘 태양과 네 별자리가 같은 축에 있어 집중력이 또렷해.",
      scoreBias: 0.8,
    };
  }
  if (distance === 2) {
    return {
      distance,
      label: "육합(Sextile)",
      summary: "작은 기회가 자연스럽게 연결되는 날의 각도야.",
      scoreBias: 0.5,
    };
  }
  if (distance === 3) {
    return {
      distance,
      label: "사각(Square)",
      summary: "마찰이 있지만 방향 수정으로 성과를 만드는 각도야.",
      scoreBias: -0.6,
    };
  }
  if (distance === 4) {
    return {
      distance,
      label: "삼합(Trine)",
      summary: "흐름이 부드럽게 이어지는 행운의 각도야.",
      scoreBias: 0.9,
    };
  }
  if (distance === 6) {
    return {
      distance,
      label: "대립(Opposition)",
      summary: "상대 시선을 통해 균형을 회복하는 조율 각도야.",
      scoreBias: -0.7,
    };
  }
  return {
    distance,
    label: "중립 각도",
    summary: "큰 충돌 없이 루틴을 안정화하기 좋은 각도야.",
    scoreBias: 0.1,
  };
}

function extractConcernAnalysis(concernText: string): ConcernAnalysis {
  const text = concernText.trim().toLowerCase();
  const weights: Record<ConcernCategory, number> = {
    love: 0,
    work: 0,
    money: 0,
    family: 0,
    health: 0,
    self: 0,
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
  };
  const hitSet = new Set<string>();
  const domainHitSet = new Set<string>();

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
      if (text.includes(keyword)) {
        weights[category] += category === "health" ? 1.1 : 0.8;
        hitSet.add(keyword);
      }
    });
  });

  DOMAIN_RULES.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        domainWeights[rule.domain] += rule.weight;
        weights[rule.category] += rule.weight * 0.9;
        hitSet.add(keyword);
        domainHitSet.add(keyword);
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

function getCardSpriteFrame(sign: ZodiacSign, emotion: EmotionKey) {
  const zodiacOffset = ZODIAC_INDEX[sign] % SPRITE_FRAMES;
  return (EMOTION_INDEX[emotion] + zodiacOffset) % SPRITE_FRAMES;
}

function pickLuckyItem(category: ConcernCategory, seed: string) {
  const items = LUCKY_ITEM_BY_CATEGORY[category];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

function buildConsultation(selectedSign: ZodiacSign, selectedEmotion: EmotionKey, concernText: string, date: Date): ConsultationResult {
  const todaySunSign = getSignByMonthDay(date.getMonth() + 1, date.getDate());
  const moon = getMoonSnapshot(date);
  const aspect = getAspectSnapshot(selectedSign, todaySunSign);
  const dayRuler = WEEKDAY_RULER[date.getDay()] || WEEKDAY_RULER[0];
  const concern = extractConcernAnalysis(concernText);
  const emotionBias = EMOTION_BIAS[selectedEmotion];

  const focusBias = {
    overall: concern.weights.self * 0.2 + concern.weights.health * 0.25,
    love: concern.weights.love * 0.55 + concern.weights.family * 0.25,
    money: concern.weights.money * 0.65 + concern.weights.work * 0.3,
  };

  const overall = toScore(3 + emotionBias.overall + moon.scoreBias.overall + dayRuler.scoreBias.overall + aspect.scoreBias * 0.45 + focusBias.overall * 0.2);
  const love = toScore(3 + emotionBias.love + moon.scoreBias.love + dayRuler.scoreBias.love + aspect.scoreBias * 0.4 + focusBias.love * 0.25);
  const money = toScore(3 + emotionBias.money + moon.scoreBias.money + dayRuler.scoreBias.money + aspect.scoreBias * 0.3 + focusBias.money * 0.22);

  const luckyItem = pickLuckyItem(concern.topCategory, `${selectedSign}-${selectedEmotion}-${date.toDateString()}-${concernText}`);
  const concernHint = concern.topKeywords.length > 0 ? `"${concern.topKeywords.join(", ")}"` : "오늘 네 마음 상태";

  const practicalTip = `${CATEGORY_LABEL[concern.topCategory]} · ${DOMAIN_LABEL[concern.topDomain]} 고민은 "작게 쪼개서 실행"할수록 정확도가 올라가. ${DOMAIN_TIP[concern.topDomain]}`;

  const warmMessage = [
    EMOTION_OPENING[selectedEmotion],
    `지금 하늘은 ${todaySunSign} 태양, ${moon.label}, 그리고 ${dayRuler.label} 흐름이 겹쳐 있어.`,
    `${aspect.summary} 그래서 ${concernHint}를 다룰 때 감정 해석보다 사실 확인이 더 중요해.`,
    `특히 ${DOMAIN_LABEL[concern.topDomain]} 영역은 오늘 말의 속도보다 맥락 정리가 성과를 높여줘.`,
    practicalTip,
  ].join(" ");

  const signInfo = ZODIAC_SIGNS.find((item) => item.sign === selectedSign) ?? ZODIAC_SIGNS[0];

  return {
    sign: selectedSign,
    period: signInfo.period,
    overall,
    love,
    money,
    luckyItem,
    warmMessage,
    practicalTip,
    actionPlan: ACTION_PLAN_BY_DOMAIN[concern.topDomain] ?? ACTION_PLAN_BY_CATEGORY[concern.topCategory],
    concernCategoryLabel: CATEGORY_LABEL[concern.topCategory],
    concernDomainLabel: DOMAIN_LABEL[concern.topDomain],
    concernKeywords: concern.domainKeywords.length > 0 ? concern.domainKeywords : concern.topKeywords,
    todaySunSign,
    moon,
    aspect,
    dayRuler,
  };
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

  const words = text.includes(" ") ? text.split(/\s+/).filter(Boolean) : text.split("");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const glue = text.includes(" ") ? " " : "";
    const candidate = `${current}${current ? glue : ""}${word}`;
    if (candidate.length <= maxLen) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length === 0) lines.push(text);
  return lines.slice(0, 4);
}

function buildHeartCardSvg(date: Date, emotionLabel: string, consultation: ConsultationResult, spriteFrame: number) {
  const dateLabel = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const frameSize = 148;
  const spriteX = 826 - spriteFrame * frameSize;
  const messageLines = wrapByLength(consultation.warmMessage, 28).map((line, index) => {
    const y = 650 + index * 54;
    return `<text x="86" y="${y}" fill="#4b5563" font-size="32" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">${escapeXml(line)}</text>`;
  });

  const keywordLine = consultation.concernKeywords.length > 0
    ? `키워드: ${consultation.concernKeywords.join(", ")}`
    : `키워드: 감정 중심 리딩`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="연이의 마음 카드 SVG">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde7f3"/>
      <stop offset="52%" stop-color="#f8e8ff"/>
      <stop offset="100%" stop-color="#fff2df"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#f9a8d4" flood-opacity="0.35"/>
    </filter>
    <clipPath id="yeonMainClip">
      <rect x="826" y="156" width="148" height="148" rx="34"/>
    </clipPath>
    <clipPath id="yeonSubClip">
      <rect x="838" y="1148" width="126" height="126" rx="28"/>
    </clipPath>
  </defs>

  <rect width="1080" height="1350" fill="url(#bg)" rx="48"/>
  <circle cx="940" cy="120" r="120" fill="#ffffff" fill-opacity="0.35"/>
  <circle cx="120" cy="1240" r="140" fill="#fff7d6" fill-opacity="0.62"/>

  <g filter="url(#soft)">
    <rect x="54" y="54" width="972" height="1242" rx="40" fill="#ffffff" fill-opacity="0.84"/>
  </g>

  <rect x="86" y="92" width="300" height="56" rx="28" fill="#ffffff"/>
  <text x="122" y="128" fill="#ec4899" font-size="30" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">YEON HEART CARD</text>

  <text x="86" y="222" fill="#f43f5e" font-size="68" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="800">연이의 마음 별자리</text>
  <text x="86" y="278" fill="#6b7280" font-size="32" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">${escapeXml(dateLabel)} · ${escapeXml(emotionLabel)} 감정 리딩</text>

  <rect x="826" y="156" width="148" height="148" rx="34" fill="#fff7fb" stroke="#f9a8d4"/>
  <g clip-path="url(#yeonMainClip)">
    <image href="${SPRITE_SHEET}" x="${spriteX}" y="156" width="${frameSize * SPRITE_FRAMES}" height="${frameSize}" preserveAspectRatio="xMinYMin slice"/>
  </g>
  <text x="846" y="330" fill="#db2777" font-size="24" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">연이 프레임</text>

  <rect x="86" y="332" width="908" height="208" rx="28" fill="#fff7fb" stroke="#fbcfe8"/>
  <text x="124" y="390" fill="#db2777" font-size="34" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">오늘의 점성술 근거</text>
  <text x="124" y="438" fill="#4b5563" font-size="30" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">태양: ${escapeXml(consultation.todaySunSign)} · 달: ${escapeXml(consultation.moon.label)}</text>
  <text x="124" y="482" fill="#4b5563" font-size="30" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">각도: ${escapeXml(consultation.aspect.label)} · 요일 행성: ${escapeXml(consultation.dayRuler.label)}</text>

  <rect x="86" y="584" width="908" height="396" rx="28" fill="#ffffff" stroke="#f9a8d4"/>
  ${messageLines.join("")}

  <rect x="86" y="1012" width="908" height="92" rx="26" fill="url(#chip)"/>
  <text x="128" y="1068" fill="#ffffff" font-size="33" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">${escapeXml(keywordLine)}</text>

  <rect x="86" y="1128" width="908" height="118" rx="26" fill="#fff7fb" stroke="#fbcfe8"/>
  <text x="126" y="1182" fill="#be185d" font-size="31" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="700">행운 아이템: ${escapeXml(consultation.luckyItem)}</text>
  <text x="126" y="1222" fill="#6b7280" font-size="27" font-family="Pretendard, Apple SD Gothic Neo, sans-serif">Code Destiny · Yeon Healing Astrology</text>

  <rect x="838" y="1148" width="126" height="126" rx="28" fill="#ffffff" fill-opacity="0.45" stroke="#f9a8d4"/>
  <g clip-path="url(#yeonSubClip)">
    <image href="${SPRITE_SHEET}" x="${850 - spriteFrame * 126}" y="1148" width="${126 * SPRITE_FRAMES}" height="126" preserveAspectRatio="xMinYMin slice"/>
  </g>
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

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value}점`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-pink-400 text-pink-400" : "text-pink-200/60"}`}
          strokeWidth={1.8}
        />
      ))}
    </div>
  );
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
  const [shareFeedback, setShareFeedback] = useState("SVG 카드로 저장하거나 공유할 수 있어요.");
  const [frame, setFrame] = useState(0);
  const [consultation, setConsultation] = useState<ConsultationResult | null>(null);

  const activeEmotion = useMemo(
    () => EMOTIONS.find((item) => item.key === selectedEmotion) ?? EMOTIONS[0],
    [selectedEmotion]
  );

  useEffect(() => {
    const speed = selectedEmotion === "tired" || selectedEmotion === "blue" ? 840 : 620;
    const timer = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % SPRITE_FRAMES);
    }, speed);
    return () => window.clearInterval(timer);
  }, [selectedEmotion]);

  const spriteStyle = useMemo<CSSProperties>(() => {
    const frameStep = SPRITE_FRAMES > 1 ? (frame / (SPRITE_FRAMES - 1)) * 100 : 0;
    return {
      backgroundImage: `url(${SPRITE_SHEET})`,
      backgroundSize: `${SPRITE_FRAMES * 100}% 100%`,
      backgroundPosition: `${frameStep}% 50%`,
      imageRendering: "auto",
    };
  }, [frame]);

  const cardSvg = useMemo(
    () => {
      if (!consultation) return "";
      return buildHeartCardSvg(today, activeEmotion.label, consultation, getCardSpriteFrame(selectedSign, selectedEmotion));
    },
    [today, activeEmotion.label, consultation, selectedSign, selectedEmotion]
  );

  const runConsultation = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    window.setTimeout(() => {
      const next = buildConsultation(selectedSign, selectedEmotion, concernText, new Date());
      setConsultation(next);
      setShareFeedback("연이가 고민 키워드와 오늘의 별 흐름을 반영해 상담을 업데이트했어요.");
      setIsGenerating(false);
    }, 260);
  };

  const handleShare = async () => {
    if (isExporting || !consultation || !cardSvg) return;

    setIsExporting(true);
    setShareFeedback("SVG 마음 카드를 준비하고 있어요...");

    try {
      const svgBlob = new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" });
      const svgFileName = `yeon-heart-card-${selectedSign}-${selectedEmotion}.svg`;
      const svgFile = new File([svgBlob], svgFileName, { type: "image/svg+xml" });

      const shareText = `${activeEmotion.label} 감정 기준 ${consultation.sign} 상담 완료. ${consultation.practicalTip}`;
      if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [svgFile] })) {
        await navigator.share({
          title: "연이의 마음 별자리",
          text: shareText,
          files: [svgFile],
        });
        setShareFeedback("SVG 마음 카드 공유가 완료됐어요.");
      } else {
        const pngBlob = await rasterizeSvgToPngBlob(cardSvg, 1080, 1350);
        if (pngBlob) {
          const pngFile = new File([pngBlob], svgFileName.replace(".svg", ".png"), { type: "image/png" });
          if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare({ files: [pngFile] })) {
            await navigator.share({
              title: "연이의 마음 별자리",
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
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(248,193,255,0.16),transparent_35%),radial-gradient(circle_at_85%_8%,rgba(140,163,255,0.22),transparent_32%),linear-gradient(170deg,#120f2f_0%,#1f2046_52%,#2f2a66_100%)] px-4 py-8 text-slate-100 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-10 top-10 h-64 w-64 rounded-full bg-fuchsia-300/15 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-violet-300/15 blur-3xl" />
        {STAR_DOTS.map((dot, idx) => (
          <motion.span
            key={idx}
            className="absolute text-fuchsia-100/60"
            style={{ left: dot.left, top: dot.top }}
            animate={reduceMotion ? undefined : { opacity: [0.2, 0.8, 0.2], scale: [0.9, 1.1, 0.9] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, delay: dot.delay, ease: "easeInOut" }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid gap-5 rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_20px_44px_rgba(7,8,22,0.38)] backdrop-blur-md md:grid-cols-[1.1fr_0.9fr] md:p-7"
        >
          <div className="space-y-4">
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={reduceMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-pink-200/55 bg-white/15 px-4 py-2 text-sm font-semibold text-pink-100"
            >
              <Heart className="h-4 w-4 fill-pink-200 text-pink-200" />
              연이의 별빛 상담소
            </motion.div>

            <h1 className="font-['ui-rounded','Nunito',sans-serif] text-3xl font-black leading-tight text-white md:text-5xl">
              연이의 마음 별자리
            </h1>
            <p className="font-['ui-rounded','Nunito',sans-serif] text-sm text-pink-100 md:text-base">
              오늘의 감정과 고민을 별빛 흐름으로 다정하게 정리해줄게요.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
              태양 위치, 달 위상, 요일 행성 흐름을 기반으로 현실적인 한 줄 행동까지 제안해요. 감정 선택부터 상담 결과,
              SVG 마음 카드 저장까지 한 번에 이어집니다.
            </p>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-4">
            {!heroError ? (
              <Image
                src={HERO_IMAGE}
                alt="연이의 마음 별자리 아트"
                width={900}
                height={620}
                className="h-full max-h-[360px] w-full max-w-full rounded-2xl object-contain"
                onError={() => setHeroError(true)}
                priority
              />
            ) : (
              <div className="flex h-full min-h-44 w-full flex-col items-center justify-center rounded-2xl bg-white/10 text-pink-100">
                <Sparkles className="mb-2 h-8 w-8" />
                <p className="text-sm font-semibold">연이 아트 로딩중</p>
              </div>
            )}

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={reduceMotion ? undefined : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-3 left-3"
            >
              <div className="rounded-2xl border border-pink-200/50 bg-white/80 p-2 shadow-[0_8px_22px_rgba(37,11,64,0.28)]">
                <div className="h-20 w-20 rounded-xl bg-no-repeat" style={spriteStyle} />
                <span className="mt-1 block text-[10px] font-semibold text-pink-600">연이 리액션</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <motion.article
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_16px_38px_rgba(7,8,22,0.38)] backdrop-blur-md"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-200">입력 패널</p>
            <h2 className="text-xl font-black text-white">감정 선택 → 별자리 → 고민 입력</h2>
            <p className="mb-4 mt-1 text-sm text-slate-200">기존 상담 로직은 그대로 유지하고, 입력과 결과 표시를 더 읽기 쉽게 정리했어요.</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EMOTIONS.map((emotion) => {
                const isActive = selectedEmotion === emotion.key;
                return (
                  <motion.button
                    key={emotion.key}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedEmotion(emotion.key)}
                    className={`min-h-11 rounded-2xl border px-2 py-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 ${
                      isActive
                        ? `border-pink-200 bg-gradient-to-br ${emotion.tone} shadow-[0_8px_20px_rgba(248,113,113,0.26)]`
                        : "border-white/35 bg-white/15"
                    }`}
                    aria-label={`${emotion.label} 감정 선택`}
                  >
                    <emotion.Icon className="mx-auto mb-1 h-4 w-4 text-pink-100" />
                    <span className="text-xs font-bold text-white">{emotion.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <label htmlFor="yeon-zodiac-select" className="mt-5 block text-xs font-semibold text-pink-100">내 별자리</label>
            <select
              id="yeon-zodiac-select"
              value={selectedSign}
              onChange={(event) => setSelectedSign(event.target.value as ZodiacSign)}
              className="mt-1 min-h-11 w-full appearance-none rounded-xl border border-white/35 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100"
              aria-label="별자리 선택"
            >
              {ZODIAC_SIGNS.map((item) => (
                <option key={item.sign} value={item.sign}>{`${item.sign} (${item.period})`}</option>
              ))}
            </select>

            <label htmlFor="yeon-concern-input" className="mt-4 block text-xs font-semibold text-pink-100">지금 고민 (키워드 인식용)</label>
            <textarea
              id="yeon-concern-input"
              value={concernText}
              onChange={(event) => setConcernText(event.target.value)}
              placeholder="예: 요즘 이직 고민과 금전 압박 때문에 불안해요. 오늘 어떤 선택을 먼저 하면 좋을까요?"
              className="mt-1 min-h-32 w-full resize-y rounded-xl border border-white/35 bg-white/90 px-3 py-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100"
              aria-label="고민 입력"
            />

            <button
              type="button"
              onClick={runConsultation}
              disabled={isGenerating}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_20px_rgba(251,113,133,0.33)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? <Download className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "연이가 별빛 흐름 정리중..." : "연이 상담 업데이트"}
            </button>
            <p className="mt-2 text-xs text-slate-300">상담 흐름: 감정 선택 → 별자리 선택 → 고민 입력 → 결과 분석 → SVG 카드</p>
          </motion.article>

          <div className="flex min-w-0 flex-col gap-4">
            {!consultation ? (
              <motion.article
                initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-white/20 bg-white/10 p-6 text-center shadow-[0_16px_38px_rgba(7,8,22,0.38)] backdrop-blur-md"
              >
                <p className="text-sm font-semibold text-pink-100">감정과 고민을 입력하면 연이가 별빛 상담을 준비해요.</p>
                <p className="mt-2 text-xs text-slate-300">업데이트 버튼을 누르면 분석 결과, SVG 카드, 실행 3단계가 순서대로 표시됩니다.</p>
              </motion.article>
            ) : (
              <>
                <motion.article
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_16px_38px_rgba(7,8,22,0.38)] backdrop-blur-md"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-200">분석 결과</p>
                  <h2 className="text-xl font-black text-white">오늘의 점성술 상담</h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-white">별자리: {consultation.sign}</span>
                    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-white">기간: {consultation.period}</span>
                    <span className="rounded-full border border-pink-200/40 bg-pink-100/15 px-3 py-1 text-pink-100">태양: {consultation.todaySunSign}</span>
                    <span className="rounded-full border border-violet-200/40 bg-violet-100/15 px-3 py-1 text-violet-100">달: {consultation.moon.label}</span>
                    <span className="rounded-full border border-indigo-200/40 bg-indigo-100/15 px-3 py-1 text-indigo-100">요일 행성: {consultation.dayRuler.label}</span>
                    <span className="rounded-full border border-amber-200/40 bg-amber-100/15 px-3 py-1 text-amber-100">별자리 각도: {consultation.aspect.label}</span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/20 bg-white/90 p-4 text-slate-700">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="flex items-center justify-between rounded-lg bg-pink-50 px-3 py-2">
                        <span>전체 운세</span>
                        <RatingStars value={consultation.overall} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                        <span>연애/관계</span>
                        <RatingStars value={consultation.love} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
                        <span>금전/현실</span>
                        <RatingStars value={consultation.money} />
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-pink-100 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-pink-500">연이의 해석</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={`${selectedEmotion}-${selectedSign}-${consultation.warmMessage}`}
                          initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700"
                        >
                          {consultation.warmMessage}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.article>

                <motion.article
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.04 }}
                  className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_16px_38px_rgba(7,8,22,0.38)] backdrop-blur-md"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-200">공유 카드</p>
                  <h2 className="text-lg font-black text-white">고화질 SVG 마음 카드</h2>

                  <div className="mt-3 rounded-2xl border border-white/25 bg-white/90 p-3">
                    <div
                      className="mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-xl border border-pink-100 bg-white [&_svg]:h-full [&_svg]:w-full"
                      aria-label="SVG 마음 카드 미리보기"
                      dangerouslySetInnerHTML={{ __html: cardSvg }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={isExporting || !consultation}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_20px_rgba(251,113,133,0.33)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isExporting ? <Download className="h-4 w-4 animate-pulse" /> : <Share2 className="h-4 w-4" />}
                    {isExporting ? "SVG 카드 준비중..." : "SVG 카드 공유/저장"}
                  </button>
                  <p className="mt-2 min-h-5 text-xs text-slate-200">{shareFeedback}</p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-pink-200/35 bg-white/90 p-3 text-slate-700">
                      <p className="text-xs font-semibold text-pink-500">핵심 포커스</p>
                      <p className="mt-1 text-xs font-semibold text-purple-600">{consultation.concernCategoryLabel} · {consultation.concernDomainLabel}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{consultation.practicalTip}</p>
                      {consultation.concernKeywords.length > 0 ? (
                        <p className="mt-2 text-xs text-slate-500">인식 키워드: {consultation.concernKeywords.join(", ")}</p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-rose-200/35 bg-white/90 p-3 text-slate-700">
                      <p className="text-xs font-semibold text-rose-500">오늘의 실행 3단계</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-slate-600">
                        {consultation.actionPlan.map((step) => (
                          <li key={step} className="break-words">{step}</li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs font-semibold text-slate-700">행운 아이템: {consultation.luckyItem}</p>
                    </div>
                  </div>
                </motion.article>
              </>
            )}
          </div>
        </section>

        <motion.nav
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4"
          aria-label="기능 요약 배지"
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-pink-200/45 bg-white/10 px-4 py-2 text-xs font-semibold text-pink-100 shadow-sm">
            <Heart className="h-4 w-4" /> 감정 + 고민 입력
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-200/45 bg-white/10 px-4 py-2 text-xs font-semibold text-purple-100 shadow-sm">
            <Sparkles className="h-4 w-4" /> 실시간 키워드 인식
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200/45 bg-white/10 px-4 py-2 text-xs font-semibold text-amber-100 shadow-sm">
            <Cloud className="h-4 w-4" /> 실제 점성술 신호
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200/45 bg-white/10 px-4 py-2 text-xs font-semibold text-rose-100 shadow-sm">
            <Coins className="h-4 w-4" /> SVG 카드 공유
          </div>
        </motion.nav>
      </div>
    </main>
  );
}
