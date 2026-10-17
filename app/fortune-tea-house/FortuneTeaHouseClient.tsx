"use client";

import FortuneTeaHousePage from "@/src/features/fortune-tea-house/FortuneTeaHousePage";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { teaHouseSurface, YEONI_TEA_HOUSE } from "@/lib/fortune/yeoni-entry";
import { useLocale } from "@/lib/i18n/useT";
import { recordsCopy } from "@/lib/records/copy";
import styles from "@/src/features/fortune-tea-house/styles/tea-house-home.module.css";
import SavedTeaReading from "./SavedTeaReading";
import { recordService } from "@/lib/records/service-registry";

const FortuneChatEntry = dynamic(() => import("@/app/fortune-chat/FortuneChatEntry"));

type Props = { children?: ReactNode; legacyChat?: boolean };

export default function FortuneTeaHouseClient({ children, legacyChat = false }: Props) {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => { setSearch(window.location.search); }, []);
  const copy = recordsCopy(useLocale());
  // Keep the existing SSR boundary: never mount a new consultation before resolving a saved URL.
  if (search === null) return <div aria-busy="true" className="mx-auto max-w-3xl px-4 py-6"><h1 className="text-2xl font-semibold text-[var(--cd-text)]">{recordService('tea')?.name}</h1></div>;
  const params = new URLSearchParams(search);
  const surface = teaHouseSurface(params, legacyChat);
  if (surface === "saved-tea") return <SavedTeaReading resultId={params.get("resultId")!} />;
  if (surface === "chat") return <>
    <div className={styles.home}><nav className={styles.header} aria-label={copy.hub}>
      <a className={styles.brand} href={YEONI_TEA_HOUSE}>{recordService('tea')?.name}</a>
      <a className={styles.textButton} href="/records/">{copy.title}</a>
    </nav></div>
    <Suspense><FortuneChatEntry /></Suspense>
  </>;
  return <><FortuneTeaHousePage />{children}</>;
}
