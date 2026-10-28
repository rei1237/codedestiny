"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getAuthState, useAuthStore } from "@/app/_lib/auth-store";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import type {
  FortuneTeaHouseConsultMode,
  FortuneTeaHouseConsultResponse,
  FortuneTeaHouseFollowUp,
  FortuneTeaHouseFollowUpAllowance,
} from "../data/consult";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import TeaHouseButton from "./TeaHouseButton";
import styles from "../styles/tea-follow-up.module.css";

export type TeaHouseFollowUpPatch = {
  followUps: FortuneTeaHouseFollowUp[];
  followUpAllowance: FortuneTeaHouseFollowUpAllowance;
};

type TeaHouseFollowUpCardProps = {
  result: FortuneTeaHouseConsultResponse;
  readOnly?: boolean;
  onChange?: (patch: TeaHouseFollowUpPatch) => void;
};

type FollowUpApiResponse = {
  ok?: boolean;
  errorCode?: string;
  followUp?: FortuneTeaHouseFollowUp | null;
  followUps?: FortuneTeaHouseFollowUp[];
  followUpAllowance?: FortuneTeaHouseFollowUpAllowance;
  alreadyApplied?: boolean;
};

type Phase = "idle" | "sending" | "waiting" | "error" | "closed";

// 서버 계약(worker/lib/fortune-tea-follow-up-contract.js)과 같은 값이다. 최종 판정은 서버가 한다.
const QUESTION_MIN_CHARS = 4;
const QUESTION_MAX_CHARS = 600;
// 다른 요청이 답을 쓰는 중(202)이면 Retry-After 간격으로 같은 질문을 다시 보낸다. 서버 잠금(120초)보다 길게 기다린다.
const WAIT_ROUNDS = 30;
const pendingKey = (resultId: string) => `yeoni-tea-follow-up:${resultId}`;
const questionChars = (value: string) => Array.from(value.replace(/\s/g, "")).length;

function newClientQuestionId() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `tea-fq-${random}`;
}

// 응답이 끊겨도 같은 질문 id로 다시 물어야 횟수가 두 번 빠지지 않는다. 저장소가 막혀도 화면은 동작한다.
function readPending(resultId: string): { clientQuestionId: string; question: string } | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(pendingKey(resultId)) || "null");
    return value && typeof value.clientQuestionId === "string" && typeof value.question === "string" ? value : null;
  } catch {
    return null;
  }
}

function writePending(resultId: string, value: { clientQuestionId: string; question: string } | null) {
  try {
    if (value) window.sessionStorage.setItem(pendingKey(resultId), JSON.stringify(value));
    else window.sessionStorage.removeItem(pendingKey(resultId));
  } catch {
    // 개인 창·차단된 저장소에서는 이번 화면 안에서만 id를 기억한다.
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다. {count}·{max} 는 런타임 치환 자리다. */
const KO = {
  eyebrow: "추가 질문 1회 포함",
  title: "연이에게 한 번 더 묻기",
  remaining: "추가 질문 {count}회 남음",
  usedUp: "추가 질문을 모두 사용했어요",
  intro: "상담을 읽고 더 궁금해진 점 하나를 적어 주세요. 연이가 처음 상담의 근거로 그 질문 하나에 집중해 답해요. 추가 비용은 없어요.",
  basis: {
    tarot: "같은 카드로 답해요 · 카드를 새로 뽑지 않아요",
    saju: "같은 명식으로 답해요",
    sajuCompatibility: "두 사람의 같은 명식으로 답해요",
    sukuyo: "두 사람의 같은 본명숙으로 답해요",
  },
  label: "연이에게 물어볼 질문",
  placeholder: "예: 이 흐름이라면 언제 먼저 연락하는 게 좋을까요?",
  counter: "{count}/{max}자",
  tooShort: "질문을 조금 더 구체적으로 적어 주세요. 공백을 빼고 4자 이상이면 돼요.",
  tooLong: "질문은 공백을 빼고 600자까지 적을 수 있어요.",
  submit: "연이에게 묻기",
  resume: "같은 질문 다시 보내기",
  sending: "연이가 처음 상담을 다시 펼쳐 답을 쓰고 있어요. 1분 정도 걸릴 수 있어요.",
  waiting: "앞서 보낸 질문의 답을 마무리하는 중이에요. 잠시만 기다려 주세요.",
  arrived: "연이의 추가 답변이 도착했어요.",
  reopened: "저장된 추가 답변을 다시 펼쳤어요.",
  limitReached: "이 상담의 추가 질문은 이미 사용했어요.",
  failed: "답을 전하지 못했어요. 횟수는 그대로 남아 있으니 같은 질문으로 다시 보내 주세요.",
  login: "로그인하면 추가 질문을 할 수 있어요.",
  revoked: "취소·환불된 상담이라 추가 질문을 할 수 없어요.",
  questionLabel: "손님의 질문",
  evidenceTitle: "연이가 짚은 근거",
  directTitle: "연이의 답",
  guidanceTitle: "해볼 일",
  cautionTitle: "조심할 점",
};

export default function TeaHouseFollowUpCard({ result, readOnly = false, onChange }: TeaHouseFollowUpCardProps) {
  const copy = useTeaHouseCopy("followUpCard", KO);
  const resultId = result.resultId || "";
  const mode: FortuneTeaHouseConsultMode = result.consultationMode || "tarot";
  const authState = useAuthStore();
  const owner = String(authState.user?.id || authState.user?.userId || authState.user?._id || authState.user?.uid || "");
  const [followUps, setFollowUps] = useState<FortuneTeaHouseFollowUp[]>(result.followUps || []);
  const [allowance, setAllowance] = useState<FortuneTeaHouseFollowUpAllowance | null>(result.followUpAllowance || null);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const pendingIdRef = useRef("");
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const scopeRef = useRef({ owner, resultId });
  if (scopeRef.current.owner !== owner || scopeRef.current.resultId !== resultId) scopeRef.current = { owner, resultId };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 다른 결과로 바뀌면 그 결과의 저장본과 남은 질문 id로 다시 시작한다.
  useEffect(() => {
    setFollowUps(result.followUps || []);
    setAllowance(result.followUpAllowance || null);
    setPhase("idle");
    setMessage("");
    const pending = resultId && !readOnly ? readPending(resultId) : null;
    pendingIdRef.current = pending?.clientQuestionId || "";
    setDraft(pending?.question || "");
    // result 객체는 부모가 갱신할 때마다 바뀐다. 결과가 바뀔 때만 초기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId, readOnly]);

  const apply = useCallback((nextFollowUps: FortuneTeaHouseFollowUp[] | undefined, nextAllowance: FortuneTeaHouseFollowUpAllowance | undefined) => {
    const items = Array.isArray(nextFollowUps) ? nextFollowUps : [];
    const limit = nextAllowance?.limit ?? 1;
    const used = nextAllowance?.used ?? items.length;
    const patch = { followUps: items, followUpAllowance: { limit, used, remaining: nextAllowance?.remaining ?? Math.max(0, limit - used) } };
    setFollowUps(patch.followUps);
    setAllowance(patch.followUpAllowance);
    onChangeRef.current?.(patch);
  }, []);

  // 상담 직후 응답에는 추가 질문 상태가 없다. 저장본 상세에서 한 번 받아 온다.
  useEffect(() => {
    if (readOnly || !resultId || !owner || allowance) return;
    const controller = new AbortController();
    void authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted || !payload?.ok || !payload.result?.followUpAllowance) return;
        apply(payload.result.followUps, payload.result.followUpAllowance);
      })
      // 상세를 못 읽어도 입력은 열어 둔다. 횟수는 서버가 409로 바로잡는다.
      .catch(() => {});
    return () => controller.abort();
  }, [readOnly, resultId, owner, allowance, apply]);

  const remaining = allowance ? allowance.remaining : Math.max(0, 1 - followUps.length);
  const chars = questionChars(draft);
  const busy = phase === "sending" || phase === "waiting";

  const submit = useCallback(async () => {
    if (!resultId || !owner || busyRef.current) return;
    const question = draft.trim();
    const count = questionChars(question);
    if (count < QUESTION_MIN_CHARS) { setMessage(copy.tooShort); return; }
    if (count > QUESTION_MAX_CHARS) { setMessage(copy.tooLong); return; }
    busyRef.current = true;
    const scope = scopeRef.current;
    const isCurrent = () => {
      const user = getAuthState().user;
      const current = String(user?.id || user?.userId || user?._id || user?.uid || "");
      return mountedRef.current && current === owner && scopeRef.current === scope;
    };
    const clientQuestionId = pendingIdRef.current || newClientQuestionId();
    pendingIdRef.current = clientQuestionId;
    writePending(resultId, { clientQuestionId, question });
    setPhase("sending");
    setMessage(copy.sending);
    try {
      for (let round = 0; round <= WAIT_ROUNDS; round += 1) {
        const response = await authFetch(`/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/follow-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, clientQuestionId }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as FollowUpApiResponse;
        if (!isCurrent()) return;
        if (response.ok && payload.ok && payload.followUp) {
          apply(payload.followUps, payload.followUpAllowance);
          writePending(resultId, null);
          pendingIdRef.current = "";
          setDraft("");
          setPhase("idle");
          setMessage(payload.alreadyApplied ? copy.reopened : copy.arrived);
          return;
        }
        if (response.status === 202 && round < WAIT_ROUNDS) {
          setPhase("waiting");
          setMessage(copy.waiting);
          const retryAfter = Number(response.headers.get("Retry-After")) || 5;
          await wait(Math.min(15, Math.max(2, retryAfter)) * 1000);
          if (!isCurrent()) return;
          continue;
        }
        if (payload.errorCode === "FOLLOW_UP_LIMIT_REACHED") {
          apply(payload.followUps, payload.followUpAllowance);
          writePending(resultId, null);
          pendingIdRef.current = "";
          setPhase("closed");
          setMessage(copy.limitReached);
          return;
        }
        if (payload.errorCode === "RESULT_REVOKED") {
          writePending(resultId, null);
          setPhase("closed");
          setMessage(copy.revoked);
          return;
        }
        if (payload.errorCode === "UNAUTHORIZED") { setPhase("error"); setMessage(copy.login); return; }
        if (payload.errorCode === "FOLLOW_UP_QUESTION_TOO_SHORT") { setPhase("idle"); setMessage(copy.tooShort); return; }
        if (payload.errorCode === "FOLLOW_UP_QUESTION_TOO_LONG") { setPhase("idle"); setMessage(copy.tooLong); return; }
        setPhase("error");
        setMessage(copy.failed);
        return;
      }
    } catch {
      if (isCurrent()) {
        setPhase("error");
        setMessage(copy.failed);
      }
    } finally {
      busyRef.current = false;
    }
  }, [resultId, owner, draft, copy, apply]);

  if (!resultId) return null;
  // 기록 보관함에서는 받은 답만 읽는다.
  if (readOnly && followUps.length === 0) return null;

  const canAsk = !readOnly && Boolean(owner) && remaining > 0 && phase !== "closed";
  const resumable = Boolean(pendingIdRef.current) && !busy;

  return (
    <section className={styles.followUpBlock} aria-labelledby="teaFollowUpTitle" data-tea-follow-up>
      <header className={styles.followUpHeader}>
        <img className={styles.followUpPortrait} src="/images/fortune-tea-house/renewal/human-listening.webp" width="415" height="420" alt="" loading="lazy" />
        <div className={styles.followUpHeading}>
          <span className={styles.followUpEyebrow}>{copy.eyebrow}</span>
          <h3 id="teaFollowUpTitle">{copy.title}</h3>
          {readOnly ? null : (
            <span className={styles.followUpBadge} data-state={remaining > 0 ? "open" : "used"}>
              {remaining > 0 ? copy.remaining.replace("{count}", String(remaining)) : copy.usedUp}
            </span>
          )}
        </div>
      </header>

      {canAsk ? (
        <div className={styles.followUpForm}>
          <p className={styles.followUpIntro}>{copy.intro}</p>
          <p className={styles.followUpBasis}>{copy.basis[mode] || copy.basis.tarot}</p>
          <label className={styles.followUpLabel} htmlFor="teaFollowUpQuestion">{copy.label}</label>
          <textarea
            id="teaFollowUpQuestion"
            className={styles.followUpInput}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); if (phase === "idle") setMessage(""); }}
            placeholder={copy.placeholder}
            rows={4}
            maxLength={QUESTION_MAX_CHARS * 2}
            disabled={busy}
            aria-describedby="teaFollowUpCounter teaFollowUpStatus"
          />
          <div className={styles.followUpFormFooter}>
            <span id="teaFollowUpCounter" className={styles.followUpCounter} data-over={chars > QUESTION_MAX_CHARS || undefined}>
              {copy.counter.replace("{count}", String(chars)).replace("{max}", String(QUESTION_MAX_CHARS))}
            </span>
            <TeaHouseButton onClick={submit} loading={busy} disabled={busy || chars < QUESTION_MIN_CHARS || chars > QUESTION_MAX_CHARS}>
              {resumable ? copy.resume : copy.submit}
            </TeaHouseButton>
          </div>
        </div>
      ) : null}

      {busy ? (
        <div className={styles.followUpProgress} aria-hidden>
          <img src="/images/fortune-tea-house/renewal/state-brewing.webp" width="416" height="421" alt="" loading="lazy" />
          <span className={styles.followUpProgressTrack}><span /></span>
        </div>
      ) : null}

      <p id="teaFollowUpStatus" className={styles.followUpStatus} role="status" aria-live="polite">
        {message || (!readOnly && !owner && remaining > 0 ? copy.login : "")}
      </p>

      {followUps.map((item) => (
        <article className={styles.followUpAnswer} key={item.id || item.clientQuestionId || item.question} data-tea-pdf-section>
          <div className={styles.followUpQuestion}>
            <span>{copy.questionLabel}</span>
            <p>{item.question}</p>
          </div>
          <div className={styles.followUpAnswerHead}>
            <img src="/images/fortune-tea-house/renewal/human-explaining.webp" width="415" height="420" alt="" loading="lazy" />
            <h4>{item.answer.answerTitle}</h4>
          </div>
          {item.answer.evidence.length ? (
            <div className={styles.followUpSection}>
              <h5>{copy.evidenceTitle}</h5>
              <ol className={styles.followUpEvidence}>
                {item.answer.evidence.map((evidence, index) => (
                  <li key={index}><LlmParagraphs text={evidence} /></li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className={`${styles.followUpSection} ${styles.followUpDirect}`}>
            <h5>{copy.directTitle}</h5>
            <LlmParagraphs text={item.answer.directAnswer} />
          </div>
          <div className={styles.followUpSection}>
            <h5>{copy.guidanceTitle}</h5>
            <LlmParagraphs text={item.answer.guidance} />
          </div>
          {item.answer.caution ? (
            <div className={styles.followUpSection}>
              <h5>{copy.cautionTitle}</h5>
              <LlmParagraphs text={item.answer.caution} />
            </div>
          ) : null}
          {item.answer.closing ? <p className={styles.followUpClosing}>{item.answer.closing}</p> : null}
        </article>
      ))}
    </section>
  );
}
