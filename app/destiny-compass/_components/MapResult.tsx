"use client";
/**
 * RPG 리딩 결과 — 스크롤 서사(12스텝 편입). 다크 코스믹.
 * ① 나침반 히어로(6시스템) ② 운의 흐름 ③ 운명의 레이더+행운 ④ 시스템 대조
 * ⑤ 꽃돼지 해설 ⑥ 심화 프리뷰(갈림길/미래시뮬/항로 — 유료는 잠금) → 오늘의 한 걸음.
 * Layer 2 스코어 읽기 전용 소비. 기존 CompassDial/DestinyRadar/PigFace 재사용.
 */
import { useEffect, useState } from "react";
import { CompassDial } from "./CompassDial";
import { DestinyRadar } from "./DestinyRadar";
import { PigFace } from "./PigFace";
import { Starfield } from "./Starfield";
import { PaintedBackdrop } from "./PaintedBackdrop";
import { compassPaintings } from "../data/assets";
import { DIRECTION_TO_REGION, regionByKey } from "./mapRegions";
import { useFxTier } from "../_hooks/useFxTier";
import styles from "./map.module.css";
import type { DirectionField, DirectionKey, SystemKey } from "../_engine/types";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
import { confidenceStars, pigExpression } from "../_stage/expressionMap";
import { buildNarrationInput, hashStr } from "../_stage/narration";
import { collectItem } from "../_lib/rpg-bridge";

interface MapResultProps {
  field: DirectionField;
  situation?: string;
  onNext: () => void;
  onRestart: () => void;
  onCrossroad: () => void;
  onFutureSim: () => void;
  onVoyage: () => void;
}

const SYS_LABEL: Record<SystemKey, string> = {
  saju: "사주",
  ziwei: "자미두수",
  tarot: "타로",
  vedic: "베다",
  sukuyo: "숙요",
};
// 표시 전용 6번째(SystemKey 밖) — 잠금으로만 노출
const ALL_SYSTEMS: { key: string; label: string }[] = [
  { key: "saju", label: "사주" },
  { key: "ziwei", label: "자미두수" },
  { key: "vedic", label: "베다" },
  { key: "sukuyo", label: "숙요" },
  { key: "tarot", label: "타로" },
  { key: "astrology", label: "점성술" },
];

type Trend = "up" | "down" | "flat";
function trendOf(score: number): Trend {
  return score >= 66 ? "up" : score <= 40 ? "down" : "flat";
}
const TREND_ICON: Record<Trend, string> = { up: "↑", down: "↓", flat: "→" };
const short = (k: DirectionKey) => DIRECTION_LABEL_KO[k].split("·")[0];

// 결정론 변주 선택(난수 금지) — 같은 시드 → 같은 문장.
function variantIdx(seed: string, n: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return (h >>> 0) % n;
}
// 꽃돼지 규칙 템플릿(AI 폴백 겸 AI 리프레이즈 원문) — 밴드별 3변주, 대표/쉬어갈 영역 이름 보존.
function pigCommentary(field: DirectionField): string {
  const dir = short(field.primary.key);
  const blocked = short(field.blockedArea.key);
  const v = variantIdx(field.seed, 3);
  if (field.primary.band === "strong") {
    return [
      `지금은 '${dir}' 쪽으로 길이 활짝 열려 있어요. 크게 밀어붙이기보다, 이번 주에 딱 한 걸음만 가볍게 내디뎌 봐요.`,
      `'${dir}'의 문이 지금 활짝 열려 있어요. 준비해온 걸 믿고, 오늘 작은 시작 하나만 만들어 보세요.`,
      `'${dir}' 쪽 바람이 순하게 불어와요. 조급함은 잠시 내려놓고, 지금 할 수 있는 한 가지부터 손대면 그 흐름을 탈 수 있어요.`,
    ][v];
  }
  if (field.primary.band === "caution") {
    return [
      `'${blocked}' 쪽은 잠시 안개가 짙어요. 대신 '${dir}' 쪽으로 향하는 작은 시도 하나가 흐름을 살며시 바꿔줄 거예요.`,
      `지금 '${blocked}'는 잠깐 쉬어가도 괜찮아요. 그 대신 '${dir}' 쪽으로 가벼운 한 걸음을 내디뎌 보면, 마음이 한결 편해질 거예요.`,
      `'${blocked}' 쪽 안개는 곧 걷혀요. 무리하지 말고, 오늘은 '${dir}' 쪽으로 향하는 작은 일 하나에만 마음을 실어 봐요.`,
    ][v];
  }
  return [
    `'${dir}' 쪽 길이 은은하게 빛나고 있어요. 서두르지 말고, 마음이 가는 한 가지부터 시작해요.`,
    `'${dir}'는 지금 천천히 데워지는 중이에요. 조바심 대신, 오늘 할 수 있는 작은 한 걸음에 마음을 실어보세요.`,
    `'${dir}' 쪽으로 은은한 빛이 나 있어요. 크게 바꾸려 하기보다, 매일 조금씩 방향만 지켜가도 충분해요.`,
  ][v];
}

// 시스템별 상위 기여 방향 2개(field.raw 읽기 전용)
function topContributions(field: DirectionField, sys: SystemKey): DirectionKey[] {
  const c = field.raw?.[sys];
  if (!c) return [];
  return (Object.entries(c.directions) as [DirectionKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}
// 시스템별 근거 원용어(첫 항목)
function evidenceTerm(field: DirectionField, sys: SystemKey): string | null {
  return field.raw?.[sys]?.evidence?.[0]?.term ?? null;
}

export function MapResult({ field, situation, onNext, onRestart, onCrossroad, onFutureSim, onVoyage }: MapResultProps) {
  const dest = regionByKey(DIRECTION_TO_REGION[field.primary.key]);
  const fxTier = useFxTier();

  // 오늘의 타로 카드를 운명 도감에 수집(멱등·계정 단위). 결과를 열람하면 그날의 카드가 모인다.
  useEffect(() => {
    const term = field.raw?.tarot?.evidence?.[0]?.term;
    if (term) void collectItem(`tarot:${term.split("(")[0]}`);
  }, [field]);
  const primaryLabel = DIRECTION_LABEL_KO[field.primary.key];
  const stars = confidenceStars(field.confidence);
  const top = [...field.directions].slice(0, 6);
  const activeSystems = new Set<string>(field.sources);

  // 꽃돼지 해설 — 규칙 템플릿을 먼저 표시(항상 노출), AI가 그 템플릿을 따뜻하게 다듬으면 교체(실패 시 템플릿 유지).
  const baseText = pigCommentary(field);
  const [comment, setComment] = useState(baseText);
  useEffect(() => {
    setComment(baseText);
    let cancelled = false;
    const key = `cd-narrate:${field.seed}:${hashStr(situation || "")}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setComment(cached);
        return;
      }
    } catch {
      /* storage 불가 시 네트워크로 */
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 32000);
    fetch("/api/destiny-compass/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narration: buildNarrationInput(field, situation || ""), baseText }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const t = typeof d?.pigCommentary === "string" ? d.pigCommentary.trim() : "";
        // 정확성+안전 가드: 실제 대표/열린 방향 라벨(short — 라우트와 동일 기준)을 언급하고, 위험 소재가 없을 때만 채택.
        const mentionsLabel = t.includes(short(field.primary.key)) || t.includes(short(field.strongArea.key));
        const risky = /소송|고소|진단|처방|투약|매수|매도|주식|코인|확실히 (오|올)|반드시 (오|올)/.test(t);
        const faithful = t.length >= 12 && mentionsLabel && !risky;
        if (d?.ok && faithful) {
          setComment(t);
          try {
            sessionStorage.setItem(key, t);
          } catch {
            /* 무시 */
          }
        }
      })
      .catch(() => {
        /* 실패 → 템플릿 유지 */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [field, situation]);

  return (
    <div className={styles.resultStage} data-fx={fxTier}>
      {/* 몰입 배경 = 코스믹 그라디언트 + 별밭(깔끔). 페인팅은 섹션별로만 얹어 본문과 충돌 방지. */}
      <Starfield />

      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>운명의 길이 열렸어요</span>
        <h1 className={styles.mapTitle}>{dest?.label ?? primaryLabel}로 가는 길</h1>
        {situation ? <p className={styles.resultQuestion}>&ldquo;{situation}&rdquo;</p> : null}
      </header>

      <div className={styles.resultBody}>
        {/* ① 나침반 히어로 + 6시스템 — 자미두수 세계(소설 씬) 페인팅 위 */}
        <div className={`${styles.resultTop} ${styles.sceneSection}`}>
          <PaintedBackdrop src={compassPaintings.ziwei1} veil={0.82} position="center 35%" />
          <div className={styles.resultCompassWrap}>
            <CompassDial mode="result" directions={field.directions} primary={field.primary.key} />
          </div>
          <div className={styles.resultSide}>
            <span className={styles.resultSideLabel}>종합 방향</span>
            <div className={styles.resultDir}>{primaryLabel}</div>
            <div className={styles.resultStars} aria-label={`방향 일치도 별 ${stars}개 · 신뢰도 ${Math.round(field.confidence * 100)}%`}>
              <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
              <span className={styles.resultConf}>신뢰도 {Math.round(field.confidence * 100)}%</span>
            </div>
            <div className={styles.resultPills}>
              <span className={styles.resultPill}>강한 영역 <b>{short(field.strongArea.key)}</b></span>
              <span className={styles.resultPill}>쉬어갈 영역 <b>{short(field.blockedArea.key)}</b></span>
            </div>
            <div className={styles.sysHint} aria-label="종합에 참여한 운세 시스템">
              {ALL_SYSTEMS.map((sys) => (
                <span key={sys.key} className={`${styles.sysChip} ${activeSystems.has(sys.key) ? styles.sysChipOn : ""}`}>
                  {sys.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ② 운의 흐름 */}
        <div className={styles.flowSection}>
          <span className={styles.flowLabel}>운의 흐름</span>
          <div className={styles.flowCards}>
            {top.map((d) => {
              const t = trendOf(d.score);
              return (
                <div key={d.key} className={styles.flowCard} data-trend={t}>
                  <span className={styles.flowName}>{short(d.key)}</span>
                  <span className={styles.flowVal}>
                    {d.score}
                    <i className={styles.flowTrend} aria-hidden="true">{TREND_ICON[t]}</i>
                  </span>
                  <span className={styles.flowBar}>
                    <i className={styles.flowBarFill} style={{ transform: `scaleX(${d.score / 100})` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ③ 운명의 레이더 + 행운 (STEP10) */}
        <div className={`${styles.flowSection} ${styles.sceneSection}`}>
          <PaintedBackdrop src={compassPaintings.ziwei2} veil={0.82} position="center" />
          <span className={styles.flowLabel}>운명의 레이더</span>
          <div className={styles.radarBlock}>
            <div className={styles.radarSweepWrap}>
              <DestinyRadar directions={field.directions} />
              <span className={styles.radarSweep} aria-hidden="true" />
            </div>
            <div className={styles.luckyGrid} aria-label="오늘의 행운">
              <span className={styles.luckyPill}>행운의 장소 <b>{field.lucky.luckyPlaceKey}</b></span>
              <span className={styles.luckyPill}>행운의 시간 <b>{field.lucky.luckyTimeKey}</b></span>
              <span className={styles.luckyPill}>행운의 색 <b>{field.lucky.luckyColorKey}</b></span>
              <span className={styles.luckyPill}>행운의 사람 <b>{field.lucky.luckyPersonKey}</b></span>
            </div>
          </div>
        </div>

        {/* ④ 시스템 대조 */}
        <div className={styles.flowSection}>
          <span className={styles.flowLabel}>시스템 대조</span>
          <div className={styles.sysGrid}>
            {ALL_SYSTEMS.map((sys) => {
              const on = activeSystems.has(sys.key);
              const contribs = on ? topContributions(field, sys.key as SystemKey) : [];
              const term = on ? evidenceTerm(field, sys.key as SystemKey) : null;
              return (
                <div key={sys.key} className={`${styles.sysCard} ${on ? "" : styles.sysCardLocked}`}>
                  <span className={styles.sysCardName}>{sys.label}</span>
                  {on ? (
                    <>
                      <span className={styles.sysCardBody}>
                        {contribs.length ? contribs.map((k) => short(k)).join(" · ") : "고르게 분포"}
                      </span>
                      {term && <span className={styles.sysCardTerm}>{term}</span>}
                    </>
                  ) : (
                    <span className={styles.sysCardLockText}>곧 합류</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ⑤ 꽃돼지 해설 — 붉은 실(인연) 페인팅 위 따뜻한 상담 장면 */}
        <div className={`${styles.resultSpeak} ${styles.sceneSection}`}>
          <PaintedBackdrop src={compassPaintings.redThread} veil={0.8} position="center 40%" />
          <PigFace expression={pigExpression(field.primary.band, "hopeful")} height={78} className={styles.speakPigDark} />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>꽃돼지</div>
            <p>{comment}</p>
          </div>
        </div>

        {/* ⑥ 심화 프리뷰 — 갈림길(7)·미래시뮬(8)·항로(11) */}
        <div className={styles.flowSection}>
          <span className={styles.flowLabel}>더 깊이 보기</span>
          <div className={styles.previewGrid}>
            <button type="button" className={styles.previewCard} onClick={onFutureSim}>
              <span className={styles.previewIcon} aria-hidden="true">🧭</span>
              <span className={styles.previewName}>미래 시뮬레이션</span>
              <span className={styles.previewDesc}>지도 위 30일·90일·1년, 시점을 눌러 이야기 보기</span>
              <span className={styles.previewGo}>펼치기 →</span>
            </button>
            <button type="button" className={`${styles.previewCard} ${styles.previewLocked}`} onClick={onCrossroad}>
              <span className={styles.previewLockBadge} aria-hidden="true">잠금</span>
              <span className={styles.previewIcon} aria-hidden="true">⚖️</span>
              <span className={styles.previewName}>운명의 갈림길</span>
              <span className={styles.previewDesc}>두 선택의 기운을 나란히 견주기</span>
              <span className={styles.previewGo}>열어보기 →</span>
            </button>
            <button type="button" className={`${styles.previewCard} ${styles.previewLocked}`} onClick={onVoyage}>
              <span className={styles.previewLockBadge} aria-hidden="true">잠금</span>
              <span className={styles.previewIcon} aria-hidden="true">⛵</span>
              <span className={styles.previewName}>삶의 항로</span>
              <span className={styles.previewDesc}>날씨로 읽는 앞으로의 항해 지도</span>
              <span className={styles.previewGo}>열어보기 →</span>
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className={styles.resultCtas}>
          <button type="button" className={styles.resultCta} onClick={onNext}>
            오늘의 한 걸음 →
          </button>
          <button type="button" className={styles.resultCtaText} onClick={onRestart}>
            지도로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
