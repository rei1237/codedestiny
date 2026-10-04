"use client";
import Image from "next/image";
import type { TeaHouseCup } from "../data/teaCups";
import { teaHouseCups } from "../data/teaCups";
import TeaCupVisual from "./TeaCupVisual";
import styles from "../styles/tea-novel.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
type Props = { selectedCup: TeaHouseCup; onConfirm: () => void; onBack: () => void };
const COPY = { yeoniAlt: "선택한 찻잔을 내미는 연이", backLabel: "다른 찻잔 보기", confirmLabel: "이 찻잔으로 이야기하기" };
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];
export default function TeaCupRitualScene({ selectedCup, onConfirm, onBack }: Props) {
 const copy = useTeaHouseCopy("teaCupRitual", COPY);
 const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
 const cup = cups.find(item => item.id === selectedCup.id) || selectedCup;
 return <section className={styles.world + " " + styles.ritual} aria-labelledby="teaCupRitualTitle">
  <Image className={styles.ritualPortrait} src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt={copy.yeoniAlt} width={1536} height={1024} priority sizes="(max-width:700px) 100vw,50vw" />
  <div><TeaCupVisual cup={cup} state="selected" size="menu" className={styles.ritualCup} /><h2 id="teaCupRitualTitle">{cup.ritualTitle}</h2><p>{cup.yeoniSelectLine}</p><p>{cup.questionGuideLine}</p>
   <div className={styles.ritualActions}><button type="button" onClick={onBack}>{copy.backLabel}</button><button type="button" className={styles.primary} onClick={onConfirm}>{copy.confirmLabel}</button></div>
  </div>
 </section>;
}
