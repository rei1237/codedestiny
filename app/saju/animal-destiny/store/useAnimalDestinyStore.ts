import { create } from "zustand";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getAnimalBySajuResult, getAnimalDisplayData, calculateAnimalCompatibility } from "../lib/animalMapping";
import { getTwelveStagesForPillars } from "../lib/twelveStages";
import { buildCompatibilityStageEvidence } from "../lib/analysisNarrative";
import type {
  AnimalDestinyData,
  AnimalDestinyInput,
  AnimalId,
  PartnerResult,
  SajuEngineResult,
  TwelveStagePillars,
} from "../lib/types";

interface AnimalDestinyState {
  status: "idle" | "input" | "calculating" | "revealing" | "result" | "error";
  input: AnimalDestinyInput;
  sajuResult: SajuEngineResult | null;
  twelveStages: TwelveStagePillars;
  animalId: AnimalId | null;
  animalData: AnimalDestinyData | null;
  partner: PartnerResult;
  error?: string;
  setInput: (input: Partial<AnimalDestinyInput>) => void;
  calculate: () => Promise<void>;
  calculateCompatibility: (partnerInput: AnimalDestinyInput) => Promise<void>;
  reset: () => void;
}

const ANIMAL_DESTINY_STORE_TEXT_TRANSLATIONS = {
  ko: {
    birthDateRequired: "생년월일을 입력해 주세요.",
    checkSajuInfo: "사주 계산 정보를 다시 확인해 주세요.",
    animalMappingFailed: "십이운성 매핑에 실패했습니다.",
    animalDataLoadFailed: "동물 데이터 로딩에 실패했습니다.",
    calculationFailed: "사주 계산 중 오류가 발생했습니다.",
    summonFirst: "먼저 내 수호 동물을 소환해 주세요.",
    partnerSajuInsufficient: "상대방 사주 계산 데이터가 부족합니다.",
    partnerAnimalLoadFailed: "상대방 동물 데이터 로딩에 실패했습니다.",
    compatibilityFailed: "궁합 계산 중 오류가 발생했습니다.",
  },
  en: {
    birthDateRequired: "Please enter your birth date.",
    checkSajuInfo: "Please check the Saju calculation details and try again.",
    animalMappingFailed: "We could not match the Twelve Growth Stage animal.",
    animalDataLoadFailed: "We could not load the guardian animal data.",
    calculationFailed: "An error occurred while calculating the Saju chart.",
    summonFirst: "Please summon your guardian animal first.",
    partnerSajuInsufficient: "The other person's Saju calculation data is incomplete.",
    partnerAnimalLoadFailed: "We could not load the other person's animal data.",
    compatibilityFailed: "An error occurred while calculating compatibility.",
  },
  ja: {
    birthDateRequired: "生年月日を入力してください。",
    checkSajuInfo: "四柱推命の計算情報をもう一度ご確認ください。",
    animalMappingFailed: "十二運星の守護動物を照合できませんでした。",
    animalDataLoadFailed: "守護動物のデータを読み込めませんでした。",
    calculationFailed: "四柱推命の計算中にエラーが発生しました。",
    summonFirst: "先にあなたの守護動物を呼び出してください。",
    partnerSajuInsufficient: "相手の四柱推命計算データが不足しています。",
    partnerAnimalLoadFailed: "相手の動物データを読み込めませんでした。",
    compatibilityFailed: "相性計算中にエラーが発生しました。",
  },
} as const;

function getAnimalDestinyStoreCopy(locale: LoadingLocale = getCurrentLoadingLocale()) {
  return ANIMAL_DESTINY_STORE_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || ANIMAL_DESTINY_STORE_TEXT_TRANSLATIONS.ko;
}

function resolveAnimalDestinyError(error: unknown, fallback: string, locale: LoadingLocale) {
  const message = error instanceof Error ? error.message : "";
  if (!message) return fallback;
  if (locale === "ko") return message;
  return (Object.values(getAnimalDestinyStoreCopy(locale)) as string[]).includes(message) ? message : fallback;
}

const INITIAL_INPUT: AnimalDestinyInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "unknown",
  calendarType: "solar",
  lunarLeap: false,
};

const INITIAL_PARTNER: PartnerResult = {
  input: null,
  animalId: null,
  animalData: null,
  primaryStage: null,
  score: null,
  relationType: null,
  summary: null,
  goodPoints: [],
  clashPoints: [],
  tips: [],
  stageEvidence: null,
  breakdown: null,
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const useAnimalDestinyStore = create<AnimalDestinyState>((set, get) => ({
  status: "idle",
  input: INITIAL_INPUT,
  sajuResult: null,
  twelveStages: {},
  animalId: null,
  animalData: null,
  partner: INITIAL_PARTNER,
  error: "",

  setInput: (partialInput) => {
    set((state) => ({
      input: {
        ...state.input,
        ...partialInput,
      },
      status: state.status === "idle" ? "input" : state.status,
      error: "",
    }));
  },

  calculate: async () => {
    const locale = getCurrentLoadingLocale();
    const copy = getAnimalDestinyStoreCopy(locale);
    const currentInput = get().input;
    if (get().status === "calculating" || get().status === "revealing") return;

    if (!currentInput.birthDate) {
      set({
        status: "error",
        error: copy.birthDateRequired,
      });
      return;
    }

    set({
      status: "calculating",
      error: "",
      partner: INITIAL_PARTNER,
    });

    try {
      const { resolveAnimalTwelveResult } = await import("../lib/sajuAdapter");
      const resolved = await resolveAnimalTwelveResult(currentInput);
      if (!resolved.ok || !resolved.profile || !resolved.sajuResult) {
        const resolvedError = locale === "ko" ? resolved.error : "";
        throw new Error(resolvedError || copy.checkSajuInfo);
      }

      const sajuResult = resolved.sajuResult;
      const twelveStagesFromEngine = getTwelveStagesForPillars(sajuResult);
      const twelveStages = {
        ...twelveStagesFromEngine,
        primary: resolved.representativeStage?.labelKo || twelveStagesFromEngine.primary,
      };

      const { animalId } = getAnimalBySajuResult(sajuResult);
      if (!animalId) throw new Error(copy.animalMappingFailed);

      const animalData = getAnimalDisplayData(animalId) || resolved.profile;
      if (!animalData) throw new Error(copy.animalDataLoadFailed);

      set({
        status: "revealing",
        sajuResult,
        twelveStages,
        animalId,
        animalData,
      });

      await wait(1250);

      set({
        status: "result",
      });
    } catch (error) {
      set({
        status: "error",
        error: resolveAnimalDestinyError(error, copy.calculationFailed, locale),
      });
    }
  },

  calculateCompatibility: async (partnerInput) => {
    const locale = getCurrentLoadingLocale();
    const copy = getAnimalDestinyStoreCopy(locale);
    const myAnimalId = get().animalId;
    if (!myAnimalId) {
      set({
        error: copy.summonFirst,
      });
      return;
    }

    try {
      const { fetchSajuEngineResult } = await import("../lib/sajuAdapter");
      const partnerSaju = await fetchSajuEngineResult(partnerInput);
      const partnerStages = getTwelveStagesForPillars(partnerSaju);
      const { animalId: partnerAnimalId } = getAnimalBySajuResult(partnerSaju);
      if (!partnerAnimalId) {
        throw new Error(copy.partnerSajuInsufficient);
      }

      const partnerData = getAnimalDisplayData(partnerAnimalId);
      if (!partnerData) {
        throw new Error(copy.partnerAnimalLoadFailed);
      }

      const compatibility = calculateAnimalCompatibility(myAnimalId, partnerAnimalId);
      const myPrimaryStage = get().twelveStages.primary || null;
      const partnerPrimaryStage = partnerStages.primary || null;
      const stageEvidence = buildCompatibilityStageEvidence(myPrimaryStage, partnerPrimaryStage);

      set({
        partner: {
          input: partnerInput,
          animalId: partnerAnimalId,
          animalData: partnerData,
          primaryStage: partnerPrimaryStage,
          score: compatibility.score,
          relationType: compatibility.relationType,
          summary: compatibility.summary,
          goodPoints: compatibility.goodPoints,
          clashPoints: compatibility.clashPoints,
          tips: compatibility.tips,
          stageEvidence,
          breakdown: compatibility.breakdown,
        },
        error: "",
      });
    } catch (error) {
      set({
        error: resolveAnimalDestinyError(error, copy.compatibilityFailed, locale),
      });
    }
  },

  reset: () => {
    set({
      status: "idle",
      input: INITIAL_INPUT,
      sajuResult: null,
      twelveStages: {},
      animalId: null,
      animalData: null,
      partner: INITIAL_PARTNER,
      error: "",
    });
  },
}));
