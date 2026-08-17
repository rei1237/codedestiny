"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { readSanitizedAuthUser } from "@/app/_lib/auth-storage";
import { readCurrentDestinyProfile, resolveDestinyProfileBirthParts } from "@/app/_lib/profile-card-storage";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import BiasDestinyHero from "./components/BiasDestinyHero";
import BiasDestinyStageLineup from "./components/BiasDestinyStageLineup";
import BiasDestinyInputPanel from "./components/BiasDestinyInputPanel";
import BiasDestinyElementChart from "./components/BiasDestinyElementChart";
import BiasDestinyFiveSections from "./components/BiasDestinyFiveSections";
import BiasDestinyMainCard from "./components/BiasDestinyMainCard";
import BiasDestinyMzZone from "./components/BiasDestinyMzZone";
import BiasDestinyScoreGauge from "./components/BiasDestinyScoreGauge";
import BiasDestinyShareCard from "./components/BiasDestinyShareCard";
import BiasDestinySpotlightBackground from "./components/BiasDestinySpotlightBackground";
import BiasDestinyStageLoading from "./components/BiasDestinyStageLoading";
import DestinyBiasCoinModal from "./components/DestinyBiasCoinModal";
import DestinyBiasProgress from "./components/DestinyBiasProgress";
import DestinyBiasActionBar from "./components/DestinyBiasActionBar";
import FansignEditionBadge from "./components/FansignEditionBadge";
import MyDestinyBiasHero from "./components/MyDestinyBiasHero";
import DestinyBiasHeader from "./components/DestinyBiasHeader";
import styles from "./destiny-bias.module.css";
import {
  destinyBiasCelebCategories,
  destinyBiasCelebrityPresets,
  type DestinyBiasCelebCategory,
  type DestinyBiasCelebrityPreset,
} from "./lib/celebrityProfiles";
import { destinyBiasIntroCopy, destinyBiasLoadingMessages } from "./lib/destinyBiasCopy";
import { destinyBiasThemeChoices } from "./lib/destinyBiasTheme";
import { useDestinyBiasTouchGuard } from "./lib/destinyBiasTouchGuard";
import type { DestinyBiasResultViewModel, PersonInputState } from "./lib/types";
import { analyzeDestinyBias } from "./engine/destinyBiasEngine";
import { normalizeBirthDateInput } from "./engine/birthEnergy";
import { downloadSvg } from "./utils/downloadSvg";
import { buildPngBlobFromDestinyBiasCard, downloadPngFromSvg } from "./utils/downloadPngFromSvg";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

const DESTINY_BIAS_CLIENT_TEXT_TRANSLATIONS = {
  ko: {
    "destinyBiasClient.title.001": "안내",
    "destinyBiasClient.title.002": "로그인이 필요해요",
    "destinyBiasClient.message.001": "최애운명 분석은 계정 확인 후 진행됩니다. 로그인 후 다시 시도해 주세요.",
    "destinyBiasClient.message.002": "이용권 확인 중",
    "destinyBiasClient.title.003": "로그인 세션이 필요해요",
    "destinyBiasClient.message.003": "세션이 만료되었습니다. 다시 로그인한 뒤 분석을 이어가 주세요.",
    "destinyBiasClient.title.004": "유료 결제가 필요해요",
    "destinyBiasClient.message.004": "최애운명 분석은 결제 후 이용할 수 있습니다. 결제 페이지에서 상품을 선택해 주세요.",
    "destinyBiasClient.setError.001": "분석 중 오류가 발생했습니다.",
    "destinyBiasClient.message.005": "PNG 저장에 실패했습니다.",
    "destinyBiasClient.setError.002": "결과 복사에 실패했습니다.",
    "destinyBiasClient.title.005": "My Destiny Bias",
    "destinyBiasClient.setError.003": "공유 텍스트 복사에 실패했습니다.",
    "destinyBiasClient.title.006": "My Destiny Bias",
    "destinyBiasClient.setError.004": "인스타 공유용 이미지 저장에 실패했습니다.",
    "destinyBiasClient.setError.005": "카카오 공유 문구 복사에 실패했습니다.",
    "destinyBiasClient.title.007": "당신의 팬라이트 에너지를 확인할게요",
    "destinyBiasClient.description.001": "이름과 생년월일을 입력하면 무대 입장 전 당신의 사주 에너지 베이스를 먼저 정렬합니다.",
    "destinyBiasClient.label.001": "나의 이름/닉네임",
    "destinyBiasClient.placeholder.001": "예: 네오",
    "destinyBiasClient.label.002": "나의 생년월일",
    "destinyBiasClient.placeholder.002": "예: 19910220",
    "destinyBiasClient.label.003": "태어난 시간은 선택 입력",
    "destinyBiasClient.placeholder.003": "예: 1430 (선택)",
    "destinyBiasClient.title.008": "최애 프로필로 스테이지 케미를 연결할게요",
    "destinyBiasClient.description.002": "최애 정보와 무드를 입력하면 나의 사주 에너지와 겹치는 공명 포인트를 스테이지 기준으로 계산합니다.",
    "destinyBiasClient.label.004": "최애 이름",
    "destinyBiasClient.placeholder.004": "예: MY BIAS",
    "destinyBiasClient.label.005": "최애의 생년월일",
    "destinyBiasClient.placeholder.005": "예: 20001225",
    "destinyBiasClient.label.006": "연결 아티스트/그룹",
    "destinyBiasClient.placeholder.006": "예: STARLIGHT UNIT",
    "destinyBiasClient.label.007": "태어난 시간은 선택 입력",
    "destinyBiasClient.placeholder.007": "예: 0915 (선택)",
    "destinyBiasClient.placeholder.008": "이름, 그룹/작품, 카테고리로 검색해 보세요",
    "destinyBiasClient.alt.001": "업로드한 최애 이미지 미리보기",
    "destinyBiasClient.title.009": "콘서트 무대 톤을 선택해 주세요",
    "destinyBiasClient.description.003": "무대의 조명 온도와 오라 색감을 선택합니다. 계산 결과는 동일하고, 표현되는 카드 스타일만 달라집니다.",
  },
} as const;

function destinyBiasClientText(key: keyof typeof DESTINY_BIAS_CLIENT_TEXT_TRANSLATIONS.ko) {
  return DESTINY_BIAS_CLIENT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const ANALYZE_FEATURE_KEY = "destiny-bias-analyze";
const ANALYZE_CATEGORY_KEY = "destiny-bias";
const ANALYZE_REASON = "최애운명 분석";
// 가격은 서버 가격표에서 읽는다. 정본: worker/lib/paid-feature-registry.js → destiny-bias-analyze = 50코인 / 5,000원
const ANALYZE_PRICING = resolveServerFeaturePricing({ featureKey: ANALYZE_FEATURE_KEY });
const DEFAULT_ANALYZE_COST = ANALYZE_PRICING?.cost ?? 0;
const DEFAULT_ANALYZE_AMOUNT_KRW = ANALYZE_PRICING?.amountKRW ?? 0;
const MAX_BIAS_IMAGE_SIZE_MB = 12;

const BIAS_MOODS = ["청량", "카리스마", "몽환", "러블리", "시크", "힐링"] as const;
const RELATION_MOODS = ["응원형", "성장형", "설렘형", "위로형", "운명형"] as const;
const GENDER_OPTIONS = ["여성", "남성", "기타"] as const;

const INITIAL_ME: PersonInputState = {
  name: "",
  birthDateInput: "",
  birthTimeInput: "",
};

const INITIAL_BIAS: PersonInputState = {
  name: "",
  birthDateInput: "",
  birthTimeInput: "",
};

const FEATURED_CELEB_PRESET_COUNT = 8;

type ProfileSeed = {
  name: string;
  birthDateInput: string;
  birthTimeInput: string;
  gender: (typeof GENDER_OPTIONS)[number] | "";
};

type StoredAuthUser = {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
};

type UiStep = 0 | 1 | 2 | 3 | 4 | 5;

function normalizeBirthDateText(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return digits;
}

function normalizeBirthTimeText(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 4) return "";
  return digits;
}

function normalizeProfileBirthTimeInput(profile: ReturnType<typeof readCurrentDestinyProfile>) {
  const birth = profile?.birth || {};
  const hour = Number(birth.hour ?? profile?.birthHour);
  const minute = Number(birth.minute ?? profile?.birthMinute ?? 0);
  if (Number.isFinite(hour) && hour >= 0 && hour <= 23 && Number.isFinite(minute) && minute >= 0 && minute <= 59) {
    return `${String(Math.trunc(hour)).padStart(2, "0")}${String(Math.trunc(minute)).padStart(2, "0")}`;
  }
  return normalizeBirthTimeText(profile?.birthTime || profile?.birthIso);
}

function normalizeGenderOption(value: unknown): (typeof GENDER_OPTIONS)[number] | "" {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^(f|female|woman|여|여성)$/i.test(raw)) return "여성";
  if (/^(m|male|man|남|남성)$/i.test(raw)) return "남성";
  if (/^(other|기타)$/i.test(raw)) return "기타";

  return "";
}

function formatBirthdayPreview(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

function formatTimePreview(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 4) return "";
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function readCurrentProfileSeed(): ProfileSeed {
  if (typeof window === "undefined") {
    return {
      name: "",
      birthDateInput: "",
      birthTimeInput: "",
      gender: "",
    };
  }
  try {
    const user = readSanitizedAuthUser() as StoredAuthUser | null;
    const profile = readCurrentDestinyProfile();
    const profileBirth = resolveDestinyProfileBirthParts(profile);
    const profileBirthDateInput = profileBirth
      ? `${String(profileBirth.year).padStart(4, "0")}${String(profileBirth.month).padStart(2, "0")}${String(profileBirth.day).padStart(2, "0")}`
      : "";
    const profileBirthTimeInput = normalizeProfileBirthTimeInput(profile);
    const profileGender = normalizeGenderOption(profile?.gender);
    const fallbackName = String(user?.name || "").trim();
    const fallbackBirthDateInput = normalizeBirthDateText(user?.birthDate);
    const fallbackBirthTimeInput = normalizeBirthTimeText(user?.birthTime);
    const fallbackGender = normalizeGenderOption(user?.gender);

    return {
      name: String(profile?.name || "").trim() || fallbackName,
      birthDateInput: profileBirthDateInput || fallbackBirthDateInput,
      birthTimeInput: profileBirthTimeInput || fallbackBirthTimeInput,
      gender: profileGender || fallbackGender,
    };
  } catch {
    return {
      name: "",
      birthDateInput: "",
      birthTimeInput: "",
      gender: "",
    };
  }
}

function readLocalToken() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch {
    return "";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function InputField({
  label,
  subLabel,
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  error,
}: {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-white/90">
      {subLabel ? <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">{subLabel}</span> : null}
      <span className="font-semibold text-white/95">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(maxLength ? event.target.value.slice(0, maxLength) : event.target.value)}
        placeholder={placeholder}
        className={styles.premiumInput}
      />
      {error ? <span className="text-xs text-[#FF9AD8]">{error}</span> : null}
    </label>
  );
}

export default function DestinyBiasClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { guardHandlers, shouldBlockClick } = useDestinyBiasTouchGuard();

  const [uiStep, setUiStep] = useState<UiStep>(0);
  const [meInput, setMeInput] = useState<PersonInputState>(INITIAL_ME);
  const [biasInput, setBiasInput] = useState<PersonInputState>(INITIAL_BIAS);
  const [meGender, setMeGender] = useState<(typeof GENDER_OPTIONS)[number]>(() => readCurrentProfileSeed().gender || "기타");
  const [biasArtistInput, setBiasArtistInput] = useState("");
  const [biasPresetQuery, setBiasPresetQuery] = useState("");
  const [activeCelebCategory, setActiveCelebCategory] = useState<DestinyBiasCelebCategory>("전체");
  const [activeAnimeSeries, setActiveAnimeSeries] = useState("전체 작품");
  const [selectedCelebPresetId, setSelectedCelebPresetId] = useState("");
  const CELEB_PAGE_SIZE = 24;
  const [celebVisibleCount, setCelebVisibleCount] = useState(CELEB_PAGE_SIZE);
  const [biasImageDataUrl, setBiasImageDataUrl] = useState("");
  const [biasImageName, setBiasImageName] = useState("");
  const [biasImageError, setBiasImageError] = useState("");

  const [biasMood, setBiasMood] = useState<(typeof BIAS_MOODS)[number]>("청량");
  const [relationMood, setRelationMood] = useState<(typeof RELATION_MOODS)[number]>("응원형");
  const [activeThemeKey, setActiveThemeKey] = useState("moonlight_neon");

  const [analyzing, setAnalyzing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [stageLoading, setStageLoading] = useState(0);

  const [birthInputErrors, setBirthInputErrors] = useState({
    me: "",
    bias: "",
  });

  const [resultVm, setResultVm] = useState<DestinyBiasResultViewModel | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLowSpec, setIsLowSpec] = useState(false);

  const [coinModal, setCoinModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    requiredCoins: number;
    loginRequired: boolean;
  }>({
    open: false,
    title: destinyBiasClientText("destinyBiasClient.title.001"),
    message: "",
    requiredCoins: 0,
    loginRequired: false,
  });

  const selectedTheme = useMemo(() => {
    return destinyBiasThemeChoices.find((item) => item.key === activeThemeKey) || destinyBiasThemeChoices[0];
  }, [activeThemeKey]);

  const featuredCelebPresets = useMemo(() => {
    return destinyBiasCelebrityPresets.slice(0, FEATURED_CELEB_PRESET_COUNT);
  }, []);

  const animeSeriesOptions = useMemo(() => {
    const base = ["전체 작품"];
    const values = destinyBiasCelebrityPresets
      .filter((preset) => preset.category === "애니 캐릭터")
      .map((preset) => String(preset.artist || "").trim())
      .filter(Boolean);
    const deduped = Array.from(new Set(values));
    return base.concat(deduped);
  }, []);

  const filteredCelebPresets = useMemo(() => {
    const keyword = biasPresetQuery.trim().toLowerCase();
    return destinyBiasCelebrityPresets.filter((preset) => {
      if (activeCelebCategory !== "전체" && preset.category !== activeCelebCategory) return false;
      if (activeCelebCategory === "애니 캐릭터" && activeAnimeSeries !== "전체 작품") {
        if (preset.artist !== activeAnimeSeries) return false;
      }
      if (!keyword) return true;
      return preset.searchText.includes(keyword);
    });
  }, [activeAnimeSeries, activeCelebCategory, biasPresetQuery]);

  // 필터/검색이 바뀌면 더보기 노출 개수 초기화
  useEffect(() => {
    setCelebVisibleCount(CELEB_PAGE_SIZE);
  }, [activeAnimeSeries, activeCelebCategory, biasPresetQuery]);

  useEffect(() => {
    if (activeCelebCategory !== "애니 캐릭터" && activeAnimeSeries !== "전체 작품") {
      setActiveAnimeSeries("전체 작품");
    }
  }, [activeAnimeSeries, activeCelebCategory]);

  const selectedCelebPreset = useMemo(() => {
    return destinyBiasCelebrityPresets.find((preset) => preset.id === selectedCelebPresetId) || null;
  }, [selectedCelebPresetId]);

  useEffect(() => {
    const localToken = readLocalToken();
    const user = readSanitizedAuthUser();
    const loggedIn = Boolean(localToken || user?.id || user?.userId);

    setIsLoggedIn(loggedIn);
  }, []);

  useEffect(() => {
    const applyProfileData = () => {
      const profileSeed = readCurrentProfileSeed();
      setMeInput((prev) => {
        const nextName = profileSeed.name || prev.name;
        const nextBirthDate = profileSeed.birthDateInput || prev.birthDateInput;
        const nextBirthTime = profileSeed.birthTimeInput || prev.birthTimeInput;

        if (nextName === prev.name && nextBirthDate === prev.birthDateInput && nextBirthTime === prev.birthTimeInput) {
          return prev;
        }

        return {
          ...prev,
          name: nextName,
          birthDateInput: nextBirthDate,
          birthTimeInput: nextBirthTime,
        };
      });

      setMeGender((prev) => {
        const nextGender = profileSeed.gender || prev;
        return nextGender === prev ? prev : nextGender;
      });
    };

    applyProfileData();
    if (typeof window === "undefined") return;
    window.addEventListener("destinyProfileChanged", applyProfileData);
    return () => {
      window.removeEventListener("destinyProfileChanged", applyProfileData);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8);
    const core = Number(navigator.hardwareConcurrency || 8);
    setIsLowSpec(memory <= 4 || core <= 4);
  }, []);

  useEffect(() => {
    if (uiStep !== 0) {
      setStageLoading(0);
      return;
    }

    const timer = window.setInterval(() => {
      setStageLoading((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 40);

    return () => window.clearInterval(timer);
  }, [uiStep]);

  useEffect(() => {
    if (!analyzing) {
      setLoadingProgress(0);
      setLoadingMessageIndex(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(0.94, 0.08 + elapsed / 1700);
      setLoadingProgress((prev) => Math.max(prev, ratio));

      const messageCursor = Math.min(
        destinyBiasLoadingMessages.length - 1,
        Math.floor((elapsed / 1400) * destinyBiasLoadingMessages.length),
      );
      setLoadingMessageIndex(messageCursor);
    }, 90);

    return () => window.clearInterval(interval);
  }, [analyzing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!coinModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [coinModal.open]);

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

  const handleBiasImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const imageType = /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.type);
    if (!imageType) {
      setBiasImageError("PNG, JPG, WEBP, GIF 이미지 파일만 업로드할 수 있어요.");
      event.target.value = "";
      return;
    }

    const maxBytes = MAX_BIAS_IMAGE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setBiasImageError(`이미지 용량은 ${MAX_BIAS_IMAGE_SIZE_MB}MB 이하로 업로드해 주세요.`);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        setBiasImageError("이미지를 읽지 못했어요. 다시 선택해 주세요.");
        event.target.value = "";
        return;
      }

      setBiasImageDataUrl(dataUrl);
      setBiasImageName(file.name || "my-bias-image");
      setBiasImageError("");
      setToast("최애 이미지를 카드에 합성할 준비를 끝냈어요.");
    };

    reader.onerror = () => {
      setBiasImageError("이미지 처리 중 오류가 발생했어요. 다른 파일로 다시 시도해 주세요.");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }, []);

  const clearBiasImage = useCallback(() => {
    setBiasImageDataUrl("");
    setBiasImageName("");
    setBiasImageError("");
    setToast("업로드 이미지를 초기화했어요.");
  }, []);

  const onSafeClick = useCallback((callback: () => void) => {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      if (shouldBlockClick()) {
        event.preventDefault();
        return;
      }
      callback();
    };
  }, [shouldBlockClick]);

  const handleAnalysisBack = useCallback(() => {
    if (coinModal.open) {
      setCoinModal((prev) => ({ ...prev, open: false }));
      return true;
    }

    if (analyzing && uiStep === 4) {
      return false;
    }

    if (uiStep <= 0) {
      return false;
    }

    if (uiStep === 5) {
      setUiStep(3);
      setError("");
      return true;
    }

    setUiStep((prev) => {
      if (prev <= 0) return 0;
      return (prev - 1) as UiStep;
    });
    setError("");
    return true;
  }, [analyzing, coinModal.open, uiStep]);

  useBackNavigation({
    scope: "analysis",
    priority: 50,
    maxInternalBackSteps: 1,
    enabled: true,
    isLocked: () => analyzing && uiStep === 4,
    canGoBack: () => coinModal.open || uiStep > 0,
    onBack: handleAnalysisBack,
  });

  const goBackToMain = useCallback(() => {
    if (handleAnalysisBack()) return;
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || window.location.search.includes("debugSajuRedirect=1")) {
        console.warn("[saju-redirect-blocked]", {
          reason: "destiny-bias-root-back-replaced",
          pathname: window.location.pathname,
          isAnalyzing: analyzing,
          uiStep,
        });
      }
    }
    router.replace("/saju");
  }, [analyzing, handleAnalysisBack, router, uiStep]);

  const validateBirthInput = useCallback((value: string, target: "me" | "bias") => {
    const result = normalizeBirthDateInput(value);
    setBirthInputErrors((prev) => ({
      ...prev,
      [target]: result.ok === true ? "" : result.reason,
    }));
    return result;
  }, []);

  const validateStep = useCallback((step: 1 | 2 | 3) => {
    if (step === 1) {
      if (!meInput.name.trim()) return "나의 이름/닉네임을 입력해 주세요.";
      const meBirth = validateBirthInput(meInput.birthDateInput, "me");
      if (meBirth.ok === false) return `나의 생년월일: ${meBirth.reason}`;
    }

    if (step === 2) {
      if (!biasInput.name.trim()) return "최애 이름을 입력해 주세요.";
      const biasBirth = validateBirthInput(biasInput.birthDateInput, "bias");
      if (biasBirth.ok === false) return `최애의 생년월일: ${biasBirth.reason}`;
    }

    return "";
  }, [biasInput.birthDateInput, biasInput.name, meInput.birthDateInput, meInput.name, validateBirthInput]);

  const applyCelebPreset = useCallback((preset: DestinyBiasCelebrityPreset) => {
    setSelectedCelebPresetId(preset.id);
    setBiasInput({
      name: preset.name,
      birthDateInput: preset.birthDateInput,
      birthTimeInput: preset.birthTimeInput,
    });
    setBiasArtistInput(preset.artist);
    setBirthInputErrors((prev) => ({ ...prev, bias: "" }));
    setError("");
    setToast(
      preset.timeKnown
        ? `${preset.sourceLabel} 정보를 바로 불러왔어요.`
        : `${preset.sourceLabel} 생일을 바로 넣었어요. 시간은 공개된 경우만 자동 입력됩니다.`,
    );
  }, []);

  const nextStep = useCallback((currentStep: 1 | 2 | 3) => {
    const message = validateStep(currentStep);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setUiStep((currentStep + 1) as 2 | 3 | 4);
  }, [validateStep]);

  const analyze = useCallback(async () => {
    if (analyzing) return;

    const validationMessage = validateStep(3);
    if (validationMessage) {
      setError(validationMessage);
      setUiStep(3);
      return;
    }

    if (!isLoggedIn) {
      openCoinNotice({
        title: destinyBiasClientText("destinyBiasClient.title.002"),
        message: destinyBiasClientText("destinyBiasClient.message.001"),
        requiredCoins: DEFAULT_ANALYZE_COST,
        loginRequired: true,
      });
      return;
    }

    setError("");
    setAnalyzing(true);
    setUiStep(4);

    try {
      const requestId = `destiny-bias:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      openPaidFeatureGate({
        categoryKey: ANALYZE_CATEGORY_KEY,
        featureKey: ANALYZE_FEATURE_KEY,
        requestId,
        cost: DEFAULT_ANALYZE_COST,
        message: destinyBiasClientText("destinyBiasClient.message.002"),
      });

      // 🔴 가격을 게이트에 함께 넘긴다. 빼면 결제창이 0원으로 뜨고 월정석 카드가 비활성이 된다
      //    (결제창은 coinPrice 를 그대로 렌더하고 월정석 비용은 coinPrice*10 이다).
      let coinGateResult = await runBillingCoinGate({
        categoryKey: ANALYZE_CATEGORY_KEY,
        featureKey: ANALYZE_FEATURE_KEY,
        reason: ANALYZE_REASON,
        requestId,
        cost: DEFAULT_ANALYZE_COST,
        coinPrice: DEFAULT_ANALYZE_COST,
        amountKRW: DEFAULT_ANALYZE_AMOUNT_KRW,
      });

      if (!coinGateResult.ok) {
        const firstCode = String(coinGateResult.error?.code || "").toUpperCase();
        const shouldRetryOnce =
          coinGateResult.status >= 500
          || firstCode === "SERVER_ERROR"
          || firstCode === "AUTH_REFRESH_TEMPORARY_FAILURE";

        if (shouldRetryOnce) {
          await sleep(450);
          coinGateResult = await runBillingCoinGate({
            categoryKey: ANALYZE_CATEGORY_KEY,
            featureKey: ANALYZE_FEATURE_KEY,
            reason: ANALYZE_REASON,
            requestId,
            cost: DEFAULT_ANALYZE_COST,
            coinPrice: DEFAULT_ANALYZE_COST,
            amountKRW: DEFAULT_ANALYZE_AMOUNT_KRW,
          });
        }
      }

      if (!coinGateResult.ok) {
        const code = String(coinGateResult.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED") {
          openCoinNotice({
            title: destinyBiasClientText("destinyBiasClient.title.003"),
            message: destinyBiasClientText("destinyBiasClient.message.003"),
            requiredCoins: DEFAULT_ANALYZE_COST,
            loginRequired: true,
          });
          throw new Error("로그인 후 다시 시도해 주세요.");
        }

        if (code === "INSUFFICIENT_COINS") {
          openCoinNotice({
            title: destinyBiasClientText("destinyBiasClient.title.004"),
            message: destinyBiasClientText("destinyBiasClient.message.004"),
            requiredCoins: DEFAULT_ANALYZE_COST,
          });
          throw new Error("결제 가능 금액이 부족합니다.");
        }

        throw new Error(coinGateResult.error?.message || "원화 결제 확인에 실패했습니다.");
      }

      const localResult = analyzeDestinyBias({
        userName: meInput.name,
        userBirthDateInput: meInput.birthDateInput,
        userBirthTimeInput: meInput.birthTimeInput,
        biasName: biasInput.name,
        biasBirthDateInput: biasInput.birthDateInput,
        biasBirthTimeInput: biasInput.birthTimeInput,
        linkedArtistName: biasArtistInput,
        biasMood,
        relationMood,
        themeKey: selectedTheme.key,
        themeLabel: selectedTheme.name,
      });

      await sleep(1100);
      setLoadingProgress(1);

      const vm: DestinyBiasResultViewModel = {
        ...localResult,
        themeLabel: selectedTheme.name,
        biasMood,
        relationMood,
      };

      setResultVm(vm);
      setUiStep(5);
      setToast("최애운명 리포트와 디지털 포토카드가 완성됐어요.");
    } catch (analysisError) {
      setResultVm(null);
      setUiStep(3);
      if (analysisError instanceof Error) {
        if (analysisError.message !== "결제 가능 금액이 부족합니다." && analysisError.message !== "로그인 후 다시 시도해 주세요.") {
          setError(friendlyErrorMessage(analysisError, destinyBiasClientText("destinyBiasClient.setError.001")));
        }
      } else {
        setError(destinyBiasClientText("destinyBiasClient.setError.001"));
      }
    } finally {
      setAnalyzing(false);
    }
  }, [
    analyzing,
    biasInput.birthDateInput,
    biasInput.birthTimeInput,
    biasInput.name,
    biasArtistInput,
    biasMood,
    isLoggedIn,
    meInput.birthDateInput,
    meInput.birthTimeInput,
    meInput.name,
    openCoinNotice,
    relationMood,
    selectedTheme.key,
    selectedTheme.name,
    validateStep,
  ]);

  const handleDownloadSvg = useCallback(() => {
    if (!resultVm) return;
    downloadSvg(resultVm.cardSvg, `my-destiny-bias-${resultVm.destinyId}.svg`);
    setToast("SVG 포토카드를 저장했어요.");
  }, [resultVm]);

  const handleDownloadPng = useCallback(async () => {
    if (!resultVm) return;
    try {
      await downloadPngFromSvg(resultVm.cardSvg, `my-destiny-bias-${resultVm.destinyId}.png`);
      setToast("PNG 포토카드를 저장했어요.");
    } catch (downloadError) {
      setError(friendlyErrorMessage(downloadError, destinyBiasClientText("destinyBiasClient.message.005")));
    }
  }, [resultVm]);

  const handleCopyResult = useCallback(async () => {
    if (!resultVm || typeof navigator === "undefined" || !navigator.clipboard) return;
    const summary = [
      `[My Destiny Bias] ${resultVm.biasName}`,
      `점수 ${resultVm.totalScore} · ${resultVm.destinyGrade} (${resultVm.gradeTitle})`,
      `에너지 ${resultVm.auraType} / ${resultVm.auraMaterial}`,
      `페어링 ${resultVm.pairingAlias}`,
      `운명 메시지 ${resultVm.oneLineDestinyMessage}`,
      `팬싸인 감성 메시지 ${resultVm.fansignMessage}`,
      `Destiny ID ${resultVm.destinyId}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setToast("결과 요약을 복사했어요.");
    } catch {
      setError(destinyBiasClientText("destinyBiasClient.setError.002"));
    }
  }, [resultVm]);

  const handleShareResult = useCallback(async () => {
    if (!resultVm || typeof navigator === "undefined") return;

    const text = `${resultVm.biasName}와의 궁합 ${resultVm.totalScore}점 · ${resultVm.destinyGrade}\n${resultVm.oneLineDestinyMessage}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destinyBiasClientText("destinyBiasClient.title.005"),
          text,
          url: window.location.href,
        });
        setToast("결과를 공유했어요.");
        return;
      } catch {
        // 사용자가 공유 창을 닫은 경우는 조용히 처리
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setToast("공유용 텍스트를 복사했어요.");
    } catch {
      setError(destinyBiasClientText("destinyBiasClient.setError.003"));
    }
  }, [resultVm]);

  const getShareBaseText = useCallback(() => {
    if (!resultVm) return "";
    return `${resultVm.biasName}와의 궁합 ${resultVm.totalScore}점 · ${resultVm.destinyGrade}\n${resultVm.oneLineDestinyMessage}`;
  }, [resultVm]);

  const buildShareFile = useCallback(async () => {
    if (!resultVm) return null;
    const blob = await buildPngBlobFromDestinyBiasCard(resultVm.cardSvg);
    return new File([blob], `my-destiny-bias-${resultVm.destinyId}.png`, { type: "image/png" });
  }, [resultVm]);

  const shareWithNativeSheet = useCallback(async (platformLabel: string) => {
    if (!resultVm || typeof navigator === "undefined") return false;
    if (!navigator.share) return false;

    const text = getShareBaseText();
    const url = typeof window !== "undefined" ? window.location.href : "";

    try {
      const file = await buildShareFile();
      if (!file) return false;
      const payload: ShareData = {
        title: destinyBiasClientText("destinyBiasClient.title.006"),
        text,
        url,
        files: [file],
      };

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        return false;
      }

      await navigator.share(payload);
      setToast(`${platformLabel} 공유 창을 열었어요.`);
      return true;
    } catch {
      return false;
    }
  }, [buildShareFile, getShareBaseText, resultVm]);

  const handleShareToX = useCallback(() => {
    if (!resultVm || typeof window === "undefined") return;
    const text = getShareBaseText();
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=620,height=720");
    setToast("X(트위터) 공유 창을 열었어요.");
  }, [getShareBaseText, resultVm]);

  const handleShareToInstagram = useCallback(async () => {
    if (!resultVm) return;

    const nativeShared = await shareWithNativeSheet("인스타그램");
    if (nativeShared) return;

    try {
      await downloadPngFromSvg(resultVm.cardSvg, `my-destiny-bias-${resultVm.destinyId}.png`);
      setToast("인스타 공유용 카드 이미지를 저장했어요. 인스타 앱에서 업로드해 주세요.");
    } catch {
      setError(destinyBiasClientText("destinyBiasClient.setError.004"));
    }
  }, [resultVm, shareWithNativeSheet]);

  const handleShareToKakao = useCallback(async () => {
    if (!resultVm || typeof window === "undefined") return;

    const nativeShared = await shareWithNativeSheet("카카오");
    if (nativeShared) return;

    const text = getShareBaseText();
    const fallback = `${text}\n${window.location.href}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fallback);
      }
      setToast("카카오 공유용 문구를 복사했어요. 카카오톡에 붙여넣어 공유해 주세요.");
    } catch {
      setError(destinyBiasClientText("destinyBiasClient.setError.005"));
    }
  }, [getShareBaseText, resultVm, shareWithNativeSheet]);

  const handleRetry = useCallback(() => {
    setUiStep(1);
    setResultVm(null);
    setBiasArtistInput("");
    setBiasImageDataUrl("");
    setBiasImageName("");
    setBiasImageError("");
    setError("");
  }, []);

  const handleTryAnotherBias = useCallback(() => {
    setUiStep(2);
    setResultVm(null);
    setBiasInput(INITIAL_BIAS);
    setBiasArtistInput("");
    setBiasImageDataUrl("");
    setBiasImageName("");
    setBiasImageError("");
    setError("");
    setToast("다른 최애 정보를 입력해 주세요.");
  }, []);

  const particleCount = reduceMotion || isLowSpec ? 5 : 12;

  return (
    <section className={`relative min-h-[100svh] w-screen overflow-x-hidden text-white ${styles.destinyBiasBg}`}>
      <BiasDestinySpotlightBackground isLowSpec={isLowSpec} reduceMotion={Boolean(reduceMotion)} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: particleCount }).map((_, index) => (
          <span
            key={index}
            className={`absolute ${styles.floatParticle}`}
            style={{
              left: `${7 + ((index * 11) % 88)}%`,
              top: `${6 + ((index * 9) % 82)}%`,
              animationDuration: `${3.6 + (index % 4) * 0.8}s`,
            }}
          >
            {index % 4 === 0 ? (
              <DestinyIcon name="star" size={14} className="text-violet-100/90" variant="soft" />
            ) : index % 4 === 1 ? (
              <DestinyIcon name="heartGlow" size={14} className="text-rose-100/90" variant="glow" />
            ) : index % 4 === 2 ? (
              <DestinyIcon name="sparkle" size={14} className="text-fuchsia-100/90" variant="soft" />
            ) : (
              <DestinyIcon name="lightstick" size={14} className="text-cyan-100/90" variant="soft" />
            )}
          </span>
        ))}
      </div>

      <DestinyBiasHeader onBack={goBackToMain} coinBadgeText={destinyBiasIntroCopy.coinBadge} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-6 md:pb-14 md:pt-6">

        <AnimatePresence>
          {toast ? (
            <m.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-3 ${styles.toastPill}`}
            >
              {toast}
            </m.p>
          ) : null}
        </AnimatePresence>

        <div className="space-y-4 md:space-y-5">
          {uiStep === 0 ? (
            <>
              <BiasDestinyHero onEnter={() => setUiStep(1)} stageLoading={stageLoading} />
              <BiasDestinyStageLineup />
            </>
          ) : null}

          {uiStep > 0 ? (
            <>
              <MyDestinyBiasHero subtitle={destinyBiasIntroCopy.lead} />
              <DestinyBiasProgress current={uiStep === 5 ? 5 : uiStep} />
            </>
          ) : null}

            {uiStep === 1 ? (
              <BiasDestinyInputPanel
                stepLabel="STEP 01 · FAN PROFILE CHECK"
                title={destinyBiasClientText("destinyBiasClient.title.007")}
                description={destinyBiasClientText("destinyBiasClient.description.001")}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="NAME / 이름"
                    label={destinyBiasClientText("destinyBiasClient.label.001")}
                    value={meInput.name}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, name: value }))}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.001")}
                    maxLength={24}
                  />

                  <InputField
                    subLabel="BIRTH DATE / 생년월일"
                    label={destinyBiasClientText("destinyBiasClient.label.002")}
                    value={meInput.birthDateInput}
                    onChange={(value) => {
                      setMeInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "me");
                      else setBirthInputErrors((prev) => ({ ...prev, me: "" }));
                    }}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.002")}
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.me}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="BIRTH TIME / 태어난 시간"
                    label={destinyBiasClientText("destinyBiasClient.label.003")}
                    value={meInput.birthTimeInput}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.003")}
                    inputMode="numeric"
                    maxLength={4}
                  />

                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">GENDER / 성별</span>
                    <span className="font-semibold text-white/95">성별</span>
                    <select
                      value={meGender}
                      onChange={(event) => setMeGender(event.target.value as (typeof GENDER_OPTIONS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {GENDER_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-4 text-xs text-white/70">입력 정보는 최애운명 분석 목적의 계산에만 사용됩니다.</p>
              </BiasDestinyInputPanel>
            ) : null}

            {uiStep === 2 ? (
              <BiasDestinyInputPanel
                stepLabel="STEP 02 · BIAS LINK"
                title={destinyBiasClientText("destinyBiasClient.title.008")}
                description={destinyBiasClientText("destinyBiasClient.description.002")}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="BIAS NAME / 최애 이름"
                    label={destinyBiasClientText("destinyBiasClient.label.004")}
                    value={biasInput.name}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, name: value }));
                    }}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.004")}
                    maxLength={24}
                  />

                  <InputField
                    subLabel="BIRTH DATE / 생년월일"
                    label={destinyBiasClientText("destinyBiasClient.label.005")}
                    value={biasInput.birthDateInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "bias");
                      else setBirthInputErrors((prev) => ({ ...prev, bias: "" }));
                    }}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.005")}
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.bias}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="ARTIST / 그룹 또는 아티스트"
                    label={destinyBiasClientText("destinyBiasClient.label.006")}
                    value={biasArtistInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasArtistInput(value);
                    }}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.006")}
                    maxLength={36}
                  />

                  <InputField
                    subLabel="BIRTH TIME / 태어난 시간"
                    label={destinyBiasClientText("destinyBiasClient.label.007")}
                    value={biasInput.birthTimeInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, birthTimeInput: value }));
                    }}
                    placeholder={destinyBiasClientText("destinyBiasClient.placeholder.007")}
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>

                <div className={`${styles.celebPickerShell} mt-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">STAR ARCHIVE / 유명인·캐릭터 바로 불러오기</p>
                      <h3 className="mt-1 text-base font-black text-white">사주 분석 화면 기반 프로필을 빠르게 채우기</h3>
                      <p className="mt-1 text-sm leading-6 text-white/72">
                        아이돌, 배우, 정치인, 애니 캐릭터까지 검색하거나 탭으로 골라서 이름과 생년월일을 한 번에 입력할 수 있어요.
                      </p>
                    </div>
                    <div className={styles.celebCountBadge}>{filteredCelebPresets.length}명 표시 중</div>
                  </div>

                  <div className="mt-3">
                    <div className={styles.celebQuickGrid}>
                      {featuredCelebPresets.map((preset) => {
                        const selected = preset.id === selectedCelebPresetId;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyCelebPreset(preset)}
                            className={`${styles.celebQuickChip} ${selected ? styles.celebQuickChipActive : ""}`}
                          >
                            <span className="text-sm font-black text-white">{preset.name}</span>
                            <span className="mt-1 text-[11px] text-cyan-100/80">{preset.artist || preset.category}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <input
                      type="text"
                      value={biasPresetQuery}
                      onChange={(event) => setBiasPresetQuery(event.target.value)}
                      placeholder={destinyBiasClientText("destinyBiasClient.placeholder.008")}
                      className="h-12 rounded-xl border border-white/20 bg-black/35 px-3 text-sm text-white outline-none ring-1 ring-transparent transition placeholder:text-white/45 focus:border-cyan-200/70 focus:ring-cyan-200/35"
                    />
                    <div className={styles.celebTabRow}>
                      {destinyBiasCelebCategories.map((category) => {
                        const active = activeCelebCategory === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setActiveCelebCategory(category);
                              if (category !== "애니 캐릭터") setActiveAnimeSeries("전체 작품");
                            }}
                            className={`${styles.celebTabBtn} ${active ? styles.celebTabBtnActive : ""}`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeCelebCategory === "애니 캐릭터" ? (
                    <div className="mt-2 grid gap-2">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-cyan-100/82">작품별로 좁혀보기</p>
                      <div className={styles.celebTabRow}>
                        {animeSeriesOptions.map((seriesName) => {
                          const active = activeAnimeSeries === seriesName;
                          return (
                            <button
                              key={seriesName}
                              type="button"
                              onClick={() => setActiveAnimeSeries(seriesName)}
                              className={`${styles.celebTabBtn} ${active ? styles.celebTabBtnActive : ""}`}
                            >
                              {seriesName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedCelebPreset ? (
                    <div className={`${styles.celebSelectedBar} mt-3`}>
                      <div>
                        <p className="text-sm font-black text-white">{selectedCelebPreset.sourceLabel}</p>
                        <p className="mt-1 text-xs text-white/72">
                          생일 {formatBirthdayPreview(selectedCelebPreset.birthDateInput)}
                          {selectedCelebPreset.timeKnown
                            ? ` · 시간 ${formatTimePreview(selectedCelebPreset.birthTimeInput)}`
                            : " · 시간 정보는 비공개라 생일만 자동 입력했어요."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyCelebPreset(selectedCelebPreset)}
                        className="rounded-full border border-cyan-200/40 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-300/20"
                      >
                        다시 넣기
                      </button>
                    </div>
                  ) : null}

                  <div className={`${styles.celebListGrid} mt-3`}>
                    {filteredCelebPresets.slice(0, celebVisibleCount).map((preset) => {
                      const selected = preset.id === selectedCelebPresetId;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyCelebPreset(preset)}
                          className={`${styles.celebCard} ${selected ? styles.celebCardSelected : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-white">{preset.name}</p>
                              <p className="mt-1 text-xs text-cyan-100/82">{preset.artist || preset.category}</p>
                            </div>
                            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 text-[10px] font-semibold text-white/72">
                              {preset.category}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-white/72">
                            {formatBirthdayPreview(preset.birthDateInput)}
                            {preset.timeKnown ? ` · ${formatTimePreview(preset.birthTimeInput)}` : " · 시간 비공개"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {filteredCelebPresets.length > celebVisibleCount ? (
                    <div className="mt-3 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setCelebVisibleCount((prev) => prev + CELEB_PAGE_SIZE)}
                        className="rounded-full border border-cyan-200/40 bg-cyan-300/10 px-5 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-300/20"
                      >
                        더보기 ({celebVisibleCount}/{filteredCelebPresets.length})
                      </button>
                    </div>
                  ) : null}

                  {filteredCelebPresets.length === 0 ? (
                    <p className="mt-3 text-sm text-white/68">검색 결과가 없어요. 이름 일부나 그룹명으로 다시 찾아보세요.</p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">BIAS MOOD / 최애 분위기</span>
                    <span className="font-semibold text-white/95">최애 분위기</span>
                    <select
                      value={biasMood}
                      onChange={(event) => setBiasMood(event.target.value as (typeof BIAS_MOODS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {BIAS_MOODS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">CHEMISTRY / 관계 감성</span>
                    <span className="font-semibold text-white/95">관계 감성</span>
                    <select
                      value={relationMood}
                      onChange={(event) => setRelationMood(event.target.value as (typeof RELATION_MOODS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {RELATION_MOODS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">PHOTO MERGE / 포토카드 합성</p>
                  <h3 className="mt-1 text-base font-black text-white">최애 이미지 업로드하기</h3>
                  <p className="mt-1 text-sm leading-6 text-white/75">
                    업로드한 이미지를 결과 카드의 글래스 프레임에 자동 합성해요. 12MB 이하, PNG/JPG/WEBP 권장.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(92deg,#22d3ee,#8b5cf6,#ec4899)] px-4 py-2 text-xs font-extrabold text-white shadow-[0_12px_28px_rgba(139,92,246,0.38)] transition hover:-translate-y-0.5">
                      이미지 선택
                      <input type="file" accept="image/*" className="sr-only" onChange={handleBiasImageChange} />
                    </label>
                    {biasImageDataUrl ? (
                      <button
                        type="button"
                        onClick={clearBiasImage}
                        className="rounded-full border border-white/25 bg-white/8 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10"
                      >
                        업로드 초기화
                      </button>
                    ) : null}
                  </div>

                  {biasImageDataUrl ? (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-cyan-200/25 bg-cyan-300/8 p-2">
                      <Image
                        src={biasImageDataUrl}
                        alt={destinyBiasClientText("destinyBiasClient.alt.001")}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 rounded-xl border border-white/20 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-cyan-100">{biasImageName || "업로드 완료"}</p>
                        <p className="mt-0.5 text-[11px] text-white/70">결과 카드에서 유리 질감 포토카드로 합성됩니다.</p>
                      </div>
                    </div>
                  ) : null}

                  {biasImageError ? <p className="mt-2 text-xs text-[#FF9AD8]">{biasImageError}</p> : null}
                </div>
              </BiasDestinyInputPanel>
            ) : null}

            {uiStep === 3 ? (
              <BiasDestinyInputPanel
                stepLabel="STEP 03 · STAGE THEME"
                title={destinyBiasClientText("destinyBiasClient.title.009")}
                description={destinyBiasClientText("destinyBiasClient.description.003")}
              >
                <div
                  className={`${styles.themePanelGlow} p-3 md:p-4`}
                  style={{ "--theme-beam": selectedTheme.preview } as CSSProperties}
                >
                  <div className="relative z-10">
                  <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[var(--bias-gold)]/85">
                    LIGHTING RIG · 무대 조명을 고르세요
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {destinyBiasThemeChoices.map((theme) => {
                      const active = activeThemeKey === theme.key;
                      return (
                        <button
                          key={theme.key}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${theme.name} 테마 ${active ? "선택됨" : "선택"}`}
                          onClick={() => setActiveThemeKey(theme.key)}
                          style={{ "--theme-beam": theme.preview } as CSSProperties}
                          className={`${styles.themeStageCard} ${active ? styles.themeStageCardActive : ""}`}
                        >
                          <div className={styles.themeStageWell}>
                            <span className={styles.themeStageBeam} aria-hidden />
                            <span className={styles.themeStageFloor} aria-hidden />
                            <span className={styles.themeStageRig} aria-hidden />
                            <span className={styles.themeStageLip} aria-hidden />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-white">{theme.name}</p>
                              {active ? (
                                <span className="rounded-full border border-[var(--bias-gold)]/60 bg-[var(--bias-gold)]/20 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-[var(--bias-gold)]">
                                  ON AIR
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-white/75">{theme.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </div>
                </div>
              </BiasDestinyInputPanel>
            ) : null}

            {uiStep === 4 ? (
              <BiasDestinyStageLoading
                message={destinyBiasLoadingMessages[loadingMessageIndex]}
                progress={loadingProgress}
              />
            ) : null}

          {uiStep === 5 && resultVm ? (
            <section className="mx-auto w-full max-w-5xl space-y-5">
              <article className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(145deg,rgba(7,4,22,0.84),rgba(26,11,63,0.56))] p-5 shadow-[0_0_48px_rgba(109,59,255,0.22)] md:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(255,217,138,0.24),transparent_38%),radial-gradient(circle_at_88%_88%,rgba(255,95,210,0.18),transparent_35%)]" aria-hidden />
                <div className={styles.spotCone} aria-hidden />
                <div className={styles.stageFloorLine} aria-hidden />
                <div className="relative z-10">
                  <p className="text-xs font-semibold tracking-[0.15em] text-[var(--bias-gold)]/90">ENCORE · FAN CONCERT DESTINY REPORT</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{resultVm.biasName}와의 최애운명 메인 리포트</h2>
                  <p className="mt-2 max-w-3xl break-keep text-sm leading-7 text-white/88">
                    {resultVm.chemistrySummary}
                  </p>
                  <div className="mt-3 inline-flex">
                    <FansignEditionBadge editionLabel={resultVm.editionLabel} destinyGrade={resultVm.destinyGrade} />
                  </div>
                </div>
              </article>

              <BiasDestinyScoreGauge vm={resultVm} />

              <BiasDestinyMainCard vm={resultVm} biasImageUrl={biasImageDataUrl} />

              <BiasDestinyElementChart vm={resultVm} />

              <BiasDestinyFiveSections vm={resultVm} />

              <BiasDestinyMzZone vm={resultVm} />

              <BiasDestinyShareCard vm={resultVm} />

              <section className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--bias-gold)]/85">저장 · 공유 SAVE &amp; SHARE</p>
                <DestinyBiasActionBar
                  onDownloadSvg={handleDownloadSvg}
                  onDownloadPng={() => {
                    handleDownloadPng().catch(() => null);
                  }}
                  onShare={() => {
                    handleShareResult().catch(() => null);
                  }}
                  onShareToX={handleShareToX}
                  onShareToInstagram={() => {
                    handleShareToInstagram().catch(() => null);
                  }}
                  onShareToKakao={() => {
                    handleShareToKakao().catch(() => null);
                  }}
                  onCopy={() => {
                    handleCopyResult().catch(() => null);
                  }}
                  onRetry={handleRetry}
                  onTryAnother={handleTryAnotherBias}
                />
              </section>

              <p className="pt-1 text-center text-[11px] leading-5 text-white/55">
                {resultVm.bottomNotice}
              </p>
            </section>
          ) : null}

          {error ? (
            <p className={styles.warnMsg}>
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {uiStep > 0 && uiStep < 4 ? (
        <div className={`fixed inset-x-0 bottom-0 md:hidden ${styles.stickyCtaBar}`} {...guardHandlers}>
          <div className="mx-auto flex w-full max-w-7xl gap-2">
            {uiStep > 0 ? (
              <button
                type="button"
                onClick={onSafeClick(() => setUiStep((prev) => (prev - 1) as UiStep))}
                className="min-h-11 flex-1 rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white"
              >
                이전
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={onSafeClick(() => nextStep(uiStep as 1 | 2 | 3))}
                className={`flex-1 ${styles.primaryCta}`}
              >
                Cosmic Stage 입장
              </button>
            ) : (
              <button
                type="button"
                onClick={onSafeClick(() => {
                  analyze().catch(() => null);
                })}
                disabled={analyzing}
                className={`flex-1 ${styles.primaryCta}`}
              >
                {analyzing ? "결제 진행 중..." : "결제하기"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {uiStep > 0 && uiStep < 4 ? (
        <div className="mx-auto hidden w-full max-w-7xl px-6 pb-6 md:block">
          <div className="mt-4 flex gap-2">
            {uiStep > 0 ? (
              <button
                type="button"
                onClick={() => setUiStep((prev) => (prev - 1) as UiStep)}
                className="min-h-11 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white"
              >
                이전
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={() => nextStep(uiStep as 1 | 2 | 3)}
                className={`px-8 ${styles.primaryCta}`}
              >
                Cosmic Stage 입장
              </button>
            ) : (
              <button
                type="button"
                onClick={() => analyze().catch(() => null)}
                disabled={analyzing}
                className={`px-8 ${styles.primaryCta}`}
              >
                {analyzing ? "결제 진행 중..." : "결제하기"}
              </button>
            )}
          </div>
        </div>
      ) : null}

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
