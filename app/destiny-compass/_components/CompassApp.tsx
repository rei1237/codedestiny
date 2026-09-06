"use client";
/**
 * 운명의 나침반 오케스트레이터 — 히어로 → 생년 → 선택 무대(고민 입력) → 처리 → 결과 → 오늘.
 * 결정론 엔진은 세션(useCompassSession)이 처리 단계에서 실행. 결과/오늘 화면은 기존 재사용(P2에서 격상).
 */
import { useCallback, useMemo, useState } from "react";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import { usePaidResume, type PaidResumeGrant } from "@/app/hooks/usePaidResume";
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

  /**
   * 결제 후 자동 재개 — 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 ensurePaidAccess 의
   * await 가 문서와 함께 죽는다. 🔴 핸들러는 잎 화면이 아니라 **여기서** 등록한다: 복귀한 새 문서는
   * 항상 hub 에서 시작해 Crossroads·FutureSim·LifeVoyage·CompassReport 가 아예 마운트되지 않는다.
   * 생년·고민·field 는 세션 스냅샷에서 되살리고, 없으면 false 를 돌려 '지금 열기' 카드로 떨어뜨린다.
   */
  const [resumedStep, setResumedStep] = useState<CompassStep | null>(null);
  const [resumedCrossroad, setResumedCrossroad] = useState<{ a: string; b: string } | null>(null);
  const [resumedReportGrant, setResumedReportGrant] = useState<PaidResumeGrant | null>(null);

  const buildCrossroadResume = usePaidResume("destiny-compass-crossroads", (args) => {
    if (!s.restoreSnapshot()) return false;
    const a = typeof args.a === "string" ? args.a : "";
    const b = typeof args.b === "string" ? args.b : "";
    if (!a.trim() || !b.trim()) return false;
    setResumedCrossroad({ a, b });
    setResumedStep("crossroad");
    s.setStep("crossroad");
    return true;
  });

  const buildFutureSimResume = usePaidResume("destiny-compass-future-sim", () => {
    if (!s.restoreSnapshot()) return false;
    setResumedStep("futureSim");
    s.setStep("futureSim");
    return true;
  });

  const buildVoyageResume = usePaidResume("destiny-compass-life-voyage", () => {
    if (!s.restoreSnapshot()) return false;
    setResumedStep("voyage");
    s.setStep("voyage");
    return true;
  });

  // 🔴 심층 리포트만 서버 생성이 남아 있다 — 증빙을 그대로 내려 보내야 402 가 안 난다.
  const buildReportResume = usePaidResume("destiny-compass-deep-report", (_args, grant) => {
    if (!s.restoreSnapshot()) return false;
    setResumedReportGrant(grant);
    setResumedStep("result");
    s.setStep("result");
    return true;
  });

  const reportResumeWiring = useMemo(
    () => ({ buildResume: buildReportResume, grant: resumedStep === "result" ? resumedReportGrant : null }),
    [buildReportResume, resumedStep, resumedReportGrant],
  );

  /**
   * 🔴 재개 표식은 그 화면을 떠나는 순간 지운다 — 남겨 두면 되돌아왔을 때 잎 화면이 결제 없이 열리고
   * (autoRevealed/resumed 가 계속 참), 심층 리포트는 같은 증빙으로 생성 요청을 한 번 더 던진다.
   * 재개 직후 1회만 유효한 값이라는 뜻이다. 화면 전환은 전부 이 함수를 거친다.
   */
  const clearResumeMarks = useCallback(() => {
    setResumedStep(null);
    setResumedCrossroad(null);
    setResumedReportGrant(null);
  }, []);

  const goStep = useCallback(
    (next: CompassStep) => {
      clearResumeMarks();
      s.setStep(next);
    },
    [clearResumeMarks, s],
  );

  if (s.step === "hub" || s.step === "birth") {
    return <JourneyHub onStart={(birth) => { s.setBirth(birth); goStep("map"); }} />;
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
          <button type="button" className={map.revealCta} onClick={() => goStep("result")}>
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
        onNext={() => goStep("today")}
        onRestart={() => { clearResumeMarks(); s.reset(); }}
        onCrossroad={() => goStep("crossroad")}
        onFutureSim={() => goStep("futureSim")}
        onVoyage={() => goStep("voyage")}
        resumeWiring={reportResumeWiring}
      />
    );
  }

  if (s.step === "crossroad" && s.field) {
    return (
      <Crossroads
        field={s.field}
        onBack={() => goStep("result")}
        buildResume={buildCrossroadResume}
        resumed={resumedStep === "crossroad" ? resumedCrossroad : null}
      />
    );
  }

  if (s.step === "futureSim" && s.field) {
    return (
      <FutureSim
        field={s.field}
        onBack={() => goStep("result")}
        buildResume={buildFutureSimResume}
        autoRevealed={resumedStep === "futureSim"}
      />
    );
  }

  if (s.step === "voyage" && s.field) {
    return (
      <LifeVoyage
        field={s.field}
        onBack={() => goStep("result")}
        buildResume={buildVoyageResume}
        autoRevealed={resumedStep === "voyage"}
      />
    );
  }

  if (s.step === "today" && s.field) {
    return <TodayQuest field={s.field} onArrive={() => s.setStep("arrival")} onReset={() => s.reset()} />;
  }

  if (s.step === "arrival" && s.field) {
    return <Arrival field={s.field} onRestart={() => s.reset()} />;
  }

  return null;
}

