import { authFetch } from "@/app/_lib/auth-client";
import { readAiProfileSeed } from "@/app/_lib/ai-prefill-seed";
import type { AnimalDestinyInput, AnimalId, TwelveGrowthAnimalResult, TwelveStageKey } from "./types";

// 십이운성 동물점(animal-destiny-unlock) 유료 풀이는 서버(/api/saju/section)가 해금을 확인한 뒤 만든다.
// 페이지는 무료 계산(대표 동물·네 기둥 운성)만 하고, 결과 카드 문장·10개 탭·심층 리포트·도감 설명·루틴은 서버 응답으로 그린다.
export type AnimalPaidSection = { key: string; label: string; content: string };

export type AnimalPaidReading = {
  animalId: AnimalId;
  stageKey: TwelveStageKey;
  result: TwelveGrowthAnimalResult;
  sections: AnimalPaidSection[];
  detailed: {
    personality: string;
    love: string;
    career: string;
    wealth: string;
    relationship: string;
    today: string;
    growthMissions: string[];
  };
  dex: Array<{ stageKey: TwelveStageKey; personality: string; growthMission: string; elementTags?: string[] }>;
};

export type AnimalPaidState =
  | { status: "idle" | "loading" }
  | { status: "ready"; reading: AnimalPaidReading }
  | { status: "locked" | "login" | "error"; message?: string; coinPrice?: number | null };

const FEATURE_KEY = "animal-destiny-unlock";
// 결제 직후에는 서버 기록이 조금 늦게 써질 수 있다 — 402 면 잠금 안내를 먼저 보이고 이 간격으로 다시 묻는다.
export const ANIMAL_PAID_RETRY_MS = [4000, 12000, 30000];

// 저장 프로필(현재 카드)의 출생 정보가 입력과 같을 때만 그 카드로 해금을 확인한다 — 서버는 카드의 출생으로 계산한다.
function matchingProfileId(input: AnimalDestinyInput) {
  try {
    const seed = readAiProfileSeed();
    if (!seed.profileId || seed.birthDate !== input.birthDate) return "";
    if ((seed.calendarType || "solar") !== (input.calendarType || "solar")) return "";
    if ((input.calendarType === "lunar") && Boolean(seed.isLeapMonth) !== Boolean(input.lunarLeap)) return "";
    const seedTime = seed.birthTimeUnknown ? "" : String(seed.birthTime || "");
    if (seedTime !== String(input.birthTime || "").trim()) return "";
    return seed.profileId;
  } catch {
    return "";
  }
}

function requestBody(input: AnimalDestinyInput) {
  const time = String(input.birthTime || "").trim().match(/^(\d{2}):(\d{2})$/);
  const calType = input.calendarType === "lunar" ? (input.lunarLeap ? "lunar_leap" : "lunar") : "solar";
  const body: Record<string, unknown> = {
    featureKey: FEATURE_KEY,
    birth: { date: input.birthDate, calType, timeKnown: Boolean(time), hour: time ? Number(time[1]) : null, minute: time ? Number(time[2]) : null },
  };
  const profileId = matchingProfileId(input);
  if (profileId) body.profileId = profileId;
  return body;
}

export async function fetchAnimalPaidReading(input: AnimalDestinyInput): Promise<AnimalPaidState> {
  let res: Response;
  let data: Record<string, unknown> = {};
  try {
    res = await authFetch("/api/saju/section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody(input)),
    });
    data = await res.json().catch(() => ({}));
  } catch {
    return { status: "error" };
  }
  if (res.ok && data.ok === true && data.unlocked === true && data.featureKey === FEATURE_KEY && data.animal) {
    return { status: "ready", reading: data.animal as AnimalPaidReading };
  }
  if (res.status === 401) return { status: "login" };
  if (res.status === 402 || res.status === 403 || (res.status === 400 && data.requiresProfile)) {
    return { status: "locked", coinPrice: typeof data.coinPrice === "number" ? data.coinPrice : null };
  }
  return { status: "error", message: typeof data.message === "string" && res.status === 400 ? data.message : undefined };
}
