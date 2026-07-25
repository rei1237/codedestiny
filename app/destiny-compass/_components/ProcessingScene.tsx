"use client";
/**
 * STEP 2~3 — 운명의 안개 + 여섯 별을 잇는 여정(JOURNEY). 맵이 안개로 덮인 위에 수정구(은하) +
 * 6엔진 카드가 순차 점등한다. 실제 computeDirectionField는 세션이 병렬 실행(이 씬은 결정론 연출).
 * 배선(registry) 엔진은 별이 켜지고, 미배선(곧 합류)은 흐리게 — 은폐하지 않는다.
 */
import { PigFace } from "./PigFace";
import { EngineGlyph, type EngineKey } from "./EngineGlyph";
import { ADAPTERS } from "../_engine/adapters/registry";
import { YEONI_VOYAGE_LINE } from "../_stage/mapDialogue";
import styles from "./map.module.css";

// 배선된 시스템(현재 registry). 어댑터를 추가하면 자동으로 별이 켜진다.
const WIRED = new Set(ADAPTERS.map((a) => a.system as string));

// 6엔진 표시 순서(사주·자미 선점 → 나머지). astrology는 SystemKey 밖(표시 전용).
const ENGINES: Array<{ key: EngineKey; name: string; wired: string; wait: string }> = [
  { key: "saju", name: "사주", wired: "saju", wait: "명식을 읽는 중" },
  { key: "ziwei", name: "자미두수", wired: "ziwei", wait: "12궁을 펼치는 중" },
  { key: "vedic", name: "베다", wired: "vedic", wait: "다샤를 정렬하는 중" },
  { key: "sukuyo", name: "숙요", wired: "sukuyo", wait: "본명숙을 잇는 중" },
  { key: "tarot", name: "타로", wired: "tarot", wait: "카드를 펼치는 중" },
  { key: "astrology", name: "점성술", wired: "__none__", wait: "행성을 정렬하는 중" },
];

export function ProcessingScene() {
  return (
    <div className={styles.processing}>
      <div className={styles.processTitle}>여섯 별을 이어, 운명을 읽는 중…</div>
      <p className={styles.processNarration}>
        <b>꽃돼지</b> &ldquo;{YEONI_VOYAGE_LINE}&rdquo;
      </p>

      <div className={styles.crystalWrap}>
        <svg className={styles.crystalSvg} viewBox="0 0 120 130" aria-hidden="true">
          <defs>
            <radialGradient id="cd-orb" cx="40%" cy="34%" r="72%">
              <stop offset="0%" stopColor="rgba(255,255,255,.55)" />
              <stop offset="32%" stopColor="rgba(167,139,250,.34)" />
              <stop offset="100%" stopColor="rgba(16,10,44,.92)" />
            </radialGradient>
            <radialGradient id="cd-neb" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#f5a8ff" />
              <stop offset="46%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="cd-stand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0d99f" />
              <stop offset="100%" stopColor="#9a7a34" />
            </linearGradient>
            <clipPath id="cd-ball">
              <circle cx="60" cy="56" r="44" />
            </clipPath>
          </defs>

          <circle cx="60" cy="56" r="44" fill="rgba(10,8,30,.92)" />
          <g clipPath="url(#cd-ball)">
            <g className={styles.crystalGalaxy}>
              <ellipse cx="60" cy="56" rx="42" ry="16" fill="url(#cd-neb)" opacity="0.72" transform="rotate(22 60 56)" />
              <ellipse cx="60" cy="56" rx="32" ry="11" fill="url(#cd-neb)" opacity="0.5" transform="rotate(-20 60 56)" />
              <circle cx="46" cy="46" r="1.3" fill="#fff" />
              <circle cx="74" cy="50" r="1" fill="#fff" />
              <circle cx="66" cy="70" r="1.2" fill="#ffe9a8" />
              <circle cx="52" cy="64" r="0.9" fill="#fff" />
              <circle cx="60" cy="56" r="3" fill="#fff2c6" />
            </g>
          </g>
          <circle cx="60" cy="56" r="44" fill="url(#cd-orb)" />
          <ellipse cx="47" cy="41" rx="11" ry="5.5" fill="rgba(255,255,255,.4)" />
          <circle cx="60" cy="56" r="44" fill="none" stroke="rgba(232,213,163,.55)" strokeWidth="1.5" />
          <path d="M42,98 L78,98 L71,110 L49,110 Z" fill="url(#cd-stand)" />
          <rect x="46" y="110" width="28" height="6" rx="3" fill="url(#cd-stand)" />
        </svg>
        <div className={styles.crystalPig}>
          <PigFace expression="think" height={70} />
        </div>
      </div>

      <div className={styles.engineRow}>
        {ENGINES.map((e, i) => {
          const lit = WIRED.has(e.wired);
          return (
            <div
              key={e.key}
              className={`${styles.engineCard} ${lit ? styles.engineCardLit : styles.engineCardDim}`}
              style={{ ["--i" as string]: i }}
            >
              <span className={styles.engineGlyph} aria-hidden="true">
                <EngineGlyph engine={e.key} size={26} />
                {lit && <span className={styles.engineSpark} aria-hidden="true" />}
              </span>
              <span className={styles.engineName}>{e.name}</span>
              <span className={styles.engineWait}>{lit ? `${e.wait}…` : "곧 합류"}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.processBar} aria-hidden="true">
        <i />
      </div>
    </div>
  );
}
