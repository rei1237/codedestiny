/**
 * 운명의 나침반 세션 — [히어로 → 생년 → 선택 무대(고민 입력) → 처리 → 결과 → 오늘].
 * 고민 제출 시 computeDirectionField(결정론)를 실행하고, 최소 연출 시간(안개/사고)을 함께 대기.
 * dateSeed는 UI에서 KST 민용일 주입(엔진은 순수 — Date는 여기서만).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import type { CompassInput, DirectionField, EmotionKey } from "../_engine/types";
import { computeDirectionField } from "../_engine/directionScore";
import { useDestinyCompassCopy } from "../_lib/copy";

export type CompassStep = "hub" | "birth" | "map" | "processing" | "reveal" | "result" | "crossroad" | "futureSim" | "voyage" | "today" | "arrival";
/** 무대 위상 — 낮에 길을 정하고, 밤에 별을 읽는다. */
export type StagePhase = "day" | "dusk" | "night";

/**
 * 처리 화면 최소 노출.
 * 이전 3,400ms 는 순수 연출 타이머였다. 지금은 낮→황혼→밤 전환(400 + 1,200 + 900ms)이
 * 끝까지 보이도록 보장하는 하한일 뿐이고, 실제 종료 시점은 computeDirectionField 가 정한다.
 */
const PROCESS_MIN_MS = 2200;
const DUSK_AT_MS = 250;
const NIGHT_AT_MS = 650;
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

async function sha256Hex(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const copy = useDestinyCompassCopy();
  const [step, setStep] = useState<CompassStep>(initialStep);
  const [birth, setBirth] = useState<AnimalDestinyInput | null>(null);
  const [situation, setSituation] = useState("");
  const [field, setField] = useState<DirectionField | null>(null);
  // 리포트 호출에 그대로 넘겨야 하므로 계산에 쓴 입력을 보관한다(생년+감정+dateSeed).
  const [input, setInput] = useState<CompassInput | null>(null);
  const [stagePhase, setStagePhase] = useState<StagePhase>("day");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phaseTimers = useRef<number[]>([]);

  const clearPhaseTimers = useCallback(() => {
    for (const id of phaseTimers.current) window.clearTimeout(id);
    phaseTimers.current = [];
  }, []);

  const submitConcern = useCallback(
    async (concern: string) => {
      if (!birth) return;
      setSituation(concern);
      setError(null);
      setLoading(true);
      setStep("processing");

      // 낮 → 황혼 → 밤. 토큰은 원자적으로 갈아끼우고 배경만 크로스페이드한다(map.module.css).
      clearPhaseTimers();
      phaseTimers.current.push(window.setTimeout(() => setStagePhase("dusk"), DUSK_AT_MS));
      phaseTimers.current.push(window.setTimeout(() => setStagePhase("night"), NIGHT_AT_MS));

      const dateSeed = kstDateSeed();
      const nextInput: CompassInput = { birth, emotion: DEFAULT_EMOTION, situation: concern, answers: [], dateSeed };
      const cacheKey = "cd-compass:" + (await sha256Hex(JSON.stringify({ b: birth, s: concern, d: dateSeed })));
      try {
        const cached = readCache(cacheKey);
        const [result] = await Promise.all([
          cached ? Promise.resolve(cached) : computeDirectionField(nextInput),
          sleep(PROCESS_MIN_MS),
        ]);
        if (!cached) writeCache(cacheKey, result);
        setInput(nextInput);
        setField(result);
        setStep("reveal"); // 길 발견(맵에 빛나는 경로) → 사용자가 결과로 진입
      } catch {
        clearPhaseTimers();
        setStagePhase("day");
        setError(copy.fogErrorMessage);
        setStep("map");
      } finally {
        setLoading(false);
      }
    },
    [birth, clearPhaseTimers, copy],
  );

  const reset = useCallback(() => {
    clearPhaseTimers();
    setField(null);
    setInput(null);
    setSituation("");
    setError(null);
    setStagePhase("day");
    setStep("map");
  }, [clearPhaseTimers]);

  return useMemo(
    () => ({ step, setStep, birth, setBirth, situation, field, input, stagePhase, loading, error, submitConcern, reset }),
    [step, birth, situation, field, input, stagePhase, loading, error, submitConcern, reset],
  );
}
