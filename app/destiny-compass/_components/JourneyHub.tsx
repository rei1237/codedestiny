"use client";
/**
 * 운명 여정 허브 — 여정의 정문(front door).
 * 연이(꽃돼지)가 맞이하고, 리텐션 스냅샷(레벨·연속출석)을 보여준 뒤 '오늘의 나침반'으로 안내한다.
 * 마운트 시 출석(checkin)을 리텐션 엔진에 기록한다(멱등: 하루 1회).
 * 스냅샷은 정적셸의 window.CDLevel이 있을 때만 표시(없으면 인사만 — 그레이스풀 폴백).
 */
import { useEffect, useMemo, useState } from "react";
import { Starfield } from "./Starfield";
import { SpriteImage } from "./SpriteImage";
import { compassAssets } from "../data/assets";
import { checkInToday, readCollectibles, readRpgSnapshot, type RpgSnapshot } from "../_lib/rpg-bridge";
import map from "./map.module.css";

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

  const greeting = useMemo(() => {
    const streak = snap?.streakDays ?? 0;
    if (streak >= 7) return `이 여정, 벌써 ${streak}일째예요. 오늘도 한 걸음 함께해요.`;
    if (streak >= 2) return `${streak}일 연속이에요. 오늘의 방향도 같이 찾아봐요.`;
    return "오늘도 왔네요. 여기서 오늘의 방향과 한 걸음을 찾아요.";
  }, [snap]);

  const showBadge = !!snap && (snap.loggedIn || snap.currentLevel > 1 || snap.streakDays > 0);

  return (
    <div className={map.birthStage}>
      <Starfield />
      <div className={map.birthPanel}>
        <SpriteImage
          src={compassAssets.pig.happy}
          alt="연이"
          width={116}
          height={116}
          style={{ height: "auto", margin: "0 auto" }}
        />
        <span className={map.birthKicker}>The Journey</span>
        <h1 className={map.birthTitle}>운명 여정</h1>
        {showBadge && (
          <div className={map.birthLevelBadge}>
            <span aria-hidden="true">✦</span> Lv.{snap!.currentLevel}
            {snap!.streakDays > 0 ? ` · 🔥 ${snap!.streakDays}일 연속` : ""}
          </div>
        )}
        <p className={map.birthSub}>{greeting}</p>
        {dexCount > 0 && (
          <p className={map.birthSub}>운명 도감에 카드 {dexCount}장을 모았어요.</p>
        )}
        <button type="button" className={map.birthCta} onClick={onStart}>
          오늘의 나침반 →
        </button>
        <a className={map.birthPrefillLink} href="/stories">연이와 네오의 이야기 읽기 →</a>
      </div>
    </div>
  );
}
