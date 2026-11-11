"use client";
import { hasFreeReadingSession } from '@/app/_lib/free-reading-access';
import { useFreeReadingGuard } from '@/app/_lib/use-free-reading-guard';
import { useReadingIdentityReset } from '@/app/_lib/use-reading-identity-reset';
import { freeReadingCopy } from '@/app/_lib/free-reading-copy';
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";

/**
 * STEP 7 운명의 갈림길 — 두 선택지(A/B)의 기운을 결정론 비교(computeCrossroad).
 * 정답 단정이 아니라 '두 길의 기운' 비교 연출 + 꽃돼지 해설.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaidResumeArgs, PaidResumeDescriptor } from "@/app/hooks/usePaidResume";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { computeCrossroad } from "../_engine/crossroad";
import { useDestinyCompassCopy } from "../_lib/copy";
import { saveCompassArchive } from "../_lib/archive";
import { detectLocale } from "@/lib/i18n/dictionary";
import styles from "./map.module.css";
import type { DirectionField, SystemKey } from "../_engine/types";

export function Crossroads({
  field,
  onBack,
  buildResume,
  resumed = null,
}: {
  field: DirectionField;
  onBack: () => void;
  /** 결제 복귀 재개 서술자 생성기. 핸들러 등록은 항상 떠 있는 CompassApp 이 한다. */
  buildResume?: (args?: PaidResumeArgs) => PaidResumeDescriptor;
  /** 결제 복귀로 열렸으면 결제 직전에 입력했던 두 선택지를 되살려 바로 비교를 보여준다. */
  resumed?: { a: string; b: string; requestId?: string } | null;
}) {
  const copy = useDestinyCompassCopy();
  const freeCopy = freeReadingCopy(detectLocale());
  const [isPaying, setIsPaying] = useState(false);
  const [a, setA] = useState(resumed?.a || "");
  const [b, setB] = useState(resumed?.b || "");
  const [compared, setCompared] = useState(Boolean(resumed?.a && resumed?.b));
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(
    () => (compared && a.trim() && b.trim() ? computeCrossroad(field, a, b) : null),
    [compared, field, a, b],
  );
  const systems = useMemo(
    () => (field.sources.length ? field.sources : (["saju", "ziwei"] as SystemKey[])),
    [field.sources],
  );
  // 결제가 끝나 아직 보관함에 보내지 않은 결제. 비교가 그려지면 한 번 보내고 비운다.
  const paidRef = useRef<{ requestId: string; accessMethod?: string } | null>(
    resumed?.requestId ? { requestId: resumed.requestId } : null,
  );

  useEffect(() => {
    const paid = paidRef.current;
    if (!result || !paid) return;
    paidRef.current = null;
    const [optA, optB] = result.options;
    const rec = result.options.find((o) => o.id === result.recommended) ?? optA;
    saveCompassArchive("destiny-compass-crossroads", {
      ...paid,
      facts: { optionA: optA.labelKey, optionB: optB.labelKey, recommended: rec.labelKey, score: rec.total, scoreA: optA.total, scoreB: optB.total },
      sections: [
        ...result.options.map((opt) => ({
          title: opt.id === result.recommended ? `${opt.labelKey} · ${copy.recommendedBadge}` : opt.labelKey,
          body: [`${copy.totalEnergyLabel} ${opt.total}`, ...systems.map((sys) => `${copy.systemLabel[sys]} ${opt.systemScores[sys] ?? 0}`)].join("\n"),
        })),
        { title: copy.pigSpeakerName, body: copy.crossroadsResultPigLine(rec.labelKey) },
      ],
    });
  }, [result, copy, systems]);

  // New deterministic readings require login only; paidRef is reserved for historical resume.
  const beginFreeReading = useFreeReadingGuard(JSON.stringify([field, a, b]));
  useReadingIdentityReset(() => { setCompared(false); setA(""); setB(""); paidRef.current = null; setError(null); setIsPaying(false); });
  const compare = useCallback(async () => {
    if (!a.trim() || !b.trim()) return;
    const request = beginFreeReading(); if (!request) return;
    setIsPaying(true); setError(null);
    try {
      const signedIn = await hasFreeReadingSession();
      if (!request.valid()) return;
      if (!signedIn) { setError(copy.loginRequiredError); return; }
      setCompared(true);
    } catch { if (request.valid()) setError(copy.loginRequiredError); }
    finally { request.finish(); setIsPaying(false); }
  }, [beginFreeReading, copy, a, b]);

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Crossroad</span>
        <h1 className={styles.mapTitle}>{copy.crossroadsTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        {!result && detectLocale() === "ko" && <div style={{width:"100%",maxWidth:540,margin:"0 auto 24px",color:"#463a31",background:"#eee7dc",borderRadius:12}}><CraftedProductDisclosure featureKey="destiny-compass-crossroads" summaryLabel="갈림길 기운 비교 상세 안내" /></div>}
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
                data-cd-reading-action="primary" className={styles.resultCta}
                disabled={!a.trim() || !b.trim() || isPaying}
                onClick={compare}
              >
                {isPaying ? freeCopy.checking : `${copy.compareButton} · ${freeCopy.badge} →`}
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
