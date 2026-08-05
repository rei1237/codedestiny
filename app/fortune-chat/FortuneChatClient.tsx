"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./fortune-chat.module.css";
import { getApiBaseUrl } from "../_lib/api-config";

type Speaker = "assistant" | "user" | "system";
type Character = "flower_pig" | "yeoni" | "neo";
type Message = { id: string; speaker: Speaker; text: string; detail?: string; kind?: "reading" | "cta" | "progress" };
type Usage = { isLoggedIn: boolean; guestFreeRemaining: number; accountFreeRemaining: number; conversationCreditsRemaining: number; canGenerate: boolean };
type Bootstrap = { session?: { sessionId?: string; messages?: Message[]; characterId?: Character; selectedTopic?: string }; usage?: Usage; fusion?: { ticketRemaining: number; canGenerate: boolean; nextAction: string } };

const TOPICS = ["연애와 인연", "재물과 직업", "인간관계", "가까운 미래", "마음과 선택", "종합적인 흐름"] as const;
const TOPIC_MAP: Record<string, string> = { "연애와 인연": "love", "재물과 직업": "money_work", 인간관계: "relationship", "가까운 미래": "daily", "마음과 선택": "mind", "종합적인 흐름": "decision" };
const CHARACTER_LABEL: Record<Character, string> = { flower_pig: "꽃돼지", yeoni: "연이", neo: "네오" };

function id() { return globalThis.crypto?.randomUUID?.() || `fortune-chat-${Date.now()}-${Math.random()}`; }
function welcome(): Message[] {
  return [
    { id: id(), speaker: "assistant", text: "안녕하세요, 꽃돼지예요. 한 가지 고민에서 시작해 지금의 흐름과 다음 선택을 함께 살펴볼게요." },
    { id: id(), speaker: "system", text: "비회원 1회 · 계정당 총 3회 무료", detail: "무료 횟수는 매일 초기화되지 않아요." },
  ];
}

export default function FortuneChatClient() {
  const apiBase = getApiBaseUrl();
  const router = useRouter();
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(welcome);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [fusion, setFusion] = useState<Bootstrap["fusion"]>();
  const [topic, setTopic] = useState(params?.get("topic") || "");
  const [question, setQuestion] = useState("");
  const [character, setCharacter] = useState<Character>("flower_pig");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<number | null>(null);

  const bootstrap = useCallback(async () => {
    const requestedSession = params?.get("session");
    const endpoint = requestedSession ? `${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(requestedSession)}` : `${apiBase}/api/fortune-chat/bootstrap`;
    const response = await fetch(endpoint, { credentials: "include" });
    const payload = await response.json().catch(() => null) as Bootstrap | null;
    if (!response.ok || !payload) throw new Error("상담방 정보를 불러오지 못했어요.");
    if (payload.session?.sessionId) setSessionId(payload.session.sessionId);
    if (payload.usage) setUsage(payload.usage);
    if (payload.fusion) setFusion(payload.fusion);
    if (payload.session?.characterId) setCharacter(payload.session.characterId);
    if (payload.session?.selectedTopic) setTopic(payload.session.selectedTopic);
    if (payload.session?.messages?.length) setMessages(payload.session.messages);
  }, [apiBase, params]);

  useEffect(() => { void bootstrap().catch((reason) => setError(reason instanceof Error ? reason.message : "상담방을 열지 못했어요.")); }, [bootstrap]);
  useEffect(() => { timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); }, []);

  const persist = useCallback((nextMessages: Message[], nextTopic = topic) => {
    if (!sessionId) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      void fetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-80), selectedTopic: nextTopic }),
      });
    }, 180);
  }, [apiBase, sessionId, topic]);

  const append = useCallback((items: Message[], nextTopic = topic) => {
    setMessages((current) => { const next = [...current, ...items]; persist(next, nextTopic); return next; });
  }, [persist, topic]);

  const freeRemaining = usage?.isLoggedIn ? usage.accountFreeRemaining : usage?.guestFreeRemaining;
  const policy = usage?.isLoggedIn
    ? `무료 상담 3회 중 ${Math.max(0, freeRemaining || 0)}회가 남았어요.`
    : "회원가입 없이 1회 무료로 체험할 수 있어요.";

  const send = async (selectedTopic = topic) => {
    const concern = question.trim();
    if (busy) return;
    if (!selectedTopic && !concern) { setError("먼저 고민 주제를 고르거나 질문을 적어 주세요."); return; }
    const requestId = id();
    const label = concern || selectedTopic;
    setBusy(true); setError("");
    append([{ id: requestId, speaker: "user", text: label }], selectedTopic);
    try {
      const response = await fetch(`${apiBase}/api/fortune/guardian/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({ requestId, topic: TOPIC_MAP[selectedTopic] || "decision", mode: character === "neo" ? "neo" : "yeoni", concern: concern || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "상담 결과를 준비하지 못했어요.");
      const result = payload.result || {};
      append([
        { id: id(), speaker: "assistant", kind: "reading", text: result.openingLine || "지금의 흐름을 차분히 읽고 있어요.", detail: result.coreReading || result.topicAdvice || "결과를 정리하고 있어요." },
        { id: id(), speaker: "assistant", kind: "reading", text: "오늘의 한걸음", detail: result.luckyAction || "하나의 선택을 작게 시작해 보세요." },
        { id: id(), speaker: "assistant", kind: "cta", text: "지금 답변은 현재 고민을 중심으로 가볍게 살펴본 결과예요.", detail: "사주·자미두수·베다점·숙요점·점성술의 흐름을 연결하면 반복되는 이유와 앞으로의 시기까지 더 깊게 볼 수 있어요." },
      ], selectedTopic);
      setQuestion("");
      await bootstrap();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "상담을 다시 시도해 주세요.");
    } finally { setBusy(false); }
  };

  const beginFusion = () => {
    if (!sessionId) { setError("상담방을 준비한 뒤 다시 시도해 주세요."); return; }
    router.push(`/fusion-fortune?fortuneChatSession=${encodeURIComponent(sessionId)}&topic=${encodeURIComponent(TOPIC_MAP[topic] || "decision")}`);
  };

  return <main className={styles.room}>
    <header className={styles.header}>
      <button type="button" onClick={() => router.back()} aria-label="이전 페이지로 이동">←</button>
      <div><strong>꽃돼지 운명상담</strong><span>{CHARACTER_LABEL[character]}와 함께 흐름을 살펴보고 있어요</span></div>
      <button type="button" aria-label="새 상담 시작" onClick={() => { const next = welcome(); setMessages(next); persist(next, ""); setTopic(""); }}>새 상담</button>
    </header>
    <div className={styles.timeline} ref={timelineRef} aria-live="polite" aria-relevant="additions">
      <section className={styles.characterPicker} aria-label="상담 스타일 선택">
        {(["flower_pig", "yeoni", "neo"] as Character[]).map((item) => <button key={item} type="button" aria-pressed={character === item} onClick={() => setCharacter(item)}>{CHARACTER_LABEL[item]}{item === "flower_pig" ? " · 균형" : item === "yeoni" ? " · 다정" : " · 현실"}</button>)}
      </section>
      {messages.map((message) => <article key={message.id} className={`${styles.message} ${styles[message.speaker]} ${message.kind ? styles[message.kind] : ""}`}>
        <p>{message.text}</p>{message.detail && <details open={message.kind === "reading"}><summary>자세히 보기</summary><p>{message.detail}</p></details>}
        {message.kind === "cta" && <div className={styles.actions}><button type="button" onClick={beginFusion}>초융합 심층 리딩 이어가기</button><button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}>무료 상담만 마치기</button></div>}
      </article>)}
      {busy && <p className={styles.typing}>{CHARACTER_LABEL[character]}가 답을 정리하고 있어요…</p>}
      {fusion?.ticketRemaining ? <p className={styles.ticketStatus}>초융합 상담권 {fusion.ticketRemaining}회가 준비되어 있어요.</p> : null}
    </div>
    <section className={styles.composer} aria-label="상담 입력">
      <p className={styles.policy}>{policy}<small>매일 초기화되지 않아요.</small></p>
      <div className={styles.chips}>{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => { setTopic(item); void send(item); }}>{item}</button>)}</div>
      <div className={styles.input}><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="직접 질문하기" aria-label="상담 질문 입력" disabled={busy}/><button type="button" onClick={() => void send()} disabled={busy}>{busy ? "정리 중" : "전송"}</button></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  </main>;
}
