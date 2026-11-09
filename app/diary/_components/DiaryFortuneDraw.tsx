"use client";
import { useRef, useState } from "react";
import {useDiaryToday} from "./DiaryStoreProvider";
import DiarySmallActionSheet from "./DiarySmallActionSheet";
import styles from "../_styles/diary.module.css";

export default function DiaryFortuneDraw() {
  const [open, setOpen] = useState(false);
  const {hydrated} = useDiaryToday();
  const trigger = useRef<HTMLButtonElement>(null);
  return <section className={styles.drawCard}>
    <img src="/assets/yeongnyangi/original/saju.webp" alt="" width={112} height={112} />
    <div><h2 className={styles.cardTitle}>오늘의 운세 뽑기</h2>
      <p>오늘의 오행에 어울리는 작은 행동을 한 장 뽑아보세요. 마음에 들면 할 일에 담을 수 있어요.</p>
      <button ref={trigger} className={styles.drawButton} type="button" disabled={!hydrated} onClick={()=>setOpen(true)}>한 장 뽑기</button>
    </div>
    {open && <DiarySmallActionSheet onClose={()=>{setOpen(false);trigger.current?.focus();}} />}
  </section>;
}
