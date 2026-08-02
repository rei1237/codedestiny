"use client";
/**
 * 운명의 나침반 첫 화면.
 * 사용자가 먼저 방향을 만져 본 뒤, 실제 계산 입력으로 자연스럽게 들어가도록 만든다.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Starfield } from "./Starfield";
import { ConstellationMark } from "./ConstellationMark";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
import type { DirectionKey } from "../_engine/types";
import { COMPASS_ORDER } from "../_stage/expressionMap";
import { checkInToday, readCollectibles, readRpgSnapshot, type RpgSnapshot } from "../_lib/rpg-bridge";
import hub from "./JourneyHub.module.css";

const STEP_DEG = 360 / COMPASS_ORDER.length;

function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360;
}

function keyFromAngle(angle: number): DirectionKey {
  const index = Math.round(normalizeAngle(angle) / STEP_DEG) % COMPASS_ORDER.length;
  return COMPASS_ORDER[index];
}

function bearingForIndex(index: number): number {
  return index * STEP_DEG;
}

function shortLabel(key: DirectionKey): string {
  return DIRECTION_LABEL_KO[key].split("·")[0];
}

function CompassNeedleIcon() {
  return (
    <svg className={hub.ctaIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path d="M12 2.7l3 9.3-3 9.3-3-9.3z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="#0b0f1d" />
    </svg>
  );
}

function InteractiveCompass({
  selected,
  angle,
  settling,
  onSelect,
}: {
  selected: DirectionKey;
  angle: number;
  settling: boolean;
  onSelect: (key: DirectionKey, angle: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const directions = useMemo(
    () => COMPASS_ORDER.map((key, index) => ({ key, label: shortLabel(key), angle: bearingForIndex(index) })),
    [],
  );

  const selectFromPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nextAngle = normalizeAngle((Math.atan2(event.clientX - cx, cy - event.clientY) * 180) / Math.PI);
    const nextKey = keyFromAngle(nextAngle);
    onSelect(nextKey, nextAngle);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    selectFromPoint(event);
  };

  return (
    <div
      ref={dialRef}
      className={hub.dial}
      data-settling={settling || undefined}
      style={{ "--bearing": `${angle}deg` } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) selectFromPoint(event);
      }}
      role="group"
      aria-label={`선택된 나침반 방향: ${DIRECTION_LABEL_KO[selected]}`}
    >
      <div className={hub.dialHalo} aria-hidden="true" />
      <svg className={hub.rose} viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <radialGradient id="entryCompassFace" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#202849" />
            <stop offset="58%" stopColor="#11182f" />
            <stop offset="100%" stopColor="#080c19" />
          </radialGradient>
          <linearGradient id="entryCompassGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff3c6" />
            <stop offset="48%" stopColor="#e8d5a3" />
            <stop offset="100%" stopColor="#a47f35" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="111" fill="rgba(6,10,22,.82)" stroke="url(#entryCompassGold)" strokeWidth="2.5" />
        <circle cx="120" cy="120" r="94" fill="url(#entryCompassFace)" stroke="rgba(232,213,163,.35)" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="75" fill="none" stroke="rgba(196,181,253,.18)" strokeWidth="1" strokeDasharray="2 8" />
        <path
          d="M120 20l9 74 74 26-74 26-9 74-9-74-74-26 74-26z"
          fill="rgba(232,213,163,.26)"
          stroke="rgba(232,213,163,.46)"
          strokeWidth="1"
        />
        <path
          className={hub.needleShape}
          d="M120 31l10 89-10 89-10-89z"
          fill="url(#entryCompassGold)"
          stroke="rgba(255,248,225,.55)"
          strokeWidth="1"
        />
        <circle cx="120" cy="120" r="10" fill="#080c19" stroke="url(#entryCompassGold)" strokeWidth="3" />
      </svg>

      {directions.map((direction) => (
        <button
          key={direction.key}
          type="button"
          className={hub.direction}
          data-active={direction.key === selected || undefined}
          style={{ "--point": `${direction.angle}deg` } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(direction.key, direction.angle);
          }}
          aria-pressed={direction.key === selected}
        >
          {direction.label}
        </button>
      ))}
    </div>
  );
}

export function JourneyHub({ onStart }: { onStart: () => void }) {
  const [snap, setSnap] = useState<RpgSnapshot | null>(null);
  const [dexCount, setDexCount] = useState(0);
  const [selected, setSelected] = useState<DirectionKey>("venture");
  const [angle, setAngle] = useState(bearingForIndex(COMPASS_ORDER.indexOf("venture")));
  const [pulse, setPulse] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    checkInToday();
    const id = window.setTimeout(() => setSnap(readRpgSnapshot()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let alive = true;
    readCollectibles().then((items) => {
      if (alive) setDexCount(items.length);
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectDirection = (key: DirectionKey, nextAngle: number) => {
    setSelected((prev) => {
      if (prev !== key) {
        setPulse(false);
        window.setTimeout(() => setPulse(true), 0);
        navigator.vibrate?.(12);
      }
      return key;
    });
    setAngle(nextAngle);
  };

  const begin = () => {
    if (starting) return;
    setStarting(true);
    navigator.vibrate?.(18);
    window.setTimeout(onStart, 520);
  };

  const greeting = useMemo(() => {
    const streak = snap?.streakDays ?? 0;
    if (streak >= 7) return `${streak}일째 이어진 흐름이 있어요. 오늘은 방향을 조금 더 선명하게 잡아볼게요.`;
    if (streak >= 2) return `${streak}일 연속으로 나침반을 열었어요. 오늘의 바늘도 함께 맞춰봐요.`;
    return "지금 당신의 방향은 어디를 향하고 있을까요?";
  }, [snap]);

  return (
    <main className={hub.stage}>
      <Starfield />
      <section className={hub.hero} aria-labelledby="destiny-compass-title">
        <div className={hub.copy}>
          <span className={hub.kicker}>Destiny Compass</span>
          <h1 id="destiny-compass-title" className={hub.title}>운명의 나침반</h1>
          <p className={hub.sub}>{greeting}</p>
          <p className={hub.microcopy}>
            바늘을 움직여 마음이 먼저 향하는 쪽을 골라보세요. 실제 결과는 생년 정보와 오늘의 질문을 함께 읽어 다시 계산합니다.
          </p>
        </div>

        <InteractiveCompass selected={selected} angle={angle} settling={starting} onSelect={selectDirection} />

        <div className={hub.reading} data-pulse={pulse || undefined} aria-live="polite">
          <span className={hub.readingMark} aria-hidden="true">
            <ConstellationMark variant={2} size={18} />
          </span>
          <span className={hub.readingLabel}>지금 바늘</span>
          <strong>{DIRECTION_LABEL_KO[selected]}</strong>
        </div>

        {(snap || dexCount > 0) && (
          <div className={hub.statusLine} aria-label="운명 여정 상태">
            {snap && <span>Lv.{snap.currentLevel}</span>}
            {snap?.streakDays ? <span>{snap.streakDays}일 연속</span> : null}
            {dexCount > 0 && <span>도감 {dexCount}장</span>}
          </div>
        )}

        <button type="button" className={hub.cta} onClick={begin} disabled={starting}>
          <CompassNeedleIcon />
          <span>{starting ? "운명을 읽는 중..." : "운명 탐색 시작"}</span>
        </button>
      </section>
    </main>
  );
}
