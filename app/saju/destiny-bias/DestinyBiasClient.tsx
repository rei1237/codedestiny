"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { fetchBillingBalance, runBillingCoinGate } from "@/app/_lib/billing-client";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import BiasDestinyHero from "./components/BiasDestinyHero";
import BiasDestinyInputPanel from "./components/BiasDestinyInputPanel";
import BiasDestinyMainCard from "./components/BiasDestinyMainCard";
import BiasDestinyResultTabs from "./components/BiasDestinyResultTabs";
import BiasDestinyShareCard from "./components/BiasDestinyShareCard";
import BiasDestinySpotlightBackground from "./components/BiasDestinySpotlightBackground";
import BiasDestinyStageLoading from "./components/BiasDestinyStageLoading";
import BiasDestinyStageSummary from "./components/BiasDestinyStageSummary";
import DestinyBiasCoinModal from "./components/DestinyBiasCoinModal";
import DestinyBiasProgress from "./components/DestinyBiasProgress";
import DestinyBiasActionBar from "./components/DestinyBiasActionBar";
import FansignEditionBadge from "./components/FansignEditionBadge";
import MyDestinyBiasHero from "./components/MyDestinyBiasHero";
import DestinyBiasHeader from "./components/DestinyBiasHeader";
import styles from "./destiny-bias.module.css";
import { destinyBiasIntroCopy, destinyBiasLoadingMessages } from "./lib/destinyBiasCopy";
import { destinyBiasThemeChoices } from "./lib/destinyBiasTheme";
import { useDestinyBiasTouchGuard } from "./lib/destinyBiasTouchGuard";
import type { DestinyBiasResultViewModel, PersonInputState } from "./lib/types";
import { analyzeDestinyBias } from "./engine/destinyBiasEngine";
import { normalizeBirthDateInput } from "./engine/birthEnergy";
import { downloadSvg } from "./utils/downloadSvg";
import { downloadPngFromSvg } from "./utils/downloadPngFromSvg";

const DEFAULT_ANALYZE_COST = 50;
const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";
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

function toPaddedNumber(value: unknown, length: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.trunc(parsed)).padStart(length, "0");
}

function buildBirthDateInput(birth: StoredProfile["birth"]) {
  const year = toPaddedNumber(birth?.year, 4);
  const month = toPaddedNumber(birth?.month, 2);
  const day = toPaddedNumber(birth?.day, 2);
  if (!year || !month || !day) return "";
  return `${year}${month}${day}`;
}

function normalizeBirthDateDigits(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 8) return digits;
  if (digits.length === 6) return `${digits.slice(0, 4)}01${digits.slice(4)}`;
  return "";
}

function buildBirthDateInputFromText(profile: StoredProfile) {
  const candidates = [profile.birthDate, profile.birthIso, profile.birth?.year ? `${profile.birth.year}-${profile.birth.month}-${profile.birth.day}` : ""];
  for (const candidate of candidates) {
    const digits = normalizeBirthDateDigits(candidate);
    if (digits) return digits;
  }
  return "";
}

function buildBirthTimeInputFromText(profile: StoredProfile) {
  const candidates = [profile.birthTime, profile.birthIso, profile.birth?.hour !== undefined && profile.birth?.minute !== undefined ? `${profile.birth.hour}:${profile.birth.minute}` : ""];
  for (const candidate of candidates) {
    const digits = String(candidate || "").replace(/\D/g, "");
    if (digits.length === 4) return digits;
    if (digits.length === 2) return `${digits}00`;
  }
  return "";
}

function buildBirthTimeInput(birth: StoredProfile["birth"]) {
  const hour = toPaddedNumber(birth?.hour, 2);
  const minute = toPaddedNumber(birth?.minute, 2);
  if (!hour || !minute) return "";
  return `${hour}${minute}`;
}

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

function normalizeGenderOption(value: unknown): (typeof GENDER_OPTIONS)[number] | "" {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^(f|female|woman|여|여성)$/i.test(raw)) return "여성";
  if (/^(m|male|man|남|남성)$/i.test(raw)) return "남성";
  if (/^(other|기타)$/i.test(raw)) return "기타";

  return "";
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
    const scope = resolveAuthScopeFromUser(user) || "guest";
    const listRaw = localStorage.getItem(`${PROFILE_NS}.list::${scope}`) || localStorage.getItem(`${PROFILE_NS}.list`) || "[]";
    const currentId =
      localStorage.getItem(`${PROFILE_NS}.current::${scope}`) ||
      localStorage.getItem(`${PROFILE_NS}.current`) ||
      "";
    const list = JSON.parse(listRaw) as StoredProfile[];
    const fallbackName = String(user?.name || "").trim();
    const fallbackBirthDateInput = normalizeBirthDateText(user?.birthDate);
    const fallbackBirthTimeInput = normalizeBirthTimeText(user?.birthTime);
    const fallbackGender = normalizeGenderOption(user?.gender);

    if (!Array.isArray(list) || list.length === 0) {
      return {
        name: fallbackName,
        birthDateInput: fallbackBirthDateInput,
        birthTimeInput: fallbackBirthTimeInput,
        gender: fallbackGender,
      };
    }
    const profile = (currentId ? list.find((item) => item?.id === currentId) : undefined) || list[0];
    const profileBirthDateInput = buildBirthDateInput(profile?.birth);
    const profileBirthTimeInput = buildBirthTimeInput(profile?.birth);
    const profileBirthDateTextInput = buildBirthDateInputFromText(profile || {});
    const profileBirthTimeTextInput = buildBirthTimeInputFromText(profile || {});
    return {
      name: String(profile?.name || fallbackName).trim(),
      birthDateInput: profileBirthDateInput || profileBirthDateTextInput || fallbackBirthDateInput,
      birthTimeInput: profileBirthTimeInput || profileBirthTimeTextInput || fallbackBirthTimeInput,
      gender: normalizeGenderOption(profile?.gender) || fallbackGender,
    };
  } catch (e) {
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
  } catch (e) {
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
    <label className="grid gap-0.5 text-sm text-white/90">
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
  const reduceMotion = useReducedMotion();
  const { guardHandlers, shouldBlockClick } = useDestinyBiasTouchGuard();

  const [uiStep, setUiStep] = useState<UiStep>(0);
  const [meInput, setMeInput] = useState<PersonInputState>(INITIAL_ME);
  const [biasInput, setBiasInput] = useState<PersonInputState>(INITIAL_BIAS);
  const [meGender, setMeGender] = useState<(typeof GENDER_OPTIONS)[number]>(() => readCurrentProfileSeed().gender || "기타");
  const [biasArtistInput, setBiasArtistInput] = useState("");
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
  const [canUsePremiumTheme, setCanUsePremiumTheme] = useState(false);
  const [isLowSpec, setIsLowSpec] = useState(false);

  const [coinModal, setCoinModal] = useState({
    open: false,
    title: "안내",
    message: "",
    requiredCoins: 0,
    loginRequired: false,
  });

  const selectedTheme = useMemo(() => {
    return destinyBiasThemeChoices.find((item) => item.key === activeThemeKey) || destinyBiasThemeChoices[0];
  }, [activeThemeKey]);

  useEffect(() => {
    const localToken = readLocalToken();
    const user = readSanitizedAuthUser();
    const loggedIn = Boolean(localToken || user?.id || user?.userId);

    setIsLoggedIn(loggedIn);

    if (!loggedIn) return;

    fetchBillingBalance()
      .then((response) => {
        if (!response.ok || !response.data) return;
        const tier = String((response.data.user as Record<string, unknown> | null)?.profileSubscriptionTier || "").toLowerCase();
        const premiumByTier = tier === "premium" || tier === "vvip";
        const unlockMap = response.data.unlockMap || {};
        const premiumByFeature = Boolean(unlockMap["destiny-bias-theme-premium"]);
        setCanUsePremiumTheme(premiumByTier || premiumByFeature);
      })
      .catch(() => {
        setCanUsePremiumTheme(false);
      });
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
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, []);

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
        title: "로그인이 필요해요",
        message: "최애운명 분석은 계정 확인 후 진행됩니다. 로그인 후 다시 시도해 주세요.",
        requiredCoins: DEFAULT_ANALYZE_COST,
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

      const requestId = `destiny-bias:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

      let coinGateResult = await runBillingCoinGate({
        categoryKey: "destiny-bias",
        featureKey: "destiny-bias-analyze",
        reason: "최애운명 분석",
        requestId,
        forceDeduct: true,
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
            categoryKey: "destiny-bias",
            featureKey: "destiny-bias-analyze",
            reason: "최애운명 분석",
            requestId,
            forceDeduct: true,
          });
        }
      }

      if (!coinGateResult.ok) {
        const code = String(coinGateResult.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED") {
          openCoinNotice({
            title: "로그인 세션이 필요해요",
            message: "세션이 만료되었습니다. 다시 로그인한 뒤 분석을 이어가 주세요.",
            requiredCoins: DEFAULT_ANALYZE_COST,
            loginRequired: true,
          });
          throw new Error("로그인 후 다시 시도해 주세요.");
        }

        if (code === "INSUFFICIENT_COINS") {
          openCoinNotice({
            title: "코인이 부족해요",
            message: "최애운명 분석에는 코인이 필요합니다. 충전 후 다시 실행해 주세요.",
            requiredCoins: DEFAULT_ANALYZE_COST,
          });
          throw new Error("코인이 부족합니다.");
        }

        throw new Error(coinGateResult.error?.message || "코인 결제 확인에 실패했습니다.");
      }

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
        if (analysisError.message !== "코인이 부족합니다." && analysisError.message !== "로그인 후 다시 시도해 주세요.") {
          setError(analysisError.message);
        }
      } else {
        setError("분석 중 오류가 발생했습니다.");
      }
    } finally {
      setAnalyzing(false);
    }
  }, [
    analyzing,
    biasInput.birthDateInput,
    biasInput.name,
    biasArtistInput,
    biasMood,
    isLoggedIn,
    meInput.birthDateInput,
    meInput.name,
    openCoinNotice,
    relationMood,
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
      setError(downloadError instanceof Error ? downloadError.message : "PNG 저장에 실패했습니다.");
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
    } catch (e) {
      setError("결과 복사에 실패했습니다.");
    }
  }, [resultVm]);

  const handleShareResult = useCallback(async () => {
    if (!resultVm || typeof navigator === "undefined") return;

    const text = `${resultVm.biasName}와의 궁합 ${resultVm.totalScore}점 · ${resultVm.destinyGrade}\n${resultVm.oneLineDestinyMessage}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Destiny Bias",
          text,
          url: window.location.href,
        });
        setToast("결과를 공유했어요.");
        return;
      } catch (e) {
        // 사용자가 공유 창을 닫은 경우는 조용히 처리
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setToast("공유용 텍스트를 복사했어요.");
    } catch (e) {
      setError("공유 텍스트 복사에 실패했습니다.");
    }
  }, [resultVm]);

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
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-3 ${styles.toastPill}`}
            >
              {toast}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div className="space-y-4 md:space-y-5">
          {uiStep === 0 ? <BiasDestinyHero onEnter={() => setUiStep(1)} stageLoading={stageLoading} /> : null}

          {uiStep > 0 ? (
            <>
              <MyDestinyBiasHero subtitle={destinyBiasIntroCopy.lead} />
              <DestinyBiasProgress current={uiStep === 5 ? 5 : uiStep} />
            </>
          ) : null}

            {uiStep === 1 ? (
              <BiasDestinyInputPanel
                stepLabel="STEP 01 · FAN PROFILE CHECK"
                title="당신의 팬라이트 에너지를 확인할게요"
                description="이름과 생년월일을 입력하면 무대 입장 전 당신의 사주 에너지 베이스를 먼저 정렬합니다."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="NAME / 이름"
                    label="나의 이름/닉네임"
                    value={meInput.name}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, name: value }))}
                    placeholder="예: 네오"
                    maxLength={24}
                  />

                  <InputField
                    subLabel="BIRTH DATE / 생년월일"
                    label="나의 생년월일"
                    value={meInput.birthDateInput}
                    onChange={(value) => {
                      setMeInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "me");
                      else setBirthInputErrors((prev) => ({ ...prev, me: "" }));
                    }}
                    placeholder="예: 19910220"
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.me}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="BIRTH TIME / 태어난 시간"
                    label="태어난 시간은 선택 입력"
                    value={meInput.birthTimeInput}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder="예: 1430 (선택)"
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
                title="최애 프로필로 스테이지 케미를 연결할게요"
                description="최애 정보와 무드를 입력하면 나의 사주 에너지와 겹치는 공명 포인트를 스테이지 기준으로 계산합니다."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="BIAS NAME / 최애 이름"
                    label="최애 이름"
                    value={biasInput.name}
                    onChange={(value) => setBiasInput((prev) => ({ ...prev, name: value }))}
                    placeholder="예: MY BIAS"
                    maxLength={24}
                  />

                  <InputField
                    subLabel="BIRTH DATE / 생년월일"
                    label="최애의 생년월일"
                    value={biasInput.birthDateInput}
                    onChange={(value) => {
                      setBiasInput((prev) => ({ ...prev, birthDateInput: value }));
                      if (value.trim()) validateBirthInput(value, "bias");
                      else setBirthInputErrors((prev) => ({ ...prev, bias: "" }));
                    }}
                    placeholder="예: 20001225"
                    inputMode="numeric"
                    maxLength={10}
                    error={birthInputErrors.bias}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InputField
                    subLabel="ARTIST / 그룹 또는 아티스트"
                    label="연결 아티스트/그룹"
                    value={biasArtistInput}
                    onChange={setBiasArtistInput}
                    placeholder="예: STARLIGHT UNIT"
                    maxLength={36}
                  />

                  <InputField
                    subLabel="BIRTH TIME / 태어난 시간"
                    label="태어난 시간은 선택 입력"
                    value={biasInput.birthTimeInput}
                    onChange={(value) => setBiasInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder="예: 0915 (선택)"
                    inputMode="numeric"
                    maxLength={4}
                  />
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
                      <img
                        src={biasImageDataUrl}
                        alt="업로드한 최애 이미지 미리보기"
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
                title="콘서트 무대 톤을 선택해 주세요"
                description="무대의 조명 온도와 오라 색감을 선택합니다. 계산 결과는 동일하고, 표현되는 카드 스타일만 달라집니다."
              >
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {destinyBiasThemeChoices.map((theme) => {
                    const locked = theme.premium && !canUsePremiumTheme;
                    const active = activeThemeKey === theme.key;
                    return (
                      <button
                        key={theme.key}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${theme.name} 테마 ${active ? "선택됨" : "선택"}${locked ? " (프리미엄 필요)" : ""}`}
                        onClick={() => {
                          if (locked) {
                            setToast("프리미엄 테마는 구독 또는 언락 후 선택할 수 있어요.");
                            return;
                          }
                          setActiveThemeKey(theme.key);
                        }}
                        className={`group overflow-hidden rounded-2xl border bg-white/5 text-left transition ${
                          active
                            ? "border-pink-200/80 shadow-[0_0_0_1px_rgba(251,113,229,0.45),0_10px_28px_rgba(251,113,229,0.28)]"
                            : "border-white/20 hover:border-cyan-200/60 hover:bg-cyan-300/10"
                        } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="h-24" style={{ background: theme.preview }} />
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-white">{theme.name}</p>
                            {active ? (
                              <span className="rounded-full border border-pink-200/60 bg-pink-300/20 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-pink-100">
                                SELECTED
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-white/75">{theme.description}</p>
                          <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{theme.premium ? "PREMIUM" : "FREE"}</p>
                        </div>
                      </button>
                    );
                  })}
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
              <article className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(145deg,rgba(8,18,44,0.8),rgba(25,20,70,0.54))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.45)] md:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(244,114,182,0.26),transparent_38%),radial-gradient(circle_at_88%_88%,rgba(34,211,238,0.2),transparent_35%)]" aria-hidden />
                <div className="relative z-10">
                  <p className="text-xs font-semibold tracking-[0.15em] text-[#FFD98A]/90">FAN CONCERT DESTINY REPORT</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{resultVm.biasName}와의 최애운명 메인 리포트</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-white/88">
                    오늘 당신과 최애 사이에는 은은하지만 선명한 공명이 흐르고 있어요.
                    무대 위의 잔광처럼, 이 인연은 시간이 지날수록 더 깊게 울립니다.
                  </p>
                  <div className="mt-3 inline-flex">
                    <FansignEditionBadge editionLabel={resultVm.editionLabel} destinyGrade={resultVm.destinyGrade} />
                  </div>
                </div>
              </article>

              <BiasDestinyMainCard vm={resultVm} biasImageUrl={biasImageDataUrl} />

              <BiasDestinyResultTabs vm={resultVm} />

              <BiasDestinyStageSummary vm={resultVm} />

              <BiasDestinyShareCard vm={resultVm} />

              <section className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">저장 · 공유 SAVE &amp; SHARE</p>
                <DestinyBiasActionBar
                  onDownloadSvg={handleDownloadSvg}
                  onDownloadPng={() => {
                    handleDownloadPng().catch(() => null);
                  }}
                  onShare={() => {
                    handleShareResult().catch(() => null);
                  }}
                  onCopy={() => {
                    handleCopyResult().catch(() => null);
                  }}
                  onRetry={handleRetry}
                  onTryAnother={handleTryAnotherBias}
                />
              </section>
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
                {analyzing ? "운명 연결 중..." : "운명 연결 시작하기"}
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
                {analyzing ? "운명 연결 중..." : "운명 연결 시작하기"}
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
