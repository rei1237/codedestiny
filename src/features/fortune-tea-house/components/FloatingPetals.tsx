"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import appContext from "@/js/core/app-context.js";
import styles from "../styles/fortune-tea-house.module.css";

const petals = [
  { left: "8%", delay: "0s", duration: "16s", scale: 0.78 },
  { left: "18%", delay: "2.2s", duration: "19s", scale: 0.94 },
  { left: "31%", delay: "5.1s", duration: "17s", scale: 0.72 },
  { left: "46%", delay: "1.4s", duration: "21s", scale: 1 },
  { left: "62%", delay: "3.7s", duration: "18s", scale: 0.82 },
  { left: "74%", delay: "6.3s", duration: "20s", scale: 0.9 },
  { left: "88%", delay: "4.5s", duration: "17s", scale: 0.76 },
];

/** 저사양 기기와 앱에서 남길 꽃잎 수. 나머지 기기는 7장 그대로다. */
const LOW_END_PETAL_COUNT = 3;

type LowEndNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

/**
 * 꽃잎은 찻집 전 화면에 깔리는 전체화면 고정 레이어라 저사양 기기에서 비용이 가장 큰 연출이다 —
 * 실측 2026-08-30 (CPU 6배·Slow4G·3회, 프롤로그): 꽃잎만 빼면 RecalcStyle 1305ms → 561ms(-57%),
 * 메인스레드 5468ms → 4481ms. 그래서 저사양·앱에서만 장수를 줄이고 고사양·웹은 건드리지 않는다.
 * 🔴 첫 렌더는 서버와 같은 7장이어야 한다 — 마운트 뒤에 줄여야 하이드레이션이 어긋나지 않는다.
 */
function useLowEndPetalLimit() {
  const [limit, setLimit] = useState(petals.length);

  useEffect(() => {
    const nav = window.navigator as LowEndNavigator;
    const memory = Number(nav.deviceMemory || 0);
    const cores = Number(nav.hardwareConcurrency || 0);
    const effectiveType = String(nav.connection?.effectiveType || "").toLowerCase();
    // 🔴 `!!window.Capacitor` 단독 판정은 과대판정으로 영구 배제된 패턴 — 정본 위임(js/core/app-context.js).
    const isApp = appContext.isApp();
    const isLowEnd =
      Boolean(nav.connection?.saveData) ||
      (memory > 0 && memory <= 4) ||
      (cores > 0 && cores <= 4) ||
      effectiveType === "2g" ||
      effectiveType === "slow-2g";

    if (isApp || isLowEnd) setLimit(LOW_END_PETAL_COUNT);
  }, []);

  return limit;
}

export default function FloatingPetals() {
  const limit = useLowEndPetalLimit();

  return (
    <div className={styles.petalsLayer} aria-hidden>
      {petals.slice(0, limit).map((petal, index) => (
        <span
          key={`${petal.left}-${index}`}
          className={styles.petal}
          style={{ left: petal.left, animationDelay: petal.delay, animationDuration: petal.duration }}
        >
          {/* 크기 변주는 여기 정적 transform 으로만 둔다 — 바깥 span 의 낙하 키프레임에 넣으면
              var() 때문에 애니메이션이 메인스레드로 내려온다(styles 의 .petal 주석 참고). */}
          <span className={styles.petalInner} style={{ "--petal-scale": petal.scale } as CSSProperties} />
        </span>
      ))}
    </div>
  );
}
