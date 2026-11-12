"use client";
import Image from "next/image";
import { useState } from "react";
import type { TenGodId } from "../data/tenGods";
import { tenGodMetaMap } from "@/lib/fortune-tea-house/ten-gods.mjs";
import { tenGodVisualAlts, tenGodVisualMap } from "../data/tenGodVisuals";
import { tenGodPresentation } from "../data/readingPresentation";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import YeoniReadingNote from "./YeoniReadingNote";
import styles from "../styles/tea-report.module.css";

type TenGodSymbolCardProps = { tenGodId: TenGodId; size?: "sm" | "md" | "lg"; showDescription?: boolean; selected?: boolean; className?: string };
const TEN_GOD_SKIP_KEYS = ["id", "colorTone"];
const KO = { strength: "잘 살아날 때", caution: "균형을 살필 때", action: "작게 실천해 보세요" };
export default function TenGodSymbolCard({ tenGodId, size = "md", showDescription = true, selected = false, className = "" }: TenGodSymbolCardProps) {
  const metaMap = useTeaHouseCopy("tenGods", tenGodMetaMap, { skipKeys: TEN_GOD_SKIP_KEYS });
  const presentation = useTeaHouseCopy("tenGodPresentation", tenGodPresentation);
  const alts = useTeaHouseCopy("tenGodAlts", tenGodVisualAlts);
  const copy = useTeaHouseCopy("tenGodReading", KO);
  const [failed, setFailed] = useState(false);
  const meta = metaMap[tenGodId], reading = presentation[tenGodId];
  return <article className={[styles.tenGodCard, className].join(" ")} data-size={size} data-selected={selected} data-ten-god={tenGodId}>
    <div className={styles.tenGodIconWrap}>
      {!failed && <Image src={tenGodVisualMap[tenGodId].src} width={512} height={512} alt={alts[tenGodId]} className={styles.tenGodImage} onError={() => setFailed(true)}/>}
    </div>
    <div className={styles.tenGodCopy}>
      <div className={styles.tenGodTitleRow}><h4>{reading.title}</h4><span>{meta.nameKo} {meta.hanja}</span></div>
      <p className={styles.tenGodRole}>{meta.coreMeaning.slice(0, 2).join(" · ")}</p>
    </div>
    {showDescription && <div className={styles.tenGodDescription}>
      <YeoniReadingNote><dl className={styles.tenGodExplanation}>
        <div><dt>{copy.strength}</dt><dd>{meta.lightSide}</dd></div>
        <div><dt>{copy.caution}</dt><dd>{meta.shadowSide}</dd></div>
        <div><dt>{copy.action}</dt><dd>{reading.advice}</dd></div>
      </dl></YeoniReadingNote>
    </div>}
  </article>;
}
