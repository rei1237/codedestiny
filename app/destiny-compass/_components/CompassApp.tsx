"use client";
/**
 * 운명의 나침반 오케스트레이터 — 히어로 → 생년 → 선택 무대(고민 입력) → 처리 → 결과 → 오늘.
 * 결정론 엔진은 세션(useCompassSession)이 처리 단계에서 실행. 결과/오늘 화면은 기존 재사용(P2에서 격상).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import type { AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useCompassSession, type CompassStep } from "../_hooks/useCompassSession";
import { useFxTier } from "../_hooks/useFxTier";
import { JourneyHub } from "./JourneyHub";
import { CompassReport } from "./CompassReport";
import { Crossroads } from "./Crossroads";
import { FutureSim } from "./FutureSim";
import { LifeVoyage } from "./LifeVoyage";
import { TodayQuest } from "./TodayQuest";
import { Arrival } from "./Arrival";
import { DestinyMap } from "./DestinyMap";
import { ConcernInput } from "./ConcernInput";
import { ConstellationMark } from "./ConstellationMark";
import { type PigExpr } from "../_stage/mapDialogue";
import { ProcessingScene } from "./ProcessingScene";
import { Starfield } from "./Starfield";
import { DIRECTION_TO_REGION, regionByKey } from "./mapRegions";
import map from "./map.module.css";

export function CompassApp({ start = "hub" }: { start?: CompassStep } = {}) {
  const s = useCompassSession(start);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [pigExpr, setPigExpr] = useState<PigExpr>("talk");

  if (s.step === "hub") {
    return <JourneyHub onStart={() => s.setStep(s.birth ? "map" : "birth")} />;
  }

  if (s.step === "birth") {
    return (
      <BirthGate
        onSubmit={(birth) => {
          s.setBirth(birth);
          s.setStep("map");
        }}
      />
    );
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
    const destLabel = regionByKey(destRegion)?.label ?? "";
    return (
      <DestinyMap title="나침반이 방향을 잡았어요" kicker="The Bearing Revealed" pathTo={destRegion} highlightRegion={destRegion} phase="night">
        <div className={map.revealPanel}>
          <p className={map.revealText}>
            안개가 걷히자, <b>{destLabel}</b> 쪽으로 바늘이 금빛으로 고정됐어요.
          </p>
          <button type="button" className={map.revealCta} onClick={() => s.setStep("result")}>
            결과 확인하기 →
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

function BirthGate({ onSubmit }: { onSubmit: (birth: AnimalDestinyInput) => void }) {
  const { seed, reload } = useAiProfileSeed();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<AnimalDestinyInput["gender"]>("female");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [lunarLeap, setLunarLeap] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rpg, setRpg] = useState<{ level?: number; title?: string } | null>(null);
  const appliedRef = useRef(false);
  const fxTier = useFxTier();

  // 프로필 카드 시드 → 생년 폼 채움. 개별 필드 독립 적용(일부만 있어도 반영 — 부분 등록 대응).
  const applySeed = useCallback((s: AiPrefillSeed | null, force = false) => {
    if (!s) return;
    if (!force && appliedRef.current) return;
    appliedRef.current = true;
    if (s.birthDate) setBirthDate(s.birthDate);
    if (s.birthTime) {
      setBirthTime(s.birthTime);
      setTimeUnknown(false);
    } else if (s.birthTimeUnknown) {
      setBirthTime("");
      setTimeUnknown(true);
    }
    if (s.gender === "male") setGender("male");
    else if (s.gender === "female") setGender("female");
    if (s.calendarType === "lunar" || s.calendarType === "solar") setCalendarType(s.calendarType);
    // 출생일이 있으면 확인 카드, 없으면(부분 등록) 폼을 열어 부족분만 채우게 한다.
    setPrefilled(Boolean(s.birthDate));
    setEditing(!s.birthDate);
  }, []);

  // 최초 시드 도착 시 1회 자동 프리필(사용자가 아직 입력하지 않았을 때만 — 편집값 미덮어씀)
  useEffect(() => {
    if (appliedRef.current || birthDate) return;
    applySeed(seed);
  }, [seed, birthDate, applySeed]);

  // 게이미피케이션 레벨(있으면 표시만) — 런타임 전역이 있을 때만, 네트워크 미호출·읽기 전용.
  useEffect(() => {
    try {
      const snap = (window as unknown as { CDLevel?: { snapshot?: () => { currentLevel?: number } } }).CDLevel?.snapshot?.();
      if (snap && typeof snap.currentLevel === "number") setRpg({ level: snap.currentLevel });
    } catch {
      /* 없으면 생략 */
    }
  }, []);

  const reloadFromProfile = useCallback(async () => {
    const next = await reload();
    applySeed(next, true);
  }, [reload, applySeed]);

  const submit = () => {
    if (!birthDate) {
      setEditing(true);
      return;
    }
    onSubmit({
      birthDate,
      birthTime: timeUnknown ? undefined : birthTime || undefined,
      gender,
      calendarType,
      lunarLeap: calendarType === "lunar" ? lunarLeap : false,
    });
  };

  const genderKo = gender === "male" ? "남성" : "여성";
  const calKo = calendarType === "lunar" ? (lunarLeap ? "음력(윤달)" : "음력") : "양력";
  const showConfirm = prefilled && !editing;

  return (
    <div className={map.birthStage} data-fx={fxTier}>
      <Starfield />
      {showConfirm ? (
        <div className={map.birthPanel}>
          <span className={map.birthKicker}>Destiny Compass</span>
          <h1 className={map.birthTitle}>이 정보로 방향을 맞출게요</h1>
          <p className={map.birthSub}>프로필 카드에서 불러왔어요. 계산에만 쓰이고 저장되지 않아요.</p>
          <div className={map.birthConfirm}>
            {rpg?.level != null && (
              <div className={map.birthLevelBadge}>
                <ConstellationMark variant={2} size={13} /> Lv.{rpg.level}{rpg.title ? ` · ${rpg.title}` : ""}
              </div>
            )}
            <dl className={map.birthConfirmList}>
              <div><dt>생년월일</dt><dd>{birthDate}</dd></div>
              <div><dt>태어난 시각</dt><dd>{timeUnknown || !birthTime ? "모름" : birthTime}</dd></div>
              <div><dt>성별</dt><dd>{genderKo}</dd></div>
              <div><dt>달력</dt><dd>{calKo}</dd></div>
            </dl>
          </div>
          <button type="button" className={map.birthCta} onClick={submit}>
            이 정보로 나침반 맞추기 →
          </button>
          <button type="button" className={map.birthPrefillLink} onClick={() => setEditing(true)}>
            정보 변경
          </button>
        </div>
      ) : (
        <form
          className={map.birthPanel}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className={map.birthKicker}>Destiny Compass</span>
          <h1 className={map.birthTitle}>나침반을 맞추기 전에</h1>
          <p className={map.birthSub}>당신의 명식으로 방향을 읽어요. 계산에만 쓰이고 저장되지 않아요.</p>
          {seed?.birthDate && !prefilled && (
            <button type="button" className={map.birthPrefillLink} onClick={reloadFromProfile}>
              프로필 카드에서 불러오기 →
            </button>
          )}
          <div className={map.birthField}>
            <label htmlFor="cd-bd">생년월일</label>
            <input id="cd-bd" className={map.birthInput} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          </div>
          <div className={map.birthField}>
            <label htmlFor="cd-bt">태어난 시각 (모르면 비워두세요)</label>
            <input
              id="cd-bt"
              className={map.birthInput}
              type="time"
              value={birthTime}
              onChange={(e) => {
                setBirthTime(e.target.value);
                if (e.target.value) setTimeUnknown(false);
              }}
              disabled={timeUnknown}
            />
            <label className={map.birthLeapRow}>
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
              태어난 시각을 몰라요
            </label>
          </div>
          <div className={map.birthField}>
            <label htmlFor="cd-gd">성별</label>
            <select id="cd-gd" className={map.birthSelect} value={gender} onChange={(e) => setGender(e.target.value as AnimalDestinyInput["gender"])}>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </select>
          </div>
          <div className={map.birthField}>
            <label htmlFor="cd-cal">양력 / 음력</label>
            <select id="cd-cal" className={map.birthSelect} value={calendarType} onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar")}>
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
            {calendarType === "lunar" && (
              <label className={map.birthLeapRow}>
                <input type="checkbox" checked={lunarLeap} onChange={(e) => setLunarLeap(e.target.checked)} />
                윤달이에요
              </label>
            )}
          </div>
          <button type="submit" className={map.birthCta} disabled={!birthDate}>
            나침반 맞추기
          </button>
        </form>
      )}
    </div>
  );
}
