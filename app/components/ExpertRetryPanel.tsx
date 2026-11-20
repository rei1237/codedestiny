"use client";
// 2026-11-20 R10 전문가 상담 다시 시도 우선(웹 전용). 서버가 생성 실패를 바로 환불하지 않고
// generation_failed + llmMeta.retryable 로 보류하면, 응답에 { refunded:false, retry:{ available, sessionId } } 가 온다.
// 이 패널은 그 보류 건에 "다시 시도(추가 결제·차감 없음)"와 "다시 시도 대신 환불 요청"을 붙인다.
// 버튼은 상담 id 만 보내고 결제·코인 게이트·/points 로 보내지 않는다. 기한(일수)·날짜는 약속하지 않는다 —
// 기한이 지나면 서버 환불 크론이 알아서 닫는다. 토스 미니앱은 서버가 즉시 환불을 유지하므로 이 패널이 뜨지 않는다.
// 🔴 문구 범위는 ko·en·ja·zh-CN·zh-TW 다섯이고 나머지는 영어로 폴백한다(app/vedic-ai/result/resultCopy.ts 와 같은 관행).
import { useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type ExpertRetryCopy = {
  title: string;
  offer: string;
  retryLabel: string;
  retryStarted: string;
  retryFailed: string;
  refundRequestLabel: string;
  refundRequested: string;
  refunded: string;
  refundRequestFailed: string;
  busy: string;
};

const EN: ExpertRetryCopy = {
  title: "Your reading paused before it was finished",
  offer: "We couldn't finish part of your expert reading. We'll keep what is already written and rewrite only the rest. There is no extra charge or deduction.",
  retryLabel: "Try again · no extra charge",
  retryStarted: "Rewriting the unfinished part. There is no extra charge or deduction.",
  retryFailed: "We couldn't start the retry. Please tap again in a moment. There is no extra charge or deduction.",
  refundRequestLabel: "Request a refund instead",
  refundRequested: "We received your refund request. Your pass or payment will be returned once it is processed.",
  refunded: "Your pass or payment has been returned.",
  refundRequestFailed: "We couldn't send your refund request. Please tap again in a moment.",
  busy: "Processing",
};

const EXPERT_RETRY_COPY: Partial<Record<LoadingLocale, ExpertRetryCopy>> = {
  ko: {
    title: "상담문 작성이 잠시 멈췄어요",
    offer: "전문가 상담문 일부를 완성하지 못했어요. 이미 쓴 내용은 그대로 두고 남은 부분만 다시 써 드려요. 추가 결제·차감은 없어요.",
    retryLabel: "다시 시도 · 추가 결제·차감 없음",
    retryStarted: "남은 부분을 다시 쓰고 있어요. 추가 결제·차감은 없어요.",
    retryFailed: "다시 시도를 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요. 추가 결제·차감은 없어요.",
    refundRequestLabel: "다시 시도 대신 환불 요청",
    refundRequested: "환불 요청을 받았습니다. 처리가 끝나면 이용권과 결제가 되돌아갑니다.",
    refunded: "이용권과 결제를 되돌려 드렸습니다.",
    refundRequestFailed: "환불 요청을 전하지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
    busy: "처리 중",
  },
  en: EN,
  ja: {
    title: "鑑定文の作成が一時的に止まりました",
    offer: "専門家鑑定文の一部を完成できませんでした。書き終えた内容はそのままに、残りの部分だけを書き直します。追加の支払い・差し引きはありません。",
    retryLabel: "もう一度試す · 追加料金なし",
    retryStarted: "残りの部分を書き直しています。追加の支払い・差し引きはありません。",
    retryFailed: "再試行を開始できませんでした。少ししてからもう一度押してください。追加の支払い・差し引きはありません。",
    refundRequestLabel: "再試行の代わりに返金を申請",
    refundRequested: "返金申請を受け付けました。処理が終わると利用券とお支払いが戻ります。",
    refunded: "利用券とお支払いをお戻ししました。",
    refundRequestFailed: "返金申請を送れませんでした。少ししてからもう一度押してください。",
    busy: "処理中",
  },
  "zh-CN": {
    title: "解读撰写暂时中断了",
    offer: "专家解读有一部分未能完成。已写好的内容会保留，只重写剩余部分。不会额外收费或扣除。",
    retryLabel: "重试 · 不额外收费",
    retryStarted: "正在重写剩余部分。不会额外收费或扣除。",
    retryFailed: "未能开始重试。请稍后再点一次。不会额外收费或扣除。",
    refundRequestLabel: "改为申请退款",
    refundRequested: "已收到退款申请。处理完成后，使用券和付款将退回。",
    refunded: "使用券和付款已退回。",
    refundRequestFailed: "未能发送退款申请。请稍后再点一次。",
    busy: "处理中",
  },
  "zh-TW": {
    title: "解讀撰寫暫時中斷了",
    offer: "專家解讀有一部分未能完成。已寫好的內容會保留，只重寫剩餘部分。不會額外收費或扣除。",
    retryLabel: "重試 · 不額外收費",
    retryStarted: "正在重寫剩餘部分。不會額外收費或扣除。",
    retryFailed: "未能開始重試。請稍後再點一次。不會額外收費或扣除。",
    refundRequestLabel: "改為申請退款",
    refundRequested: "已收到退款申請。處理完成後，使用券和付款將退回。",
    refunded: "使用券和付款已退回。",
    refundRequestFailed: "未能送出退款申請。請稍後再點一次。",
    busy: "處理中",
  },
};

export function getExpertRetryCopy(locale: LoadingLocale): ExpertRetryCopy {
  return EXPERT_RETRY_COPY[locale] || EN;
}

export type ExpertRetryHold = { sessionId: string };

/** 실패 응답 본문에서 다시 시도 보류를 읽는다. 환불됐거나 창이 닫힌 건은 null. */
export function expertRetryHoldOf(data: unknown, fallbackId = ""): ExpertRetryHold | null {
  const body = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const retry = body.retry && typeof body.retry === "object" ? body.retry as Record<string, unknown> : null;
  if (!retry || retry.available !== true || body.refunded === true) return null;
  const sessionId = String(retry.sessionId || body.sessionId || fallbackId || "");
  return sessionId ? { sessionId } : null;
}

/** 결과 조회가 실패로 끝났을 때 그 건이 다시 시도 보류인지 한 번 확인한다(서버 409 본문). */
export async function probeExpertRetryHold(resultUrl: string, fallbackId = ""): Promise<ExpertRetryHold | null> {
  try {
    const response = await authFetch(resultUrl, { method: "GET" }, { retryOn401: false });
    if (response.status !== 409) return null;
    return expertRetryHoldOf(await response.json().catch(() => ({})), fallbackId);
  } catch {
    return null;
  }
}

async function postSession(url: string, sessionId: string) {
  const response = await authFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }, { retryOn401: false });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { ok: response.ok && data.ok !== false, data };
}

type Props = {
  /** 예: "/api/vedic-ai" — 서버의 POST /retry · /refund-request 가 붙는 앞부분. */
  apiBase: string;
  hold: ExpertRetryHold;
  /** 다시 시도가 열린 뒤 호출된다 — 화면은 기존 이어쓰기·폴링으로 돌아간다. */
  onRetried: () => void;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

export default function ExpertRetryPanel({ apiBase, hold, onRetried, className, primaryClassName, secondaryClassName }: Props) {
  const copy = getExpertRetryCopy(getCurrentLoadingLocale());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [closed, setClosed] = useState(false);

  async function retry() {
    if (busy || closed) return;
    setBusy(true);
    try {
      const { ok } = await postSession(`${apiBase}/retry`, hold.sessionId);
      if (!ok) { setMessage(copy.retryFailed); return; }
      setMessage(copy.retryStarted);
      onRetried();
    } catch {
      setMessage(copy.retryFailed);
    } finally {
      setBusy(false);
    }
  }

  async function refundInstead() {
    if (busy || closed) return;
    setBusy(true);
    try {
      const { ok, data } = await postSession(`${apiBase}/refund-request`, hold.sessionId);
      if (!ok) { setMessage(copy.refundRequestFailed); return; }
      setClosed(true);
      setMessage(data.refunded === true ? copy.refunded : copy.refundRequested);
    } catch {
      setMessage(copy.refundRequestFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className} data-expert-retry-panel role="group" aria-label={copy.title}>
      <h2>{copy.title}</h2>
      {!closed && <p role="alert">{copy.offer}</p>}
      {message && <p role="status">{message}</p>}
      {!closed && (
        <>
          <button type="button" className={primaryClassName} onClick={retry} disabled={busy}>{busy ? copy.busy : copy.retryLabel}</button>
          <button type="button" className={secondaryClassName} onClick={refundInstead} disabled={busy}>{copy.refundRequestLabel}</button>
        </>
      )}
    </div>
  );
}
