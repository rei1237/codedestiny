import { create } from "zustand";
import { getAnimalBySajuResult, getAnimalDisplayData, calculateAnimalCompatibility } from "../lib/animalMapping";
import { fetchSajuEngineResult, resolveAnimalTwelveResult } from "../lib/sajuAdapter";
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
    const currentInput = get().input;
    if (get().status === "calculating" || get().status === "revealing") return;

    if (!currentInput.birthDate) {
      set({
        status: "error",
        error: "생년월일을 입력해 주세요.",
      });
      return;
    }

    set({
      status: "calculating",
      error: "",
      partner: INITIAL_PARTNER,
    });

    try {
      const resolved = await resolveAnimalTwelveResult(currentInput);
      if (!resolved.ok || !resolved.profile || !resolved.sajuResult) {
        throw new Error(resolved.error || "사주 계산 정보를 다시 확인해 주세요.");
      }

      const sajuResult = resolved.sajuResult;
      const twelveStagesFromEngine = getTwelveStagesForPillars(sajuResult);
      const twelveStages = {
        ...twelveStagesFromEngine,
        primary: resolved.representativeStage?.labelKo || twelveStagesFromEngine.primary,
      };

      const { animalId } = getAnimalBySajuResult(sajuResult);
      if (!animalId) throw new Error("십이운성 매핑에 실패했습니다.");

      const animalData = getAnimalDisplayData(animalId) || resolved.profile;
      if (!animalData) throw new Error("동물 데이터 로딩에 실패했습니다.");

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
        error: error instanceof Error ? error.message : "사주 계산 중 오류가 발생했습니다.",
      });
    }
  },

  calculateCompatibility: async (partnerInput) => {
    const myAnimalId = get().animalId;
    if (!myAnimalId) {
      set({
        error: "먼저 내 수호 동물을 소환해 주세요.",
      });
      return;
    }

    try {
      const partnerSaju = await fetchSajuEngineResult(partnerInput);
      const partnerStages = getTwelveStagesForPillars(partnerSaju);
      const { animalId: partnerAnimalId } = getAnimalBySajuResult(partnerSaju);
      if (!partnerAnimalId) {
        throw new Error("상대방 사주 계산 데이터가 부족합니다.");
      }

      const partnerData = getAnimalDisplayData(partnerAnimalId);
      if (!partnerData) {
        throw new Error("상대방 동물 데이터 로딩에 실패했습니다.");
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
        },
        error: "",
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "궁합 계산 중 오류가 발생했습니다.",
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
