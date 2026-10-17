"use client";

import ConsultationEntrance from "@/app/fortune-chat/ConsultationEntrance";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { teaHouseSurface, YEONI_TEA_HOUSE } from "@/lib/fortune/yeoni-entry";
import { useLocale } from "@/lib/i18n/useT";
import { recordsCopy } from "@/lib/records/copy";
import styles from "@/src/features/fortune-tea-house/styles/tea-house-home.module.css";
import { recordService } from "@/lib/records/service-registry";

const FortuneTeaHousePage = dynamic(() => import("@/src/features/fortune-tea-house/FortuneTeaHousePage"), { loading: () => <ConsultationEntrance /> });
const SavedTeaReading = dynamic(() => import("./SavedTeaReading"), { loading: () => <ConsultationEntrance /> });

const FortuneChatEntry = dynamic(() => import("@/app/fortune-chat/FortuneChatEntry"), { loading: () => <ConsultationEntrance /> });

type Props = { children?: ReactNode; legacyChat?: boolean };

export default function FortuneTeaHouseClient({ children, legacyChat = false }: Props) {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => { setSearch(window.location.search); }, []);
  const copy = recordsCopy(useLocale());
  // Keep the existing SSR boundary: never mount a new consultation before resolving a saved URL.
  if (search === null) return <><ConsultationEntrance />{children}</>;
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
