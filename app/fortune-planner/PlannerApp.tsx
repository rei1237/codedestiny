"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronLeft, ChevronRight, ClipboardList, Copy, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { applyOccurrencePatch, deleteOccurrence, type RepeatScope } from "./recurrence";
import "./planner.css";
import "./week-grid.css";

type View = "today" | "week" | "month" | "timetable" | "record";
type Category = "study" | "work" | "meeting" | "health" | "relationship" | "personal" | "important" | "other";
type Reminder = "none" | "at_time" | "10m" | "1h" | "1d";
type Event = {
  id: string; title: string; date: string; start?: string; end?: string; allDay: boolean;
  cat: Category; todo: boolean; done: boolean; repeat: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly";
  repeatUntil?: string; excludedDates?: string[]; timetableId?: string; location?: string; memo?: string;
  reminder: Reminder; updatedAt: string;
};
type Timetable = { id: string; name: string; color: string; startDate?: string; endDate?: string; createdAt: string };
type Diary = { date: string; memo: string; mood: string; updatedAt: string };
type Store = { version: 2; events: Event[]; timetables: Timetable[]; diary: Diary[]; view: View; onboardingDone: boolean; fortuneVisible: boolean };

const KEY = "cd.fortunePlanner.v2";
const LEGACY = "cd.fortunePlanner.v1";
const OLD_DIARY = "luck_sync_diary_v2";
const COLORS = ["#dceeff", "#ece2ff", "#ffe5ec", "#dff5e6", "#fff0cc"];
const CATEGORY_LABEL: Record<Category, string> = { study: "학교·공부", work: "업무", meeting: "약속", health: "건강·운동", relationship: "연애·관계", personal: "개인", important: "중요한 날", other: "기타" };
const REPEAT_LABEL: Record<Event["repeat"], string> = { none: "반복 안 함", daily: "매일", weekdays: "평일", weekly: "매주", biweekly: "격주", monthly: "매월", yearly: "매년" };
const SCOPE_LABEL: Record<RepeatScope, string> = { one: "이 일정만", following: "이후 일정", all: "전체 일정" };

const seoulDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
const dayLabel = (date: string) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${date}T12:00:00`));
const defaultStore = (): Store => ({ version: 2, events: [], timetables: [], diary: [], view: "today", onboardingDone: false, fortuneVisible: true });
const blank = (date = seoulDate()) => ({ title: "", date, start: "", end: "", allDay: false, cat: "personal" as Category, todo: false, repeat: "none" as Event["repeat"], repeatUntil: "", location: "", memo: "", reminder: "none" as Reminder, timetableId: "" });

function loadStore(): Store {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...defaultStore(), ...JSON.parse(saved) };
    const legacy = JSON.parse(localStorage.getItem(LEGACY) || "{}");
    const oldDiary = JSON.parse(localStorage.getItem(OLD_DIARY) || "{}");
    const migrated: Store = {
      ...defaultStore(),
      events: Array.isArray(legacy.events) ? legacy.events.map((event: Event) => ({ ...event, reminder: event.reminder || "none" })) : [],
      diary: migrateDiaryEntries(legacy.records, oldDiary),
    };
    localStorage.setItem(KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return defaultStore(); }
}

function migrateDiaryEntries(records: unknown, oldDiary: unknown): Diary[] {
  const byDate = new Map<string, Diary>();
  const add = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const entry = value as Record<string, unknown>;
    const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : "";
    if (!date) return;
    const memo = [entry.memo, entry.memoNote, entry.practiceNote, entry.reviewNote, entry.nightLog].filter((item): item is string => typeof item === "string" && Boolean(item.trim())).join("\n\n");
    const mood = Array.isArray(entry.emotionTags) ? entry.emotionTags.filter((item): item is string => typeof item === "string").join(" · ") : typeof entry.mood === "string" ? entry.mood : "";
    const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString();
    const previous = byDate.get(date);
    if (!previous || memo.length >= previous.memo.length) byDate.set(date, { date, memo, mood, updatedAt });
  };
  if (Array.isArray(records)) records.forEach(add);
  if (oldDiary && typeof oldDiary === "object") Object.values(oldDiary as Record<string, unknown>).forEach(add);
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function occurs(event: Event, date: string) {
  if (event.excludedDates?.includes(date) || date < event.date || (event.repeatUntil && date > event.repeatUntil)) return false;
  if (event.date === date) return true;
  if (event.repeat === "none") return false;
  const first = new Date(`${event.date}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  const distance = Math.round((+target - +first) / 86400000);
  return event.repeat === "daily" ||
    (event.repeat === "weekdays" && target.getDay() > 0 && target.getDay() < 6) ||
    (event.repeat === "weekly" && distance % 7 === 0) ||
    (event.repeat === "biweekly" && distance % 14 === 0) ||
    (event.repeat === "monthly" && first.getDate() === target.getDate()) ||
    (event.repeat === "yearly" && first.getMonth() === target.getMonth() && first.getDate() === target.getDate());
}

function fortune(date: string) {
  return [["흐름이 편안한 날", "중요한 일을 차분히 정리하기 좋은 흐름이에요.", "오후 2시~4시"], ["집중이 필요한 날", "하나의 우선순위에 힘을 모으면 성과가 또렷해져요.", "오전 9시~11시"], ["속도를 조절할 날", "결정을 서두르기보다 확인할 시간을 남겨두세요.", "오후 1시~3시"], ["관계에 신경 쓸 날", "짧은 안부와 분명한 약속이 관계를 편안하게 해줘요.", "오후 4시~6시"], ["휴식이 필요한 날", "집중과 회복의 간격을 의식하면 하루가 더 안정돼요.", "오전 10시~12시"]][Number(date.replaceAll("-", "")) % 5];
}

export default function PlannerApp() {
  const [store, setStore] = useState<Store | null>(null);
  const [date, setDate] = useState(seoulDate());
  const [draft, setDraft] = useState(blank());
  const [editing, setEditing] = useState<Event | null>(null);
  const [scope, setScope] = useState<RepeatScope>("one");
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => setStore(loadStore()), []);
  useEffect(() => { if (store) localStorage.setItem(KEY, JSON.stringify(store)); }, [store]);
  const dayEvents = useMemo(() => store?.events.filter((event) => occurs(event, date)).sort((a, b) => (a.start || "").localeCompare(b.start || "")) || [], [date, store]);
  if (!store) return <main className="fp">플래너를 준비하고 있어요.</main>;

  const openEditor = (event?: Event) => {
    setEditing(event || null);
    setDraft(event ? { ...blank(event.date), ...event } : blank(date));
    setScope("one"); setEditorOpen(true);
  };
  const openNewAt = (targetDate: string, start = "") => {
    setEditing(null);
    setDraft({ ...blank(targetDate), start, end: start ? `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, "0")}:00` : "" });
    setScope("one"); setEditorOpen(true);
  };
  const closeEditor = () => { setEditorOpen(false); setEditing(null); setDraft(blank(date)); };
  const patch = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => {
    if (!draft.title.trim()) { setNotice("일정명을 입력해 주세요."); return; }
    const updatedAt = new Date().toISOString();
    if (!editing) {
      setStore({ ...store, events: [...store.events, { ...draft, id: crypto.randomUUID(), title: draft.title.trim(), done: false, updatedAt }] });
    } else {
      const replacements = applyOccurrencePatch(editing, date, { ...draft, title: draft.title.trim(), updatedAt }, editing.repeat === "none" ? "all" : scope) as Event[];
      setStore({ ...store, events: [...store.events.filter((event) => event.id !== editing.id), ...replacements] });
    }
    closeEditor();
  };
  const remove = () => {
    if (!editing) return;
    const replacements = deleteOccurrence(editing, date, editing.repeat === "none" ? "all" : scope) as Event[];
    setStore({ ...store, events: [...store.events.filter((event) => event.id !== editing.id), ...replacements] }); closeEditor();
  };
  const addTimetable = (name: string) => {
    if (!name.trim()) return;
    const table = { id: crypto.randomUUID(), name: name.trim(), color: COLORS[store.timetables.length % COLORS.length], createdAt: new Date().toISOString() };
    setStore({ ...store, timetables: [...store.timetables, table] }); setNotice(`시간표 ‘${table.name}’을 만들었어요.`);
  };
  const requestNotifications = async () => {
    if (!("Notification" in window)) { setNotice("이 브라우저에서는 알림을 지원하지 않아요."); return; }
    const result = await Notification.requestPermission();
    setNotice(result === "granted" ? "알림 권한을 허용했어요. 브라우저가 열려 있을 때 일정 알림을 보여드려요." : "알림 권한은 브라우저 설정에서 다시 바꿀 수 있어요.");
  };
  const flow = fortune(date);

  return <main className="fp">
    <header><div><b>무료 · 횟수 제한 없음</b><h1>운세 플래너</h1><p>일정과 시간표에 오늘의 운을 더해보세요</p></div><button className="primary" onClick={() => openEditor()}><Plus />빠른 추가</button></header>
    {!store.onboardingDone && <section className="fortune"><Sparkles /><div><strong>첫 일정부터 가볍게 시작해보세요.</strong><p>일정·시간표는 바로 저장되고, 생년월일 프로필은 선택 사항이에요.</p></div><button onClick={() => setStore({ ...store, onboardingDone: true })}>안내 닫기</button></section>}
    <aside>이 기기에 안전하게 저장돼요. 로그인 동기화는 준비 중입니다.</aside>
    <nav>{([['today', '오늘'], ['week', '주간'], ['month', '월간'], ['timetable', '시간표'], ['record', '기록']] as [View, string][]).map(([id, label]) => <button key={id} aria-pressed={store.view === id} onClick={() => setStore({ ...store, view: id })}>{label}</button>)}</nav>
    <div className="date"><button aria-label="이전 날짜" onClick={() => setDate(addDays(date, store.view === "month" ? -30 : -1))}><ChevronLeft /></button><strong>{dayLabel(date)}</strong><button aria-label="다음 날짜" onClick={() => setDate(addDays(date, store.view === "month" ? 30 : 1))}><ChevronRight /></button></div>
    {notice && <p role="status">{notice}</p>}
    {store.view === "today" && <Today events={dayEvents} flow={flow} visible={store.fortuneVisible} onToggleFortune={() => setStore({ ...store, fortuneVisible: !store.fortuneVisible })} onEdit={openEditor} onToggleTodo={(id) => setStore({ ...store, events: store.events.map((event) => event.id === id ? { ...event, done: !event.done, updatedAt: new Date().toISOString() } : event) })} />}
    {store.view === "week" && <Week date={date} events={store.events} select={setDate} onEdit={openEditor} onCreate={openNewAt} onMove={(id, targetDate, start) => setStore({ ...store, events: store.events.map((event) => event.id === id ? { ...event, date: targetDate, start, updatedAt: new Date().toISOString() } : event) })} />}
    {store.view === "month" && <Month date={date} events={store.events} select={setDate} />}
    {store.view === "timetable" && <Timetables tables={store.timetables} events={store.events} onAdd={addTimetable} onCopy={(id) => { const table = store.timetables.find((item) => item.id === id); if (table) setStore({ ...store, timetables: [...store.timetables, { ...table, id: crypto.randomUUID(), name: `${table.name} 복사본`, createdAt: new Date().toISOString() }] }); }} onAddItem={() => openEditor({ ...blank(date), id: "", title: "", done: false, repeat: "weekly", updatedAt: "" })} />}
    {store.view === "record" && <DiaryView entry={store.diary.find((item) => item.date === date)} onSave={(memo, mood) => setStore({ ...store, diary: [...store.diary.filter((item) => item.date !== date), { date, memo, mood, updatedAt: new Date().toISOString() }] })} />}
    <button className="fab" aria-label="빠른 일정 추가" onClick={() => openEditor()}><Plus /></button>
    {editorOpen && <Editor editing={editing} draft={draft} patch={patch} scope={scope} setScope={setScope} tables={store.timetables} onClose={closeEditor} onSave={save} onDelete={remove} notification={requestNotifications} />}
  </main>;
}

function Today({ events, flow, visible, onToggleFortune, onEdit, onToggleTodo }: { events: Event[]; flow: string[]; visible: boolean; onToggleFortune: () => void; onEdit: (event: Event) => void; onToggleTodo: (id: string) => void }) {
  const todos = events.filter((event) => event.todo); const completed = todos.filter((event) => event.done).length;
  return <><section className="fortune">{visible && <><Sparkles /><div><strong>{flow[0]}</strong><p>{flow[1]}</p><small>추천 시간대 {flow[2]} · 일정 사이에 20분의 여유를 남겨두세요.</small></div></>}<button onClick={onToggleFortune}>{visible ? "운세 숨기기" : "운세 보기"}</button></section><h2>오늘의 일정 <small>{events.length}개 · 할 일 {completed}/{todos.length}</small></h2><EventList items={events} onEdit={onEdit} onToggle={onToggleTodo} /></>;
}

function EventList({ items, onEdit, onToggle }: { items: Event[]; onEdit: (event: Event) => void; onToggle: (id: string) => void }) {
  if (!items.length) return <section className="events"><div className="empty"><strong>아직 등록된 일정이 없어요.</strong><p>첫 일정을 만들어볼까요?</p></div></section>;
  return <section className="events">{items.map((event) => <article key={event.id} className={event.done ? "done" : ""}><button disabled={!event.todo} aria-label={`${event.title} 완료 상태 변경`} onClick={() => onToggle(event.id)}>{event.done && <Check />}</button><div><strong>{event.title}</strong><p><ClipboardList size={14} />{event.allDay ? "하루 종일" : event.start || "시간 미정"}{event.end && ` · ${event.end}`}</p>{event.location && <p>{event.location}</p>}</div><i className={event.cat}>{CATEGORY_LABEL[event.cat]}</i><button aria-label={`${event.title} 편집`} onClick={() => onEdit(event)}><Pencil size={16} /></button></article>)}</section>;
}

function Week({ date, events, select, onEdit, onCreate, onMove }: { date: string; events: Event[]; select: (date: string) => void; onEdit: (event: Event) => void; onCreate: (date: string, start?: string) => void; onMove: (id: string, date: string, start: string) => void }) {
  const monday = addDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const hours = Array.from({ length: 15 }, (_, index) => index + 7);
  const dragId = (event: React.DragEvent) => event.dataTransfer.getData("text/plain");
  const length = (event: Event) => Math.max(1, Math.min(4, Math.ceil(((Number((event.end || event.start || "00:00").slice(0, 2)) * 60 + Number((event.end || event.start || "00:00").slice(3, 5))) - (Number((event.start || "00:00").slice(0, 2)) * 60 + Number((event.start || "00:00").slice(3, 5)))) / 60) || 1));
  return <section className="week-wrap" aria-label="주간 시간표"><p className="week-help">빈 시간대를 누르면 일정을 추가할 수 있어요. 일정 블록을 끌어 다른 시간으로 옮길 수 있습니다.</p><div className="week-grid" role="grid"> <span className="week-corner" />{days.map((day) => <button className="week-day" key={day} onClick={() => select(day)}><span>{new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${day}T12:00:00`))}</span><strong>{day.slice(-2)}</strong></button>)}{hours.flatMap((hour) => [<span className="week-hour" key={`h-${hour}`}>{String(hour).padStart(2, "0")}:00</span>, ...days.map((day) => <button className="week-slot" key={`${day}-${hour}`} aria-label={`${day} ${hour}시 일정 추가`} onClick={() => onCreate(day, `${String(hour).padStart(2, "0")}:00`)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = dragId(event); if (id) onMove(id, day, `${String(hour).padStart(2, "0")}:00`); }} />)])}{events.filter((event) => !event.allDay && days.some((day) => occurs(event, day)) && event.start).map((event) => { const day = days.find((item) => occurs(event, item)) || event.date; const column = days.indexOf(day) + 2; const row = Math.max(2, Number(event.start!.slice(0, 2)) - 5); return <button draggable key={event.id} className={`week-event ${event.cat}`} style={{ gridColumn: column, gridRow: `${row} / span ${length(event)}` }} onDragStart={(drag) => drag.dataTransfer.setData("text/plain", event.id)} onClick={() => onEdit(event)} aria-label={`${event.title}, ${event.start}부터 ${event.end || "종료 시간 미정"}, 편집`}>{event.start} <strong>{event.title}</strong></button>; })}</div></section>;
}

function Month({ date, events, select }: { date: string; events: Event[]; select: (date: string) => void }) {
  const month = date.slice(0, 7); const first = `${month}-01`; const start = addDays(first, -((new Date(`${first}T12:00:00`).getDay() + 6) % 7));
  return <section className="month" aria-label="월간 일정">{Array.from({ length: 42 }, (_, index) => { const day = addDays(start, index); const count = events.filter((event) => occurs(event, day)).length; return <button key={day} className={day.slice(0, 7) === month ? "" : "muted"} onClick={() => select(day)}><strong>{day.slice(-2)}</strong>{count > 0 && <span>{count}개 일정</span>}</button>; })}</section>;
}

function Timetables({ tables, events, onAdd, onCopy, onAddItem }: { tables: Timetable[]; events: Event[]; onAdd: (name: string) => void; onCopy: (id: string) => void; onAddItem: () => void }) {
  const [name, setName] = useState("");
  return <section className="timetable"><h2>시간표</h2><p>학교, 업무, 운동처럼 반복되는 일정을 여러 시간표로 나눠 관리하세요.</p><div className="grid"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 2026 가을학기" /><button onClick={() => { onAdd(name); setName(""); }}>시간표 만들기</button></div>{tables.map((table) => <article key={table.id}><span style={{ background: table.color }} />{table.name}<small>{events.filter((event) => event.timetableId === table.id).length}개 항목</small><button onClick={() => onCopy(table.id)}><Copy size={15} />복제</button></article>)}<button className="primary" onClick={onAddItem}>반복 시간표 항목 추가</button></section>;
}

function DiaryView({ entry, onSave }: { entry?: Diary; onSave: (memo: string, mood: string) => void }) {
  const [memo, setMemo] = useState(entry?.memo || ""); const [mood, setMood] = useState(entry?.mood || "");
  useEffect(() => { setMemo(entry?.memo || ""); setMood(entry?.mood || ""); }, [entry]);
  return <section className="record"><h2>하루 기록</h2><label>기분<input value={mood} onChange={(event) => setMood(event.target.value)} placeholder="예: 🙂 차분함" /></label><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="오늘 기억하고 싶은 흐름, 만남, 선택을 남겨보세요." /><button className="primary" onClick={() => onSave(memo, mood)}>기록 저장</button></section>;
}

function Editor({ editing, draft, patch, scope, setScope, tables, onClose, onSave, onDelete, notification }: { editing: Event | null; draft: ReturnType<typeof blank>; patch: (key: string, value: unknown) => void; scope: RepeatScope; setScope: (scope: RepeatScope) => void; tables: Timetable[]; onClose: () => void; onSave: () => void; onDelete: () => void; notification: () => void }) {
  return <div className="back"><section role="dialog" aria-modal="true" aria-label={editing ? "일정 수정" : "일정 추가"}><header><h2>{editing ? "일정 수정" : "일정 추가"}</h2><button aria-label="닫기" onClick={onClose}><X /></button></header><label>일정명<input autoFocus value={draft.title} onChange={(event) => patch("title", event.target.value)} /></label><div className="grid"><label>날짜<input type="date" value={draft.date} onChange={(event) => patch("date", event.target.value)} /></label><label><input type="checkbox" checked={draft.allDay} onChange={(event) => patch("allDay", event.target.checked)} />하루 종일</label></div><div className="grid"><label>시작<input type="time" disabled={draft.allDay} value={draft.start} onChange={(event) => patch("start", event.target.value)} /></label><label>종료<input type="time" disabled={draft.allDay} value={draft.end} onChange={(event) => patch("end", event.target.value)} /></label></div><div className="grid"><label>카테고리<select value={draft.cat} onChange={(event) => patch("cat", event.target.value)}>{Object.entries(CATEGORY_LABEL).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>반복<select value={draft.repeat} onChange={(event) => patch("repeat", event.target.value)}>{Object.entries(REPEAT_LABEL).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>{draft.repeat !== "none" && <label>반복 종료일<input type="date" value={draft.repeatUntil} onChange={(event) => patch("repeatUntil", event.target.value)} /></label>}<label>시간표<select value={draft.timetableId} onChange={(event) => patch("timetableId", event.target.value)}><option value="">일반 일정</option>{tables.map((table) => <option value={table.id} key={table.id}>{table.name}</option>)}</select></label><label>장소<input value={draft.location} onChange={(event) => patch("location", event.target.value)} /></label><label>메모<textarea value={draft.memo} onChange={(event) => patch("memo", event.target.value)} /></label><label>알림<select value={draft.reminder} onChange={(event) => patch("reminder", event.target.value)}>{[["none", "알림 없음"], ["at_time", "시작 시간"], ["10m", "10분 전"], ["1h", "1시간 전"], ["1d", "하루 전"]].map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>{draft.reminder !== "none" && <button type="button" onClick={notification}><Bell size={16} />알림 권한 안내</button>}<label><input type="checkbox" checked={draft.todo} onChange={(event) => patch("todo", event.target.checked)} />할 일로 관리하기</label>{editing && editing.repeat !== "none" && <fieldset><legend>반복 일정 적용 범위</legend>{(Object.keys(SCOPE_LABEL) as RepeatScope[]).map((value) => <label key={value}><input type="radio" name="scope" checked={scope === value} onChange={() => setScope(value)} />{SCOPE_LABEL[value]}</label>)}</fieldset>}<button className="primary save" onClick={onSave}>저장</button>{editing && <button className="delete" onClick={onDelete}><Trash2 size={16} />삭제</button>}</section></div>;
}
