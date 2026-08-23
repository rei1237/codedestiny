"use client";
/**
 * STEP 7 운명의 갈림길 — 두 선택지(A/B)의 기운을 결정론 비교(computeCrossroad).
 * 정답 단정이 아니라 '두 길의 기운' 비교 연출 + 꽃돼지 해설.
 */
import { useCallback, useMemo, useState } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { computeCrossroad } from "../_engine/crossroad";
import { redirectToLoginOnAuthRequired, makeGateRequestId } from "./paidGate";
import { useDestinyCompassCopy } from "../_lib/copy";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";
import { detectLocale } from "@/lib/i18n/dictionary";
import styles from "./map.module.css";
import type { DirectionField, SystemKey } from "../_engine/types";

export function Crossroads({ field, onBack }: { field: DirectionField; onBack: () => void }) {
  const copy = useDestinyCompassCopy();
  const priceLabel = formatKrwFromCoins(100, detectLocale());
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [compared, setCompared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(
    () => (compared && a.trim() && b.trim() ? computeCrossroad(field, a, b) : null),
    [compared, field, a, b],
  );
  const systems = field.sources.length ? field.sources : (["saju", "ziwei"] as SystemKey[]);

  // 결제 게이트: 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등) → 통과 후에만 비교 노출.
  const compare = useCallback(async () => {
    if (!a.trim() || !b.trim() || isPaying) return;
    setError(null);
    const r = await ensurePaidAccess({
      featureKey: "destiny-compass-crossroads",
      coinPrice: 100,
      amountKRW: 10000,
      reason: copy.crossroadsGateReason,
      requestId: makeGateRequestId("destiny-compass-crossroads"),
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
    setCompared(true);
  }, [a, b, isPaying, ensurePaidAccess, copy]);

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Crossroad</span>
        <h1 className={styles.mapTitle}>{copy.crossroadsTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        {!result ? (
          <>
            <div className={styles.resultSpeak}>
              <PigFace expression="think" height={72} className={styles.speakPigDark} />
              <div className={styles.resultBubble}>
                <div className={styles.resultWho}>{copy.pigSpeakerName}</div>
                <p>{copy.crossroadsPigIntro}</p>
              </div>
            </div>

            <div className={styles.xForm}>
              <label className={styles.xField}>
                <span>{copy.fieldALabel}</span>
                <input
                  className={styles.xInput}
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  placeholder={copy.fieldAPlaceholder}
                  aria-label={copy.fieldAAriaLabel}
                  maxLength={40}
                />
              </label>
              <span className={styles.xVs} aria-hidden="true">VS</span>
              <label className={styles.xField}>
                <span>{copy.fieldBLabel}</span>
                <input
                  className={styles.xInput}
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  placeholder={copy.fieldBPlaceholder}
                  aria-label={copy.fieldBAriaLabel}
                  maxLength={40}
                />
              </label>
            </div>

            <div className={styles.xHints}>
              {copy.crossroadsHints.map(([ha, hb]) => (
                <button
                  key={ha}
                  type="button"
                  className={styles.xHint}
                  onClick={() => {
                    setA(ha);
                    setB(hb);
                  }}
                >
                  {ha} vs {hb}
                </button>
              ))}
            </div>

            <div className={styles.resultCtas}>
              <button
                type="button"
                className={styles.resultCta}
                disabled={!a.trim() || !b.trim() || isPaying}
                onClick={compare}
              >
                {isPaying ? copy.compareButtonBusy : `${copy.compareButton} · ${priceLabel} →`}
              </button>
              <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
                {copy.backButton}
              </button>
            </div>
            {error && (
              <p className={styles.gateError} role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <div className={styles.xCards}>
              {result.options.map((opt) => {
                const isRec = opt.id === result.recommended;
                return (
                  <div key={opt.id} className={`${styles.xCard} ${isRec ? styles.xCardRec : ""}`}>
                    {isRec && <span className={styles.xBadge}>{copy.recommendedBadge}</span>}
                    <div className={styles.xOptLabel}>{opt.labelKey}</div>
                    <div className={styles.xTotal}>
                      {opt.total}
                      <span>{copy.totalEnergyLabel}</span>
                    </div>
                    {systems.map((sys) => (
                      <div key={sys} className={styles.xSysRow}>
                        <span className={styles.xSysLabel}>{copy.systemLabel[sys]}</span>
                        <span className={styles.xSysTrack}>
                          <i style={{ transform: `scaleX(${(opt.systemScores[sys] ?? 0) / 100})` }} />
                        </span>
                        <span className={styles.xSysVal}>{opt.systemScores[sys] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className={styles.resultSpeak}>
              <PigFace expression="talk" height={72} className={styles.speakPigDark} />
              <div className={styles.resultBubble}>
                <div className={styles.resultWho}>{copy.pigSpeakerName}</div>
                <p>{copy.crossroadsResultPigLine(result.options.find((o) => o.id === result.recommended)?.labelKey ?? "")}</p>
              </div>
            </div>

            <div className={styles.resultCtas}>
              <button type="button" className={styles.resultCtaGhost} onClick={() => setCompared(false)}>
                {copy.compareAgainButton}
              </button>
              <button type="button" className={styles.resultCtaText} onClick={onBack}>
                {copy.backToCompassButton}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
