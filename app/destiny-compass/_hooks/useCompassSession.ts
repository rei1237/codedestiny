/**
 * 운명의 지도 세션 — [생년 → 맵(고민 입력) → 처리(안개+사고) → 결과 → 오늘].
 * 고민 제출 시 computeDirectionField(결정론)를 실행하고, 최소 연출 시간(안개/사고)을 함께 대기.
 * dateSeed는 UI에서 KST 민용일 주입(엔진은 순수 — Date는 여기서만).
 */
import { useCallback, useMemo, useState } from "react";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import type { CompassInput, DirectionField, EmotionKey } from "../_engine/types";
import { computeDirectionField } from "../_engine/directionScore";

export type CompassStep = "hub" | "birth" | "map" | "processing" | "reveal" | "result" | "crossroad" | "futureSim" | "voyage" | "today" | "arrival";

const PROCESS_MIN_MS = 3400; // 안개+사고 연출 최소 노출
const DEFAULT_EMOTION: EmotionKey = "hopeful"; // RPG 흐름은 감정 미질문 → 기본값(렌즈 영향 미미)

function kstDateSeed(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCache(key: string): DirectionField | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DirectionField) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, field: DirectionField): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(field));
  } catch {
    /* storage 불가 시 무시 */
  }
}

export function useCompassSession(initialStep: CompassStep = "birth") {
  const [step, setStep] = useState<CompassStep>(initialStep);
  const [birth, setBirth] = useState<AnimalDestinyInput | null>(null);
  const [situation, setSituation] = useState("");
  const [field, setField] = useState<DirectionField | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitConcern = useCallback(
    async (concern: string) => {
      if (!birth) return;
      setSituation(concern);
      setError(null);
      setLoading(true);
      setStep("processing");
      const dateSeed = kstDateSeed();
      const input: CompassInput = { birth, emotion: DEFAULT_EMOTION, situation: concern, answers: [], dateSeed };
      const cacheKey = "cd-compass:" + JSON.stringify({ b: birth, s: concern, d: dateSeed });
      try {
        const cached = readCache(cacheKey);
        const [result] = await Promise.all([
          cached ? Promise.resolve(cached) : computeDirectionField(input),
          sleep(PROCESS_MIN_MS),
        ]);
        if (!cached) writeCache(cacheKey, result);
        setField(result);
        setStep("reveal"); // 길 발견(맵에 빛나는 경로) → 사용자가 결과로 진입
      } catch {
        setError("운명의 안개가 짙어요. 잠시 후 다시 시도해 주세요.");
        setStep("map");
      } finally {
        setLoading(false);
      }
    },
    [birth],
  );

  const reset = useCallback(() => {
    setField(null);
    setSituation("");
    setError(null);
    setStep("map");
  }, []);

  return useMemo(
    () => ({ step, setStep, birth, setBirth, situation, field, loading, error, submitConcern, reset }),
    [step, birth, situation, field, loading, error, submitConcern, reset],
  );
}
