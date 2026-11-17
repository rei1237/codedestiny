"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Repeat2, Clock3, ChevronRight, X } from "lucide-react";
import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { addSchedule, normalizePlanText } from "../_lib/ext-writes";
import type { DiaryScheduleItem } from "../_lib/ext-snapshot";
import { deleteSchedule, editSchedule, resolveSchedules, scheduleError, scheduleTimeLabel, type ScheduleOccurrence } from "../_lib/planner";
import { weekdayIndex, weekdayLabel } from "../_lib/kst-date";
import { DIARY_EXT_TEXT_MAX } from "@/lib/diary/diary-ext-store";
import styles from "../_styles/planner.module.css";

export default function DiaryScheduleList({ ymd, initialOpen = false }: { ymd: string; initialOpen?: boolean }) {
  const { ext } = useDiaryToday();
  const { updateExtDay } = useDiaryWriter();
  const [editing, setEditing] = useState<ScheduleOccurrence | null | undefined>(initialOpen ? null : undefined);
  const [draft, setDraft] = useState<DiaryScheduleItem>({ date:ymd, text:"", at:"" });
  const [scope, setScope] = useState<"one" | "all">("one");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const items = resolveSchedules(ext, ymd);
  const open = editing !== undefined;
  useEffect(() => {
    if (open) titleRef.current?.focus();
    else if (wasOpen.current) (lastTrigger.current?.isConnected ? lastTrigger.current : addRef.current)?.focus();
    wasOpen.current = open;
  }, [open]);
  const update = (patch: Partial<DiaryScheduleItem>) => { setDraft(current => ({...current,...patch})); setError(""); };
  const start = (item: ScheduleOccurrence | null, trigger: HTMLElement) => {
    lastTrigger.current = trigger;
    setEditing(item); setDraft(item ? {...item} : { date:ymd,text:"",at:"" });
    setScope("one"); setError(""); setMessage(""); setConfirmDelete(false);
  };
  const close = () => { setEditing(undefined); setConfirmDelete(false); addRef.current?.focus(); };
  const changeScope = (value: "one" | "all") => {
    setScope(value);
    const original = editing && ext[editing.sourceYmd]?.schedules?.find(item => item.id === editing.id);
    if (original && editing) setDraft(value === "all" ? {...original,date:original.date || editing.sourceYmd} : {...editing});
    setError("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const date = draft.date || ymd;
    const patch = {date,text:normalizePlanText(draft.text || ""),at:draft.allDay ? "" : draft.at || "",endAt:draft.allDay ? "" : draft.endAt || "",allDay:!!draft.allDay,note:draft.note || "",repeat:draft.repeat};
    const problem = scheduleError(patch,date);
    if (problem) { setError(problem); return; }
    const saved = editing?.id
      ? updateExtDay(editing.sourceYmd, day => editSchedule(day, editing.id as string, patch, scope === "one" ? editing.occurrenceDate : undefined))
      : updateExtDay(ymd, addSchedule(patch.at,patch.text,patch));
    if (!saved) { setError("저장하지 못했어요. 입력은 그대로 두었으니 다시 저장해 주세요."); return; }
    setMessage(date === ymd ? "일정을 저장했어요." : date + "에 일정을 저장했어요."); close();
  };
  const remove = () => {
    if (!editing?.id) return;
    if (!updateExtDay(editing.sourceYmd,day => deleteSchedule(day,editing.id as string,scope === "one" ? editing.occurrenceDate : undefined))) {
      setError("일정을 지우지 못했어요. 다시 시도해 주세요."); return;
    }
    setMessage("일정을 삭제했어요."); close();
  };
  return <div className={styles.scheduleSection}>
    {items.length ? <ul className={styles.agendaList}>{items.map(item => <li key={item.key}>
      <button type="button" className={styles.agendaRow} onClick={event => start(item, event.currentTarget)} disabled={!item.id} aria-label={item.text + " 일정 수정"}>
        <span className={styles.time}><Clock3 size={15} aria-hidden="true" />{scheduleTimeLabel(item)}</span>
        <span className={styles.eventText}><strong>{item.text}</strong>{item.note && <small>{item.note}</small>}{item.repeat && <small><Repeat2 size={13} aria-hidden="true" />반복 일정</small>}</span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </li>)}</ul> : !open && <p className={styles.empty}>아직 적어 둔 일정이 없어요. 작은 약속부터 남겨 보세요.</p>}
    {!open && <button ref={addRef} type="button" className={styles.addButton} onClick={event => start(null, event.currentTarget)}><Plus size={18} aria-hidden="true" />일정 추가</button>}
    {open && <form className={styles.editor} onSubmit={submit} aria-label={editing ? "일정 수정" : "새 일정"}>
      <header className={styles.editorHead}><h3>{editing ? "일정 수정" : "새 일정"}</h3><button type="button" className={styles.iconButton} onClick={close} aria-label="일정 편집 닫기"><X size={20} /></button></header>
      {editing?.repeat && <fieldset className={styles.scope}><legend>적용할 일정</legend>{(["one","all"] as const).map(value => <label key={value}><input type="radio" name="scheduleScope" value={value} checked={scope === value} onChange={() => changeScope(value)} />{value === "one" ? "이번 일정만" : "반복 전체"}</label>)}</fieldset>}
      <label className={styles.field}>일정 제목<input ref={titleRef} value={draft.text || ""} maxLength={DIARY_EXT_TEXT_MAX} onChange={event => update({text:event.target.value})} placeholder="어떤 약속이 있나요?" required /></label>
      <div className={styles.fieldsRow}><label className={styles.field}>날짜<input type="date" value={draft.date || ymd} onChange={event => update({date:event.target.value})} required /></label><label className={styles.checkField}><input type="checkbox" checked={!!draft.allDay} onChange={event => update({allDay:event.target.checked})} />종일</label></div>
      {!draft.allDay && <div className={styles.fieldsRow}><label className={styles.field}>시작 시각<input type="time" value={draft.at || ""} onChange={event => update({at:event.target.value})} /></label><label className={styles.field}>종료 시각<input type="time" value={draft.endAt || ""} onChange={event => update({endAt:event.target.value})} /></label></div>}
      {!(editing?.repeat && scope === "one") && <>
        <label className={styles.field}>반복<select value={draft.repeat?.frequency || "none"} onChange={event => update({repeat:event.target.value === "none" ? undefined : {frequency:event.target.value as "daily" | "weekly" | "monthly",weekdays:[weekdayIndex(draft.date || ymd)]}})}><option value="none">반복 안 함</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월 같은 날짜</option></select></label>
        {draft.repeat?.frequency === "weekly" && <div className={styles.weekdays} role="group" aria-label="반복 요일">{[0,1,2,3,4,5,6].map(day => <button key={day} type="button" aria-pressed={draft.repeat?.weekdays?.includes(day) || false} onClick={() => update({repeat:{...draft.repeat!,weekdays:draft.repeat?.weekdays?.includes(day) ? draft.repeat.weekdays.filter(value => value !== day) : [...(draft.repeat?.weekdays || []),day]}})}>{weekdayLabel(day)}</button>)}</div>}
        {draft.repeat && <label className={styles.field}>반복 종료일 <small>비워 두면 계속 반복해요.</small><input type="date" min={draft.date || ymd} value={draft.repeat.until || ""} onChange={event => update({repeat:{...draft.repeat!,until:event.target.value || undefined}})} /></label>}
        {draft.repeat?.frequency === "monthly" && <p className={styles.hint}>해당 날짜가 없는 달은 건너뛰어요.</p>}
      </>}
      <label className={styles.field}>메모<textarea value={draft.note || ""} onChange={event => update({note:event.target.value})} rows={3} placeholder="장소나 준비할 것을 적어 두세요." /></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.editorActions}><button type="button" className={styles.secondaryButton} onClick={close}>취소</button><button type="submit" className={styles.primaryButton}>일정 저장하기</button></div>
      {editing && !confirmDelete && <button type="button" className={styles.deleteButton} onClick={() => setConfirmDelete(true)}>이 일정 삭제하기</button>}
      {confirmDelete && <div className={styles.deleteConfirm}><p>{editing?.repeat && scope === "all" ? "반복 일정 전체를 삭제할까요?" : "이 일정을 삭제할까요?"}</p><button type="button" className={styles.secondaryButton} onClick={() => setConfirmDelete(false)}>유지하기</button><button type="button" className={styles.deleteButton} onClick={remove}>삭제하기</button></div>}
    </form>}
    {message && <p className={styles.hint} role="status">{message}</p>}
  </div>;
}
