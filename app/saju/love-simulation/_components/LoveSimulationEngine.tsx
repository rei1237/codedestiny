"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Heart, MessageCircle, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { INITIAL_STATS, LOVE_CHARACTERS, LOVE_SCENES, type CharacterId, type ChoiceLog, type LoveCharacter, type LoveChoice, type LoveScene, type LoveStats } from "../_data/loveCodeMvp";
import { fetchSajuPillar } from "../_services/sajuApi";
import { applyEffects, getRelationshipMetrics, resolveResult } from "../_utils/loveCodeScoring";
import { matchLoveCharactersFromSaju, type LoveCharacterMatchResult } from "../_utils/loveCharacterMatching";

type PartnerCalendarType = "solar" | "lunar" | "lunar_leap";
type PartnerGender = "female" | "male";
type PartnerMatchInput = {
  name: string;
  birthDate: string;
  calType: PartnerCalendarType;
  hour: string;
  minute: string;
  country: string;
  gender: PartnerGender;
};

type StoredProfile = {
  id?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthIso?: string;
  birth?: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
  };
};

type StoredAuthUser = {
  id?: string;
  email?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
};

type ProfileSeed = {
  name: string;
  gender: "남" | "여";
  birthDate: string;
  hour: number;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => minute);
const MIN_PLAYABLE_SCENES = 10;
const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";
const LOVE_CODE_HERO_ASSET = "/fuctionassets/love code.webp";

const KO_ELEMENT_TO_CODE: Record<string, LoveCharacter["element"]> = {
  목: "wood",
  화: "fire",
  토: "earth",
  금: "metal",
  수: "water",
};

const GENERATING_ELEMENT: Record<LoveCharacter["element"], LoveCharacter["element"]> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLLING_ELEMENT: Record<LoveCharacter["element"], LoveCharacter["element"]> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

const ELEMENT_LOVE_NARRATIVE: Record<LoveCharacter["element"], { label: string; atmosphere: string; harmony: string; shadow: string; datePulse: string }> = {
  wood: {
    label: "목",
    atmosphere: "새 가지가 빛을 향해 뻗듯 마음이 천천히 자라나는 기운",
    harmony: "상대가 꿈과 성장을 응원해줄 때 궁합의 숨이 길어집니다",
    shadow: "재촉과 평가가 섞이면 아직 여린 감정이 쉽게 움츠러듭니다",
    datePulse: "산책, 작은 계획, 함께 배우는 시간",
  },
  fire: {
    label: "화",
    atmosphere: "불빛이 어둠을 밀어내듯 설렘과 표현이 먼저 살아나는 기운",
    harmony: "따뜻한 반응과 분명한 호감 표현이 관계의 온도를 빠르게 올립니다",
    shadow: "차가운 침묵이나 애매한 태도는 불안을 과열시킬 수 있습니다",
    datePulse: "햇빛, 무대, 웃음이 터지는 활동형 데이트",
  },
  earth: {
    label: "토",
    atmosphere: "흙이 씨앗을 품듯 관계를 오래 지키고 현실로 눌러 앉히는 기운",
    harmony: "반복되는 배려와 생활의 안정감이 신뢰의 궁을 단단하게 만듭니다",
    shadow: "가벼운 약속 파기와 감정 기복은 마음의 문을 천천히 닫게 합니다",
    datePulse: "따뜻한 식사, 익숙한 동네, 오래 머무는 대화",
  },
  metal: {
    label: "금",
    atmosphere: "맑은 금속처럼 기준과 예의, 선명한 선택을 요구하는 기운",
    harmony: "정중한 태도와 일관된 약속이 호감보다 먼저 신뢰를 세웁니다",
    shadow: "무례함과 즉흥적인 압박은 관계의 결을 차갑게 굳힙니다",
    datePulse: "전시, 정돈된 공간, 취향이 보이는 선물",
  },
  water: {
    label: "수",
    atmosphere: "깊은 물처럼 말보다 여백과 기억으로 마음을 흐르게 하는 기운",
    harmony: "조용한 질문과 감정의 속도를 존중하는 태도가 오래 남습니다",
    shadow: "답을 강요하거나 속내를 들춰내려 하면 물길이 금세 멀어집니다",
    datePulse: "밤길, 비 오는 카페, 오래 남는 문장",
  },
};

const DAY_MASTER_LOVE_NARRATIVE: Record<LoveCharacter["dayMaster"], { core: string; attraction: string; caution: string }> = {
  갑목: {
    core: "갑목은 큰 나무처럼 관계 안에서 방향과 성장의 의미를 찾습니다",
    attraction: "함께 앞으로 나아가자는 말, 성실한 응원, 미래를 가꾸는 대화에 마음을 엽니다",
    caution: "성장을 막는 냉소와 책임 없는 즉흥에는 실망이 빠릅니다",
  },
  을목: {
    core: "을목은 덩굴과 꽃처럼 작은 온기와 섬세한 눈빛을 오래 기억합니다",
    attraction: "부드러운 배려와 구체적인 관심이 쌓일수록 사랑의 결이 깊어집니다",
    caution: "무심한 말투와 거친 단정은 마음의 잎을 접게 만듭니다",
  },
  병화: {
    core: "병화는 태양처럼 좋아하는 마음을 숨기기보다 드러내며 관계를 밝힙니다",
    attraction: "응원, 인정, 밝은 리액션이 들어오면 설렘이 단숨에 살아납니다",
    caution: "모호한 밀당과 차가운 무반응은 자존심과 불안을 동시에 건드립니다",
  },
  정화: {
    core: "정화는 촛불처럼 가까운 사람에게만 오래 가는 온기를 건넵니다",
    attraction: "장난 속의 진심, 섬세한 칭찬, 마음을 알아봐주는 말에 흔들립니다",
    caution: "가벼운 농담으로 진심을 흘려보내면 서운함이 조용히 쌓입니다",
  },
  기토: {
    core: "기토는 정원 흙처럼 관계를 돌보고, 불안한 마음을 생활 속 안정으로 바꿉니다",
    attraction: "천천히 맞춰주는 태도와 감사의 표현이 궁합의 뿌리를 깊게 만듭니다",
    caution: "성급한 고백보다 지키지 못할 말이 더 큰 균열을 남깁니다",
  },
  경금: {
    core: "경금은 단단한 검처럼 사랑에서도 기준, 책임, 태도의 정확성을 봅니다",
    attraction: "예의 있는 직진과 흔들리지 않는 약속이 신뢰의 문을 엽니다",
    caution: "무계획한 감정 표현과 선을 넘는 장난은 단번에 거리를 만듭니다",
  },
  신금: {
    core: "신금은 보석처럼 미묘한 분위기와 말의 결을 예민하게 비춥니다",
    attraction: "취향을 기억하는 세심함, 정돈된 표현, 조용한 존중에 마음이 반짝입니다",
    caution: "거친 표현과 무심한 태도는 오래 남는 흠집처럼 느껴질 수 있습니다",
  },
  임수: {
    core: "임수는 큰 바다처럼 넓은 생각과 고독한 자유를 함께 품습니다",
    attraction: "깊은 대화와 간섭 없는 신뢰가 흐를 때 관계의 물길이 넓어집니다",
    caution: "붙잡으려는 집착과 얕은 단정은 멀어지고 싶은 파도를 만듭니다",
  },
  계수: {
    core: "계수는 안개비처럼 조용히 스며들고, 쉽게 말하지 않은 마음을 오래 간직합니다",
    attraction: "비밀을 지켜주는 태도, 작은 기억, 부드러운 질문에 마음이 열립니다",
    caution: "감정을 추궁하거나 속도를 강요하면 말없이 뒤로 물러납니다",
  },
};

const YIN_YANG_LOVE_NARRATIVE: Record<LoveCharacter["yinYang"], string> = {
  yang: "양의 리듬이 강해 마음이 움직이면 먼저 방향을 만들고, 관계의 흐름을 밖으로 드러내려 합니다",
  yin: "음의 리듬이 깊어 마음이 움직여도 먼저 살피고, 안전하다고 느낄 때 속내를 보여줍니다",
};

type ProfileCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
  imageAspect: number;
};

const DEFAULT_PROFILE_CROP: ProfileCrop = { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 };
const PROFILE_CROP_CONFIG: Partial<Record<CharacterId, ProfileCrop>> = {
  "kang-taejun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "kwon-sehyun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  michael: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "seo-yuan": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "seo-ijun": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "yoon-siwoo": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "han-yunseo": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "kim-ming": { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  "park-jieun": { x: 0, y: 0, w: 0.62, h: 0.43, imageAspect: 1 },
  saebyeok: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  seoyeon: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  soha: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  jiyoon: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  harin: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  neo: { x: 0, y: 0, w: 0.56, h: 0.42, imageAspect: 4 / 3 },
  yeoni: { x: 0, y: 0, w: 0.64, h: 0.42, imageAspect: 4 / 3 },
};

function getProfileCrop(character: LoveCharacter) {
  return PROFILE_CROP_CONFIG[character.id] ?? DEFAULT_PROFILE_CROP;
}

function getProfileCropAspect(character: LoveCharacter) {
  const crop = getProfileCrop(character);

  return crop.imageAspect * (crop.w / crop.h);
}

function getProfileCropStyle(character: LoveCharacter): React.CSSProperties {
  const crop = getProfileCrop(character);

  return {
    height: "auto",
    left: `${-(crop.x / crop.w) * 100}%`,
    position: "absolute",
    top: `${-(crop.y / crop.h) * 100}%`,
    width: `${100 / crop.w}%`,
  };
}

function readJsonObject<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeBirthDate(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : "";
}

function normalizeBirthDateFromProfile(profile: StoredProfile | null | undefined) {
  const birthYear = profile?.birth?.year;
  const birthMonth = profile?.birth?.month;
  const birthDay = profile?.birth?.day;
  if (birthYear && birthMonth && birthDay) {
    return `${String(birthYear).padStart(4, "0")}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  }

  return normalizeBirthDate(profile?.birthDate) || normalizeBirthDate(profile?.birthIso);
}

function normalizeBirthHourFromProfile(profile: StoredProfile | null | undefined) {
  const directHour = Number(profile?.birth?.hour);
  if (Number.isFinite(directHour)) return Math.max(0, Math.min(23, Math.floor(directHour)));

  const digits = String(profile?.birthTime || profile?.birthIso || "").replace(/\D/g, "");
  if (digits.length >= 2) {
    const hour = Number(digits.slice(0, 2));
    if (Number.isFinite(hour)) return Math.max(0, Math.min(23, Math.floor(hour)));
  }

  return 12;
}

function normalizeProfileGender(value: unknown): "남" | "여" {
  const raw = String(value || "").trim();
  return /^(m|male|man|남|남성)$/i.test(raw) ? "남" : "여";
}

function readCurrentProfileSeed(): ProfileSeed | null {
  if (typeof window === "undefined") return null;
  const authUser = readJsonObject<StoredAuthUser>("fortune_auth_user");
  const scopes = Array.from(new Set([authUser?.id, authUser?.email, authUser?.name, "guest"].map((item) => String(item || "").trim()).filter(Boolean)));
  const listRaw =
    scopes.map((scope) => window.localStorage.getItem(`${PROFILE_NS}.list::${scope}`)).find(Boolean) ||
    window.localStorage.getItem(`${PROFILE_NS}.list`) ||
    "[]";
  const currentId =
    scopes.map((scope) => window.localStorage.getItem(`${PROFILE_NS}.current::${scope}`)).find(Boolean) ||
    window.localStorage.getItem(`${PROFILE_NS}.current`) ||
    "";

  try {
    const list = JSON.parse(listRaw) as StoredProfile[];
    const profile = Array.isArray(list) ? (currentId ? list.find((item) => item?.id === currentId) : list[0]) || list[0] : null;
    const birthDate = normalizeBirthDateFromProfile(profile) || normalizeBirthDate(authUser?.birthDate);
    if (!birthDate) return null;

    return {
      birthDate,
      gender: normalizeProfileGender(profile?.gender || authUser?.gender),
      hour: normalizeBirthHourFromProfile(profile),
      name: String(profile?.name || authUser?.name || "나").trim(),
    };
  } catch {
    const birthDate = normalizeBirthDate(authUser?.birthDate);
    if (!birthDate) return null;

    return {
      birthDate,
      gender: normalizeProfileGender(authUser?.gender),
      hour: 12,
      name: String(authUser?.name || "나").trim(),
    };
  }
}

function normalizeSajuElement(value: unknown): LoveCharacter["element"] | null {
  const raw = String(value || "").trim();
  if (raw === "wood" || raw === "fire" || raw === "earth" || raw === "metal" || raw === "water") return raw;
  return KO_ELEMENT_TO_CODE[raw] ?? null;
}

function normalizeSajuDayMaster(value: unknown) {
  const raw = String(value || "");
  const matched = ["갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수"].find((dayMaster) => raw.includes(dayMaster));
  return matched || "";
}

function buildInitialCompatibilityEffects(userSaju: unknown, character: LoveCharacter): Partial<LoveStats> {
  const record = userSaju && typeof userSaju === "object" ? (userSaju as Record<string, unknown>) : {};
  const userDayMaster = normalizeSajuDayMaster(record.dayMasterName ?? record.dayMaster ?? record.dayPillar);
  const userElement = normalizeSajuElement(record.dayMasterElement);
  const profile = character.sajuMatchProfile;
  const effects: Partial<LoveStats> = {};

  const addEffect = (key: keyof LoveStats, value: number) => {
    effects[key] = (effects[key] ?? 0) + value;
  };

  if (userDayMaster && userDayMaster === character.dayMaster) {
    addEffect("affection", 8);
    addEffect("trust", 4);
  } else if (userDayMaster && profile?.primaryDayMasters?.includes(userDayMaster)) {
    addEffect("affection", 5);
    addEffect("chemistry", 3);
  }

  if (userElement && userElement === character.element) {
    addEffect("chemistry", 6);
    addEffect("stability", 3);
  } else if (userElement && (GENERATING_ELEMENT[userElement] === character.element || GENERATING_ELEMENT[character.element] === userElement)) {
    addEffect("trust", 4);
    addEffect("stability", 4);
    addEffect("tension", -2);
  } else if (userElement && (CONTROLLING_ELEMENT[userElement] === character.element || CONTROLLING_ELEMENT[character.element] === userElement)) {
    addEffect("affection", -3);
    addEffect("stability", -3);
    addEffect("tension", 5);
  }

  if (userElement && profile?.elementBias?.includes(userElement)) {
    addEffect("chemistry", 3);
  }

  return effects;
}

function CharacterPortrait({ character, mode }: { character: LoveCharacter; mode: "card" | "stage" | "result" }) {
  const sizeClass =
    mode === "stage"
      ? "h-[48svh] max-h-[560px] min-h-[320px] w-full"
      : mode === "result"
        ? "h-56 w-full"
        : "h-[380px] w-full";

  return (
    <div className={`relative ${sizeClass} overflow-hidden rounded-lg`}>
      <div className={`absolute inset-x-8 bottom-5 h-16 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={`${character.name} 프로필`}
        className="relative z-10 h-full w-full object-contain object-bottom drop-shadow-[0_26px_34px_rgba(0,0,0,0.55)]"
      />
    </div>
  );
}

function getCropPositionClass(className: string) {
  return /\b(absolute|fixed|relative)\b/.test(className) ? "" : "relative";
}

function CharacterProfileCrop({ character, className = "" }: { character: LoveCharacter; className?: string }) {
  return (
    <div className={`${getCropPositionClass(className)} overflow-hidden rounded-lg bg-[#f3efe8] ${className}`}>
      <div className={`absolute inset-x-8 bottom-6 h-20 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={`${character.name} 얼굴 및 기본정보 프로필`}
        style={getProfileCropStyle(character)}
        className="z-10 max-w-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.34)]"
      />
    </div>
  );
}

function CharacterDialogueCrop({ character, className = "" }: { character: LoveCharacter; className?: string }) {
  return (
    <div className={`${getCropPositionClass(className)} overflow-hidden rounded-lg bg-black/18 ${className}`}>
      <div className={`absolute inset-x-8 bottom-6 h-20 rounded-full blur-3xl ${character.palette.halo}`} />
      <img
        src={character.asset}
        alt={`${character.name} 대화 얼굴 프로필`}
        className="relative z-10 h-full w-full origin-top-left scale-[3.02] object-contain object-left-top drop-shadow-[0_22px_34px_rgba(0,0,0,0.52)]"
      />
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/70">
        <span>{label}</span>
        <span>{value >= 74 ? "깊어짐" : value >= 52 ? "이어짐" : "조심스러움"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-cyan-200"
        />
      </div>
    </div>
  );
}

function resolveChoiceTone(choice: LoveChoice) {
  const entries = Object.entries(choice.effects).sort((a, b) => Math.abs(Number(b[1] ?? 0)) - Math.abs(Number(a[1] ?? 0)));
  const [key] = entries[0] ?? ["neutral"];

  return key;
}

function createFallbackChoice(character: LoveCharacter, chapter: number, index: number, tone: "warm" | "curious" | "steady"): LoveChoice {
  const toneText = {
    warm: "따뜻하게 마음을 건넨다",
    curious: "상대의 생각을 더 묻는다",
    steady: "부담 없는 속도로 곁을 지킨다",
  }[tone];
  const effectsByTone: Record<typeof tone, Partial<LoveStats>> = {
    warm: { affection: 6, chemistry: 3, tension: -2 },
    curious: { trust: 5, chemistry: 4, tension: -1 },
    steady: { trust: 4, stability: 5, tension: -3 },
  };

  return {
    id: `fallback-${chapter}-${index}-${tone}`,
    text: toneText,
    effects: effectsByTone[tone],
    response: `${character.name}는 잠깐 시선을 내렸다가 다시 당신을 바라본다. "${tone === "warm" ? "그런 말은 쉽게 잊히지 않네요. 마음이 급하게 뜨는 게 아니라, 조용히 따뜻해지는 느낌이에요." : tone === "curious" ? "그걸 물어봐 주는 사람은 많지 않았어요. 대답보다 질문의 결이 먼저 닿을 때가 있네요." : "이 정도 속도라면, 나도 조금은 편해질 것 같아요. 가까워지는 일에도 숨 쉴 틈은 필요하니까."}"`,
    insight: `${character.name}형은 ${character.bestApproach} ${ELEMENT_LOVE_NARRATIVE[character.element].harmony}`,
  };
}

function getCharacterTenGodLine(character: LoveCharacter) {
  const hints = character.sajuMatchProfile?.tenGodHints?.slice(0, 3) ?? [];
  if (hints.length === 0) return "십성의 힌트는 아직 조용하지만, 일간과 오행의 결이 관계의 첫 단서를 만듭니다.";

  return `${hints.join("·")}의 십성 힌트가 사랑에서 원하는 역할, 책임, 표현 방식을 은근히 드러냅니다.`;
}

function buildMyeongliSceneArc(character: LoveCharacter, scene: Pick<LoveScene, "chapter" | "location">) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];
  const chapterIndex = Math.max(scene.chapter - 1, 0);
  const affection = character.affectionTriggers[chapterIndex % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[chapterIndex % character.trustTriggers.length] ?? character.bestApproach;
  const topic = character.likes.topics[chapterIndex % character.likes.topics.length] ?? character.archetype;
  const behavior = character.dislikes.behaviors[chapterIndex % character.dislikes.behaviors.length] ?? "성급한 태도";

  return {
    affection,
    behavior,
    dayMaster,
    element,
    tenGods: getCharacterTenGodLine(character),
    topic,
    trust,
    yinYang: YIN_YANG_LOVE_NARRATIVE[character.yinYang],
  };
}

function buildMyeongliResultCoda(character: LoveCharacter) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];

  return `${dayMaster.core}. ${element.label} 기운은 ${element.atmosphere}이라서, ${element.harmony}. ${getCharacterTenGodLine(character)} 이 캐릭터와의 궁합은 단순한 호감 점수보다 "어떤 속도로 다가가고, 어떤 방식으로 안심시키는가"에서 성패가 갈립니다.`;
}

function buildMyeongliRiskCoda(character: LoveCharacter) {
  const element = ELEMENT_LOVE_NARRATIVE[character.element];
  const dayMaster = DAY_MASTER_LOVE_NARRATIVE[character.dayMaster];

  return `${element.shadow}. ${dayMaster.caution}. 피해야 할 흐름은 ${character.dislikes.behaviors.join(", ")}이며, 이 신호가 반복되면 ${character.conflictPattern}`;
}

function createSupplementalScene(character: LoveCharacter, chapter: number): LoveScene {
  const place = character.likes.places[(chapter - 1) % character.likes.places.length] ?? "조용한 거리";
  const topic = character.likes.topics[(chapter - 1) % character.likes.topics.length] ?? "서로의 마음";
  const trigger = character.affectionTriggers[(chapter - 1) % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[(chapter - 1) % character.trustTriggers.length] ?? "천천히 쌓는 신뢰";
  const arc = buildMyeongliSceneArc(character, { chapter, location: place });

  return {
    id: `${character.id}-supplement-${chapter}`,
    characterId: character.id,
    chapter,
    location: place,
    title: `${character.archetype}의 깊어지는 장면`,
    situation: `${place}의 공기가 천천히 가라앉는다. ${character.name}는 ${topic}에 대해 쉽게 끝나지 않는 이야기를 꺼내고, 대화는 가벼운 안부에서 서로의 관계 속도와 마음의 기준으로 이어진다. ${arc.dayMaster.core}. ${arc.element.label}의 기운은 ${arc.element.atmosphere}이라, 이 장면의 끌림은 눈에 띄는 사건보다 작은 반응과 반복되는 태도에서 깊어진다. ${arc.tenGods} 지금은 성급하게 답을 고르는 순간이 아니라, 이 사람이 어떤 방식으로 호감을 확인하고 불안을 감추는지 바라봐야 하는 장면이다.`,
    dialogue: `${trigger}. ${arc.dayMaster.attraction}. 그리고 ${trust}. 나는 그런 흐름이 오래 남는 편이에요.`,
    choices: [
      createFallbackChoice(character, chapter, 1, "warm"),
      createFallbackChoice(character, chapter, 2, "curious"),
      createFallbackChoice(character, chapter, 3, "steady"),
    ],
  };
}

function createExpandedSupplementalScene(character: LoveCharacter, chapter: number): LoveScene {
  const legacyScene = createSupplementalScene(character, chapter);
  const chapterIndex = Math.max(chapter - 1, 0);
  const place = character.likes.places[chapterIndex % character.likes.places.length] ?? "조용한 거리";
  const topic = character.likes.topics[chapterIndex % character.likes.topics.length] ?? "서로의 마음";
  const trigger = character.affectionTriggers[chapterIndex % character.affectionTriggers.length] ?? character.profileLine;
  const trust = character.trustTriggers[chapterIndex % character.trustTriggers.length] ?? character.bestApproach;
  const behavior = character.dislikes.behaviors[chapterIndex % character.dislikes.behaviors.length] ?? "성급한 확신";
  const arc = buildMyeongliSceneArc(character, { chapter, location: place });

  return {
    id: `${character.id}-expanded-supplement-${chapter}`,
    characterId: character.id,
    chapter,
    location: place || legacyScene.location,
    title: `${character.archetype}의 마음이 깊어지는 밤`,
    situation: `${place}의 공기가 천천히 가라앉는다. ${character.name}은 ${topic}에 대한 이야기를 꺼내다가 문득 당신의 반응을 오래 바라본다. 가벼운 농담처럼 시작된 대화는 어느새 서로의 속도와 마음을 확인하는 밤으로 이어진다. ${arc.dayMaster.core}. ${arc.yinYang}. ${arc.element.label}의 연애 결은 ${arc.element.harmony} 그래서 지금은 답을 고르는 시간이 아니라, 이 사람이 어떤 방식으로 애정을 확인하고 불안을 감추는지 읽어야 하는 장면이다. ${arc.tenGods}`,
    dialogue: `${trigger}. ${arc.dayMaster.attraction}. 그리고 ${trust}. 나는 그런 흐름을 오래 기억하는 편이야.`,
    choices: [
      {
        ...createFallbackChoice(character, chapter, 1, "warm"),
        text: `${trigger}을 조용히 알아봐준다`,
        response: `${character.name}은 잠시 시선을 내렸다가 다시 당신을 바라본다. "그걸 알아봐주는 사람은 생각보다 많지 않아."`,
        insight: `${character.name}에게는 ${trigger}이 호감의 문을 여는 신호가 됩니다.`,
      },
      {
        ...createFallbackChoice(character, chapter, 2, "curious"),
        text: `${topic}에 담긴 진짜 마음을 물어본다`,
        response: `${character.name}은 대답을 서두르지 않는다. "그렇게 물어보면, 나도 조금은 솔직해지고 싶어져."`,
        insight: `${character.name}의 ${character.speechStyle} 흐름에는 깊이를 존중하는 질문이 잘 맞습니다.`,
      },
      {
        ...createFallbackChoice(character, chapter, 3, "steady"),
        text: `${behavior} 대신 ${trust}을 보여준다`,
        response: `${character.name}의 표정이 조금 누그러진다. "부담스럽지 않은데도 이상하게 믿고 싶어지네."`,
        insight: `${character.name}에게는 ${trust} 같은 태도가 관계를 안정적으로 깊게 만듭니다.`,
      },
    ],
  };
}

function buildScenePrelude(character: LoveCharacter, scene: LoveScene) {
  const arc = buildMyeongliSceneArc(character, scene);

  return [
    `${character.name}의 ${character.dayMaster} 일간은 ${arc.dayMaster.core}. ${scene.location}에서 시작된 이 장면은 ${arc.element.label} 기운의 ${arc.element.atmosphere}으로 번지고, ${arc.topic}을 이야기하는 동안에도 마음의 방향은 쉽게 단정되지 않습니다.`,
    `${arc.yinYang}. ${arc.affection}은 관계의 온도를 올리고, ${arc.trust}은 닫혀 있던 마음을 조금 더 안전하게 만듭니다. ${arc.tenGods}`,
    `궁합에서 지금 중요한 포인트는 ${arc.element.harmony} 반대로 ${arc.behavior}이 느껴지면 ${character.conflictPattern} 그래서 지금 필요한 것은 정답 같은 말보다, 이 사람의 리듬을 놓치지 않는 태도입니다.`,
  ];
}

function ensureSceneChoices(scene: LoveScene, character: LoveCharacter): LoveScene {
  if (scene.choices.length >= 3) return scene;
  const fallbackChoices = [
    createFallbackChoice(character, scene.chapter, 1, "warm"),
    createFallbackChoice(character, scene.chapter, 2, "curious"),
    createFallbackChoice(character, scene.chapter, 3, "steady"),
  ].filter((choice) => !scene.choices.some((item) => item.id === choice.id));

  return {
    ...scene,
    choices: [...scene.choices, ...fallbackChoices].slice(0, 3),
  };
}

function buildPlayableScenes(character: LoveCharacter | null, rawScenes: LoveScene[]) {
  if (!character) return [];
  const sortedScenes = rawScenes
    .filter((scene) => scene.characterId === character.id)
    .sort((a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id));
  const baseScenes =
    sortedScenes.length > 0
      ? sortedScenes
      : [
          {
            id: `${character.id}-preparing-story`,
            characterId: character.id,
            chapter: 1,
            location: "Love Code",
            title: "준비 중인 이야기",
            situation: "이 캐릭터의 스토리를 준비하고 있어요.",
            dialogue: `${character.name}의 이야기는 곧 더 깊게 열릴 예정입니다.`,
            choices: [
              createFallbackChoice(character, 1, 1, "warm"),
              createFallbackChoice(character, 1, 2, "curious"),
              createFallbackChoice(character, 1, 3, "steady"),
            ],
          },
        ];
  const scenes = baseScenes.map((scene) => ensureSceneChoices(scene, character));
  let chapter = scenes.reduce((max, scene) => Math.max(max, scene.chapter), 0);

  while (scenes.length < MIN_PLAYABLE_SCENES) {
    chapter += 1;
    scenes.push(createExpandedSupplementalScene(character, chapter));
  }

  return scenes;
}

function RecommendedMatchCard({
  character,
  result,
  secondaryLabels,
  onStart,
}: {
  character: LoveCharacter;
  result: LoveCharacterMatchResult;
  secondaryLabels: string[];
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-lg border border-rose-100/22 bg-white/[0.12] shadow-[0_22px_60px_rgba(244,114,182,0.16)] backdrop-blur-2xl"
    >
      <div className="grid gap-0 sm:grid-cols-[0.42fr_0.58fr]">
        <CharacterProfileCrop character={character} className="min-h-48 rounded-none sm:min-h-full" />
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${character.palette.chip}`}>{character.dayMaster} 일간</span>
            <span className="rounded-full border border-rose-100/20 bg-rose-50/12 px-3 py-1 text-xs font-black text-rose-50/82">
              신뢰도 {result.confidenceLabel}
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-100/72">Main Match</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">
            입력한 상대는 <span className={character.palette.accent}>{character.name}형 성향</span>과 가장 가까워요.
          </h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/70">{result.summary}</p>
          <div className="mt-4 grid gap-2">
            {result.reasonBullets.slice(0, 3).map((reason) => (
              <div key={reason} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-white/72">
                {reason}
              </div>
            ))}
          </div>
          {secondaryLabels.length > 0 ? (
            <p className="mt-4 text-sm font-bold text-rose-50/78">함께 가까운 성향: {secondaryLabels.join(", ")}</p>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition hover:brightness-110 ${character.palette.button}`}
          >
            {character.name}형 시뮬레이션 시작하기
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

type ChoiceAnalysisTone = "warm" | "trust" | "tension" | "neutral";

type ChoiceAnalysis = {
  tone: ChoiceAnalysisTone;
  summary: string;
  nextHint: string;
};

function resolveFinalRelationshipType(stats: LoveStats) {
  const warmth = Math.round((stats.affection + stats.trust + stats.chemistry + stats.stability - stats.tension * 0.45) / 4);

  if (stats.trust >= 78 && stats.chemistry >= 72 && stats.tension <= 42) {
    return {
      title: "운명의 코드가 열린 관계",
      body: "서로의 마음이 비교적 자연스럽게 맞물렸습니다. 끌림만 앞선 것이 아니라, 상대가 안심할 수 있는 리듬을 함께 만들어낸 흐름이에요.",
    };
  }

  if (stats.trust >= 68 && stats.stability >= 64) {
    return {
      title: "천천히 깊어지는 인연",
      body: "빠르게 타오르기보다 오래 남는 쪽에 가까운 관계입니다. 작은 배려와 반복되는 진심이 둘 사이의 문을 조용히 열어주었어요.",
    };
  }

  if (stats.chemistry >= 72 || stats.affection >= 72) {
    return {
      title: "설렘은 있지만 조율이 필요한 관계",
      body: "분명한 끌림이 있었지만, 서로의 속도와 표현 방식에는 조금 더 섬세한 조율이 필요합니다. 설렘을 오래 지키려면 한 박자 느린 확인이 좋아요.",
    };
  }

  if (warmth >= 52) {
    return {
      title: "서로의 언어를 배워야 하는 관계",
      body: "마음은 움직였지만 표현의 결이 완전히 같지는 않았습니다. 상대가 어떤 방식으로 사랑을 느끼는지 배우는 순간, 관계의 분위기가 훨씬 부드러워질 수 있어요.",
    };
  }

  return {
    title: "거리감 조절이 필요한 관계",
    body: "감정의 온도보다 거리의 감각이 먼저 중요하게 드러난 관계입니다. 무리하게 가까워지기보다, 상대가 숨 쉴 수 있는 여백을 남겨두는 편이 좋습니다.",
  };
}

function analyzeChoiceLogs(choiceLog: ChoiceLog[]): ChoiceAnalysis {
  if (choiceLog.length === 0) {
    return {
      tone: "neutral",
      summary: "이번 흐름에서는 아직 결정적인 선택보다 관찰의 시간이 더 길었습니다. 상대를 서두르지 않고 바라보는 태도가 관계의 첫 인상을 차분하게 만들었어요.",
      nextHint: "다음에는 마음을 알아차린 순간을 조금 더 부드럽게 표현해보세요.",
    };
  }

  const tally = choiceLog.reduce(
    (acc, log) => {
      const effects = log.effects;
      const positive = (effects.affection ?? 0) + (effects.trust ?? 0) + (effects.chemistry ?? 0) + (effects.stability ?? 0);
      const tension = effects.tension ?? 0;

      if ((effects.trust ?? 0) + (effects.stability ?? 0) >= 8) acc.trust += 1;
      if (positive >= 10 && tension <= 2) acc.warm += 1;
      if (tension >= 5 || positive < 0) acc.tension += 1;
      if (Math.abs(positive) < 6 && tension < 5) acc.neutral += 1;

      return acc;
    },
    { warm: 0, trust: 0, tension: 0, neutral: 0 },
  );

  if (tally.tension >= tally.warm && tally.tension >= tally.trust && tally.tension > tally.neutral) {
    return {
      tone: "tension",
      summary: "이번 대화에서는 마음을 확인하려는 순간마다 긴장이 조금 더 먼저 올라왔습니다. 상대의 반응을 재촉한 장면들이 있어, 설렘과 불안이 함께 흔들린 흐름이에요.",
      nextHint: "다음에는 바로 답을 요구하기보다, 상대가 마음을 정리할 시간을 남겨두는 태도가 좋습니다.",
    };
  }

  if (tally.trust >= tally.warm && tally.trust > tally.neutral) {
    return {
      tone: "trust",
      summary: "신뢰를 쌓는 선택이 자주 보였습니다. 화려한 말보다 상대가 안심할 수 있는 태도가 반복되며, 관계의 바닥을 단단하게 받쳐주었어요.",
      nextHint: "다음에는 안정감 위에 작은 솔직함을 더해보면 관계의 온도가 자연스럽게 올라갑니다.",
    };
  }

  if (tally.warm > tally.neutral) {
    return {
      tone: "warm",
      summary: "상대의 마음을 알아봐주는 선택이 많았습니다. 다정함이 과하게 앞서기보다, 필요한 순간에 따뜻하게 닿아 관계의 분위기를 부드럽게 열어주었어요.",
      nextHint: "다음에는 그 다정함을 조금 더 구체적인 말과 행동으로 남겨보세요.",
    };
  }

  return {
    tone: "neutral",
    summary: "성급하게 밀어붙이기보다 분위기를 살피는 중립적인 선택이 많았습니다. 아직 깊이 들어가기 전, 서로의 결을 조심스럽게 확인한 흐름이에요.",
    nextHint: "다음에는 관찰에서 한 걸음 나아가, 마음에 남은 장면을 조용히 표현해보세요.",
  };
}

const CHARACTER_RESULT_SUMMARIES: Record<CharacterId, string> = {
  "kang-taejun": "강태준 같은 병화형 인물에게는 말보다 태도가 중요합니다. 이번 선택에서 당신이 그의 노력과 열정을 알아봐준 순간마다 관계의 온도가 빠르게 올라갔어요.",
  "kwon-sehyun": "권세현 같은 경금형 인물은 쉽게 흔들리지 않지만, 한 번 신뢰를 느끼면 관계를 오래 지켜보는 편입니다. 예의와 일관성이 이번 관계의 핵심 열쇠였어요.",
  michael: "미카엘 같은 계수형 인물에게는 조용한 질문과 깊은 여백이 잘 닿습니다. 겉으로 드러난 말보다 그 말 뒤의 마음을 읽어준 선택들이 관계를 천천히 열었습니다.",
  "seo-yuan": "서유안 같은 기토형 인물은 작은 배려가 오래 남는 사람입니다. 다정함을 서두르지 않고 편안하게 건넨 순간들이 둘 사이에 안정적인 온기를 만들었어요.",
  "seo-ijun": "서이준 같은 임수형 인물에게는 가벼운 확신보다 깊이를 함께 견디는 태도가 중요합니다. 그의 고독을 밀어내지 않은 선택들이 마음의 문을 조금씩 열었습니다.",
  "yoon-siwoo": "윤시우 같은 갑목형 인물은 함께 걸어가는 감각에 마음을 엽니다. 성실한 리듬과 밝은 응원이 관계를 단정하고 건강한 방향으로 이끌었어요.",
  "han-yunseo": "한윤서 같은 정화형 인물은 자유로운 표현 속에서도 진심을 알아봐주길 바랍니다. 장난과 진지함의 균형을 맞춘 순간마다 설렘이 선명해졌어요.",
  "kim-ming": "김민 같은 신금형 인물은 분위기의 결을 섬세하게 기억합니다. 조심스럽고 예의 있는 태도가 그녀의 마음에 오래 남는 신뢰로 번졌어요.",
  "park-jieun": "박지은 같은 계수형 인물은 확신을 확인받고 싶어 하면서도 쉽게 속내를 보이지 않습니다. 불안을 가볍게 넘기지 않은 선택들이 관계를 부드럽게 붙잡아주었어요.",
  saebyeok: "새벽 같은 병화형 인물에게는 흐릿한 태도보다 분명하고 성숙한 표현이 닿습니다. 당당하지만 선을 넘지 않은 선택들이 강한 끌림을 안정감으로 바꾸었어요.",
  seoyeon: "서연 같은 을목형 인물은 작은 다정함을 오래 품습니다. 속도보다 온도를 맞춘 선택들이 관계를 부드럽고 오래 남는 방향으로 열어주었어요.",
  soha: "소하 같은 갑목형 인물은 함께 움직이고 웃는 순간에 마음이 가까워집니다. 밝은 리액션과 응원의 태도가 관계의 리듬을 건강하게 살렸어요.",
  jiyoon: "지윤 같은 임수형 인물은 묶어두는 사랑보다 바람처럼 편안한 관계에서 마음을 엽니다. 가볍지만 진심 있는 대화가 둘 사이의 거리를 자연스럽게 좁혔어요.",
  harin: "하린 같은 정화형 인물은 즐거운 분위기 속에서 진심을 확인합니다. 장난을 받아주되 마음을 흘려보내지 않은 선택들이 관계에 귀여운 긴장감을 남겼어요.",
  neo: "네오 같은 신금형 인물에게는 침묵을 존중하는 태도가 깊은 신뢰로 이어집니다. 빠른 확신보다 조용한 이해가 더 강하게 닿았어요.",
  yeoni: "연이 같은 을목형 인물에게는 다정한 말보다 마음의 속도를 맞춰주는 태도가 중요합니다. 작은 배려를 알아차린 선택들이 관계를 부드럽게 열어주었어요.",
};

function buildSajuEntrySummary(entryMode: "preset" | "sajuMatch", character: LoveCharacter) {
  if (entryMode === "sajuMatch") {
    return `입력한 상대의 사주 성향이 ${character.name}형 캐릭터와 가까운 흐름으로 나타났어요. 이 결과는 단정이 아니라, 시뮬레이션을 위한 페르소나 매칭으로 읽어주세요.`;
  }

  return `선택한 캐릭터의 ${character.dayMaster} 일간 성향을 기준으로 관계 흐름을 해석했어요. 캐릭터가 가진 관계 패턴에 당신의 선택이 어떻게 닿았는지를 중심으로 보았습니다.`;
}

function buildCustomAdvice(character: LoveCharacter, choiceAnalysis: ChoiceAnalysis) {
  const affection = character.affectionTriggers.slice(0, 2).join(", ");
  const trust = character.trustTriggers.slice(0, 2).join(", ");
  const toneGuide =
    choiceAnalysis.tone === "tension"
      ? "긴장이 올라올수록 더 부드럽고 짧은 표현이 필요합니다."
      : choiceAnalysis.tone === "trust"
        ? "이미 안정감이 만들어진 만큼, 다음에는 감정을 조금 더 선명하게 남겨도 좋아요."
        : choiceAnalysis.tone === "warm"
          ? "따뜻함이 잘 닿았으니, 그 온기를 일관성 있게 이어가는 것이 중요합니다."
          : "아직 조심스러운 흐름이므로, 작은 확신을 천천히 쌓아가는 편이 좋습니다.";

  return `${character.name}에게는 ${character.bestApproach} 특히 ${affection} 같은 순간이 호감의 문을 열고, ${trust} 같은 태도가 신뢰를 깊게 만듭니다. 다만 ${character.conflictPattern} ${toneGuide}`;
}

function ResultCard({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5 ${className}`}>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-rose-100/62">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-black leading-snug text-white sm:text-xl">{title}</h3>
      <div className="mt-3 text-sm font-semibold leading-7 text-white/72">{children}</div>
    </div>
  );
}

export const LoveSimulationEngine: React.FC = () => {
  const [screen, setScreen] = useState<"intro" | "select" | "play" | "result">("intro");
  const [selectedId, setSelectedId] = useState<CharacterId | null>(null);
  const [entryMode, setEntryMode] = useState<"preset" | "sajuMatch">("preset");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [stats, setStats] = useState<LoveStats>(INITIAL_STATS);
  const [selectedChoice, setSelectedChoice] = useState<LoveChoice | null>(null);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [choiceLog, setChoiceLog] = useState<ChoiceLog[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerCalType, setPartnerCalType] = useState<PartnerCalendarType>("solar");
  const [partnerHour, setPartnerHour] = useState("12");
  const [partnerMinute, setPartnerMinute] = useState("0");
  const [partnerCountry, setPartnerCountry] = useState("Asia/Seoul");
  const [partnerGender, setPartnerGender] = useState<PartnerGender>("female");
  const [expandedProfileId, setExpandedProfileId] = useState<CharacterId | null>(null);
  const [matchResults, setMatchResults] = useState<LoveCharacterMatchResult[]>([]);
  const [matchError, setMatchError] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [initialCompatibilityNote, setInitialCompatibilityNote] = useState("");

  const character = LOVE_CHARACTERS.find((item) => item.id === selectedId) ?? null;
  const scenes = useMemo(() => buildPlayableScenes(character, LOVE_SCENES), [character]);
  const currentScene = scenes[sceneIndex] ?? null;
  const isShowingResponse = Boolean(selectedChoice);
  const metrics = getRelationshipMetrics(stats);
  const scenePrelude = useMemo(() => (character && currentScene ? buildScenePrelude(character, currentScene) : []), [character, currentScene]);
  const primaryMatch = matchResults[0] ?? null;
  const primaryMatchCharacter = useMemo(
    () => (primaryMatch ? LOVE_CHARACTERS.find((item) => item.id === primaryMatch.characterId) ?? null : null),
    [primaryMatch],
  );
  const secondaryMatchLabels = matchResults.slice(1, 3).map((item) => `${item.characterName}형`);
  const canMatchPartner = Boolean(partnerBirthDate && !isMatching);

  const startWithCharacter = (id: CharacterId, mode: "preset" | "sajuMatch" = "preset") => {
    setSelectedId(id);
    setEntryMode(mode);
    setSceneIndex(0);
    setStats(INITIAL_STATS);
    setInitialCompatibilityNote("프로필 카드 사주를 확인해 초반 궁합 흐름을 맞추는 중입니다.");
    setSelectedChoice(null);
    setIsChoiceOpen(false);
    setChoiceLog([]);
    setExpandedProfileId(null);
    setScreen("play");
  };

  useEffect(() => {
    if (screen !== "play" || !character) return;

    let cancelled = false;
    const profileSeed = readCurrentProfileSeed();
    if (!profileSeed) {
      setInitialCompatibilityNote("프로필 카드 생년월일을 연결하면 초반 궁합 흐름에 반영됩니다.");
      return;
    }

    const [year, month, day] = profileSeed.birthDate.split("-").map((value) => Number(value));
    if (!year || !month || !day) {
      setInitialCompatibilityNote("프로필 카드 생년월일을 연결하면 초반 궁합 흐름에 반영됩니다.");
      return;
    }

    void (async () => {
      try {
        const userSaju = await fetchSajuPillar({
          name: profileSeed.name || "나",
          gender: profileSeed.gender,
          year,
          month,
          day,
          hour: profileSeed.hour,
        });
        if (cancelled) return;

        const effects = buildInitialCompatibilityEffects(userSaju, character);
        const hasEffects = Object.values(effects).some((value) => Number(value || 0) !== 0);
        if (hasEffects) {
          setStats((current) => applyEffects(current, effects));
          setInitialCompatibilityNote("프로필 카드 사주가 초반 궁합 흐름에 반영됐습니다.");
        } else {
          setInitialCompatibilityNote("프로필 카드 사주는 확인됐고, 초반 흐름은 중립으로 시작합니다.");
        }
      } catch {
        if (!cancelled) setInitialCompatibilityNote("프로필 카드 사주를 불러오지 못해 기본 흐름으로 시작합니다.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [character, screen]);

  const handleChoice = (choice: LoveChoice) => {
    if (!currentScene || selectedChoice) return;
    setSelectedChoice(choice);
    setIsChoiceOpen(false);
    setStats((current) => applyEffects(current, choice.effects));
    setChoiceLog((current) => [
      ...current,
      {
        sceneId: currentScene.id,
        choiceId: choice.id,
        tone: resolveChoiceTone(choice),
        effects: choice.effects,
      },
    ]);
  };

  const goNextScene = () => {
    if (sceneIndex >= scenes.length - 1) {
      setScreen("result");
      return;
    }

    setSceneIndex((current) => current + 1);
    setSelectedChoice(null);
    setIsChoiceOpen(false);
  };

  const resetToSelect = () => {
    setSelectedChoice(null);
    setSceneIndex(0);
    setStats(INITIAL_STATS);
    setChoiceLog([]);
    setIsChoiceOpen(false);
    setExpandedProfileId(null);
    setScreen("select");
  };

  const matchPartner = async (input?: PartnerMatchInput) => {
    const targetInput = input ?? {
      name: partnerName,
      birthDate: partnerBirthDate,
      calType: partnerCalType,
      hour: partnerHour,
      minute: partnerMinute,
      country: partnerCountry,
      gender: partnerGender,
    };
    const [year, month, day] = targetInput.birthDate.split("-").map((value) => Number(value));
    if (!year || !month || !day) {
      setMatchResults([]);
      setMatchError("상대의 사주 정보를 불러오지 못했어요. 입력값을 확인한 뒤 다시 시도해주세요.");
      return;
    }

    setIsMatching(true);
    setMatchError("");
    setMatchResults([]);

    try {
      const sajuResult = await fetchSajuPillar({
        name: targetInput.name.trim() || "상대",
        gender: targetInput.gender === "male" ? "남" : "여",
        year,
        month,
        day,
        hour: Number(targetInput.hour) || 12,
      });
      const results = matchLoveCharactersFromSaju(sajuResult, LOVE_CHARACTERS, targetInput.gender);

      if (results.length === 0) throw new Error("empty love character match result");
      setMatchResults(results);
    } catch {
      setMatchResults([]);
      setMatchError("상대의 사주 정보를 불러오지 못했어요. 입력값을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsMatching(false);
    }
  };

  if (screen === "intro") {
    return (
      <section className="relative min-h-[100svh] overflow-hidden bg-[#08060d] text-white">
        <motion.img
          src={LOVE_CODE_HERO_ASSET}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-72"
          animate={{ scale: [1.02, 1.055, 1.02], x: [0, -10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,13,0.94)_0%,rgba(24,11,24,0.82)_34%,rgba(35,14,31,0.46)_58%,rgba(7,8,14,0.76)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_24%,rgba(255,221,236,0.22)_0%,rgba(255,221,236,0)_38%),linear-gradient(180deg,rgba(255,244,231,0.08)_0%,rgba(255,255,255,0)_34%,rgba(4,6,12,0.58)_100%)]" />
        <motion.div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/70 to-transparent"
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-0 top-0 h-full w-1/2 bg-[linear-gradient(105deg,rgba(255,255,255,0)_0%,rgba(255,226,235,0.14)_48%,rgba(255,255,255,0)_100%)]"
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.4 }}
        />
        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between px-5 py-7 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.span
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-100/30 bg-white/12 shadow-[0_16px_42px_rgba(244,114,182,0.24)] backdrop-blur-xl"
                animate={{ y: [0, -3, 0], boxShadow: ["0 16px 42px rgba(244,114,182,0.18)", "0 20px 52px rgba(255,214,232,0.30)", "0 16px 42px rgba(244,114,182,0.18)"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-5 w-5 text-rose-100" />
              </motion.span>
              <span className="text-sm font-black uppercase tracking-[0.28em] text-rose-50/82">Love Code</span>
            </div>
          </header>

          <div className="grid items-center gap-9 py-8 lg:grid-cols-[0.96fr_1.04fr] lg:py-10">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="max-w-2xl">
              <motion.div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-100/26 bg-white/[0.09] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-rose-50/86 shadow-[0_16px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-rose-100" />
                Visual Novel Match
              </motion.div>
              <p className="mb-4 text-sm font-black text-rose-100/92">사주 성향과 선택으로 흐름이 달라지는 대화</p>
              <h1 className="max-w-[760px] text-5xl font-black leading-[1.02] text-white drop-shadow-[0_12px_38px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
                Love Code: 운명의 상대와 대화하기
              </h1>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-rose-50/78 drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:text-lg">
                캐릭터의 성향, 취향, 거리감을 따라가는 비주얼 노벨 궁합입니다.
              </p>
              <div className="mt-6 grid max-w-xl gap-2 text-sm font-bold text-white/72 sm:grid-cols-3">
                {["사주 성향", "캐릭터 대화", "관계 흐름"].map((label) => (
                  <div key={label} className="rounded-lg border border-white/12 bg-black/18 px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                    {label}
                  </div>
                ))}
              </div>
              <div className="hidden">
              <p className="mb-5 text-sm font-black text-rose-100/92">사주 성향과 선택으로 흐름이 달라지는 대화</p>
              <h1 className="text-5xl font-black leading-[0.98] text-white sm:text-6xl lg:text-7xl">
                Love Code: 운명의 상대와 대화하기
              </h1>
              <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-white/66 sm:text-lg">
                캐릭터의 성향, 취향, 거리감을 따라가는 비주얼 노벨 궁합입니다.
              </p>
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setScreen("select")}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-white via-rose-50 to-pink-100 px-6 py-4 text-sm font-black text-zinc-950 shadow-[0_22px_56px_rgba(255,198,218,0.28)] transition hover:brightness-105"
                >
                  캐릭터 선택하기
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void matchPartner()}
                  disabled={!canMatchPartner}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg border border-rose-100/32 bg-white/[0.12] px-6 py-4 text-sm font-black text-white/90 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:text-white/38 disabled:hover:bg-white/10"
                >
                  {isMatching ? "인연의 결을 읽는 중" : "상대 정보로 매칭하기"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void matchPartner({
                  name: String(formData.get("partnerName") ?? ""),
                  birthDate: String(formData.get("partnerBirthDate") ?? ""),
                  calType: String(formData.get("partnerCalType") ?? "solar") as PartnerCalendarType,
                  hour: String(formData.get("partnerHour") ?? "12"),
                  minute: String(formData.get("partnerMinute") ?? "0"),
                  country: String(formData.get("partnerCountry") ?? "Asia/Seoul"),
                  gender: partnerGender,
                });
              }}
              className="rounded-lg border border-rose-100/20 bg-white/[0.09] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-7"
              aria-label="상대 정보 입력 매칭"
            >
              <div className="mb-5">
                <span className="text-xs font-black uppercase tracking-[0.24em] text-rose-100/86">LOVE MATCH</span>
                <h2 className="mt-3 text-3xl font-black text-white">상대 정보 입력 매칭</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/62">이름과 생년월일을 남기면 선택한 성별 안에서 가장 닮은 러브 코드 상대가 열립니다.</p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-white/90" htmlFor="lovePartnerName">이름</label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-5 text-sm font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                    type="text"
                    id="lovePartnerName"
                    name="partnerName"
                    placeholder="이름을 입력하세요"
                    autoComplete="name"
                    inputMode="text"
                    enterKeyHint="next"
                    value={partnerName}
                    onChange={(event) => setPartnerName(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90" htmlFor="lovePartnerBirthDate">생년월일</label>
                  <input
                    className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-5 text-sm font-bold text-zinc-950 outline-none transition focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                    type="date"
                    id="lovePartnerBirthDate"
                    name="partnerBirthDate"
                    aria-label="생년월일"
                    autoComplete="bday"
                    inputMode="numeric"
                    required
                    value={partnerBirthDate}
                    onChange={(event) => setPartnerBirthDate(event.target.value)}
                  />
                  <div className="mt-3 grid gap-2 text-sm font-bold text-white/82 sm:grid-cols-3">
                    {[
                      ["solar", "양력"],
                      ["lunar", "음력(평달)"],
                      ["lunar_leap", "음력(윤달)"],
                    ].map(([value, label]) => (
                      <label key={value} className="flex min-h-11 items-center gap-2 rounded-lg border border-rose-100/14 bg-black/20 px-3 transition hover:bg-white/10">
                        <input
                          type="radio"
                          name="partnerCalType"
                          value={value}
                          checked={partnerCalType === value}
                          onChange={() => setPartnerCalType(value as PartnerCalendarType)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 min-h-9 rounded-lg border border-rose-100/18 bg-rose-100/10 px-3 py-2 text-xs font-bold text-rose-50/82">
                    선택한 달력 기준으로 상대의 연애 결을 맞춰봅니다.
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90">출생 시간</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-4 text-sm font-bold text-zinc-950 outline-none transition focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                      name="partnerHour"
                      aria-label="출생 시(시간)"
                      value={partnerHour}
                      onChange={(event) => setPartnerHour(event.target.value)}
                    >
                      {HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, "0")}시
                        </option>
                      ))}
                    </select>
                    <select
                      className="min-h-14 w-full rounded-lg border border-white/15 bg-white/95 px-4 text-sm font-bold text-zinc-950 outline-none transition focus:border-rose-200 focus:ring-4 focus:ring-rose-100/25"
                      name="partnerMinute"
                      aria-label="출생 분(분)"
                      value={partnerMinute}
                      onChange={(event) => setPartnerMinute(event.target.value)}
                    >
                      {MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>
                          {String(minute).padStart(2, "0")}분
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-rose-100/28 bg-rose-50/95 p-4 text-zinc-950 shadow-[0_18px_40px_rgba(255,228,230,0.12)]">
                  <label className="mb-2 block text-sm font-black" htmlFor="lovePartnerCountry">
                    출생 국가 (장소) <span className="text-xs font-bold text-zinc-500">*서머타임 및 경도 보정 자동 적용</span>
                  </label>
                  <select
                    className="min-h-14 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-200/45"
                    id="lovePartnerCountry"
                    name="partnerCountry"
                    aria-label="출생 국가"
                    value={partnerCountry}
                    onChange={(event) => setPartnerCountry(event.target.value)}
                  >
                    <option value="Asia/Seoul">대한민국 · 서울 기준</option>
                    <option value="Asia/Tokyo">일본 · 도쿄 기준</option>
                    <option value="Asia/Shanghai">중국 · 상하이 기준</option>
                    <option value="America/New_York">미국 · 뉴욕 기준</option>
                    <option value="Europe/Paris">프랑스 · 파리 기준</option>
                  </select>
                  <p className="mt-3 text-xs font-bold leading-5 text-zinc-600">현재 매칭은 입력 시간과 장소 신호를 함께 반영합니다.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white/90">상대 성별</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["female", "♀ 여성"],
                      ["male", "♂ 남성"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPartnerGender(value as PartnerGender)}
                        className={`min-h-13 rounded-lg border px-4 text-sm font-black transition ${
                          partnerGender === value
                            ? "border-rose-100 bg-rose-100 text-zinc-950 shadow-[0_14px_34px_rgba(255,228,230,0.18)]"
                            : "border-white/15 bg-white/10 text-white hover:bg-white/18"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-rose-100/14 bg-black/24 px-4 py-3 text-sm font-bold text-rose-50/86">
                  시간 미입력 시 낮 12시로 계산됩니다.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerHour("12");
                    setPartnerMinute("0");
                  }}
                  className="min-h-12 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/18"
                >
                  출생시간을 몰라요 · 낮 12시 기준으로 보기
                </button>
                <button
                  type="submit"
                  disabled={!canMatchPartner}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-100 via-pink-100 to-violet-100 px-5 text-sm font-black text-zinc-950 shadow-[0_20px_48px_rgba(244,114,182,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isMatching ? "인연의 결을 찾는 중..." : "상대 정보로 매칭 시작"}
                  <ChevronRight className="h-4 w-4" />
                </button>
                <AnimatePresence mode="wait">
                  {matchError ? (
                    <motion.div
                      key="match-error"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-lg border border-rose-100/24 bg-rose-950/34 px-4 py-3 text-sm font-bold leading-6 text-rose-50"
                    >
                      {matchError}
                    </motion.div>
                  ) : null}
                  {primaryMatch && primaryMatchCharacter ? (
                    <RecommendedMatchCard
                      key={primaryMatch.characterId}
                      character={primaryMatchCharacter}
                      result={primaryMatch}
                      secondaryLabels={secondaryMatchLabels}
                      onStart={() => startWithCharacter(primaryMatch.characterId, "sajuMatch")}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.form>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </section>
    );
  }

  if (screen === "select") {
    return (
      <section className="relative min-h-[100svh] overflow-hidden bg-[#17171d] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,#151721_0%,#301a29_42%,#46233b_64%,#111827_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,244,231,0.08)_0%,rgba(255,255,255,0)_34%,rgba(4,6,12,0.48)_100%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10">
          <header className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 shadow-[0_20px_56px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <button
              onClick={() => setScreen("intro")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="인트로로 돌아가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-100/60">Preset Character</p>
              <h2 className="text-xl font-black">대화할 상대 선택</h2>
            </div>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {LOVE_CHARACTERS.map((item) => {
              const isExpanded = expandedProfileId === item.id;

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setExpandedProfileId(isExpanded ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setExpandedProfileId(isExpanded ? null : item.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className={`group overflow-hidden rounded-lg border bg-gradient-to-br shadow-[0_24px_66px_rgba(0,0,0,0.32)] outline-none transition focus-visible:ring-4 focus-visible:ring-rose-100/30 ${
                    isExpanded ? `border-rose-100/28 sm:col-span-2 xl:col-span-3 ${item.palette.shell}` : `border-white/12 ${item.palette.shell}`
                  }`}
                >
                  <div className={`grid ${isExpanded ? "xl:grid-cols-[1.12fr_0.88fr]" : ""}`}>
                    <div className="bg-black/20">
                      <div
                        className={`relative flex items-end justify-center overflow-hidden bg-black/18 ${isExpanded ? "h-[min(72svh,620px)] min-h-[360px]" : "h-auto"}`}
                        style={isExpanded ? undefined : { aspectRatio: getProfileCropAspect(item) }}
                      >
                        <div className={`absolute inset-x-8 bottom-12 h-44 rounded-full blur-3xl ${item.palette.halo}`} />
                        {isExpanded ? (
                          <img
                            src={item.asset}
                            alt={`${item.name} 전체 프로필`}
                            className="relative z-10 h-full w-full object-contain p-3 drop-shadow-[0_22px_34px_rgba(0,0,0,0.48)]"
                          />
                        ) : (
                          <CharacterProfileCrop character={item} className="absolute inset-0 rounded-none" />
                        )}
                      </div>
                      <div className="border-t border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${item.palette.accent}`}>{item.archetype}</p>
                            <h3 className="mt-1 text-3xl font-black text-white">{item.name}</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{isExpanded ? "전체 이미지와 상세 프로필이 열렸습니다." : "좌측 상단 얼굴과 기본정보를 먼저 확인하세요."}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-rose-100/18 bg-white/12 px-3 py-1 text-xs font-black text-white/78">
                            {isExpanded ? "프로필 접기" : "프로필 보기"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <motion.div
                          key="profile"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex max-h-[72svh] flex-col justify-between gap-7 overflow-y-auto p-5 sm:p-7">
                            <div>
                              <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.palette.chip}`}>{item.dayMaster} 일간</span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/60">
                                  {item.gender === "male" ? "남성 캐릭터" : "여성 캐릭터"}
                                </span>
                              </div>
                              <p className="text-sm leading-7 text-white/72">{item.profileLine}</p>
                              <div className="mt-5 flex flex-wrap gap-2">
                                {item.keywords.slice(0, 5).map((keyword) => (
                                  <span key={keyword} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-4 text-sm text-white/72">
                              <div className="flex gap-3 rounded-lg border border-white/10 bg-black/18 p-4">
                                <UserRound className="mt-1 h-4 w-4 shrink-0 text-white/50" />
                                <p>{item.personality}</p>
                              </div>
                              <div className="flex gap-3 rounded-lg border border-white/10 bg-black/18 p-4">
                                <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-white/50" />
                                <p>{item.speechStyle}</p>
                              </div>
                            </div>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                startWithCharacter(item.id, "preset");
                              }}
                              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-5 py-3 text-sm font-bold text-zinc-950 shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition hover:brightness-110 ${item.palette.button}`}
                            >
                              {item.name}와 대화하기
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if ((screen === "play" || screen === "result") && (!character || !currentScene)) {
    return (
      <section className="flex min-h-[100svh] items-center justify-center bg-zinc-950 p-6 text-white">
        <button onClick={() => setScreen("select")} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-zinc-950">
          캐릭터 다시 선택하기
        </button>
      </section>
    );
  }

  if (screen === "result" && character) {
    const result = resolveResult(stats);
    const choiceAnalysis = analyzeChoiceLogs(choiceLog);
    const characterResultSummary = CHARACTER_RESULT_SUMMARIES[character.id];
    const customAdvice = buildCustomAdvice(character, choiceAnalysis);
    const myeongliCoda = buildMyeongliResultCoda(character);
    const riskCoda = buildMyeongliRiskCoda(character);
    const sajuEntrySummary = buildSajuEntrySummary(entryMode, character);

    return (
      <section className={`min-h-[100svh] bg-gradient-to-br ${character.palette.shell} text-white`}>
        <div className="mx-auto grid min-h-[100svh] w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10">
          <div className="flex flex-col justify-between gap-6">
            <button
              onClick={resetToSelect}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="캐릭터 선택으로 돌아가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <CharacterPortrait character={character} mode="result" />
              <div className="mt-5">
                <p className={`text-sm font-semibold ${character.palette.accent}`}>{character.dayMaster} 일간 · {character.archetype}</p>
                <h2 className="mt-2 text-4xl font-bold">{character.name}</h2>
              </div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-center">
            <div className="rounded-lg border border-white/20 bg-black/40 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                  <Heart className="h-5 w-5 fill-rose-200 text-rose-200" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Final Code</p>
                  <h1 className="text-2xl font-bold sm:text-3xl">{result.title}</h1>
                </div>
              </div>

              <p className="text-base leading-8 text-white/75">{result.body}</p>
              <p className="mt-4 text-sm font-semibold leading-8 text-rose-50/76">
                {characterResultSummary} {myeongliCoda}
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <MetricBar key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">사주 성향 요약</h3>
                  <p className="text-sm leading-7 text-white/70">
                    {sajuEntrySummary}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">명리 궁합 포인트</h3>
                  <p className="text-sm leading-7 text-white/70">{customAdvice}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/10 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">피해야 할 흐름</h3>
                  <p className="text-sm leading-7 text-white/70">{riskCoda}</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-4">
                <h3 className="mb-3 text-sm font-bold text-white">대화 선택 기반 분석</h3>
                <div className="grid gap-3">
                  <p className="text-sm leading-7 text-white/76">{choiceAnalysis.summary}</p>
                  {choiceLog.slice(-3).map((log, index) => (
                    <div key={`${log.sceneId}-${log.choiceId}`} className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                      <p className="text-xs font-semibold text-white/50">선택 {choiceLog.length - choiceLog.slice(-3).length + index + 1}</p>
                      <p className="mt-1 text-sm text-white/80">
                        {log.tone}의 결로 반응했고, 관계의 온도는 선택한 대답의 여운만큼 천천히 달라졌습니다.
                      </p>
                    </div>
                  ))}
                  <p className="text-xs font-bold leading-6 text-rose-100/68">{choiceAnalysis.nextHint}</p>
                </div>
              </div>

              <button
                onClick={resetToSelect}
                className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-5 py-3 text-sm font-bold text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
              >
                <RefreshCw className="h-4 w-4" />
                다시 시작하기
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  if (!character || !currentScene) return null;

  return (
    <section className={`relative min-h-[100svh] overflow-hidden text-white ${character.palette.scene}`}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,6,18,0.98)_0%,rgba(31,16,35,0.9)_48%,rgba(8,20,26,0.96)_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl items-center justify-center px-4 py-5">
        <motion.div
          key={character.id}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="grid w-full items-center gap-6 lg:grid-cols-[0.78fr_1.22fr]"
        >
          <aside className="hidden lg:grid gap-4">
            <button
              onClick={resetToSelect}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-white backdrop-blur-md transition hover:bg-white/20"
              aria-label="캐릭터 선택으로 돌아가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="rounded-lg border border-white/10 bg-black/28 p-5 backdrop-blur-xl">
              <p className={`text-sm font-bold ${character.palette.accent}`}>{character.dayMaster} 일간</p>
              <h1 className="mt-2 text-4xl font-black">{character.name}</h1>
              <p className="mt-3 text-sm leading-7 text-white/68">{character.profileLine}</p>
              <p className="mt-3 text-xs font-bold text-white/42">
                {entryMode === "sajuMatch" ? "사주 매칭 추천으로 시작한 시뮬레이션" : "직접 선택으로 시작한 시뮬레이션"}
              </p>
              {initialCompatibilityNote ? <p className="mt-2 text-xs font-bold text-rose-100/62">{initialCompatibilityNote}</p> : null}
            </div>
            <div className="grid gap-3 rounded-lg border border-white/10 bg-black/24 p-5 backdrop-blur-xl">
              {metrics.map((metric) => (
                <MetricBar key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </aside>

          <div className="mx-auto flex max-h-[calc(100svh-40px)] w-full max-w-[460px] flex-col overflow-hidden rounded-[2rem] border border-white/18 bg-[#111017] shadow-[0_32px_90px_rgba(0,0,0,0.56)]">
            <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/36 px-5 backdrop-blur-xl">
              <button
                onClick={resetToSelect}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/16 lg:hidden"
                aria-label="캐릭터 선택으로 돌아가기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-200" />
                <span className="truncate text-sm font-black tracking-[0.08em] text-white">Love Code</span>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 text-xl leading-none text-white/70">≡</span>
            </header>

            <div className="relative h-[34svh] min-h-[220px] max-h-[380px] shrink-0 overflow-hidden">
              <CharacterDialogueCrop character={character} className="absolute inset-0 rounded-none" />
            </div>
            <div className="flex shrink-0 items-end justify-between gap-3 border-t border-white/10 bg-[#111017] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">
                  장면 {sceneIndex + 1}/{scenes.length}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black text-white">{character.name}</h2>
              </div>
              <span className="shrink-0 rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-bold text-white/72">
                {currentScene.location}
              </span>
            </div>

            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-0 overflow-y-auto border-t border-white/10 bg-[#111017]/96 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-black/30">
                  <img src={character.asset} alt={`${character.name} 미니 얼굴`} className="h-full w-full origin-top-left scale-[3.02] object-contain object-left-top" />
                </div>
                <div>
                  <p className={`text-sm font-black ${character.palette.accent}`}>{character.name}</p>
                  <p className="truncate text-xs font-semibold text-white/48">{currentScene.title}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
                <p className="text-sm leading-7 text-white/64">{currentScene.situation}</p>
                <div className="mt-4 grid gap-3">
                  {scenePrelude.map((paragraph) => (
                    <p key={paragraph} className="rounded-lg border border-rose-100/10 bg-black/18 px-4 py-3 text-sm font-semibold leading-7 text-rose-50/72">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-base font-semibold leading-7 text-white">"{currentScene.dialogue}"</p>
              </div>

              <AnimatePresence mode="wait">
                {isShowingResponse && selectedChoice ? (
                  <motion.div key="response" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="mt-3 rounded-lg border border-pink-200/22 bg-pink-200/10 p-4">
                      <p className="text-sm leading-7 text-white/82">{selectedChoice.response}</p>
                      <p className="mt-2 text-xs leading-6 text-white/52">{selectedChoice.insight}</p>
                    </div>
                    <button
                      onClick={goNextScene}
                      className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
                    >
                      {sceneIndex >= scenes.length - 1 ? "결과 보기" : "다음 장면"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                ) : isChoiceOpen ? (
                  <motion.div key="choices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3 grid gap-2">
                    {currentScene.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => handleChoice(choice)}
                        className="min-h-14 rounded-lg border border-white/12 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold leading-6 text-white/90 transition hover:border-pink-200/45 hover:bg-pink-200/12"
                      >
                        {choice.text}
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="story-hold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/18 p-4">
                      <p className="text-sm leading-7 text-white/70">
                        {character.conflictPattern} {character.bestApproach} 지금은 대답보다 분위기를 읽어야 하는 순간입니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChoiceOpen(true)}
                      className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-4 py-3 text-sm font-black text-zinc-950 transition hover:brightness-110 ${character.palette.button}`}
                    >
                      중요한 순간에 대답 선택하기
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
