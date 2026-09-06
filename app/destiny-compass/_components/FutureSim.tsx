"use client";
/**
 * STEP 8 미래 시뮬레이션 — 지도 경로 위 시점 마커(현재/30일/90일/1년)를 눌러 구간 이야기를 본다.
 * DirectionField.timeline(이미 계산된 결정론 데이터) 읽기 전용. 회당 결제(심화 3프리뷰 중 1). 추가 계산 없음.
 * 결제 게이트: 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등) → 통과 후에만 시점 지도 노출.
 */
import { useCallback, useState } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import type { PaidResumeArgs, PaidResumeDescriptor } from "@/app/hooks/usePaidResume";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { redirectToLoginOnAuthRequired, makeGateRequestId } from "./paidGate";
import { useDestinyCompassCopy } from "../_lib/copy";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";
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
}: {
  field: DirectionField;
  onBack: () => void;
  /** 결제 복귀 재개 서술자 생성기. 핸들러 등록은 항상 떠 있는 CompassApp 이 한다. */
  buildResume?: (args?: PaidResumeArgs) => PaidResumeDescriptor;
  /** 결제 복귀로 이 화면이 열렸으면 처음부터 공개 상태다(결제는 이미 끝났다). */
  autoRevealed?: boolean;
}) {
  const copy = useDestinyCompassCopy();
  const priceLabel = formatKrwFromCoins(100, detectLocale());
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [revealed, setRevealed] = useState(autoRevealed);
  const [error, setError] = useState<string | null>(null);

  // 결제 게이트: 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등) → 통과 후에만 콘텐츠 노출.
  const reveal = useCallback(async () => {
    if (isPaying) return;
    setError(null);
    const r = await ensurePaidAccess({
      featureKey: "destiny-compass-future-sim",
      coinPrice: 100,
      amountKRW: 10000,
      reason: copy.futureSimGateReason,
      requestId: makeGateRequestId("destiny-compass-future-sim"),
      resume: buildResume?.(),
    });
    if (!r.ok) {
      if (redirectToLoginOnAuthRequired(r.code)) {
        setError(copy.loginRequiredError);
        return;
      }
      if (r.code !== "PAYMENT_CANCELLED") {
        setError(r.message || copy.paymentFailedError);
      }
      return;
    }
    setRevealed(true);
  }, [isPaying, ensurePaidAccess, copy, buildResume]);

  // 현재(=대표 방향 기운) + 30/90/1년(timeline). 지도 경로 위 좌표(%)로 배치.
  const nowM = field.primary.score;
  const T = (k: TimelineKey) => field.timeline[k];
  const stops: Stop[] = [
    { key: "now", label: copy.futureSimStopLabel.now, x: 10, y: 72, momentum: nowM, weather: weatherOf(nowM) },
    { key: "d30", label: copy.futureSimStopLabel.d30, x: 36, y: 52, momentum: T("d30").momentum, weather: T("d30").weather },
    { key: "d90", label: copy.futureSimStopLabel.d90, x: 62, y: 60, momentum: T("d90").momentum, weather: T("d90").weather },
    { key: "y1", label: copy.futureSimStopLabel.y1, x: 88, y: 30, momentum: T("y1").momentum, weather: T("y1").weather },
  ];
  const [sel, setSel] = useState<string>("now");
  const active = stops.find((s) => s.key === sel) ?? stops[0];
  const w = copy.futureSimWeather[active.weather];

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
            <button type="button" className={styles.resultCta} disabled={isPaying} onClick={reveal}>
              {isPaying ? copy.revealButtonBusy : `${copy.futureSimRevealButton} · ${priceLabel}`}
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
