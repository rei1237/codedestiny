"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./fortune-planner.module.css";

type PlannerItem = { id: string; title: string; date: string; done: boolean; createdAt: string };
const STORAGE_KEY = "cd.fortune-planner.v1";

function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function displayDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" }).format(new Date(`${value}T12:00:00+09:00`)); }
function readItems(): PlannerItem[] { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.filter((item) => item && typeof item.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) : []; } catch { return []; } }

export default function FortunePlannerClient() {
  const params = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(today);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setItems(readItems()), []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent("cd:fortune-planner-updated")); } catch { setNotice("이 브라우저에서는 기기 저장을 사용할 수 없어요."); } }, [items]);
  useEffect(() => { if (params?.get("compose") === "1") requestAnimationFrame(() => inputRef.current?.focus()); }, [params]);
  const dayItems = useMemo(() => items.filter((item) => item.date === selectedDate).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [items, selectedDate]);
  const addItem = () => { const title = draft.trim(); if (!title) { inputRef.current?.focus(); return; } setItems((current) => [...current, { id: crypto.randomUUID(), title, date: selectedDate, done: false, createdAt: new Date().toISOString() }]); setDraft(""); setNotice("일정을 기기에 저장했어요."); };
  return <main className={styles.page}>
    <header className={styles.header}><a href="/" className={styles.back}>홈으로</a><span>오늘의 생활 운세</span><h1>운세 플래너</h1><p>일정과 해야 할 일을 한곳에서 가볍게 정리하세요.</p></header>
    <section className={styles.dateCard} aria-label="날짜 선택"><label htmlFor="planner-date">날짜</label><input id="planner-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /><strong>{displayDate(selectedDate)}</strong><small>이 일정은 이 기기에만 저장됩니다.</small></section>
    <section className={styles.composer} aria-label="빠른 일정 추가"><label htmlFor="planner-title">빠른 일정 추가</label><div><input ref={inputRef} id="planner-title" value={draft} maxLength={80} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addItem(); }} placeholder="예: 오후 3시, 중요한 연락 보내기" /><button type="button" onClick={addItem}>추가</button></div></section>
    <section className={styles.list} aria-live="polite"><div className={styles.listHead}><h2>오늘 일정</h2><span>{dayItems.length}개</span></div>{notice && <p role="status" className={styles.notice}>{notice}</p>}{dayItems.length === 0 ? <div className={styles.empty}><strong>아직 등록된 일정이 없어요.</strong><p>가장 먼저 끝내고 싶은 일부터 적어보세요.</p></div> : <ul>{dayItems.map((item) => <li key={item.id} className={item.done ? styles.done : ""}><button type="button" aria-label={`${item.title} ${item.done ? "미완료" : "완료"}로 변경`} onClick={() => setItems((current) => current.map((value) => value.id === item.id ? { ...value, done: !value.done } : value))}>{item.done ? "✓" : ""}</button><span>{item.title}</span><button type="button" aria-label={`${item.title} 삭제`} onClick={() => setItems((current) => current.filter((value) => value.id !== item.id))}>삭제</button></li>)}</ul>}</section>
  </main>;
}
