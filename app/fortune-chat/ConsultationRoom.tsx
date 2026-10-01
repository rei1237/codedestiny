"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { PriceBadge } from "@/app/components/PriceBadge";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { useAuthStore } from "@/app/_lib/auth-store";
import { loginForCurrentPage } from "@/app/yeongnyangi/_lib/api";
import { profileKey, useProfiles } from "@/app/yeongnyangi/_lib/use-profiles";
import ProfileForm from "@/app/yeongnyangi/_components/ProfileForm";
import { canOfferCheckout, canOfferFreeTrial, guardCheckout } from "./consultation-access";
import {
  consultationApi, ConsultationApiError, isConsultationId,
  type ChatConsultation, type ChatConsultationSummary, type ChatDomain, type ChatPersona, type ChatTarotKind,
} from "./consultation-api";
import ConsultationResult from "./ConsultationResult";
import { DOMAIN_ART, EMPTY_ROWS, MOMENT_ART, poseFor, refreshRow, showRow, TAROT_KINDS, type PersonaRows, type RoomMoment } from "./consultation-world";
import { PersonaAvatar } from "./PersonaAvatar";
import base from "./fortune-chat.module.css";
import styles from "./consultation.module.css";

// 가격 정본은 서버 레지스트리(fortune-chat-consultation)다. 아래 두 값은 결제창의 표시·스냅샷 선검사용으로,
// 기존 대화형 상담(FortuneChatClient)과 같은 값을 쓴다.
const COIN_PRICE = 30;
const AMOUNT_KRW = 3000;
const RESUME_KIND = "fortune-chat-consultation:engine";
const QUESTION_MAX = 300;
const POLL_MS = 1500;
const HELD_POLL_MS = 30000;
// 결제창이 닫힌 뒤 서버가 결제 증빙을 확인할 때까지 기다리는 상한(약 3분). 영냥이 결과 화면과 같다.
const ACTIVATION_TRIES = Math.ceil(180000 / POLL_MS);
const HELD = ["GENERATION_REVIEW_REQUIRED", "AUTOMATIC_RECOVERY_STOPPED", "ASK_LIMITED_REVIEW_REQUIRED"];
// 게스트가 적은 질문은 로그인 왕복(같은 탭) 뒤에 되살린다. 상담을 만들면 지운다.
const DRAFT_KEY = "fortune-chat:consultation-draft";
const DRAFT_TTL_MS = 30 * 60 * 1000;

// 상담자마다 세계가 다르다 — 연이는 마음부터, 네오(별빛 전략실)는 판단부터. 결과 순서는 consultation-world.ts.
const PERSONAS: { id: ChatPersona; name: string; line: string; title: string; sub: string; placeholder: string }[] = [
  { id: "yeoni", name: "연이", line: "다정하게, 마음부터 살펴요", title: "연이의 운명 상담", sub: "명식을 바탕으로 질문 하나에 깊게 답해요", placeholder: "지금 가장 마음에 걸리는 질문 하나를 적어 주세요." },
  { id: "neo", name: "네오", line: "판단부터, 근거와 순서로 짚어요", title: "네오의 별빛 전략실", sub: "판단부터 짚고 근거와 할 일을 정리해요", placeholder: "정해야 할 것 하나를 적어 주세요. 판단부터 짚어 드릴게요." },
];
const DOMAINS: { id: ChatDomain; label: string }[] = [
  { id: "saju", label: "사주" },
  { id: "ziwei", label: "자미두수" },
  { id: "sukuyo", label: "숙요" },
  { id: "vedic", label: "베다점" },
  { id: "astrology", label: "서양 점성술" },
  { id: "tarot", label: "타로" },
];
const SUGGESTIONS = ["올해 이직해도 괜찮을까요?", "지금 관계를 이어가도 될까요?", "요즘 돈 흐름은 어떤가요?", "올해 가장 조심할 시기는 언제예요?"];
const STATE_LABEL: Record<string, string> = {
  CREATED: "결제 전", PAID: "준비 중", GENERATING: "쓰는 중", PARTIAL: "이어 쓰는 중", COMPLETED: "완료", REFUNDED: "환불됨",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/** 운세 축 그림. 상담자마다 같은 운세를 자기 세계에서 그린다(consultation-world.ts). */
function DomainArt({ persona, domain }: { persona: ChatPersona; domain: ChatDomain }) {
  const art = DOMAIN_ART[persona][domain];
  return (
    <figure className={styles.domainArt} data-consultation-domain-art={domain}>
      <Image key={art.src} src={art.src} alt={art.alt} width={640} height={427} sizes="(max-width: 760px) 100vw, 728px" />
    </figure>
  );
}

/** 기다림·빈 기록·오류 순간. 그림은 장식이고 의미는 옆의 글이 전한다. */
function Moment({ persona, moment, children }: { persona: ChatPersona; moment: RoomMoment; children: ReactNode }) {
  return (
    <div className={styles.moment} data-consultation-moment={moment}>
      <Image src={MOMENT_ART[persona][moment]} alt="" width={320} height={320} className={styles.momentArt} />
      <div className={styles.momentText}>{children}</div>
    </div>
  );
}

function setConsultationParam(id: string) {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("consultation", id);
    else url.searchParams.delete("consultation");
    window.history.replaceState(window.history.state, "", url.toString());
  } catch { /* 주소 표시는 새로고침 복구용 보조 수단이다. */ }
}

function same(row: ChatConsultation, id: string) {
  if (row.id !== id) throw new ConsultationApiError("RECOVERY_ID_MISMATCH", "원래 상담과 응답이 일치하지 않아요. 다시 결제하지 말고 문의해 주세요.", 409);
  return row;
}

/** 결제 증빙만 붙여 보는 읽기. 아무것도 쓰지 않는다 — 결제가 없으면 402, 플래그가 꺼져 있으면 404 다. */
async function readWithEvidence(id: string) {
  try {
    return same(await consultationApi.activate(id, ""), id);
  } catch (error) {
    if (error instanceof ConsultationApiError && (error.status === 402 || error.status === 404)) return same(await consultationApi.read(id), id);
    throw error;
  }
}

export default function ConsultationRoom({ initialId = "", initialPersona = "yeoni" }: { initialId?: string; initialPersona?: ChatPersona }) {
  // 시작 상담자. ?consultation= 으로 연 상담은 불러온 뒤 그 상담의 상담자로 바뀐다(show).
  const [persona, setPersona] = useState<ChatPersona>(initialPersona);
  // 상담자별로 보던 상담을 따로 둔다 — 연이·네오를 오가도 각자의 결과가 그대로 남는다.
  const [rows, setRows] = useState<PersonaRows>(EMPTY_ROWS);
  const row = rows[persona];
  const [history, setHistory] = useState<ChatConsultationSummary[]>([]);
  // 빈 기록 그림은 그 상담자의 기록을 실제로 읽은 뒤에만 보인다(읽기 전·실패는 빈 기록이 아니다).
  const [historyFor, setHistoryFor] = useState<ChatPersona | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<ChatDomain>("saju");
  const [question, setQuestion] = useState("");
  const [tarotKind, setTarotKind] = useState<ChatTarotKind>("choice");
  const tarot = domain === "tarot";
  const kind = TAROT_KINDS.find((k) => k.id === tarotKind) || TAROT_KINDS[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);
  const { profiles, profileId, select, saved, guest, loading: profilesLoading, refresh: refreshProfiles } = useProfiles();
  // 게스트는 계정 기록을 부르지 않는다(401 이 토큰 갱신 실패 → logout 이벤트로 번진다).
  const signedIn = useAuthStore().isAuthenticated;
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const attempt = useRef<Record<ChatPersona, string>>({ yeoni: "", neo: "" });
  const mounted = useRef(true);
  const rowRef = useRef<ChatConsultation | null>(null);
  rowRef.current = row;
  const draft = useRef({ persona, domain, tarotKind, question });
  draft.current = { persona, domain, tarotKind, question };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (isConsultationId(initialId)) return;
    let saved: { persona?: unknown; domain?: unknown; tarotKind?: unknown; question?: unknown; at?: unknown } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch { /* 초안은 보조 수단이다. */ }
    if (!saved || typeof saved.question !== "string" || !saved.question.trim() || !(Date.now() - Number(saved.at) < DRAFT_TTL_MS)) return;
    if (saved.persona === "yeoni" || saved.persona === "neo") setPersona(saved.persona);
    const savedDomain = DOMAINS.find((d) => d.id === saved?.domain);
    if (savedDomain) setDomain(savedDomain.id);
    const savedKind = TAROT_KINDS.find((k) => k.id === saved?.tarotKind);
    if (savedKind) setTarotKind(savedKind.id);
    setQuestion(saved.question.slice(0, QUESTION_MAX));
  }, [initialId]);

  /** 로그인으로 보낸다. 적던 질문은 돌아와서 이어 쓸 수 있게 남긴다. */
  const toLogin = useCallback(() => {
    const { question: text, ...rest } = draft.current;
    if (text.trim()) {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, question: text, at: Date.now() })); } catch { /* 초안은 보조 수단이다. */ }
    }
    loginForCurrentPage();
  }, []);

  /** 사용자가 연 상담: 그 상담자 칸에 놓고 그 세계로 간다. */
  const show = useCallback((next: ChatConsultation) => {
    setRows((current) => showRow(current, next));
    setPersona(next.persona);
  }, []);
  /** 뒤늦게 온 응답: 그 칸이 아직 같은 상담일 때만 바꾼다. */
  const refresh = useCallback((next: ChatConsultation) => setRows((current) => refreshRow(current, next)), []);

  const fail = useCallback((reason: unknown, fallback: string) => {
    if (!mounted.current) return;
    if (reason instanceof ConsultationApiError && reason.status === 401) { toLogin(); return; }
    setError(message(reason, fallback));
  }, [toLogin]);

  const loadHistory = useCallback(async (who: ChatPersona) => {
    try {
      const data = await consultationApi.list(who);
      if (!mounted.current) return;
      setHistory(data.consultations || []);
      setHistoryFor(who);
      setEnabled(data.enabled === true);
    } catch (reason) {
      if (reason instanceof ConsultationApiError && reason.status === 401) { setHistory([]); return; }
      /* 기록은 보조 정보다. 실패해도 상담은 계속된다. */
    }
  }, []);

  useEffect(() => { if (signedIn) void loadHistory(persona); }, [persona, loadHistory, signedIn]);

  const open = useCallback(async (id: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      let next = same(await consultationApi.read(id), id);
      if (canOfferCheckout(next)) next = await readWithEvidence(id);
      if (!mounted.current) return;
      show(next); setConsultationParam(id);
    } catch (reason) {
      fail(reason, "상담을 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [fail, show]);

  useEffect(() => {
    // 이 화면이 방금 연 상담이 주소에 실린 경우는 다시 읽지 않는다.
    if (isConsultationId(initialId) && rowRef.current?.id !== initialId) void open(initialId);
  }, [initialId, open]);

  /** 결제창이 닫힌 뒤 결제 증빙이 서버에 닿을 때까지 `checkout` 으로 연결을 다시 시도한다. 결제는 하지 않는다. */
  const waitForActivation = useCallback(async (id: string) => {
    for (let tries = 0; tries < ACTIVATION_TRIES && mounted.current; tries += 1) {
      try {
        return same(await consultationApi.activate(id, "checkout"), id);
      } catch (reason) {
        const pending = reason instanceof ConsultationApiError && (reason.code === "PAYMENT_EVIDENCE_PENDING" || (reason.retryable && reason.status !== 401));
        if (!pending) throw reason;
        if (tries === 0 && mounted.current) setNotice("결제를 확인하고 있어요. 이 화면을 닫지 말고 잠시만 기다려 주세요.");
        await sleep(POLL_MS);
      }
    }
    throw new ConsultationApiError("PAYMENT_CONFIRMATION_DELAYED", "결제 확인이 늦어지고 있어요. 다시 결제하지 말고 잠시 후 이 상담을 다시 열어 주세요.", 503, true);
  }, []);

  // 모바일 결제는 이 문서를 통째로 떠났다 돌아온다. 돌아온 문서에서 같은 상담을 증빙으로 연결한다.
  const buildResume = usePaidResume(RESUME_KIND, async (args) => {
    const id = String(args.consultationId || "");
    if (!isConsultationId(id)) return false;
    setConsultationParam(id);
    setBusy(true); setError("");
    try {
      const next = await waitForActivation(id);
      if (mounted.current) { show(next); setNotice(""); }
      return true;
    } catch (reason) {
      fail(reason, "결제는 확인되면 이 상담에 그대로 연결돼요. 잠시 후 다시 열어 주세요.");
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  });

  // 다른 탭에서 무료 상담·이용권·결제로 이미 열었을 수 있다. 돌아오면 다시 읽어 결제 버튼을 거둔다.
  useEffect(() => {
    if (!row || !canOfferCheckout(row)) return undefined;
    const id = row.id;
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      void readWithEvidence(id).then((next) => { if (mounted.current) refresh(next); }).catch(() => {});
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [row, refresh]);

  // 결제된 상담은 다 쓸 때까지 읽는다. 읽기(GET)가 남은 생성을 이어 준다.
  useEffect(() => {
    if (!row?.paid || ["COMPLETED", "REFUNDED", "AWAITING_FOLLOWUP"].includes(row.state) || row.errorCode === "PAYMENT_NOT_ACTIVE") return undefined;
    const id = row.id;
    const who = row.persona;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = same(await consultationApi.read(id), id);
        if (!cancelled) refresh(next);
      } catch (reason) {
        if (cancelled) return;
        if (reason instanceof ConsultationApiError && reason.status === 401) { loginForCurrentPage(); return; }
        // 같은 상담을 새 객체로 바꿔 다음 읽기를 예약한다.
        setRows((current) => (current[who]?.id === id ? { ...current, [who]: { ...current[who]! } } : current));
      }
    }, HELD.includes(row.errorCode || "") ? HELD_POLL_MS : POLL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [row, refresh]);

  useEffect(() => {
    if (row?.state === "COMPLETED") void loadHistory(row.persona);
  }, [row?.state, row?.persona, loadHistory]);

  const create = async () => {
    const text = question.trim();
    if (busy || !text) return;
    // 게스트는 프로필이 없다 — 프로필 검사보다 먼저 로그인으로 보내야 버튼이 아무 일 없이 끝나지 않는다.
    if (guest) { toLogin(); return; }
    if (!tarot && !profileId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!attempt.current[persona]) attempt.current[persona] = crypto.randomUUID();
      const next = await consultationApi.create(tarot
        ? { persona, domain, tarotKind, question: text, consultationAttemptId: attempt.current[persona] }
        : { persona, domain, profileId, question: text, consultationAttemptId: attempt.current[persona] });
      attempt.current[persona] = "";
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* 초안은 보조 수단이다. */ }
      if (!mounted.current) return;
      show(next); setConsultationParam(next.id); setQuestion("");
      void loadHistory(persona);
    } catch (reason) {
      if (reason instanceof ConsultationApiError && reason.status === 404 && reason.code === "NOT_FOUND") {
        setError("새 상담 열기가 잠시 멈췄어요. 이미 시작한 상담은 기록에서 이어 볼 수 있어요.");
      } else fail(reason, "상담을 만들지 못했어요. 같은 내용으로 다시 시도해 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const openFreeTrial = async () => {
    if (!row || busy || !canOfferFreeTrial(row)) return;
    const id = row.id;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = same(await consultationApi.activate(id, "free_trial"), id);
      if (mounted.current) refresh(next);
    } catch (reason) {
      if (reason instanceof ConsultationApiError && reason.code === "PG_PAYMENT_NOT_PAID") {
        setError("이 상담은 결제창이 열려 있어요. 결제를 마치거나 취소한 뒤 다시 시도해 주세요.");
      } else fail(reason, "무료 상담을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      void readWithEvidence(id).then((next) => { if (mounted.current) refresh(next); }).catch(() => {});
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const pay = async () => {
    if (!row || busy || isPaying || !canOfferCheckout(row)) return;
    const id = row.id;
    setBusy(true); setError(""); setNotice("");
    try {
      // 🔴 결제창을 열기 직전 서버에서 다시 읽는다 — 이미 열린 상담이면 결제창을 열지 않는다(후속 1의 UI 방어).
      const guarded = await guardCheckout(() => readWithEvidence(id), (fresh) => ensurePaidAccess({
        featureKey: fresh.paidFeatureKey,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        reason: `${fresh.persona === "neo" ? "네오" : "연이"} 상담 1회`,
        requestId: fresh.paymentRequestId,
        resume: buildResume({ consultationId: id }),
      }));
      if (!mounted.current) return;
      if (!guarded.opened) {
        if (guarded.row) { refresh(guarded.row); if (guarded.row.paid) setNotice("이미 열린 상담이에요. 결제 없이 이어서 볼 수 있어요."); }
        else fail(guarded.error, "상담 상태를 확인하지 못해 결제창을 열지 않았어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const gate = guarded.result;
      if (!gate.ok) {
        if (gate.code === "AUTH_REQUIRED") { loginForCurrentPage(); return; }
        if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const next = await waitForActivation(id);
      if (mounted.current) { refresh(next); setNotice(""); }
    } catch (reason) {
      fail(reason, "결제는 확인되면 이 상담에 그대로 연결돼요. 다시 결제하지 말고 잠시 후 다시 열어 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const retryGeneration = async () => {
    if (!row || busy) return;
    const id = row.id;
    setBusy(true); setError("");
    try {
      const next = same(await consultationApi.generate(id), id);
      if (mounted.current) refresh(next);
    } catch (reason) {
      fail(reason, "이어 쓰기를 접수하지 못했어요. 다시 결제하지 말고 잠시 후 다시 시도해 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const startNew = () => {
    setRows((current) => ({ ...current, [persona]: null })); setError(""); setNotice(""); setConsultationParam("");
    void loadHistory(persona);
  };

  /** 모드 전환: 지금 보던 상담은 그 상담자 칸에 남고, 다른 상담자가 보던 상담(있으면)이 다시 열린다. */
  const switchPersona = (next: ChatPersona) => {
    if (next === persona || busy || isPaying) return;
    setPersona(next); setError(""); setNotice("");
    setConsultationParam(rows[next]?.id || "");
  };

  const world = PERSONAS.find((p) => p.id === persona) || PERSONAS[0];
  const personaName = world.name;
  const offerCheckout = canOfferCheckout(row);
  const writing = !!row?.paid && row.state !== "COMPLETED" && row.state !== "REFUNDED";
  const held = writing && HELD.includes(row?.errorCode || "");
  const rowDomain = row?.product?.systems?.[0];

  return (
    <main className={`${base.room}${persona === "neo" ? ` ${styles.starlight}` : ""}`} data-consultation-room data-persona={persona}>
      <header className={base.header}>
        <button type="button" className={`${base.backButton} ${styles.backButton}`} aria-label="뒤로" onClick={() => (row ? startNew() : window.history.back())}>←</button>
        <div className={base.brand}>
          <PersonaAvatar persona={persona} mood={poseFor(row, { failed: !!error, drafting: !!question.trim() })} size="sm" decorative />
          <div><strong>{world.title}</strong><span>{world.sub}</span></div>
        </div>
        <div className={styles.modeSwitch} role="group" aria-label="상담자 바꾸기" data-consultation-mode>
          {PERSONAS.map((p) => {
            const kept = p.id !== persona && !!rows[p.id];
            return (
              <button key={p.id} type="button" aria-pressed={persona === p.id} disabled={busy || isPaying} onClick={() => switchPersona(p.id)}
                aria-label={kept ? `${p.name} — 보던 상담이 있어요` : p.name} title={kept ? "보던 상담이 그대로 있어요" : undefined}>
                {p.name}{kept && <i className={styles.keptDot} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </header>

      <div className={base.timeline}>
        {!row && (
          <>
            <section className={styles.panel} aria-labelledby="consultation-persona">
              <h2 id="consultation-persona" className={styles.sectionTitle}>누구와 이야기할까요?</h2>
              <div className={styles.personaPicker}>
                {PERSONAS.map((p) => (
                  <button key={p.id} type="button" aria-pressed={persona === p.id} disabled={busy || isPaying} onClick={() => switchPersona(p.id)}>
                    <PersonaAvatar persona={p.id} mood="greet" size="sm" decorative />
                    <span><strong>{p.name}</strong><small>{p.line}</small></span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="consultation-domain">
              <h2 id="consultation-domain" className={styles.sectionTitle}>어떤 운세로 볼까요?</h2>
              <div className={`${base.chips} ${styles.chipWrap}`}>
                {DOMAINS.map((d) => <button key={d.id} type="button" aria-pressed={domain === d.id} onClick={() => setDomain(d.id)}>{d.label}</button>)}
              </div>
              <DomainArt persona={persona} domain={domain} />
              {tarot && <p className={styles.muted}>타로는 생년월일 없이 지금의 고민과 카드로 읽어요.</p>}
            </section>

            {!tarot && (
              <section className={styles.panel} aria-labelledby="consultation-profile">
                <h2 id="consultation-profile" className={styles.sectionTitle}>누구의 명식으로 볼까요?</h2>
                {guest ? (
                  <div className={styles.actions}><button type="button" onClick={toLogin}>로그인하고 상담 시작하기</button></div>
                ) : profilesLoading && !profiles.length ? (
                  <p className={styles.muted} role="status">프로필을 불러오는 중이에요.</p>
                ) : !profiles.length || addingProfile ? (
                  <ProfileForm locale="ko" onSaved={(profile) => { saved(profile); setAddingProfile(false); void refreshProfiles(true); }} />
                ) : (
                  <div className={styles.profileRow}>
                    <select aria-label="상담할 프로필" value={profileId} onChange={(e) => select(e.target.value)}>
                      {profiles.map((p) => <option key={profileKey(p)} value={profileKey(p)}>{p.name || "이름 없는 프로필"}</option>)}
                    </select>
                    <button type="button" className={styles.linkButton} onClick={() => setAddingProfile(true)}>새 프로필</button>
                  </div>
                )}
              </section>
            )}

            <section className={styles.panel} aria-labelledby="consultation-question">
              <h2 id="consultation-question" className={styles.sectionTitle}>{tarot ? "어떤 고민을 카드로 볼까요?" : "무엇이 궁금한가요?"}</h2>
              <div className={`${base.chips} ${styles.chipWrap}`}>
                {tarot
                  ? TAROT_KINDS.map((k) => <button key={k.id} type="button" aria-pressed={tarotKind === k.id} onClick={() => setTarotKind(k.id)}>{k.label}</button>)
                  : SUGGESTIONS.map((s) => <button key={s} type="button" aria-pressed={question === s} onClick={() => setQuestion(s)}>{s}</button>)}
              </div>
              <textarea className={styles.textarea} rows={3} maxLength={QUESTION_MAX} value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder={tarot ? kind.prompt : world.placeholder} aria-labelledby="consultation-question" />
              <div className={styles.actions}>
                <button type="button" disabled={busy || !question.trim() || (!guest && !tarot && !profileId) || enabled === false} onClick={() => void create()}>
                  {busy ? "상담을 준비하는 중…" : guest ? "로그인하고 상담 시작하기" : "상담 준비하기"}
                </button>
              </div>
              {enabled === false && <p className={styles.muted}>새 상담 열기가 잠시 멈췄어요. 이미 시작한 상담은 아래 기록에서 이어 볼 수 있어요.</p>}
            </section>
          </>
        )}

        {row && (
          <section className={styles.panel} aria-labelledby="consultation-current">
            <p className={styles.kicker} id="consultation-current">{DOMAINS.find((d) => d.id === row.product?.systems?.[0])?.label || "운명 상담"} · {STATE_LABEL[row.state] || row.state}</p>
            {!writing && !row.chapters?.length && DOMAINS.some((d) => d.id === rowDomain) && <DomainArt persona={row.persona} domain={rowDomain as ChatDomain} />}
            {row.consultation?.question && !row.chapters?.length && <blockquote className={styles.question}>{row.consultation.question}</blockquote>}

            {offerCheckout && (
              <div className={styles.accessPanel} data-consultation-access>
                <p>{rowDomain === "tarot" ? "질문에 맞춰 카드를 펼쳐 두었어요." : "질문과 명식을 확인했어요."} 상담을 열면 {personaName}가 바로 답을 쓰기 시작해요.</p>
                <div className={styles.actions}>
                  {canOfferFreeTrial(row) && <button type="button" disabled={busy || isPaying} onClick={() => void openFreeTrial()}>무료 상담 1회로 열기</button>}
                  <button type="button" data-consultation-pay disabled={busy || isPaying} onClick={() => void pay()}>
                    {isPaying ? "결제창을 여는 중…" : "상담 열기"}
                  </button>
                </div>
                {/* 가격표 키는 서비스 등록 키다 — 상담별 결제 키(fc-<id>)는 가격표에 없어 "가격 확인 필요"가 뜬다. */}
                <PriceBadge featureKey="fortune-chat-consultation" fallbackLabel="3,000원" prefix="1회 " className={base.priceBadge} />
              </div>
            )}

            {!row.paid && !offerCheckout && row.state !== "REFUNDED" && (
              <p className={styles.muted} role="status">이 상담의 결제 연결을 확인하고 있어요. 다시 결제하지 말고 잠시 후 다시 열어 주세요.</p>
            )}

            {writing && !row.chapters?.length && (
              <Moment persona={row.persona} moment="loading">
                <p className={base.typing} role="status"><i /><i /><i /><span>{held ? "남은 이야기를 이어 쓰는 중이에요. 저장된 상담은 그대로 있어요." : `${personaName}가 답을 쓰고 있어요`}</span></p>
              </Moment>
            )}
            {writing && row.recovery?.canRetryNow && (
              <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void retryGeneration()}>이어서 쓰기</button></div>
            )}
          </section>
        )}

        {row && <ConsultationResult row={row} onNew={startNew} />}

        {notice && <p className={base.ticketStatus} role="status">{notice}</p>}
        {error && (
          <Moment persona={persona} moment="error">
            <p className={base.error} role="alert">{error}</p>
          </Moment>
        )}

        {!row && !guest && historyFor === persona && history.length === 0 && (
          <section className={styles.panel} aria-labelledby="consultation-history-empty">
            <Moment persona={persona} moment="empty">
              <h2 id="consultation-history-empty" className={styles.sectionTitle}>지난 상담</h2>
              <p className={styles.muted}>{persona === "neo" ? "아직 함께 짚은 판이 없어요. 정해야 할 것 하나부터 시작해요." : "아직 나눈 상담이 없어요. 마음에 걸리는 질문 하나로 시작해 볼까요?"}</p>
            </Moment>
          </section>
        )}

        {!row && history.length > 0 && (
          <section className={styles.panel} aria-labelledby="consultation-history">
            <h2 id="consultation-history" className={styles.sectionTitle}>지난 상담</h2>
            <ul className={styles.history}>
              {history.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => void open(h.id)} disabled={busy}>
                    <strong>{h.question || "질문 없는 상담"}</strong>
                    <small>{DOMAINS.find((d) => d.id === h.domain)?.label || "운명 상담"} · {STATE_LABEL[h.state] || h.state}{h.totalChapters ? ` · ${h.completedChapters}/${h.totalChapters}` : ""}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
