"use client";

import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { useEffect, useState } from "react";
import SavedTeaReading from "./SavedTeaReading";

export default function FortuneTeaHouseClient() {
  const [resultId, setResultId] = useState<string | null>(null);
  useEffect(() => { setResultId(new URLSearchParams(window.location.search).get('resultId') || ''); }, []);
  if (resultId === null) return null;
  if (resultId) return <SavedTeaReading resultId={resultId} />;
  return <FortuneTeaHousePage />;
}
