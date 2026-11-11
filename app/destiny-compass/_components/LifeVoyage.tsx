"use client";
import { hasFreeReadingSession } from '@/app/_lib/free-reading-access';
import { useFreeReadingGuard } from '@/app/_lib/use-free-reading-guard';
import { useReadingIdentityReset } from '@/app/_lib/use-reading-identity-reset';
import { freeReadingCopy } from '@/app/_lib/free-reading-copy';
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";

/**
 * STEP 8·11 삶의 항로 — DirectionField.timeline(30일/90일/1년/3년 · weather/momentum)을
 * 항해 메타포로 연출(연이 내레이션). 읽기 전용 소비, 추가 계산 없음.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PaidResumeArgs, PaidResumeDescriptor } from "@/app/hooks/usePaidResume";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { useDestinyCompassCopy } from "../_lib/copy";
import { saveCompassArchive } from "../_lib/archive";
import { detectLocale } from "@/lib/i18n/dictionary";
import styles from "./map.module.css";
import type { DirectionField, TimelineKey, Weather } from "../_engine/types";

const PERIOD_KEYS: TimelineKey[] = ["d30", "d90", "y1", "y3"];

/** 날씨 이모지 — 로케일 무관(장식 아이콘). */
const WEATHER_ICON: Record<Weather, string> = { clear: "☀️", breeze: "⛵", fog: "🌫️", storm: "🌊" };

export function LifeVoyage({
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

  useEffect(() => {
    const paid = paidRef.current;
    if (!revealed || !paid) return;
    paidRef.current = null;
    saveCompassArchive("destiny-compass-life-voyage", {
      ...paid,
      facts: { score: field.primary.score, ...Object.fromEntries(PERIOD_KEYS.map((key) => [key, field.timeline[key].momentum])) },
      sections: PERIOD_KEYS.map((key) => {
        const phase = field.timeline[key];
        const w = copy.lifeVoyageWeather[phase.weather];
        return { title: `${copy.voyagePeriodLabel[key]}${copy.voyagePeriodSuffix}`, body: `${w.label} · ${copy.cruiseIndexSuffix} ${phase.momentum}\n${w.head}` };
      }),
    });
  }, [revealed, field, copy]);

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Life Voyage</span>
        <h1 className={styles.mapTitle}>{copy.lifeVoyageTitle}</h1>
      </header>

      <div className={styles.resultBody}>
        {!revealed && detectLocale() === "ko" && <div style={{width:"100%",maxWidth:540,margin:"0 auto 24px",color:"#463a31",background:"#eee7dc",borderRadius:12}}><CraftedProductDisclosure featureKey="destiny-compass-life-voyage" summaryLabel="삶의 항로 상세 안내" /></div>}
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
            <button type="button" data-cd-reading-action="primary" className={styles.resultCta} disabled={isPaying} onClick={reveal}>
              {isPaying ? freeCopy.checking : `${copy.lifeVoyageRevealButton} · ${freeCopy.badge}`}
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
