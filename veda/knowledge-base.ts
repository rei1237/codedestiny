// ============================================================
// src/data/knowledge-base.ts
// 베다 점성술 해석 지식 베이스
//
// 7대 운명 분석 모듈에서 사용하는 모든 텍스트 데이터를 정의합니다.
// ============================================================

import {
  PlanetName,
  SignName,
  NakshatraName,
  Element,
  ChakraName,
} from "../types";

// ─── 별자리 특성 ─────────────────────────────────────────

export const SIGN_TRAITS: Record<SignName, {
  element: Element;
  modality: "Cardinal" | "Fixed" | "Mutable";
  traits: string[];
  keywords: string[];
}> = {
  Aries:       { element: "Fire",  modality: "Cardinal", traits: ["용감함", "주도적", "충동적", "독립적"],    keywords: ["개척", "열정", "경쟁"] },
  Taurus:      { element: "Earth", modality: "Fixed",    traits: ["안정적", "실용적", "고집스러움", "감각적"], keywords: ["재물", "안정", "인내"] },
  Gemini:      { element: "Air",   modality: "Mutable",  traits: ["지적", "변덕스러움", "소통력", "호기심"],   keywords: ["소통", "정보", "다재다능"] },
  Cancer:      { element: "Water", modality: "Cardinal", traits: ["감성적", "보호본능", "직관적", "가정적"],   keywords: ["가족", "감정", "돌봄"] },
  Leo:         { element: "Fire",  modality: "Fixed",    traits: ["카리스마", "창의적", "자존심강함", "리더십"], keywords: ["리더십", "창조", "명예"] },
  Virgo:       { element: "Earth", modality: "Mutable",  traits: ["분석적", "완벽주의", "섬세함", "봉사"],    keywords: ["분석", "건강", "완벽"] },
  Libra:       { element: "Air",   modality: "Cardinal", traits: ["조화로움", "외교적", "우유부단", "심미적"], keywords: ["균형", "관계", "아름다움"] },
  Scorpio:     { element: "Water", modality: "Fixed",    traits: ["강렬함", "탐구적", "집착적", "변혁적"],    keywords: ["변혁", "심층", "권력"] },
  Sagittarius: { element: "Fire",  modality: "Mutable",  traits: ["자유로움", "낙관적", "철학적", "모험적"],  keywords: ["자유", "철학", "여행"] },
  Capricorn:   { element: "Earth", modality: "Cardinal", traits: ["야망있음", "책임감", "현실적", "절제력"],  keywords: ["야망", "성취", "절제"] },
  Aquarius:    { element: "Air",   modality: "Fixed",    traits: ["혁신적", "인도주의", "독창적", "반항적"],  keywords: ["혁신", "인류애", "독립"] },
  Pisces:      { element: "Water", modality: "Mutable",  traits: ["영적", "공감능력", "직관적", "희생적"],    keywords: ["영성", "예술", "연민"] },
};

// ─── 낙샤트라 특성 ────────────────────────────────────────

export const NAKSHATRA_TRAITS: Record<NakshatraName, {
  symbol: string;
  traits: string[];
  shadow: string[];
  purpose: string;
}> = {
  "Ashwini":           { symbol: "말의 머리",      traits: ["빠름", "치유력", "선구자"],      shadow: ["성급함", "무모함"],        purpose: "빠른 변화와 치유" },
  "Bharani":           { symbol: "자궁",           traits: ["창조력", "변혁", "강인함"],      shadow: ["집착", "제어욕"],          purpose: "죽음과 재생의 주관" },
  "Krittika":          { symbol: "면도날",          traits: ["날카로움", "비판력", "정화"],    shadow: ["공격성", "냉혹함"],        purpose: "불필요한 것을 잘라냄" },
  "Rohini":            { symbol: "황소 수레바퀴",   traits: ["미적 감각", "풍요", "매력"],    shadow: ["탐욕", "소유욕"],          purpose: "물질적 풍요 실현" },
  "Mrigashira":        { symbol: "사슴 머리",       traits: ["탐구심", "감수성", "여행욕"],   shadow: ["불안함", "우유부단"],      purpose: "진리 탐구" },
  "Ardra":             { symbol: "눈물방울",        traits: ["지적", "파괴적 변혁", "공감"],  shadow: ["분노", "혼란"],            purpose: "폭풍 후 정화" },
  "Punarvasu":         { symbol: "활과 화살",       traits: ["재기", "낙관", "지혜"],         shadow: ["방황", "집중력 부족"],     purpose: "복원과 귀환" },
  "Pushya":            { symbol: "꽃",              traits: ["양육", "보호", "정신적 풍요"],  shadow: ["과보호", "보수성"],        purpose: "최고의 영양 공급" },
  "Ashlesha":          { symbol: "뱀",              traits: ["직관", "통찰", "변혁"],         shadow: ["조작", "독성"],            purpose: "무의식의 탐구" },
  "Magha":             { symbol: "왕좌",            traits: ["권위", "리더십", "선조 연결"],  shadow: ["오만", "권력욕"],          purpose: "왕족적 품위 실현" },
  "Purva Phalguni":    { symbol: "침대 앞 다리",    traits: ["창의성", "즐거움", "매력"],     shadow: ["게으름", "탐닉"],          purpose: "기쁨과 창조" },
  "Uttara Phalguni":   { symbol: "침대 뒷 다리",    traits: ["관대함", "신뢰", "성공"],       shadow: ["자기중심", "의존"],        purpose: "지속적 번영" },
  "Hasta":             { symbol: "손",              traits: ["재능", "교묘함", "치유"],       shadow: ["교활함", "사기"],          purpose: "손으로 실현하는 창조" },
  "Chitra":            { symbol: "빛나는 보석",     traits: ["아름다움", "창의", "기술"],     shadow: ["허영", "외모집착"],        purpose: "아름다운 창조물 제작" },
  "Swati":             { symbol: "칼",              traits: ["독립", "유연성", "무역"],       shadow: ["우유부단", "정체성 혼란"], purpose: "자아 실현" },
  "Vishakha":          { symbol: "개선문",          traits: ["목적의식", "야망", "인내"],     shadow: ["질투", "집착"],            purpose: "목표 달성" },
  "Anuradha":          { symbol: "연꽃",            traits: ["헌신", "우정", "탐구"],         shadow: ["의심", "불안"],            purpose: "사랑을 통한 성장" },
  "Jyeshtha":          { symbol: "귀걸이",          traits: ["보호", "용기", "리더십"],       shadow: ["오만", "지배욕"],          purpose: "약자 보호" },
  "Mula":              { symbol: "뿌리 묶음",       traits: ["진실탐구", "파괴적 에너지"],    shadow: ["뿌리 없음", "파괴"],       purpose: "근본까지 파헤침" },
  "Purva Ashadha":     { symbol: "상아 부채",       traits: ["설득력", "오만한 승리"],        shadow: ["자만", "비타협성"],        purpose: "무적의 승리" },
  "Uttara Ashadha":    { symbol: "코끼리 이빨",     traits: ["덕망", "인내", "보편적 진리"],  shadow: ["완고함", "고립"],          purpose: "영원한 승리" },
  "Shravana":          { symbol: "귀",              traits: ["경청", "학습", "지식 전파"],    shadow: ["소문", "험담"],            purpose: "지식 연결" },
  "Dhanishtha":        { symbol: "북과 피리",       traits: ["음악성", "재물", "관대함"],     shadow: ["탐욕", "이기심"],          purpose: "풍요의 실현" },
  "Shatabhisha":       { symbol: "빈 원",           traits: ["치유", "신비", "독립"],         shadow: ["고독", "비밀주의"],        purpose: "숨겨진 것의 치유" },
  "Purva Bhadrapada":  { symbol: "칼 앞",           traits: ["영적 불꽃", "변혁", "헌신"],    shadow: ["파괴성", "양극성"],        purpose: "영적 각성" },
  "Uttara Bhadrapada": { symbol: "뒤집힌 다리",     traits: ["지혜", "인내", "깊은 통찰"],    shadow: ["게으름", "무기력"],        purpose: "심오한 지혜 실현" },
  "Revati":            { symbol: "탬버린",          traits: ["양육", "풍요", "끝의 완성"],    shadow: ["물질 집착", "결말 거부"],  purpose: "한 사이클의 완성" },
};

// 배열 타입 오류 방지를 위한 타입 캐스트는 아래에서 처리

// ─── 행성 특성 ────────────────────────────────────────────

export const PLANET_SIGNIFICATIONS: Record<PlanetName, {
  karaka: string[];         // 삶의 영역 지시자
  careers: string[];        // 연관 직업군
  bodyPart: string;
  gem: string;
  color: string;
}> = {
  Sun:     { karaka: ["자아", "아버지", "권위", "건강"],           careers: ["정부직", "리더십", "의학", "금융"],          bodyPart: "심장",   gem: "루비",      color: "빨강" },
  Moon:    { karaka: ["마음", "어머니", "감정", "대중"],           careers: ["간호", "농업", "무역", "요식업"],            bodyPart: "마음",   gem: "진주",      color: "흰색" },
  Mars:    { karaka: ["용기", "형제", "에너지", "부동산"],         careers: ["군인", "운동선수", "공학", "외과의"],         bodyPart: "근육",   gem: "루비",      color: "빨강" },
  Mercury: { karaka: ["지성", "소통", "무역", "분석"],             careers: ["작가", "교사", "회계사", "IT", "상업"],      bodyPart: "신경계", gem: "에메랄드",  color: "초록" },
  Jupiter: { karaka: ["지혜", "자녀", "신앙", "스승"],             careers: ["교육", "법률", "철학", "종교", "은행"],      bodyPart: "간",     gem: "황수정",    color: "노랑" },
  Venus:   { karaka: ["아름다움", "연애", "예술", "사치"],         careers: ["예술", "패션", "외교", "엔터테인먼트"],      bodyPart: "신장",   gem: "다이아몬드", color: "흰색" },
  Saturn:  { karaka: ["업보", "장수", "제한", "봉사"],             careers: ["광업", "농업", "부동산", "법", "사회사업"],  bodyPart: "뼈",     gem: "사파이어",  color: "검정" },
  Rahu:    { karaka: ["외부", "혁신", "집착", "물질욕"],           careers: ["기술", "정치", "국제 무역", "미디어"],       bodyPart: "호흡기", gem: "고멧",      color: "연기색" },
  Ketu:    { karaka: ["해방", "영성", "분리", "과거생"],           careers: ["영성", "연구", "의학", "신비학"],            bodyPart: "면역계", gem: "고양이 눈", color: "회색" },
};

// ─── 차크라 매핑 ──────────────────────────────────────────

export const CHAKRA_PLANET_MAP: Record<ChakraName, PlanetName> = {
  Muladhara:    "Saturn",   // 뿌리 차크라 — 구조, 안정, 업보
  Svadhisthana: "Jupiter",  // 천골 차크라 — 확장, 기쁨, 풍요
  Manipura:     "Mars",     // 태양신경총 차크라 — 의지, 행동
  Anahata:      "Venus",    // 심장 차크라 — 사랑, 조화
  Vishuddha:    "Mercury",  // 목 차크라 — 소통, 표현
  Ajna:         "Sun",      // 제3의 눈 — 직관, 통찰
  Sahasrara:    "Moon",     // 정수리 차크라 — 의식, 영성
};

export const CHAKRA_INFO: Record<ChakraName, {
  sanskrit: string;
  element: string;
  seed: string;
  color: string;
  description: string;
  balancedTraits: string[];
  imbalancedTraits: string[];
}> = {
  Muladhara:    { sanskrit: "मूलाधार", element: "Earth", seed: "LAM", color: "빨강",  description: "생존과 안정의 에너지 센터", balancedTraits: ["안정감", "현실적", "신뢰"],            imbalancedTraits: ["불안", "물질 집착", "두려움"] },
  Svadhisthana: { sanskrit: "स्वाधिष्ठान", element: "Water", seed: "VAM", color: "주황",  description: "창의성과 쾌락의 에너지 센터", balancedTraits: ["창의성", "관계 능력", "기쁨"],          imbalancedTraits: ["죄책감", "집착", "감정 기복"] },
  Manipura:     { sanskrit: "मणिपूर", element: "Fire",  seed: "RAM", color: "노랑",  description: "의지력과 자존감의 에너지 센터", balancedTraits: ["자신감", "목적의식", "리더십"],         imbalancedTraits: ["통제욕", "분노", "자존감 저하"] },
  Anahata:      { sanskrit: "अनाहत", element: "Air",   seed: "YAM", color: "초록",  description: "사랑과 연민의 에너지 센터",     balancedTraits: ["공감", "무조건적 사랑", "용서"],       imbalancedTraits: ["슬픔", "질투", "고독"] },
  Vishuddha:    { sanskrit: "विशुद्ध", element: "Space", seed: "HAM", color: "파랑",  description: "진실과 소통의 에너지 센터",     balancedTraits: ["표현력", "진실됨", "경청"],            imbalancedTraits: ["거짓말", "소통 단절", "두려움"] },
  Ajna:         { sanskrit: "आज्ञा", element: "Light", seed: "OM",  color: "남색",  description: "직관과 통찰의 에너지 센터",     balancedTraits: ["직관", "명확한 시야", "지혜"],         imbalancedTraits: ["망상", "판단력 저하", "혼란"] },
  Sahasrara:    { sanskrit: "सहस्रार", element: "Thought", seed: "AH", color: "보라",  description: "순수 의식과 영성의 에너지 센터", balancedTraits: ["영적 연결", "의식 확장", "해방"],     imbalancedTraits: ["무감각", "우울", "영적 단절"] },
};

// ─── 요가 수련법 데이터 ───────────────────────────────────

export interface YogaTypeData {
  name: string;
  type: string;
  targetElement: Element;
  targetChakra: ChakraName;
  benefit: string;
  duration: string;
  description: string;
}

export const YOGA_PRACTICES: YogaTypeData[] = [
  { name: "Hatha Yoga",    type: "물리적",   targetElement: "Earth", targetChakra: "Muladhara",    benefit: "신체 안정화, 뿌리 에너지 강화",    duration: "45분/일", description: "태양-달의 균형을 맞추는 기초 요가" },
  { name: "Vinyasa Flow",  type: "동적",     targetElement: "Fire",  targetChakra: "Manipura",     benefit: "의지력·에너지 활성화",              duration: "60분/일", description: "흐름 속에서 내적 불을 키우는 동적 요가" },
  { name: "Kundalini",     type: "에너지",   targetElement: "Fire",  targetChakra: "Sahasrara",    benefit: "잠재 에너지 각성, 영적 성장",       duration: "60분/일", description: "쿤달리니 에너지를 위로 상승시키는 강력한 요가" },
  { name: "Yin Yoga",      type: "수동적",   targetElement: "Water", targetChakra: "Svadhisthana", benefit: "감정 해방, 유연성 증가",            duration: "60분/일", description: "수 분간 자세를 유지하며 음적 에너지를 정화" },
  { name: "Restorative",   type: "회복",     targetElement: "Water", targetChakra: "Anahata",      benefit: "깊은 이완, 심장 치유",              duration: "75분/일", description: "도구를 사용하여 몸과 마음을 완전히 쉬게 하는 요가" },
  { name: "Pranayama",     type: "호흡",     targetElement: "Air",   targetChakra: "Vishuddha",    benefit: "프라나 에너지 확장, 소통 치유",     duration: "30분/일", description: "호흡 조절을 통한 생명력 강화" },
  { name: "Karma Yoga",    type: "봉사",     targetElement: "Earth", targetChakra: "Muladhara",    benefit: "에고 소멸, 업보 정화",              duration: "일상 실천", description: "집착 없는 행동으로 해탈에 이르는 길" },
  { name: "Bhakti Yoga",   type: "헌신",     targetElement: "Water", targetChakra: "Anahata",      benefit: "무조건적 사랑, 감정 고양",          duration: "일상 실천", description: "신에 대한 헌신을 통한 심장 차크라 열기" },
  { name: "Jnana Yoga",    type: "지혜",     targetElement: "Air",   targetChakra: "Ajna",         benefit: "자아 인식, 지적 해방",              duration: "일상 실천", description: "지식과 탐구를 통한 자아 실현" },
  { name: "Nidra Yoga",    type: "수면",     targetElement: "Water", targetChakra: "Sahasrara",    benefit: "깊은 무의식 정화, 스트레스 해소",  duration: "45분/일", description: "요가 수면으로 의식의 경계를 탐구" },
  { name: "Ashtanga",      type: "강도높은", targetElement: "Fire",  targetChakra: "Manipura",     benefit: "체력·집중력·규율 강화",             duration: "90분/일", description: "엄격한 시퀀스로 내적 불꽃을 유지" },
  { name: "Mantra Yoga",   type: "소리",     targetElement: "Air",   targetChakra: "Vishuddha",    benefit: "진동 치유, 목 차크라 활성화",       duration: "30분/일", description: "성스러운 소리를 반복하여 의식을 높임" },
];

// ─── Ashtakoot Milan 데이터 ────────────────────────────────

/** 낙샤트라별 Varna (카스트) */
export const NAKSHATRA_VARNA: Record<NakshatraName, number> = {
  "Ashwini": 3, "Bharani": 0, "Krittika": 1, "Rohini": 3,
  "Mrigashira": 2, "Ardra": 0, "Punarvasu": 3, "Pushya": 1,
  "Ashlesha": 0, "Magha": 0, "Purva Phalguni": 3, "Uttara Phalguni": 3,
  "Hasta": 2, "Chitra": 3, "Swati": 2, "Vishakha": 3,
  "Anuradha": 2, "Jyeshtha": 0, "Mula": 1, "Purva Ashadha": 3,
  "Uttara Ashadha": 1, "Shravana": 2, "Dhanishtha": 3, "Shatabhisha": 2,
  "Purva Bhadrapada": 1, "Uttara Bhadrapada": 3, "Revati": 3,
};
// 0=Brahmin, 1=Kshatriya, 2=Vaishya, 3=Shudra

/** 낙샤트라별 Gana */
export const NAKSHATRA_GANA: Record<NakshatraName, "Deva" | "Manushya" | "Rakshasa"> = {
  "Ashwini": "Deva", "Bharani": "Manushya", "Krittika": "Rakshasa",
  "Rohini": "Manushya", "Mrigashira": "Deva", "Ardra": "Manushya",
  "Punarvasu": "Deva", "Pushya": "Deva", "Ashlesha": "Rakshasa",
  "Magha": "Rakshasa", "Purva Phalguni": "Manushya", "Uttara Phalguni": "Manushya",
  "Hasta": "Deva", "Chitra": "Rakshasa", "Swati": "Deva",
  "Vishakha": "Rakshasa", "Anuradha": "Deva", "Jyeshtha": "Rakshasa",
  "Mula": "Rakshasa", "Purva Ashadha": "Manushya", "Uttara Ashadha": "Manushya",
  "Shravana": "Deva", "Dhanishtha": "Rakshasa", "Shatabhisha": "Rakshasa",
  "Purva Bhadrapada": "Manushya", "Uttara Bhadrapada": "Manushya", "Revati": "Deva",
};

/** 낙샤트라별 Yoni (동물 상징) */
export const NAKSHATRA_YONI: Record<NakshatraName, string> = {
  "Ashwini": "Horse", "Bharani": "Elephant", "Krittika": "Goat",
  "Rohini": "Serpent", "Mrigashira": "Serpent", "Ardra": "Dog",
  "Punarvasu": "Cat", "Pushya": "Goat", "Ashlesha": "Cat",
  "Magha": "Rat", "Purva Phalguni": "Rat", "Uttara Phalguni": "Cow",
  "Hasta": "Buffalo", "Chitra": "Tiger", "Swati": "Buffalo",
  "Vishakha": "Tiger", "Anuradha": "Deer", "Jyeshtha": "Deer",
  "Mula": "Dog", "Purva Ashadha": "Monkey", "Uttara Ashadha": "Mongoose",
  "Shravana": "Monkey", "Dhanishtha": "Lion", "Shatabhisha": "Horse",
  "Purva Bhadrapada": "Lion", "Uttara Bhadrapada": "Cow", "Revati": "Elephant",
};

/** Yoni 호환성 점수 (4점 만점) */
export const YONI_COMPATIBILITY: Record<string, Record<string, number>> = {
  Horse:   { Horse: 4, Cat: 3, Cow: 3, Elephant: 3, Goat: 2, Dog: 2, Monkey: 2, Serpent: 1, Rat: 1, Buffalo: 1, Tiger: 0, Lion: 0, Deer: 1, Mongoose: 2 },
  Elephant:{ Horse: 3, Elephant: 4, Cat: 2, Cow: 3, Goat: 2, Dog: 1, Monkey: 2, Serpent: 1, Rat: 1, Buffalo: 2, Tiger: 0, Lion: 1, Deer: 2, Mongoose: 2 },
  // 간소화: 기본 호환성 룰
  default: { same: 4, friendly: 3, neutral: 2, enemy: 1, hostile: 0 },
};

/** Nadi 분류 */
export const NAKSHATRA_NADI: Record<NakshatraName, "Vata" | "Pitta" | "Kapha"> = {
  "Ashwini": "Vata", "Bharani": "Pitta", "Krittika": "Kapha",
  "Rohini": "Vata", "Mrigashira": "Pitta", "Ardra": "Kapha",
  "Punarvasu": "Vata", "Pushya": "Pitta", "Ashlesha": "Kapha",
  "Magha": "Vata", "Purva Phalguni": "Pitta", "Uttara Phalguni": "Kapha",
  "Hasta": "Vata", "Chitra": "Pitta", "Swati": "Kapha",
  "Vishakha": "Vata", "Anuradha": "Pitta", "Jyeshtha": "Kapha",
  "Mula": "Vata", "Purva Ashadha": "Pitta", "Uttara Ashadha": "Kapha",
  "Shravana": "Vata", "Dhanishtha": "Pitta", "Shatabhisha": "Kapha",
  "Purva Bhadrapada": "Vata", "Uttara Bhadrapada": "Pitta", "Revati": "Kapha",
};

/** 행성 친밀도 (Graha Maitri) */
export const PLANET_FRIENDSHIP: Record<PlanetName, Record<PlanetName, "Friend" | "Neutral" | "Enemy">> = {
  Sun:     { Sun: "Neutral", Moon: "Friend", Mars: "Friend",   Mercury: "Enemy",  Jupiter: "Friend",  Venus: "Enemy",  Saturn: "Enemy",  Rahu: "Enemy",  Ketu: "Enemy"  },
  Moon:    { Sun: "Friend",  Moon: "Neutral", Mars: "Neutral",  Mercury: "Friend", Jupiter: "Friend",  Venus: "Neutral", Saturn: "Neutral", Rahu: "Enemy", Ketu: "Enemy"  },
  Mars:    { Sun: "Friend",  Moon: "Friend",  Mars: "Neutral",  Mercury: "Enemy",  Jupiter: "Friend",  Venus: "Neutral", Saturn: "Enemy",  Rahu: "Enemy",  Ketu: "Neutral"},
  Mercury: { Sun: "Friend",  Moon: "Neutral", Mars: "Neutral",  Mercury: "Neutral",Jupiter: "Neutral", Venus: "Friend", Saturn: "Neutral", Rahu: "Neutral",Ketu: "Enemy"  },
  Jupiter: { Sun: "Friend",  Moon: "Friend",  Mars: "Friend",   Mercury: "Enemy",  Jupiter: "Neutral", Venus: "Enemy",  Saturn: "Neutral", Rahu: "Enemy",  Ketu: "Friend" },
  Venus:   { Sun: "Enemy",   Moon: "Neutral", Mars: "Neutral",  Mercury: "Friend", Jupiter: "Neutral", Venus: "Neutral", Saturn: "Friend", Rahu: "Neutral",Ketu: "Neutral"},
  Saturn:  { Sun: "Enemy",   Moon: "Enemy",   Mars: "Enemy",    Mercury: "Neutral",Jupiter: "Neutral", Venus: "Friend", Saturn: "Neutral", Rahu: "Friend", Ketu: "Neutral"},
  Rahu:    { Sun: "Enemy",   Moon: "Enemy",   Mars: "Neutral",  Mercury: "Friend", Jupiter: "Enemy",   Venus: "Friend", Saturn: "Friend", Rahu: "Neutral",  Ketu: "Neutral"},
  Ketu:    { Sun: "Neutral", Moon: "Neutral", Mars: "Friend",   Mercury: "Enemy",  Jupiter: "Friend",  Venus: "Neutral", Saturn: "Neutral", Rahu: "Neutral",Ketu: "Neutral"},
};
