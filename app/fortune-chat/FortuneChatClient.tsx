"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import { PriceBadge } from "@/app/components/PriceBadge";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import styles from "./fortune-chat.module.css";
import { getApiBaseUrl } from "../_lib/api-config";

type Speaker = "assistant" | "user" | "system";
type Character = "yeoni" | "neo";
type Category = "saju" | "ziwei" | "vedic" | "sukuyo" | "astrology" | "tarot";
type Message = { id: string; speaker: Speaker; text: string; detail?: string; kind?: "reading" | "cta" | "progress" };
type Usage = {
  isLoggedIn: boolean;
  guestFreeRemaining: number;
  dailyFreeRemaining: number;
  canGenerate: boolean;
  nextAction?: string;
  paidFeatureKey?: string;
};
type Bootstrap = {
  session?: { sessionId?: string; messages?: Message[]; characterId?: Character; selectedTopic?: string };
  usage?: Usage;
  fusion?: { canGenerate: boolean; nextAction: string };
};
type Birth = { birthDate: string; birthTime: string; calendarType: "solar" | "lunar"; gender: "female" | "male" | "unknown" };

/** 무료 소진 이후의 회당 결제. 가격 정본은 worker/lib/paid-feature-registry.js. */
const PAID_FEATURE_KEY = "fortune-chat-consultation";
const PAID_COIN_PRICE = 50;
const PAID_AMOUNT_KRW = 5000;
/** 서버 검증 상한과 같은 값 — 넘겨 보내면 400 으로 되돌아온다. */
const CONCERN_MAX_LENGTH = 120;

const TOPICS = ["연애와 인연", "재물과 직업", "인간관계", "가까운 미래", "마음과 선택", "종합적인 흐름"] as const;
const TOPIC_MAP: Record<string, string> = { "연애와 인연": "love", "재물과 직업": "money_work", "인간관계": "relationship", "가까운 미래": "daily", "마음과 선택": "mind", "종합적인 흐름": "decision" };

/**
 * 서버는 상담 체계를 하나만 받고, 고르지 않으면 400 으로 막는다.
 * 사용자가 직접 고르기 전까지는 주제에 가장 가까운 체계를 기본값으로 쓴다 — 대화 흐름을
 * 체계 선택 화면으로 끊지 않기 위해서다.
 */
const CATEGORY_LABEL: Record<Category, string> = { saju: "사주", ziwei: "자미두수", vedic: "베다점", sukuyo: "숙요점", astrology: "점성술", tarot: "타로" };
const CATEGORY_BY_TOPIC: Record<string, Category> = {
  love: "sukuyo",
  relationship: "sukuyo",
  money_work: "saju",
  daily: "tarot",
  mind: "astrology",
  decision: "ziwei",
};

const CHARACTER_LABEL: Record<Character, string> = { yeoni: "연이", neo: "네오" };
const FLOWER_PIG_R2 = getAssetUrlFromPublicPath("/DestinyCafe/nobackground/flower-pig-cutout.webp", {
  baseUrl: "https://assets.code-destiny.com",
  fallbackPublicPath: "/images/fortune-tea-house/flower-pig-honey-hug.webp",
  prefix: "",
});
const FLOWER_PIG_FALLBACK = "/images/fortune-tea-house/flower-pig-honey-hug.webp";

function id() { return globalThis.crypto?.randomUUID?.() || `fortune-chat-${Date.now()}-${Math.random()}`; }

/** 결제 게이트와 생성 요청이 **같은 requestId** 를 써야 서버가 증빙을 찾는다. */
function makeRequestId() { return `${PAID_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

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
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const [messages, setMessages] = useState<Message[]>(welcome);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [topic, setTopic] = useState(params?.get("topic") || "");
  const [category, setCategory] = useState<Category | "">("");
  const [question, setQuestion] = useState("");
  const [character, setCharacter] = useState<Character>("yeoni");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [birth, setBirth] = useState<Birth>({ birthDate: "", birthTime: "", calendarType: "solar", gender: "unknown" });
  const [birthOpen, setBirthOpen] = useState(false);
  const birthTouchedRef = useRef(false);
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
    if (payload.session?.characterId === "neo") setCharacter("neo");
    else if (payload.session?.characterId) setCharacter("yeoni");
    if (payload.session?.selectedTopic) setTopic(payload.session.selectedTopic);
    if (payload.session?.messages?.length) setMessages(payload.session.messages);
  }, [apiBase, params]);

  useEffect(() => { void bootstrap().catch((reason) => setError(reason instanceof Error ? reason.message : "상담방을 열지 못했어요.")); }, [bootstrap]);
  useEffect(() => { timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); }, []);

  // 프로필 카드에서 생년 정보를 채운다(공용 훅 재사용). 사용자가 직접 건드린 뒤에는 덮지 않는다.
  useEffect(() => {
    if (!profileSeed || birthTouchedRef.current) return;
    setBirth((previous) => ({
      birthDate: previous.birthDate || profileSeed.birthDate || "",
      birthTime: previous.birthTime || (profileSeed.birthTimeUnknown ? "" : profileSeed.birthTime || ""),
      calendarType: previous.calendarType === "lunar" ? "lunar" : (profileSeed.calendarType || previous.calendarType),
      gender: previous.gender !== "unknown" ? previous.gender : (profileSeed.gender === "female" || profileSeed.gender === "male" ? profileSeed.gender : "unknown"),
    }));
  }, [profileSeed, seedVersion]);

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

  const topicKey = TOPIC_MAP[topic] || "decision";
  const activeCategory: Category = category || CATEGORY_BY_TOPIC[topicKey] || "saju";
  const freeRemaining = usage ? (usage.isLoggedIn ? usage.dailyFreeRemaining : usage.guestFreeRemaining) : 0;
  const needsPayment = Boolean(usage?.isLoggedIn) && freeRemaining <= 0;

  const usageLabel = useMemo(() => {
    if (!usage) return "상담 가능 여부를 확인하는 중";
    if (!usage.isLoggedIn) return usage.guestFreeRemaining > 0 ? "첫 상담을 무료로 시작할 수 있어요" : "로그인하면 3회까지 무료로 이어갈 수 있어요";
    return usage.dailyFreeRemaining > 0 ? `무료 상담 ${usage.dailyFreeRemaining}회 남음` : "무료 상담을 모두 사용했어요";
  }, [usage]);

  /** 결제 게이트. 이용권 보유자는 여기서 결제 없이 통과한다. */
  const openPaymentGate = useCallback(async (requestId: string) => {
    const gate = await ensurePaidAccess({
      featureKey: PAID_FEATURE_KEY,
      coinPrice: PAID_COIN_PRICE,
      amountKRW: PAID_AMOUNT_KRW,
      reason: "연이 운명 상담 1회",
      requestId,
    });
    if (gate.ok) return { ok: true as const };
    if (gate.code === "AUTH_REQUIRED") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.setTimeout(() => { window.location.href = `/login?next=${next}`; }, 600);
      return { ok: false as const, message: "로그인이 필요해요. 로그인 화면으로 이동할게요." };
    }
    if (gate.code === "PAYMENT_CANCELLED") return { ok: false as const, message: "" };
    return { ok: false as const, message: gate.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }, [ensurePaidAccess]);

  const requestReading = useCallback(async (requestId: string, concern: string) => {
    const response = await fetch(`${apiBase}/api/fortune/guardian/generate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
      body: JSON.stringify({
        requestId,
        birthDate: birth.birthDate,
        ...(birth.birthTime ? { birthTime: birth.birthTime } : {}),
        calendarType: birth.calendarType,
        gender: birth.gender,
        category: activeCategory,
        topic: topicKey,
        mode: character === "neo" ? "neo" : "yeoni",
        ...(concern ? { concern } : {}),
      }),
    });
    const payload = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, payload };
  }, [apiBase, birth, activeCategory, topicKey, character]);

  const send = async () => {
    if (busy || isPaying) return;
    const concern = question.trim().slice(0, CONCERN_MAX_LENGTH);
    if (!topic && !concern) { setError("궁금한 분야를 고르거나, 직접 질문을 적어 주세요."); return; }
    if (!birth.birthDate) {
      setBirthOpen(true);
      setError("생년월일을 알려주시면 그 명식으로 흐름을 읽어드릴게요.");
      return;
    }

    setBusy(true); setError(""); setNotice("");
    const label = concern || topic;
    append([{ id: id(), speaker: "user", text: label }], topic);

    try {
      let requestId = makeRequestId();

      // 무료가 남지 않은 게 이미 확실하면 서버를 한 번 헛돌리지 않고 바로 결제창을 연다.
      if (needsPayment) {
        const gate = await openPaymentGate(requestId);
        if (!gate.ok) { if (gate.message) setError(gate.message); return; }
      }

      let attempt = await requestReading(requestId, concern);

      // 스냅샷이 낡아 무료가 남은 줄 알았던 경우. 새 requestId 로 결제하고 그 id 로 재요청한다
      // (앞선 requestId 는 결제 증빙이 없어 재사용할 수 없다).
      if (attempt.status === 402) {
        requestId = makeRequestId();
        const gate = await openPaymentGate(requestId);
        if (!gate.ok) { if (gate.message) setError(gate.message); return; }
        attempt = await requestReading(requestId, concern);
      }

      if (attempt.status === 503 && attempt.payload?.retryable) {
        setError(attempt.payload?.message || "잠시 후 다시 시도해 주세요. 이미 결제하셨다면 추가 결제 없이 이어집니다.");
        return;
      }
      if (!attempt.ok || !attempt.payload?.ok) throw new Error(attempt.payload?.message || "상담 결과를 준비하지 못했어요.");

      const result = attempt.payload.result || {};
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
    router.push(`/fusion-fortune?fortuneChatSession=${encodeURIComponent(sessionId)}&topic=${encodeURIComponent(topicKey)}`);
  };

  const selectTopic = (nextTopic: string) => {
    setTopic(nextTopic);
    setQuestion((current) => current || nextTopic);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const editBirth = (patch: Partial<Birth>) => {
    birthTouchedRef.current = true;
    setBirth((current) => ({ ...current, ...patch }));
  };

  const startNewChat = () => {
    const next = welcome();
    setMessages(next);
    persist(next, "");
    setTopic("");
    setCategory("");
    setQuestion("");
    setError("");
    setNotice("");
  };

  const busyLabel = isPaying ? "결제를 확인하고 있어요" : `${CHARACTER_LABEL[character]}가 답을 정리하고 있어요`;

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
      {(busy || isPaying) && <article className={`${styles.message} ${styles.assistant}`}><span className={styles.messageAvatar} aria-hidden>🌸</span><p className={styles.typing}><i /><i /><i /><span>{busyLabel}</span></p></article>}
      {notice && <p className={styles.ticketStatus} role="status">{notice}</p>}
    </div>

    <section className={styles.composer} aria-label="상담 입력">
      <div className={styles.policyRow}>
        <p className={styles.policy}>{usageLabel}</p>
        {needsPayment && <PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel="5,000원" prefix="1회 " className={styles.priceBadge} />}
      </div>

      <details className={styles.birthPanel} open={birthOpen} onToggle={(event) => setBirthOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary>{birth.birthDate ? `생년 정보 ${birth.birthDate}${birth.birthTime ? ` ${birth.birthTime}` : " · 시간 모름"}` : "생년 정보를 알려주세요"}</summary>
        <div className={styles.birthGrid}>
          <label>생년월일<input type="date" value={birth.birthDate} onChange={(event) => editBirth({ birthDate: event.target.value })} /></label>
          <label>태어난 시각 <em>(모르면 비워두세요)</em><input type="time" value={birth.birthTime} onChange={(event) => editBirth({ birthTime: event.target.value })} /></label>
          <label>달력<select value={birth.calendarType} onChange={(event) => editBirth({ calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}><option value="solar">양력</option><option value="lunar">음력</option></select></label>
          <label>성별 <em>(선택)</em><select value={birth.gender} onChange={(event) => editBirth({ gender: event.target.value as Birth["gender"] })}><option value="unknown">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label>
        </div>
        <button className={styles.birthReload} type="button" onClick={() => { birthTouchedRef.current = false; void reloadProfileSeed(); }}>저장한 프로필에서 불러오기</button>
      </details>

      <div className={styles.chips} aria-label="추천 질문 분야">{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => selectTopic(item)}>{item}</button>)}</div>
      <div className={styles.chips} aria-label="상담 체계 선택">{(Object.keys(CATEGORY_LABEL) as Category[]).map((item) => <button key={item} type="button" aria-pressed={activeCategory === item} onClick={() => setCategory(item)}>{CATEGORY_LABEL[item]}</button>)}</div>
      <div className={styles.input}>
        <input ref={inputRef} value={question} maxLength={CONCERN_MAX_LENGTH} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) void send(); }} placeholder="마음에 남은 질문을 적어 주세요" aria-label="상담 질문 입력" disabled={busy || isPaying} />
        <button type="button" onClick={() => void send()} disabled={busy || isPaying}>{busy || isPaying ? "정리 중" : "보내기"}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  </main>;
}
