"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { loginForCurrentPage } from "@/app/yeongnyangi/_lib/api";
import { profileKey, useProfiles } from "@/app/yeongnyangi/_lib/use-profiles";
import ProfileForm from "@/app/yeongnyangi/_components/ProfileForm";
import { canOfferCheckout, canOfferFreeTrial, guardCheckout } from "./consultation-access";
import {
  consultationApi, ConsultationApiError, isConsultationId,
  type ChatConsultation, type ChatConsultationSummary, type ChatDomain, type ChatPersona,
} from "./consultation-api";
import ConsultationResult from "./ConsultationResult";
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

const PERSONAS: { id: ChatPersona; name: string; line: string }[] = [
  { id: "yeoni", name: "연이", line: "다정하게, 마음부터 살펴요" },
  { id: "neo", name: "네오", line: "차분하게, 흐름부터 짚어요" },
];
const DOMAINS: { id: ChatDomain; label: string }[] = [
  { id: "saju", label: "사주" },
  { id: "ziwei", label: "자미두수" },
  { id: "sukuyo", label: "숙요" },
  { id: "vedic", label: "베다점" },
  { id: "astrology", label: "서양 점성술" },
];
const SUGGESTIONS = ["올해 이직해도 괜찮을까요?", "지금 관계를 이어가도 될까요?", "요즘 돈 흐름은 어떤가요?", "올해 가장 조심할 시기는 언제예요?"];
const STATE_LABEL: Record<string, string> = {
  CREATED: "결제 전", PAID: "준비 중", GENERATING: "쓰는 중", PARTIAL: "이어 쓰는 중", COMPLETED: "완료", REFUNDED: "환불됨",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

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

export default function ConsultationRoom({ initialId = "" }: { initialId?: string }) {
  const [persona, setPersona] = useState<ChatPersona>("yeoni");
  const [row, setRow] = useState<ChatConsultation | null>(null);
  const [history, setHistory] = useState<ChatConsultationSummary[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<ChatDomain>("saju");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);
  const { profiles, profileId, select, saved, guest, loading: profilesLoading, refresh: refreshProfiles } = useProfiles();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const attempt = useRef("");
  const mounted = useRef(true);
  const rowRef = useRef<ChatConsultation | null>(null);
  rowRef.current = row;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fail = useCallback((reason: unknown, fallback: string) => {
    if (!mounted.current) return;
    if (reason instanceof ConsultationApiError && reason.status === 401) { loginForCurrentPage(); return; }
    setError(message(reason, fallback));
  }, []);

  const loadHistory = useCallback(async (who: ChatPersona) => {
    try {
      const data = await consultationApi.list(who);
      if (!mounted.current) return;
      setHistory(data.consultations || []);
      setEnabled(data.enabled === true);
    } catch (reason) {
      if (reason instanceof ConsultationApiError && reason.status === 401) { setHistory([]); return; }
      /* 기록은 보조 정보다. 실패해도 상담은 계속된다. */
    }
  }, []);

  useEffect(() => { void loadHistory(persona); }, [persona, loadHistory]);

  const open = useCallback(async (id: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      let next = same(await consultationApi.read(id), id);
      if (canOfferCheckout(next)) next = await readWithEvidence(id);
      if (!mounted.current) return;
      setRow(next); setPersona(next.persona); setConsultationParam(id);
    } catch (reason) {
      fail(reason, "상담을 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [fail]);

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
      if (mounted.current) { setRow(next); setPersona(next.persona); setNotice(""); }
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
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void readWithEvidence(id).then((next) => { if (mounted.current && rowRef.current?.id === id) setRow(next); }).catch(() => {});
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [row]);

  // 결제된 상담은 다 쓸 때까지 읽는다. 읽기(GET)가 남은 생성을 이어 준다.
  useEffect(() => {
    if (!row?.paid || ["COMPLETED", "REFUNDED", "AWAITING_FOLLOWUP"].includes(row.state) || row.errorCode === "PAYMENT_NOT_ACTIVE") return undefined;
    const id = row.id;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = same(await consultationApi.read(id), id);
        if (!cancelled) setRow(next);
      } catch (reason) {
        if (cancelled) return;
        if (reason instanceof ConsultationApiError && reason.status === 401) { loginForCurrentPage(); return; }
        setRow((current) => (current ? { ...current } : current));
      }
    }, HELD.includes(row.errorCode || "") ? HELD_POLL_MS : POLL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [row]);

  useEffect(() => {
    if (row?.state === "COMPLETED") void loadHistory(row.persona);
  }, [row?.state, row?.persona, loadHistory]);

  const create = async () => {
    const text = question.trim();
    if (busy || !text || !profileId) return;
    if (guest) { loginForCurrentPage(); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      if (!attempt.current) attempt.current = crypto.randomUUID();
      const next = await consultationApi.create({ persona, domain, profileId, question: text, consultationAttemptId: attempt.current });
      attempt.current = "";
      if (!mounted.current) return;
      setRow(next); setConsultationParam(next.id); setQuestion("");
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
      if (mounted.current) setRow(next);
    } catch (reason) {
      if (reason instanceof ConsultationApiError && reason.code === "PG_PAYMENT_NOT_PAID") {
        setError("이 상담은 결제창이 열려 있어요. 결제를 마치거나 취소한 뒤 다시 시도해 주세요.");
      } else fail(reason, "무료 상담을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      void readWithEvidence(id).then((next) => { if (mounted.current) setRow(next); }).catch(() => {});
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
        if (guarded.row) { setRow(guarded.row); if (guarded.row.paid) setNotice("이미 열린 상담이에요. 결제 없이 이어서 볼 수 있어요."); }
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
      if (mounted.current) { setRow(next); setNotice(""); }
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
      if (mounted.current) setRow(next);
    } catch (reason) {
      fail(reason, "이어 쓰기를 접수하지 못했어요. 다시 결제하지 말고 잠시 후 다시 시도해 주세요.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const startNew = () => {
    setRow(null); setError(""); setNotice(""); setConsultationParam("");
    void loadHistory(persona);
  };

  const personaName = PERSONAS.find((p) => p.id === (row?.persona || persona))?.name || "연이";
  const offerCheckout = canOfferCheckout(row);
  const writing = !!row?.paid && row.state !== "COMPLETED" && row.state !== "REFUNDED";
  const held = writing && HELD.includes(row?.errorCode || "");

  return (
    <main className={base.room} data-consultation-room>
      <header className={base.header}>
        <button type="button" className={base.backButton} aria-label="뒤로" onClick={() => (row ? startNew() : window.history.back())}>←</button>
        <div className={base.brand}>
          <PersonaAvatar persona={row?.persona || persona} mood={row ? "read" : "greet"} size="sm" decorative />
          <div><strong>{personaName}의 운명 상담</strong><span>명식을 바탕으로 질문 하나에 깊게 답해요</span></div>
        </div>
      </header>

      <div className={base.timeline}>
        {!row && (
          <>
            <section className={styles.panel} aria-labelledby="consultation-persona">
              <h2 id="consultation-persona" className={styles.sectionTitle}>누구와 이야기할까요?</h2>
              <div className={styles.personaPicker}>
                {PERSONAS.map((p) => (
                  <button key={p.id} type="button" aria-pressed={persona === p.id} onClick={() => setPersona(p.id)}>
                    <PersonaAvatar persona={p.id} mood="greet" size="sm" decorative />
                    <span><strong>{p.name}</strong><small>{p.line}</small></span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="consultation-profile">
              <h2 id="consultation-profile" className={styles.sectionTitle}>누구의 명식으로 볼까요?</h2>
              {guest ? (
                <div className={styles.actions}><button type="button" onClick={loginForCurrentPage}>로그인하고 상담 시작하기</button></div>
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

            <section className={styles.panel} aria-labelledby="consultation-domain">
              <h2 id="consultation-domain" className={styles.sectionTitle}>어떤 운세로 볼까요?</h2>
              <div className={`${base.chips} ${styles.chipWrap}`}>
                {DOMAINS.map((d) => <button key={d.id} type="button" aria-pressed={domain === d.id} onClick={() => setDomain(d.id)}>{d.label}</button>)}
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="consultation-question">
              <h2 id="consultation-question" className={styles.sectionTitle}>무엇이 궁금한가요?</h2>
              <div className={`${base.chips} ${styles.chipWrap}`}>
                {SUGGESTIONS.map((s) => <button key={s} type="button" aria-pressed={question === s} onClick={() => setQuestion(s)}>{s}</button>)}
              </div>
              <textarea className={styles.textarea} rows={3} maxLength={QUESTION_MAX} value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="지금 가장 마음에 걸리는 질문 하나를 적어 주세요." aria-labelledby="consultation-question" />
              <div className={styles.actions}>
                <button type="button" disabled={busy || !question.trim() || (!guest && !profileId) || enabled === false} onClick={() => void create()}>
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
            {row.consultation?.question && !row.chapters?.length && <blockquote className={styles.question}>{row.consultation.question}</blockquote>}

            {offerCheckout && (
              <div className={styles.accessPanel} data-consultation-access>
                <p>질문과 명식을 확인했어요. 상담을 열면 {personaName}가 바로 답을 쓰기 시작해요.</p>
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
              <p className={base.typing} role="status"><i /><i /><i /><span>{held ? "남은 이야기를 이어 쓰는 중이에요. 저장된 상담은 그대로 있어요." : `${personaName}가 답을 쓰고 있어요`}</span></p>
            )}
            {writing && row.recovery?.canRetryNow && (
              <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void retryGeneration()}>이어서 쓰기</button></div>
            )}
          </section>
        )}

        {row && <ConsultationResult row={row} onNew={startNew} />}

        {notice && <p className={base.ticketStatus} role="status">{notice}</p>}
        {error && <p className={base.error} role="alert">{error}</p>}

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
