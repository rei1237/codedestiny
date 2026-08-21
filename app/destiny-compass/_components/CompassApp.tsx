"use client";
/**
 * 운명의 나침반 오케스트레이터 — 히어로 → 생년 → 선택 무대(고민 입력) → 처리 → 결과 → 오늘.
 * 결정론 엔진은 세션(useCompassSession)이 처리 단계에서 실행. 결과/오늘 화면은 기존 재사용(P2에서 격상).
 */
import { useState } from "react";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import { useCompassSession, type CompassStep } from "../_hooks/useCompassSession";
import { JourneyHub } from "./JourneyHub";
import { CompassReport } from "./CompassReport";
import { Crossroads } from "./Crossroads";
import { FutureSim } from "./FutureSim";
import { LifeVoyage } from "./LifeVoyage";
import { TodayQuest } from "./TodayQuest";
import { Arrival } from "./Arrival";
import { DestinyMap } from "./DestinyMap";
import { ConcernInput } from "./ConcernInput";
import { type PigExpr } from "../_stage/mapDialogue";
import { ProcessingScene } from "./ProcessingScene";
import { DIRECTION_TO_REGION, regionByKey } from "./mapRegions";
import { useDestinyCompassCopy } from "../_lib/copy";
import map from "./map.module.css";

export function CompassApp({ start = "hub" }: { start?: CompassStep } = {}) {
  const copy = useDestinyCompassCopy();
  const s = useCompassSession(start);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [pigExpr, setPigExpr] = useState<PigExpr>("talk");

  if (s.step === "hub" || s.step === "birth") {
    return <JourneyHub onStart={(birth) => { s.setBirth(birth); s.setStep("map"); }} />;
  }

  if (s.step === "map") {
    return (
      <DestinyMap islandArt spotlightRegion={spotlight} pigExpr={pigExpr} guideTilt={waiting}>
        <ConcernInput
          onSubmit={(c) => s.submitConcern(c)}
          onSpotlight={setSpotlight}
          onWaitingChange={setWaiting}
          onPigExpr={setPigExpr}
        />
        {s.error && (
          <p role="alert" style={{ textAlign: "center", color: "#ffd9ec", fontWeight: 700 }}>
            {s.error}
          </p>
        )}
      </DestinyMap>
    );
  }

  if (s.step === "processing") {
    return (
      <DestinyMap showFog hideHero hideHeader phase={s.stagePhase}>
        <ProcessingScene />
      </DestinyMap>
    );
  }

  if (s.step === "reveal" && s.field) {
    const destRegion = DIRECTION_TO_REGION[s.field.primary.key];
    const dest = regionByKey(destRegion);
    const destLabel = dest ? copy.regionLabel[dest.key as keyof typeof copy.regionLabel] : "";
    return (
      <DestinyMap title={copy.revealTitle} kicker="The Bearing Revealed" pathTo={destRegion} highlightRegion={destRegion} phase="night">
        <div className={map.revealPanel}>
          <p className={map.revealText}>{copy.revealText(destLabel)}</p>
          <button type="button" className={map.revealCta} onClick={() => s.setStep("result")}>
            {copy.confirmResultButton}
          </button>
        </div>
      </DestinyMap>
    );
  }

  if (s.step === "result" && s.field && s.input) {
    return (
      <CompassReport
        input={s.input}
        field={s.field}
        situation={s.situation}
        onNext={() => s.setStep("today")}
        onRestart={() => s.reset()}
        onCrossroad={() => s.setStep("crossroad")}
        onFutureSim={() => s.setStep("futureSim")}
        onVoyage={() => s.setStep("voyage")}
      />
    );
  }

  if (s.step === "crossroad" && s.field) {
    return <Crossroads field={s.field} onBack={() => s.setStep("result")} />;
  }

  if (s.step === "futureSim" && s.field) {
    return <FutureSim field={s.field} onBack={() => s.setStep("result")} />;
  }

  if (s.step === "voyage" && s.field) {
    return <LifeVoyage field={s.field} onBack={() => s.setStep("result")} />;
  }

  if (s.step === "today" && s.field) {
    return <TodayQuest field={s.field} onArrive={() => s.setStep("arrival")} onReset={() => s.reset()} />;
  }

  if (s.step === "arrival" && s.field) {
    return <Arrival field={s.field} onRestart={() => s.reset()} />;
  }

  return null;
}

