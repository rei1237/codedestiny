"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBillingBalance, runBillingCoinGate } from "@/app/_lib/billing-client";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";
import DestinyBiasCoinModal from "./components/DestinyBiasCoinModal";
import DestinyBiasDetailSections from "./components/DestinyBiasDetailSections";
import DestinyBiasLoadingScreen from "./components/DestinyBiasLoadingScreen";
import DestinyBiasPhotocard from "./components/DestinyBiasPhotocard";
import DestinyBiasProgress from "./components/DestinyBiasProgress";
import DestinyBiasActionBar from "./components/DestinyBiasActionBar";
import FansignEditionBadge from "./components/FansignEditionBadge";
import MyDestinyBiasHero from "./components/MyDestinyBiasHero";
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

const BIAS_MOODS = ["청량", "카리스마", "몽환", "러블리", "시크", "힐링"] as const;
const RELATION_MOODS = ["응원형", "성장형", "설렘형", "위로형", "운명형"] as const;

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
  birth?: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
  };
};

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

function buildBirthTimeInput(birth: StoredProfile["birth"]) {
  const hour = toPaddedNumber(birth?.hour, 2);
  const minute = toPaddedNumber(birth?.minute, 2);
  if (!hour || !minute) return "";
  return `${hour}${minute}`;
}

function readCurrentProfileSeed() {
  if (typeof window === "undefined") {
    return {
      name: "",
      birthDateInput: "",
      birthTimeInput: "",
    };
  }
  try {
    const user = readSanitizedAuthUser();
    const scope = resolveAuthScopeFromUser(user) || "guest";
    const listRaw = localStorage.getItem(`${PROFILE_NS}.list::${scope}`) || localStorage.getItem(`${PROFILE_NS}.list`) || "[]";
    const currentId =
      localStorage.getItem(`${PROFILE_NS}.current::${scope}`) ||
      localStorage.getItem(`${PROFILE_NS}.current`) ||
      "";
    const list = JSON.parse(listRaw) as StoredProfile[];
    if (!Array.isArray(list) || list.length === 0) {
      return {
        name: "",
        birthDateInput: "",
        birthTimeInput: "",
      };
    }
    const profile = (currentId ? list.find((item) => item?.id === currentId) : undefined) || list[0];
    return {
      name: String(profile?.name || "").trim(),
      birthDateInput: buildBirthDateInput(profile?.birth),
      birthTimeInput: buildBirthTimeInput(profile?.birth),
    };
  } catch {
    return {
      name: "",
      birthDateInput: "",
      birthTimeInput: "",
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
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-white/90">
      <span className="font-semibold text-white/95">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(maxLength ? event.target.value.slice(0, maxLength) : event.target.value)}
        placeholder={placeholder}
        className="min-h-12 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-fuchsia-200/80"
      />
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}

export default function DestinyBiasClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { guardHandlers, shouldBlockClick } = useDestinyBiasTouchGuard();

  const [uiStep, setUiStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [meInput, setMeInput] = useState<PersonInputState>(INITIAL_ME);
  const [biasInput, setBiasInput] = useState<PersonInputState>(INITIAL_BIAS);

  const [biasMood, setBiasMood] = useState<(typeof BIAS_MOODS)[number]>("청량");
  const [relationMood, setRelationMood] = useState<(typeof RELATION_MOODS)[number]>("응원형");
  const [activeThemeKey, setActiveThemeKey] = useState("moonlight_neon");

  const [analyzing, setAnalyzing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

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
        const nextName = prev.name.trim() ? prev.name : profileSeed.name;
        const nextBirthDate = prev.birthDateInput.trim() ? prev.birthDateInput : profileSeed.birthDateInput;
        const nextBirthTime = prev.birthTimeInput.trim() ? prev.birthTimeInput : profileSeed.birthTimeInput;

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

    if (uiStep <= 1) {
      return false;
    }

    if (uiStep === 5) {
      setUiStep(3);
      setError("");
      return true;
    }

    setUiStep((prev) => {
      if (prev <= 1) return 1;
      return (prev - 1) as 1 | 2 | 3 | 4;
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
    canGoBack: () => coinModal.open || uiStep > 1,
    onBack: handleAnalysisBack,
  });

  const goBackToMain = useCallback(() => {
    router.replace("/");
  }, [router]);

  const validateBirthInput = useCallback((value: string, target: "me" | "bias") => {
    const result = normalizeBirthDateInput(value);
    setBirthInputErrors((prev) => ({
      ...prev,
      [target]: result.ok ? "" : result.reason,
    }));
    return result;
  }, []);

  const validateStep = useCallback((step: 1 | 2 | 3) => {
    if (step === 1) {
      if (!meInput.name.trim()) return "나의 이름/닉네임을 입력해 주세요.";
      const meBirth = validateBirthInput(meInput.birthDateInput, "me");
      if (!meBirth.ok) return `나의 생년월일: ${meBirth.reason}`;
    }

    if (step === 2) {
      if (!biasInput.name.trim()) return "최애 이름을 입력해 주세요.";
      const biasBirth = validateBirthInput(biasInput.birthDateInput, "bias");
      if (!biasBirth.ok) return `최애의 생년월일: ${biasBirth.reason}`;
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
      const coinGateResult = await runBillingCoinGate({
        categoryKey: "destiny-bias",
        featureKey: "destiny-bias-analyze",
        reason: "최애운명 분석",
        requestId: `destiny-bias:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        forceDeduct: true,
      });

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

      const localResult = analyzeDestinyBias({
        userName: meInput.name,
        userBirthDateInput: meInput.birthDateInput,
        biasName: biasInput.name,
        biasBirthDateInput: biasInput.birthDateInput,
        biasMood,
        relationMood,
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
    } catch {
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
      } catch {
        // 사용자가 공유 창을 닫은 경우는 조용히 처리
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setToast("공유용 텍스트를 복사했어요.");
    } catch {
      setError("공유 텍스트 복사에 실패했습니다.");
    }
  }, [resultVm]);

  const handleRetry = useCallback(() => {
    setUiStep(1);
    setResultVm(null);
    setError("");
  }, []);

  const handleTryAnotherBias = useCallback(() => {
    setUiStep(2);
    setResultVm(null);
    setBiasInput(INITIAL_BIAS);
    setError("");
    setToast("다른 최애 정보를 입력해 주세요.");
  }, []);

  const particleCount = reduceMotion || isLowSpec ? 5 : 12;

  return (
    <section className={`relative min-h-[100dvh] w-screen overflow-x-hidden text-white ${styles.destinyBiasBg}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className={`absolute inset-0 ${styles.stageDots}`} />
        <div className={`absolute left-1/2 top-0 h-[68vh] w-[125vw] -translate-x-1/2 ${styles.spotlight}`} />
        <div className={`absolute inset-0 ${styles.concertBeamLeft}`} />
        <div className={`absolute inset-0 ${styles.concertBeamRight}`} />
        <div className={`absolute inset-0 ${styles.auraMist}`} />
      </div>

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
            {index % 4 === 0 ? "⭐" : index % 4 === 1 ? "💖" : index % 4 === 2 ? "✨" : "🩵"}
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-28 pt-5 md:px-6 md:pb-14 md:pt-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goBackToMain}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-sm font-semibold text-white/90 backdrop-blur-xl"
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

        <div className="space-y-4 md:space-y-5">
          <MyDestinyBiasHero subtitle={destinyBiasIntroCopy.lead} />
          <DestinyBiasProgress current={uiStep === 5 ? 5 : uiStep} />

            {uiStep === 1 ? (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">나의 에너지 입력</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">텍스트 입력 방식으로 생년월일을 입력하면 자동 정규화됩니다.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InputField
                    label="나의 이름/닉네임"
                    value={meInput.name}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, name: value }))}
                    placeholder="예: 네오"
                    maxLength={24}
                  />

                  <InputField
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
                    label="태어난 시간은 선택 입력"
                    value={meInput.birthTimeInput}
                    onChange={(value) => setMeInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder="예: 1430 (선택)"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>
              </section>
            ) : null}

            {uiStep === 2 ? (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">최애 프로필 입력</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">최애 성향과 관계 감성을 선택하면 팬덤형 분석이 더 풍부해집니다.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InputField
                    label="최애 이름"
                    value={biasInput.name}
                    onChange={(value) => setBiasInput((prev) => ({ ...prev, name: value }))}
                    placeholder="예: MY BIAS"
                    maxLength={24}
                  />

                  <InputField
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
                    label="태어난 시간은 선택 입력"
                    value={biasInput.birthTimeInput}
                    onChange={(value) => setBiasInput((prev) => ({ ...prev, birthTimeInput: value }))}
                    placeholder="예: 0915 (선택)"
                    inputMode="numeric"
                    maxLength={4}
                  />

                  <label className="grid gap-1 text-sm text-white/90">
                    <span className="font-semibold text-white/95">최애 분위기</span>
                    <select
                      value={biasMood}
                      onChange={(event) => setBiasMood(event.target.value as (typeof BIAS_MOODS)[number])}
                      className="min-h-12 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                    >
                      {BIAS_MOODS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-white/90">
                    <span className="font-semibold text-white/95">관계 감성</span>
                    <select
                      value={relationMood}
                      onChange={(event) => setRelationMood(event.target.value as (typeof RELATION_MOODS)[number])}
                      className="min-h-12 rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-fuchsia-200/80"
                    >
                      {RELATION_MOODS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            ) : null}

            {uiStep === 3 ? (
              <section className={`rounded-[28px] p-5 md:p-7 ${styles.glass}`}>
                <h2 className="text-2xl font-black">콘서트 포토카드 테마</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">최애운명.webp의 무드와 맞는 네온 포토카드 톤을 선택하세요.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {destinyBiasThemeChoices.map((theme) => {
                    const locked = theme.premium && !canUsePremiumTheme;
                    const active = activeThemeKey === theme.key;
                    return (
                      <button
                        key={theme.key}
                        type="button"
                        onClick={() => {
                          if (!locked) setActiveThemeKey(theme.key);
                        }}
                        className={`overflow-hidden rounded-2xl border text-left transition ${
                          active
                            ? "border-fuchsia-200/85 bg-fuchsia-300/15"
                            : "border-white/20 bg-black/25"
                        } ${locked ? "opacity-50" : "hover:border-cyan-200/80"}`}
                      >
                        <div className="h-24" style={{ background: theme.preview }} />
                        <div className="p-3">
                          <p className="text-sm font-bold text-white">{theme.name}</p>
                          <p className="mt-1 text-xs text-white/75">{theme.description}</p>
                          <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{theme.premium ? "PREMIUM" : "FREE"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {uiStep === 4 ? (
              <DestinyBiasLoadingScreen
                message={destinyBiasLoadingMessages[loadingMessageIndex]}
                progress={loadingProgress}
              />
            ) : null}

          {uiStep === 5 && resultVm ? (
            <section className="space-y-4">
              <article className={`rounded-[30px] p-5 md:p-6 ${styles.glass}`}>
                <p className="text-xs font-semibold tracking-[0.15em] text-cyan-100/90">RESULT SHOWCASE</p>
                <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{resultVm.biasName}와 연결된 한정판 팬싸인 포토카드</h2>
                <p className="mt-2 text-sm leading-7 text-white/85">{resultVm.oneLineDestinyMessage}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                  <div className="rounded-xl border border-white/20 bg-black/25 p-3 text-center">
                    <p className="text-[11px] text-white/70">전체</p>
                    <p className="mt-1 text-lg font-black text-white">{resultVm.totalScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-black/25 p-3 text-center">
                    <p className="text-[11px] text-white/70">감정</p>
                    <p className="mt-1 text-lg font-black text-white">{resultVm.emotionalScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-black/25 p-3 text-center">
                    <p className="text-[11px] text-white/70">팬심</p>
                    <p className="mt-1 text-lg font-black text-white">{resultVm.fandomScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-black/25 p-3 text-center">
                    <p className="text-[11px] text-white/70">장기</p>
                    <p className="mt-1 text-lg font-black text-white">{resultVm.longTermScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-black/25 p-3 text-center">
                    <p className="text-[11px] text-white/70">등급</p>
                    <p className="mt-1 text-lg font-black text-white">{resultVm.destinyGrade}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <FansignEditionBadge editionLabel={resultVm.editionLabel} destinyGrade={resultVm.destinyGrade} />
                </div>
              </article>

              <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
                <div className="space-y-4">
                  <DestinyBiasPhotocard vm={resultVm} cardSvg={resultVm.cardSvg} />
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
                </div>

                <div className="space-y-4">
                  <DestinyBiasDetailSections vm={resultVm} />

                  <article className={`rounded-[28px] p-5 ${styles.glass}`}>
                    <h3 className="text-base font-bold text-white">무대 케미 키워드</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resultVm.stageChemistryKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white/85">
                          #{keyword}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/85">운명 시그널: {resultVm.destinySignal}</p>
                  </article>
                </div>
              </section>
            </section>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200/45 bg-rose-300/15 px-4 py-3 text-sm text-rose-50">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {uiStep > 0 && uiStep < 4 ? (
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
      ) : null}

      {uiStep > 0 && uiStep < 4 ? (
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
