"use client";
import TeaConsultConfirmation from "./TeaConsultConfirmation";
import { SAJU_CATEGORIES, resolveQuestionCategory } from "@/lib/fortune-tea-house/saju-category";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import type { FormEvent } from "react";
import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import {
  normalizeDestinyProfileCard,
  publishDestinyProfileList,
  readCurrentDestinyProfile,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getFortuneTeaHouseConsultPriceLabel } from "../data/consultPricing";
import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultMode, FortuneTeaHouseQuestionInput, FortuneTeaHouseSajuCompatInput, FortuneTeaHouseSukuyoInput, FortuneTeaTarotSpread } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/tea-question.module.css";

import { useTeaHouseCopy } from "../lib/teaHouseCopy";
type QuestionInputSceneProps = {
  selectedCup: TeaHouseCup;
  initialInput?: Partial<FortuneTeaHouseQuestionInput>;
  onSubmit: (input: FortuneTeaHouseQuestionInput) => void;
  onBack: () => void;
  onDraftChange?: (input: Partial<FortuneTeaHouseQuestionInput>) => void;
  isSubmitting?: boolean;
  submitError?: string;
  priceLabels?: Partial<Record<FortuneTeaHouseConsultMode, string>>;
};

const concernTopics = ["연애 · 재회", "썸 · 인연", "진로 · 사업", "금전운", "마음 회복", "이별 · 위기"] as const;
/** 🔴 concernTopics 의 값은 data/teaCups.ts 의 topic 과 대조하는 판별자라 한국어로 남긴다.
    화면에 찍히는 라벨만 이 표를 거쳐 사전에서 편다. */
const CONCERN_TOPIC_LABEL: Record<(typeof concernTopics)[number], keyof typeof KO> = {
  "연애 · 재회": "kdwei9k5",
  "썸 · 인연": "kvzuholw",
  "진로 · 사업": "ktuhpgvn",
  "금전운": "kjwgvznl",
  "마음 회복": "kk5ypl3m",
  "이별 · 위기": "kfkxbrwx",
};
const sukuyoRelationshipTypes = ["연애 중", "썸", "연인", "배우자", "재회 고민", "짝사랑", "친구", "비즈니스", "가족", "기타"] as const;
/** 🔴 sukuyoRelationshipTypes 의 값은 그대로 API 로 실려 가고 서버의 sukuyoCategoryGuide 가 한국어 정규식으로
    분기한다(/재회|다시|연락/ 등). 번역하면 비한국어 사용자만 조용히 기본 안내로 떨어지므로
    값은 한국어를 유지하고, 화면에 찍히는 라벨만 이 표를 거쳐 사전에서 편다. */
const SUKUYO_RELATIONSHIP_LABEL: Record<(typeof sukuyoRelationshipTypes)[number], keyof typeof KO> = {
  "연애 중": "ktclbui2",
  "썸": "kymdceg6",
  "연인": "kfa7vknq",
  "배우자": "ktwfnxdy",
  "재회 고민": "k4eug60z",
  "짝사랑": "kwgctsrz",
  "친구": "kjcqal1e",
  "비즈니스": "kfvvcgzi",
  "가족": "kd8edmp5",
  "기타": "krguklps",
};
const sukuyoFocusOptions = ["상대의 마음", "앞으로의 흐름", "재회 가능성", "결혼 가능성", "갈등 해결", "연락 타이밍", "관계 이어가는 방법"] as const;
/** 🔴 sukuyoFocusOptions 의 값은 그대로 API 로 실려 가고 서버의 sukuyoCategoryGuide 가 한국어 정규식으로
    분기한다(/재회|다시|연락/ 등). 번역하면 비한국어 사용자만 조용히 기본 안내로 떨어지므로
    값은 한국어를 유지하고, 화면에 찍히는 라벨만 이 표를 거쳐 사전에서 편다. */
const SUKUYO_FOCUS_LABEL: Record<(typeof sukuyoFocusOptions)[number], keyof typeof KO> = {
  "상대의 마음": "k0zznqcf",
  "앞으로의 흐름": "k0y7lflt",
  "재회 가능성": "kcui7jdz",
  "결혼 가능성": "kesjh7ih",
  "갈등 해결": "k6xmrkqf",
  "연락 타이밍": "kvcrawqm",
  "관계 이어가는 방법": "krlmu5vh",
};
const consultModeOptions: Array<{
  id: FortuneTeaHouseConsultMode;
  titleKey: keyof typeof KO;
  eyebrowKey: keyof typeof KO;
  descriptionKey: keyof typeof KO;
  promiseKey: keyof typeof KO;
  readsKey: keyof typeof KO;
  suitedForKey: keyof typeof KO;
  image: string;
  altKey: keyof typeof KO;
}> = [
  {
    id: "tarot",
    titleKey: "knf1hih6" as keyof typeof KO,
    eyebrowKey: "kjod6wtk" as keyof typeof KO,
    descriptionKey: "kqblvqw4" as keyof typeof KO,
    promiseKey: "kpsrhcjk" as keyof typeof KO,
    readsKey: "knpdeqjq" as keyof typeof KO,
    suitedForKey: "kso8sckx" as keyof typeof KO,
    image: fortuneTeaHouseAssets.consultModes.tarot,
    altKey: "klz2wc0l" as keyof typeof KO,
  },
  {
    id: "saju",
    titleKey: "kkrkfupy" as keyof typeof KO,
    eyebrowKey: "kfwkduwv" as keyof typeof KO,
    descriptionKey: "kltbw1nw" as keyof typeof KO,
    promiseKey: "kvjlqg2x" as keyof typeof KO,
    readsKey: "kpshc3qv" as keyof typeof KO,
    suitedForKey: "krt6yd0g" as keyof typeof KO,
    image: fortuneTeaHouseAssets.consultModes.saju,
    altKey: "k8m4jaav" as keyof typeof KO,
  },
  {
    id: "sajuCompatibility",
    titleKey: "k7ovds7b" as keyof typeof KO,
    eyebrowKey: "k2qkra0r" as keyof typeof KO,
    descriptionKey: "k4icttiy" as keyof typeof KO,
    promiseKey: "ktev9snf" as keyof typeof KO,
    readsKey: "k2raz1r9" as keyof typeof KO,
    suitedForKey: "k51fyrod" as keyof typeof KO,
    image: fortuneTeaHouseAssets.consultModes.saju,
    altKey: "krxjlp28" as keyof typeof KO,
  },
  {
    id: "sukuyo",
    titleKey: "kfngvjey" as keyof typeof KO,
    eyebrowKey: "kqy8z0ey" as keyof typeof KO,
    descriptionKey: "klnifzy4" as keyof typeof KO,
    promiseKey: "kc1susxy" as keyof typeof KO,
    readsKey: "k7qu1awm" as keyof typeof KO,
    suitedForKey: "kgwy0u4j" as keyof typeof KO,
    image: fortuneTeaHouseAssets.consultModes.sukuyo,
    altKey: "kadzmzhd" as keyof typeof KO,
  },
];

const tarotSpreadOptions: Array<{
  id: FortuneTeaTarotSpread;
  titleKey: keyof typeof KO;
  descriptionKey: keyof typeof KO;
}> = [
  { id: "three", titleKey: "kes4kq8r", descriptionKey: "kjbalv1m" },
  { id: "five", titleKey: "kfdgstet", descriptionKey: "klefzwx7" },
];

type TeaHouseProfileOption = {
  optionId: string;
  profileId?: string;
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: FortuneTeaHouseCalendarType;
  birthPlace: string;
  timezone: string;
};

type ProfileListPayload = {
  ok?: boolean;
  profiles?: DestinyProfileCard[];
  currentId?: string;
  currentProfileId?: string;
  selectedProfileId?: string;
};

function cleanProfileText(value: unknown): string {
  return String(value || "").trim();
}

function padBirthPart(value: unknown): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.trunc(numeric)).padStart(2, "0") : "";
}

function normalizeProfileGender(value: unknown): string {
  const raw = cleanProfileText(value).toLowerCase();
  if (["m", "male", "남", "남성"].includes(raw)) return "male";
  if (["f", "female", "여", "여성"].includes(raw)) return "female";
  return "";
}

function normalizeProfileCalendarType(profile: DestinyProfileCard): FortuneTeaHouseCalendarType {
  const raw = cleanProfileText(profile.calType || profile.calendarType || profile.birth?.calType).toLowerCase();
  return raw.includes("lunar") || raw.includes("음") ? "lunar" : "solar";
}

function normalizeProfileBirthDate(profile: DestinyProfileCard): string {
  const normalized = normalizeDestinyProfileCard(profile) || profile;
  if (normalized.birthDate) return normalized.birthDate;
  const parts = resolveDestinyProfileBirthParts(normalized);
  if (!parts) return "";
  return `${String(parts.year).padStart(4, "0")}-${padBirthPart(parts.month)}-${padBirthPart(parts.day)}`;
}

function normalizeProfileBirthTime(profile: DestinyProfileCard): string {
  const birth = profile.birth || {};
  const raw = cleanProfileText(profile.birthTime);
  if (/^\d{1,2}:\d{2}$/.test(raw)) return raw.padStart(5, "0");
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 3) {
    const hour = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
    const minute = digits.length === 3 ? digits.slice(1, 3) : digits.slice(2, 4);
    return `${padBirthPart(hour)}:${padBirthPart(minute)}`;
  }
  const hour = birth.hour ?? profile.birthHour;
  const minute = birth.minute ?? profile.birthMinute ?? 0;
  if (hour === null || hour === undefined || hour === "") return "";
  return `${padBirthPart(hour)}:${padBirthPart(minute)}`;
}

function isProfileBirthTimeUnknown(profile: DestinyProfileCard, birthTime: string): boolean {
  return Boolean(profile.birthTimeUnknown || profile.timeUnknown || profile.noBirthTime || profile.birth?.timeUnknown || !birthTime);
}

function mapProfileToTeaHouseOption(profile: DestinyProfileCard): TeaHouseProfileOption | null {
  const normalized = normalizeDestinyProfileCard(profile) || profile;
  const birthDate = normalizeProfileBirthDate(normalized);
  if (!birthDate) return null;
  const birthTime = normalizeProfileBirthTime(normalized);
  const realProfileId = cleanProfileText(normalized.id || normalized.profileId);
  const name = cleanProfileText(normalized.name) || "손님";
  return {
    optionId: realProfileId || `local-${birthDate}-${name}`,
    profileId: realProfileId || undefined,
    name,
    gender: normalizeProfileGender(normalized.gender),
    birthDate,
    birthTime,
    birthTimeUnknown: isProfileBirthTimeUnknown(normalized, birthTime),
    calendarType: normalizeProfileCalendarType(normalized),
    birthPlace: cleanProfileText(normalized.location?.label || normalized.birthRegion),
    timezone: cleanProfileText(normalized.location?.tz) || "Asia/Seoul",
  };
}

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const CATEGORY_KO = { love: "연애·재회", compatibility: "궁합·관계", marriage: "결혼·출산", career: "직업·진로", wealth: "재물·사업", study: "학업·시험", health: "컨디션 관리", family: "가족·인간관계", timing: "이사·시기", annual: "올해의 흐름" };
const KO = {
  welcomeNote: "말하기 어려웠던 고민도 괜찮아요. 질문에 맞는 근거를 함께 살펴볼게요.",
  stepLabel: "질문과 정보 · 1 / 3", questionTitle: "어떤 고민을 함께 읽어볼까요?",
  questionGuide: "질문을 먼저 적고 상담 방식을 골라 주세요. 선택한 방식에 필요한 정보만 받아요.",
  reviewButton: "상담 내용과 가격 확인", leapMonth: "음력 윤달", longitudeLabel: "출생지 경도 (선택)",
  longitudeHelp: "도시명만으로 좌표를 추정하지 않아요. 기본값은 서울 126.978°이며, 해외 출생은 해당 지역 경도를 입력해 주세요.",

  categoryLabel: "이번 질문의 주제",
  categoryAuto: "질문에서 찾기",
  categoryClarify: "이번에는 어떤 주제를 먼저 살펴볼까요? 주제를 하나 골라 주세요.",
  autoQuestionNotice: "비워두면 “{question}”로 열어볼게요.",
  cupAltarAria: "{cup} 찻잔 상담",
  k0hw8pcd: "불러올 프로필을 골라 주세요. 선택하면 아래 정보가 바로 채워집니다.",
  k0ikly8b: "사주는 보이는 정보만 읽습니다. 모르는 시간이나 기운은 연이가 지어내지 않아요.",
  k0x5yuje: "짧은 질문",
  k0y7lflt: "앞으로의 흐름",
  k0zznqcf: "상대의 마음",
  k2h1euzc: "사주로 보려면 생년월일을 먼저 찻잔 위에 올려 주세요.",
  k2jt4pbo: "지금 관계의 분위기",
  k2lelfhi: "상대의 달빛",
  k2qkra0r: "두 명식이 나란히 놓이는 저녁",
  k2raz1r9: "두 사람의 일간·오행·십성, 상생과 상극의 결, 관계의 운 흐름",
  k3oztx3o: "잘 어울리는 질문",
  k3pdpqbx: "달빛 궁합을 보려면 두 사람의 생년월일을 모두 올려 주세요.",
  k3vw2jji: "여성",
  k3w39xmk: "두 사람의 성별을 함께 골라 주세요.",
  k4eug60z: "재회 고민",
  k4icttiy: "두 사람의 사주 명식을 각각 산출해 나란히 놓고, 두 흐름이 만나는 결을 함께 읽습니다.",
  k4jywo6n: "내 프로필 불러오기",
  k4te8nd5: "출생시간 미상",
  k4vt1f3z: "원본 프로필은 바뀌지 않고, 이번 상담에서만 살짝 고쳐 쓸 수 있어요.",
  k4wmutlu: "요즘 연락이 줄었어요.",
  k51fyrod: "연인·부부·재회 등 사주로 두 사람의 궁합을 깊이 보고 싶은 때",
  k65h6i0u: "숙요점 궁합은 두 사람의 생년월일과 달력 기준으로 27숙의 거리와 관계 유형을 먼저 확인합니다.",
  k6xmrkqf: "갈등 해결",
  k75rhwkc: "오늘은 타로, 사주, 숙요점 궁합 중 손님이 고른 한 가지 길로만 깊게 읽어드릴게요.",
  k7dubap8: "살피는 결",
  k7ovds7b: "사주 궁합 상담",
  k7qu1awm: "두 사람의 27숙 거리, 끌림과 부딪힘의 리듬, 관계의 온도",
  k7rysb4s: "선택 안 함",
  k8m4jaav: "운명의 찻집 사주 상담 이미지",
  k96qb2sx: "손님",
  kadrsxnd: "사주가 읽을 나의 기본 흐름",
  kadzmzhd: "27숙 인연의 흐름 이미지",
  kaiikl3r: "상담에 사용할 프로필",
  kalghzsn: "상대의 명식",
  kax27tqj: "타로, 사주, 숙요점 궁합 중 하나만 골라 주세요. 연이는 선택한 길의 상징만 따라갑니다.",
  kbaa8yer: "저장된 프로필이 없어도 괜찮아요. 아래 정보로 사주 상담을 열 수 있어요.",
  kbo6eipf: "사주 궁합을 보려면 두 사람의 생년월일을 모두 올려 주세요.",
  kbsnqume: "관계 유형",
  kc1susxy: "끌림의 방식, 조심할 온도, 오늘 건넬 수 있는 한 문장",
  kcbceqsz: "선택",
  kcgraa7q: "두 사람의 달빛이 어디로 흐르는지, 가장 궁금한 마음을 남겨 주세요.",
  kchbatkz: "찻잔 다시 고르기",
  kcmffks2: "출생시간",
  kcsiugqf: "서울, 대한민국",
  kcui7jdz: "재회 가능성",
  kd3n64c3: "성별",
  kd8edmp5: "가족",
  kd9cotur: "시간대",
  kdjowvdd: "상대",
  kdwei9k5: "연애 · 재회",
  kekiagaw: "양력",
  keqlnlem: "나의 달빛",
  kes4kq8r: "3카드 스프레드",
  kesjh7ih: "결혼 가능성",
  kewpf6es: "타로 스프레드 선택",
  kexsvdzm: "사주 궁합은 두 사람의 명식만 근거로 삼습니다. 모르는 시간이나 상대의 속마음은 연이가 지어내지 않아요.",
  kfa7vknq: "연인",
  kfabu8cs: "위에 오늘의 질문을 올려주세요",
  kfdgstet: "5카드 스프레드",
  kfeelhij: "사주 궁합은 두 사람의 생년월일로 각각의 명식을 산출한 뒤, 두 흐름이 만나는 결을 함께 읽습니다. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 봅니다.",
  kfkxbrwx: "이별 · 위기",
  kfngvjey: "숙요점 궁합 상담",
  kfvvcgzi: "비즈니스",
  kfwkduwv: "태어난 흐름이 밝히는 저녁",
  kfxmqnqq: "사주가 어느 삶의 흐름을 비춰야 할지 질문을 남겨 주세요.",
  kgr4ck0r: "나",
  kgwy0u4j: "궁합, 재회 가능성, 상대와 나 사이의 흐름을 조용히 보고 싶은 때",
  kh27yrbk: "카드가 비춰야 할 장면을 편하게 적어 주세요.",
  kh6vmzkk: "출생시간 미상으로 진행",
  khkt6xha: "숙요점 궁합은 계산된 27숙과 관계 거리만 근거로 삼습니다. 모르는 마음과 결말은 연이가 단정하지 않아요.",
  khxnyk5k: "저장된 프로필 카드로 상담 정보를 먼저 채울게요.",
  kjakx6mc: "달빛 궁합의 방",
  kjbalv1m: "상황과 자원, 다음 행동처럼 세 가지 관점으로 질문을 읽어요. 배열은 다음 단계에서 바꿀 수 있어요.",
  kjcqal1e: "친구",
  kjod6wtk: "카드가 먼저 여는 장면",
  kjprno0f: "사주 상담은 생년월일을 바탕으로 엽니다. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 읽습니다.",
  kjtex1ko: "달빛 궁합의 방에 놓을 두 사람",
  kjwgvznl: "금전운",
  kk5nkpgf: "고민 내용",
  kk5ypl3m: "마음 회복",
  kkgzlpaa: "남성",
  kkrkfupy: "사주로 보기",
  kkxbjbaz: "타로 상담으로 열면 출생정보 없이, 지금 질문과 선택된 카드의 상징만 깊게 읽습니다.",
  kl4sj6bx: "위에 두 사람의 생년월일을 나란히 올립니다.",
  klefzwx7: "연락·인연·돈에 맞는 다섯 자리의 배열을 선택해요. 카드 수보다 질문에 맞는 구성이 중요해요.",
  klnifzy4: "두 사람의 27숙 거리와 관계 리듬을 달빛 아래 조용히 펼쳐봅니다.",
  kltbw1nw: "태어난 흐름을 바탕으로 오행과 십성의 결을 차분히 살펴봅니다.",
  klz2wc0l: "운명의 찻집 타로 상담 이미지",
  kmayyz6o: "27숙 인연의 흐름",
  kmfvupic: "생년월일",
  kmkn5ed2: "이름 또는 닉네임",
  kmvgimc7: "연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.",
  knf1hih6: "타로로 보기",
  knpdeqjq: "현재 질문에 가까운 카드의 상징, 상대 마음, 선택 앞의 기류",
  ko8tjcbj: "연이의 찻잔 해석",
  koflxb9d: "프로필을 불러오지 못했어요. 저장된 정보가 있으면 다시 확인하고, 지금은 직접 입력해 주세요.",
  koolkprj: "닉네임",
  kozwdtol: "프로필 선택",
  kpbfcw5q: "음력",
  kpshc3qv: "태어난 흐름, 오행의 균형, 반복되는 기질과 시기의 기준",
  kpsrhcjk: "상대의 마음, 선택의 기류, 바로 움직일 수 있는 한 걸음",
  kqblvqw4: "질문에 맞는 카드 배열과 카드 사이의 연결을 읽고, 지금 선택할 수 있는 행동을 살펴봐요.",
  kqnhrp3g: "연이는 27숙의 거리와 관계 유형을 먼저 확인하고, 보이지 않는 마음은 단정하지 않은 채 지금 질문의 흐름만 살펴요.",
  kqpkxeui: "나의 명식",
  kquxx9hu: "두 사람의 명식을 나란히 놓아요",
  kqy8z0ey: "달빛 아래 피어나는 인연의 흐름",
  krguklps: "기타",
  krlmu5vh: "관계 이어가는 방법",
  krt6yd0g: "내 성향과 타이밍, 오래 반복되는 고민의 뿌리를 보고 싶은 때",
  krvgpmfb: "비워두면 선택한 흐름으로 질문을 만들게요.",
  krxjlp28: "두 사람의 사주 궁합 이미지",
  ksa9e9pj: "상담 금액",
  kso8sckx: "연락, 재회, 선택처럼 지금 장면의 흐름이 궁금한 밤",
  ksvgqqtb: "요즘 서로의 속도가 달라 고민이에요.",
  ksxyz0up: "양력/음력",
  ktclbui2: "연애 중",
  ktev9snf: "나의 명식, 상대의 명식, 두 사람이 맞물리고 조율할 지점",
  kthaxliy: "프로필 카드에 저장된 내 정보를 불러왔어요. 필요하면 이번 상담에서만 살짝 수정할 수 있어요.",
  ktuhpgvn: "진로 · 사업",
  ktwfnxdy: "배우자",
  ku0ockkt: "오늘 열어 볼 상담 방식",
  kuyuobkw: "오늘의 질문",
  kvcrawqm: "연락 타이밍",
  kvjlqg2x: "기질의 반복, 시기의 흐름, 오늘 붙잡을 기준",
  kvzuholw: "썸 · 인연",
  kw53ukki: "찻잔의 향이 잠시 흐려졌어요.",
  kwgctsrz: "짝사랑",
  kxbisp7m: "두 사람이 어떤 인연으로 마주하고 있는지 골라 주세요.",
  kxljhkhu: "출생지",
  kxzymxwz: "상담 방식 선택",
  kydjxdvs: "가장 궁금한 지점",
  kykwvjex: "프로필 카드의 태어난 흐름을 확인하고 있어요.",
  kymdceg6: "썸",
  kzifs9il: "상담 주제",
  kznuhtae: "타로 스프레드",
  kzzksrnj: "저장된 프로필을 찾지 못했어요. 아래 정보만 채우면 상담을 열 수 있어요.",
  partnerFallback: "상대",
  profileLine: "{name} {birth}",
  profileLoadedNotice: "{name}님의 프로필을 불러왔어요. 출생시간을 모르면 시간 미상으로 진행할 수 있어요.",
  selfFallback: "나",
  tarotPriceLine: "3카드 {three} · 5카드 {five}",
  topicSyncNotice: "{cup} 상담은 {topic}으로 고정되어 있어요.",
};

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack, onDraftChange, isSubmitting = false, submitError = "", priceLabels = {} }: QuestionInputSceneProps) {
  const copy = useTeaHouseCopy("questionInput", KO);
  const categories = useTeaHouseCopy("questionCategories", CATEGORY_KO);
  const [consultationMode, setConsultationMode] = useState<FortuneTeaHouseConsultMode>(initialInput?.consultationMode || "tarot");
  const priceLabelForMode = useCallback(
    (mode: FortuneTeaHouseConsultMode, spread?: FortuneTeaTarotSpread) =>
      priceLabels[mode] || getFortuneTeaHouseConsultPriceLabel(mode, spread),
    [priceLabels],
  );
  const [nickname, setNickname] = useState(initialInput?.nickname || "");
  const [profileId, setProfileId] = useState(initialInput?.profileId || "");
  const [selectedProfileOptionId, setSelectedProfileOptionId] = useState(initialInput?.profileId || "");
  const [profileOptions, setProfileOptions] = useState<TeaHouseProfileOption[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [birthDate, setBirthDate] = useState(initialInput?.birthDate || "");
  const [birthTime, setBirthTime] = useState(initialInput?.birthTime || "");
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(Boolean(initialInput?.birthTimeUnknown));
  const [birthPlace, setBirthPlace] = useState(initialInput?.birthPlace || "");
  const [isLeapMonth, setIsLeapMonth] = useState(Boolean(initialInput?.isLeapMonth));
  const [longitude, setLongitude] = useState(initialInput?.longitude == null ? "" : String(initialInput.longitude));
  const [timezone, setTimezone] = useState(initialInput?.timezone || "Asia/Seoul");
  const [gender, setGender] = useState(initialInput?.gender || "");
  const [calendarType, setCalendarType] = useState<FortuneTeaHouseCalendarType>(initialInput?.calendarType || "solar");
  const [tarotSpread, setTarotSpread] = useState<FortuneTeaTarotSpread>(initialInput?.tarotSpread === "five" ? "five" : "three");
  // 타로 상품은 스프레드로 구분하고 가격은 서버 레지스트리에서 읽는다.
  const [sukuyoInput, setSukuyoInput] = useState<FortuneTeaHouseSukuyoInput>(() => ({
    user: {
      name: initialInput?.sukuyo?.user?.name || initialInput?.nickname || "",
      birthDate: initialInput?.sukuyo?.user?.birthDate || "",
      calendarType: initialInput?.sukuyo?.user?.calendarType || "solar",
      isLeapMonth: Boolean(initialInput?.sukuyo?.user?.isLeapMonth),
      gender: initialInput?.sukuyo?.user?.gender || "",
    },
    partner: {
      name: initialInput?.sukuyo?.partner?.name || "",
      birthDate: initialInput?.sukuyo?.partner?.birthDate || "",
      calendarType: initialInput?.sukuyo?.partner?.calendarType || "solar",
      isLeapMonth: Boolean(initialInput?.sukuyo?.partner?.isLeapMonth),
      gender: initialInput?.sukuyo?.partner?.gender || "",
    },
    relationshipType: initialInput?.sukuyo?.relationshipType || copy.ktclbui2,
    focus: initialInput?.sukuyo?.focus || copy.k0y7lflt,
    currentSituation: initialInput?.sukuyo?.currentSituation || "",
  }));
  const [sajuCompatInput, setSajuCompatInput] = useState<FortuneTeaHouseSajuCompatInput>(() => ({
    user: {
      name: initialInput?.sajuCompatibility?.user?.name || initialInput?.nickname || "",
      birthDate: initialInput?.sajuCompatibility?.user?.birthDate || "",
      birthTime: initialInput?.sajuCompatibility?.user?.birthTime || "",
      birthTimeUnknown: Boolean(initialInput?.sajuCompatibility?.user?.birthTimeUnknown),
      calendarType: initialInput?.sajuCompatibility?.user?.calendarType || "solar",
      isLeapMonth: Boolean(initialInput?.sajuCompatibility?.user?.isLeapMonth),
      timezone: initialInput?.sajuCompatibility?.user?.timezone || "Asia/Seoul",
      longitude: initialInput?.sajuCompatibility?.user?.longitude,
      gender: initialInput?.sajuCompatibility?.user?.gender || "",
    },
    partner: {
      name: initialInput?.sajuCompatibility?.partner?.name || "",
      birthDate: initialInput?.sajuCompatibility?.partner?.birthDate || "",
      birthTime: initialInput?.sajuCompatibility?.partner?.birthTime || "",
      birthTimeUnknown: Boolean(initialInput?.sajuCompatibility?.partner?.birthTimeUnknown),
      calendarType: initialInput?.sajuCompatibility?.partner?.calendarType || "solar",
      isLeapMonth: Boolean(initialInput?.sajuCompatibility?.partner?.isLeapMonth),
      timezone: initialInput?.sajuCompatibility?.partner?.timezone || "Asia/Seoul",
      longitude: initialInput?.sajuCompatibility?.partner?.longitude,
      gender: initialInput?.sajuCompatibility?.partner?.gender || "",
    },
    relationshipType: initialInput?.sajuCompatibility?.relationshipType || copy.kfa7vknq,
    focus: initialInput?.sajuCompatibility?.focus || copy.k0y7lflt,
    currentSituation: initialInput?.sajuCompatibility?.currentSituation || "",
  }));
  const [questionCategory, setQuestionCategory] = useState(initialInput?.questionCategory || "");
  const [question, setQuestion] = useState(initialInput?.question || "");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<FortuneTeaHouseQuestionInput | null>(null);

  // Keep the draft in this page's memory, never in a public URL or durable
  // storage. Returning to cup selection must not discard an unsubmitted form.
  useEffect(() => {
    onDraftChange?.({ consultationMode, nickname, profileId, birthDate, birthTime,
      attemptId: initialInput?.question === question && initialInput?.consultationMode === consultationMode ? initialInput?.attemptId : undefined,
      tarotSpreadId: initialInput?.tarotSpreadId, consultationVersion: "tea-v2",
      birthTimeUnknown, birthPlace, timezone, gender, calendarType, tarotSpread, isLeapMonth, longitude: longitude === "" ? undefined : Number(longitude),
      sukuyo: sukuyoInput, sajuCompatibility: sajuCompatInput, question, questionCategory,
      concernTopic: selectedCup.topic });
  }, [onDraftChange, consultationMode, nickname, profileId, birthDate, birthTime,
    birthTimeUnknown, birthPlace, timezone, gender, calendarType, tarotSpread,
    sukuyoInput, sajuCompatInput, question, questionCategory, selectedCup.topic, isLeapMonth, longitude]);

  const applyProfileOption = useCallback((option: TeaHouseProfileOption, announce = true) => {
    setSelectedProfileOptionId(option.optionId);
    setProfileId(option.profileId || "");
    setNickname(option.name);
    setBirthDate(option.birthDate);
    setBirthTime(option.birthTimeUnknown ? "" : option.birthTime);
    setBirthTimeUnknown(option.birthTimeUnknown);
    setGender(option.gender);
    setCalendarType(option.calendarType);
    setBirthPlace(option.birthPlace);
    setTimezone(option.timezone || "Asia/Seoul");
    setSukuyoInput((current) => ({
      ...current,
      user: {
        ...current.user,
        name: option.name || current.user.name,
        birthDate: option.birthDate || current.user.birthDate,
        calendarType: option.calendarType || current.user.calendarType,
        gender: option.gender || current.user.gender,
      },
    }));
    setSajuCompatInput((current) => ({
      ...current,
      user: {
        ...current.user,
        name: option.name || current.user.name,
        birthDate: option.birthDate || current.user.birthDate,
        birthTime: option.birthTimeUnknown ? "" : option.birthTime || current.user.birthTime,
        birthTimeUnknown: option.birthTimeUnknown,
        calendarType: option.calendarType || current.user.calendarType,
        gender: option.gender || current.user.gender,
      },
    }));
    if (announce) {
      setProfileNotice(copy.kthaxliy);
    }
    setProfileError("");
    // copy 를 의존성에 둔다 — 빠뜨리면 로케일을 바꿔도 이 콜백이 옛 문구를 계속 쓴다.
  }, [copy]);

  useEffect(() => {
    let alive = true;

    async function applyFallbackProfile() {
      const fallback = readCurrentDestinyProfile();
      const option = fallback ? mapProfileToTeaHouseOption(fallback) : null;
      if (!alive) return;
      if (option) {
        setProfileOptions([option]);
        applyProfileOption(option);
      } else {
        setProfileNotice(copy.kzzksrnj);
      }
    }

    async function loadProfiles() {
      setProfileLoading(true);
      setProfileError("");
      try {
        const response = await authFetch("/api/profile", {
          method: "GET",
          cache: "no-store",
        }, {
          retryOn401: true,
        });
        const payload = await response.json().catch(() => null) as ProfileListPayload | null;
        if (!alive) return;
        if (response.ok && payload && payload.ok !== false && Array.isArray(payload.profiles)) {
          const currentId = cleanProfileText(payload.currentId || payload.currentProfileId || payload.selectedProfileId);
          publishDestinyProfileList(payload.profiles, currentId);
          const options = payload.profiles
            .map((profile) => mapProfileToTeaHouseOption(profile))
            .filter((option): option is TeaHouseProfileOption => Boolean(option));
          setProfileOptions(options);
          const currentOption = options.find((option) => option.profileId && option.profileId === currentId);
          const nextOption = currentOption || (options.length === 1 ? options[0] : null);
          if (nextOption) {
            applyProfileOption(nextOption);
          } else if (options.length > 1) {
            setProfileNotice(copy.k0hw8pcd);
          } else {
            await applyFallbackProfile();
          }
          return;
        }
        await applyFallbackProfile();
      } catch {
        if (!alive) return;
        setProfileError(copy.koflxb9d);
        await applyFallbackProfile();
      } finally {
        if (alive) setProfileLoading(false);
      }
    }

    void loadProfiles();
    return () => {
      alive = false;
    };
  }, [applyProfileOption]);

  function updateSukuyoPerson(target: "user" | "partner", patch: Partial<FortuneTeaHouseSukuyoInput["user"]>) {
    setSukuyoInput((current) => ({
      ...current,
      [target]: {
        ...current[target],
        ...patch,
      },
    }));
  }

  function updateSukuyoMeta(patch: Partial<Omit<FortuneTeaHouseSukuyoInput, "user" | "partner">>) {
    setSukuyoInput((current) => ({
      ...current,
      ...patch,
    }));
  }

  function normalizedSukuyoInput(): FortuneTeaHouseSukuyoInput {
    return {
      user: {
        name: sukuyoInput.user.name?.trim(),
        birthDate: sukuyoInput.user.birthDate,
        calendarType: sukuyoInput.user.calendarType || "solar",
        isLeapMonth: sukuyoInput.user.calendarType === "lunar" && Boolean(sukuyoInput.user.isLeapMonth),
        gender: sukuyoInput.user.gender,
      },
      partner: {
        name: sukuyoInput.partner.name?.trim(),
        birthDate: sukuyoInput.partner.birthDate,
        calendarType: sukuyoInput.partner.calendarType || "solar",
        isLeapMonth: sukuyoInput.partner.calendarType === "lunar" && Boolean(sukuyoInput.partner.isLeapMonth),
        gender: sukuyoInput.partner.gender,
      },
      relationshipType: sukuyoInput.relationshipType || copy.ktclbui2,
      focus: sukuyoInput.focus || copy.k0y7lflt,
      currentSituation: sukuyoInput.currentSituation?.trim(),
    };
  }

  // 🔴 아래 두 함수가 만드는 문자열은 화면 문구가 아니라 **상담 요청의 question 페이로드**다.
  // relationshipType·focus 는 서버가 한국어 정규식으로 분기하는 값이라 한국어로 유지하므로,
  // 그것을 엮는 문장도 한국어로 둔다 — 여기만 번역하면 값과 문장이 언어가 갈려 더 나빠진다.
  function buildSukuyoAutoQuestion(input = normalizedSukuyoInput()) {
    const relationshipType = input.relationshipType || copy.ktclbui2;
    const focus = input.focus || copy.k0y7lflt;
    const currentSituation = input.currentSituation?.trim();
    return currentSituation
      ? `${relationshipType} 관계의 ${focus}: ${currentSituation}`
      : `${relationshipType} 관계에서 ${focus}이 궁금해요.`;
  }

  function updateSajuCompatPerson(target: "user" | "partner", patch: Partial<FortuneTeaHouseSajuCompatInput["user"]>) {
    setSajuCompatInput((current) => ({
      ...current,
      [target]: {
        ...current[target],
        ...patch,
      },
    }));
  }

  function updateSajuCompatMeta(patch: Partial<Omit<FortuneTeaHouseSajuCompatInput, "user" | "partner">>) {
    setSajuCompatInput((current) => ({
      ...current,
      ...patch,
    }));
  }

  function normalizedSajuCompatInput(): FortuneTeaHouseSajuCompatInput {
    return {
      user: {
        name: sajuCompatInput.user.name?.trim(),
        birthDate: sajuCompatInput.user.birthDate,
        birthTime: sajuCompatInput.user.birthTimeUnknown ? "" : sajuCompatInput.user.birthTime,
        birthTimeUnknown: Boolean(sajuCompatInput.user.birthTimeUnknown),
        calendarType: sajuCompatInput.user.calendarType || "solar",
        isLeapMonth: sajuCompatInput.user.calendarType === "lunar" && Boolean(sajuCompatInput.user.isLeapMonth),
        timezone: sajuCompatInput.user.timezone || "Asia/Seoul",
        longitude: sajuCompatInput.user.longitude,
        gender: sajuCompatInput.user.gender,
      },
      partner: {
        name: sajuCompatInput.partner.name?.trim(),
        birthDate: sajuCompatInput.partner.birthDate,
        birthTime: sajuCompatInput.partner.birthTimeUnknown ? "" : sajuCompatInput.partner.birthTime,
        birthTimeUnknown: Boolean(sajuCompatInput.partner.birthTimeUnknown),
        calendarType: sajuCompatInput.partner.calendarType || "solar",
        isLeapMonth: sajuCompatInput.partner.calendarType === "lunar" && Boolean(sajuCompatInput.partner.isLeapMonth),
        timezone: sajuCompatInput.partner.timezone || "Asia/Seoul",
        longitude: sajuCompatInput.partner.longitude,
        gender: sajuCompatInput.partner.gender,
      },
      relationshipType: sajuCompatInput.relationshipType || copy.kfa7vknq,
      focus: sajuCompatInput.focus || copy.k0y7lflt,
      currentSituation: sajuCompatInput.currentSituation?.trim(),
    };
  }

  function buildSajuCompatAutoQuestion(input = normalizedSajuCompatInput()) {
    const relationshipType = input.relationshipType || copy.kfa7vknq;
    const focus = input.focus || copy.k0y7lflt;
    const currentSituation = input.currentSituation?.trim();
    return currentSituation
      ? `${relationshipType} 관계의 사주 궁합 ${focus}: ${currentSituation}`
      : `${relationshipType} 관계에서 두 사람의 사주 궁합과 ${focus}이 궁금해요.`;
  }

  function buildInput(nextQuestion: string): FortuneTeaHouseQuestionInput {
    const nextSukuyoInput = normalizedSukuyoInput();
    const nextSajuCompatInput = normalizedSajuCompatInput();
    const isCompat = consultationMode === "sajuCompatibility";
    // 사주 궁합은 본인 명식을 궁합 폼의 '나' 값으로 계산한다(단독 사주 top-level 필드가 아니라).
    const effectiveBirthDate = isCompat ? nextSajuCompatInput.user.birthDate || "" : birthDate;
    const effectiveBirthTimeUnknown = isCompat ? Boolean(nextSajuCompatInput.user.birthTimeUnknown) : birthTimeUnknown;
    const effectiveBirthTime = effectiveBirthTimeUnknown ? "" : isCompat ? nextSajuCompatInput.user.birthTime || "" : birthTime;
    const effectiveGender = isCompat ? nextSajuCompatInput.user.gender || "" : gender;
    const effectiveCalendarType = isCompat ? nextSajuCompatInput.user.calendarType || "solar" : calendarType;
    const birthInfoSummary = [
      consultationMode === "sukuyo"
        ? copy.profileLine.replace("{name}", nextSukuyoInput.user.name || copy.selfFallback).replace("{birth}", nextSukuyoInput.user.birthDate || "")
        : isCompat
          ? copy.profileLine.replace("{name}", nextSajuCompatInput.user.name || copy.selfFallback).replace("{birth}", nextSajuCompatInput.user.birthDate || "")
          : effectiveBirthDate ? effectiveBirthDate.replaceAll("-", ".") : "",
      consultationMode === "sukuyo"
        ? copy.profileLine.replace("{name}", nextSukuyoInput.partner.name || copy.partnerFallback).replace("{birth}", nextSukuyoInput.partner.birthDate || "")
        : isCompat
          ? copy.profileLine.replace("{name}", nextSajuCompatInput.partner.name || copy.partnerFallback).replace("{birth}", nextSajuCompatInput.partner.birthDate || "")
          : effectiveBirthTimeUnknown ? copy.k4te8nd5 : effectiveBirthTime ? effectiveBirthTime : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.relationshipType || "" : isCompat ? nextSajuCompatInput.relationshipType || "" : effectiveGender === "male" ? copy.kkgzlpaa : effectiveGender === "female" ? copy.k3vw2jji : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.focus || "" : isCompat ? nextSajuCompatInput.focus || "" : effectiveCalendarType === "lunar" ? copy.kpbfcw5q : copy.kekiagaw,
      consultationMode === "sukuyo" || isCompat ? "" : birthPlace,
    ]
      .filter(Boolean)
      .join(" ");
    return {
      consultationMode,
      attemptId: initialInput?.question === question ? initialInput?.attemptId : undefined,
      tarotSpreadId: initialInput?.question === question ? initialInput?.tarotSpreadId : undefined,
      nickname: consultationMode === "sukuyo" ? nextSukuyoInput.user.name || nickname.trim() : isCompat ? nextSajuCompatInput.user.name || nickname.trim() : nickname.trim(),
      concernTopic: selectedCup.topic,
      birthInfo: birthInfoSummary,
      profileId: consultationMode === "saju" ? profileId : undefined,
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      birthTimeUnknown: consultationMode === "saju" || isCompat ? effectiveBirthTimeUnknown : undefined,
      birthPlace: consultationMode === "saju" ? birthPlace.trim() : undefined,
      timezone: consultationMode === "saju" ? timezone.trim() : undefined,
      isLeapMonth: calendarType === "lunar" && isLeapMonth,
      longitude: longitude === "" ? undefined : Number(longitude),
      gender: effectiveGender,
      calendarType: effectiveCalendarType,
      tarotSpread: consultationMode === "tarot" ? tarotSpread : undefined,
      sukuyo: consultationMode === "sukuyo" ? nextSukuyoInput : undefined,
      sajuCompatibility: isCompat ? nextSajuCompatInput : undefined,
      question: nextQuestion,
      questionCategory: consultationMode === "saju" ? resolveQuestionCategory({ questionCategory, question: nextQuestion }).primary || undefined : undefined,
    };
  }

  function submitCurrentQuestion() {
    if (isSubmitting) return;
    const nextQuestion = question.trim().length < 4
      ? consultationMode === "sukuyo"
        ? buildSukuyoAutoQuestion()
        : consultationMode === "sajuCompatibility"
          ? buildSajuCompatAutoQuestion()
          : question.trim()
      : question.trim();
    if (nextQuestion.length < 4) {
      setError(copy.kmvgimc7);
      return;
    }
    if (consultationMode === "saju" && resolveQuestionCategory({ questionCategory, question: nextQuestion }).needsClarification) {
      setError(copy.categoryClarify);
      return;
    }
    if (consultationMode === "saju" && !birthDate) {
      setError(copy.k2h1euzc);
      return;
    }
    if (consultationMode === "sajuCompatibility") {
      const nextSajuCompatInput = normalizedSajuCompatInput();
      if (!nextSajuCompatInput.user.birthDate || !nextSajuCompatInput.partner.birthDate) {
        setError(copy.kbo6eipf);
        return;
      }
    }
    if (consultationMode === "sukuyo") {
      const nextSukuyoInput = normalizedSukuyoInput();
      if (!nextSukuyoInput.user.birthDate || !nextSukuyoInput.partner.birthDate) {
        setError(copy.k3pdpqbx);
        return;
      }

      if (!nextSukuyoInput.relationshipType) {
        setError(copy.kxbisp7m);
        return;
      }
    }
    setError("");
    setConfirmation(buildInput(nextQuestion));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentQuestion();
  }

  const sukuyoAutoQuestionPreview = consultationMode === "sukuyo" ? buildSukuyoAutoQuestion() : "";

  if (confirmation) return <TeaConsultConfirmation input={confirmation} cupId={selectedCup.id} onBack={() => setConfirmation(null)} onConfirm={onSubmit} busy={isSubmitting}/>;

  return (
    <section className={`${styles.questionScene}`} aria-labelledby="teaQuestionTitle">
      <div className={styles.questionActor}>
        <img className={styles.yeoniPortrait} src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt="" width="1536" height="1024" />
        <div className={styles.questionInvitation}>
          <p className={styles.chosenTea}>{selectedCup.name} · {selectedCup.topic}</p>
          <h2 id="teaQuestionTitle">{copy.questionTitle}</h2>
          <p>{copy.welcomeNote}</p>
        </div>
      </div>
      <form id="tea-question-form" className={`${styles.questionPanel}`} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{copy.stepLabel}</p>
        <p className={styles.sceneDescription}>{copy.questionGuide}</p>
        <section className={`${styles.questionFormSection}`} aria-labelledby="tarotQuestionSectionTitle">
          <div className={`${styles.questionSectionHeader}`}>
            <span>01</span>
            <div>
              <h3 id="tarotQuestionSectionTitle">{copy.kuyuobkw}</h3>
              <p>
                {consultationMode === "tarot"
                  ? copy.kh27yrbk
                  : consultationMode === "sukuyo"
                    ? copy.kcgraa7q
                    : copy.kfxmqnqq}
              </p>
            </div>
          </div>
          {consultationMode === "sukuyo" ? (
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaQuestion">

              {copy.k0x5yuje}
              <input
                id="fortuneTeaQuestion"
                className={`${styles.questionInput}`}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={copy.krvgpmfb}
                disabled={isSubmitting}
              />
              <span className={styles.sukuyoAutoQuestionHint}>

                {copy.autoQuestionNotice.replace("{question}", sukuyoAutoQuestionPreview)}
              </span>
            </label>
          ) : (
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaQuestion">

              {copy.kk5nkpgf}
              <textarea
                id="fortuneTeaQuestion"
                className={`${styles.questionTextarea}`}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={selectedCup.questionPlaceholder}
                rows={4}
                disabled={isSubmitting}
              />
            </label>
          )}
          {consultationMode === "sukuyo" ? null : (
            <div className={styles.questionFieldGrid}>
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaNickname">

                {copy.koolkprj}
                <input
                  id="fortuneTeaNickname"
                  className={`${styles.questionInput}`}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder={copy.k96qb2sx}
                  autoComplete="nickname"
                  disabled={isSubmitting}
                />
              </label>

            </div>
          )}

          {consultationMode === "tarot" ? (
            <fieldset className={styles.tarotSpreadSelector}>
              <legend>{copy.kznuhtae}</legend>
              <div className={styles.tarotSpreadOptions} role="radiogroup" aria-label={copy.kewpf6es}>
                {tarotSpreadOptions.map((option) => {
                  const selected = tarotSpread === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`${styles.tarotSpreadOption}`}
                      data-selected={selected ? "true" : "false"}
                      onClick={() => setTarotSpread(option.id)}
                      disabled={isSubmitting}
                    >
                      <strong>{copy[option.titleKey]}<Check size={17} className={styles.spreadCheck} aria-hidden="true" /></strong>
                      <span>{copy[option.descriptionKey]}</span>
                      <span className={styles.spreadPrice}>{getFortuneTeaHouseConsultPriceLabel("tarot", option.id)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {consultationMode === "saju" ? (
            <label className={`${styles.questionLabel}`} htmlFor="tea-question-category">
              {copy.categoryLabel}
              <select id="tea-question-category" className={`${styles.questionInput}`} value={questionCategory} onChange={event => setQuestionCategory(event.target.value)} disabled={isSubmitting}>
                <option value="">{copy.categoryAuto}</option>
                {SAJU_CATEGORIES.map(id => <option key={id} value={id}>{categories[id as keyof typeof categories]}</option>)}
              </select>
            </label>
          ) : null}

        </section>
        <section className={`${styles.questionFormSection}`} aria-labelledby="consultModeSectionTitle">
          <div className={`${styles.questionSectionHeader}`}>
            <span>02</span>
            <div>
              <h3 id="consultModeSectionTitle">{copy.ku0ockkt}</h3>
              <p>{copy.kax27tqj}</p>
            </div>
          </div>
          <div className={`${styles.consultModeGrid}`} role="radiogroup" aria-label={copy.kxzymxwz}>
            {consultModeOptions.map((option) => {
              const selected = consultationMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${copy[option.titleKey]}. ${copy[option.descriptionKey]}. ${copy[option.suitedForKey]}. ${option.id === "tarot"
                    ? copy.tarotPriceLine.replace("{three}", getFortuneTeaHouseConsultPriceLabel("tarot", "three")).replace("{five}", getFortuneTeaHouseConsultPriceLabel("tarot", "five"))
                    : priceLabelForMode(option.id)}`}
                  className={`${styles.consultModeCard}`}
                  data-mode={option.id}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setConsultationMode(option.id)}
                  disabled={isSubmitting}
                >
                  <span className={styles.consultModeVisual}>
                    <AssetImage className={styles.consultModeImage} imageClassName={styles.consultModeArtwork} src={option.image} alt="" />
                  </span>
                  <span className={styles.consultModeCopy}>
                    <strong>{copy[option.titleKey]}</strong>
                    <span className={styles.consultModeDescription}>{copy[option.descriptionKey]}</span>
                    <span className={styles.consultModeDetails}>
                      <span>
                        <b>{copy.ksa9e9pj}</b>
                        {option.id === "tarot"
                          ? copy.tarotPriceLine.replace("{three}", getFortuneTeaHouseConsultPriceLabel("tarot", "three")).replace("{five}", getFortuneTeaHouseConsultPriceLabel("tarot", "five"))
                          : priceLabelForMode(option.id)}
                      </span>
                    </span>
                  </span>
                  <span className={styles.consultModeMark} aria-hidden="true">{selected ? <Check size={18} /> : null}</span>
                </button>
              );
            })}
          </div>
        </section>


        {consultationMode === "saju" ? (
        <section className={`${styles.questionFormSection}`} aria-labelledby="sajuBirthSectionTitle">
          <div className={`${styles.questionSectionHeader}`}>
            <span>C</span>
            <div>
              <h3 id="sajuBirthSectionTitle">{copy.kadrsxnd}</h3>
              <p>{copy.kjprno0f}</p>
            </div>
          </div>
          <section className={styles.profileLoadPanel} aria-label={copy.k4jywo6n}>
            <div className={styles.profileLoadHeader}>
              <span>{copy.k4jywo6n}</span>
              <strong>{copy.khxnyk5k}</strong>
              <p>{copy.k4vt1f3z}</p>
            </div>
            {profileLoading ? (
              <p className={styles.profileLoadNotice}>{copy.kykwvjex}</p>
            ) : profileOptions.length > 1 ? (
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaProfileSelect">
                
                {copy.kaiikl3r}
                <select
                  id="fortuneTeaProfileSelect"
                  className={`${styles.questionInput}`}
                  value={selectedProfileOptionId}
                  onChange={(event) => {
                    const nextProfile = profileOptions.find((option) => option.optionId === event.target.value);
                    if (nextProfile) applyProfileOption(nextProfile);
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">{copy.kozwdtol}</option>
                  {profileOptions.map((option) => (
                    <option key={option.optionId} value={option.optionId}>
                      {option.name} · {option.birthDate} · {option.calendarType === "lunar" ? copy.kpbfcw5q : copy.kekiagaw}
                    </option>
                  ))}
                </select>
              </label>
            ) : profileOptions.length === 1 ? (
              <p className={styles.profileLoadNotice}>
                {copy.profileLoadedNotice.replace("{name}", profileOptions[0].name)}
              </p>
            ) : (
              <p className={styles.profileLoadNotice}>{copy.kbaa8yer}</p>
            )}
            {profileNotice ? <p className={styles.profileLoadNotice}>{profileNotice}</p> : null}
            {profileError ? <p className={styles.profileLoadError}>{profileError}</p> : null}
          </section>
          <div className={`${styles.questionFieldGrid} ${styles.birthInfoGrid}`}>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaBirthDate">
              
              {copy.kmfvupic}
              <input id="fortuneTeaBirthDate" className={`${styles.questionInput}`} {...birthDateTextInputProps(birthDate, (nextBirthDate) => setBirthDate(nextBirthDate))} disabled={isSubmitting} />
            </label>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaBirthTime">
              
              {copy.kcmffks2}
              <input
                id="fortuneTeaBirthTime"
                className={`${styles.questionInput}`}
                type="time"
                value={birthTime}
                onChange={(event) => {
                  setBirthTime(event.target.value);
                  if (event.target.value) setBirthTimeUnknown(false);
                }}
                disabled={isSubmitting || birthTimeUnknown}
              />
            </label>
            <label className={styles.birthTimeUnknownToggle} htmlFor="fortuneTeaBirthTimeUnknown">
              <input
                id="fortuneTeaBirthTimeUnknown"
                type="checkbox"
                checked={birthTimeUnknown}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setBirthTimeUnknown(checked);
                  if (checked) setBirthTime("");
                }}
                disabled={isSubmitting}
              />
              <span>{copy.kh6vmzkk}</span>
            </label>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaGender">
              
              {copy.kd3n64c3}
              <select id="fortuneTeaGender" className={`${styles.questionInput}`} value={gender} onChange={(event) => setGender(event.target.value)} disabled={isSubmitting}>
                <option value="">{copy.k7rysb4s}</option>
                <option value="female">{copy.k3vw2jji}</option>
                <option value="male">{copy.kkgzlpaa}</option>
              </select>
            </label>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaCalendarType">
              
              {copy.ksxyz0up}
              <select
                id="fortuneTeaCalendarType"
                className={`${styles.questionInput}`}
                value={calendarType}
                onChange={(event) => setCalendarType(event.target.value === "lunar" ? "lunar" : "solar")}
                disabled={isSubmitting}
              >
                <option value="solar">{copy.kekiagaw}</option>
                <option value="lunar">{copy.kpbfcw5q}</option>
              </select>
            </label>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaBirthPlace">
              
              {copy.kxljhkhu}
              <input
                id="fortuneTeaBirthPlace"
                className={`${styles.questionInput}`}
                value={birthPlace}
                onChange={(event) => setBirthPlace(event.target.value)}
                placeholder={copy.kcsiugqf}
                disabled={isSubmitting}
              />
            </label>
            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaTimezone">
              
              {copy.kd9cotur}
              <input
                id="fortuneTeaTimezone"
                className={`${styles.questionInput}`}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Asia/Seoul"
                disabled={isSubmitting}
              />
            </label>
            {calendarType === "lunar" && <label className={styles.birthTimeUnknownToggle}><input type="checkbox" checked={isLeapMonth} onChange={e => setIsLeapMonth(e.target.checked)} disabled={isSubmitting}/><span>{copy.leapMonth}</span></label>}
            <label className={styles.questionLabel}>{copy.longitudeLabel}<input className={styles.questionInput} type="number" min="-180" max="180" step="0.001" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="126.978" disabled={isSubmitting}/><small>{copy.longitudeHelp}</small></label>
          </div>
          <p className={styles.birthOptionalNotice}>
            
            {copy.k0ikly8b}
          </p>
        </section>
        ) : consultationMode === "sajuCompatibility" ? (
          <section className={`${styles.questionFormSection}`} aria-labelledby="sajuCompatBirthSectionTitle">
            <div className={`${styles.questionSectionHeader}`}>
              <span>C</span>
              <div>
                <h3 id="sajuCompatBirthSectionTitle">{copy.kquxx9hu}</h3>
                <p>{copy.kfeelhij}</p>
              </div>
            </div>

            <div className={styles.sukuyoPairGrid}>
              <article className={`${styles.sukuyoPersonCard}`}>
                <span>{copy.kqpkxeui}</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatUserName">
                    
                    {copy.kmkn5ed2}
                    <input
                      id="fortuneTeaSajuCompatUserName"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.user.name || ""}
                      onChange={(event) => updateSajuCompatPerson("user", { name: event.target.value })}
                      placeholder={copy.kgr4ck0r}
                      autoComplete="nickname"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatUserBirthDate">
                    
                    {copy.kmfvupic}
                    <input id="fortuneTeaSajuCompatUserBirthDate" className={`${styles.questionInput}`} {...birthDateTextInputProps(sajuCompatInput.user.birthDate || "", (nextBirthDate) => updateSajuCompatPerson("user", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatUserBirthTime">
                    
                    {copy.kcmffks2}
                    <input
                      id="fortuneTeaSajuCompatUserBirthTime"
                      className={`${styles.questionInput}`}
                      type="time"
                      value={sajuCompatInput.user.birthTime || ""}
                      onChange={(event) => updateSajuCompatPerson("user", { birthTime: event.target.value, birthTimeUnknown: event.target.value ? false : sajuCompatInput.user.birthTimeUnknown })}
                      disabled={isSubmitting || sajuCompatInput.user.birthTimeUnknown}
                    />
                  </label>
                  <label className={styles.birthTimeUnknownToggle} htmlFor="fortuneTeaSajuCompatUserTimeUnknown">
                    <input
                      id="fortuneTeaSajuCompatUserTimeUnknown"
                      type="checkbox"
                      checked={Boolean(sajuCompatInput.user.birthTimeUnknown)}
                      onChange={(event) => updateSajuCompatPerson("user", { birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : sajuCompatInput.user.birthTime })}
                      disabled={isSubmitting}
                    />
                    <span>{copy.k4te8nd5}</span>
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatUserCalendar">
                    
                    {copy.ksxyz0up}
                    <select
                      id="fortuneTeaSajuCompatUserCalendar"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.user.calendarType || "solar"}
                      onChange={(event) => updateSajuCompatPerson("user", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">{copy.kekiagaw}</option>
                      <option value="lunar">{copy.kpbfcw5q}</option>
                    </select>
                  </label>
                  {sajuCompatInput.user.calendarType === "lunar" && <label className={styles.birthTimeUnknownToggle}><input type="checkbox" checked={Boolean(sajuCompatInput.user.isLeapMonth)} onChange={e => updateSajuCompatPerson("user", {isLeapMonth: e.target.checked})} disabled={isSubmitting}/><span>{copy.leapMonth}</span></label>}
                  <label className={styles.questionLabel}>{copy.kd9cotur}<input className={styles.questionInput} value={sajuCompatInput.user.timezone || "Asia/Seoul"} onChange={e => updateSajuCompatPerson("user", {timezone:e.target.value})} disabled={isSubmitting}/></label>
                  <label className={styles.questionLabel}>{copy.longitudeLabel}<input className={styles.questionInput} type="number" min="-180" max="180" step="0.001" value={sajuCompatInput.user.longitude ?? ""} onChange={e => updateSajuCompatPerson("user", {longitude:e.target.value === "" ? undefined : Number(e.target.value)})} disabled={isSubmitting}/><small>{copy.longitudeHelp}</small></label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatUserGender">
                    
                    {copy.kd3n64c3}
                    <select
                      id="fortuneTeaSajuCompatUserGender"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.user.gender || ""}
                      onChange={(event) => updateSajuCompatPerson("user", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">{copy.kcbceqsz}</option>
                      <option value="female">{copy.k3vw2jji}</option>
                      <option value="male">{copy.kkgzlpaa}</option>
                    </select>
                  </label>
                </div>
              </article>

              <article className={`${styles.sukuyoPersonCard}`}>
                <span>{copy.kalghzsn}</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatPartnerName">
                    
                    {copy.kmkn5ed2}
                    <input
                      id="fortuneTeaSajuCompatPartnerName"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.partner.name || ""}
                      onChange={(event) => updateSajuCompatPerson("partner", { name: event.target.value })}
                      placeholder={copy.kdjowvdd}
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatPartnerBirthDate">
                    
                    {copy.kmfvupic}
                    <input id="fortuneTeaSajuCompatPartnerBirthDate" className={`${styles.questionInput}`} {...birthDateTextInputProps(sajuCompatInput.partner.birthDate || "", (nextBirthDate) => updateSajuCompatPerson("partner", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatPartnerBirthTime">
                    
                    {copy.kcmffks2}
                    <input
                      id="fortuneTeaSajuCompatPartnerBirthTime"
                      className={`${styles.questionInput}`}
                      type="time"
                      value={sajuCompatInput.partner.birthTime || ""}
                      onChange={(event) => updateSajuCompatPerson("partner", { birthTime: event.target.value, birthTimeUnknown: event.target.value ? false : sajuCompatInput.partner.birthTimeUnknown })}
                      disabled={isSubmitting || sajuCompatInput.partner.birthTimeUnknown}
                    />
                  </label>
                  <label className={styles.birthTimeUnknownToggle} htmlFor="fortuneTeaSajuCompatPartnerTimeUnknown">
                    <input
                      id="fortuneTeaSajuCompatPartnerTimeUnknown"
                      type="checkbox"
                      checked={Boolean(sajuCompatInput.partner.birthTimeUnknown)}
                      onChange={(event) => updateSajuCompatPerson("partner", { birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : sajuCompatInput.partner.birthTime })}
                      disabled={isSubmitting}
                    />
                    <span>{copy.k4te8nd5}</span>
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatPartnerCalendar">
                    
                    {copy.ksxyz0up}
                    <select
                      id="fortuneTeaSajuCompatPartnerCalendar"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.partner.calendarType || "solar"}
                      onChange={(event) => updateSajuCompatPerson("partner", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">{copy.kekiagaw}</option>
                      <option value="lunar">{copy.kpbfcw5q}</option>
                    </select>
                  </label>
                  {sajuCompatInput.partner.calendarType === "lunar" && <label className={styles.birthTimeUnknownToggle}><input type="checkbox" checked={Boolean(sajuCompatInput.partner.isLeapMonth)} onChange={e => updateSajuCompatPerson("partner", {isLeapMonth: e.target.checked})} disabled={isSubmitting}/><span>{copy.leapMonth}</span></label>}
                  <label className={styles.questionLabel}>{copy.kd9cotur}<input className={styles.questionInput} value={sajuCompatInput.partner.timezone || "Asia/Seoul"} onChange={e => updateSajuCompatPerson("partner", {timezone:e.target.value})} disabled={isSubmitting}/></label>
                  <label className={styles.questionLabel}>{copy.longitudeLabel}<input className={styles.questionInput} type="number" min="-180" max="180" step="0.001" value={sajuCompatInput.partner.longitude ?? ""} onChange={e => updateSajuCompatPerson("partner", {longitude:e.target.value === "" ? undefined : Number(e.target.value)})} disabled={isSubmitting}/><small>{copy.longitudeHelp}</small></label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatPartnerGender">
                    
                    {copy.kd3n64c3}
                    <select
                      id="fortuneTeaSajuCompatPartnerGender"
                      className={`${styles.questionInput}`}
                      value={sajuCompatInput.partner.gender || ""}
                      onChange={(event) => updateSajuCompatPerson("partner", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">{copy.kcbceqsz}</option>
                      <option value="female">{copy.k3vw2jji}</option>
                      <option value="male">{copy.kkgzlpaa}</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div className={styles.sukuyoMetaGrid}>
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatRelationship">
                
                {copy.kbsnqume}
                <select
                  id="fortuneTeaSajuCompatRelationship"
                  className={`${styles.questionInput}`}
                  value={sajuCompatInput.relationshipType || copy.kfa7vknq}
                  onChange={(event) => updateSajuCompatMeta({ relationshipType: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoRelationshipTypes.map((item) => (
                    <option key={item} value={item}>{copy[SUKUYO_RELATIONSHIP_LABEL[item]]}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatFocus">
                
                {copy.kydjxdvs}
                <select
                  id="fortuneTeaSajuCompatFocus"
                  className={`${styles.questionInput}`}
                  value={sajuCompatInput.focus || copy.k0y7lflt}
                  onChange={(event) => updateSajuCompatMeta({ focus: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoFocusOptions.map((item) => (
                    <option key={item} value={item}>{copy[SUKUYO_FOCUS_LABEL[item]]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSajuCompatSituation">
              
              {copy.k2jt4pbo} <span className={styles.optionalFieldMark}>{copy.kcbceqsz}</span>
              <textarea
                id="fortuneTeaSajuCompatSituation"
                className={`${styles.questionTextarea} ${styles.sukuyoSituationTextarea}`}
                value={sajuCompatInput.currentSituation || ""}
                onChange={(event) => updateSajuCompatMeta({ currentSituation: event.target.value })}
                placeholder={copy.ksvgqqtb}
                rows={3}
                disabled={isSubmitting}
              />
            </label>
            <p className={styles.birthOptionalNotice}>
              
              {copy.kexsvdzm}
            </p>
          </section>
        ) : consultationMode === "sukuyo" ? (
          <section className={`${styles.questionFormSection}`} aria-labelledby="sukuyoBirthSectionTitle">
            <div className={`${styles.questionSectionHeader}`}>
              <span>C</span>
              <div>
                <h3 id="sukuyoBirthSectionTitle">{copy.kjtex1ko}</h3>
                <p>{copy.k65h6i0u}</p>
              </div>
            </div>

            <div className={styles.sukuyoPairGrid}>
              <article className={`${styles.sukuyoPersonCard}`}>
                <span>{copy.keqlnlem}</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoUserName">
                    
                    {copy.kmkn5ed2}
                    <input
                      id="fortuneTeaSukuyoUserName"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.user.name || ""}
                      onChange={(event) => updateSukuyoPerson("user", { name: event.target.value })}
                      placeholder={copy.kgr4ck0r}
                      autoComplete="nickname"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoUserBirthDate">
                    
                    {copy.kmfvupic}
                    <input id="fortuneTeaSukuyoUserBirthDate" className={`${styles.questionInput}`} {...birthDateTextInputProps(sukuyoInput.user.birthDate || "", (nextBirthDate) => updateSukuyoPerson("user", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoUserCalendar">
                    
                    {copy.ksxyz0up}
                    <select
                      id="fortuneTeaSukuyoUserCalendar"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.user.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("user", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">{copy.kekiagaw}</option>
                      <option value="lunar">{copy.kpbfcw5q}</option>
                    </select>
                  </label>
                  {sukuyoInput.user.calendarType === "lunar" && <label className={styles.birthTimeUnknownToggle}><input type="checkbox" checked={Boolean(sukuyoInput.user.isLeapMonth)} onChange={e => updateSukuyoPerson("user", {isLeapMonth: e.target.checked})} disabled={isSubmitting}/><span>{copy.leapMonth}</span></label>}
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoUserGender">
                    
                    {copy.kd3n64c3}
                    <select
                      id="fortuneTeaSukuyoUserGender"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.user.gender || ""}
                      onChange={(event) => updateSukuyoPerson("user", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">{copy.kcbceqsz}</option>
                      <option value="female">{copy.k3vw2jji}</option>
                      <option value="male">{copy.kkgzlpaa}</option>
                    </select>
                  </label>
                </div>
              </article>

              <article className={`${styles.sukuyoPersonCard}`}>
                <span>{copy.k2lelfhi}</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoPartnerName">
                    
                    {copy.kmkn5ed2}
                    <input
                      id="fortuneTeaSukuyoPartnerName"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.partner.name || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { name: event.target.value })}
                      placeholder={copy.kdjowvdd}
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoPartnerBirthDate">
                    
                    {copy.kmfvupic}
                    <input id="fortuneTeaSukuyoPartnerBirthDate" className={`${styles.questionInput}`} {...birthDateTextInputProps(sukuyoInput.partner.birthDate || "", (nextBirthDate) => updateSukuyoPerson("partner", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoPartnerCalendar">
                    
                    {copy.ksxyz0up}
                    <select
                      id="fortuneTeaSukuyoPartnerCalendar"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.partner.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("partner", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">{copy.kekiagaw}</option>
                      <option value="lunar">{copy.kpbfcw5q}</option>
                    </select>
                  </label>
                  {sukuyoInput.partner.calendarType === "lunar" && <label className={styles.birthTimeUnknownToggle}><input type="checkbox" checked={Boolean(sukuyoInput.partner.isLeapMonth)} onChange={e => updateSukuyoPerson("partner", {isLeapMonth: e.target.checked})} disabled={isSubmitting}/><span>{copy.leapMonth}</span></label>}
                  <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoPartnerGender">
                    
                    {copy.kd3n64c3}
                    <select
                      id="fortuneTeaSukuyoPartnerGender"
                      className={`${styles.questionInput}`}
                      value={sukuyoInput.partner.gender || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">{copy.kcbceqsz}</option>
                      <option value="female">{copy.k3vw2jji}</option>
                      <option value="male">{copy.kkgzlpaa}</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div className={styles.sukuyoMetaGrid}>
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoRelationship">
                
                {copy.kbsnqume}
                <select
                  id="fortuneTeaSukuyoRelationship"
                  className={`${styles.questionInput}`}
                  value={sukuyoInput.relationshipType || copy.ktclbui2}
                  onChange={(event) => updateSukuyoMeta({ relationshipType: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoRelationshipTypes.map((item) => (
                    <option key={item} value={item}>{copy[SUKUYO_RELATIONSHIP_LABEL[item]]}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoFocus">
                
                {copy.kydjxdvs}
                <select
                  id="fortuneTeaSukuyoFocus"
                  className={`${styles.questionInput}`}
                  value={sukuyoInput.focus || copy.k0y7lflt}
                  onChange={(event) => updateSukuyoMeta({ focus: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoFocusOptions.map((item) => (
                    <option key={item} value={item}>{copy[SUKUYO_FOCUS_LABEL[item]]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`${styles.questionLabel}`} htmlFor="fortuneTeaSukuyoSituation">
              
              {copy.k2jt4pbo} <span className={styles.optionalFieldMark}>{copy.kcbceqsz}</span>
              <textarea
                id="fortuneTeaSukuyoSituation"
                className={`${styles.questionTextarea} ${styles.sukuyoSituationTextarea}`}
                value={sukuyoInput.currentSituation || ""}
                onChange={(event) => updateSukuyoMeta({ currentSituation: event.target.value })}
                placeholder={copy.k4wmutlu}
                rows={3}
                disabled={isSubmitting}
              />
            </label>
            <p className={styles.birthOptionalNotice}>
              
              {copy.khkt6xha}
            </p>
          </section>
        ) : (
          <p className={styles.birthOptionalNotice}>
            
            {copy.kkxbjbaz}
          </p>
        )}
        {error ? <p className={styles.questionError}>{error}</p> : null}
        {submitError ? (
          <section className={styles.questionSubmitErrorCard} role="alert" aria-live="assertive">
            <strong>{copy.kw53ukki}</strong>
            <p>{submitError}</p>
          </section>
        ) : null}
        <div className={`${styles.storyActions}`}>
          <TeaHouseButton className={styles.secondaryAction} variant="ghost" onClick={onBack} disabled={isSubmitting}>
            
            {copy.kchbatkz}
          </TeaHouseButton>
          <TeaHouseButton className={styles.primaryAction} type="submit" loading={isSubmitting}>
            {copy.reviewButton}
          </TeaHouseButton>
        </div>
      </form>
    </section>
  );
}
