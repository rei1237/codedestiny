"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import styles from "./fortune-chat.module.css";
import { getApiBaseUrl } from "../_lib/api-config";

type Speaker = "assistant" | "user" | "system";
type Character = "yeoni" | "neo";
type Message = { id: string; speaker: Speaker; text: string; detail?: string; kind?: "reading" | "cta" | "progress" };
type Usage = { isLoggedIn: boolean; guestFreeRemaining: number; dailyFreeRemaining: number; conversationCreditsRemaining: number; canGenerate: boolean };
type Bootstrap = { session?: { sessionId?: string; messages?: Message[]; characterId?: Character; selectedTopic?: string }; usage?: Usage; fusion?: { ticketRemaining: number; canGenerate: boolean; nextAction: string } };

const TOPICS = ["연애와 인연", "재물과 직업", "인간관계", "가까운 미래", "마음과 선택", "종합적인 흐름"] as const;
const TOPIC_MAP: Record<string, string> = { "연애와 인연": "love", "재물과 직업": "money_work", "인간관계": "relationship", "가까운 미래": "daily", "마음과 선택": "mind", "종합적인 흐름": "decision" };
const CHARACTER_LABEL: Record<Character, string> = { yeoni: "연이", neo: "네오" };
const FLOWER_PIG_R2 = getAssetUrlFromPublicPath("/DestinyCafe/nobackground/flower-pig-cutout.webp", {
  baseUrl: "https://assets.code-destiny.com",
  fallbackPublicPath: "/images/fortune-tea-house/flower-pig-honey-hug.webp",
  prefix: "",
});
const FLOWER_PIG_FALLBACK = "/images/fortune-tea-house/flower-pig-honey-hug.webp";

function id() { return globalThis.crypto?.randomUUID?.() || `fortune-chat-${Date.now()}-${Math.random()}`; }
function welcome(): Message[] {
  return [{
    id: id(),
    speaker: "assistant",
    text: "안녕하세요, 연이예요. 마음에 걸리는 한 가지부터 들려주세요. 지금의 흐름과 다음 선택을 다정하게 함께 살펴볼게요.",
  }];
}

function YeoniImage({ className = "" }: { className?: string }) {
  return <img className={className} src={FLOWER_PIG_R2} alt="꽃을 단 꽃돼지 연이" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FLOWER_PIG_FALLBACK; }} />;
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
  const [character, setCharacter] = useState<Character>("yeoni");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const persistTimerRef = useRef<number | null>(null);

  const bootstrap = useCallback(async () => {
    const requestedSession = params?.get("session");
    const endpoint = requestedSession ? `${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(requestedSession)}` : `${apiBase}/api/fortune-chat/bootstrap`;
    const response = await fetch(endpoint, { credentials: "include" });
    const payload = await response.json().catch(() => null) as Bootstrap | null;
    if (!response.ok || !payload) throw new Error("상담방 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    if (payload.session?.sessionId) setSessionId(payload.session.sessionId);
    if (payload.usage) setUsage(payload.usage);
    if (payload.fusion) setFusion(payload.fusion);
    if (payload.session?.characterId === "neo") setCharacter("neo");
    else if (payload.session?.characterId) setCharacter("yeoni");
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

  const usageLabel = usage
    ? usage.isLoggedIn
      ? `무료 상담 ${Math.max(0, usage.dailyFreeRemaining)}회 남음`
      : usage.guestFreeRemaining > 0 ? "첫 상담을 무료로 시작할 수 있어요" : "로그인하고 상담을 이어갈 수 있어요"
    : "상담 가능 여부를 확인하는 중";

  const send = async () => {
    const concern = question.trim();
    if (busy) return;
    if (!topic && !concern) { setError("궁금한 분야를 고르거나, 직접 질문을 적어 주세요."); return; }
    const requestId = id();
    const label = concern || topic;
    setBusy(true); setError("");
    append([{ id: requestId, speaker: "user", text: label }], topic);
    try {
      const response = await fetch(`${apiBase}/api/fortune/guardian/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({ requestId, topic: TOPIC_MAP[topic] || "decision", mode: character === "neo" ? "neo" : "yeoni", concern: concern || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "상담 결과를 준비하지 못했어요.");
      const result = payload.result || {};
      append([
        { id: id(), speaker: "assistant", kind: "reading", text: result.openingLine || "지금의 흐름을 차분히 읽고 있어요.", detail: result.coreReading || result.topicAdvice || "결과를 정리하고 있어요." },
        { id: id(), speaker: "assistant", kind: "reading", text: "지금 해볼 한 가지", detail: result.luckyAction || "작은 선택 하나부터 가볍게 시작해 보세요." },
        { id: id(), speaker: "assistant", kind: "cta", text: "이 고민을 더 넓은 흐름까지 이어 볼까요?", detail: "초융합 심층 리딩은 사주·자미두수·베다점·숙요점·점성술·타로의 공통 신호와 차이를 한 번에 연결해, 반복되는 패턴과 다음 시기의 선택 기준을 정리합니다." },
      ]);
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

  const selectTopic = (nextTopic: string) => {
    setTopic(nextTopic);
    setQuestion((current) => current || nextTopic);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startNewChat = () => {
    const next = welcome();
    setMessages(next);
    persist(next, "");
    setTopic("");
    setQuestion("");
    setError("");
  };

  return <main className={styles.room} data-character={character}>
    <header className={styles.header}>
      <button className={styles.backButton} type="button" onClick={() => router.back()} aria-label="이전 페이지로 이동">←</button>
      <div className={styles.brand}><YeoniImage className={styles.brandPig} /><div><strong>연이 운명 상담</strong><span>작은 마음부터 천천히 살펴봐요</span></div></div>
      <button className={styles.resetButton} type="button" aria-label="새 상담 시작" onClick={startNewChat}>새 상담</button>
    </header>

    <div className={styles.timeline} ref={timelineRef} aria-live="polite" aria-relevant="additions">
      <section className={styles.welcomeCard} aria-labelledby="fortuneChatWelcomeTitle">
        <div><p>달빛 찻집의 편지함</p><h1 id="fortuneChatWelcomeTitle">오늘, 무엇이 가장 마음에 남나요?</h1><span>한 가지 질문으로 시작해 현재의 흐름과 다음 선택을 함께 정리해요.</span></div>
        <YeoniImage className={styles.welcomePig} />
      </section>
      <section className={styles.characterPicker} aria-label="상담자 선택">
        {(["yeoni", "neo"] as Character[]).map((item) => <button key={item} type="button" aria-pressed={character === item} onClick={() => setCharacter(item)}>
          <span>{item === "yeoni" ? "🌸" : "✦"}</span><strong>{CHARACTER_LABEL[item]}</strong><small>{item === "yeoni" ? "꽃돼지 모습의 연이" : "핵심을 짚는 네오"}</small>
        </button>)}
      </section>
      {messages.map((message) => <article key={message.id} className={`${styles.message} ${styles[message.speaker]} ${message.kind ? styles[message.kind] : ""}`}>
        {message.speaker === "assistant" ? <span className={styles.messageAvatar} aria-hidden>🌸</span> : null}
        <div className={styles.bubble}><p>{message.text}</p>{message.detail && <details><summary>자세히 보기</summary><p>{message.detail}</p></details>}
          {message.kind === "cta" && <div className={styles.actions}><button type="button" onClick={beginFusion}>초융합 심층 리딩 이어가기 <span aria-hidden>→</span></button><button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}>여기까지 볼게요</button></div>}
        </div>
      </article>)}
      {busy && <article className={`${styles.message} ${styles.assistant}`}><span className={styles.messageAvatar} aria-hidden>🌸</span><p className={styles.typing}><i /><i /><i /><span>{CHARACTER_LABEL[character]}가 답을 정리하고 있어요</span></p></article>}
      {fusion?.ticketRemaining ? <p className={styles.ticketStatus}>초융합 상담권 {fusion.ticketRemaining}회가 준비되어 있어요.</p> : null}
    </div>

    <section className={styles.composer} aria-label="상담 입력">
      <p className={styles.policy}>{usageLabel}</p>
      <div className={styles.chips} aria-label="추천 질문 분야">{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => selectTopic(item)}>{item}</button>)}</div>
      <div className={styles.input}><input ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) void send(); }} placeholder="마음에 남은 질문을 적어 주세요" aria-label="상담 질문 입력" disabled={busy} /><button type="button" onClick={() => void send()} disabled={busy}>{busy ? "정리 중" : "보내기"}</button></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  </main>;
}
