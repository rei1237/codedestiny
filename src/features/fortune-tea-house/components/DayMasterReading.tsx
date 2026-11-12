"use client";

import { dayMasterProfiles, resolveDayMaster } from "../data/readingPresentation";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import YeoniReadingNote from "./YeoniReadingNote";
import styles from "../styles/tea-report.module.css";

const KO = { title: "나를 이해하는 일간", explanation: "일간은 태어난 날의 천간으로, 나를 읽는 기준점이에요. 아래 내용은 일간의 일반적인 기질이며, 전체 명식의 균형에 따라 다르게 드러날 수 있어요.", action: "작게 실천해 보세요" };

export default function DayMasterReading({ value }: { value?: string }) {
  const copy = useTeaHouseCopy("dayMasterReading", KO);
  const profiles = useTeaHouseCopy("dayMasterProfiles", dayMasterProfiles);
  const id = resolveDayMaster(value);
  if (!id) return null;
  const profile = profiles[id];
  return <section className={styles.sajuPanelSection} data-tea-pdf-section data-day-master={id}>
    <h4>{copy.title} · {profile.label}</h4>
    <p className={styles.sajuMutedText}>{copy.explanation}</p>
    <YeoniReadingNote><p>{profile.description}</p><p><strong>{copy.action}</strong><br/>{profile.advice}</p></YeoniReadingNote>
  </section>;
}
