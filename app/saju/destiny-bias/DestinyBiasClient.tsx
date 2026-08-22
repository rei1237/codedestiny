"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
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
import BiasFandomHeroCard from "./components/BiasFandomHeroCard";
import BiasFandomJourneyCard from "./components/BiasFandomJourneyCard";
import BiasFandomBehaviorSection from "./components/BiasFandomBehaviorSection";
import BiasFandomPersistenceCard from "./components/BiasFandomPersistenceCard";
import BiasFandomDetachmentCard from "./components/BiasFandomDetachmentCard";
import BiasFandomFinaleCard from "./components/BiasFandomFinaleCard";
import BiasDestinyShareCard from "./components/BiasDestinyShareCard";
import BiasDestinySpotlightBackground from "./components/BiasDestinySpotlightBackground";
import BiasDestinyStageLoading from "./components/BiasDestinyStageLoading";
import DestinyBiasCoinModal from "./components/DestinyBiasCoinModal";
import DestinyBiasProgress from "./components/DestinyBiasProgress";
import DestinyBiasActionBar from "./components/DestinyBiasActionBar";
import FansignEditionBadge from "./components/FansignEditionBadge";
import MyDestinyBiasHero from "./components/MyDestinyBiasHero";
import DestinyBiasHeader from "./components/DestinyBiasHeader";
import { useDestinyBiasCopy, type DestinyBiasCopy } from "./_lib/copy";
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
  // 신규 필드는 en/ja/zh만 채우고 나머지 로케일은 getDestinyBiasCopy()가 EN과 병합해
  // 자동으로 채우므로(app/saju/destiny-bias/_lib/copy.ts), 이 캐스트는 실제 undefined 위험이 없다.
  const copy = useDestinyBiasCopy() as Required<DestinyBiasCopy>;

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
    title: copy.clientGuideTitle,
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
      setBiasImageError(copy.clientImageTypeError);
      event.target.value = "";
      return;
    }

    const maxBytes = MAX_BIAS_IMAGE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setBiasImageError(copy.clientImageSizeError(MAX_BIAS_IMAGE_SIZE_MB));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        setBiasImageError(copy.clientImageReadError);
        event.target.value = "";
        return;
      }

      setBiasImageDataUrl(dataUrl);
      setBiasImageName(file.name || "my-bias-image");
      setBiasImageError("");
      setToast(copy.clientImageReadyToast);
    };

    reader.onerror = () => {
      setBiasImageError(copy.clientImageProcessError);
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }, [copy]);

  const clearBiasImage = useCallback(() => {
    setBiasImageDataUrl("");
    setBiasImageName("");
    setBiasImageError("");
    setToast(copy.clientImageClearedToast);
  }, [copy]);

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
      if (!meInput.name.trim()) return copy.clientInsufficientNamePrompt;
      const meBirth = validateBirthInput(meInput.birthDateInput, "me");
      if (meBirth.ok === false) return copy.clientMyBirthErrorPrefix(meBirth.reason);
    }

    if (step === 2) {
      if (!biasInput.name.trim()) return copy.clientBiasNamePrompt;
      const biasBirth = validateBirthInput(biasInput.birthDateInput, "bias");
      if (biasBirth.ok === false) return copy.clientBiasBirthErrorPrefix(biasBirth.reason);
    }

    return "";
  }, [biasInput.birthDateInput, biasInput.name, copy, meInput.birthDateInput, meInput.name, validateBirthInput]);

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
        ? copy.clientPresetLoadedToast(preset.sourceLabel)
        : copy.clientPresetBirthOnlyToast(preset.sourceLabel),
    );
  }, [copy]);

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
        title: copy.clientLoginRequiredTitle,
        message: copy.clientLoginRequiredMessage,
        loginRequired: true,
      });
      return;
    }

    setError("");
    setAnalyzing(true);
    setUiStep(4);

    try {
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
      setToast(copy.clientAnalysisCompleteToast);
    } catch (analysisError) {
      setResultVm(null);
      setUiStep(3);
      if (analysisError instanceof Error) {
        setError(friendlyErrorMessage(analysisError, copy.clientAnalysisErrorDefault));
      } else {
        setError(copy.clientAnalysisErrorDefault);
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
    copy,
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
    setToast(copy.clientSvgSavedToast);
  }, [copy, resultVm]);

  const handleDownloadPng = useCallback(async () => {
    if (!resultVm) return;
    try {
      await downloadPngFromSvg(resultVm.cardSvg, `my-destiny-bias-${resultVm.destinyId}.png`);
      setToast(copy.clientPngSavedToast);
    } catch (downloadError) {
      setError(friendlyErrorMessage(downloadError, copy.clientPngSaveFailed));
    }
  }, [copy, resultVm]);

  const handleCopyResult = useCallback(async () => {
    if (!resultVm || typeof navigator === "undefined" || !navigator.clipboard) return;
    const summary = [
      `[My Destiny Bias] ${resultVm.biasName}`,
      `${copy.clientSummaryScoreLabel} ${resultVm.totalScore} · ${resultVm.destinyGrade} (${resultVm.gradeTitle})`,
      `${copy.clientSummaryEnergyLabel} ${resultVm.auraType} / ${resultVm.auraMaterial}`,
      `${copy.clientSummaryPairingLabel} ${resultVm.pairingAlias}`,
      `${copy.clientSummaryMessageLabel} ${resultVm.oneLineDestinyMessage}`,
      `${copy.clientSummaryFansignLabel} ${resultVm.fansignMessage}`,
      `Destiny ID ${resultVm.destinyId}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setToast(copy.clientCopySummaryToast);
    } catch {
      setError(copy.clientCopyResultFailed);
    }
  }, [copy, resultVm]);

  const handleShareResult = useCallback(async () => {
    if (!resultVm || typeof navigator === "undefined") return;

    const text = copy.clientShareChemistryLine(resultVm.biasName, resultVm.totalScore, resultVm.destinyGrade, resultVm.oneLineDestinyMessage);

    if (navigator.share) {
      try {
        await navigator.share({
          title: copy.clientShareTitle,
          text,
          url: window.location.href,
        });
        setToast(copy.clientShareResultToast);
        return;
      } catch {
        // 사용자가 공유 창을 닫은 경우는 조용히 처리
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setToast(copy.clientShareTextCopiedToast);
    } catch {
      setError(copy.clientShareTextCopyFailed);
    }
  }, [copy, resultVm]);

  const getShareBaseText = useCallback(() => {
    if (!resultVm) return "";
    return copy.clientShareChemistryLine(resultVm.biasName, resultVm.totalScore, resultVm.destinyGrade, resultVm.oneLineDestinyMessage);
  }, [copy, resultVm]);

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
        title: copy.clientShareTitle,
        text,
        url,
        files: [file],
      };

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        return false;
      }

      await navigator.share(payload);
      setToast(copy.clientPlatformShareOpenedToast(platformLabel));
      return true;
    } catch {
      return false;
    }
  }, [buildShareFile, copy, getShareBaseText, resultVm]);

  const handleShareToX = useCallback(() => {
    if (!resultVm || typeof window === "undefined") return;
    const text = getShareBaseText();
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=620,height=720");
    setToast(copy.clientShareToXToast);
  }, [copy, getShareBaseText, resultVm]);

  const handleShareToInstagram = useCallback(async () => {
    if (!resultVm) return;

    const nativeShared = await shareWithNativeSheet(copy.clientPlatformInstagram);
    if (nativeShared) return;

    try {
      await downloadPngFromSvg(resultVm.cardSvg, `my-destiny-bias-${resultVm.destinyId}.png`);
      setToast(copy.clientInstagramSavedToast);
    } catch {
      setError(copy.clientInstagramSaveFailed);
    }
  }, [copy, resultVm, shareWithNativeSheet]);

  const handleShareToKakao = useCallback(async () => {
    if (!resultVm || typeof window === "undefined") return;

    const nativeShared = await shareWithNativeSheet(copy.clientPlatformKakao);
    if (nativeShared) return;

    const text = getShareBaseText();
    const fallback = `${text}\n${window.location.href}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fallback);
      }
      setToast(copy.clientKakaoCopiedToast);
    } catch {
      setError(copy.clientKakaoCopyFailed);
    }
  }, [copy, getShareBaseText, resultVm, shareWithNativeSheet]);

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
    setToast(copy.clientTryAnotherToast);
  }, [copy]);

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
                title={copy.clientStep1Title}
                description={copy.clientStep1Desc}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel={copy.clientNameSubLabel}
                    label={copy.clientMyNameLabel}
                    value={meInput.name}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, name: value }))}
                    placeholder={copy.clientMyNamePlaceholder}
                    maxLength={24}
                  />

                  <InputField
                    subLabel={copy.clientBirthDateSubLabel}
                    label={copy.clientMyBirthDateLabel}
                    value={meInput.birthDateInput}
                    onChange={(value) => {
                      setMeInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "me");
                      else setBirthInputErrors((prev) => ({ ...prev, me: "" }));
                    }}
                    placeholder={copy.clientMyBirthDatePlaceholder}
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.me}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel={copy.clientBirthTimeSubLabel}
                    label={copy.clientBirthTimeOptionalLabel}
                    value={meInput.birthTimeInput}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder={copy.clientMyBirthTimePlaceholder}
                    inputMode="numeric"
                    maxLength={4}
                  />

                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">{copy.clientGenderSubLabel}</span>
                    <span className="font-semibold text-white/95">{copy.clientGenderLabel}</span>
                    <select
                      value={meGender}
                      onChange={(event) => setMeGender(event.target.value as (typeof GENDER_OPTIONS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {GENDER_OPTIONS.map((item) => (
                        <option key={item} value={item}>{copy.clientGenderOptionLabels[item] ?? item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-4 text-xs text-white/70">{copy.clientPrivacyNote}</p>
              </BiasDestinyInputPanel>
            ) : null}

            {uiStep === 2 ? (
              <BiasDestinyInputPanel
                stepLabel="STEP 02 · BIAS LINK"
                title={copy.clientStep2Title}
                description={copy.clientStep2Desc}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel={copy.clientBiasNameSubLabel}
                    label={copy.clientBiasNameFieldLabel}
                    value={biasInput.name}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, name: value }));
                    }}
                    placeholder={copy.clientBiasNamePlaceholder}
                    maxLength={24}
                  />

                  <InputField
                    subLabel={copy.clientBirthDateSubLabel}
                    label={copy.clientBiasBirthDateLabel}
                    value={biasInput.birthDateInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "bias");
                      else setBirthInputErrors((prev) => ({ ...prev, bias: "" }));
                    }}
                    placeholder={copy.clientBiasBirthDatePlaceholder}
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.bias}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel={copy.clientArtistSubLabel}
                    label={copy.clientArtistLabel}
                    value={biasArtistInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasArtistInput(value);
                    }}
                    placeholder={copy.clientArtistPlaceholder}
                    maxLength={36}
                  />

                  <InputField
                    subLabel={copy.clientBirthTimeSubLabel}
                    label={copy.clientBirthTimeOptionalLabel}
                    value={biasInput.birthTimeInput}
                    onChange={(value) => {
                      setSelectedCelebPresetId("");
                      setBiasInput((prev) => ({ ...prev, birthTimeInput: value }));
                    }}
                    placeholder={copy.clientBiasBirthTimePlaceholder}
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>

                <div className={`${styles.celebPickerShell} mt-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">{copy.clientStarArchiveSubLabel}</p>
                      <h3 className="mt-1 text-base font-black text-white">{copy.clientStarArchiveTitle}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/72">
                        {copy.clientStarArchiveDesc}
                      </p>
                    </div>
                    <div className={styles.celebCountBadge}>{copy.clientDisplayCountSuffix(filteredCelebPresets.length)}</div>
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
                      placeholder={copy.clientSearchPlaceholder}
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
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-cyan-100/82">{copy.clientNarrowBySeriesLabel}</p>
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
                          {copy.clientBirthdayPrefix} {formatBirthdayPreview(selectedCelebPreset.birthDateInput)}
                          {selectedCelebPreset.timeKnown
                            ? ` · ${copy.clientTimePrefix} ${formatTimePreview(selectedCelebPreset.birthTimeInput)}`
                            : copy.clientTimeUnknownNote}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyCelebPreset(selectedCelebPreset)}
                        className="rounded-full border border-cyan-200/40 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-300/20"
                      >
                        {copy.clientReapplyButton}
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
                            {preset.timeKnown ? ` · ${formatTimePreview(preset.birthTimeInput)}` : copy.clientTimeHiddenNote}
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
                        {copy.clientLoadMoreButton(celebVisibleCount, filteredCelebPresets.length)}
                      </button>
                    </div>
                  ) : null}

                  {filteredCelebPresets.length === 0 ? (
                    <p className="mt-3 text-sm text-white/68">{copy.clientNoSearchResults}</p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">{copy.clientBiasMoodSubLabel}</span>
                    <span className="font-semibold text-white/95">{copy.clientBiasMoodLabel}</span>
                    <select
                      value={biasMood}
                      onChange={(event) => setBiasMood(event.target.value as (typeof BIAS_MOODS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {BIAS_MOODS.map((item) => (
                        <option key={item} value={item}>{copy.clientBiasMoodOptionLabels[item] ?? item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-0.5 text-sm text-white/90">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/55">{copy.clientChemistrySubLabel}</span>
                    <span className="font-semibold text-white/95">{copy.clientRelationMoodLabel}</span>
                    <select
                      value={relationMood}
                      onChange={(event) => setRelationMood(event.target.value as (typeof RELATION_MOODS)[number])}
                      className={styles.cosmicSelect}
                    >
                      {RELATION_MOODS.map((item) => (
                        <option key={item} value={item}>{copy.clientRelationMoodOptionLabels[item] ?? item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-cyan-100/80">{copy.clientPhotoMergeSubLabel}</p>
                  <h3 className="mt-1 text-base font-black text-white">{copy.clientUploadImageTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/75">
                    {copy.clientUploadImageDesc}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(92deg,#22d3ee,#8b5cf6,#ec4899)] px-4 py-2 text-xs font-extrabold text-white shadow-[0_12px_28px_rgba(139,92,246,0.38)] transition hover:-translate-y-0.5">
                      {copy.clientSelectImageButton}
                      <input type="file" accept="image/*" className="sr-only" onChange={handleBiasImageChange} />
                    </label>
                    {biasImageDataUrl ? (
                      <button
                        type="button"
                        onClick={clearBiasImage}
                        className="rounded-full border border-white/25 bg-white/8 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10"
                      >
                        {copy.clientResetUploadButton}
                      </button>
                    ) : null}
                  </div>

                  {biasImageDataUrl ? (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-cyan-200/25 bg-cyan-300/8 p-2">
                      <Image
                        src={biasImageDataUrl}
                        alt={copy.clientUploadPreviewAlt}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-16 w-16 rounded-xl border border-white/20 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-cyan-100">{biasImageName || copy.clientUploadCompleteDefault}</p>
                        <p className="mt-0.5 text-[11px] text-white/70">{copy.clientUploadHint}</p>
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
                title={copy.clientStep3Title}
                description={copy.clientStep3Desc}
              >
                <div
                  className={`${styles.themePanelGlow} p-3 md:p-4`}
                  style={{ "--theme-beam": selectedTheme.preview } as CSSProperties}
                >
                  <div className="relative z-10">
                  <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[var(--bias-gold)]/85">
                    LIGHTING RIG · {copy.clientLightingRigLabel}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {destinyBiasThemeChoices.map((theme) => {
                      const active = activeThemeKey === theme.key;
                      return (
                        <button
                          key={theme.key}
                          type="button"
                          aria-pressed={active}
                          aria-label={copy.clientThemeAriaLabel(theme.name, active)}
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
                  <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{copy.clientMainReportTitle(resultVm.biasName)}</h2>
                  <p className="mt-2 max-w-3xl break-keep text-sm leading-7 text-white/88">
                    {resultVm.chemistrySummary}
                  </p>
                  <div className="mt-3 inline-flex">
                    <FansignEditionBadge editionLabel={resultVm.editionLabel} destinyGrade={resultVm.destinyGrade} />
                  </div>
                </div>
              </article>

              <BiasFandomHeroCard vm={resultVm} />

              <BiasDestinyMainCard vm={resultVm} biasImageUrl={biasImageDataUrl} />

              <BiasFandomJourneyCard vm={resultVm} />

              <BiasFandomBehaviorSection vm={resultVm} />

              <BiasFandomPersistenceCard vm={resultVm} />

              <BiasFandomDetachmentCard vm={resultVm} />

              <BiasFandomFinaleCard vm={resultVm} />

              <section className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/50">{copy.clientSupplementaryLabel} SUPPLEMENTARY READING</p>
              </section>

              <BiasDestinyScoreGauge vm={resultVm} />

              <BiasDestinyElementChart vm={resultVm} />

              <BiasDestinyFiveSections vm={resultVm} />

              <BiasDestinyMzZone vm={resultVm} />

              <BiasDestinyShareCard vm={resultVm} />

              <section className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--bias-gold)]/85">{copy.clientSaveShareLabel} SAVE &amp; SHARE</p>
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
                {copy.clientPrevButton}
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={onSafeClick(() => nextStep(uiStep as 1 | 2 | 3))}
                className={`flex-1 ${styles.primaryCta}`}
              >
                {copy.clientEnterStageButton}
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
                {analyzing ? copy.clientPayingButton : copy.clientPayButton}
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
                {copy.clientPrevButton}
              </button>
            ) : null}

            {uiStep < 3 ? (
              <button
                type="button"
                onClick={() => nextStep(uiStep as 1 | 2 | 3)}
                className={`px-8 ${styles.primaryCta}`}
              >
                {copy.clientEnterStageButton}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => analyze().catch(() => null)}
                disabled={analyzing}
                className={`px-8 ${styles.primaryCta}`}
              >
                {analyzing ? copy.clientPayingButton : copy.clientPayButton}
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
