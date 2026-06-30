"use client";

import { lazy, Suspense } from "react";
import styles from "@/src/features/fortune-tea-house/styles/fortune-tea-house.module.css";

const FortuneTeaHousePage = lazy(() => import("@/src/features/fortune-tea-house/FortuneTeaHousePage"));

function FortuneTeaHouseRouteFallback() {
  return (
    <main className={styles.fortuneTeaRouteFallback} aria-live="polite">
      <div className={styles.fortuneTeaRouteFallbackPanel}>
        <span className={styles.fortuneTeaRouteFallbackMoon} aria-hidden />
        <strong>LOADING...</strong>
        <p>찻잔에 달빛을 따르는 중...</p>
      </div>
    </main>
  );
}

export default function FortuneTeaHouseClient() {
  return (
    <Suspense fallback={<FortuneTeaHouseRouteFallback />}>
      <FortuneTeaHousePage />
    </Suspense>
  );
}
