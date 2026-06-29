"use client";

import { lazy, Suspense } from "react";

const FortuneTeaHousePage = lazy(() => import("@/src/features/fortune-tea-house/FortuneTeaHousePage"));

export default function FortuneTeaHouseClient() {
  return (
    <Suspense fallback={null}>
      <FortuneTeaHousePage />
    </Suspense>
  );
}
