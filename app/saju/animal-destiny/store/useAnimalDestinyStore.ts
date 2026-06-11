import { create } from "zustand";
import { authFetch } from "@/app/_lib/auth-client";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
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

export type TamagotchiCareAction = "feed" | "play" | "rest" | "fortune";

export type TamagotchiPetState = {
  animalId: AnimalId | null;
  animalName: string;
  stage: string;
  hunger: number;
  mood: number;
  bond: number;
  luck: number;
  energy: number;
  growth: number;
  todayFortune: string;
  lastAction: TamagotchiCareAction | null;
  lastActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerScope: string;
};

interface AnimalDestinyState {
  status: "idle" | "input" | "calculating" | "revealing" | "result" | "error";
  input: AnimalDestinyInput;
  sajuResult: SajuEngineResult | null;
  twelveStages: TwelveStagePillars;
  animalId: AnimalId | null;
  animalData: AnimalDestinyData | null;
  tamagotchi: TamagotchiPetState | null;
  tamagotchiStatus: "idle" | "syncing" | "saving" | "error";
  tamagotchiMessage: string;
  tamagotchiAccountScope: string;
  tamagotchiIsLoggedIn: boolean;
  partner: PartnerResult;
  error?: string;
  setInput: (input: Partial<AnimalDestinyInput>) => void;
  hydrateTamagotchi: () => Promise<void>;
  careTamagotchi: (action: TamagotchiCareAction) => Promise<void>;
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
  breakdown: null,
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const TAMAGOTCHI_STORAGE_PREFIX = "cd_animal_destiny_tamagotchi";

function clampPercent(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeText(value: unknown, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 180);
}

function resolveCurrentAccount() {
  const user = typeof window !== "undefined" ? readSanitizedAuthUser() : null;
  const idScope = resolveAuthScopeFromUser(user);
  const emailScope = String(user?.email || "").trim().toLowerCase();
  const scope = idScope || emailScope || "guest";
  return {
    scope,
    isLoggedIn: scope !== "guest",
  };
}

function storageKey(scope: string) {
  return `${TAMAGOTCHI_STORAGE_PREFIX}:${scope || "guest"}`;
}

function normalizePetState(raw: unknown, scope: string): TamagotchiPetState | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const animalId = sanitizeText(source.animalId, "") as AnimalId | "";
  const now = new Date().toISOString();
  return {
    animalId: animalId ? (animalId as AnimalId) : null,
    animalName: sanitizeText(source.animalName, "운명의 알"),
    stage: sanitizeText(source.stage, ""),
    hunger: clampPercent(source.hunger, 70),
    mood: clampPercent(source.mood, 70),
    bond: clampPercent(source.bond, 45),
    luck: clampPercent(source.luck, 70),
    energy: clampPercent(source.energy, 70),
    growth: clampPercent(source.growth, 30),
    todayFortune: sanitizeText(source.todayFortune, "오늘은 작은 돌봄 하나가 운의 문을 부드럽게 엽니다."),
    lastAction: ["feed", "play", "rest", "fortune"].includes(String(source.lastAction || ""))
      ? (source.lastAction as TamagotchiCareAction)
      : null,
    lastActionAt: sanitizeText(source.lastActionAt, "") || null,
    createdAt: sanitizeText(source.createdAt, now),
    updatedAt: sanitizeText(source.updatedAt, now),
    ownerScope: scope,
  };
}

function readLocalPet(scope: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    return normalizePetState(raw ? JSON.parse(raw) : null, scope);
  } catch (e) {
    return null;
  }
}

function writeLocalPet(pet: TamagotchiPetState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(pet.ownerScope), JSON.stringify(pet));
  } catch (e) {
    void e;
  }
}

function buildFortuneMessage(animal: AnimalDestinyData) {
  return animal.today?.support_message
    || animal.tamagotchi?.growth_message
    || `${animal.animal_ko}이(가) 오늘의 기운을 조용히 품고 있습니다.`;
}

function buildPetFromAnimal(animal: AnimalDestinyData, previous: TamagotchiPetState | null, scope: string): TamagotchiPetState {
  const now = new Date().toISOString();
  const sameAnimal = previous?.animalId === animal.id;
  return {
    animalId: animal.id,
    animalName: animal.animal_ko,
    stage: animal.saju_stage,
    hunger: clampPercent(sameAnimal ? previous?.hunger : animal.game_stats.luck, 72),
    mood: clampPercent(sameAnimal ? previous?.mood : animal.game_stats.charm, 76),
    bond: clampPercent(sameAnimal ? previous?.bond : Math.round((animal.game_stats.social + animal.game_stats.charm) / 2), 48),
    luck: clampPercent(sameAnimal ? previous?.luck : animal.game_stats.luck, 70),
    energy: clampPercent(sameAnimal ? previous?.energy : animal.game_stats.power, 70),
    growth: clampPercent(sameAnimal ? previous?.growth : Math.round((animal.game_stats.power + animal.game_stats.logic) / 2), 34),
    todayFortune: sameAnimal ? previous?.todayFortune || buildFortuneMessage(animal) : buildFortuneMessage(animal),
    lastAction: sameAnimal ? previous?.lastAction || null : null,
    lastActionAt: sameAnimal ? previous?.lastActionAt || null : null,
    createdAt: sameAnimal ? previous?.createdAt || now : now,
    updatedAt: now,
    ownerScope: scope,
  };
}

function applyCareAction(pet: TamagotchiPetState, animal: AnimalDestinyData, action: TamagotchiCareAction) {
  const now = new Date().toISOString();
  const next = { ...pet, lastAction: action, lastActionAt: now, updatedAt: now };
  if (action === "feed") {
    next.hunger = clampPercent(next.hunger + 18, 72);
    next.mood = clampPercent(next.mood + 5, 76);
    next.energy = clampPercent(next.energy + 3, 70);
    next.growth = clampPercent(next.growth + 5, 34);
    next.todayFortune = `${animal.tamagotchi.favorite_food} 기운을 머금고 ${animal.animal_ko}의 눈빛이 한층 맑아졌습니다.`;
  } else if (action === "play") {
    next.mood = clampPercent(next.mood + 16, 76);
    next.bond = clampPercent(next.bond + 14, 48);
    next.energy = clampPercent(next.energy - 8, 70);
    next.hunger = clampPercent(next.hunger - 6, 72);
    next.todayFortune = `${animal.animal_ko}이(가) 당신 곁에서 반짝이며 마음의 박자를 맞춥니다.`;
  } else if (action === "rest") {
    next.energy = clampPercent(next.energy + 18, 70);
    next.mood = clampPercent(next.mood + 4, 76);
    next.hunger = clampPercent(next.hunger - 4, 72);
    next.todayFortune = animal.tamagotchi.mood_when_tired;
  } else {
    next.luck = clampPercent(next.luck + 12, 70);
    next.bond = clampPercent(next.bond + 7, 48);
    next.growth = clampPercent(next.growth + 4, 34);
    next.todayFortune = `${animal.animal_ko}의 전언: ${buildFortuneMessage(animal)} ${animal.tamagotchi.care_tip}`;
  }
  return next;
}

async function fetchServerPet(scope: string) {
  try {
    const response = await authFetch("/api/user/tamagotchi", { method: "GET" });
    if (response.status === 401 || response.status === 404) return null;
    if (!response.ok) throw new Error("sync_failed");
    const payload = await response.json();
    return normalizePetState(payload?.tamagotchi, scope);
  } catch (e) {
    return null;
  }
}

async function saveServerPet(pet: TamagotchiPetState, isLoggedIn: boolean) {
  if (!isLoggedIn) return true;
  try {
    const response = await authFetch("/api/user/tamagotchi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tamagotchi: pet }),
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

export const useAnimalDestinyStore = create<AnimalDestinyState>((set, get) => ({
  status: "idle",
  input: INITIAL_INPUT,
  sajuResult: null,
  twelveStages: {},
  animalId: null,
  animalData: null,
  tamagotchi: null,
  tamagotchiStatus: "idle",
  tamagotchiMessage: "",
  tamagotchiAccountScope: "guest",
  tamagotchiIsLoggedIn: false,
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

  hydrateTamagotchi: async () => {
    const account = resolveCurrentAccount();
    const localPet = readLocalPet(account.scope);
    set({
      tamagotchi: localPet,
      tamagotchiStatus: account.isLoggedIn ? "syncing" : "idle",
      tamagotchiMessage: account.isLoggedIn ? "로그인 계정과 동기화 중입니다." : "비로그인 체험 모드로 저장됩니다.",
      tamagotchiAccountScope: account.scope,
      tamagotchiIsLoggedIn: account.isLoggedIn,
    });

    if (!account.isLoggedIn) return;

    const serverPet = await fetchServerPet(account.scope);
    if (serverPet) {
      writeLocalPet(serverPet);
      set({
        tamagotchi: serverPet,
        tamagotchiStatus: "idle",
        tamagotchiMessage: "로그인 계정에 저장된 다마고치를 불러왔습니다.",
      });
      return;
    }

    set({
      tamagotchiStatus: "idle",
      tamagotchiMessage: localPet ? "로컬에 저장된 다마고치를 불러왔습니다." : "새 운명의 알을 기다리고 있습니다.",
    });
  },

  careTamagotchi: async (action) => {
    const state = get();
    if (!state.animalData || !state.tamagotchi || state.tamagotchiStatus === "saving") return;

    const account = resolveCurrentAccount();
    const nextPet = applyCareAction(
      { ...state.tamagotchi, ownerScope: account.scope },
      state.animalData,
      action,
    );

    writeLocalPet(nextPet);
    set({
      tamagotchi: nextPet,
      tamagotchiStatus: "saving",
      tamagotchiMessage: account.isLoggedIn ? "로그인 계정에 돌봄 기록을 저장 중입니다." : "이 기기 체험 기록에 저장했습니다.",
      tamagotchiAccountScope: account.scope,
      tamagotchiIsLoggedIn: account.isLoggedIn,
    });

    const saved = await saveServerPet(nextPet, account.isLoggedIn);
    set({
      tamagotchiStatus: saved ? "idle" : "error",
      tamagotchiMessage: saved
        ? account.isLoggedIn
          ? "로그인 계정에 다마고치 상태가 저장되었습니다."
          : "이 기기에 다마고치 상태가 저장되었습니다."
        : "서버 저장이 지연되어 로컬 기록을 유지했습니다.",
    });
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
      const account = resolveCurrentAccount();
      const previousPet = get().tamagotchi || readLocalPet(account.scope);
      const tamagotchi = buildPetFromAnimal(animalData, previousPet, account.scope);
      writeLocalPet(tamagotchi);

      set({
        status: "revealing",
        sajuResult,
        twelveStages,
        animalId,
        animalData,
        tamagotchi,
        tamagotchiStatus: "saving",
        tamagotchiMessage: account.isLoggedIn ? "로그인 계정에 수호 다마고치를 연결 중입니다." : "비로그인 체험 기록에 수호 다마고치를 저장했습니다.",
        tamagotchiAccountScope: account.scope,
        tamagotchiIsLoggedIn: account.isLoggedIn,
      });

      const saved = await saveServerPet(tamagotchi, account.isLoggedIn);
      set({
        tamagotchiStatus: saved ? "idle" : "error",
        tamagotchiMessage: saved
          ? account.isLoggedIn
            ? "로그인 계정과 수호 다마고치가 연결되었습니다."
            : "이 기기에 수호 다마고치가 저장되었습니다."
          : "서버 저장이 지연되어 로컬 기록을 유지했습니다.",
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
          breakdown: compatibility.breakdown,
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
