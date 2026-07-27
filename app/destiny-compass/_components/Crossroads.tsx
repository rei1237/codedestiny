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
import styles from "./map.module.css";
import type { DirectionField, SystemKey } from "../_engine/types";

const SYS_LABEL: Record<SystemKey, string> = {
  saju: "사주",
  ziwei: "자미두수",
  tarot: "타로",
  vedic: "베다",
  sukuyo: "숙요",
};

const HINTS: [string, string][] = [
  ["이직한다", "지금 회사에 남는다"],
  ["고백한다", "지켜본다"],
  ["창업한다", "취업한다"],
  ["지금 시작한다", "조금 더 준비한다"],
];

export function Crossroads({ field, onBack }: { field: DirectionField; onBack: () => void }) {
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
      reason: "운명의 갈림길 기운 비교",
      forceDeduct: true,
      requestId: makeGateRequestId("destiny-compass-crossroads"),
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
    setCompared(true);
  }, [a, b, isPaying, ensurePaidAccess]);

  return (
    <div className={styles.resultStage}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Crossroad</span>
        <h1 className={styles.mapTitle}>운명의 갈림길</h1>
      </header>

      <div className={styles.resultBody}>
        {!result ? (
          <>
            <div className={styles.resultSpeak}>
              <PigFace expression="think" height={72} className={styles.speakPigDark} />
              <div className={styles.resultBubble}>
                <div className={styles.resultWho}>꽃돼지</div>
                <p>지금 마음이 두 갈래인가요? 고민하는 두 길을 적어주면, 각 길의 기운을 나란히 견줘볼게요.</p>
              </div>
            </div>

            <div className={styles.xForm}>
              <label className={styles.xField}>
                <span>길 A</span>
                <input
                  className={styles.xInput}
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  placeholder="예: 이직한다"
                  aria-label="갈림길 A 입력"
                  maxLength={40}
                />
              </label>
              <span className={styles.xVs} aria-hidden="true">VS</span>
              <label className={styles.xField}>
                <span>길 B</span>
                <input
                  className={styles.xInput}
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  placeholder="예: 지금 회사에 남는다"
                  aria-label="갈림길 B 입력"
                  maxLength={40}
                />
              </label>
            </div>

            <div className={styles.xHints}>
              {HINTS.map(([ha, hb]) => (
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
                {isPaying ? "결제 확인 중…" : "두 길 견주기 · 10,000원 →"}
              </button>
              <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
                ← 돌아가기
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
                    {isRec && <span className={styles.xBadge}>기운이 더 열린 쪽</span>}
                    <div className={styles.xOptLabel}>{opt.labelKey}</div>
                    <div className={styles.xTotal}>
                      {opt.total}
                      <span>기운</span>
                    </div>
                    {systems.map((sys) => (
                      <div key={sys} className={styles.xSysRow}>
                        <span className={styles.xSysLabel}>{SYS_LABEL[sys]}</span>
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
                <div className={styles.resultWho}>꽃돼지</div>
                <p>
                  두 길의 기운을 견줘봤어요. 지금은 <b>{result.options.find((o) => o.id === result.recommended)?.labelKey}</b> 쪽이 조금 더 열려 있어요.
                  하지만 최종 선택은 당신 몫이에요 — 마음이 어디로 기우는지도 함께 들어봐요.
                </p>
              </div>
            </div>

            <div className={styles.resultCtas}>
              <button type="button" className={styles.resultCtaGhost} onClick={() => setCompared(false)}>
                다시 견주기
              </button>
              <button type="button" className={styles.resultCtaText} onClick={onBack}>
                나침반으로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
