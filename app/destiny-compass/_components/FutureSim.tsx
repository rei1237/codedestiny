"use client";
/**
 * STEP 8 미래 시뮬레이션 — 지도 경로 위 시점 마커(현재/30일/90일/1년)를 눌러 구간 이야기를 본다.
 * DirectionField.timeline(이미 계산된 결정론 데이터) 읽기 전용. 무료(항로 STEP11 유료와 분리). 추가 계산 없음.
 */
import { useState } from "react";
import { Starfield } from "./Starfield";
import { SpriteImage } from "./SpriteImage";
import { compassAssets } from "../data/assets";
import styles from "./map.module.css";
import type { DirectionField, TimelineKey, Weather } from "../_engine/types";

const WEATHER: Record<Weather, { label: string; head: string; tone: string }> = {
  clear: { label: "맑음", head: "순풍에 돛 단 듯, 크게 나아가도 좋은 때예요.", tone: "clear" },
  breeze: { label: "순풍", head: "잔잔한 순풍이에요. 꾸준히 저어가면 닿아요.", tone: "breeze" },
  fog: { label: "안개", head: "안개 구간이에요. 속도를 줄이고 방향만 지켜요.", tone: "fog" },
  storm: { label: "높은 물결", head: "물결이 높아요. 무리한 항해보다 잠시 정박이 현명해요.", tone: "storm" },
};

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

export function FutureSim({ field, onBack }: { field: DirectionField; onBack: () => void }) {
  // 현재(=대표 방향 기운) + 30/90/1년(timeline). 지도 경로 위 좌표(%)로 배치.
  const nowM = field.primary.score;
  const T = (k: TimelineKey) => field.timeline[k];
  const stops: Stop[] = [
    { key: "now", label: "현재", x: 10, y: 72, momentum: nowM, weather: weatherOf(nowM) },
    { key: "d30", label: "30일", x: 36, y: 52, momentum: T("d30").momentum, weather: T("d30").weather },
    { key: "d90", label: "90일", x: 62, y: 60, momentum: T("d90").momentum, weather: T("d90").weather },
    { key: "y1", label: "1년", x: 88, y: 30, momentum: T("y1").momentum, weather: T("y1").weather },
  ];
  const [sel, setSel] = useState<string>("now");
  const active = stops.find((s) => s.key === sel) ?? stops[0];
  const w = WEATHER[active.weather];

  // 경로 폴리라인 좌표(viewBox 100×100)
  const poly = stops.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className={styles.resultStage}>
      <Starfield />
      <header className={styles.mapHeader}>
        <span className={styles.mapKicker}>The Future Voyage</span>
        <h1 className={styles.mapTitle}>미래 시뮬레이션</h1>
      </header>

      <div className={styles.resultBody}>
        <div className={styles.resultSpeak}>
          <SpriteImage
            src={compassAssets.yeoni.intro}
            alt="항로를 짚어주는 연이"
            width={64}
            height={88}
            className={styles.speakYeoni}
            style={{ height: "auto" }}
          />
          <div className={styles.resultBubble}>
            <div className={styles.resultWho}>연이</div>
            <p>시점을 눌러보세요. 지도 위 각 지점에서 운명의 바다가 어떻게 바뀌는지 보여드릴게요.</p>
          </div>
        </div>

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
              data-tone={WEATHER[s.weather].tone}
              onClick={() => setSel(s.key)}
              aria-pressed={sel === s.key}
              aria-label={`${s.label} · ${WEATHER[s.weather].label} · 순항도 ${s.momentum}`}
            >
              <span className={styles.simStar} aria-hidden="true" />
              <span className={styles.simStopLabel}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* 선택 시점 스토리 */}
        <div className={styles.simStory} data-tone={w.tone}>
          <div className={styles.simStoryTop}>
            <span className={styles.simStoryPeriod}>{active.label}</span>
            <span className={styles.simStoryWeather}>{w.label} · 순항도 {active.momentum}</span>
          </div>
          <span className={styles.voyageBar}>
            <i style={{ transform: `scaleX(${active.momentum / 100})` }} />
          </span>
          <p className={styles.simStoryHead}>{w.head}</p>
        </div>

        <div className={styles.resultCtas}>
          <button type="button" className={styles.resultCtaGhost} onClick={onBack}>
            ← 나침반으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
