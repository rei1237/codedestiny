"use client";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { teaHouseCups, type TeaHouseCup } from "../data/teaCups";
import TeaCupVisual from "./TeaCupVisual";
import styles from "../styles/tea-novel.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
type Props = { selectedCupId?: string; onSelect: (cup: TeaHouseCup) => void };
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];
const KO = {
 title: "오늘은 어떤 차를 내어드릴까요?",
 description: "당신의 고민에 가까운 잔을 골라 주세요. 차를 고르면 연이가 그 이야기를 함께 펼쳐요.",
 yeoniAlt: "달빛 아래에서 차를 권하는 인간형 연이", menuAria: "오늘의 차와 상담 주제",
 preview: "마음이 머무는 잔을 누르면, 어떤 이야기를 나눌 수 있는지 알려드려요.",
 confirm: "이 차로 이야기하기", topicNote: "차는 상담 주제예요. 타로·사주·숙요점은 다음 단계에서 선택해요.",
};
export default function TeaCupSelectionScene({ selectedCupId, onSelect }: Props) {
 const copy = useTeaHouseCopy("teaMenuNovel", KO);
 const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
 const [previewId, setPreviewId] = useState(selectedCupId || "");
 const selected = cups.find(cup => cup.id === previewId);
 return <section className={styles.world + " " + styles.menu} aria-labelledby="teaCupSelectTitle">
  <div className={styles.menuIntro}>
   <Image src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt={copy.yeoniAlt} width={1536} height={1024} priority sizes="(max-width:700px) 100vw,50vw" />
   <div><h2 id="teaCupSelectTitle">{copy.title}</h2><p>{copy.description}</p><p>{copy.topicNote}</p></div>
  </div>
  <div className={styles.cups} role="group" aria-label={copy.menuAria}>
   {cups.map(cup => <button type="button" className={styles.cup} data-cup-id={cup.id} data-selected={cup.id === previewId} aria-pressed={cup.id === previewId} key={cup.id} onClick={() => setPreviewId(cup.id)}>
    <TeaCupVisual cup={cup} state={cup.id === previewId ? "selected" : "normal"} size="menu" className={styles.cupVisual} decorative />
    <strong>{cup.name}</strong><small>{cup.topic}</small>
   </button>)}
  </div>
  <div className={styles.cupPreview}>
   <p role="status">{selected ? <><strong>{selected.name}</strong>{selected.selectionComment}</> : copy.preview}</p>
   <button type="button" className={styles.primary} disabled={!selected} onClick={() => { const cup = teaHouseCups.find(item => item.id === previewId); if (cup) onSelect(cup); }}>{copy.confirm}<ArrowRight size={18} aria-hidden /></button>
  </div>
 </section>;
}
