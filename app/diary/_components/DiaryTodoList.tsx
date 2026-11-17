"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { addTodo, normalizePlanText, removeTodo, toggleTodo } from "../_lib/ext-writes";
import { resolveTodos, type PlannedTodo } from "../_lib/planner";
import { parseYmd } from "../_lib/kst-date";
import { DIARY_EXT_TEXT_MAX } from "@/lib/diary/diary-ext-store";
import styles from "../_styles/planner.module.css";

export default function DiaryTodoList({ ymd, initialOpen = false }: { ymd:string; initialOpen?:boolean }) {
  const {ext} = useDiaryToday();
  const {updateExtDay} = useDiaryWriter();
  const [editing,setEditing] = useState<PlannedTodo | null | undefined>(initialOpen ? null : undefined);
  const [text,setText] = useState("");
  const [date,setDate] = useState(ymd);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [deleting,setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const open=editing !== undefined;
  useEffect(()=>{if(open)inputRef.current?.focus();else if(wasOpen.current)(lastTrigger.current?.isConnected?lastTrigger.current:addRef.current)?.focus();wasOpen.current=open;},[open]);
  const start=(item:PlannedTodo|null,trigger:HTMLElement)=>{lastTrigger.current=trigger;setEditing(item);setText(item?.text||"");setDate(item?.date||ymd);setError("");setDeleting(false);setMessage("");};
  const save=(event:FormEvent)=>{
    event.preventDefault();
    const value=normalizePlanText(text);
    if(!value||!parseYmd(date)){setError("할 일과 날짜를 확인해 주세요.");return;}
    const saved=editing?.id ? updateExtDay(editing.sourceYmd,day=>{day.todos=(day.todos||[]).map(item=>item.id===editing.id?{...item,text:value,date}:item);})
      : updateExtDay(ymd,day=>{addTodo(value)(day);const item=day.todos?.[day.todos.length-1];if(item)item.date=date;});
    if(!saved){setError("저장하지 못했어요. 입력을 확인하고 다시 저장해 주세요.");return;}
    setEditing(undefined);setMessage(date===ymd?"할 일을 저장했어요.":date+"에 할 일을 저장했어요.");
  };
  const remove=()=>{
    if(!editing?.id)return;
    if(!updateExtDay(editing.sourceYmd,removeTodo(editing.id))){setError("삭제하지 못했어요. 다시 시도해 주세요.");return;}
    setEditing(undefined);setMessage("할 일을 삭제했어요.");
  };
  return <div className={styles.scheduleSection}>
    {resolveTodos(ext,ymd).length ? <ul className={styles.agendaList}>{resolveTodos(ext,ymd).map(item=><li key={item.sourceYmd+":"+item.id} className={styles.todoRow}>
      <button type="button" className={styles.todoToggle} aria-pressed={item.done===true} aria-label={item.text+(item.done?" 완료 취소":" 완료하기")} disabled={!item.id} onClick={()=>item.id&&updateExtDay(item.sourceYmd,toggleTodo(item.id))}><span className={styles.checkMark}>{item.done&&<Check size={16} aria-hidden="true"/>}</span><span className={item.done?styles.doneText:undefined}>{item.text}</span></button>
      <button type="button" className={styles.iconButton} onClick={event=>start(item,event.currentTarget)} disabled={!item.id} aria-label={item.text+" 할 일 수정"}><Pencil size={17} aria-hidden="true"/></button>
    </li>)}</ul>:!open&&<p className={styles.empty}>오늘 끝내고 싶은 일 하나를 적어 보세요.</p>}
    {!open&&<button ref={addRef} type="button" className={styles.addButton} onClick={event=>start(null,event.currentTarget)}><Plus size={18} aria-hidden="true"/>할 일 추가</button>}
    {open&&<form className={styles.editor} onSubmit={save} aria-label={editing?"할 일 수정":"새 할 일"}>
      <header className={styles.editorHead}><h3>{editing?"할 일 수정":"새 할 일"}</h3><button type="button" className={styles.iconButton} onClick={()=>setEditing(undefined)} aria-label="할 일 편집 닫기"><X size={20}/></button></header>
      <label className={styles.field}>할 일 내용<input ref={inputRef} value={text} onChange={event=>setText(event.target.value)} maxLength={DIARY_EXT_TEXT_MAX} required placeholder="차근차근, 한 가지씩"/></label>
      <label className={styles.field}>날짜<input type="date" value={date} onChange={event=>setDate(event.target.value)} required/></label>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.editorActions}><button type="button" className={styles.secondaryButton} onClick={()=>setEditing(undefined)}>취소</button><button type="submit" className={styles.primaryButton}>할 일 저장하기</button></div>
      {editing&&!deleting&&<button type="button" className={styles.deleteButton} onClick={()=>setDeleting(true)}>이 할 일 삭제하기</button>}
      {deleting&&<div className={styles.deleteConfirm}><p>이 할 일을 삭제할까요?</p><button type="button" className={styles.secondaryButton} onClick={()=>setDeleting(false)}>유지하기</button><button type="button" className={styles.deleteButton} onClick={remove}>삭제하기</button></div>}
    </form>}
    {message&&<p className={styles.hint} role="status">{message}</p>}
  </div>;
}
