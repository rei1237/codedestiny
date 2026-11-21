"use client";
// 2026-11-22 C2-UI 서술형 유료 상담 다시 시도 우선(웹). ExpertRetryPanel(세션 id·서비스별 /retry)의 형제다.
// 서술형 10종은 공용 라우트 /api/paid-narrative/retry · /refund-request 에 결과 id 만 보낸다.
// 판정·문구 정본은 js/core/paid-narrative-retry.js 하나이고 정적 셸도 같은 파일을 쓴다.
// 보류된 건에서는 미완성 결과를 보여 주지 않고 이 패널만 띄운다. 결제·코인 게이트·/points 로 보내지 않는다.
import { useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import paidNarrativeRetry, { type PaidNarrativeHold, type PaidNarrativeResumeBody } from "@/js/core/paid-narrative-retry.js";

export type { PaidNarrativeHold, PaidNarrativeResumeBody };

/** 제품 라우트 응답에서 다시 시도 보류를 읽는다. 진행 중·완성·환불 건은 null. */
export function paidNarrativeHoldOf(data: unknown, fallbackId = ""): PaidNarrativeHold | null {
  return paidNarrativeRetry.holdOf(data, fallbackId);
}

async function request(path: string, body: { resultId: string }) {
  const response = await authFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, { retryOn401: false });
  return { status: response.status, payload: await response.json().catch(() => ({})) as unknown };
}

type Props = {
  hold: PaidNarrativeHold;
  /** 다시 시도가 열렸거나 결과가 이미 완성돼 있으면 이 본문으로 제품 라우트를 다시 부른다. */
  onResume: (resumeBody: PaidNarrativeResumeBody) => void;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

export default function PaidNarrativeRetryPanel({ hold, onResume, className, primaryClassName, secondaryClassName }: Props) {
  const copy = paidNarrativeRetry.copyFor(getCurrentLoadingLocale());
  const [busy, setBusy] = useState<"" | "retry" | "refund">("");
  const [message, setMessage] = useState("");
  const [closed, setClosed] = useState(false);
  const [retryHidden, setRetryHidden] = useState(false);

  async function act(action: "retry" | "refund") {
    if (busy || closed) return;
    setBusy(action);
    const outcome = action === "retry"
      ? await paidNarrativeRetry.retry(hold.resultId, { request })
      : await paidNarrativeRetry.refundRequest(hold.resultId, { request });
    const view = paidNarrativeRetry.nextView(outcome, action, copy);
    setBusy("");
    setMessage(view.message);
    if (view.retryHidden) setRetryHidden(true);
    if (view.closed) setClosed(true);
    if (view.resume) onResume(view.resume);
  }

  return (
    <div className={className} data-paid-narrative-retry role="group" aria-label={copy.title}>
      <h3>{copy.title}</h3>
      {!closed && <p role="alert">{copy.offer}</p>}
      {message && <p role="status">{message}</p>}
      {!closed && !retryHidden && (
        <button type="button" className={primaryClassName} onClick={() => void act("retry")} disabled={Boolean(busy)}>{busy === "retry" ? copy.busy : copy.retryLabel}</button>
      )}
      {!closed && (
        <button type="button" className={secondaryClassName} onClick={() => void act("refund")} disabled={Boolean(busy)}>{busy === "refund" ? copy.busy : copy.refundRequestLabel}</button>
      )}
    </div>
  );
}
