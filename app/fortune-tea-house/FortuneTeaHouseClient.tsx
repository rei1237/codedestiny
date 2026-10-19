"use client";

import ConsultationEntrance from "@/app/fortune-chat/ConsultationEntrance";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { teaHouseSurface } from "@/lib/fortune/yeoni-entry";

const FortuneTeaHousePage = dynamic(() => import("@/src/features/fortune-tea-house/FortuneTeaHousePage"), { loading: () => <ConsultationEntrance /> });
const SavedTeaReading = dynamic(() => import("./SavedTeaReading"), { loading: () => <ConsultationEntrance /> });

const FortuneChatEntry = dynamic(() => import("@/app/fortune-chat/FortuneChatEntry"), { loading: () => <ConsultationEntrance /> });

type Props = { children?: ReactNode; legacyChat?: boolean };

export default function FortuneTeaHouseClient({ children, legacyChat = false }: Props) {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => { setSearch(window.location.search); }, []);
  // Keep the existing SSR boundary: never mount a new consultation before resolving a saved URL.
  if (search === null) return <><ConsultationEntrance />{children}</>;
  const params = new URLSearchParams(search);
  const surface = teaHouseSurface(params, legacyChat);
  if (surface === "saved-tea") return <SavedTeaReading resultId={params.get("resultId")!} />;
  if (surface === "chat") return <Suspense><FortuneChatEntry /></Suspense>;
  return <><FortuneTeaHousePage />{children}</>;
}
