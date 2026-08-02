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
import styles from "./map.module.css";
import type { DirectionField, TimelineKey, Weather } from "../_engine/types";

const PERIODS: { key: TimelineKey; label: string }[] = [
  { key: "d30", label: "30일" },
  { key: "d90", label: "90일" },
  { key: "y1", label: "1년" },
  { key: "y3", label: "3년" },
];

const WEATHER: Record<Weather, { icon: string; label: string; head: string; tone: string }> = {
  clear: { icon: "☀️", label: "맑음", head: "순풍에 돛 단 듯, 크게 나아가도 좋은 때예요.", tone: "clear" },
  breeze: { icon: "⛵", label: "순풍", head: "잔잔한 순풍이에요. 꾸준히 저어가면 닿아요.", tone: "breeze" },
  fog: { icon: "🌫️", label: "안개", head: "안개 구간이에요. 속도를 줄이고 방향만 지켜요.", tone: "fog" },
  storm: { icon: "🌊", label: "높은 물결", head: "물결이 높아요. 무리한 항해보다 잠시 정박이 현명해요.", tone: "storm" },
};

export function LifeVoyage({ field, onBack }: { field: DirectionField; onBack: () => void }) {
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
      reason: "삶의 항로 안내",
      requestId: makeGateRequestId("destiny-compass-life-voyage"),
    });
    if (!r.ok) {
      if (redirectToLoginOnAuthRequired(r.code)) {
        setError("로그인이 필요해요. 로그인 화면으로 이동할게요.");
        return;
      }
      if (r.code !== "PAYMENT_CANCELLED") {
        setError(r.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }
    setRevealed(true);
  }, [isPaying, ensurePaidAccess]);

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Life Voyage</span>
        <h1 className={styles.mapTitle}>삶의 항로</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.resultSpeak}>
          <PigFace expression="talk" height={80} className={styles.speakPigDark} />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>꽃돼지</div>
            <p>
              {revealed
                ? "여기서부터는 제가 항로를 짚어드릴게요. 날씨는 바뀌어요 — 지금 흐린 구간도 결국 지나가요."
                : "앞으로의 항로를 30일·90일·1년·3년으로 짚어드릴게요. 날씨는 바뀌어요 — 지금 흐린 구간도 결국 지나가니까요."}
            </p>
          </div>
        </div>

        {revealed ? (
          <ol className={styles.voyageTrack}>
            {PERIODS.map((p, i) => {
              const phase = field.timeline[p.key];
              const w = WEATHER[phase.weather];
              return (
                <li key={p.key} className={styles.voyageStop} data-tone={w.tone}>
                  <div className={styles.voyageMark}>
                    <span className={styles.voyageIcon} aria-hidden="true">{w.icon}</span>
                    {i < PERIODS.length - 1 && <span className={styles.voyageLink} aria-hidden="true" />}
                  </div>
                  <div className={styles.voyageCard}>
                    <div className={styles.voyagePeriod}>{p.label} 뒤</div>
                    <div className={styles.voyageWeather}>
                      {w.label} <span aria-hidden="true">·</span> 순항도 {phase.momentum}
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
            <p className={styles.voyageLockText}>
              30일 · 90일 · 1년 · 3년, 네 구간의 순항도와 날씨를 항해 지도로 펼쳐드려요.
            </p>
          </div>
        )}

        <div className={styles.resultCtas}>
          {!revealed && (
            <button type="button" className={styles.resultCta} disabled={isPaying} onClick={reveal}>
              {isPaying ? "결제 확인 중…" : "삶의 항로 펼치기 · 10,000원"}
            </button>
          )}
          <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
            ← 나침반으로 돌아가기
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
