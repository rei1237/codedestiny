"use client";

import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { useEffect, useState } from "react";
import SavedTeaReading from "./SavedTeaReading";
import { recordService } from "@/lib/records/service-registry";

export default function FortuneTeaHouseClient() {
  const [resultId, setResultId] = useState<string | null>(null);
  useEffect(() => { setResultId(new URLSearchParams(window.location.search).get('resultId') || ''); }, []);
  if (resultId === null) return <div aria-busy="true" className="mx-auto max-w-3xl px-4 py-6"><h1 className="text-2xl font-semibold text-[var(--cd-text)]">{recordService('tea')?.name}</h1></div>;
  if (resultId) return <SavedTeaReading resultId={resultId} />;
  return <FortuneTeaHousePage />;
}
