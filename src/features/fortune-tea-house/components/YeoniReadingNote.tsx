"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import styles from "../styles/tea-report.module.css";

const KO = { speaker: "연이가 들려드려요" };

/** The explanation stays beside its evidence and inside the owning PDF section. */
export default function YeoniReadingNote({ children, mood = "listening" }: { children: ReactNode; mood?: "listening" | "advice" | "empathy" }) {
  const copy = useTeaHouseCopy("readingNote", KO);
  return <div className={styles.readingNote}>
    <Image src={`/images/fortune-tea-house/renewal/pig-${mood}.webp`} width={104} height={112} alt="" className={styles.readingNotePortrait}/>
    <div><p className={styles.readingSpeaker}>{copy.speaker}</p>{children}</div>
  </div>;
}
