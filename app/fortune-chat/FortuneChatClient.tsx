"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./fortune-chat.module.css";
import { getApiBaseUrl } from "../_lib/api-config";

type Speaker = "assistant" | "user" | "system";
type Message = { id: string; speaker: Speaker; text: string; detail?: string; kind?: "reading" | "cta" | "progress" };
type Usage = { isLoggedIn: boolean; guestFreeRemaining?: number; dailyFreeRemaining?: number; paidCreditsRemaining?: number; canGenerate?: boolean };
const TOPICS = ["연애와 인연", "재물과 직업", "인간관계", "가까운 미래", "마음과 선택", "종합적인 흐름"];
const TOPIC_MAP: Record<string, string> = { "연애와 인연": "love", "재물과 직업": "money_work", 인간관계: "relationship", "가까운 미래": "daily", "마음과 선택": "mind", "종합적인 흐름": "decision" };
const SESSION_KEY = "cdFlowerPigFortuneChatV1";

function id() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function firstMessages(): Message[] {
  return [
    { id: id(), speaker: "assistant", text: "안녕하세요, 꽃돼지예요. 오늘의 마음부터 더 깊은 운명의 흐름까지 함께 살펴볼게요." },
    { id: id(), speaker: "system", text: "비회원 1회 · 계정당 총 3회 무료", detail: "무료 횟수는 매일 초기화되지 않아요." },
  ];
}

export default function FortuneChatClient() {
  const apiBase = getApiBaseUrl();
  const router = useRouter();
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(firstMessages);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [topic, setTopic] = useState(params?.get("topic") || "");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const mergeStartedRef = useRef(false);

  const refreshUsage = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/fortune/guardian/usage`, { credentials: "include" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error("상담 가능 횟수를 확인하지 못했어요.");
    setUsage(payload);
  }, [apiBase]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(SESSION_KEY);
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch { /* ignore an expired client draft */ }
    const requestedSession = params?.get("session");
    const bootstrapUrl = requestedSession ? `${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(requestedSession)}` : `${apiBase}/api/fortune-chat/bootstrap`;
    void fetch(bootstrapUrl, { credentials: "include" }).then((response) => response.json()).then((payload) => {
      if (payload?.session?.sessionId) setSessionId(payload.session.sessionId);
      if (payload?.usage) setUsage(payload.usage);
      else void refreshUsage().catch(() => undefined);
      if (Array.isArray(payload?.session?.messages) && payload.session.messages.length) setMessages(payload.session.messages);
    }).catch(() => void refreshUsage().catch((reason) => setError(reason.message)));
  }, [refreshUsage]);
  useEffect(() => { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (sessionId) void fetch(`${apiBase}/api/fortune-chat/sessions/${sessionId}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, selectedTopic: topic }) }); }, [apiBase, messages, sessionId, topic]);
  useEffect(() => {
    if (!usage?.isLoggedIn || mergeStartedRef.current) return;
    mergeStartedRef.current = true;
    void fetch(`${apiBase}/api/fortune/guardian/merge-anonymous`, { method: "POST", credentials: "include" })
      .then(() => refreshUsage())
      .catch(() => undefined);
  }, [apiBase, refreshUsage, usage?.isLoggedIn]);
  useEffect(() => { timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const remaining = usage?.isLoggedIn ? usage.dailyFreeRemaining ?? 0 : usage?.guestFreeRemaining ?? 0;
  const send = async (selectedTopic = topic) => {
    const trimmed = question.trim();
    if (!selectedTopic && !trimmed) { setError("먼저 고민 주제를 골라 주세요."); return; }
    if (busy) return;
    setBusy(true); setError("");
    const label = trimmed || selectedTopic;
    const requestId = id();
    setMessages((current) => [...current, { id: requestId, speaker: "user", text: label }]);
    try {
      const response = await fetch(`${apiBase}/api/fortune/guardian/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({ requestId, topic: TOPIC_MAP[selectedTopic] || "decision", mode: "yeoni", concern: trimmed || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "상담 결과를 준비하지 못했어요.");
      const result = payload.result;
      setMessages((current) => [...current,
        { id: id(), speaker: "assistant", kind: "reading", text: result.openingLine || "지금의 흐름을 차분히 읽고 있어요.", detail: result.coreReading || result.topicAdvice },
        { id: id(), speaker: "assistant", kind: "reading", text: "오늘의 한걸음", detail: result.luckyAction || "한 가지를 천천히 정리해 보세요." },
        { id: id(), speaker: "assistant", kind: "cta", text: "지금 답변은 현재 고민을 중심으로 가볍게 살펴본 결과예요.", detail: "사주·자미두수·베다점·숙요점·점성술의 흐름을 함께 연결하면 반복되는 이유와 앞으로의 시기까지 더 깊게 볼 수 있어요." },
      ]);
      setQuestion(""); await refreshUsage();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "상담을 다시 시도해 주세요."); }
    finally { setBusy(false); }
  };

  const beginFusion = () => {
    window.sessionStorage.setItem("cdGuardianFusionHandoffV1", JSON.stringify({ version: 1, source: "guardian", topic: TOPIC_MAP[topic] || "daily", category: "saju", createdAt: Date.now() }));
    router.push(`/fusion-fortune${sessionId ? `?fortuneChatSession=${encodeURIComponent(sessionId)}` : ""}`);
  };
  return <main className={styles.room}>
    <header className={styles.header}><button type="button" onClick={() => router.back()} aria-label="이전 페이지로 이동">←</button><div><strong>꽃돼지 운명상담</strong><span>운명의 흐름을 함께 살펴보고 있어요</span></div><button type="button" aria-label="새 상담 시작" onClick={() => setMessages(firstMessages())}>새 상담</button></header>
    <div className={styles.timeline} ref={timelineRef} aria-live="polite" aria-relevant="additions">
      {messages.map((message) => <article key={message.id} className={`${styles.message} ${styles[message.speaker]} ${message.kind ? styles[message.kind] : ""}`}><p>{message.text}</p>{message.detail && <details open={message.kind === "reading"}><summary>자세히 보기</summary><p>{message.detail}</p></details>}{message.kind === "cta" && <div className={styles.actions}><button type="button" onClick={beginFusion}>초융합 심층 리딩 이어가기</button><button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}>무료 상담만 마치기</button></div>}</article>)}
      {busy && <p className={styles.typing}>꽃돼지가 답을 정리하고 있어요…</p>}
    </div>
    <section className={styles.composer} aria-label="상담 입력"><p className={styles.policy}>{usage?.isLoggedIn ? `무료 상담 3회 중 ${remaining}회가 남았어요.` : "회원가입 없이 1회 무료로 체험할 수 있어요."}<small>매일 초기화되지 않아요.</small></p><div className={styles.chips}>{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => { setTopic(item); void send(item); }}>{item}</button>)}</div><div className={styles.input}><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="직접 질문하기" aria-label="상담 질문 입력" disabled={busy}/><button type="button" onClick={() => void send()} disabled={busy}>{busy ? "정리 중" : "전송"}</button></div>{error && <p className={styles.error} role="alert">{error}</p>}</section>
  </main>;
}
