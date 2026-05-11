"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
import DestinyBiasCoinModal from "./components/DestinyBiasCoinModal";
import DestinyBiasLoading from "./components/DestinyBiasLoading";
import DestinyBiasPhotocard from "./components/DestinyBiasPhotocard";
import DestinyBiasProgress from "./components/DestinyBiasProgress";
import DestinyBiasReportTabs from "./components/DestinyBiasReportTabs";
import styles from "./destiny-bias.module.css";
import { destinyBiasIntroCopy, destinyBiasLoadingMessages } from "./lib/destinyBiasCopy";
import { destinyBiasThemeChoices } from "./lib/destinyBiasTheme";
import { useDestinyBiasTouchGuard } from "./lib/destinyBiasTouchGuard";
import type { DestinyBiasApiResult, DestinyBiasResultViewModel, PersonInputState, SavedCard, ThemePreset } from "./lib/types";

const DESTINY_BIAS_ART = "/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp";
const DEFAULT_ANALYZE_COST = 50;
const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";

const ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const DEFAULT_THEMES: ThemePreset[] = [
  { key: "moonlight_neon", name: "Aurora Glass", premium: false },
  { key: "gold_nocturne", name: "Chrome Star", premium: true },
  { key: "coral_haze", name: "Pink Top-kku", premium: false },
  { key: "skywave_mint", name: "Midnight Stage", premium: true },
  { key: "jade_orbit", name: "Soft Fan Letter", premium: true },
];

const INITIAL_ME: PersonInputState = {
  name: "나",
  gender: "F",
  calendarType: "solar",
  year: 1998,
  month: 8,
  day: 18,
  hour: 14,
  minute: 0,
  unknownTime: false,
};

const INITIAL_BIAS: PersonInputState = {
  name: "최애",
  gender: "M",
  calendarType: "solar",
  year: 1997,
  month: 5,
  day: 7,
  hour: 19,
  minute: 30,
  unknownTime: false,
};

type StoredProfileBirth = {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
  calType?: unknown;
  calendarType?: unknown;
  unknownTime?: unknown;
};

type StoredDestinyProfile = {
  id?: unknown;
  name?: unknown;
  gender?: unknown;
  birth?: StoredProfileBirth | null;
};

const SAMPLE_RESULT: DestinyBiasResultViewModel = {
  score: 88,
  grade: "A",
  gradeLabel: "상생 부스트 ON",
  mainCatchphrase: "운명적 서포터",
  userEnergy: {
    dayMaster: "정화",
    mainElement: "화",
    fandomPosition: "무대를 밝히는 응원 디렉터",
    description: "감정 파장을 빠르게 읽고, 최애의 리듬을 타이밍 좋게 밀어주는 에너지를 갖고 있어요.",
  },
  biasEnergy: {
    name: "MY BIAS",
    dayMaster: "갑목",
    dominantElement: "목",
    missingElements: ["금", "수"],
    description: "확장성은 뛰어나지만 집중의 날에는 차분한 정리 에너지가 필요해요.",
  },
  synergy: {
    relationType: "상생",
    title: "상생 시너지 라인",
    description: "당신의 열정 에너지가 최애의 성장 모멘텀을 밀어주는 흐름이에요.",
  },
  yongshinMatch: {
    title: "용신 매칭 성공",
    matchedElements: ["화", "금"],
    description: "오늘은 감정 표현을 짧고 강하게 전달할수록 공명 효율이 올라갑니다.",
  },
  todayAction: {
    keyword: "주접력 폭발",
    actions: [
      "라이브 클립 한 장면을 골라 한 줄 감상 업로드",
      "응원 문구를 짧게 적어 저장용 포토카드와 함께 공유",
      "팬아트 혹은 밈 1개로 분위기 열기",
    ],
    warning: "과몰입이 올라오면 10초 호흡 후 다시 응원 루틴으로 돌아오세요.",
  },
  sats: {
    title: "10초 SATS 응원 명상",
    script: "눈을 감고 무대 조명이 켜지는 장면을 10초 상상하세요. 나의 응원이 최애의 스테이지를 밝히는 장면을 또렷하게 떠올려요.",
  },
  card: {
    theme: "Aurora Glass",
    title: "운명적 서포터",
    subtitle: "상생 부스트 ON",
    hashtags: ["#코드데스티니", "#최애운명", "#덕질모드ON"],
  },
  rawReport: "샘플 카드입니다. 실제 분석 시 내부 명식 엔진 결과를 기반으로 개인화된 리포트가 생성됩니다.",
};

function readLocalToken() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch {
    return "";
  }
}

function withApiBase(apiBase: string, path: string) {
  if (!apiBase) return path;
  return `${apiBase}${path}`;
}

function toBirthPayload(input: PersonInputState) {
  return {
    calendarType: input.calendarType,
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: Number(input.hour),
    minute: Number(input.minute),
    unknownTime: Boolean(input.unknownTime),
  };
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function toOptionalClampedInt(value: unknown, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return clampInt(num, min, max);
}

function parseStoredProfiles(raw: string | null) {
  if (!raw) return [] as StoredDestinyProfile[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredDestinyProfile[]) : [];
  } catch {
    return [];
  }
}

function toStoredCalendarType(raw: unknown, fallback: PersonInputState["calendarType"]) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "solar" || value === "lunar" || value === "lunar_leap") return value;
  return fallback;
}

function toStoredGender(raw: unknown, fallback: PersonInputState["gender"]) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "M" || value === "F" || value === "OTHER") return value;
  return fallback;
}

function readActiveDestinyProfileFromStorage() {
  if (typeof window === "undefined") return null;

  const authUser = readSanitizedAuthUser();
  const scope = resolveAuthScopeFromUser(authUser);
  const listKeys = scope
    ? [`${PROFILE_NS}.list::${scope}`, `${PROFILE_NS}.list`]
    : [`${PROFILE_NS}.list`];
  const currentKeys = scope
    ? [`${PROFILE_NS}.current::${scope}`, `${PROFILE_NS}.current`]
    : [`${PROFILE_NS}.current`];

  let profiles: StoredDestinyProfile[] = [];
  for (const key of listKeys) {
    profiles = parseStoredProfiles(localStorage.getItem(key));
    if (profiles.length) break;
  }
  if (!profiles.length) return null;

  let currentId = "";
  for (const key of currentKeys) {
    const value = String(localStorage.getItem(key) || "").trim();
    if (value) {
      currentId = value;
      break;
    }
  }

  const active = currentId
    ? profiles.find((profile) => String(profile?.id || "") === currentId)
    : null;

  return active || profiles[0] || null;
}

function applyStoredProfileToPersonInput(profile: StoredDestinyProfile, previous: PersonInputState): PersonInputState {
  const birth = (profile?.birth || {}) as StoredProfileBirth;
  const nextName = typeof profile?.name === "string" && profile.name.trim()
    ? profile.name.trim().slice(0, 24)
    : previous.name;

  return {
    ...previous,
    name: nextName,
    gender: toStoredGender(profile?.gender, previous.gender),
    calendarType: toStoredCalendarType(birth.calType ?? birth.calendarType, previous.calendarType),
    year: toOptionalClampedInt(birth.year, 1900, 2100) ?? previous.year,
    month: toOptionalClampedInt(birth.month, 1, 12) ?? previous.month,
    day: toOptionalClampedInt(birth.day, 1, 31) ?? previous.day,
    hour: toOptionalClampedInt(birth.hour, 0, 23) ?? previous.hour,
    minute: toOptionalClampedInt(birth.minute, 0, 59) ?? previous.minute,
    unknownTime: typeof birth.unknownTime === "boolean" ? birth.unknownTime : previous.unknownTime,
  };
}

function formatKoreanDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relationTypeFromRaw(rawRelation: string) {
  if (rawRelation === "same") return "동일오행" as const;
  if (rawRelation === "generates" || rawRelation === "generated_by") return "상생" as const;
  if (rawRelation === "controls" || rawRelation === "controlled_by") return "상극" as const;
  return "중립" as const;
}

function gradeLabelFromScore(score: number) {
  if (score >= 90) return "전광판급 공명";
  if (score >= 80) return "상생 부스트 ON";
  if (score >= 70) return "무대 합 좋음";
  if (score >= 60) return "감정 템포 조율";
  return "리듬 재정렬 필요";
}

function titleizeElement(key: string) {
  return ELEMENT_LABELS[String(key || "")] || String(key || "-");
}

function fallbackAction(keyword: string) {
  return [
    `${keyword} 포인트를 살려 오늘의 응원 문장 한 줄 남기기`,
    "최애 관련 저장해둔 사진 1장을 꺼내 포토카드와 함께 기록",
    "응원 루틴 종료 후 10초 호흡으로 감정 밸런스 맞추기",
  ];
}

function mapResultViewModel(result: DestinyBiasApiResult, selectedThemeName: string): DestinyBiasResultViewModel {
  const canonical = result?.canonical || {};
  const user = canonical?.user || {};
  const bias = canonical?.bias || {};
  const analysis = canonical?.analysis || {};
  const todayGuide = analysis?.todayGuide || {};

  const score = Number(result?.totalScore || analysis?.totalScore || 0);
  const grade = String(result?.grade || analysis?.grade || "C");
  const relationRaw = String(result?.relation || analysis?.relation || "neutral");
  const relationType = relationTypeFromRaw(relationRaw);

  const supplyMatches = Array.isArray(analysis?.supplyMatches) ? analysis.supplyMatches : [];
  const missingElementsRaw = Array.isArray(bias?.fiveElements?.lacking) ? bias.fiveElements.lacking : [];
  const missingElements = missingElementsRaw.map((item: string) => titleizeElement(item));
  const matchedElements = supplyMatches.map((item: string) => titleizeElement(item));
  const dominantElement = titleizeElement(String(bias?.fiveElements?.strongest || ""));

  const todayKeyword = String(todayGuide?.userTodayTenGod || "응원 리듬");
  const hashtags = Array.isArray(result?.sharePayload?.hashtags) && result.sharePayload.hashtags.length
    ? result.sharePayload.hashtags
    : ["#코드데스티니", "#최애운명", "#덕질루틴"];

  return {
    score,
    grade,
    gradeLabel: gradeLabelFromScore(score),
    mainCatchphrase: String(result?.card?.title || "운명적 서포터"),
    userEnergy: {
      dayMaster: String(user?.dayMaster?.stemKo || user?.dayMaster?.stem || "미상"),
      mainElement: String(user?.dayMaster?.elementKo || titleizeElement(user?.dayMaster?.element) || "미상"),
      fandomPosition: String(result?.role?.title || "감정의 미세 신호를 읽는 공감 큐레이터"),
      description: `${String(user?.name || "당신")}님의 응원 파장은 ${String(result?.relationLabel || "중립 파동")} 흐름에서 안정적으로 작동해요.`,
    },
    biasEnergy: {
      name: String(bias?.name || "최애"),
      dayMaster: String(bias?.dayMaster?.stemKo || bias?.dayMaster?.stem || ""),
      dominantElement,
      missingElements,
      description: missingElements.length
        ? `최애 에너지에서 ${missingElements.join(", ")} 결을 보완하면 시너지가 더 또렷해져요.`
        : "오행 밸런스가 균형적인 흐름입니다.",
    },
    synergy: {
      relationType,
      title: String(result?.relationLabel || "오늘의 공명 시그널"),
      description: `관계 축은 ${relationType} 패턴으로 읽히며, 오늘은 ${todayKeyword} 리듬을 활용할수록 반응이 좋아요.`,
    },
    yongshinMatch: {
      title: analysis?.yongshinMatched ? "용신 매칭 활성" : "용신 보완 필요",
      matchedElements,
      description: matchedElements.length
        ? `당신의 강한 오행(${matchedElements.join(", ")})이 최애의 부족 결을 채우고 있어요.`
        : "오늘은 감정 표현을 짧고 선명하게 전달하는 방식이 더 유리합니다.",
    },
    todayAction: {
      keyword: todayKeyword,
      actions: todayGuide?.action ? [String(todayGuide.action), ...fallbackAction(todayKeyword).slice(0, 2)] : fallbackAction(todayKeyword),
      warning: Array.isArray(result?.warnings) && result.warnings.length
        ? String(result.warnings[0])
        : "응원 에너지가 과열되면 잠깐 쉬어가며 내 리듬을 다시 맞춰주세요.",
    },
    sats: {
      title: "10초 SATS 응원 명상",
      script: "포토카드를 바라보며 10초 동안 최애의 무대 조명이 켜지는 장면을 상상해보세요. 나의 응원이 빛으로 전달되는 감각에만 집중합니다.",
    },
    card: {
      theme: selectedThemeName,
      title: String(result?.card?.title || "운명적 서포터"),
      subtitle: String(result?.card?.headline || "상생 부스트 ON"),
      hashtags,
    },
    rawReport: String(result?.reportText || ""),
  };
}

function normalizeThemes(source: ThemePreset[]) {
  if (!Array.isArray(source) || source.length === 0) return DEFAULT_THEMES;
  const fallbackByKey = Object.fromEntries(destinyBiasThemeChoices.map((item) => [item.key, item.name]));
  return source.map((theme) => ({
    ...theme,
    name: fallbackByKey[theme.key] || theme.name,
  }));
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
  maxLength = 24,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1 text-sm text-white/85">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
      />
    </label>
  );
}

function DateTimeEditor({
  value,
  onChange,
}: {
  value: PersonInputState;
  onChange: (next: PersonInputState) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-sm text-white/85">
          <span>연도</span>
          <input
            type="number"
            value={value.year}
            min={1900}
            max={2100}
            onChange={(event) => onChange({ ...value, year: clampInt(Number(event.target.value), 1900, 2100) })}
            className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
          />
        </label>
        <label className="grid gap-1 text-sm text-white/85">
          <span>월</span>
          <input
            type="number"
            value={value.month}
            min={1}
            max={12}
            onChange={(event) => onChange({ ...value, month: clampInt(Number(event.target.value), 1, 12) })}
            className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
          />
        </label>
        <label className="grid gap-1 text-sm text-white/85">
          <span>일</span>
          <input
            type="number"
            value={value.day}
            min={1}
            max={31}
            onChange={(event) => onChange({ ...value, day: clampInt(Number(event.target.value), 1, 31) })}
            className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm text-white/85">
          <span>시</span>
          <input
            type="number"
            value={value.hour}
            min={0}
            max={23}
            disabled={value.unknownTime}
            onChange={(event) => onChange({ ...value, hour: clampInt(Number(event.target.value), 0, 23) })}
            className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-fuchsia-200/80"
          />
        </label>
        <label className="grid gap-1 text-sm text-white/85">
          <span>분</span>
          <input
            type="number"
            value={value.minute}
            min={0}
            max={59}
            disabled={value.unknownTime}
            onChange={(event) => onChange({ ...value, minute: clampInt(Number(event.target.value), 0, 59) })}
            className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none disabled:opacity-50 focus:border-fuchsia-200/80"
          />
        </label>
      </div>
    </>
  );
}

export default function DestinyBiasClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const [uiStep, setUiStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [meInput, setMeInput] = useState<PersonInputState>(INITIAL_ME);
  const [biasInput, setBiasInput] = useState<PersonInputState>(INITIAL_BIAS);
  const [biasGroup, setBiasGroup] = useState("");
  const [biasImagePreview, setBiasImagePreview] = useState("");
  const [cardStickers, setCardStickers] = useState({
    heart: true,
    star: true,
    lightstick: false,
    text: "",
  });
  const [activeThemeKey, setActiveThemeKey] = useState("moonlight_neon");

  const [resultRaw, setResultRaw] = useState<DestinyBiasApiResult | null>(null);
  const [resultVm, setResultVm] = useState<DestinyBiasResultViewModel | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [token, setToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);

  const [coinModal, setCoinModal] = useState({
    open: false,
    title: "안내",
    message: "",
    requiredCoins: 0,
    loginRequired: false,
  });

  const [isLowSpec, setIsLowSpec] = useState(false);

  const themes = useMemo(
    () => normalizeThemes(resultRaw?.themes?.length ? resultRaw.themes : DEFAULT_THEMES),
    [resultRaw?.themes],
  );

  const selectedTheme = useMemo(() => {
    return themes.find((item) => item.key === activeThemeKey) || themes[0] || DEFAULT_THEMES[0];
  }, [activeThemeKey, themes]);

  const canUsePremiumTheme = Boolean(resultRaw?.gates?.canUsePremiumTheme);
  const canSaveCollection = Boolean(resultRaw?.gates?.canSaveCollection);
  const currentAnalyzeCost = Number(resultRaw?.pricing?.perUseCoins || DEFAULT_ANALYZE_COST);

  const { guardHandlers, shouldBlockClick } = useDestinyBiasTouchGuard();

  const ogImagePath = useMemo(() => {
    if (!resultRaw) return "/api/destiny-bias/og";
    const params = new URLSearchParams({
      title: resultRaw?.card?.title || "최애운명 카드",
      score: String(resultRaw?.totalScore || 0),
      grade: String(resultRaw?.grade || "B"),
      relation: String(resultRaw?.relationLabel || "운명 공명"),
      price: String(currentAnalyzeCost),
    });
    return `/api/destiny-bias/og?${params.toString()}`;
  }, [currentAnalyzeCost, resultRaw]);

  useEffect(() => {
    const localToken = readLocalToken();
    const user = readSanitizedAuthUser();
    setToken(localToken);
    setIsLoggedIn(Boolean(localToken || user?.id || user?.userId));
  }, []);

  useEffect(() => {
    const syncFromStoredProfile = (profile?: StoredDestinyProfile | null) => {
      const activeProfile = profile || readActiveDestinyProfileFromStorage();
      if (!activeProfile) return;
      setMeInput((previous) => applyStoredProfileToPersonInput(activeProfile, previous));
    };

    syncFromStoredProfile();

    const onProfileChanged = (event: Event) => {
      const custom = event as CustomEvent<StoredDestinyProfile | null>;
      const detail = custom?.detail && typeof custom.detail === "object"
        ? (custom.detail as StoredDestinyProfile)
        : null;
      syncFromStoredProfile(detail);
    };

    document.addEventListener("destinyProfileChanged", onProfileChanged as EventListener);
    return () => {
      document.removeEventListener("destinyProfileChanged", onProfileChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const memory = Number((navigator as any).deviceMemory || 8);
    const core = Number(navigator.hardwareConcurrency || 8);
    setIsLowSpec(memory <= 4 || core <= 4);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!analyzing) {
      setLoadingMessageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % destinyBiasLoadingMessages.length);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [analyzing]);

  useEffect(() => {
    if (!coinModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [coinModal.open]);

  useEffect(() => {
    return () => {
      if (biasImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(biasImagePreview);
      }
    };
  }, [biasImagePreview]);

  const loadCards = useCallback(async () => {
    if (!isLoggedIn) {
      setCards([]);
      return;
    }

    setCardsLoading(true);
    try {
      const response = await authFetch("/api/destiny-bias/cards?limit=12", {
        method: "GET",
      }, {
        apiBase,
      });

      if (!response.ok) {
        setCards([]);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setCards(Array.isArray(payload?.items) ? payload.items : []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [apiBase, isLoggedIn]);

  useEffect(() => {
    loadCards().catch(() => null);
  }, [loadCards]);

  const goBackToMain = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  const handleBiasImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (biasImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(biasImagePreview);
    }
    setBiasImagePreview(URL.createObjectURL(file));
  }, [biasImagePreview]);

  const validateStep = useCallback((step: number) => {
    if (step === 1) {
      if (!String(meInput.name || "").trim()) return "닉네임을 입력해 주세요.";
      if (!Number.isFinite(Number(meInput.year))) return "생년을 확인해 주세요.";
    }

    if (step === 2) {
      if (!String(biasInput.name || "").trim()) return "최애 이름을 입력해 주세요.";
      if (!Number.isFinite(Number(biasInput.year))) return "최애 생년을 확인해 주세요.";
    }

    return "";
  }, [biasInput.name, biasInput.year, meInput.name, meInput.year]);

  const openCoinNotice = useCallback((params: {
    title: string;
    message: string;
    requiredCoins?: number;
    loginRequired?: boolean;
  }) => {
    setCoinModal({
      open: true,
      title: params.title,
      message: params.message,
      requiredCoins: Number(params.requiredCoins || 0),
      loginRequired: Boolean(params.loginRequired),
    });
  }, []);

  const analyze = useCallback(async () => {
    if (analyzing) return;

    if (!isLoggedIn) {
      openCoinNotice({
        title: "로그인이 필요해요",
        message: "최애운명 분석은 계정과 코인 상태를 확인한 뒤 진행돼요. 로그인 후 이어서 실행해 주세요.",
        requiredCoins: DEFAULT_ANALYZE_COST,
        loginRequired: true,
      });
      return;
    }

    setAnalyzing(true);
    setUiStep(4);
    setError("");

    try {
      const response = await fetch(withApiBase(apiBase, "/api/destiny-bias/analyze"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user: {
            name: meInput.name,
            gender: meInput.gender,
            birth: toBirthPayload(meInput),
          },
          bias: {
            name: biasInput.name,
            group: biasGroup,
            gender: biasInput.gender,
            birth: toBirthPayload(biasInput),
          },
          themeKey: activeThemeKey,
        }),
      });

      const raw = await response.text();
      let payload: any = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = {};
      }

      if (!response.ok || !payload?.ok) {
        if (response.status === 402 || payload?.code === "INSUFFICIENT_BALANCE") {
          openCoinNotice({
            title: "코인이 조금 부족해요",
            message: "오늘의 포토카드를 완성하려면 코인 충전이 필요해요. 충전 후 바로 다시 이어서 분석할 수 있어요.",
            requiredCoins: Number(payload?.requiredCoins || DEFAULT_ANALYZE_COST),
          });
        } else if (response.status === 401) {
          openCoinNotice({
            title: "로그인 세션이 만료됐어요",
            message: "다시 로그인하면 방금 입력한 정보 그대로 이어서 분석할 수 있어요.",
            requiredCoins: DEFAULT_ANALYZE_COST,
            loginRequired: true,
          });
        }
        throw new Error(String(payload?.message || payload?.error || "최애운명 분석에 실패했습니다."));
      }

      const rawResult = payload.result as DestinyBiasApiResult;
      const selectedThemeName = (themes.find((theme) => theme.key === (rawResult?.card?.themeKey || activeThemeKey))?.name || selectedTheme?.name || "Aurora Glass");
      const viewModel = mapResultViewModel(rawResult, selectedThemeName);

      setResultRaw(rawResult);
      setResultVm(viewModel);

      if (rawResult?.card?.themeKey) {
        setActiveThemeKey(String(rawResult.card.themeKey));
      }

      setUiStep(5);
      setToast("오늘의 최애운명 카드가 완성됐어요 ✨");
      setCardStickers((prev) => ({ ...prev, text: prev.text || "덕질모드 ON" }));
      loadCards().catch(() => null);
    } catch (analysisError) {
      setUiStep(3);
      setResultRaw(null);
      setResultVm(null);
      setError(analysisError instanceof Error ? analysisError.message : "분석 요청 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, [activeThemeKey, analyzing, apiBase, biasGroup, biasInput, isLoggedIn, loadCards, meInput, openCoinNotice, selectedTheme?.name, themes, token]);

  const saveCard = useCallback(async () => {
    if (!resultVm || !resultRaw || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await authFetch("/api/destiny-bias/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resultVm.card.title,
          headline: resultVm.mainCatchphrase,
          summary: `${resultVm.synergy.title} · ${resultVm.todayAction.keyword}`,
          themeKey: activeThemeKey,
          score: resultVm.score,
          grade: resultVm.grade,
          reportText: resultVm.rawReport,
          canonical: resultRaw.canonical,
          sharePayload: resultRaw.sharePayload,
        }),
      }, {
        apiBase,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.message || payload?.error || "카드 저장에 실패했습니다."));
      }

      const item = payload?.item as SavedCard;
      if (item?.id) {
        setCards((prev) => [item, ...prev.filter((card) => card.id !== item.id)]);
      }
      setToast("컬렉션에 저장했어요 💎");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "카드 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [activeThemeKey, apiBase, resultRaw, resultVm, saving]);

  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`/api/destiny-bias/cards/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }, {
        apiBase,
      });
      if (!response.ok) return;
      setCards((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // no-op
    }
  }, [apiBase]);

  const downloadCardImage = useCallback(async () => {
    const target = document.getElementById("destiny-bias-card-preview");
    if (!target) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(target, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `destiny-bias-${Date.now()}.png`;
      link.click();
      setToast("포토카드를 저장했어요 📸");
    } catch {
      setError("이미지 저장 중 오류가 발생했습니다.");
    }
  }, []);

  const shareCard = useCallback(async () => {
    if (!resultVm) return;

    const shareText = [
      `${resultVm.mainCatchphrase} · ${resultVm.gradeLabel}`,
      `오늘의 덕질 키워드: ${resultVm.todayAction.keyword}`,
      resultVm.card.hashtags.join(" "),
      typeof window !== "undefined" ? window.location.href : "",
    ].filter(Boolean).join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "최애운명 포토카드",
          text: shareText,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setToast("공유 문구를 복사했어요 🔗");
    } catch {
      setError("공유 준비 중 오류가 발생했습니다.");
    }
  }, [resultVm]);

  const handlePrimaryIntro = useCallback(() => {
    setUiStep(1);
    setError("");
  }, []);

  const handleSecondaryIntro = useCallback(() => {
    setResultVm(SAMPLE_RESULT);
    setResultRaw(null);
    setUiStep(5);
  }, []);

  const nextStep = useCallback((target: 1 | 2 | 3) => {
    const message = validateStep(target);
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setUiStep((target + 1) as 2 | 3 | 4);
  }, [validateStep]);

  const onSafeClick = useCallback((callback: () => void) => {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      if (shouldBlockClick()) {
        event.preventDefault();
        return;
      }
      callback();
    };
  }, [shouldBlockClick]);

  const particleCount = reduceMotion || isLowSpec ? 4 : 10;

  return (
    <section className={`relative min-h-[100dvh] w-screen overflow-x-hidden text-white ${styles.destinyBiasBg}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute inset-0 ${styles.stageDots}`} />
        <div className={`absolute left-1/2 top-0 h-[62vh] w-[120vw] -translate-x-1/2 ${styles.spotlight}`} />
        <img src={DESTINY_BIAS_ART} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[2px]" loading="lazy" aria-hidden />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: particleCount }).map((_, index) => (
          <span
            key={index}
            className={`absolute ${styles.floatParticle}`}
            style={{
              left: `${8 + ((index * 9) % 86)}%`,
              top: `${12 + ((index * 7) % 74)}%`,
              animationDuration: `${3.8 + (index % 4) * 0.7}s`,
            }}
          >
            {index % 3 === 0 ? "⭐" : index % 3 === 1 ? "💖" : "✨"}
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-5 md:px-6 md:pb-16 md:pt-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goBackToMain}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-sm font-semibold text-white/90 backdrop-blur-xl"
            aria-label="메인으로 돌아가기"
          >
            ← 돌아가기
          </button>
          <span className="rounded-full border border-fuchsia-200/40 bg-fuchsia-300/15 px-3 py-1 text-xs font-semibold text-fuchsia-50">
            {destinyBiasIntroCopy.coinBadge}
          </span>
        </div>

        <AnimatePresence>
          {toast ? (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-3 inline-flex rounded-full border border-cyan-200/45 bg-cyan-300/15 px-4 py-2 text-xs font-semibold text-cyan-50"
            >
              {toast}
            </motion.p>
          ) : null}
        </AnimatePresence>

        {uiStep === 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 md:grid-cols-2 md:items-center">
            <div className="relative">
              <div className={`pointer-events-none absolute -inset-5 rounded-[36px] bg-fuchsia-400/25 blur-3xl ${styles.heroGlow}`} aria-hidden />
              <div className={`relative overflow-hidden rounded-[32px] p-3 ${styles.chromeBorder}`}>
                <img src={DESTINY_BIAS_ART} alt="최애운명 대표 아트" className="h-[46vh] min-h-[340px] w-full rounded-[24px] object-cover md:h-[72vh]" />
                <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/25 bg-black/35 px-4 py-3 backdrop-blur-xl">
                  <p className="text-xs font-semibold tracking-[0.14em] text-cyan-100/90">K-POP DESTINY PHOTOCARD EXPERIENCE</p>
                  <p className="mt-2 text-sm font-semibold text-white/95">사자가 돼지 최애를 응원하는 포토카드 세계관으로 입장하세요.</p>
                </div>
              </div>
            </div>

            <div className={`rounded-[30px] p-6 md:p-7 ${styles.glass}`}>
              <p className="text-xs font-semibold tracking-[0.14em] text-fuchsia-100/90">MY DESTINY BIAS</p>
              <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{destinyBiasIntroCopy.title}</h1>
              <p className="mt-1 text-lg font-semibold text-cyan-100/90">{destinyBiasIntroCopy.subtitle}</p>
              <p className="mt-4 text-base font-semibold text-white/90">{destinyBiasIntroCopy.lead}</p>
              <p className="mt-3 text-sm leading-7 text-white/85">{destinyBiasIntroCopy.description}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  animate={reduceMotion ? undefined : { boxShadow: ["0 0 16px rgba(236,72,153,0.45)", "0 0 34px rgba(34,211,238,0.45)", "0 0 16px rgba(236,72,153,0.45)"] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  onClick={handlePrimaryIntro}
                  className={`min-h-11 rounded-full border border-pink-300/60 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 text-base font-bold text-white ${styles.neonButton}`}
                >
                  {destinyBiasIntroCopy.ctaPrimary}
                </motion.button>

                <button
                  type="button"
                  onClick={handleSecondaryIntro}
                  className="min-h-11 rounded-full border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white/90"
                >
                  {destinyBiasIntroCopy.ctaSecondary}
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {uiStep > 0 && (
          <div className="space-y-4">
            <DestinyBiasProgress current={uiStep === 5 ? 5 : uiStep} />

            {uiStep === 1 && (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">내 응원 에너지 등록</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">
                  사주의 중심인 일간과 오행을 계산해서 내가 최애에게 어떤 응원 에너지를 주는지 분석해요.
                </p>
                <p className="mt-1 text-xs text-cyan-100/85">저장된 프로필 카드가 있으면 내 정보가 자동으로 채워집니다.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <TextInput label="닉네임" value={meInput.name} placeholder="응원 닉네임" onChange={(name) => setMeInput({ ...meInput, name })} />
                  <label className="grid gap-1 text-sm text-white/85">
                    <span>양력/음력</span>
                    <select
                      value={meInput.calendarType}
                      onChange={(event) => setMeInput({ ...meInput, calendarType: event.target.value as PersonInputState["calendarType"] })}
                      className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                      <option value="lunar_leap">음력(윤달)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 space-y-3">
                  <DateTimeEditor value={meInput} onChange={setMeInput} />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-white/85">
                    <span>성별 (선택)</span>
                    <select
                      value={meInput.gender}
                      onChange={(event) => setMeInput({ ...meInput, gender: event.target.value as PersonInputState["gender"] })}
                      className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                    >
                      <option value="F">여성</option>
                      <option value="M">남성</option>
                      <option value="OTHER">선택 안 함</option>
                    </select>
                  </label>
                </div>
              </section>
            )}

            {uiStep === 2 && (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">나의 최애 프로필 등록</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">
                  최애의 출생시간을 몰라도 괜찮아요. 시간 미상 모드에서는 년주, 월주, 일주 중심으로 분석해요.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <TextInput label="최애 이름" value={biasInput.name} placeholder="예: MY BIAS" onChange={(name) => setBiasInput({ ...biasInput, name })} />
                  <TextInput label="그룹명 또는 카테고리" value={biasGroup} placeholder="예: 아이돌 그룹 / 배우" onChange={setBiasGroup} maxLength={40} />
                </div>

                <div className="mt-3 space-y-3">
                  <label className="grid gap-1 text-sm text-white/85">
                    <span>양력/음력</span>
                    <select
                      value={biasInput.calendarType}
                      onChange={(event) => setBiasInput({ ...biasInput, calendarType: event.target.value as PersonInputState["calendarType"] })}
                      className="min-h-11 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                    >
                      <option value="solar">양력</option>
                      <option value="lunar">음력</option>
                      <option value="lunar_leap">음력(윤달)</option>
                    </select>
                  </label>

                  <DateTimeEditor value={biasInput} onChange={setBiasInput} />

                  <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 text-sm text-white/90">
                    <input
                      type="checkbox"
                      checked={biasInput.unknownTime}
                      onChange={(event) => setBiasInput({ ...biasInput, unknownTime: event.target.checked })}
                      className="h-4 w-4 accent-fuchsia-400"
                    />
                    출생시간 모름
                  </label>

                  <label className="grid gap-1 text-sm text-white/85">
                    <span>최애 이미지 업로드 (선택)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBiasImageUpload}
                      className="min-h-11 rounded-xl border border-dashed border-white/30 bg-black/20 px-3 py-2 text-sm text-white/85"
                    />
                  </label>

                  {biasImagePreview ? (
                    <div className="overflow-hidden rounded-2xl border border-white/20">
                      <img src={biasImagePreview} alt="업로드한 최애 미리보기" className="h-40 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {uiStep === 3 && (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">카드 테마 선택</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">포토카드 무드를 고르면 분석이 끝난 뒤 결과 카드에 반영돼요.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {themes.map((theme) => {
                    const isDisabled = Boolean(theme.premium && !canUsePremiumTheme);
                    const isActive = activeThemeKey === theme.key;
                    const fallback = destinyBiasThemeChoices.find((item) => item.key === theme.key);
                    return (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) setActiveThemeKey(theme.key);
                        }}
                        disabled={isDisabled}
                        className={`overflow-hidden rounded-2xl border text-left transition ${
                          isActive
                            ? "border-fuchsia-200/80 bg-fuchsia-300/15"
                            : "border-white/20 bg-black/25"
                        } ${isDisabled ? "opacity-45" : "hover:border-cyan-200/70"}`}
                      >
                        <div
                          className="h-24"
                          style={{
                            background: theme.palette?.bg || fallback?.preview || "linear-gradient(135deg,#8b5cf6,#22d3ee)",
                          }}
                        />
                        <div className="p-3">
                          <p className="text-sm font-bold text-white">{theme.name}</p>
                          <p className="mt-1 text-xs text-white/75">{fallback?.description || "포토카드 테마"}</p>
                          <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{theme.premium ? "PREMIUM" : "FREE"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-fuchsia-200/35 bg-fuchsia-300/10 p-4 text-sm text-fuchsia-50">
                  {canUsePremiumTheme ? "프리미엄 테마가 활성화되어 있어요." : "프리미엄 테마는 해금 전 미리보기만 가능합니다."}
                </div>
              </section>
            )}

            {uiStep === 4 && (
              <DestinyBiasLoading
                currentMessage={destinyBiasLoadingMessages[loadingMessageIndex]}
                progress={(loadingMessageIndex + 1) / destinyBiasLoadingMessages.length}
              />
            )}

            {uiStep === 5 && resultVm && (
              <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className={`rounded-[28px] p-5 ${styles.glass}`}>
                    <p className="text-xs font-semibold tracking-[0.14em] text-cyan-100/90">RESULT</p>
                    <h2 className="mt-2 text-2xl font-black">오늘의 최애운명 카드가 완성됐어요</h2>
                    <p className="mt-2 text-sm leading-7 text-white/80">나의 응원이 최애의 무대 조명을 밝히는 날. 포토카드를 저장하고 공유해보세요.</p>
                  </div>

                  <DestinyBiasPhotocard
                    vm={resultVm}
                    themeLabel={selectedTheme?.name || resultVm.card.theme}
                    imageSrc={biasImagePreview || DESTINY_BIAS_ART}
                    coinCost={currentAnalyzeCost}
                    stickers={cardStickers}
                  />

                  <div className={`rounded-[28px] p-4 ${styles.glass}`}>
                    <h3 className="text-base font-bold text-white">스티커 커스텀 에디터</h3>
                    <p className="mt-1 text-xs text-white/75">포토카드 장식을 선택해 탑꾸 스타일로 저장해보세요.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCardStickers((prev) => ({ ...prev, heart: !prev.heart }))}
                        className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                          cardStickers.heart
                            ? "border-fuchsia-200/70 bg-fuchsia-300/25 text-fuchsia-50"
                            : "border-white/30 bg-white/10 text-white/80"
                        }`}
                      >
                        💖 하트
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardStickers((prev) => ({ ...prev, star: !prev.star }))}
                        className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                          cardStickers.star
                            ? "border-cyan-200/70 bg-cyan-300/20 text-cyan-50"
                            : "border-white/30 bg-white/10 text-white/80"
                        }`}
                      >
                        ⭐ 스타
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardStickers((prev) => ({ ...prev, lightstick: !prev.lightstick }))}
                        className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                          cardStickers.lightstick
                            ? "border-amber-200/70 bg-amber-300/20 text-amber-50"
                            : "border-white/30 bg-white/10 text-white/80"
                        }`}
                      >
                        🎤 라이트스틱
                      </button>
                    </div>
                    <label className="mt-3 grid gap-1 text-sm text-white/85">
                      <span>텍스트 스티커</span>
                      <input
                        value={cardStickers.text}
                        onChange={(event) => setCardStickers((prev) => ({ ...prev, text: event.target.value.slice(0, 18) }))}
                        placeholder="예: 내최애우주최고"
                        className="min-h-11 rounded-xl border border-white/25 bg-black/25 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                      />
                    </label>
                  </div>

                  <div className={`rounded-[28px] p-4 ${styles.glass}`}>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={shareCard}
                        className="min-h-11 rounded-full border border-cyan-200/65 bg-cyan-300/20 px-4 text-sm font-bold text-cyan-50"
                      >
                        공유하기
                      </button>
                      <button
                        type="button"
                        onClick={downloadCardImage}
                        className="min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white"
                      >
                        저장하기
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCard().catch(() => null)}
                        disabled={!canSaveCollection || saving || !resultRaw}
                        className="min-h-11 rounded-full border border-fuchsia-200/70 bg-fuchsia-400/25 px-4 text-sm font-semibold text-white disabled:opacity-45"
                      >
                        {saving ? "저장 중..." : "컬렉션 저장"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUiStep(1);
                          setResultRaw(null);
                          setResultVm(null);
                          setError("");
                        }}
                        className="min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white"
                      >
                        다시 분석
                      </button>
                      <a
                        href={ogImagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center rounded-full border border-amber-200/55 bg-amber-300/20 px-4 text-sm font-semibold text-amber-50"
                      >
                        OG 미리보기
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <DestinyBiasReportTabs vm={resultVm} />

                  <article className={`rounded-[28px] p-5 ${styles.glass}`}>
                    <h3 className="text-base font-bold text-white">리포트 원문</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/85">{resultVm.rawReport || "샘플 카드 모드입니다. 분석 실행 후 상세 리포트를 볼 수 있어요."}</p>
                  </article>

                  <article className={`rounded-[28px] p-5 ${styles.glass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white">내 최애운명 컬렉션</h3>
                      {cardsLoading ? <span className="text-xs text-white/70">불러오는 중...</span> : null}
                    </div>

                    {!isLoggedIn ? (
                      <p className="mt-3 text-sm text-white/80">로그인하면 포토카드를 컬렉션에 쌓아둘 수 있어요.</p>
                    ) : null}

                    {isLoggedIn && cards.length === 0 && !cardsLoading ? (
                      <p className="mt-3 text-sm text-white/80">저장된 카드가 아직 없어요.</p>
                    ) : null}

                    {cards.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {cards.map((item) => (
                          <div key={item.id} className="rounded-xl border border-white/20 bg-black/25 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-white">{item.title}</p>
                                <p className="mt-1 text-xs text-white/70">{item.headline}</p>
                                <p className="mt-1 text-[11px] text-white/50">{formatKoreanDate(item.createdAt)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteCard(item.id)}
                                className="rounded-lg border border-rose-200/50 bg-rose-300/20 px-2 py-1 text-xs font-semibold text-rose-50"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                </div>
              </section>
            )}

            {error ? (
              <p className="rounded-xl border border-rose-200/45 bg-rose-300/15 px-4 py-3 text-sm text-rose-50">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {uiStep > 0 && uiStep < 4 && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/50 px-4 py-3 backdrop-blur-xl md:hidden ${styles.stickyCtaSafe}`} {...guardHandlers}>
          <div className="mx-auto flex w-full max-w-7xl gap-2">
            {uiStep > 1 ? (
              <button
                type="button"
                onClick={onSafeClick(() => setUiStep((prev) => (prev - 1) as 1 | 2 | 3 | 4))}
                className="min-h-11 flex-1 rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white"
              >
                이전
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={onSafeClick(() => nextStep(uiStep as 1 | 2 | 3))}
                className="min-h-11 flex-1 rounded-full border border-fuchsia-200/70 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-sm font-bold text-white"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={onSafeClick(() => {
                  if (analyzing) return;
                  analyze().catch(() => null);
                })}
                disabled={analyzing}
                className="min-h-11 flex-1 rounded-full border border-fuchsia-200/70 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-sm font-bold text-white disabled:opacity-60"
              >
                {analyzing ? "분석 중..." : "내 최애운명 분석하기"}
              </button>
            )}
          </div>
        </div>
      )}

      {uiStep > 0 && uiStep < 4 && (
        <div className="mx-auto hidden w-full max-w-7xl px-6 pb-6 md:block">
          <div className="mt-4 flex gap-2">
            {uiStep > 1 ? (
              <button
                type="button"
                onClick={() => setUiStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                className="min-h-11 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white"
              >
                이전
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={() => nextStep(uiStep as 1 | 2 | 3)}
                className="min-h-11 rounded-full border border-fuchsia-200/70 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 text-sm font-bold text-white"
              >
                다음 단계
              </button>
            ) : (
              <button
                type="button"
                onClick={() => analyze().catch(() => null)}
                disabled={analyzing}
                className="min-h-11 rounded-full border border-fuchsia-200/70 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 text-sm font-bold text-white disabled:opacity-60"
              >
                {analyzing ? "운명 분석 중..." : "내 최애운명 분석하기"}
              </button>
            )}
          </div>
        </div>
      )}

      <DestinyBiasCoinModal
        open={coinModal.open}
        title={coinModal.title}
        message={coinModal.message}
        requiredCoins={coinModal.requiredCoins}
        loginRequired={coinModal.loginRequired}
        onClose={() => setCoinModal((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}
