"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, Check, CircleCheck, Gem, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { adminFetch, describeAdminError } from "../_lib/admin-api";
import { ADMIN_INPUT, adminButton } from "../_components/ui";
import styles from "./page.module.css";

const MAX_GRANT_AMOUNT = 999999;

type MonthlyCreditGrant = {
  userId: string;
  email: string;
  amount: number;
  reason: string;
  sourceId: string;
  campaignId: string;
  balanceAfter: number;
  expiresAt: string | null;
  ledgerId: string;
};

type GrantResponse = {
  ok: true;
  idempotent: boolean;
  grant: MonthlyCreditGrant;
};

const inputClass = `${ADMIN_INPUT} ${styles.field}`;

function createIdempotencyKey() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `admin-marketing-${Date.now()}-${suffix}`;
}

function formatAmount(value: number) {
  return `${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR")}개`;
}

function formatDate(value: string | null) {
  if (!value) return "확인 필요";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 필요";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminMonthlyCreditsPage() {
  const emailInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("마케팅 캠페인 예외 지급");
  const [campaignId, setCampaignId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<GrantResponse | null>(null);
  const parsedAmount = Number(amount);
  const validAmount = Number.isSafeInteger(parsedAmount) && parsedAmount >= 1 && parsedAmount <= MAX_GRANT_AMOUNT;
  const ready = Boolean(email.trim() && validAmount && reason.trim());
  const locked = submitting || Boolean(result);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  function prepareNextGrant() {
    setEmail("");
    setAmount("");
    setReason("마케팅 캠페인 예외 지급");
    setCampaignId("");
    setIdempotencyKey("");
    setConfirmed(false);
    setError("");
    setNotice("");
    setResult(null);
    requestAnimationFrame(() => emailInput.current?.focus());
  }

  async function submitGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setError("");
    setNotice("");
    setResult(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReason = reason.trim();
    const parsedAmount = Number(amount);
    if (!normalizedEmail) {
      setError("지급 대상 이메일을 입력해 주세요.");
      return;
    }
    if (!normalizedReason) {
      setError("지급 사유를 입력해 주세요.");
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > MAX_GRANT_AMOUNT) {
      setError(`지급 수량은 1개부터 ${MAX_GRANT_AMOUNT.toLocaleString("ko-KR")}개까지 입력할 수 있습니다.`);
      return;
    }
    if (!confirmed) {
      setError("대상 계정과 지급 수량을 확인한 뒤 확인란을 선택해 주세요.");
      return;
    }

    const requestKey = idempotencyKey || createIdempotencyKey();
    setIdempotencyKey(requestKey);
    setSubmitting(true);
    try {
      const data = await adminFetch<GrantResponse>("/api/admin/monthly-credits/grant", {
        method: "POST",
        body: {
          email: normalizedEmail,
          amount: parsedAmount,
          reason: normalizedReason,
          campaignId: campaignId.trim(),
          idempotencyKey: requestKey,
        },
      });
      // 🔴 data.grant 가드: 아래 결과 카드가 grant.email / grant.amount 를 바로 읽는다. grant 없는 2xx
      // 본문(멱등 응답 등)이 오면 그 자리에서 터져 지급 화면이 통째로 화이트스크린이 된다.
      if (!data?.grant) {
        setError("지급 응답을 확인하지 못했습니다. 원장에서 처리 결과를 확인해 주세요.");
      } else {
        setResult(data);
        setNotice(data.idempotent ? "동일 요청이 이미 처리되어 기존 지급 결과를 표시했습니다." : "월정석 지급이 완료되었습니다.");
        setConfirmed(false);
      }
    } catch (caught) {
      setError(describeAdminError(caught, "지급 요청 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.").message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>마케팅 월정석 지급</h1>
          <p>지급할 계정과 수량을 입력하고, 마지막으로 확인해 주세요.</p>
        </div>
        <Image src="/assets/mascot/yeoni-moonstone-reward-v1-160.webp" alt="" width={80} height={80} className={styles.mascot} />
      </header>

      <form className={styles.layout} onSubmit={submitGrant} aria-label="월정석 지급">
        <section className={styles.entry} aria-labelledby="grant-form-title">
          <div className={styles.sectionHeading}>
            <h2 id="grant-form-title">지급 정보</h2>
            <span className={styles.badge}>{result ? <><Check size={14} aria-hidden="true" />처리 완료</> : "관리자 전용"}</span>
          </div>
          <p className={styles.description}>{result ? "완료된 요청의 입력 내용입니다. 새 지급은 결과 아래에서 준비해 주세요." : "이메일은 정확히, 수량은 월정석 단위로 입력해 주세요."}</p>

          <fieldset disabled={locked} className={styles.fields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="grant-email">지급 대상 이메일 <span className={styles.required}>필수</span></label>
              <input ref={emailInput} id="grant-email" type="email" required autoComplete="off" spellCheck={false}
                value={email} onChange={(event) => { setEmail(event.target.value); setIdempotencyKey(""); setConfirmed(false); }}
                placeholder="customer@example.com" className={inputClass} aria-describedby="grant-email-help" />
              <p id="grant-email-help">월정석을 받을 계정의 이메일을 입력해 주세요.</p>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="grant-amount">지급 수량 <span className={styles.required}>필수</span></label>
              <div className={styles.amountField}>
                <Gem size={20} aria-hidden="true" />
                <input id="grant-amount" type="number" required min={1} max={MAX_GRANT_AMOUNT} step={1} inputMode="numeric"
                  value={amount} onChange={(event) => { setAmount(event.target.value); setIdempotencyKey(""); setConfirmed(false); }}
                  placeholder="0" className={inputClass} aria-describedby="grant-amount-help" />
                <span>개</span>
              </div>
              <p id="grant-amount-help">{validAmount ? <strong>{formatAmount(parsedAmount)}</strong> : "1개 이상 입력해 주세요."}<span>최대 {MAX_GRANT_AMOUNT.toLocaleString("ko-KR")}개</span></p>
            </div>

            <div className={styles.recordFields}>
              <div className={styles.fieldGroup}>
                <label htmlFor="grant-reason">지급 사유 <span className={styles.required}>필수</span></label>
                <textarea id="grant-reason" required maxLength={120} rows={3} value={reason}
                  onChange={(event) => { setReason(event.target.value); setConfirmed(false); }}
                  className={inputClass} aria-describedby="grant-reason-help" />
                <p id="grant-reason-help">관리자 지급 기록에 남는 내용입니다.<span>{reason.length}/120자</span></p>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="grant-campaign">캠페인 ID <span className={styles.optional}>선택</span></label>
                <input id="grant-campaign" value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setConfirmed(false); }}
                  placeholder="예: summer-2026" className={inputClass} aria-describedby="grant-campaign-help" />
                <p id="grant-campaign-help">같은 캠페인의 지급 기록을 구분할 때 사용해요.</p>
              </div>
            </div>
          </fieldset>
        </section>

        <aside className={styles.reviewColumn} aria-label="지급 확인과 결과">
          {result ? (
            <section className={styles.result} aria-labelledby="grant-result-title" role="status">
              <div className={styles.resultHeading}>
                <CircleCheck size={28} aria-hidden="true" />
                <div><h2 ref={resultHeading} tabIndex={-1} id="grant-result-title">월정석 지급 완료</h2><p>{result.idempotent ? "이미 처리된 요청의 결과입니다." : "지급 내역이 기록되었습니다."}</p></div>
              </div>
              <dl className={styles.facts}>
                <div><dt>요청 계정</dt><dd>{result.grant.email || email.trim().toLowerCase()}</dd></div>
                <div><dt>이번 지급</dt><dd className={styles.resultAmount}>{formatAmount(result.grant.amount)}</dd></div>
                <div><dt>지급 후 잔액</dt><dd>{formatAmount(result.grant.balanceAfter)}</dd></div>
                <div><dt>만료 시각</dt><dd>{formatDate(result.grant.expiresAt)}</dd></div>
              </dl>
              <p className={styles.successNote}>{notice}</p>
              <button type="button" onClick={prepareNextGrant} className={`${adminButton("neutral", { size: "lg" })} ${styles.nextButton}`}>
                <RotateCcw size={18} aria-hidden="true" />새 지급 준비하기
              </button>
            </section>
          ) : (
            <section className={styles.review} aria-labelledby="grant-review-title" aria-busy={submitting}>
              <div className={styles.sectionHeading}><h2 id="grant-review-title">지급 전 확인</h2><ShieldCheck size={20} aria-hidden="true" /></div>
              <p className={styles.description}>아래 내용이 맞는지 확인해 주세요.</p>
              <dl className={styles.facts}>
                <div><dt>받을 계정</dt><dd className={email.trim() ? undefined : styles.placeholder}>{email.trim().toLowerCase() || "이메일을 입력해 주세요"}</dd></div>
                <div><dt>지급할 월정석</dt><dd className={validAmount ? styles.reviewAmount : styles.placeholder}>{validAmount ? formatAmount(parsedAmount) : "수량을 입력해 주세요"}</dd></div>
                <div><dt>지급 사유</dt><dd>{reason.trim() || "사유를 입력해 주세요"}</dd></div>
                {campaignId.trim() ? <div><dt>캠페인</dt><dd>{campaignId.trim()}</dd></div> : null}
                <div><dt>만료</dt><dd>지급 후 30일</dd></div>
              </dl>

              <label className={`${styles.confirmation}${confirmed ? " " + styles.confirmed : ""}${!ready ? " " + styles.confirmationDisabled : ""}`}>
                <input type="checkbox" checked={confirmed} disabled={!ready || submitting} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>대상 계정과 지급 수량을 확인했습니다.</span>
              </label>

              {error ? <p role="alert" className={styles.error}>{error}</p> : null}
              <button type="submit" disabled={!ready || !confirmed || submitting}
                className={`${adminButton("gift", { size: "lg" })} ${styles.submitButton}`} aria-describedby="grant-submit-help">
                {submitting ? <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" /> : <Gem size={20} aria-hidden="true" />}
                {submitting ? "지급 처리 중…" : validAmount ? `${formatAmount(parsedAmount)} 지급하기` : "월정석 지급하기"}
                {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
              </button>
              <p id="grant-submit-help" className={styles.submitHelp} role={submitting ? "status" : undefined}>
                {submitting ? "처리 결과를 확인하고 있어요. 잠시만 기다려 주세요." : !ready ? "필수 정보를 입력하면 지급을 준비할 수 있어요." : !confirmed ? "위 확인란을 선택하면 지급 버튼이 활성화됩니다." : "확인한 계정에 월정석을 지급합니다."}
              </p>
            </section>
          )}

          <section className={styles.policy} aria-labelledby="grant-policy-title">
            <h2 id="grant-policy-title">지급 안내</h2>
            <p>지급분은 기존 잔액과 별도로 기록되며, 지급 후 30일이 지나면 만료됩니다.</p>
            <p>오류 뒤 다시 시도할 때는 같은 요청으로 확인해 중복 지급을 방지합니다.</p>
          </section>
        </aside>
      </form>
    </main>
  );
}
