"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import type { FormEvent } from "react";
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
import { getFortuneTeaHouseConsultPriceLabel, getFortuneTeaHouseResultButtonLabel } from "../data/consultPricing";
import type { FortuneTeaHouseCalendarType, FortuneTeaHouseConsultMode, FortuneTeaHouseQuestionInput, FortuneTeaHouseSajuCompatInput, FortuneTeaHouseSukuyoInput, FortuneTeaTarotSpread } from "../data/consult";
import { type TeaHouseCup } from "../data/teaCups";
import AssetImage from "./AssetImage";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import TeaCupVisual from "./TeaCupVisual";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type QuestionInputSceneProps = {
  selectedCup: TeaHouseCup;
  initialInput?: Partial<FortuneTeaHouseQuestionInput>;
  onSubmit: (input: FortuneTeaHouseQuestionInput) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string;
  priceLabels?: Partial<Record<FortuneTeaHouseConsultMode, string>>;
};

const concernTopics = ["연애 · 재회", "썸 · 인연", "진로 · 사업", "금전운", "마음 회복", "이별 · 위기"] as const;
const sukuyoRelationshipTypes = ["연애 중", "썸", "연인", "배우자", "재회 고민", "짝사랑", "친구", "비즈니스", "가족", "기타"] as const;
const sukuyoFocusOptions = ["상대의 마음", "앞으로의 흐름", "재회 가능성", "결혼 가능성", "갈등 해결", "연락 타이밍", "관계 이어가는 방법"] as const;
const consultModeOptions: Array<{
  id: FortuneTeaHouseConsultMode;
  title: string;
  eyebrow: string;
  description: string;
  promise: string;
  reads: string;
  suitedFor: string;
  image: string;
  alt: string;
}> = [
  {
    id: "tarot",
    title: "타로로 보기",
    eyebrow: "카드가 먼저 여는 장면",
    description: "지금 질문 위로 떠오른 한 장의 상징을 따라, 마음의 기류와 선택의 방향을 읽습니다.",
    promise: "상대의 마음, 선택의 기류, 바로 움직일 수 있는 한 걸음",
    reads: "현재 질문에 가까운 카드의 상징, 상대 마음, 선택 앞의 기류",
    suitedFor: "연락, 재회, 선택처럼 지금 장면의 흐름이 궁금한 밤",
    image: fortuneTeaHouseAssets.consultModes.tarot,
    alt: "운명의 찻집 타로 상담 이미지",
  },
  {
    id: "saju",
    title: "사주로 보기",
    eyebrow: "태어난 흐름이 밝히는 저녁",
    description: "태어난 흐름을 바탕으로 오행과 십성의 결을 차분히 살펴봅니다.",
    promise: "기질의 반복, 시기의 흐름, 오늘 붙잡을 기준",
    reads: "태어난 흐름, 오행의 균형, 반복되는 기질과 시기의 기준",
    suitedFor: "내 성향과 타이밍, 오래 반복되는 고민의 뿌리를 보고 싶은 때",
    image: fortuneTeaHouseAssets.consultModes.saju,
    alt: "운명의 찻집 사주 상담 이미지",
  },
  {
    id: "sajuCompatibility",
    title: "사주 궁합 상담",
    eyebrow: "두 명식이 나란히 놓이는 저녁",
    description: "두 사람의 사주 명식을 각각 산출해 나란히 놓고, 두 흐름이 만나는 결을 함께 읽습니다.",
    promise: "나의 명식, 상대의 명식, 두 사람이 맞물리고 조율할 지점",
    reads: "두 사람의 일간·오행·십성, 상생과 상극의 결, 관계의 운 흐름",
    suitedFor: "연인·부부·재회 등 사주로 두 사람의 궁합을 깊이 보고 싶은 때",
    image: fortuneTeaHouseAssets.consultModes.saju,
    alt: "두 사람의 사주 궁합 이미지",
  },
  {
    id: "sukuyo",
    title: "숙요점 궁합 상담",
    eyebrow: "달빛 아래 피어나는 인연의 흐름",
    description: "두 사람의 27숙 거리와 관계 리듬을 달빛 아래 조용히 펼쳐봅니다.",
    promise: "끌림의 방식, 조심할 온도, 오늘 건넬 수 있는 한 문장",
    reads: "두 사람의 27숙 거리, 끌림과 부딪힘의 리듬, 관계의 온도",
    suitedFor: "궁합, 재회 가능성, 상대와 나 사이의 흐름을 조용히 보고 싶은 때",
    image: fortuneTeaHouseAssets.consultModes.sukuyo,
    alt: "27숙 인연의 흐름 이미지",
  },
];

const tarotSpreadOptions: Array<{
  id: FortuneTeaTarotSpread;
  title: string;
  description: string;
}> = [
  { id: "three", title: "3카드 스프레드", description: "현재 · 흐름 · 조언을 차례로 펼치는 빠르고 핵심적인 리딩입니다." },
  { id: "five", title: "5카드 프리미엄 스프레드", description: "현재 · 상대/상황 · 장애 · 가능성 · 조언까지, 카드 수만큼 더 깊게 봅니다." },
];

const questionSceneUi =
  "relative isolate min-h-svh overflow-hidden bg-[#080511] text-[#fffaf1] antialiased";
const questionPanelUi =
  "relative overflow-hidden rounded-[30px] border border-[#f6dfb7]/30 bg-gradient-to-br from-[#241337]/90 via-[#12091f]/90 to-[#080511]/95 shadow-[0_36px_104px_rgba(4,2,12,0.54),0_0_54px_rgba(206,196,255,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-white/10 backdrop-blur-2xl";
const questionSectionUi =
  "rounded-[22px] border border-[#f6dfb7]/20 bg-white/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_48px_rgba(7,3,18,0.2)] ring-1 ring-white/5";
const questionHeaderUi =
  "[&>span]:border-[#f6dfb7]/30 [&>span]:bg-[#f6dfb7]/10 [&>span]:text-[#ffe8a6] [&>span]:shadow-[0_0_24px_rgba(246,223,183,0.18)] [&_h3]:font-[var(--tea-font-premium)] [&_h3]:text-[1.1rem] [&_h3]:text-[#fffaf1] [&_h3]:tracking-[0] [&_p]:font-[var(--tea-font-body)] [&_p]:leading-[1.78] [&_p]:text-white/70";
const consultModeGridUi = "gap-4 lg:gap-5";
const consultModeCardUi =
  "rounded-3xl border-[#f6dfb7]/20 bg-gradient-to-br from-[#2a173e]/90 via-[#14091f]/90 to-[#080511]/95 shadow-[0_26px_74px_rgba(7,3,18,0.36),0_0_34px_rgba(206,196,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:border-[#f6dfb7]/50 hover:shadow-[0_34px_88px_rgba(7,3,18,0.48),0_0_46px_rgba(206,196,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12071f] disabled:cursor-wait disabled:opacity-60";
const questionLabelUi = "text-[#ffe8a6]/90";
const questionInputUi =
  "min-h-12 rounded-2xl border border-[#f6dfb7]/30 bg-[#0e0719]/80 px-4 font-[var(--tea-font-body)] text-[#fffaf1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_rgba(7,3,18,0.16)] outline-none transition placeholder:text-white/40 focus:border-[#ffe8a6]/75 focus:ring-4 focus:ring-[#ffe8a6]/20 disabled:cursor-not-allowed disabled:opacity-55";
const questionTextareaUi =
  "rounded-[22px] border border-[#f6dfb7]/30 bg-[#0e0719]/80 px-4 py-4 font-[var(--tea-font-body)] leading-[1.78] text-[#fffaf1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_16px_38px_rgba(7,3,18,0.18)] outline-none transition placeholder:text-white/40 focus:border-[#ffe8a6]/75 focus:ring-4 focus:ring-[#ffe8a6]/20 disabled:cursor-not-allowed disabled:opacity-55";
const sukuyoCardUi =
  "rounded-2xl border border-white/20 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_44px_rgba(7,3,18,0.16)]";
const branchNoteUi =
  "rounded-2xl border border-[#d7d4ff]/25 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]";
const tarotSpreadOptionUi =
  "rounded-2xl border-[#f6dfb7]/20 bg-white/[0.055] shadow-[0_16px_38px_rgba(7,3,18,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-300 hover:-translate-y-0.5 hover:border-[#ffe8a6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12071f]";
const actionRowUi = "items-stretch sm:items-center";

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

export default function QuestionInputScene({ selectedCup, initialInput, onSubmit, onBack, isSubmitting = false, submitError = "", priceLabels = {} }: QuestionInputSceneProps) {
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
  const [timezone, setTimezone] = useState(initialInput?.timezone || "Asia/Seoul");
  const [gender, setGender] = useState(initialInput?.gender || "");
  const [calendarType, setCalendarType] = useState<FortuneTeaHouseCalendarType>(initialInput?.calendarType || "solar");
  const [tarotSpread, setTarotSpread] = useState<FortuneTeaTarotSpread>(initialInput?.tarotSpread === "five" ? "five" : "three");
  // 타로 금액은 선택한 스프레드(3카드 5,000원 / 5카드 7,000원)에 따라 달라진다.
  const submitButtonLabel = getFortuneTeaHouseResultButtonLabel(
    consultationMode,
    priceLabelForMode(consultationMode, tarotSpread),
    tarotSpread,
  );
  const [sukuyoInput, setSukuyoInput] = useState<FortuneTeaHouseSukuyoInput>(() => ({
    user: {
      name: initialInput?.sukuyo?.user?.name || initialInput?.nickname || "",
      birthDate: initialInput?.sukuyo?.user?.birthDate || "",
      calendarType: initialInput?.sukuyo?.user?.calendarType || "solar",
      gender: initialInput?.sukuyo?.user?.gender || "",
    },
    partner: {
      name: initialInput?.sukuyo?.partner?.name || "",
      birthDate: initialInput?.sukuyo?.partner?.birthDate || "",
      calendarType: initialInput?.sukuyo?.partner?.calendarType || "solar",
      gender: initialInput?.sukuyo?.partner?.gender || "",
    },
    relationshipType: initialInput?.sukuyo?.relationshipType || "연애 중",
    focus: initialInput?.sukuyo?.focus || "앞으로의 흐름",
    currentSituation: initialInput?.sukuyo?.currentSituation || "",
  }));
  const [sajuCompatInput, setSajuCompatInput] = useState<FortuneTeaHouseSajuCompatInput>(() => ({
    user: {
      name: initialInput?.sajuCompatibility?.user?.name || initialInput?.nickname || "",
      birthDate: initialInput?.sajuCompatibility?.user?.birthDate || "",
      birthTime: initialInput?.sajuCompatibility?.user?.birthTime || "",
      birthTimeUnknown: Boolean(initialInput?.sajuCompatibility?.user?.birthTimeUnknown),
      calendarType: initialInput?.sajuCompatibility?.user?.calendarType || "solar",
      gender: initialInput?.sajuCompatibility?.user?.gender || "",
    },
    partner: {
      name: initialInput?.sajuCompatibility?.partner?.name || "",
      birthDate: initialInput?.sajuCompatibility?.partner?.birthDate || "",
      birthTime: initialInput?.sajuCompatibility?.partner?.birthTime || "",
      birthTimeUnknown: Boolean(initialInput?.sajuCompatibility?.partner?.birthTimeUnknown),
      calendarType: initialInput?.sajuCompatibility?.partner?.calendarType || "solar",
      gender: initialInput?.sajuCompatibility?.partner?.gender || "",
    },
    relationshipType: initialInput?.sajuCompatibility?.relationshipType || "연인",
    focus: initialInput?.sajuCompatibility?.focus || "앞으로의 흐름",
    currentSituation: initialInput?.sajuCompatibility?.currentSituation || "",
  }));
  const [question, setQuestion] = useState(initialInput?.question || "");
  const [error, setError] = useState("");

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
      setProfileNotice("프로필 카드에 저장된 내 정보를 불러왔어요. 필요하면 이번 상담에서만 살짝 수정할 수 있어요.");
    }
    setProfileError("");
  }, []);

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
        setProfileNotice("저장된 프로필을 찾지 못했어요. 아래 정보만 채우면 상담을 열 수 있어요.");
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
            setProfileNotice("불러올 프로필을 골라 주세요. 선택하면 아래 정보가 바로 채워집니다.");
          } else {
            await applyFallbackProfile();
          }
          return;
        }
        await applyFallbackProfile();
      } catch {
        if (!alive) return;
        setProfileError("프로필을 불러오지 못했어요. 저장된 정보가 있으면 다시 확인하고, 지금은 직접 입력해 주세요.");
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
        gender: sukuyoInput.user.gender,
      },
      partner: {
        name: sukuyoInput.partner.name?.trim(),
        birthDate: sukuyoInput.partner.birthDate,
        calendarType: sukuyoInput.partner.calendarType || "solar",
        gender: sukuyoInput.partner.gender,
      },
      relationshipType: sukuyoInput.relationshipType || "연애 중",
      focus: sukuyoInput.focus || "앞으로의 흐름",
      currentSituation: sukuyoInput.currentSituation?.trim(),
    };
  }

  function buildSukuyoAutoQuestion(input = normalizedSukuyoInput()) {
    const relationshipType = input.relationshipType || "연애 중";
    const focus = input.focus || "앞으로의 흐름";
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
        gender: sajuCompatInput.user.gender,
      },
      partner: {
        name: sajuCompatInput.partner.name?.trim(),
        birthDate: sajuCompatInput.partner.birthDate,
        birthTime: sajuCompatInput.partner.birthTimeUnknown ? "" : sajuCompatInput.partner.birthTime,
        birthTimeUnknown: Boolean(sajuCompatInput.partner.birthTimeUnknown),
        calendarType: sajuCompatInput.partner.calendarType || "solar",
        gender: sajuCompatInput.partner.gender,
      },
      relationshipType: sajuCompatInput.relationshipType || "연인",
      focus: sajuCompatInput.focus || "앞으로의 흐름",
      currentSituation: sajuCompatInput.currentSituation?.trim(),
    };
  }

  function buildSajuCompatAutoQuestion(input = normalizedSajuCompatInput()) {
    const relationshipType = input.relationshipType || "연인";
    const focus = input.focus || "앞으로의 흐름";
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
        ? `${nextSukuyoInput.user.name || "나"} ${nextSukuyoInput.user.birthDate || ""}`
        : isCompat
          ? `${nextSajuCompatInput.user.name || "나"} ${nextSajuCompatInput.user.birthDate || ""}`
          : effectiveBirthDate ? effectiveBirthDate.replaceAll("-", ".") : "",
      consultationMode === "sukuyo"
        ? `${nextSukuyoInput.partner.name || "상대"} ${nextSukuyoInput.partner.birthDate || ""}`
        : isCompat
          ? `${nextSajuCompatInput.partner.name || "상대"} ${nextSajuCompatInput.partner.birthDate || ""}`
          : effectiveBirthTimeUnknown ? "출생시간 미상" : effectiveBirthTime ? effectiveBirthTime : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.relationshipType || "" : isCompat ? nextSajuCompatInput.relationshipType || "" : effectiveGender === "male" ? "남성" : effectiveGender === "female" ? "여성" : "",
      consultationMode === "sukuyo" ? nextSukuyoInput.focus || "" : isCompat ? nextSajuCompatInput.focus || "" : effectiveCalendarType === "lunar" ? "음력" : "양력",
      consultationMode === "sukuyo" || isCompat ? "" : birthPlace,
    ]
      .filter(Boolean)
      .join(" ");
    return {
      consultationMode,
      nickname: consultationMode === "sukuyo" ? nextSukuyoInput.user.name || nickname.trim() : isCompat ? nextSajuCompatInput.user.name || nickname.trim() : nickname.trim(),
      concernTopic: selectedCup.topic,
      birthInfo: birthInfoSummary,
      profileId: consultationMode === "saju" ? profileId : undefined,
      birthDate: effectiveBirthDate,
      birthTime: effectiveBirthTime,
      birthTimeUnknown: consultationMode === "saju" || isCompat ? effectiveBirthTimeUnknown : undefined,
      birthPlace: consultationMode === "saju" ? birthPlace.trim() : undefined,
      timezone: consultationMode === "saju" ? timezone.trim() : undefined,
      gender: effectiveGender,
      calendarType: effectiveCalendarType,
      tarotSpread: consultationMode === "tarot" ? tarotSpread : undefined,
      sukuyo: consultationMode === "sukuyo" ? nextSukuyoInput : undefined,
      sajuCompatibility: isCompat ? nextSajuCompatInput : undefined,
      question: nextQuestion,
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
      setError("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
      return;
    }
    if (consultationMode === "saju" && !birthDate) {
      setError("사주로 보려면 생년월일을 먼저 찻잔 위에 올려 주세요.");
      return;
    }
    if (consultationMode === "sajuCompatibility") {
      const nextSajuCompatInput = normalizedSajuCompatInput();
      if (!nextSajuCompatInput.user.birthDate || !nextSajuCompatInput.partner.birthDate) {
        setError("사주 궁합을 보려면 두 사람의 생년월일을 모두 올려 주세요.");
        return;
      }
    }
    if (consultationMode === "sukuyo") {
      const nextSukuyoInput = normalizedSukuyoInput();
      if (!nextSukuyoInput.user.birthDate || !nextSukuyoInput.partner.birthDate) {
        setError("달빛 궁합을 보려면 두 사람의 생년월일을 모두 올려 주세요.");
        return;
      }
      if (!nextSukuyoInput.user.gender || !nextSukuyoInput.partner.gender) {
        setError("두 사람의 성별을 함께 골라 주세요.");
        return;
      }
      if (!nextSukuyoInput.relationshipType) {
        setError("두 사람이 어떤 인연으로 마주하고 있는지 골라 주세요.");
        return;
      }
    }
    setError("");
    onSubmit(buildInput(nextQuestion));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentQuestion();
  }

  const sukuyoAutoQuestionPreview = consultationMode === "sukuyo" ? buildSukuyoAutoQuestion() : "";

  return (
    <section className={`${styles.questionScene} ${questionSceneUi}`} aria-labelledby="teaQuestionTitle">
      <div className={styles.questionActor}>
        <div className={styles.questionOracleStage}>
          <YeoniDialogueActor mood="comfort" isSpeaking={false} className={styles.yeoniPortrait} priority />
          <div className={styles.questionCupAltar} aria-label={`${selectedCup.name} 찻잔 상담`}>
            <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.questionSelectedCup} />
          </div>
          <div className={styles.questionCupReading}>
            <span>연이의 찻잔 해석</span>
            <strong>{selectedCup.name}</strong>
            <p>{selectedCup.yeoniSelectLine}</p>
            <em>{selectedCup.selectionComment}</em>
            <small>{selectedCup.description}</small>
          </div>
        </div>
      </div>
      <form className={`${styles.questionPanel} ${questionPanelUi}`} onSubmit={handleSubmit}>
        <p className={styles.sceneEyebrow}>{selectedCup.ritualTitle}</p>
        <h2 id="teaQuestionTitle">{selectedCup.name} 위에 오늘의 질문을 올려주세요</h2>
        <p className={styles.sceneDescription}>
          {selectedCup.summonLine} 오늘은 타로, 사주, 숙요점 궁합 중 손님이 고른 한 가지 길로만 깊게 읽어드릴게요.
        </p>
        <TeaHouseDialogueBox
          speaker="연이"
          text={selectedCup.questionGuideLine}
        />

        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="consultModeSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>A</span>
            <div>
              <h3 id="consultModeSectionTitle">오늘 열어 볼 상담 방식</h3>
              <p>타로, 사주, 숙요점 궁합 중 하나만 골라 주세요. 연이는 선택한 길의 상징만 따라갑니다.</p>
            </div>
          </div>
          <div className={`${styles.consultModeGrid} ${consultModeGridUi}`} role="radiogroup" aria-label="상담 방식 선택">
            {consultModeOptions.map((option) => {
              const selected = consultationMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.consultModeCard} ${consultModeCardUi}`}
                  data-mode={option.id}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setConsultationMode(option.id)}
                  disabled={isSubmitting}
                >
                  <span className={styles.consultModeVisual}>
                    <AssetImage className={styles.consultModeImage} src={option.image} alt={option.alt} priority={selected} />
                  </span>
                  <span className={styles.consultModeCopy}>
                    <span className={styles.consultModeEyebrow}>{option.eyebrow}</span>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                    <em>{option.promise}</em>
                    <span className={styles.consultModeDetails}>
                      <span>
                        <b>살피는 결</b>
                        {option.reads}
                      </span>
                      <span>
                        <b>잘 어울리는 질문</b>
                        {option.suitedFor}
                      </span>
                      <span>
                        <b>상담 금액</b>
                        {option.id === "tarot"
                          ? `3카드 ${getFortuneTeaHouseConsultPriceLabel("tarot", "three")} · 5카드 ${getFortuneTeaHouseConsultPriceLabel("tarot", "five")}`
                          : priceLabelForMode(option.id)}
                      </span>
                    </span>
                  </span>
                  <span className={styles.consultModeMark} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="tarotQuestionSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>B</span>
            <div>
              <h3 id="tarotQuestionSectionTitle">오늘의 질문</h3>
              <p>
                {consultationMode === "tarot"
                  ? "카드가 비춰야 할 장면을 편하게 적어 주세요."
                  : consultationMode === "sukuyo"
                    ? "두 사람의 달빛이 어디로 흐르는지, 가장 궁금한 마음을 남겨 주세요."
                    : "사주가 어느 삶의 흐름을 비춰야 할지 질문을 남겨 주세요."}
              </p>
            </div>
          </div>
          {consultationMode === "sukuyo" ? (
            <div className={`${styles.sukuyoBranchNote} ${branchNoteUi}`}>
              <AssetImage className={styles.sukuyoBranchImage} src={fortuneTeaHouseAssets.consultModes.sukuyo} alt="27숙 인연의 흐름" />
              <div>
                <span>달빛 궁합의 방</span>
                <strong>{selectedCup.name} 위에 두 사람의 생년월일을 나란히 올립니다.</strong>
                <p>연이는 27숙의 거리와 관계 유형을 먼저 확인하고, 보이지 않는 마음은 단정하지 않은 채 지금 질문의 흐름만 살펴요.</p>
              </div>
            </div>
          ) : (
            <div className={styles.questionFieldGrid}>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaNickname">
                닉네임
                <input
                  id="fortuneTeaNickname"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="손님"
                  autoComplete="nickname"
                  disabled={isSubmitting}
                />
              </label>
              <fieldset className={styles.concernTopicGroup}>
                <legend>상담 주제</legend>
                <div>
                  {concernTopics.map((topic) => (
                    <button
                      className={styles.concernTopicButton}
                      data-selected={selectedCup.topic === topic ? "true" : "false"}
                      key={topic}
                      type="button"
                      disabled
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <p className={styles.topicSyncNotice}>{selectedCup.name} 상담은 {selectedCup.topic}으로 고정되어 있어요.</p>
              </fieldset>
            </div>
          )}

          {consultationMode === "tarot" ? (
            <fieldset className={styles.tarotSpreadSelector}>
              <legend>타로 스프레드</legend>
              <div className={styles.tarotSpreadOptions} role="radiogroup" aria-label="타로 스프레드 선택">
                {tarotSpreadOptions.map((option) => {
                  const selected = tarotSpread === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`${styles.tarotSpreadOption} ${tarotSpreadOptionUi}`}
                      data-selected={selected ? "true" : "false"}
                      onClick={() => setTarotSpread(option.id)}
                      disabled={isSubmitting}
                    >
                      <strong>{option.title} · {getFortuneTeaHouseConsultPriceLabel("tarot", option.id)}</strong>
                      <span>{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {consultationMode === "sukuyo" ? (
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaQuestion">
              짧은 질문
              <input
                id="fortuneTeaQuestion"
                className={`${styles.questionInput} ${questionInputUi}`}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="비워두면 선택한 흐름으로 질문을 만들게요."
                disabled={isSubmitting}
              />
              <span className={styles.sukuyoAutoQuestionHint}>
                비워두면 “{sukuyoAutoQuestionPreview}”로 열어볼게요.
              </span>
            </label>
          ) : (
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaQuestion">
              고민 내용
              <textarea
                id="fortuneTeaQuestion"
                className={`${styles.questionTextarea} ${questionTextareaUi}`}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={selectedCup.questionPlaceholder}
                rows={7}
                disabled={isSubmitting}
              />
            </label>
          )}
        </section>

        {consultationMode === "saju" ? (
        <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="sajuBirthSectionTitle">
          <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
            <span>C</span>
            <div>
              <h3 id="sajuBirthSectionTitle">사주가 읽을 나의 기본 흐름</h3>
              <p>사주 상담은 생년월일을 바탕으로 엽니다. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 읽습니다.</p>
            </div>
          </div>
          <section className={styles.profileLoadPanel} aria-label="내 프로필 불러오기">
            <div className={styles.profileLoadHeader}>
              <span>내 프로필 불러오기</span>
              <strong>저장된 프로필 카드로 상담 정보를 먼저 채울게요.</strong>
              <p>원본 프로필은 바뀌지 않고, 이번 상담에서만 살짝 고쳐 쓸 수 있어요.</p>
            </div>
            {profileLoading ? (
              <p className={styles.profileLoadNotice}>프로필 카드의 태어난 흐름을 확인하고 있어요.</p>
            ) : profileOptions.length > 1 ? (
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaProfileSelect">
                상담에 사용할 프로필
                <select
                  id="fortuneTeaProfileSelect"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={selectedProfileOptionId}
                  onChange={(event) => {
                    const nextProfile = profileOptions.find((option) => option.optionId === event.target.value);
                    if (nextProfile) applyProfileOption(nextProfile);
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">프로필 선택</option>
                  {profileOptions.map((option) => (
                    <option key={option.optionId} value={option.optionId}>
                      {option.name} · {option.birthDate} · {option.calendarType === "lunar" ? "음력" : "양력"}
                    </option>
                  ))}
                </select>
              </label>
            ) : profileOptions.length === 1 ? (
              <p className={styles.profileLoadNotice}>
                {profileOptions[0].name}님의 프로필을 불러왔어요. 출생시간을 모르면 시간 미상으로 진행할 수 있어요.
              </p>
            ) : (
              <p className={styles.profileLoadNotice}>저장된 프로필이 없어도 괜찮아요. 아래 정보로 사주 상담을 열 수 있어요.</p>
            )}
            {profileNotice ? <p className={styles.profileLoadNotice}>{profileNotice}</p> : null}
            {profileError ? <p className={styles.profileLoadError}>{profileError}</p> : null}
          </section>
          <div className={`${styles.questionFieldGrid} ${styles.birthInfoGrid}`}>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaBirthDate">
              생년월일
              <input id="fortuneTeaBirthDate" className={`${styles.questionInput} ${questionInputUi}`} {...birthDateTextInputProps(birthDate, (nextBirthDate) => setBirthDate(nextBirthDate))} disabled={isSubmitting} />
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaBirthTime">
              출생시간
              <input
                id="fortuneTeaBirthTime"
                className={`${styles.questionInput} ${questionInputUi}`}
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
              <span>출생시간 미상으로 진행</span>
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaGender">
              성별
              <select id="fortuneTeaGender" className={`${styles.questionInput} ${questionInputUi}`} value={gender} onChange={(event) => setGender(event.target.value)} disabled={isSubmitting}>
                <option value="">선택 안 함</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
              </select>
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaCalendarType">
              양력/음력
              <select
                id="fortuneTeaCalendarType"
                className={`${styles.questionInput} ${questionInputUi}`}
                value={calendarType}
                onChange={(event) => setCalendarType(event.target.value === "lunar" ? "lunar" : "solar")}
                disabled={isSubmitting}
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaBirthPlace">
              출생지
              <input
                id="fortuneTeaBirthPlace"
                className={`${styles.questionInput} ${questionInputUi}`}
                value={birthPlace}
                onChange={(event) => setBirthPlace(event.target.value)}
                placeholder="서울, 대한민국"
                disabled={isSubmitting}
              />
            </label>
            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaTimezone">
              시간대
              <input
                id="fortuneTeaTimezone"
                className={`${styles.questionInput} ${questionInputUi}`}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Asia/Seoul"
                disabled={isSubmitting}
              />
            </label>
          </div>
          <p className={styles.birthOptionalNotice}>
            사주는 보이는 정보만 읽습니다. 모르는 시간이나 기운은 연이가 지어내지 않아요.
          </p>
        </section>
        ) : consultationMode === "sajuCompatibility" ? (
          <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="sajuCompatBirthSectionTitle">
            <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
              <span>C</span>
              <div>
                <h3 id="sajuCompatBirthSectionTitle">두 사람의 명식을 나란히 놓아요</h3>
                <p>사주 궁합은 두 사람의 생년월일로 각각의 명식을 산출한 뒤, 두 흐름이 만나는 결을 함께 읽습니다. 출생시간을 모르면 시주 없이 큰 흐름 중심으로 봅니다.</p>
              </div>
            </div>

            <div className={styles.sukuyoPairGrid}>
              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>나의 명식</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatUserName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSajuCompatUserName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.user.name || ""}
                      onChange={(event) => updateSajuCompatPerson("user", { name: event.target.value })}
                      placeholder="나"
                      autoComplete="nickname"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatUserBirthDate">
                    생년월일
                    <input id="fortuneTeaSajuCompatUserBirthDate" className={`${styles.questionInput} ${questionInputUi}`} {...birthDateTextInputProps(sajuCompatInput.user.birthDate || "", (nextBirthDate) => updateSajuCompatPerson("user", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatUserBirthTime">
                    출생시간
                    <input
                      id="fortuneTeaSajuCompatUserBirthTime"
                      className={`${styles.questionInput} ${questionInputUi}`}
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
                    <span>출생시간 미상</span>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatUserCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSajuCompatUserCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.user.calendarType || "solar"}
                      onChange={(event) => updateSajuCompatPerson("user", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatUserGender">
                    성별
                    <select
                      id="fortuneTeaSajuCompatUserGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.user.gender || ""}
                      onChange={(event) => updateSajuCompatPerson("user", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>

              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>상대의 명식</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatPartnerName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSajuCompatPartnerName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.partner.name || ""}
                      onChange={(event) => updateSajuCompatPerson("partner", { name: event.target.value })}
                      placeholder="상대"
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatPartnerBirthDate">
                    생년월일
                    <input id="fortuneTeaSajuCompatPartnerBirthDate" className={`${styles.questionInput} ${questionInputUi}`} {...birthDateTextInputProps(sajuCompatInput.partner.birthDate || "", (nextBirthDate) => updateSajuCompatPerson("partner", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatPartnerBirthTime">
                    출생시간
                    <input
                      id="fortuneTeaSajuCompatPartnerBirthTime"
                      className={`${styles.questionInput} ${questionInputUi}`}
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
                    <span>출생시간 미상</span>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatPartnerCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSajuCompatPartnerCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.partner.calendarType || "solar"}
                      onChange={(event) => updateSajuCompatPerson("partner", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatPartnerGender">
                    성별
                    <select
                      id="fortuneTeaSajuCompatPartnerGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sajuCompatInput.partner.gender || ""}
                      onChange={(event) => updateSajuCompatPerson("partner", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div className={styles.sukuyoMetaGrid}>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatRelationship">
                관계 유형
                <select
                  id="fortuneTeaSajuCompatRelationship"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sajuCompatInput.relationshipType || "연인"}
                  onChange={(event) => updateSajuCompatMeta({ relationshipType: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoRelationshipTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatFocus">
                가장 궁금한 지점
                <select
                  id="fortuneTeaSajuCompatFocus"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sajuCompatInput.focus || "앞으로의 흐름"}
                  onChange={(event) => updateSajuCompatMeta({ focus: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoFocusOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSajuCompatSituation">
              지금 관계의 분위기 <span className={styles.optionalFieldMark}>선택</span>
              <textarea
                id="fortuneTeaSajuCompatSituation"
                className={`${styles.questionTextarea} ${styles.sukuyoSituationTextarea} ${questionTextareaUi}`}
                value={sajuCompatInput.currentSituation || ""}
                onChange={(event) => updateSajuCompatMeta({ currentSituation: event.target.value })}
                placeholder="요즘 서로의 속도가 달라 고민이에요."
                rows={3}
                disabled={isSubmitting}
              />
            </label>
            <p className={styles.birthOptionalNotice}>
              사주 궁합은 두 사람의 명식만 근거로 삼습니다. 모르는 시간이나 상대의 속마음은 연이가 지어내지 않아요.
            </p>
          </section>
        ) : consultationMode === "sukuyo" ? (
          <section className={`${styles.questionFormSection} ${questionSectionUi}`} aria-labelledby="sukuyoBirthSectionTitle">
            <div className={`${styles.questionSectionHeader} ${questionHeaderUi}`}>
              <span>C</span>
              <div>
                <h3 id="sukuyoBirthSectionTitle">달빛 궁합의 방에 놓을 두 사람</h3>
                <p>숙요점 궁합은 두 사람의 생년월일과 달력 기준으로 27숙의 거리와 관계 유형을 먼저 확인합니다.</p>
              </div>
            </div>

            <div className={styles.sukuyoPairGrid}>
              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>나의 달빛</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSukuyoUserName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.name || ""}
                      onChange={(event) => updateSukuyoPerson("user", { name: event.target.value })}
                      placeholder="나"
                      autoComplete="nickname"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserBirthDate">
                    생년월일
                    <input id="fortuneTeaSukuyoUserBirthDate" className={`${styles.questionInput} ${questionInputUi}`} {...birthDateTextInputProps(sukuyoInput.user.birthDate || "", (nextBirthDate) => updateSukuyoPerson("user", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSukuyoUserCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("user", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoUserGender">
                    성별
                    <select
                      id="fortuneTeaSukuyoUserGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.user.gender || ""}
                      onChange={(event) => updateSukuyoPerson("user", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>

              <article className={`${styles.sukuyoPersonCard} ${sukuyoCardUi}`}>
                <span>상대의 달빛</span>
                <div className={`${styles.questionFieldGrid} ${styles.sukuyoPersonFieldGrid}`}>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerName">
                    이름 또는 닉네임
                    <input
                      id="fortuneTeaSukuyoPartnerName"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.name || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { name: event.target.value })}
                      placeholder="상대"
                      autoComplete="off"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerBirthDate">
                    생년월일
                    <input id="fortuneTeaSukuyoPartnerBirthDate" className={`${styles.questionInput} ${questionInputUi}`} {...birthDateTextInputProps(sukuyoInput.partner.birthDate || "", (nextBirthDate) => updateSukuyoPerson("partner", { birthDate: nextBirthDate }))} disabled={isSubmitting} />
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerCalendar">
                    양력/음력
                    <select
                      id="fortuneTeaSukuyoPartnerCalendar"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.calendarType || "solar"}
                      onChange={(event) => updateSukuyoPerson("partner", { calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}
                      disabled={isSubmitting}
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                    </select>
                  </label>
                  <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoPartnerGender">
                    성별
                    <select
                      id="fortuneTeaSukuyoPartnerGender"
                      className={`${styles.questionInput} ${questionInputUi}`}
                      value={sukuyoInput.partner.gender || ""}
                      onChange={(event) => updateSukuyoPerson("partner", { gender: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                    </select>
                  </label>
                </div>
              </article>
            </div>

            <div className={styles.sukuyoMetaGrid}>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoRelationship">
                관계 유형
                <select
                  id="fortuneTeaSukuyoRelationship"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sukuyoInput.relationshipType || "연애 중"}
                  onChange={(event) => updateSukuyoMeta({ relationshipType: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoRelationshipTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoFocus">
                가장 궁금한 지점
                <select
                  id="fortuneTeaSukuyoFocus"
                  className={`${styles.questionInput} ${questionInputUi}`}
                  value={sukuyoInput.focus || "앞으로의 흐름"}
                  onChange={(event) => updateSukuyoMeta({ focus: event.target.value })}
                  disabled={isSubmitting}
                >
                  {sukuyoFocusOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={`${styles.questionLabel} ${questionLabelUi}`} htmlFor="fortuneTeaSukuyoSituation">
              지금 관계의 분위기 <span className={styles.optionalFieldMark}>선택</span>
              <textarea
                id="fortuneTeaSukuyoSituation"
                className={`${styles.questionTextarea} ${styles.sukuyoSituationTextarea} ${questionTextareaUi}`}
                value={sukuyoInput.currentSituation || ""}
                onChange={(event) => updateSukuyoMeta({ currentSituation: event.target.value })}
                placeholder="요즘 연락이 줄었어요."
                rows={3}
                disabled={isSubmitting}
              />
            </label>
            <p className={styles.birthOptionalNotice}>
              숙요점 궁합은 계산된 27숙과 관계 거리만 근거로 삼습니다. 모르는 마음과 결말은 연이가 단정하지 않아요.
            </p>
          </section>
        ) : (
          <p className={styles.birthOptionalNotice}>
            타로 상담으로 열면 출생정보 없이, 지금 질문과 선택된 카드의 상징만 깊게 읽습니다.
          </p>
        )}
        {error ? <p className={styles.questionError}>{error}</p> : null}
        {submitError ? (
          <section className={styles.questionSubmitErrorCard} role="alert" aria-live="assertive">
            <strong>찻잔의 향이 잠시 흐려졌어요.</strong>
            <p>{submitError}</p>
          </section>
        ) : null}
        <div className={`${styles.storyActions} ${actionRowUi}`}>
          <TeaHouseButton variant="ghost" onClick={onBack} disabled={isSubmitting}>
            찻잔 다시 고르기
          </TeaHouseButton>
          <TeaHouseButton type="submit" loading={isSubmitting}>
            {submitButtonLabel}
          </TeaHouseButton>
        </div>
      </form>
    </section>
  );
}
