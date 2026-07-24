"use client";
/**
 * 운명 여정 허브 — 여정의 정문(front door).
 * 연이(꽃돼지)가 맞이하고, 리텐션 스냅샷(레벨·연속출석)을 보여준 뒤 '오늘의 나침반'으로 안내한다.
 * 마운트 시 출석(checkin)을 리텐션 엔진에 기록한다(멱등: 하루 1회).
 * 스냅샷은 정적셸의 window.CDLevel이 있을 때만 표시(없으면 인사만 — 그레이스풀 폴백).
 *
 * 디자인: '따뜻한 밤하늘 스토리북'. 상단 일러스트 나침반(인라인 SVG) + 연이 메달리온이 맞이하는 코지 카드.
 * 공유 .birth* 클래스(BirthGate와 공유) 대신 허브 전용 JourneyHub.module.css로 격리한다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Starfield } from "./Starfield";
import { PigFace } from "./PigFace";
import { compassAssets } from "../data/assets";
import { checkInToday, readCollectibles, readRpgSnapshot, type RpgSnapshot } from "../_lib/rpg-bridge";
import hub from "./JourneyHub.module.css";

/** 상단 각인 나침반 — 골드 로즈 + 로즈 바늘. 순수 SVG, 느린 idle 흔들림(reduced-motion 시 정지). */
function CompassRose() {
  return (
    <svg className={hub.compass} viewBox="0 0 100 100" role="img" aria-label="운명의 나침반">
      <defs>
        <radialGradient id="hubGem" cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#fff6dd" />
          <stop offset="46%" stopColor="#e8d5a3" />
          <stop offset="100%" stopColor="#7c5ad2" />
        </radialGradient>
        <linearGradient id="hubStar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6dd" />
          <stop offset="100%" stopColor="#c9a54e" />
        </linearGradient>
      </defs>
      {/* 외곽 링 + 틱 링(점선) */}
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(232,213,163,.55)" strokeWidth="1.3" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(232,213,163,.26)" strokeWidth="1" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(232,213,163,.45)" strokeWidth="1.4" strokeDasharray="0.6 5.2" strokeLinecap="round" />
      {/* 보조(대각) 별점 — 짧게 */}
      <path
        d="M50 24 L54 46 L76 50 L54 54 L50 76 L46 54 L24 50 L46 46 Z"
        transform="rotate(45 50 50)"
        fill="rgba(232,213,163,.5)"
      />
      {/* 주(십자) 별점 — 길게 */}
      <path
        d="M50 8 L56 44 L92 50 L56 56 L50 92 L44 56 L8 50 L44 44 Z"
        fill="url(#hubStar)"
        stroke="rgba(255,246,221,.55)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* 나침반 바늘(움직이는 부분) */}
      <g className={hub.needle}>
        <path d="M50 19 L54.5 50 L45.5 50 Z" fill="#b31955" />
        <path d="M50 81 L54.5 50 L45.5 50 Z" fill="rgba(255,241,247,.94)" />
      </g>
      {/* 중심 보석 캡 */}
      <circle cx="50" cy="50" r="6.6" fill="url(#hubGem)" stroke="rgba(255,244,210,.85)" strokeWidth="1" />
    </svg>
  );
}

export function JourneyHub({ onStart }: { onStart: () => void }) {
  const [snap, setSnap] = useState<RpgSnapshot | null>(null);
  const [dexCount, setDexCount] = useState(0);

  useEffect(() => {
    checkInToday(); // 오늘 첫 진입 = 출석(멱등)
    // checkin이 로컬 스토어를 갱신한 직후를 읽도록 다음 틱에 스냅샷
    const id = window.setTimeout(() => setSnap(readRpgSnapshot()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // 운명 도감 수집 수(로그인 시). 실패·비로그인은 0으로 조용히 폴백.
  useEffect(() => {
    let alive = true;
    readCollectibles().then((items) => {
      if (alive) setDexCount(items.length);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 달빛 BGM(플래그십 앰비언트) — 네오 작전실 패턴 재사용. 자동재생은 브라우저 정책상 제스처 필요.
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [bgmOn, setBgmOn] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("cd-journey-bgm-v1") === "1") setBgmOn(true);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const el = bgmRef.current;
    if (!el) return;
    if (bgmOn) {
      el.volume = 0.26;
      void el.play().catch(() => {}); // 자동재생 차단 시 조용히 무시 — 사용자가 토글로 재시도
    } else {
      el.pause();
    }
  }, [bgmOn]);

  const toggleBgm = () => {
    setBgmOn((v) => {
      const next = !v;
      try {
        localStorage.setItem("cd-journey-bgm-v1", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const greeting = useMemo(() => {
    const streak = snap?.streakDays ?? 0;
    if (streak >= 7) return `이 여정, 벌써 ${streak}일째예요. 오늘도 한 걸음 함께해요.`;
    if (streak >= 2) return `${streak}일 연속이에요. 오늘의 방향도 같이 찾아봐요.`;
    return "오늘도 왔네요. 여기서 오늘의 방향과 한 걸음을 찾아요.";
  }, [snap]);

  const showBadge = !!snap && (snap.loggedIn || snap.currentLevel > 1 || snap.streakDays > 0);

  return (
    <div className={hub.stage}>
      <Starfield />
      <audio ref={bgmRef} src={compassAssets.bgm.warroom} loop preload="none" className={hub.bgmAudio} />
      <button
        type="button"
        className={hub.bgmToggle}
        onClick={toggleBgm}
        aria-label={bgmOn ? "달빛 BGM 끄기" : "달빛 BGM 켜기"}
        aria-pressed={bgmOn}
      >
        {bgmOn ? "⏸ 달빛 BGM" : "▶ 달빛 BGM"}
      </button>

      <div className={hub.panel}>
        <CompassRose />
        <span className={hub.kicker}>The Journey</span>
        <h1 className={hub.title}>운명 여정</h1>

        <div className={hub.mascot}>
          <PigFace expression="happy" height={92} className={hub.mascotFace} />
        </div>

        {showBadge && (
          <div className={hub.badge}>
            <span aria-hidden="true">✦</span> Lv.{snap!.currentLevel}
            {snap!.streakDays > 0 ? ` · 🔥 ${snap!.streakDays}일 연속` : ""}
          </div>
        )}

        <p className={hub.sub}>{greeting}</p>
        {dexCount > 0 && (
          <p className={hub.dex}>
            <span aria-hidden="true">✦</span> 운명 도감에 카드 {dexCount}장을 모았어요.
          </p>
        )}

        <button type="button" className={hub.cta} onClick={onStart}>
          오늘의 나침반 <span className={hub.arrow} aria-hidden="true">→</span>
        </button>
        <a className={hub.storyLink} href="/stories">
          연이와 네오의 이야기 읽기 <span className={hub.arrow} aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
