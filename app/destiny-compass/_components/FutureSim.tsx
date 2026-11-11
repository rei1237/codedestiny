"use client";
import { hasFreeReadingSession } from '@/app/_lib/free-reading-access';
import { useFreeReadingGuard } from '@/app/_lib/use-free-reading-guard';
import { useReadingIdentityReset } from '@/app/_lib/use-reading-identity-reset';
import { freeReadingCopy } from '@/app/_lib/free-reading-copy';
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";

/**
 * STEP 8 미래 시뮬레이션 — 지도 경로 위 시점 마커(현재/30일/90일/1년)를 눌러 구간 이야기를 본다.
 * DirectionField.timeline(이미 계산된 결정론 데이터) 읽기 전용. 무료 계산형 3프리뷰 중 하나. 추가 계산 없음.
 * 로그인 확인 뒤 계산형 시점을 무료로 펼치며, 과거 구매 복원은 유지한다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaidResumeArgs, PaidResumeDescriptor } from "@/app/hooks/usePaidResume";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { useDestinyCompassCopy } from "../_lib/copy";
import { saveCompassArchive } from "../_lib/archive";
import { detectLocale } from "@/lib/i18n/dictionary";
import styles from "./map.module.css";
import type { DirectionField, TimelineKey, Weather } from "../_engine/types";

function weatherOf(m: number): Weather {
  return m >= 70 ? "clear" : m >= 55 ? "breeze" : m >= 40 ? "fog" : "storm";
}

interface Stop {
  key: string;
  label: string;
  x: number;
  y: number;
  momentum: number;
  weather: Weather;
}

export function FutureSim({
  field,
  onBack,
  buildResume,
  autoRevealed = false,
  resumeRequestId = "",
}: {
  field: DirectionField;
  onBack: () => void;
  /** 결제 복귀 재개 서술자 생성기. 핸들러 등록은 항상 떠 있는 CompassApp 이 한다. */
  buildResume?: (args?: PaidResumeArgs) => PaidResumeDescriptor;
  /** 결제 복귀로 이 화면이 열렸으면 처음부터 공개 상태다(결제는 이미 끝났다). */
  autoRevealed?: boolean;
  /** 결제 복귀면 그 결제의 requestId — 보관함 저장 증빙이다. */
  resumeRequestId?: string;
}) {
  const copy = useDestinyCompassCopy();
  const freeCopy = freeReadingCopy(detectLocale());
  const [isPaying, setIsPaying] = useState(false);
  const [revealed, setRevealed] = useState(autoRevealed);
  const [error, setError] = useState<string | null>(null);
  // 결제가 끝나 아직 보관함에 보내지 않은 결제. 공개되면 한 번 보내고 비운다.
  const paidRef = useRef<{ requestId: string; accessMethod?: string } | null>(
    autoRevealed && resumeRequestId ? { requestId: resumeRequestId } : null,
  );

  // New deterministic readings require login only; paidRef is reserved for historical resume.
  const beginFreeReading = useFreeReadingGuard(JSON.stringify(field));
  useReadingIdentityReset(() => { setRevealed(false); paidRef.current = null; setError(null); setIsPaying(false); });
  const reveal = useCallback(async () => {

    const request = beginFreeReading(); if (!request) return;
    setIsPaying(true); setError(null);
    try {
      const signedIn = await hasFreeReadingSession();
      if (!request.valid()) return;
      if (!signedIn) { setError(copy.loginRequiredError); return; }
      setRevealed(true);
    } catch { if (request.valid()) setError(copy.loginRequiredError); }
    finally { request.finish(); setIsPaying(false); }
  }, [beginFreeReading, copy]);

  // 현재(=대표 방향 기운) + 30/90/1년(timeline). 지도 경로 위 좌표(%)로 배치.
  const stops = useMemo<Stop[]>(() => {
    const nowM = field.primary.score;
    const T = (k: TimelineKey) => field.timeline[k];
    return [
      { key: "now", label: copy.futureSimStopLabel.now, x: 10, y: 72, momentum: nowM, weather: weatherOf(nowM) },
      { key: "d30", label: copy.futureSimStopLabel.d30, x: 36, y: 52, momentum: T("d30").momentum, weather: T("d30").weather },
      { key: "d90", label: copy.futureSimStopLabel.d90, x: 62, y: 60, momentum: T("d90").momentum, weather: T("d90").weather },
      { key: "y1", label: copy.futureSimStopLabel.y1, x: 88, y: 30, momentum: T("y1").momentum, weather: T("y1").weather },
    ];
  }, [field, copy]);
  const [sel, setSel] = useState<string>("now");
  const active = stops.find((s) => s.key === sel) ?? stops[0];
  const w = copy.futureSimWeather[active.weather];

  useEffect(() => {
    const paid = paidRef.current;
    if (!revealed || !paid) return;
    paidRef.current = null;
    saveCompassArchive("destiny-compass-future-sim", {
      ...paid,
      facts: Object.fromEntries(stops.map((s) => [s.key === "now" ? "score" : s.key, s.momentum])),
      sections: stops.map((s) => ({
        title: s.label,
        body: `${copy.futureSimWeather[s.weather].label} · ${copy.cruiseIndexSuffix} ${s.momentum}\n${copy.futureSimWeather[s.weather].head}`,
      })),
    });
  }, [revealed, stops, copy]);

  // 경로 폴리라인 좌표(viewBox 100×100)
  const poly = stops.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Future Voyage</span>
        <h1 className={styles.mapTitle}>{copy.futureSimTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        {!revealed && detectLocale() === "ko" && <div style={{width:"100%",maxWidth:540,margin:"0 auto 24px",color:"#463a31",background:"#eee7dc",borderRadius:12}}><CraftedProductDisclosure featureKey="destiny-compass-future-sim" summaryLabel="미래 시뮬레이션 상세 안내" /></div>}
        <div className={styles.resultSpeak}>
          <PigFace expression="talk" height={78} className={styles.speakPigDark} />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>{copy.pigSpeakerName}</div>
            <p>{revealed ? copy.futureSimRevealedPigLine : copy.futureSimNotRevealedPigLine}</p>
          </div>
        </div>

        {revealed ? (
          <>
            {/* 지도 경로 + 시점 마커 */}
            <div className={styles.simField}>
              <svg className={styles.simPath} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={poly} fill="none" stroke="rgba(232,213,163,.5)" strokeWidth="1.2" strokeDasharray="2 3" strokeLinecap="round" />
                <polyline points={poly} fill="none" stroke="rgba(255,240,184,.85)" strokeWidth="0.7" strokeLinecap="round" />
              </svg>
              {stops.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`${styles.simStop} ${sel === s.key ? styles.simStopOn : ""}`}
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  data-tone={s.weather}
                  onClick={() => setSel(s.key)}
                  aria-pressed={sel === s.key}
                  aria-label={copy.futureSimStopAriaLabel(s.label, copy.futureSimWeather[s.weather].label, s.momentum)}
                >
                  <span className={styles.simStar} aria-hidden="true" />
                  <span className={styles.simStopLabel}>{s.label}</span>
                </button>
              ))}
            </div>

            {/* 선택 시점 스토리 */}
            <div className={styles.simStory} data-tone={active.weather}>
              <div className={styles.simStoryTop}>
                <span className={styles.simStoryPeriod}>{active.label}</span>
                <span className={styles.simStoryWeather}>{w.label} · {copy.cruiseIndexSuffix} {active.momentum}</span>
              </div>
              <span className={styles.voyageBar}>
                <i style={{ transform: `scaleX(${active.momentum / 100})` }} />
              </span>
              <p className={styles.simStoryHead}>{w.head}</p>
            </div>
          </>
        ) : (
          <div className={styles.voyageLock}>
            <span className={styles.voyageLockIcon} aria-hidden="true">🧭</span>
            <p className={styles.voyageLockText}>{copy.futureSimLockText}</p>
          </div>
        )}

        {error && <p className={styles.gateError} role="alert">{error}</p>}

        <div className={styles.resultCtas}>
          {!revealed && (
            <button type="button" data-cd-reading-action="primary" className={styles.resultCta} disabled={isPaying} onClick={reveal}>
              {isPaying ? freeCopy.checking : `${copy.futureSimRevealButton} · ${freeCopy.badge}`}
            </button>
          )}
          <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
            ← {copy.backToCompassButton}
          </button>
        </div>
      </div>
    </div>
  );
}
