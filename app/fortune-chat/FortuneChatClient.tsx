"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PriceBadge } from "@/app/components/PriceBadge";
import { PersonaAvatar } from "./PersonaAvatar";
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
const CHARACTER_BLURB: Record<Character, string> = { yeoni: "꽃돼지 모습의 연이", neo: "핵심을 짚는 백사자 네오" };
const CHARACTER_GREETING: Record<Character, string> = {
  yeoni: "안녕하세요, 연이예요. 마음에 걸리는 한 가지부터 들려주세요. 지금의 흐름과 다음 선택을 다정하게 함께 살펴볼게요.",
  neo: "네오다. 돌려 말하지 않는다. 무엇을 정하지 못하고 있는지부터 말해라. 판세와 다음 수순을 정리해 주지.",
};

function id() { return globalThis.crypto?.randomUUID?.() || `fortune-chat-${Date.now()}-${Math.random()}`; }

/** 결제 게이트와 생성 요청이 **같은 requestId** 를 써야 서버가 증빙을 찾는다. */
function makeRequestId() { return `${PAID_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function welcome(character: Character = "yeoni"): Message[] {
  return [{ id: id(), speaker: "assistant", text: CHARACTER_GREETING[character] }];
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
  /** 상담자가 제안한 다음 질문. 채팅이 한 턴으로 끝나지 않게 하는 동력이다. */
  const [followUps, setFollowUps] = useState<string[]>([]);
  const birthTouchedRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const persistTimerRef = useRef<number | null>(null);
  // 요청 시점의 최신 대화를 읽되 requestReading 을 매 메시지마다 새로 만들지 않기 위한 참조.
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

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
    // 최근 6턴만 보낸다. 서버가 개수·길이·민감정보를 다시 조이므로 여기서는 형태만 맞춘다.
    const recentTurns = messagesRef.current
      .slice(-6)
      .map((message) => ({ speaker: message.speaker === "assistant" ? "assistant" : "user", text: message.detail ? `${message.text} ${message.detail}` : message.text }));
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
        ...(recentTurns.length ? { recentTurns } : {}),
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
      const evidence = Array.isArray(result.evidenceLines) ? result.evidenceLines : [];
      append([
        { id: id(), speaker: "assistant", kind: "reading", text: result.openingLine || "지금의 흐름을 차분히 읽고 있어요.", detail: [result.innerState, result.coreReading, result.topicAdvice].filter(Boolean).join("\n\n") || "결과를 정리하고 있어요." },
        ...(result.cautionPattern ? [{ id: id(), speaker: "assistant" as const, kind: "reading" as const, text: "조심해서 볼 반복 패턴", detail: result.cautionPattern }] : []),
        { id: id(), speaker: "assistant", kind: "reading", text: "지금 해볼 한 가지", detail: [result.luckyAction, evidence.length ? `읽은 근거\n${evidence.map((line: string) => `· ${line}`).join("\n")}` : ""].filter(Boolean).join("\n\n") || "작은 선택 하나부터 가볍게 시작해 보세요." },
        { id: id(), speaker: "assistant", kind: "cta", text: "이 고민을 더 넓은 흐름까지 이어 볼까요?", detail: "초융합 심층 리딩은 사주·자미두수·베다점·숙요점·점성술·타로의 공통 신호와 차이를 한 번에 연결해, 반복되는 패턴과 다음 시기의 선택 기준을 정리합니다." },
      ]);
      setFollowUps(Array.isArray(result.followUpQuestions) ? result.followUpQuestions.slice(0, 3) : []);
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

  /**
   * 상담자를 바꾼다. 아직 대화가 시작되지 않았으면 인사말도 그 상담자의 것으로 갈아준다 —
   * 네오를 골랐는데 연이의 인사가 남아 있으면 누가 답하는지 알 수 없다.
   */
  const switchCharacter = (next: Character) => {
    setCharacter(next);
    setMessages((current) => (current.length === 1 && current[0].speaker === "assistant" ? welcome(next) : current));
  };

  const startNewChat = () => {
    const next = welcome(character);
    setMessages(next);
    persist(next, "");
    setTopic("");
    setCategory("");
    setQuestion("");
    setError("");
    setNotice("");
    setFollowUps([]);
  };

  const busyLabel = isPaying ? "결제를 확인하고 있어요" : `${CHARACTER_LABEL[character]}가 답을 정리하고 있어요`;

  return <main className={styles.room} data-character={character}>
    <header className={styles.header}>
      <button className={styles.backButton} type="button" onClick={() => router.back()} aria-label="이전 페이지로 이동">←</button>
      <div className={styles.brand}>
        <PersonaAvatar persona={character} mood="greet" size="sm" decorative />
        <div><strong>{CHARACTER_LABEL[character]} 운명 상담</strong><span>{character === "neo" ? "판세부터 정리해 드릴게요" : "작은 마음부터 천천히 살펴봐요"}</span></div>
      </div>
      <button className={styles.resetButton} type="button" aria-label="새 상담 시작" onClick={startNewChat}>새 상담</button>
    </header>

    <div className={styles.timeline} ref={timelineRef} aria-live="polite" aria-relevant="additions">
      <section className={styles.welcomeCard} aria-labelledby="fortuneChatWelcomeTitle">
        <div>
          <p>달빛 찻집의 편지함</p>
          <h1 id="fortuneChatWelcomeTitle">{character === "neo" ? "무엇을 정하지 못하고 있나요?" : "오늘, 무엇이 가장 마음에 남나요?"}</h1>
          <span>한 가지 질문으로 시작해 현재의 흐름과 다음 선택을 함께 정리해요.</span>
        </div>
        <PersonaAvatar persona={character} mood="greet" size="lg" decorative />
      </section>
      <section className={styles.characterPicker} aria-label="상담자 선택">
        {(["yeoni", "neo"] as Character[]).map((item) => <button key={item} type="button" aria-pressed={character === item} onClick={() => switchCharacter(item)}>
          <PersonaAvatar persona={item} mood={character === item ? "cheer" : "listen"} size="md" decorative />
          <strong>{CHARACTER_LABEL[item]}</strong><small>{CHARACTER_BLURB[item]}</small>
        </button>)}
      </section>
      {messages.map((message) => <article key={message.id} className={`${styles.message} ${styles[message.speaker]} ${message.kind ? styles[message.kind] : ""}`}>
        {message.speaker === "assistant" ? <PersonaAvatar persona={character} mood={message.kind === "reading" ? "read" : "listen"} size="sm" decorative /> : null}
        <div className={styles.bubble}><p>{message.text}</p>{message.detail && <details><summary>자세히 보기</summary><p>{message.detail}</p></details>}
          {message.kind === "cta" && <div className={styles.actions}><button type="button" onClick={beginFusion}>초융합 심층 리딩 이어가기 <span aria-hidden>→</span></button><button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}>여기까지 볼게요</button></div>}
        </div>
      </article>)}
      {(busy || isPaying) && <article className={`${styles.message} ${styles.assistant}`}><PersonaAvatar persona={character} mood="think" size="sm" decorative /><p className={styles.typing}><i /><i /><i /><span>{busyLabel}</span></p></article>}
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

      {followUps.length > 0 && <div className={styles.followUps} aria-label="이어서 물어볼 질문">
        <span>이어서 물어볼까요?</span>
        {followUps.map((item) => <button key={item} type="button" onClick={() => { setQuestion(item); window.setTimeout(() => inputRef.current?.focus(), 0); }}>{item}</button>)}
      </div>}

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
