// 제보실 API 클라이언트.
//
// 네트워크는 authFetch 로만 나간다 — getApiBaseUrl 해석 + 쿠키 + 401 시 자동 refresh 를
// 여기서 다시 구현하지 않는다.

import { authFetch } from "@/app/_lib/auth-client";
import type { EnvEntry } from "./environment";
import type { FeedbackCopy } from "./copy";

export interface FeedbackAttachment {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface FeedbackDetailEntry {
  key: string;
  label: string;
  value: string;
}

export interface SubmitFeedbackPayload {
  category: string;
  title: string;
  content: string;
  url: string;
  details: FeedbackDetailEntry[];
  environment: EnvEntry[];
  attachments: string[];
  turnstileToken?: string;
}

export interface SubmittedFeedback {
  id: string;
  ticketNo: string;
  status: string;
  createdAt: string;
}

export class FeedbackApiError extends Error {
  readonly status: number;

  readonly code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "FeedbackApiError";
    this.status = status;
    this.code = code;
  }
}

function messageForStatus(status: number, serverMessage: string, copy: FeedbackCopy): string {
  if (serverMessage) return serverMessage;
  if (status === 401) return copy.apiErrorLoginRequired;
  if (status === 429) return copy.apiErrorTooFrequent;
  if (status === 503) return copy.apiErrorTransient;
  return copy.apiErrorSubmitFailed;
}

export async function submitFeedback(payload: SubmitFeedbackPayload, copy: FeedbackCopy): Promise<SubmittedFeedback> {
  const response = await authFetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    throw new FeedbackApiError(
      messageForStatus(response.status, String((data as { message?: string })?.message || ""), copy),
      response.status,
      String((data as { code?: string })?.code || ""),
    );
  }

  const item = (data as { item?: Partial<SubmittedFeedback> })?.item || {};
  return {
    id: String(item.id || ""),
    ticketNo: String(item.ticketNo || ""),
    status: String(item.status || "new"),
    createdAt: String(item.createdAt || ""),
  };
}

export interface MyFeedbackItem extends SubmittedFeedback {
  category: string;
  categoryLabel: string;
  title: string;
  statusLabel: string;
  replies: Array<{ body: string; authorName: string; createdAt: string }>;
}

export async function fetchMyFeedback(limit = 5): Promise<MyFeedbackItem[]> {
  try {
    const response = await authFetch(`/api/feedback/mine?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    const items = (data as { items?: MyFeedbackItem[] })?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
