"use client";
/**
 * STEP 8·11 삶의 항로 — DirectionField.timeline(30일/90일/1년/3년 · weather/momentum)을
 * 항해 메타포로 연출(연이 내레이션). 읽기 전용 소비, 추가 계산 없음.
 */
import { useCallback, useState } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { redirectToLoginOnAuthRequired, makeGateRequestId } from "./paidGate";
import { useDestinyCompassCopy } from "../_lib/copy";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";
import { detectLocale } from "@/lib/i18n/dictionary";
import styles from "./map.module.css";
import type { DirectionField, TimelineKey, Weather } from "../_engine/types";

const PERIOD_KEYS: TimelineKey[] = ["d30", "d90", "y1", "y3"];

/** 날씨 이모지 — 로케일 무관(장식 아이콘). */
const WEATHER_ICON: Record<Weather, string> = { clear: "☀️", breeze: "⛵", fog: "🌫️", storm: "🌊" };

export function LifeVoyage({ field, onBack }: { field: DirectionField; onBack: () => void }) {
  const copy = useDestinyCompassCopy();
  const priceLabel = formatKrwFromCoins(100, detectLocale());
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결제 게이트: 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등) → 통과 후에만 항로 노출.
  const reveal = useCallback(async () => {
    if (isPaying) return;
    setError(null);
    const r = await ensurePaidAccess({
      featureKey: "destiny-compass-life-voyage",
      coinPrice: 100,
      amountKRW: 10000,
      reason: copy.lifeVoyageGateReason,
      requestId: makeGateRequestId("destiny-compass-life-voyage"),
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
  }, [isPaying, ensurePaidAccess, copy]);

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Life Voyage</span>
        <h1 className={styles.mapTitle}>{copy.lifeVoyageTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.resultSpeak}>
          <PigFace expression="talk" height={80} className={styles.speakPigDark} />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>{copy.pigSpeakerName}</div>
            <p>{revealed ? copy.lifeVoyageRevealedPigLine : copy.lifeVoyageNotRevealedPigLine}</p>
          </div>
        </div>

        {revealed ? (
          <ol className={styles.voyageTrack}>
            {PERIOD_KEYS.map((key, i) => {
              const phase = field.timeline[key];
              const w = copy.lifeVoyageWeather[phase.weather];
              return (
                <li key={key} className={styles.voyageStop} data-tone={phase.weather}>
                  <div className={styles.voyageMark}>
                    <span className={styles.voyageIcon} aria-hidden="true">{WEATHER_ICON[phase.weather]}</span>
                    {i < PERIOD_KEYS.length - 1 && <span className={styles.voyageLink} aria-hidden="true" />}
                  </div>
                  <div className={styles.voyageCard}>
                    <div className={styles.voyagePeriod}>{copy.voyagePeriodLabel[key]}{copy.voyagePeriodSuffix}</div>
                    <div className={styles.voyageWeather}>
                      {w.label} <span aria-hidden="true">·</span> {copy.cruiseIndexSuffix} {phase.momentum}
                    </div>
                    <span className={styles.voyageBar}>
                      <i style={{ transform: `scaleX(${phase.momentum / 100})` }} />
                    </span>
                    <p className={styles.voyageHead}>{w.head}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={styles.voyageLock}>
            <span className={styles.voyageLockIcon} aria-hidden="true">🧭</span>
            <p className={styles.voyageLockText}>{copy.lifeVoyageLockText}</p>
          </div>
        )}

        <div className={styles.resultCtas}>
          {!revealed && (
            <button type="button" className={styles.resultCta} disabled={isPaying} onClick={reveal}>
              {isPaying ? copy.revealButtonBusy : `${copy.lifeVoyageRevealButton} · ${priceLabel}`}
            </button>
          )}
          <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
            ← {copy.backToCompassButton}
          </button>
        </div>
        {error && (
          <p className={styles.gateError} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
