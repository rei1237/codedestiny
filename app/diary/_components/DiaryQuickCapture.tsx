"use client";
import { useEffect, useState } from "react";
import { CalendarPlus, ListTodo, NotebookPen, X } from "lucide-react";
import DiaryEntryFields from "./DiaryEntryFields";
import DiaryScheduleList from "./DiaryScheduleList";
import DiaryTodoList from "./DiaryTodoList";
import { useDiaryToday } from "./DiaryStoreProvider";
import { readStoredEntry } from "../_lib/today-snapshot";
import { formatKoreanDate, parseYmd } from "../_lib/kst-date";
import styles from "../_styles/diary.module.css";
import planner from "../_styles/planner.module.css";

export default function DiaryQuickCapture({ onClose, ymd, initialKind = "schedule" }: { onClose:()=>void; ymd?:string; initialKind?:"entry"|"schedule"|"todo" }) {
  const {hydrated,ymd:today,store}=useDiaryToday();
  const [date,setDate]=useState(ymd||today);
  const [kind,setKind]=useState(initialKind);
  useEffect(()=>{setDate(ymd||today);},[ymd,today]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[onClose]);
  return <aside className={styles.sheet} aria-label="새로 추가">
    <span className={styles.sheetHandle} aria-hidden="true"/>
    <header className={styles.sheetHead}><h2 className={styles.sheetTitle}>{date?formatKoreanDate(date):"새로 추가"}</h2><button type="button" className={styles.iconButton} onClick={onClose} aria-label="추가 화면 닫기"><X size={20}/></button></header>
    <div className={styles.dvPanel}>
      <div className={planner.captureTabs} role="group" aria-label="추가할 내용">
        <button type="button" aria-pressed={kind==="schedule"} onClick={()=>setKind("schedule")}><CalendarPlus size={17} aria-hidden="true"/>일정</button>
        <button type="button" aria-pressed={kind==="todo"} onClick={()=>setKind("todo")}><ListTodo size={17} aria-hidden="true"/>할 일</button>
        <button type="button" aria-pressed={kind==="entry"} onClick={()=>setKind("entry")}><NotebookPen size={17} aria-hidden="true"/>일기</button>
      </div>
      <label className={planner.field}>기록 날짜<input type="date" value={date} onChange={event=>{if(parseYmd(event.target.value))setDate(event.target.value);}}/></label>
      {hydrated&&date?<div key={date+":"+kind}>
        {kind==="schedule"&&<DiaryScheduleList ymd={date} initialOpen/>}
        {kind==="todo"&&<DiaryTodoList ymd={date} initialOpen/>}
        {kind==="entry"&&<DiaryEntryFields ymd={date} entry={readStoredEntry(store,date)} autoFocus showTags/>}
      </div>:<p role="status">기록을 펼치고 있어요.</p>}
    </div>
  </aside>;
}
