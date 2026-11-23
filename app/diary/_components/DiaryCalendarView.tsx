"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, NotebookPen, Check, Repeat2 } from "lucide-react";
import DiaryDayView from "./DiaryDayView";
import DiaryScheduleList from "./DiaryScheduleList";
import DiaryTodoList from "./DiaryTodoList";
import DiaryRoutineList from "./DiaryRoutineList";
import { useDiaryToday } from "./DiaryStoreProvider";
import { diaryFlowCopy } from "../_lib/flow-copy";
import { daysInMonth, formatKoreanDate, formatKoreanMonth, parseYmd, shiftMonth, shiftYmd, toYmd, weekdayIndex, weekdayLabel } from "../_lib/kst-date";
import { buildDiaryMonthCells } from "../_lib/month-grid";
import { readMonthMarks } from "../_lib/month-marks";
import { readStoredEntry } from "../_lib/today-snapshot";
import { resolveSchedules, resolveTodos, scheduleTimeLabel } from "../_lib/planner";
import { classifyDiaryDays, dayGroupOf, type DiaryDayFortune } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/planner.module.css";

type CalendarMode = "month" | "week" | "day";
export default function DiaryCalendarView() {
  const { hydrated, ymd:today, store, chart, ext } = useDiaryToday();
  const [date,setDate] = useState("");
  const [mode,setMode] = useState<CalendarMode>("month");
  const [detail,setDetail] = useState<"summary" | "record" | null>(null);
  useEffect(()=>{
    if(!hydrated||!today)return;
    const params=new URLSearchParams(window.location.search);
    const requested=params.get("d")||"";
    setDate(parseYmd(requested)?requested:today);
    const view=params.get("view");
    if(view==="week"||view==="day")setMode(view);
  },[hydrated,today]);
  const select=useCallback((next:string,view?:CalendarMode)=>{
    setDate(next);setDetail(null);
    if(view)setMode(view);
    const url=new URL(window.location.href);
    url.searchParams.set("d",next);
    if(view)url.searchParams.set("view",view);
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  },[]);
  const parts=parseYmd(date);
  const from=parts ? mode==="month"?toYmd(parts.year,parts.month,1):mode==="week"?shiftYmd(date,-weekdayIndex(date)):date : "";
  const to=parts ? mode==="month"?toYmd(parts.year,parts.month,daysInMonth(parts.year,parts.month)):mode==="week"?shiftYmd(from,6):date : "";
  const dates=useMemo(()=>{
    const values:string[]=[];
    for(let day=from;parseYmd(day)&&day<=to;day=shiftYmd(day,1))values.push(day);
    return values;
  },[from,to]);
  const events=useMemo(()=>resolveSchedules(ext,from,to),[ext,from,to]);
  const marks=useMemo(()=>readMonthMarks(store,dates),[store,dates]);
  const fortunes=useMemo(()=>{
    const result:Record<string,DiaryDayFortune>={};
    for(const day of classifyDiaryDays(chart,dates))result[day.ymd]=day;
    return result;
  },[chart,dates]);
  const cells=parts?buildDiaryMonthCells(parts,today):[];
  const move=(amount:number)=>{
    if(!parts)return;
    if(mode==="month"){
      const next=shiftMonth(parts,amount);
      select(toYmd(next.year,next.month,Math.min(parts.day,daysInMonth(next.year,next.month))));
    }else select(shiftYmd(date,amount*(mode==="week"?7:1)));
  };
  const monthTitle=parts?formatKoreanMonth(parts):"달력을 펼치고 있어요.";
  const title=mode==="day"?formatKoreanDate(date):mode==="week"?from+" — "+to:monthTitle;
  const dailyEvents=(ymd:string)=>events.filter(item=>item.date===ymd);
  const grain=diaryFlowCopy(fortunes[date]?.tone);
  const goDetail=()=>setDetail("summary");
  return <div className={styles.calendarLayout} data-view={mode}>
    <section className={styles.calendarPaper} aria-label="달력">
      <header className={styles.calendarHeader}><div className={styles.sectionTitle}><CalendarDays size={24} aria-hidden="true"/><h2>나의 달력</h2></div><button type="button" className={styles.secondaryButton} disabled={!today} onClick={()=>select(today)}>오늘</button></header>
      <div className={styles.calendarToolbar}>
        <div className={styles.segmented} role="group" aria-label="달력 보기">{([["month","월"],["week","주"],["day","일"]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={mode===key} onClick={()=>date&&select(date,key)}>{label}</button>)}</div>
        <div className={styles.periodButtons}><button type="button" className={styles.iconButton} onClick={()=>move(-1)} disabled={!parts} aria-label="이전 기간"><ChevronLeft size={20}/></button><button type="button" className={styles.iconButton} onClick={()=>move(1)} disabled={!parts} aria-label="다음 기간"><ChevronRight size={20}/></button></div>
      </div>
      <h3 className={styles.periodTitle}>{title}</h3>
      <label className={styles.dateJump}>날짜로 이동
        <input type="date" value={date} disabled={!hydrated} onChange={event=>{
          const next=event.currentTarget.value;
          if(parseYmd(next))select(next);
        }}/>
      </label>
      <p className={styles.hint}>{events.length}개의 일정 · 기록 {marks.noteDays}일</p>
      {mode==="month"&&<>
        <div className={styles.weekdayHead} aria-hidden="true">{[0,1,2,3,4,5,6].map(day=><span key={day}>{weekdayLabel(day)}</span>)}</div>
        <div className={styles.monthGrid}>{cells.map(cell=>{
          if(!cell.ymd)return <span key={cell.key} className={styles.outDay} aria-hidden="true">{cell.day}</span>;
          const cellDate=cell.ymd,dayEvents=dailyEvents(cellDate),todos=resolveTodos(ext,cellDate),mark=marks.byYmd[cellDate];
          return <button key={cell.key} type="button" className={styles.monthDay} data-today={cell.isToday||undefined} aria-pressed={date===cellDate} aria-label={formatKoreanDate(cellDate)+" · 일정 "+dayEvents.length+"개 · 할 일 "+todos.length+"개"+(mark?.note?" · 기록 있음":"")} onClick={()=>select(cellDate)}>
            <span className={styles.dayNumber}>{cell.day}</span>
            {dayEvents.length>0&&<span className={styles.cellEvents}>{dayEvents.length}건</span>}
            <span className={styles.cellMarks}>{mark?.note&&<NotebookPen size={13} aria-hidden="true"/>}{todos.some(todo=>todo.done)&&<Check size={13} aria-hidden="true"/>}</span>
          </button>;
        })}</div>
        {marks.noteDays>0&&<details className={styles.monthIndex}>
          <summary>기록한 날 모아보기 · {marks.noteDays}일</summary>
          <div>{dates.filter(day=>marks.byYmd[day]?.note).map(day=>(
            <button type="button" key={day} onClick={()=>{select(day);setDetail("record");}}>
              {Number(day.slice(8))}일 · {weekdayLabel(weekdayIndex(day))}요일
            </button>
          ))}</div>
        </details>}
      </>}
      {mode==="week"&&<div className={styles.weekGrid}>{dates.map(day=><button type="button" key={day} className={styles.weekDay} aria-pressed={date===day} onClick={()=>select(day)}>
        <strong>{weekdayLabel(weekdayIndex(day))} <span>{Number(day.slice(8))}</span></strong>
        {dailyEvents(day).slice(0,3).map(item=><span className={styles.weekEvent} key={item.key}><small>{scheduleTimeLabel(item)}</small>{item.text}{item.repeat&&<Repeat2 size={12} aria-hidden="true"/>}</span>)}
        {!dailyEvents(day).length&&<span className={styles.hint}>여유로운 하루</span>}
        {dailyEvents(day).length>3&&<small>외 {dailyEvents(day).length-3}개</small>}
      </button>)}</div>}
      {mode==="day"&&<p className={styles.dayInvitation}>오늘의 약속과 하고 싶은 일을 한 곳에 펼쳐 두세요.</p>}
      <p className={styles.storageHint}>기록은 이 브라우저에 저장돼요. 더보기에서 백업할 수 있어요.</p>
    </section>
    {date&&<section key={date} className={styles.dayPanel} aria-label="선택한 날짜의 계획">
      <header className={styles.dayPanelHeader}><span>{weekdayLabel(weekdayIndex(date))}요일</span><h2>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일</h2>{grain&&<p>{grain.name}</p>}</header>
      <div className={styles.planSection}><h3>일정</h3><DiaryScheduleList ymd={date}/></div>
      <div className={styles.planSection}><h3>할 일</h3><DiaryTodoList ymd={date}/></div>
      <details className={styles.routineDetails}><summary>나의 루틴</summary><DiaryRoutineList ymd={date} entry={readStoredEntry(store,date)} emptyText="아직 고른 실천이 없어요."/></details>
      <button type="button" className={styles.recordButton} onClick={goDetail}><NotebookPen size={20} aria-hidden="true"/>이 날의 흐름 · 기록 · 회고<ChevronRight size={18} aria-hidden="true"/></button>
    </section>}
    {detail&&date&&<DiaryDayView initialTab={detail} ymd={date} fortune={fortunes[date]||null} group={dayGroupOf(chart,date)} entry={readStoredEntry(store,date)} onClose={()=>setDetail(null)}/>}
  </div>;
}
