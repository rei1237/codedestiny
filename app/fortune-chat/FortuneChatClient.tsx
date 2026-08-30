"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PriceBadge } from "@/app/components/PriceBadge";
import { PersonaAvatar } from "./PersonaAvatar";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import styles from "./fortune-chat.module.css";
import { getApiBaseUrl } from "../_lib/api-config";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type FortuneChatCopy = {
  backAria: string;
  newChatAria: string;
  characterPickerAria: string;
  composerAria: string;
  followUpsAria: string;
  topicChipsAria: string;
  categoryChipsAria: string;
  questionInputAria: string;
};

const FORTUNE_CHAT_EN: FortuneChatCopy = {
  backAria: "Go to previous page",
  newChatAria: "Start a new consultation",
  characterPickerAria: "Choose a consultant",
  composerAria: "Consultation input",
  followUpsAria: "Suggested questions",
  topicChipsAria: "Suggested question topics",
  categoryChipsAria: "Choose a consultation system",
  questionInputAria: "Type your consultation question",
};

const FORTUNE_CHAT_COPY: Partial<Record<LoadingLocale, FortuneChatCopy>> = {
  ko: {
    backAria: "이전 페이지로 이동",
    newChatAria: "새 상담 시작",
    characterPickerAria: "상담자 선택",
    composerAria: "상담 입력",
    followUpsAria: "추천 질문",
    topicChipsAria: "추천 질문 분야",
    categoryChipsAria: "상담 체계 선택",
    questionInputAria: "상담 질문 입력",
  },
  en: FORTUNE_CHAT_EN,
  ja: {
    backAria: "前のページに戻る",
    newChatAria: "新しい相談を始める",
    characterPickerAria: "相談相手を選択",
    composerAria: "相談入力",
    followUpsAria: "おすすめの質問",
    topicChipsAria: "おすすめの質問分野",
    categoryChipsAria: "相談体系を選択",
    questionInputAria: "相談の質問を入力",
  },
  "zh-CN": {
    backAria: "返回上一页",
    newChatAria: "开始新咨询",
    characterPickerAria: "选择咨询对象",
    composerAria: "咨询输入",
    followUpsAria: "推荐问题",
    topicChipsAria: "推荐问题领域",
    categoryChipsAria: "选择咨询体系",
    questionInputAria: "输入咨询问题",
  },
  "zh-TW": {
    backAria: "返回上一頁",
    newChatAria: "開始新諮詢",
    characterPickerAria: "選擇諮詢對象",
    composerAria: "諮詢輸入",
    followUpsAria: "推薦問題",
    topicChipsAria: "推薦問題領域",
    categoryChipsAria: "選擇諮詢體系",
    questionInputAria: "輸入諮詢問題",
  },
  vi: {
    backAria: "Về trang trước",
    newChatAria: "Bắt đầu tư vấn mới",
    characterPickerAria: "Chọn người tư vấn",
    composerAria: "Ô nhập tư vấn",
    followUpsAria: "Câu hỏi gợi ý",
    topicChipsAria: "Lĩnh vực câu hỏi gợi ý",
    categoryChipsAria: "Chọn hệ thống tư vấn",
    questionInputAria: "Nhập câu hỏi tư vấn",
  },
  hi: {
    backAria: "पिछले पृष्ठ पर जाएं",
    newChatAria: "नया परामर्श शुरू करें",
    characterPickerAria: "परामर्शदाता चुनें",
    composerAria: "परामर्श इनपुट",
    followUpsAria: "सुझाए गए प्रश्न",
    topicChipsAria: "सुझाए गए प्रश्न क्षेत्र",
    categoryChipsAria: "परामर्श प्रणाली चुनें",
    questionInputAria: "अपना परामर्श प्रश्न लिखें",
  },
  es: {
    backAria: "Ir a la página anterior",
    newChatAria: "Iniciar una nueva consulta",
    characterPickerAria: "Elegir un consultor",
    composerAria: "Entrada de consulta",
    followUpsAria: "Preguntas sugeridas",
    topicChipsAria: "Temas de preguntas sugeridas",
    categoryChipsAria: "Elegir un sistema de consulta",
    questionInputAria: "Escribe tu pregunta de consulta",
  },
  fr: {
    backAria: "Retour à la page précédente",
    newChatAria: "Démarrer une nouvelle consultation",
    characterPickerAria: "Choisir un consultant",
    composerAria: "Saisie de la consultation",
    followUpsAria: "Questions suggérées",
    topicChipsAria: "Domaines de questions suggérées",
    categoryChipsAria: "Choisir un système de consultation",
    questionInputAria: "Saisissez votre question de consultation",
  },
  de: {
    backAria: "Zur vorherigen Seite",
    newChatAria: "Neue Beratung starten",
    characterPickerAria: "Berater auswählen",
    composerAria: "Beratungseingabe",
    followUpsAria: "Empfohlene Fragen",
    topicChipsAria: "Empfohlene Fragebereiche",
    categoryChipsAria: "Beratungssystem auswählen",
    questionInputAria: "Ihre Beratungsfrage eingeben",
  },
  nl: {
    backAria: "Naar vorige pagina",
    newChatAria: "Nieuw consult starten",
    characterPickerAria: "Kies een adviseur",
    composerAria: "Consultinvoer",
    followUpsAria: "Voorgestelde vragen",
    topicChipsAria: "Voorgestelde vraaggebieden",
    categoryChipsAria: "Kies een consultsysteem",
    questionInputAria: "Typ je consultvraag",
  },
  ms: {
    backAria: "Kembali ke halaman sebelumnya",
    newChatAria: "Mulakan perundingan baharu",
    characterPickerAria: "Pilih perunding",
    composerAria: "Input perundingan",
    followUpsAria: "Soalan dicadangkan",
    topicChipsAria: "Bidang soalan dicadangkan",
    categoryChipsAria: "Pilih sistem perundingan",
    questionInputAria: "Taip soalan perundingan anda",
  },
};

function getFortuneChatCopy(locale: LoadingLocale): FortuneChatCopy {
  return FORTUNE_CHAT_COPY[locale] || FORTUNE_CHAT_EN;
}

function useFortuneChatCopy(): FortuneChatCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getFortuneChatCopy(locale);
}

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
 * 주제별 추천 질문. 🔴 입력창에 자동으로 채우지 않는다 — 사용자가 누른 것만 들어간다.
 * 예전에는 주제 칩이 곧바로 입력창을 덮어써서, 고른 적 없는 문장이 질문으로 나갔다.
 */
const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  "연애와 인연": ["지금 이 인연을 계속 이어가도 될까요?", "새로운 인연은 언제쯤 올까요?", "마음을 먼저 표현해도 괜찮을까요?"],
  "재물과 직업": ["올해 재물 흐름은 언제쯤 풀릴까요?", "지금 이직을 결정해도 될까요?", "돈이 새는 자리가 어디일까요?"],
  "인간관계": ["어긋난 그 사람에게 먼저 다가가도 될까요?", "거리를 둬야 할 사람이 있을까요?", "오해를 푸는 데 좋은 시기는 언제일까요?"],
  "가까운 미래": ["앞으로 석 달, 무엇을 조심하면 좋을까요?", "이번 달 가장 중요한 선택은 무엇일까요?", "지금 흐름은 언제쯤 바뀔까요?"],
  "마음과 선택": ["왜 자꾸 같은 자리에서 망설이게 될까요?", "요즘 마음이 지치는 이유가 무엇일까요?", "둘 중 어느 쪽으로 기울어야 할까요?"],
  "종합적인 흐름": ["지금 제 삶의 큰 흐름은 어디쯤 와 있나요?", "올해 저에게 가장 큰 변화는 무엇일까요?", "반복되는 패턴이 있다면 무엇일까요?"],
};

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

/**
 * 서버가 한국어가 아닌 원문 에러를 흘리면 그대로 보여주지 않는다. 공용 DB 핸들러의
 * 503 은 "Database is temporarily unavailable." 을 그대로 내려보내는데, 그게 한국어 화면에
 * 영문으로 박혔다.
 */
function friendlyError(value: unknown, fallback = "상담 결과를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.") {
  const text = value instanceof Error ? value.message : String(value || "");
  return /[가-힣]/.test(text) ? text : fallback;
}

/**
 * 은퇴한 포맷의 상담 기록. 인사말과 안내 줄이 지금 화면과 달라, 그대로 복원하면 옛 대화가
 * 되살아난다. 지금 클라이언트는 system 말풍선을 만들지 않고 자기소개도 바뀌었다.
 */
function isRetiredSessionFormat(list: Message[]) {
  return list.some((message) => message.speaker === "system"
    || (message.speaker === "assistant" && String(message.text || "").includes("꽃돼지예요")));
}

export default function FortuneChatClient() {
  const copy = useFortuneChatCopy();
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
    const storedCharacter: Character = payload.session?.characterId === "neo" ? "neo" : "yeoni";
    if (payload.session?.characterId) setCharacter(storedCharacter);
    if (payload.session?.selectedTopic) setTopic(payload.session.selectedTopic);
    const stored = payload.session?.messages;
    // 은퇴 포맷 기록은 복원하지 않고 지금 인사말로 새로 연다. 다음 전송의 persist 가 서버
    // 목록을 통째로 교체하므로 여기서 따로 쓰지 않는다(판정은 멱등이라 새로고침해도 같다).
    if (stored?.length) setMessages(isRetiredSessionFormat(stored) ? welcome(storedCharacter) : stored);
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
    if (!usage.isLoggedIn) return usage.guestFreeRemaining > 0 ? "첫 상담을 무료로 시작할 수 있어요" : "로그인하면 1회 무료로 상담할 수 있어요";
    return usage.dailyFreeRemaining > 0 ? `무료 상담 ${usage.dailyFreeRemaining}회 남음` : "무료 상담을 모두 사용했어요";
  }, [usage]);

  /** 결제 게이트. 이용권 보유자는 여기서 결제 없이 통과한다. */
  const openPaymentGate = useCallback(async (requestId: string) => {
    const gate = await ensurePaidAccess({
      featureKey: PAID_FEATURE_KEY,
      coinPrice: PAID_COIN_PRICE,
      amountKRW: PAID_AMOUNT_KRW,
      reason: "대화형 운명 상담 1회",
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
    const controller = new AbortController();
    // 서버 LLM 예산(worker/lib/guardian-fortune-llm-policy.js: timeoutMs 최대 45초 × maxRetries
    // 최대 1회)을 넉넉히 덮는 안전망. 이게 없으면 연결이 끊겨도 fetch 가 끝없이 대기해
    // "정리 중"에서 영영 빠져나오지 못한다(재시도 버튼도, 취소 버튼도 없어 새 상담 시작 외엔
    // 방법이 없었다).
    const timer = window.setTimeout(() => controller.abort(), 100000);
    try {
      const response = await fetch(`${apiBase}/api/fortune/guardian/generate`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
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
    } finally {
      window.clearTimeout(timer);
    }
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
    const userMessageId = id();
    append([{ id: userMessageId, speaker: "user", text: label }], topic);
    let delivered = false;

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

      // 재시도 신호는 공용 DB 핸들러에서 error 안에 중첩돼 오기도 한다 — 그때 이 분기를
      // 놓치면 아래에서 영문 원문이 그대로 화면에 박힌다.
      const retryable = attempt.payload?.retryable === true || attempt.payload?.error?.retryable === true;
      if (attempt.status >= 500 || retryable) {
        setError(friendlyError(attempt.payload?.message, "지금 상담을 준비하지 못했어요. 잠시 후 다시 시도해 주세요. 횟수나 결제는 차감되지 않았어요."));
        return;
      }
      if (!attempt.ok || !attempt.payload?.ok) throw new Error(friendlyError(attempt.payload?.message));

      const result = attempt.payload.result || {};
      const evidence = Array.isArray(result.evidenceLines) ? result.evidenceLines : [];
      append([
        { id: id(), speaker: "assistant", kind: "reading", text: result.openingLine || "지금의 흐름을 차분히 읽고 있어요.", detail: [result.innerState, result.coreReading, result.topicAdvice].filter(Boolean).join("\n\n") || "결과를 정리하고 있어요." },
        ...(result.cautionPattern ? [{ id: id(), speaker: "assistant" as const, kind: "reading" as const, text: "조심해서 볼 반복 패턴", detail: result.cautionPattern }] : []),
        { id: id(), speaker: "assistant", kind: "reading", text: "지금 해볼 한 가지", detail: [result.luckyAction, evidence.length ? `읽은 근거\n${evidence.map((line: string) => `· ${line}`).join("\n")}` : ""].filter(Boolean).join("\n\n") || "작은 선택 하나부터 가볍게 시작해 보세요." },
        { id: id(), speaker: "assistant", kind: "cta", text: "이 고민을 더 넓은 흐름까지 이어 볼까요?", detail: "초융합 심층 리딩은 사주·자미두수·베다점·숙요점·점성술·타로의 공통 신호와 차이를 한 번에 연결해, 반복되는 패턴과 다음 시기의 선택 기준을 정리합니다." },
      ]);
      setFollowUps(Array.isArray(result.followUpQuestions) ? result.followUpQuestions.slice(0, 3) : []);
      delivered = true;
      setQuestion("");
      // 생성 응답이 갱신된 usage 를 이미 싣고 온다. 여기서 bootstrap 을 다시 부르면 턴마다
      // 왕복이 한 번 더 늘고(현재 프로덕션에서 Mongo 조회 1건 ≈ 5초), 그 요청이 12초 op
      // 상한에 걸리면 상담은 성공했는데 화면만 실패로 보인다.
      if (attempt.payload.usage) setUsage(attempt.payload.usage);
    } catch (reason) {
      const timedOut = (reason as Error)?.name === "AbortError";
      setError(timedOut ? "응답이 오래 걸려 상담을 멈췄어요. 같은 질문으로 다시 시도해 주세요." : friendlyError(reason, "상담을 다시 시도해 주세요."));
    } finally {
      // 결과를 받지 못한 질문은 대화에서 되돌리고 입력창에 남긴다. 예전에는 실패해도 말풍선이
      // 남고 입력창도 안 비워져, 재시도할 때마다 같은 질문이 하나씩 쌓였다.
      if (!delivered) setMessages((current) => {
        const next = current.filter((item) => item.id !== userMessageId);
        persist(next, topic);
        return next;
      });
      setBusy(false);
    }
  };

  const beginFusion = () => {
    if (!sessionId) { setError("상담방을 준비한 뒤 다시 시도해 주세요."); return; }
    router.push(`/fusion-fortune?fortuneChatSession=${encodeURIComponent(sessionId)}&topic=${encodeURIComponent(topicKey)}`);
  };

  const selectTopic = (nextTopic: string) => {
    setTopic(nextTopic);
    // 입력창은 건드리지 않는다. 추천 질문은 아래 칩에서 사용자가 고른 것만 들어간다.
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

  // 상담을 한 번 받았으면 서버가 준 이어질 질문이, 아직이면 고른 주제의 기본 추천이 뜬다.
  // 어느 쪽이든 누른 것만 입력창에 들어간다.
  const suggestions = followUps.length > 0
    ? { label: "이어서 물어볼까요?", items: followUps }
    : { label: "이런 질문은 어떠세요?", items: SUGGESTED_QUESTIONS[topic] || [] };

  return <main className={styles.room} data-character={character}>
    <header className={styles.header}>
      <button className={styles.backButton} type="button" onClick={() => router.back()} aria-label={copy.backAria}>←</button>
      <div className={styles.brand}>
        <PersonaAvatar persona={character} mood="greet" size="sm" decorative />
        <div><strong>{CHARACTER_LABEL[character]} 운명 상담</strong><span>{character === "neo" ? "판세부터 정리해 드릴게요" : "작은 마음부터 천천히 살펴봐요"}</span></div>
      </div>
      <button className={styles.resetButton} type="button" aria-label={copy.newChatAria} onClick={startNewChat}>새 상담</button>
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
      <section className={styles.characterPicker} aria-label={copy.characterPickerAria}>
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

    <section className={styles.composer} aria-label={copy.composerAria}>
      <div className={styles.policyRow}>
        <p className={styles.policy}>{usageLabel}</p>
        {needsPayment && <PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel="5,000원" prefix="1회 " className={styles.priceBadge} />}
      </div>

      <details className={styles.birthPanel} open={birthOpen} onToggle={(event) => setBirthOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary>{birth.birthDate ? `생년 정보 ${birth.birthDate}${birth.birthTime ? ` ${birth.birthTime}` : " · 시간 모름"}` : "생년 정보를 알려주세요"}</summary>
        <div className={styles.birthGrid}>
          <label>생년월일<input {...birthDateTextInputProps(birth.birthDate, (nextBirthDate) => editBirth({ birthDate: nextBirthDate }))} /></label>
          <label>태어난 시각 <em>(모르면 비워두세요)</em><input type="time" value={birth.birthTime} onChange={(event) => editBirth({ birthTime: event.target.value })} /></label>
          <label>달력<select value={birth.calendarType} onChange={(event) => editBirth({ calendarType: event.target.value === "lunar" ? "lunar" : "solar" })}><option value="solar">양력</option><option value="lunar">음력</option></select></label>
          <label>성별 <em>(선택)</em><select value={birth.gender} onChange={(event) => editBirth({ gender: event.target.value as Birth["gender"] })}><option value="unknown">선택 안 함</option><option value="female">여성</option><option value="male">남성</option></select></label>
        </div>
        <button className={styles.birthReload} type="button" onClick={() => { birthTouchedRef.current = false; void reloadProfileSeed(); }}>저장한 프로필에서 불러오기</button>
      </details>

      {suggestions.items.length > 0 && <div className={styles.followUps} aria-label={copy.followUpsAria}>
        <span>{suggestions.label}</span>
        {suggestions.items.map((item) => <button key={item} type="button" onClick={() => { setQuestion(item); window.setTimeout(() => inputRef.current?.focus(), 0); }}>{item}</button>)}
      </div>}

      <div className={styles.chips} aria-label={copy.topicChipsAria}>{TOPICS.map((item) => <button key={item} type="button" aria-pressed={topic === item} onClick={() => selectTopic(item)}>{item}</button>)}</div>
      <div className={styles.chips} aria-label={copy.categoryChipsAria}>{(Object.keys(CATEGORY_LABEL) as Category[]).map((item) => <button key={item} type="button" aria-pressed={activeCategory === item} onClick={() => setCategory(item)}>{CATEGORY_LABEL[item]}</button>)}</div>
      <div className={styles.input}>
        <input ref={inputRef} value={question} maxLength={CONCERN_MAX_LENGTH} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) void send(); }} placeholder="마음에 남은 질문을 적어 주세요" aria-label={copy.questionInputAria} disabled={busy || isPaying} />
        <button type="button" onClick={() => void send()} disabled={busy || isPaying}>{busy || isPaying ? "정리 중" : "보내기"}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  </main>;
}
