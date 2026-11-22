// js/core/paid-narrative-retry.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

export type PaidNarrativeRetryCopy = {
  title: string;
  offer: string;
  retryLabel: string;
  retryStarted: string;
  retryFailed: string;
  retryClosed: string;
  busyMessage: string;
  refundRequestLabel: string;
  refundRequested: string;
  refunded: string;
  refundRequestFailed: string;
  opening: string;
  busy: string;
};

export type PaidNarrativeResumeBody = { resumeResultId: string } & Record<string, unknown>;
export type PaidNarrativeHold = { resultId: string };
export type PaidNarrativeOutcome =
  | { kind: "resume" | "ready"; resumeBody: PaidNarrativeResumeBody }
  | { kind: "retry-closed" | "refund-requested" | "refunded" | "busy" | "failed" };
export type PaidNarrativeView = { message: string; closed: boolean; retryHidden: boolean; resume?: PaidNarrativeResumeBody };
export type PaidNarrativeRequest = (path: string, body: { resultId: string }) => Promise<{ status: number; payload: unknown }>;
export type PaidNarrativeRetryOptions = { apiBase?: string; request?: PaidNarrativeRequest };

declare const paidNarrativeRetry: {
  RETRY_PATH: string;
  REFUND_PATH: string;
  COPY: Record<string, PaidNarrativeRetryCopy>;
  copyFor(locale?: string): PaidNarrativeRetryCopy;
  holdOf(data: unknown, fallbackId?: string): PaidNarrativeHold | null;
  retryOutcome(status: number, payload: unknown, resultId: string): PaidNarrativeOutcome;
  refundOutcome(status: number, payload: unknown, resultId: string): PaidNarrativeOutcome;
  nextView(outcome: PaidNarrativeOutcome, action: "retry" | "refund", copy: PaidNarrativeRetryCopy): PaidNarrativeView;
  retry(resultId: string, options?: PaidNarrativeRetryOptions): Promise<PaidNarrativeOutcome>;
  refundRequest(resultId: string, options?: PaidNarrativeRetryOptions): Promise<PaidNarrativeOutcome>;
  mount(host: Element, options: PaidNarrativeRetryOptions & {
    resultId: string; locale?: string; onResume?: (resumeBody: PaidNarrativeResumeBody) => void;
    className?: string; primaryClass?: string; secondaryClass?: string;
  }): HTMLElement | null;
};

export default paidNarrativeRetry;
